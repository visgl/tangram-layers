// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const allowlistPath = resolve(import.meta.dirname, 'typescript-migration-allowlist.json');
const sourceRoots = [
  resolve(repositoryRoot, 'modules/tangram-renderer/src'),
  resolve(repositoryRoot, 'modules/tangram-layers/src')
];

function collectJavaScriptFiles(directoryPath) {
  return readdirSync(directoryPath, {withFileTypes: true}).flatMap(directoryEntry => {
    const filePath = join(directoryPath, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      return collectJavaScriptFiles(filePath);
    }
    return /\.(js|mjs)$/.test(directoryEntry.name) ? [filePath] : [];
  });
}

function getRepositoryPath(filePath) {
  return relative(repositoryRoot, filePath).split(sep).join('/');
}

const allowedJavaScriptFiles = JSON.parse(readFileSync(allowlistPath, 'utf8'));
const currentJavaScriptFiles = sourceRoots
  .flatMap(collectJavaScriptFiles)
  .map(getRepositoryPath)
  .sort();
const allowedFileSet = new Set(allowedJavaScriptFiles);
const currentFileSet = new Set(currentJavaScriptFiles);
const addedFiles = currentJavaScriptFiles.filter(filePath => !allowedFileSet.has(filePath));
const migratedFiles = allowedJavaScriptFiles.filter(filePath => !currentFileSet.has(filePath));

if (addedFiles.length > 0 || migratedFiles.length > 0) {
  const diagnostics = [];
  if (addedFiles.length > 0) {
    diagnostics.push(`New JavaScript source files are not permitted:\n${addedFiles.join('\n')}`);
  }
  if (migratedFiles.length > 0) {
    diagnostics.push(
      `Remove migrated files from ${getRepositoryPath(allowlistPath)}:\n${migratedFiles.join('\n')}`
    );
  }
  throw new Error(diagnostics.join('\n\n'));
}

console.log(
  `TypeScript migration scope is valid (${currentJavaScriptFiles.length} legacy JavaScript files remain).`
);
