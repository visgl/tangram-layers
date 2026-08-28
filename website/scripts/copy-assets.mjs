import {cp, mkdir, rm} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const websiteDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDirectory = resolve(websiteDirectory, '..');
const staticDirectory = resolve(websiteDirectory, 'static');

await rm(resolve(staticDirectory, 'examples'), {recursive: true, force: true});
await rm(resolve(staticDirectory, 'modules'), {recursive: true, force: true});
await mkdir(resolve(staticDirectory, 'examples'), {recursive: true});
await mkdir(resolve(staticDirectory, 'modules/tangram-renderer/dist'), {recursive: true});
await mkdir(resolve(staticDirectory, 'modules/tangram-layers/dist'), {recursive: true});

await cp(resolve(repositoryDirectory, 'examples/deck'), resolve(staticDirectory, 'examples/deck'), {
  recursive: true
});
await cp(
  resolve(repositoryDirectory, 'examples/fonts/montserrat.woff'),
  resolve(staticDirectory, 'examples/fonts/montserrat.woff')
);
await cp(
  resolve(repositoryDirectory, 'examples/images/wheel.png'),
  resolve(staticDirectory, 'examples/images/wheel.png')
);
await cp(
  resolve(repositoryDirectory, 'modules/tangram-renderer/dist/tangram.debug.mjs'),
  resolve(staticDirectory, 'modules/tangram-renderer/dist/tangram.debug.mjs')
);
await cp(
  resolve(repositoryDirectory, 'modules/tangram-renderer/dist/index.js'),
  resolve(staticDirectory, 'modules/tangram-renderer/dist/index.js')
);
await cp(
  resolve(repositoryDirectory, 'modules/tangram-layers/dist/index.js'),
  resolve(staticDirectory, 'modules/tangram-layers/dist/index.js')
);
await cp(resolve(repositoryDirectory, 'robots.txt'), resolve(staticDirectory, 'robots.txt'));
