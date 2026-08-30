import {describe, expect, it} from 'vitest';
import TangramLayer, {
  TangramLayer as NamedTangramLayer,
  createTangramLayerClass,
  getExternalCameraFrame
} from '@vis.gl/tangram-layers';
import Tangram, {
  ClassicWebGLRenderer,
  HostFrame,
  LumaDeviceRenderer,
  Renderer,
  Scene
} from '@vis.gl/tangram-renderer';
import {TangramStyleSheetSchema} from '@vis.gl/tangram-renderer/style-schema';
import tangramStyleJsonSchema from '@vis.gl/tangram-renderer/tangram-style.schema.json';

describe('published package entrypoints', () => {
  it('exports the renderer compatibility surface', () => {
    expect(Tangram).toBeDefined();
    expect(Scene).toBeTypeOf('function');
    expect(ClassicWebGLRenderer).toBeTypeOf('function');
    expect(Renderer).toBe(ClassicWebGLRenderer);
    expect(HostFrame).toBeTypeOf('function');
    expect(LumaDeviceRenderer).toBeTypeOf('function');
  });

  it('exports the deck.gl adapter surface', () => {
    expect(TangramLayer).toBe(NamedTangramLayer);
    expect(createTangramLayerClass).toBeTypeOf('function');
    expect(getExternalCameraFrame).toBeTypeOf('function');
  });

  it('exports the Zod style schema and generated JSON Schema', () => {
    expect(TangramStyleSheetSchema.safeParse({styles: {roads: {base: 'lines'}}}).success).toBe(
      true
    );
    expect(tangramStyleJsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(tangramStyleJsonSchema.$id).toContain('tangram-style.schema.json');
  });
});
