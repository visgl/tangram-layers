// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {assert} from 'chai';
import {buildTextWGSL} from '../src/styles/text/text_wgsl';

describe('Text WGSL', function () {
    it('builds screen-space text quads with a portable atlas binding', function () {
        const source = buildTextWGSL();

        assert.include(source, '@location(0) a_position: vec4<i32>');
        assert.include(source, '@location(1) a_shape: vec4<i32>');
        assert.include(source, '@location(2) a_texcoord: vec2<f32>');
        assert.include(source, '@location(6) a_pre_angles: vec4<i32>');
        assert.include(source, 'TangramView.u_device_pixel_ratio');
        assert.include(source, 'TangramTile.u_modelView * local_position');
        assert.include(source, '@binding(3) var u_texture: texture_2d<f32>');
        assert.include(source, 'textureSample(u_texture, u_textureSampler');
        assert.include(source, '1.0 - attributes.a_texcoord.y');
        assert.notInclude(source, 'clip_position.xy +=');
        assert.notInclude(source, 'atlas_color.rgb /=');
    });

    it('keeps curved label interpolation in the portable shader', function () {
        const source = buildTextWGSL();

        assert.include(source, 'fn mix4Linear');
        assert.include(source, 'attributes.a_offsets.x != 0u');
        assert.include(source, 'TangramView.u_map_position.z');
        assert.include(source, 'curve_offset');
    });
});
