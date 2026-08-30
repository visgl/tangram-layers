// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// Deep/recursive merge of one or more source objects into a destination object
type MutableRecord = Record<string, unknown>;

function isMergeableObject(value: unknown): value is MutableRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export default function mergeObjects<Destination extends object>(
  destination: Destination,
  ...sources: Array<object | null | undefined>
): Destination {
  const destinationRecord = destination as MutableRecord;

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key in source) {
      const sourceRecord = source as MutableRecord;
      const value = sourceRecord[key];

      // Recursively merge the source into the destination if it is a non-null key/value object.
      // Arrays are treated as scalar values; null values overwrite the previous destination value.
      if (isMergeableObject(value)) {
        const destinationValue = destinationRecord[key];
        destinationRecord[key] = isMergeableObject(destinationValue)
          ? mergeObjects(destinationValue, value)
          : mergeObjects({}, value);
      }
      // Undefined source properties are ignored. All other values overwrite the destination.
      else if (value !== undefined) {
        destinationRecord[key] = value;
      }
    }
  }

  return destination;
}
