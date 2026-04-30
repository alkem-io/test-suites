import type {
  CodeTag,
  CoverageDefect,
  FeatureLibrary,
  ReleasePlan,
} from '../types.js';

export interface CoverageDefectInput {
  libraries: FeatureLibrary[];
  releasePlans: ReleasePlan[];
  tags: CodeTag[];
  orphanFiles: string[];
}

/**
 * Compute the full set of coverage defects across the four kinds defined in
 * `specs/004-qa-test-plans/data-model.md`:
 *
 *   1. orphan-automation — a test file exists but has no @testCase tag.
 *   2. unknown-case-ref — a tag references a case ID that is not in any
 *      feature library.
 *   3. missing-required-automation — a case that declared should_automate: yes
 *      and not retired has no covering automated test.
 *   4. stale-release-ref — a release plan references a case that is
 *      retired or no longer defined anywhere.
 */
export function computeCoverageDefects(input: CoverageDefectInput): CoverageDefect[] {
  const defects: CoverageDefect[] = [];
  const { libraries, releasePlans, tags, orphanFiles } = input;

  // Index cases by ID and track which IDs are currently valid (exist anywhere).
  const caseById = new Map<string, FeatureLibrary['cases'][number]>();
  for (const lib of libraries) {
    for (const c of lib.cases) caseById.set(c.id, c);
  }

  // 1. orphan-automation — pass-through from the scanner.
  for (const file of orphanFiles) {
    defects.push({
      kind: 'orphan-automation',
      where: file,
      detail: 'file contains describe/it/test calls but no @testCase tag',
    });
  }

  // 2. unknown-case-ref — tags that don't resolve to a known case.
  // Also collect the set of IDs that DO have a covering tag (for rule 3).
  const coveredIds = new Set<string>();
  for (const tag of tags) {
    for (const id of tag.caseIds) {
      if (caseById.has(id)) {
        coveredIds.add(id);
      } else {
        defects.push({
          kind: 'unknown-case-ref',
          where: `${tag.file}:${tag.line}`,
          detail: `tag references ${id} but no feature library declares it`,
          caseId: id,
        });
      }
    }
  }

  // 3. missing-required-automation — cases that declared should_automate: yes
  //    but have no covering tag.
  for (const lib of libraries) {
    for (const c of lib.cases) {
      if (c.shouldAutomate !== 'yes') continue;
      if (c.state === 'Retired') continue;
      if (coveredIds.has(c.id)) continue;
      defects.push({
        kind: 'missing-required-automation',
        where: c.file,
        detail: `case ${c.id} declares should_automate: yes but no tagged test covers it`,
        caseId: c.id,
      });
    }
  }

  // 4. stale-release-ref — release-plan in-scope references to missing or retired cases.
  for (const plan of releasePlans) {
    for (const caseId of plan.inScope) {
      const c = caseById.get(caseId);
      if (!c) {
        defects.push({
          kind: 'stale-release-ref',
          where: `${plan.path} (release ${plan.release})`,
          detail: `${caseId} is not defined in any feature library`,
          caseId,
        });
      } else if (c.state === 'Retired') {
        defects.push({
          kind: 'stale-release-ref',
          where: `${plan.path} (release ${plan.release})`,
          detail: `${caseId} is Retired but still appears in this release's in-scope list`,
          caseId,
        });
      }
    }
  }

  return defects;
}
