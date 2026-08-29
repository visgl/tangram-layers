# Tangram layers documentation

This site documents the vis.gl-oriented Tangram monorepo: a standalone
luma.gl-backed renderer and a deck.gl adapter that can compose it as a basemap.
The project is an experimental custodian fork and is not the official Tangram
website.

## Overview

- [Overview](resources.md) — project history, legacy documentation, and the
  original Tangram demo catalog.
- [What's new](whats-new.md) — notable changes by release line.
- [Upgrade guide](upgrade-guide.md) — migration notes from legacy Tangram.

## Developer guide

- [Getting started](get-started/getting-started.md) — install, build, and run the examples.
- [Architecture](developer-guide/architecture.md) — package boundaries and render ownership.
- [Development workflow](developer-guide/development.md) — workspaces, dev-tools, and validation.
- [Bundling](developer-guide/bundling.md) — measure the footprint of a small deck.gl basemap app.
- [Legacy concepts](developer-guide/legacy-concepts.md) — scene structure,
  sources, layers, styles, and porting guidance.

## Contributor guide

- [Monorepo guide](contributor-guide/monorepo.md) — workspaces, packages, and
  repository commands.
- [Release workflow](contributor-guide/release.md) — versioning and publishing
  the workspace packages.

## API reference

### `@vis.gl/tangram-renderer`

- [Package overview](api-reference/tangram-renderer.md) — renderer exports.
- [Renderer API](api-reference/renderer.md) — host-device integration.
- [Styling reference](api-reference/styling.md) — scene, source, layer, draw, and filter syntax.

### `@vis.gl/tangram-layers`

- [Package overview](api-reference/tangram-layers.md) — deck.gl adapter exports.
- [TangramLayer API](api-reference/tangram-layer.md) — layer properties and lifecycle.

## Examples and project information

- [Deck example](examples/deck.md) — the runnable WebGL/WebGPU integration.
