// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// Get a value for a nested property with path provided as an array (`a.b.c` => ['a', 'b', 'c'])
type PropertyTarget = Record<PropertyKey, unknown>;
export type PropertyPath = readonly PropertyKey[];

export function getPropertyPath(object: object, path: PropertyPath): unknown {
  const property = path[path.length - 1];
  return getPropertyPathTarget(object, path)?.[property];
}

// Set a value for a nested property with path provided as an array (`a.b.c` => ['a', 'b', 'c'])
export function setPropertyPath(object: object, path: PropertyPath, value: unknown): void {
  const property = path[path.length - 1];
  const target = getPropertyPathTarget(object, path);
  if (target) {
    target[property] = value;
  }
}

// Get the immediate parent object for a property path name provided as an array
// e.g. for a single-depth path, this is just `object`, for path ['a', 'b'], this is `object[a]`
export function getPropertyPathTarget(
  object: object,
  path: PropertyPath
): PropertyTarget | undefined {
  if (path.length === 0) {
    return;
  }

  let target: unknown = object;
  for (let index = 0; index < path.length - 1; index++) {
    const property = path[index];
    target = (target as PropertyTarget)[property];
    if (target == null) {
      return;
    }
  }
  return target as PropertyTarget;
}
