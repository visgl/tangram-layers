// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

type Position = [number, number];
type RepeatObject = {position?: Position};
type RepeatLayout = {repeat_distance?: number; repeat_group?: string; repeat_scale: number};
export default class RepeatGroup {
    static groups: Record<string, Record<string, RepeatGroup>> = {};
    key: string;
    repeat_dist: number;
    repeat_dist_sq: number;
    positions: Position[];

    constructor (key: string, repeat_dist: number) {
        this.key = key;
        this.repeat_dist = repeat_dist;
        this.repeat_dist_sq = this.repeat_dist * this.repeat_dist;
        this.positions = [];
    }

    // Check an object to see if it's a repeat in this group
    check (obj: RepeatObject): boolean | undefined {
        // Check distance from new object to objects already in group
        const p1 = obj.position!;
        for (let i=0; i < this.positions.length; i++) {
            let p2 = this.positions[i];
            let dx = p1[0] - p2[0];
            let dy = p1[1] - p2[1];
            let dist_sq = dx * dx + dy * dy;

            // Found an existing object within allowed distance
            if (dist_sq < this.repeat_dist_sq) {
                return true;
            }
        }
    }

    // Add object to this group
    add (obj: RepeatObject): void {
        // only store object's position, to save space / prevent unnecessary references
        if (obj && obj.position) {
            this.positions.push(obj.position);
        }
    }

    // Static methods are used to manage repeat groups, within and across tiles

    // Reset all groups for this tile
    static clear (tile: string): void {
        this.groups[tile] = {};
    }

    // Check an object to see if it's a repeat within its designated group
    static check (obj: RepeatObject, layout: RepeatLayout, tile: string): boolean | undefined {
        if (layout.repeat_distance && layout.repeat_group && this.groups[tile][layout.repeat_group]) {
            return this.groups[tile][layout.repeat_group].check(obj);
        }
    }

    // Add an object to its designated group
    static add (obj: RepeatObject, layout: RepeatLayout, tile: string): void {
        if (layout.repeat_distance && layout.repeat_group) {
            if (this.groups[tile][layout.repeat_group] == null) {
                this.groups[tile][layout.repeat_group] = new RepeatGroup(layout.repeat_group, layout.repeat_distance * layout.repeat_scale);
            }
            this.groups[tile][layout.repeat_group].add(obj);
        }
    }

}
