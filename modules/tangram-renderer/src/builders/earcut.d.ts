// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

declare module 'earcut' {
    type EarcutResult = number[];

    interface EarcutFunction {
        (vertices: number[], holes?: number[], dimensions?: number): EarcutResult;
        flatten(data: number[][][]): {vertices: number[]; holes: number[]; dimensions: number};
    }

    const earcut: EarcutFunction;
    export default earcut;
}
