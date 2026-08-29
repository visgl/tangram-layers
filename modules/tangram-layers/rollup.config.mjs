export default {
    input: 'src/index.js',
    output: {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true
    },
    external: [
        '@deck.gl/core',
        '@vis.gl/tangram-renderer'
    ]
};
