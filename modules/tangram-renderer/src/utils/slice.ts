// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

export default function sliceObject<ObjectType extends object, Key extends keyof ObjectType>(
  object: ObjectType,
  keys: readonly Key[]
): Pick<ObjectType, Key> {
  const sliced = {} as Pick<ObjectType, Key>;
  for (const key of keys) {
    sliced[key] = object[key];
  }
  return sliced;
}
