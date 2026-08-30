// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, test} from 'vitest';
import StyleParser from '../src/styles/style_parser';
import Geo from '../src/utils/geo';

const context = {
  zoom: 10,
  feature: {id: 'abc', properties: {rank: 7}},
  global: {theme: 'night'},
  layers: ['roads']
};

describe('style parser property caches', () => {
  test('creates static, zoom, dynamic, and cloned caches', () => {
    expect(StyleParser.createPropertyCache(null)).toBeUndefined();

    const staticCache = StyleParser.createPropertyCache('-3', StyleParser.parsePositiveNumber);
    expect(staticCache.type).toBe(StyleParser.CACHE_TYPE.STATIC);
    expect(staticCache.value).toBe(0);
    expect(StyleParser.evalCachedProperty(staticCache, context)).toBe(0);
    expect(staticCache.static).toBe(0);

    const stops = StyleParser.createPropertyCache(
      [[8, '2'], [12, '6']],
      StyleParser.parseNumber
    );
    expect(stops.type).toBe(StyleParser.CACHE_TYPE.ZOOM);
    expect(StyleParser.evalCachedProperty(stops, context)).toBe(4);
    expect(StyleParser.evalCachedProperty(stops, context)).toBe(4);

    const dynamic = StyleParser.createPropertyCache(
      value => value.zoom + 1,
      null,
      value => value * 2
    );
    expect(dynamic.type).toBe(StyleParser.CACHE_TYPE.DYNAMIC);
    expect(StyleParser.evalCachedProperty(dynamic, context)).toBe(22);
    expect(StyleParser.evalCachedProperty(dynamic, {...context, zoom: 2})).toBe(6);

    const clone = StyleParser.createPropertyCache(stops);
    expect(clone.value).toBe(stops.value);
    expect(clone.zoom).toEqual({});
    expect(clone.type).toBe(StyleParser.CACHE_TYPE.ZOOM);
  });

  test('evaluates sprite and texture-relative point sizes', () => {
    const percentage = StyleParser.createPointSizePropertyCache('50%', 'icons');
    expect(
      StyleParser.evalCachedPointSizeProperty(
        percentage,
        {sprite: 'station', css_size: [40, 20], aspect: 2},
        null,
        context
      )
    ).toEqual([20, 10]);
    expect(percentage.sprites.station).toBeDefined();

    const ratio = StyleParser.createPointSizePropertyCache([20, 'auto'], 'icons');
    expect(
      StyleParser.evalCachedPointSizeProperty(
        ratio,
        null,
        {css_size: [100, 50], aspect: 2},
        context
      )
    ).toEqual([20, 10]);

    const widthRatio = StyleParser.createPointSizePropertyCache(['auto', 15], 'icons');
    expect(
      StyleParser.evalCachedPointSizeProperty(
        widthRatio,
        null,
        {css_size: [100, 50], aspect: 2},
        context
      )
    ).toEqual([30, 15]);

    const fixed = StyleParser.createPointSizePropertyCache('12px');
    expect(StyleParser.evalCachedPointSizeProperty(fixed, null, null, context)).toBe(12);
    expect(StyleParser.evalCachedPointSizeProperty(null, null, null, context)).toBeUndefined();

    expect(() => StyleParser.createPointSizePropertyCache('25%')).toThrow(/texture/);
    expect(() => StyleParser.createPointSizePropertyCache('auto', 'icons')).toThrow(/half of an array/);
    expect(() => StyleParser.createPointSizePropertyCache(['auto', 'auto'], 'icons')).toThrow(/either width or height/);
  });

  test('interpolates zoom point sizes with percentages and ratios', () => {
    const sizes = StyleParser.createPointSizePropertyCache(
      [[8, ['50%', 'auto']], [12, ['100%', 'auto']]],
      'icons'
    );
    const value = StyleParser.evalCachedPointSizeProperty(
      sizes,
      {sprite: 'road-shield', css_size: [40, 20], aspect: 2},
      null,
      context
    );
    expect(value[0]).toBe(30);
    expect(value[1]).toBe(15);
  });
});

