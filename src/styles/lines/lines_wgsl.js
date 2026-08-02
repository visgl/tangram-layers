const LAYER_DELTA = 1 / (1 << 14);
const ATTRIBUTE_SCALE = 1024;

/**
 * Build the portable base-line shader used by the luma.gl WebGPU renderer.
 *
 * Tangram's line builder emits expanded triangle geometry. The extrusion
 * vector and its fractional-zoom scaling are therefore applied before the
 * host-provided tile and camera matrices. Custom GLSL style blocks, offsets,
 * heights, textures, and selection are intentionally separate follow-up
 * tranches.
 */
export function buildLinesWGSL() {
    return `
struct LineAttributes {
    @location(0) a_position: vec4<i32>,
    @location(1) a_extrude: vec2<i32>,
    @location(2) a_color: vec4<f32>,
};

struct LineVaryings {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vertexMain(attributes: LineAttributes) -> LineVaryings {
    var output: LineVaryings;
    var extrusion = vec2<f32>(attributes.a_extrude);

    var zoom_delta = clamp(
        TangramView.u_map_position.z - TangramTile.u_tile_origin.z,
        0.0,
        4.0
    );
    zoom_delta += step(1.0, zoom_delta) * (1.0 - zoom_delta) +
        mix(0.0, 2.0, clamp((zoom_delta - 2.0) / 2.0, 0.0, 1.0));

    let midpoint_zoom_delta = (zoom_delta - 0.5) * 2.0;
    let width_scale = f32(attributes.a_position.z) / ${ATTRIBUTE_SCALE}.0;
    extrusion -= extrusion * width_scale * midpoint_zoom_delta;
    extrusion *= exp2(
        -zoom_delta - (TangramTile.u_tile_origin.z - TangramTile.u_tile_origin.w)
    );

    let local_position = vec4<f32>(
        vec2<f32>(attributes.a_position.xy) + extrusion,
        0.0,
        1.0
    );
    var clip_position = TangramCamera.u_projection *
        (TangramTile.u_modelView * local_position);
    let layer = f32(attributes.a_position.w) +
        TangramTile.u_tile_proxy_order_offset + 1.0;
    clip_position.z -= layer * ${LAYER_DELTA} * clip_position.w;

    output.position = clip_position;
    output.color = attributes.a_color;
    return output;
}

@fragment
fn fragmentMain(input: LineVaryings) -> @location(0) vec4<f32> {
    return input.color;
}
`;
}
