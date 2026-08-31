// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 vis.gl contributors

import type {
  Buffer,
  Device,
  ExternalImage,
  RenderPass,
  RenderPipelineParameters,
  Shader,
  Texture
} from '@luma.gl/core';

/** Shader languages supported by Tangram's portable GPU backend. */
export type TangramShaderLanguage = 'glsl' | 'wgsl';

/** Options used to allocate a Tangram uniform buffer. */
export type TangramUniformBufferOptions = {
  id: string;
  usage: 'uniform';
  byteLength: number;
};

/** Options used to allocate a Tangram vertex or index buffer. */
export type TangramMeshBufferOptions = {
  id: string;
  usage: 'vertex' | 'index';
  data: ArrayBuffer | ArrayBufferView;
  indexType?: 'uint16' | 'uint32';
};

/** Options used to compile one stage of a Tangram shader program. */
export type TangramShaderOptions = {
  id: string;
  language?: TangramShaderLanguage;
  stage: 'vertex' | 'fragment';
  source: string;
  entryPoint?: string;
};

/** Options used to validate a linked Tangram shader pair. */
export type TangramShaderProgramOptions = {
  id: string;
  vertexShader: Shader;
  fragmentShader: Shader;
};

/** Options used to allocate and initialize a Tangram texture. */
export type TangramTextureOptions = {
  id: string;
  width: number;
  height: number;
  data?: ArrayBuffer | ArrayBufferView | ExternalImage;
  filtering?: 'nearest' | 'linear' | 'mipmap';
  repeat?: boolean;
  flipY?: boolean;
  premultipliedAlpha?: boolean;
};

/** Portable mesh submission passed from Tangram scene traversal to a GPU backend. */
export type TangramMeshDrawOptions = {
  mesh: object;
  program: object;
  renderPass: RenderPass;
  renderState?: RenderPipelineParameters;
  visibleTime: number;
};

/**
 * Scene integration hooks supplied by a portable Tangram GPU backend.
 *
 * This compatibility shape keeps the current Scene and Style internals isolated
 * while their individual resource wrappers are migrated to the backend contract.
 */
export type TangramGPUSceneOptions = {
  enableUniformBuffers: true;
  deviceShaderCompilation: true;
  shaderLanguage: TangramShaderLanguage;
  uniformBufferFactory: (options: TangramUniformBufferOptions) => Buffer;
  shaderFactory: (options: TangramShaderOptions) => Shader;
  shaderProgramValidator: (options: TangramShaderProgramOptions) => void;
  meshBufferFactory: (options: TangramMeshBufferOptions) => Buffer;
  textureFactory: (options: TangramTextureOptions) => Texture;
  maxTextureSize?: number;
  meshRenderer: TangramGPUBackend;
};

/**
 * Renderer-independent boundary for Tangram GPU resource ownership and drawing.
 *
 * `LumaDeviceRenderer` is the current and only implementation. It owns the
 * resources it creates but does not own the host device or render pass. The
 * interface intentionally contains no deck.gl types.
 */
export interface TangramGPUBackend {
  /** Host-owned luma.gl device used by this backend. */
  readonly device: Device;

  /** Shader language compiled by this backend. */
  readonly shaderLanguage: TangramShaderLanguage;

  /** Maximum supported two-dimensional texture dimension, when known. */
  readonly maxTextureSize?: number;

  /** Returns the compatibility hooks consumed by current Scene internals. */
  getSceneOptions(): TangramGPUSceneOptions;

  /** Allocates a uniform buffer. */
  createUniformBuffer(options: TangramUniformBufferOptions): Buffer;

  /** Allocates a vertex or index buffer. */
  createMeshBuffer(options: TangramMeshBufferOptions): Buffer;

  /** Compiles a shader stage. */
  createShader(options: TangramShaderOptions): Shader;

  /** Validates a linked shader pair. */
  validateShaderProgram(options: TangramShaderProgramOptions): void;

  /** Allocates and initializes a texture. */
  createTexture(options: TangramTextureOptions): Texture;

  /** Submits one mesh to a host-owned render pass. */
  drawMesh(options: TangramMeshDrawOptions): boolean;

  /** Releases resources owned by this backend. */
  destroy(): void;
}
