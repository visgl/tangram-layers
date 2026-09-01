// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// @ts-nocheck

import {FirstPersonView, MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {getExternalCameraFrame, getFirstPersonViewFrame, getGlobeViewFrame} from '../../index.ts';

/** MapView that can derive Tangram host-frame fields and per-eye viewports. */
export class WebXRMapView extends MapView {
  static displayName = 'WebXRMapView';

  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    const position = viewState.position || [0, 0, 0];
    return this.makeViewport({
      width,
      height,
      viewState: {...viewState, position: [position[0] + eyeOffset, position[1], position[2]]}
    });
  }

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
        Math.ceil(
          (Math.tan((Math.abs(viewport.pitch || 0) * Math.PI) / 180) * viewport.height) / 256
        )
      )
    };
  }

  getXRProjectionMatrix({projectionMatrix}) {
    return projectionMatrix;
  }
}

/** FirstPersonView that can derive Tangram host-frame fields and per-eye viewports. */
export class WebXRFirstPersonView extends FirstPersonView {
  static displayName = 'WebXRFirstPersonView';

  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    const position = viewState.position || [0, 0, 0];
    return this.makeViewport({
      width,
      height,
      viewState: {...viewState, position: [position[0] + eyeOffset, position[1], position[2]]}
    });
  }

  getHostFrame(viewport) {
    const frame = getFirstPersonViewFrame(viewport);
    return {
      view: frame.view,
      projection: {type: 'web-mercator'},
      camera: frame.camera,
      tileBuffer: frame.tileBuffer
    };
  }

  getXRProjectionMatrix({projectionMatrix}) {
    return projectionMatrix;
  }
}

/** GlobeView that can derive Tangram host-frame fields and per-eye viewports. */
export class WebXRGlobeView extends GlobeView {
  static displayName = 'WebXRGlobeView';

  makeEyeViewport({width, height, viewState, eyeOffset = 0}) {
    return this.makeViewport({
      width,
      height,
      viewState: {...viewState, longitude: viewState.longitude + eyeOffset * 0.06}
    });
  }

  getHostFrame(viewport) {
    const frame = getGlobeViewFrame(viewport);
    return {
      view: frame.view,
      projection: frame.projection,
      camera: frame.camera,
      tileBuffer: frame.tileBuffer
    };
  }

  getXRProjectionMatrix({projectionMatrix, viewMatrix}) {
    return projectionMatrix.clone().multiplyRight(viewMatrix);
  }
}
