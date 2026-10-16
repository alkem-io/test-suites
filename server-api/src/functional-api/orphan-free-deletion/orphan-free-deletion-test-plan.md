# Test plan — Orphan-free deletion: deletes remove the records they own (server#6614)

> **Status:** Approved · **Depth:** Standard — one repo (server), one elevated trigger (data-destructive: the space delete now removes a profile, a storage bucket and its files through file-service); no migration, contract or rule change · **Story:** [server#6614](https://github.com/alkem-io/server/issues/6614) (no workspace spec; story + diff only) · fix [server#6637](https://github.com/alkem-io/server/pull/6637), merged `08f088eaa` 2026-10-13, in no release tag yet

server#6637 fixes three of the issue's leak sites (§B/§C). (1) `deleteCallout` deletes the
callout's classification, its tagsets and their policies for every callout, not only for Tasks
boards. (2) `deleteSpaceOrFail` deletes the **Space actor's own profile** (`space.profile`,
type SPACE) and its storage bucket and documents, before any other step. This is not
`space.about.profile`, which was already deleted. (3) `convertSpaceL1ToSpaceL0` deletes the
replaced license in the save's transaction. **Headline claim:** all three are proven at API
level by observing that the owned records' authorization policies stop existing. Each case is
red against a server without the fix. The 13 group-A policy leaks, the user-application
cascade, failed creates and the cleanup of existing orphans (#6657 / draft #6655) are **not
fixed**, so they are deferred, not tested.

## How to run

```bash
cd server-api && pnpm exec vitest run --project orphan-free-deletion   # CD-*, SD-*
cd server-api && pnpm exec vitest run src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts  # CV-1
```

- Needs the 027 platform roles: the oracle runs as the Platform Operations Admin from `seedPlatformRoleUsers()`.
- Run against server `develop` (test-alkem.io nightly, or a local stack). **ACC stays red until a release tag contains `08f088eaa`.**
- No serial constraint. Each case owns its callout or space.

## Risk

| #   | Risk (in user terms)                                                                                                                                                    | Likelihood | Impact  | Level    | Drives                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- | -------- | ------------------------------------------------------ |
| 1   | Deleting any non-board callout keeps its classification, tagsets and policies (729 since April on ACC data). The reset then leaves stale `global-admin` policies behind | High       | Med     | **High** | CD-1                                                   |
| 2   | Files uploaded into a Space's own bucket (callout content staged there during creation) survive the Space's deletion                                                    | High       | High    | **High** | SD-1, SD-2                                             |
| 3   | Space deletion now fails where it used to succeed: the profile delete runs first and calls file-service for every document                                              | Low-Med    | High    | **High** | SD-2, M-1                                              |
| 4   | Deleting a Tasks board regresses: the classification and column-template block moved out of `if (boardTemplate)` into a logged-not-thrown `try`                         | Low        | Med     | Med      | CD-2, M-2                                              |
| 5   | Promoting L1→L0 keeps the old license and its policy (6 since April)                                                                                                    | Low        | Low     | Low-Med  | CV-1                                                   |
| 6   | Promotion now fails or loses its license: save and license delete share one transaction                                                                                 | Low        | High    | Med      | existing `convert-L1-to-L0-basic` (Free license), unit |
| 7   | A failed classification or profile delete leaves a half-deleted record                                                                                                  | Low        | Med     | Med      | unit only (see gaps)                                   |
| 8   | Unfixed leak paths keep leaking, and existing orphans remain until #6655 runs                                                                                           | Certain    | Low-Med | Med      | deferred D-1…D-3, M-3                                  |

Elevated-risk triggers present: data-destructive ✓ (new profile, bucket and document deletes on the Space path). Not present: migration (#6655 is a separate PR), contract change, auth-rule change (policy **rows** of deleted owners only), cross-repo contract change, infra.

## Existing coverage before this work

Searched `server-api/src`, `client-web/src` and `lib/src` (test-suites `develop` @ `b451c329`) for `authorizationPolicy(`, `lookup { license|storageBucket|profile(`, `classification`, `deleteCallout`, `deleteSpace(`, `taskBoard|TaskColumn`, `space.profile`. Also opened the unit specs in #6637.

- **No spec reads `lookup.authorizationPolicy`, and none asserts that an owned record is gone after a delete.** Proven absent.
- No test-suites spec creates a Tasks board (`taskBoard`/`TaskColumn`: zero matches).
- `callout/callouts.it-spec.ts` › `should delete callout on space coollaboration` + 3× `DDT user privileges to delete callout`: the delete succeeds and is permission-gated. **Full**, unaffected.
- `callout/reactions/callout-reactions.it-spec.ts` › `US4-AS3`: reactions go with the callout (same transaction). **Full**, unaffected.
- `journey/space/space.it-spec.ts` › `should remove space`: the delete succeeds. **Full**. It checks only the spaces list.
- `journey/conversion/convert-L1-to-L0-basic.it-spec.ts` › `promoted L0 has a Free license…`: the new license is applied. **Full**. It never reads the old license id, so "old license gone" is **partial**.
- `storage/uploads.it-spec.ts`, `storage/auth/*`: no upload into `space.profile.storageBucket`, and no read after a Space delete.
- Server unit (#6637, opened): `callout.service.spec.ts` › `deletes the classification of a plain (non-board) callout…`, `keeps a board's column template when its classification delete fails`. `space.service.spec.ts` › `deletes the space actor's profile before the actor row`, `leaves the space whole when its profile delete fails`. `conversion.service.spec.ts` › `assigns a fresh Free license … and deletes the replaced one`. All are mocked: **full** for ordering and failure paths, **none** against a real database.

**Reuse: 8 of 13 scenarios needed no new test.** Existing tests invalidated by the diff: **0**. The ones listed above stay correct as written.

### Non-functional (assessed, decision per line)

- **Performance:** every callout delete, including each callout in a Space or collaboration delete, adds one classification load and one delete per tagset. A Space delete adds one sequential file-service call per document in the Space bucket. This is an admin-time path, not a hot one, and the counts are bounded by content. **No automation.** Watch delete latency on a content-heavy Space in M-1.
- **Security:** who may delete is unchanged and already pinned (`callouts.it-spec.ts` DDT). Data exposure improves: files in the Space bucket are no longer readable after deletion (SD-2). Code-read observations, outside this story: `lookup.authorizationPolicy` looks the row up **before** its PLATFORM_OPERATIONS_ADMIN check, so a caller without POA can tell existing ids from absent ones. `lookup.license(ID)` has **no** privilege check. Both go to the reviewer as open questions.
- **Reliability:** both new deletes are non-atomic by design. A classification failure is logged and the callout delete still resolves. A profile delete is retried to finish. Both are unit-pinned. A system-level fault path needs fault injection (D-4, D-5).
- **Compatibility / a11y:** there is no client or schema change. N/A, except that a Space-delete failure toast is newly reachable (M-1).

## Scenario → test mapping

| Scenario                                                                | Covers       | Automated by                                                                                                                                                     | Layer |
| ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Callout delete succeeds; permission matrix                              | regression   | `callouts.it-spec.ts` (existing)                                                                                                                                 | API   |
| Reactions removed with the callout                                      | regression   | `callout-reactions.it-spec.ts › US4-AS3` (existing)                                                                                                              | API   |
| Plain callout delete removes classification + tagset policies           | §B fix 1, R1 | `callout-delete-owned-records.it-spec.ts › … › CD-1 - deleting a plain callout deletes its classification and tagset policies`                                   | API   |
| Tasks-board callout delete still removes classification + marker tagset | R4           | `callout-delete-owned-records.it-spec.ts › … › CD-2 - deleting a Tasks-board callout succeeds and removes its classification, including the board marker tagset` | API   |
| Classification delete failure → logged, delete resolves                 | R7           | `callout.service.spec.ts` (#6637)                                                                                                                                | Unit  |
| Space delete succeeds                                                   | regression   | `space.it-spec.ts › should remove space` (existing)                                                                                                              | API   |
| Space delete removes the actor profile, its bucket and policies         | §B fix 2, R2 | `space-delete-owned-records.it-spec.ts › … › SD-1 - deleting a space deletes its actor profile and storage bucket`                                               | API   |
| …with an uploaded document: document policy gone, file 404              | R2, R3       | `space-delete-owned-records.it-spec.ts › … › SD-2 - deleting a space whose bucket holds a document succeeds and removes the document policy and file`            | API   |
| Profile delete failure leaves the Space whole                           | R7           | `space.service.spec.ts` (#6637)                                                                                                                                  | Unit  |
| Promotion applies a fresh Free license                                  | R6           | `convert-L1-to-L0-basic.it-spec.ts` (existing)                                                                                                                   | API   |
| Promotion deletes the replaced license + policy                         | §C, R5       | `convert-L1-to-L0-basic.it-spec.ts › Convert L1 to L0 - basic › replaced subspace license and its policy are deleted (server#6614)` (CV-1)                       | API   |
| Save + license delete roll back together                                | R6           | `conversion.service.spec.ts` (#6637)                                                                                                                             | Unit  |

### Regression guards

- CD-1 / SD-1 / CV-1 each pin one #6614 root cause: an owner holds the FK to its child, so `ON DELETE` never reaches the child and only explicit service code removes it. Each turns red if that explicit delete is dropped.
- CD-2 pins the restructured board branch, the path that used to raise `QueryFailedError on tagset_template` when the order was wrong.

## Not covered — known gaps

| Scenario                                                                                                                                                                                   | Why not automated                                                                | Where it belongs                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 13 group-A paths still leak their own policy (flow state, room, user settings, guidelines, flow, communication, template, template default, poll, discussion, pack, forum, license policy) | **Product defect, not fixed** (#6614 fix area 1). A test would be red on develop | Deferred D-1; reuse this area's oracle when the fix lands |
| User deletion leaves application policies (DB cascade)                                                                                                                                     | Not fixed                                                                        | Deferred D-2                                              |
| Failed create leaves `[]` policies                                                                                                                                                         | Not fixed; no lever to fail a create partway                                     | Deferred D-3                                              |
| Space delete refused while a document in the Space bucket is held by a signing attempt                                                                                                     | No harness lever (signing provider). Unit-proven that the Space stays whole      | Deferred D-4                                              |
| file-service failure mid-delete, then a retry finishes the job                                                                                                                             | No fault injection                                                               | Deferred D-5; exploratory EX-1 on dev                     |
| Issue's SQL reproduction / orphan counts by type stop growing after deploy                                                                                                                 | No DB access (standing constraint)                                               | **Manual-only** M-3 (ops SQL on dev)                      |
| #6655 cleanup migration, and "after reset every policy is reachable"                                                                                                                       | Migration + SQL; separate PR                                                     | Release ops with #6655 (deferred D-6)                     |
| UI delete of a Space with staged uploads; Tasks-board delete in UI                                                                                                                         | client unchanged, so cheaper as a dev walk                                       | Manual M-1, M-2                                           |

**What is proven:** after these cases land, a plain or board callout delete, a Space delete
(with and without an uploaded document) and an L1→L0 promotion leave none of their owned
records' policies, profile, bucket, document or license behind on a real database. That is
observable over GraphQL and red without #6637. **What is not proven:** the issue's own expected
behaviour beyond these three paths. Group-A policies, user applications and failed creates
still leak on develop. The statement "after `authorizationPolicyResetAll` every remaining policy
is reachable from a live record" **has no covering test and cannot have one here**: it is a
whole-table SQL property, and it stays false until #6655 and fix areas 1 and 3 ship.
