/**
 * Shared types for the @alkemio/test-plans CLI. Mirrors the entity schemas in
 * `specs/004-qa-test-plans/data-model.md` and the JSON Schemas under
 * `specs/004-qa-test-plans/contracts/`.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type Priority = 'P1' | 'P2' | 'P3';
export type TestType = 'functional' | 'integration' | 'e2e' | 'other';
export type LifecycleState = 'Draft' | 'Ready' | 'Retired';
export type AutomationRequirement = 'required' | 'optional';
export type OutcomeKind = 'passed' | 'failed' | 'blocked' | 'not-run';
export type TestSuite = 'server-api' | 'client-web';
export type CodeConstruct = 'describe' | 'it' | 'test';
export type CoverageDefectKind =
  | 'orphan-automation'
  | 'unknown-case-ref'
  | 'missing-required-automation'
  | 'stale-release-ref';

// ---------------------------------------------------------------------------
// Cross-repo links
// ---------------------------------------------------------------------------

/** Subset of allowed link types per contracts/test-case.schema.json. */
export interface CrossRepoLinks {
  bugs?: string[];
  stories?: string[];
  prs?: string[];
}

/** Enriched cross-repo link (result of @octokit/rest lookup). */
export interface EnrichedLink {
  ref: string;
  title: string | null;
  state: 'open' | 'closed' | null;
}

// ---------------------------------------------------------------------------
// Case metadata (the fenced ```yaml block immediately under a ## TC-#### heading)
// Conforms to contracts/test-case.schema.json.
// ---------------------------------------------------------------------------

export interface CaseMetadata {
  priority: Priority;
  type: TestType;
  state: LifecycleState;
  automation: AutomationRequirement;
  owner?: string;
  links?: CrossRepoLinks;
}

// ---------------------------------------------------------------------------
// Full parsed test case (metadata + narrative + derived fields)
// ---------------------------------------------------------------------------

export interface TestCase {
  id: string;
  title: string;
  feature: string;
  file: string;
  priority: Priority;
  type: TestType;
  state: LifecycleState;
  automation: AutomationRequirement;
  owner?: string;
  links: CrossRepoLinks;
  steps: string;
  expected: string;
  coveredBy: string[];
  latestOutcomes: Record<string, Outcome>;
}

// ---------------------------------------------------------------------------
// Feature library (one markdown document per feature)
// ---------------------------------------------------------------------------

export interface FeatureLibraryFrontMatter {
  feature: string;
  slug: string;
}

export interface FeatureLibrary {
  feature: string;
  slug: string;
  path: string;
  cases: TestCase[];
}

// ---------------------------------------------------------------------------
// Release plan
// Conforms to contracts/release-plan.schema.json for its front-matter.
// ---------------------------------------------------------------------------

export interface ReleasePlanFrontMatter {
  release: string;
  target_date?: string;
  description?: string;
}

export interface ReleasePlan {
  release: string;
  targetDate?: string;
  description?: string;
  path: string;
  inScope: string[];
  manualOutcomes: Record<string, Outcome>;
}

// ---------------------------------------------------------------------------
// Execution outcomes
// ---------------------------------------------------------------------------

export type OutcomeSource =
  | { kind: 'automated'; runId: string; file: string }
  | { kind: 'manual'; by: string };

export interface Outcome {
  caseId: string;
  release: string;
  outcome: OutcomeKind;
  executedAt: string;
  source: OutcomeSource;
  evidence?: string;
}

// ---------------------------------------------------------------------------
// Automated run summary (bot-owned JSON on gh-pages)
// Conforms to contracts/run-summary.schema.json.
// ---------------------------------------------------------------------------

export interface TestResult {
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  failures?: Array<{ name: string; message: string }>;
}

export interface Run {
  runId: string;
  startedAt: string;
  completedAt: string;
  commit: string;
  branch: string;
  tests: TestResult[];
}

export interface RunSummary {
  date: string;
  suite: TestSuite;
  runs: Run[];
}

// ---------------------------------------------------------------------------
// Automation linkage (computed fresh each sync; not persisted)
// ---------------------------------------------------------------------------

export interface CodeTag {
  file: string;
  line: number;
  construct: CodeConstruct;
  caseIds: string[];
}

// ---------------------------------------------------------------------------
// Coverage defects
// ---------------------------------------------------------------------------

export interface CoverageDefect {
  kind: CoverageDefectKind;
  where: string;
  detail: string;
  caseId?: string;
}

// ---------------------------------------------------------------------------
// Aggregated view input for the dashboard renderer
// ---------------------------------------------------------------------------

export interface ReleaseMetrics {
  total: number;
  automated: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  percentAutomated: number;
  percentPassed: number;
  byPriority: Record<Priority, number>;
  byType: Record<TestType, number>;
}
