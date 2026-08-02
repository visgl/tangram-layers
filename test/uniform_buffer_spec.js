import { assert } from 'chai';
import Context from '../src/gl/context';
import ShaderProgram from '../src/gl/shader_program';
import UniformBuffer from '../src/gl/uniform_buffer';
import {StyleManager} from '../src/styles/style_manager';
import Camera from '../src/scene/camera';
import Light from '../src/lights/light';
import Tile from '../src/tile/tile';

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

    it('upgrades legacy Tangram shader syntax and compiles a real WebGL2 uniform block', function () {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) {
            this.skip();
            return;
        }
        gl._tangram_id = 1000;
        ShaderProgram.reset();

        const uniform_buffer = new UniformBuffer(gl, {
            name: 'TangramView',
            uniforms: { u_time: 'float' }
        });
        const program = new ShaderProgram(gl, [
            'attribute vec4 a_position;',
            'uniform float u_time;',
            'varying float v_time;',
            'void main() {',
            '    v_time = u_time;',
            '    gl_Position = a_position;',
            '}'
        ].join('\n'), [
            'uniform float u_time;',
            'varying float v_time;',
            'void main() {',
            '    gl_FragColor = vec4(v_time + u_time);',
            '}'
        ].join('\n'), {
            uniform_blocks: { TangramView: uniform_buffer }
        });

        program.compile();
        uniform_buffer.setUniform('u_time', 0.25);
        program.use();

        assert.isTrue(program.compiled);
        assert.strictEqual(program.glsl_version, 300);
        assert.strictEqual(gl.getError(), gl.NO_ERROR);

        program.destroy();
        uniform_buffer.destroy();
        ShaderProgram.reset();
    });

    it('compiles Tangram polygon and point styles with the TangramView block', function () {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) {
            this.skip();
            return;
        }
        Context.configure(gl);
        ShaderProgram.reset();
        Camera.create('uniform-buffer-test', null, { type: 'flat' });
        Light.inject();

        const uniform_blocks = createTangramUniformBlocks(gl);
        const style_manager = new StyleManager();
        style_manager.init();

        for (const name of ['polygons', 'points']) {
            const style = style_manager.styles[name];
            style.init();
            style.setGL(gl, uniform_blocks);
            style.getProgram();
            assert.isTrue(style.program.compiled, `${name} style compiles`);
            assert.strictEqual(style.program.glsl_version, 300);
            if (style.selection_program) {
                style.getProgram('selection_program');
                assert.isTrue(style.selection_program.compiled, `${name} selection style compiles`);
                assert.strictEqual(style.selection_program.glsl_version, 300);
            }
        }
        assert.strictEqual(gl.getError(), gl.NO_ERROR);

        style_manager.destroy(gl);
        Object.values(uniform_blocks).forEach(uniform_buffer => uniform_buffer.destroy());
        ShaderProgram.reset();
    });

    it('routes camera and tile transforms through their uniform blocks', function () {
        const view = {
            aspect: 4 / 3,
            center: { meters: { x: 100, y: 200 } },
            meters_per_pixel: 1,
            size: {
                css: { width: 800, height: 600 },
                meters: { x: 800, y: 600 }
            },
            zoom: 16
        };
        const camera = Camera.create('uniform-routing-test', view, { type: 'flat' });
        camera.update();

        const camera_uniforms = createUniformRecorder();
        const tile_uniforms = createUniformRecorder();
        const program = {
            calls: [],
            uniform(...args) {
                this.calls.push(args);
            }
        };
        const matrices = {
            model: new Float64Array(16),
            model32: new Float32Array(16),
            model_view32: new Float32Array(16),
            normal32: new Float32Array(9),
            inverse_normal32: new Float32Array(9)
        };
        const tile = {
            coords: { z: 14 },
            fade_in: true,
            min: { x: 10, y: 20 },
            proxied_as: null,
            proxy_order_offset: 0.5,
            span: { x: 4096, y: 4096 },
            style_z: 7
        };

        Tile.prototype.setupProgram.call(tile, matrices, program, tile_uniforms);
        camera.setupMatrices(matrices, program, tile_uniforms);
        camera.setupProgram(program, camera_uniforms);

        assert.lengthOf(program.calls, 0, 'scalar uniform path is skipped');
        assert.deepEqual(tile_uniforms.values.u_tile_origin, [10, 20, 7, 14]);
        assert.strictEqual(tile_uniforms.values.u_tile_proxy_order_offset, 0.5);
        assert.isTrue(tile_uniforms.values.u_tile_fade_in);
        assert.instanceOf(tile_uniforms.values.u_model, Float32Array);
        assert.instanceOf(tile_uniforms.values.u_modelView, Float32Array);
        assert.instanceOf(tile_uniforms.values.u_normalMatrix, Float32Array);
        assert.instanceOf(tile_uniforms.values.u_inverseNormalMatrix, Float32Array);
        assert.deepEqual(camera_uniforms.values.u_eye, [0, 0, 600]);
        assert.deepEqual(camera_uniforms.values.u_vanishing_point, [0, 0]);
        assert.instanceOf(camera_uniforms.values.u_projection, Float32Array);
    });
});

function createTangramUniformBlocks(gl) {
    return {
        TangramView: new UniformBuffer(gl, {
            name: 'TangramView',
            binding: 0,
            uniforms: {
                u_resolution: 'vec2',
                u_time: 'float',
                u_map_position: 'vec3',
                u_meters_per_pixel: 'float',
                u_device_pixel_ratio: 'float',
                u_view_pan_snap_timer: 'float',
                u_view_panning: 'bool'
            }
        }),
        TangramCamera: new UniformBuffer(gl, {
            name: 'TangramCamera',
            binding: 1,
            uniforms: {
                u_projection: 'mat4',
                u_eye: 'vec3',
                u_vanishing_point: 'vec2'
            }
        }),
        TangramTile: new UniformBuffer(gl, {
            name: 'TangramTile',
            binding: 2,
            uniforms: {
                u_tile_origin: 'vec4',
                u_tile_proxy_order_offset: 'float',
                u_model: 'mat4',
                u_modelView: 'mat4',
                u_normalMatrix: 'mat3',
                u_inverseNormalMatrix: 'mat3',
                u_tile_fade_in: 'bool'
            }
        })
    };
}

function createUniformRecorder() {
    return {
        values: {},
        setUniforms(values) {
            Object.assign(this.values, values);
        }
    };
}

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
