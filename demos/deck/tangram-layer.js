const DECK_TO_TANGRAM_ZOOM_OFFSET = 1;
const VIEW_EPSILON = 1e-7;
// luma.gl Buffer usage flags. Kept local so the demo does not add a package dependency.
const LUMA_BUFFER_COPY_DST = 0x0008;
const LUMA_BUFFER_INDEX = 0x0010;
const LUMA_BUFFER_VERTEX = 0x0020;
const LUMA_BUFFER_UNIFORM = 0x0040;

/**
 * Injects an API key into every Nextzen source in a Tangram scene.
 *
 * @param {object} config Tangram scene configuration.
 * @param {string|null|undefined} apiKey Nextzen API key.
 * @returns {boolean} `true` when at least one source was updated.
 */
export function injectNextzenApiKey(config, apiKey) {
    if (!apiKey || !config || !config.sources) {
        return false;
    }

    let updated = false;
    for (const source of Object.values(config.sources)) {
        if (source && typeof source.url === 'string' && source.url.includes('nextzen.org')) {
            source.url_params = source.url_params || {};
            source.url_params.api_key = apiKey;
            updated = true;
        }
    }
    return updated;
}

/**
 * Creates an experimental deck.gl layer class that renders Tangram through
 * deck.gl's WebGL device handle.
 *
 * The class is dependency-injected so this demo does not add deck.gl as a Tangram
 * package dependency.
 *
 * @param {object} dependencies Bridge dependencies.
 * @param {typeof import('@deck.gl/core').Layer} dependencies.Layer deck.gl Layer class.
 * @param {object} dependencies.Scene Tangram Scene class.
 * @returns {typeof import('@deck.gl/core').Layer} TangramLayer class.
 */
