// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Tangram from './tangram.debug.mjs';

const {Scene, ClassicWebGLRenderer, HostFrame, LumaDeviceRenderer, debug, version} =
  Tangram;
const Renderer = ClassicWebGLRenderer;

export {
  Scene,
  ClassicWebGLRenderer,
  Renderer,
  HostFrame,
  LumaDeviceRenderer,
  debug,
  version
};
export default Tangram;
