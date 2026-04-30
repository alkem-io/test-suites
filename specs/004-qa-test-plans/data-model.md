# Data Model: QA Test Plan Management System

Phase 1 output. Defines content schemas (on working branch), bot-owned run schemas (on `gh-pages`), derived types used by the CLI, and the dashboard view shape.

---

## Directory Layout — Working Branch (`develop`, PR branches)

```text
test-plans/
├── package.json
├── content/
│   ├── features/
│   │   ├── communications.md
│   │   ├── journey/
│   │   │   ├── conversion.md
│   │   │   └── subspace.md
│   │   ├── search.md
│   │   ├── account.md
│   │   └── ...
│   └── releases/
│       ├── R31.md
│       └── R32.md
├── src/                    # CLI implementation
├── test/                   # CLI unit tests
└── dist/                   # gitignored
```

## Directory Layout — `gh-pages` Branch

```text
gh-pages-root/
├── index.html              # Top-level index (existing, from spec 003)
├── playwright/             # Existing Playwright reports (spec 003)
├── vitest/                 # Existing Vitest reports (spec 003)
└── test-plans/             # NEW
    ├── index.html                  # Landing view (all release plans, headline metrics)
    ├── releases/
    │   ├── R31.html            # Per-release view
    │   └── R32.html
    ├── features/
    │   ├── communications.html     # Per-feature view
    │   └── journey/conversion.html
    ├── defects.html                # Coverage-defects view
    ├── assets/
    │   ├── style.css
    │   └── script.js
    └── runs/                       # BOT-OWNED run summaries
        ├── server-api/
        │   ├── 2026-04-17.json
        │   ├── 2026-04-18.json
        │   └── ...
        └── client-web/
            └── <date>.json
```

---

## Entities

### 1. TestCase (parsed from a feature library markdown file)

| Field            | Type                                | Required | Notes                                                                 |
|------------------|-------------------------------------|----------|-----------------------------------------------------------------------|
| `id`             | `string` matching `^TC-\d{4,}$`     | yes      | Stable identifier; never reused after retirement.                     |
| `title`          | `string`                            | yes      | From the `##` section heading after the ID.                           |
| `feature`        | `string`                            | yes      | Derived from the file's `feature:` front-matter.                      |
| `file`           | `string` (relative repo path)       | yes      | Source of truth pointer; set by the parser.                           |
| `priority`       | `'P1' \| 'P2' \| 'P3'`              | yes      |                                                                       |
| `type`           | `'functional' \| 'integration' \| 'e2e' \| 'other'` | yes |                                                      |
| `state`          | `'Draft' \| 'Ready' \| 'Retired'`   | yes      | Automated / manual / blocked are NOT states (see FR-004 rationale).   |
| `automation`     | `'required' \| 'optional'`          | yes      | Drives the coverage-defect "missing-required" flag.                   |
| `owner`          | `string`                            | no       | GitHub handle or team alias.                                          |
| `links`          | `{ bugs?: string[]; stories?: string[]; prs?: string[] }` | no | Each entry in `org/repo#N` shorthand. |
| `steps`          | `string` (markdown)                 | yes      | Free-form body between the metadata block and the next case.          |
| `expected`       | `string` (markdown)                 | yes      |                                                                       |
| `coveredBy`      | `string[]` (test file paths)        | derived  | Populated at parse-time by `parse/code-tags.ts`.                      |
| `latestOutcomes` | `Record<release, Outcome>`          | derived  | Joined at render by `join/outcomes.ts`.                               |

### 2. FeatureLibrary (a single `test-plans/content/features/**.md` file)

| Field      | Type                | Required | Source                                                           |
|------------|---------------------|----------|------------------------------------------------------------------|
| `feature`  | `string`            | yes      | File-level front-matter `feature:` field.                        |
| `slug`     | `string`            | yes      | File-level front-matter `slug:` field; used in dashboard URLs.   |
| `path`     | `string`            | yes      | Relative repo path; set by the loader.                           |
| `cases`    | `TestCase[]`        | yes      | Parsed `##` sections in document order.                          |

### 3. ReleasePlan (a single `test-plans/content/releases/*.md` file)

| Field          | Type                                   | Required | Source                                                         |
|----------------|----------------------------------------|----------|----------------------------------------------------------------|
| `release`      | `string` (e.g. `"R31"`)            | yes      | File-level front-matter.                                       |
| `targetDate`   | `string` (ISO 8601 date)               | no       | File-level front-matter.                                       |
| `inScope`      | `string[]` (test case IDs)             | yes      | Parsed from the `## In-scope cases` section.                   |
| `manualOutcomes` | `Record<caseId, Outcome>`            | yes      | Parsed from the `## Outcomes` section; may be empty.           |

