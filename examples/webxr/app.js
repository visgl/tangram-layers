// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {luma} from '@luma.gl/core';
import {AnimationLoop} from '@luma.gl/engine';
import {WebXRAnimationFrameProvider, WebXRManager} from '@luma.gl/experimental';
import {webgl2Adapter} from '@luma.gl/webgl';
import {webgpuAdapter} from '@luma.gl/webgpu';
import {Matrix4} from '@math.gl/core';
import {ClassicWebGLRenderer} from '@vis.gl/tangram-renderer';

const GLOBE_RADIUS = 256;
const PREVIEW_RADIUS_METERS = 0.72;
const NEW_YORK_LONGITUDE = -74.009764;
const NEW_YORK_LATITUDE = 40.705319;
const FULL_GLOBE_BOUNDS = [-180, -85, 180, 85];

const canvas = document.getElementById('webxr-canvas');
const enterButton = document.getElementById('webxr-enter');
const exitButton = document.getElementById('webxr-exit');
const statusElement = document.getElementById('webxr-status');
const deviceButtons = document.querySelectorAll('[data-webxr-device]');
const query = new URLSearchParams(window.location.search);
const requestedDeviceType = query.get('device') === 'webgpu' ? 'webgpu' : 'webgl';

let device;
let renderer;
let webXRManager;
let animationLoop;
let xrSession = null;
let destroyed = false;

const scene = createVectorGlobeScene();

for (const button of deviceButtons) {
  const active = button.dataset.webxrDevice === requestedDeviceType;
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-selected', String(active));
  button.addEventListener('click', () => {
    if (!active) {
      const url = new URL(window.location.href);
      url.searchParams.set('device', button.dataset.webxrDevice);
      window.location.assign(url);
    }
  });
}

function setStatus(message, type = '') {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
}

function resizePreviewCanvas() {
  const canvasContext = device.getDefaultCanvasContext();
  const width = Math.max(1, Math.round(canvas.clientWidth * window.devicePixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * window.devicePixelRatio));
  const [drawingBufferWidth, drawingBufferHeight] = canvasContext.getDrawingBufferSize();
  if (width !== drawingBufferWidth || height !== drawingBufferHeight) {
    canvasContext.setDrawingBufferSize(width, height);
  }
  return {width, height};
}

function createPlacementMatrix({immersive, time}) {
  const scale = PREVIEW_RADIUS_METERS / GLOBE_RADIUS;
  const placement = new Matrix4();
  if (immersive) {
    placement.translate([0, 1.35, -2.35]);
  } else {
    placement.translate([0.5, 0, -2.6]);
  }
  return placement.rotateY(time * 0.00004).scale([scale, scale, scale]);
}

function createRenderView({id, viewport, projectionMatrix, viewMatrix, placementMatrix}) {
  const placedViewMatrix = new Matrix4(viewMatrix).multiplyRight(placementMatrix);
  const viewProjectionMatrix = new Matrix4(projectionMatrix).multiplyRight(placedViewMatrix);
  return {
    id,
    viewport,
    camera: {
      view: placedViewMatrix,
      projection: viewProjectionMatrix,
      position: [0, 0, 0]
    }
  };
}

function createHostFrame({viewport, renderViews, activeRenderViewId}) {
  return {
    viewport,
    geographicAnchor: {
      longitude: NEW_YORK_LONGITUDE,
      latitude: NEW_YORK_LATITUDE,
      zoom: 2
    },
    projection: {
      type: 'globe',
      visibleBounds: FULL_GLOBE_BOUNDS
    },
    renderViews,
    activeRenderViewId,
    tileBuffer: 0
  };
}

function renderTangram({frame, renderPass, renderViewId}) {
  const render = () => renderer.render({frame, renderPass, renderViewId, force: true});
  if (device.type === 'webgl') {
    renderer.scene.withWebGLContext(render);
  } else {
    render();
  }
}

