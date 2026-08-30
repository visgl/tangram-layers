// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

/*

Expected globals:
light_accumulator_*

*/

struct AmbientLight {
    vec3 ambient;
};

void calculateLight(in AmbientLight _light, in vec3 _eyeToPoint, in vec3 _normal) {
    light_accumulator_ambient.rgb += _light.ambient;
}
