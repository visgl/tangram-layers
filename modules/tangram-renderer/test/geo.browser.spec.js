// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import {beforeEach, describe, expect, it} from 'vitest';

import Geo from '../src/utils/geo';
import simplePolygon from './fixtures/simple-polygon.json';

describe('Geo', () => {

    describe('Geo.findBoundingBox(polygon)', () => {
        let bbox;
        beforeEach(() => {
            bbox = Geo.findBoundingBox(simplePolygon.geometry.coordinates);
        });

        it('calculates the expected bounding box', () => {
            expect(bbox).toEqual(simplePolygon.properties.bounds);
        });
    });

});
