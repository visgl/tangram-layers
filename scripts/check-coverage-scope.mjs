// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const generatedPathPattern = new RegExp(`(?:^|[\\${sep}])(build|dist|node_modules|vendor)(?:[\\${sep}]|$)`);

export function collectAuthoredSourceFiles(directoryPath) {
  return readdirSync(directoryPath, {withFileTypes: true}).flatMap(directoryEntry => {
    const filePath = join(directoryPath, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      return collectAuthoredSourceFiles(filePath);
    }
    if (/\.(js|ts)$/.test(directoryEntry.name) && !directoryEntry.name.endsWith('.d.ts')) {
      return [resolve(filePath)];
    }
    return [];
  });
}

export function getCoverageScopeDiagnostics({
  authoredSourceFiles,
  coverageSummary,
  rendererSourcePath
}) {
  const sourceRoot = resolve(rendererSourcePath) + sep;
  const coverageFiles = Object.keys(coverageSummary).filter(filePath => filePath !== 'total');
  const absoluteCoverageFiles = coverageFiles.map(filePath => resolve(filePath));
  const invalidCoverageFiles = absoluteCoverageFiles.filter(absoluteFilePath => {
    const relativeSourcePath = relative(sourceRoot, absoluteFilePath);
    return (
      !relativeSourcePath ||
      relativeSourcePath.startsWith(`..${sep}`) ||
      isAbsolute(relativeSourcePath) ||
      generatedPathPattern.test(absoluteFilePath)
    );
  });
  const coveredFiles = new Set(absoluteCoverageFiles);
  const missingCoverageFiles = authoredSourceFiles
    .map(filePath => resolve(filePath))
    .filter(filePath => !coveredFiles.has(filePath));

  return {coverageFiles, invalidCoverageFiles, missingCoverageFiles};
}

function main() {
  const coveragePath = resolve('coverage/coverage-summary.json');
  const rendererSourcePath = resolve('modules/tangram-renderer/src');
  if (!existsSync(coveragePath)) {
    throw new Error(`Coverage summary not found: ${coveragePath}`);
  }

  const coverageSummary = JSON.parse(readFileSync(coveragePath, 'utf8'));
  const authoredSourceFiles = collectAuthoredSourceFiles(rendererSourcePath);
  const {coverageFiles, invalidCoverageFiles, missingCoverageFiles} = getCoverageScopeDiagnostics({
    authoredSourceFiles,
    coverageSummary,
    rendererSourcePath
  });

  if (invalidCoverageFiles.length > 0) {
    throw new Error(
      `Coverage includes files outside authored renderer source:\n${invalidCoverageFiles.join('\n')}`
    );
  }
  if (missingCoverageFiles.length > 0) {
    throw new Error(
      `Coverage omits authored renderer source files:\n${missingCoverageFiles.join('\n')}`
    );
  }

  console.log(`Coverage scope is valid (${coverageFiles.length} renderer source files).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
