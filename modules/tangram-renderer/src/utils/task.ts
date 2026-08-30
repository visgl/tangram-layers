// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

/** State shared by cooperative tasks for the current frame. */
export type TaskState = Record<string, unknown> & {user_moving_view?: boolean};

/** A cooperative task scheduled by the renderer. */
export interface TaskRecord<Value = unknown> {
  id?: number;
  max_time?: number;
  pause_factor?: number;
  pause?: number;
  immediate?: boolean;
  user_moving_view?: boolean;
  elapsed?: number;
  total_elapsed?: number;
  start_time?: number;
  tile_id?: unknown;
  stats?: {calls: number};
  promise?: Promise<Value | undefined>;
  resolve?: (value: Value | PromiseLike<Value> | undefined) => void;
  reject?: (reason?: unknown) => void;
  run: (task: TaskRecord<Value>) => unknown;
  cancel?: (task: TaskRecord<Value>) => Value | undefined;
  [property: string]: unknown;
}

/** Cooperative renderer task scheduler. */
export interface TaskManager {
  id: number;
  queue: TaskRecord[];
  max_time: number;
  start_time: number | null;
  elapsed?: number;
  state: TaskState;
  add<Value>(task: TaskRecord<Value>): Promise<Value | undefined>;
  remove<Value>(task: TaskRecord<Value>): void;
  process<Value>(task: TaskRecord<Value>): unknown;
  processAll(): void;
  finish<Value>(task: TaskRecord<Value>, value: Value): Promise<Value | undefined>;
  cancel<Value>(task: TaskRecord<Value>): void;
  shouldContinue<Value>(task: TaskRecord<Value>): boolean;
  removeForTile(tileId: unknown): void;
  setState(state: TaskState): void;
}

/** Shared renderer task scheduler. */
export const Task: TaskManager = {
  id: 0,
  queue: [],
  max_time: 20,
  start_time: null,
  state: {},

  add<Value>(task: TaskRecord<Value>): Promise<Value | undefined> {
    task.id = Task.id++;
    task.max_time = task.max_time || Task.max_time;
    task.pause_factor = task.pause_factor || 1;
    task.promise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    task.elapsed = 0;
    task.total_elapsed = 0;
    task.stats = {calls: 0};
    this.queue.push(task as TaskRecord);

    this.start_time = this.start_time || performance.now();
    this.elapsed = performance.now() - this.start_time;
    if (this.elapsed < Task.max_time || task.immediate) {
      this.process(task);
    }

    return task.promise;
  },

  remove<Value>(task: TaskRecord<Value>): void {
    const index = this.queue.indexOf(task as TaskRecord);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  },

  process<Value>(task: TaskRecord<Value>): unknown {
    if (this.state.user_moving_view && task.user_moving_view === false) {
      return;
    }

    if (task.pause) {
      task.pause--;
      return true;
    }

    task.stats!.calls++;
    task.start_time = performance.now();
    return task.run(task);
  },

  processAll(): void {
    this.start_time = this.start_time || performance.now();
    for (const task of this.queue) {
      if (this.process(task) !== true) {
        if (!task.pause) {
          task.pause = task.elapsed! > task.max_time! ? task.pause_factor : 0;
        }
        task.total_elapsed! += task.elapsed!;
      }

      this.elapsed = performance.now() - this.start_time;
      if (this.elapsed >= Task.max_time) {
        this.start_time = null;
        break;
      }
    }
  },

  finish<Value>(task: TaskRecord<Value>, value: Value): Promise<Value | undefined> {
    task.elapsed = performance.now() - task.start_time!;
    task.total_elapsed! += task.elapsed;
    this.remove(task as TaskRecord);
    task.resolve!(value);
    return task.promise!;
  },

  cancel<Value>(task: TaskRecord<Value>): void {
    const value = task.cancel?.(task);
    task.resolve!(value);
  },

  shouldContinue<Value>(task: TaskRecord<Value>): boolean {
    task.elapsed = performance.now() - task.start_time!;
    this.elapsed = performance.now() - this.start_time!;
    return task.elapsed < task.max_time! && this.elapsed < Task.max_time;
  },

  removeForTile(tileId: unknown): void {
    for (let index = this.queue.length - 1; index >= 0; index--) {
      const task = this.queue[index];
      if (task.tile_id === tileId) {
        this.cancel(task);
        this.queue.splice(index, 1);
      }
    }
  },

  setState(state: TaskState): void {
    this.state = state;
  }
};

export default Task;
