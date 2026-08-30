// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {extname} from 'node:path';

const SPDX_LINE = 'SPDX-License-Identifier: MIT';
const TANGRAM_COPYRIGHT = 'Copyright (c) 2013-2016 Brett Camper and Mapzen';
const VISGL_COPYRIGHT = 'Copyright (c) vis.gl contributors';

const LINE_COMMENT_EXTENSIONS = new Set(['.cjs', '.glsl', '.js', '.mjs', '.ts']);
const HASH_COMMENT_EXTENSIONS = new Set(['.yaml', '.yml']);
const BLOCK_COMMENT_EXTENSIONS = new Set(['.css']);
const HTML_COMMENT_EXTENSIONS = new Set(['.html', '.md', '.svg']);

const COMMENTABLE_SPECIAL_FILES = new Map([
  ['.editorconfig', 'hash'],
  ['.gitignore', 'hash'],
  ['robots.txt', 'hash'],
  ['biome.jsonc', 'line']
]);

const VENDORED_PATH_PREFIXES = [
  'examples/classic/lib/'
];

const NEW_RENDERER_SOURCE_FILES = new Set([
  'modules/tangram-renderer/src/gl/uniform_buffer.js',
  'modules/tangram-renderer/src/scene/host_frame.js',
  'modules/tangram-renderer/src/scene/renderer.js',
  'modules/tangram-renderer/src/styles/lines/lines_wgsl.js',
  'modules/tangram-renderer/src/styles/points/points_wgsl.js',
  'modules/tangram-renderer/src/styles/polygons/polygons_wgsl.js',
  'modules/tangram-renderer/src/styles/style-schema.js',
  'modules/tangram-renderer/src/styles/text/text_wgsl.js'
]);

const NEW_RENDERER_TEST_FILES = new Set([
  'modules/tangram-renderer/test/host_frame_spec.js',
  'modules/tangram-renderer/test/lines_wgsl_spec.js',
  'modules/tangram-renderer/test/luma_device_renderer_spec.js',
  'modules/tangram-renderer/test/points_wgsl_spec.js',
  'modules/tangram-renderer/test/polygons_wgsl_spec.js',
  'modules/tangram-renderer/test/renderer_spec.js',
  'modules/tangram-renderer/test/shader_program_spec.js',
  'modules/tangram-renderer/test/text_wgsl_spec.js',
  'modules/tangram-renderer/test/texture_spec.js',
  'modules/tangram-renderer/test/uniform_buffer_spec.js',
  'modules/tangram-renderer/test/vbo_mesh_spec.js'
]);

const TANGRAM_ROOT_FILES = new Set([
  '.editorconfig',
  '.eslintrc.cjs',
  '.gitignore',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'ISSUE_TEMPLATE.md',
  'README.md',
  'babel.config.js',
  'circle.yml',
  'karma.conf.js',
  'modules/tangram-renderer/README.md',
  'modules/tangram-renderer/build/bundle.mjs',
  'modules/tangram-renderer/build/intro.js',
  'modules/tangram-renderer/rollup.config.mjs'
]);

const TANGRAM_CLASSIC_FILES = new Set([
  'examples/classic/app/gui.js',
  'examples/classic/app/key.js',
  'examples/classic/app/rStats.js',
  'examples/classic/app/url.js',
  'examples/classic/css/main.css',
  'examples/classic/index.html',
  'examples/classic/main.js',
  'examples/classic/scene.yaml',
  'examples/classic/styles/dots.yaml',
  'examples/classic/styles/halftone.yaml',
  'examples/classic/styles/popup.yaml',
  'examples/classic/styles/rainbow.yaml',
  'examples/classic/styles/water.yaml',
  'examples/classic/styles/wood.yaml'
]);

function getTrackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'})
    .split('\0')
    .filter(Boolean);
}

function getCommentStyle(filePath) {
  if (VENDORED_PATH_PREFIXES.some(prefix => filePath.startsWith(prefix))) {
    return null;
  }

  const specialStyle = COMMENTABLE_SPECIAL_FILES.get(filePath);
  if (specialStyle) {
    return specialStyle;
  }

  const extension = extname(filePath);
  if (LINE_COMMENT_EXTENSIONS.has(extension)) {
    return 'line';
  }
  if (HASH_COMMENT_EXTENSIONS.has(extension)) {
    return 'hash';
  }
  if (BLOCK_COMMENT_EXTENSIONS.has(extension)) {
    return 'block';
  }
  if (HTML_COMMENT_EXTENSIONS.has(extension)) {
    return 'html';
  }
  return null;
}

