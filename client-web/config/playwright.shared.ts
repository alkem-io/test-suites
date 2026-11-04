import { devices, type PlaywrightTestConfig, type Project } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * One source of truth for every Playwright config in this package.
 *
 * Every runner (`playwright.config.ts`, `config/playwright.config.*.ts`) is
 * built from the pieces below, so the browser, viewport, reporter, artifact
 * policy and timeout TIERS are decided in exactly one place and a suite only
 * declares WHAT it runs (its files and its tier), never HOW.
 *
 * Runtime knobs — all optional, all read from the environment so the same
 * config file serves the laptop, the nightly and a browser matrix in CI:
 *
 *   PW_BROWSER     chrome (default) | chromium | firefox | webkit | msedge |
 *                  mobile-chrome | mobile-safari
 *   PW_VIEWPORT    "<width>x<height>" for desktop browsers (default 1920x1080)
 *   PW_WORKERS     worker count (default 1 — see `SUITE PARALLELISM` in
 *                  docs/e2e-conventions.md before raising it)
 *   PW_RETRIES     retries per test (default: 0 locally, 2 on CI)
 *   UI_HEADLESS    "false" to watch the browser (headless otherwise)
 *   ALKEMIO_BASE_URL  the app under test (default http://localhost:3000)
 *
 * A browser matrix in CI is therefore one job per PW_BROWSER value running the
 * SAME config and the same project names, which keeps reports comparable.
 */

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const IS_CI = !!process.env.CI;

/** Repo-relative roots. Hand-authored suites live in `src/functional-e2e`;
 * forge-verify persists machine-generated acceptance walks in `tests/`. */
export const FUNCTIONAL_E2E_DIR = path.resolve(__dirname, '..', 'src', 'functional-e2e');
export const GENERATED_WALKS_DIR = path.resolve(__dirname, '..', 'tests');

// ---------------------------------------------------------------------------
// Browsers
// ---------------------------------------------------------------------------

export type BrowserKey =
  | 'chrome'
  | 'chromium'
  | 'firefox'
  | 'webkit'
  | 'msedge'
  | 'mobile-chrome'
  | 'mobile-safari';

const DESKTOP_VIEWPORT = parseViewport(process.env.PW_VIEWPORT) ?? {
  width: 1920,
  height: 1080,
};

/**
 * The browser presets a run can target. Desktop presets take the configurable
 * viewport; mobile presets keep their device's own (a phone viewport is the
 * point of running them). `isMobile`/`hasTouch` come from the device descriptor.
 */
export const BROWSERS: Record<BrowserKey, Project['use']> = {
  chrome: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: DESKTOP_VIEWPORT },
  chromium: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
  firefox: { ...devices['Desktop Firefox'], viewport: DESKTOP_VIEWPORT },
  webkit: { ...devices['Desktop Safari'], viewport: DESKTOP_VIEWPORT },
  msedge: { ...devices['Desktop Edge'], channel: 'msedge', viewport: DESKTOP_VIEWPORT },
  'mobile-chrome': { ...devices['Pixel 7'] },
  'mobile-safari': { ...devices['iPhone 14'] },
};

export function resolveBrowser(): { key: BrowserKey; use: Project['use'] } {
  const key = (process.env.PW_BROWSER || 'chrome') as BrowserKey;
  const use = BROWSERS[key];
  if (!use) {
    throw new Error(
      `PW_BROWSER="${key}" is not a known browser; use one of ${Object.keys(BROWSERS).join(', ')}`
    );
  }
  return { key, use };
}

