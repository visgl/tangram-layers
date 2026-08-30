<!--
tangram-layers
SPDX-License-Identifier: MIT
Copyright (c) vis.gl contributors
-->

# Renderer API

`@vis.gl/tangram-renderer` exports the classic Tangram default object and named
integration primitives:

```js
import {ClassicWebGLRenderer, HostFrame} from '@vis.gl/tangram-renderer';

const renderer = ClassicWebGLRenderer.create(scene, {
  device,
  canvas,
  requestRedraw: () => deck.redraw()
});

const frame = new HostFrame({
  viewport: {width, height},
  geographicAnchor: {longitude, latitude, altitude: 0, zoom},
  renderViews: [{
    id: 'main',
    viewport: {x: 0, y: 0, width, height},
    camera
  }],
  tileBuffer
});

renderer.setFrame(frame);
renderer.render({renderPass, force: true});
renderer.destroy();
```

The host supplies the frame and owns scheduling. `LumaDeviceRenderer` provides
resource factories for luma.gl devices, including the WebGPU backend. The
renderer does not depend on deck.gl and does not create a second host device.

## TypeScript contracts

The package root exports the runtime classes together with `RendererOptions`,
`HostFrameOptions`, `HostRenderView`, `HostCamera`, `SceneDefinition`,
`SceneLoadOptions`, and the worker-message contracts. Use `satisfies` to check a
frame without widening its render-view identifiers:

```ts
import type {HostFrameOptions} from '@vis.gl/tangram-renderer';

const frameOptions = {
  viewport: {width, height},
  geographicAnchor: {longitude, latitude, zoom},
  renderViews: [{id: 'main', camera}]
} satisfies HostFrameOptions;
```

## HostFrame

`HostFrame` separates shared geographic state from per-view camera state:

- `viewport` describes the complete render target.
- `geographicAnchor` supplies longitude, latitude, altitude, and the current
  tile-selection zoom.
- `renderViews` contains one or more named viewport/camera pairs.
- `activeRenderViewId` selects the default view.
- `tileBuffer` requests additional Web Mercator tiles around the visible area.

The original `{viewport, view, camera, tileBuffer}` object remains accepted and
is normalized to a single-view `HostFrame`.

### Multiple views and stereo

A host can share scene and tile state while submitting separate render passes:

```js
const stereoFrame = new HostFrame({
  viewport: {width: eyeWidth * 2, height},
  geographicAnchor: {longitude, latitude, altitude, zoom},
  renderViews: [
    {
      id: 'left-eye',
      viewport: {x: 0, y: 0, width: eyeWidth, height},
      camera: leftCamera
    },
    {
      id: 'right-eye',
      viewport: {x: eyeWidth, y: 0, width: eyeWidth, height},
      camera: rightCamera
    }
  ]
});

renderer.render({
  frame: stereoFrame,
  renderViewId: 'left-eye',
  renderPass: leftRenderPass
});
renderer.render({
  renderViewId: 'right-eye',
  renderPass: rightRenderPass
});
```

This first contract shares one geographic anchor and LOD decision across the
views, which matches a stereoscopic pair. Frustum-union tile selection and
WebXR render-pass orchestration remain future adapter work.
