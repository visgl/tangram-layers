// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

import {beforeEach, describe, expect, it} from 'vitest';

import Geo from '../src/utils/geo';
import simplePolygon from './fixtures/simple-polygon.json';

describe('Geo', () => {

    describe('Geo.findBoundingBox(polygon)', () => {
        let bbox: any;
        beforeEach(() => {
            bbox = Geo.findBoundingBox(simplePolygon.geometry.coordinates);
        });

        it('calculates the expected bounding box', () => {
            expect(bbox).toEqual(simplePolygon.properties.bounds);
        });
    });

    it('round-trips tile and mercator coordinates', () => {
        const tile = {x: 3, y: 2, z: 4};
        const meters = Geo.metersForTile(tile);
        expect(Geo.tileForMeters([meters.x + 1, meters.y - 1], tile.z)).toEqual(tile);
        expect(Geo.wrapTile({x: -1, y: 17, z: 4})).toEqual({x: 15, y: 17, z: 4});
        expect(Geo.wrapTile({x: 17, y: -1, z: 4}, {x: true, y: true})).toEqual({x: 1, y: 15, z: 4});
    });

    it('converts lat/lng in place and caches scale factors', () => {
        const coordinates = [-74, 40.7];
        const projected = Geo.latLngToMeters(coordinates);
        expect(projected).toBe(coordinates);
        expect(Geo.metersPerPixel(8)).toBe(Geo.metersPerPixel(8));
        expect(Geo.metersPerTile(8)).toBeCloseTo(Geo.metersPerPixel(8) * Geo.tile_size);
        expect(Geo.unitsPerMeter(8)).toBeGreaterThan(0);
        expect(Geo.metersToLatLng(projected)[0]).toBeCloseTo(-74, 5);
        expect(projected[1]).toBeCloseTo(40.7, 5);
    });

    it('copies and transforms every supported geometry shape', () => {
        const geometry = {
            type: 'MultiPolygon',
            coordinates: [[[[0, 1], [2, 3], [4, 5]]]]
        };
        const copy = Geo.copyGeometry(geometry);
        expect(copy).not.toBe(geometry);
        expect(copy).toEqual(geometry);
        Geo.transformGeometry(geometry, coordinate => {
            coordinate[0] += 10;
        });
        expect(geometry.coordinates[0][0][0][0]).toBe(10);
        expect(Geo.copyGeometry(null)).toBeUndefined();
    });

    it('classifies geometry and calculates polygon measurements', () => {
        const ring = [[0, 0], [2, 0], [2, 2], [0, 2]];
        expect(Geo.geometryType('Polygon')).toBe('polygon');
        expect(Geo.geometryType('LineString')).toBe('line');
        expect(Geo.geometryType('Point')).toBe('point');
        expect(Geo.polygonRingArea(ring)).toBe(4);
        expect(Geo.polygonArea([ring])).toBe(4);
        expect(Geo.multiPolygonArea([[ring], [ring]])).toBe(8);
        expect(Geo.ringWinding(ring)).toBe('CW');
        expect(Geo.centroid([ring])).toEqual([1, 1]);
        expect(Geo.multiCentroid([[ring], [ring]])).toEqual([1, 1]);
        expect(Geo.boxIntersect({sw: {x: 0, y: 0}, ne: {x: 1, y: 1}}, {sw: {x: 0.5, y: 0.5}, ne: {x: 2, y: 2}})).toBe(true);
    });

});
