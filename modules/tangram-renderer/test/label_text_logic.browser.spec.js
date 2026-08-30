// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {beforeEach, describe, expect, test, vi} from 'vitest';
import LabelLine, {LabelLineBase, LabelLineStraight} from '../src/labels/label_line';
import LabelPoint from '../src/labels/label_point';
import placePointsOnLine from '../src/labels/point_placement';
import Collision from '../src/labels/collision';
import RepeatGroup from '../src/labels/repeat_group';
import TextCanvas from '../src/styles/text/text_canvas';
import debugSettings from '../src/utils/debug_settings';

function createLayout(overrides = {}) {
  return {
    anchor: 'center',
    align: 'center',
    angle: 'auto',
    buffer: [2, 2],
    collide: false,
    italic: false,
    offset: [0, 0],
    orientation: undefined,
    placement: LabelPoint.PLACEMENT.MIDPOINT,
    placement_min_length_ratio: 0,
    placement_spacing: 50,
    priority: 0,
    repeat_distance: 0,
    repeat_group: 'road-labels',
    repeat_scale: 1,
    tile_edges: false,
    units_per_pixel: 1,
    vertical_buffer: 0,
    ...overrides
  };
}

describe('line and point label placement', () => {
  test('finds the longest consistently oriented line', () => {
    expect(
      LabelLineBase.splitLineByOrientation([[0, 0], [10, 0], [20, 0], [15, 0]])
    ).toEqual([[[0, 0], [10, 0], [20, 0]], false]);
    expect(
      LabelLineBase.splitLineByOrientation([[20, 0], [10, 0], [10, -10], [0, -10]])
    ).toEqual([[[0, -10], [10, -10], [10, 0], [20, 0]], true]);
  });

  test('creates oriented boxes and straight labels', () => {
    const box = LabelLineBase.createOBB([100, -100], 40, 10, Math.PI / 4, 0, [3, 2], 2);
    expect(box.centroid[0]).toBe(106);
    expect(box.centroid[1]).toBe(-104);

    const label = new LabelLineStraight(
      [60, 12],
      [[100, -100], [200, -100], [300, -100]],
      createLayout({orientation: 1}),
      1.5
    );
    expect(label.throw_away).toBe(false);
    expect(label.position).toEqual([150, -100]);
    expect(label.aabbs).toHaveLength(1);
    expect(label.toJSON()).toMatchObject({type: 'straight', size: [60, 12]});
    expect(label.discard({aabb: [], obb: []})).toBe(false);
    expect(label.inTileBounds()).toBe(true);
  });

  test('selects straight or curved labels and rejects lines that are too short', () => {
    const layout = createLayout({no_curving: false});
    expect(
      LabelLine.create(
        [[20, 10], [20, 10]],
        [40, 10],
        [[100, -100], [180, -100], [240, -140], [320, -140]],
        layout
      )
    ).toBeTruthy();
    expect(
      LabelLine.create([[100, 20]], [100, 20], [[0, 0], [10, 0]], layout)
    ).toBe(false);
  });

  test.each([
    LabelPoint.PLACEMENT.VERTEX,
    LabelPoint.PLACEMENT.MIDPOINT,
    LabelPoint.PLACEMENT.SPACED
  ])('places point labels with strategy %s', placement => {
    const labels = placePointsOnLine(
      [[100, -100], [300, -100], [500, -300]],
      [20, 10],
      createLayout({placement})
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label instanceof LabelPoint)).toBe(true);
    expect(labels.every(label => Number.isFinite(label.angle))).toBe(true);
  });

  test('filters short and out-of-tile point placements', () => {
    expect(
      placePointsOnLine(
        [[0, 0], [10, 0]],
        [100, 100],
        createLayout({
          placement: LabelPoint.PLACEMENT.SPACED,
          placement_min_length_ratio: 2
        })
      )
    ).toEqual([]);
    expect(
      placePointsOnLine(
        [[-100, 100], [-50, 100]],
        [10, 10],
        createLayout({placement: LabelPoint.PLACEMENT.MIDPOINT})
      )
    ).toEqual([]);
  });
});

describe('collision lifecycle', () => {
  beforeEach(() => {
    Collision.tiles = {};
    Collision.initGrid(null);
    RepeatGroup.groups = {};
  });

  function createCollisionObject({discard = false, priority = 0, repeat = false} = {}) {
    const label = new LabelPoint(
      [100 + priority * 100, -100],
      [20, 10],
      createLayout({
        collide: true,
        priority,
        repeat_distance: repeat ? 50 : 0
      })
    );
    label.discard = vi.fn(() => discard);
    return {label, linked: null, show: null};
  }

  test('places visible labels in priority order', async () => {
    Collision.startTile('tile', {apply_repeat_groups: false});
    Collision.addStyle('roads', 'tile');
    const first = createCollisionObject({priority: 1});
    const second = createCollisionObject({priority: 2});
    const labels = await Collision.collide([second, first], 'roads', 'tile');
    expect(labels).toEqual([first, second]);
    expect(first.show).toBe(true);
    expect(first.label.placed).toBe(true);
    expect(Collision.tiles.tile).toBeUndefined();
  });

  test('returns hidden labels and resolves aborted or missing tiles', async () => {
    Collision.startTile('hidden', {return_hidden: true});
    Collision.addStyle('places', 'hidden');
    const hidden = createCollisionObject({discard: true});
    expect(await Collision.collide([hidden], 'places', 'hidden')).toEqual([hidden]);
    expect(hidden.show).toBe(false);

    Collision.startTile('aborted');
    const completion = Collision.tiles.aborted.complete;
    Collision.abortTile('aborted');
    await expect(completion).resolves.toEqual([]);
    await expect(Collision.collide([], 'none', 'missing')).resolves.toEqual([]);
  });

  test('indexes labels in the collision grid', async () => {
    Collision.initGrid({anchor: {x: 0, y: 0}, span: 256});
    Collision.startTile('grid', {apply_repeat_groups: false});
    Collision.addStyle('roads', 'grid');
    const object = createCollisionObject();
    const labels = await Collision.collide([object], 'roads', 'grid');
    expect(labels).toHaveLength(1);
    expect(object.label.cells.length).toBeGreaterThan(0);
  });
});

