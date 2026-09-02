// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, test} from 'vitest';
import sampleTopoJSONResponse from './fixtures/sample-topojson-response.json';
import {GeoJSONSource} from '../src/sources/geojson';
import {TopoJSONSource} from '../src/sources/topojson';
import {decodeMultiPolygon} from '../src/sources/mvt';

describe('renderer source normalization', () => {
  test('normalizes GeoJSON feature shapes into named layers', () => {
    const source = new GeoJSONSource({name: 'geojson', url: 'data.json'});
    const feature = {type: 'Feature', id: 1, geometry: {type: 'Point', coordinates: [1, 2]}, properties: {kind: 'place'}};
    const collection = {type: 'FeatureCollection', features: [feature]};

    expect(Object.keys(source.getLayers(feature))).toEqual(['_default']);
    expect(source.getLayers(feature)._default.features).toEqual([feature]);
    expect(source.getLayers(collection)._default).toBe(collection);
    expect(source.getLayers({roads: collection}).roads).toBe(collection);
  });

  test('removes null geometries and adds polygon centroids when configured', () => {
    const source = new GeoJSONSource({
      name: 'geojson',
      url: 'data.json',
      generate_label_centroids: true
    });
    const features = source.preprocessFeatures([
      {id: 'square', geometry: {type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 0]]]}, properties: {name: 'Square'}},
      {id: 'empty', geometry: null, properties: {name: 'Empty'}},
      {id: 'point', geometry: {type: 'Point', coordinates: [2, 2]}, properties: {name: 'Point'}}
    ]);

    expect(features).toHaveLength(3);
    expect(features.filter(feature => feature.properties.label_placement)).toHaveLength(1);
    expect(features[2].geometry.type).toBe('Point');
    expect(features[2].geometry.coordinates[0]).toBeCloseTo(2.6667, 3);
    expect(features[2].geometry.coordinates[1]).toBeCloseTo(1.3333, 3);
  });

  test('converts vector-tile feature geometry back to GeoJSON', () => {
    const source = new GeoJSONSource({name: 'geojson', url: 'data.json'});
    source.tile_indexes.roads = {
      getTile: () => ({
        features: [
          {id: 1, type: 1, tags: {kind: 'traffic'}, geometry: [[2, 3]]},
          {id: 2, type: 2, tags: {}, geometry: [[[0, 0], [5, 5]]]},
          {id: 3, type: 0, tags: {}, geometry: []}
        ]
      })
    };

    const result = source.getTileFeatures({coords: {x: 0, y: 0, z: 2}}, 'roads');
    expect(result.features).toHaveLength(2);
    expect(result.features[0].geometry).toEqual({type: 'MultiPoint', coordinates: [[2, 3]]});
    expect(result.features[1].geometry.type).toBe('MultiLineString');
  });

  test('converts TopoJSON geometry collections and decodes polygon rings', () => {
    const source = new TopoJSONSource({name: 'topojson', url: 'data.json'});
    const layers = source.toGeoJSON(sampleTopoJSONResponse);
    expect(Object.keys(layers)).toContain('buildings');
    expect(layers.buildings.type).toBe('FeatureCollection');
    expect(layers.buildings.features.length).toBeGreaterThan(0);

    const polygon = decodeMultiPolygon({type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4]]] } as any);
    expect(polygon!.type).toBe('Polygon');
    expect(polygon!.coordinates).toHaveLength(1);
  });
});
