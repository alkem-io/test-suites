import { describe, it, expect } from 'vitest';
import { computeCoverageDefects } from '../src/join/coverage-defects.js';
import type { FeatureLibrary, ReleasePlan, TestCase, CodeTag } from '../src/types.js';

function baseCase(id: string, overrides: Partial<TestCase> = {}): TestCase {
  return {
    id,
    title: `Case ${id}`,
    feature: 'F',
    file: `/virtual/${id}.md`,
    priority: 'P1',
    type: 'functional',
    state: 'Ready',
    automation: 'optional',
    links: {},
    steps: '',
    expected: '',
    coveredBy: [],
    latestOutcomes: {},
    ...overrides,
  };
}

function library(cases: TestCase[]): FeatureLibrary {
  return { feature: 'F', slug: 'f', path: '/virtual/f.md', cases };
}

function plan(release: string, inScope: string[]): ReleasePlan {
  return { release, path: `/virtual/${release}.md`, inScope, manualOutcomes: {} };
}

function tag(file: string, caseIds: string[]): CodeTag {
  return { file, line: 1, construct: 'describe', caseIds };
}

describe('join/coverage-defects', () => {
  it('detects orphan-automation from a file list', () => {
    const defects = computeCoverageDefects({
      libraries: [library([baseCase('TC-1')])],
      releasePlans: [],
      tags: [],
      orphanFiles: ['server-api/foo.it-spec.ts'],
    });
    expect(defects.filter(d => d.kind === 'orphan-automation')).toHaveLength(1);
    expect(defects[0].where).toBe('server-api/foo.it-spec.ts');
  });

  it('detects unknown-case-ref from a tag that points to a nonexistent case', () => {
    const defects = computeCoverageDefects({
      libraries: [library([baseCase('TC-1')])],
      releasePlans: [],
      tags: [tag('f.it-spec.ts', ['TC-9999'])],
      orphanFiles: [],
    });
    const unknown = defects.filter(d => d.kind === 'unknown-case-ref');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].caseId).toBe('TC-9999');
  });

  it('detects missing-required-automation for Ready+required cases with no covering tag', () => {
    const c = baseCase('TC-1', { automation: 'required' });
    const defects = computeCoverageDefects({
      libraries: [library([c])],
      releasePlans: [],
      tags: [],
      orphanFiles: [],
    });
    expect(defects.some(d => d.kind === 'missing-required-automation' && d.caseId === 'TC-1')).toBe(true);
  });

  it('does NOT flag retired cases as missing-required-automation', () => {
    const c = baseCase('TC-1', { automation: 'required', state: 'Retired' });
    const defects = computeCoverageDefects({
      libraries: [library([c])],
      releasePlans: [],
      tags: [],
      orphanFiles: [],
    });
    expect(defects.some(d => d.kind === 'missing-required-automation')).toBe(false);
  });

  it('detects stale-release-ref for a release plan that references a retired case', () => {
    const retired = baseCase('TC-1', { state: 'Retired' });
    const defects = computeCoverageDefects({
      libraries: [library([retired])],
      releasePlans: [plan('R31', ['TC-1'])],
      tags: [],
      orphanFiles: [],
    });
    const stale = defects.filter(d => d.kind === 'stale-release-ref');
    expect(stale).toHaveLength(1);
    expect(stale[0].caseId).toBe('TC-1');
    expect(stale[0].where).toContain('R31');
  });

  it('detects stale-release-ref for a release plan that references a deleted case', () => {
    const defects = computeCoverageDefects({
      libraries: [library([])],
      releasePlans: [plan('R31', ['TC-404'])],
      tags: [],
      orphanFiles: [],
    });
    const stale = defects.filter(d => d.kind === 'stale-release-ref');
    expect(stale).toHaveLength(1);
    expect(stale[0].caseId).toBe('TC-404');
  });

  it('returns an empty array when there are no defects', () => {
    const covered = baseCase('TC-1', { automation: 'required' });
    const defects = computeCoverageDefects({
      libraries: [library([covered])],
      releasePlans: [plan('R31', ['TC-1'])],
      tags: [tag('f.it-spec.ts', ['TC-1'])],
      orphanFiles: [],
    });
    expect(defects).toEqual([]);
  });

  it('aggregates all four defect kinds in one pass', () => {
    const required = baseCase('TC-1', { automation: 'required' });
    const retired = baseCase('TC-2', { state: 'Retired' });
    const defects = computeCoverageDefects({
      libraries: [library([required, retired])],
      releasePlans: [plan('R31', ['TC-2', 'TC-404'])],
      tags: [tag('f.it-spec.ts', ['TC-9999'])],
      orphanFiles: ['server-api/bar.it-spec.ts'],
    });
    const kinds = new Set(defects.map(d => d.kind));
    expect(kinds).toEqual(new Set([
      'orphan-automation',
      'unknown-case-ref',
      'missing-required-automation',
      'stale-release-ref',
    ]));
  });
});
