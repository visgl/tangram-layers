// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

export type DebugSettings = {
  draw_label_collision_boxes: boolean;
  draw_label_texture_boxes: boolean;
  suppress_label_fade_in: boolean;
  suppress_label_snap_animation: boolean;
  show_hidden_labels: boolean;
  layer_stats: boolean;
  wireframe: boolean;
};

export const debugSettings: DebugSettings = {
  // draws a blue rectangle border around the collision box of a label
  draw_label_collision_boxes: false,

  // draws a green rectangle border within the texture box of a label
  draw_label_texture_boxes: false,

  // suppresses fade-in of labels
  suppress_label_fade_in: false,

  // suppresses animation of label snap to pixel grid
  suppress_label_snap_animation: false,

  // show hidden labels for debugging
  show_hidden_labels: false,

  // collect feature/geometry stats on styling layers
  layer_stats: false,

  // draw scene in wireframe mode
  wireframe: false
};

export default debugSettings;

export function mergeDebugSettings(settings: Partial<DebugSettings>): void {
  Object.assign(debugSettings, settings);
}
