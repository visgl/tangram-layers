import { assert } from 'chai';
import createTangramLayerClass from '../demos/deck/tangram-layer';

class FakeLayer {
    constructor(props = {}) {
        this.props = Object.assign({ visible: true, opacity: 1 }, this.constructor.defaultProps, props);
        this.state = {};
        this.errors = [];
        this.redrawCount = 0;
    }

    setState(state) {
        Object.assign(this.state, state);
    }

    setNeedsRedraw() {
        this.redrawCount++;
    }

    raiseError(error, message) {
        this.errors.push({ error, message });
    }
}

class FakeScene {
    constructor(source, options) {
        this.source = source;
        this.options = options;
        this.listeners = {};
        this.resizeCalls = [];
        this.viewCalls = [];
        this.updateCalls = [];
        this.onUpdate = null;
        this.destroyed = false;
        this.loadArguments = null;
        this.deferred = createDeferred();
        this.view = {
            setView: view => this.viewCalls.push(view)
        };
    }

    subscribe(listeners) {
        Object.assign(this.listeners, listeners);
    }

    load(source, options) {
        this.loadArguments = { source, options };
        return this.deferred.promise;
    }

    resizeMap(width, height) {
        this.resizeCalls.push([width, height]);
    }

    withWebGLContext(callback) {
        return this.options.webGLContextScope(callback);
    }

    update(options) {
        this.updateCalls.push(options);
        if (this.onUpdate) {
            this.onUpdate();
        }
        return true;
    }

    destroy() {
        this.destroyed = true;
    }

    emit(type, message) {
        if (this.listeners[type]) {
            this.listeners[type](message);
        }
    }
}

FakeScene.instances = [];
FakeScene.create = function(source, options) {
    const scene = new FakeScene(source, options);
    FakeScene.instances.push(scene);
    return scene;
};

const TangramLayer = createTangramLayerClass({ Layer: FakeLayer, Scene: FakeScene });

