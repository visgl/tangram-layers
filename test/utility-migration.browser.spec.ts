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

  it('preserves the listener as a handler receiver', () => {
    const target = subscribeMixin({name: 'scene'});
    const listener = {
      count: 0,
      update() {
        this.count++;
      }
    };

    target.subscribe(listener);
    target.trigger('update');

    expect(listener.count).toBe(1);
  });

  it('waits until the next trigger to notify new listeners', () => {
    const target = subscribeMixin({name: 'scene'});
    const lateHandler = vi.fn();
    const lateListener = {update: lateHandler};
    const initialListener = {
      update() {
        target.subscribe(lateListener);
      }
    };

    target.subscribe(initialListener);
    target.trigger('update');
    expect(lateHandler).not.toHaveBeenCalled();

    target.trigger('update');
    expect(lateHandler).toHaveBeenCalledOnce();
  });
});
