# Test plan — organization space invitations (061)

> **Status:** Approved · **Depth:** Light (forced by QA lead) for the notifications#356 extension · **Story:** [notifications#356](https://github.com/alkem-io/notifications/issues/356) · parent [server#4100](https://github.com/alkem-io/server/issues/4100) · Release 76 ([alkemio#2132](https://github.com/alkem-io/alkemio/issues/2132))

- **Workspace spec:** `specs/061-organization-space-invitations/` in `alkem-io/agents-hq` (source of truth for the US/AS ids below). It is on branch `server-4100` only and was read from there. Rulings R26/R26b/R27/R28/R33/R40 in `design/operator-rulings.md` govern the extension below.
- **Suites:** `client-web/src/functional-e2e/organization-space-invitations/` (acceptance walks). Server-side validation-only scenarios that the unified invite dialog can never drive (an Admin role or a non-actor id offered to an organization) are covered instead by `server-api/src/functional-api/roleset/invitations/invitation-organization.it-spec.ts`. Each acceptance spec's header cross-references that file for the AS ids it defers. Notification it-specs live in `server-api/src/functional-api/notifications/space/community/`.

The US1–US3 walks and the organization-invitation it-specs merged with test-suites#632. **This extension** covers two rows of notifications#356 that were never proven live: the Space-admin outcome notifications when a **user** accepts or declines a Space invitation (`SPACE_ADMIN_USER_COMMUNITY_INVITATION_ACCEPTED/_DECLINED`), and the rule that a user's invitation acceptance **no longer** also fires the generic `SPACE_ADMIN_COMMUNITY_NEW_MEMBER`. **Headline claim once built:** both are pinned at API level (email and in-app) at L0, and at the L1 ancestor boundary. Push stays unit-level. The analysis ran against `origin/develop` @ `0ca74068` (2026-09-25; `git fetch` failed in that session) and against the merged diffs server#6467, notifications#594, client-web#10272 and test-suites#632.

## How to run

Needs a running app plus the GraphQL API, MailSlurper, and the notification
queue, all reachable from `client-web/.env` / `server-api/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/organization-space-invitations

cd server-api   # the 061 notification it-specs, incl. this extension
pnpm exec vitest run --project notifications --fileParallelism=false \
  src/functional-api/notifications/space/community/
```

The walks are tagged `@forge-acceptance` and need a live stack, so they are not
part of the repo's default gate commands. No CI job discovers `functional-e2e/**`,
so run them explicitly or through `/forge`'s verification phase. The it-specs
must run serially (`--fileParallelism=false`) because they share one MailSlurper
inbox and globally seeded personas. **The `nightly` project lists 061 notification
specs by path** (`server-api/vitest.config.ts:143-145`), so a new file must be
added there or it never runs nightly. `user-invitation-outcomes.it-spec.ts` is
registered there.

**Where these have actually run (28.09).** Notification tests are for the moment
not performed against a deployed environment, so the notifications#356 cases are
verified on a **local stack only**: server `develop` @ `f2e22077b`, notifications
`develop` @ `a6a426d`, 3/3 green, and 30/30 green for the whole
`notifications/space/community/` folder in one run. On Test and ACC the behaviour
rests on the manual rows in `docs/runs/release-76-verification.md`.

## Risk (notifications#356 extension)

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A user accepts, the generic "joined" is suppressed, but the replacement "accepted" never reaches the Space admins (routing key without a handler, a template throw, or a nack with no requeue). Admins silently learn nothing about a new member | Med — user arm never exercised live; wire contract hand-mirrored (R76 X2/X6) | High | **High** | UO-1 |
| R2 | Admins are notified twice for one accept ("accepted" + "joined") — the explicit product rule (R26) | Low — unit-pinned | Med | Med | UO-1 |
| R3 | The invitee gets no "welcome" because the suppression over-reaches to the member side | Low | Med | Low-Med | UO-1, UO-3 |
| R4 | A user declines and admins are not told, **or** they are told when product intended not (story says "reject was not implemented"; the code implements it) | Med (product ambiguity) | Med | Med | UO-2, OQ-2 |
| R5 | Invited to a subspace via `invitedToParent`: the suppression leaks to the **ancestor** Space, so the L0 admins hear nothing about a new L0 member (R26b) | Low — unit-pinned | Med | Med | UO-3 |
| R6 | The muted `communityInvitationResponse` setting is ignored, or its predecessor fallback re-enables admins who had muted `communityNewMember` | Low | Low-Med | Low | covered — no new case |
| R7 | An invitee accepting an ADMIN-role invitation is told about their own accept (R33), or push is broken for the user arm | Low | Low | Low | covered at unit level — no new case |

