// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {luma} from '@luma.gl/core';
import {FirstPersonViewport, WebMercatorViewport} from '@deck.gl/core';
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
const TANGRAM_HALF_WORLD_METERS = 20037508.342789244;
const DECK_WORLD_SIZE = 512;
const NEW_YORK_METERS = longitudeLatitudeToMeters(
  NEW_YORK_LONGITUDE,
  NEW_YORK_LATITUDE
);
const VIEW_MODES = {
  globe: {
    id: 'globe',
    label: 'GlobeView',
    zoom: 2,
    projection: {type: 'globe', visibleBounds: FULL_GLOBE_BOUNDS},
    tileBuffer: 0
  },
  map: {
    id: 'map',
    label: 'MapView',
    zoom: 16,
    projection: {type: 'web-mercator'},
    tileBuffer: 2
  },
  firstPerson: {
    id: 'firstPerson',
    label: 'FirstPersonView',
    zoom: 16,
    projection: {type: 'web-mercator'},
    tileBuffer: 2
  }
};

const canvas = document.getElementById('webxr-canvas');
const stereoCanvas = document.getElementById('webxr-stereo-canvas');
const stereoContext = stereoCanvas.getContext('2d');
const container = document.getElementById('webxr-container');
const enterButton = document.getElementById('webxr-enter');
const exitButton = document.getElementById('webxr-exit');
const statusElement = document.getElementById('webxr-status');
const titleElement = document.getElementById('webxr-title');
const deviceButtons = document.querySelectorAll('[data-webxr-device]');
const query = new URLSearchParams(window.location.search);
const requestedDeviceType = query.get('device') === 'webgpu' ? 'webgpu' : 'webgl';
const requestedViewMode = window.tangramWebXRViewMode || query.get('view');
const viewMode = VIEW_MODES[requestedViewMode] || VIEW_MODES.globe;

let device;
let renderer;
let webXRManager;
let animationLoop;
let xrSession = null;
let stereoPreview = false;
let immersiveVRSupported = false;
let xrReferenceSpaceType = 'local-floor';
let destroyed = false;

const scene = createVectorScene();

if (titleElement) {
  titleElement.textContent = `WebXR ${viewMode.label}`;
}

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
  if (viewMode.id === 'globe') {
    const scale = PREVIEW_RADIUS_METERS / GLOBE_RADIUS;
    const placement = new Matrix4();
    if (immersive) {
      placement.translate([0, 1.35, -2.35]);
    } else {
      placement.translate([0.5, 0, -2.6]);
    }
    return placement.rotateY(time * 0.00004).scale([scale, scale, scale]);
  }

  if (viewMode.id === 'map') {
    const scale = 1 / 2500;
    return new Matrix4()
      .translate(immersive ? [0, 0.72, -1.8] : [0.25, -0.48, -2.4])
      .rotateX(immersive ? -Math.PI / 2 : -Math.PI * 0.36)
      .scale([scale, scale, scale])
      .translate([-NEW_YORK_METERS[0], -NEW_YORK_METERS[1], 0]);
  }

  const groundY = immersive
    ? xrReferenceSpaceType === 'local-floor'
      ? 0
      : -1.6
    : 0;
  return new Matrix4()
    .translate([0, groundY, 0])
    .rotateX(-Math.PI / 2)
    .translate([-NEW_YORK_METERS[0], -NEW_YORK_METERS[1], 0]);
}

function createPreviewViewMatrix() {
  if (viewMode.id === 'firstPerson') {
    return new Matrix4().lookAt({
      eye: [0, 1.65, 1.2],
      center: [0, 0, -12],
      up: [0, 1, 0]
    });
  }
  return new Matrix4();
}

function createStereoPreviewViewMatrix(eyeOffset) {
  const target =
    viewMode.id === 'globe'
      ? [0, 1.35, -2.35]
      : viewMode.id === 'map'
        ? [0, 0.72, -1.8]
        : [0, 1.25, -10];
  return new Matrix4().lookAt({
    eye: [eyeOffset, 1.62, 0],
    center: target,
    up: [0, 1, 0]
  });
}

function createRenderView({id, viewport, projectionMatrix, viewMatrix, placementMatrix}) {
  const placedViewMatrix = new Matrix4(viewMatrix).multiplyRight(placementMatrix);
  const viewProjectionMatrix = new Matrix4(projectionMatrix).multiplyRight(placedViewMatrix);
  return {
    id,
    viewport,
    camera: {
      view: placedViewMatrix,
      projection: viewMode.id === 'globe' ? viewProjectionMatrix : projectionMatrix,
      position: [0, 0, 0]
    }
  };
}

