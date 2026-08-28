import { assert } from 'chai';
import { buildPolygonsWGSL } from '../src/styles/polygons/polygons_wgsl';

describe('Polygon WGSL', function () {
    it('builds a vector-color shader with Tangram camera and tile blocks', function () {
        const source = buildPolygonsWGSL();

        assert.include(source, '@location(0) a_position: vec4<i32>');
        assert.include(source, '@location(1) a_normal: vec4<f32>');
        assert.include(source, '@location(2) a_color: vec4<f32>');
        assert.include(source, 'TangramCamera.u_projection');
        assert.include(source, 'TangramTile.u_modelView');
        assert.include(source, 'let surface_normal = normalize(attributes.a_normal.xyz)');
        assert.include(source, 'let side_amount = 1.0 - smoothstep');
        assert.include(source, 'return input.color;');
        assert.notInclude(source, 'var u_rasters: texture_2d<f32>');
    });

    it('builds a raster shader with portable texture and sampler bindings', function () {
        const source = buildPolygonsWGSL({ raster: true });

        assert.include(source, '@binding(3) var u_rasters: texture_2d<f32>');
        assert.include(source, '@binding(4) var u_rastersSampler: sampler');
        assert.include(source, 'textureSample(u_rasters, u_rastersSampler, input.raster_uv)');
        assert.include(source, '-f32(attributes.a_position.y)');
    });
});
