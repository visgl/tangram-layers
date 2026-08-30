// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import log from './log';

export type EventListener = (...data: unknown[]) => void;
export type EventListeners = Record<string, EventListener | unknown>;

export type SubscriptionMethods = {
  subscribe(listener: EventListeners): void;
  unsubscribe(listener: EventListeners): void;
  unsubscribeAll(): void;
  trigger(event: string, ...data: unknown[]): void;
  hasSubscribersFor(event: string): boolean;
};

export default function subscribeMixin<Target extends object>(
  target: Target
): Target & SubscriptionMethods {
  let listeners: EventListeners[] = [];

  return Object.assign(target, {
    subscribe(listener: EventListeners): void {
      if (!listeners.includes(listener)) {
        listeners.push(listener);
      }
    },

    unsubscribe(listener: EventListeners): void {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },

    unsubscribeAll(): void {
      listeners = [];
    },

    trigger(event: string, ...data: unknown[]): void {
      for (const listener of [...listeners]) {
        const handler = listener[event];
        if (typeof handler === 'function') {
          try {
            handler.call(listener, ...data);
          } catch (error) {
            log('warn', `Caught exception in listener for event '${event}':`, error);
          }
        }
      }
    },

    hasSubscribersFor(event: string): boolean {
      return listeners.some(listener => typeof listener[event] === 'function');
    }
  });
}
