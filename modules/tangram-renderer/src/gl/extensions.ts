// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// WebGL extension wrapper
// Stores extensions by name and GL context

// list of extension arrays, for each entry, 1st element GL context, 2nd map of extensions by name
type WebGLContext = {
    getExtension(name: string): unknown;
};

type ExtensionCache = [WebGLContext, Record<string, unknown>];

let extensions: ExtensionCache[] = [];

export default function getExtension (gl: WebGLContext, name: string): unknown {
    let extensionMap = extensions.find(entry => entry[0] === gl)?.[1];

    if (!extensionMap) {
        extensionMap = {};
        extensions.push([gl, extensionMap]);
    }

    if (!extensionMap[name]) {
        extensionMap[name] = gl.getExtension(name);
    }
    return extensionMap[name];
}
