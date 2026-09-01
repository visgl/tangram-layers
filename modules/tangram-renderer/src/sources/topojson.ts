// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

import DataSource from './data_source';
import {GeoJSONSource, GeoJSONTileSource} from './geojson';

import * as topojson from 'topojson-client';

type SourceConfig = Record<string, any>;

/**
 TopoJSON standalone (non-tiled) source
 Uses geojson-vt split into tiles client-side
*/

export class TopoJSONSource extends GeoJSONSource {

    parseSourceData (tile?: any, source?: any, response?: any): void {
        if (!tile || !source) {
            throw new Error('TopoJSON source parsing requires a tile and source data');
        }
        let data = typeof response === 'string' ? JSON.parse(response) : response;
        data = this.toGeoJSON(data);

        let layers = this.getLayers(data);
        super.preprocessLayers(layers, tile);
        source.layers = layers;
    }

    toGeoJSON (data: any): any {
        // Single layer
        if (data.objects &&
            Object.keys(data.objects).length === 1) {
            let layer = Object.keys(data.objects)[0];
            data = getTopoJSONFeature(data, data.objects[layer]);
        }
        // Multiple layers
        else {
            let layers: Record<string, any> = {};
            for (let key in data.objects) {
                layers[key] = getTopoJSONFeature(data, data.objects[key]);
            }
            data = layers;
        }
        return data;
    }

}

function getTopoJSONFeature (topology: any, object: any): any {
    let feature = topojson.feature(topology, object);

    // Convert single feature to a feature collection
    if (feature.type === 'Feature') {
        feature = {
            type: 'FeatureCollection',
            features: [feature]
        };
    }
    return feature;
}


/**
 TopoJSON vector tiles
 @class TopoJSONTileSource
*/
export class TopoJSONTileSource extends GeoJSONTileSource {

    constructor(source: SourceConfig, sources?: Record<string, unknown>) {
        super(source, sources);
    }

    parseSourceData (tile?: any, source?: any, response?: any): void {
        if (!tile || !source) {
            throw new Error('TopoJSON tile parsing requires a tile and source data');
        }
        let data = typeof response === 'string' ? JSON.parse(response) : response;
        data = TopoJSONSource.prototype.toGeoJSON(data);
        this.prepareGeoJSON(data, tile, source);
    }

}

// Check for URL tile pattern, if not found, treat as standalone GeoJSON/TopoJSON object
DataSource.register('TopoJSON', (source: SourceConfig) => {
    return TopoJSONTileSource.urlHasTilePattern(source.url) ? TopoJSONTileSource : TopoJSONSource;
});
