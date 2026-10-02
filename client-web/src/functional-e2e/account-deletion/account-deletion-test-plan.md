# Test plan — self-service account deletion (054)

> **Status:** Approved — QA lead, in-session, 2026-09-02 (scope: delta after PR #620 reconciliation)
> · **Depth:** deep — irreversible data-destructive path, an authorization/session gate, 2 migrations
> and a declared BREAKING GraphQL change across 3 repos (≥ 2 elevated triggers; tier also set
> explicitly by the invoker) · **Story:**
> [client-web#10107](https://github.com/alkem-io/client-web/issues/10107) · **Spec:**
> `agents-hq/specs/054-delete-own-account/` · **Diffs:**
> [server#6416](https://github.com/alkem-io/server/pull/6416),
> [client-web#10231](https://github.com/alkem-io/client-web/pull/10231), both merged 2026-09-01
>
> **Basis reconciled 2026-09-02 against [test-suites#620](https://github.com/alkem-io/test-suites/pull/620)**
> (**merged into `develop` 2026-09-03 as `6f88de23`**; its loopback walks now sit beside this plan under `account-deletion/`, still excluded from the nightly by design — a pipeline-coverage gap, not pending review) — the
> architect's test-suites slice, which *was* implemented. This plan now scopes the **delta after
> #620**. My first pass missed #620 because it searched `origin/develop` only, having fetched only
> that ref; open PRs and other remote heads were never enumerated. Lesson recorded in `harness.md`.

A user can now delete their own account from Settings → Security, behind a typed-display-name
confirm and a **15-minute session-age gate** (a session-*age* check, not re-authentication — the
server never sees a credential). `deleteUser` keeps its frozen signature; self-ness is derived
server-side from `actorContext.actorID === deleteData.ID`. The self branch forces `deleteIdentity`,
runs one primary-store transaction with best-effort post-commit legs, writes an `account_deletion`
audit row, and shows departed users as a `Former member` sentinel. Two
`InAppNotificationPayloadPlatformUserProfileRemoved` fields were removed.

**Headline claim, restated after reconciliation:** PR #620 covers the self branch thoroughly —
including the audit trail and genuine session staleness, via new harness primitives (loopback
Postgres, Redis session-store manipulation, BFF session minting) that lift three standing blockers.
**But every one of its cases is confined to a loopback compose stack and runs in no pipeline.** This
plan therefore keeps a small delta of cases that are (a) portable — they run wherever the suite runs,
including nightly — or (b) simply untouched by #620: the client-side fallout of the removed GraphQL
fields, the sentinel in a real feed, the card's visibility rules, and the escalation negative.

## How to run

```bash
pnpm install && pnpm --filter @alkemio/tests-lib run build
(cd server-api && pnpm exec vitest run src/functional-api/contributor-management/user/account-deletion-portable.it-spec.ts)
(cd client-web && pnpm exec playwright test src/functional-e2e/account-deletion/)
```

Named `account-deletion-portable.it-spec.ts`, not `delete-own-account-portable...` as an earlier
build sheet draft suggested — #620's own `vitest.config.ts` nightly-exclusion glob
(`delete-own-account*.it-spec.ts`) would still have swallowed that name.

Live stack; `ENABLE_NON_INTERACTIVE_LOGIN` on; `AUTH_TEST_HARNESS_PASSWORD`; MailSlurper reachable.
**Serial execution is mandatory** in every file here — Kratos rejects parallel registration flows and
each spec registers its own subject.

⚠ **Never use `createAuthenticatedSessionFixture` in this area.** It reuses a disk-cached storage
state for the whole run, so the session's `created_at` can exceed the 15-minute window and the gate
will refuse — which looks exactly like a product bug. Use `openLoggedInSession`.
⚠ **Never delete a `TestUserManager` persona.** Every subject here is disposable and self-registered.

## Risk

| # | Risk (in user terms) | L | I | Level | Drives |
|---|---|---|---|---|---|
| R-a | A stale or hijacked session deletes an account; or a raw-API caller skips the gate | M | H | **high** | TC-01, TC-06, D-1 |
| R-b | Deletion reports failure after the account is already gone (the pre-feature crash returns) | M | H | **high** | TC-07, TC-12 |
| R-c | The sign-in identity survives, so the departed user silently mints a fresh empty account | L | H | **high** | TC-11 |
| R-d | A user is wrongly blocked, or an organization is orphaned by a missed sole-owner check | M | M | medium | TC-03, TC-04, TC-09 |
| R-e | The two removed payload fields silently empty the notification centre (`errorPolicy:'ignore'`) | M | M | medium | TC-14 |
| R-f | The transaction refactor breaks the admin deletion path every suite's teardown depends on | M | H | **high** | regression guards, TC-05 |
| R-g | Migration `1788000000000` unapplied → admin `deleteUser` hard-fails on the audit enum | M | H | **high** | regression guards, M-3 |
| R-h | Blockers are stale at confirm time, so an account deletes while still holding resources | L | M | medium | TC-10 |
| R-i | The deletion is not provably audited — GDPR/finance cannot reconcile | M | M | medium | D-3 — **#620, loopback only** |
| R-j | A departed user's activity breaks other people's feeds | L | M | medium | TC-15 |
| R-k | The destructive control is exposed on someone else's settings page, or a plain user deletes another | L | H | medium | TC-16, **TC-18** |
| R-l | #620's coverage is real but runs in no pipeline, so it silently rots and gives false assurance | **H** | M | **high** | Review point 2 below; M-5 |

Elevated-risk triggers present: ☑ migration (2 — `1788000000000`, `1788100000000`; the brief said 4,
the diff shows 2) · ☑ breaking contract change (exactly 2 declared removals) · ☑ authorization /
visibility · ☑ cross-repo contract · ☑ data-destructive · ☐ infra/config · ☐ performance-sensitive
(the sentinel *removes* a per-entry lookup storm).

## Existing coverage before this work

Searched `origin/develop` = `1c843208` (2026-08-28) across `server-api/src`, `client-web/src` and
`lib/src`, by feature area, entity, GraphQL operation and user-visible copy.

⚠ **This search was scoped to `origin/develop` and therefore missed PR #620** — see the header. The
inventory below is still correct *for develop*; #620's contribution is folded into the mapping table
above, and the delta was re-verified to depend on none of it.

**Proven absent on `origin/develop`** (0 hits, excluding `lib/src/core/generated/`): `accountDeletion`,
`ACCOUNT_DELETION`, `SESSION_REFRESH_REQUIRED`, `sessionFresh`, `Delete account`,
`platform_audit_entry`, `PlatformUserProfileRemoved`. No `delete-own-account` spec on any branch.
`lib`'s generated client has **zero** `accountDeletion` — new surfaces go in as raw documents.

| File | What it already proves |
|---|---|
| `server-api/…/user/delete-user.it-spec.ts` | Admin `deleteUser` happy path, double-delete, unknown id, post-delete read. Unchanged by this work; **it is the R-f/R-g canary** — the audit write uses a migrated enum, so a missing migration turns it red. |
| `server-api/…/user/deleted-user-session-orphan.it-spec.ts` | SRA-E3: the admin branch **honours** `deleteIdentity: false` — the necessary contrast for TC-11. Plus SRA-E1/E2 (no-identity, repeat delete) and SRA-N1 (no token material). All admin-on-other; confirmed unaffected. |
| `…/graphql-guard/me-degradation.request.params.ts` | The bearer rig: `createDisposableVerifiedUser`, `postGraphqlRaw`, `deleteUserWithOptions`, `deleteUserTolerant`. Reusable as-is. |
| `client-web/…/session-revocation/session-revocation.helpers.ts` | `provisionDisposableUser`, **`openLoggedInSession`** (real `alkemio_session`), **`probePrivateGraphql`** (cookie-borne GraphQL via `context.request`), `deleteUserAsGlobalAdmin`. This is what makes the self branch reachable at all. |
| `client-web/…/user-profile/mcp-api-keys-mint.spec.ts` | A working `signIn` + `goToSecuritySettings` walk. Lift both into a shared helper — this is their third copy. |
| `client-web/…/memberships/cannot-access-other-user-account-settings.spec.ts` | Cross-user settings denial. TC-16 extends it to the new card rather than duplicating it. |
| `client-web/…/user-profile/security-settings-test-plan.md` (#10248) | Sibling plan on the same tab. Owns the `sessionExpired` branch and **explicitly delegates the Delete-account-in-lapsed-state case here as TC-17**. No overlap with TC-12/TC-16. |
| Owning repos | Very strong: ~25 new server specs (freshness at four `issuedAt` values, `deleteIdentity` pin, branch-differentiated exceptions, blocker cap, audit writer, sentinel, one-`EntityManager` threading) and ~45 client specs (typed-name enable/disable, truncation, deep link + support, sole-owner copy, stale routing, resume-without-auto-execute, TOCTOU re-render, PII-free renderer). **Most client-visible ACs are `full` at unit level and get no system case here.** |

**The finding that reshapes this plan.** `actorContext.issuedAt` is populated in exactly one place —
`server/src/core/auth/oidc/strategies/cookie-session.strategy.ts:244` (`payload.created_at * 1000`).
The non-interactive-login **bearer** the `server-api` suite uses never sets it, and the gate fails
closed on `undefined`. The gate also runs *before* the blocker guard. So over a bearer, **every**
self-`deleteUser` returns `SESSION_REFRESH_REQUIRED` and never reaches `ACCOUNT_DELETION_BLOCKED`;
a successful self-deletion is reachable only over a real cookie session, i.e. from Playwright.
Self-branch semantics therefore live in the client-web package as `context.request` probes (no UI),
not in `server-api`. This supersedes the architect's placement for `tasks/test-suites.md` T302–T306.

**Reuse figure: 12 of 28 acceptance scenarios need no new test** — 11 `full` at owning-repo unit
level, and US5-AS6 `full` from the existing guards above. **0 existing tests require updating**: the
diff invalidates no assertion here (the two removed fields are selected nowhere in this repo).

## Scenario → test mapping

Tier legend: **loopback** = runs only against a local/CI compose stack, because #620's primitives
refuse a non-loopback target (`lib/src/config/loopback-guard.ts`) — and #620's specs are excluded
from `nightly`, so these execute in **no pipeline**. **portable** = runs wherever the suite runs.

| Scenario | Covers | Automated by | Layer · tier |
|---|---|---|---|
| TC-01 Self delete over a bearer refused `SESSION_REFRESH_REQUIRED`, nothing deleted | US3-AS5, FR-011/012, R-a | **built** — `server-api/…/user/account-deletion-portable.it-spec.ts` › *TC-01 — a raw-API self-deletion cannot bypass the session-age gate* | API · portable |
| TC-02 Preflight answers over a bearer with `sessionFresh:false` (advisory, not gated) | FR-005, FR-010 | **built** — `server-api/…/user/account-deletion-portable.it-spec.ts` › *TC-02 — the preflight answers over a bearer and reports the session as not fresh* | API · portable |
| TC-03 Blocker matrix over real resources: kind × `selfResolvable` × totals | US2-AS1, US4-AS1, FR-007, R-d | covered by #620 (merged 2026-09-03) › `delete-own-account.it-spec.ts` › *US2 per-kind blocker equivalence* | API · loopback |
| TC-04 Admin deletes a sole org owner — no blocker, no gate (the support route) | FR-014/023, R-d | covered by #620 (merged 2026-09-03) › *the admin branch deletes a sole organization owner directly* | API · loopback |
| TC-05 Admin blocked path keeps the pre-existing `ForbiddenException` | FR-023, R-f | **built** — `server-api/…/user/account-deletion-portable.it-spec.ts` › *TC-05 — the admin blocked path keeps its pre-existing exception shape* (#620 never asserts the admin-branch exception shape) | API · portable |
| ~~TC-06~~ cookie-vs-bearer `sessionFresh` contrast | FR-010 | **withdrawn** — it was a workaround for having no session control. #620 proves freshness directly by minting and aging sessions; the portable half survives as TC-02 | — |
| TC-07 Fresh session, no blockers → mutation **resolves**, rows gone, re-login fails | US1-AS3/AS4, FR-017, SC-002 | covered by #620 (merged 2026-09-03) › *US1 happy path* | API · loopback |
| TC-08 Blocked → resolve the blocker → deletion proceeds, same session | US2-AS1/AS4, SC-003 | covered by #620 (merged 2026-09-03) › per-kind `test.each` tail | API · loopback |
| TC-09 Sole owner blocked → second owner → proceeds; org keeps its other owner | US4-AS1/AS2/AS3 | covered by #620 (merged 2026-09-03) › *US4 sole organization owner* | API · loopback |
| TC-10 Resource created after the preflight → confirm refused `ACCOUNT_DELETION_BLOCKED` | US2-AS5, FR-006, R-h | covered by #620 (merged 2026-09-03) › `us2-blocked-resources.spec.ts` › US2-AS5 | E2E · loopback |
| TC-11 Self-caller's `deleteIdentity:false` overridden — the identity is really erased | FR-016, Fork-1 edge case, R-c | covered by #620 (merged 2026-09-03) › US1 happy path (explicit `deleteIdentity: false` + de-identification) | API · loopback |
| TC-12 Browser walk: card → typed-name confirm → signed out → cannot sign in again | US1-AS1/AS2/AS3/AS4, SC-001/007 | covered by #620 (merged 2026-09-03) › `us1-delete-own-account.spec.ts` (AS1–AS6) | E2E · loopback |
| TC-13 Blocked dialog driven by the real server answer; deep link + support side by side | US2-AS1/AS2, SC-003 | covered by #620 (merged 2026-09-03) › `us2-blocked-resources.spec.ts` AS1/AS2 | E2E · loopback |
| TC-14 Notification centre renders the profile-removed entry: no PII, no blank row | US5-AS4, R-e | **built** — `client-web/…/account-deletion/profile-removed-notification.spec.ts` › *TC-14 — no PII, no blank row, list stays populated*. #620 counts DB rows containing the email; it never renders the notification centre, so the `errorPolicy:'ignore'` blanking risk was untouched by it | E2E · portable |
| TC-15 Activity feed shows `Former member` and still loads | US5-AS5, SC-009, R-j | **built** — `client-web/…/account-deletion/former-member-activity.spec.ts` › *TC-15 — the activity feed shows Former member and still loads* | E2E · portable |
| TC-16 The Delete-account card is owner-only | FR-001 scope, R-k | **built** — `client-web/…/account-deletion/account-deletion-visibility.spec.ts` › *TC-16 — the Delete-account card is owner-only*. Confirmed live: the denial is **route-level** (a pre-existing owner-only guard redirects a non-owner — even a platform admin — to `/settings/profile` before the Security tab renders at all, predating this feature); the spec asserts the redirect and the card's absence together | E2E · portable |
| TC-17 Card reachable in the `sessionExpired` Security-tab state | R-9 (release story) | **blocked — Open question 1** (untouched by #620) | E2E |
| **TC-18 A plain non-admin calls `deleteUser` on another user → forbidden, nothing deleted** | FR-015, escalation negative, R-k | **built** — `server-api/…/user/account-deletion-portable.it-spec.ts` › *TC-18 — a plain user cannot delete another user (ratified by the QA lead)*. Observed refusal code: `FORBIDDEN_POLICY` (not `SESSION_REFRESH_REQUIRED`) | API · portable |

### Regression guards

- `delete-user.it-spec.ts` — pins the admin branch through the transaction refactor (R-f) and is the
  deploy-order canary for migration `1788000000000` (R-g). Root cause it guards: every
  `deleteAccountOrFail` caller now shares one `EntityManager`.
- `deleted-user-session-orphan.it-spec.ts::SRA-E3` — pins that `deleteIdentity:false` is still
  *honoured* on the admin branch, exactly what TC-11 proves is *overridden* on the self branch. The
  pair together is the R-c oracle; neither alone is.
- `SRA-E1`/`SRA-E2` — no-identity and repeat deletion, the paths the post-commit leg rework was most
  likely to break.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| D-1 A session genuinely older than 15 min is refused (US3-AS1) | ~~No session-clock control.~~ **Blocker lifted by #620**, which ages the Redis session record directly | **Covered by #620 (merged 2026-09-03)** › *a session older than the privileged window is refused*. Loopback tier |
| D-2 Re-auth round trip and dialog auto-reopen in a browser (US3-AS2/AS3) | ~~Same blocker.~~ **Lifted by #620** | **Covered by #620 (merged 2026-09-03)** › `us3-reauth-freshness.spec.ts`. Loopback tier |
| D-3 Exactly one `account_deletion` audit row, `initiator_role: self` (US1-AS5, FR-020) | ~~No DB access and no GraphQL read surface.~~ **#620 adds a loopback-confined Postgres client and asserts the row directly** | **Covered by #620 (merged 2026-09-03)** › US1 happy path + `us1-delete-own-account.spec.ts` AS5. Loopback tier — **so SC-005 is proven only where a compose stack exists, and in no pipeline** |
| D-4 Active subscription surfaced and audited (US1-AS6 positive) | ~~No seeding path.~~ **#620 seeds `externalSubscriptionID` by direct SQL** | **Covered by #620 (merged 2026-09-03)** › *an active Wingback subscription…*. Loopback tier |
| D-5 More than 25 blockers truncate with accurate totals (US2-AS3) | Previously declined on cost; #620 built it anyway, at both levels | **Covered by #620 (merged 2026-09-03)** › it-spec truncation case + `us2` AS3. Loopback tier |
| D-6 Silent refresh / idle renewal does not advance freshness (US3-AS6) | ~~Same as D-1.~~ **Lifted by #620** | **Covered by #620 (merged 2026-09-03)** › *silent token rotation and idle renewal do not count*. Loopback tier |
| D-7 A failure at the last primary-store step leaves the account intact (US5-AS1) | Still not covered. `server`'s `delete-user-transaction.spec.ts` proves the same `EntityManager` is threaded and no post-commit legs run — **not that a database rolled back** (the EM is mocked). #620 does not attempt it | **Deferred to `server` CI** |
| D-8 Forced Kratos / file-service leg failures still resolve successfully (US5-AS2/AS3) | Still not covered. #620 asserts the **success** outcomes (`session_revocation_completed`, `identity_deletion_completed`) but never forces a leg to fail, which is the actual risk | **`server` repo**, already unit-covered there |
| D-9 File bytes actually leave the object store | No object-store access. No reconciler exists in v1 either | **Deferred** — an operational gap as much as a test gap |
| M-1 SSO-only identity re-authenticates without a password prompt (US3-AS4) | No external IdP in the compose stack; standing one up to assert a negative is disproportionate | **Manual**, release checklist (fold in one keyboard/focus pass over the destructive dialog) |
| M-2 Help page describes the real flow, en-US and nl-NL (US6-AS1/AS2) | Editorial truthfulness against shipped behaviour is a human judgement, and the page lives in `documentation` | **Manual**, release checklist. Blocks the app-store URL |
| M-3 Migration `1788000000000` applied before the client ships | A deploy-order check, not a test | **Manual**, release checklist. The guards detect the failure, but only after the fact |
| M-4 Matrix chat identity survives deletion (R-4, accepted residual) | Deliberately out of v1 scope | **Manual** — verify the docs *say so*; do not test that it does not happen |
| **M-5 Run #620's loopback suite against a compose stack before the release ships** | Its 16 API cases and 3 walks execute in no pipeline (excluded from `nightly` by design). Unrun coverage is not coverage | **Manual gate**, release checklist: `pnpm --filter @alkemio/test-suite-server-api run test:contributormanagement` + the `account-deletion/us1-*`/`us2-*`/`us3-*` walks, on compose, with the result recorded. **Executed 2026-09-02, all green — see `account-deletion-manual-verification.md`.** Stays a manual gate until a compose-backed CI job exists: a pipeline-coverage gap, not pending review |
| X-1 Deletion while holding unusual state (draft whiteboards, in-flight invitations, an open conversation) | Scripted cases would be premature — the blocker set is four resource kinds and nobody has walked the edges | **Exploratory charter**, 90 min, before release sign-off |

**Non-functional, assessed.** *Performance* — the blocker query is capped at 25; the activity-feed
sentinel *removes* a per-entry lookup. This diff reduces load; no case warranted (and no
request-count harness exists). *Security* — the substance of this plan: TC-01 (no raw-API bypass),
TC-04/TC-05 (gate is self-only, admin branch unchanged, and together the escalation negative),
TC-11 (crafted `deleteIdentity` overridden), TC-16 (owner-only), TC-14 (data exposure).
**Auditability is the one security dimension left unproven — D-3.** *Reliability* — D-7/D-8 are
unit-covered in `server` and unreachable here; repeat-deletion idempotency is already `SRA-E2`.
*Compatibility / a11y* — Chrome-only, no axe (standing gaps); one manual pass, folded into M-1.

## Open questions

1. **TC-17 / R-9 — is the card's absence in `sessionExpired` a defect or the design?** The release
   story says defect, to fix on `release/74`. PR #10231 withholds the card deliberately and pins it
   with a green unit test, reasoning deletion "could not satisfy the server's session-age gate
   anyway". **That reasoning is refuted by the deletion flow's own source:** `useDeleteAccount.ts`
   treats an absent Kratos session as `'no-session'` — *"safe to proceed"* — and its re-auth step
   ends the Kratos session on purpose; the server gate reads the **BFF** session, which a lapsed
   Kratos session does not touch. So an app-store-mandated path is hidden on a false premise.
   Building TC-17 means deleting a deliberate green test — a product call, not QA's, and
   `release/74` does not exist yet on `client-web`. **Owner: the `spec-cw-3` / #10231 owner.**
2. ~~Can a plain user create each of the four blocking resource kinds?~~ **Answered by #620**, whose
   per-kind `test.each` seeds all four and is CI-green. No longer this plan's question.
3. **The brief cited 4 migrations; server#6416 contains 2** and is the only 054 server PR.
4. **Should #620's loopback suite get a CI job?** It is the only thing standing between "SC-005 is
   proven" and "SC-005 was proven once". A compose-backed job is the fix; declaring it a manual
   release gate (M-5) is the fallback. Owner: QA lead, alongside the #620 review.

**What is genuinely proven, with #620 merged and actually run on compose:** that a real signed-in
user can delete their own account and cannot get back in; that blockers come from real spaces and
organizations rather than mocks; that a self-caller cannot keep their sign-in identity; that a
genuinely aged session is refused and a silent refresh does not launder it; and — the one that
matters most — that exactly one self-initiated `account_deletion` audit row survives the subject.
**#620 lifts three blockers this repo has carried across four plans** (no DB access, no
session-clock control, no audit oracle), behind a fail-closed loopback guard rather than by widening
the harness's reach. That is the right shape, and it is why SC-005 is no longer uncovered.

**The honest caveat on all of that:** #620's cases are confined to a loopback compose stack and are
excluded from `nightly` by deliberate design, so **none of them runs in any pipeline**. SC-005 is
proven *wherever a human chooses to run it*, not continuously — materially weaker than the mapping
table looks, which is why M-5 and risk R-l exist. Independently of #620, the client-side fallout of
the two removed GraphQL fields (R-e), the sentinel in a real feed, the card's visibility rules and
the escalation negative were untouched by it; that is this plan's delta, and all of it is portable.
**Still uncovered anywhere:** a real database rollback (D-7), forced post-commit leg failures (D-8 —
#620 asserts only the success outcomes), and file bytes actually leaving the object store (D-9).
