// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {MethodNotImplemented} from '../modules/tangram-renderer/src/utils/errors.js';
import {compileFunctionString, compileFunctionStrings, clearFunctionStringCache, functionStringCache} from '../modules/tangram-renderer/src/utils/functions.js';
import Geo from '../modules/tangram-renderer/src/utils/geo.ts';
import {buildFilter} from '../modules/tangram-renderer/src/styles/filter.js';
import CollisionGrid from '../modules/tangram-renderer/src/labels/collision_grid.ts';
import {boxIntersectsBox, boxIntersectsList} from '../modules/tangram-renderer/src/labels/intersect.ts';
import PointAnchor from '../modules/tangram-renderer/src/labels/point_anchor.ts';
import RepeatGroup from '../modules/tangram-renderer/src/labels/repeat_group.ts';
import {getPropertyPath, getPropertyPathTarget, setPropertyPath} from '../modules/tangram-renderer/src/utils/props.js';
import Vector from '../modules/tangram-renderer/src/utils/vector.js';
import {
  TangramLayerSchema,
  TangramSourceSchema,
  TangramStyleSheetSchema,
  TangramStyleValueSchema
} from '../modules/tangram-renderer/src/styles/style-schema.ts';

describe('renderer utility modules', () => {
  let urlHelpers;

  beforeAll(async () => {
    // The URL module also registers the renderer logger, whose legacy thread
    // probe expects a worker-like `self` global when running in Node.
    globalThis.self = globalThis;
    globalThis.self.addEventListener = () => {};
    urlHelpers = await import('../modules/tangram-renderer/src/utils/urls.js');
  });

  describe('property paths', () => {
    it('gets, sets, and safely traverses nested properties', () => {
      const object = {scene: {camera: {zoom: 4}}};
      expect(getPropertyPath(object, ['scene', 'camera', 'zoom'])).toBe(4);
      expect(getPropertyPathTarget(object, ['scene', 'camera', 'zoom'])).toEqual({zoom: 4});
      setPropertyPath(object, ['scene', 'camera', 'zoom'], 8);
      expect(object.scene.camera.zoom).toBe(8);
      expect(getPropertyPath(object, ['scene', 'missing', 'zoom'])).toBeUndefined();
      expect(getPropertyPathTarget(object, [])).toBeUndefined();
      setPropertyPath(object, ['scene', 'missing', 'zoom'], 2);
    });
  });

  describe('vectors', () => {
    it('supports scalar and component-wise arithmetic', () => {
      expect(Vector.copy([1, 2])).toEqual([1, 2]);
      expect(Vector.neg([1, -2])).toEqual([-1, 2]);
      expect(Vector.add([1, 2, 3], [4, 5])).toEqual([5, 7]);
      expect(Vector.sub([4, 5, 6], [1, 2])).toEqual([3, 3]);
      expect(Vector.mult([2, 3], 2)).toEqual([4, 6]);
      expect(Vector.mult([2, 3], [4, 5])).toEqual([8, 15]);
      expect(Vector.div([8, 9], 2)).toEqual([4, 4.5]);
      expect(Vector.div([8, 9], [2, 3])).toEqual([4, 3]);
      expect(Vector.perp([1, 2], [4, 6])).toEqual([4, -3]);
      expect(Vector.rot([1, 0], Math.PI / 2)[1]).toBeCloseTo(1);
      expect(Vector.angle([0, 1])).toBeCloseTo(Math.PI / 2);
      expect(Vector.signed_area([0, 0], [1, 0], [0, 1])).toBe(1);
    });

    it('normalizes, measures, and compares vectors', () => {
      expect(Vector.lengthSq([3, 4])).toBe(25);
      expect(Vector.lengthSq([1, 2, 2])).toBe(9);
      expect(Vector.length([])).toBe(0);
      expect(Vector.normalize([3, 4])).toEqual([0.6, 0.8]);
      expect(Vector.normalize([0, 0])).toEqual([0, 0]);
      expect(Vector.normalize([1, 0, 0])).toEqual([1, 0, 0]);
      expect(Vector.normalize([0, 0, 0])).toEqual([0, 0, 0]);
      expect(Vector.cross([1, 0], [0, 1])).toBe(1);
      expect(Vector.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
      expect(Vector.dot([1, 2], [3, 4])).toBe(11);
      expect(Vector.angleBetween([1, 0], [0, 1])).toBeCloseTo(Math.PI / 2);
      expect(Vector.isEqual([1, 2], [1, 2])).toBe(true);
      expect(Vector.isEqual([1, 2], [1, 3])).toBe(false);
    });
  });

  describe('geospatial helpers', () => {
    it('round-trips mercator coordinates and computes tile coordinates', () => {
      const coordinate = [-73.98, 40.75];
      const meters = Geo.latLngToMeters(coordinate.slice());
      expect(Geo.metersToLatLng(meters.slice())[0]).toBeCloseTo(coordinate[0], 6);
      expect(Geo.metersToLatLng(meters.slice())[1]).toBeCloseTo(coordinate[1], 6);
      const tile = {x: 2, y: 1, z: 3};
      const origin = Geo.metersForTile(tile);
      expect(Geo.tileForMeters([origin.x, origin.y], 3)).toEqual(tile);
      expect(Geo.wrapTile({x: -1, y: -1, z: 3})).toEqual({x: 7, y: -1, z: 3});
      expect(Geo.wrapTile({x: -1, y: -1, z: 3}, {x: false, y: true})).toEqual({x: -1, y: 7, z: 3});
      expect(Geo.metersPerPixel(4)).toBe(Geo.metersPerPixel(4));
      expect(Geo.metersPerTile(4)).toBe(Geo.metersPerTile(4));
      expect(Geo.unitsPerMeter(4)).toBe(Geo.unitsPerMeter(4));
    });

    it('copies and transforms every supported GeoJSON geometry shape', () => {
      const geometries = [
        {type: 'Point', coordinates: [1, 2]},
        {type: 'LineString', coordinates: [[1, 2], [3, 4]]},
        {type: 'MultiPoint', coordinates: [[1, 2], [3, 4]]},
        {type: 'Polygon', coordinates: [[[0, 0], [2, 0], [0, 2]]]},
        {type: 'MultiLineString', coordinates: [[[0, 0], [2, 0]]]},
        {type: 'MultiPolygon', coordinates: [[[[0, 0], [2, 0], [0, 2]]]]}
      ];
      for (const geometry of geometries) {
        const copy = Geo.copyGeometry(geometry);
        expect(copy).toEqual(geometry);
        expect(copy).not.toBe(geometry);
        Geo.transformGeometry(copy, coordinate => {coordinate[0] += 1;});
        expect(copy).not.toEqual(geometry);
      }
      expect(Geo.copyGeometry(null)).toBeUndefined();
      expect(Geo.transformGeometry(null, () => {})).toBeUndefined();
      expect(Geo.geometryType('Point')).toBe('point');
      expect(Geo.geometryType('LineString')).toBe('line');
      expect(Geo.geometryType('Polygon')).toBe('polygon');
      expect(Geo.geometryType('Unknown')).toBeUndefined();
    });

    it('calculates bounds, centroids, areas, and winding', () => {
      const triangle = [[[0, 0], [4, 0], [0, 3], [0, 0]]];
      expect(Geo.findBoundingBox(triangle)).toEqual([0, 0, 4, 3]);
      expect(Geo.centroid(triangle)).toEqual([4 / 3, 1]);
      expect(Geo.centroid(triangle, false)).toEqual([4 / 3, 1]);
      const averageCentroid = Geo.multiCentroid([triangle, [[[0, 0], [2, 0], [0, 2], [0, 0]]]]);
      expect(averageCentroid[0]).toBeCloseTo(1);
      expect(averageCentroid[1]).toBeCloseTo(5 / 6);
      expect(Geo.centroid([])).toBeUndefined();
      expect(Geo.centroid([[[0, 0], [1, 1], [2, 2]]])).toBeUndefined();
      expect(Geo.polygonRingArea(triangle[0])).toBe(6);
      expect(Geo.polygonArea(triangle)).toBe(6);
      expect(Geo.multiPolygonArea([triangle, [[[0, 0], [2, 0], [0, 2], [0, 0]]]])).toBe(8);
      expect(Geo.ringWinding(triangle[0])).toBe('CW');
      expect(Geo.ringWinding([[0, 0], [1, 1], [2, 2]])).toBeUndefined();
      expect(Geo.polygonArea(null)).toBeUndefined();
      expect(Geo.boxIntersect({sw: {x: 0, y: 0}, ne: {x: 2, y: 2}}, {sw: {x: 1, y: 1}, ne: {x: 3, y: 3}})).toBe(true);
      expect(Geo.boxIntersect({sw: {x: 0, y: 0}, ne: {x: 1, y: 1}}, {sw: {x: 2, y: 2}, ne: {x: 3, y: 3}})).toBe(false);
    });
  });

  describe('filter compilation', () => {
    const context = {feature: {properties: {kind: 'road', rank: 3, tags: ['primary', 'bus'], nested: {value: 2}}}};

    it('evaluates scalar, boolean, array, range, and nested filters', () => {
      expect(buildFilter(null)(context)).toBe(true);
      expect(buildFilter({kind: 'road'})(context)).toBe(true);
      expect(buildFilter({kind: ['building', 'road']})(context)).toBe(true);
      expect(buildFilter({kind: true})(context)).toBe(true);
      expect(buildFilter({missing: false})(context)).toBe(true);
      expect(buildFilter({rank: {min: 2, max: 4}})(context)).toBe(true);
      expect(buildFilter({tags: {includes_any: 'bus'}})(context)).toBe(true);
      expect(buildFilter({tags: {includes_all: ['primary', 'bus']}})(context)).toBe(true);
      expect(buildFilter({any: [{kind: 'building'}, {kind: 'road'}]})(context)).toBe(true);
      expect(buildFilter({all: [{kind: 'road'}, {rank: {min: 3}}]})(context)).toBe(true);
      expect(buildFilter({none: [{kind: 'building'}]})(context)).toBe(true);
      expect(buildFilter({not: {kind: 'building'}})(context)).toBe(true);
      expect(buildFilter({'nested.value': 2})(context)).toBe(true);
      expect(buildFilter({missing: null})(context)).toBe(true);
      expect(buildFilter({kind: 'building'})(context)).toBe(false);
      expect(buildFilter({rank: {max: 3}}, {rangeTransform: value => value - 1})(context)).toBe(false);
      expect(() => buildFilter({rank: 1n})).toThrow('Unknown Query syntax');
    });

    it('compiles function filters', () => {
      expect(buildFilter(function functionFilter() { return true; })(context)).toBe(true);
      expect(buildFilter([])(context)).toBe(true);
    });
  });

  describe('label helpers', () => {
    it('computes anchors and collision grid cells', () => {
      expect(PointAnchor.computeOffset([0, 0], [10, 20], 'left', [1, 2, 3, 4])).toEqual([-6, 0]);
      expect(PointAnchor.computeOffset([0, 0], [10, 20], 'bottom-right', [1, 2, 3, 4])).toEqual([5, 10]);
      expect(PointAnchor.computeOffset([1, 2], [10, 20], 'center')).toEqual([1, 2]);
      expect(PointAnchor.alignForAnchor('left')).toBe('right');
      expect(PointAnchor.alignForAnchor('right')).toBe('left');
      expect(PointAnchor.alignForAnchor('center')).toBe('center');
      expect(PointAnchor.isTopAnchor('top-left')).toBe(true);
      expect(PointAnchor.isBottomAnchor('bottom-right')).toBe(true);
      expect(PointAnchor.isLeftAnchor('left')).toBe(true);
      expect(PointAnchor.isRightAnchor('right')).toBe(true);

      const grid = new CollisionGrid({x: 0, y: 0}, 10);
      const label = {aabb: [-2, 12, 12, -2], aabbs: [[0, 20, 5, 10]]};
      grid.addLabel(label);
      expect(label.cells.length).toBeGreaterThan(0);
      expect(Object.keys(grid.cells)).toContain('0');
    });

    it('detects intersections and repeat labels', () => {
      expect(boxIntersectsBox([0, 0, 2, 2], [1, 1, 3, 3])).toBe(true);
      expect(boxIntersectsBox([0, 0, 1, 1], [2, 2, 3, 3])).toBe(false);
      const hits = [];
      boxIntersectsList([0, 0, 2, 2], [[3, 3, 4, 4], [1, 1, 3, 3], [0, 0, 1, 1]], index => {
        hits.push(index);
        return index === 1 ? true : null;
      });
      expect(hits).toEqual([1]);

      const group = new RepeatGroup('roads', 10);
      group.add({position: [0, 0]});
      expect(group.check({position: [3, 4]})).toBe(true);
      expect(group.check({position: [10, 0]})).toBeUndefined();
      RepeatGroup.clear('tile');
      RepeatGroup.add({position: [0, 0]}, {repeat_distance: 10, repeat_group: 'roads', repeat_scale: 1}, 'tile');
      expect(RepeatGroup.check({position: [1, 1]}, {repeat_distance: 10, repeat_group: 'roads', repeat_scale: 1}, 'tile')).toBe(true);
      expect(RepeatGroup.check({position: [1, 1]}, {}, 'tile')).toBeUndefined();
    });
  });

  describe('URL and function helpers', () => {
    beforeEach(() => clearFunctionStringCache());

    it('handles relative URL normalization and query parameters', () => {
      expect(urlHelpers.pathForURL('https://example.com/a/file.yaml?x=1#top')).toBe('https://example.com/a/');
      expect(urlHelpers.pathForURL('data:text/plain,hello')).toBe('');
      expect(urlHelpers.extensionForURL('https://example.com/style.yaml')).toBe('yaml');
      expect(urlHelpers.isLocalURL('blob:test')).toBe(true);
      expect(urlHelpers.isLocalURL('https://example.com')).toBe(false);
      expect(urlHelpers.isRelativeURL('../style.yaml')).toBe(true);
      expect(urlHelpers.isRelativeURL('//example.com/style.yaml')).toBe(false);
      expect(urlHelpers.flattenRelativeURL('a/b/../c/./d')).toBe('a/c/d');
      expect(urlHelpers.addParamsToURL('https://example.com/tiles#map', {api_key: 'secret'})).toEqual([
        'https://example.com/tiles?api_key=secret&#map', []
      ]);
      expect(urlHelpers.addParamsToURL('https://example.com/tiles?api_key=old', {api_key: 'new'})).toEqual([
        'https://example.com/tiles?api_key=old', [['api_key', 'new']]
      ]);
      expect(urlHelpers.addParamsToURL('https://example.com/tiles', {})).toEqual(['https://example.com/tiles', []]);
    });

    it('compiles and caches function strings recursively', () => {
      const source = 'function (context) { return context.value + 1; }';
      const compiled = compileFunctionString(source);
      expect(compiled({value: 2})).toBe(3);
      expect(compileFunctionString(source)).toBe(compiled);
      expect(functionStringCache.num_functions).toBe(1);
      expect(functionStringCache.num_cached).toBe(1);
      expect(compileFunctionString('not a function')).toBe('not a function');
      expect(compileFunctionString('function () { invalid ??? }')).toContain('invalid');
      const object = {a: source, nested: [source]};
      compileFunctionStrings(object);
      expect(object.a({value: 1})).toBe(2);
      expect(object.nested[0]({value: 2})).toBe(3);
    });
  });

  describe('style schemas and errors', () => {
    it('validates style values and scene fragments while preserving extensions', () => {
      expect(TangramStyleValueSchema.parse({custom: 'value'})).toEqual({custom: 'value'});
      expect(TangramSourceSchema.parse({type: 'MVT', url: 'tiles/{z}/{x}/{y}.mvt', custom: true})).toMatchObject({type: 'MVT', custom: true});
      expect(TangramLayerSchema.parse({data: {source: 'osm'}, draw: {color: 'red'}})).toMatchObject({data: {source: 'osm'}});
      expect(TangramStyleSheetSchema.parse({styles: {roads: {base: 'lines'}}, custom: {enabled: true}})).toMatchObject({styles: {roads: {base: 'lines'}}, custom: {enabled: true}});
      expect(() => TangramSourceSchema.parse({tile_size: 0})).toThrow();
      expect(() => TangramStyleSheetSchema.parse({styles: {roads: {animated: 'yes'}}})).toThrow();
    });

    it('reports unimplemented methods with a useful message', () => {
      const error = new MethodNotImplemented('render');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('MethodNotImplemented');
      expect(error.message).toContain('render');
    });
  });
});