describe('TangramLayer demo bridge', function () {
    const layers = [];
    const parentElements = [];

    afterEach(async function () {
        for (const layer of layers) {
            if (layer.state.tangramRecord && !layer.state.tangramRecord.disposed) {
                layer.finalizeState();
            }
        }
        for (const scene of FakeScene.instances) {
            scene.deferred.resolve();
        }
        await flushPromises();
        for (const parentElement of parentElements) {
            parentElement.remove();
        }
        layers.length = 0;
        parentElements.length = 0;
        FakeScene.instances.length = 0;
    });

    it('shares deck WebGL context with Tangram and synchronizes the flat viewport', function () {
        const { layer, parentElement, deckCanvas, device } = createLayer();
        const scene = FakeScene.instances[0];

        assert.lengthOf(parentElement.children, 1);
        assert.strictEqual(parentElement.children[0], deckCanvas);
        assert.strictEqual(scene.options.webGLContext, device.handle);
        assert.isTrue(scene.options.disableRenderLoop);
        assert.isTrue(scene.options.enableUniformBuffers);
        assert.isFunction(scene.options.uniformBufferFactory);
        assert.isFunction(scene.options.webGLContextScope);
        assert.isFunction(scene.options.requestRedraw);
        assert.deepEqual(scene.resizeCalls, [[800, 600]]);
        assert.deepEqual(scene.viewCalls, [{
            lng: -74.009764,
            lat: 40.705319,
            zoom: 16.25
        }]);

        const uniform_buffer = scene.options.uniformBufferFactory({
            id: 'TangramView',
            byteLength: 64,
            usage: 'uniform'
        });
        assert.strictEqual(uniform_buffer, device.buffers[0]);
        assert.deepEqual(device.bufferOptions, [{
            id: 'tangram-TangramView',
            byteLength: 64,
            usage: 0x0048
        }]);

        layer.draw();
        assert.lengthOf(scene.resizeCalls, 1, 'unchanged dimensions do not resize again');
    });

    it('injects the runtime API key and reports a successful load', async function () {
        let loadedScene = null;
        const { layer } = createLayer({
            apiKey: 'runtime-key',
            onSceneLoad: scene => { loadedScene = scene; }
        });
        const scene = FakeScene.instances[0];
        await flushPromises();

        const config = {
            sources: {
                nextzen: {
                    url: 'https://tile.nextzen.org/tile/{z}/{x}/{y}.mvt',
                    url_params: { existing: 'value' }
                },
                other: { url: 'https://example.com/{z}/{x}/{y}.mvt' }
            }
        };
        scene.emit('load', { config });
        scene.deferred.resolve('loaded');
        await flushPromises();

        assert.strictEqual(config.sources.nextzen.url_params.api_key, 'runtime-key');
        assert.strictEqual(config.sources.nextzen.url_params.existing, 'value');
        assert.notProperty(config.sources.other, 'url_params');
        assert.strictEqual(loadedScene, scene);
        assert.isTrue(layer.isLoaded);
        assert.strictEqual(layer.redrawCount, 1);

        scene.options.requestRedraw();
        assert.strictEqual(layer.redrawCount, 2);
    });

    it('renders through luma WebGL state management and restores untracked state', async function () {
        const { layer, device, gl } = createLayer();
        const scene = FakeScene.instances[0];
        await flushPromises();
        scene.deferred.resolve();
        await flushPromises();

        layer.draw();

        assert.deepEqual(device.stateCalls, ['push', 'pop']);
        assert.deepEqual(scene.updateCalls, [{ force: true }]);
        assert.deepInclude(gl.calls, ['depthMask', true]);
        assert.deepInclude(gl.calls, ['clear', gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT]);
        assert.deepInclude(gl.calls, ['useProgram', 'deck-program']);
        assert.deepInclude(gl.calls, ['activeTexture', 'deck-active-texture']);
    });

    it('restores indexed and generic uniform-buffer bindings outside luma state tracking', async function () {
        const { layer, gl } = createLayer();
        const scene = FakeScene.instances[0];
        await flushPromises();
        scene.deferred.resolve();
        await flushPromises();

        scene.uniform_buffers = { TangramView: { binding: 0 } };
        gl.uniformBuffer = 'deck-generic-buffer';
        gl.indexedUniformBuffers[0] = {
            buffer: 'deck-view-buffer',
            start: 16,
            size: 64
        };
        scene.onUpdate = () => {
            gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, 'tangram-view-buffer');
            gl.bindBuffer(gl.UNIFORM_BUFFER, 'tangram-generic-buffer');
        };

        layer.draw();

        assert.deepEqual(gl.indexedUniformBuffers[0], {
            buffer: 'deck-view-buffer',
            start: 16,
            size: 64
        });
        assert.strictEqual(gl.uniformBuffer, 'deck-generic-buffer');
    });

    it('honors inherited visibility and zero opacity', async function () {
        const { layer } = createLayer();
        const scene = FakeScene.instances[0];
        await flushPromises();
        scene.deferred.resolve();
        await flushPromises();
        const hiddenProps = Object.assign({}, layer.props, { visible: false, opacity: 0.4 });

        layer.props = hiddenProps;
        layer.updateState({ props: hiddenProps, oldProps: {} });
        layer.draw();
        assert.lengthOf(scene.updateCalls, 0);

        const visibleProps = Object.assign({}, hiddenProps, { visible: true });
        layer.props = visibleProps;
        layer.updateState({ props: visibleProps, oldProps: hiddenProps });
        layer.draw();
        assert.lengthOf(scene.updateCalls, 1);

        layer.props = Object.assign({}, visibleProps, { opacity: 0 });
        layer.draw();
        assert.lengthOf(scene.updateCalls, 1);
    });

    it('hides the basemap and reports unsupported viewport states once', function () {
        const { layer, deck } = createLayer();
        const record = layer.state.tangramRecord;

        layer.context.viewport = Object.assign({}, layer.context.viewport, { bearing: 10 });
        layer.draw();
        layer.draw();
        assert.lengthOf(record.scene.updateCalls, 0);
        assert.lengthOf(layer.errors, 1);
        assert.match(layer.errors[0].error.message, /bearing and pitch/);

        layer.context.viewport = Object.assign({}, layer.context.viewport, { bearing: 0 });
        deck.viewports = [layer.context.viewport, layer.context.viewport];
        layer.draw();
        assert.lengthOf(layer.errors, 2);
        assert.match(layer.errors[1].error.message, /only one/);

        deck.viewports = null;
        layer.context.viewport = Object.assign({}, layer.context.viewport, { projectionMode: 2 });
        layer.draw();
        assert.lengthOf(layer.errors, 3);
        assert.match(layer.errors[2].error.message, /flat Web Mercator/);
    });

    it('reports scene load failures and skips shared-context rendering', async function () {
        let reportedError = null;
        const { layer } = createLayer({
            onSceneError: error => { reportedError = error; }
        });
        const scene = FakeScene.instances[0];
        await flushPromises();

        scene.deferred.reject(new Error('scene failed'));
        await flushPromises();

        assert.strictEqual(reportedError.message, 'scene failed');
        layer.draw();
        assert.lengthOf(scene.updateCalls, 0);
        assert.lengthOf(layer.errors, 1);
        assert.strictEqual(layer.errors[0].message, 'TangramLayer scene');
    });

    it('destroys a loaded scene without removing deck canvas during finalization', async function () {
        const { layer, parentElement, deckCanvas } = createLayer();
        const scene = FakeScene.instances[0];
        await flushPromises();
        scene.deferred.resolve();
        await flushPromises();

        layer.finalizeState();
        assert.isTrue(scene.destroyed);
        assert.strictEqual(parentElement.children[0], deckCanvas);
    });

    it('guards callbacks and defers destruction when finalized during loading', async function () {
        let loadCallbackCount = 0;
        const { layer, parentElement, deckCanvas } = createLayer({
            onSceneLoad: () => { loadCallbackCount++; }
        });
        const scene = FakeScene.instances[0];
        await flushPromises();

        layer.finalizeState();
        assert.isFalse(scene.destroyed);
        assert.strictEqual(parentElement.children[0], deckCanvas);

        scene.deferred.resolve();
        await flushPromises();
        assert.isTrue(scene.destroyed);
        assert.strictEqual(loadCallbackCount, 0);
    });

    function createLayer(props = {}) {
        const parentElement = document.createElement('div');
        parentElement.style.position = 'relative';
        const deckCanvas = document.createElement('canvas');
        Object.defineProperties(deckCanvas, {
            clientWidth: { configurable: true, value: 800 },
            clientHeight: { configurable: true, value: 600 },
            offsetLeft: { configurable: true, value: 4 },
            offsetTop: { configurable: true, value: 6 }
        });
        parentElement.appendChild(deckCanvas);
        document.body.appendChild(parentElement);
        parentElements.push(parentElement);

        const viewport = {
            longitude: -74.009764,
            latitude: 40.705319,
            zoom: 15.25,
            bearing: 0,
            pitch: 0,
            width: 800,
            height: 600
        };
        const gl = createFakeWebGLContext(deckCanvas);
        const device = {
            type: 'webgl',
            handle: gl,
            bufferOptions: [],
            buffers: [],
            stateCalls: [],
            createBuffer(options) {
                this.bufferOptions.push(options);
                const buffer = {
                    handle: {},
                    writes: [],
                    destroyed: false,
                    write(data) {
                        this.writes.push(data);
                    },
                    destroy() {
                        this.destroyed = true;
                    }
                };
                this.buffers.push(buffer);
                return buffer;
            },
            pushState() {
                this.stateCalls.push('push');
            },
            popState() {
                this.stateCalls.push('pop');
            }
        };
        const deck = {
            viewports: null,
            getCanvas: () => deckCanvas,
            getViewports() {
                return this.viewports || [layer.context.viewport];
            }
        };
        const layer = new TangramLayer(Object.assign({
            id: 'tangram-test',
            scene: 'scene.yaml',
            apiKey: null
        }, props));
        layer.context = { deck, device, viewport };
        layer.initializeState();
        layer.updateState({ props: layer.props, oldProps: {} });
        layers.push(layer);
        return { layer, deck, deckCanvas, device, gl, parentElement };
    }
});

