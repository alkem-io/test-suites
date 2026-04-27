import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { glob } from 'glob';
import type { CodeTag, CodeConstruct } from '../types.js';

export interface ScanOptions {
  /** If set, all file paths in the returned tags/orphans are made relative to this directory. */
  relativeTo?: string;
}

/**
 * Scans test source files for `@testCase` tags and maps each tag to the
 * `describe`/`it`/`test` call that immediately follows it. Grammar defined
 * in `specs/004-qa-test-plans/contracts/tag-format.md`.
 */
export interface ScanResult {
  tags: CodeTag[];
  /** Source files that contain at least one describe/it/test call but NO @testCase tag. */
  orphanFiles: string[];
  /**
   * Per-file count of `it()` / `test()` calls (excluding `describe()` and hooks).
   * Used by the join layer to compute per-case automated-test counts for the
   * dashboard. Files that don't appear in this map have zero tests.
   */
  testCountByFile: Map<string, number>;
}

const TAG_RE = /@testCase\s+((?:TC-\d+(?:\s*,\s*|\s+))*TC-\d+)/;
// Match lines that invoke a test runner entry point:
//   describe(...)    it(...)    test(...)
//   test.describe(...)   test.only(...)   test.describe.serial(...)
//   myFixture.test.describe(...)    x.y.z.test(...)
// but NOT hooks like test.beforeAll / test.afterEach and NOT arbitrary
// identifiers that happen to contain `test` as a substring.
const CALL_RE = /^\s*(?:[A-Za-z_$][\w$]*\.)*(describe|it|test)(?:\.(?:only|skip|fixme|fail|serial|parallel|concurrent|configure))?\s*\(/;
const CONSTRUCT_RE = /^\s*(?:[A-Za-z_$][\w$]*\.)*(describe|it|test)\b/;
// Matches an actual test declaration (it / test), NOT describe or hooks.
// Used to count how many individual assertions a case's covering files run.
// Note: counts entire file regardless of which describe the @testCase tag
// attaches to; a file with multiple tags on different describes will appear
// over-represented. In practice most files carry a single top-level tag.
const TEST_CALL_ANY_RE = /^\s*(?:[A-Za-z_$][\w$]*\.)*(it|test)(?:\.(?:only|skip|fixme|fail|concurrent))?\s*\(/gm;

export function countTestsInContent(content: string): number {
  const matches = content.match(TEST_CALL_ANY_RE);
  return matches ? matches.length : 0;
}

/** Max lines the parser will look forward from a tag to find its attached call. */
const CALL_SEARCH_WINDOW = 20;

export function scanString(content: string, filePath: string): CodeTag[] {
  const lines = content.split('\n');
  const tags: CodeTag[] = [];
  for (let i = 0; i < lines.length; i++) {
    const tagMatch = TAG_RE.exec(lines[i]);
    if (!tagMatch) continue;
    const caseIds = [...tagMatch[1].matchAll(/TC-\d+/g)].map(m => m[0]);
    // Find the next describe/it/test call within the window, skipping comments and blanks.
    const limit = Math.min(i + CALL_SEARCH_WINDOW + 1, lines.length);
    for (let j = i + 1; j < limit; j++) {
      const line = lines[j];
      if (!CALL_RE.test(line)) continue;
      const construct = CONSTRUCT_RE.exec(line)?.[1] as CodeConstruct | undefined;
      if (!construct) break;
      tags.push({ file: filePath, line: j + 1, construct, caseIds });
      break;
    }
  }
  return tags;
}

function fileLooksLikeTestSource(content: string): boolean {
  return CALL_RE.test(content) || /^\s*(describe|it|test)\s*\(/m.test(content);
}

export async function scanCodeTags(
  patterns: string[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const files = await expandPatterns(patterns);
  const tags: CodeTag[] = [];
  const orphanFiles: string[] = [];
  const testCountByFile = new Map<string, number>();
  const normalize = (file: string): string =>
    options.relativeTo ? path.relative(options.relativeTo, file).replace(/\\/g, '/') : file;
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = await readFile(file, 'utf8');
    const normalizedPath = normalize(file);
    const fileTags = scanString(content, normalizedPath);
    tags.push(...fileTags);
    if (fileTags.length === 0 && fileLooksLikeTestSource(content)) {
      orphanFiles.push(normalizedPath);
    }
    testCountByFile.set(normalizedPath, countTestsInContent(content));
  }
  return { tags, orphanFiles, testCountByFile };
}

async function expandPatterns(patterns: string[]): Promise<string[]> {
  const seen = new Set<string>();
  for (const p of patterns) {
    if (existsSync(p)) {
      seen.add(p);
      continue;
    }
    if (p.includes('*') || p.includes('?') || p.includes('[')) {
      const matches = await glob(p.replace(/\\/g, '/'), { nodir: true });
      for (const m of matches) seen.add(m);
    }
  }
  return [...seen].sort();
}
