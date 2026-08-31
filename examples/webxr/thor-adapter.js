// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

const THOR_COMMIT = '1f85d87d52bbd30af34626fa17d3193f7e24dff5';
const THOR_MODULE_URL = `https://esm.sh/gh/NEW-HEAT/thor.gl@${THOR_COMMIT}?bundle&external=@deck.gl/core,@mediapipe/tasks-vision,react`;

/**
 * Start example-only Thor webcam gestures against one logical WebXR presentation.
 *
 * Thor emits mjolnir navigation events through the presentation's shared event
 * manager. Picking uses the logical center-eye viewport, never either stereo half.
 */
export async function startThorGestures({
  presentation,
  canvas,
  onIntent = () => {},
  loadThor = () => import(/* @vite-ignore */ THOR_MODULE_URL)
}) {
  if (!presentation.eventManager) {
    throw new Error('Attach the deck.gl controller before starting Thor gestures');
  }
  const deckAdapter = createThorDeckAdapter({presentation, canvas});
  const {Thor} = await loadThor();
  const thor = new Thor(deckAdapter, {hand: true, face: false});
  const signalNames = ['fist', 'open-palm', 'wave', 'gesture:activate'];
  for (const signalName of signalNames) {
    thor.on(signalName, (data) => {
      const intent = {type: 'signal', action: signalName, data};
      presentation.dispatchInteractionIntent(intent);
      onIntent(intent);
    });
  }
  await thor.start();
  return {
    thor,
    stop() {
      thor.stop?.();
      thor.destroy?.();
    }
  };
}

/** Create the small deck-like surface consumed by thor.gl. */
export function createThorDeckAdapter({presentation, canvas}) {
  return {
    canvas,
    eventManager: presentation.eventManager,
    get props() {
      return {viewState: presentation.getViewState()};
    },
    pickObject({x, y}) {
      const {logicalViewport} = presentation.createFrame({
        width: canvas.width || canvas.clientWidth || 1,
        height: canvas.height || canvas.clientHeight || 1,
        mode: 'mono'
      });
      const coordinate = logicalViewport.unproject?.([x, y]);
      return coordinate ? {coordinate, x, y} : null;
    }
  };
}
