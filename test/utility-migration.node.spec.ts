// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it, vi} from 'vitest';
import debounce from '../modules/tangram-renderer/src/utils/debounce.js';
import debugSettings, {
  mergeDebugSettings
} from '../modules/tangram-renderer/src/utils/debug_settings.js';
import hashString from '../modules/tangram-renderer/src/utils/hash.js';
import sliceObject from '../modules/tangram-renderer/src/utils/slice.js';
import version from '../modules/tangram-renderer/src/utils/version.js';

describe('migrated utility modules', () => {
  it('hashes strings deterministically', () => {
    expect(hashString('Tangram')).toBe(hashString('Tangram'));
    expect(hashString('Tangram')).not.toBe(hashString('tangram'));
  });

  it('slices typed object keys', () => {
    expect(sliceObject({name: 'roads', enabled: true}, ['name'])).toEqual({name: 'roads'});
  });

  it('debounces calls while preserving the receiver', () => {
    vi.useFakeTimers();
    const receiver = {value: 3, callback: vi.fn()};
    const debounced = debounce(function (this: typeof receiver, increment: number) {
      this.callback(this.value + increment);
    }, 10);

    debounced.call(receiver, 1);
    debounced.call(receiver, 2);
    vi.advanceTimersByTime(10);

    expect(receiver.callback).toHaveBeenCalledOnce();
    expect(receiver.callback).toHaveBeenCalledWith(5);
    vi.useRealTimers();
  });

  it('reports the renderer package version', () => {
    expect(version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('merges typed debug settings into the shared state', () => {
    const originalWireframe = debugSettings.wireframe;
    mergeDebugSettings({wireframe: !originalWireframe});
    expect(debugSettings.wireframe).toBe(!originalWireframe);
    mergeDebugSettings({wireframe: originalWireframe});
  });
});
