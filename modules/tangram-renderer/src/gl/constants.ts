// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen
// Copyright (c) 2026 vis.gl contributors

// WebGL constants - need to import these separately to make them available in the web worker

export const gl: Record<string, number> = {};
export default gl;

/* DataType */
gl.BYTE                           = 0x1400;
gl.UNSIGNED_BYTE                  = 0x1401;
gl.SHORT                          = 0x1402;
gl.UNSIGNED_SHORT                 = 0x1403;
gl.INT                            = 0x1404;
gl.UNSIGNED_INT                   = 0x1405;
gl.FLOAT                          = 0x1406;
