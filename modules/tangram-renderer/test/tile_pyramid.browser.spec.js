// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import {beforeEach, describe, expect, it} from 'vitest';
import TilePyramid from '../src/tile/tile_pyramid';
import { TileID } from '../src/tile/tile_id';

describe('TilePyramid', function() {

    let coords = { x: 38603, y: 49255, z: 17 };
    let source, style_z;
    let tile;
    let pyramid;

    describe('overzooming', () => {

        beforeEach(() => {
            pyramid = new TilePyramid();

            style_z = coords.z;
            source = {
                id: 0,
                name: 'test',
                zooms: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                zoom_bias: 0
            };

            tile = {
                coords: TileID.coord(coords),
                style_z,
                source,
                loaded: true
            };
            tile.key = TileID.key(tile.coords, source, style_z);
        });

        it('creates one entry per zoom', () => {
            pyramid.addTile(tile);

            expect(Object.keys(pyramid.tiles)).toHaveLength(coords.z + 1);
        });

        it('creates one entry for non-overzoomed tile', () => {
            pyramid.addTile(tile);

            expect(pyramid.tiles[tile.key]).not.toBeNull();
        });

        it('creates entries for overzoomed tiles', () => {
            tile = Object.assign({}, tile);
            tile.coords = TileID.coordAtZoom(coords, 18);
            tile.style_z = 20;
            pyramid.addTile(tile);

            expect(pyramid.tiles[TileID.key(tile.coords, source, tile.style_z)]).not.toBeNull();
        });

        it('removes all entries for single tile', () => {
            pyramid.addTile(tile);
            pyramid.removeTile(tile);

            expect(Object.keys(pyramid.tiles)).toHaveLength(0);
        });

        it('gets tile ancestor', () => {
            pyramid.addTile(tile);
            let ancestor = pyramid.getAncestor(tile);

            expect(ancestor).not.toBeNull();
        });

        it('gets tile descendant', () => {
            pyramid.addTile(tile);
            let ancestor = TileID.parent(TileID.parent(tile));
            let descendants = pyramid.getDescendants(ancestor);

            expect(descendants).toHaveLength(1);
        });

    });

});
