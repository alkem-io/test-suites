import { describe, it, expect } from 'vitest';
import { renderLanding, renderArchive, renderRelease } from '../src/render/dashboard.js';
import { joinOutcomes } from '../src/join/outcomes.js';
import type { FeatureLibrary, ReleasePlan, TestCase } from '../src/types.js';

function baseCase(id: string, overrides: Partial<TestCase> = {}): TestCase {
  return {
    id,
    title: `Case ${id}`,
    feature: 'F',
    file: '/virtual/f.md',
    priority: 'P1',
    type: 'integration',
    state: 'Ready',
    shouldAutomate: 'yes',
    links: {},
    steps: '1. do',
    expected: '- ok',
    coveredBy: [],
    automatedTestCount: 0,
    latestOutcomes: {},
    ...overrides,
  };
}

function makeFixture(): { libraries: FeatureLibrary[]; plans: ReleasePlan[] } {
  const cases = [
    baseCase('TC-1', { priority: 'P1' }),
    baseCase('TC-2', { priority: 'P2' }),
    baseCase('TC-3', { priority: 'P3' }),
  ];
  const libraries: FeatureLibrary[] = [{ feature: 'F', slug: 'f', path: '/virtual/f.md', cases }];
  const plans: ReleasePlan[] = [
    { release: 'R31',   targetDate: '2026-04-24', path: '/virtual/R31.md',   inScope: ['TC-1', 'TC-2', 'TC-3'], manualOutcomes: {
      'TC-1': { caseId: 'TC-1', release: 'R31', outcome: 'passed',  executedAt: '2026-04-20', source: { kind: 'manual', by: 't' } },
      'TC-2': { caseId: 'TC-2', release: 'R31', outcome: 'blocked', executedAt: '2026-04-20', source: { kind: 'manual', by: 't' } },
    } },
    { release: 'R31.1', targetDate: '2026-04-27', path: '/virtual/R31.1.md', inScope: ['TC-1'],                manualOutcomes: {} },
    { release: 'R30',   targetDate: '2026-04-17', path: '/virtual/R30.md',   inScope: ['TC-1'],                manualOutcomes: {} },
  ];
  joinOutcomes(libraries, plans, [], []);
  return { libraries, plans };
}

describe('render/dashboard — landing', () => {
  it('lists the current release plus recent 8 with headline metrics', async () => {
    const { libraries, plans } = makeFixture();
    const html = await renderLanding({ releasePlans: plans, libraries, generatedAt: '2026-04-17T12:00:00Z', depth: 0 });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('R31');
    expect(html).toContain('R30');
    expect(html).toContain('R31.1');
    expect(html).toContain('View all');
    // basePrefix at depth 0 = ''
    expect(html).toContain('href="assets/style.css"');
  });

  it('groups a patch release immediately after its parent', async () => {
    const { libraries, plans } = makeFixture();
    const html = await renderLanding({ releasePlans: plans, libraries, generatedAt: '2026-04-17T12:00:00Z', depth: 0 });
    const r31Index = html.indexOf('>R31<');
    const r311Index = html.indexOf('>R31.1<');
    const r30Index = html.indexOf('>R30<');
    expect(r31Index).toBeGreaterThan(-1);
    expect(r311Index).toBeGreaterThan(-1);
    expect(r30Index).toBeGreaterThan(-1);
    // R31 → R31.1 → R30 (most recent first, patches attached to parent)
    expect(r31Index).toBeLessThan(r311Index);
    expect(r311Index).toBeLessThan(r30Index);
  });
});

describe('render/dashboard — archive', () => {
  it('renders all releases regardless of age', async () => {
    const { libraries, plans } = makeFixture();
    const html = await renderArchive({ releasePlans: plans, libraries, generatedAt: '2026-04-17T12:00:00Z', depth: 1 });
    expect(html).toContain('R31');
    expect(html).toContain('R31.1');
    expect(html).toContain('R30');
    // basePrefix at depth 1 = ../
    expect(html).toContain('href="../assets/style.css"');
  });
});

describe('render/dashboard — release', () => {
  it('renders per-release view with headline metrics + in-scope case table', async () => {
    const { libraries, plans } = makeFixture();
    const r31 = plans.find(p => p.release === 'R31')!;
    const html = await renderRelease({ releasePlan: r31, libraries, generatedAt: '2026-04-17T12:00:00Z', depth: 1 });
    expect(html).toContain('R31');
    expect(html).toContain('2026-04-24');
    // All 3 in-scope cases appear
    expect(html).toContain('TC-1');
    expect(html).toContain('TC-2');
    expect(html).toContain('TC-3');
    // Outcome chips for passed/blocked/not-run
    expect(html).toMatch(/chip-outcome-passed[^>]*>passed/);
    expect(html).toMatch(/chip-outcome-blocked[^>]*>blocked/);
    expect(html).toMatch(/chip-outcome-not-run[^>]*>not-run/);
  });

  it('empty-state release (no in-scope cases)', async () => {
    const { libraries } = makeFixture();
    const emptyPlan: ReleasePlan = { release: 'R99', path: '/virtual/R99.md', inScope: [], manualOutcomes: {} };
    const html = await renderRelease({ releasePlan: emptyPlan, libraries, generatedAt: '2026-04-17T12:00:00Z', depth: 1 });
    expect(html).toContain('No test cases in scope');
  });
});
