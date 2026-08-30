// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it, vi} from 'vitest';
import {
  initializeCurrentDeckExample,
  resolveDeckExampleViewMode
} from '../examples/deck/app-loader.js';

describe('deck example loader', () => {
  it('cancels initialization when the active mount changes during module loading', async () => {
    let activeMountId = '1';
    let resolveRuntime;
    const initializeDeckExample = vi.fn();
    const runtimePromise = new Promise((resolve) => {
      resolveRuntime = resolve;
    });

    const initialization = initializeCurrentDeckExample({
      moduleUrl: 'https://example.test/examples/deck/app.js?embedded=1&mount=1',
      getActiveMountId: () => activeMountId,
      embeddedViewMode: 'mapFlat',
      loadRuntime: () => runtimePromise
    });
    activeMountId = '2';
    resolveRuntime({initializeDeckExample});

    await expect(initialization).resolves.toBe(false);
    expect(initializeDeckExample).not.toHaveBeenCalled();
  });

  it('prefers the embedded route mode over a query-string override', () => {
    const viewModes = {mapPerspective: {}, globe: {}};

    expect(
      resolveDeckExampleViewMode({
        embeddedViewMode: 'mapPerspective',
        queryViewMode: 'globe',
        viewModes
      })
    ).toBe('mapPerspective');
    expect(resolveDeckExampleViewMode({queryViewMode: 'globe', viewModes})).toBe('globe');
  });

  it('passes host presentation options to the shared deck runtime', async () => {
    const initializeDeckExample = vi.fn();

    await expect(
      initializeCurrentDeckExample({
        moduleUrl: 'https://example.test/examples/deck/app.js?mount=hero-1',
        getActiveMountId: () => 'hero-1',
        embeddedViewMode: 'mapPerspective',
        runtimeOptions: {basemapId: 'tron', showOverlays: false},
        loadRuntime: async () => ({initializeDeckExample})
      })
    ).resolves.toBe(true);

    expect(initializeDeckExample).toHaveBeenCalledWith({
      embeddedViewMode: 'mapPerspective',
      basemapId: 'tron',
      showOverlays: false
    });
  });
});
