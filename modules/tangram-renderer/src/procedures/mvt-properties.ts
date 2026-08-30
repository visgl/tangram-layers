// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

/** Tangram's supported `parse_json` source option. */
export type ParseJsonOption = boolean | readonly string[] | undefined;

type FeatureWithProperties = {properties: Record<string, unknown>};

/** Parse JSON-encoded MVT properties according to Tangram's `parse_json` option. */
export function parseMvtJsonProperties(
  feature: FeatureWithProperties,
  parseJson: ParseJsonOption
): void {
  if (!parseJson) {
    return;
  }

  const properties = feature.properties;
  const propertyNames = Array.isArray(parseJson) ? parseJson : Object.keys(properties);
  for (const propertyName of propertyNames) {
    const value = properties[propertyName];
    if (typeof value !== 'string') {
      continue;
    }
    if (parseJson === true && value[0] !== '{' && value[0] !== '[') {
      continue;
    }
    try {
      properties[propertyName] = JSON.parse(value);
    } catch {
      // Preserve the original value when it is not valid JSON.
    }
  }
}
