// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const ASSIGNMENT_STYLE_DEFAULT_EXPORT = /^export default [A-Za-z_$][\w$]*\s*=/m;

describe('renderer ESM sources', () => {
  it('do not assign through default exports', async () => {
    const files = [
      'modules/tangram-renderer/src/gl/constants.ts',
      'modules/tangram-renderer/src/gl/context.ts',
      'modules/tangram-renderer/src/utils/debug_settings.ts',
      'modules/tangram-renderer/src/utils/geo.ts',
      'modules/tangram-renderer/src/utils/vector.ts',
      'modules/tangram-renderer/src/utils/worker_broker.js'
    ];

    for (const file of files) {
      expect(await readFile(file, 'utf8')).not.toMatch(ASSIGNMENT_STYLE_DEFAULT_EXPORT);
    }
  });
});