Elevated-risk triggers in the whole 061 diff: migration (3 `user_settings`/`organization` jsonb backfills) · cross-repo contract (13 new routing keys) · authorization (ACCEPT/REJECT privilege). **For this extension's scope** only the cross-repo contract bites (R1). The migrations are not reachable from here (see gaps), and the depth is Light by instruction.

## Existing coverage before this work

Searched `server-api/src`, `client-web/src` and `lib/src` on `origin/develop` for: the raw and generated enum names, `communityInvitationResponse`, "accepted/declined the invitation", `joined ${…}` and "Welcome to the Community", and **every** `eventOnRoleSetInvitation` / `'ACCEPT'` / `'REJECT'` call site. Owning-repo unit suites were read in the merged diffs.

| In-scope item | Verdict | Evidence |
|---|---|---|
| Gap 1 — user ACCEPTED → every Space admin notified | **None** (system) | No spec references `SpaceAdminUserCommunityInvitation*` outside `lib/…/alkemio-schema.ts:6634-6635`. `invitations.it-spec.ts` (8 tests, :215-448) only asserts the invitee *receiving* an invitation and never accepts. Unit: `role.set.resolver.mutations.membership.spec.ts` › `user accept/decline outcome dispatch` (mocked) |
| Gap 1 — user DECLINED → every Space admin notified | **None** (system) | As above. Server emits it: `role.set.resolver.mutations.membership.ts` REJECT branch → `dispatchInvitationOutcomeNotification(…,'declined')` for `ActorType.USER` (server#6467; still on server `develop` @ `386e897b` behind `!isOrganizationRoleSet`) |
| Gap 2 — user accept suppresses generic "joined" to admins; welcome still fires | **Partial** — organization arm only | `organization-invitations.it-spec.ts:619-729` (in-app `SpaceAdminCommunityNewMember` absent, :698-706). User arm: unit only — `notification.space.adapter.spec.ts` › `keeps the member welcome but suppresses the admin new-member notification for INVITATION`; `role.set.service.spec.ts` › `(R26) … ONLY on the invited role set` |
| DIRECT paths keep "joined" (boundary) | **Full** | `join-community.it-spec.ts:202,231` (`joinRoleSet`), `:260` (`assignRoleToUser`); `application-approval-new-member.it-spec.ts:224` (R40) |
| Response setting muted / predecessor fallback | **Full** for this scope | `organization-invitations.it-spec.ts:757-801` exercises the same `case` fall-through that serves all four outcome events. Unit: `notification.recipients.service.spec.ts` › `061: falls back to the PREDECESSOR…`, `user.settings.entity.spec.ts` › `applyInvitationResponseDefaults` |
| Answerer excluded on email/in-app/push (R33) | **Full** at unit level | `notification.space.adapter.spec.ts` › `excludes whoever answered … email, in-app AND push`. It runs through the private `spaceAdminInvitationOutcome`, which the user handlers share |

**Reuse:** 3 of 6 in-scope items need no new test. **Tests invalidated by the change: 0.** Confirmed unaffected: `join-community.it-spec.ts` (all 4 tests are DIRECT-origin and still expect "joined"), `invitations.it-spec.ts` (never accepts), and the user-accepting specs `invitation-contributors.it-spec.ts:332,381,423`, `invitation-hierarchy-parity.it-spec.ts` and `move-L*-applications-invitations.it-spec.ts` (no mail/in-app assertion). `me-pending-partition.it-spec.ts` asserts in-app rows only for the organization-associates flow. Playwright `us1–us3` are organization-invitee only.

## Scenario → test mapping

| Spec | User Story | Scenarios | Notes |
|---|---|---|---|
| `us1-invite-organization.spec.ts` | US1 — Space admin invites an organization | AS1-AS9 | AS7/AS8 (validation errors) are API-only — see the server-api cross-reference above. Includes a regression walk (AS2) for the invite-dialog search-exclusion defect found during acceptance verification. |
| `us2-org-admins-notified.spec.ts` | US2 — Organization admins are told their organization was invited | AS1-AS7 | Email, in-app and push artifacts, plus the zero-admin and muted-admin edge cases. |
| `us3-org-accepts-declines.spec.ts` | US3 — Organization admin accepts or declines on behalf of the organization | AS1-AS8 | Gate 0 (the ACCOUNT_ADMIN-derived accept privilege) is also proven server-side against a mocked-then-live authorization graph. |

Shared fixtures (org creation, role assignment, invitation helpers, the
`TestUserManager`/`OrgFixture` scaffolding) live in
`organization-space-invitations.helpers.ts`.

**notifications#356 extension** — one new file, `server-api/src/functional-api/notifications/space/community/user-invitation-outcomes.it-spec.ts`:

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| UO-1 · User accepts an L0 invitation → both Space admins get "accepted" (email + in-app), neither gets "joined"; invitee gets the welcome | #356 rows 4+5 · R26/R28 · R1-R3 | `server-api/src/functional-api/notifications/space/community/user-invitation-outcomes.it-spec.ts` › `UO-1 — user accepts an L0 invitation: every Space admin hears "accepted", nobody hears "joined", the invitee is welcomed` | API |
| UO-2 · User declines an L0 invitation → both Space admins get "declined" (email + in-app) | #356 row 4 · R28 · R4 | `server-api/src/functional-api/notifications/space/community/user-invitation-outcomes.it-spec.ts` › `UO-2 — user declines an L0 invitation: every Space admin hears "declined"` | API |
| UO-3 · User accepts an **L1** invitation with `invitedToParent` → L1 admin gets "accepted", no L1 "joined"; the L0 admins **do** get L0 "joined" | #356 row 5 · R26b · R5 | `server-api/src/functional-api/notifications/space/community/user-invitation-outcomes.it-spec.ts` › `UO-3 — user accepts an L1 invitation via invitedToParent: the L1 admin hears "accepted" (not "joined"), the L0 ancestor admins hear "joined" as normal`. This test also asserts, beyond the plan's original scope, that the L0 admins do NOT receive the L1 "accepted" mail — safe only because this fixture's L0 admins hold no L1 admin credential (QA lead's manual run, 2026-09-28); the general case (an L0 admin who ALSO holds the L1 admin credential) remains unpinned, as designed. | API |
| Muted response setting; predecessor fallback | R27/R27a · R6 | `organization-invitations.it-spec.ts` › `an inviter who switched off…` + server unit | API + unit |
| Answerer exclusion (all channels); push payload | R33 · R7 | server `notification.space.adapter.spec.ts` | unit |
| Direct join / admin-add / approved application keep "joined" | R40 boundary | `join-community.it-spec.ts`, `application-approval-new-member.it-spec.ts` | API |

### Regression guards

- `organization-invitations.it-spec.ts:698-706` pins "no generic new-member row on an organization accept". UO-1 extends the same guard to the user arm. That is where the pre-061 behaviour lived (a user accept fired only "joined", R28).
- `application-approval-new-member.it-spec.ts:224` pins that the suppression does **not** extend to applications (R40; server#6476 closed "resolved differently" 2026-09-16).

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Push emit for the user outcome events | Unit-pinned through the shared outcome method. A live push assertion needs `RABBITMQ_MANAGEMENT_*`, which nightly does not set. Low risk | Server unit (existing). Revisit if push regresses |
| Bell rendering of the user-outcome row (name, copy, link to Community tab) | client-web unit tests in #10272 name the organization events only. Rendering is a UI concern outside this API scope | Manual row proposed for `docs/release-verification-checklist.md` (build sheet M-1) |
| Migration `1788600000000` seeding `communityInvitationResponse` from `communityNewMember` on existing rows | Direct DB access is loopback-only (local/CI compose). It is unavailable against ACC/nightly, and every persona here is post-migration | Release-ops SQL check (R76 N2 / `deferred.md` D-01) |
| Six-locale in-app copy for the user events | Locale assertions have no home here (standing gap) | client-web unit (`deferred.md` D-03 pattern) |

**Open questions.** **OQ-1:** a comment on #356 (2026-08-24) says the feature is "intentionally email-only". server#4100's ACs, ruling R17 (2026-09-03) and the code all send **email, in-app and push** (`spaceAdminInvitationOutcome`), and `organization-invitations.it-spec.ts:415-418,688-696` already assert in-app rows. The code implements all three channels, and UO-1/UO-2 pin in-app, so product must confirm. **OQ-2:** #356 row 4 says user "reject was not implemented". The code emits `SPACE_ADMIN_USER_COMMUNITY_INVITATION_DECLINED` (server#6467), the notifications service has a template for it (`user.space.community.invitation.declined.js`), and client-web has copy. UO-2 pins what ships. If product rules otherwise, the expectation flips and the story text needs correcting either way.

**What is proven, and what is not.** Today no live test shows that a Space admin hears anything when a *user* answers an invitation. R76's N2 "no double-send — verified" rests on the organization arm and unit mocks. Once built, UO-1 to UO-3 prove over the real queue that the user outcome events reach every admin by email and in-app, that "joined" is suppressed only on the invited Space, and that the welcome survives. Push delivery, the bell's rendering and the migration's effect on existing users' settings remain unproven by automation.
