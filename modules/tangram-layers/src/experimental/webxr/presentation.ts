// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// @ts-nocheck

import {Matrix4} from '@math.gl/core';
import {EventManager} from 'mjolnir.js';
import {createXRPlacementMatrix, getXRGlobeVisibleBounds} from './projection.ts';

/** Default human interpupillary distance used by desktop stereo preview, in meters. */
export const DEFAULT_INTERPUPILLARY_DISTANCE = 0.064;

/**
 * Expands one logical deck.gl view into mono, stereo-preview, or immersive render views.
 *
 * Placement is independent from the logical geographic camera. Input from either
 * eye is routed through one controller and therefore updates one shared view state.
 */
export class WebXRPresentation {
  constructor({view, viewState, placement, mode = 'auto'}) {
    this.view = view;
    this.viewState = {...viewState};
    this.placement = placement || createDefaultPlacement(view, viewState);
    this.mode = mode;
    this.controller = null;
    this.eventManager = null;
    this.controllerSize = {width: 1, height: 1};
  }

  getViewState() {
    return this.viewState;
  }

  setViewState(update) {
    const patch = typeof update === 'function' ? update(this.viewState) : update;
    this.viewState = {...this.viewState, ...patch};
    this.updateController(this.controllerSize);
    return this.viewState;
  }

  setPlacement(placement) {
    this.placement = placement;
  }

  setMode(mode) {
    this.mode = mode;
  }

  attachController({element, timeline, onViewStateChange = () => {}, onStateChange = () => {}}) {
    const controllerOptions = this.view.controller;
    if (!controllerOptions) return null;
    this.eventManager = new EventManager(element);
    const Controller = controllerOptions.type;
    this.controller = new Controller({
      timeline,
      eventManager: this.eventManager,
      makeViewport: (viewState) => this.view.makeViewport({...this.controllerSize, viewState}),
      onViewStateChange: (parameters) => {
        this.viewState = {...parameters.viewState};
        this.updateController(this.controllerSize);
        onViewStateChange({...parameters, viewState: this.viewState});
      },
      onStateChange
    });
    this.updateController(this.controllerSize);
    return this.controller;
  }

  updateController({width, height}) {
    this.controllerSize = {width, height};
    if (!this.controller) return;
    const viewport = this.view.makeViewport({width, height, viewState: this.viewState});
    const controllerOptions = this.view.controller;
    if (!viewport || !controllerOptions) return;
    this.controller.setProps({
      ...this.viewState,
      ...controllerOptions,
      id: this.view.id,
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height
    });
  }

  finalize() {
    this.controller?.finalize();
    this.eventManager?.destroy();
    this.controller = null;
    this.eventManager = null;
  }

  makeRenderView({id, width, height, eyeOffset = 0, viewportX = 0}) {
    const deckViewport = this.view.makeEyeViewport({
      width,
      height,
      viewState: this.viewState,
      eyeOffset
    });
    if (!deckViewport) {
      throw new Error(`${this.view.constructor.displayName} produced an empty viewport`);
    }
    const hostFrame = this.view.getHostFrame(deckViewport);
    return {
      id,
      viewport: {x: viewportX, y: 0, width, height},
      camera: hostFrame.camera,
      hostFrame,
      deckViewport
    };
  }

  makeStereoRenderViews({width, height, interpupillaryDistance = DEFAULT_INTERPUPILLARY_DISTANCE}) {
    const halfDistance = interpupillaryDistance / 2;
    return [
      this.makeRenderView({
        id: 'left-eye',
        width,
        height,
        eyeOffset: -halfDistance,
        viewportX: 0
      }),
      this.makeRenderView({
        id: 'right-eye',
        width,
        height,
        eyeOffset: halfDistance,
        viewportX: 0
      })
    ];
  }

  makeXRRenderViews({frameState, placementMatrix}) {
    const logicalViewport = this.view.makeViewport({
      width: Math.max(...frameState.views.map((view) => view.viewport[0] + view.viewport[2])),
      height: Math.max(...frameState.views.map((view) => view.viewport[1] + view.viewport[3])),
      viewState: this.viewState
    });
    return frameState.views.map((xrView) => {
      const [x, y, width, height] = xrView.viewport;
      const viewMatrix = new Matrix4(xrView.viewMatrix).multiplyRight(placementMatrix);
      const projectionMatrix = new Matrix4(xrView.projectionMatrix);
      return {
        id: xrView.eye || `eye-${xrView.index}`,
        viewport: {x, y, width, height},
        camera: {
          view: viewMatrix,
          projection: this.view.getXRProjectionMatrix({projectionMatrix, viewMatrix}),
          position: [0, 0, 0]
        },
        deckViewport: logicalViewport,
        xrView,
        view: this.view,
        viewState: this.viewState
      };
    });
  }

