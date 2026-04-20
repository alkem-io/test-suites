import path from 'node:path';
import type { GlobalFlags } from '../cli.js';
import { loadFeatureLibraries } from '../parse/feature-library.js';
import { loadReleasePlans } from '../parse/release-plan.js';
import { scanCodeTags } from '../parse/code-tags.js';
import { computeCoverageDefects } from '../join/coverage-defects.js';
import { findRepoRoot } from '../util/repo-root.js';
import { resolveScanPatterns } from './scan.js';

export interface ValidateResult {
  exitCode: number;
  errors: string[];
  warnings: string[];
}

/**
 * Defect kinds that represent **content-integrity** problems — these must
 * fail CI because they mean the dashboard cannot be rendered correctly or
 * would publish broken references. Process defects (orphan automation,
 * missing required automation) are reported as warnings only: they indicate
 * gaps that QA should close over time, but do not block a PR from landing.
 */
const INTEGRITY_KINDS = new Set(['unknown-case-ref', 'stale-release-ref']);

export async function validateCommand(flags: GlobalFlags): Promise<number> {
  const result = await runValidate(flags);
  for (const w of result.warnings) {
    console.warn(`[test-plans] warn: ${w}`);
  }
  for (const e of result.errors) {
    console.error(`[test-plans] error: ${e}`);
  }
  if (result.exitCode === 0) {
    console.log(result.warnings.length === 0
      ? '[test-plans] validate: ok'
      : `[test-plans] validate: ok (with ${result.warnings.length} warning(s))`);
  }
  return result.exitCode;
}

export interface ValidateOverrides {
  /** Override the test-code scan roots (used by tests to isolate from the real repo). */
  scanPatterns?: string[];
  /** Skip the code scan entirely. Tests can set this to true to avoid noise. */
  skipScan?: boolean;
}

export async function runValidate(flags: GlobalFlags, overrides: ValidateOverrides = {}): Promise<ValidateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let libraries: Awaited<ReturnType<typeof loadFeatureLibraries>> = [];
  try {
    libraries = await loadFeatureLibraries(flags.contentRoot);
  } catch (err) {
    errors.push((err as Error).message);
  }

  let plans: Awaited<ReturnType<typeof loadReleasePlans>> = [];
  try {
    plans = await loadReleasePlans(flags.contentRoot);
  } catch (err) {
    errors.push((err as Error).message);
  }

  if (errors.length > 0) {
    return { exitCode: 1, errors, warnings };
  }

  // Cross-file duplicate detection is already enforced by loadFeatureLibraries.
  // Cross-reference integrity (release plan → case ID) is covered by the
  // coverage-defects layer below as `stale-release-ref`.

  for (const plan of plans) {
    const knownIds = new Set<string>();
    for (const lib of libraries) for (const c of lib.cases) knownIds.add(c.id);
    for (const outcomeId of Object.keys(plan.manualOutcomes)) {
      if (!knownIds.has(outcomeId)) {
        errors.push(
          `release plan ${plan.release} (${plan.path}) records an outcome for unknown case ${outcomeId}`,
        );
      }
    }
  }

  // Scan code + compute defects. Content-integrity defects become errors
  // (fail the build); process defects become warnings.
  let scanTags: Awaited<ReturnType<typeof scanCodeTags>>['tags'] = [];
  let orphanFiles: string[] = [];
  if (!overrides.skipScan) {
    try {
      const patterns = overrides.scanPatterns ?? resolveScanPatterns();
      const scan = await scanCodeTags(patterns, { relativeTo: findRepoRoot() });
      scanTags = scan.tags;
      orphanFiles = scan.orphanFiles;
    } catch (err) {
      warnings.push(`code-scan failed: ${(err as Error).message}`);
    }
  }

  const defects = computeCoverageDefects({
    libraries,
    releasePlans: plans,
    tags: scanTags,
    orphanFiles,
  });

  for (const d of defects) {
    const line = `${d.kind} at ${summarizeWhere(d.where)}${d.caseId ? ` [${d.caseId}]` : ''}: ${d.detail}`;
    if (INTEGRITY_KINDS.has(d.kind)) {
      errors.push(line);
    } else {
      warnings.push(line);
    }
  }

  return {
    exitCode: errors.length === 0 ? 0 : 1,
    errors,
    warnings,
  };
}

function summarizeWhere(where: string): string {
  try {
    return path.relative(process.cwd(), where);
  } catch {
    return where;
  }
}
