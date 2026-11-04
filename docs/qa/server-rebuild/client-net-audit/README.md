# Client-web Playwright suite as the server-migration net — audit

_2026-10-14. test-suites `develop` @ `b451c329`, client-web `develop` @ `7a37d4c4b`, server `develop` @ `cf12b07b2`. Every spec file and its helpers were read; nothing was edited or run. Per-spec evidence is in the six group files beside this one (`g1`–`g6`)._

## Verdict in one paragraph

The suite is a real but narrow net. Of 153 spec files, 51 are STRONG (a user write through the browser, then an oracle that would go red on a wrong server answer), 30 are USABLE (server reads of lib-seeded data), 25 are WEAK (client rendering only) and 46 are NOT-A-NET (unregistered, skipped, or asserting on their own seed). Only 94 of the 153 files run nightly; the nightly today is green at 524 of 533 rows in about two hours on one worker. The critical gaps for a server rewrite are not where the tests are weak but where there are none: no user ever joins an open Space, creates a subspace, changes a Space setting, edits a whiteboard, memo or document, invites an existing user to a Space, creates or edits an organization, or searches — through the UI. And the plan "update only the lib" is incomplete: 42 test files talk to the server with their own GraphQL documents, and the whole harness stands on two REST routes the new server must keep.

## Baseline (nightly 2026-10-14, run 38536128207)

| | |
|---|---|
| rows | 533 |
| passed | 524 |
| skipped, each with an issue link | 9 |
| failed | 0 |
| wall time, `PW_WORKERS=1` | ~2 h 04 min |
| spec files in the nightly | 94 of 153 |
| cases in any scheduled job | ~470 of ~746 |

The run before the stabilisation PRs (2026-10-08) had 17 unexpected rows across 10 suites. The green baseline is one week old; treat flakes as new information.

## 1. Journey coverage matrix

Verdict per journey, judged on what runs **nightly** unless stated. "UI" / "lib" says where the business write happens.

### Identity
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| A1 | sign-up + email verification | STRONG | UI | `authentication-registration`: real Kratos sign-up, verification mail, verify, sign in. Never reads back the Alkemio profile; leaks a user per run |
| A2 | sign-in | STRONG | UI | `authentication-login`; signed-in signal is the server's `id-token-hint` 200 |
| A3 | sign-out | STRONG | UI | same file; server session proven gone |
| A4 | password recovery | STRONG | UI | new password accepted, old refused with the server's exact 401 body |
| A5 | restricted / unauthenticated redirects | USABLE | – | non-admin bounced, returnUrl round-trip; no positive control (an admin is never let in) |
| A6 | cookie consent | WEAK | client | client cookie only; "banner stays away" negatives have no settle window |
| A7 | session revocation | **NOT RUN** | lib | `session-revocation/*` (11 cases) are excellent wire-level checks and in no runner; they pin server internals (`me-` anon id, `error_code`, cookie format) |
| A8 | self-service account deletion | USABLE nightly / **NOT RUN** for the delete | lib | nightly covers visibility, "Former member" sentinel, routing; the three specs that delete through the UI are unregistered and need loopback Postgres + Redis |
| A9 | language offer | STRONG (US2, US5) / WEAK (rest) | UI | persisted preference and invite suggestion read back; anonymous detection is client-only; "us1-signup-offer" never signs up |

### Home, navigation, discovery
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| B1 | home dashboard, my memberships | **ABSENT** nightly | – | only in unregistered `memberships/view-home-dashboard-*`; `home-menus` is `describe.skip` with dead selectors |
| B2 | top nav, user menu, support | WEAK | – | headings and menus; shell renders ⇒ green |
| B3 | Explore / Spaces page | WEAK | – | 22 cases assert chrome only; the seeded org, pack and discussion are never asserted |
| B4 / M1 | sidebar + global search | **ABSENT** | – | manual ACC run only (`sidebar-search/`) |
| B5 | notifications bell | USABLE | lib | `callout-reaction-notifications` pins rows + deep link; the applicant-side bell checks in `applications/*` are vacuous (unscoped regex on a shared persona) |
| B6 | docs routes | WEAK | – | iframe heading |
| M2 / M3 | contributors page, explorer filters | **ABSENT** | – | |

