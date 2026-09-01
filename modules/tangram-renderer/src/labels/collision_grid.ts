// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

type Anchor = {x: number; y: number};
type Cell = {aabb: unknown[]; obb: unknown[]};
type LabelLike = {aabb?: number[]; aabbs?: number[][]; cells?: Cell[]};
export default class CollisionGrid {
    anchor: Anchor;
    span: number;
    cells: Record<number, Record<number, Cell>>;

    constructor (anchor: Anchor, span: number) {
        this.anchor = anchor;
        this.span = span;
        this.cells = {};
    }

    addLabel (label: LabelLike): void {
        if (label.aabb) {
            this.addLabelBboxes(label, label.aabb);
        }

        if (label.aabbs) {
            label.aabbs.forEach(aabb => this.addLabelBboxes(label, aabb));
        }
    }

    addLabelBboxes (label: LabelLike, aabb: number[]): void {
        // min/max cells that the label falls into
        // keep grid coordinates at zero or above so any labels that go "below" the anchor are in the lowest grid cell
        const cell_bounds = [
            Math.max(Math.floor((aabb[0] - this.anchor.x) / this.span), 0),
            Math.max(Math.floor(-(aabb[1] - this.anchor.y) / this.span), 0),
            Math.max(Math.floor((aabb[2] - this.anchor.x) / this.span), 0),
            Math.max(Math.floor(-(aabb[3] - this.anchor.y) / this.span), 0)
        ];

        label.cells = []; // label knows which cells it falls in

        // initialize each grid cell as necessary, and add to label's list of cells
        for (let gy = cell_bounds[1]; gy <= cell_bounds[3]; gy++) {
            this.cells[gy] = this.cells[gy] || {};
            for (let gx = cell_bounds[0]; gx <= cell_bounds[2]; gx++) {
                this.cells[gy][gx] = this.cells[gy][gx] || { aabb: [], obb: [] };
                label.cells.push(this.cells[gy][gx]);
            }
        }
    }

}