export function createTangramLayerClass({ Layer, Scene }) {
    if (!Layer || !Scene) {
        throw new Error('createTangramLayerClass requires Layer and Scene');
    }

    class TangramLayer extends Layer {
        initializeState() {
            this.setState({ tangramRecord: null });
        }

        updateState({ props }) {
            let record = this.state.tangramRecord;
            const shouldCreateScene = !record ||
                record.sceneSource !== props.scene ||
                record.sceneBasePath !== props.sceneBasePath ||
                record.apiKey !== props.apiKey;

            if (shouldCreateScene) {
                this._disposeTangramRecord(record);
                record = this._createTangramRecord(props);
                this.setState({ tangramRecord: record });
            }

            if (record) {
                record.owner = this;
            }
        }

        draw({ renderPass } = {}) {
            const record = this.state.tangramRecord;
            if (!record || record.disposed) {
                return;
            }

            record.owner = this;
            this._synchronizeTangramScene(record);
            if (!this._canRender(record, this.props)) {
                return;
            }

            record.scene.withWebGLContext(() => {
                const update_options = { force: true };
                renderPass = renderPass || this.context.renderPass;
                if (renderPass) {
                    update_options.renderPass = renderPass;
                }
                if (record.scene.update(update_options)) {
                    // Tangram's depth and stencil buffers are internal implementation
                    // details. Preserve its color output but leave a clean depth buffer
                    // for deck layers that follow this basemap.
                    record.gl.depthMask(true);
                    record.gl.clear(record.gl.DEPTH_BUFFER_BIT | record.gl.STENCIL_BUFFER_BIT);
                }
            });
        }

        finalizeState() {
            this._disposeTangramRecord(this.state && this.state.tangramRecord);
        }

        get isLoaded() {
            const record = this.state && this.state.tangramRecord;
            return Boolean(record && record.loaded && !record.loadFailed && !record.disposed);
        }

        _createTangramRecord(props) {
            if (!props.scene) {
                this._raiseBridgeError(new Error('scene is required'));
                return null;
            }

            const deckCanvas = this.context.deck && this.context.deck.getCanvas();
            const device = this.context.device;
            const gl = device && device.handle;
            if (!deckCanvas) {
                this._raiseBridgeError(new Error('deck canvas is required'));
                return null;
            }
            if (!device || device.type !== 'webgl' || !gl ||
                typeof device.pushState !== 'function' || typeof device.popState !== 'function' ||
                typeof device.createBuffer !== 'function' || typeof device.createShader !== 'function') {
                this._raiseBridgeError(new Error('a deck.gl WebGLDevice is required'));
                return null;
            }
            if (gl.canvas !== deckCanvas) {
                this._raiseBridgeError(new Error('deck canvas and WebGLDevice handle must share a context'));
                return null;
            }

            const record = {
                owner: this,
                scene: null,
                device,
                gl,
                deckCanvas,
                sceneSource: props.scene,
                sceneBasePath: props.sceneBasePath,
                apiKey: props.apiKey,
                canvasWidth: null,
                canvasHeight: null,
                disposed: false,
                destroyed: false,
                loadSettled: false,
                loadFailed: false,
                loaded: false,
                lastSceneError: null,
                lastViewportError: null,
                reportedViewportError: null,
                loadPromise: null,
                webglScopeDepth: 0
            };

            let scene;
            try {
                scene = Scene.create(props.scene, {
                    webGLContext: gl,
                    webGLContextScope: callback => this._withDeviceState(record, callback),
                    requestRedraw: () => {
                        if (!record.disposed && record.owner.setNeedsRedraw) {
                            record.owner.setNeedsRedraw();
                        }
                    },
                    disableRenderLoop: true,
                    enableUniformBuffers: true,
                    uniformBufferFactory: options => createDeviceUniformBuffer(device, options),
                    shaderFactory: options => createDeviceShader(device, options),
                    meshBufferFactory: options => createDeviceMeshBuffer(device, options),
                    continuousZoom: true,
                    highDensityDisplay: true,
                    logLevel: 'warn'
                });
            }
            catch (error) {
                this._raiseBridgeError(normalizeError(error));
                return null;
            }
            record.scene = scene;

            scene.subscribe({
                load: message => injectNextzenApiKey(message.config, record.apiKey),
                error: message => this._reportSceneError(record, normalizeError(message))
            });

            this._synchronizeTangramScene(record);
            record.loadPromise = Promise.resolve()
                .then(() => {
                    if (record.disposed) {
                        return null;
                    }
                    return scene.load(props.scene, {
                        base_path: props.sceneBasePath,
                        blocking: false
                    });
                })
                .then(result => {
                    if (!record.disposed) {
                        record.loaded = true;
                        record.owner.setNeedsRedraw && record.owner.setNeedsRedraw();
                        record.owner.props.onSceneLoad(scene);
                    }
                    return result;
                })
                .catch(error => {
                    if (!record.disposed) {
                        record.loadFailed = true;
                        this._reportSceneError(record, normalizeError(error));
                    }
                })
                .finally(() => {
                    record.loadSettled = true;
                    if (record.disposed) {
                        this._destroyTangramRecord(record);
                    }
                });

            return record;
        }

        _synchronizeTangramScene(record) {
            const viewport = this.context.viewport;
            const viewports = this.context.deck.getViewports ?
                this.context.deck.getViewports() : [viewport];
            const viewportError = validateViewport(viewport, viewports);

            if (viewportError) {
                record.lastViewportError = viewportError.message;
                this._raiseViewportError(record, viewportError);
                return;
            }

            record.lastViewportError = null;
            record.reportedViewportError = null;
            const width = record.deckCanvas.clientWidth || viewport.width;
            const height = record.deckCanvas.clientHeight || viewport.height;

            if (record.canvasWidth !== width || record.canvasHeight !== height) {
                record.canvasWidth = width;
                record.canvasHeight = height;
                record.scene.resizeMap(width, height);
            }

            record.scene.view.setView({
                lng: viewport.longitude,
                lat: viewport.latitude,
                zoom: viewport.zoom + DECK_TO_TANGRAM_ZOOM_OFFSET
            });
        }

        _canRender(record, props) {
            return props.visible !== false &&
                props.opacity !== 0 &&
                record.loaded &&
                !record.loadFailed &&
                !record.lastViewportError;
        }

        _raiseViewportError(record, error) {
            if (record.reportedViewportError === error.message) {
                return;
            }
            record.reportedViewportError = error.message;
            this._raiseBridgeError(error);
        }

        _reportSceneError(record, error) {
            if (record.disposed || record.lastSceneError === error.message) {
                return;
            }
            record.lastSceneError = error.message;
            record.loadFailed = true;
            record.owner.props.onSceneError(error, record.scene);
            record.owner.raiseError(error, 'TangramLayer scene');
        }

        _raiseBridgeError(error) {
            this.raiseError(error, 'TangramLayer bridge');
        }

        _disposeTangramRecord(record) {
            if (!record || record.disposed) {
                return;
            }
            record.disposed = true;
            if (!record.loadPromise || record.loadSettled) {
                this._destroyTangramRecord(record);
            }
        }

        _destroyTangramRecord(record) {
            if (!record.destroyed) {
                record.destroyed = true;
                record.scene.destroy();
            }
        }

        _withDeviceState(record, callback) {
            if (record.webglScopeDepth > 0) {
                return callback();
            }

            const { device, gl } = record;
            const lumaState = gl.lumaState;
            const hasTrackedProgram = Boolean(lumaState && 'program' in lumaState);
            const previousProgram = hasTrackedProgram ? lumaState.program :
                gl.getParameter(gl.CURRENT_PROGRAM);
            const previousActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
            const uniformBufferBindings = this._captureUniformBufferBindings(record);

            record.webglScopeDepth++;
            device.pushState();
            try {
                return callback();
            }
            finally {
                try {
                    device.popState();
                    gl.useProgram(previousProgram);
                    gl.activeTexture(previousActiveTexture);
                    this._restoreUniformBufferBindings(record, uniformBufferBindings);
                }
                finally {
                    record.webglScopeDepth--;
                }
            }
        }

        _captureUniformBufferBindings(record) {
            const { gl, scene } = record;
            if (!scene || !gl.getIndexedParameter || gl.UNIFORM_BUFFER == null) {
                return null;
            }

            const bindings = [];
            const bindingPoints = new Set(
                Object.values(scene.uniform_buffers || {}).map(uniform_buffer => uniform_buffer.binding)
            );
            for (const binding of bindingPoints) {
                bindings.push({
                    binding,
                    buffer: gl.getIndexedParameter(gl.UNIFORM_BUFFER_BINDING, binding),
                    start: gl.getIndexedParameter(gl.UNIFORM_BUFFER_START, binding),
                    size: gl.getIndexedParameter(gl.UNIFORM_BUFFER_SIZE, binding)
                });
            }
            return {
                generic: gl.getParameter(gl.UNIFORM_BUFFER_BINDING),
                bindings
            };
        }

        _restoreUniformBufferBindings(record, snapshot) {
            if (!snapshot) {
                return;
            }
            const { gl } = record;
            for (const binding of snapshot.bindings) {
                if (binding.buffer && binding.size > 0 && gl.bindBufferRange) {
                    gl.bindBufferRange(
                        gl.UNIFORM_BUFFER,
                        binding.binding,
                        binding.buffer,
                        binding.start,
                        binding.size
                    );
                }
                else {
                    gl.bindBufferBase(gl.UNIFORM_BUFFER, binding.binding, binding.buffer);
                }
            }
            gl.bindBuffer(gl.UNIFORM_BUFFER, snapshot.generic);
        }
    }

    TangramLayer.layerName = 'TangramLayer';
    TangramLayer.defaultProps = {
        scene: null,
        sceneBasePath: null,
        apiKey: null,
        onSceneLoad: () => {},
        onSceneError: () => {}
    };

    return TangramLayer;
}

