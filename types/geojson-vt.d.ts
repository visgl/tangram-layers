// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 vis.gl contributors

declare module 'geojson-vt' {
    type GeoJsonTile = {features?: any[]};
    type GeoJsonTileIndex = {getTile(z: number, x: number, y: number): GeoJsonTile | null};
    type GeoJsonVtOptions = Record<string, unknown>;

    export default function geojsonvt(data: unknown, options?: GeoJsonVtOptions): GeoJsonTileIndex;
}