function createFakeWebGLContext(canvas) {
    const gl = {
        canvas,
        CURRENT_PROGRAM: 0x8B8D,
        ACTIVE_TEXTURE: 0x84E0,
        DEPTH_BUFFER_BIT: 0x0100,
        STENCIL_BUFFER_BIT: 0x0400,
        UNIFORM_BUFFER: 0x8A11,
        UNIFORM_BUFFER_BINDING: 0x8A28,
        UNIFORM_BUFFER_START: 0x8A29,
        UNIFORM_BUFFER_SIZE: 0x8A2A,
        lumaState: { program: 'deck-program' },
        uniformBuffer: null,
        indexedUniformBuffers: {},
        calls: [],
        getParameter(parameter) {
            if (parameter === this.ACTIVE_TEXTURE) {
                return 'deck-active-texture';
            }
            if (parameter === this.UNIFORM_BUFFER_BINDING) {
                return this.uniformBuffer;
            }
            return null;
        },
        getIndexedParameter(parameter, binding) {
            const state = this.indexedUniformBuffers[binding] || {};
            if (parameter === this.UNIFORM_BUFFER_BINDING) {
                return state.buffer || null;
            }
            if (parameter === this.UNIFORM_BUFFER_START) {
                return state.start || 0;
            }
            if (parameter === this.UNIFORM_BUFFER_SIZE) {
                return state.size || 0;
            }
            return null;
        },
        useProgram(program) {
            this.calls.push(['useProgram', program]);
            this.lumaState.program = program;
        },
        activeTexture(texture) {
            this.calls.push(['activeTexture', texture]);
        },
        bindBuffer(target, buffer) {
            this.uniformBuffer = buffer;
            this.calls.push(['bindBuffer', target, buffer]);
        },
        bindBufferBase(target, binding, buffer) {
            this.indexedUniformBuffers[binding] = { buffer, start: 0, size: 0 };
            this.uniformBuffer = buffer;
            this.calls.push(['bindBufferBase', target, binding, buffer]);
        },
        bindBufferRange(target, binding, buffer, start, size) {
            this.indexedUniformBuffers[binding] = { buffer, start, size };
            this.uniformBuffer = buffer;
            this.calls.push(['bindBufferRange', target, binding, buffer, start, size]);
        },
        depthMask(value) {
            this.calls.push(['depthMask', value]);
        },
        clear(mask) {
            this.calls.push(['clear', mask]);
        }
    };
    return gl;
}

function createDeferred() {
    let resolvePromise;
    let rejectPromise;
    let settled = false;
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    return {
        promise,
        resolve(value) {
            if (!settled) {
                settled = true;
                resolvePromise(value);
            }
        },
        reject(error) {
            if (!settled) {
                settled = true;
                rejectPromise(error);
            }
        }
    };
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}