function parseViewport(value: string | undefined): { width: number; height: number } | undefined {
  if (!value) return undefined;
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(value.trim());
  if (!match) {
    throw new Error(`PW_VIEWPORT="${value}" must look like "1440x900"`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

// ---------------------------------------------------------------------------
// Timeout tiers
// ---------------------------------------------------------------------------

/**
 * Every suite picks ONE tier. The numbers are budgets for the slowest
 * environment we run against (the shared test cluster), not for a laptop:
 * a budget that fits locally and times out nightly is the single most common
 * source of "flaky" reds in this repo's history.
 *
 *   standard  — one page, a few actions, assertions on the result.
 *   extended  — multi-step walks: several navigations, dialogs, uploads, or
 *               two browser contexts talking to each other.
 *   long      — walks that must WAIT for the platform: mail delivery,
 *               notification digests, subscriptions, registration round trips.
 *
 * `expect` budgets are deliberately generous: an assertion that is wrong fails
 * at the same point whatever the budget, while a correct one on a slow page
 * only needs time. A test that must finish faster is a performance test and
 * belongs in `load-testing/`.
 */
export const TIERS = {
  standard: { timeout: 60_000, expect: 10_000 },
  extended: { timeout: 120_000, expect: 15_000 },
  long: { timeout: 180_000, expect: 20_000 },
} as const;

export type Tier = keyof typeof TIERS;

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type SuiteOptions = {
  /** Stable, human-readable name; CI greps and reports key on it. */
  name: string;
  /** Spec globs relative to `testDir`. */
  testMatch: string | RegExp | (string | RegExp)[];
  /** Defaults to `src/functional-e2e`; forge-generated walks pass `GENERATED_WALKS_DIR`. */
  testDir?: string;
  tier?: Tier;
  /** Project names this suite depends on (e.g. a persona sign-in `setup` project). */
  dependencies?: string[];
  /** Per-suite overrides of the browser `use` — a different viewport, a locale… */
  use?: Project['use'];
  /** Only run the cases whose title matches (per-project filter). */
  grep?: RegExp;
  /** Opt out of trace/video capture (e.g. a walk that must never record a
   * session cookie into an artifact that gets published). */
  capture?: 'default' | 'off';
};

/**
 * Declares one suite as a Playwright project. The browser comes from
 * PW_BROWSER, the budgets from the tier — a suite never sets those itself.
 */
export function suite(options: SuiteOptions): Project {
  const { use: browserUse } = resolveBrowser();
  const tier = TIERS[options.tier ?? 'standard'];
  const capture =
    options.capture === 'off' ? { trace: 'off' as const, video: 'off' as const } : {};
  return {
    name: options.name,
    testDir: options.testDir ?? FUNCTIONAL_E2E_DIR,
    testMatch: options.testMatch,
    dependencies: options.dependencies,
    grep: options.grep,
    timeout: tier.timeout,
    expect: { timeout: tier.expect },
    use: { ...browserUse, ...capture, ...options.use },
  };
}

// ---------------------------------------------------------------------------
// Base config
// ---------------------------------------------------------------------------

/**
 * Tag for cases that can only run on a LOCAL stack — they need loopback
 * Postgres/Redis, the RabbitMQ management API, or a server env override
 * (a seconds-scale resend cooldown). The nightly leaves them out entirely
 * (`grepInvert`), so a skip in the nightly report always means a tracked
 * defect; `config/playwright.config.local-stack.ts` runs exactly these.
 */
export const LOCAL_STACK_TAG = /@local-stack/;

export type BaseConfigOptions = {
  projects: Project[];
  /** Runner-level global setup (persona registration, cache clearing). */
  globalSetup?: string;
  /** Folder for the HTML report; one per runner so runs never overwrite each other. */
  reportFolder?: string;
  /**
   * Whether files may run in parallel across workers. Only a runner whose
   * every suite is self-seeding and persona-isolated may turn this on; the
   * nightly keeps it off (see docs/e2e-conventions.md › Suite parallelism).
   */
  parallelFiles?: boolean;
  /** Default tier for tests outside any declared project. */
  tier?: Tier;
  /** The dedicated local-stack runner: do not exclude the tagged cases. */
  localStackOnly?: boolean;
};

/**
 * The shared skeleton: reporters, artifact policy, retries, workers, headless
 * handling. Secrets never reach a published artifact: traces and videos are
 * kept only on failure/retry and are stripped by scripts/publish-report.sh
 * before anything lands on gh-pages.
 */
export function baseConfig(options: BaseConfigOptions): PlaywrightTestConfig {
  const tier = TIERS[options.tier ?? 'standard'];
  const workers = Number(process.env.PW_WORKERS) || 1;
  const retries =
    process.env.PW_RETRIES !== undefined ? Number(process.env.PW_RETRIES) : IS_CI ? 2 : 0;
  // Playwright resolves an explicit reporter folder against the CONFIG file's
  // directory; the runners live in config/, but the publish step and
  // .gitignore expect client-web/<folder>. Anchor both at the package root.
  const packageRoot = path.resolve(__dirname, '..');
  const reportFolder = path.resolve(packageRoot, options.reportFolder ?? 'playwright-report');
  return {
    testDir: FUNCTIONAL_E2E_DIR,
    outputDir: path.resolve(packageRoot, 'test-results'),
    globalSetup: options.globalSetup,
    projects: options.projects,
    workers,
    fullyParallel: options.parallelFiles ?? false,
    forbidOnly: IS_CI,
    retries,
    // The nightly never sees a local-stack case; the local-stack runner decides
    // per project whether it runs only the tagged cases or their whole file
    // (a tagged case inside a serial walk needs the walk's earlier steps).
    ...(options.localStackOnly ? {} : { grepInvert: LOCAL_STACK_TAG }),
    reporter: IS_CI
      ? [['github'], ['html', { open: 'never', outputFolder: reportFolder }]]
      : [['list'], ['html', { open: 'never', outputFolder: reportFolder }]],
    timeout: tier.timeout,
    expect: { timeout: tier.expect },
    use: {
      baseURL: BASE_URL,
      headless: process.env.UI_HEADLESS !== 'false',
      trace: 'on-all-retries',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      // Strict actionability everywhere: an element that is covered by a
      // banner or dialog must be dealt with, not clicked through.
      actionTimeout: 0,
    },
  };
}
