import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function readPackageManifest(packageDirectory) {
  const manifestPath = resolve(repositoryDirectory, packageDirectory, 'package.json');
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

describe('workspace package manifests', () => {
  it('publishes the renderer and layer entrypoints', async () => {
    const renderer = await readPackageManifest('modules/tangram-renderer');
    const layers = await readPackageManifest('modules/tangram-layers');

    expect(renderer.name).toBe('@vis.gl/tangram-renderer');
    expect(renderer.exports['.'].import).toBe('./dist/index.js');
    expect(layers.name).toBe('@vis.gl/tangram-layers');
    expect(layers.exports['.'].import).toBe('./dist/index.js');
  });
});
