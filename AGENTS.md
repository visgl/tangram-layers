# Repository guidance

This file applies to the entire `tangram-layers` repository. A more specific
`AGENTS.md` in a subdirectory may add narrower guidance, but should not weaken
these repository-wide requirements.

## Repository shape

This is a Yarn 4 workspace monorepo:

- `modules/tangram-renderer` owns the Tangram scene, tile, style, label, and
  luma.gl rendering runtime. It retains a dedicated Rollup pipeline and emits
  browser and worker bundles.
- `modules/tangram-layers` owns the experimental deck.gl adapter. Keep deck.gl
  integration at this boundary; the renderer must remain deck.gl-independent.
- `dev-modules/*` contains private build and test helpers.
- `examples/*` contains runnable applications and playgrounds.
- `website` contains the Docusaurus site and static example assembly.
- `docs` contains the source documentation consumed by Docusaurus.

## Setup and validation

Run commands from the repository root and use the exact script names in
`package.json`:

```sh
yarn install
yarn build
yarn lint
yarn test-fast
yarn test-node
yarn test-browser
yarn test-headless
yarn test-website
```

For a complete compatibility pass, run `yarn test`; it includes the legacy
Karma suite and the network-dependent browser fixtures. Run
`yarn playwright:install` once when setting up a new machine. Run
`yarn bundle-size` after `yarn build` when a change could affect browser payload
size.

Do not run a cleaning build concurrently with Vitest: the renderer build removes
generated `dist` files while tests resolve package entrypoints. Run the build
first, then run browser tests.

## Before committing

- Run `yarn lint:fix` after source or configuration changes.
- Run `yarn install` after changing a workspace manifest and include the
  resulting `yarn.lock` update.
- Run `yarn build` after renderer, package, or dependency changes.
- Run the most relevant Node, browser, headless, example, or website tests for
  the files changed; report any skipped gates explicitly.
- Keep generated renderer bundles in sync when the renderer build changes them.
- Update API docs, developer docs, examples, sidebars, the changelog, or the
  upgrade guide when public behavior or workflow changes.

## Tests

Prefer native Vitest syntax for new tests. Keep fast tests hermetic and avoid
public-network access; put live tile or CDN checks in explicitly isolated
fixtures. Chromium is the canonical browser runtime. Package-entry smoke tests
belong under `test/`, while renderer behavior belongs with the owning renderer
package. Do not duplicate the same fixture and assertions across packages.

## Code style

- Prefer TypeScript and ES module syntax for new code, while matching the
  JavaScript style of existing Tangram source during the migration.
- Use single quotes, semicolons, strict camelCase/PascalCase naming, and
  verb-noun function names.
- Add JSDoc/TSDoc for new public classes, functions, methods, fields, and
  exported types.
- Prefer existing vis.gl packages and the repository's utilities before adding
  a dependency. Keep lower-level renderer code independent of deck.gl.
- Do not reformat unrelated files or add generated output that is not part of a
  package's checked-in build artifacts.

## Renderer and example boundaries

The renderer may own its WebGL/WebGPU resource lifecycle and worker protocol,
but host integrations must use its exported APIs. `TangramLayer` participates in
deck.gl's device, viewport, render-pass, visibility, and opacity lifecycle; do
not introduce a second direct WebGL context in the adapter. Examples should
remain runnable through the website and must never commit API keys or other
credentials.

## Pull requests and Git

Use focused, descriptive commit subjects such as `feat(renderer): ...`,
`fix(layers): ...`, `docs: ...`, or `chore: ...`. A PR description should start
with its goals, then list the actual changes and validation commands. Preserve
reviewable history; do not rewrite or force-push a shared branch. Before asking
for merge, confirm the branch is clean, the PR targets `master`, and CI status
has been checked.
