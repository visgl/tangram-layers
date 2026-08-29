import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';

const repositoryDirectory = resolve(new URL('..', import.meta.url).pathname);
const files = [
  ['Deck example source', 'examples/deck/app.js'],
  ['TangramLayer package entry', 'modules/tangram-layers/dist/index.js'],
  ['Tangram renderer package shim', 'modules/tangram-renderer/dist/index.js'],
  ['Tangram renderer minified ESM', 'modules/tangram-renderer/dist/tangram.min.mjs'],
  ['Tangram renderer debug ESM', 'modules/tangram-renderer/dist/tangram.debug.mjs']
];

const measurements = [];
for (const [label, relativePath] of files) {
  const contents = await readFile(resolve(repositoryDirectory, relativePath));
  measurements.push({label, bytes: contents.byteLength, gzipBytes: gzipSync(contents).byteLength});
}

const layer = measurements.find(({label}) => label === 'TangramLayer package entry');
const renderer = measurements.find(({label}) => label === 'Tangram renderer minified ESM');
const combined = {
  label: 'TangramLayer + minified renderer',
  bytes: layer.bytes + renderer.bytes,
  gzipBytes: layer.gzipBytes + renderer.gzipBytes
};

console.log('| Asset | Raw | Gzip |');
console.log('| --- | ---: | ---: |');
for (const measurement of [...measurements, combined]) {
  console.log(`| ${measurement.label} | ${formatBytes(measurement.bytes)} | ${formatBytes(measurement.gzipBytes)} |`);
}
console.log('\nThe combined row is an additive upper bound; a production bundler may deduplicate and tree-shake shared dependencies.');

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
