// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import Geo from '../../utils/geo';
import {GLOBE_PROJECTION_WGSL} from '../globe_projection_wgsl';

const LAYER_DELTA = 1 / (1 << 14);

/**
 * Build the portable polygon shader used by the luma.gl WebGPU renderer.
 *
 * Tangram's existing GLSL shader composer remains authoritative for WebGL.
 * This deliberately small WGSL program establishes the native-device path for
 * flat polygons and raster tiles before the remaining style features are ported.
 */
export function buildPolygonsWGSL({ raster = false } = {}) {
    const raster_declarations = raster ? `
@group(0) @binding(3) var u_rasters: texture_2d<f32>;
@group(0) @binding(4) var u_rastersSampler: sampler;
` : '';
    const raster_fragment = raster ? `
    // Tangram's raster images are uploaded without a WebGL Y flip on WebGPU,
    // so use top-left texture coordinates for the tile-local geometry.
    let raster_color = textureSample(u_rasters, u_rastersSampler, input.raster_uv);
    return input.color * raster_color;
` : '    return input.color;\n';

    return `
${raster_declarations}
${GLOBE_PROJECTION_WGSL}
struct PolygonAttributes {
    @location(0) a_position: vec4<i32>,
    @location(1) a_normal: vec4<f32>,
    @location(2) a_color: vec4<f32>,
};

struct PolygonVaryings {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) raster_uv: vec2<f32>,
};

@vertex
fn vertexMain(attributes: PolygonAttributes) -> PolygonVaryings {
    var output: PolygonVaryings;
    let local_position = vec4<f32>(
        f32(attributes.a_position.x),
        f32(attributes.a_position.y),
        f32(attributes.a_position.z) / ${Geo.height_scale}.0,
        1.0
    );
    var clip_position = TangramCamera.u_projection * tangramModelView(local_position);
    let layer = f32(attributes.a_position.w) +
        TangramTile.u_tile_proxy_order_offset + 1.0;
    clip_position.z -= layer * ${LAYER_DELTA} * clip_position.w;

    let surface_normal = normalize(attributes.a_normal.xyz);
    let light_direction = normalize(vec3<f32>(0.35, -0.45, 0.82));
    let diffuse = max(dot(surface_normal, light_direction), 0.0);
    let side_amount = 1.0 - smoothstep(0.8, 0.98, abs(surface_normal.z));
    let light = mix(1.0, 0.58 + 0.52 * diffuse, side_amount);

    output.position = clip_position;
    output.color = vec4<f32>(attributes.a_color.rgb * light, attributes.a_color.a);
    output.raster_uv = vec2<f32>(
        f32(attributes.a_position.x) / ${Geo.tile_scale}.0,
        -f32(attributes.a_position.y) / ${Geo.tile_scale}.0
    );
    return output;
}

@fragment
fn fragmentMain(input: PolygonVaryings) -> @location(0) vec4<f32> {
${raster_fragment}}
`;
}
