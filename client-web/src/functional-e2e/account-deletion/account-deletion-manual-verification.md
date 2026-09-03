# Manual verification — self-service account deletion (054)

Companion to [account-deletion-test-plan.md](./account-deletion-test-plan.md): the
step-by-step script for every row the plan routes to manual verification (M-1..M-5,
X-1). Automation covers everything else — do not re-verify by hand what the plan
maps to an automated case.

Stories: client-web#10107 · workspace#054 · Release 74 (alkem-io/alkemio#2111)

Record results per check (pass/fail + date + environment) in the release story or
the QA sign-off note.

---

## Verification log

### 2026-09-02 · dev (dev-alkem.io) · QA lead, hands-on

| Check | Result | Evidence |
|---|---|---|
| Session-freshness gate fires on a >15-min session | **PASS** | Delete attempt on an aged session redirected to sign-in; the Kratos SSO session was ended first, so the sign-in was a genuine credential prompt (no silent completion — the R-5 concern not observed on this walk) |
| Re-auth resumes the deletion flow (D-2 — the round trip automation defers for lack of session-clock control) | **PASS** | After credential sign-in, returned into the deletion flow; it did **not** auto-execute — the preflight ran and rendered its verdict |
| Blocked dialog: per-kind totals + named items (US2-AS1/AS2) | **PASS** | Account holding 2 Spaces / 1 Virtual Contributor / 2 Innovation Packs showed exactly those totals with all 5 items named and correctly classified; "Contact support" and "Manage my account resources" both present |
| Blocker rows not click-through | **Confirmed as the accepted R-29 shortfall** | Items listed by name only; the generic "Manage my account resources" button is the sole navigation route. Accepted for R74 — belongs in release notes, follow-up story owns the fix |
| Post-deletion session revocation binds (R-4 best-effort leg observed working) | **PASS** | On a separate throwaway account after deletion: `identity.dev-alkem.io/sessions/whoami` with the residual cookie → **401** `session_inactive`; the app is unauthenticated |
| Post-deletion cookie audit (X-1 bonus) | **PASS — no leak** | BFF `alkemio_session` cleared; residual `ory_kratos_session_dev` / `ory_hydra_session` / CSRF / continuity / APM entries are inert (proven by the 401), opaque blobs, no PII. Cosmetic polish possible: bounce the final logout through Kratos's own logout endpoint to expire its cookie on `identity.*` |
| Mixed-credential deletion (email/password + linked LinkedIn) — variant not cased in the plan (M-1 covers SSO-only) | **PASS** | Deletion completed normally — the social link is not a blocker; signing in with LinkedIn afterwards provisioned a **brand-new empty account**: no profile data, memberships, or linkage resurrected, mirroring TC-11's re-register-same-email oracle on the social path |
| Blocked dialog "Contact support" opens a `mailto:` to support@alkem.io | **Confirmed as specified** | Spec names support@alkem.io as the parallel route; the in-product resolution path ("Manage my account resources") is present, satisfying the Apple 5.1.1(v) note. UX observation for a follow-up, not a finding: `mailto:` appears inert on machines with no mail client configured — a contact page would be more robust |
| **SC-005 / D-3 — audit trail verified by hand** (direct read of `platform_audit_entry` on the dev DB) | **PASS** | Exactly **one** primary `account_deleted` row, category `account_deletion`, `initiatorRole: self`, subject = initiator, data `{blockerCheck: pass, documentCount: 3, externalSubscriptionID: null}` — written in-transaction; followed ~0.5s later by the three leg rows `session_revocation_completed`, `identity_deletion_completed`, `file_bytes_cleanup_completed`. This is the manual equivalent of the D-3 oracle the harness cannot reach on hosted envs |
| Pre-deletion resource disposition (transfers/deletions of blockers) is NOT audited | **Confirmed expected** | Blocker resolution runs through the ordinary space/VC/pack mutations, which have never written to `platform_audit_entry`; 054's audit scope is the deletion saga only. Governance follow-up raised: [client-web#10263](https://github.com/alkem-io/client-web/issues/10263) |
| Kratos identity row physically removed (direct read of `kratos.identities` on the dev DB) | **PASS** | The deleted user's row is gone from `kratos.identities` — the identity-deletion leg is a hard delete, corroborating the `identity_deletion_completed` audit row, the whoami 401, and the fresh-account re-registration observed on both the email and LinkedIn paths |