describe('style parser units and colors', () => {
  test('parses numbers, units, arrays, and zoom distance caches', () => {
    expect(StyleParser.parseNumber(['2', 'bad'])).toEqual([2, 0]);
    expect(StyleParser.parsePositiveNumber([-2, '3'])).toEqual([0, 3]);
    expect(StyleParser.parseUnits('4px')).toEqual({value: 4, units: 'px'});
    expect(StyleParser.parseUnits('0px')).toEqual({value: 0});
    expect(StyleParser.convertUnits({value: 5}, context)).toBe(5);
    expect(StyleParser.convertUnits(['2', '3px'], context)[0]).toBe(2);
    expect(StyleParser.convertUnits([[8, '1px'], [12, '3px']], context)).toHaveLength(2);

    const pixels = StyleParser.convertUnits({value: 2, units: 'px'}, context);
    expect(pixels).toBeCloseTo(2 * Geo.metersPerPixel(10));

    const stops = StyleParser.createPropertyCache([
      [8, StyleParser.parseUnits('2px')],
      [12, StyleParser.parseUnits('6px')]
    ]);
    expect(StyleParser.evalCachedDistanceProperty(stops, context)).toBeCloseTo(
      4 * Geo.metersPerPixel(10)
    );
    expect(StyleParser.evalCachedDistanceProperty(stops, context)).toBe(stops.zoom[10]);

    const dynamic = StyleParser.createPropertyCache(value => value.zoom * 2);
    expect(StyleParser.evalCachedDistanceProperty(dynamic, context)).toBe(20);
    expect(StyleParser.evalCachedDistanceProperty(dynamic, context)).toBe(20);
    expect(StyleParser.evalCachedDistanceProperty(null, context)).toBeUndefined();
  });

  test('normalizes static, dynamic, and zoom color values', () => {
    StyleParser.string_colors = {};
    const red = StyleParser.colorForString('#ff0000');
    expect(red).toEqual([1, 0, 0, 1]);
    expect(StyleParser.colorForString('#ff0000')).toBe(red);
    expect(StyleParser.colorForString('not-a-color')).toBe(StyleParser.defaults.color);

    const staticString = StyleParser.createColorPropertyCache('rgba(0, 128, 255, 0.5)');
    expect(StyleParser.evalCachedColorProperty(staticString)).toEqual([0, 128 / 255, 1, 0.5]);
    expect(StyleParser.evalCachedColorProperty(staticString)).toBe(staticString.static);

    const staticArray = StyleParser.createColorPropertyCache([0.1, 0.2, 0.3]);
    expect(StyleParser.evalCachedColorProperty(staticArray)).toEqual([0.1, 0.2, 0.3, 1]);

    const dynamic = StyleParser.createColorPropertyCache(() => '#00ff00');
    expect(StyleParser.evalCachedColorProperty(dynamic, context)).toEqual([0, 1, 0, 1]);
    expect(StyleParser.evalCachedColorProperty(dynamic, context)).toEqual([0, 1, 0, 1]);

    const stops = StyleParser.createColorPropertyCache([[8, '#000000'], [12, [1, 1, 1, 0.5]]]);
    expect(StyleParser.evalCachedColorProperty(stops, context)).toEqual([0.5, 0.5, 0.5, 0.75]);
    expect(StyleParser.evalCachedColorProperty(stops, context)).toBe(stops.zoom[10]);

    const alpha = StyleParser.createPropertyCache(0.25);
    expect(StyleParser.evalCachedColorPropertyWithAlpha(staticArray, alpha, context)).toEqual([
      0.1,
      0.2,
      0.3,
      0.25
    ]);
    expect(StyleParser.evalCachedColorPropertyWithAlpha(null, alpha, context)).toBeUndefined();
  });

  test('parses legacy color forms and stylesheet macros', () => {
    expect(StyleParser.parseColor(() => '#336699', context)).toEqual([0.2, 0.4, 0.6, 1]);
    expect(StyleParser.parseColor([[8, '#000'], [12, '#fff']], context)).toEqual([
      0.5,
      0.5,
      0.5,
      1
    ]);
    expect(StyleParser.parseColor('bad-color')).toEqual([1, 1, 1, 1]);
    expect(StyleParser.parseColor(null)).toEqual([0, 0, 0, 1]);

    const pseudoRandom = StyleParser.createColorPropertyCache('Style.color.pseudoRandomColor');
    expect(StyleParser.evalCachedColorProperty(pseudoRandom, context)).toHaveLength(4);
    const random = StyleParser.createColorPropertyCache('Style.color.randomColor');
    expect(StyleParser.evalCachedColorProperty(random, context)).toHaveLength(4);
  });
});

describe('style parser feature evaluation', () => {
  test('builds feature contexts and evaluates order and properties', () => {
    const feature = {id: 4, geometry: {type: 'MultiLineString'}, properties: {sort_rank: 9}};
    const tile = {
      style_z: 14,
      meters_per_pixel: 2,
      meters_per_pixel_sq: 4,
      units_per_meter_overzoom: 8
    };
    const parsedContext = StyleParser.getFeatureParseContext(feature, tile, {theme: 'day'});
    expect(parsedContext).toMatchObject({
      id: 4,
      zoom: 14,
      geometry: 'line',
      meters_per_pixel: 2,
      global: {theme: 'day'}
    });

    expect(StyleParser.calculateOrder('sort_rank', parsedContext)).toBe(9);
    expect(StyleParser.calculateOrder('12', parsedContext)).toBe(12);
    expect(StyleParser.calculateOrder(value => value.zoom - 2, parsedContext)).toBe(12);
    expect(StyleParser.evalProperty(value => value.zoom, parsedContext)).toBe(14);
    expect(StyleParser.evalProperty('static', parsedContext)).toBe('static');
  });
});
