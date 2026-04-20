import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { FeatureLibrary, FeatureLibraryFrontMatter, TestCase, CaseMetadata } from '../types.js';
import { CASE_METADATA_SCHEMA } from '../schemas.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateCaseMetadata: ValidateFunction<CaseMetadata> = ajv.compile(CASE_METADATA_SCHEMA as unknown as object) as ValidateFunction<CaseMetadata>;

const CASE_HEADING_RE = /^## (TC-\d+)\s+—\s+(.+?)\s*$/gm;
const YAML_FENCE_RE = /```yaml\s*\n([\s\S]*?)\n```/;

export async function loadFeatureLibraries(contentRoot: string): Promise<FeatureLibrary[]> {
  const featuresDir = path.join(contentRoot, 'features');
  const pattern = path.posix.join(featuresDir.replace(/\\/g, '/'), '**/*.md');
  const files = await glob(pattern, { nodir: true });
  const libraries: FeatureLibrary[] = [];
  const idsSeen = new Map<string, string>();
  for (const file of files.sort()) {
    const content = await readFile(file, 'utf8');
    const lib = parseFeatureLibraryString(content, file);
    for (const c of lib.cases) {
      const prior = idsSeen.get(c.id);
      if (prior) {
        throw new Error(`duplicate case ID ${c.id} in ${file} — already declared in ${prior}`);
      }
      idsSeen.set(c.id, file);
    }
    libraries.push(lib);
  }
  return libraries;
}

export function parseFeatureLibraryString(content: string, filePath: string): FeatureLibrary {
  const parsed = matter(content);
  const frontMatter = parsed.data as Partial<FeatureLibraryFrontMatter>;
  if (!frontMatter.feature || !frontMatter.slug) {
    throw new Error(`${filePath}: feature library front-matter must declare both \`feature\` and \`slug\``);
  }
  const body = parsed.content;

  const headings = [...body.matchAll(CASE_HEADING_RE)];
  if (headings.length === 0) {
    return {
      feature: frontMatter.feature,
      slug: frontMatter.slug,
      path: filePath,
      cases: [],
    };
  }

  const cases: TestCase[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < headings.length; i++) {
    const head = headings[i];
    const id = head[1];
    const title = head[2].trim();
    if (seenIds.has(id)) {
      throw new Error(`${filePath}: duplicate case ID ${id} within the same feature library`);
    }
    seenIds.add(id);
    const start = head.index! + head[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index! : body.length;
    const section = body.slice(start, end);

    const yamlMatch = YAML_FENCE_RE.exec(section);
    if (!yamlMatch) {
      throw new Error(`${filePath}: case ${id} is missing its fenced \`\`\`yaml metadata block`);
    }
    const yamlBody = yamlMatch[1];
    const metadata = parseFencedYaml(yamlBody, filePath, id);

    const { steps, expected } = extractStepsAndExpected(section, yamlMatch.index! + yamlMatch[0].length);

    cases.push({
      id,
      title,
      feature: frontMatter.feature,
      file: filePath,
      priority: metadata.priority,
      type: metadata.type,
      state: metadata.state,
      automation: metadata.automation,
      owner: metadata.owner,
      links: metadata.links ?? {},
      steps,
      expected,
      coveredBy: [],
      latestOutcomes: {},
    });
  }
  return {
    feature: frontMatter.feature,
    slug: frontMatter.slug,
    path: filePath,
    cases,
  };
}

function parseFencedYaml(yamlBody: string, filePath: string, caseId: string): CaseMetadata {
  // Reuse gray-matter's YAML engine by wrapping the block in delimiters.
  const synthetic = `---\n${yamlBody}\n---\n`;
  let data: unknown;
  try {
    data = matter(synthetic).data;
  } catch (err) {
    throw new Error(
      `${filePath}: case ${caseId}: failed to parse fenced YAML block — ${(err as Error).message}`,
    );
  }
  if (!validateCaseMetadata(data)) {
    const msg = (validateCaseMetadata.errors ?? [])
      .map(e => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`)
      .join('; ');
    throw new Error(`${filePath}: case ${caseId} metadata failed schema validation (check priority/type/state/automation enum values and link formats): ${msg}`);
  }
  return data as CaseMetadata;
}

function extractStepsAndExpected(section: string, afterYamlEnd: number): { steps: string; expected: string } {
  const rest = section.slice(afterYamlEnd);
  const steps = extractSubsection(rest, 'Steps');
  const expected = extractSubsection(rest, 'Expected');
  return { steps, expected };
}

function extractSubsection(content: string, label: string): string {
  const re = new RegExp(`^###\\s+${label}\\s*\\n([\\s\\S]*)`, 'm');
  const m = re.exec(content);
  if (!m) return '';
  const captured = m[1];
  const nextHeading = /^(### |## )/m.exec(captured);
  const end = nextHeading ? nextHeading.index : captured.length;
  return captured.slice(0, end).trim();
}