Completed in a follow-up session the same day (2026-09-02, dev/test, QA lead —
all reported PASS): the confirm-dialog keyboard pass (focus trapped, Escape
cancels), M-1 (SSO-only account re-auths via the provider's own login, no
password field, flow resumes), M-2/M-4 (docs page verified in EN and NL,
including the Matrix-identity wording), and the three X-1 walks (draft
whiteboard, in-flight invitation, open conversation — deletions completed, no
orphans or residual PII observed).

### 2026-09-02 · local compose stack (localhost) · M-5 — PR #620 loopback-tier suite

Branch `feat/054-delete-own-account` at `4f67a6e0` (PR #620 merged with `develop`),
run from the QA lead's checkout against the local compose stack. #620 has since
merged into `develop` (2026-09-03, `6f88de23`).

| Check | Result | Evidence |
|---|---|---|
| PR #620 API slice via the `test:contributormanagement` lane (the only way the PR routes it: the `nightly` project excludes `delete-own-account*`) | **PASS — 16/16** | `delete-own-account.it-spec.ts` 16 passed (US1 1, US2 5, US4 2, US3 4, US5 4); `delete-own-account.baseline.it-spec.ts` 1 skipped — the T101 falsification gate self-skips on a hardened server, as designed. Lane totals 274 passed / 2 failed / 1 skipped of 277 in 5.7 min; both failures are outside PR #620 (next row). A first attempt with `test:nightly:ui` ran 259 cases but none of PR #620's — that lane excludes them by design |
| Non-620 lane failures: `deleted-user-session-orphan` SRA-E1 and `delete-user` "should delete created user" | **Environment, not product** | Both fail only when `createUser` runs past the harness's ~5 s connection cut: the wrapper logged 46 `[ENV_FAILURE]` retries all-time, every one on attempt 1, 14 of them on `CreateUser`; the retried create then returns no id and the test's `userId` stays `''`. SRA-E1 passes in isolation (926 ms). Same class as test-suites#563 / server#6258. Hardened on this branch: both specs now create through `createUserOrFail`, which recovers the committed user by nameID after a retry-after-commit (mirrors `createSpaceBasicDataOrFail`) |
| PR #620 Playwright walks, headless, against the local stack | **PASS — 13/13** | `us1-delete-own-account` 6, `us2-blocked-resources` 5, `us3-reauth-freshness` 2, in 1.1 min. US2-AS4 is the blocked → resolve → delete-through tail left to automation on 2026-09-02 — now executed |
| PR #620 review finding surfaced by this run | **Fixed on #620 before merge** | `delete-own-account.it-spec.ts` never bootstrapped `TestScenarioFactory`, so `TestUserManager` was populated only when another lane file happened to run first in the same worker; standalone, all 16 cases failed with `TypeError: Cannot read properties of undefined (reading 'get')`. Fixed with the same `beforeAll` every sibling spec uses |

Still open: the TC-17 ruling from the client-web#10231 owner. M-5 is closed above;
it stays a **manual release gate** until a compose-backed CI job exists, because the
loopback-tier suite runs in no pipeline (a pipeline-coverage gap by design, not
pending review).

---

## M-1 — SSO re-auth without a password prompt

*Why manual: no external IdP in the compose stack; asserting a negative ("no
password field") against a stood-up IdP is disproportionate.*

Needs a test account whose only sign-in method is Google/SSO. Environment: dev or test.

1. Sign in with the SSO account.
2. Leave the session for 15+ minutes (do M-2 meanwhile).
3. User → Settings → Security → **Delete account**.
4. ✅ Routed to re-authentication showing the **SSO provider's own login** — no
   password field anywhere.
5. Complete the SSO login. ✅ You return to the deletion flow; it does **not**
   auto-execute the deletion.
6. Keyboard pass on the confirm dialog: **Tab** cycles focus inside the dialog
   only; **Escape** closes it with nothing deleted.
7. Cancel out — keep the account for reuse.

## M-2 + M-4 — docs page truthfulness (app-store URL target)

*Why manual: editorial truthfulness against shipped behaviour is human judgement,
and this page is the App Store Connect / Play Data-Safety deletion-URL target.*

1. Open the published docs site → `/how-to/delete-account`, **English**.
2. Verify it states: deletion is immediate, permanent, irreversible; you may be
   blocked by owned spaces / virtual contributors / innovation packs / hubs or
   sole organization ownership; `support@alkem.io` is the parallel route; and —
   critically — **the Matrix chat identity is not removed immediately** (accepted
   v1 residual; the docs must not overpromise).
3. Repeat in **NL**.
4. ❌ Anything missing or overpromising → flag on the docs PR (documentation#148).

## M-5 — execute PR 620's loopback-tier suite before release sign-off

*Why manual: alkem-io/test-suites#620's 16 API cases + 3 Playwright walks are
confined to loopback (by design) and excluded from the nightly — they currently
run in no pipeline. Until a compose-backed CI job exists, a human run is the only
execution.*

Needs the local compose stack up.

```bash
cd <your test-suites checkout>   # develop — #620 merged 2026-09-03 (6f88de23)
pnpm install

# API slice (16 cases + the self-skipping baseline):
pnpm --filter @alkemio/test-suite-server-api run test:contributormanagement

# The three walks, headless:
cd client-web && UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/account-deletion/us
```

✅ Record the pass/fail counts — recorded 2026-09-02 in the verification log
above (API 16/16, walks 13/13). Known risks going in: the harness Postgres
defaults may be wrong (`synapse`/`synapse` — a connect failure here is itself a
PR-620 review finding, report it there), and `POSTGRES_*`/Redis vars must point
at the local compose services.

## X-1 — exploratory charter (~90 min): deletion with unusual state

*Why manual/exploratory: the blocker set knows four resource kinds; nobody has
walked what falls between them.*

Prep: register three throwaway users via the normal sign-up. Environment: test.

1. **Draft whiteboard** — user A opens a whiteboard, draws, leaves it
   unsaved/draft → delete the account → ✅ deletion completes; the whiteboard's
   space renders for another user with no broken tile or error.
2. **In-flight invitation** — user B has a pending space invitation (not
   accepted) → delete the account → ✅ deletion completes; the space admin's
   invitations list has no ghost entry and does not error.
3. **Open conversation** — user C sends chat messages, leaves the thread open in
   another browser → delete the account → ✅ deletion completes; the other
   participant's chat loads, the sender is de-attributed ("Former member"), no
   blank rows.
4. **PII sweep** — for ~10 minutes, browse everywhere the deleted users were
   active (feeds, comments, member lists). Their name or email appearing
   anywhere post-deletion is a finding.

### TC-17 disputed behavior — observed first-hand (2026-09-02, dev, QA lead)

Reproduced by deleting only `ory_kratos_session_dev` while `alkemio_session`
survived, then opening Settings → Security: the tab renders the #10249
recovery state (Connected Accounts + Security sections each showing "Your
session with our sign-in provider has expired … sign out and sign in again",
with the recovery button) and **no Delete-account card anywhere on the tab**.
The deletion entry point is therefore unreachable in this state until the
user manually recovers the session — the observed behavior the open ruling
below must either fix or formally except from FR-001 ("always reachable").

## Open ruling gating TC-17 (not a test)

Ask the client-web#10231 owner: is hiding the Delete-account card in the
`sessionExpired` Security-tab state intended? The withholding test's rationale
("deletion could not satisfy the session-age gate anyway") is contradicted by
`useDeleteAccount`'s own handling of an absent Kratos session ("no-session —
safe to proceed", forcing a genuine re-login). The app-store rule wants the
entry point always reachable. Their answer either unblocks the plan's TC-17 or
records the exception against FR-001.

## Release-time (ACC) — owned by the Release 74 checklist, not this document

Migration applied before the client serves traffic · stale-client notification
bell check · deletion from a custom-domain origin · ≥24h soak. See
alkem-io/alkemio#2111.
