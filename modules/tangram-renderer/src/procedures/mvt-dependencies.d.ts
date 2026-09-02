// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

declare module 'pbf' {
    export default class Pbf {
        constructor (buffer: Uint8Array);
    }
}

declare module '@mapbox/vector-tile' {
    export class VectorTile {
        layers: Record<string, unknown>;
        constructor (pbf: unknown);
    }

    export class VectorTileFeature {
        static types: Record<number, string>;
    }
}
