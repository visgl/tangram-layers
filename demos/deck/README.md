# TangramLayer bridge spike

The public spike is deployed from `ib/deck-layer` to:

```text
https://ibgreen.github.io/tangram/demos/deck/
```

The page opts out of search indexing and the published site includes a
`robots.txt` that disallows crawling. It is an experimental fork demo, not an
official Tangram site.

To run it locally, serve the Tangram checkout as the web root:

```sh
python3 -m http.server 8000 --directory /Users/ibgreen/code/tangram
```

Then open:

```text
http://localhost:8000/demos/deck/
```

The demo can switch between CARTO Streets vector tiles, styled locally by
Tangram, CARTO Positron raster tiles, and the canonical animated TRON 2.0
vector style from [`tangrams/tron-style`](https://github.com/tangrams/tron-style).
The CARTO options do not require an API key. TRON uses Nextzen vector and
terrain-normal tiles, so supply a key only at runtime:

```text
http://localhost:8000/demos/deck/?device=webgl&basemap=tron&api_key=YOUR_KEY
```

The demo never stores the key. TRON currently selects WebGL because its custom
line, glow, and animation shaders are GLSL; their WGSL ports are part of the
ongoing WebGPU renderer work.
It loads the pinned deck.gl browser bundle from unpkg.
The prototype supports one Web Mercator view. deck.gl remains authoritative for
longitude, latitude, zoom, bearing, and pitch; Tangram receives the deck camera
matrices so vector and raster basemaps remain aligned with deck layers while the
controller tilts and rotates the view.
Tangram renders directly into deck.gl's WebGL context. The layer brackets
Tangram GPU work with the luma.gl WebGLDevice state stack and then leaves a
clean depth/stencil buffer for the deck layers above it.

The bridge constructs the experimental `Tangram.debug.Renderer` rather than
driving Tangram's standalone `Scene.update()` loop. The renderer accepts a
host-provided frame containing viewport dimensions, geographic view state,
camera matrices, tile padding, and the active render pass. Standalone Tangram
continues to use `Scene` for canvas construction and frame scheduling.

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
compatible synchronous program link. Mesh vertex and index storage is also
allocated and destroyed as luma.gl `Buffer` resources while Tangram continues
to bind their WebGL handles. luma.gl applies portable bindings as part of a
render-pipeline draw, so the next migration is to build per-topology pipeline
and vertex-array variants in the injected mesh renderer; only then can the
remaining direct uniform-block bindings be removed.
