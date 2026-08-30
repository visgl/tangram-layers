<!--
tangram-layers
SPDX-License-Identifier: MIT
Copyright (c) vis.gl contributors
-->

# What's new

## 1.0.0-alpha.0 — vis.gl integration line

- Tangram source, renderer bundles, fixtures, and renderer tests now live in
  `modules/tangram-renderer`.
- The deck.gl adapter is published separately as `@vis.gl/tangram-layers`.
- The renderer exposes luma.gl-backed `ClassicWebGLRenderer`, `Scene`, and
  `LumaDeviceRenderer` integration points while retaining the legacy default
  Tangram API.
- `HostFrame` separates shared geographic state from named render views and
  establishes a multi-view contract suitable for future stereo and WebXR
  basemap rendering.
- The deck example is under `examples/deck/` and supports shared luma.gl
  WebGL and WebGPU devices, vector styles, and the animated TRON style.
- The repository uses Yarn workspaces and `@vis.gl/dev-tools` for bootstrap,
  cleaning, and Biome linting.

This is an alpha boundary. Renderer and adapter APIs may change before a
stable release.
