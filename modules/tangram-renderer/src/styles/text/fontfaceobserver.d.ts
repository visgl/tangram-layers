// Tangram layers
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 vis.gl contributors

declare module 'fontfaceobserver' {
    export default class FontFaceObserver {
        constructor (family: string, options?: Record<string, unknown>);
        load (): Promise<void>;
    }
}