function createDeckRenderView({id, width, height, eyeOffset = 0}) {
  const longitudeOffset =
    eyeOffset / (111320 * Math.cos((NEW_YORK_LATITUDE * Math.PI) / 180));
  const viewport =
    viewMode.id === 'map'
      ? new WebMercatorViewport({
          width,
          height,
          longitude: NEW_YORK_LONGITUDE + longitudeOffset,
          latitude: NEW_YORK_LATITUDE,
          zoom: 15,
          bearing: -20,
          pitch: 45
        })
      : new FirstPersonViewport({
          width,
          height,
          longitude: NEW_YORK_LONGITUDE,
          latitude: NEW_YORK_LATITUDE,
          position: [eyeOffset, 0, 200],
          bearing: 0,
          pitch: 45,
          far: 20000
        });
  return {
    id,
    viewport: {x: 0, y: 0, width, height},
    camera: getDeckExternalCamera(viewport)
  };
}

function getDeckExternalCamera(viewport) {
  const distanceScales = viewport.getDistanceScales();
  const unitsPerMeter = distanceScales.unitsPerMeter;
  const xyScale = DECK_WORLD_SIZE / (TANGRAM_HALF_WORLD_METERS * 2);
  const metersToCommon = new Matrix4();
  metersToCommon[0] = xyScale;
  metersToCommon[5] = xyScale;
  metersToCommon[10] = unitsPerMeter[2];
  metersToCommon[12] = DECK_WORLD_SIZE / 2;
  metersToCommon[13] = DECK_WORLD_SIZE / 2;
  return {
    view: new Matrix4(viewport.viewMatrix).multiplyRight(metersToCommon),
    projection: new Matrix4(viewport.projectionMatrix),
    position: [0, 0, 0]
  };
}

function createHostFrame({viewport, renderViews, activeRenderViewId}) {
  return {
    viewport,
    geographicAnchor: {
      longitude: NEW_YORK_LONGITUDE,
      latitude: NEW_YORK_LATITUDE,
      zoom: viewMode.zoom
    },
    projection: viewMode.projection,
    renderViews,
    activeRenderViewId,
    tileBuffer: viewMode.tileBuffer
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
  if (viewMode.id !== 'globe') {
    const viewport = {x: 0, y: 0, width, height};
    const renderView = createDeckRenderView({id: 'preview', width, height});
    const renderPass = device.beginRenderPass({
      clearColor: [0.006, 0.014, 0.04, 1],
      clearDepth: 1,
      clearStencil: 0
    });
    renderPass.setParameters({viewport: [0, 0, width, height]});
    renderTangram({
      frame: createHostFrame({
        viewport,
        renderViews: [renderView],
        activeRenderViewId: renderView.id
      }),
      renderPass,
      renderViewId: renderView.id
    });
    renderPass.end();
    return;
  }
  const aspect = width / height;
  const placementMatrix = createPlacementMatrix({immersive: false, time});
  const viewMatrix = createPreviewViewMatrix();
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

function renderStereoPreview(time) {
  const {width, height} = resizePreviewCanvas();
  const eyeWidth = Math.floor(width / 2);
  if (stereoCanvas.width !== width || stereoCanvas.height !== height) {
    stereoCanvas.width = width;
    stereoCanvas.height = height;
  }
  const projectionMatrix = new Matrix4().perspective({
    fovy: Math.PI / 3,
    aspect: eyeWidth / height,
    near: 0.05,
    far: 2000
  });
  const placementMatrix = createPlacementMatrix({immersive: true, time});
  const eyes = [
    {id: 'left-eye', x: 0, offset: -0.032},
    {id: 'right-eye', x: eyeWidth, offset: 0.032}
  ];
  const renderViews = eyes.map(({id, x, offset}) => {
    if (viewMode.id !== 'globe') {
      return createDeckRenderView({id, width, height, eyeOffset: offset});
    }
    const viewport = {
      x: 0,
      y: 0,
      width,
      height
    };
    return createRenderView({
      id,
      viewport,
      projectionMatrix,
      viewMatrix: createStereoPreviewViewMatrix(offset),
      placementMatrix
    });
  });
  const hostFrame = createHostFrame({
    viewport: {x: 0, y: 0, width, height},
    renderViews,
    activeRenderViewId: renderViews[0].id
  });
  for (let index = 0; index < renderViews.length; index++) {
    const renderView = renderViews[index];
    const renderPass = device.beginRenderPass({
      clearColor: [0.006, 0.014, 0.04, 1],
      clearDepth: 1,
      clearStencil: 0
    });
    renderPass.setParameters({viewport: [0, 0, width, height]});
    renderTangram({frame: hostFrame, renderPass, renderViewId: renderView.id});
    renderPass.end();
    stereoContext.drawImage(
      canvas,
      0,
      0,
      width,
      height,
      eyes[index].x,
      0,
      index === eyes.length - 1 ? width - eyes[index].x : eyeWidth,
      height
    );
  }
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
    xrReferenceSpaceType = 'local-floor';
  } catch (error) {
    if (error?.name !== 'NotSupportedError') {
      throw error;
    }
    await webXRManager.setSession(session, {referenceSpaceType: 'local'});
    xrReferenceSpaceType = 'local';
  }
}

async function enterVR() {
  if (xrSession || stereoPreview) {
    return;
  }
  if (
    !navigator.xr ||
    !immersiveVRSupported ||
    (device.type === 'webgpu' && (!device.props.xrCompatible || !('XRGPUBinding' in window)))
  ) {
    enterStereoPreview();
    return;
  }
  enterButton.disabled = true;
  setStatus('Requesting an immersive VR session…');
  const sessionInit =
    device.type === 'webgpu'
      ? {requiredFeatures: ['webgpu'], optionalFeatures: ['local-floor']}
      : {optionalFeatures: ['local-floor']};
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-vr', sessionInit);
  } catch (error) {
    if (error?.name === 'NotSupportedError') {
      enterStereoPreview();
      return;
    }
    throw error;
  }
  try {
    await setXRSession(session);
    xrSession = session;
    session.addEventListener('end', clearXRSession, {once: true});
    animationLoop.setProps({
      animationFrameProvider: new WebXRAnimationFrameProvider(session)
    });
    enterButton.hidden = true;
    exitButton.hidden = false;
    setStatus(`Rendering stereoscopic Tangram ${viewMode.label} through ${device.type}.`, 'success');
  } catch (error) {
    await session.end().catch(() => {});
    enterButton.disabled = false;
    throw error;
  }
}

