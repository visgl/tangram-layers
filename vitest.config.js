// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {getVitestConfig} from '@vis.gl/dev-tools';

const runLegacyBrowserTests = process.env.TANGRAM_VITEST_LEGACY === '1';

export default getVitestConfig({
  overrides: {
    optimizeDeps: {include: ['sinon']},
    plugins: [
      {
        name: 'tangram-glsl',
        transform(source, identifier) {
          if (!identifier.endsWith('.glsl')) {
            return null;
          }
          return {
            code: `export default ${JSON.stringify(source)}`,
            map: null
          };
        }
      }
    ]
  },
  projects: {
    node: {
      test: {
        include: ['test/**/*.node.spec.js']
      }
    },
    browser: {
      test: {
        include: ['test/**/*.browser.spec.js']
      }
    },
    headless: {
      test: {
        include: [
          'test/**/*.browser.spec.js',
          ...(runLegacyBrowserTests ? ['modules/**/test/**/*_spec.js'] : [])
        ],
        exclude: ['modules/tangram-renderer/test/leaflet_layer_spec.js'],
        globals: runLegacyBrowserTests,
        setupFiles: runLegacyBrowserTests ? ['./test/vitest-browser-setup.js'] : []
      }
    }
  }
});
