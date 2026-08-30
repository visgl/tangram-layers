// tangram-layers
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import {appendFileSync, existsSync, readFileSync} from 'node:fs';

/** Formats the merged Vitest summary as a GitHub Actions job summary table. */
export function formatCoverageSummary(summary) {
  const metrics = [
    ['Statements', summary.statements],
    ['Branches', summary.branches],
    ['Functions', summary.functions],
    ['Lines', summary.lines]
  ];
  const rows = metrics.map(([name, metric]) => `| ${name} | ${metric.pct}% | ${metric.covered}/${metric.total} |`);
  return [
    '## Renderer coverage',
    '',
    '| Metric | Coverage | Covered |',
    '| --- | ---: | ---: |',
    ...rows,
    '',
    'Coverage is merged from the Node and Chromium Vitest projects and scoped to `modules/tangram-renderer/src`.',
    ''
  ].join('\n');
}

const summaryPath = 'coverage/coverage-summary.json';
const outputPath = process.env.GITHUB_STEP_SUMMARY;
if (outputPath && existsSync(summaryPath)) {
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8')).total;
  appendFileSync(outputPath, formatCoverageSummary(summary));
}
