# TangramLayer bridge spike

Serve `/Users/ibgreen/code` as the web root so the demo can load both the
Tangram checkout and the sibling deck.gl bundle:

```sh
python3 -m http.server 8000 --directory /Users/ibgreen/code
```

Then open:

```text
http://localhost:8000/tangram/demos/deck/
```

The demo can switch between CARTO Streets vector tiles, styled locally by
Tangram, and CARTO Positron raster tiles. Neither option requires an API key.
The prototype supports one flat Web Mercator view with zero bearing and pitch.
Tangram renders directly into deck.gl's WebGL context. The layer brackets
Tangram GPU work with the luma.gl WebGLDevice state stack and then leaves a
clean depth/stencil buffer for the deck layers above it.

## Uniform-buffer migration

The `ib/deck-tangram-layer-uniform-buffers` sub-branch adds a WebGL2
`UniformBuffer` abstraction with std140 packing and integrates uniform-block
binding into `ShaderProgram`. It is exposed through `Tangram.debug` for the
spike, but the existing scalar-uniform path remains unchanged.

The next migration slice is to upgrade Tangram's generated shaders to GLSL 300
and move the frame/view globals into a `TangramView` block. Camera and tile
matrices can then move into separate blocks before replacing the WebGL-specific
buffer implementation with a luma.gl `Device` buffer for WebGPU.
