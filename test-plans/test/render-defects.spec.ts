import { describe, it, expect } from 'vitest';
import { renderDefectsView, defectsToCsv } from '../src/render/dashboard.js';
import type { CoverageDefect } from '../src/types.js';

const allFourKinds: CoverageDefect[] = [
  { kind: 'orphan-automation',          where: 'server-api/a.it-spec.ts', detail: 'no @testCase tag' },
  { kind: 'unknown-case-ref',           where: 'server-api/b.it-spec.ts:42', detail: 'references TC-9999', caseId: 'TC-9999' },
  { kind: 'missing-required-automation', where: 'content/features/x.md', detail: 'TC-1 is required', caseId: 'TC-1' },
  { kind: 'stale-release-ref',          where: 'content/releases/R31.md', detail: 'TC-2 is retired', caseId: 'TC-2' },
];

describe('render/dashboard — renderDefectsView', () => {
  it('renders all four sections with their defects', async () => {
    const html = await renderDefectsView({
      defects: allFourKinds,
      generatedAt: '2026-04-17T12:00:00Z',
      depth: 0,
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('orphan-automation');
    expect(html).toContain('unknown-case-ref');
    expect(html).toContain('missing-required-automation');
    expect(html).toContain('stale-release-ref');
    expect(html).toContain('TC-9999');
    expect(html).toContain('TC-2 is retired');
    expect(html).toContain('defects.csv');
  });

  it('renders an empty state when there are no defects', async () => {
    const html = await renderDefectsView({
      defects: [],
      generatedAt: '2026-04-17T12:00:00Z',
      depth: 0,
    });
    expect(html).toMatch(/No coverage defects/i);
  });
});

describe('render/dashboard — defectsToCsv', () => {
  it('produces a header row + one row per defect', () => {
    const csv = defectsToCsv(allFourKinds);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('kind,caseId,where,detail');
    expect(lines).toHaveLength(1 + allFourKinds.length);
    expect(lines[2]).toMatch(/TC-9999/);
  });

  it('escapes fields containing commas or quotes', () => {
    const csv = defectsToCsv([
      { kind: 'orphan-automation', where: 'file, with comma.ts', detail: 'quote: "x"' },
    ]);
    expect(csv).toContain('"file, with comma.ts"');
    expect(csv).toContain('"quote: ""x"""');
  });
});
