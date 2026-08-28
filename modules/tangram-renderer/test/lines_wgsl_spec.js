import {assert} from 'chai';
import {buildLinesWGSL} from '../src/styles/lines/lines_wgsl';

describe('Line WGSL', function () {
    it('builds expanded line geometry from Tangram view and tile uniforms', function () {
        const source = buildLinesWGSL();

        assert.include(source, '@location(0) a_position: vec4<i32>');
        assert.include(source, '@location(1) a_extrude: vec2<i32>');
        assert.include(source, '@location(2) a_offset: vec2<i32>');
        assert.include(source, '@location(3) a_z_and_offset_scale: vec2<i32>');
        assert.include(source, '@location(4) a_texcoord: vec2<f32>');
        assert.include(source, '@location(5) a_color: vec4<f32>');
        assert.include(source, '@binding(3) var u_texture: texture_2d<f32>');
        assert.include(source, '@binding(4) var u_textureSampler: sampler');
        assert.include(source, 'TangramView.u_map_position.z');
        assert.include(source, 'TangramTile.u_tile_origin.z');
        assert.include(source, 'TangramTile.u_modelView * local_position');
        assert.include(source, 'TangramCamera.u_projection');
        assert.include(source, 'width_scale * midpoint_zoom_delta');
        assert.include(source, 'offset_width_scale');
        assert.include(source, 'offset_scale_direction');
        assert.include(source, 'offset *= screen_space_scale');
        assert.include(source, 'attributes.a_position.xy) + extrusion + offset');
        assert.include(source, 'attributes.a_z_and_offset_scale.x) / 16.0');
        assert.include(source, 'TangramLine.u_v_scale_adjust');
        assert.include(source, 'TangramLine.u_has_line_texture != 0u');
        assert.include(source, 'TangramLine.u_texture_ratio');
        assert.include(source, 'TangramLine.u_dash_background_color');
        assert.include(source, 'textureSample(u_texture, u_textureSampler, line_texcoord)');
        assert.notInclude(source, 'TangramView.u_time');
    });

    it('builds a portable animated data-stream line shader', function () {
        const source = buildLinesWGSL({ animated: true });

        assert.include(source, '@location(4) a_texcoord: vec2<f32>');
        assert.include(source, '@location(5) a_color: vec4<f32>');
        assert.include(source, 'TangramView.u_time');
        assert.include(source, 'input.texcoord.y * 0.125');
        assert.include(source, 'traffic_coordinate / 6.0');
        assert.include(source, 'vehicle_position');
        assert.include(source, 'longitudinal_derivative = max(fwidth(vehicle_position)');
        assert.include(source, 'vehicle_half_length = max(0.022');
        assert.include(source, 'vehicle_body');
        assert.include(source, 'vehicle_halo');
        assert.include(source, 'lane_derivative = max(fwidth(input.texcoord.x)');
        assert.include(source, 'lane_mask');
        assert.include(source, 'vehicle_color');
        assert.include(source, 'direction');
        assert.include(source, 'attributes.a_texcoord / 65535.0');
        assert.notInclude(source, 'traffic_random');
        assert.notInclude(source, 'palette_phase');
    });
});
