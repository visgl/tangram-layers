// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {assert} from 'chai';
import {buildPointsWGSL} from '../src/styles/points/points_wgsl';

describe('Point WGSL', function () {
    it('selects point rendering through a buffered attribute', function () {
        const source = buildPointsWGSL();

        assert.include(source, '@location(8) a_point_type: f32');
        assert.include(source, '@interpolate(flat) point_type: u32');
        assert.include(source, 'input.point_type == 1u');
        assert.include(source, 'input.point_type == 2u');
        assert.include(source, 'output.point_type == 3u');
        assert.notInclude(source, 'u_point_type');
    });

    it('renders textures, atlas labels, and antialiased shader circles', function () {
        const source = buildPointsWGSL();

        assert.include(source, '@binding(3) var u_texture: texture_2d<f32>');
        assert.include(source, 'textureSampleLevel');
        assert.include(source, 'input.texcoord');
        assert.include(source, '1.0 - attributes.a_texcoord.y');
        assert.include(source, 'fn antialiasCircle');
        assert.include(source, 'input.outline_edge');
        assert.include(source, 'discard');
    });
});
