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
}

const TAG_RE = /@testCase\s+((?:TC-\d+(?:\s*,\s*|\s+))*TC-\d+)/;
const CALL_RE = /^\s*(?:describe|it|test)(?:\.\w+)?\s*\(/;
const CONSTRUCT_RE = /^\s*(describe|it|test)\b/;

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
  }
  return { tags, orphanFiles };
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
