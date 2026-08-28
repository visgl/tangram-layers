import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import json from '@rollup/plugin-json';
import { importAsString } from 'rollup-plugin-string-import';

export default function (config) {

    config.set({
        basePath: '',
        frameworks: ['mocha', 'sinon'],
        files: [
            'https://unpkg.com/leaflet@1.3.4/dist/leaflet.js', // TODO: update leaflet version
            {
                pattern : 'modules/tangram-renderer/test/fixtures/*',
                watched : false,
                included : false,
                served : true
            },
            {
                pattern: 'modules/tangram-renderer/build/worker.test.js',
                watched : false,
                included: false,
                served: true
            },
            {
                pattern: 'modules/*/test/**/*.js'
            }
        ],

        exclude: ['modules/tangram-renderer/test/rollup.config.worker.js'], // skip worker build config
        preprocessors: {
            'modules/*/test/**/*.js' : ['rollup']
        },

        rollupPreprocessor: {
            output: {
                format: 'umd',
                sourcemap: 'inline',
            },
            treeshake: false, // treeshaking can remove test code we need!
            plugins: [
                resolve({
                    browser: true,
                    preferBuiltins: false
                }),
                commonjs(),

                json({
                    exclude: ['node_modules/**', 'modules/*/src/**'] // import JSON files
                }),
                importAsString({
                    include: ['**/*.glsl'] // inline shader files
                }),

                babel({
                    exclude: ['node_modules/**', '*.json'],
                    babelHelpers: "runtime"
                }),

                // These are needed for jszip node-environment compatibility,
                // previously provided by browserify
                globals({
                    exclude: [
                        '**/node_modules/@luma.gl/**',
                        '**/node_modules/@math.gl/**',
                        '**/node_modules/@probe.gl/**'
                    ]
                }),
                builtins()
            ]
        },

        plugins: [
            'karma-rollup-preprocessor',
            'karma-mocha',
            'karma-sinon',
            'karma-chrome-launcher',
            'karma-mocha-reporter'
        ],
        reporters: ['mocha'],

        port: 9876,
        colors: true,

        logLevel: config.LOG_INFO,
        autoWatch: false,
        browsers: ['Chrome'],

        singleRun: false

    });

}
