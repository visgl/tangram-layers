// WebGL2 uniform buffer wrapper with std140-compatible CPU-side packing.

const BLOCK_ALIGNMENT = 16;
const INVALID_INDEX = 0xFFFFFFFF;

const TYPES = {
    float: { alignment: 4, size: 4, components: 1, kind: 'float', wgsl: 'f32' },
    int: { alignment: 4, size: 4, components: 1, kind: 'int', wgsl: 'i32' },
    bool: { alignment: 4, size: 4, components: 1, kind: 'int', wgsl: 'u32' },
    vec2: { alignment: 8, size: 8, components: 2, kind: 'float', wgsl: 'vec2<f32>' },
    ivec2: { alignment: 8, size: 8, components: 2, kind: 'int', wgsl: 'vec2<i32>' },
    vec3: { alignment: 16, size: 12, components: 3, kind: 'float', wgsl: 'vec3<f32>' },
    ivec3: { alignment: 16, size: 12, components: 3, kind: 'int', wgsl: 'vec3<i32>' },
    vec4: { alignment: 16, size: 16, components: 4, kind: 'float', wgsl: 'vec4<f32>' },
    ivec4: { alignment: 16, size: 16, components: 4, kind: 'int', wgsl: 'vec4<i32>' },
    mat3: { alignment: 16, size: 48, columns: 3, rows: 3, kind: 'float', wgsl: 'mat3x3<f32>' },
    mat4: { alignment: 16, size: 64, columns: 4, rows: 4, kind: 'float', wgsl: 'mat4x4<f32>' }
};

export default class UniformBuffer {

    static isSupported(gl) {
        return Boolean(gl &&
            gl.UNIFORM_BUFFER != null &&
            typeof gl.bindBufferBase === 'function' &&
            typeof gl.getUniformBlockIndex === 'function' &&
            typeof gl.uniformBlockBinding === 'function');
    }

    static createLayout(uniforms) {
        let offset = 0;
        const layout = {};

        for (const [name, type] of Object.entries(uniforms)) {
            const type_info = TYPES[type];
            if (!type_info) {
                throw new Error(`UniformBuffer: unsupported std140 type '${type}' for '${name}'`);
            }

            offset = align(offset, type_info.alignment);
            layout[name] = Object.assign({ name, type, offset }, type_info);
            offset += type_info.size;
        }

        return {
            byte_length: align(offset, BLOCK_ALIGNMENT),
            uniforms: layout
        };
    }

    constructor(gl, options = {}) {
        const has_buffer_factory = typeof options.bufferFactory === 'function';
        if (!UniformBuffer.isSupported(gl) && !has_buffer_factory) {
            throw new Error('UniformBuffer requires a WebGL2 context');
        }
        if (!options.name) {
            throw new Error('UniformBuffer requires a uniform block name');
        }

        this.gl = gl;
        this.name = options.name;
        this.binding = options.binding || 0;
        this.usage = options.usage || (has_buffer_factory ? null : gl.DYNAMIC_DRAW);
        this.layout = UniformBuffer.createLayout(options.uniforms || {});
        this.data = new ArrayBuffer(this.layout.byte_length);
        this.data_view = new DataView(this.data);
        this.buffer_resource = has_buffer_factory && options.bufferFactory({
            id: this.name,
            byteLength: this.layout.byte_length,
            usage: 'uniform'
        });
        this.buffer = has_buffer_factory ?
            this.buffer_resource && (this.buffer_resource.handle || this.buffer_resource) : gl.createBuffer();
        this.program_indices = new WeakMap();
        this.dirty = false;

        if (!this.buffer) {
            throw new Error(`UniformBuffer: could not create buffer '${this.name}'`);
        }
        if (this.buffer_resource) {
            if (typeof this.buffer_resource.write !== 'function' ||
                typeof this.buffer_resource.destroy !== 'function') {
                throw new Error('UniformBuffer: bufferFactory must return a resource with handle, write, and destroy');
            }
        }
        else {
            this.withBufferBinding(() => {
                gl.bufferData(gl.UNIFORM_BUFFER, this.layout.byte_length, this.usage);
            });
        }
    }

    get byteLength() {
        return this.layout.byte_length;
    }

