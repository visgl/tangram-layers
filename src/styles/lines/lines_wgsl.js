const LAYER_DELTA = 1 / (1 << 14);
const ATTRIBUTE_SCALE = 1024;

/**
 * Build the portable base-line shader used by the luma.gl WebGPU renderer.
 *
 * Tangram's line builder emits expanded triangle geometry. The extrusion
 * vector and its fractional-zoom scaling are therefore applied before the
 * host-provided tile and camera matrices. Animated styles use the generated
 * line texture coordinates and Tangram's frame time to produce a portable
 * data-stream pulse without additive blending. Offsets, heights, textures,
 * arbitrary custom shader blocks, and selection remain follow-up tranches.
 *
 * @param {object} options Shader options.
 * @param {boolean} options.animated Enables the portable data-stream pulse.
 * @returns {string} Complete WGSL source for the line style.
 */
export function buildLinesWGSL({ animated = false } = {}) {
    const animated_attribute = animated ? '\n    @location(2) a_texcoord: vec2<f32>,' : '';
    const color_location = animated ? 3 : 2;
    const animated_varying = animated ? '\n    @location(1) texcoord: vec2<f32>,' : '';
    const animated_vertex = animated ? '\n    output.texcoord = attributes.a_texcoord;' : '';
    const animated_fragment = animated ? `
    let direction = select(-1.0, 1.0, input.texcoord.x < 0.5);
    let stream_coordinate = input.texcoord.y * 0.125 -
        TangramView.u_time * 1.8 * direction;
    let stream_phase = fract(stream_coordinate);
    let stream_head = smoothstep(0.58, 0.72, stream_phase);
    let stream_tail = 1.0 - smoothstep(0.82, 0.98, stream_phase);
    let stream = stream_head * stream_tail;
    let lane_center = 1.0 - abs(input.texcoord.x * 2.0 - 1.0);
    let lane_mask = mix(0.55, 1.0, lane_center);
    let palette_phase = fract(
        TangramView.u_time * 0.08 + input.texcoord.y * 0.017
    );
    let stream_color = mix(
        vec3<f32>(0.0, 0.95, 1.0),
        vec3<f32>(0.86, 0.18, 0.95),
        palette_phase
    );
    let animated_color = mix(
        input.color.rgb,
        stream_color,
        stream * lane_mask * 0.82
    );
    return vec4<f32>(animated_color, input.color.a);
` : '    return input.color;\n';

    return `
struct LineAttributes {
    @location(0) a_position: vec4<i32>,
    @location(1) a_extrude: vec2<i32>,${animated_attribute}
    @location(${color_location}) a_color: vec4<f32>,
};

struct LineVaryings {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,${animated_varying}
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
${animated_vertex}
    return output;
}

@fragment
fn fragmentMain(input: LineVaryings) -> @location(0) vec4<f32> {
${animated_fragment}
}
`;
}
