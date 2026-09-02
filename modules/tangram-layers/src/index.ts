// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// @ts-nocheck

import {Layer} from '@deck.gl/core';
import {ClassicWebGLRenderer} from '@vis.gl/tangram-renderer';
import createTangramLayerClass, {
  getExternalCameraFrame,
  getFirstPersonViewFrame,
  getGlobeViewFrame,
  injectNextzenApiKey
} from './tangram-layer';

/**
 * A deck.gl basemap layer that renders a Tangram scene into deck's active
 * luma.gl device and render pass.
 */
const TangramLayer = createTangramLayerClass({Layer, ClassicWebGLRenderer});

export {
  TangramLayer,
  createTangramLayerClass,
  getExternalCameraFrame,
  getFirstPersonViewFrame,
  getGlobeViewFrame,
  injectNextzenApiKey
};

export default TangramLayer;
