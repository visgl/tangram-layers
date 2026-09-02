// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 vis.gl contributors

declare module 'js-yaml' {
    type SafeLoadOptions = {
        json?: boolean;
    };

    const yaml: {
        safeLoad(source: string, options?: SafeLoadOptions): Record<string, any>;
    };

    export default yaml;
}
