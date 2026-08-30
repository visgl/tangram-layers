// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

export default function sliceObject (obj, keys) {
    let sliced = {};
    keys.forEach(k => sliced[k] = obj[k]);
    return sliced;
}
