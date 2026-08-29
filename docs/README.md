# Tangram layers documentation

This site documents the vis.gl-oriented Tangram monorepo: a standalone
luma.gl-backed renderer and a deck.gl adapter that can compose it as a basemap.
The project is an experimental custodian fork and is not the official Tangram
website.

## Getting started

- [Getting started](get-started/getting-started.md) — install, build, and run the examples.

## Developer guide

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

- [Renderer reference](api-reference/tangram-renderer.md) — `@vis.gl/tangram-renderer` exports.
- [Styling reference](api-reference/styling.md) — scene, source, layer, draw, and filter syntax.
- [TangramLayer reference](api-reference/tangram-layers.md) — `@vis.gl/tangram-layers` exports.

## Examples and project information

- [What's new](whats-new.md) — notable changes by release line.
- [Upgrade guide](upgrade-guide.md) — migration notes from legacy Tangram.
- [Historical resources](resources.md) — Mapzen, legacy documentation, and the
  original Tangram demo catalog.
- [Deck example](examples/deck.md) — the runnable WebGL/WebGPU integration.
