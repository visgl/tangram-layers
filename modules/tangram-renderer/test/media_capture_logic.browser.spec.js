// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {afterEach, describe, expect, test, vi} from 'vitest';
import MediaCapture from '../src/utils/media_capture';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('media capture behavior', () => {
  test('queues a single screenshot and resolves flipped pixels as PNG data', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 1;
    const gl = {
      RGBA: 1,
      UNSIGNED_BYTE: 2,
      readPixels: vi.fn((x, y, width, height, format, type, pixels) => {
        pixels.set([255, 0, 0, 128, 0, 255, 0, 255]);
      })
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,AQID');

    const capture = new MediaCapture();
    capture.setCanvas(canvas, gl);
    const screenshot = capture.screenshot({background: '#0000ff'});
    expect(capture.screenshot()).toBe(screenshot);
    capture.completeScreenshot();

    await expect(screenshot).resolves.toMatchObject({
      type: 'png',
      url: 'data:image/png;base64,AQID'
    });
    expect(gl.readPixels).toHaveBeenCalledTimes(1);
    expect(capture.queue_screenshot).toBeNull();
    expect(capture.screenshot_canvas.width).toBe(2);
  });

  test('treats transparent screenshots as unblended', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl = {
      RGBA: 1,
      UNSIGNED_BYTE: 2,
      readPixels(x, y, width, height, format, type, pixels) {
        pixels.set([10, 20, 30, 255]);
      }
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,AQID');
    const capture = new MediaCapture();
    capture.setCanvas(canvas, gl);
    const screenshot = capture.screenshot({background: 'transparent'});
    capture.completeScreenshot();
    await expect(screenshot).resolves.toMatchObject({type: 'png'});
  });

  test('reports unsupported or inactive video capture', async () => {
    const capture = new MediaCapture();
    expect(capture.startVideoCapture()).toBe(false);
    await expect(capture.stopVideoCapture()).resolves.toEqual({});
  });
});
