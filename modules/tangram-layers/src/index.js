// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {Layer} from '@deck.gl/core';
import {ClassicWebGLRenderer} from '@vis.gl/tangram-renderer';
import createTangramLayerClass, {
  getExternalCameraFrame,
  getFirstPersonViewFrame,
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
  injectNextzenApiKey
};

export default TangramLayer;
