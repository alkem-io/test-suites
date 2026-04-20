import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { runValidate } from '../src/commands/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function scratchContentRoot(files: Record<string, string>): Promise<string> {
  const dir = path.join(__dirname, '.tmp', `validate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  for (const [relPath, contents] of Object.entries(files)) {
    const abs = path.join(dir, relPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, contents, 'utf8');
  }
  return dir;
}

afterEach(async () => {
  await rm(path.join(__dirname, '.tmp'), { recursive: true, force: true });
});

const VALID_CASE_A = [
  '## TC-1001 — A',
  '```yaml',
  'priority: P1',
  'type: functional',
  'state: Ready',
  'automation: optional',
  '```',
  '### Steps',
  '1. x',
  '### Expected',
  '- x',
].join('\n');

const VALID_CASE_B = [
  '## TC-1002 — B',
  '```yaml',
  'priority: P2',
  'type: functional',
  'state: Ready',
  'automation: optional',
  '```',
  '### Steps',
  '1. x',
  '### Expected',
  '- x',
].join('\n');

function featureLib(slug: string, cases: string[]): string {
  return ['---', `feature: ${slug}`, `slug: ${slug}`, '---', '', ...cases, ''].join('\n');
}

function releasePlan(release: string, inScope: string[]): string {
  return [
    '---',
    `release: ${release}`,
    '---',
    '',
    '## In-scope cases',
    ...inScope.map(id => `- ${id}`),
    '',
    '## Outcomes',
    '',
  ].join('\n');
}

describe('commands/validate', () => {
  it('passes with valid content', async () => {
    const root = await scratchContentRoot({
      'features/alpha.md': featureLib('alpha', [VALID_CASE_A, VALID_CASE_B]),
      'releases/R50.md': releasePlan('R50', ['TC-1001', 'TC-1002']),
    });
    const result = await runValidate({ contentRoot: root, outDir: 'dist', pullRuns: false, strict: false, runsDir: '', generatedAt: 't' }, { skipScan: true });
    expect(result.exitCode).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on duplicate case ID across two feature libraries', async () => {
    const root = await scratchContentRoot({
      'features/alpha.md': featureLib('alpha', [VALID_CASE_A]),
      'features/beta.md': featureLib('beta', [VALID_CASE_A]),
    });
    const result = await runValidate({ contentRoot: root, outDir: 'dist', pullRuns: false, strict: false, runsDir: '', generatedAt: 't' }, { skipScan: true });
    expect(result.exitCode).toBe(1);
    expect(result.errors.some(e => /duplicate/i.test(e))).toBe(true);
    expect(result.errors.some(e => /TC-1001/.test(e))).toBe(true);
  });

  it('fails when a release plan references a nonexistent case ID', async () => {
    const root = await scratchContentRoot({
      'features/alpha.md': featureLib('alpha', [VALID_CASE_A]),
      'releases/R50.md': releasePlan('R50', ['TC-1001', 'TC-9999']),
    });
    const result = await runValidate({ contentRoot: root, outDir: 'dist', pullRuns: false, strict: false, runsDir: '', generatedAt: 't' }, { skipScan: true });
    expect(result.exitCode).toBe(1);
    expect(result.errors.some(e => /TC-9999/.test(e))).toBe(true);
    expect(result.errors.some(e => /unknown|nonexistent|not found|not defined|stale-release-ref/i.test(e))).toBe(true);
  });

  it('fails on a schema violation in fenced YAML (invalid priority)', async () => {
    const badCase = [
      '## TC-1003 — Bad',
      '```yaml',
      'priority: P5',
      'type: functional',
      'state: Ready',
      'automation: optional',
      '```',
      '### Steps',
      '1. x',
      '### Expected',
      '- x',
    ].join('\n');
    const root = await scratchContentRoot({
      'features/bad.md': featureLib('bad', [badCase]),
    });
    const result = await runValidate({ contentRoot: root, outDir: 'dist', pullRuns: false, strict: false, runsDir: '', generatedAt: 't' }, { skipScan: true });
    expect(result.exitCode).toBe(1);
    expect(result.errors.some(e => /priority|enum|P5/i.test(e))).toBe(true);
  });
});
