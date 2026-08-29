import {describe, expect, it} from 'vitest';
import {createDeferred, flushPromises} from '@vis.gl/tangram-test-utils';

describe('workspace test utilities', () => {
  it('resolves a deferred promise from the returned controller', async () => {
    const deferred = createDeferred();
    deferred.resolve('ready');
    await expect(deferred.promise).resolves.toBe('ready');
  });

  it('flushes a queued timer', async () => {
    let completed = false;
    const promise = flushPromises().then(() => {
      completed = true;
    });
    expect(completed).toBe(false);
    await promise;
    expect(completed).toBe(true);
  });
});
