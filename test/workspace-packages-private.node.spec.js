// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {readdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');

describe('workspace package publication safety', () => {
  it.each(['modules', 'examples'])('marks every %s package as private', async (directory) => {
    const workspaceDirectory = resolve(REPOSITORY_ROOT, directory);
    const entries = await readdir(workspaceDirectory, {withFileTypes: true});
    const packageFiles = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(workspaceDirectory, entry.name, 'package.json'));

    expect(packageFiles.length).toBeGreaterThan(0);
    for (const packageFile of packageFiles) {
      const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
      expect(packageJson.private, `${packageJson.name} must not be publishable`).toBe(true);
    }
  });
});
