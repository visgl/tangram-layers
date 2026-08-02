const LAYER_DELTA = 1 / (1 << 14);
const ATTRIBUTE_SCALE = 1024;

/**
 * Build the portable base-line shader used by the luma.gl WebGPU renderer.
 *
 * Tangram's line builder emits expanded triangle geometry. The extrusion
 * vector and its fractional-zoom scaling are therefore applied before the
 * host-provided tile and camera matrices. Animated styles use the generated
 * line texture coordinates and Tangram's frame time to produce a portable
 * compact repeating vehicles without additive blending. Offsets, heights,
 * textures, arbitrary custom shader blocks, and selection remain follow-up
 * tranches.
 *
 * @param {object} options Shader options.
 * @param {boolean} options.animated Enables the portable traffic vehicles.
 * @returns {string} Complete WGSL source for the line style.
 */
export function buildLinesWGSL({ animated = false } = {}) {
    const animated_attribute = animated ? '\n    @location(2) a_texcoord: vec2<f32>,' : '';
    const color_location = animated ? 3 : 2;
    const animated_varying = animated ? '\n    @location(1) texcoord: vec2<f32>,' : '';
    const animated_vertex = animated ?
        '\n    output.texcoord = attributes.a_texcoord / 65535.0;' : '';
    const animated_fragment = animated ? `

    let direction = select(-1.0, 1.0, input.texcoord.x < 0.5);
    let lane_phase = select(0.0, 2.25, direction > 0.0);
    // A deterministic spatial window translates smoothly. Randomizing the
    // time-shifted cell made complete road segments pop between frames.
    let traffic_coordinate = input.texcoord.y * 512.0 -
        TangramView.u_time * 4.0 * direction + lane_phase;
    let vehicle_position = fract(traffic_coordinate / 5.0);
    let vehicle_front = smoothstep(0.003, 0.010, vehicle_position);
    let vehicle_back = 1.0 - smoothstep(0.032, 0.043, vehicle_position);
    let vehicle_length = vehicle_front * vehicle_back;
    let lane_center = select(0.72, 0.28, direction > 0.0);
    let lane_distance = abs(input.texcoord.x - lane_center);
    let lane_mask = 1.0 - smoothstep(0.08, 0.20, lane_distance);
    let vehicle = vehicle_length * lane_mask;
    let vehicle_color = vec3<f32>(0.35, 1.0, 0.98);
    let animated_color = mix(
        input.color.rgb,
        vehicle_color,
        vehicle * 0.98
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
