// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

import DataSource, {NetworkTileSource} from './data_source';
import log from '../utils/log';
import {
    convertMvtTileWithLegacy,
    decodeMultiPolygon,
    parseMvtWithLegacy
} from '../procedures/mvt-legacy';
import {parseMvtJsonProperties} from '../procedures/mvt-properties';

const PARSE_JSON_TYPE = {
    NONE: 0,
    ALL: 1,
    SOME: 2
};

/**
 Mapbox Vector Tile format
 @class MVTSource
*/
export class MVTSource extends NetworkTileSource {

    constructor (source, sources) {
        super(source, sources);
        this.response_type = 'arraybuffer'; // binary data

        // Optionally parse some or all properties from JSON strings
        if (source.parse_json === true) {
            // try to parse all properties (least efficient)
            this.parse_json_type = PARSE_JSON_TYPE.ALL;
        }
        else if (Array.isArray(source.parse_json)) {
            // try to parse a specific list of property names (more efficient)
            this.parse_json_type = PARSE_JSON_TYPE.SOME;
            this.parse_json_prop_list = source.parse_json;
        }
        else {
            if (source.parse_json != null) {
                let msg = `Data source '${this.name}': 'parse_json' parameter should be 'true', or an array of ` +
                    `property names (was '${JSON.stringify(source.parse_json)}')`;
                log({ level: 'warn', once: true }, msg);
            }

            // skip parsing entirely (default behavior)
            this.parse_json_type = PARSE_JSON_TYPE.NONE;
        }
    }

    parseSourceData (tile, source, response) {
        source.layers = parseMvtWithLegacy(response, {parseJson: this.parseJsonOption()});

        // Apply optional data transform
        if (typeof this.transform === 'function') {
            const tile_data = {
                min: Object.assign({}, tile.min),
                max: Object.assign({}, tile.max),
                coords: Object.assign({}, tile.coords)
            };
            source.layers = this.transform(source.layers, this.extra_data, tile_data);
        }

    }

    // Loop through layers/features using Mapbox lib API, convert to GeoJSON features
    // Returns an object with keys for each layer, e.g. { layer: geojson }
    toGeoJSON (tile) {
        return convertMvtTileWithLegacy(tile, {parseJson: this.parseJsonOption()});
    }

    // Optionally parse some or all feature properties from JSON strings
    parseJSONProperties (feature) {
        parseMvtJsonProperties(feature, this.parseJsonOption());
    }

    parseJsonOption () {
        if (this.parse_json_type === PARSE_JSON_TYPE.ALL) {
            return true;
        }
        if (this.parse_json_type === PARSE_JSON_TYPE.SOME) {
            return this.parse_json_prop_list;
        }
        return undefined;
    }
}

export {decodeMultiPolygon};

DataSource.register('MVT', () => MVTSource);
