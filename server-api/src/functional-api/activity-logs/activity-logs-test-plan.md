# Test plan — Activity feed (`activityFeed` / `activityFeedGrouped`)

> **Status:** Approved · **Depth:** Light for every story, set explicitly by the QA lead (server#6640: the authorization trigger alone would rate Deep; one server guard, no schema change, one case in scope · server#6561: see its section) · **Stories:** one section per story below

This plan owns the platform-level activity feed queries (`activityFeed`, `activityFeedGrouped`).
The per-collaboration `activityLogOnCollaboration` is covered by the specs beside it and is
cited here, not re-planned. Each story gets its own section; later stories append below the last one.

## How to run

```bash
cd server-api
pnpm exec vitest run --project activity-logs src/functional-api/activity-logs/activity-feed.it-spec.ts --fileParallelism=false
```

- Needs a server that has server#6643 (develop at `3c88578cc` or later). The nightly deploys server `develop` (`deploy-all-services.yml`), so test-alkem.io has it. On 2026-10-15 no server tag contains it, so **ACC and prod are pre-fix and the case is red there by design**.
- Registers one throwaway user through **public** Kratos and signs in via non-interactive login (`getUserToken`). No `KRATOS_ADMIN_URL`, no DB, no MailSlurper dependency.
- The server#6561 cases need server#6639 (`6f68dbc83`, an ancestor of `3c88578cc`, so the line above covers it). On an older server every `excludeMyActivity` call fails GraphQL input validation, which is red by design and not a regression. No server tag contains it on 2026-10-15. Those cases use the SPACE_ADMIN, SPACE_MEMBER and GLOBAL_ADMIN personas only, with no extra env.
- Runs nightly with no config edit: the `nightly` project globs `activity-logs/**`. If test-suites#612 (parallel nightly) merges first, the new file defaults to the serial lane. That is fine.

---

## server#6640 — the grouped feed must be empty when the actor can read no collaboration

**Story:** [alkem-io/server#6640](https://github.com/alkem-io/server/issues/6640) (bug · security · high severity · NonF: Privacy). **Fix:** server#6643, merged to `develop` 2026-10-09 (`3c88578cc`). The issue is **still open** (2026-10-15), even though "Fixes #6640" merged into the default branch.

`ActivityService.getGroupedActivity` used to drop the collaboration-scope predicate when the
scope list was empty. A registered user with no space memberships then received the 100
most recent visible entries **platform-wide**: private-space names, callout/post text, and
who acted. The fix is an early `return []` on an empty scope. The conditional predicate below
it is unchanged, so that one line is the only barrier. **Headline claim:** after this plan, one API case proves the leak is closed end to end, from the real
resolver and real credentials through to a real DB. It seeds visible activity first so that it
fails on a pre-fix server, and it uses a member control so that it cannot pass vacuously.

### Risk

| #   | Risk (in user terms)                                                                                                      | Likelihood                                                                                                                                                                                                   | Impact                                                 | Level                                          | Drives                          |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------- |
| R1  | A registered user with no memberships reads other spaces' activity (names, private content, actors) from the grouped feed | Medium (regression): one early return guards a predicate that is still conditional. #6643 predicted a merge conflict with #6639 on these exact lines, and its PR body proposes an ORM rewrite of this method | High (cross-space privacy disclosure)                  | **High → P1** (the QA lead's floor is also P1) | AF-01                           |
| R2  | The same leak for a user who **has** memberships, when a `spaceIds` filter they hold nothing in empties the scope         | Low: the same data-access guard covers it today. It regresses only if the guard moves up to a "no credentials" check                                                                                         | High                                                   | Medium → P2                                    | AF-02 |
| R3  | Over-correction: members get an empty grouped feed                                                                        | Low                                                                                                                                                                                                          | Medium (no client-web consumer on develop `b1311f688`) | Low                                            | the control inside AF-01        |
| R4  | The paginated `activityFeed` leaks on an empty scope                                                                      | Low: ORM `In([])` compiles to `0=1`, and the story says this path was never affected                                                                                                                         | High                                                   | Medium                                         | AF-15                           |
| R5  | A user holds space credentials but READ on none of the collaborations                                                     | Low                                                                                                                                                                                                          | High                                                   | Medium                                         | Not covered (see gaps)          |

Elevated-risk triggers present: ☑ authorization/visibility · ☐ migration · ☐ breaking contract (no schema change) · ☐ cross-repo · ☐ infra · ☐ data-destructive · ☐ performance (the fix removes queries)

### Existing coverage before this work

Searched `origin/develop` @ `663c61d9` (2026-10-15) for `activityFeed`, `activityFeedGrouped`, `ActivityFeed*QueryArgs`,
`LatestContributionsGrouped` and `getGroupedActivity` across `server-api/src`, `client-web/src` and `lib/src` (generated types excluded):
**0 hits**. There is no `.graphql` document and no request wrapper. The untracked `visual/dashboard-activity-authorization.it-spec.ts`
was opened: it covers `activityScore` / `exploreSpaces`, not the feed.

- **Server unit tests:** `activity.service.spec.ts` › `should return no activity without querying when the collaboration scope is empty` pins the guard against mocks. `activity.feed.service.spec.ts` › `getGroupedActivityFeed` mocks `ActivityService` and passes `[]` through, so it is **not** a boundary test.
- **Seeding visible, uniquely named activity** is proven by `activity-log-on-transfer-conversion.it-spec.ts` › `the callout activity exists in the source space before transfer (precondition)`. It is reused here as a technique and needs no new test.
- **A non-member is refused a private space's log:** `space-` / `challenge-` / `opportunity-activity-logs.it-spec.ts` › `DDT user privileges to Private … activity logs` (NON_SPACE_MEMBER → `Authorization`). This is a different operation. It stays as it is.
- **Reuse figure: 2 of 4** in-scope scenarios needed no new test. **0** existing tests need updating. The four activity-logs specs are confirmed unaffected, because they use `getActivityForCollaborations`, which the diff did not touch.

### Scenario → test mapping

| Scenario                                                                                              | Covers               | Automated by                                                                                                    | Layer |
| ----------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- | ----- |
| A membership-less registered user's `activityFeedGrouped` is `[]` while private-space activity exists | R1, story "Expected" | `activity-feed.it-spec.ts` › `activityFeedGrouped — empty authorization scope (server#6640)` › `AF-01 — a user with no space memberships gets no grouped activity, even though private activity exists`                                                                               | API   |
| A member still sees that same seeded activity in their grouped feed (falsifiability control)          | R3                   | `activity-feed.it-spec.ts` › `activityFeedGrouped — empty authorization scope (server#6640)` › `AF-01 …` (control assertion, and `beforeAll` readiness poll)                                                            | API   |
| A published callout plus a post produce visible, named activity                                       | seed validity        | `activity-log-on-transfer-conversion.it-spec.ts` › `…exists in the source space before transfer (precondition)` | API   |
| A non-member is refused a private space's per-collaboration log                                       | adjacent authZ       | `space-activity-logs.it-spec.ts` › `DDT user privileges to Private Space activity logs`                         | API   |
| A member whose `spaceIds` filter empties the scope gets `[]`                                          | R2                   | `activity-feed.it-spec.ts` › `activityFeedGrouped — empty authorization scope (server#6640)` › `AF-02 — a member whose spaceIds filter excludes every space they hold gets no grouped activity`                                                      | API   |
| The empty-scope guard in the data-access method                                                       | R1                   | server `activity.service.spec.ts` (unit, above)                                                                 | unit  |

### Regression guards

- **AF-01 pins server#6640.** Root cause: hand-rolled SQL built the `collaborationID IN (…)` predicate only for a non-empty list, and the `WHERE` builder silently dropped `undefined`. So an empty authorization scope meant "no constraint" instead of "nothing readable".

### Not covered — known gaps

| Scenario                                                                                              | Why not automated                                                                                                                                                              | Where it belongs                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| R2 via a `roles` filter the user does not hold                                                        | Shared personas' roles drift across runs, so "holds no LEAD anywhere" cannot be guaranteed                                                                                     | Exploratory charter, if AF-02 is ever wanted wider                             |
| R5 credentials but no READ                                                                            | There is no GraphQL lever to mint a space credential while denying READ on that space's collaboration. The data-access guard is list-based, so it covers this path identically | Server unit level (existing guard test)                                        |
| The deployed ACC image carries the fix                                                                | The nightly verifies `develop` on test-alkem.io, not the ACC artifact                                                                                                          | Manual: proposed release-checklist row below                                   |
| Uncapped / non-integer `limit` (pre-existing, named in #6640 and #6643, unfixed, **no ticket found**) | Separate defect. There is no load harness (harness.md), and BVA has no agreed contract yet                                                                                     | Needs its own server issue first                                               |

Proposed row for `docs/release-verification-checklist.md` §4, for the release that ships server#6643: _as a freshly registered account with no memberships, run `activityFeedGrouped(args:{limit:100}){ id }` in the ACC GraphQL playground; expect `[]`_ (🔴, 2 min).

Now that AF-01 (and AF-02, AF-15) have landed, the end-to-end claim "a user who can read no collaboration gets no grouped
activity" is proven for the no-memberships partition, on a private space, through the real stack.
It is also proven for the filter-emptied partition (R2, AF-02) and for the paginated sibling
(R4, AF-15; green today on every server, so it is a regression guard with no pre-fix run). It is
**not** proven for the credentials-without-READ partition (R5, unit only). The fix is not yet in any release, so production remains exposed until the release that
ships server#6643 is deployed.

---

## server#6561 — hide my own activity from "Latest activity in my spaces" (`excludeMyActivity`)

**Story:** [alkem-io/server#6561](https://github.com/alkem-io/server/issues/6561) (no labels; still open on 2026-10-15). **Change:** server#6639 (`6f68dbc83`, merged to `develop` 2026-10-09) adds the optional `excludeMyActivity` to `ActivityFeedQueryArgs`. The grouped args inherit it.
**Consumer:** client-web#10403 (`25a3756a`) sets it on the dashboard's spaces feed. **Depth:** Light, set explicitly by the QA lead. A cross-repo contract trigger fired, so by calibration this would rate Standard.
**Headline claim:** two API cases prove, through a real paginator and a real DB, these four things:

- the caller's rows vanish;
- page 1 stays at the full limit, and paging continues without them;
- `myActivity` is unchanged;
- both flags together give an empty page, not an error.

### Risk

| #   | Risk (in user terms)                                                                                                                                                                                                | Likelihood                                                             | Impact                                                           | Level                        | Drives           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- | ---------------- |
| R1  | An admin still sees their own posts and joins in "Latest activity in my spaces"                                                                                                                                     | Low (one ORM predicate, unit-pinned on a mocked builder only)          | Medium (the stopgap the story exists for fails)                  | Medium → **P1** (lead floor) | AF-11            |
| R2  | "Load more" gives short pages, or skips or duplicates entries, because the exclusion is not inside the paginated SQL                                                                                                | Low                                                                    | High (this is the story's core AC; the client cannot compensate) | Medium → **P1**              | AF-11            |
| R3  | "My activity" changes, or the caller's rows disappear without the flag                                                                                                                                              | Low                                                                    | Medium                                                           | Low → P1 (lead floor)        | AF-12 D1, D2, D4 |
| R4  | `myActivity` + `excludeMyActivity` errors, or returns rows                                                                                                                                                          | Low                                                                    | Low (no client sends both)                                       | Low → P1 (in SCOPE)          | AF-12 D5         |
| R5  | Release skew: a client with the flag runs on a server without it. Input coercion then rejects the whole `LatestContributions` operation, the spaces block empties, and an error toast shows on every dashboard load | Medium (no tag contains either side; the two repos release separately) | High                                                             | **High**                     | Manual (gaps)    |
| R6  | The grouped feed advertises the flag but ignores it                                                                                                                                                                 | Low                                                                    | Low (no grouped consumer on develop)                             | Low                          | AF-14 |

Elevated-risk triggers present: ☑ cross-repo contract (additive input, but the client hard-depends on it) · ☐ migration · ☐ breaking contract · ☐ authorization (the exclusion uses `actorContext.actorID`, never input) · ☐ infra · ☐ data-destructive · ☐ performance

### Existing coverage before this work

The search covered `origin/develop` @ `663c61d9` and the working tree (2026-10-15), over `server-api/src`, `client-web/src` and `lib/src` (generated types excluded). Terms searched: `excludeMyActivity`, `myActivity`, `activityFeed`, `ActivityFeedQueryArgs`, `LatestContributions`, `getPaginatedActivity`, and the copy "Latest activity in my spaces". There are **0 functional hits** on either feed query, so no system test reads `activityFeed` at all.

- **Server unit** (PR #6639):
  - `activity.feed.service.spec.ts` › `should pass actorID as excludeUserID…`, `…both flags are true, without throwing`, `should still narrow collaborationIds by spaceIds and roles when excluding own activity`.
  - `activity.service.spec.ts` › `should add a negated triggeredBy predicate on the builder handed to the paginator…`, plus the grouped SQL and placeholder test.
  - All of them run against mocks. No test runs the predicate through the real relay paginator, and the paginator's own spec (`relay.style.pagination.fn.spec.ts`) is also mocked.
- **client-web unit** (#10403): `DashboardWithMemberships.activityView.test.tsx` › the initial query, `fetchMore` carrying the flag, and "My activity" unchanged. That is **full** coverage of the consumer wiring, so it is not re-planned here (API only).
- **E2E that touches the surface:**
  - `home-menus.spec.ts` › `Left Sidebar Menu Navigation` only opens and closes the dialogs.
  - `classifications-templates.spec.ts` › `TL-07` asserts a page-wide absence. Its "My Latest Activity" half still sees the actor's own rows.
  - Both are confirmed unaffected.
- **Reuse figure: 2 of 9** in-scope scenarios need no new test: the role and space composition (unit) and the client wiring (unit). **0** existing tests need updating. The four `activityLogOnCollaboration` specs are untouched by the diff.

### Scenario → test mapping

| Scenario                                                                                                                    | Covers                         | Automated by                                                                 | Layer |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ----- |
| With the flag, no row is the caller's; page 1 = exactly `first`=5; the cursor walk returns all others' rows, in order, once | R1, R2, AC1, AC4               | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-11 — excludeMyActivity: no caller rows, page 1 full at the limit, paging continues without them`                                            | API   |
| Without the flag, the newest 5 are 4 caller posts + 1 other (control)                                                       | R3, falsifiability of R2       | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-11 …` (control assertion); `AF-12 — myActivity × excludeMyActivity decision table` › `AF-12 D1 (control) …`                                            | API   |
| `excludeMyActivity: false` = unset                                                                                          | R3                             | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-12 …` › `AF-12 D2 — excludeMyActivity: false behaves as unset`                                                           | API   |
| `myActivity: true` returns exactly the caller's rows                                                                        | R3, AC "My activity unchanged" | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-12 …` › `AF-12 D4 — myActivity: true returns exactly the caller's rows`                                                           | API   |
| Both flags → `[]`, `total` 0, no errors (also the only real empty-page paginator run)                                       | R4                             | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-12 …` › `AF-12 D5 — myActivity: true with excludeMyActivity: true composes to an empty result, not an error`                                                           | API   |
| `spaceIds` / `roles` still narrow the scope with the flag on                                                                | AC "filters keep working"      | `activity.feed.service.spec.ts` (unit); every AF case also passes `spaceIds` | unit  |
| Dashboard block, dialog and `fetchMore` send the flag; "My activity" does not                                               | client AC1–AC3                 | client-web `DashboardWithMemberships.activityView.test.tsx`                  | unit  |
| The grouped feed honours the flag                                                                                           | R6                             | `activity-feed.it-spec.ts` › `activityFeed — excludeMyActivity (server#6561)` › `AF-14 — the grouped feed honours excludeMyActivity`                                          | API   |
| Paginated feed, empty scope (the #6640 section's R4)                                                                        | #6640 R4                       | `activity-feed.it-spec.ts` › `activityFeedGrouped — empty authorization scope (server#6640)` › `AF-15 — the paginated feed is empty for a user who can read no collaboration`                   | API   |

### Not covered — known gaps

| Scenario                                                                                                                    | Why not automated                                                                                                     | Where it belongs                                        |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| R5 release skew (client #10403 shipped without server #6639)                                                                | No cross-repo contract harness (harness.md); this is a deploy-order fact                                              | Manual: proposed checklist row below; deferred.md       |
| The rendered dashboard (no own items, full "Load more" in the UI)                                                           | API-only by SCOPE; the client wiring is unit-full                                                                     | Manual on ACC (same checklist row)                      |
| `after` = the id of a row the flag excludes → "Unable to find entity" (the cursor is resolved through the filtered builder) | The client keeps the filter constant per feed, so the case is unreachable from the product                            | Exploratory, if a client ever toggles the flag mid-feed |
| `last`/`before` on a DESC feed                                                                                              | Pre-existing, code-read only: the window `rowId > c AND rowId <= c - last` is empty. The client never pages backwards | Needs a server issue first (see harness.md)             |
| Short pages from rows that fail conversion (server `TODO` in `getPaginatedActivity`)                                        | Pre-existing and unrelated to this flag. Reproducing it needs an orphaned activity row, and there is no DB access     | Server unit level / its own issue                       |
| Index / latency of `triggeredBy <> $x`                                                                                      | No load harness; the predicate only narrows an already-scoped query                                                   | Post-deploy monitoring                                  |

Non-functional, Light: **performance** is one extra narrowing predicate and needs no case. **Security:** the excluded id is the actor's own and comes from the server context, so it cannot be spoofed, and authorization is unchanged. **Reliability:** reads only. **Compatibility:** additive input, but see R5. **Accessibility:** no UI in scope.

Proposed row for `docs/release-verification-checklist.md` §4 (🔴, 5 min):

- **Before deploy:** confirm that the release's server image contains server#6639 whenever the client image contains client-web#10403. Roll back the client first, never the server alone.
- **On ACC, as a space admin who just posted:**
  - "Latest activity in my spaces" shows none of your own items, and "My activity" still does.
  - "Load more" adds a full page.

Once AF-11/AF-12 land, the server half of the story is proven end to end: exclusion, full pages, a stable cursor walk, an unchanged `myActivity`, and the both-flags contract. **Not proven by any automated test:** that the two releases ship in a safe order (R5, manual only), and the rendered dashboard (client unit tests only).