function isTangramInherited(filePath) {
  if (TANGRAM_ROOT_FILES.has(filePath) || TANGRAM_CLASSIC_FILES.has(filePath)) {
    return true;
  }

  if (filePath.startsWith('modules/tangram-renderer/dist/tangram.')) {
    return true;
  }

  if (filePath.startsWith('modules/tangram-renderer/src/')) {
    return !NEW_RENDERER_SOURCE_FILES.has(filePath) &&
      !filePath.startsWith('modules/tangram-renderer/src/gpu/');
  }

  if (filePath.startsWith('modules/tangram-renderer/test/')) {
    return !NEW_RENDERER_TEST_FILES.has(filePath);
  }

  return false;
}

function getHeader(filePath, commentStyle) {
  const projectName = isTangramInherited(filePath) ? 'Tangram' : 'tangram-layers';
  const copyright = isTangramInherited(filePath) ? TANGRAM_COPYRIGHT : VISGL_COPYRIGHT;
  const lines = [projectName, SPDX_LINE, copyright];

  switch (commentStyle) {
    case 'line':
      return `${lines.map(line => `// ${line}`).join('\n')}\n\n`;
    case 'hash':
      return `${lines.map(line => `# ${line}`).join('\n')}\n\n`;
    case 'block':
      return `/*\n${lines.map(line => ` * ${line}`).join('\n')}\n */\n\n`;
    case 'html':
      return `<!--\n${lines.join('\n')}\n-->\n\n`;
    default:
      throw new Error(`Unsupported comment style: ${commentStyle}`);
  }
}

function insertHeader(filePath, source, header) {
  const insertionIndex = getHeaderInsertionIndex(filePath, source);
  return `${source.slice(0, insertionIndex)}${header}${source.slice(insertionIndex)}`;
}

function getHeaderInsertionIndex(filePath, source) {
  if (source.startsWith('#!')) {
    const newlineIndex = source.indexOf('\n');
    return newlineIndex + 2;
  }

  if (filePath.endsWith('.md') && source.startsWith('---\n')) {
    const closingFrontMatterIndex = source.indexOf('\n---\n', 4);
    if (closingFrontMatterIndex >= 0) {
      return closingFrontMatterIndex + 6;
    }
  }

  if (filePath.endsWith('.html') && /^<!doctype html>/i.test(source)) {
    const newlineIndex = source.indexOf('\n');
    return newlineIndex + 1;
  }

  return 0;
}

const writeHeaders = process.argv.includes('--write');
const missingHeaders = [];
const incorrectCopyrights = [];

for (const filePath of getTrackedFiles()) {
  const commentStyle = getCommentStyle(filePath);
  if (!commentStyle) {
    continue;
  }

  const source = readFileSync(filePath, 'utf8');
  const expectedHeader = getHeader(filePath, commentStyle);
  const expectedHeaderCore = expectedHeader.trimEnd();
  const insertionIndex = getHeaderInsertionIndex(filePath, source);
  const sourceAtHeader = source.slice(insertionIndex);
  if (sourceAtHeader.startsWith(expectedHeaderCore)) {
    continue;
  }

  const headerPreamble = sourceAtHeader.slice(0, 300);
  const startsWithComment = headerPreamble.startsWith('//') ||
    headerPreamble.startsWith('#') ||
    headerPreamble.startsWith('/*') ||
    headerPreamble.startsWith('<!--');
  if (startsWithComment && headerPreamble.includes(SPDX_LINE)) {
    incorrectCopyrights.push(filePath);
    continue;
  }

  if (writeHeaders) {
    writeFileSync(filePath, insertHeader(filePath, source, expectedHeader));
  } else {
    missingHeaders.push(filePath);
  }
}

if (missingHeaders.length || incorrectCopyrights.length) {
  if (missingHeaders.length) {
    console.error(`Missing SPDX license headers:\n${missingHeaders.map(file => `  ${file}`).join('\n')}`);
  }
  if (incorrectCopyrights.length) {
    console.error(
      `Files with incorrect copyright attribution:\n${incorrectCopyrights.map(file => `  ${file}`).join('\n')}`
    );
  }
  console.error('\nRun yarn lint:licenses:fix to update headers.');
  process.exitCode = 1;
} else if (writeHeaders) {
  console.log('Updated SPDX license headers.');
} else {
  console.log('SPDX license headers are current.');
}