### Space lifecycle and settings
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| C1 | create Space (user / org account) | STRONG but thin | UI | 2 of 10 cases per file do the create; oracle is a non-exact heading + tutorial callouts; no Hosted-spaces or GraphQL read-back; 16 of 20 cases are dialog validation |
| C2 | edit Space profile / visuals | STRONG (banner, 1 case) / **ABSENT** (about, tagline, tags) | UI | `banner-crop-default-shape` |
| C3 | Space settings: privacy, membership policy, collaboration toggles | **ABSENT as a write** | lib | every privacy/policy value is seeded; reads are USABLE (`public-space/*`) |
| C4 | create subspace L1 / L2 | **ABSENT as a write** | lib | all subspaces come from `TestScenarioFactory` |
| C5 | move / convert subspace | STRONG, **manual runner only** | UI | `platform-roles/space-conversion-as-resource-admin` (L1→L0, level read back) |
| C6 | delete Space | thin | UI | error-free mutation, no read-back |
| C7 | innovation flow states | WEAK | UI | `default-template-per-flow-state` asserts "dialog hidden"; the one server case is skipped (client-web#10416) |
| C8 | templates settings | STRONG | UI | `templates-CRD`: 83 cases create/edit/use through the UI with read-back; **delete is commented out in every spec**; 10 whiteboard-framing cases stop at a `test.fail` before their feed/contribution checks; 4 comments-only cases duplicate their twins |
| C9 | community guidelines | touched | – | template "use" fills the form, never saves |
| C10 | admin visibility / licence / nameId | STRONG, **manual runner only** | UI | `platform-roles/space-visibility-per-role` |
| C11 | sidebar widgets | STRONG | UI | the best suite in the group: every UI save read back over GraphQL + member rendering; hard-codes server default lists and error codes (rebaseline item) |
| C12 | classifications | STRONG | UI | write → reload → GraphQL read-back, negatives with positive controls |

### Community and membership
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| D1 | join an open Space | **ABSENT** | lib | the harness joins through the API; no case clicks Join |
| D2 | apply + admin approves/rejects (L0, L1, L1 under public parent) | STRONG | UI both sides | `applications/*`; but no case proves the approved applicant can then open the Space |
| D3 | invite an existing user to a Space | **ABSENT** | – | |
| D4 | invite by email | STRONG (org) / STRONG (Space, 1 case) | UI | `organization-email-invitations/*` (record + exact mail + row; resend + throttle; invitee follows the CTA); `language-offer/us5` for a Space |
| D5 | invite an organization | STRONG | UI | `organization-space-invitations/*` incl. accept/decline with role read-back |
| D6 | assign / remove roles | STRONG | UI | `authz-admin-guard/space-community-role-changes` (re-read after reload) |
| D7 | leave a Space | STRONG (org) / **NOT RUN** (user) | UI | `us2-org-leaves-space` with cascade read-back; the user self-leave lives in unregistered `memberships/*` |
| D8 | removed member loses access | **NOT RUN** | UI | `removed-member-cannot-access-previous-space` is unregistered; no registered case proves a lost or gained access delta |
| D9 | membership policy / trusted orgs | lib only | lib | |
| D10 | VC added to a community | **ABSENT** | – | |

### Collaboration
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| E1 | create callout per type | USABLE | UI | `callouts/0.5` creates 8 types but the only oracle is the title heading — green if the server saved every one as a plain post. Created nowhere: media gallery, Collabora document. Poll/form only via templates |
| E2 | edit / publish / visibility / flow state | WEAK | UI | publish is never confirmed (menu item gone), description match can hit the editor, "Edit settings" edits nothing, flow-state change untested |
| E3 | delete callout | WEAK | UI | `0.6` asserts absence right after `goto` with no positive control |
| E4 | contribute: post, link, task; memo/whiteboard on template callouts | STRONG | UI | `0.1`, `0.4`, `contribution-notify-switch`, `callout-tests` (space admin only; **no member persona ever contributes**) |
| E5 | comments, reactions, mentions | STRONG (comments, reactions) / **ABSENT** (mentions) | UI | `0.3`, `tests/callout-reactions` |
| E6 / E7 | reorder, move contribution | **ABSENT** | – | |
| E8 | whiteboard editing, guest share | **ABSENT** | – | only read-only visibility; drawing content never asserted (canvas); use a GraphQL content read-back |
| E9 | Collabora document | **ABSENT** | – | |
| E10 | memo editing / signing | gate only | lib | `memo-sign-action-gate` checks the Sign action is offered; nothing is signed |
| E11 | subspaces / contributors collection callouts | USABLE | lib | ~70 cases read lib-seeded data or layout; UI create/edit/delete of the contributors callout only in the unregistered `0.1contributors-callout` |
| E12 | calendar events | STRONG | UI | `timeline/whole-day-events-crud` |
| E13 | forms / polls responses + review | STRONG (2 nightly cases) / **NOT RUN** (48 cases) | UI | `poll-form-save-as-template`; `form-callout-framing/*` is the richest server-truth suite in the repo and runs only by hand |

### Messaging, notifications, profile, organization
| ID | Journey | Verdict | Where | Evidence / gap |
|---|---|---|---|---|
| F1 / F2 | direct / group messages | STRONG (delivery) via `chat-avatars`; **NOT RUN** for notifications | UI | `messaging-notifications/*` (22 cases) pin exact mail/push deltas and are in no job; they also wipe the shared inbox |
| F3 | message community leads / org | toast only | UI | |
| F4 | notification settings | partial | UI | one toggle (`osi-US2-AS6`); messaging rows unregistered |
| F5 | notification mail / in-app | STRONG for applications, invitations, associates, reactions | – | exact subject, per-address count, escaped body, CTA |
| F6 | chat identity / avatars | STRONG | UI | locators lean on Tailwind classes (client-refactor risk) |
| G1 / G2 | view / edit profile | WEAK | UI | field inventories; the one edit has no reload or read-back and renames the shared `admin` persona |
| G3–G5, G7, G8 | account, membership, organizations, assistant, settings tabs | **ABSENT** beyond tab labels | – | |
| G6 | MCP API keys | STRONG | UI | mint, revoke, then real `/rest/mcp` 200→401/404 |
| H1 / H2 / H5 | create / edit / verify organization | **ABSENT** as UI writes | lib | |
| H3 | associates: invite, apply, decide, accept, decline, roles | STRONG | UI | `organization-user-associates/*`; successful role edit/removal only via `authz-admin-guard` |
| H4 / H6 | org account, settings | USABLE reads | lib | |

### VC, forum, library, admin, files
| ID | Journey | Verdict | Evidence / gap |
|---|---|---|---|
| I1–I5 | virtual contributors | **ABSENT** (banner/offer reads and one conversion-guard negative) |
| J1 | browse forum | WEAK |
| J2 | create discussion | STRONG, **manual runner only** |
| J3 / J5 | reply, releases | **ABSENT** |
| J4 | recategorise | STRONG (1 case) |
| K1 | innovation library | heading only |
| K2 / K4 | packs, hubs | **ABSENT** |
| K3 | use a library template | STRONG via `classifications-templates` |
| L1, L3 | users admin, spaces admin | STRONG, **manual runner only** |
| L2, L6 | organizations admin, hubs/packs admin | **ABSENT** |
| L4 | platform roles | STRONG (1 role nightly; 15 cases manual runner) |
| L5 | authorization | STRONG where the server is reached; `unverifiable-and-denied` stubs the server and tests client gating only |
| L7 | licences | lib only |
| N1 | avatar / banner upload | STRONG (banner; avatar via chat) |
| N2 / N3 / N4 | file + reference upload, media gallery, attachments | **ABSENT** |

## 2. Assertion quality — the patterns that matter

Per-spec counts and the exact case titles are in `g1`–`g6`. The cross-cutting patterns:

1. **Absence without a positive control.** Callout delete (`0.6`), draft hidden from a member (`0.9` 2.2), "cannot create in the parent" (`0.8`), "no Delete for a member", cookie "banner stays away", `access-space-settings-as-space-member`. These pass before the page renders. The conventions document forbids exactly this (§4), and the newer suites (classifications, sidebar-widgets, contributors) comply; the older `callouts/0.x` and `authentication` files do not.
2. **Heading-only oracles on real writes.** `0.5` creation (8 types), `space-create` 1.4/1.14, `0.2` 7.1, `default-template` saves ("dialog hidden"). The write happened, but nothing proves the server stored what the user chose.
3. **Promise assertions.** `expect(promise).toBeDefined()` in `0.2`, `0.4`, `0.7` — always true.
4. **Shared-persona mutation.** `update-basic-information` renames `admin`; `language-offer/us2` switches `non.space` to Dutch with only an `afterEach` guard; `applications/*` and `osi/*` flip notification settings on shared personas. One failed teardown poisons the next run (this is the documented root cause of several past "server" reds).
5. **Hidden `test.fail`.** 10 whiteboard-framing cases in `callout-tests` report green while stopping before their feed and contribution checks (client-web#10283).
6. **Serial chains.** `callout-tests` (69 cases), `0.1 full workflow`, `forum-discussion-controls`, `0.3` 5.5: one hard failure skips or invalidates everything after it. Under a migration, one early server difference will hide dozens of later verdicts.
7. **Silent wrong persona.** `non-member-whiteboard-access › 3.4 Anonymous` runs authenticated; `non-member-lead-profile-access` configures no lead and opens whatever `/user/` link is first.
8. **Pure-API cases inside Playwright files.** 23 cases in group 5 (`oua-US7` entirely) plus `profile-removed-notification` case 1 have no `page`. They are server-api tests in disguise and will break with the schema while protecting no UI.
9. **Server constants hard-coded as oracles.** Sidebar default lists and error codes, the "Former member" sentinel, the default tagline, the `RoleName` introspection check, tutorial callout names, the 401 `invalid_credentials` body, MailSlurper subjects. These are correct today and are the list of things to rebaseline deliberately against the rewritten server, not to "fix" when they go red.

## 3. Harness dependency inventory (the lib migration checklist)

### 3a. What the specs import from `@alkemio/tests-lib`
`assignRoleToUser` · `assignRoleToVirtualContributor` · `createCalloutOnCalloutsSet` · `createPngFixture` · `delay` · `deleteSpace` · `ensureHarnessAdminRoles` · `getGraphqlClient` · `getMailsData` · `getUserToken` · `getVerificationLinkFor` · `graphqlErrorWrapper` · `graphqlRequestAuth` · `harnessPostgresConfigured` · `platformRoleEmail` · `postGraphqlRaw` · `queryHarnessDb` · `registerInKratosOrFail` · `registerTestUser` · `seedPlatformRoleUsers` · `updateCalloutVisibility` · `verifyInKratosOrFail` · `OrganizationWithSpaceModel` · `TestScenarioConfig` · `TestScenarioFactory` (`createBaseScenario`, `createBaseScenarioEmpty`, `createBaseScenarioOrganization`, `cleanUpBaseScenario`) · `TestUser` · `TestUserManager` · `UniqueIDGenerator` · generated enums `CalendarEventType`, `CalloutVisibility`, `NotificationEvent`, `PlatformRoleName`, `RoleName`, `SidebarWidget`, `SpacePrivacyMode` (+ `CommunityMembershipPolicy`, `SpacePrivacyMode` from `@alkemio/client-lib`).

Also reached through area helpers (listed per group in `g1`–`g6`): `createOrganization`, `deleteOrganization`, `assignRoleToOrganization`, `removeRoleFromUser`, `updateSpaceSettings`, `applyOrganizationVerificationSequence`, `createInnovationPack`, `deleteInnovationPack`, `registerInAlkemioOrFail`, `provisionTestIdentities`, `registerAllTestUsers`, `getRecoveryLinkFor`, `deleteMailSlurperMails`, `getQueueStats`, `waitForQueuePublishIncrease`, `rabbitMqManagementConfigured`, `findBffSessionIdBySub`, `ageBffSessionCreatedAt`, `decodeJwtPayloadUnsafe`, `digestWindow`.

### 3b. Generated-SDK operations the lib and the specs call (`getGraphqlClient().<op>`)
Lib internals (45): `AssignLicensePlanToAccount` `assignPlatformRoleToUser` `AssignRoleToOrganization` `assignRoleToUser` `assignRoleToVirtualContributor` `CalloutDetails` `CreateCalloutOnCalloutsSet` `CreateDiscussion` `createInnovationPack` `CreateOrganization` `CreateSpaceBasicData` `CreateSubspace` `CreateTemplate` `CreateUser` `CreateVirtualContributorOnAccount` `DeleteDiscussion` `deleteInnovationPack` `deleteOrganization` `deleteSpace` `deleteUser` `DeleteVirtualContributorOnAccount` `eventOnOrganizationVerification` `GetCalloutFramingMemo` `GetCalloutsOnCalloutsSetUsingClassification` `getMyUserInfo` `getOrganizationData` `getOrganizationIdByNameId` `GetPlatformForumData` `GetPlatformLicensePlans` `GetSpaceData` `getSpaceIdByNameId` `GetSpaceLicenseEntitlements` `GetUserByNameId` `getUserData` `getUsersData` `PendingMembershipsSpace` `PrepareMemoSigning` `removeRoleFromUser` `UpdateCalloutVisibility` `UpdateSpaceSettings` `updateUser` `updateUserSettings` `UpdateVirtualContributor` (+ `rawRequest`).

Called directly from client-web specs/helpers: `AddReactionToCallout` `applyForEntryRole` `AssignLicensePlanToSpace` `calloutFormResponses` `calloutsSetFramingDefinitions` `createFormCalloutOnCalloutsSet` `createPollCalloutOnCalloutsSet` `CreateCalendarEventOnCalendar` `DeletePlatformInvitation` `GetInnovationFlowStatesWithIds` `GetRoleSetUsersInRoles` `getSpaceInvitations` `GetSpaceCalendarId` `InvitationStateEvent` `InviteForEntryRoleOnRoleSet` `LookupPlatformInvitation` `LookupPlatformInvitationCreatedBy` `MeQuery` `PlatformRolesAssignRoleToUser` `PlatformRolesRemoveRoleFromUser` `platformRoleSetUsersInRole` `RemoveRoleFromOrganization` `ResendPlatformInvitation` `RevokeLicensePlanFromSpace` `RoleSetApplicationsInvitations` `RoleSetMembersList` `RoleSetPendingPlatformInvitations` `SendMessageToRoom` `SubscribeToPushNotifications` `UnsubscribeFromPushNotifications` `UpdateInnovationFlowState` `UpdateOrganizationSettings` `updateUserServiceProfile`.

The generated SDK has 320 operations; regenerating it against the new schema is mechanical, but every operation above has a caller whose variable shape and result selection must be re-checked by hand.

### 3c. Server couplings OUTSIDE the lib — adapting the lib does not carry these
**42 files carry their own GraphQL documents** (`rawGql`, `adminGql`, `gql`, `postGraphqlRaw`, `graphqlRequestAuth`, same-origin `fetch` inside `page.evaluate`). By area: account-deletion (3), authentication (1), classifications (3), contributors-callout (5), form-callout-framing (5), helpers/mcp-api-keys (1), language-offer (2), messaging-notifications (2), organization-email-invitations (3), organization-space-invitations (3), organization-user-associates (6), platform-roles (2), session-revocation (1), sidebar-widgets (1), subspaces-callout (4). Representative documents: `me{user{id …}}`, `me{notifications}`, `updateUserSettings`, `deleteUser`, `createContributionOnCallout`, `assignPlatformRoleToUser` / `removePlatformRoleFromUser`, `platform{roleSet{myRoles}}`, `lookup{roleSet{platformInvitations{suggestedLanguage}}}`, `lookup.space.level` / `.visibility`, `lookup.calloutFormResponses`, `platform.forum.discussions`, `createDiscussion` / `deleteDiscussion`, `updateCommunityGuidelines`, `updateOrganization`, `__type(name:"RoleName")`, `platform{configuration{language}}`, `platform{metadata{services}}`.

**REST routes the new server must keep (or the harness stops before the first test):**
- `POST /api/auth/non-interactive-login` — `getUserToken`; every seed, teardown and `rawGql` uses it; the recovery spec pins its exact 401 body.
- `GET /api/auth/oidc/id-token-hint` → 200 is the client's "signed in" signal; every persona fixture waits on it.
- `/api/private/graphql`, `/api/private/non-interactive/graphql`, `/api/public/graphql`, `/graphql` — used directly by name.
- `/rest/mcp` JSON-RPC (G6 oracle).
- Kratos admin `/identities` (`KRATOS_ADMIN_URL`): form walks, identity provisioning for API-created users (Slice B: nobody can be assigned MEMBER on an L0; they must JOIN).

**Out-of-band oracles:** direct Postgres (`queryHarnessDb`) on `user`, `actor`, `profile`, `account`, `platform_audit_entry`, `callout.settings` (account-deletion us1/us2, form us4-AS8, subspaces us2-AS6); Redis BFF session rewrite (account-deletion us3); MailSlurper REST (first page only — `getMailsData()` sends no page parameter, so per-address deltas can under-count once the shared inbox grows); RabbitMQ management API (push/notify counters, skipped nightly).

## 4. Gap backlog, ordered by migration risk

**Tier 0 — register what already exists (days, not weeks).** Each is a STRONG spec in no job.
1. `memberships/*` (21 files): D7/D8 user self-leave + lost access, private-L2 preview gate, dashboard memberships. Fix first: literal subspace names → `UniqueIDGenerator`; the `isVisible().catch` negative after leave; four `test.skip` with no issue link.
2. `session-revocation/*` (11 cases): rewrite the oracles from `error_code` / cookie format / `me-` id to GraphQL + UI outcomes, then register. A7 is otherwise invisible.
3. `account-deletion/us1,us2` (11 cases): the only UI self-deletion. Replace the SQL/Redis oracles with GraphQL (`me`, `lookup`, audit via API if exposed) so they can run on the cluster.
4. `messaging-notifications/*` (22 cases): the only F1/F2 notification coverage. Remove the inbox wipe (`deleteMailSlurperMails`), use recipient-scoped readers, register `long`.
5. `platform-roles/*` (62 cases): the "needs the 027 stack" gate is stale — server `cf12b07b2` removed the legacy-role bridge after Slice B and client `b1095a408` is Slice B. Needs `KRATOS_ADMIN_URL` (or registration) on the nightly, then it can join as a project. Brings L1, L3, L4, L7, C5, C10, J2.
6. `form-callout-framing/*` (48 cases): the richest E13 coverage. Its `beforeAll` is inline GraphQL + Kratos admin + Postgres and leaks users/spaces/VCs; port the fixtures onto the lib and add teardown before registering.
7. `contributors-callout/0.1` (10 cases): move cleanup to file level (documented reason for exclusion) and register — the only UI create/edit/delete of the contributors framing.
8. `ts7-platform-smoke` (4 cases): health + public metadata + sign-in. Make it the **first** project of the nightly as a migration canary.

**Tier 0 status, 2026-10-14 (uncommitted in this checkout).** Items 5, 7 and 8 plus `memberships/*` are now in `config/playwright.config.nightly.ts` and were run against the test cluster: Platform smoke 3/3, Platform roles 63 passed + 1 expected failure (`resource-transfers` innovation-pack picker, `.fail(true)` without an issue link) + 1 skipped, Memberships 17 passed + 4 pre-existing skips, Contributors callout 0.1 10/10 after two test-side fixes (the framing chip moved behind "More to add" in client-web#10373; the VC card carries two profile links). Env findings: the ingress does not route `/health/ready` (the smoke readiness case is `@local-stack` now) and the cluster image reports an empty `metadata.services[].version` because it runs `node dist/main.js`, not npm. No env change was needed for any of the four; platform-roles falls back to self-service registration when `KRATOS_ADMIN_URL` is unset. Memberships' literal subspace names and `isVisible().catch` negative stay as listed in item 1.

**Tier 1 — make existing nightly writes falsifiable (hours each).**
9. `callouts/0.5`: after each create, open the callout and assert the framing/response type (whiteboard canvas present, link form present, …) or read `lookup.callout.framing.type` over GraphQL.
10. `callouts/0.6`: positive control (card visible before delete, exact count −1 after), then absence.
11. `callouts/0.7` / `0.9` / `0.1`: assert publish by the member seeing the callout (0.1 does; 0.7 does not) and by `visibility: PUBLISHED` read-back; drop the three `toBeDefined()` promises.
12. `space/*` 1.4 / 1.14: exact name, Hosted Spaces row in account settings, `lookup.space` read-back; delete → `/about` gone / 404.
13. `applications/*`: scope the applicant bell assertions to the Space name; add "approved applicant opens the Space" (D1/D8 positive).
14. `authentication-registration`: read back the Alkemio user + profile; delete the identity in `afterAll`. `authentication-restricted-access`: let an admin in.
15. `user-profile/update-basic-information`: disposable identity, reload, read-back. Stop renaming `admin`.
16. `templates-CRD`: un-comment delete (or skip with the issue link); replace the 10 `test.fail` whiteboard stops with `test.skip(…#10283)` so the report shows the hole; make cases 2/4/6/8 assert the comments setting; add one member-persona contribution.
17. `default-template-per-flow-state`: assert the default on the member's Create Post dialog (the skipped 4.1 is the only S case).

**Tier 2 — journeys with no UI coverage, ranked by how many users hit them daily.**
18. **D1 join open Space → open it** (one click, the highest-traffic write on the platform).
19. **D3 invite existing user → accept in the UI → open the Space** (today only org and email variants).
20. **C4 create subspace (L1, L2) through the UI** + C3 **change privacy / membership policy through the UI** and prove the effect with a second persona.
21. **E8 whiteboard**: draw, save, reopen; oracle = GraphQL `whiteboard.content` changed + a second session sees it. **E10 memo**: edit + sign. **E9 Collabora**: open, type, read back.
22. **E2 flow-state change + callout reorder (E6) + move contribution (E7)**.
23. **C2 edit Space about/tagline/tags**; **G2 edit profile with read-back**; **H1/H2 create + edit organization through Admin and org settings**.
24. **B4/M1 search** (sidebar flow-state search, global search): zero automation, manual only.
25. **I1–I4 VC**: create on account, add to a Space, ask it a question in a callout thread, get an answer (server + VC engine round trip).
26. **F3 message leads / org** with mail oracle; **F4** notification settings persist across reload (messaging rows cover this once registered).
27. **N2/N3/N4**: upload a file/reference, media-gallery visual, message attachment; oracle = storage read-back.
28. **J2/J3 forum create + reply nightly** (today J2 only in the manual runner), **K2 packs**, **L2 admin organizations**, **E5 mentions**.

## 5. Things to decide before the migration starts

- **Keep `non-interactive-login` and `id-token-hint` in the new server, or budget a harness rewrite first.** Everything else in this document assumes they stay.
- **One GraphQL client in the suite.** Either fold the 42 files' inline documents into the lib (as `.graphql` + generated SDK, the server-api pattern), or accept that the migration touches 42 test files plus the lib. The first is the only way "update only the lib" becomes true.
- **Rebaseline list** (§2 item 9): decide per item whether the rewritten server must match the old constant or the test must change.
- **Parallelism.** 2 h serial today; Tier 0 roughly doubles the case count. The conventions already define the criteria for `PW_WORKERS > 1` (self-seeding, no shared-persona mutation, recipient-scoped mail). Tier 1 items 15 and the applications/osi persona fixes are the blockers.
- **Server-api suite salvage.** Not in scope here, but the 23 pure-API cases hiding in Playwright files (`oua-US7`, `profile-removed-notification` 1, parts of `oua-US1`, `oei`, `osi`) belong in whatever replaces server-api, not in the UI net.
