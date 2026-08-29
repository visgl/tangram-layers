/**
 * Creates a promise with externally controlled resolution for asynchronous tests.
 *
 * @returns {{promise: Promise<unknown>, resolve: (value?: unknown) => void, reject: (reason?: unknown) => void}}
 */
export function createDeferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {promise, resolve: resolvePromise, reject: rejectPromise};
}

/**
 * Waits for promise continuations and timers queued by the current test turn.
 *
 * @returns {Promise<void>}
 */
export function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
