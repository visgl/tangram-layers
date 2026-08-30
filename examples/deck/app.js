// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {initializeCurrentDeckExample} from './app-loader.js';

await initializeCurrentDeckExample({
  moduleUrl: import.meta.url,
  getActiveMountId: () => window.tangramDeckExampleMountId,
  embeddedViewMode: window.tangramExampleViewMode
});
