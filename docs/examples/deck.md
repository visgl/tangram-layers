# Deck.gl basemap example

The live integration example is built from the
[`examples/deck` source directory](https://github.com/visgl/tangram-layers/tree/ib/monorepo-layout/examples/deck)
and staged into the documentation site during the website build.

<div>
  <a className="button button--primary button--lg" href="/tangram-layers/examples/deck/">
    Open the interactive TangramLayer example
  </a>
</div>

The example defaults to WebGPU and the CARTO-backed TRON style when available.
It also supports WebGL, CARTO vector and raster styles, deck.gl camera controls,
and runtime `?api_key=...` handling for the original Nextzen style.
