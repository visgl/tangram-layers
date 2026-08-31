// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {FirstPersonView, MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {
  getExternalCameraFrame,
  getFirstPersonViewFrame,
  getGlobeViewFrame
} from '@vis.gl/tangram-layers';
import {Matrix4} from '@math.gl/core';
import {EventManager} from 'mjolnir.js';

/** Meter separation between the two eyes in the desktop stereo preview. */
export const DEFAULT_INTERPUPILLARY_DISTANCE = 0.064;

/**
 * MapView with an experimental contract for deriving per-eye render views.
 */
export class WebXRMapView extends MapView {
  static displayName = 'WebXRMapView';

  /** Create a deck viewport for one eye without mutating the shared view state. */
  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    const position = viewState.position || [0, 0, 0];
    return this.makeViewport({
      width,
      height,
      viewState: {
        ...viewState,
        position: [position[0] + eyeOffset, position[1], position[2]]
      }
    });
  }

  /** Convert a derived deck viewport to Tangram HostFrame fields. */
  getHostFrame(viewport) {
    return {
      view: {
        longitude: viewport.longitude,
        latitude: viewport.latitude,
        zoom: viewport.zoom + 1
      },
      projection: {type: 'web-mercator'},
      camera: getExternalCameraFrame(viewport),
      tileBuffer: Math.min(
        4,
        Math.ceil((Math.tan((Math.abs(viewport.pitch || 0) * Math.PI) / 180) * viewport.height) / 256)
      )
    };
  }

  /** Use the WebXR projection matrix with the composed map-space view matrix. */
  getXRProjectionMatrix({projectionMatrix}) {
    return projectionMatrix;
  }
}

/**
 * FirstPersonView with an experimental contract for deriving per-eye render views.
 */
export class WebXRFirstPersonView extends FirstPersonView {
  static displayName = 'WebXRFirstPersonView';

  /** Create a deck viewport for one eye without mutating the shared view state. */
  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    const position = viewState.position || [0, 0, 0];
    return this.makeViewport({
      width,
      height,
      viewState: {
        ...viewState,
        position: [position[0] + eyeOffset, position[1], position[2]]
      }
    });
  }

  /** Convert a derived deck viewport to Tangram HostFrame fields. */
  getHostFrame(viewport) {
    const frame = getFirstPersonViewFrame(viewport);
    return {
      view: frame.view,
      projection: {type: 'web-mercator'},
      camera: frame.camera,
      tileBuffer: frame.tileBuffer
    };
  }

  /** Use the WebXR projection matrix with the composed first-person view matrix. */
  getXRProjectionMatrix({projectionMatrix}) {
    return projectionMatrix;
  }
}

/**
 * GlobeView with an experimental contract for deriving per-eye render views.
 */
export class WebXRGlobeView extends GlobeView {
  static displayName = 'WebXRGlobeView';

  /** Create a deck viewport for one eye without mutating the shared view state. */
  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    const longitudeOffset = eyeOffset * 0.06;
    return this.makeViewport({
      width,
      height,
      viewState: {...viewState, longitude: viewState.longitude + longitudeOffset}
    });
  }

  /** Convert a derived deck viewport to Tangram HostFrame fields. */
  getHostFrame(viewport) {
    const frame = getGlobeViewFrame(viewport);
    return {
      view: frame.view,
      projection: frame.projection,
      camera: frame.camera,
      tileBuffer: frame.tileBuffer
    };
  }

  /** Compose projection and view because Tangram's globe shader consumes clip-space matrices. */
  getXRProjectionMatrix({projectionMatrix, viewMatrix}) {
    return projectionMatrix.clone().multiplyRight(viewMatrix);
  }
}

/**
 * Expands one logical deck.gl view into mono, stereo-preview, or WebXR render views.
 *
 * The wrapper owns a single shared view state. Per-eye state is ephemeral, so a
 * controller update from either half updates both eyes on the next frame.
 */
export class WebXRViewManager {
  constructor({view, viewState}) {
    this.view = view;
    this.viewState = {...viewState};
    this.controller = null;
    this.eventManager = null;
    this.controllerSize = {width: 1, height: 1};
  }

  /** Return the current shared deck.gl view state. */
  getViewState() {
    return this.viewState;
  }

  /** Merge a controller or application update into the shared view state. */
  setViewState(update) {
    const patch = typeof update === 'function' ? update(this.viewState) : update;
    this.viewState = {...this.viewState, ...patch};
    this.updateController(this.controllerSize);
    return this.viewState;
  }

  /** Attach the controller declared by the deck.gl view to a DOM element. */
  attachController({element, timeline, onViewStateChange = () => {}, onStateChange = () => {}}) {
    const controllerOptions = this.view.controller;
    if (!controllerOptions) {
      return null;
    }
    this.eventManager = new EventManager(element);
    const Controller = controllerOptions.type;
    this.controller = new Controller({
      timeline,
      eventManager: this.eventManager,
      makeViewport: (viewState) =>
        this.view.makeViewport({...this.controllerSize, viewState}),
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

  /** Keep the logical controller in sync with canvas dimensions and shared state. */
  updateController({width, height}) {
    this.controllerSize = {width, height};
    if (!this.controller) {
      return;
    }
    const viewport = this.view.makeViewport({width, height, viewState: this.viewState});
    const controllerOptions = this.view.controller;
    if (!viewport || !controllerOptions) {
      return;
    }
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

  /** Release the deck.gl controller and its DOM event manager. */
  finalize() {
    this.controller?.finalize();
    this.eventManager?.destroy();
    this.controller = null;
    this.eventManager = null;
  }

  /** Create one Tangram render view from the logical deck.gl view. */
  makeRenderView({id, width, height, eyeOffset = 0}) {
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
      viewport: {x: 0, y: 0, width, height},
      camera: hostFrame.camera,
      hostFrame,
      deckViewport
    };
  }

  /** Expand the logical view into left and right desktop-preview render views. */
  makeStereoRenderViews({width, height, interpupillaryDistance = DEFAULT_INTERPUPILLARY_DISTANCE}) {
    const halfDistance = interpupillaryDistance / 2;
    return [
      this.makeRenderView({id: 'left-eye', width, height, eyeOffset: -halfDistance}),
      this.makeRenderView({id: 'right-eye', width, height, eyeOffset: halfDistance})
    ];
  }

  /**
   * Feed WebXR-provided eye matrices through the selected deck.gl view subclass.
   *
   * luma.gl normalizes XRView objects into `frameState.views`; this method keeps
   * the logical deck view and shared view state attached to every eye descriptor.
   */
  makeXRRenderViews({frameState, placementMatrix}) {
    return frameState.views.map((xrView) => {
      const [x, y, width, height] = xrView.viewport;
      const viewMatrix = new Matrix4(xrView.viewMatrix).multiplyRight(placementMatrix);
      const projectionMatrix = new Matrix4(xrView.projectionMatrix);
      const camera = {
        view: viewMatrix,
        projection: this.view.getXRProjectionMatrix({projectionMatrix, viewMatrix}),
        position: [0, 0, 0]
      };
      return {
        id: xrView.eye || `eye-${xrView.index}`,
        viewport: {x, y, width, height},
        camera,
        xrView,
        view: this.view,
        viewState: this.viewState
      };
    });
  }
}
