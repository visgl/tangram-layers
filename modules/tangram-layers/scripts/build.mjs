// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {resolve} from 'node:path';
import {build} from 'esbuild';
import {getOcularConfig} from '@vis.gl/dev-tools';

const packageRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(packageRoot, '../..');
const ocularConfig = await getOcularConfig({root: repositoryRoot, aliasMode: 'dist'});

// Keep the layer entry small and preserve the renderer as a package boundary.
// The renderer has its own worker-aware Rollup pipeline and is intentionally
// not bundled into this package yet.
delete ocularConfig.aliases['@vis.gl/tangram-layers'];
delete ocularConfig.aliases['@vis.gl/tangram-renderer'];

await build({
  entryPoints: [resolve(packageRoot, 'bundle.js')],
  outfile: resolve(packageRoot, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  packages: 'external',
  platform: 'browser',
  target: ocularConfig.bundle?.target || ['esnext'],
  sourcemap: true,
  sourcesContent: false,
  alias: ocularConfig.aliases,
  logLevel: 'info'
});
