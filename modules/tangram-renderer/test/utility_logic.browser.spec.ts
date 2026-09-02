// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, test} from 'vitest';
import CollisionGrid from '../src/labels/collision_grid';
import RepeatGroup from '../src/labels/repeat_group';
import renderDashArray from '../src/styles/lines/dasharray';
import Vector from '../src/utils/vector';
import {getPropertyPath, getPropertyPathTarget, setPropertyPath} from '../src/utils/props';

describe('renderer utility logic', () => {
  test('indexes label bounding boxes in collision grid cells', () => {
    const grid = new CollisionGrid({x: 0, y: 0}, 10);
    const label: any = {aabb: [1, -1, 19, -19]};
    grid.addLabel(label);
    expect(label.cells).toHaveLength(4);
    expect(Object.keys(grid.cells)).toEqual(['0', '1']);
    expect(grid.cells[0][0].aabb).toEqual([]);

    const multiBoxLabel: any = {aabbs: [[-5, 5, 5, -5], [20, -20, 21, -21]]};
    grid.addLabel(multiBoxLabel);
    expect(multiBoxLabel.cells.length).toBeGreaterThan(0);
  });

  test('tracks repeated label positions per tile and group', () => {
    const tile = 'tile-1';
    RepeatGroup.clear(tile);
    const layout: any = {repeat_distance: 10, repeat_group: 'road', repeat_scale: 2};
    const first: any = {position: [100, 100]};
    const second: any = {position: [105, 100]};
    const far: any = {position: [130, 100]};

    expect(RepeatGroup.check(first, layout, tile)).toBeUndefined();
    RepeatGroup.add(first, layout, tile);
    expect(RepeatGroup.check(second, layout, tile)).toBe(true);
    expect(RepeatGroup.check(far, layout, tile)).toBeUndefined();
    RepeatGroup.add(null as any, layout, tile);
    RepeatGroup.add(far, layout, tile);
    expect(RepeatGroup.groups[tile].road.positions).toHaveLength(2);
    expect(RepeatGroup.check(first, {repeat_group: 'missing'} as any, tile)).toBeUndefined();
  });

  test('renders even and odd dash patterns into flipped RGBA pixels', () => {
    const even = renderDashArray([1, 1], {
      dash_color: [255, 0, 0, 255],
      background_color: [0, 0, 0, 255]
    });
    expect(even.length).toBe(2);
    expect(Array.from(even.pixels)).toEqual([
      255, 0, 0, 0,
      255, 0, 0, 255
    ]);

    const oddPattern = [2, 1, 1];
    const odd = renderDashArray(oddPattern, {scale: 0.5});
    expect(odd.length).toBe(2);
    expect(oddPattern).toEqual([2, 1, 1, 2, 1, 1]);
  });

  test('performs common vector operations without mutation except normalize', () => {
    expect(Vector.copy([1, 2, 3])).toEqual([1, 2, 3]);
    expect(Vector.neg([1, -2])).toEqual([-1, 2]);
    expect(Vector.add([1, 2], [3, 4])).toEqual([4, 6]);
    expect(Vector.sub([5, 4], [2, 1])).toEqual([3, 3]);
    expect(Vector.mult([2, 3], 2)).toEqual([4, 6]);
    expect(Vector.div([4, 6], [2, 3])).toEqual([2, 2]);
    expect(Vector.perp([0, 0], [2, 1])).toEqual([1, -2]);
    expect(Vector.signed_area([0, 0], [2, 0], [0, 3])).toBe(6);
    expect(Vector.dot([1, 2], [3, 4])).toBe(11);
    expect(Vector.cross([1, 0], [0, 1])).toBe(1);
    expect(Vector.cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(Vector.length([3, 4])).toBe(5);
    expect(Vector.angle([0, 1])).toBeCloseTo(Math.PI / 2);
    expect(Vector.angleBetween([1, 0], [0, 1])).toBeCloseTo(Math.PI / 2);
    expect(Vector.isEqual([1, 2], [1, 2])).toBe(true);
    expect(Vector.normalize([3, 4])).toEqual([0.6, 0.8]);
    expect(Vector.normalize([0, 0])).toEqual([0, 0]);
  });

  test('gets and sets nested properties safely', () => {
    const object = {style: {draw: {color: 'red'}}};
    expect(getPropertyPath(object, ['style', 'draw', 'color'])).toBe('red');
    expect(getPropertyPathTarget(object, ['style', 'draw', 'color'])).toEqual(object.style.draw);
    setPropertyPath(object, ['style', 'draw', 'color'], 'blue');
    expect(object.style.draw.color).toBe('blue');
    expect(getPropertyPath(object, ['style', 'missing'])).toBeUndefined();
    setPropertyPath(object, ['style', 'missing', 'value'], 1);
    expect(getPropertyPathTarget(object, [])).toBeUndefined();
  });
});
