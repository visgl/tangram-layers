import {Layer} from '@deck.gl/core';
import {Renderer} from '@vis.gl/tangram-renderer';
import createTangramLayerClass, {
  getExternalCameraFrame,
  injectNextzenApiKey
} from './tangram-layer';

/**
 * A deck.gl basemap layer that renders a Tangram scene into deck's active
 * luma.gl device and render pass.
 */
const TangramLayer = createTangramLayerClass({Layer, Renderer});

export {TangramLayer, createTangramLayerClass, getExternalCameraFrame, injectNextzenApiKey};

export default TangramLayer;
