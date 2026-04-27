import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReleasePlans, parseReleasePlanString } from '../src/parse/release-plan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('parse/release-plan', () => {
  it('parses front-matter, in-scope list, and outcomes from the fixture', async () => {
    const plans = await loadReleasePlans(fixturesDir);
    const r99 = plans.find(p => p.release === 'R99');
    expect(r99).toBeDefined();
    expect(r99!.targetDate).toBe('2026-04-24');
    expect(r99!.description).toContain('Fixture release plan');
    expect(r99!.inScope).toEqual(['TC-9001', 'TC-9002']);

    const outcome = r99!.manualOutcomes['TC-9002'];
    expect(outcome).toBeDefined();
    expect(outcome.outcome).toBe('blocked');
    expect(outcome.executedAt).toBe('2026-04-22');
    expect(outcome.source).toEqual({ kind: 'manual', by: 'qa-fixture' });
    expect(outcome.release).toBe('R99');
    expect(outcome.caseId).toBe('TC-9002');
  });

  it('tolerates an empty Outcomes section', () => {
    const src = [
      '---',
      'release: R99',
      'target_date: 2026-04-24',
      '---',
      '',
      '## In-scope cases',
      '',
      '- TC-9001',
      '',
      '## Outcomes',
      '',
    ].join('\n');
    const plan = parseReleasePlanString(src, '/virtual/R99.md');
    expect(plan.inScope).toEqual(['TC-9001']);
    expect(plan.manualOutcomes).toEqual({});
  });

  it('rejects an outcome entry missing executed: or by:', () => {
    const src = [
      '---',
      'release: R99',
      '---',
      '',
      '## In-scope cases',
      '- TC-9001',
      '',
      '## Outcomes',
      '',
      '### TC-9001 — passed',
      '- by: tester',
      '',
    ].join('\n');
    expect(() => parseReleasePlanString(src, '/virtual/R99.md')).toThrow(/executed/i);
  });

  it('rejects a release identifier that does not match the convention', () => {
    const src = [
      '---',
      'release: 2026.05',
      '---',
      '',
      '## In-scope cases',
      '- TC-9001',
      '',
      '## Outcomes',
      '',
    ].join('\n');
    expect(() => parseReleasePlanString(src, '/virtual/bad.md')).toThrow(/release/i);
  });

  it('accepts `*` and `+` bullet markers (Obsidian / Prettier round-trip)', () => {
    const src = [
      '---',
      'release: R99',
      '---',
      '',
      '## In-scope cases',
      '',
      '* TC-1001',
      '+ TC-1002',
      '- TC-1003',
      '',
      '## Outcomes',
      '',
      '### TC-1001 — passed',
      '* executed: 2026-04-20',
      '* by: tester',
      '* evidence: smoke',
      '',
    ].join('\n');
    const plan = parseReleasePlanString(src, '/virtual/R99.md');
    expect(plan.inScope).toEqual(['TC-1001', 'TC-1002', 'TC-1003']);
    expect(plan.manualOutcomes['TC-1001']?.outcome).toBe('passed');
    expect(plan.manualOutcomes['TC-1001']?.executedAt).toBe('2026-04-20');
  });

  it('preserves outcome order across multiple cases', () => {
    const src = [
      '---',
      'release: R99',
      '---',
      '',
      '## In-scope cases',
      '- TC-1',
      '- TC-2',
      '- TC-3',
      '',
      '## Outcomes',
      '',
      '### TC-3 — passed',
      '- executed: 2026-04-20',
      '- by: tester',
      '',
      '### TC-1 — failed',
      '- executed: 2026-04-21',
      '- by: tester',
      '',
    ].join('\n');
    const plan = parseReleasePlanString(src, '/virtual/R99.md');
    const orderedKeys = Object.keys(plan.manualOutcomes);
    expect(orderedKeys).toEqual(['TC-3', 'TC-1']);
  });
});
