const DECK_TO_TANGRAM_ZOOM_OFFSET = 1;
const VIEW_EPSILON = 1e-7;
const DECK_WORLD_SIZE = 512;
const TANGRAM_HALF_WORLD_METERS = 20037508.342789244;

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
  const distance_scales =
    typeof viewport.getDistanceScales === 'function'
      ? viewport.getDistanceScales()
      : viewport.distanceScales;
  const units_per_meter = distance_scales && distance_scales.unitsPerMeter;
  if (
    !viewport.viewMatrix ||
    viewport.viewMatrix.length !== 16 ||
    !viewport.projectionMatrix ||
    viewport.projectionMatrix.length !== 16 ||
    !units_per_meter ||
    !Number.isFinite(units_per_meter[2])
  ) {
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
 * Tangram's luma.gl device renderer.
 *
 * The class is dependency-injected so this demo does not add deck.gl as a Tangram
 * package dependency.
 *
 * @param {object} dependencies Bridge dependencies.
 * @param {typeof import('@deck.gl/core').Layer} dependencies.Layer deck.gl Layer class.
 * @param {object} dependencies.ClassicWebGLRenderer Embeddable Tangram renderer class.
 * @param {object} dependencies.Renderer Legacy alias for ClassicWebGLRenderer.
 * @returns {typeof import('@deck.gl/core').Layer} TangramLayer class.
 */
export function createTangramLayerClass({Layer, ClassicWebGLRenderer, Renderer}) {
  const rendererClass = ClassicWebGLRenderer || Renderer;
  if (!Layer || !rendererClass) {
    throw new Error('createTangramLayerClass requires Layer and ClassicWebGLRenderer');
  }

  class TangramLayer extends Layer {
    initializeState() {
      this.setState({tangramRecord: null});
    }

    updateState({props}) {
      let record = this.state.tangramRecord;
      const shouldCreateScene =
        !record ||
        record.sceneSource !== props.scene ||
        record.sceneBasePath !== props.sceneBasePath ||
        record.apiKey !== props.apiKey;

      if (shouldCreateScene) {
        this._disposeTangramRecord(record);
        record = this._createTangramRecord(props);
        this.setState({tangramRecord: record});
      }

      if (record) {
        record.owner = this;
      }
    }

    draw({renderPass} = {}) {
      const record = this.state.tangramRecord;
      if (!record || record.disposed) {
        return;
      }

      record.owner = this;
      this._synchronizeTangramScene(record);
      if (!this._canRender(record, this.props)) {
        return;
      }

      const renderTangram = () => {
        const update_options = {force: true};
        renderPass = renderPass || this.context.renderPass;
        if (renderPass) {
          update_options.renderPass = renderPass;
        }
        const rendered = record.renderer.render(update_options);
        if (
          record.scene.config &&
          record.scene.config.scene &&
          record.scene.config.scene.animated === true
        ) {
          // Keep host-driven scenes moving even while deck's view is idle.
          // Tangram's active-style list can lag tile/style activation by a frame.
          this.setNeedsRedraw();
        }
        if (rendered && record.gl) {
          // Tangram's depth and stencil buffers are internal implementation
          // details. Preserve its color output but leave a clean depth buffer
          // for deck layers that follow this basemap.
          record.gl.depthMask(true);
          record.gl.clear(record.gl.DEPTH_BUFFER_BIT | record.gl.STENCIL_BUFFER_BIT);
        }
      };

      if (record.device.type === 'webgl') {
        record.scene.withWebGLContext(renderTangram);
      } else {
        renderTangram();
      }
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
      if (!deckCanvas) {
        this._raiseBridgeError(new Error('deck canvas is required'));
        return null;
      }
      if (
        !device ||
        (device.type !== 'webgl' && device.type !== 'webgpu') ||
        typeof device.createBuffer !== 'function' ||
        typeof device.createShader !== 'function' ||
        typeof device.createTexture !== 'function' ||
        typeof device.createRenderPipeline !== 'function' ||
        typeof device.createVertexArray !== 'function'
      ) {
        this._raiseBridgeError(new Error('a deck.gl luma.gl Device is required'));
        return null;
      }

      let gl = null;
      if (device.type === 'webgl') {
        gl = device.handle;
        if (
          !gl ||
          typeof device.pushState !== 'function' ||
          typeof device.popState !== 'function'
        ) {
          this._raiseBridgeError(new Error('a deck.gl WebGLDevice is required'));
          return null;
        }
        if (gl.canvas !== deckCanvas) {
          this._raiseBridgeError(
            new Error('deck canvas and WebGLDevice handle must share a context')
          );
          return null;
        }
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
        webglScopeDepth: 0
      };

      let renderer;
      try {
        const renderer_options = {
          device,
          canvas: deckCanvas,
          requestRedraw: () => {
            if (!record.disposed && record.owner.setNeedsRedraw) {
              record.owner.setNeedsRedraw();
            }
          },
          continuousZoom: true,
          highDensityDisplay: true,
          logLevel: 'warn'
        };
        if (gl) {
          renderer_options.webGLContext = gl;
          renderer_options.webGLContextScope = (callback) =>
            this._withDeviceState(record, callback);
        }
        renderer = rendererClass.create(props.scene, renderer_options);
      } catch (error) {
        this._raiseBridgeError(normalizeError(error));
        return null;
      }
      record.renderer = renderer;
      record.scene = renderer.scene;

      renderer.subscribe({
        load: (message) => {
          injectNextzenApiKey(message.config, record.apiKey);
        },
        error: (message) =>
          this._reportSceneError(record, normalizeError(message), message.type !== 'scene_import')
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
        .then((result) => {
          if (!record.disposed) {
            record.loaded = true;
            record.owner.setNeedsRedraw && record.owner.setNeedsRedraw();
            record.owner.props.onSceneLoad(record.scene);
          }
          return result;
        })
        .catch((error) => {
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
      const viewports = this.context.deck.getViewports
        ? this.context.deck.getViewports()
        : [viewport];
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

      const pitch = (Math.abs(viewport.pitch || 0) * Math.PI) / 180;
      record.canvasWidth = width;
      record.canvasHeight = height;
      record.renderer.setFrame({
        viewport: {width, height},
        view: {
          longitude: viewport.longitude,
          latitude: viewport.latitude,
          zoom: viewport.zoom + DECK_TO_TANGRAM_ZOOM_OFFSET
        },
        camera: getExternalCameraFrame(viewport),
        tileBuffer: Math.min(4, Math.ceil((Math.tan(pitch) * viewport.height) / 256))
      });
    }

    _canRender(record, props) {
      return (
        props.visible !== false &&
        props.opacity !== 0 &&
        record.loaded &&
        !record.loadFailed &&
        !record.lastViewportError
      );
    }

    _raiseViewportError(record, error) {
      if (record.reportedViewportError === error.message) {
        return;
      }
      record.reportedViewportError = error.message;
      this._raiseBridgeError(error);
    }

    _reportSceneError(record, error, isFatal = true) {
      if (record.disposed || record.lastSceneError === error.message) {
        return;
      }
      record.lastSceneError = error.message;
      if (isFatal) {
        record.loadFailed = true;
      }
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
        record.renderer.destroy();
      }
    }

    _withDeviceState(record, callback) {
      if (record.webglScopeDepth > 0) {
        return callback();
      }

      const {device, gl} = record;
      const lumaState = gl.lumaState;
      const hasTrackedProgram = Boolean(lumaState && 'program' in lumaState);
      const previousProgram = hasTrackedProgram
        ? lumaState.program
        : gl.getParameter(gl.CURRENT_PROGRAM);

      record.webglScopeDepth++;
      device.pushState();
      try {
        return callback();
      } finally {
        try {
          device.popState();
          gl.useProgram(previousProgram);
        } finally {
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
  if (
    viewport.projectionMode != null &&
    viewport.projectionMode !== 1 &&
    viewport.projectionMode !== 4
  ) {
    return new Error('a Web Mercator viewport is required');
  }
  if (
    !Number.isFinite(viewport.longitude) ||
    !Number.isFinite(viewport.latitude) ||
    !Number.isFinite(viewport.zoom)
  ) {
    return new Error('a Web Mercator viewport is required');
  }
  if (
    !Number.isFinite(viewport.bearing || 0) ||
    !Number.isFinite(viewport.pitch || 0) ||
    (viewport.pitch || 0) < -VIEW_EPSILON ||
    (viewport.pitch || 0) >= 90
  ) {
    return new Error('bearing and pitch must describe a finite deck.gl camera');
  }
  try {
    getExternalCameraFrame(viewport);
  } catch (error) {
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

export default createTangramLayerClass;
