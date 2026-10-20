# Release 78 — verification run sheet

> Per-release working copy of `docs/release-verification-checklist.md`. Started **2026-10-15** from the **QA column of the delivery board** ([projects/50, view 13](https://github.com/orgs/alkem-io/projects/50/views/13), 18 items) because the release story [`alkem-io/alkemio#2177`](https://github.com/alkem-io/alkemio/issues/2177) is still the unfilled template (no scope, no Risk Profile, no image table). Risk ids below (R78-1 … R78-9) are **proposed by QA** and should be carried into the story's Risk Profile when it is written; rename them there if the Release Lead prefers other ids.
>
> **What this sheet is.** For each story in the cut: the fix PRs, the automated evidence that exists or is being written, what an agent verified, and what stays manual. It is not a sign-off: §7 names the human gates.

| Field                | Value                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release              | `Release 78`                                                                                                                                                                                                                                                                          |
| Release story        | [alkem-io/alkemio#2177](https://github.com/alkem-io/alkemio/issues/2177) — **template only** on 2026-10-15 (see F1)                                                                                                                                                                   |
| Repos + versions     | last releases: `server v0.168.0` · `client-web v0.168.0` · `notifications v0.43.0` · `matrix-adapter v0.8.23` · `file-service v0.3.3`. **No `release/78` branch exists in server, client-web or notifications** (checked 2026-10-15 08:40 UTC). New versions ☐ to be filled when cut. |
| Scope of record      | `server` develop `a9ba1ea50` (2026-10-15 07:41) · `client-web` develop `b1311f688` (2026-10-14 16:04) · `matrix-adapter` develop `97d58a803` (2026-10-14 14:46). Every QA-column PR is merged at or before these SHAs.                                                                |
| Environments         | **dev** (Hetzner k3s, nightly from develop — confirm the footer build stamp before each walk) for the pre-ACC walks · **ACC** (Scaleway acceptance-v3) for the post-deploy steps that need acceptance data (July-2025 templates, authorization reset).                                |
| test-suites checkout | `origin/develop` `663c61d9` (this worktree: `~/repos/qa/test-suites-r78-verification`, branch `docs/release-78-verification`)                                                                                                                                                         |
| Verification lead    | Quality Lead (QA lead) — agent-assisted                                                                                                                                                                                                                                               |
| Date                 | 2026-10-15 (started)                                                                                                                                                                                                                                                                  |

**Legend.** ✅ pass · ⚠️ pass-with-notes · ⛔ blocker · ☐ not run · 🤖 verified by agent / automated · 🖐 manual · **Evidence** = what to attach.

---

## 0. Read first — what is in the cut and what the release lead must decide

**Column of record (18 items, all with merged fix PRs unless stated).**

| #   | Story                                                                                                                                                                                                                                                                                                 | Repo(s)                      | Fix PR(s)                                                                                                                                       | Merged    | Automated today?                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [#10179](https://github.com/alkem-io/client-web/issues/10179) Profile tabs: Leading first, Other Resources, hide empty                                                                                                                                                                                | client-web                   | [#10424](https://github.com/alkem-io/client-web/pull/10424)                                                                                     | 10-14     | 🤖 unit only; author never opened it in a browser → PT-1o/2/3/4o/5/6o on #672 green ×2 (2026-10-19), visitor arms pinned on server#6670 + client-web#10433, [comment](https://github.com/alkem-io/client-web/issues/10179#issuecomment-6260634161)                                                                                       |
| 2   | [#9972](https://github.com/alkem-io/client-web/issues/9972) Unclear why I can't post                                                                                                                                                                                                                  | client-web                   | [#10422](https://github.com/alkem-io/client-web/pull/10422)                                                                                     | 10-14     | ✅ 🤖 DL-1…DL-3 + AL-1/AL-2 on #672 green ×2, 🖐 dev glance (2026-10-19); story closed by the QA lead; D5 (title on blur / 128 counter) and D7 (About *What* not blocking Save) remain product calls · board QA-Status already **Needs fix**                                                                                        |
| 3   | [#10419](https://github.com/alkem-io/client-web/issues/10419) "Apply not available" dead-end                                                                                                                                                                                                          | client-web                   | [#10401](https://github.com/alkem-io/client-web/pull/10401)                                                                                     | 10-12     | ✅ author never opened it in a browser → **M4 ✅ dev 2026-10-16** (dead-end gone on all four surfaces; reject and archive both hand Apply back, L0; [comment](https://github.com/alkem-io/client-web/issues/10419#issuecomment-6222104886)) |
| 4   | [#10300](https://github.com/alkem-io/client-web/issues/10300) Organizations in Contributors manual selection                                                                                                                                                                                          | client-web                   | [#10417](https://github.com/alkem-io/client-web/pull/10417)                                                                                     | 10-12     | ✅ 🤖 US6-AS1…AS3 on #672 green ×2 + 🖐 dev glance on one Space (2026-10-19); story closed by the QA lead                                                                                       |
| 5   | [#10157](https://github.com/alkem-io/client-web/issues/10157) / [#10158](https://github.com/alkem-io/client-web/issues/10158) / [#10159](https://github.com/alkem-io/client-web/issues/10159) / [alkemio#2075](https://github.com/alkem-io/alkemio/issues/2075) Matrix browser session, reads, writes | client-web (+ infra prereqs) | [#10365](https://github.com/alkem-io/client-web/pull/10365)                                                                                     | 10-14     | ✗ chat specs exist (`messaging-notifications`, `chat-avatars`) but only `chat-avatars` is in nightly · QA outcome posted 2026-10-20 on [#2075](https://github.com/alkem-io/alkemio/issues/2075#issuecomment-6292492822), [#10157](https://github.com/alkem-io/client-web/issues/10157#issuecomment-6292493353), [#10158](https://github.com/alkem-io/client-web/issues/10158#issuecomment-6292493921), [#10159](https://github.com/alkem-io/client-web/issues/10159#issuecomment-6292494511)                                       |
| 6   | [server#6329](https://github.com/alkem-io/server/issues/6329) Group conversation removal does not revoke access · same defect user-side: [client-web#9543](https://github.com/alkem-io/client-web/issues/9543) leave keeps the chat in the list — fixed by the same PRs, verified (dev walk step 6 + U-1 green on test env), [comment](https://github.com/alkem-io/client-web/issues/9543#issuecomment-6216812118)                                                                                                                                                                                       | server + matrix-adapter      | [#6573](https://github.com/alkem-io/server/pull/6573) + [matrix-adapter#82](https://github.com/alkem-io/matrix-adapter/pull/82)                 | 10-14     | 🖐 dev M2 ✅ 2026-10-16. 🤖 test-suites#672: M-1…M-3 green (local Matrix side); **U-1…U-5 (8 tests) + N-1/N-2/N-3 green ×3 on the test env 2026-10-16**, un-skipped; N-1b (payload members) skipped on **server#6673** (stale DataLoader cache on subscriptions, API-only, no UI impact) |
| 7   | [server#6596](https://github.com/alkem-io/server/issues/6596) createSpace from template → FORBIDDEN_POLICY                                                                                                                                                                                            | server                       | [#6656](https://github.com/alkem-io/server/pull/6656) (+ `adminRepairTemplateFiles`)                                                            | 10-14     | ✗                                                                                                                                          |
| 8   | [server#6545](https://github.com/alkem-io/server/issues/6545) SEC-079-01 app-handoff scheme squat                                                                                                                                                                                                     | server (oidc path)           | [#6641](https://github.com/alkem-io/server/pull/6641) **narrows, does not close**                                                               | 10-09     | 🤖 authentication nightly covers the web side effects                                                                                      |
| 9   | [server#6593](https://github.com/alkem-io/server/issues/6593) Remove legacy-role bridge                                                                                                                                                                                                               | server                       | [#6618](https://github.com/alkem-io/server/pull/6618)                                                                                           | 10-08     | 🤖 platform-roles matrix; **no behaviour change by design**, schema byte-identical · [QA note](https://github.com/alkem-io/server/issues/6593#issuecomment-6292496011)                                                         |
| 10  | [server#6619](https://github.com/alkem-io/server/issues/6619) Content role holds GRANT on AI server                                                                                                                                                                                                   | server                       | [#6626](https://github.com/alkem-io/server/pull/6626)                                                                                           | 10-08     | 🤖 matrix cell `PLATFORM_CONTENT_FULL_ACCESS › cannot › A3.aiServerAuthorizationPolicyReset` — green **only after an authorization reset** · [QA outcome](https://github.com/alkem-io/server/issues/6619#issuecomment-6292495035) |
| 11  | [server#6614](https://github.com/alkem-io/server/issues/6614) Deletes leak policies / owned records                                                                                                                                                                                                   | server                       | [#6637](https://github.com/alkem-io/server/pull/6637) merged · [#6655](https://github.com/alkem-io/server/pull/6655) cleanup migration **OPEN** | 10-13 / — | 🖐 dev 2026-10-16: Space with an uploaded callout image deleted cleanly, image URL → 404 `document not found`; Tasks-board callout with a task in a non-default column deleted cleanly. 🤖 test-suites#672 `300bd211`: `orphan-free-deletion/` CD-1/2, SD-1/2 + CV-1 (plan Approved 2026-10-16), live green ×2 locally via the `lookup.authorizationPolicy` oracle; orphan count stays SQL only. 2026-10-19: group A fixed in [#6678](https://github.com/alkem-io/server/pull/6678) `b430b2231`, failed callout creates in [#6679](https://github.com/alkem-io/server/pull/6679) `5e061c8da` (both merged after the column was cut) → GA-1…GA-8 added on #672, 12/12 green locally on `b430b2231`; #6655 still open. Three resolver gaps (poll / template-framing / guidelines-profile policies unreadable) reported, not leaks · [QA status 2026-10-20](https://github.com/alkem-io/server/issues/6614#issuecomment-6292495499) |
| 12  | [server#6560](https://github.com/alkem-io/server/issues/6560) Org admin makes the org leave a Space                                                                                                                                                                                                   | server + client-web          | [#6649](https://github.com/alkem-io/server/pull/6649) + [client-web#10410](https://github.com/alkem-io/client-web/pull/10410)                   | 10-09     | 🤖 test-suites#663 matrix (13/13 on test env after #672 re-alignment) + walks (public Spaces only). 🖐 dev 2026-10-16 private L0+L1: **F9** bell null (server#6675), **F10** private L1 missing from the tab, cannot leave (server#6676) → D6 |
| 13  | [server#6640](https://github.com/alkem-io/server/issues/6640) `activityFeedGrouped` leaks platform-wide activity                                                                                                                                                                                      | server                       | [#6643](https://github.com/alkem-io/server/pull/6643)                                                                                           | 10-09     | ✗                                                                                                                                          |
| 14  | [server#6561](https://github.com/alkem-io/server/issues/6561) Hide my own activity                                                                                                                                                                                                                    | server + client-web          | [#6639](https://github.com/alkem-io/server/pull/6639) + [client-web#10403](https://github.com/alkem-io/client-web/pull/10403)                   | 10-09     | ✓ test-suites#672 AF-11/AF-12/AF-14 (API, live green ×3 locally); UI 🖐 M5 2026-10-16                                                         |
| 15  | [client-web#10344](https://github.com/alkem-io/client-web/issues/10344) Spaces callout: pick other spaces of the account (**scope drift** — merged 2026-10-15 after this sheet was cut; Status=QA on the board; on dev and test, **not** on ACC) | server + client-web (+ test-suites#675 open) | [server#6667](https://github.com/alkem-io/server/pull/6667) + [client-web#10430](https://github.com/alkem-io/client-web/pull/10430) | 10-15 | 🤖 `subspaces-callout/us5-account-scope-selection.spec.ts` 7/9 green on #672 `6f1eaaab` (AS6 private-sibling membership, AS7 five-viewer matrix added 10-19; 2 skips = client-web#10439, #10440); API boundary test-suites#675 run locally 10-19: 6/6 green (not merged); QA closure [comment](https://github.com/alkem-io/client-web/issues/10344#issuecomment-6269381770); ⚠️ D8 |
| 16  | [client-web#10423](https://github.com/alkem-io/client-web/issues/10423) Documents with content in post templates (**scope drift** — merged 2026-10-15; Status=QA; on dev and test, **not** on ACC; needs Collabora + `SPACE_FEATURE_OFFICE_DOCUMENTS`) | server + client-web (+ test-suites#674 open) | [server#6666](https://github.com/alkem-io/server/pull/6666) + [client-web#10429](https://github.com/alkem-io/client-web/pull/10429) | 10-15 | 🤖 `templates-CRD/template-types/document-template-content.spec.ts` DT-1…DT-4 green ×3 on #672 `b9c7cfe2` ([comment](https://github.com/alkem-io/client-web/issues/10423#issuecomment-6264097448); browser authoring, browser apply by admin + member with byte checks, cross-account pack route); API isolation = test-suites#674 (not merged, and its `collabora` project is outside `test:nightly`); ⚠️ D9 |

**Decisions for the Release Lead before QA time is spent (D1–D5).**

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                     | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Owner                         | State |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----- |
| D1  | Is the **Matrix browser messaging path** (client-web#10365) really in Release 78?                                                                                                                                                                                                                                                                                            | PR states: notification/activity continuity gate (075 T006) **unverified**; acceptance Synapse config (homeserver URL for the browser, callback whitelist, dev-orchestration#97) **not verified**; needs `file-service v0.3.3` + `matrix-adapter ≥ v0.8.22` deployed; security sign-off on alkemio#2075 (browser-held tokens, 48 h refresh window, no CSP) **still open**. The only client switch is `VITE_APP_MATRIX_HOMESERVER_URL`; once set it is on for everyone. | Release Lead + Security owner | ☐     |
| D2  | Does the orphan **cleanup migration server#6655** ship in 78, or only the delete-path fix #6637?                                                                                                                                                                                                                                                                             | #6655 is a one-off reversible migration with `_orphan_cleanup_backup_*` tables; if it ships, rollback (`migration:revert`) goes into the run book and the backup tables need a drop follow-up.                                                                                                                                                                                                                                                                         | Release Lead                  | ☐     |
| D3  | **Post-deploy steps** are owned and sequenced: (a) authorization reset (needed for #6619 to bind; the reset worker image **must match the server version** or every policy is rewritten with old rules), (b) `adminRepairTemplateFiles` dry run → apply as Platform Operations Admin (needed for #6596; until then non-members see broken images in ~36 affected templates). | Operator                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ☐                             |
| D4  | **Deploy order server → client** for the activity feed (#6639 → #10403). Neither image may be rolled back below 78 while the other is live: GraphQL input coercion rejects the whole `LatestContributions` operation and the dashboard toasts an error on every load. Roll the client back first.                                                                            | Release Lead                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ☐                             |
| D5  | **#9972 scope ruling:** the issue also asked for a red title field on blur and a title character counter near 128; neither was delivered. Accept as scope, or keep the card in Needs fix.                                                                                                                                                                                    | Product (ccanos)                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ☐                             |
| D6 | Does #6560 ship in 78 with private subspaces unleavable (server#6676), with the limitation stated in the release notes — or does 78 wait for the fix? | The Membership tab is the story's headline; for private L1/L2 memberships the organization still has to ask a Space admin, which is the situation #6560 set out to end. Same root as server#6675 (bell null for org admins of private Spaces, pre-existing). | Release Lead + PO | ☐ |
| D7 | **About *What* over 50,000 saves.** The Space settings About editors got the ring (#10422) but no live error and no Save block: *What* at 50,100 characters saves (server allows 65,568). The PR calls Why/Who a follow-up and says nothing about What. Accept as scope (ring only) or treat as a #9972 gap? | Pinned as observed in `space-settings-about-limit.spec.ts` AL-1; flips to a skip + issue on a defect ruling. | Product (ccanos) | ☐ |
| D8 | **Is client-web#10344 (account-scoped Spaces selection) in Release 78?** Merged to develop 2026-10-15 22:16, after the column of record was cut; sits in Status=QA; deployed on dev/test, absent from ACC. If yes: (a) test-suites#675 can merge now (its merge-order prerequisite, server#6667 on the test cluster, is met); (b) two defects ship with it — #10439 host row pickable, #10440 Escape closes the editor — both cosmetic/UX, selection integrity unaffected. | Release Lead | ☐ |
| D9 | **Is client-web#10423 (documents with content in post templates) in Release 78?** Merged 2026-10-15 after the cut; on dev/test, absent from ACC. If yes: (a) ACC must run Collabora and the space under test must hold `SPACE_FEATURE_OFFICE_DOCUMENTS`; (b) test-suites#674 can merge, but its `collabora` project is not in `test:nightly` (F14) — add it or the four isolation cases never run. | Release Lead | ☐ |

---

## 1. Pre-flight — automated suites

| Suite                                                                               | Where                                                                                              | Result | Notes / Evidence                                                                                                                      |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Nightly (test env, develop SHAs of record)                                          | 🤖 GitHub Actions `nightly-build-trigger.yml`                                                      | ☐      | Attach run URL; attribute every red (product / test drift / env).                                                                     |
| API — `platform-roles` (covers #6593, #6619)                                        | 🤖 local or test env                                                                               | ☐      | Expect `PLATFORM_CONTENT_FULL_ACCESS › cannot › A3.aiServerAuthorizationPolicyReset` **red until the reset ran** on that environment. |
| API — `roleset/organization/organization-self-removal.it-spec.ts` (#6560, 13 cells) | 🤖 nightly | ⚠️ 11/13 on every nightly since 2026-10-09: FR-007 + US3-AS8 asserted an org admin can drop LEAD directly, which server#6649 (merged 1 h after test-suites#663) deliberately denies. **Test-side.** Re-aligned on #672, 13/13 green on test env 2026-10-16 ([comment](https://github.com/alkem-io/server/issues/6560#issuecomment-6217052051)) | Leave revokes Lead with Member (operator ruling); direct Lead removal by the org admin is denied on GRANT. |
| UI — `organization-space-membership/*` (#6560 walks)                                | 🤖 nightly                                                                                         | ☐      |                                                                                                                                       |
| UI — `applications/*`, `user-profile/*` (#10419, #10179 once the new cases land)    | 🤖 nightly                                                                                         | ☐      | New cases are being written, see §2 "automation in flight".                                                                           |
| UI — `messaging-notifications/*` (#10365 notification continuity)                   | 🤖 **not in nightly** — run once by hand against dev/ACC, or add to `playwright.config.nightly.ts` | ☐      | Cheapest check of the unverified 075 T006 gate.                                                                                       |
| Static GraphQL compatibility (client-web release ops vs server release schema)      | 🤖 `graphql-js validate`, as in R77 §6                                                             | ☐      | Both activity-feed PRs change the `ActivityFeedQueryArgs` input (additive).                                                           |

---

## 2. Risk → automated coverage → what the agent verified → what stays manual

| Risk                                                                                                                                                                                                                                 | Automated coverage on `develop` (test-suites)                                                                                                                                                                                     | 🤖 Agent verified                                                                                                                       | 🖐 Stays manual                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **R78-1** Browser Matrix session / direct reads + writes (#10365): chat broken, duplicated or silent on ACC; notifications stop firing for messages sent natively; a user switch in the same browser leaks the previous user's rooms | `messaging-notifications/us1,us2,us3` and `chat-avatars/*` drive chat through the UI (only `chat-avatars` in nightly). No spec for logout/user-switch isolation, read receipts or attachment upload through the new path.         | PR evidence read: 12 attachment cases + SSO/sync probe on a local stack; **ACC config and T006 not verified by anyone.**                | **M1** (§4b)                                                                                                                       |
| **R78-2** Group-conversation removal (#6329): removed member keeps read/write; double `MEMBER_REMOVED`; stale leave on a deleted room                                                                                                | `us2-group-message-notifications.spec.ts` — scope warning in the spec: green ≠ access revoked. **In flight:** API it-spec (send rejected after removal, member list, late-message invisibility, leave + last-member auto-delete). | PR bodies: verified end to end on a local stack with both halves.                                                                       | **M2** — the removed user's _browser_ reaction on the new native path (403 ends the attempt, no retry loop).                       |
| **R78-3** Template file copy rule (#6596 / #6656): create-from-template still refused, or now silently copies files the creator cannot read; `adminRepairTemplateFiles` mis-gated                                                    | None. **In flight (P2):** privilege gate + dry-run shape. The original defect cannot be seeded through the API (new templates copy their files).                                                                                  | PR: dry run over 1,853 ACC-copy templates, 298 copies, second apply idempotent; the exact template from the issue **not** covered live. | **A1, A2** (ACC, after D3b)                                                                                                        |
| **R78-4** Authorization: content role GRANT/RESET on AI server (#6619), bridge removal (#6593), delete leaks (#6614)                                                                                                                 | platform-roles matrix (1,844 cells); `callouts/0.6callout-deletion`, space create/delete specs.                                                                                                                                   | #6618: schema byte-identical, no migration; #6626: regression unit test red→green; #6637: unit tests red→green.                         | **A3** reset ran with a matching worker image; **A4** only if D2 = ship: migration log counts + backup tables present. **M8** ✅ dev 2026-10-16 (#6614 delete walks, see P-M8). |
| **R78-5** Activity feed (#6640 privacy leak, #6561 exclude-own): fresh user sees platform-wide activity; page under-filled; deploy skew empties the dashboard block                                                                  | test-suites#672 `activity-logs/activity-feed.it-spec.ts`: AF-01/02/15 (empty grouped + paginated feed on an empty scope, member positive control), AF-11/12/14 (exclude-own page full and caller-free; `myActivity` × `excludeMyActivity` DT; grouped feed). Not merged yet. | 🤖 9/9 live green on a local stack (server `a9ba1ea50`), sabotage probes red (challenge 2026-10-15); not run on dev                      | **M5** one glance each, plus D4.                                                                                                   |
| **R78-6** Membership surfaces: org leaves a Space (#6560), apply dead-end hidden (#10419) | #6560: test-suites#663 API matrix + walks, nightly. #10419: `applications/*` cover Apply/pending; `space-applications-level-0` IO-1…IO-5 on #672. | #663 ran 30/30 walks + 13/13 matrix on the feature stack (pre-ruling). Nightly: matrix 11/13 until re-aligned (#672, 13/13 on test env 2026-10-16); walks last ran 2026-10-14 (522 passed / 0 failed) — the client nightly is dispatch-only, not scheduled. | **M4** ✅ dev 2026-10-16 (no dead-end on any of the four surfaces; reject + archive both return Apply, L0). Behaviour change confirmed: `archived` application no longer reads as pending. |
| **R78-7** Profile tabs (#10179): wrong order/landing, hosted-but-not-led Spaces vanish from org profiles                                                                                                                             | **In flight:** `user-profile/` spec, leading vs non-leading persona, user + org.                                                                                                                                                  | —                                                                                                                                       | **M3** quick glance; product confirm that hosted-not-led Spaces disappearing is intended (PR says yes).                            |
| **R78-8** Callout description limit (#9972): limit raised 48k→50k; ring/tooltip; Publish stays clickable; other editors (About What/Why/Who, flow state, forum, VC KB) changed too                                                   | `callouts/*` in nightly (create/edit, no over-limit case).                                                                                                                                                                        | —                                                                                                                                       | **M6** 🤖 automated 2026-10-19 (`callouts/0.10callout-description-limit.spec.ts` + `space/space-settings-about-limit.spec.ts`, #672); **D5** for the undelivered title items; **D7** About *What* not blocking Save; flow-state / forum / VC KB editors stay a spot check at most. |
| **R78-9** SSO handoff narrowing (#6641): bare `/login` re-entry now lands on `/` for **web** users too; in-app recovery completes as web sign-in                                                                                     | `authentication/*` (login, registration, password recovery) in nightly.                                                                                                                                                           | PR: PC-1 device observation on sandbox; residual R-1 attested by the Release Lead, issue stays open.                                    | None for QA. Security sign-off row in §7.                                                                                          |
| **R78-10** Account-scoped Spaces selection (#10344, scope drift): a space admin curates cards across the whole account; a private space leaks to a viewer without READ, or the notice names it; a foreign-account id is accepted | `subspaces-callout/us5-account-scope-selection.spec.ts` on #672 (picker, rendering per viewer, notice, `selectedIds` redaction); API boundary test-suites#675 (foreign id rejected on create/update, stale id dropped, cross-L0 accepted, `accountSpaces` gated on UPDATE) | 🤖 7/9 green locally (`6f1eaaab`; AS7 = admin of both L0s / member of A / member of B / registered non-member / anonymous, no leak, no error); #675 6/6 run locally 10-19, not merged | **D8** first; M9 optional |
| **R78-11** Documents with content in post templates (#10423, scope drift): a post's document is not a copy (an edit reaches the template or a sibling post); a template upload loses its bytes; the pack route the issue was written for is refused | `templates-CRD/template-types/document-template-content.spec.ts` on #672 `b9c7cfe2` (DT-1…DT-4: browser upload, browser apply by admin + member, byte-level copies, cross-account pack apply); test-suites#674 (API isolation under a real write, foreign source refused) | 🤖 4/4 green ×3 locally (client `fa98c933b`, server `901f96281`); #674 4/4 per its author, not merged, outside nightly (F14) | **D9** first; **M10** for real-editor isolation and a real Word file |

**Automation in flight** (separate agents-hq session, `/qa-story` design-only per story → one test-suites PR on `test/r78-qa-coverage`): #6640 + #6561 (activity-logs it-spec), #6329 (conversations it-spec), #10419 (extend `space-applications-level-0.spec.ts`), #10179 (new `user-profile/` spec), optional #6596 gate; plus adding `messaging-notifications` to the nightly config. PR: [test-suites#672](https://github.com/alkem-io/test-suites/pull/672) (challenged 2026-10-15, `needs-work`: messaging nightly env vars, PT-1/4/6 skipped on server#6670, EU-1 on client-web#10433).

---

## 3. Findings — everything observed in this pass

| #   | Finding                                                                                                                                                                                                                                                                                                                                                         | Severity | Action                                                                                                     | State |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| F1  | **Release story #2177 is still the template**: no scope, no risk table, no image table, while 18 items already sit in QA. The QA column of view 13 is the only scope of record.                                                                                                                                                                                 | process  | `/release-story` or hand-fill from §0 of this sheet.                                                       | ☐     |
| F2  | **Board Status ≠ view 13.** A GraphQL pull of board 50 by `Status = QA` returns only 7 items (4 of them Release 78); the 18 the QA lead sees come from view 13's filter. Do not scope from the Status field. Also `server#6577` and `server#6585` (Release 77, both fixed by server#6595) and `server#6592` (no release, **no fix PR found**) sit in Status=QA. | process  | Ask polibb whether #6592 is really fixed or mis-columned; move #6577/#6585 out of QA if R77 verified them. | ☐     |
| F3  | **#10365 ships with three unverified gates** (T006 notification continuity, ACC Synapse config, alkemio#2075 security sign-off) and two version prerequisites. → D1.                                                                                                                                                                                            | high     | Release Lead ruling before M1.                                                                             | ☐     |
| F4  | **Two PRs were never opened in a browser by their authors** (#10424 profile tabs, #10401 apply dead-end).                                                                                                                                                                                                                                                       | medium   | M3, M4 before relying on the in-flight automation.                                                         | 🟡 M4 ✅ dev 2026-10-16; M3 🤖 owner-viewer cases on #672 (2026-10-19), NL glance open |
| F5  | **#6655 cleanup migration still open** while the column treats #6614 as in QA. → D2.                                                                                                                                                                                                                                                                            | medium   |                                                                                                            | ☐     |
| F6  | **#9972 partially delivered** (no title-on-blur, no title counter) and already QA-Status Needs fix. → D5.                                                                                                                                                                                                                                                       | low      |                                                                                                            | ☐     |
| F7  | `messaging-notifications` Playwright folder exists but is **not** in `playwright.config.nightly.ts`; it is the only existing UI check that a natively sent message still notifies.                                                                                                                                                                              | medium   | Add to nightly in the coverage PR.                                                                         | ☐     |
| F8  | After 027 Slice B, no credential grants `ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION`, so **16 pre-existing org/invitation it-specs fail** (reported by the 083 PRs). Expect these reds in the nightly; they are not Release 78 regressions.                                                                                                                         | known    | Attribute, do not re-file.                                                                                 | ☐     |
| F9 | **Org admin invited to a private Space loses the whole in-app bell** — `me.notifications` returns `null` on `FORBIDDEN read-about` for the invitation payload's `space` (non-null field). Seen on dev (`storage-org` → `withoutbanner`/`withoutdescription`), reproduced on the test env with controls, also on ACC. Pre-existing since v0.167.0 (Release 77), not a 78 regression. → [server#6675](https://github.com/alkem-io/server/issues/6675) | high | Release Lead ruling: ship 78 with it known, or hotfix. Not caused by any 78 PR. | ☐ |
| F10 | **`rolesOrganization` hides private subspace memberships from the org's own admin** (viewer READ_ABOUT filter), so the new Membership tab shows only the L0 and **cannot leave a private L1** — #6560's leave is unreachable for private subspaces. Profile omission pre-existing; the leave consequence is new with #10410. 🖐 dev: public Space → subspace visible and leavable; private → hidden (public L0 + private L1 not yet checked). → [server#6676](https://github.com/alkem-io/server/issues/6676) | high | → D6. Decide whether #6560 ships "public subspaces only" in 78 or waits for #6676. | ☐ |
| F11 | **Spaces picker: the host space's own row is not disabled** — it carries "Post is here" but a click picks the host itself (4th chip, save succeeds). Spec 084 US1-AS4 says disabled. [client-web#10439](https://github.com/alkem-io/client-web/issues/10439), pinned by US5-AS1b. | low | Fix in client-web; drop the skip. | ☐ |
| F12 | **Spaces picker: Escape in a non-empty search closes the Edit Post dialog** (or raises "Discard your changes?") instead of clearing the query, when the editor is opened from the post's detail dialog — the exact regression the code comments claim fixed. Spec 084 US3-AS6. [client-web#10440](https://github.com/alkem-io/client-web/issues/10440), pinned by US5-AS1c. | low | Fix in client-web; drop the skip. | ☐ |
| F13 | **`subspaces-callout/us2-expanded-card-switch.spec.ts` was red on develop since #10430** renamed the switch to "Pick spaces manually" — unseen because the client nightly is dispatch-only (F7 family). Re-aligned on #672 (6/6 green). | process | Schedule the client nightly (see §1). | 🤖 fixed on #672 |
| F14 | **The `collabora` server-api vitest project (test-suites#674's four byte-level cases, and the shipped editor-url spec) is not part of `test:nightly`** (`--project nightly`), so the feature's isolation proof never runs in CI once merged. | process | Add the project (or its files) to the nightly list in `server-api/vitest.config.ts`; needs Collabora + the OfficeDocs plan on the test cluster. | ☐ |
| F15 | **Template with Documents responses loads as None** (client-web, pre-existing since #10122, 2026-08-11): `calloutTemplateMapper.ts` maps `CollaboraDocument → 'none'`, so *Use template* and the template *Edit* dialog show Responses = None. The server stores it and an edit does not write the loss back (RT-1/RT-4 green). Reproduced on local, user saw it on dev 2026-10-19. Out of Release 78 scope. → [client-web#10443](https://github.com/alkem-io/client-web/issues/10443); RT-2/RT-3 pinned in `collaboration-tool-template-roundtrip.spec.ts` on #672. | ✅ filed |
| F16 | **Memo templates are read-only for their creator** (server, pre-existing since CRD Templates 2026-05): `template.service.ts` creates the template callout with `userID` undefined → `memo.createdBy` null → no creator rule, CONTRIBUTORS policy grants nobody; the editor renders `contenteditable=false` and the footer says "owner is no longer available". Whiteboard templates are editable. Reproduced on local, user saw it on dev 2026-10-19. Out of Release 78 scope. → [server#6682](https://github.com/alkem-io/server/issues/6682); MT-1/MT-2 pinned in `collaboration-tool-template-roundtrip.spec.ts` on #672. | ✅ filed |

---


**F9 (2026-10-20, ACC, O3 apply).** `adminRepairTemplateFiles` copies only files the template *owner* can read; for innovation-pack templates the owner is the owning account's admin credential, not the pack host's personal memberships. On ACC 167 references in 39 templates (incl. the 31-Jul-2025 `j5pack` space templates whose whiteboards reference `image.png` in private `l1-2space`) therefore stay unrepaired: creation from them succeeds (#6656) but non-members see a broken image — the pre-August-2026 behaviour the issue called acceptable. 13 references point at deleted files. Not a defect against the PR's stated contract; a product decision whether a pack host's own read rights should count. Operator list: run `remaining.only.sql` from `~/repos/qa/release-78/`.

**F10 (2026-10-20, ACC, A4 chat walk).** Opening an old group chat fails: the browser resolves `GET /_matrix/client/v3/directory/room/#00064a74-…:matrix-acc.alkem.io` → `404 M_NOT_FOUND`. Checked on ACC: the server `room` row exists (`conversation_group`, created 2026-03-26 12:11:32Z, 16 members, `messagesCount 0`); Synapse has **no alias row, no room with ≥8 of those members, and no event in its history ever naming that alias** → the Matrix room was **never created** (cause 1), not renamed or de-aliased. Scope: of 10,542 server rooms, **7** have no Synapse alias — six `conversation_group` rooms with 0 messages (five created 2026-03-26 12:11–12:15Z with 9–16 members each, one 2026-04-07 with 12) and one `conversation_direct` (2026-05-13, 1 message). 317 Synapse rooms carry no uuid alias (the reverse case, covered by `adminCommunicationRemoveOrphanedRoom`). No repair path exists for a conversation whose room row has no Matrix room: `ensureRoomExists` covers only conversations without a room row and only 2-member direct ones; `resetConversationVc` is VC-only. Adapter logs on ACC start 2026-10-19 (pod restart), so the March failure is only in Elastic. Dev's root cause confirmed on v0.169.1/develop: `createExternalCommunicationRoom` swallows the adapter error (catch + log), so `createRoom` returns success without a Matrix room; agreed fix = propagate + drop the row (adapter create is idempotent), plus a one-off cleanup of the 7 rows and a PROD count before the release. **Separate defect candidate:** the direct room 869edbc1 (2 real users, 1 message) had its Matrix room — `messagesCount` is only incremented by the inbound handler, in v0.147.0 as today — and it was later deleted+purged in Synapse; `adminCommunicationRemoveOrphanedRoom`/`orphanedUsage` decide "in use" from `getRoomsUsed()`, which lists only space `communication` rooms, so every conversation room counts as orphaned → latent data-loss path, needs its own issue. Response to the dev: `~/repos/qa/release-78/f10-dev-response.md`. Not a Release 78 regression — the rows predate it; the new browser path merely surfaces it as a 404 instead of an empty thread.

**F11 (2026-10-20, ACC, A4).** The notification leg of the Matrix browser path **works end-to-end on ACC** — every browser-sent message reaches the server through the adapter and runs the recipient pipeline (server logs show `USER_CONVERSATION_MESSAGE_DIRECT/GROUP` recipient resolution and push delivery for each message of the walk; `room.messagesCount` keeps counting). That closes the T006 gate. Two expectation corrections, not defects: (a) in-app is hard-off for chat messages (034) — the bell will never show one, zero `in_app_notification` rows of a conversation type today confirms it; (b) emails are a debounced digest with production windows on ACC (no env overrides): direct 5 min quiet / 30 min cap, email group 20 min / 60 min, and a digest is dropped when the recipient already read the messages (`Digest suppressed - everything pending was already read at fire time`, 5× today). In the walk the DM recipient (admin@) has chat email OFF, and B turned email on only after the DM leg, so no DM email was ever due; the group digest for B fired at 09:55:58 UTC — 20 min 03 s after the last group message, exactly the group quiet window — as one `USER_CONVERSATION_MESSAGE_GROUP` email (`m1-grp-1`, count 5, `/?chat=<conversationId>` link; notifications service: `1 messages successfully sent`). The user confirmed receipt and that the link honours membership (non-members do not see the chat). Two notes for the oracle, not defects: a successful flush logs nothing on the server beyond the fire-time recipient re-evaluation (`5a. Email has 1 recipients: <B>` with no `triggeredBy`), only a suppression is logged; and this flush ran on the `alkemio-server-mcp` pod (same image v0.169.1, shares the Redis digest scheduler), so the digest oracle must read both deployments. Step 8 rewritten accordingly.

**F12 (2026-10-20, ACC, agent — security row of alkemio#2177; [posted on #2075](https://github.com/alkem-io/alkemio/issues/2075#issuecomment-6293449029)).** **Sign-out does not log the Synapse device out.** client-web v0.169.1 has no call to the Matrix `/logout` endpoint anywhere (`src/core/matrix/sessionController.ts` only `stopClient()`s and `storage.ts` deletes the per-user IndexedDB database); the dev's QA comment on client-web#10157 lists "Synapse logout on sign-out" among the things that did not ship. Synapse on ACC confirms it: the four test accounts carry 1–4 `Alkemio Web` devices each from today's sign-ins, every one still holding its access token after the user signed out or switched accounts, `valid_until` = validation time + 48 h, no refresh tokens. So the browser-side credential survives sign-out server-side for up to 48 h (Synapse `session_lifetime`), while the local copy is deleted — the user-switch leak test (A4 step 10) is clean because the local copy is gone, not because the token is dead. Not a regression (the old adapter path never exposed a token to the browser at all) and bounded by the 48 h expiry; for the security sign-off: either accept the 48 h window or add a `/logout` call on sign-out (and consider a device-cleanup for the historical adapter devices — 163 and 221 devices on two of the test accounts). Verification recipe for whoever wants to repeat it: before sign-out read `deviceId` from the `alkemio-matrix/…` IndexedDB `session` record; sign out; `GET /_matrix/client/v3/account/whoami` with the old token still answers the user until the 48 h lapse, and `synapse.devices`/`access_tokens` still hold the row.

**F13 (2026-10-20, infra-ops `origin/main` 6fcb1dca — release-story risk "non-subdomain innovation hubs").** No such hub exists: the production and acceptance overlays route only `alkem.io` / `acc-alkem.io`, the named `identity`/`matrix`/`www`/monitoring hosts and one `HostRegexp({subdomain}.<platform>)` each; a hub on a customer domain would not be routed at all. The 13 ACC hubs are all subdomains, and chat on one of them was exercised in A4 step 12 (message sent from the hub). The risk row can be closed as "no instance"; it returns only if a custom-domain hub is ever added, which needs an ingress change in infra-ops first. Uploads: infra-ops #2764 merged 2026-10-19 15:13, image/video/file messages are present in today's ACC rooms — blocker B2 is gone.

## 4. Manual validation — QA lead's run list

### 4a. Operator — must be done before the ACC steps (not QA)

| #   | Step                                                                                                                                                                                 | Evidence                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| O1  | Deploy order server → client (D4).                                                                                                                                                   | 🟡 **ACC 2026-10-20 (agent):** both live — `alkemio/server:v0.169.1` (6 pods + MCP) and `alkemio/client-web:v0.169.1`; migration job ran 2026-10-19 20:07 UTC. The *order* is not provable from the running state; take it from the infra-ops PR merge times. Activity feed (#6639/#10403) works on ACC, so no skew was observed. |
| O2  | `authorizationPolicyResetAll` with the **78 worker image** (D3a).                                                                                                                    | ✅ **ACC 2026-10-20 (agent):** `alkemio-auth-reset-worker-deployment` runs `alkemio/server:v0.169.1` = server image (D3a satisfied); scaler job completed 12:25 UTC; the reset is proven to have run by A3 (the #6619 GRANT only binds after a reset) and by the repair in O3. |
| O3  | `adminRepairTemplateFiles(repairData:{dryRun:true})` as Platform Operations Admin, attach the counts; then `dryRun:false`; then a second apply (expect `copiedReferences: 0`) (D3b). | ✅ **Done 2026-10-20** ([reported on #2177](https://github.com/alkem-io/alkemio/issues/2177#issuecomment-6291789864)) by QA (comoque+184, Ops Admin, via API, after the release lead's go): dry run 08:10 UTC `scanned 1855 / withForeign 239 / refs 514 / missing 13 / failed 0`; **apply** 08:3x UTC `copiedReferences 347, failed 0`; **second apply** `withForeign 39, copiedReferences 0`; dry run after `39 templates / 167 refs, all ownerCanRead:false, missing 13`. Payloads in `~/repos/qa/release-78/{dryrun,apply,apply2,dryrun2}-acc-2026-10-20T*.json`. **Residual (by design, PR #6656):** 167 references in 39 templates stay as written because the template owner (for a pack: the owning account's admin credential; for a space library: the space) cannot read the source file — incl. the A1 template "check after latest" (file `image.png` in private `l1-2space`), so **A2 cannot pass with that template**; non-members keep a broken image there, creation still works. 13 references point at files that no longer exist. List for the operator in `~/repos/qa/release-78/` (remaining.only.sql output in the sheet §3 F9). |
| O4  | If D2 = ship: migration log line with deleted counts; `_orphan_cleanup_backup_*` tables exist.                                                                                       | N/A — v0.169.1 carries zero migrations (server, file-service, matrix-adapter; `migrations_typeorm` head unchanged before/after), so #6655 is **not** in 78 (D2 = no). |
| O5  | If D1 = ship: browser homeserver URL + Synapse callback whitelist set on ACC; `file-service ≥ v0.3.3`, `matrix-adapter ≥ v0.8.22` running.                                           | ✅ **ACC 2026-10-20 (agent):** `file-service:v0.3.3`, `matrix-adapter:v0.8.24`, `synapse:v1.132.0`, `notifications:v0.43.0` running. Browser homeserver = `matrix-acc.alkem.io` (A4 step 13) and the Synapse → adapter callback works (every browser-sent message ran the server recipient pipeline, F11), so the whitelist is set; the manifest diff itself was not read. |

### 4b. QA lead — walks, in this order

**On dev now (develop nightly; confirm the footer build stamp ≥ 2026-10-14 16:04 client / 2026-10-15 07:41 server):**

| #         | Flow                                                                                                                                                                                                                                                                                                                  | Story        | Time   | State |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | ----- |
| M1 (P-M1) | Chat through the browser's own Matrix session: open chat, no second prompt, history + unread load; DM text both ways; group text both ways; react / un-react; one image upload; **DM → recipient gets in-app + email notification**; log out, log in as another user in the same browser → nothing of the first user. | #10365       | 45 min | ☐     |
| M2 (P-M2) | Group removal from the removed user's browser: remove a member; as them, no new messages arrive, a send is rejected once, no retry loop, member list drops them.                                                                                                                                                      | #6329        | 10 min | ✅ 🖐 dev 2026-10-16: removal clean; B's open thread vanishes at once and B lands on the chat list, so step 3's 403/no-retry check is unreachable in the UI (better than expected); later messages never reach B; single "left" line; voluntary leave + last-member auto-delete OK. Notes: no notice to the removed user; a creator left alone keeps a 1-member group ([comment](https://github.com/alkem-io/server/issues/6329#issuecomment-6216049555)). **ACC 2026-10-20 (step 6 leg, agent-verified):** user `7b084855…` left `m1-grp-1` at 11:30:24 UTC — server sent `communication.room.member.batch.remove`, adapter answered in 140 ms, Synapse holds one `leave` membership event for that mxid (current state: 3 `join`, bot + leaver `leave`), the server got `room.member.updated membership=leave` back, dropped the `conversation_membership` row (3 remain) and published `MEMBER_REMOVED` (remaining=3); no error/warn in server or MCP logs 11:30–11:35. Removal via the ACC Matrix path is proven. **ACC 2026-10-20 13:25–13:26 UTC, steps 1 + 6 as creator (agent-verified):** in the 07:41 group the creator removed `efea4dfb…` (13:25:47, remaining=2) and `3017ab10…` (13:25:54, remaining=1), then left (13:26:03) → server sent `communication.room.delete`, adapter answered in 22 ms, `Auto-deleted empty conversation … published MEMBER_REMOVED + CONVERSATION_DELETED`; conversation, room and membership rows gone; the thread vanished in the browser. Each removal was a real adapter RPC answered in ≈150 ms with the Synapse `leave` written before the server persisted it — no local-fallback divergence (the #2177 post-deploy concern). **Retention note, by design (adapter v0.8.24 `DeleteRoomFully` = kick all + remove alias, no purge):** the Synapse room shell survives with its 4 messages and 18 events, alias-less and with 0 joined members; it is unreachable from the product but the content stays in Synapse until an operator purges it. The F10 direct room, by contrast, has *no* events left, so it was purged by something other than this path. |
| M3 (P-M3) | Profile tabs on a leading and a non-leading **user** and **organisation** profile: order, Leading hidden, lands on Member of, Other Resources hidden when empty, rename.                                                                                                                                              | #10179       | 10 min | 🤖 2026-10-19: steps 1, 3, 5 automated — PT-1o/PT-4o/PT-6o view as the profile owner / org admin (the only non-admin viewers who get Other Resources, server#6670), green ×2 locally, on #672; steps 2, 4 were PT-2/PT-5 already. Left for a glance: NL label "Overige bronnen" (locale copy has no automation home) and nothing else. Per-profile landing (step 6) is unit-covered (`useResourceTabs.test.ts`). Pushed `37f22791`; [QA comment](https://github.com/alkem-io/client-web/issues/10179#issuecomment-6260634161) |
| M4 (P-M4) | Invitation-only space + subspace as a signed-in non-member: no apply control on the banner, sidebar, or either About dialog. Applications enabled → Apply shows; pending application → "Application pending".                                                                                                         | #10419       | 10 min | ✅ 🖐 dev 2026-10-16: steps 1–5 exactly as written (S + S1 invitation-only: no apply control, enabled or disabled, and no "not available" text in the sidebar, Space About, subspace banner or Subspace About; tabs sit directly under the S1 header). Step 6 skipped — automated (1.0/1.1, IO-3/IO-4/IO-5 on #672). Step 7 ✅ on L0: after **reject** and after **archive** the applicant sees Apply again, no pending state (automation stops at the admin list + bell, so this was the one manual-only check; L1 not walked). [QA comment](https://github.com/alkem-io/client-web/issues/10419#issuecomment-6222104886) |
| M5 (P-M5) | Dashboard: your own post absent from "Latest activity in my spaces" and present in "My activity"; Load more gives a full page. A fresh user with no memberships sees an empty block.                                                                                                                                  | #6561, #6640 | 10 min | ✅ #6561 ✅ 🖐 dev 2026-10-16 (steps 1–5: own items absent from Latest activity, present in My activity, Load more pages full, space + role filters still exclude own items, space page still shows own activity, removed entity drops out, re-checked with a privileged role; [QA comment](https://github.com/alkem-io/server/issues/6561#issuecomment-6213030303)). #6640 ✅ 🖐 dev 2026-10-16: no-memberships user sees no activity block; `activityFeedGrouped(limit:100)` → `[]` ([QA comment](https://github.com/alkem-io/server/issues/6640#issuecomment-6213125884)) |
| M6 (P-M6) | Create Callout dialog: paste past 50,000 chars → live red error, ring red, Publish/Save-as-draft dimmed with tooltip, click still runs validation; missing title wins over long description.                                                                                                                          | #9972        | 10 min | 🤖 2026-10-19: steps 1–7 automated in `callouts/0.10callout-description-limit.spec.ts` DL-1…DL-3 on #672 (live error + ring count + tooltip, Post/Save Draft dimmed with hint but clickable, blocked click creates nothing via API read, under-limit publish, title wins, 20 %/80 % thresholds, exactly 50,000 allowed); green ×2 locally, sabotage red. Observation: the count is markdown length = typed + 1 (trailing newline), so a paste of exactly 50,000 visible characters is refused — matches the tooltip's own hint, not filed. Step 8 About editors now `space/space-settings-about-limit.spec.ts` AL-1/AL-2 (ring thresholds per limit; **observed:** no About editor blocks Save past its limit — What 50,100 saves, Why 32,100 saves, Who 32,884 refused by the server with footer error + Retry; PR lists Why/Who as follow-up, silent on What → ruling wanted, see D7). Step 9 = D5 record only. Pushed `cc9f37f7` + `ff6a08a1`; [QA comment](https://github.com/alkem-io/client-web/issues/9972#issuecomment-6261321989) |
| M7 (P-M7) | Contributors callout → manual selection: pick one organisation + one user; picker shows which is which; org chip = logo + name; save, reload, callout renders the org; remove the chip. Note the accepted residual: ticking Virtual Contributors in manual mode offers no candidates.                                 | #10300       | 10 min | 🤖 2026-10-19: steps 1–5 and 7 automated in `contributors-callout/us6-manual-org-selection.spec.ts` US6-AS1…AS3 on #672 (Manual switch, type controls stay, org/person offered with kind labels, chips by name, save → post renders exactly the two picked, org leaves community → "No longer available" chip not a UUID + card gone, remove chip → only the person; API `selection` read after each save); green ×2 locally, sabotage red. Step 6 (VC residual) record only. Org **logo** on the chip not asserted (fixture org has no avatar). 🖐 dev 2026-10-19: QA lead glance on one Space fine (an earlier ACC look showed the Release 77 users-only picker, not a defect). Pushed `ff6a08a1`; [QA comment](https://github.com/alkem-io/client-web/issues/10300#issuecomment-6261322242) |
| M8 (P-M8) | #6637 delete paths: create a Space, add a callout with an uploaded image, delete the Space → no error, image URL 404. Create a Tasks-board callout with a task in a non-default column, delete it → no error, gone after reload. | #6614 | 10 min | ✅ 🖐 dev 2026-10-16: both clean; image URL → `{"error":"Not Found","message":"document not found"}` |
| M9 (P-M9) | #10344 Spaces post → Pick spaces manually: the whole account is listed with level + path, the post's own row badged, a private space the admin cannot read absent; pick a sibling L0 + its subspace + an own L2, save → exactly those render; a member without access sees the notice and no names; anonymous on a withheld-only post sees the empty state + notice. | #10344 | 10 min | 🤖 2026-10-19: all of it in `us5-account-scope-selection.spec.ts` (5 green ×2 locally); 2 skips pin #10439/#10440. Dev glance optional: one Space, Pick spaces manually, confirm the list and the badge; try Escape in the search (expect the #10440 behaviour). Pushed `482bdb07`, `6f1eaaab` (AS6/AS7); QA closure comment on the story |
| M10 (P-M10) | #10423 Collabora editing isolation + a real Word file: open a post created from a document template in the real Collabora editor, type, autosave, close → the template's document and a sibling post's are unchanged; upload a real `.docx` with formatting into a template and open a post made from it → formatting intact. | #10423 | 10 min | ☐ dev — the two spec human checks (1 and 3) automation cannot reach; everything else (authoring, apply as admin + member, pack route) is DT-1…DT-4 |

**On ACC after deploy + O1–O5:**

| #            | Flow                                                                                                                                                                                                       | Story  | State |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| A1 (P-A1/A2) | Before O3 apply: as a user who is **not** a member of the July-2025 source subspace, create a space from one of the affected templates → succeeds, image shows broken (not FORBIDDEN).                     | #6596  | | ✅ 🖐 ACC 2026-10-20: as a licensed non-member (the A3 content-role user), space `a1-2026-10-20` created from "check after latest" (pack `j5pack`) — creation succeeded (fix #6656). Opening whiteboard "M12 WB tool - up": image tile refused, `lookup.document` → FORBIDDEN_POLICY on document `3ea78032…` (= `image.png`, 31 Jul 2025, bucket of private `l1-2space`; the dry run lists it 3× for this template, ownerCanRead:false), errorId `416aa3e2-6e46-46f5-b27c-4d66b243b07d`. Expected pre-repair state. |
| A2 (P-A1/A2) | After O3 apply: same create → succeeds with the image; a member of the source subspace gets the same result.                                                                                               | #6596  | | ✅ ([QA closure on #6596](https://github.com/alkem-io/server/issues/6596#issuecomment-6291822720)) 🖐 ACC 2026-10-20, after O3 apply: as the same non-member user, space `a2-2026-10-20` created from **"L0-GA-ALL"** (pack `pack-admin`) — created and all whiteboard images load (its 3 whiteboard refs were copied by the apply; 2 post-description refs stay by design). "check after latest" remains the by-design broken case (F9). Step 5 dry run after apply: `copiedReferences 0`, 167 refs left all `ownerCanRead:false`, 13 missing. Clean-up of `a1-*` / `a2-*` spaces: QA. |
| A3 (P-A3)    | After O2: platform-roles matrix cell `PLATFORM_CONTENT_FULL_ACCESS › cannot › A3.aiServerAuthorizationPolicyReset` green; `aiServerAuthorizationPolicyReset` as `platform.contentfullaccess@` → FORBIDDEN. | #6619  | | ✅ 🖐 ACC 2026-10-20: O2 ran 2026-10-19 13:05 UTC (audit `authorizationPolicyResetAll`, worker image v0.169.1 = server); stored aiServer policy rewritten 13:11 — content role `create,read,update,delete`, Operations Admin `authorization-reset`. As a user holding only PLATFORM_CONTENT_FULL_ACCESS: `myRoles` = that role only, `aiServer.authorization.myPrivileges` = CRUD (no GRANT, no AUTHORIZATION_RESET), the reset mutation → `FORBIDDEN_POLICY` "unable to grant 'authorization-reset'" (errorId `4fd9d864-71c4-4e9b-81e5-2330dc4d86c8`). admin@ (content + ops admin) reads CRUD + AUTHORIZATION_RESET, GRANT gone. Step 4 (ops-admin reset returns an id) not re-run: O2 is the evidence. Note: `myRoles` on ACC never lists REGISTERED — no `registered` row in the ACC platform role set (R77 G3-b, 14 rows), step 1 expectation corrected. |
| A4 (P-A4)    | Re-run M1 on ACC (the only environment whose Synapse config matters).                                                                                                                                      | #10365 | | ✅ 🖐 ACC 2026-10-20: steps 1–13 pass (session, DM, group, reactions + redaction, upload, reload each-once, user switch, homeserver = ACC); server/Synapse side checked by agent: today's rooms carry aliases, messages, 2 reactions + 1 redaction, `messagesCount` in sync. Step 8: group digest email received by B at 09:55:58 UTC (5 unread in `m1-grp-1`, 20 min after the last message, `/?chat=` deep link); opening the link from each account respects conversation membership. **DM digest (13:37 UTC):** admin sent 2 DMs to `7b084855…` (email ON, thread closed) at 13:37:08/13:37:12; email fired 13:42:12, exactly 5 min after the last message — one `USER_CONVERSATION_MESSAGE_DIRECT` email naming the sender, count 2, `/?chat=<conversationId>` link; notifications service `1 messages successfully sent`; mail received, link opens the right DM. In-app N/A by design (F11). Old group chat 404 → F10. |
| A5 (P-A5)    | Org settings → Membership → Leave a Space where the org is Lead → Member **and** Lead gone, subspace roles gone; Space-side removal by a space admin still works.                                          | #6560  | ✅ 🖐 **dev** 2026-10-16 (public path): Leave on a public Space where the org is Lead + member of a private subspace → Lead, Member and the subspace membership all gone, confirmed on Space, subspace and organization entities; plain associate has no Leave. Private Space: subspace invisible/unleavable → F10 / D6. Re-run on ACC optional |

### 4c. Decisions — a name next to each, not a test

D1–D5 in §0.

### 4d. Test-suites follow-ups (shrinks this list next release)

- The in-flight coverage PR (§2). After it merges: M3, M4, M5 drop to "confirm nightly green"; M2's access half is API-covered.
- `messaging-notifications` into nightly (F7). After that: M1's notification leg is covered.
- A logout / user-switch isolation spec for the browser Matrix session (no automation anywhere; R78-1).
- Form walks (`form-callout-framing`) still fail in `beforeAll` since Slice B (R77 F15) — unchanged, keep attributing.

### 4e. Procedures for §4b — exact steps and expectations

The GraphQL for every API-shaped step (set-up, oracles, negatives) is in **§4f**, one block per procedure.

Conventions: _Expect_ lines are pass criteria; anything else is a finding. ⛔ blocks sign-off, ⚠️ is recorded and goes on. Keep the browser's network tab open (filter `graphql`) in every walk so a `FORBIDDEN_POLICY` or a GraphQL error is visible when a page simply shows nothing. Log out between personas (user menu → Sign out, not just closing the tab). Use **two browser profiles** (or one normal + one private window) where two personas must be online at once; call them **window A** and **window B**. Record one screenshot per ⛔/⚠️ row only.

Accounts (dev harness or ACC equivalents): 👤A = a space admin of a test space **S** (also Lead of S) · 👤B = a plain member of S · 👤R = a fresh registered user with **no** space memberships (register one via `/sign-up` with a throwaway mailbox you can read) · 🔑 = Platform Operations Admin · 📝 = `platform.contentfullaccess@` (Content Full Access holder) · 🏢 = an organisation you administer that is a member of S.

Before the dev walks: footer (or `/about`) build stamp must be at or after client-web `b1311f688` (2026-10-14 16:04) and server `a9ba1ea50` (2026-10-15 07:41); if older, the nightly has not deployed yet — stop.

**P-M1 — Chat through the browser's own Matrix session (R78-1, #10365)** · window A = 👤A, window B = 👤B, both members of S. ≈ 45 min.

1. In A, open the chat popup (header chat icon, or `/?chat=` ). _Expect:_ it opens with **no second sign-in prompt** and no "preparing session" hang longer than ~5 s. Network tab: no request to the Synapse host returns 401/403; no `sendMessageToRoom` GraphQL call appears while just opening.
2. In A, start a direct conversation with 👤B (B's profile → **Message**, or chat popup → new conversation → B). Type `m1-dm-1` and send. _Expect:_ the bubble appears at once, then settles (no "failed" state, no duplicate bubble after ~3 s).
3. In B, open the chat popup **without reloading**. _Expect:_ the DM is listed with unread badge **1**; opening it shows `m1-dm-1`; the badge clears once the thread is open and the window is focused.
4. In B, reply `m1-dm-2`. _Expect in A:_ the reply arrives without reload, in order after `m1-dm-1`.
5. In A, create a group conversation with B and a third member (chat popup → new group → add B + C). Send `m1-grp-1`. _Expect in B:_ the group appears and shows the message; sender avatar/name shown on the first message of A's run.
6. In B, add a reaction (hover `m1-grp-1` → react → 👍). _Expect in A:_ 👍 (1) appears under the message. In B remove it. _Expect in A:_ reaction gone.
7. In A's DM, attach a small PNG (paper-clip / image button) and send. _Expect:_ upload completes, the image renders inline for A; in B it renders without reload and opens full size. Network: the upload goes to the Alkemio gateway (not straight to Synapse), and no request contains a `documentId`-style hint.
8. **Corrected 2026-10-20 (F11):** chat messages never produce a bell entry — in-app is hard-off by design (034). The observable is the **email digest**, and it is debounced: direct = 5 min quiet after the last message (cap 30 min), group = 20 min quiet (cap 60 min), and the digest is **suppressed if B has already read everything** when it fires. So: B has email ON for direct/group chat (default is OFF), A sends, B does **not** open the chat; wait 5 min (DM) / 20 min (group). _Expect:_ one "new messages" email with a `/?chat=…` link. ⛔ only if, under those conditions, no email arrives within the cap. Server-side oracle: server logs `[USER_CONVERSATION_MESSAGE_DIRECT] - 5a. Email has 1 recipients: <B-id>` on the message; at fire time a second recipient resolution for `<B-id>` alone (no `triggeredBy`) followed by either silence + a `[user.conversation.message.direct|group] … status: success` line in the **notifications** service, or `Digest suppressed - everything pending was already read at fire time`. Read `alkemio-server` **and** `alkemio-server-mcp` logs — the flush runs on whichever pod claims the track.
9. In A, reload the page and reopen the DM. _Expect:_ history shows `m1-dm-1`, `m1-dm-2`, the image — **each once**. ⛔ on any duplicate or missing message.
10. In A: Sign out. In the **same** window A, sign in as 👤R. Open the chat popup. _Expect:_ empty conversation list; no badge; no trace of the DM or group. DevTools → Application → IndexedDB: no database/namespace named after 👤A's user id (only 👤R's, if any). ⛔ if A's rooms or names are visible.
11. Negative: in window B keep the DM open, in window A (now 👤R) open the DM URL copied from step 8's email. _Expect:_ not found / no access, not the thread.
    _Evidence:_ screenshot of step 10's IndexedDB panel; the email from step 8.

**P-M2 — Removal seen from the removed user's browser (R78-2, #6329)** · continue from P-M1 step 5: window A = 👤A (group creator), window B = 👤B. ≈ 10 min.

1. In A, open the group's member list (thread header → members) and remove 👤B. _Expect:_ the dialog closes with no error toast; the member list no longer shows B.
2. In A, send `m2-after-removal`. _Expect in B (do **not** reload yet):_ the message never appears.
3. In B, try to send `m2-should-fail`. _Expect:_ **one** error state and the draft restored in the composer; no bubble that looks sent; network tab shows exactly one rejected send to Synapse (403), **no retry loop** (no repeated requests every few seconds). ⛔ if the message shows as sent or if sends repeat.
4. In B, reload. _Expect:_ the group is gone from B's list (or shown as left), `m2-after-removal` not visible anywhere.
5. In A, open the thread history. _Expect:_ a single "B left" line (Matrix wording), **not** "B was removed", and no bot joined/left lines.
6. Regression — voluntary leave and auto-delete: in A, leave the group yourself (thread menu → Leave). _Expect:_ gone from A's list; C still sees it. As C leave too. _Expect:_ the conversation is deleted (reloading C's chat shows nothing) and no error toast.
   _Evidence:_ screenshot of step 3's network tab.

**P-M3 — Profile tabs (R78-7, #10179)** · any signed-in user. ≈ 10 min.

Personas to view: 👤A (leads S) · 👤B (member, leads nothing) · 🏢 (make it a Lead of S first: Space settings → Community → organisations → role Lead) · a second organisation that leads nothing.

1. Open 👤A's profile (`/user/<nameID>`). _Expect:_ the tab strip reads, left to right, **Leading · Member of · Other Resources** (Other Resources only if A has VCs / Template Packs / Custom Homepages, otherwise it is absent); the page **lands on Leading** and lists S. No skeleton flashes a different tab first.
2. Open 👤B's profile. _Expect:_ **no Leading tab**; lands on **Member of**, which lists S. Other Resources absent unless B owns resources.
3. Open 🏢's profile (`/organization/<nameID>`). _Expect:_ same as step 1 (Leading first, S listed).
4. Open the second organisation's profile. _Expect:_ same as step 2.
5. On any profile that has Other Resources: open it. _Expect:_ VCs, Template Packs, Custom Homepages only — **no Space cards**. ⚠️ record for product: a Space the organisation **hosts but does not lead** no longer appears anywhere on its profile (PR says intended).
6. On 👤A's profile click Member of, then navigate to 👤B's profile. _Expect:_ B's page lands on Member of by default, not because of A's pick (the pick is per profile).
7. Ctrl+F the page for "Resources hosted". _Expect:_ no hit, in English; spot-check one other locale (user menu → language → NL): "Resources hosted" absent there too.
   _Evidence:_ none unless a step fails.

**P-M4 — Invitation-only apply dead-end (R78-6, #10419)** · 👤A to configure, 👤R to view. ≈ 10 min.

1. As 👤A: S → Settings → Community → membership settings: set **applications off / invitation only** for S **and** for one subspace S1 of S.
2. As 👤R open S's page (sidebar visible). _Expect:_ **no** "Apply" / "Apply not available" / "Applications not available" control in the sidebar, enabled or disabled.
3. Open S's About dialog (space header → About). _Expect:_ no apply control at all; the dialog still shows the description and leads.
4. Open S1's page. _Expect:_ **no banner** above the innovation-flow tabs; the tabs sit directly under the header.
5. Open S1's About dialog. _Expect:_ no apply control.
6. As 👤A switch S back to **applications allowed**. As 👤R reload S. _Expect:_ an enabled **Apply** control in the sidebar and in About. Click Apply, submit. _Expect:_ the control now reads **Application pending**.
7. As 👤A: Community → applications → **reject** 👤R's application. As 👤R reload. _Expect:_ no "pending" state remains and (with applications allowed) Apply is offered again. ⚠️ record: an **archived** application no longer reads as pending (behaviour change in the PR).
   _Evidence:_ screenshot of step 4.

**P-M5 — Activity feed (R78-5, #6561, #6640)** · 👤A, then 👤R. ≈ 10 min.

1. As 👤A in S: create a Post `m5-own-post` and comment on someone else's contribution.
2. Open the dashboard (`/`), block **Latest activity in my spaces**. _Expect:_ neither `m5-own-post` nor your comment is listed; other members' recent activity is.
3. Open the block's **see all** dialog. _Expect:_ same exclusion on every page; press **Load more** until the end. _Expect:_ each page is a full page (no page with 2–3 items while more exist); no error toast.
4. Block **My activity**. _Expect:_ `m5-own-post` and the comment are there.
5. Apply the block's space filter (S) and role filter (Lead). _Expect:_ filters still work and still exclude your own items.
6. Sign out; sign in as 👤R (no memberships). Dashboard. _Expect:_ the Latest-activity block is **empty** (empty-state text), **no** entries from any space, no error toast. ⛔ if any space's activity is visible: the privacy fix is not deployed.
7. Still as 👤R, in `/graphql` run `{ activityFeedGrouped(args:{limit:100}) { id space { about { profile { displayName } } } } }`. _Expect:_ `[]`.
   _Evidence:_ step 7 response.

**P-M6 — Callout description over the limit (R78-8, #9972)** · 👤A in S. ≈ 10 min.

Prepare a 50,100-character string once: in the browser console `copy('x'.repeat(50100))` puts it on the clipboard.

1. S → **+ New Post** (Create Callout dialog). Type title `m6-long`. Paste the string into the description.
2. _Expect immediately (before any click):_ a red validation message under the editor saying the description is too long; a small **progress ring** below the editor box, **red/full**; hovering/focusing the ring shows `50,100/50,000` (locale-grouped) and a second line that formatting, images and links count too.
3. _Expect footer:_ **Publish** and **Save as draft** look dimmed with a tooltip explaining the description is too long; they are still clickable.
4. Click Publish. _Expect:_ the dialog stays open, the error is shown, **no** callout is created (check the space page in another tab). Click Save as draft. _Expect:_ same.
5. Delete 200 characters (Ctrl+End, hold Backspace, or select-and-delete). _Expect:_ error disappears, ring turns normal, buttons enabled. Publish. _Expect:_ created.
6. New Post again: paste the long string, **clear the title**. _Expect:_ the footer tooltip/hint reads the **title** reason (title wins over length).
7. Ring thresholds, quick: new Post, paste `'x'.repeat(9000)` → _Expect:_ no ring; paste up to ~10,500 → ring appears; up to ~40,500 → tooltip gains the "formatting counts too" line.
8. Spot-check one other editor: S → Settings → About → **What** paste 50,100 → _Expect:_ same ring + error. Why / Who: ring shows at 32,000 but Save is **not** blocked (known follow-up in the PR, ⚠️ record only).
9. D5 check, record not test: title field does **not** go red on blur and has **no** counter near 128 (not delivered).
   _Evidence:_ screenshot of step 2.

**P-M7 — Organisation in Contributors manual selection (R78-6/#10300, PR human gate)** · 👤A in S; 🏢 must be a member of S. ≈ 10 min.

1. In S, create (or open) a **Contributors** callout. Open its settings (kebab → Edit / Settings). Under selection switch **Automatic → Custom/Manual**. _Expect:_ the contributor-type controls stay visible (not hidden in custom mode).
2. In the picker search 🏢's name. _Expect:_ it is offered, with a visible **type indication** (label or grouping) that distinguishes it from a user result. Search 👤B. _Expect:_ offered, marked as a user.
3. Select both. _Expect:_ two chips: 🏢 with its **logo + display name**, 👤B with avatar + name — never a raw id. ⚠️ record if, for a moment on first open, chips read "No longer available" while candidates load (known ENG-084-01).
4. Save. Reload the space page. _Expect:_ the callout shows 🏢's card the way automatic mode renders organisations, and B's card.
5. Reopen settings. _Expect:_ both chips still present with names. Remove 🏢's chip (×), save, reload. _Expect:_ only B rendered.
6. Residual, record only: tick **Virtual Contributors** in the type control while in custom mode and search. _Expect today:_ no VC candidates and no explanation (accepted residual, out of scope).
7. As 👤A remove 🏢 from S's community (Settings → Community). Reopen the callout settings. _Expect:_ 🏢's chip, if still selected, is labelled "No longer available" — not a UUID.
   _Evidence:_ screenshot of step 3.

**P-A1 / P-A2 — Create a space from a July-2025 template (R78-3, #6596)** · ACC · 👤L = a licensed user who is **not** a member of the private source subspace · 🔑 for O3. Needs the template list from O3's dry run (`references[].templateName`, `location` containing `whiteboard`).

   _Candidates from the ACC dry run (space templates whose whiteboard file sits in a private L1 subspace the template owner cannot read):_ **"check after latest"** (pack `j5pack`, 3 refs) and **"J5 full - up-after"** (pack `j5pack`, 1 ref) — both saved 31 Jul 2025 from private subspace `l1-2space` under `l0space`, whose only member/admin is the QA account; also "GA l1 many tabs - no l2s" (pack `pack-admin`) and "from pack" (pack `j25-pack2`) from private `augustl1subspace` under `j25august7-up`. 👤L must not be that account.
1. _(A1, before O3 apply)_ As 👤L: user menu → **Create space** (or dashboard → create) → choose **from template** → pick one of the listed templates → name `a1-<date>` → create. _Expect:_ the space is created and opens; the whiteboard callout exists; its image placeholder may be **broken** — that is acceptable here. ⛔ if `FORBIDDEN_POLICY … re-home whiteboard media document` is returned (network tab).
2. As a member of the source subspace repeat step 1. _Expect:_ created, image visible.
3. _(O3 apply by 🔑 happens here.)_
4. _(A2, after apply)_ As 👤L repeat step 1 with the same template → `a2-<date>`. _Expect:_ created **and** the whiteboard image renders. Open the whiteboard. _Expect:_ the image loads (no broken tile).
5. As 🔑 in `/graphql` run the dry run again: `mutation { adminRepairTemplateFiles(repairData:{dryRun:true}) { copiedReferences references { templateName copied ownerCanRead } missingFiles { templateName } } }`. _Expect:_ `copiedReferences: 0`; any entries left are `ownerCanRead: false` or in `missingFiles` — record their count for the operator.
6. Delete `a1-*` and `a2-*` spaces.
   _Evidence:_ step 4 screenshot; step 5 response.

**P-A3 — Content role cannot reset the AI server (R78-4, #6619)** · ACC after O2 · 📝 and 🔑.

1. As 📝 in `/graphql`: `{ platform { roleSet { myRoles } } }`. _Expect:_ `PLATFORM_CONTENT_FULL_ACCESS` and nothing above it (`REGISTERED` appears only on stacks whose platform role set was seeded with a `registered` row; ACC has none, R77 G3-b).
2. As 📝: `{ aiServer { authorization { myPrivileges } } }`. _Expect:_ `CREATE, READ, UPDATE, DELETE` only — **no** `GRANT`, **no** `AUTHORIZATION_RESET`.
3. As 📝: `mutation { aiServerAuthorizationPolicyReset { id } }`. _Expect:_ `FORBIDDEN_POLICY`. ⛔ if it returns an id: the reset (O2) did not run, or ran with an old worker image.
4. As 🔑: the same mutation. _Expect:_ returns the policy id.
   _Evidence:_ step 3 response.

**P-A4 — Browser Matrix chat on ACC** · repeat **P-M1** steps 1–10 on ACC after O5. Add:

11. Step 1's network tab: the Synapse host the browser talks to is the ACC homeserver (not dev/sandbox) and the SSO callback stays on the ACC platform origin.
12. Open chat on an innovation-hub subdomain, if ACC has one. _Expect:_ same silent session (PR lists this as not re-run).

**P-A5 — Organisation leaves a Space (R78-6, #6560)** · ACC · 🏢 admin (👤O) · S where 🏢 is **Lead** and member of subspace S1.

1. As 👤O: `/organization/<nameID>/settings/membership`. _Expect:_ a **Membership** tab between Associates and Invitations; S listed with a Lead badge, S1 listed; search and All/Spaces/Subspaces filter work.
2. On S's card: kebab → **View**. _Expect:_ opens S. Back; kebab → **Leave**. _Expect:_ a destructive confirm in the organisation's voice that says Lead and subspace roles go too. Confirm. _Expect:_ the dialog stays open and busy until done, then closes; success toast; S **and S1** gone from the list.
3. As 👤A in S → Settings → Community → organisations. _Expect:_ 🏢 is neither Member nor Lead; in S1 likewise.
4. Re-add 🏢 via invitation (Community → invite organisation; accept as 👤O under Invitations). _Expect:_ 🏢 back as Member. As 👤A remove it from the Space side. _Expect:_ still works (space-side removal unchanged).
5. Negative: as a plain associate of 🏢 (not admin) open the Membership tab. _Expect:_ no Leave action (or tab not offered).
   _Evidence:_ none unless a step fails.

**P-M8 — Orphan-free deletes (R78-4, #6614 / #6637)** · 👤A as Space admin. ≈ 10 min.

1. Create a Space. In it create a Post callout and upload an image into its description; copy the image URL.
2. Delete the Space. _Expect:_ no error toast, the Space is gone, and the copied image URL returns 404 (`document not found`). Note how long the delete takes.
3. In another Space create a Tasks-board callout, add a task in a non-default column, delete the callout. _Expect:_ no error; the board is gone after reload.
   _Evidence:_ the 404 body from step 2.
   _Done 2026-10-16 on dev:_ both clean. The system-level proof that the classification, bucket and license policies are gone is the `orphan-free-deletion/` plan (Draft).

**P-M9 — Account-scoped Spaces selection (#10344)** · 👤A as Space admin of an L0 whose account has a second L0. ≈ 5 min, optional (automated).

1. Spaces post → Open → settings → Edit → **Pick spaces manually** on. _Expect:_ with an empty search the whole account is listed, each row with its level and ancestor path, the post's own space badged "Post is here", own-tree rows badged "In this space".
2. Pick one sibling L0 and one of its subspaces, save. _Expect:_ exactly those cards render; the Space's own direct subspaces are not shown unless picked.
3. As a user who cannot read the sibling: _Expect:_ its card absent and the notice "Some spaces in this overview are not shown because you don't have access to them."
4. Record only: clicking the post's own row (should be refused, #10439); Escape in the search box with text (should clear, #10440).

**P-M10 — Document post templates, the Collabora half (#10423)** · 👤A as Space admin of a Space with Office documents enabled (dev: ask for `SPACE_FEATURE_OFFICE_DOCUMENTS` on it). ≈ 10 min.

1. Settings → Templates → Collaboration tools → Add new → Create new: name it, tick **Document** (under "More to add"), upload a real Word file with headings, a table and bold text, Save. _Expect:_ the staged filename shows before saving; the template appears in the list.
2. Space home → **Add Post** → **Find Template** → Use template on it → Post. Repeat once for a second post. _Expect:_ both posts show **Open Document**.
3. Open the first post's document. _Expect:_ the Collabora editor shows the Word content with its formatting (headings, table, bold); the title bar reads the uploaded file's name. Type a sentence, wait for "Saved", close.
4. Open the second post's document and the template's document (Settings → Templates → the template → its document). _Expect:_ neither contains the sentence.
5. Record only: an `.xlsx` or `.pptx` upload if handy; the unentitled-space message when applying the template in a Space without Office documents (spec R-2, accepted).

### 4f. Operations — the exact GraphQL per step

All operations below are validated against server `origin/develop` `schema.graphql` (`a9ba1ea50`). Run them in the playground at `/graphql` while signed in as the named persona (the session cookie is the auth). The harness alternative is a bearer token against `/api/private/non-interactive/graphql`, as tests-lib does; not needed for a manual pass. Replace `<…>` placeholders; everything else is literal. Names shown as `#id` are values you copy from an earlier response.

**Resolve ids once (any signed-in persona).**

```graphql
# your own ids
{
  me {
    user {
      id
      nameID
      email
      account {
        id
      }
    }
  }
}

# space / subspace / role set / callouts set by nameID
{
  lookupByName {
    space(NAMEID: "<space-nameID>") {
      id
      nameID
      level
      account {
        id
      }
      settings {
        membership {
          policy
          allowSubspaceAdminsToInviteMembers
          trustedOrganizations
        }
      }
      community {
        roleSet {
          id
          entryRoleName
          myRoles
        }
      }
      subspaces {
        id
        nameID
        community {
          roleSet {
            id
          }
        }
      }
    }
  }
}

# organisation / user ids by nameID
{
  lookupByName {
    organization(NAMEID: "<org-nameID>")
    user(NAMEID: "<user-nameID>")
  }
}
```

---

**P-M1 / P-A4 — chat.** The walk itself is UI; these confirm state from the server side and set the preconditions.

```graphql
# precondition (as 👤B): email on for direct + group chat messages so step 8 can pass
mutation {
  updateUserSettings(
    settingsData: {
      userID: "<B-id>"
      settings: {
        notification: {
          user: {
            conversationMessageDirect: { email: true, push: true }
            conversationMessageGroup: { email: true, push: true }
          }
        }
      }
    }
  ) {
    id
  }
}

# after step 2 / 5 (as 👤A): the conversations exist, who is in them, room ids
{
  me {
    conversations {
      conversations {
        id
        createdDate
        members {
          id
          nameID
        }
        room {
          id
          type
          displayName
          messagesCount
          unreadCount
          lastMessage {
            id
            message
            sender {
              id
            }
          }
        }
      }
    }
  }
}

# after step 9 (as 👤A): server-side history of the DM must match the browser, each message once
{
  lookup {
    conversation(ID: "<dm-conversation-id>") {
      room {
        messagesCount
        messages {
          id
          message
          timestamp
          sender {
            id
          }
          reactions {
            emoji
            sender {
              id
            }
          }
          attachments {
            id
          }
        }
      }
    }
  }
}
```

_Expect:_ step-9 `messagesCount` = 3 (two texts + one image message) and no repeated `message` text. Network-tab oracle for the whole walk: while sending text or reacting, **no** `sendMessageToRoom` / `addReactionToMessageInRoom` GraphQL call is issued (writes go to Synapse); the image upload **does** go through the Alkemio gateway.

Optional Synapse-side oracle for step 10 (user switch): in window A after signing in as 👤R, DevTools → Application → IndexedDB. _Expect:_ no store whose name contains 👤A's user id. If a Matrix access token is visible for 👤R, `curl -H "Authorization: Bearer <token>" https://<homeserver>/_matrix/client/v3/joined_rooms` must not list the DM/group room ids from step 2/5.

---

**P-M2 — removal.** UI for steps 1–3; API to prove the state and to run the regression legs.

```graphql
# step 1 alternative / confirmation (as 👤A, creator)
mutation {
  removeConversationMember(
    memberData: { conversationID: "<group-id>", memberID: "<B-id>" }
  )
}
# → true

# step 1 confirmation (as 👤A): B no longer a member
{
  lookup {
    conversation(ID: "<group-id>") {
      members {
        id
      }
    }
  }
}

# step 3 API twin (as 👤B): the old GraphQL write path must refuse too
mutation {
  sendMessageToRoom(
    messageData: { roomID: "<group-room-id>", message: "m2-should-fail-api" }
  ) {
    id
  }
}
# → error FORBIDDEN_POLICY (no Message returned)

# step 4 (as 👤B): the group is gone from B's list
{
  me {
    conversations {
      conversations {
        id
      }
    }
  }
}

# step 6 regression (as 👤A, then as C)
mutation {
  leaveConversation(leaveData: { conversationID: "<group-id>" })
} # → true, each
# after the last member leaves (as 👤A or 🔑):
{
  lookup {
    conversation(ID: "<group-id>") {
      id
    }
  }
} # → null
```

Set-up shortcut if the UI has no "new group" entry (as 👤A):

```graphql
mutation {
  createConversation(
    conversationData: {
      type: GROUP
      displayName: "m2-group"
      memberIDs: ["<B-id>", "<C-id>"]
    }
  ) {
    id
    room {
      id
    }
  }
}
mutation {
  createConversation(
    conversationData: { type: DIRECT, memberIDs: ["<B-id>"] }
  ) {
    id
    room {
      id
    }
  }
}
```

---

**P-M3 — profile tabs.** Set-up only; the check is visual.

```graphql
# make 🏢 Lead of S (as 👤A). Org must already be MEMBER; on develop after Slice B a direct org MEMBER add is refused (F8) —
# use the invitation path below if it is not a member yet.
mutation {
  assignRoleToOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: LEAD }
  ) {
    id
  }
}

# invitation path (as 👤A, then as 👤O the org admin)
mutation {
  inviteForEntryRoleOnRoleSet(
    invitationData: {
      roleSetID: "<S-roleSet-id>"
      invitedActorIDs: ["<org-id>"]
      invitedUserEmails: []
      extraRoles: []
    }
  ) {
    type
    invitation {
      id
    }
  }
}
mutation {
  eventOnInvitation(
    eventData: { invitationID: "<invitation-id>", eventName: "ACCEPT" }
  ) {
    id
    state
  }
}

# oracle for which tabs should show (any viewer): spaces with LEAD vs MEMBER
{
  rolesUser(rolesData: { actorID: "<user-id>" }) {
    spaces {
      nameID
      roles
      subspaces {
        nameID
        roles
      }
    }
  }
}
{
  rolesOrganization(rolesData: { actorID: "<org-id>" }) {
    spaces {
      nameID
      roles
    }
  }
}
```

_Expect:_ a profile whose `roles` contain `lead` somewhere → Leading tab first; none → no Leading tab.

---

**P-M4 — invitation-only apply dead-end.**

```graphql
# step 1 (as 👤A) — S and S1; keep the other two fields as they are today (read them with the resolve query first)
mutation { updateSpaceSettings(settingsData: { spaceID: "<S-id>", settings: { membership: {
  policy: INVITATIONS, allowSubspaceAdminsToInviteMembers: <current>, trustedOrganizations: [] } } }) { id settings { membership { policy } } } }
# same with spaceID: "<S1-id>"

# step 2 oracle (as 👤R): what the button code sees
{ lookup { space(ID: "<S-id>") { community { roleSet { myMembershipStatus myRoles } } settings { membership { policy } } } } }
# → myMembershipStatus NOT_MEMBER, policy INVITATIONS

# step 6 (as 👤A): back to applications
mutation { updateSpaceSettings(settingsData: { spaceID: "<S-id>", settings: { membership: {
  policy: APPLICATIONS, allowSubspaceAdminsToInviteMembers: <current>, trustedOrganizations: [] } } }) { id } }

# step 6 apply via API if the UI path is in doubt (as 👤R)
mutation { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: "<S-roleSet-id>", questions: [] }) { id state } }
# then as 👤R: { lookup { space(ID: "<S-id>") { community { roleSet { myMembershipStatus } } } } }   # → APPLICATION_PENDING

# step 7 (as 👤A): reject
{ lookup { roleSet(ID: "<S-roleSet-id>") { applications { id state contributor { id } } } } }
mutation { eventOnApplication(eventData: { applicationID: "<application-id>", eventName: "REJECT" }) { id state } }
```

---

**P-M5 — activity feed.**

```graphql
# step 2/3 oracle (as 👤A): paginated feed, own entries excluded — the dashboard's filter
{
  activityFeed(first: 10, args: { excludeMyActivity: true }) {
    total
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        type
        createdDate
        description
        triggeredBy {
          id
        }
      }
    }
  }
}
# → no edge with triggeredBy.id == <A-id>; 10 edges while hasNextPage

# control (as 👤A): without the flag your entries are present
{
  activityFeed(first: 10) {
    edges {
      node {
        id
        triggeredBy {
          id
        }
      }
    }
  }
}

# step 4 oracle: "My activity"
{
  activityFeed(first: 10, args: { myActivity: true }) {
    edges {
      node {
        id
        triggeredBy {
          id
        }
      }
    }
  }
}
# → every triggeredBy.id == <A-id>

# both flags compose to empty, no error
{
  activityFeed(first: 10, args: { myActivity: true, excludeMyActivity: true }) {
    total
    edges {
      node {
        id
      }
    }
  }
}
# → total 0

# step 6/7 (as 👤R, no memberships): the privacy fix
{
  activityFeedGrouped(args: { limit: 100 }) {
    id
    createdDate
    description
    triggeredBy {
      id
    }
  }
}
# → []
{
  activityFeed(first: 10) {
    total
  }
} # → 0  (paginated path was never affected; control)
```

---

**P-M6 — long description.** UI only. Server-side limits for reference: callout framing description 65,568; `about.why` / `about.who` 32,784; innovation-flow state description 2,048. Optional API control (as 👤A) that the server still accepts 50,000 and the client is the one blocking at 50,001:

```graphql
mutation {
  createCalloutOnCalloutsSet(
    calloutData: {
      calloutsSetID: "<S-calloutsSet-id>"
      framing: {
        profile: { displayName: "m6-api-50000", description: "<50,000 × x>" }
      }
    }
  ) {
    id
  }
}
```

(`calloutsSetID` from `{ lookup { space(ID: "<S-id>") { collaboration { calloutsSet { id } } } } }`.) Delete it afterwards from the UI.

---

**P-M7 — organisation in manual selection.** UI for the walk; API oracle for persistence:

```graphql
# after step 4 (as 👤A): the saved selection carries the org id and the user id
{
  lookup {
    callout(ID: "<callout-id>") {
      settings {
        framing {
          selection {
            mode
            selectedIds
          }
        }
      }
    }
  }
}
# → mode CUSTOM (manual), selectedIds contains <org-id> and <B-id>

# step 7 set-up: remove 🏢 from S (as 👤A)
mutation {
  removeRoleFromOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: MEMBER }
  ) {
    id
  }
}
```

(`callout-id`: open the callout's URL; the id is in the GraphQL `calloutDetails` request in the network tab, or query `{ lookup { space(ID: "<S-id>") { collaboration { calloutsSet { callouts { id framing { profile { displayName } } } } } } } }`.)

---

**P-A1 / P-A2 — template.** O3 (operator, 🔑) and the walk (👤L).

```graphql
# O3 dry run (as 🔑) — attach the full response to the run sheet
mutation { adminRepairTemplateFiles(repairData: { dryRun: true }) {
  dryRun templatesScanned templatesWithForeignFiles copiedReferences
  references { templateID templateName location fileID storageBucketID ownerCanRead copied }
  missingFiles { templateName location fileID }
  failed { templateID location reason } } }


# dev env:
{
  "data": {
    "adminRepairTemplateFiles": {
      "dryRun": true,
      "templatesScanned": 136,
      "templatesWithForeignFiles": 2,
      "copiedReferences": 0,
      "references": [
        {
          "templateID": "0cdbac6b-4fd2-4038-a438-d288a7eb0695",
          "templateName": "Memo + Memos template collab",
          "location": "memo",
          "fileID": "019e4063-309c-72a3-8906-3068e745db2b",
          "storageBucketID": "5b22c8f1-5079-4eb0-acdd-0467e88a2d6f",
          "ownerCanRead": true,
          "copied": false
        },
        {
          "templateID": "b893e629-57c4-4eec-bf8a-bc08436fd3ea",
          "templateName": "Memo + Memos template collab",
          "location": "memo",
          "fileID": "019e4063-309c-72a3-8906-3068e745db2b",
          "storageBucketID": "5b22c8f1-5079-4eb0-acdd-0467e88a2d6f",
          "ownerCanRead": true,
          "copied": false
        }
      ],
      "missingFiles": [],
      "failed": []
    }
  }
}

# O3 apply (as 🔑)
mutation { adminRepairTemplateFiles(repairData: { dryRun: false }) { copiedReferences failed { templateID location reason } } }
# second apply → copiedReferences 0

# DEV env:
{
  "data": {
    "adminRepairTemplateFiles": {
      "copiedReferences": 0,
      "failed": [
        {
          "templateID": "0cdbac6b-4fd2-4038-a438-d288a7eb0695",
          "location": "memo",
          "reason": "Memo references are reported, not repaired: re-insert the image in the memo"
        },
        {
          "templateID": "b893e629-57c4-4eec-bf8a-bc08436fd3ea",
          "location": "memo",
          "reason": "Memo references are reported, not repaired: re-insert the image in the memo"
        }
      ]
    }
  }
}

# negative gate (as 👤A, a space admin): must be refused
mutation { adminRepairTemplateFiles(repairData: { dryRun: true }) { templatesScanned } }   # → FORBIDDEN_POLICY

# A1/A2 create (as 👤L) — the UI "from template" flow is preferred; API twin:
mutation { createSpace(spaceData: {
  accountID: "<L-account-id>",
  spaceTemplateID: "<template-id from references[].templateID with location whiteboard>",
  about: { profileData: { displayName: "a1-<date>" } },
  collaborationData: { calloutsSetData: {} } }) { id nameID about { profile { url } } } }
# A1 before apply → Space returned (no FORBIDDEN_POLICY). A2 after apply → Space returned and the whiteboard image loads.

# clean-up (as 👤L)
mutation { deleteSpace(deleteData: { ID: "<new-space-id>" }) { id } }
```

---

**P-A3 — content role vs AI server reset.**

```graphql
# as 📝
{
  platform {
    roleSet {
      myRoles
    }
  }
} # → [REGISTERED, PLATFORM_CONTENT_FULL_ACCESS]
{
  aiServer {
    id
    authorization {
      myPrivileges
    }
  }
} # → CREATE READ UPDATE DELETE only
mutation {
  aiServerAuthorizationPolicyReset {
    id
  }
} # → FORBIDDEN_POLICY
# as 🔑
mutation {
  aiServerAuthorizationPolicyReset {
    id
  }
} # → policy id
```

O2 itself (operator, 🔑), for the record: `mutation { authorizationPolicyResetAll }` is not exposed as a single mutation on this schema; the platform-wide reset is the operator runbook job (reset worker image = release server image). Per-scope resets that exist: `authorizationPolicyResetOnAccount`, `…OnOrganization`, `…OnUser`.

---

**P-A5 — organisation leaves a Space.**

```graphql
# precondition (as 👤A): 🏢 is Lead of S and member of S1 — use the P-M3 invitation + LEAD assignment
# oracle before (as anyone):
{
  rolesOrganization(rolesData: { actorID: "<org-id>" }) {
    spaces {
      nameID
      roles
      subspaces {
        nameID
        roles
      }
    }
  }
}
# → S: [member, lead], S1: [member]

# step 2 API twin (as 👤O, the organisation admin — NOT a space admin)
mutation {
  removeRoleFromOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: MEMBER }
  ) {
    id
  }
}
# → Organization returned

# step 3 oracle
{
  rolesOrganization(rolesData: { actorID: "<org-id>" }) {
    spaces {
      nameID
      roles
      subspaces {
        nameID
        roles
      }
    }
  }
}
# → S absent (member AND lead gone), S1 absent
{
  lookup {
    roleSet(ID: "<S-roleSet-id>") {
      organizationsInRoles(roles: [MEMBER, LEAD]) {
        role
        organizations {
          id
        }
      }
    }
  }
}

# negatives (each → FORBIDDEN_POLICY)
# as 👤O: org admin may not drop only LEAD
mutation {
  removeRoleFromOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: LEAD }
  ) {
    id
  }
}
# as a plain associate of 🏢, or an admin of another org:
mutation {
  removeRoleFromOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: MEMBER }
  ) {
    id
  }
}

# step 4 re-add via invitation (as 👤A, then 👤O): see P-M3; then Space-side removal as 👤A (must still work):
mutation {
  removeRoleFromOrganization(
    roleData: { roleSetID: "<S-roleSet-id>", actorID: "<org-id>", role: MEMBER }
  ) {
    id
  }
}
```

---

**Persona set-up on a fresh dev (optional, as 🔑).** 👤R must be a _registered user with no space roles_: register through `/sign-up` and verify the mailbox; do not add them to any space. If a throwaway user is needed via API:

```graphql
mutation {
  createUser(
    userData: {
      email: "<r78-r@…>"
      firstName: "R78"
      lastName: "Registered"
      profileData: { displayName: "R78 Registered" }
    }
  ) {
    id
    nameID
  }
}
```

A user created this way has no Kratos identity until they register; for UI walks prefer `/sign-up`.

---

## 5. Confidence from the agent coverage

| Area                                                  | Confidence                                                                                                                 | Why                                                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Browser Matrix messaging (#10365)                     | **Low** until A4                                                                                                           | Local-stack evidence only; ACC config, notification continuity and security sign-off all open.                               |
| Conversation removal (#6329)                          | **High** (🖐 M2 on dev end to end incl. the new client path; Alkemio-side API cases N-1…N-3 + U-1…U-5 green on the test env; Matrix side pinned locally by M-1…M-3). New API-only defect server#6673 found on the way, not a release blocker | Two UX notes raised on the story (no notice to the removed user; 1-member group survives). |
| Template copy rule + repair (#6596)                   | **Medium**                                                                                                                 | Extensive ACC-copy dry run in the PR; the exact failing template never exercised live; repair must actually run on ACC (O3). |
| Authorization changes (#6593, #6619, #6614)           | **High** for #6593, **Medium-high** for #6619 (needs reset), **High** for the #6637 paths (#672 green + 🖐 dev M8), **Medium** for #6614 as a whole (group A unfixed, #6655 undecided) | Schema byte-identical; regression unit tests red→green; platform-roles matrix in nightly.                                    |
| Activity feed (#6640, #6561)                          | **High** for both (API green in #672 + 🖐 dev M5 complete 2026-10-16)                                                        | it-spec green locally in #672 with sabotage-proven falsifiability; deploy skew is the real risk (D4).                        |
| Org leave-space (#6560) | **High** for public Spaces (13/13 API on test env; walks green 2026-10-14; 🖐 dev A5 complete incl. Lead + private-subspace cascade and the no-Leave negative). **Blocked for private Spaces** (server#6676, D6) | The two nightly reds were test-side (Lead ruling), not product. |
| client-web UI stories (#10179, #10419, #10300, #9972) | **Low** until M3/M4/M6/M7                                                                                                  | Unit tests only; two never opened in a browser.                                                                              |

---

## 6. Procedures used (agent)

- **Scope.** The 18 board items were read from the QA lead's view-13 list; each story and every linked PR body was read raw (`gh issue view`, `gh pr view`, timeline cross-references). Board fields were cross-checked via `gh api graphql` on `projectV2(number:50)` (needs `read:project`; page past 800 items).
- **Coverage map.** `git grep` over test-suites `origin/develop` (`server-api/src/**`, `client-web/src/functional-e2e/**`) per story area, plus the suite list in `client-web/config/playwright.config.nightly.ts`.
- **Versions.** Latest release tags via the GitHub API; develop head SHAs per repo at 2026-10-15 08:40 UTC. `platform.metadata.services` on dev/ACC did not answer from this host.

---

## 7. Sign-off

| Gate                                                                       | Owner                   | State |
| -------------------------------------------------------------------------- | ----------------------- | ----- |
| Release story filled (F1) and D1–D5 answered                               | Release Lead            | ☐     |
| Automated suites green or reds triaged (§1, §3)                            | Quality Lead            | ☐     |
| Coverage PR merged (§2 in flight)                                          | Quality Lead            | ☐     |
| Operator steps O1–O5 evidenced on ACC                                      | Release Lead / operator | ☐     |
| Manual flows M1–M7 (dev) and A1–A5 (ACC) complete, no open ⛔              | Quality Lead            | ☐     |
| **Acceptance sign-off** _(human gate)_                                     | Quality Lead            | ☐     |
| **Security sign-off** (alkemio#2075 trade-offs, #6545 residual R-1, #6640) | Security owner          | ☐     |
| **Go / no-go for production** _(human gate)_                               | Release Lead            | ☐     |
