// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { assert } from 'chai';
import Texture from '../src/gl/texture';
import Context from '../src/gl/context';

describe('Texture resource backend', function () {
    it('allocates, replaces, and destroys textures through an injected resource factory', function () {
        const gl = {};
        const resources = [];
        const factory_options = [];
        Texture.setResourceFactory(gl, options => {
            factory_options.push(options);
            const resource = {
                get handle() { throw new Error('renderer-owned textures must remain opaque'); },
                destroyed: false,
                destroy() {
                    this.destroyed = true;
                }
            };
            resources.push(resource);
            return resource;
        });

        const data = new Uint8Array(16);
        const texture = Texture.create(gl, '__resource_texture_test', {
            width: 2,
            height: 2,
            data,
            filtering: 'linear'
        });

        assert.lengthOf(resources, 2, 'placeholder is replaced by the requested data');
        assert.isTrue(resources[0].destroyed);
        assert.strictEqual(texture.getResource(), resources[1]);
        assert.strictEqual(texture.texture, resources[1]);
        assert.deepInclude(factory_options[0], {
            id: '__resource_texture_test',
            width: 1,
            height: 1,
            filtering: 'nearest'
        });
        assert.strictEqual(factory_options[1].data, data);
        assert.deepInclude(factory_options[1], {
            width: 2,
            height: 2,
            filtering: 'linear'
        });

        texture.destroy({ force: true });
        assert.isTrue(resources[1].destroyed);
        assert.isNull(texture.texture);
        Texture.clearResourceFactory(gl);
    });

    it('owns handle-free portable texture resources without a WebGL context', function () {
        const resources = [];
        const context_scope = sinon.stub(Context, 'withContext')
            .throws(new Error('portable textures must bypass WebGL context scopes'));
        let texture;
        try {
            texture = Texture.create(null, '__portable_texture_test', {
                width: 1,
                height: 1,
                data: new Uint8Array(4),
                textureFactory() {
                    const resource = {
                        get handle() { throw new Error('portable textures must remain opaque'); },
                        destroy() { this.destroyed = true; }
                    };
                    resources.push(resource);
                    return resource;
                }
            });

            texture.update(new Uint8Array(4));
            texture.setFiltering({ filtering: 'nearest' });
            texture.destroy({ force: true });
        }
        finally {
            context_scope.restore();
        }

        assert.lengthOf(resources, 3);
        assert.isTrue(resources[0].destroyed);
        assert.isTrue(resources[1].destroyed);
        assert.isTrue(resources[2].destroyed);
        assert.isNull(texture.texture);
    });
});
