# Architecture

The monorepo has two intentionally separate layers:

1. `@vis.gl/tangram-renderer` contains scene loading, tile management, style
   evaluation, labels, and luma.gl resource/draw submission. Its `Renderer`
   receives a host-owned frame and render pass.
2. `@vis.gl/tangram-layers` adapts that renderer to deck.gl's layer lifecycle.
   deck.gl supplies the device, viewport, resize events, and render pass; the
   adapter forwards them to Tangram and keeps the package dependency one-way.

The split is a foundation for future shared-device and WebGPU work. It avoids
making the standalone Tangram renderer know about deck.gl while allowing a
deck.gl application to compose Tangram basemaps with ordinary overlay layers.
