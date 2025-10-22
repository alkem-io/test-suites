<!--
Sync Impact Report
Version Change: 4.0.2 → 4.0.3 (PATCH: Removed unimplemented flakiness-log.json artifact & synced footer version)
Modified Sections:
  - Appendix A: Removed flakiness-log.json row (artifact not implemented; aligns with removal of @flaky protocol).
  - Footer version string updated to 4.0.3 (previous mismatch after earlier edits).
Added Sections: None
Templates Requiring Updates: None
Behavioral Change: None (documentation minimization only)
Follow-up TODOs: None
-->

Status: APPROVED
Spec-ID: CONSTITUTION
Spec-Version: 4.0.3
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

Minimum Governance Rules: 1. Any BREAKING or PREMATURE_REMOVAL classification upstream MUST trigger a tracking task (`T-###`) referencing governing requirement (`R-###`). 2. Deprecation lifecycle (REMOVE_AFTER date) compliance MAY be asserted indirectly—tests MUST avoid relying on fields marked for removal beyond their schedule. 3. Internal harness utilities (data factories, stable seed orchestration) SHOULD be test-first to constrain complexity; GraphQL operation tests are post-implementation.

Scope of Assertions: - Prefer invariant assertions (non-null fields, list lengths, auth enforcement) over volatile values. - Avoid overspecifying full deep response trees—assert only contract-relevant nodes.

Rationale: Tailors contract assurance to a GraphQL-first system where schema diffs & governance live in another repository while enabling incremental, risk-prioritized validation here.

### III. Stable Environments & Controlled Determinism

API tests MAY interact with a running Alkemio server instance; environment stability is
achieved via: predictable seed data, isolated test accounts, and resettable states.
Where full determinism is impossible (timestamps, distributed IDs), assertions MUST focus
on invariant properties (status codes, schema shapes, required field presence) instead of
volatile values. Randomness MUST be seeded when used for data generation. Recurrently
unstable tests SHOULD be temporarily disabled and a remediation task created; broad retry
inflation is discouraged.
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

<!-- Quarantine protocol removed: simplified to remediation task creation when instability persists -->

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

Artifacts (minimal) supporting Principle II:
| Artifact | Location | Commit Policy | Purpose |
|----------|----------|---------------|---------|
| schema.graphql | (external server repo) | Committed upstream | Canonical contract snapshot |
| schemaHash (SHA256) | test run logs | Ephemeral | Trace test run to schema version |

Classification Mapping Guidance:
| Classification (upstream) | Harness Response |
|---------------------------|------------------|
| BREAKING / PREMATURE_REMOVAL | Create blocking task + evaluate need for compensating tests |
| INVALID_DEPRECATION_FORMAT | Raise issue upstream (not fixable here) |
| DEPRECATION_GRACE | Monitor; schedule removal of dependent assertions |
| DEPRECATED | Plan removal from tests before REMOVE_AFTER |

**Version**: 4.0.3 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
