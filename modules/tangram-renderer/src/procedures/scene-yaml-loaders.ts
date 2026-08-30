// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {parseSync} from '@loaders.gl/core';
import {YAMLLoader} from '@loaders.gl/config/bundled';

/** Parse a Tangram scene with the candidate loaders.gl YAML implementation. */
export function parseSceneYamlWithLoaders(source: string): unknown {
  return parseSync(source, YAMLLoader, {yaml: {uniqueKeys: false}});
}
