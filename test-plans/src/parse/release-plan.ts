import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Outcome, OutcomeKind, ReleasePlan, ReleasePlanFrontMatter } from '../types.js';
import { RELEASE_PLAN_FRONT_MATTER_SCHEMA } from '../schemas.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateFrontMatter: ValidateFunction<ReleasePlanFrontMatter> = ajv.compile(
  RELEASE_PLAN_FRONT_MATTER_SCHEMA as unknown as object,
) as ValidateFunction<ReleasePlanFrontMatter>;

const IN_SCOPE_HEADING_RE = /^## In-scope cases\s*$/m;
const OUTCOMES_HEADING_RE = /^## Outcomes\s*$/m;
// Accept `-`, `*`, or `+` bullet markers — Obsidian (and Prettier, etc.)
// may normalize bullet lists to any of these depending on user settings.
const CASE_ID_BULLET_RE = /^[-*+]\s+(TC-\d+)\s*$/gm;
const OUTCOME_HEADING_RE = /^### (TC-\d+)\s+—\s+(passed|failed|blocked|not-run)\s*$/gm;

const VALID_OUTCOMES: OutcomeKind[] = ['passed', 'failed', 'blocked', 'not-run'];

export async function loadReleasePlans(contentRoot: string): Promise<ReleasePlan[]> {
  const releasesDir = path.join(contentRoot, 'releases');
  const pattern = path.posix.join(releasesDir.replace(/\\/g, '/'), '*.md');
  const files = await glob(pattern, { nodir: true });
  const plans: ReleasePlan[] = [];
  for (const file of files.sort()) {
    const content = await readFile(file, 'utf8');
    plans.push(parseReleasePlanString(content, file));
  }
  return plans;
}

export function parseReleasePlanString(content: string, filePath: string): ReleasePlan {
  const parsed = matter(content);
  const frontMatter = parsed.data as Record<string, unknown>;
  // gray-matter / js-yaml coerce ISO-8601 dates to JS Date objects; the schema
  // expects a string with format "date". Normalize before validating.
  if (frontMatter.target_date instanceof Date) {
    frontMatter.target_date = (frontMatter.target_date as Date).toISOString().slice(0, 10);
  }
  if (!validateFrontMatter(frontMatter)) {
    const msg = (validateFrontMatter.errors ?? [])
      .map(e => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`)
      .join('; ');
    throw new Error(`${filePath}: release plan front-matter failed schema validation: ${msg}`);
  }
  const release = frontMatter.release as string;
  const target_date = frontMatter.target_date as string | undefined;
  const description = frontMatter.description as string | undefined;

  const body = parsed.content;
  const inScope = extractInScope(body, filePath);
  const manualOutcomes = extractOutcomes(body, release, filePath);

  return {
    release,
    targetDate: target_date,
    description,
    path: filePath,
    inScope,
    manualOutcomes,
  };
}

function extractInScope(body: string, filePath: string): string[] {
  const inScopeMatch = IN_SCOPE_HEADING_RE.exec(body);
  if (!inScopeMatch) {
    throw new Error(`${filePath}: missing \`## In-scope cases\` section`);
  }
  const outcomesMatch = OUTCOMES_HEADING_RE.exec(body);
  const start = inScopeMatch.index + inScopeMatch[0].length;
  const end = outcomesMatch ? outcomesMatch.index : body.length;
  const section = body.slice(start, end);

  const ids: string[] = [];
  CASE_ID_BULLET_RE.lastIndex = 0;
  for (const m of section.matchAll(CASE_ID_BULLET_RE)) {
    ids.push(m[1]);
  }
  return ids;
}

function extractOutcomes(body: string, release: string, filePath: string): Record<string, Outcome> {
  const outcomesMatch = OUTCOMES_HEADING_RE.exec(body);
  if (!outcomesMatch) {
    return {};
  }
  const outcomesBody = body.slice(outcomesMatch.index + outcomesMatch[0].length);
  const outcomes: Record<string, Outcome> = {};
  const entries = [...outcomesBody.matchAll(OUTCOME_HEADING_RE)];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const caseId = entry[1];
    const outcomeKind = entry[2] as OutcomeKind;
    if (!VALID_OUTCOMES.includes(outcomeKind)) {
      throw new Error(`${filePath}: outcome \`${outcomeKind}\` for ${caseId} is not a recognized outcome kind`);
    }
    const start = entry.index! + entry[0].length;
    const end = i + 1 < entries.length ? entries[i + 1].index! : outcomesBody.length;
    const section = outcomesBody.slice(start, end);
    const meta = parseOutcomeMetadata(section, caseId, filePath);
    outcomes[caseId] = {
      caseId,
      release,
      outcome: outcomeKind,
      executedAt: meta.executed,
      source: { kind: 'manual', by: meta.by },
      evidence: meta.evidence,
    };
  }
  return outcomes;
}

function parseOutcomeMetadata(
  section: string,
  caseId: string,
  filePath: string,
): { executed: string; by: string; evidence?: string } {
  const fields: Record<string, string> = {};
  // Accept `-`, `*`, or `+` bullet markers (same reason as above).
  const bulletRe = /^[-*+]\s+(\w+):\s*(.+?)\s*$/gm;
  for (const m of section.matchAll(bulletRe)) {
    fields[m[1]] = m[2];
  }
  const executed = fields['executed'];
  const by = fields['by'];
  if (!executed) {
    throw new Error(`${filePath}: outcome for ${caseId} is missing \`executed: <YYYY-MM-DD>\``);
  }
  if (!by) {
    throw new Error(`${filePath}: outcome for ${caseId} is missing \`by: <name>\``);
  }
  const evidence = fields['evidence'];
  return { executed, by, evidence };
}
