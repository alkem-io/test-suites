import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import MarkdownIt from 'markdown-it';
import type {
  CoverageDefect,
  CoverageDefectKind,
  EnrichedLink,
  FeatureLibrary,
  ReleasePlan,
  TestCase,
} from '../types.js';
import { computeMetrics } from '../join/outcomes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, 'templates');

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

const templateCache = new Map<string, string>();

async function loadTemplate(name: string): Promise<string> {
  const cached = templateCache.get(name);
  if (cached) return cached;
  const fullPath = path.join(TEMPLATE_DIR, name);
  const src = await readFile(fullPath, 'utf8');
  templateCache.set(name, src);
  return src;
}

export function basePrefix(depth: number): string {
  return depth === 0 ? '' : '../'.repeat(depth);
}

function renderLinkChip(ref: string, enriched?: Map<string, EnrichedLink>): string {
  const hit = enriched?.get(ref);
  const url = refToUrl(ref);
  const title = hit?.title ? ejs.escapeXML(hit.title) : '';
  const state = hit?.state;
  const stateLabel = state === 'open' ? 'open' : state === 'closed' ? 'closed' : '';
  const stateHtml = stateLabel
    ? `<span class="state state-${stateLabel}">${stateLabel}</span>`
    : '';
  const titleHtml = title ? ` <span class="title">${title}</span>` : '';
  return `<a class="link-chip" href="${url}" target="_blank" rel="noopener"><span class="ref">${ejs.escapeXML(ref)}</span>${titleHtml}${stateHtml}</a>`;
}

function refToUrl(ref: string): string {
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#([1-9][0-9]*)$/.exec(ref);
  if (!match) return '#';
  const [, org, repo, num] = match;
  return `https://github.com/${org}/${repo}/issues/${num}`;
}

async function renderInLayout(opts: {
  innerTemplate: string;
  innerData: Record<string, unknown>;
  title: string;
  depth: number;
  generatedAt: string;
}): Promise<string> {
  const inner = await loadTemplate(opts.innerTemplate);
  const layout = await loadTemplate('layout.ejs');
  const prefix = basePrefix(opts.depth);
  const innerHtml = ejs.render(inner, { ...opts.innerData, basePrefix: prefix }, {
    filename: path.join(TEMPLATE_DIR, opts.innerTemplate),
  });
  return ejs.render(layout, {
    title: opts.title,
    body: innerHtml,
    basePrefix: prefix,
    generatedAt: opts.generatedAt,
  }, { filename: path.join(TEMPLATE_DIR, 'layout.ejs') });
}

// ---------------------------------------------------------------------------
// Feature view (already used by T020)
// ---------------------------------------------------------------------------

export interface FeatureViewCounts {
  total: number;
  ready: number;
  draft: number;
  retired: number;
  automationRequired: number;
}

function computeFeatureCounts(library: FeatureLibrary): FeatureViewCounts {
  const counts: FeatureViewCounts = { total: library.cases.length, ready: 0, draft: 0, retired: 0, automationRequired: 0 };
  for (const c of library.cases) {
    if (c.state === 'Ready') counts.ready++;
    else if (c.state === 'Draft') counts.draft++;
    else if (c.state === 'Retired') counts.retired++;
    if (c.automation === 'required') counts.automationRequired++;
  }
  return counts;
}

export async function renderFeatureView(opts: {
  library: FeatureLibrary;
  enrichedLinks?: Map<string, EnrichedLink>;
  generatedAt: string;
  depth: number;
}): Promise<string> {
  return renderInLayout({
    innerTemplate: 'feature.ejs',
    innerData: {
      library: opts.library,
      counts: computeFeatureCounts(opts.library),
      mdRender: (src: string) => md.render(src ?? ''),
      renderLinkChip: (ref: string) => renderLinkChip(ref, opts.enrichedLinks),
    },
    title: `Feature: ${opts.library.feature}`,
    depth: opts.depth,
    generatedAt: opts.generatedAt,
  });
}

// ---------------------------------------------------------------------------
// Landing + archive views — list of release plans
// ---------------------------------------------------------------------------

interface ReleaseIdParts {
  main: number;
  patch: number;
}

function parseReleaseId(r: string): ReleaseIdParts | null {
  const m = /^R(\d+)(?:\.(\d+))?$/.exec(r);
  if (!m) return null;
  return { main: Number(m[1]), patch: Number(m[2] ?? 0) };
}

/**
 * Sort descending by main release number; within the same main, patches come
 * after their parent in ascending order (R31, R31.1, R31.2).
 */
function sortReleases(plans: ReleasePlan[]): ReleasePlan[] {
  return [...plans].sort((a, b) => {
    const ap = parseReleaseId(a.release) ?? { main: 0, patch: 0 };
    const bp = parseReleaseId(b.release) ?? { main: 0, patch: 0 };
    if (ap.main !== bp.main) return bp.main - ap.main;
    return ap.patch - bp.patch;
  });
}

