<!--
tangram-layers
SPDX-License-Identifier: MIT
Copyright (c) vis.gl contributors
-->

# Tangram WebXR example

This experimental renderer example uses `WebXRManager` and
`WebXRAnimationFrameProvider` from `@luma.gl/experimental`. A single Tangram
scene and tile cache are rendered once per XR view using luma.gl's per-eye
framebuffer, viewport, view matrix and projection matrix. The same renderer can
be explored as a `GlobeView`, physical tabletop `MapView`, or street-level
`FirstPersonView` by passing `?view=globe`, `?view=map`, or
`?view=firstPerson`.

The desktop preview works without an XR device. When no immersive runtime is
available, **Enter VR** renders a side-by-side stereo fallback with distinct
left- and right-eye matrices. A connected headset or the Immersive Web Emulator
exercises the real `immersive-vr` session path. WebGL 2 is the default backend;
select WebGPU only on browsers that expose native WebGPU WebXR.
