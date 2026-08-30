<!--
Tangram
SPDX-License-Identifier: MIT
Copyright (c) 2013-2016 Brett Camper and Mapzen
-->

# Contributing to Tangram layers

This repository is organized as a Yarn workspace monorepo. The renderer lives
in `modules/tangram-renderer`, the deck.gl adapter lives in
`modules/tangram-layers`, and runnable applications live in `examples/`.

## Quickstart

```sh
yarn install
yarn bootstrap
yarn build
yarn start
```

Open `http://localhost:8000/examples/deck/` to run the deck.gl integration.

## Testing

Run the full lint and browser test suite with:

```sh
yarn test
```

`yarn clean` and `yarn lint` are provided by `@vis.gl/dev-tools`. Use
`yarn lint:fix` while developing to apply the repository's shared Biome
configuration. The renderer's Rollup build remains the package-specific build
step invoked by the root `yarn build` command.

The renderer worker bundle is built automatically before Karma starts. For an
interactive Karma session, use `yarn karma-start` and then `yarn karma-run`.

## Pull requests

Keep renderer changes independent from deck.gl adapter changes when possible.
Add or update tests with each behavioral change, and include documentation for
new public exports. The deck example is intentionally an integration fixture:
it should continue to exercise both WebGL and WebGPU devices with one shared
luma.gl runtime.
