// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it} from 'vitest';
import {buildLinesWGSL} from '../src/styles/lines/lines_wgsl';

describe('Line WGSL', function () {
    it('builds expanded line geometry from Tangram view and tile uniforms', function () {
        const source = buildLinesWGSL();

        expect(source).toContain('@location(0) a_position: vec4<i32>');
        expect(source).toContain('@location(1) a_extrude: vec2<i32>');
        expect(source).toContain('@location(2) a_offset: vec2<i32>');
        expect(source).toContain('@location(3) a_z_and_offset_scale: vec2<i32>');
        expect(source).toContain('@location(4) a_texcoord: vec2<f32>');
        expect(source).toContain('@location(5) a_color: vec4<f32>');
        expect(source).toContain('@binding(3) var u_texture: texture_2d<f32>');
        expect(source).toContain('@binding(4) var u_textureSampler: sampler');
        expect(source).toContain('TangramView.u_map_position.z');
        expect(source).toContain('TangramTile.u_tile_origin.z');
        expect(source).toContain('TangramTile.u_modelView * local_position');
        expect(source).toContain('TangramView.u_projection_mode == 1');
        expect(source).toContain('TangramCamera.u_projection');
        expect(source).toContain('width_scale * midpoint_zoom_delta');
        expect(source).toContain('offset_width_scale');
        expect(source).toContain('offset_scale_direction');
        expect(source).toContain('offset *= screen_space_scale');
        expect(source).toContain('attributes.a_position.xy) + extrusion + offset');
        expect(source).toContain('attributes.a_z_and_offset_scale.x) / 16.0');
        expect(source).toContain('TangramLine.u_v_scale_adjust');
        expect(source).toContain('TangramLine.u_has_line_texture != 0u');
        expect(source).toContain('TangramLine.u_texture_ratio');
        expect(source).toContain('TangramLine.u_dash_background_color');
        expect(source).toContain('textureSample(u_texture, u_textureSampler, line_texcoord)');
        expect(source).not.toContain('TangramView.u_time');
    });

    it('builds a portable animated data-stream line shader', function () {
        const source = buildLinesWGSL({ animated: true });

        expect(source).toContain('@location(4) a_texcoord: vec2<f32>');
        expect(source).toContain('@location(5) a_color: vec4<f32>');
        expect(source).toContain('TangramView.u_time');
        expect(source).toContain('input.texcoord.y * 0.125');
        expect(source).toContain('traffic_coordinate / 6.0');
        expect(source).toContain('vehicle_position');
        expect(source).toContain('longitudinal_derivative = max(fwidth(vehicle_position)');
        expect(source).toContain('vehicle_half_length = max(0.022');
        expect(source).toContain('vehicle_body');
        expect(source).toContain('vehicle_halo');
        expect(source).toContain('lane_derivative = max(fwidth(input.texcoord.x)');
        expect(source).toContain('lane_mask');
        expect(source).toContain('vehicle_color');
        expect(source).toContain('direction');
        expect(source).toContain('attributes.a_texcoord / 65535.0');
        expect(source).not.toContain('traffic_random');
        expect(source).not.toContain('palette_phase');
    });
});
