<!--
Sync Impact Report
Version Change: 2.1.0 → 3.0.0 (MAJOR: Removal of mandatory Accessibility & Reliability gates)
Modified Principles: None
Removed Quality Gates:
  - Accessibility (client-web tests) mandatory assertion requirement
  - Reliability CI failure threshold (>2 consecutive runs) escalation rule
Added Sections: None
Templates Requiring Updates:
  - .specify/templates/plan-template.md ⚠ (Remove Accessibility gate reference if present)
  - .specify/templates/spec-template.md ✅ (No dependency on removed gates)
  - .specify/templates/tasks-template.md ✅ (Unaffected)
Follow-up TODOs: Update plan template gating list to drop Accessibility reference (separate patch applied if accepted)
-->

Status: APPROVED
Spec-ID: CONSTITUTION
Spec-Version: 2.1.0
Last-Updated: 2025-10-22
Owner: valentin@alkem.io

# Alkemio Test Suites Constitution

## Core Principles

### I. Specification & Traceability (NON-NEGOTIABLE)

All feature work MUST begin with a written spec under `specs/` using Spec Kit templates.
Every functional/non-functional requirement MUST be numbered `R-###` and remain immutable
once APPROVED. Tasks (`T-###`) MUST reference at least one requirement; no orphan
requirements or tasks. Any scope change requires spec version increment and impact analysis.
Rationale: Ensures auditability, prevents silent scope drift, and enables deterministic QA.

### II. GraphQL Schema Contract & Operation Coverage Governance

The harness validates the external `alkem-io/server` GraphQL contract. Implementation of
features happens upstream; this repository adds post-implementation assurance.

Contract Source of Truth: - Canonical snapshot: `schema.graphql` (sourced from server repo commit) hashed (SHA256) → `schemaHash`. - Change artifacts (produced upstream): `change-report.json`, `deprecations.json` (NOT committed here; referenced for risk targeting when available).

Operation Coverage Manifest (future optional artifact): - File: `coverage/operation-coverage.yaml` storing list of exercised Queries, Mutations, Subscriptions. - Fields: operation name, type (QUERY|MUTATION|SUBSCRIPTION), risk (HIGH|MEDIUM|LOW), categories (SMOKE|SCHEMA|NEGATIVE|EDGE|PERF|SEC), lastTestedCommit.

Minimum Governance Rules: 1. New GraphQL field or operation of HIGH risk (auth, data mutation, permission boundary) MUST gain SMOKE coverage within 5 calendar days of detection. 2. Any BREAKING or PREMATURE_REMOVAL classification upstream MUST trigger a tracking task (`T-###`) referencing governing requirement (`R-###`). 3. Deprecation lifecycle (REMOVE_AFTER date) compliance MAY be asserted indirectly—tests MUST avoid relying on fields marked for removal beyond their schedule. 4. Coverage debt past grace creates a blocking task before adding unrelated new coverage. 5. Internal harness utilities (data factories, stable seed orchestration) SHOULD be test-first to constrain complexity; GraphQL operation tests are post-implementation.

Scope of Assertions: - Prefer invariant assertions (non-null fields, list lengths, auth enforcement) over volatile values. - Avoid overspecifying full deep response trees—assert only contract-relevant nodes.

Rationale: Tailors contract assurance to a GraphQL-first system where schema diffs & governance live in another repository while enabling incremental, risk-prioritized validation here.

### III. Stable Environments & Controlled Determinism

API tests MAY interact with a running Alkemio server instance; environment stability is
achieved via: predictable seed data, isolated test accounts, and resettable states.
Where full determinism is impossible (timestamps, distributed IDs), assertions MUST focus
on invariant properties (status codes, schema shapes, required field presence) instead of
volatile values. Randomness MUST be seeded when used for data generation. Flaky tests
MUST be tagged `@flaky` and quarantined within 24h; environment instability root cause
MUST be documented before re-enabling.
Rationale: Balances real integration fidelity with practical stability constraints of a
live server dependency.

### IV. Observability & Structured Reporting

Each test run MUST produce structured artifacts (e.g., Playwright HTML reports under
`html-report/` with timestamp) and, where possible, machine-readable summaries (JSON) for
trend analysis. Failures MUST surface root cause indicators (stack trace, request/response,
selectors). Logging MUST be contextual and avoid sensitive data. Report retention policy:
minimum last 30 runs.
Rationale: High-fidelity feedback reduces MTTR and supports continuous improvement.

