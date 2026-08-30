// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {beforeEach, describe, expect, test} from 'vitest';
import {
  clearFunctionStringCache,
  compileFunctionString,
  compileFunctionStrings,
  functionStringCache
} from '../src/utils/functions';
import TextSettings from '../src/styles/text/text_settings';

describe('renderer function and text helpers', () => {
  beforeEach(() => clearFunctionStringCache());

  test('compiles function strings, applies wrappers, and caches source', () => {
    const compiled = compileFunctionString('function (zoom) { return zoom + 1; }');
    expect(compiled(4)).toBe(5);
    expect(compiled.source).toContain('return zoom + 1');
    expect(compileFunctionString('function (zoom) { return zoom + 1; }')).toBe(compiled);
    expect(functionStringCache.num_functions).toBe(1);
    expect(functionStringCache.num_cached).toBe(1);

    const wrapped = compileFunctionString('function (value) { return value * 2; }', body => `return (function () { ${body} }());`);
    expect(wrapped(3)).toBe(6);
    expect(compileFunctionString('plain text')).toBe('plain text');
  });

  test('recursively compiles function-valued stylesheet properties', () => {
    const style = {
      draw: {color: 'function (context) { return context.zoom; }'},
      nested: ['function (value) { return value + 2; }']
    };
    compileFunctionStrings(style);
    expect(style.draw.color({zoom: 7})).toBe(7);
    expect(style.nested[0](3)).toBe(5);
  });

  test('formats text settings keys and CSS fonts deterministically', () => {
    const settings = {
      style: 'italic',
      weight: 'bold',
      family: 'Futura',
      px_size: 14,
      fill: 'rgb(255, 255, 255)',
      text_wrap: 15,
      max_lines: 2,
      supersample: 1
    };
    expect(TextSettings.fontCSS(settings)).toBe('italic bold 14px Futura');
    expect(TextSettings.key(settings)).toContain('italic/bold/Futura/14');
    expect(TextSettings.key(settings)).toBe(TextSettings.key({...settings}));
  });
});
