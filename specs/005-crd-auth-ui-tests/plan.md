# Implementation Plan: CRD Authentication Pages — Test Suite Alignment

**Branch**: `005-crd-auth-ui-tests` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-crd-auth-ui-tests/spec.md`

## Summary

The Alkemio web client is migrating its authentication screens from MUI to the CRD design system. The migration is UI-only — URLs, backend flows, validation, error copy, redirects, supported methods, and analytics are unchanged. This plan covers the **QA-side work**: re-aligning the existing Playwright functional-E2E authentication suite (`client-web/src/functional-e2e/authentication/` + shared page objects in `identity-flows/` and `space/pages/LoginPage.ts`) so every currently-passing scenario keeps passing against the CRD screens, with no loss of coverage.

Technical approach: treat the page-object layer as the single point of change. Build a **selector inventory** mapping each MUI-bound locator to a CRD-valid strategy (accessible role+name, persistent label, or stable `data-testid`), prioritising language-stable and accessibility-aligned selectors. Confirm each replacement empirically against a running CRD build, record any missing stable hook as an explicit gap (FR-008), update the shared page objects + `LoginPage`, and refresh `AUTHENTICATION_TEST_PLAN.md`. Spec files (`*.spec.ts`) stay behaviorally identical; the only in-test edits are inline locators not yet factored into page objects (e.g. `getByRole('link', { name: 'Forgot password?' })`).

## Technical Context

**Language/Version**: TypeScript ~5.7.3, Node.js 20.9.0 (Volta)
**Primary Dependencies**: Playwright Test (Chrome branded channel), `@alkemio/tests-lib` (MailSlurper helpers: `getVerificationLink`, `getRecoveryCode`, `getRecoveryLink`, `deleteMailSlurperMails`, `UniqueIDGenerator`, `delay`)
**Storage**: N/A — auth storage-state JSON persisted under `client-web/.auth/` by the session fixture
**Testing**: Playwright `.spec.ts` under `client-web/src/functional-e2e/`; run via `pnpm --filter @alkemio/test-suite-client-web run test:auth-playwright`
**Target Platform**: Chrome against a running Alkemio web client serving the **CRD** authentication screens, with Kratos + MailSlurper reachable (local or remote env)
**Project Type**: web — the `client-web` package of the pnpm-workspaces monorepo
**Performance Goals**: Constitution UI standard — p95 single UI action < 1500ms; no net increase in suite runtime from the alignment
**Constraints**: Upstream change is UI-only → assertions and scenarios are frozen; only selectors/navigation may change. No new test infra, no new dependencies, no new scenarios. Default test-env language is English. Selector strategy must survive the six-language CRD rollout.
**Scale/Scope**: 6 active spec files (~20 active tests; 1 `test.skip` for bug #8317), 6 shared page-object modules (`common-authentication-page-elements.ts`, `login-page-objects.ts`, `identity-flows/{signin,signin-fixed,registration,signup,verify}-page-objects.ts`), 1 downstream `LoginPage.ts`, and 1 test-plan doc.

**Resolved unknowns** (see [research.md](./research.md)):
- Exact CRD accessible names / `data-testid`s are confirmed empirically against a running CRD build during implementation; the selector inventory enumerates every locator to confirm and its candidate CRD strategy derived from client-web `specs/101-crd-auth-pages/spec.md` (FR-005…FR-020) and the design system's accessibility commitments.
- Whether a CRD build is available to validate against is a precondition for the verification step (quickstart), not for producing the selector inventory and page-object edits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Specification & Traceability (NON-NEGOTIABLE) | ✅ PASS | Spec exists with numbered `FR-001…FR-011` and `SC-001…SC-007`. Tasks (`/speckit.tasks`) will reference these; the traceability matrix in [data-model.md](./data-model.md) maps scenario → suite → requirement so no orphans arise. (Constitution uses `R-###`; this feature uses Spec Kit's `FR-###` — treated as equivalent governing IDs.) |
| II. GraphQL Schema Contract Governance | ➖ N/A | This is UI E2E coverage; it makes no GraphQL contract assertions and depends on no schema fields. No `schemaHash` artifact applies. |
| III. Stable Environments & Controlled Determinism | ✅ PASS | Tests run against a live client/Kratos. Reinforced: password-recovery test is intentionally idempotent (resets to same password); registration uses unique `test+{id}@alkem.io`; assertions target invariants (presence, headings, error text) not volatile values. |
| IV. Observability & Structured Reporting | ✅ PASS | Existing Playwright HTML report (`html-report/`) and `playwright-report/` retained; no change to reporting. Selector-gap findings (FR-008) captured as a reviewable artifact in `contracts/`. |
| V. Semantic Versioning & Simplicity | ✅ PASS | No new dependencies. Net simplification: consolidate the duplicate `signin-page-objects-fixed.ts` into the canonical `signin-page-objects.ts` rather than maintain two. Shared page objects are internal test helpers (not a published contract), so no version bump required. |