### 4. Outcome

| Field      | Type                                                           | Required | Notes                                                                 |
|------------|----------------------------------------------------------------|----------|-----------------------------------------------------------------------|
| `caseId`   | `string`                                                       | yes      |                                                                       |
| `release`  | `string`                                                       | yes      | Release identifier to which this outcome is scoped.                   |
| `outcome`  | `'passed' \| 'failed' \| 'blocked' \| 'not-run'`               | yes      |                                                                       |
| `executedAt` | `string` (ISO 8601)                                          | yes      |                                                                       |
| `source`   | `{ kind: 'automated'; runId: string; file: string } \| { kind: 'manual'; by: string }` | yes | `file` is the test-source path that produced the outcome. |
| `evidence` | `string` (URL or free text)                                    | no       |                                                                       |

### 5. CoverageDefect

| Field      | Type                                                                                             | Required |
|------------|--------------------------------------------------------------------------------------------------|----------|
| `kind`     | `'orphan-automation' \| 'unknown-case-ref' \| 'missing-required-automation' \| 'stale-release-ref'` | yes   |
| `where`    | `string` (file path, release id, or case id)                                                     | yes      |
| `detail`   | `string`                                                                                         | yes      |
| `caseId`   | `string`                                                                                         | no       |

### 6. RunSummary (bot-owned JSON file on `gh-pages`)

Stored at `gh-pages-root/test-plans/runs/<suite>/<date>.json`. One file per suite per calendar date. Re-running on the same date appends to `runs[]` rather than overwriting.

```jsonc
{
  "date": "2026-04-17",
  "suite": "server-api",
  "runs": [
    {
      "runId": "1234567",          // github.run_id
      "startedAt": "2026-04-17T02:00:00Z",
      "completedAt": "2026-04-17T02:28:17Z",
      "commit": "abc123…",
      "branch": "develop",
      "tests": [
        {
          "file": "server-api/src/functional-api/communications/conversations/conversations.it-spec.ts",
          "status": "passed",       // "passed" | "failed" | "skipped"
          "durationMs": 41231,
          "failures": []            // optional: list of error messages for failed tests
        }
        // ...
      ]
    }
  ]
}
```

The dashboard joins `tests[].file` → `TestCase.coveredBy` → case IDs, producing per-case `Outcome` records for each active release plan.

---

## State Transitions

### TestCase lifecycle

```text
Draft ──► Ready ──► Retired
            │
            └──(reopen)──► Draft
```

- `Draft` → `Ready`: QA engineer publishes the case for inclusion in a release plan.
- `Ready` → `Retired`: case is no longer maintained; remains visible in historical release plans, excluded from "eligible for selection" views.
- `Retired` → `Ready` (reopen) is allowed but rare; must re-verify metadata.

State transitions are applied by editing the `state:` field in the case's YAML block. No state machine enforcement beyond "allowed values" is required in MVP.

### No lifecycle state for "Automated" or "Blocked"

These are *derived*, not stored:
- "Automated" = the case has a non-empty `coveredBy` after parsing.
- "Blocked" = the most recent `Outcome` for this case in the current release is `blocked`.

---

## Derived Views (rendered to `gh-pages/test-plans/`)

### Landing (`index.html`)

- Title, last sync timestamp, link to defects view.
- Table of all release plans ordered by `targetDate` descending:
  - Release identifier
  - Target date
  - Total cases in scope
  - % automated (of in-scope cases that have at least one `coveredBy`)
  - % passed (of in-scope cases with any recorded outcome)
  - Link to per-release view.

### Per-release view (`releases/<release>.html`)

- Header: release ID, target date, headline metrics (total in scope, % automated, % passed, # failed, # blocked, # not-run).
- Counts by priority and by type.
- Table of in-scope cases:
  - ID, title, feature, priority, type, automation-required?, current outcome (joined from runs + manual).
  - Cross-repo links rendered inline with enriched title/state.
- Section "Linked stories and bugs (all cases)" aggregating unique cross-repo links across in-scope cases.

### Per-feature view (`features/<slug>.html`)

- Header: feature name, total cases, counts by state and priority.
- Full case list with full detail (steps, expected, links, coveredBy paths).
- Cross-reference: for each case, the list of releases it has appeared in.

### Coverage-defects view (`defects.html`)

- Four sections, one per `CoverageDefect.kind`:
  - Orphan automation tests (file path, first-seen date if trackable).
  - Unknown case references (from `@testCase` tags referencing nonexistent IDs).
  - Required-automation cases with no covering test.
  - Stale release references (release plan lists a case that has been retired or deleted).
- Sortable; downloadable as CSV.
