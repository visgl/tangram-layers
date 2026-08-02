const DECK_TO_TANGRAM_ZOOM_OFFSET = 1;
const VIEW_EPSILON = 1e-7;
const DECK_WORLD_SIZE = 512;
const TANGRAM_HALF_WORLD_METERS = 20037508.342789244;
// luma.gl Buffer usage flags. Kept local so the demo does not add a package dependency.
const LUMA_BUFFER_COPY_DST = 0x0008;
const LUMA_BUFFER_INDEX = 0x0010;
const LUMA_BUFFER_VERTEX = 0x0020;
const LUMA_BUFFER_UNIFORM = 0x0040;
const LUMA_TEXTURE_COPY_DST = 0x0002;
const LUMA_TEXTURE_SAMPLE = 0x0004;
const LUMA_TEXTURE_RENDER = 0x0010;

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
 * Converts a deck.gl Web Mercator viewport into Tangram camera matrices.
 *
 * Tangram tile models use absolute EPSG:3857 meters while deck matrices consume
 * zoom-zero common coordinates. Altitude remains in physical meters and uses
 * deck's latitude-dependent distance scale.
 *
 * @param {object} viewport deck.gl WebMercatorViewport.
 * @returns {{view: Float64Array, projection: Float32Array, position: number[]}}
 */
