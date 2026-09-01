// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

type BoundingBox = [number, number, number, number];

// Do AABB `a` and `b` intersect?
export function boxIntersectsBox (a: BoundingBox, b: BoundingBox): boolean {
    if (a[2] < b[0] || // a is left of b
        a[0] > b[2] || // a is right of b
        a[3] < b[1] || // a is above b
        a[1] > b[3]) { // a is below b
        return false;
    }
    return true; // boxes overlap
}

// Does AABB `a` intersect any of the AABBs in array `boxes`?
// Invokes `callback` with index of intersecting box
// Stops intersecting if `callback` returns non-null value (continues otherwise)
export function boxIntersectsList (a: BoundingBox, boxes: BoundingBox[], callback: (index: number) => unknown): void {
    for (let i=0; i < boxes.length; i++) {
        if (boxIntersectsBox(a, boxes[i])) {
            if (callback(i) != null) {
                break;
            }
        }
    }
}
