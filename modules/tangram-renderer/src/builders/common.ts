// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// Geometry building functions
import Geo from '../utils/geo';

export const tile_bounds = [
    { x: 0, y: 0},
    { x: Geo.tile_scale, y: -Geo.tile_scale } // TODO: correct for flipped y-axis?
];

export const default_uvs = [0, 0, 1, 1];

// Tests if a line segment (from point A to B) is outside the tile bounds
// (within a certain tolerance to account for geometry nearly on tile edges)
export function outsideTile (_a: number[], _b: number[], tolerance: number): boolean {
    let tile_min = tile_bounds[0];
    let tile_max = tile_bounds[1];

    // TODO: fix flipped Y coords here, confusing with 'max' reference
    if ((_a[0] <= tile_min.x + tolerance && _b[0] <= tile_min.x + tolerance) ||
        (_a[0] >= tile_max.x - tolerance && _b[0] >= tile_max.x - tolerance) ||
        (_a[1] >= tile_min.y - tolerance && _b[1] >= tile_min.y - tolerance) ||
        (_a[1] <= tile_max.y + tolerance && _b[1] <= tile_max.y + tolerance)) {
        return true;
    }

    return false;
}

export function isCoordOutsideTile (coord: number[], tolerance = 0): boolean {
    let tile_min = tile_bounds[0];
    let tile_max = tile_bounds[1];

    return coord[0] <= tile_min.x + tolerance ||
           coord[0] >= tile_max.x - tolerance ||
           coord[1] >= tile_min.y - tolerance ||
           coord[1] <= tile_max.y + tolerance;
}
