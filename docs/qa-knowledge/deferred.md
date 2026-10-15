# Deferred cases

Every deferred case with its blocker, the condition that clears it, and an
owner. Move a row to *Cleared* (with date) once the blocker is gone — don't
re-derive it from scratch in a future run.

## Open

| Case | Story | Blocker | Clears when | Owner |
|---|---|---|---|---|
| System-level (API) test that a 9-state template is rejected on an L0/subspace flow | client-web#9528 / server#6418 | No `createStateOnInnovationFlow`/`deleteStateOnInnovationFlow` request-params wrappers — can't construct an exact 9-state donor | Wrappers added (small, mechanical — see `harness.md`) | test-suites maintainers |
| System-level (API) test that a sub-4-state (e.g. 2-state) template is accepted on an L0 | client-web#9528 / server#6418 | Same wrapper gap | Same | test-suites maintainers |
| Migration `InnovationFlowStateBounds1To8` backfill correctness against ACC's real `settings` row shapes (incl. legacy scalar-null coercion) | client-web#9528 / server#6418 | test-suites has no DB access (GraphQL-only surface) — not a tooling gap that can clear, a standing architectural constraint | Not expected to clear; stays a release-ops SQL check, not test-suites automation | Release verification / DBA |
| Push emit for `SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED/_DECLINED` (answerer excluded) | notifications#356 / server#4100 | `RABBITMQ_MANAGEMENT_*` is not set in the nightly workflow; the behaviour is unit-pinned in server `notification.space.adapter.spec.ts` (Low risk) | Nightly exports the RabbitMQ management env, or push regresses and the case is worth a local-only spec | test-suites |
| Migration `1788600000000-AddSpaceAdminInvitationResponseNotificationSetting` seeds `communityInvitationResponse` from each user's existing `communityNewMember` (muted stays muted) | notifications#356 / Release 76 N2 | DB access is loopback-only; ACC/prod rows are unreachable and every persona here is post-migration | Not expected to clear. Stays a release-ops SQL check | Release verification / DBA |
| Forum label values for locales a stack does not enable (local stack: only en + nl eligible) | alkemio#2052 | A stack renders only `platform.configuration.language.eligible`; locale file contents belong beside the files | client-web unit test asserts HELP/NEWSLETTER/TIPS values in all six JSONs | client-web |
| Historical in-app forum notifications show a label, not a raw key (060 US4-AS4) | alkemio#2052 | Persisted forum in-app payload shape unverified; the 060 walk saw no forum in-app rows | Payload shape confirmed → local SQL-seeded bell check | test-suites |
| Migration `1788300000000-AddForumCategoriesNewsletterTipsTricks` on real rows (incl. `FOR UPDATE` vs a live retirement) | alkemio#2052 | No DB access to ACC | Not expected to clear — release-ops check | Release verification |
| `activityFeedGrouped` / `activityFeed` return nothing for a user who holds a space credential but READ on none of its collaborations (server#6640 R5) | server#6640 | There is no GraphQL lever to give a user a space credential while denying READ on that space's collaboration. The empty-scope guard is list-based and unit-pinned (`activity.service.spec.ts`) | A harness lever exists to grant a raw credential or to override a collaboration's authorization policy | test-suites |
| BVA on `activityFeedGrouped(args:{limit})`: 0, negative, fractional, above 100 (uncapped on the first iteration; a negative or fractional value reaches Postgres as a syntax error, per server#6643's PR body) | server#6640 (side note) | No server issue and no agreed contract for the bounds. A test today would pin either a bug or a guess. No load harness exists for the cost side | A server issue defines the accepted range and the error shape | server / QA lead |
| Release skew: client-web operation `LatestContributions` (sends `excludeMyActivity`, client-web#10403) against a server without server#6639. Input coercion rejects the whole operation, and the dashboard spaces feed empties | server#6561 (R5) | No cross-repo contract harness (harness.md › Standing gaps). It is a deploy-order fact, not product behaviour on one stack. The API cases go red on such a server, but only where the suite runs (test-alkem.io = develop) | A harness validates client-web `.graphql` documents against the schema of the server image being released together with them | test-suites / release lead |
| Un-skip and re-verify `transfer-callout-template-flow.it-spec.ts`'s two `test.skip` cases ("lands on a valid destination state" / "adopts the destination default state") | pre-existing, unrelated stale-state bug per the file's own header comment | Root-cause bug not identified in this run (out of scope — different story) | Someone triages the referenced stale-state bug | whoever owns callout-transfer |
| Anonymous visitor on an organisation profile sees the Spaces the organisation leads (and the `Lead Spaces` tab); re-align `memberships/view-organization-profile-public.spec.ts` › Unauthenticated, which is predicted red after #10424 | client-web#10179 / #10424 | **Product ruling.** The client skips `rolesOrganization` for anonymous visitors (no `READ_USERS`). Automating either behaviour before a ruling pins a possible defect | The product owner rules whether anonymous visitors should see an organisation's Space roles. Defect → skipped expected-behaviour case + issue; intended → re-align step 5 to `['All Memberships']` | QA lead / client-web |
| Group conversation removal while the adapter is paused / the RPC times out: local removal completes, MEMBER_REMOVED is published once, the late leave is a no-op | server#6329 / #6573 | **No infra lever from inside a test** (standing gap). Unit-pinned in server `conversation.service.spec.ts` + `message.inbox.service.spec.ts` | The compose harness gains a service-toggle helper a spec can call | test-suites |
| Removed conversation member cannot send or read through Matrix on a **deployed** environment (nightly, ACC, prod) | server#6329 / matrix-adapter#82 | No Synapse credential outside loopback; the appservice token is local-stack only | Not expected to clear. Manual release row (plan MR-1); local-stack automation is plan M-1…M-3 | Release verification |
| A removed conversation member loses access to attachments shared before removal | server#6329 | No harness for conversation attachments (Matrix media staging + reference publish via `sendMessageToRoom.attachmentUpload`) | An attachment-upload helper exists in `lib` | test-suites |
| Members removed before the fix (local-only removal, sec-server-11 → adapter v0.8.23 deploy) are still joined in Synapse | server#6329 | Pre-existing production state; no DB or Synapse access; **no reconcile tool exists for conversation rooms** | Not a test. Clears when server or product ships a repair; until then a release-ops note | server / Release lead |

## Cleared

| Case | Cleared | How |
|---|---|---|
| Forum reconcile apply-mode convergence end to end (was: "no disposable-stack signal, Matrix invisible") | 2026-09-29, forum plan revision | Local-stack gate + the dev appservice token (env var) reading `m.space.child` state → plan N-11 / N-15 |
| Forum/category spaces absent from the public room directory | 2026-09-29 | `GET /_matrix/client/v3/directory/list/room/{roomId}` is unauthenticated → plan N-12a (no token); N-12b seeds `public` with the token |
| POA persona allowed to reconcile | 2026-09-29 | `registerTestUser` + `assignPlatformRole(RoleName.PlatformOperationsAdmin)` / `removePlatformRole` exist on develop → plan N-13 (local) |
| `/forum/releases/latest`, `maxOperations` bounds | 2026-09-29 | Reclassified as expected-red product-finding cases (plan E-4, N-14), pending the user's call |
| Forum reconcile N-11 / N-15 skipping on stacks built from server develop (adapter pinned at v0.8.17) | 2026-10-15 | The server quickstart pins matrix-adapter v0.8.23 since server#6662, so ≥ v0.8.19 holds. Found during the server#6329 design run; the forum cases themselves were not re-run |

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

Every case a plan deferred, with its **blocker**, the **clearing condition**, and an owner.

**Check this file at the start of every run.** If a blocker has cleared, the case is now
automatable — reuse it rather than re-deriving it, and move the row to *Cleared* with the date.

### Open

| # | Case | Blocker | Clears when | Owner | Raised |
|---|---|---|---|---|---|
| D-01 | A data migration actually rewrote pre-existing rows, at the ruled position, idempotently, skipping the deliberate no-op rows | **No DB access from `test-suites`.** Every entity these suites create is post-migration, so it exercises the application default path, never the SQL | The owning repo gains a real-database migration integration test (a disposable Postgres + fixture matrix, run twice). For 055 that fixture matrix already exists as an uncommitted verification track — promoting it is the whole job | `server` CI | 2026-09-02 (10178) · re-raised 2026-09-03 (055, migration `1788200000000-AddSearchSidebarWidget`) |
| D-02 | Search backend unreachable → retryable error state, no summary label, typed text retained | **No infra lever from inside a test** — nothing can stop the Elasticsearch container mid-run | The compose harness gains a service-toggle helper a spec can call | test-suites | 2026-09-03 (055, US1-AS14) |
| D-03 | Six-locale copy: the three summary sentences and their plural forms, plus the "Search" Layout-editor label, in bg/de/en/es/fr/nl | Locale assertions have no home in this repo (standing gap) | A `client-web` unit test asserts the new keys beside the locale files | `client-web` | 2026-09-03 (055, FR-014) |
| D-04 | p95 / DB cost of the unbounded `calloutsSet.tags` query, now issued on every tab for every viewer including anonymous | **No load/latency harness for GraphQL read paths.** `load-testing/` is a socket/stress tool, not a query profiler | A query-profiling harness exists, or the follow-up lands that pushes the flow-state filter into the tag query (which would change what to measure) | test-suites / `server` | 2026-09-03 (055, release R-12) |
| D-05 | Screen-reader announcement of a `<output aria-live="polite">` live region; focus order into an always-mounted hidden drawer | **No accessibility harness** — no `axe-core` / `@axe-core/playwright` | An a11y harness is added. Note the drawer focus trap is a known pre-existing 040 defect with its own follow-up, so a test today would pin a bug | test-suites | 2026-09-02 (10178) · re-raised 2026-09-03 (055) |
| D-06 | A client's mirrored copy of a server constant agrees with the server's published value | **No cross-repo contract harness.** Only the server half is pinnable here | The client consumes the value from config at test time, or a contract harness exists | test-suites | 2026-09-02 (10178) |
| D-07 | Sidebar drawer (mobile) and desktop column share one search state across open/close | Two viewport contexts plus an always-mounted drawer whose `Menu` / `Close` locators are unverified against this repo's fixtures; Low risk. Cheap to build once the locators are confirmed on a real run | Someone confirms the drawer's open/close accessible names against the running app | test-suites | 2026-09-03 (055, US1-AS11) |

### Cleared

_None yet._ When a blocker clears, move the row here with the date and the plan that reused it.