function enterStereoPreview() {
  if (device.type !== 'webgl') {
    const url = new URL(window.location.href);
    url.searchParams.set('device', 'webgl');
    url.searchParams.set('stereo', '1');
    window.location.assign(url);
    return;
  }
  stereoPreview = true;
  container.classList.add('is-stereo');
  enterButton.hidden = true;
  enterButton.disabled = false;
  exitButton.hidden = false;
  setStatus(
    `Rendering split-screen Tangram ${viewMode.label} with distinct left- and right-eye cameras.`,
    'success'
  );
}

async function exitVR() {
  if (xrSession) {
    await xrSession.end().catch(() => {});
  }
  clearXRSession();
}

function clearXRSession() {
  xrSession = null;
  stereoPreview = false;
  xrReferenceSpaceType = 'local-floor';
  container.classList.remove('is-stereo');
  webXRManager?.clearSession();
  if (!destroyed) {
    animationLoop.setProps({animationFrameProvider: undefined});
    enterButton.hidden = false;
    enterButton.disabled = false;
    exitButton.hidden = true;
    setStatus(`VR session ended. The desktop ${viewMode.label} preview remains active.`, 'success');
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
      } else if (stereoPreview) {
        renderStereoPreview(time);
      } else {
        renderPreview(time);
      }
    },
    onError: (error) => setStatus(error.message, 'error')
  });
  await animationLoop.start();

  if (query.get('stereo') === '1') {
    enterStereoPreview();
  }

  if (stereoPreview) {
    return;
  }

  if (!navigator.xr) {
    enterButton.disabled = false;
    setStatus(
      `Desktop ${viewMode.label} preview ready. Enter VR opens the split-screen stereo preview.`,
      'warning'
    );
    return;
  }
  immersiveVRSupported = await navigator.xr
    .isSessionSupported('immersive-vr')
    .catch(() => false);
  enterButton.disabled = false;
  setStatus(
    immersiveVRSupported
      ? `Desktop ${viewMode.label} preview ready on ${device.type}. Enter VR for stereoscopic rendering.`
      : `Desktop ${viewMode.label} preview ready. Enter VR opens split-screen stereo; enable the emulator for an immersive session.`,
    immersiveVRSupported ? 'success' : 'warning'
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

function createVectorScene() {
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
      buildings: {
        data: {source: 'carto', layer: 'building'},
        filter: {$zoom: {min: 14}},
        draw: {
          polygons: {order: 4, color: '#142b4b', extrude: true},
          lines: {order: 5, color: '#267f9e', width: '0.5px', extrude: true}
        }
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

function longitudeLatitudeToMeters(longitude, latitude) {
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  return [
    (longitude / 180) * TANGRAM_HALF_WORLD_METERS,
    (Math.log(Math.tan(((90 + clampedLatitude) * Math.PI) / 360)) / Math.PI) *
      TANGRAM_HALF_WORLD_METERS
  ];
}
