<!--
Sync Impact Report
Version Change: 1.0.0 → 2.0.0 (MAJOR: Principle II redefined, Principle III adjusted to reflect real API harness constraints)
Modified Principles:
	II. "Test-First & Independent Story Verification" → "Post-Implementation API Coverage & Progressive Hardening"
	III. "Deterministic, Idempotent, Isolated Tests" → "Stable Environments & Controlled Determinism"
Added Guidance: Clarified API vs internal utility testing strategy; introduced stability env requirements; clarified data seeding.
Removed Requirements: Mandatory test-first for API layer (now conditional for internal harness utilities only).
Templates Requiring Updates:
	- .specify/templates/plan-template.md ✅ (Gate #3 updated: API Coverage Plan replaces Test-First)
	- .specify/templates/spec-template.md ⚠ (Add note: API coverage added post-implementation – keep R-### numbering)
	- .specify/templates/tasks-template.md ⚠ (No wording change; ensure tasks can represent coverage additions)
Deferred TODOs: None
-->

Status: APPROVED
Spec-ID: CONSTITUTION
Spec-Version: 2.0.0
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

### II. Post-Implementation API Coverage & Progressive Hardening

For Alkemio server features, primary implementation occurs in the server repository first.
The test harness introduces API coverage AFTER endpoint behavior exists. Initial coverage
MUST prioritize: (a) high-risk endpoints (auth, data integrity), (b) recently changed
contracts, (c) regression-prone flows. Internal harness utilities (data factories,
normalizers) SHOULD follow test-first (TDD) to keep abstraction lean.
Progressive Hardening: Each iteration SHOULD elevate coverage depth: smoke → contract →
behavioral → edge. Coverage debt MUST be tracked with tasks referencing `R-###`.
Rationale: Reflects actual delivery order while still enforcing disciplined expansion of
quality safeguards.

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
Accessibility (for client-web tests): Critical flows MUST include at least one accessibility
assertion (contrast, ARIA landmark presence) for P1 stories.
Reliability: CI failure threshold >2 consecutive runs triggers mandatory investigation task.
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
**Version**: 2.0.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-10-22
