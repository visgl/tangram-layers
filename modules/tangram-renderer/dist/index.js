import Tangram from './tangram.debug.mjs';

const {leafletLayer, Scene, ClassicWebGLRenderer, HostFrame, LumaDeviceRenderer, debug, version} =
  Tangram;
const Renderer = ClassicWebGLRenderer;

export {
  leafletLayer,
  Scene,
  ClassicWebGLRenderer,
  Renderer,
  HostFrame,
  LumaDeviceRenderer,
  debug,
  version
};
export default Tangram;
