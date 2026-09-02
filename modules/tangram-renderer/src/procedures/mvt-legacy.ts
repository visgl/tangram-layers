// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// @ts-nocheck

import Pbf from 'pbf';
import {VectorTile, VectorTileFeature} from '@mapbox/vector-tile';
import Geo from '../utils/geo';
import {parseMvtJsonProperties} from './mvt-properties';

/** Parse MVT bytes using Tangram's established Mapbox vector-tile implementation. */
export function parseMvtWithLegacy(response, options = {}) {
    const tile = new VectorTile(new Pbf(new Uint8Array(response)));
    return convertMvtTileWithLegacy(tile, options);
}

/** Convert a Mapbox VectorTile object to Tangram's layer-indexed GeoJSON shape. */
export function convertMvtTileWithLegacy(tile, options = {}) {
    const layers = {};
    for (const layerName in tile.layers) {
        const layer = tile.layers[layerName];
        const scale = Geo.tile_scale / layer.extent;
        const layerGeoJson = {type: 'FeatureCollection', features: []};

        for (let featureIndex = 0; featureIndex < layer.length; featureIndex++) {
            const feature = layer.feature(featureIndex);
            const featureGeoJson = {
                type: 'Feature', geometry: {}, id: feature.id, properties: feature.properties
            };
            parseMvtJsonProperties(featureGeoJson, options.parseJson);

            let geometry = featureGeoJson.geometry;
            const coordinates = feature.loadGeometry();
            for (let ringIndex = 0; ringIndex < coordinates.length; ringIndex++) {
                const ring = coordinates[ringIndex];
                for (let coordinateIndex = 0; coordinateIndex < ring.length; coordinateIndex++) {
                    ring[coordinateIndex] = [
                        ring[coordinateIndex].x * scale,
                        ring[coordinateIndex].y * scale
                    ];
                }
            }
            geometry.coordinates = coordinates;

            if (VectorTileFeature.types[feature.type] === 'Point') {
                if (coordinates.length === 1) {
                    geometry.type = 'Point';
                    geometry.coordinates = geometry.coordinates[0][0];
                }
                else {
                    geometry.type = 'MultiPoint';
                    geometry.coordinates = geometry.coordinates[0];
                }
            }
            else if (VectorTileFeature.types[feature.type] === 'LineString') {
                if (coordinates.length === 1) {
                    geometry.type = 'LineString';
                    geometry.coordinates = geometry.coordinates[0];
                }
                else {
                    geometry.type = 'MultiLineString';
                }
            }
            else if (VectorTileFeature.types[feature.type] === 'Polygon') {
                geometry = decodeMultiPolygon(geometry);
            }

            featureGeoJson.geometry = geometry;
            layerGeoJson.features.push(featureGeoJson);
        }
        layers[layerName] = layerGeoJson;
    }
    return layers;
}

/** Decode flattened MVT polygon rings into Polygon or MultiPolygon coordinates. */
export function decodeMultiPolygon(geometry) {
    const polygons = [];
    let polygon = [];
    let outerWinding;
    for (const ring of geometry.coordinates) {
        const winding = Geo.ringWinding(ring);
        if (winding == null) {
            continue;
        }
        outerWinding = outerWinding || winding;
        if (winding === outerWinding && polygon.length > 0) {
            polygons.push(polygon);
            polygon = [];
        }
        polygon.push(ring);
    }
    if (polygon.length > 0) {
        polygons.push(polygon);
    }

    if (polygons.length === 1) {
        geometry.type = 'Polygon';
        geometry.coordinates = polygons[0];
    }
    else if (polygons.length > 1) {
        geometry.type = 'MultiPolygon';
        geometry.coordinates = polygons;
    }
    else {
        geometry = null;
    }
    return geometry;
}
