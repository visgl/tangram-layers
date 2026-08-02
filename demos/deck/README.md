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

The generated polygon and point shaders now upgrade to GLSL 300 when uniform
blocks are enabled, and frame/view globals are supplied through a real
`TangramView` block. The deck bridge also restores indexed uniform-buffer state
that luma.gl's general WebGL state stack intentionally does not track.

Camera projection state and per-tile transforms are supplied through separate
`TangramCamera` and `TangramTile` blocks. Uniform-buffer storage is injectable,
and the deck bridge now allocates and updates those buffers through luma.gl's
`Device` API. Tangram still binds the WebGL resource handles while issuing its
legacy draw calls.

The bridge now forwards deck's active `RenderPass` through `Scene` to every
mesh, and `VBOMesh` has an injectable renderer that can take ownership before
any raw WebGL draw calls are issued. Uniform blocks also expose luma-compatible
binding layouts and WGSL struct declarations while preserving their std140
packing. Generated GLSL is compiled into luma.gl `Shader` resources, with an
explicit location for Tangram's position attribute, before Tangram performs its
compatible synchronous program link. luma.gl applies portable bindings as part
of a render-pipeline draw, so the next migration must move `ShaderProgram` and
`VBOMesh` to luma pipelines together; only then can the remaining direct
uniform-block bindings be removed.
