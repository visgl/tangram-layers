// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import {describe, expect, it} from 'vitest';
import { TileID } from '../src/tile/tile_id';

describe('Tile', function() {

    let coords = { x: 38603, y: 49255, z: 17 };

    describe('overzooming', () => {

        it('does NOT overzoom a coordinate at the max zoom', () => {
            let coords2 = TileID.coordForTileZooms(coords, [0, 12, 17]);

            expect(coords2.x).toBe(coords.x);
            expect(coords2.y).toBe(coords.y);
            expect(coords2.z).toBe(coords.z);
        });

        it('does NOT overzoom a coordinate below the max zoom', () => {
            let coords2 = TileID.coordForTileZooms(coords, [0, 12, 16, 17, 18]);

            expect(coords2.x).toBe(coords.x);
            expect(coords2.y).toBe(coords.y);
            expect(coords2.z).toBe(coords.z);
        });

        it('does overzoom a coordinate above the max zoom', () => {
            let unzoomed = { x: Math.floor(coords.x*2), y: Math.floor(coords.y*2), z: coords.z + 1 };
            let overzoomed = { x: Math.floor(coords.x/4), y: Math.floor(coords.y/4), z: coords.z - 2 };

            let coords2 = TileID.coordForTileZooms(unzoomed, [0, 12, 15]);

            expect(coords2.x).toBe(overzoomed.x);
            expect(coords2.y).toBe(overzoomed.y);
            expect(coords2.z).toBe(overzoomed.z);
        });

    });

});
