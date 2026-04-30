import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCodeTags, scanString } from '../src/parse/code-tags.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('parse/code-tags — scanString', () => {
  it('(a) single-ID tag with a single-line comment', () => {
    const tags = scanString(
      '// @testCase TC-0001\ndescribe(\'suite\', () => {});\n',
      'virtual.ts',
    );
    expect(tags).toEqual([
      { file: 'virtual.ts', line: 2, construct: 'describe', caseIds: ['TC-0001'] },
    ]);
  });

  it('(b) comma-separated multi-ID tag', () => {
    const tags = scanString(
      '// @testCase TC-0001, TC-0002\nit(\'x\', () => {});\n',
      'virtual.ts',
    );
    expect(tags[0].caseIds).toEqual(['TC-0001', 'TC-0002']);
  });

  it('(c) whitespace-separated multi-ID tag', () => {
    const tags = scanString(
      '// @testCase TC-0001 TC-0002\ntest(\'x\', () => {});\n',
      'virtual.ts',
    );
    expect(tags[0].caseIds).toEqual(['TC-0001', 'TC-0002']);
  });

  it('(d) JSDoc block comment form', () => {
    const src = [
      '/**',
      ' * @testCase TC-0001, TC-0002',
      ' */',
      'describe(\'suite\', () => {});',
      '',
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    expect(tags).toHaveLength(1);
    expect(tags[0].caseIds).toEqual(['TC-0001', 'TC-0002']);
    expect(tags[0].construct).toBe('describe');
  });

  it('(e-fixture) tag attaches to a test-runner call dispatched through a custom fixture', () => {
    const src = [
      '// @testCase TC-7777',
      'adminFixture.test.describe.serial(\'Suite A\', () => {});',
      '',
      '// @testCase TC-7778',
      'memberFixture.test(\'a direct test\', () => {});',
      '',
      '// @testCase TC-7779',
      'something.test.beforeAll(() => {});', // hook — MUST NOT be matched
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    // Expect exactly 2 tags matched (the two real tests), not 3
    expect(tags.map(t => t.caseIds[0])).toEqual(['TC-7777', 'TC-7778']);
    expect(tags[0].construct).toBe('describe');
    expect(tags[1].construct).toBe('test');
  });

  it('(e) tag attaches to an `it.only` / `describe.skip` variant', () => {
    const src = [
      '// @testCase TC-0001',
      'it.only(\'x\', () => {});',
      '',
      '// @testCase TC-0002',
      'describe.skip(\'y\', () => {});',
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    expect(tags.map(t => t.caseIds[0])).toEqual(['TC-0001', 'TC-0002']);
    expect(tags.map(t => t.construct)).toEqual(['it', 'describe']);
  });

  it('(f) multiple tagged blocks in one file', () => {
    const src = [
      '// @testCase TC-0001',
      'describe(\'outer\', () => {',
      '',
      '  // @testCase TC-0002',
      '  it(\'inner\', () => {});',
      '});',
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    expect(tags).toHaveLength(2);
    expect(tags.map(t => t.caseIds[0])).toEqual(['TC-0001', 'TC-0002']);
  });

  it('(g) tag that does not precede a describe/it/test is ignored', () => {
    const src = [
      '// @testCase TC-0001',
      'const notATest = 42;',
      '',
      'function thing() {',
      '  return 1;',
      '}',
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    expect(tags).toHaveLength(0);
  });

  it('(h) files with no tags produce an empty result', () => {
    const src = [
      'describe(\'nothing tagged\', () => {',
      '  it(\'a thing\', () => {});',
      '});',
    ].join('\n');
    const tags = scanString(src, 'virtual.ts');
    expect(tags).toEqual([]);
  });
});

describe('parse/code-tags — scanCodeTags (full file glob)', () => {
  it('parses every form in the tagged-automation fixture', async () => {
    const result = await scanCodeTags([path.join(fixturesDir, 'tagged-automation.ts')]);
    expect(result.tags.length).toBeGreaterThanOrEqual(5);
    const allCaseIds = new Set(result.tags.flatMap(t => t.caseIds));
    expect(allCaseIds.has('TC-9001')).toBe(true);
    expect(allCaseIds.has('TC-9002')).toBe(true);
    expect(allCaseIds.has('TC-9999')).toBe(true);
    expect(result.orphanFiles).toEqual([]);
  });

  it('flags the orphan-automation fixture as an orphan file', async () => {
    const result = await scanCodeTags([
      path.join(fixturesDir, 'orphan-automation.ts'),
      path.join(fixturesDir, 'tagged-automation.ts'),
    ]);
    expect(result.orphanFiles).toContain(path.join(fixturesDir, 'orphan-automation.ts'));
    expect(result.orphanFiles).not.toContain(path.join(fixturesDir, 'tagged-automation.ts'));
  });

  it('tolerates unknown paths without throwing', async () => {
    const result = await scanCodeTags([path.join(fixturesDir, 'does-not-exist.ts')]);
    expect(result.tags).toEqual([]);
    expect(result.orphanFiles).toEqual([]);
  });
});
