// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it} from 'vitest';
import {injectApiKey} from '../examples/classic/app/key.js';
import {getViewFromUrl} from '../examples/classic/app/url.js';

describe('classic example modules', () => {
  it('parses complete map hashes and rejects incomplete hashes', () => {
    expect(getViewFromUrl('#12.5/40.7/-74')).toEqual([12.5, 40.7, -74]);
    expect(getViewFromUrl('#12.5/40.7')).toBeNull();
    expect(getViewFromUrl('#zoom/40.7/-74')).toBeNull();
  });

  it('injects an API key only into compatible scene fields', () => {
    const config = {
      global: {api_key: ''},
      sources: {
        vector: {url: 'https://tile.nextzen.org/tilezen/vector/v1/all/{z}/{x}/{y}.mvt'},
        raster: {url: 'https://example.com/{z}/{x}/{y}.png'}
      }
    };

    injectApiKey(config, 'runtime-key');

    expect(config.global.api_key).toBe('runtime-key');
    expect(config.sources.vector.url_params.api_key).toBe('runtime-key');
    expect(config.sources.raster.url_params).toBeUndefined();
  });
});