function renderPreview(time) {
  const {width, height} = resizePreviewCanvas();
  const aspect = width / height;
  const placementMatrix = createPlacementMatrix({immersive: false, time});
  const viewMatrix = new Matrix4();
  const projectionMatrix = new Matrix4().perspective({
    fovy: Math.PI / 3,
    aspect,
    near: 0.05,
    far: 20
  });
  const viewport = {x: 0, y: 0, width, height};
  const renderPass = device.beginRenderPass({
    clearColor: [0.006, 0.014, 0.04, 1],
    clearDepth: 1,
    clearStencil: 0
  });
  renderPass.setParameters({viewport: [0, 0, width, height]});
  renderTangram({
    frame: createHostFrame({
      viewport,
      renderViews: [
        createRenderView({
          id: 'preview',
          viewport,
          projectionMatrix,
          viewMatrix,
          placementMatrix
        })
      ],
      activeRenderViewId: 'preview'
    }),
    renderPass,
    renderViewId: 'preview'
  });
  renderPass.end();
}

function renderXRFrame(time, xrFrame) {
  const frameState = webXRManager.getFrameState(xrFrame);
  if (!frameState || frameState.views.length === 0) {
    return;
  }
  const placementMatrix = createPlacementMatrix({immersive: true, time});
  const clearedFramebuffers = new Set();
  const renderViews = frameState.views.map((view) => {
    const [x, y, width, height] = view.viewport;
    return createRenderView({
      id: view.eye || `eye-${view.index}`,
      viewport: {x, y, width, height},
      projectionMatrix: view.projectionMatrix,
      viewMatrix: view.viewMatrix,
      placementMatrix
    });
  });
  const fullViewport = renderViews.reduce(
    (viewport, view) => ({
      x: 0,
      y: 0,
      width: Math.max(viewport.width, view.viewport.x + view.viewport.width),
      height: Math.max(viewport.height, view.viewport.y + view.viewport.height)
    }),
    {x: 0, y: 0, width: 1, height: 1}
  );
  const hostFrame = createHostFrame({
    viewport: fullViewport,
    renderViews,
    activeRenderViewId: renderViews[0].id
  });

  for (let index = 0; index < frameState.views.length; index++) {
    const view = frameState.views[index];
    const renderView = renderViews[index];
    const framebuffer = view.framebuffer || frameState.framebuffer;
    const shouldClear = !clearedFramebuffers.has(framebuffer);
    clearedFramebuffers.add(framebuffer);
    const renderPass = device.beginRenderPass({
      framebuffer,
      clearColor: shouldClear ? [0.006, 0.014, 0.04, 1] : false,
      clearDepth: shouldClear ? 1 : false,
      clearStencil: false
    });
    renderPass.setParameters({viewport: view.viewport});
    renderTangram({
      frame: hostFrame,
      renderPass,
      renderViewId: renderView.id
    });
    renderPass.end();
  }
}

async function setXRSession(session) {
  try {
    await webXRManager.setSession(session, {referenceSpaceType: 'local-floor'});
  } catch (error) {
    if (error?.name !== 'NotSupportedError') {
      throw error;
    }
    await webXRManager.setSession(session, {referenceSpaceType: 'local'});
  }
}

async function enterVR() {
  if (xrSession || !navigator.xr) {
    return;
  }
  enterButton.disabled = true;
  setStatus('Requesting an immersive VR session…');
  const sessionInit =
    device.type === 'webgpu'
      ? {requiredFeatures: ['webgpu'], optionalFeatures: ['local-floor']}
      : {optionalFeatures: ['local-floor']};
  const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
  try {
    await setXRSession(session);
    xrSession = session;
    session.addEventListener('end', clearXRSession, {once: true});
    animationLoop.setProps({
      animationFrameProvider: new WebXRAnimationFrameProvider(session)
    });
    enterButton.hidden = true;
    exitButton.hidden = false;
    setStatus(`Rendering a stereoscopic Tangram globe through ${device.type}.`, 'success');
  } catch (error) {
    await session.end().catch(() => {});
    enterButton.disabled = false;
    throw error;
  }
}

async function exitVR() {
  if (xrSession) {
    await xrSession.end().catch(() => {});
  }
  clearXRSession();
}

