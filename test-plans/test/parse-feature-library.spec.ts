import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { loadFeatureLibraries, parseFeatureLibraryString } from '../src/parse/feature-library.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

async function tempDir(prefix: string, files: Record<string, string>): Promise<string> {
  const dir = path.join(__dirname, '.tmp', `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(dir, { recursive: true });
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

describe('parse/feature-library', () => {
  it('parses front-matter + per-case sections from the fixture', async () => {
    const libraries = await loadFeatureLibraries(fixturesDir);
    const lib = libraries.find(l => l.slug === 'fixture-feature');
    expect(lib).toBeDefined();
    expect(lib!.feature).toBe('Fixture Feature');
    expect(lib!.cases).toHaveLength(2);

    const tc9001 = lib!.cases.find(c => c.id === 'TC-9001');
    expect(tc9001).toBeDefined();
    expect(tc9001!.title).toBe('Case with complete metadata and cross-repo links');
    expect(tc9001!.priority).toBe('P1');
    expect(tc9001!.type).toBe('integration');
    expect(tc9001!.state).toBe('Ready');
    expect(tc9001!.shouldAutomate).toBe('yes');
    expect(tc9001!.owner).toBe('qa-fixture');
    expect(tc9001!.links.bugs).toEqual(['alkem-io/server#4567']);
    expect(tc9001!.links.stories).toEqual(['alkem-io/product#1234']);
    expect(tc9001!.links.prs).toEqual(['alkem-io/client-web#99']);
  });

  it('extracts steps and expected as markdown strings verbatim', async () => {
    const libraries = await loadFeatureLibraries(fixturesDir);
    const tc9001 = libraries[0].cases.find(c => c.id === 'TC-9001')!;
    expect(tc9001.steps).toContain('1. Do the first thing.');
    expect(tc9001.steps).toContain('2. Do the second thing.');
    expect(tc9001.expected).toContain('The expected outcome happens within 2 seconds.');
    expect(tc9001.expected).toContain('A side effect is observable in the log.');
  });

  it('rejects duplicate case IDs in the same file', async () => {
    const dir = await tempDir('dup-ids', {
      'features/dup.md': [
        '---',
        'feature: Dup',
        'slug: dup',
        '---',
        '',
        '## TC-1001 — First',
        '```yaml',
        'priority: P1',
        'type: functional',
        'state: Ready',
        'should_automate: no',
        '```',
        '### Steps',
        '1. x',
        '### Expected',
        '- x',
        '',
        '## TC-1001 — Duplicate',
        '```yaml',
        'priority: P1',
        'type: functional',
        'state: Ready',
        'should_automate: no',
        '```',
        '### Steps',
        '1. x',
        '### Expected',
        '- x',
        '',
      ].join('\n'),
    });
    await expect(loadFeatureLibraries(dir)).rejects.toThrow(/duplicate/i);
  });

  it('rejects a malformed fenced YAML block (invalid enum value)', async () => {
    const bad = [
      '---',
      'feature: Bad',
      'slug: bad',
      '---',
      '',
      '## TC-2001 — Bad metadata',
      '```yaml',
      'priority: XX',
      'type: functional',
      'state: Ready',
      'should_automate: no',
      '```',
      '### Steps',
      '1. x',
      '### Expected',
      '- x',
      '',
    ].join('\n');
    expect(() => parseFeatureLibraryString(bad, '/virtual/bad.md')).toThrow(/priority|enum/i);
  });

  it('rejects a case section missing the fenced YAML metadata block', async () => {
    const bad = [
      '---',
      'feature: Missing',
      'slug: missing',
      '---',
      '',
      '## TC-3001 — Missing metadata',
      '',
      '### Steps',
      '1. x',
      '### Expected',
      '- x',
      '',
    ].join('\n');
    expect(() => parseFeatureLibraryString(bad, '/virtual/missing.md')).toThrow(/yaml|metadata/i);
  });
});
