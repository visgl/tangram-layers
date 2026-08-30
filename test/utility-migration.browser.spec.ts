// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it, vi} from 'vitest';
import subscribeMixin from '../modules/tangram-renderer/src/utils/subscribe.js';

describe('migrated subscription utility', () => {
  it('adds typed subscription methods', () => {
    const target = subscribeMixin({name: 'scene'});
    const handler = vi.fn();
    const listener = {load: handler};

    target.subscribe(listener);
    target.trigger('load', 'scene.yaml');
    target.unsubscribe(listener);
    target.trigger('load', 'ignored');

    expect(target.name).toBe('scene');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('scene.yaml');
  });
});
