# @vis.gl/tangram-layers

Experimental deck.gl integration for the Tangram basemap renderer.

```js
import {Deck} from '@deck.gl/core';
import {TangramLayer} from '@vis.gl/tangram-layers';

const deck = new Deck({
  canvas: 'map',
  controller: true,
  layers: [new TangramLayer({scene: 'scene.yaml'})]
});
```

`TangramLayer` accepts a scene URL or configuration object through `scene`, an
optional `sceneBasePath`, and `apiKey` for Nextzen sources. `onSceneLoad` and
`onSceneError` report asynchronous scene status. The layer supports one flat
Web Mercator view and uses deck.gl's active luma.gl device and render pass.

This package is an alpha API and currently targets deck.gl and luma.gl 9.x.
