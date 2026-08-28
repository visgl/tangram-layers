import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(packageDirectory, 'dist/index.js');

await mkdir(dirname(outputPath), {recursive: true});
await writeFile(
  outputPath,
  `import Tangram from './tangram.debug.mjs';\n\n` +
    `const {leafletLayer, Scene, ClassicWebGLRenderer, LumaDeviceRenderer, debug, version} = Tangram;\n` +
    `const Renderer = ClassicWebGLRenderer;\n\n` +
    `export {leafletLayer, Scene, ClassicWebGLRenderer, Renderer, LumaDeviceRenderer, debug, version};\n` +
    `export default Tangram;\n`
);
