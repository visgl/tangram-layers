// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

let MAX_VALUE = Math.pow(2, 16) - 1;
let has_element_index_uint = false;

export default class VertexElements {
    static setElementIndexUint: (flag: boolean) => void;
    array: number[];
    has_overflown: boolean;

    constructor () {
        this.array = [];
        this.has_overflown = false;
    }
    push (value: number): void {
        // If values have overflown and no Uint32 option is available, do not push values
        if (this.has_overflown && !has_element_index_uint) {
            return;
        }

        // Trigger overflow if value is greater than Uint16 max
        if (value > MAX_VALUE) {
            this.has_overflown = true;
            if (!has_element_index_uint) {
                return;
            }
        }

        this.array.push(value);
    }
    end (): Uint16Array | Uint32Array | false {
        if (this.array.length){
            let buffer = createBuffer(this.array, this.has_overflown);
            this.array = [];
            this.has_overflown = false;
            return buffer;
        }
        else {
            return false;
        }
    }
}

VertexElements.setElementIndexUint = function(flag: boolean): void {
    has_element_index_uint = flag;
};

function createBuffer(array: number[], overflown: boolean): Uint16Array | Uint32Array {
    var typedArray = (overflown && has_element_index_uint) ? Uint32Array : Uint16Array;
    return new typedArray(array);
}
