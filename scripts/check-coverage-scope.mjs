// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {existsSync, readFileSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

const coveragePath = resolve('coverage/coverage-summary.json');
const rendererSourcePath = resolve('modules/tangram-renderer/src') + sep;
const generatedPathPattern = new RegExp(`(?:^|[\\${sep}])(build|dist|node_modules|vendor)(?:[\\${sep}]|$)`);

if (!existsSync(coveragePath)) {
  throw new Error(`Coverage summary not found: ${coveragePath}`);
}

const coverageSummary = JSON.parse(readFileSync(coveragePath, 'utf8'));
const coverageFiles = Object.keys(coverageSummary).filter(filePath => filePath !== 'total');
const invalidCoverageFiles = coverageFiles.filter(filePath => {
  const absoluteFilePath = isAbsolute(filePath) ? filePath : resolve(filePath);
  const relativeSourcePath = relative(rendererSourcePath, absoluteFilePath);
  return (
    !relativeSourcePath ||
    relativeSourcePath.startsWith(`..${sep}`) ||
    isAbsolute(relativeSourcePath) ||
    generatedPathPattern.test(absoluteFilePath)
  );
});

if (invalidCoverageFiles.length > 0) {
  throw new Error(
    `Coverage includes files outside authored renderer source:\n${invalidCoverageFiles.join('\n')}`
  );
}

console.log(`Coverage scope is valid (${coverageFiles.length} renderer source files).`);
