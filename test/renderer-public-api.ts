// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {ClassicWebGLRenderer, HostFrame} from '@vis.gl/tangram-renderer';
import type {HostFrameOptions, RendererOptions} from '@vis.gl/tangram-renderer';

const frameOptions = {
  viewport: {width: 800, height: 600},
  geographicAnchor: {longitude: -74, latitude: 40.7, zoom: 12},
  renderViews: [
    {
      id: 'main',
      camera: {
        view: new Float64Array(16),
        projection: new Float32Array(16),
        position: [0, 0, 1] as const
      }
    }
  ]
} satisfies HostFrameOptions;

const rendererOptions = {requestRedraw: () => {}} satisfies RendererOptions;
const frame = new HostFrame(frameOptions);
const renderer = ClassicWebGLRenderer.create('scene.yaml', rendererOptions);

renderer.setFrame(frame);
