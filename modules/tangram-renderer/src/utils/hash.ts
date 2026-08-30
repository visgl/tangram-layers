// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

// http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
export default function hashString(string: string): number {
  let hash = 0;

  for (let index = 0; index < string.length; index++) {
    hash = (hash << 5) - hash + string.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