**Quality gates**: Secrets remain in env vars (`AUTH_TEST_HARNESS_PASSWORD`) — none committed. Test data namespaced per run (unique emails, cookie clear in `beforeEach`). No `[PERF-EXEMPT]` needed.

**Result**: PASS — no violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/005-crd-auth-ui-tests/
├── plan.md              # This file (/speckit.plan)
├── research.md          # Phase 0 output — decisions & resolved unknowns
├── data-model.md        # Phase 1 output — selector inventory + traceability matrix
├── quickstart.md        # Phase 1 output — how to run & verify against a CRD build
├── contracts/
│   └── crd-auth-selector-contract.md   # Stable accessible-name/testid contract + gap log (FR-008)
├── checklists/
│   └── requirements.md  # (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

Files this feature touches — all within the `client-web` package; no `lib/` or `server-api/` changes:

```text
client-web/src/functional-e2e/
├── authentication/
│   ├── common-authentication-page-elements.ts   # PRIMARY: shared selectors (email/password/labels, provider buttons, checkbox, cookie banner, headings, links)
│   ├── login-page-objects.ts                     # navigation helpers (menu → login, signup, terms, registration)
│   ├── AUTHENTICATION_TEST_PLAN.md               # doc of record — update (FR-007)
│   ├── authentication-login.spec.ts              # inline locators: invalid-cred error regex, logout sign-in option
│   ├── authentication-registration.spec.ts       # inline locators: verification-pending copy, "Continue", "Sign in" heading
│   ├── authentication-password-recovery.spec.ts   # inline locators: "Forgot password?", "User Settings" heading, dashboard links
│   ├── authentication-page-verification.spec.ts   # delegates to identity-flows verifiers
│   ├── authentication-cookie-consent.spec.ts      # cookie banner + accept button
│   └── authentication-restricted-access.spec.ts   # restricted-page headings/links (shell-level — verify, likely unchanged)
├── identity-flows/
│   ├── signin-page-objects.ts                    # verify/fill/submit sign-in
│   ├── signin-page-objects-fixed.ts              # DUPLICATE (CRD-style) → consolidate into signin-page-objects.ts
│   ├── registration-page-objects.ts              # verify/fill registration, password step, success page
│   ├── signup-page-objects.ts                    # verify sign-up (terms gating)
│   └── verify-page-objects.ts                    # verify email-verification page
├── fixtures/
│   └── authenticated-session.fixture.ts          # storage-state reuse — depends on LoginPage (SC-004)
└── space/pages/
    └── LoginPage.ts                              # DOWNSTREAM auth entry (textbox 'E-Mail'/'Password', PersonIcon menu) — used by fixture, memberships, seed (SC-004)
```

**Structure Decision**: Single-package change confined to `client-web/src/functional-e2e/`. The page-object layer (`common-authentication-page-elements.ts`, `identity-flows/*`, `LoginPage.ts`) is the unit of change; `*.spec.ts` scenario bodies are frozen except for inline locators they declare directly. `LoginPage.ts` is treated as first-class scope because downstream non-auth suites authenticate through it — breaking it would cascade beyond the authentication suite (SC-004).

## Complexity Tracking

> No Constitution Check violations — section intentionally empty.
