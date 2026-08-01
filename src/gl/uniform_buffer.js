// WebGL2 uniform buffer wrapper with std140-compatible CPU-side packing.

const BLOCK_ALIGNMENT = 16;
const INVALID_INDEX = 0xFFFFFFFF;

const TYPES = {
    float: { alignment: 4, size: 4, components: 1, kind: 'float' },
    int: { alignment: 4, size: 4, components: 1, kind: 'int' },
    bool: { alignment: 4, size: 4, components: 1, kind: 'int' },
    vec2: { alignment: 8, size: 8, components: 2, kind: 'float' },
    ivec2: { alignment: 8, size: 8, components: 2, kind: 'int' },
    vec3: { alignment: 16, size: 16, components: 3, kind: 'float' },
    ivec3: { alignment: 16, size: 16, components: 3, kind: 'int' },
    vec4: { alignment: 16, size: 16, components: 4, kind: 'float' },
    ivec4: { alignment: 16, size: 16, components: 4, kind: 'int' },
    mat3: { alignment: 16, size: 48, columns: 3, rows: 3, kind: 'float' },
    mat4: { alignment: 16, size: 64, columns: 4, rows: 4, kind: 'float' }
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
        if (!UniformBuffer.isSupported(gl)) {
            throw new Error('UniformBuffer requires a WebGL2 context');
        }
        if (!options.name) {
            throw new Error('UniformBuffer requires a uniform block name');
        }

        this.gl = gl;
        this.name = options.name;
        this.binding = options.binding || 0;
        this.usage = options.usage || gl.DYNAMIC_DRAW;
        this.layout = UniformBuffer.createLayout(options.uniforms || {});
        this.data = new ArrayBuffer(this.layout.byte_length);
        this.data_view = new DataView(this.data);
        this.buffer = gl.createBuffer();
        this.program_indices = new WeakMap();
        this.dirty = false;

        if (!this.buffer) {
            throw new Error(`UniformBuffer: could not create buffer '${this.name}'`);
        }

        this.withBufferBinding(() => {
            gl.bufferData(gl.UNIFORM_BUFFER, this.layout.byte_length, this.usage);
        });
    }

    get byteLength() {
        return this.layout.byte_length;
    }

    getDeclaration() {
        const declarations = Object.values(this.layout.uniforms)
            .map(uniform => `    ${uniform.type} ${uniform.name};`)
            .join('\n');
        return `layout(std140) uniform ${this.name} {\n${declarations}\n};`;
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

        this.withBufferBinding(() => {
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, new Uint8Array(this.data));
        });
        this.dirty = false;
        return true;
    }

    bind(program) {
        if (!this.buffer || !program) {
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
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
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
