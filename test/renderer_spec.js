import { assert } from 'chai';
import Renderer from '../src/scene/renderer';

const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

describe('Renderer', function () {
    it('constructs an externally driven scene and applies a host frame', function () {
        const renderer = Renderer.create({});
        const scene = renderer.scene;
        sinon.spy(scene, 'resizeMap');
        sinon.spy(scene.view, 'setView');
        sinon.spy(scene, 'setCameraMatrices');

        renderer.setFrame({
            viewport: { width: 800, height: 600 },
            view: { longitude: -74, latitude: 40.7, zoom: 16 },
            camera: {
                view: IDENTITY_MATRIX,
                projection: IDENTITY_MATRIX,
                position: [0, 0, 0]
            },
            tileBuffer: 2
        });

        assert.isFalse(scene.render_loop);
        assert.isTrue(scene.view.external_camera);
        assert.isTrue(scene.resizeMap.calledWith(800, 600));
        assert.isTrue(scene.view.setView.calledWith({ lng: -74, lat: 40.7, zoom: 16 }));
        assert.isTrue(scene.setCameraMatrices.calledOnce);
        assert.strictEqual(scene.view.buffer, 2);
    });

    it('submits updates directly to the host render pass', function () {
        const renderer = Renderer.create({});
        const render_pass = {};
        sinon.stub(renderer.scene, 'updateScene').returns(true);
        sinon.spy(renderer.scene, 'processTasks');

        const rendered = renderer.render({ force: true, renderPass: render_pass });

        assert.isTrue(rendered);
        assert.isTrue(renderer.scene.dirty);
        assert.isTrue(renderer.scene.updateScene.calledWith({ renderPass: render_pass }));
        assert.isTrue(renderer.scene.processTasks.calledOnce);
    });

    it('requests another host frame while an active style is animated', function () {
        const request_redraw = sinon.spy();
        const renderer = Renderer.create({}, { requestRedraw: request_redraw });
        sinon.stub(renderer.scene, 'updateScene').returns(true);
        renderer.scene.config = { scene: {} };
        Object.defineProperty(renderer.scene, 'animated', {
            configurable: true,
            value: true
        });

        renderer.render();

        assert.isTrue(request_redraw.calledOnce);
    });

    it('owns the luma device backend and installs its scene resource factories', function () {
        const device = {
            type: 'webgpu',
            info: { shadingLanguage: 'wgsl' },
            limits: { maxTextureDimension2D: 4096 },
            createBuffer() {},
            createShader() {},
            createTexture() {},
            createRenderPipeline() {},
            createVertexArray() {}
        };
        Object.defineProperty(device, 'handle', {
            get() { throw new Error('portable scenes must not read device.handle'); }
        });
        const renderer = Renderer.create({}, { device });
        sinon.spy(renderer.device_renderer, 'destroy');

        assert.strictEqual(renderer.device_renderer.device, device);
        assert.strictEqual(renderer.scene.mesh_renderer, renderer.device_renderer);
        assert.isTrue(renderer.scene.enable_uniform_buffers);
        assert.strictEqual(renderer.scene.max_texture_size, 4096);
        assert.isFunction(renderer.scene.uniform_buffer_factory);
        assert.isFunction(renderer.scene.shader_factory);
        assert.isFunction(renderer.scene.mesh_buffer_factory);
        assert.isFunction(renderer.scene.texture_factory);

        renderer.destroy();
        assert.isTrue(renderer.device_renderer.destroy.calledOnce);
    });

    it('initializes portable scene resources without constructing a WebGL context', function () {
        const buffers = [];
        const device = {
            type: 'webgpu',
            info: { shadingLanguage: 'wgsl' },
            limits: { maxTextureDimension2D: 4096 },
            createBuffer(options) {
                const buffer = {
                    options,
                    write() {},
                    destroy() { this.destroyed = true; }
                };
                buffers.push(buffer);
                return buffer;
            },
            createShader() {},
            createTexture() {},
            createRenderPipeline() {},
            createVertexArray() {}
        };
        Object.defineProperty(device, 'handle', {
            get() { throw new Error('portable scenes must not read device.handle'); }
        });
        const canvas = document.createElement('canvas');
        const renderer = Renderer.create({}, { device, canvas });

        renderer.scene.createCanvas();
        renderer.scene.initialized = true;
        renderer.scene.setRenderState({
            depth_test: true,
            depth_write: false,
            cull_face: false,
            blend: 'overlay'
        });

        assert.isTrue(renderer.scene.portable_rendering);
        assert.strictEqual(renderer.scene.canvas, canvas);
        assert.strictEqual(renderer.scene.resource_context, device);
        assert.strictEqual(renderer.scene.gl, renderer.scene.resource_context);
        assert.notProperty(renderer.scene.gl, 'getExtension');
        assert.lengthOf(buffers, 3);
        assert.deepEqual(renderer.scene.mesh_render_state, {
            cullMode: 'none',
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

        renderer.destroy();
        assert.isTrue(buffers.every(buffer => buffer.destroyed));
    });
});
