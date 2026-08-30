// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

// WebGL context wrapper

export const Context = {};
export default Context;

let context_id = 0;
const context_scopes = new WeakMap();

// Register a WebGL context for Tangram use without taking ownership of it.
Context.configure = function configure (gl, scope)
{
    if (gl._tangram_id == null) {
        gl._tangram_id = context_id++;
    }
    if (scope) {
        context_scopes.set(gl, scope);
    }
    return gl;
};

// Run WebGL work inside an optional host-managed state scope.
Context.withContext = function withContext (gl, callback)
{
    const scope = gl && context_scopes.get(gl);
    return scope ? scope(callback) : callback();
};

Context.hasContextScope = function hasContextScope (gl)
{
    return Boolean(gl && context_scopes.has(gl));
};

// Setup a WebGL context
// If no canvas element is provided, one is created and added to the document body
Context.getContext = function getContext (canvas, options)
{
    var fullscreen = false;
    if (canvas == null) {
        canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = 0;
        canvas.style.left = 0;
        canvas.style.zIndex = -1;
        document.body.appendChild(canvas);
        fullscreen = true;
    }

    // powerPreference context option spec requires listeners for context loss/restore,
    // though it's not clear these are required in practice.
    // https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2.1
    canvas.addEventListener('webglcontextlost', () => {});
    canvas.addEventListener('webglcontextrestored', () => {});

    var gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    if (!gl) {
        throw new Error('Couldn\'t create WebGL context.');
    }
    Context.configure(gl);

    if (!fullscreen) {
        Context.resize(gl, parseFloat(canvas.style.width), parseFloat(canvas.style.height), options.device_pixel_ratio);
    }
    else {
        Context.resize(gl, window.innerWidth, window.innerHeight, options.device_pixel_ratio);
        window.addEventListener('resize', function () {
            Context.resize(gl, window.innerWidth, window.innerHeight, options.device_pixel_ratio);
        });
    }

    return gl;
};

Context.resize = function (gl, width, height, device_pixel_ratio)
{
    device_pixel_ratio = device_pixel_ratio || window.devicePixelRatio || 1;
    gl.canvas.style.width = width + 'px';
    gl.canvas.style.height = height + 'px';
    gl.canvas.width = Math.round(width * device_pixel_ratio);
    gl.canvas.height = Math.round(height * device_pixel_ratio);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
};
