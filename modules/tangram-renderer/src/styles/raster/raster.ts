// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// Raster tile rendering style

import StyleParser from '../style_parser';
import {Polygons} from '../polygons/polygons';

export let RasterStyle: any = Object.create(Polygons);

Object.assign(RasterStyle, {
    name: 'raster',
    super: Polygons,
    built_in: true,

    init (this: any): void {
        // Required for raster tiles
        this.raster = this.raster || 'color';

        this.super.init.apply(this, arguments);

        this.selection = false; // raster styles can't support feature selection
    },

    _preprocess (this: any, draw: any): any {
        // Raster tiles default to white vertex color, as this color will tint the underlying texture
        draw.color = draw.color || StyleParser.defaults.color;
        return this.super._preprocess.apply(this, arguments);
    }

});
