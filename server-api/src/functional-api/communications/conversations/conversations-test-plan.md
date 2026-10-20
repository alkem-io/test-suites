# Test plan — Group conversation member removal revokes access (server#6329)

> **Status:** Approved · **Depth:** Standard — set explicitly by the requester. On evidence, the diff fires three elevated-risk triggers (authorization/visibility, a cross-repo contract, a deploy-version dependency), which would otherwise calibrate Deep. · **Story:** [alkem-io/server#6329](https://github.com/alkem-io/server/issues/6329)

Two independent defects made `removeConversationMember` leave the removed user with access:

- Cause 1 (Matrix): a kick was always rejected. Fixed in [matrix-adapter#82](https://github.com/alkem-io/matrix-adapter/pull/82): the member now leaves through their own account. Ships in adapter **v0.8.23**.
- Cause 2 (Alkemio policy): the participant rule was appended without a reset. The reset landed earlier, in server#6525 (`37555d0ae`), and the removal workflow re-applies the policy.

[server#6573](https://github.com/alkem-io/server/pull/6573) (`2eba9581`) makes the local fallback always complete and makes a late leave a no-op. It also ignores leave events for deleted rooms.

Since [client-web#10365](https://github.com/alkem-io/client-web/pull/10365) (merged 2026-10-14), browsers read and send conversation text through the user's own Matrix session. So **Synapse membership is now the control users actually hit**, and an API-only check of the Alkemio policy proves only half the fix.

**Headline:** 7 of 13 scenarios need no new test: re-enable or re-align 8 skipped tests in 3 files, plus unit coverage that is already sufficient. Six new cases: three run everywhere, and three Matrix cases run only on a local stack with the appservice token.

## How to run

```bash
cd server-api && pnpm exec vitest run --project conversations --fileParallelism=false
```

- Stack prerequisites: server ≥ `2eba9581` and matrix-adapter ≥ **v0.8.23**. The server quickstart has pinned v0.8.23 since server#6662 (2026-10-15), and the nightly deploys adapter `develop`. On v0.8.22 the Matrix cases fail by design.
- `conversation-member-removal-matrix.it-spec.ts` additionally needs `HARNESS_SYNAPSE_AS_TOKEN`, supplied through your own secret handling. `HARNESS_SYNAPSE_URL` must be loopback; the default is `http://localhost:8008`. Without the token the file skips; it never runs nightly.
- Inbound Matrix events must reach the server: Synapse pushes them to the adapter's appservice port (`host.docker.internal:8280` in the local quickstart). If that port is published on loopback only, Synapse's push is refused, membership leaves, renames and message counts never reach the server, and every case that waits on a `MEMBER_REMOVED` / `MESSAGE_RECEIVED` / list change (N-1…N-3, U-1…U-6) times out. Synapse logs `query_alias … Connection refused` when this is the cause. The Matrix-only cases (M-1…M-3) still pass.
- **Against the test environment from a workstation** (the stack where inbound Matrix events do arrive): export the nightly repo variables (`ALKEMIO_BASE_URL`, `ALKEMIO_SERVER`, `ALKEMIO_SERVER_URL`, `ALKEMIO_SERVER_WS`, `ALKEMIO_SERVER_REST`, `KRATOS_ENDPOINT`, `MAIL_SLURPER_ENDPOINT` from `gh api repos/alkem-io/test-suites/actions/variables`) over your local `.env`, unset `KRATOS_ADMIN_URL` and every `HARNESS_SYNAPSE_*` (the Matrix file must not run against a non-loopback API), and run the command above. The harness password is the same one the nightly uses. Done 2026-10-16: 45/50 green, N-1b red on server#6673, the Matrix file correctly unrunnable. 2026-10-20: N-1b un-skipped after server#6680.
- Subscriptions use `ALKEMIO_SERVER_WS`. Every subscription read filters by this run's conversation or room id, so the files are safe under parallel nightly (#612).

## Risk

| #   | Risk (in user terms)                                                                                               | Likelihood | Impact | Level        | Drives         |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | ------------ | -------------- |
| R1  | A removed member can still post into the group from the browser (Matrix session)                                   | Med        | High   | **High**     | M-2, MR-1      |
| R2  | A removed member still sees messages sent after their removal                                                      | Med        | High   | **High**     | N-3, M-3, MR-1 |
| R3  | A removed member keeps Alkemio privileges: read, send via API, re-add themselves, manage the group                 | Low        | High   | **Med-High** | N-2            |
| R4  | The removed member still shows in the member list, or the group stays in their own list                            | Med        | Med    | Med          | U-2            |
| R5  | MEMBER_REMOVED is missing, duplicated, or not delivered to the removed member                                      | Med        | Med    | Med          | N-1, U-3       |
| R6  | Voluntary leave regresses (same adapter path, now leave-as-self)                                                   | Med        | Med    | Med          | U-1, U-3, M-1  |
| R7  | Last-member auto-delete breaks (leave events for an already-deleted room, double delete)                           | Low        | Med    | Low-Med      | U-4, U-5       |
| R8  | A timed-out or rejected removal diverges or double-publishes                                                       | Low        | Med    | Low-Med      | unit only, D-1 |
| R9  | Members removed **before** the fix are still joined in Synapse, and their stale grants persist until an auth reset | High       | High   | **High**     | MR-2 (release) |

Elevated-risk triggers present: [x] authorization/visibility · [x] cross-repo contract (adapter `KickUser` semantics; a member with no membership now gets `NOT_ALLOWED`) · [x] infra/config (effective only once the adapter ≥ v0.8.23 is deployed) · [ ] migration · [ ] breaking schema (descriptions only) · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work

Searched on test-suites `origin/develop` @ `663c61d9` (HEAD `b451c329`, same content for these paths) and server `origin/develop` @ `a9ba1ea50`. Search terms: `removeConversationMember|leaveConversation|MEMBER_REMOVED|CONVERSATION_DELETED|conversationEvents|memberRemoved|conversation(ID|room(ID` across `server-api/src`, `client-web/src` and `lib/src`.

- `conversations.it-spec.ts`: the leave and remove happy paths are **`test.skip`** on client-web#9543 (still open). Two negatives are active and full: removal by a non-member, and removal from a non-existent conversation.
- `conversation-subscriptions.it-spec.ts`: the `MEMBER_REMOVED` describe and both `CONVERSATION_DELETED` tests are **skipped**. When they did run, they used `delay(3000)` plus `find` (at least once, not exactly once).
- `delete-conversation.it-spec.ts`: both implicit-deletion tests are **skipped**.
- `notifications/messaging/conversation-messages-negative.it-spec.ts` › US2-AS4 proves only that notifications stop. Its `waitForRemovalToLand` incidentally shows the removed user's own list dropping, and it does not run nightly. client-web `us2-group-message-notifications.spec.ts` US2-AS4 is **not counted** (it carries its own scope warning).
- **Proven absent:** any system test of a removed member's read, send, re-add or update privileges; any Matrix-side assertion; any `lookup.conversation` / `lookup.room` document in `lib`.
- Unit (opened):
  - server `conversation.service.authorization.spec.ts` › A1 pins the reset (a removed member loses READ; repeat resets are idempotent).
  - `message.inbox.service.spec.ts` pins: a stale leave for a deleted room is ignored; a late leave publishes nothing.
  - `conversation.service.spec.ts` pins the fallback paths.
  - adapter `TestKickUser_Room_*` and `TestHandleBatchRemoveMember_RemovalRejected`.
  - **Not pinned anywhere:** that `handleConversationMemberLeft` re-applies the policy before it publishes.
- **Reuse: 7 of 13 scenarios need no new test.** 9 existing tests need updating: 8 skipped server-api tests (U-1…U-5) and 1 client-web test (U-6).

## Scenario → test mapping

| Scenario                                                                                                              | Covers                     | Automated by                                                                                                                  | Layer              |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Removed member's sends are refused (API) and their read/manage privileges are gone; the remaining member keeps theirs | Scope 1 · R3 · spec FR-018 | `conversation-member-removal.it-spec.ts` › `N-2 — removed member loses privileges, remaining member keeps them (DT)`                                              | API                |
| Removed member's send through Matrix is refused with `M_FORBIDDEN`                                                    | Scope 1 · R1               | `conversation-member-removal-matrix.it-spec.ts` › `M-2 — the removed member’s Matrix send is refused (ST: joined -> left)`                                               | API+Matrix (local) |
| Removed member drops from the remaining member's list and from their own list                                         | Scope 2 · R4               | `conversations.it-spec.ts` › `should remove a member from a GROUP conversation` (U-2: re-aligned, + own-list assertion) — **skipped**, not yet green on any stack | API                |
| A later message reaches the remaining member's subscription, not the removed member's                                 | Scope 3 · R2               | `conversation-member-removal.it-spec.ts` › `N-3 — a message sent after removal reaches the remaining member, never the removed one`                                | API (WS)           |
| A later message is absent from the removed member's Matrix history                                                    | Scope 3 · R2               | `conversation-member-removal-matrix.it-spec.ts` › `M-3 — messages after removal are absent from the removed member’s Matrix history`                                     | API+Matrix (local) |
| MEMBER_REMOVED arrives exactly once to the remover                                                                    | Scope 4 · R5               | `conversation-subscriptions.it-spec.ts` › `MEMBER_REMOVED event` ×2 (U-3: re-aligned, bounded wait, count = 1) — **skipped**, not yet green on any stack | API (WS)           |
| MEMBER_REMOVED arrives exactly once to the remaining **and** the removed member (FR-019)                              | Scope 4 · R5               | `conversation-member-removal.it-spec.ts` › `N-1 — MEMBER_REMOVED reaches the remaining and the removed member exactly once` (green on test env 2026-10-16) · `N-1b — the MEMBER_REMOVED payload reflects the post-removal state` (was skipped on alkem-io/server#6673, stale members list from the subscription's cached loader; fixed by server#6680 in v0.169.1, un-skipped 2026-10-20) | API (WS)           |
| The removed member leaves the room through their own account; leave behaves the same                                  | R1 · R6                    | `conversation-member-removal-matrix.it-spec.ts` › `M-1 ('remove') …` and `M-1 ('leave') …` (2 rows)                                                                       | API+Matrix (local) |
| Voluntary leave: the leaver drops; one member left keeps the group (FR-009)                                           | Scope 5 · R6               | `conversations.it-spec.ts` › `should leave a GROUP conversation` (U-1); U-3 leave test — both **skipped**, not yet green on any stack | API                |
| Last member leaves → conversation deleted, CONVERSATION_DELETED exactly once                                          | Scope 6 · R7               | `conversation-subscriptions.it-spec.ts` › CONVERSATION_DELETED ×2 (U-4); `delete-conversation.it-spec.ts` › implicit ×2 (U-5) — all **skipped**, not yet green on any stack | API                |
| A non-member cannot remove; removal from a non-existent conversation errors                                           | FR-013/018                 | `conversations.it-spec.ts` (active, unchanged)                                                                                | API                |
| Timed-out or rejected removal completes locally; a late leave is a no-op                                              | R8                         | server + adapter unit specs (above)                                                                                           | Unit               |

### Regression guards

- **Cause 2 (stale participant rule):** N-2 › `assignConversationMember(self)` by the removed member must be `FORBIDDEN_POLICY`. The root cause was that `applyAuthorizationPolicy` pushed onto the persisted rules without `reset()`, which let a removed member re-add themselves.
- **Re-apply ordering:** N-2 row e0. `beforeAll` reads the conversation as C the moment A observes MEMBER_REMOVED, before any settle window, and N-2 asserts that read was `FORBIDDEN_POLICY`. The server re-applies the policy _before_ it publishes. If that order flips, N-2 goes red. (The other N-2 rows run after N-1/N-3's settle windows and cannot see the ordering.)
- **Cause 1 (Matrix kick rejected):** M-1/M-2. The adapter picked a same-rank intent to kick, so Synapse refused because nobody outranks anybody.
- **Duplicate MEMBER_REMOVED (pre-#6573):** U-3/N-1 count exactly one. The timeout path that caused the duplicate is unit-only (D-1).

### Existing tests requiring update

- U-1…U-5: un-skip the 8 tests above, but only after a green run against the prerequisites. Any that stays red goes back to `test.skip` with the product issue link (house rule). **Status 2026-10-15:** re-aligned and still skipped (commit `86d8795e`). **Status 2026-10-16: un-skipped.** All 8 ran green against the test environment (server develop + matrix-adapter develop with #6573/#82, deployed by the 2026-10-16 nightly), together with N-2 and N-3; the only red was N-1's payload half, split out as N-1b and skipped on server#6673 (fixed by server#6680 in v0.169.1; un-skipped 2026-10-20). R4, R6 and R7 now have running system tests; client-web#9543's symptom (leaver keeps the group) is re-checked by U-1 and can be closed when the client walk confirms it.
- U-3/U-4: replace `delay(3000)` with a bounded wait plus a count.
- U-6: client-web `us2-group-message-notifications.spec.ts` US2-AS4 assumes removal is synchronous (`delay(3_000)`, "local-authoritative path is synchronous"). Since #6573 + #82, removal lands asynchronously via the Matrix leave. Replace that wait with a bounded poll on C's `me.conversations`. Its scope-warning text is stale: both causes are fixed. Point it at this plan instead.

Confirmed unaffected (opened): Create / Update / Query / Messaging in `conversations.it-spec.ts`; `delete-conversation` authorization; `conversation-message-subscriptions.it-spec.ts`; `conversation-messages-negative.it-spec.ts` (its 30 s poll still holds).

## Not covered — known gaps

| Scenario                                                                                 | Why not automated                                                                                           | Where it belongs                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matrix half on a deployed environment (nightly, ACC, prod)                               | No Synapse credential outside loopback (harness gap)                                                        | **Manual MR-1**, release checklist: on ACC, two browsers; the removed member cannot send and does not see new messages                                                                                         |
| Members removed before the fix (still joined in Synapse; stale grants)                   | Pre-existing production state; no DB or Synapse access; **no reconcile tool for conversation rooms exists** | **Manual MR-2**, post-deploy: run the platform auth reset (it re-applies every conversation policy) and confirm adapter ≥ v0.8.23 in Released images. Open question for server: who repairs Synapse membership |
| Removal while the adapter is paused or the RPC times out (D-1)                           | No infra lever inside a test (harness gap); unit-pinned                                                     | Deferred: `deferred.md`                                                                                                                                                                                        |
| Browser UI after removal (the chat list and timeline are Matrix-sync driven)             | Out of this API scope                                                                                       | client-web walk: net-audit `NEW-F-group-membership-edit`. server-api is slated to retire, so this plan needs a UI twin                                                                                         |
| A previously shared attachment stays readable by the removed member                      | No conversation-attachment harness; outside SCOPE                                                           | Deferred: `deferred.md`                                                                                                                                                                                        |
| A re-added member regains access (reset on the add path, spec 040 edge case)             | Outside SCOPE; Low risk                                                                                     | Candidate P3 follow-up                                                                                                                                                                                         |
| The removed member is the room's last _joined_ Matrix member while Alkemio lists others  | Documented product limit, not handled (`matrix-admin-reflection.md`)                                        | Product decision, not a test                                                                                                                                                                                   |
| Performance: per-removal policy re-apply is linear in group size (NFR-002, ≤ 50 members) | No latency harness; unchanged by this diff                                                                  | —                                                                                                                                                                                                              |

Non-functional assessment:

- **Security:** covered by N-2 and M-1…M-3 (privilege escalation and data exposure).
- **Reliability:** D-1 is unit-pinned.
- **Compatibility / accessibility:** not applicable to this API-only diff.

**What is proven, and what is not.**

- **Proven on the test environment (2026-10-16) and on every stack that delivers inbound Matrix events — N-1…N-3 and U-1…U-5 green:**
  - Removal ends the removed member's Alkemio access: read, API send, re-add, manage.
  - Membership lists update.
  - MEMBER_REMOVED is delivered exactly once to all three parties.
  - Leave and auto-delete still work.
- **Matrix half** (the one browsers actually use since client-web#10365): proven only on a local stack with the token (M-1…M-3). On test, ACC and prod it rests on MR-1.
- **Nothing in this plan, or anywhere else, repairs or verifies members removed before the fix (R9).** That is the most important open item for the release.
