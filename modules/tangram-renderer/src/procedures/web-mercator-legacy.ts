// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

const HALF_CIRCUMFERENCE_METERS = 20037508.342789244;

/** Project longitude/latitude degrees to Web Mercator meters using Tangram's established formula. */
export function projectLngLatToMetersLegacy(coordinates: readonly [number, number]): [number, number] {
  const longitude = coordinates[0] * (HALF_CIRCUMFERENCE_METERS / 180);
  const latitude =
    (Math.log(Math.tan((coordinates[1] * Math.PI) / 360 + Math.PI / 4)) / Math.PI) *
    HALF_CIRCUMFERENCE_METERS;
  return [longitude, latitude];
}

/** Unproject Web Mercator meters to longitude/latitude degrees using Tangram's established formula. */
export function unprojectMetersToLngLatLegacy(coordinates: readonly [number, number]): [number, number] {
  const longitude = (coordinates[0] / HALF_CIRCUMFERENCE_METERS) * 180;
  const normalizedLatitude = coordinates[1] / HALF_CIRCUMFERENCE_METERS;
  const latitude =
    ((2 * Math.atan(Math.exp(normalizedLatitude * Math.PI)) - Math.PI / 2) / Math.PI) * 180;
  return [longitude, latitude];
}
