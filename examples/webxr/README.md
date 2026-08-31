<!--
tangram-layers
SPDX-License-Identifier: MIT
Copyright (c) vis.gl contributors
-->

# Tangram WebXR example

This experimental renderer example uses `WebXRManager` and
`WebXRAnimationFrameProvider` from `@luma.gl/experimental`. A single Tangram
scene and tile cache are rendered once per XR view using luma.gl's per-eye
framebuffer, viewport, view matrix and projection matrix.

The desktop preview works without an XR device. Entering VR requires a browser
and headset with `immersive-vr` support, or a WebXR emulator. WebGL 2 is the
default backend; select WebGPU only on browsers that expose native WebGPU WebXR.
