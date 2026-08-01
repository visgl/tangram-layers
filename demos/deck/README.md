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
