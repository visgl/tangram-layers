// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const ASSIGNMENT_STYLE_DEFAULT_EXPORT = /^export default [A-Za-z_$][\w$]*\s*=/m;

describe('renderer ESM sources', () => {
  it('do not assign through default exports', async () => {
    const files = [
      'modules/tangram-renderer/src/gl/constants.js',
      'modules/tangram-renderer/src/gl/context.js',
      'modules/tangram-renderer/src/utils/debug_settings.js',
      'modules/tangram-renderer/src/utils/geo.js',
      'modules/tangram-renderer/src/utils/vector.js',
      'modules/tangram-renderer/src/utils/worker_broker.js'
    ];

    for (const file of files) {
      expect(await readFile(file, 'utf8')).not.toMatch(ASSIGNMENT_STYLE_DEFAULT_EXPORT);
    }
  });
});
