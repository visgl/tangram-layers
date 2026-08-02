import { assert } from 'chai';
import LumaDeviceRenderer from '../src/gpu/luma_device_renderer';

describe('LumaDeviceRenderer', function () {
    it('creates portable Tangram resources without reading a backend handle', function () {
        const calls = [];
        const device = createDevice(calls);
        Object.defineProperty(device, 'handle', {
            get() {
                throw new Error('device.handle must not be read');
            }
        });
        const renderer = new LumaDeviceRenderer(device);
        const options = renderer.getSceneOptions();

        options.uniformBufferFactory({ id: 'view', usage: 'uniform', byteLength: 64 });
        options.meshBufferFactory({
            id: 'vertices',
            usage: 'vertex',
            data: new Float32Array([0, 1])
        });
        options.shaderFactory({ id: 'polygon-vertex', stage: 'vertex', source: 'shader' });
        options.textureFactory({
            id: 'atlas',
            width: 1,
            height: 1,
            filtering: 'nearest',
            data: new Uint8Array([255, 255, 255, 255])
        });

        assert.deepEqual(calls.map(call => call[0]), [
            'buffer', 'buffer', 'shader', 'texture', 'texture-write'
        ]);
        assert.strictEqual(options.meshRenderer, renderer);
        assert.strictEqual(options.maxTextureSize, 4096);
    });

    it('rejects scalar uniforms on WebGPU draw calls', function () {
        const device = createDevice([]);
        device.type = 'webgpu';
        device.info.shadingLanguage = 'wgsl';
        const renderer = new LumaDeviceRenderer(device);
        const render_pass = createRenderPass();
        const program = createProgram({ u_scale: 2 });
        const mesh = createMesh();

        assert.throws(() => renderer.drawMesh({
            mesh,
            program,
            renderPass: render_pass,
            visibleTime: 0
        }), 'requires all uniforms to use buffer bindings');
    });

    it('submits a buffer-bound WebGPU mesh without WebGL compatibility uniforms', function () {
        const device = createDevice([]);
        device.type = 'webgpu';
        device.info.shadingLanguage = 'wgsl';
        const renderer = new LumaDeviceRenderer(device);
        const render_pass = createRenderPass();
        const program = createProgram({});
        const mesh = createMesh();

        assert.isFalse(renderer.drawMesh({
            mesh,
            program,
            renderPass: render_pass,
            visibleTime: 0
        }));
        assert.deepEqual(render_pass.draws, [{
            vertexCount: 3,
            indexCount: undefined,
            uniforms: undefined
        }]);

        renderer.destroy();
        assert.isTrue(device.pipeline.destroyed);
        assert.isTrue(device.vertex_array.destroyed);
    });
});

function createDevice(calls) {
    return {
        type: 'webgl',
        info: { shadingLanguage: 'glsl' },
        limits: { maxTextureDimension2D: 4096 },
        createBuffer(options) {
            calls.push(['buffer', options]);
            return { destroy() {}, write() {} };
        },
        createShader(options) {
            calls.push(['shader', options]);
            return { destroy() {} };
        },
        createTexture(options) {
            calls.push(['texture', options]);
            return {
                writeData(data, write_options) {
                    calls.push(['texture-write', data, write_options]);
                },
                copyExternalImage() {},
                generateMipmapsWebGL() {},
                destroy() {}
            };
        },
        createRenderPipeline(options) {
            this.pipeline = {
                id: options.id,
                shaderLayout: { attributes: [{ name: 'a_position', location: 0 }], bindings: [] },
                bufferLayout: options.bufferLayout,
                isPending: false,
                destroyed: false,
                destroy() {
                    this.destroyed = true;
                }
            };
            return this.pipeline;
        },
        createVertexArray() {
            this.vertex_array = {
                destroyed: false,
                setBuffer() {},
                setIndexBuffer() {},
                destroy() {
                    this.destroyed = true;
                }
            };
            return this.vertex_array;
        }
    };
}

function createProgram(uniforms) {
    return {
        id: 1,
        name: 'polygon',
        vertex_shader_resource: {},
        fragment_shader_resource: {},
        uniform(method, name, value) {
            if (name !== 'u_visible_time' || Object.keys(uniforms).length > 0) {
                uniforms[name] = value;
            }
        },
        getBindings: () => ({}),
        getUniformValues: () => uniforms
    };
}

function createMesh() {
    return {
        id: 1,
        vertex_layout: {},
        uniforms: null,
        getDrawDescriptor: () => ({
            topology: 'triangle-list',
            vertexCount: 3,
            indexCount: 0,
            vertexBuffer: {},
            indexBuffer: null,
            bufferLayout: {
                name: 'vertices',
                byteStride: 8,
                attributes: [{ attribute: 'a_position', format: 'float32x2', byteOffset: 0 }]
            },
            staticAttributes: []
        })
    };
}

function createRenderPass() {
    return {
        draws: [],
        setPipeline() {},
        setBindings() {},
        setVertexArray() {},
        draw(options) {
            this.draws.push(options);
            return true;
        }
    };
}
