import { assert } from 'chai';
import ShaderProgram from '../src/gl/shader_program';
import UniformBuffer from '../src/gl/uniform_buffer';

describe('UniformBuffer', function () {
    it('creates a std140-compatible layout and declaration', function () {
        const layout = UniformBuffer.createLayout({
            time: 'float',
            resolution: 'vec2',
            map_position: 'vec3',
            projection: 'mat4',
            normal: 'mat3'
        });

        assert.strictEqual(layout.uniforms.time.offset, 0);
        assert.strictEqual(layout.uniforms.resolution.offset, 8);
        assert.strictEqual(layout.uniforms.map_position.offset, 16);
        assert.strictEqual(layout.uniforms.projection.offset, 32);
        assert.strictEqual(layout.uniforms.normal.offset, 96);
        assert.strictEqual(layout.byte_length, 144);

        const uniform_buffer = new UniformBuffer(createFakeWebGL2Context(), {
            name: 'TangramView',
            uniforms: { time: 'float', resolution: 'vec2' }
        });
        assert.strictEqual(uniform_buffer.getDeclaration(), [
            'layout(std140) uniform TangramView {',
            '    float time;',
            '    vec2 resolution;',
            '};'
        ].join('\n'));
    });

    it('packs, uploads, and binds values to a program binding point', function () {
        const gl = createFakeWebGL2Context();
        const program = {};
        const uniform_buffer = new UniformBuffer(gl, {
            name: 'TangramView',
            binding: 3,
            uniforms: {
                resolution: 'vec2',
                map_position: 'vec3',
                panning: 'bool',
                normal: 'mat3'
            }
        });

        uniform_buffer.setUniforms({
            resolution: [800, 600],
            map_position: [-74, 40, 16.25],
            panning: true,
            normal: [1, 2, 3, 4, 5, 6, 7, 8, 9]
        });

        assert.isTrue(uniform_buffer.bind(program));
        assert.isFalse(uniform_buffer.upload(), 'bind uploads dirty data once');
        assert.deepEqual(gl.uniform_block_queries, [[program, 'TangramView']]);
        assert.deepEqual(gl.uniform_block_bindings, [[program, 2, 3]]);
        assert.deepEqual(gl.buffer_base_bindings, [[gl.UNIFORM_BUFFER, 3, uniform_buffer.buffer]]);
        assert.lengthOf(gl.uploads, 1);

        const floats = new Float32Array(uniform_buffer.data);
        assert.deepEqual(Array.from(floats.slice(0, 2)), [800, 600]);
        assert.deepEqual(Array.from(floats.slice(4, 7)), [-74, 40, 16.25]);
        assert.strictEqual(new Int32Array(uniform_buffer.data)[8], 1);
        assert.deepEqual(Array.from(floats.slice(12, 15)), [1, 2, 3]);
        assert.deepEqual(Array.from(floats.slice(16, 19)), [4, 5, 6]);
        assert.deepEqual(Array.from(floats.slice(20, 23)), [7, 8, 9]);

        uniform_buffer.setUniform('panning', false);
        assert.isTrue(uniform_buffer.bind(program));
        assert.lengthOf(gl.uploads, 2, 'dirty data uploads while reusing the same program');
        assert.lengthOf(gl.uniform_block_queries, 1, 'program block index is cached');
        assert.lengthOf(gl.uniform_block_bindings, 1, 'program binding is configured once');
    });

    it('rejects unsupported contexts, types, and values', function () {
        assert.isFalse(UniformBuffer.isSupported({}));
        assert.throws(() => new UniformBuffer({}, { name: 'Test' }), /WebGL2/);
        assert.throws(() => UniformBuffer.createLayout({ value: 'sampler2D' }), /unsupported/);

        const uniform_buffer = new UniformBuffer(createFakeWebGL2Context(), {
            name: 'Test',
            uniforms: { value: 'vec3' }
        });
        assert.throws(() => uniform_buffer.setUniform('missing', 1), /no uniform/);
        assert.throws(() => uniform_buffer.setUniform('value', [1, 2]), /requires 3/);
    });

    it('rebinds registered blocks when a shared-context shader program becomes current', function () {
        const gl = createFakeWebGL2Context();
        const uniform_buffer = {
            calls: [],
            bind(program) {
                this.calls.push(program);
            }
        };
        const program = new ShaderProgram(gl, '', '', {
            uniform_blocks: { TangramView: uniform_buffer }
        });
        program.program = {};
        program.compiled = true;

        ShaderProgram.resetCurrent();
        program.use();
        program.use();
        assert.deepEqual(uniform_buffer.calls, [program.program, program.program]);

        ShaderProgram.resetCurrent();
        program.use();
        assert.deepEqual(uniform_buffer.calls, [program.program, program.program, program.program]);
    });
});

function createFakeWebGL2Context() {
    const gl = {
        UNIFORM_BUFFER: 0x8A11,
        UNIFORM_BUFFER_BINDING: 0x8A28,
        DYNAMIC_DRAW: 0x88E8,
        INVALID_INDEX: 0xFFFFFFFF,
        current_buffer: null,
        uploads: [],
        uniform_block_queries: [],
        uniform_block_bindings: [],
        buffer_base_bindings: [],
        createBuffer() {
            return {};
        },
        deleteBuffer() {},
        getParameter(parameter) {
            return parameter === this.UNIFORM_BUFFER_BINDING ? this.current_buffer : null;
        },
        bindBuffer(target, buffer) {
            this.current_buffer = buffer;
        },
        bufferData() {},
        bufferSubData(target, offset, data) {
            this.uploads.push([target, offset, Array.from(data)]);
        },
        getUniformBlockIndex(program, name) {
            this.uniform_block_queries.push([program, name]);
            return 2;
        },
        uniformBlockBinding(program, index, binding) {
            this.uniform_block_bindings.push([program, index, binding]);
        },
        bindBufferBase(target, binding, buffer) {
            this.buffer_base_bindings.push([target, binding, buffer]);
        },
        useProgram() {}
    };
    return gl;
}