function clearXRSession() {
  xrSession = null;
  webXRManager.clearSession();
  if (!destroyed) {
    animationLoop.setProps({animationFrameProvider: undefined});
    enterButton.hidden = false;
    enterButton.disabled = false;
    exitButton.hidden = true;
    setStatus('VR session ended. The desktop globe preview remains active.', 'success');
  }
}

async function initialize() {
  setStatus(`Creating the luma.gl ${requestedDeviceType} device…`);
  const adapters = requestedDeviceType === 'webgpu' ? [webgpuAdapter] : [webgl2Adapter];
  device = await luma.createDevice({
    type: requestedDeviceType,
    adapters,
    createCanvasContext: {canvas},
    xrCompatible: requestedDeviceType === 'webgpu',
    webgl: {alpha: false, antialias: true, depth: true, stencil: true}
  });
  webXRManager = new WebXRManager(device);
  const rendererOptions = {
    device,
    canvas,
    continuousZoom: true,
    highDensityDisplay: true,
    logLevel: 'warn',
    requestRedraw: () => animationLoop?.setNeedsRedraw('Tangram scene update')
  };
  if (device.type === 'webgl') {
    rendererOptions.webGLContext = device.handle;
    rendererOptions.webGLContextScope = (callback) => {
      device.pushState();
      try {
        return callback();
      } finally {
        device.popState();
      }
    };
  }
  renderer = ClassicWebGLRenderer.create(scene, rendererOptions);
  renderer.subscribe({
    error: (message) => setStatus(message?.message || String(message), 'error')
  });
  await renderer.load(scene, {blocking: false});

  animationLoop = new AnimationLoop({
    device,
    autoResizeViewport: false,
    onRender: ({animationFrame, time}) => {
      if (xrSession && animationFrame) {
        renderXRFrame(time, animationFrame);
      } else {
        renderPreview(time);
      }
    },
    onError: (error) => setStatus(error.message, 'error')
  });
  await animationLoop.start();

  if (!navigator.xr) {
    setStatus('Desktop preview ready. WebXR is not available in this browser.', 'warning');
    return;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-vr');
  enterButton.disabled = !supported;
  setStatus(
    supported
      ? `Desktop preview ready on ${device.type}. Enter VR for stereoscopic rendering.`
      : 'Desktop preview ready. This browser has no immersive-vr device.',
    supported ? 'success' : 'warning'
  );
}

function destroy() {
  if (destroyed) {
    return;
  }
  destroyed = true;
  void exitVR();
  animationLoop?.stop();
  renderer?.destroy();
  webXRManager?.destroy();
  device?.destroy();
}

enterButton.addEventListener('click', () => {
  enterVR().catch((error) => {
    enterButton.disabled = false;
    setStatus(error.message, 'error');
  });
});
exitButton.addEventListener('click', () => void exitVR());
window.tangramWebXRExampleDestroy = destroy;
window.addEventListener('pagehide', destroy, {once: true});

initialize().catch((error) => setStatus(error.message, 'error'));

function createVectorGlobeScene() {
  return {
    scene: {
      background: {color: '#030817'}
    },
    lights: {
      ambient: {
        type: 'ambient',
        ambient: 1
      }
    },
    sources: {
      carto: {
        type: 'MVT',
        url: 'https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt',
        tile_size: 512,
        max_zoom: 14
      }
    },
    layers: {
      landcover: {
        data: {source: 'carto', layer: 'landcover'},
        draw: {polygons: {order: 1, color: '#377fc4'}}
      },
      landuse: {
        data: {source: 'carto', layer: 'landuse'},
        draw: {polygons: {order: 2, color: '#4b91cf'}}
      },
      water: {
        data: {source: 'carto', layer: 'water'},
        draw: {polygons: {order: 3, color: '#071329'}}
      },
      roads: {
        data: {source: 'carto', layer: 'transportation'},
        draw: {
          lines: {
            order: 5,
            color: '#16c8ff',
            width: [[4, '0.4px'], [9, '1px'], [14, '3px']]
          }
        },
        major: {
          filter: {class: ['motorway', 'trunk', 'primary']},
          draw: {
            lines: {
              order: 6,
              color: '#8d50ff',
              width: [[4, '0.75px'], [9, '2px'], [14, '5px']]
            }
          }
        }
      }
    }
  };
}
