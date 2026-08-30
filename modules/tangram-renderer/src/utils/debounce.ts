// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

// Debounce a function
// https://davidwalsh.name/javascript-debounce-function
export default function debounce<ThisType, Arguments extends unknown[]>(
  func: (this: ThisType, ...arguments_: Arguments) => void,
  wait: number
): (this: ThisType, ...arguments_: Arguments) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function debounced(this: ThisType, ...arguments_: Arguments): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments_), wait);
  };
}
