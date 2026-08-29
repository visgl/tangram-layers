import {getVitestConfig} from '@vis.gl/dev-tools';

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
        include: ['test/**/*.browser.spec.js', 'modules/**/test/**/*_spec.js'],
        exclude: ['modules/tangram-renderer/test/leaflet_layer_spec.js'],
        globals: true,
        setupFiles: ['./test/vitest-browser-setup.js']
      }
    }
  }
});
