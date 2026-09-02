// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

module.exports = {
    parser: "@babel/eslint-parser",
    "env": {
        "browser": true,
        "worker": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module",
        "requireConfigFile": false,
        "babelOptions": {
            "presets": ["@babel/preset-typescript"]
        }
    },
    "rules": {
        "indent": ["error", 4 ],
        "linebreak-style": ["error", "unix"],
        "quotes": ["error", "single"],
        "semi": ["error", "always"]
    },
    "overrides": [{
        "files": ["**/*.ts"],
        "rules": {
            "indent": "off",
            "no-undef": "off",
            "no-unused-vars": "off"
        }
    }
    ]
};
