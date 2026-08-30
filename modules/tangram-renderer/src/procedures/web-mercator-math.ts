// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {lngLatToWorld, worldToLngLat} from '@math.gl/web-mercator';

const WORLD_SIZE = 512;
const HALF_CIRCUMFERENCE_METERS = 20037508.342789244;
const CIRCUMFERENCE_METERS = HALF_CIRCUMFERENCE_METERS * 2;

/** Project longitude/latitude degrees to Tangram Web Mercator meters using math.gl. */
export function projectLngLatToMetersWithMath(
  coordinates: readonly [number, number]
): [number, number] {
  const [worldX, worldY] = lngLatToWorld([coordinates[0], coordinates[1]]);
  return [
    (worldX / WORLD_SIZE) * CIRCUMFERENCE_METERS - HALF_CIRCUMFERENCE_METERS,
    (worldY / WORLD_SIZE) * CIRCUMFERENCE_METERS - HALF_CIRCUMFERENCE_METERS
  ];
}

/** Unproject Tangram Web Mercator meters to longitude/latitude degrees using math.gl. */
export function unprojectMetersToLngLatWithMath(
  coordinates: readonly [number, number]
): [number, number] {
  const worldX =
    ((coordinates[0] + HALF_CIRCUMFERENCE_METERS) / CIRCUMFERENCE_METERS) * WORLD_SIZE;
  const worldY =
    ((coordinates[1] + HALF_CIRCUMFERENCE_METERS) / CIRCUMFERENCE_METERS) * WORLD_SIZE;
  return worldToLngLat([worldX, worldY]) as [number, number];
}
