# Quickstart: Verify the CRD Auth Test Alignment

How to run and confirm the authentication suite passes against the new CRD authentication screens, with no coverage loss.

## Precondition (R7)

You need an Alkemio web client **serving the CRD authentication screens** reachable at `ALKEMIO_BASE_URL`, with Kratos and MailSlurper available (email-dependent flows: registration verify, password recovery).

- Local: a client-web dev build with the CRD auth feature merged, plus the local server stack (`http://localhost:3000`).
- Remote: a deployed environment whose client already serves CRD auth.

If no CRD build is reachable, you can still produce the selector edits from `data-model.md`, but the pass/fail verification below (SC-001…SC-004, SC-006) is gated until a build exists — note this rather than skipping silently.

## 1. Environment

```bash
# from repo root
pnpm install
pnpm --filter @alkemio/test-suite-client-web exec playwright install
```

Copy `client-web/.env.default` → `client-web/.env` and set at least:

```
ALKEMIO_BASE_URL=<url of the CRD-enabled client>
AUTH_TEST_HARNESS_PASSWORD=<test user password>
MAIL_SLURPER_ENDPOINT=<mailslurper url>
KRATOS_ENDPOINT=<kratos url>
```

Test users expected to exist: `admin@alkem.io`, `non.space@alkem.io`. Registration creates `test+{uniqueId}@alkem.io` on the fly.

## 2. Run the authentication suite

```bash
cd client-web

# whole auth suite
pnpm exec playwright test src/functional-e2e/authentication

# or individual files, in priority order (US1 → US2 → US3)
pnpm exec playwright test src/functional-e2e/authentication/authentication-login.spec.ts
pnpm exec playwright test src/functional-e2e/authentication/authentication-page-verification.spec.ts
pnpm exec playwright test src/functional-e2e/authentication/authentication-registration.spec.ts
pnpm exec playwright test src/functional-e2e/authentication/authentication-password-recovery.spec.ts
pnpm exec playwright test src/functional-e2e/authentication/authentication-cookie-consent.spec.ts
pnpm exec playwright test src/functional-e2e/authentication/authentication-restricted-access.spec.ts
```

## 3. Confirm downstream auth still works (SC-004)

The session fixture and non-auth suites authenticate through `space/pages/LoginPage.ts`. Smoke-check that storage-state login still succeeds:

```bash
pnpm exec playwright test src/functional-e2e/memberships/access-private-subspace-in-private-space-non-member.spec.ts
```

A green run here confirms `LoginPage.login()` selectors survived the CRD migration.

## 4. Selector-resolution sanity (SC-003)

While iterating, use codegen / the inspector to confirm each updated helper resolves to exactly one element:

```bash
pnpm exec playwright codegen <ALKEMIO_BASE_URL>/identity/login
PWDEBUG=1 pnpm exec playwright test src/functional-e2e/authentication/authentication-login.spec.ts
```

For any element lacking a stable accessible hook, record a row in `contracts/crd-auth-selector-contract.md` (Gap Log) before resorting to a structural selector.

## 5. Acceptance checklist

- [ ] **SC-001** — all scenarios marked "Implemented" in `AUTHENTICATION_TEST_PLAN.md` pass against the CRD build.
- [ ] **SC-002** — active (non-`.skip`) test count is unchanged vs. before the alignment (the #8317 `test.skip` stays skipped, nothing else newly skipped).
- [ ] **SC-003** — no helper produces a zero-match or strict-mode ambiguous-match error.
- [ ] **SC-004** — `LoginPage`-based downstream login succeeds; storage state regenerates.
- [ ] **SC-005** — `AUTHENTICATION_TEST_PLAN.md` updated (new "Last Updated", CRD noted, scenario list intact).
- [ ] **SC-006** — invalid-credentials and other error/redirect assertions produce identical outcomes.
- [ ] **SC-007** — Gap Log count reported; every gap has a proposed follow-up.

## 6. Reports (Constitution IV)

Playwright HTML report lands in `client-web/playwright-report/` / `html-report/`. Attach the path as test evidence on the PR alongside the `FR-###` references.
