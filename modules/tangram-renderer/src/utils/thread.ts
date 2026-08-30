// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

export type ThreadState = {
  is_worker: boolean;
  is_main: boolean;
};

// Mark thread as main or worker
const Thread = {} as ThreadState;

try {
  if (window instanceof Window && window.document instanceof HTMLDocument) {
    Thread.is_worker = false;
    Thread.is_main = true;
  }
} catch {
  Thread.is_worker = true;
  Thread.is_main = false;

  // Patch for third-party libraries that require these globals to be present, specifically
  // FontFaceObserver. This allows that library to load on worker threads.
  const workerGlobal = self as unknown as {
    window: {document: Record<string, unknown>};
    document: Record<string, unknown>;
  };
  workerGlobal.window = {document: {}};
  workerGlobal.document = workerGlobal.window.document;
}

export default Thread;
