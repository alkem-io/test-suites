import path from 'node:path';
import type { GlobalFlags } from '../cli.js';
import type { CoverageDefect } from '../types.js';
import { loadFeatureLibraries } from '../parse/feature-library.js';
import { loadReleasePlans } from '../parse/release-plan.js';
import { scanCodeTags } from '../parse/code-tags.js';
import { computeCoverageDefects } from '../join/coverage-defects.js';
import { findRepoRoot } from '../util/repo-root.js';

const DEFAULT_SCAN_PATTERN_TEMPLATES = [
  'server-api/src/functional-api/**/*.it-spec.ts',
  'client-web/src/functional-e2e/**/*.spec.ts',
];

export function resolveScanPatterns(): string[] {
  const root = findRepoRoot();
  return DEFAULT_SCAN_PATTERN_TEMPLATES.map(p => path.join(root, p));
}

export async function scanCommand(flags: GlobalFlags): Promise<number> {
  const libraries = await loadFeatureLibraries(flags.contentRoot);
  const releasePlans = await loadReleasePlans(flags.contentRoot);
  const scan = await scanCodeTags(resolveScanPatterns(), { relativeTo: findRepoRoot() });

  const defects = computeCoverageDefects({
    libraries,
    releasePlans,
    tags: scan.tags,
    orphanFiles: scan.orphanFiles,
  });

  printDefects(defects);

  if (defects.length === 0) {
    console.log('[test-plans] scan: no coverage defects');
    return 0;
  }
  return flags.strict ? 1 : 0;
}

function printDefects(defects: CoverageDefect[]): void {
  const byKind = new Map<string, CoverageDefect[]>();
  for (const d of defects) {
    if (!byKind.has(d.kind)) byKind.set(d.kind, []);
    byKind.get(d.kind)!.push(d);
  }
  for (const [kind, list] of byKind) {
    console.log(`\n== ${kind} (${list.length}) ==`);
    for (const d of list) {
      console.log(`  - ${d.where}${d.caseId ? ` [${d.caseId}]` : ''}: ${d.detail}`);
    }
  }
}
