import {assert} from 'chai';
import {buildLinesWGSL} from '../src/styles/lines/lines_wgsl';

describe('Line WGSL', function () {
    it('builds expanded line geometry from Tangram view and tile uniforms', function () {
        const source = buildLinesWGSL();

        assert.include(source, '@location(0) a_position: vec4<i32>');
        assert.include(source, '@location(1) a_extrude: vec2<i32>');
        assert.include(source, '@location(2) a_color: vec4<f32>');
        assert.include(source, 'TangramView.u_map_position.z');
        assert.include(source, 'TangramTile.u_tile_origin.z');
        assert.include(source, 'TangramTile.u_modelView * local_position');
        assert.include(source, 'TangramCamera.u_projection');
        assert.include(source, 'width_scale * midpoint_zoom_delta');
        assert.notInclude(source, 'TangramView.u_time');
    });

    it('builds a portable animated data-stream line shader', function () {
        const source = buildLinesWGSL({ animated: true });

        assert.include(source, '@location(2) a_texcoord: vec2<f32>');
        assert.include(source, '@location(3) a_color: vec4<f32>');
        assert.include(source, 'TangramView.u_time');
        assert.include(source, 'car_length');
        assert.include(source, 'lane_mask');
        assert.include(source, 'car_color');
        assert.include(source, 'direction');
        assert.notInclude(source, 'palette_phase');
    });
});
