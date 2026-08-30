// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

/* global self */

(function (root) {
    var ROAD_KINDS = {
        motorway: 'highway',
        trunk: 'highway',
        primary: 'major_road',
        secondary: 'major_road',
        tertiary: 'major_road',
        minor: 'minor_road',
        service: 'minor_road',
        path: 'path',
        rail: 'rail',
        ferry: 'ferry'
    };

    var ROAD_SORT_RANKS = {
        path: 350,
        minor: 360,
        service: 360,
        tertiary: 370,
        secondary: 375,
        primary: 380,
        trunk: 385,
        motorway: 390,
        rail: 395,
        ferry: 400
    };

    function copyFeature(feature, mapProperties) {
        var copy = {
            type: feature.type,
            id: feature.id,
            geometry: feature.geometry,
            properties: Object.assign({}, feature.properties)
        };
        var properties = copy.properties;
        properties.source = 'openstreetmap';
        mapProperties(properties);
        return copy;
    }

    function collect(data, layerNames, mapProperties) {
        var features = [];
        layerNames.forEach(function (layerName) {
            var layer = data[layerName];
            if (layer && Array.isArray(layer.features)) {
                layer.features.forEach(function (feature) {
                    features.push(copyFeature(feature, mapProperties));
                });
            }
        });
        return {type: 'FeatureCollection', features: features};
    }

    function mapCommon(properties) {
        properties.kind = properties.kind || properties.subclass || properties.class;
        properties.kind_detail = properties.kind_detail || properties.subclass || properties.class;
        if (properties.rank != null) {
            properties.kind_tile_rank = properties.rank;
            properties.scale_rank = properties.rank;
            properties.min_zoom = Math.min(18, 9 + Math.floor(properties.rank / 8));
        }
    }

    function mapRoad(properties) {
        mapCommon(properties);
        properties.kind_detail = properties.subclass || properties.class;
        properties.kind = ROAD_KINDS[properties.class] || properties.class || properties.kind;
        properties.sort_rank = properties.sort_rank || ROAD_SORT_RANKS[properties.class] || 355;
        properties.is_bridge = properties.brunnel === 'bridge';
        properties.is_tunnel = properties.brunnel === 'tunnel';
        properties.is_link = properties.ramp === 1;
        properties.shield_text = properties.ref || properties.route_1_ref;
        properties.network = properties.network || properties.route_1_network;
        properties.is_bicycle_related = properties.bicycle === 'yes' || properties.bicycle === 'designated';
    }

    function mapBuilding(properties) {
        mapCommon(properties);
        properties.kind = 'building';
        properties.sort_rank = properties.sort_rank || 420;
        properties.height = properties.render_height || properties.height || 10;
        properties.min_height = properties.render_min_height || properties.min_height || 0;
        properties.layer = properties.layer || 0;
        properties.area = properties.area || 1;
        properties.volume = properties.volume || properties.area * properties.height;
        properties.scale_rank = properties.scale_rank == null ? 5 : properties.scale_rank;
    }

    function mapBoundary(properties) {
        mapCommon(properties);
        var adminLevel = Number(properties.admin_level);
        properties.kind = adminLevel <= 2 ? 'country' : adminLevel <= 4 ? 'region' :
            adminLevel <= 6 ? 'county' : 'locality';
        properties.kind_detail = properties.kind;
        properties.sort_rank = properties.sort_rank || 500;
        properties.maritime_boundary = properties.maritime === 1;
    }

    function mapPlace(properties) {
        mapCommon(properties);
        properties.kind = properties.class || properties.kind;
        properties.sort_rank = properties.sort_rank || 550;
        properties.country_capital = Number(properties.capital) === 2;
    }

    function mapLanduse(properties) {
        mapCommon(properties);
        properties.kind = properties.subclass || properties.class || 'landuse';
        properties.sort_rank = properties.sort_rank || 100;
        properties.landuse_kind = properties.kind;
        properties.is_landuse_aoi = true;
    }

    function mapWater(properties) {
        mapCommon(properties);
        properties.kind = properties.class || 'water';
        properties.sort_rank = properties.sort_rank || 200;
        properties.intermittent = properties.intermittent === 1;
        properties.is_bridge = properties.brunnel === 'bridge';
        properties.is_tunnel = properties.brunnel === 'tunnel';
    }

    function mapTransit(properties) {
        mapRoad(properties);
        properties.is_train = properties.kind === 'rail';
        properties.is_subway = properties.subclass === 'subway';
    }

    root.transformOpenMapTilesToMapzen = function (data) {
        var output = {
            earth: {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {kind: 'earth', source: 'openstreetmap', sort_rank: 0},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[[0, 0], [4096, 0], [4096, 4096], [0, 4096], [0, 0]]]
                    }
                }]
            },
            water: collect(data, ['water', 'waterway', 'water_name'], mapWater),
            landuse: collect(data, ['landuse', 'landcover', 'park'], mapLanduse),
            roads: collect(data, ['transportation', 'transportation_name', 'aeroway'], mapRoad),
            buildings: collect(data, ['building'], mapBuilding),
            boundaries: collect(data, ['boundary'], mapBoundary),
            places: collect(data, ['place'], mapPlace),
            pois: collect(data, ['poi', 'mountain_peak', 'aerodrome_label'], mapCommon),
            transit: collect(data, ['transportation', 'transportation_name'], mapTransit)
        };

        return output;
    };
}(self));
