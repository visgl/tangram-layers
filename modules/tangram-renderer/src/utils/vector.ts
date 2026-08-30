// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

/** A numeric vector accepted by Tangram's vector utilities. */
export type NumericVector = readonly number[];

/** A mutable numeric vector returned or updated by Tangram's vector utilities. */
export type MutableNumericVector = number[];

function copy(vector: NumericVector): MutableNumericVector {
  return [...vector];
}

function negate(vector: NumericVector): MutableNumericVector {
  return vector.map(component => -component);
}

function add(left: NumericVector, right: NumericVector): MutableNumericVector {
  const length = Math.min(left.length, right.length);
  const result: MutableNumericVector = [];
  for (let index = 0; index < length; index++) {
    result[index] = left[index] + right[index];
  }
  return result;
}

function subtract(left: NumericVector, right: NumericVector): MutableNumericVector {
  const length = Math.min(left.length, right.length);
  const result: MutableNumericVector = [];
  for (let index = 0; index < length; index++) {
    result[index] = left[index] - right[index];
  }
  return result;
}

function signedArea(first: NumericVector, second: NumericVector, third: NumericVector): number {
  return (
    (second[0] - first[0]) * (third[1] - first[1]) -
    (third[0] - first[0]) * (second[1] - first[1])
  );
}

function multiply(
  vector: NumericVector,
  multiplier: number | NumericVector
): MutableNumericVector {
  const length = typeof multiplier === 'number'
    ? vector.length
    : Math.min(vector.length, multiplier.length);
  const result: MutableNumericVector = [];
  for (let index = 0; index < length; index++) {
    result[index] = vector[index] * (
      typeof multiplier === 'number' ? multiplier : multiplier[index]
    );
  }
  return result;
}

function divide(vector: NumericVector, divisor: number | NumericVector): MutableNumericVector {
  const length = typeof divisor === 'number'
    ? vector.length
    : Math.min(vector.length, divisor.length);
  const result: MutableNumericVector = [];
  for (let index = 0; index < length; index++) {
    result[index] = vector[index] / (typeof divisor === 'number' ? divisor : divisor[index]);
  }
  return result;
}

function perpendicular(first: NumericVector, second: NumericVector): MutableNumericVector {
  return [second[1] - first[1], first[0] - second[0]];
}

function rotate(vector: NumericVector, angleRadians: number): MutableNumericVector {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  return [
    vector[0] * cosine - vector[1] * sine,
    vector[0] * sine + vector[1] * cosine
  ];
}

function angle([x, y]: NumericVector): number {
  return Math.atan2(y, x);
}

function angleBetween(first: NumericVector, second: NumericVector): number {
  let delta = dot(normalize(copy(first)), normalize(copy(second)));
  if (delta > 1) {
    delta = 1;
  }
  return Math.acos(delta);
}

function isEqual(first: NumericVector, second: NumericVector): boolean {
  for (let index = 0; index < first.length; index++) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
}

function lengthSquared(vector: NumericVector): number {
  if (vector.length === 2) {
    return vector[0] * vector[0] + vector[1] * vector[1];
  }
  if (vector.length >= 3) {
    return vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2];
  }
  return 0;
}

function getLength(vector: NumericVector): number {
  return Math.sqrt(lengthSquared(vector));
}

function normalize<VectorType extends MutableNumericVector>(vector: VectorType): VectorType {
  if (vector.length !== 2 && vector.length < 3) {
    return vector;
  }

  let magnitudeSquared = vector[0] * vector[0] + vector[1] * vector[1];
  if (vector.length >= 3) {
    magnitudeSquared += vector[2] * vector[2];
  }
  if (magnitudeSquared === 1) {
    return vector;
  }

  const magnitude = Math.sqrt(magnitudeSquared);
  if (magnitude !== 0) {
    vector[0] /= magnitude;
    vector[1] /= magnitude;
    if (vector.length >= 3) {
      vector[2] /= magnitude;
    }
  } else {
    vector[0] = 0;
    vector[1] = 0;
    if (vector.length >= 3) {
      vector[2] = 0;
    }
  }
  return vector;
}

function cross(
  first: NumericVector,
  second: NumericVector
): number | MutableNumericVector | undefined {
  if (first.length === 2) {
    return first[0] * second[1] - first[1] * second[0];
  }
  if (first.length === 3) {
    return [
      first[1] * second[2] - first[2] * second[1],
      first[2] * second[0] - first[0] * second[2],
      first[0] * second[1] - first[1] * second[0]
    ];
  }
  return undefined;
}

function dot(first: NumericVector, second: NumericVector): number {
  const length = Math.min(first.length, second.length);
  let result = 0;
  for (let index = 0; index < length; index++) {
    result += first[index] * second[index];
  }
  return result;
}

/** Tangram's numeric vector operations. */
export const Vector = {
  copy,
  neg: negate,
  add,
  sub: subtract,
  signed_area: signedArea,
  mult: multiply,
  div: divide,
  perp: perpendicular,
  rot: rotate,
  angle,
  angleBetween,
  isEqual,
  lengthSq: lengthSquared,
  length: getLength,
  normalize,
  cross,
  dot
};

export default Vector;
