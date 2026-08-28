# `@vis.gl/tangram-renderer`

The renderer package owns Tangram scenes, tiles, styles, labels, resource
management, and luma.gl draw submission. It has no deck.gl dependency.

## Public entrypoint

```js
import Tangram, {
  LumaDeviceRenderer,
  Renderer,
  Scene
} from '@vis.gl/tangram-renderer';
```

The default export preserves the legacy Tangram API. Named exports are the
host-integration boundary:

- `Scene` loads scene configuration and owns camera/tile state.
- `Renderer` drives scene traversal and submits work to a host device/render pass.
- `LumaDeviceRenderer` provides the luma.gl resource backend used by WebGL and
  WebGPU paths.
- `leafletLayer`, `debug`, and `version` remain available for legacy consumers.

The renderer accepts an externally owned luma.gl device through its renderer
options. Applications should use the device and render pass supplied by their
host rather than reading a backend handle.