const LANDING_LIMIT = 9;

function buildReleaseEntries(plans: ReleasePlan[], libraries: FeatureLibrary[]) {
  const sorted = sortReleases(plans);
  return sorted.map(plan => ({
    plan,
    metrics: computeMetrics(plan, libraries),
    isPatch: (parseReleaseId(plan.release)?.patch ?? 0) > 0,
  }));
}

export async function renderLanding(opts: {
  releasePlans: ReleasePlan[];
  libraries: FeatureLibrary[];
  generatedAt: string;
  depth: number;
}): Promise<string> {
  const allEntries = buildReleaseEntries(opts.releasePlans, opts.libraries);
  const entries = allEntries.slice(0, LANDING_LIMIT);
  return renderInLayout({
    innerTemplate: 'landing.ejs',
    innerData: { entries, total: allEntries.length },
    title: 'Alkemio QA test plans — Release overview',
    depth: opts.depth,
    generatedAt: opts.generatedAt,
  });
}

export async function renderArchive(opts: {
  releasePlans: ReleasePlan[];
  libraries: FeatureLibrary[];
  generatedAt: string;
  depth: number;
}): Promise<string> {
  const entries = buildReleaseEntries(opts.releasePlans, opts.libraries);
  return renderInLayout({
    innerTemplate: 'archive.ejs',
    innerData: { entries },
    title: 'Alkemio QA test plans — All releases',
    depth: opts.depth,
    generatedAt: opts.generatedAt,
  });
}

// ---------------------------------------------------------------------------
// Per-release view
// ---------------------------------------------------------------------------

function caseIdIndex(libraries: FeatureLibrary[]): Map<string, TestCase> {
  const m = new Map<string, TestCase>();
  for (const lib of libraries) for (const c of lib.cases) m.set(c.id, c);
  return m;
}

// ---------------------------------------------------------------------------
// Coverage-defects view + CSV export
// ---------------------------------------------------------------------------

const DEFECT_KIND_ORDER: CoverageDefectKind[] = [
  'orphan-automation',
  'unknown-case-ref',
  'missing-required-automation',
  'stale-release-ref',
];

function groupDefects(defects: CoverageDefect[]): Record<CoverageDefectKind, CoverageDefect[]> {
  const grouped = {
    'orphan-automation': [],
    'unknown-case-ref': [],
    'missing-required-automation': [],
    'stale-release-ref': [],
  } as Record<CoverageDefectKind, CoverageDefect[]>;
  for (const d of defects) grouped[d.kind].push(d);
  return grouped;
}

export async function renderDefectsView(opts: {
  defects: CoverageDefect[];
  generatedAt: string;
  depth: number;
}): Promise<string> {
  return renderInLayout({
    innerTemplate: 'defects.ejs',
    innerData: {
      defects: opts.defects,
      grouped: groupDefects(opts.defects),
      groupOrder: DEFECT_KIND_ORDER,
    },
    title: 'Alkemio QA test plans — Coverage defects',
    depth: opts.depth,
    generatedAt: opts.generatedAt,
  });
}

export function defectsToCsv(defects: CoverageDefect[]): string {
  const header = 'kind,caseId,where,detail';
  const rows = defects.map(d =>
    [d.kind, d.caseId ?? '', d.where, d.detail].map(csvEscape).join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function aggregateLinks(cases: TestCase[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cases) {
    for (const group of [c.links.stories ?? [], c.links.bugs ?? [], c.links.prs ?? []]) {
      for (const ref of group) {
        if (!seen.has(ref)) {
          seen.add(ref);
          out.push(ref);
        }
      }
    }
  }
  return out;
}

export async function renderRelease(opts: {
  releasePlan: ReleasePlan;
  libraries: FeatureLibrary[];
  enrichedLinks?: Map<string, EnrichedLink>;
  generatedAt: string;
  depth: number;
}): Promise<string> {
  const idx = caseIdIndex(opts.libraries);
  const casesInScope: TestCase[] = [];
  for (const caseId of opts.releasePlan.inScope) {
    const c = idx.get(caseId);
    if (c) casesInScope.push(c);
  }
  const metrics = computeMetrics(opts.releasePlan, opts.libraries);
  const stolenLinks = aggregateLinks(casesInScope);
  return renderInLayout({
    innerTemplate: 'release.ejs',
    innerData: {
      plan: opts.releasePlan,
      metrics,
      casesInScope,
      stolenLinks,
      renderLinkChip: (ref: string) => renderLinkChip(ref, opts.enrichedLinks),
    },
    title: `Release ${opts.releasePlan.release}`,
    depth: opts.depth,
    generatedAt: opts.generatedAt,
  });
}
