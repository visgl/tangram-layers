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

    it('omits WebGL compatibility uniforms from WebGPU draw calls', function () {
        const device = createDevice([]);
        device.type = 'webgpu';
        device.info.shadingLanguage = 'wgsl';
        const renderer = new LumaDeviceRenderer(device);
        const render_pass = createRenderPass();
        const program = createProgram({ u_scale: 2 });
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

    it('preserves Tangram depth, cull, and blend state in WebGPU pipelines', function () {
        const device = createDevice([]);
        device.type = 'webgpu';
        device.info.shadingLanguage = 'wgsl';
        Object.defineProperty(device, 'handle', {
            get() {
                throw new Error('device.handle must not be read');
            }
        });
        const renderer = new LumaDeviceRenderer(device);
        const render_state = Object.freeze({
            cullMode: 'back',
            depthCompare: 'less',
            depthWriteEnabled: false,
            blend: true,
            blendColorOperation: 'add',
            blendColorSrcFactor: 'src-alpha',
            blendColorDstFactor: 'one-minus-src-alpha',
            blendAlphaOperation: 'add',
            blendAlphaSrcFactor: 'one',
            blendAlphaDstFactor: 'one-minus-src-alpha'
        });

        renderer.drawMesh({
            mesh: createMesh(),
            program: createProgram({}),
            renderPass: createRenderPass(),
            renderState: render_state,
            visibleTime: 0
        });

        assert.strictEqual(device.pipeline.options.parameters, render_state);
    });

    it('snapshots mutable uniform blocks per mesh for deferred WebGPU execution', function () {
        const device = createDevice([]);
        device.type = 'webgpu';
        device.info.shadingLanguage = 'wgsl';
        device.pipelineBindings = [
            { type: 'uniform', name: 'TangramTile' },
            { type: 'uniform', name: 'TangramLine' }
        ];
        const renderer = new LumaDeviceRenderer(device);
        const render_pass = createRenderPass();
        const tile_data = new ArrayBuffer(16);
        const tile_values = new Float32Array(tile_data);
        const line_data = new ArrayBuffer(16);
        const line_values = new Float32Array(line_data);
        const shared_tile_buffer = { id: 'shared-tile-buffer' };
        const shared_line_buffer = { id: 'shared-line-buffer' };
        const program = createProgram({});
        program.uniform_blocks = {
            TangramTile: {
                data: tile_data,
                byteLength: tile_data.byteLength,
                snapshot_per_mesh: true
            },
            TangramLine: {
                data: line_data,
                byteLength: line_data.byteLength,
                snapshot_per_mesh: true
            }
        };
        program.getBindings = () => ({
            TangramTile: shared_tile_buffer,
            TangramLine: shared_line_buffer
        });
        const first_mesh = createMesh();
        const second_mesh = createMesh();
        second_mesh.id = 2;

        tile_values[0] = 1;
        line_values[0] = 10;
        renderer.drawMesh({
            mesh: first_mesh,
            program,
            renderPass: render_pass,
            visibleTime: 0
        });
        tile_values[0] = 2;
        line_values[0] = 20;
        renderer.drawMesh({
            mesh: second_mesh,
            program,
            renderPass: render_pass,
            visibleTime: 0
        });

        assert.lengthOf(device.buffers, 4);
        assert.notStrictEqual(render_pass.bindings[0].TangramTile, shared_tile_buffer);
        assert.notStrictEqual(render_pass.bindings[0].TangramLine, shared_line_buffer);
        assert.notStrictEqual(
            render_pass.bindings[0].TangramTile,
            render_pass.bindings[1].TangramTile
        );
        assert.deepEqual(
            render_pass.bindings.map(bindings => bindings.TangramTile.writes[0][0]),
            [1, 2]
        );
        assert.deepEqual(
            render_pass.bindings.map(bindings => bindings.TangramLine.writes[0][0]),
            [10, 20]
        );

        renderer.destroy();
        assert.isTrue(device.buffers.every(buffer => buffer.destroyed));
        assert.isTrue(device.buffers[1].destroyed);
    });
});

function createDevice(calls) {
    return {
        type: 'webgl',
        info: { shadingLanguage: 'glsl' },
        limits: { maxTextureDimension2D: 4096 },
        buffers: [],
        createBuffer(options) {
            calls.push(['buffer', options]);
            const buffer = {
                options,
                writes: [],
                destroyed: false,
                destroy() {
                    this.destroyed = true;
                },
                write(data) {
                    this.writes.push(Array.from(new Float32Array(
                        data.buffer,
                        data.byteOffset,
                        data.byteLength / Float32Array.BYTES_PER_ELEMENT
                    )));
                }
            };
            this.buffers.push(buffer);
            return buffer;
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
                options,
                shaderLayout: {
                    attributes: [{ name: 'a_position', location: 0 }],
                    bindings: this.pipelineBindings || []
                },
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
        bindings: [],
        setPipeline() {},
        setBindings(bindings) {
            this.bindings.push(bindings);
        },
        setVertexArray() {},
        draw(options) {
            this.draws.push(options);
            return true;
        }
    };
}
