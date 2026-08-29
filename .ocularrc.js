/** @type {import('@vis.gl/dev-tools').OcularConfig} */
const config = {
  // Tangram's renderer retains a purpose-built Rollup pipeline for its worker
  // and browser bundles. Ocular owns repository-wide orchestration around it.
  lint: {
    paths: ['dev-modules', 'modules', 'examples', 'website']
  },
  babel: false
};

export default config;