function validateViewport(viewport, viewports) {
    if (viewports.length !== 1) {
        return new Error('only one deck.gl viewport is supported');
    }
    if (viewport.projectionMode != null &&
        viewport.projectionMode !== 1 &&
        viewport.projectionMode !== 4) {
        return new Error('a flat Web Mercator viewport is required');
    }
    if (!Number.isFinite(viewport.longitude) ||
        !Number.isFinite(viewport.latitude) ||
        !Number.isFinite(viewport.zoom)) {
        return new Error('a Web Mercator viewport is required');
    }
    if (Math.abs(viewport.bearing || 0) > VIEW_EPSILON ||
        Math.abs(viewport.pitch || 0) > VIEW_EPSILON) {
        return new Error('bearing and pitch must both be zero');
    }
    return null;
}

function normalizeError(value) {
    if (value instanceof Error) {
        return value;
    }
    if (value && value.error instanceof Error) {
        return value.error;
    }
    if (value && value.message) {
        return new Error(value.message);
    }
    return new Error(String(value));
}

function createDeviceUniformBuffer(device, options) {
    if (options.usage !== 'uniform') {
        throw new Error(`unsupported Tangram buffer usage '${options.usage}'`);
    }
    return device.createBuffer({
        id: `tangram-${options.id}`,
        byteLength: options.byteLength,
        usage: LUMA_BUFFER_UNIFORM | LUMA_BUFFER_COPY_DST
    });
}

function createDeviceShader(device, options) {
    return device.createShader({
        id: `tangram-${options.id}`,
        language: 'glsl',
        stage: options.stage,
        source: options.source
    });
}

function createDeviceMeshBuffer(device, options) {
    const usage = options.usage === 'vertex' ? LUMA_BUFFER_VERTEX :
        options.usage === 'index' ? LUMA_BUFFER_INDEX : null;
    if (usage == null) {
        throw new Error(`unsupported Tangram mesh buffer usage '${options.usage}'`);
    }
    const props = {
        id: `tangram-${options.id}`,
        usage: usage | LUMA_BUFFER_COPY_DST,
        data: options.data
    };
    if (options.indexType) {
        props.indexType = options.indexType;
    }
    return device.createBuffer(props);
}

export default createTangramLayerClass;
