// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

declare module 'fontfaceobserver' {
    export default class FontFaceObserver {
        constructor (family: string, options?: Record<string, unknown>);
        load (): Promise<void>;
    }
}
