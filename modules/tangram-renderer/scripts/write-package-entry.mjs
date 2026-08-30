import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(packageDirectory, 'dist/index.js');
const packageEntry = `import Tangram from './tangram.debug.mjs';

const {leafletLayer, Scene, ClassicWebGLRenderer, HostFrame, LumaDeviceRenderer, debug, version} =
  Tangram;
const Renderer = ClassicWebGLRenderer;

export {
  leafletLayer,
  Scene,
  ClassicWebGLRenderer,
  Renderer,
  HostFrame,
  LumaDeviceRenderer,
  debug,
  version
};
export default Tangram;
`;

await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, packageEntry);
