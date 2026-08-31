// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {describe, expect, it} from 'vitest';
import {Timeline} from '@luma.gl/engine';
import {Matrix4} from '@math.gl/core';
import {
  WebXRFirstPersonView,
  WebXRGlobeView,
  WebXRMapView,
  WebXRViewManager
} from '../examples/webxr/webxr-views';

describe('WebXR deck.gl views', () => {
  it('routes deck.gl controller updates into the shared stereo view state', () => {
    const element = document.createElement('canvas');
    const manager = new WebXRViewManager({
      view: new WebXRMapView({id: 'map', controller: true}),
      viewState: {longitude: -74, latitude: 40.7, zoom: 14, bearing: 0, pitch: 45}
    });
    const controller = manager.attachController({element, timeline: new Timeline()});
    manager.updateController({width: 400, height: 300});
    const gesture = (type, x) => ({
      type,
      pointerType: 'touch',
      offsetCenter: {x, y: 150},
      deltaX: x - 200,
      deltaY: 0,
      velocity: 0,
      velocityX: 0,
      velocityY: 0,
      srcEvent: {},
      stopPropagation() {}
    });

    controller.handleEvent(gesture('panstart', 200));
    controller.handleEvent(gesture('panmove', 240));
    controller.handleEvent(gesture('panend', 240));

    expect(manager.getViewState().longitude).not.toBe(-74);
    const renderViews = manager.makeStereoRenderViews({width: 200, height: 300});
    expect(renderViews[0].deckViewport.longitude).toBeCloseTo(
      renderViews[1].deckViewport.longitude
    );
    manager.finalize();
  });

  it('subclasses the standard deck.gl views and preserves shared state', () => {
    const manager = new WebXRViewManager({
      view: new WebXRMapView({id: 'map', controller: true}),
      viewState: {longitude: -74, latitude: 40.7, zoom: 14, bearing: 0, pitch: 45}
    });

    const renderViews = manager.makeStereoRenderViews({width: 400, height: 300});

    expect(renderViews.map((view) => view.id)).toEqual(['left-eye', 'right-eye']);
    expect(renderViews[0].deckViewport).not.toBe(renderViews[1].deckViewport);
    expect(renderViews[0].deckViewport.position[0]).toBeLessThan(
      renderViews[1].deckViewport.position[0]
    );
    expect(manager.getViewState().position).toBeUndefined();

    manager.setViewState({longitude: -73.9});
    expect(manager.makeRenderView({id: 'updated', width: 400, height: 300}).deckViewport.longitude).toBe(
      -73.9
    );
  });

  it('creates usable FirstPersonView and GlobeView eye viewports', () => {
    const firstPersonManager = new WebXRViewManager({
      view: new WebXRFirstPersonView({id: 'first-person', far: 20000}),
      viewState: {
        longitude: -74,
        latitude: 40.7,
        position: [0, 0, 200],
        bearing: 0,
        pitch: 45
      }
    });
    const globeManager = new WebXRViewManager({
      view: new WebXRGlobeView({id: 'globe'}),
      viewState: {longitude: -74, latitude: 40.7, zoom: 2}
    });

    expect(firstPersonManager.makeStereoRenderViews({width: 400, height: 300})).toHaveLength(2);
    expect(globeManager.makeStereoRenderViews({width: 400, height: 300})[0].hostFrame.projection).toMatchObject(
      {type: 'globe'}
    );
  });

  it('feeds WebXR eye matrices through the selected view subclass', () => {
    const manager = new WebXRViewManager({
      view: new WebXRMapView({id: 'map'}),
      viewState: {longitude: -74, latitude: 40.7, zoom: 14}
    });
    const identity = new Matrix4();
    const frameState = {
      views: [
        {
          eye: 'left',
          index: 0,
          viewport: [0, 0, 500, 500],
          viewMatrix: identity,
          projectionMatrix: identity
        },
        {
          eye: 'right',
          index: 1,
          viewport: [500, 0, 500, 500],
          viewMatrix: identity,
          projectionMatrix: identity
        }
      ]
    };

    const renderViews = manager.makeXRRenderViews({
      frameState,
      placementMatrix: new Matrix4().translate([1, 2, 3])
    });

    expect(renderViews).toHaveLength(2);
    expect(renderViews[0].viewport).toEqual({x: 0, y: 0, width: 500, height: 500});
    expect(renderViews[1].viewport.x).toBe(500);
    expect(renderViews[0].camera.view[12]).toBe(1);
    expect(renderViews[0].view).toBe(manager.view);
    expect(renderViews[0].viewState).toBe(manager.getViewState());
  });
});