    getDeclaration({ language = 'glsl', group = 0, variableName } = {}) {
        if (language === 'wgsl') {
            return this.getWGSLDeclaration({ group, variableName });
        }
        if (language !== 'glsl') {
            throw new Error(`UniformBuffer: unsupported shader language '${language}'`);
        }
        const declarations = Object.values(this.layout.uniforms)
            .map(uniform => `    ${uniform.type} ${uniform.name};`)
            .join('\n');
        return `layout(std140) uniform ${this.name} {\n${declarations}\n};`;
    }

    getWGSLDeclaration({ group = 0, variableName } = {}) {
        variableName = variableName || this.name;
        const struct_name = `${this.name}Uniforms`;
        const declarations = Object.values(this.layout.uniforms)
            .map(uniform => `    ${uniform.name}: ${uniform.wgsl},`)
            .join('\n');
        return [
            `struct ${struct_name} {`,
            declarations,
            '};',
            `@group(${group}) @binding(${this.binding}) var<uniform> ${variableName}: ${struct_name};`
        ].join('\n');
    }

    getBindingLayout({ group = 0 } = {}) {
        return {
            type: 'uniform',
            name: this.name,
            group,
            location: this.binding,
            minBindingSize: this.byteLength
        };
    }

    setUniform(name, value) {
        const uniform = this.layout.uniforms[name];
        if (!uniform) {
            throw new Error(`UniformBuffer '${this.name}' has no uniform '${name}'`);
        }

        const values = (typeof value === 'number' || typeof value === 'boolean') ? [value] : value;
        const required = uniform.columns ? uniform.columns * uniform.rows : uniform.components;
        if (!values || values.length !== required) {
            throw new Error(`UniformBuffer '${this.name}.${name}' requires ${required} values`);
        }

        if (uniform.columns) {
            for (let column = 0; column < uniform.columns; column++) {
                for (let row = 0; row < uniform.rows; row++) {
                    const index = column * uniform.rows + row;
                    this.data_view.setFloat32(uniform.offset + column * BLOCK_ALIGNMENT + row * 4, values[index], true);
                }
            }
        }
        else {
            for (let component = 0; component < uniform.components; component++) {
                const offset = uniform.offset + component * 4;
                if (uniform.kind === 'int') {
                    this.data_view.setInt32(offset, values[component], true);
                }
                else {
                    this.data_view.setFloat32(offset, values[component], true);
                }
            }
        }

        this.dirty = true;
        return this;
    }

    setUniforms(uniforms) {
        for (const [name, value] of Object.entries(uniforms)) {
            this.setUniform(name, value);
        }
        return this;
    }

    upload() {
        if (!this.buffer || !this.dirty) {
            return false;
        }

        const data = new Uint8Array(this.data);
        if (this.buffer_resource) {
            this.buffer_resource.write(data);
        }
        else {
            this.withBufferBinding(() => {
                this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, data);
            });
        }
        this.dirty = false;
        return true;
    }

    bind(program) {
        if (!this.buffer || !program || !UniformBuffer.isSupported(this.gl)) {
            return false;
        }

        let program_binding = this.program_indices.get(program);
        if (program_binding === undefined) {
            const index = this.gl.getUniformBlockIndex(program, this.name);
            if (index === this.gl.INVALID_INDEX || index === INVALID_INDEX) {
                program_binding = null;
            }
            else {
                program_binding = { index };
                this.gl.uniformBlockBinding(program, index, this.binding);
            }
            this.program_indices.set(program, program_binding);
        }
        if (program_binding == null) {
            return false;
        }

        this.upload();
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, this.binding, this.buffer);
        return true;
    }

    invalidateProgram(program) {
        if (this.program_indices && program) {
            this.program_indices.delete(program);
        }
    }

    destroy() {
        if (this.buffer) {
            if (this.buffer_resource) {
                this.buffer_resource.destroy();
            }
            else {
                this.gl.deleteBuffer(this.buffer);
            }
            this.buffer = null;
        }
        this.buffer_resource = null;
        this.gl = null;
        this.data = null;
        this.data_view = null;
        this.program_indices = null;
    }

    withBufferBinding(callback) {
        const gl = this.gl;
        const previous = typeof gl.getParameter === 'function' && gl.UNIFORM_BUFFER_BINDING != null ?
            gl.getParameter(gl.UNIFORM_BUFFER_BINDING) : null;
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
        try {
            return callback();
        }
        finally {
            gl.bindBuffer(gl.UNIFORM_BUFFER, previous);
        }
    }
}

function align(value, alignment) {
    return Math.ceil(value / alignment) * alignment;
}
