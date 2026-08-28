# Renderer API

`@vis.gl/tangram-renderer` exports the classic Tangram default object and named
integration primitives:

```js
import {Renderer} from '@vis.gl/tangram-renderer';

const renderer = Renderer.create(scene, {
  device,
  canvas,
  requestRedraw: () => deck.redraw()
});

renderer.setFrame({viewport, view, camera, tileBuffer});
renderer.render({renderPass, force: true});
renderer.destroy();
```

The host supplies the frame and owns scheduling. `LumaDeviceRenderer` provides
resource factories for luma.gl devices, including the WebGPU backend. The
renderer does not depend on deck.gl and does not create a second host device.
