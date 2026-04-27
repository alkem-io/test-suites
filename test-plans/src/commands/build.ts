import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';
import type { GlobalFlags } from '../cli.js';
import type { FeatureLibrary, RunSummary, TestCase } from '../types.js';
import { loadFeatureLibraries } from '../parse/feature-library.js';
import { loadReleasePlans } from '../parse/release-plan.js';
import { scanCodeTags } from '../parse/code-tags.js';
import { joinOutcomes } from '../join/outcomes.js';
import { enrichLinks } from '../enrich/github-links.js';
import { resolveScanPatterns } from './scan.js';
import { findRepoRoot } from '../util/repo-root.js';
import {
  renderLanding,
  renderArchive,
  renderRelease,
  renderFeatureView,
  renderDefectsView,
  defectsToCsv,
} from '../render/dashboard.js';
import { computeCoverageDefects } from '../join/coverage-defects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, '..', 'render', 'templates', 'assets');

export async function buildCommand(flags: GlobalFlags): Promise<number> {
  const libraries = await loadFeatureLibraries(flags.contentRoot);
  const releasePlans = await loadReleasePlans(flags.contentRoot);

  const runSummaries: RunSummary[] = flags.pullRuns ? await loadRunSummaries(flags.runsDir) : [];
  const scan = await scanCodeTags(resolveScanPatterns(), { relativeTo: findRepoRoot() });

  joinOutcomes(libraries, releasePlans, runSummaries, scan.tags, scan.testCountByFile);

  const allLinks = gatherAllLinks(libraries);
  const enriched = await enrichLinks(allLinks, {
    token: process.env.GITHUB_TOKEN,
    allowedOrgs: ['alkem-io'],
  });

  await rm(flags.outDir, { recursive: true, force: true });
  await mkdir(flags.outDir, { recursive: true });
  await mkdir(path.join(flags.outDir, 'assets'), { recursive: true });
  await mkdir(path.join(flags.outDir, 'releases'), { recursive: true });
  await mkdir(path.join(flags.outDir, 'features'), { recursive: true });

  for (const asset of ['style.css', 'filters.js', 'alkemio-logo.svg']) {
    await copyFile(path.join(ASSET_DIR, asset), path.join(flags.outDir, 'assets', asset));
  }

  const generatedAt = flags.generatedAt;

  const landingHtml = await renderLanding({
    releasePlans,
    libraries,
    generatedAt,
    depth: 0,
  });
  await writeFile(path.join(flags.outDir, 'index.html'), landingHtml, 'utf8');

  const archiveHtml = await renderArchive({
    releasePlans,
    libraries,
    generatedAt,
    depth: 1,
  });
  await writeFile(path.join(flags.outDir, 'releases', 'archive.html'), archiveHtml, 'utf8');

  for (const plan of releasePlans) {
    const html = await renderRelease({
      releasePlan: plan,
      libraries,
      enrichedLinks: enriched,
      generatedAt,
      depth: 1,
    });
    await writeFile(path.join(flags.outDir, 'releases', `${plan.release}.html`), html, 'utf8');
  }

  for (const lib of libraries) {
    const html = await renderFeatureView({
      library: lib,
      enrichedLinks: enriched,
      generatedAt,
      depth: 1,
    });
    const relPath = `${lib.slug}.html`;
    const target = path.join(flags.outDir, 'features', relPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html, 'utf8');
  }

  const defects = computeCoverageDefects({
    libraries,
    releasePlans,
    tags: scan.tags,
    orphanFiles: scan.orphanFiles,
  });
  const defectsHtml = await renderDefectsView({ defects, generatedAt, depth: 0 });
  await writeFile(path.join(flags.outDir, 'defects.html'), defectsHtml, 'utf8');
  await writeFile(path.join(flags.outDir, 'defects.csv'), defectsToCsv(defects), 'utf8');

  console.log(`[test-plans] build: wrote ${1 + 1 + releasePlans.length + libraries.length + 2} artefact(s) to ${flags.outDir}/`);
  console.log(`[test-plans] build: ${releasePlans.length} release plan(s), ${libraries.length} feature library/libraries, ${enriched.size} enriched link(s), ${defects.length} coverage defect(s)`);
  return 0;
}

async function loadRunSummaries(runsDir: string): Promise<RunSummary[]> {
  if (!existsSync(runsDir)) {
    console.warn(`[test-plans] --pull-runs: runs directory ${runsDir} does not exist; rendering with no automated outcomes.`);
    return [];
  }
  const pattern = path.posix.join(runsDir.replace(/\\/g, '/'), '**/*.json');
  const files = await glob(pattern, { nodir: true });
  const summaries: RunSummary[] = [];
  for (const file of files.sort()) {
    try {
      const raw = await readFile(file, 'utf8');
      summaries.push(JSON.parse(raw) as RunSummary);
    } catch (err) {
      console.warn(`[test-plans] --pull-runs: failed to parse ${file} — ${(err as Error).message}`);
    }
  }
  return summaries;
}

function gatherAllLinks(libraries: FeatureLibrary[]): string[] {
  const set = new Set<string>();
  const pushAll = (xs?: string[]) => {
    if (!xs) return;
    for (const x of xs) set.add(x);
  };
  for (const lib of libraries) {
    for (const c of lib.cases as TestCase[]) {
      pushAll(c.links.stories);
      pushAll(c.links.bugs);
      pushAll(c.links.prs);
    }
  }
  return [...set];
}
