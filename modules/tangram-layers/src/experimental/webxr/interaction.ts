// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors
// Adapted from visgl/luma.gl WebXR RFC commit 3b6f68a64295bf9cf82930149f5e3491b7c3d969.

import {getWebXRInputRay} from '@luma.gl/experimental';
import type {XRInteractionIntent, XRSpatialRay} from './types.ts';

/** Minimal luma.gl input snapshot consumed by {@link WebXRInputAdapter}. */
export type WebXRInputSnapshot = {
  index: number;
  handedness?: string;
  targetRayMatrix?: readonly number[] | null;
  selectActive?: boolean;
  squeezeActive?: boolean;
  gamepad?: {axes: readonly number[]; buttons?: readonly {pressed?: boolean; value?: number}[]} | null;
};

/** Structural WebXR session contract needed for reference-space negotiation. */
export type WebXRSession = object;

/** WebXR reference-space names supported by the fallback helper. */
export type WebXRReferenceSpaceType =
  | 'viewer'
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded';

/** Options for translating controller axes into navigation intents. */
export type WebXRInputAdapterOptions = {
  moveDeadzone?: number;
  turnDeadzone?: number;
  /** Movement units emitted per second at full stick deflection. */
  moveSpeed?: number;
  /** Degrees emitted per second while the turn stick is held. */
  turnSpeed?: number;
};

/**
 * Converts luma.gl WebXR input snapshots into renderer-independent intents.
 *
 * This deliberately keeps controller policy outside the renderer and deck view.
 */
export class WebXRInputAdapter {
  readonly options: Required<WebXRInputAdapterOptions>;
  private readonly previousSelect = new Map<string, boolean>();
  private readonly previousSqueeze = new Map<string, boolean>();

  constructor(options: WebXRInputAdapterOptions = {}) {
    this.options = {
      moveDeadzone: options.moveDeadzone ?? 0.15,
      turnDeadzone: options.turnDeadzone ?? 0.55,
      moveSpeed: options.moveSpeed ?? 1,
      turnSpeed: options.turnSpeed ?? 30
    };
  }

  /** Translate one XR input frame into time-scaled navigation, pointing, and signal intents. */
  update(
    inputStates: readonly WebXRInputSnapshot[],
    elapsedSeconds: number = 1 / 60
  ): XRInteractionIntent[] {
    const intents: XRInteractionIntent[] = [];
    const activeKeys = new Set<string>();
    for (const inputState of inputStates) {
      const key = `${inputState.handedness || 'none'}:${inputState.index}`;
      activeKeys.add(key);
      const ray = getWebXRInputRay(
        inputState as unknown as Parameters<typeof getWebXRInputRay>[0]
      );
      if (ray) {
        const pointer: XRSpatialRay = {
          origin: [...ray.origin] as XRSpatialRay['origin'],
          direction: [...ray.direction] as XRSpatialRay['direction'],
          handedness: inputState.handedness
        };
        intents.push({type: 'point', pointer, action: 'hover'});
        appendActivationIntent({
          intents,
          active: Boolean(inputState.selectActive),
          previous: this.previousSelect.get(key) || false,
          pointer,
          pressedAction: 'select',
          releasedAction: 'release'
        });
        appendActivationIntent({
          intents,
          active: Boolean(inputState.squeezeActive),
          previous: this.previousSqueeze.get(key) || false,
          pointer,
          pressedAction: 'grab',
          releasedAction: 'release'
        });
      }
      this.previousSelect.set(key, Boolean(inputState.selectActive));
      this.previousSqueeze.set(key, Boolean(inputState.squeezeActive));
      this.appendGamepadIntents(intents, inputState, Math.max(0, elapsedSeconds));
    }
    for (const key of this.previousSelect.keys()) {
      if (!activeKeys.has(key)) {
        this.previousSelect.delete(key);
        this.previousSqueeze.delete(key);
      }
    }
    return intents;
  }

  /** Forget action transitions, for example when an XR session ends. */
  reset(): void {
    this.previousSelect.clear();
    this.previousSqueeze.clear();
  }

  private appendGamepadIntents(
    intents: XRInteractionIntent[],
    inputState: WebXRInputSnapshot,
    elapsedSeconds: number
  ): void {
    const axes = inputState.gamepad?.axes;
    if (!axes || axes.length < 2) {
      return;
    }
    const horizontal = applyDeadzone(axes[axes.length - 2] || 0, this.options.moveDeadzone);
    const vertical = applyDeadzone(axes[axes.length - 1] || 0, this.options.moveDeadzone);
    if (inputState.handedness === 'right') {
      if (Math.abs(horizontal) >= this.options.turnDeadzone) {
        intents.push({
          type: 'navigate',
          action: 'turn',
          delta: [Math.sign(horizontal) * this.options.turnSpeed * elapsedSeconds],
          handedness: inputState.handedness
        });
      }
      return;
    }
    if (horizontal || vertical) {
      intents.push({
        type: 'navigate',
        action: 'move',
        delta: [
          horizontal * this.options.moveSpeed * elapsedSeconds,
          -vertical * this.options.moveSpeed * elapsedSeconds
        ],
        handedness: inputState.handedness
      });
    }
  }
}

/** Configure luma.gl WebXR with ordered reference-space fallbacks. */
export async function setWebXRSessionWithFallback(
  manager: {
    setSession(
      session: WebXRSession,
      options: {referenceSpaceType: WebXRReferenceSpaceType}
    ): Promise<unknown>;
  },
  session: WebXRSession,
  referenceSpaceTypes: readonly WebXRReferenceSpaceType[] = ['local-floor', 'local']
): Promise<WebXRReferenceSpaceType> {
  let lastError: unknown;
  for (const referenceSpaceType of referenceSpaceTypes) {
    try {
      await manager.setSession(session, {referenceSpaceType});
      return referenceSpaceType;
    } catch (error) {
      lastError = error;
      if (!(error instanceof DOMException) || error.name !== 'NotSupportedError') {
        throw error;
      }
    }
  }
  throw lastError || new Error('No requested WebXR reference space is available');
}

function appendActivationIntent({
  intents,
  active,
  previous,
  pointer,
  pressedAction,
  releasedAction
}: {
  intents: XRInteractionIntent[];
  active: boolean;
  previous: boolean;
  pointer: XRSpatialRay;
  pressedAction: 'select' | 'grab';
  releasedAction: 'release';
}): void {
  if (active && !previous) {
    intents.push({type: 'point', pointer, action: pressedAction});
  } else if (!active && previous) {
    intents.push({type: 'point', pointer, action: releasedAction});
  }
}

function applyDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) < deadzone ? 0 : value;
}
