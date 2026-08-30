<!--
tangram-layers
SPDX-License-Identifier: MIT
Copyright (c) vis.gl contributors
-->

# TangramLayer API

`TangramLayer` is a deck.gl `Layer` that embeds a Tangram scene in deck's
active luma.gl device.

Key properties:

- `scene`: a scene URL or configuration object.
- `sceneBasePath`: base URL for scene-relative assets.
- `apiKey`: runtime Nextzen key injected into Nextzen source parameters.
- `onSceneLoad`: callback invoked after the scene loads.
- `onSceneError`: callback invoked when loading or rendering fails.
- inherited `visible` and `opacity`: control basemap presentation.

The current alpha implementation accepts one flat Web Mercator viewport. It
reports and hides the basemap for unsupported multi-view or non-Web-Mercator
camera configurations.
