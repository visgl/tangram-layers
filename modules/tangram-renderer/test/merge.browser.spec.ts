// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import {beforeEach, describe, expect, it} from 'vitest';

import mergeObjects from '../src/utils/merge';

describe('mergeObjects', () => {

    let dest: any;

    beforeEach(() => {
        dest = {
            a: 5,
            b: 10,
            c: {
                x: 1, y: 2, z: 3
            },
            d: {
                e: {
                    x: 4, y: 5, z: 6
                }
            }
        };
    });

    describe('non-null source property', () => {

        let source = { a: 7 };

        it('overwrites previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.a).toBe(7);
        });

    });

    describe('null source property', () => {

        let source = { a: null };

        it('overwrites previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.a).toBeNull();
        });

    });

    describe('undefined source property', () => {

        let source = { a: undefined };

        it('does NOT overwrite previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.a).toBe(5);
        });

    });

    describe('array source property', () => {

        let source = { b: [1, 2, 3] };

        it('overwrites previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.b).toEqual([1, 2, 3]);
        });

    });

    describe('object source property', () => {

        let source = {
            c: { w: 4 }
        };

        it('merge with previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.c).toEqual({ x: 1, y: 2, z: 3, w: 4});
        });

    });

    describe('nested source property', () => {

        let source = {
            d: {
                e: { w: 7 }, // new property second nested level
                f: 'x' // new property first nested level
            }
        };

        it('deep merges with previous destination property', () => {
            mergeObjects(dest, source);
            expect(dest.d).toEqual({
                e: { x: 4, y: 5, z: 6, w: 7 },
                f: 'x'
            });
        });

    });

    describe('multiple source objects', () => {

        let source1 = { a: 7, b: 3 };
        let source2 = { a: 10 };

        it('last source takes precedence', () => {
            mergeObjects(dest, source1, source2);
            expect(dest.a).toBe(10);   // from source2
            expect(dest.b).toBe(3);    // from source1
            expect(dest.c).toEqual({ x: 1, y: 2, z: 3 }); // unmodified
        });

    });

});
