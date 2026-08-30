// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it} from 'vitest';
import ShaderProgram from '../src/gl/shader_program';

describe('ShaderProgram portable compilation', function () {
    it('creates WGSL resources without reading or linking a WebGL context', function () {
        const shader_options = [];
        const shader_resources = [];
        const source = [
            '@vertex fn vertexMain() -> @builtin(position) vec4<f32> {',
            '    return vec4<f32>(0.0);',
            '}',
            '@fragment fn fragmentMain() -> @location(0) vec4<f32> {',
            '    return vec4<f32>(1.0);',
            '}'
        ].join('\n');
        const program = new ShaderProgram(null, source, source, {
            name: 'portable',
            shaderLanguage: 'wgsl',
            deferUniformBlocks: true,
            deferUniformUpdates: true,
            shaderFactory(options) {
                shader_options.push(options);
                const resource = {
                    destroyed: false,
                    destroy() { this.destroyed = true; }
                };
                shader_resources.push(resource);
                return resource;
            }
        });

        program.compile();

        expect(program.compiled).toBe(true);
        expect(program.program).toBeNull();
        expect(shader_options.map(options => ({
            stage: options.stage,
            language: options.language,
            entryPoint: options.entryPoint,
            source: options.source
        })), [
            { stage: 'vertex', language: 'wgsl', entryPoint: 'vertexMain', source },
            { stage: 'fragment', language: 'wgsl', entryPoint: 'fragmentMain', source }
        ]);

        program.destroy();
        expect(shader_resources[0].destroyed).toBe(true);
        expect(shader_resources[1].destroyed).toBe(true);
    });
});
