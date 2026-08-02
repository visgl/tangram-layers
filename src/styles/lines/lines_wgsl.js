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
    let stream_phase = fract(
        input.texcoord.y - TangramView.u_time * 0.7 * direction
    );
    let along_distance = abs(stream_phase - 0.5);
    let car_length = 1.0 - smoothstep(0.04, 0.11, along_distance);
    let lane_center = select(0.72, 0.28, direction > 0.0);
    let lane_distance = abs(input.texcoord.x - lane_center);
    let lane_mask = 1.0 - smoothstep(0.12, 0.25, lane_distance);
    let car = car_length * lane_mask;
    let car_color = vec3<f32>(0.08, 1.0, 0.94);
    let animated_color = mix(
        input.color.rgb,
        car_color,
        car * 0.95
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
