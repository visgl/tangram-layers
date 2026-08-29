import {getVitestConfig} from '@vis.gl/dev-tools';

export default getVitestConfig({
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
        include: ['test/**/*.browser.spec.js']
      }
    }
  }
});
