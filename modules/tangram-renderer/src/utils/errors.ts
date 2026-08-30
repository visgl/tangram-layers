// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

export class MethodNotImplemented extends Error {
  constructor(methodName: string) {
    super();
    this.name = 'MethodNotImplemented';
    this.message = 'Method ' + methodName + ' must be implemented in subclass';
  }
}
