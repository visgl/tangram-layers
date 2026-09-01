// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, test} from 'vitest';
import {MVTSource} from '../src/sources/mvt';

describe('MVTSource', () => {
    test('normalizes parse_json options for all properties', () => {
        const source = new MVTSource({url: 'tiles/{z}/{x}/{y}.mvt', parse_json: true});

        expect(source.parseJsonOption()).toBe(true);
        const feature = {properties: {metadata: '{"kind":"road"}', name: 'Main'}};
        source.parseJSONProperties(feature);
        expect(feature.properties.metadata).toEqual({kind: 'road'});
        expect(feature.properties.name).toBe('Main');
    });

    test('normalizes a property allowlist and preserves invalid JSON', () => {
        const source = new MVTSource({
            url: 'tiles/{z}/{x}/{y}.mvt',
            parse_json: ['metadata']
        });

        expect(source.parseJsonOption()).toEqual(['metadata']);
        const feature = {
            properties: {
                metadata: 'not-json',
                ignored: '{"kind":"building"}'
            }
        };
        source.parseJSONProperties(feature);
        expect(feature.properties.metadata).toBe('not-json');
        expect(feature.properties.ignored).toBe('{"kind":"building"}');
    });

    test('defaults to no property parsing', () => {
        const source = new MVTSource({url: 'tiles/{z}/{x}/{y}.mvt'});
        expect(source.parseJsonOption()).toBeUndefined();
    });
});
