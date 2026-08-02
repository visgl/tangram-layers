import { assert } from 'chai';
import ShaderProgram from '../src/gl/shader_program';

describe('ShaderProgram portable compilation', function () {
    it('creates WGSL resources without reading or linking a WebGL context', function () {
        const shader_options = [];
        const shader_resources = [];
        const gl = new Proxy({}, {
            get(target, property) {
                throw new Error(`unexpected WebGL access '${String(property)}'`);
            }
        });
        const source = [
            '@vertex fn vertexMain() -> @builtin(position) vec4<f32> {',
            '    return vec4<f32>(0.0);',
            '}',
            '@fragment fn fragmentMain() -> @location(0) vec4<f32> {',
            '    return vec4<f32>(1.0);',
            '}'
        ].join('\n');
        const program = new ShaderProgram(gl, source, source, {
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

        assert.isTrue(program.compiled);
        assert.isNull(program.program);
        assert.deepEqual(shader_options.map(options => ({
            stage: options.stage,
            language: options.language,
            entryPoint: options.entryPoint,
            source: options.source
        })), [
            { stage: 'vertex', language: 'wgsl', entryPoint: 'vertexMain', source },
            { stage: 'fragment', language: 'wgsl', entryPoint: 'fragmentMain', source }
        ]);

        program.destroy();
        assert.isTrue(shader_resources[0].destroyed);
        assert.isTrue(shader_resources[1].destroyed);
    });
});
