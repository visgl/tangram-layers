// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

// @ts-nocheck

/** Shared host-projection functions for Tangram's portable WGSL styles. */
export const GLOBE_PROJECTION_WGSL = `
fn tangramGlobePosition(mercator_position: vec3<f32>) -> vec3<f32> {
    let mercator_radius = 6378137.0;
    let earth_radius = 6370972.0;
    let globe_radius = 256.0;
    let half_pi = 1.5707963267948966;
    let longitude = mercator_position.x / mercator_radius;
    let latitude = 2.0 * atan(exp(mercator_position.y / mercator_radius)) - half_pi;
    let radius = (mercator_position.z / earth_radius + 1.0) * globe_radius;
    let latitude_cosine = cos(latitude);
    return vec3<f32>(
        sin(longitude) * latitude_cosine,
        -cos(longitude) * latitude_cosine,
        sin(latitude)
    ) * radius;
}

fn tangramModelView(local_position: vec4<f32>) -> vec4<f32> {
    if (TangramView.u_projection_mode == 1) {
        let world_position = TangramTile.u_model * local_position;
        return vec4<f32>(
            tangramGlobePosition(world_position.xyz),
            1.0
        );
    }
    return TangramTile.u_modelView * local_position;
}
`;
