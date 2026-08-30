// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import type {Device, RenderPass} from '@luma.gl/core';

export type Matrix4 = readonly number[] | Float32Array | Float64Array;
export type Vector3 = readonly [number, number, number];
export type SceneDefinition = string | Record<string, unknown> | readonly SceneDefinition[];

export type Viewport = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

export type GeographicAnchor = {
  longitude: number;
  latitude: number;
  altitude?: number;
  zoom: number;
};

export type HostCamera = {
  view: Matrix4;
  projection: Matrix4;
  position: Vector3;
};

export type HostRenderView = {
  id?: string;
  viewport?: Viewport;
  camera: HostCamera;
};

export type HostFrameOptions = {
  viewport: Viewport;
  geographicAnchor: GeographicAnchor;
  renderViews: readonly HostRenderView[];
  activeRenderViewId?: string;
  tileBuffer?: number;
};

export type LegacyHostFrame = {
  viewport: Viewport;
  view: GeographicAnchor;
  camera: HostCamera;
  tileBuffer?: number;
};

export type RendererOptions = {
  device?: Device;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  requestRedraw?: () => void;
  numWorkers?: number;
  logLevel?: string;
  highDensityDisplay?: boolean;
  introspection?: boolean;
  [option: string]: unknown;
};

export type SceneLoadOptions = {
  base_path?: string;
  file_type?: string;
  blocking?: boolean;
  [option: string]: unknown;
};

export type RenderOptions = {
  frame?: HostFrameOptions | LegacyHostFrame;
  renderPass?: RenderPass | null;
  renderViewId?: string;
  force?: boolean;
};

export type SceneListener = (...arguments_: unknown[]) => void;
export type SceneListeners = Record<string, SceneListener>;

export type WorkerRequest<Message = unknown> = {
  type: 'main_send' | 'worker_send';
  message_id: number;
  method: string;
  message: Message;
};

export type WorkerResponse<Message = unknown> = {
  type: 'main_reply' | 'worker_reply';
  message_id: number;
  message?: Message;
  error?: string;
};

export type WorkerBrokerMessage<Message = unknown> =
  | WorkerRequest<Message>
  | WorkerResponse<Message>;
