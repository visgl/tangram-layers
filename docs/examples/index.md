# Examples

The website publishes every runnable application under the repository's
[`examples/`](https://github.com/visgl/tangram-layers/tree/ib/monorepo-layout/examples)
directory. These are static demo applications, so they can also be served
directly from a checkout with a simple HTTP server.

- [Classic Tangram playground](/tangram-layers/examples/)
- [Deck + TangramLayer](/tangram-layers/examples/deck/)

The classic playground includes a style and shader gallery in its GUI:

- Simple and the imported Bubble Wrap, Walkabout, Refill, Refill Blue Terrain,
  and TRON styles
- Crosshatch texture/shader rendering
- Rainbow Buildings fragment-shader styling
- Pop-up Buildings vertex-shader styling

The deck example is the recommended integration starting point. It exercises
the package entrypoints, a deck.gl overlay, vector styles, and the TRON style
on WebGL and WebGPU.