describe('text measurement and atlas layout', () => {
  beforeEach(() => {
    TextCanvas.cache.text = {};
    TextCanvas.cache.text_count = 0;
    TextCanvas.cache.segment = {};
    TextCanvas.cache.stats = {
      text_hits: 0,
      text_misses: 0,
      segment_hits: 0,
      segment_misses: 0
    };
  });

  test('measures, caches, transforms, and draws styled text', () => {
    const canvas = new TextCanvas();
    canvas.resize(512, 256);
    const settings = {
      font_css: 'bold 16px sans-serif',
      fill: '#fff',
      stroke: '#000',
      stroke_width: 2,
      px_size: 16,
      supersample: 1,
      transform: 'uppercase',
      text_wrap: 60,
      max_lines: 2,
      background_color: '#222',
      background_stroke_color: '#0ff',
      background_stroke_width: 1,
      background_width: 3,
      underline_width: 1,
      align: 'center'
    };
    canvas.setFont(settings);
    const measured = canvas.textSize('roads', 'main street', settings);
    expect(measured.size.texture_size[0]).toBeGreaterThan(0);
    expect(measured.lines.length).toBeGreaterThan(0);
    expect(canvas.textSize('roads', 'main street', settings)).toBe(measured);
    expect(TextCanvas.cache.stats.text_hits).toBe(1);
    canvas.drawTextMultiLine(measured.lines, [0, 0], measured.size, settings, 'curved');

    expect(canvas.applyTextTransform('main street', 'capitalize')).toBe('Main Street');
    expect(canvas.applyTextTransform('Main Street', 'lowercase')).toBe('main street');
    expect(canvas.applyTextTransform('Main Street', 'uppercase')).toBe('MAIN STREET');
    expect(canvas.applyTextTransform('Main Street')).toBe('Main Street');
  });

  test('converts CSS font sizes and prunes oversized caches', () => {
    expect(TextCanvas.fontPixelSize(null)).toBeUndefined();
    expect(TextCanvas.fontPixelSize(12)).toBe(12);
    expect(TextCanvas.fontPixelSize('1.5em')).toBe(24);
    expect(TextCanvas.fontPixelSize('12pt')).toBe(16);
    expect(TextCanvas.fontPixelSize('100%')).toBe(16);

    TextCanvas.cache.text_count = TextCanvas.cache.text_count_max + 1;
    TextCanvas.cache.text = {style: {text: {}}};
    TextCanvas.cache.segment = Object.fromEntries(
      Array.from({length: TextCanvas.cache.segment_count_max + 1}, (_, index) => [index, []])
    );
    TextCanvas.pruneTextCache();
    expect(TextCanvas.cache.text).toEqual({});
    expect(TextCanvas.cache.segment).toEqual({});
  });

  test('packs straight, curved, and aligned text into atlases', () => {
    const canvas = new TextCanvas();
    const size = texture_size => ({texture_size});
    const texts = {
      roads: {
        Broadway: {
          text_settings: {can_articulate: true},
          type: ['straight', 'curved'],
          size: size([80, 20]),
          isRTL: false,
          segments: ['Broad', 'way'],
          segment_sizes: [size([45, 20]), size([35, 20])]
        },
        Local: {
          text_settings: {can_articulate: false},
          size: size([60, 20]),
          align: {left: {}, right: {}}
        }
      }
    };
    const textures = canvas.setTextureTextPositions(texts, 128);
    expect(textures.length).toBeGreaterThan(0);
    expect(texts.roads.Broadway.textures).toHaveLength(2);
    expect(texts.roads.Local.align.left.texture_position).toBeDefined();
    expect(textures.every(texture => texture.texture_size[0] <= 128)).toBe(true);
  });

  test('draws optional debug bounds', () => {
    const canvas = new TextCanvas();
    canvas.resize(100, 100);
    debugSettings.draw_label_collision_boxes = true;
    debugSettings.draw_label_texture_boxes = true;
    canvas.drawTextDebug(
      [0, 0],
      {
        dpr: 1,
        horizontal_buffer: 2,
        vertical_buffer: 2,
        texture_size: [40, 20],
        collision_size: [30, 10]
      },
      'curved'
    );
    debugSettings.draw_label_collision_boxes = false;
    debugSettings.draw_label_texture_boxes = false;
  });
});