export function getExternalCameraFrame(viewport) {
    const distance_scales = typeof viewport.getDistanceScales === 'function' ?
        viewport.getDistanceScales() : viewport.distanceScales;
    const units_per_meter = distance_scales && distance_scales.unitsPerMeter;
    if (!viewport.viewMatrix || viewport.viewMatrix.length !== 16 ||
        !viewport.projectionMatrix || viewport.projectionMatrix.length !== 16 ||
        !units_per_meter || !Number.isFinite(units_per_meter[2])) {
        throw new Error('deck viewport camera matrices and distance scales are required');
    }

    const xy_scale = DECK_WORLD_SIZE / (TANGRAM_HALF_WORLD_METERS * 2);
    const meters_to_common = new Float64Array(16);
    meters_to_common[0] = xy_scale;
    meters_to_common[5] = xy_scale;
    meters_to_common[10] = units_per_meter[2];
    meters_to_common[12] = DECK_WORLD_SIZE / 2;
    meters_to_common[13] = DECK_WORLD_SIZE / 2;
    meters_to_common[15] = 1;

    return {
        view: multiplyMatrices(viewport.viewMatrix, meters_to_common),
        projection: new Float32Array(viewport.projectionMatrix),
        // The view matrix places the camera at the origin in eye coordinates.
        position: [0, 0, 0]
    };
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
 * @param {object} dependencies.Renderer Embeddable Tangram Renderer class.
 * @returns {typeof import('@deck.gl/core').Layer} TangramLayer class.
 */
export function createTangramLayerClass({ Layer, Renderer }) {
    if (!Layer || !Renderer) {
        throw new Error('createTangramLayerClass requires Layer and Renderer');
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
                if (record.renderer.render(update_options)) {
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
                typeof device.createBuffer !== 'function' || typeof device.createShader !== 'function' ||
                typeof device.createTexture !== 'function' ||
                typeof device.createRenderPipeline !== 'function' ||
                typeof device.createVertexArray !== 'function') {
                this._raiseBridgeError(new Error('a deck.gl WebGLDevice is required'));
                return null;
            }
            if (gl.canvas !== deckCanvas) {
                this._raiseBridgeError(new Error('deck canvas and WebGLDevice handle must share a context'));
                return null;
            }

            const record = {
                owner: this,
                renderer: null,
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
                webglScopeDepth: 0,
                meshRenderer: createDeviceMeshRenderer(device)
            };

            let renderer;
            try {
                renderer = Renderer.create(props.scene, {
                    webGLContext: gl,
                    webGLContextScope: callback => this._withDeviceState(record, callback),
                    requestRedraw: () => {
                        if (!record.disposed && record.owner.setNeedsRedraw) {
                            record.owner.setNeedsRedraw();
                        }
                    },
                    enableUniformBuffers: true,
                    uniformBufferFactory: options => createDeviceUniformBuffer(device, options),
                    shaderFactory: options => createDeviceShader(device, options),
                    meshBufferFactory: options => createDeviceMeshBuffer(device, options),
                    textureFactory: options => createDeviceTexture(device, options),
                    maxTextureSize: device.limits && device.limits.maxTextureDimension2D,
                    meshRenderer: record.meshRenderer,
                    continuousZoom: true,
                    highDensityDisplay: true,
                    logLevel: 'warn'
                });
            }
            catch (error) {
                record.meshRenderer.destroy();
                this._raiseBridgeError(normalizeError(error));
                return null;
            }
            record.renderer = renderer;
            record.scene = renderer.scene;

            renderer.subscribe({
                load: message => {
                    injectNextzenApiKey(message.config, record.apiKey);
                },
                error: message => this._reportSceneError(record, normalizeError(message))
            });

            this._synchronizeTangramScene(record);
            record.loadPromise = Promise.resolve()
                .then(() => {
                    if (record.disposed) {
                        return null;
                    }
                    return renderer.load(props.scene, {
                        base_path: props.sceneBasePath,
                        blocking: false
                    });
                })
                .then(result => {
                    if (!record.disposed) {
                        record.loaded = true;
                        record.owner.setNeedsRedraw && record.owner.setNeedsRedraw();
                        record.owner.props.onSceneLoad(record.scene);
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

            const pitch = Math.abs(viewport.pitch || 0) * Math.PI / 180;
            record.canvasWidth = width;
            record.canvasHeight = height;
            record.renderer.setFrame({
                viewport: { width, height },
                view: {
                    longitude: viewport.longitude,
                    latitude: viewport.latitude,
                    zoom: viewport.zoom + DECK_TO_TANGRAM_ZOOM_OFFSET
                },
                camera: getExternalCameraFrame(viewport),
                tileBuffer: Math.min(4, Math.ceil(
                    Math.tan(pitch) * viewport.height / 256
                ))
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
                record.meshRenderer.destroy();
                record.renderer.destroy();
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

            record.webglScopeDepth++;
            device.pushState();
            try {
                return callback();
            }
            finally {
                try {
                    device.popState();
                    gl.useProgram(previousProgram);
                }
                finally {
                    record.webglScopeDepth--;
                }
            }
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
        return new Error('a Web Mercator viewport is required');
    }
    if (!Number.isFinite(viewport.longitude) ||
        !Number.isFinite(viewport.latitude) ||
        !Number.isFinite(viewport.zoom)) {
        return new Error('a Web Mercator viewport is required');
    }
    if (!Number.isFinite(viewport.bearing || 0) ||
        !Number.isFinite(viewport.pitch || 0) ||
        (viewport.pitch || 0) < -VIEW_EPSILON ||
        (viewport.pitch || 0) >= 90) {
        return new Error('bearing and pitch must describe a finite deck.gl camera');
    }
    try {
        getExternalCameraFrame(viewport);
    }
    catch (error) {
        return error;
    }
    return null;
}

function multiplyMatrices(left, right) {
    const result = new Float64Array(16);
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
            let value = 0;
            for (let index = 0; index < 4; index++) {
                value += left[index * 4 + row] * right[column * 4 + index];
            }
            result[column * 4 + row] = value;
        }
    }
    return result;
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

function createDeviceTexture(device, options) {
    const mipmapped = options.filtering === 'mipmap';
    const filter = options.filtering === 'nearest' ? 'nearest' : 'linear';
    const texture = device.createTexture({
        id: `tangram-${options.id}`,
        width: options.width,
        height: options.height,
        format: 'rgba8unorm',
        usage: LUMA_TEXTURE_COPY_DST | LUMA_TEXTURE_SAMPLE | LUMA_TEXTURE_RENDER,
        mipLevels: mipmapped ? Math.floor(Math.log2(Math.max(options.width, options.height))) + 1 : 1,
        sampler: {
            minFilter: filter,
            magFilter: filter,
            mipmapFilter: mipmapped ? 'linear' : 'none',
            addressModeU: options.repeat ? 'repeat' : 'clamp-to-edge',
            addressModeV: options.repeat ? 'repeat' : 'clamp-to-edge'
        }
    });

    try {
        if (options.data != null) {
            if (ArrayBuffer.isView(options.data) || options.data instanceof ArrayBuffer) {
                texture.writeData(options.data, {
                    width: options.width,
                    height: options.height
                });
            }
            else {
                texture.copyExternalImage({
                    image: options.data,
                    width: options.width,
                    height: options.height,
                    flipY: options.flipY,
                    premultipliedAlpha: options.premultipliedAlpha
                });
            }
            if (mipmapped) {
                texture.generateMipmapsWebGL();
            }
        }
        return texture;
    }
    catch (error) {
        texture.destroy();
        throw error;
    }
}

function createDeviceMeshRenderer(device) {
    const pipeline_cache = new WeakMap();
    const vertex_array_cache = new WeakMap();
    const pipelines = new Set();
    const vertex_arrays = new Set();

    return {
        drawMesh({ mesh, program, renderPass, renderState, visibleTime }) {
            if (!renderPass || !program || !program.vertex_shader_resource ||
                !program.fragment_shader_resource) {
                throw new Error('Tangram luma renderer requires an active render pass and shader resources');
            }

            const descriptor = mesh.getDrawDescriptor();
            const pipeline = getPipeline(program, mesh.vertex_layout, descriptor, renderState);

            if (mesh.uniforms) {
                program.saveUniforms(mesh.uniforms);
                program.setUniforms(mesh.uniforms, false);
            }

            try {
                program.uniform('1f', 'u_visible_time', visibleTime);
                const bindings = program.getBindings();
                assertPipelineBindings(pipeline, bindings);
                const vertex_array = getVertexArray(mesh, pipeline, descriptor);
                renderPass.setPipeline(pipeline);
                renderPass.setBindings(bindings);
                renderPass.setVertexArray(vertex_array);
                const draw_succeeded = renderPass.draw({
                    vertexCount: descriptor.indexBuffer ? undefined : descriptor.vertexCount,
                    indexCount: descriptor.indexBuffer ? descriptor.indexCount : undefined,
                    uniforms: program.getUniformValues()
                });
                return draw_succeeded === false && pipeline.isPending === true;
            }
            finally {
                if (mesh.uniforms) {
                    program.restoreUniforms(mesh.uniforms);
                }
            }
        },

        destroy() {
            for (const vertex_array of vertex_arrays) {
                vertex_array.destroy();
            }
            for (const pipeline of pipelines) {
                pipeline.destroy();
            }
            vertex_arrays.clear();
            pipelines.clear();
        }
    };

    function getPipeline(program, vertex_layout, descriptor, render_state) {
        let layouts = pipeline_cache.get(program);
        if (!layouts) {
            layouts = new WeakMap();
            pipeline_cache.set(program, layouts);
        }
        let topologies = layouts.get(vertex_layout);
        if (!topologies) {
            topologies = new Map();
            layouts.set(vertex_layout, topologies);
        }
        let states = topologies.get(descriptor.topology);
        if (!states) {
            states = new Map();
            topologies.set(descriptor.topology, states);
        }
        const state_key = JSON.stringify(render_state || {});
        let pipeline = states.get(state_key);
        if (!pipeline) {
            const pipeline_options = {
                id: `tangram-${program.name || program.id}-${descriptor.topology}-${states.size}`,
                vs: program.vertex_shader_resource,
                fs: program.fragment_shader_resource,
                bufferLayout: [descriptor.bufferLayout],
                topology: descriptor.topology,
                disableWarnings: true
            };
            if (render_state) {
                pipeline_options.parameters = render_state;
            }
            pipeline = device.createRenderPipeline(pipeline_options);
            states.set(state_key, pipeline);
            pipelines.add(pipeline);
        }
        return pipeline;
    }

    function getVertexArray(mesh, pipeline, descriptor) {
        let pipelines_for_mesh = vertex_array_cache.get(mesh);
        if (!pipelines_for_mesh) {
            pipelines_for_mesh = new WeakMap();
            vertex_array_cache.set(mesh, pipelines_for_mesh);
        }
        let vertex_array = pipelines_for_mesh.get(pipeline);
        if (vertex_array) {
            return vertex_array;
        }

        vertex_array = device.createVertexArray({
            id: `tangram-mesh-${mesh.id}-${pipeline.id}`,
            shaderLayout: pipeline.shaderLayout,
            bufferLayout: pipeline.bufferLayout
        });
        const attributes = new Map(
            pipeline.shaderLayout.attributes.map(attribute => [attribute.name, attribute])
        );
        for (const attribute of descriptor.bufferLayout.attributes) {
            const shader_attribute = attributes.get(attribute.attribute);
            if (shader_attribute) {
                vertex_array.setBuffer(shader_attribute.location, descriptor.vertexBuffer);
            }
        }
        for (const attribute of descriptor.staticAttributes) {
            const shader_attribute = attributes.get(attribute.attribute);
            if (shader_attribute) {
                vertex_array.setConstantWebGL(
                    shader_attribute.location,
                    new Float32Array(attribute.value)
                );
            }
        }
        if (descriptor.indexBuffer) {
            vertex_array.setIndexBuffer(descriptor.indexBuffer);
        }

        pipelines_for_mesh.set(pipeline, vertex_array);
        vertex_arrays.add(vertex_array);
        return vertex_array;
    }
}

function assertPipelineBindings(pipeline, bindings) {
    for (const binding of pipeline.shaderLayout.bindings) {
        if (binding.type !== 'uniform' && binding.type !== 'texture') {
            throw new Error(`Tangram luma renderer does not support '${binding.type}' bindings`);
        }
        if (!bindings[binding.name]) {
            throw new Error(`Tangram luma renderer is missing '${binding.name}' binding`);
        }
    }
}

export default createTangramLayerClass;
