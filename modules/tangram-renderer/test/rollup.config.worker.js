// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

// Create a standalone worker bundle for browser-backed Vitest integration tests.
// The regular two-pass code-splitting build does not produce this test fixture.

import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { importAsString } from 'rollup-plugin-string-import';

const config = {
    input: 'src/scene/scene_worker.ts',
    output: {
        file: 'build/worker.test.js',
        format: 'umd',
        sourcemap: 'inline',
        indent: false,
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false,
            extensions: ['.mjs', '.js', '.json', '.node', '.ts']
        }),
        commonjs(),
        json(), // load JSON files
        importAsString({
            include: ['**/*.glsl'] // inline imported JSON and shader files
        }),
        babel({
          exclude: 'node_modules/**',
          extensions: ['.js', '.mjs', '.ts'],
          babelHelpers: 'runtime',
          configFile: '../../babel.config.js'
        })
    ]
};

export default config;
