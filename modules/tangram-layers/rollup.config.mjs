// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true,
        banner: `// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors`
    },
    external: [
        '@deck.gl/core',
        '@vis.gl/tangram-renderer'
    ]
};