  createFrame({width, height, frameState, mode = this.mode, interpupillaryDistance}) {
    const resolvedMode = resolveMode(mode, frameState);
    const logicalViewport = this.view.makeViewport({width, height, viewState: this.viewState});
    if (!logicalViewport) throw new Error('The logical deck.gl view produced an empty viewport');
    let renderViews;
    if (resolvedMode === 'immersive-vr' && frameState?.views?.length) {
      const placementMatrix = createXRPlacementMatrix(this.placement, this.viewState);
      renderViews = this.makeXRRenderViews({frameState, placementMatrix});
    } else if (resolvedMode === 'stereo-preview') {
      const eyeWidth = Math.floor(width / 2);
      renderViews = this.makeStereoRenderViews({
        width: eyeWidth,
        height,
        interpupillaryDistance
      });
      renderViews[1].viewport.x = eyeWidth;
    } else {
      renderViews = [this.makeRenderView({id: 'mono', width, height})];
    }
    return {
      mode: resolvedMode,
      logicalViewport,
      renderViews,
      hostFrame: this.createHostFrame({width, height, renderViews, frameState})
    };
  }

  createHostFrame({width, height, renderViews, frameState}) {
    const fields = renderViews.find((renderView) => renderView.hostFrame)?.hostFrame;
    const fallback = this.view.getHostFrame(
      this.view.makeViewport({width, height, viewState: this.viewState})
    );
    const frameFields = fields || fallback;
    let projection = frameFields.projection;
    if (this.placement.type === 'globe' && frameState?.views?.length) {
      projection = {
        type: 'globe',
        visibleBounds: getXRGlobeVisibleBounds({
          views: frameState.views,
          placement: this.placement,
          viewState: this.viewState
        })
      };
    }
    return {
      viewport: {x: 0, y: 0, width, height},
      geographicAnchor: frameFields.view,
      projection,
      renderViews,
      activeRenderViewId: renderViews[0].id,
      tileBuffer: frameFields.tileBuffer
    };
  }

  dispatchInteractionIntent(intent) {
    if (intent.type !== 'navigate') return this.viewState;
    const [horizontal = 0, vertical = 0] = intent.delta;
    if (intent.action === 'turn' || intent.action === 'rotate') {
      return this.setViewState({bearing: (this.viewState.bearing || 0) + horizontal});
    }
    if (intent.action === 'pitch') {
      return this.setViewState({pitch: (this.viewState.pitch || 0) + vertical});
    }
    if (intent.action === 'zoom') {
      return this.setViewState({zoom: (this.viewState.zoom || 0) + vertical});
    }
    if (this.placement.type === 'first-person') {
      const position = this.placement.position || [0, 0, 0];
      this.placement = {
        ...this.placement,
        position: [position[0] + horizontal, position[1] + vertical, position[2]]
      };
      return this.viewState;
    }
    return this.setViewState({
      longitude: (this.viewState.longitude || 0) + horizontal,
      latitude: (this.viewState.latitude || 0) + vertical
    });
  }
}

/** Backward-compatible name used by the first WebXR example iteration. */
export class WebXRViewManager extends WebXRPresentation {}

function resolveMode(mode, frameState) {
  if (mode === 'auto') return frameState?.views?.length ? 'immersive-vr' : 'mono';
  if (mode === 'immersive-vr' && !frameState?.views?.length) return 'stereo-preview';
  return mode;
}

function createDefaultPlacement(view, viewState) {
  const anchor = [viewState.longitude || 0, viewState.latitude || 0, 0];
  if (view.constructor.displayName === 'WebXRGlobeView') {
    return {type: 'globe', anchor, pose: {position: [0, 1.35, -2.35]}, radius: 0.72};
  }
  if (view.constructor.displayName === 'WebXRFirstPersonView') {
    return {type: 'first-person', origin: anchor, position: [0, 0, 0], bearing: 0};
  }
  return {
    type: 'map',
    anchor,
    pose: {position: [0, 0.72, -1.8]},
    metersPerXRUnit: 2500,
    surface: {type: 'unbounded'}
  };
}
