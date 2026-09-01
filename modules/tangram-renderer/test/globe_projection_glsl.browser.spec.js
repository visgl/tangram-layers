// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it} from 'vitest';
import pointsVertexShader from '../src/styles/points/points_vertex.glsl';
import polygonsVertexShader from '../src/styles/polygons/polygons_vertex.glsl';

describe('Globe projection GLSL', function () {
    it('names helper constants defensively against scene-global macros', function () {
        for (const source of [pointsVertexShader, polygonsVertexShader]) {
            expect(source).not.toMatch(/\bconst float HALF_PI\b/);
            expect(source).toContain('const float TANGRAM_GLOBE_HALF_PI');
            expect(source).toContain('const float TANGRAM_MERCATOR_RADIUS');
        }
    });
});
