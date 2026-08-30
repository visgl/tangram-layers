// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  checkLicenseHeaders,
  getHeader,
  insertHeader,
  isTangramInherited,
  updateLicenseHeader
} from '../scripts/check-license-headers.mjs';

describe('license headers', () => {
  it('allowlists inherited renderer files and defaults future files to vis.gl', () => {
    expect(isTangramInherited('modules/tangram-renderer/src/scene/camera.js')).toBe(true);
    expect(isTangramInherited('modules/tangram-renderer/src/scene/future-adapter.js')).toBe(false);
    expect(isTangramInherited('modules/tangram-renderer/test/future-adapter_spec.js')).toBe(false);
  });

  it('inserts a header immediately after a shebang without dropping code', () => {
    const filePath = 'scripts/future-tool.js';
    const header = getHeader(filePath, 'line');
    const source = '#!/usr/bin/env node\nimport process from \'node:process\';\n';

    expect(insertHeader(filePath, source, header)).toBe(
      `#!/usr/bin/env node\n${header}import process from 'node:process';\n`
    );
  });

  it('repairs an existing header with incorrect provenance', () => {
    const inheritedPath = 'modules/tangram-renderer/src/scene/camera.js';
    const newPath = 'modules/tangram-renderer/src/scene/future-adapter.js';
    const source = `${getHeader(inheritedPath, 'line')}export const value = 1;\n`;
    const result = updateLicenseHeader(newPath, source);

    expect(result.status).toBe('incorrect');
    expect(result.source).toBe(`${getHeader(newPath, 'line')}export const value = 1;\n`);
    expect(updateLicenseHeader(newPath, result.source).status).toBe('current');
  });

  it('writes repaired provenance headers in fix mode', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'tangram-license-'));
    const filePath = join(temporaryDirectory, 'future-adapter.js');
    const inheritedPath = 'modules/tangram-renderer/src/scene/camera.js';
    await writeFile(filePath, `${getHeader(inheritedPath, 'line')}export const value = 1;\n`);

    try {
      const result = checkLicenseHeaders({writeHeaders: true, files: [filePath]});
      expect(result.updatedFiles).toEqual([filePath]);
      expect(await readFile(filePath, 'utf8')).toBe(
        `${getHeader(filePath, 'line')}export const value = 1;\n`
      );
    } finally {
      await rm(temporaryDirectory, {recursive: true, force: true});
    }
  });
});