### V. Semantic Versioning & Simplicity

Public-facing contracts (API schemas, shared test-lib helpers) MUST follow semantic
versioning (MAJOR.MINOR.PATCH). Breaking changes REQUIRE: (a) spec amendment, (b) migration
notes, (c) version bump. New dependencies MUST justify value (performance, capability,
maintainability). Prefer lean abstractions; remove unused code within one sprint.
Rationale: Preserves stability for downstream consumers and keeps maintenance costs low.

## Quality Gates & Non-Functional Standards

Performance (where applicable): Test harness operations SHOULD complete under p95 500ms for
single API validation; UI interaction scripts SHOULD keep p95 action <1500ms unless marked
`[PERF-EXEMPT]` in spec.
Security: Secrets MUST NOT be committed; environment variables loaded via secure runtime
configuration. Sensitive fixtures MUST be masked.
Data Management: Test data MUST be reset or namespaced per run; no leakage across suites.
Definition of Done (DoD): Requirements implemented, tests passing, quickstart validated,
reports generated, and spec/tasks cross-reference clean.

## Development Workflow & Review Process

Phase Flow: `/specify` → `/clarify` → `/plan` → `/checklist` → `/tasks` → `/analyze` →
`/implement` → SHIPPED. A phase cannot advance with unresolved `[NEEDS CLARIFICATION]`.
Reviews: Every PR MUST link the relevant `R-###` and `T-###` IDs in description. Signed
commits are REQUIRED. Test evidence (screenshot/report path) MUST be provided for any
changed user story.
Checklist Enforcement: Generated checklist MUST show zero orphan requirements and full
acceptance criteria coverage before tasks generation.
Quarantine Protocol: Flaky test identified → mark with `@flaky` tag → create remediation
task referencing original requirement.
Continuous Improvement: Monthly governance review updates Success Criteria enforcement and
removes deprecated practices.

## Governance

Authority: This Constitution supersedes ad-hoc practices for test suite development.
Amendments: Proposals submitted via PR modifying this file with an Impact Report comment.
Versioning Policy: MAJOR (principle removal/redefinition), MINOR (new principle or
materially expanded guidance), PATCH (clarifications & editorial). Ratification occurs on
first adoption; Last Amended updates only when semantic meaning changes.
Compliance: Each feature plan MUST include a "Constitution Check" section reflecting these
principles. CI may fail builds if gating rules violated.
Drift Detection: `/analyze` phase MUST flag unmapped `R-###` or unreferenced `T-###` before
IMPLEMENTING. Breaking contract changes REQUIRE migration notes under `contracts/`.
Deprecation: Mark principle as DEPRECATED with rationale & migration path; retain history.
Audit: Quarterly review ensures observability artifacts retention and dependency pruning.

## Appendix A: GraphQL Coverage Artifacts

Artifacts (present or planned) supporting Principle II:
| Artifact | Location | Commit Policy | Purpose |
|----------|----------|---------------|---------|
| schema.graphql | (external server repo) | Committed upstream | Canonical contract snapshot |
| schemaHash (SHA256) | (captured in test logs or manifest) | Ephemeral | Trace test run to schema version |
| operation-coverage.yaml (optional) | coverage/ | Committed | Track which operations & risk classes covered |
| gap-report.json (optional) | coverage/ (CI artifact) | Ephemeral | Identifies newly added operations lacking coverage |
| flakiness-log.json | reports/ (CI artifact) | Ephemeral | Surfaces quarantined tests & timestamps |

Classification Mapping Guidance:
| Classification (upstream) | Harness Response |
|---------------------------|------------------|
| BREAKING / PREMATURE_REMOVAL | Create blocking task + evaluate need for compensating tests |
| INVALID_DEPRECATION_FORMAT | Raise issue upstream (not fixable here) |
| DEPRECATION_GRACE | Monitor; schedule removal of dependent assertions |
| DEPRECATED | Start planning removal from tests before REMOVE_AFTER |
| ADDITIVE | Schedule SMOKE coverage if risk=HIGH |

**Version**: 3.0.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
