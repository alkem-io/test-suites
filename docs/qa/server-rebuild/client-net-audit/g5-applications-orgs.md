# G5 applications, invitations, organization membership

Repo: `~/repos/qa/test-suites` @ `b451c329` (develop). Every spec below is registered in `client-web/config/playwright.config.nightly.ts` (applications by file; the four org folders by `/<folder>/*.spec.ts`). The nightly run applies `grepInvert: /@local-stack/`, so `@local-stack` cases never run nightly; they run only under `playwright.config.local-stack.ts`.

## Files reviewed
Specs (17):
- `client-web/src/functional-e2e/applications/space-applications-level-0.spec.ts`
- `client-web/src/functional-e2e/applications/space-applications-level-1.spec.ts`
- `client-web/src/functional-e2e/applications/space-applications-level-1-public-parent.spec.ts`
- `client-web/src/functional-e2e/organization-space-invitations/us1-invite-organization.spec.ts`
- `client-web/src/functional-e2e/organization-space-invitations/us2-org-admins-notified.spec.ts`
- `client-web/src/functional-e2e/organization-space-invitations/us3-org-accepts-declines.spec.ts`
- `client-web/src/functional-e2e/organization-space-membership/us1-membership-tab.spec.ts`
- `client-web/src/functional-e2e/organization-space-membership/us2-org-leaves-space.spec.ts`
- `client-web/src/functional-e2e/organization-user-associates/us1-invite-associates.spec.ts`
- `client-web/src/functional-e2e/organization-user-associates/us2-invitee-responds.spec.ts`
- `client-web/src/functional-e2e/organization-user-associates/us3-apply-and-decide.spec.ts`
- `client-web/src/functional-e2e/organization-user-associates/us5-associates-editor.spec.ts`
- `client-web/src/functional-e2e/organization-user-associates/us7-pending-lists-integrity.spec.ts`
- `client-web/src/functional-e2e/organization-email-invitations/us1-invite-by-email.spec.ts`
- `client-web/src/functional-e2e/organization-email-invitations/us2-invitee-signup.spec.ts`
- `client-web/src/functional-e2e/organization-email-invitations/us3-resend.spec.ts`
- `client-web/src/functional-e2e/organization-email-invitations/us3-as1-two-rows.spec.ts`

Helpers, fixtures, plans and config read as well:
- `organization-space-invitations/organization-space-invitations.helpers.ts`
- `organization-space-membership/organization-space-membership.helpers.ts`
- `organization-user-associates/organization-user-associates.helpers.ts`
- `organization-email-invitations/organization-email-invitations.helpers.ts`
- `helpers/notification-settings.helper.ts`, `helpers/login.helper.ts`, `fixtures/authenticated-session.fixture.ts` (`createPersonaTest`, `ensurePersonaState`, `createAuthenticatedSessionFixture`)
- the five `*-test-plan.md`
- `config/global-setup.ts`, `config/playwright.config.local-stack.ts`, `config/playwright.shared.ts`
- `lib/src/utils/mailslurper.rest.requests.ts`

## Per-spec table
S/U/V counts are approximate per-file totals, taken from the `expect`/`expect.poll` calls. Shared `beforeEach` asserts are counted once.

| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| applications/space-applications-level-0 | yes | 8 (0) | D2, B5, C3 | mixed: apply, approve, reject and delete in UI; space/policy via lib | ~30/~38/5 | STRONG | The UI apply makes the applicant's row appear on the admin's table with a status, and the UI decision moves it to the approved/rejected filter. Applicant-side notification checks are vacuous. |
| applications/space-applications-level-1 | yes | 8 (0) | D2 (L1), B5 | mixed, same as L0 | ~30/~38/5 | STRONG | Same as L0 at L1. 2.5 clicks an unscoped `.first()` notification. |
| applications/space-applications-level-1-public-parent | yes | 5 (0) | D2 (L1, non-parent-member), B5 | mixed, same as L0 | ~18/~20/2 | STRONG | Same pattern; case 1.3 does assert the applicant row. |
| organization-space-invitations/us1-invite-organization | yes | 10 (0) | D5, D6 (gating) | mixed: org invites and revoke in UI; fixtures (orgs, Lead/Member grants, opt-out, pre-invite) via lib/SDK | ~25/~14/3 | STRONG | Server outcome strings (sent / Lead limit / not accepting) are read from the UI result row, and the revoke is confirmed through the API. 1 of the 10 cases is pure API. |
| organization-space-invitations/us2-org-admins-notified | yes | 7 (0) | D5, F5, F4 | UI-write (every invite via dialog); org admins and settings via lib/raw GQL | ~30/~6/2 | STRONG | Mail checks pin exact recipient, org name, Space name, escaped message and CTA URL. In-app checks use raw GQL. Push is checked only if RabbitMQ management is configured. |
| organization-space-invitations/us3-org-accepts-declines | yes | 8 (0) | D5, H3 (org-admin invitations tab), A5 | mixed: invites seeded via raw GQL; accept, decline and revoke in UI; platform-admin accept via API | ~28/~6/2 | STRONG | Accept/decline in the Invitations tab, then roles are read back via `organizationsInRole` (Member, Lead, L0/L1/L2 cascade, Lead downgrade). |
| organization-space-membership/us1-membership-tab | yes | 10 (1 `test.skip`) | G5/H4 (org Membership tab), A5 | lib-write: memberships via invite+accept SDK | ~18/~16/0 | USABLE | Server-resolved cards (names, Space/Subspace, Member/Lead) are asserted, but every membership is seeded. Search, filter and skeleton checks are client-side. |
| organization-space-membership/us2-org-leaves-space | yes | 7 (0) | D7 (org leaves), D6 | UI-write (Leave) + API read-back | ~30/~10/0 | STRONG | Each leave is confirmed with `orgIsMemberOf` / `orgIsLeadOf`: cascade to subspaces, Lead removed, stale-row error, single in-flight request. |
| organization-user-associates/us1-invite-associates | yes | 13 (0) | H3 | mixed: UI invite (AS2) and UI revoke (AS7); 7 of 13 cases pure API | ~30/~14/1 | USABLE | The UI half is strong (pending rows with offered role, revoke removes the row). The API half (AS3, AS4×3, AS6, AS7-invitee, AS8-API) is not a UI net. |
| organization-user-associates/us2-invitee-responds | yes | 4 (0) | H3, B1 (pending list) | mixed: invitations via lib; accept/decline in UI | ~25/~6/0 | STRONG | The invitee accepts or declines in the UI. The result is confirmed by eligibility `ALREADY_ASSOCIATE`, `usersInRoles(Admin)`, the badges and the withheld-Owner notice. |
| organization-user-associates/us3-apply-and-decide | yes | 11 (1 `@local-stack`) | H3, F5, A5 | UI-write: apply, approve and reject in UI; fixtures via lib | ~30/~8/1 | STRONG | Apply in the UI → mail to each admin (exact subject, note in body) → approve/reject in the UI → eligibility read-back → in-app/mail to the applicant. |
| organization-user-associates/us5-associates-editor | yes | 7 (0) | H3, H6 | UI-write, refusal paths only; caps filled via lib | ~12/~14/0 | USABLE | The three cap/minimum refusals are UI-driven and API-checked. There is no successful role edit or removal, and 4 of 7 cases check the tab strip, redirect or switch layout. |
| organization-user-associates/us7-pending-lists-integrity | yes | 6 (1 `@local-stack`) | NEW-pending-list-authz (GraphQL) | lib/API only, no `page` | ~45/0/0 (API) | NOT-A-NET | Pure GraphQL acceptance walk inside a Playwright file. It breaks with the schema and protects no UI. |
| organization-email-invitations/us1-invite-by-email | yes | 8 (0) | D4 (org variant), H3 | mixed: UI invite, re-invite, revoke and mixed batch; 3 of 8 cases API-only | ~40/~12/1 | STRONG | A UI paste-email invite is checked three ways: platform-invitation record (role, message, language), exactly 1 mail with exact subject, row in the table. Dedupe and revoke are verified the same way. |
| organization-email-invitations/us2-invitee-signup | yes | 6 (1 runtime skip: Dutch) | D4, A1 (partial), A9, H3 | mixed: invites via lib; identity via Kratos API (no UI sign-up); sign-in and accept in UI | ~35/~4/1 | STRONG | Real mail is parsed and its CTA followed to `/sign_up?returnUrl`. The UI accept is verified via `usersInRoles`. The sign-up form itself is not driven. |
| organization-email-invitations/us3-resend | yes | 7 (1 `@local-stack`) | D4 (resend), H3 | mixed: Resend in UI (org and Space tables); AS4–AS6 API | ~30/~6/1 | STRONG | Each UI resend yields exactly +1 mail to that address (quiet-period delta), the record is unchanged, and the throttle sends nothing. |
| organization-email-invitations/us3-as1-two-rows | yes | 1 (0) | D4 (resend) | UI-write (resend ×3) | ~8/~3/0 | STRONG | Two back-to-back resends each give +1 mail, and the third is refused with an error toast and no mail. |

Totals: **17 specs, 126 cases**; 2 are skipped every run (1 `test.skip`, 1 runtime-conditional), and 3 more are `@local-stack`, excluded from nightly. **23 cases have no `page`** (pure API/mail): oua-us1 7, oua-us3 1, oua-us7 6, oei-us1 3, oei-us2 2, oei-us3 3, osi-us1 1.

## Per-spec notes

### applications/space-applications-level-0.spec.ts
- Journeys: D2 (L0 apply, admin approve/reject/delete), B5 (bell), C3 (membership policy via seed).
- Writes through UI: Apply plus questionnaire submit (1.1 and every `beforeEach` of 2.x); Reject+confirm (2.1, 2.4); Delete+confirm (2.2); Approve (2.3, 2.5). Seeded via lib: Space (private, `CommunityMembershipPolicy.Applications`), community roles, notification channels.
- Lib helpers: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `TestUser`, `OrganizationWithSpaceModel`, `CommunityMembershipPolicy`, `SpacePrivacyMode` (client-lib). Indirectly via `enableApplicationNotifications`: `TestUserManager.populateUserModelMap`, `TestUserManager.getUserModelByType`, `testConfiguration`, plus a raw `graphql-request` query/`updateUserSettings` mutation (not in the lib).
- Personas: shared harness only. `TestUser.NON_SPACE_MEMBER` (row filter `'non space'`), `SPACE_ADMIN`, `SPACE_MEMBER`. Login via `loginViaCrd` (UI form).
- Weakest cases:
  - `1.2 View Pending Applications as Space Admin` asserts only the static "Pending Memberships" heading. No row is checked, although 1.1 just applied.
  - `1.1 Submit Application…` asserts only that the success dialog opens and closes.
  - `1.0 Apply button is shown…` is S only through the server-resolved standing/policy.
- Strongest cases: `2.3 View and Approve…` and `2.4 View and Reject…`.
  - The applicant row ("non space", "Application received") appears on the admin's table after the UI apply.
  - The questionnaire answer is persisted and shown to the admin.
  - After the decision the row appears under the "Application approved"/"Application rejected" status filter.
- Skips/soft/tolerance:
  - `beforeEach` takes an optional branch: it skips applying when "Application pending" is already shown, so it would also pass on a stale application.
  - No `.catch`. Confirm buttons are matched by a loose regex `/confirm|reject|yes/i`.
- Defects/risks:
  - Applicant bell checks (`toContainText(/declined/i)`, `/Welcome to the community/i`) read the whole dialog of a shared persona with history from earlier cases and earlier nights. They are not scoped to this Space, so they are V.
  - 2.2 ("Archive") expects a "declined" notification for a delete.
  - Approval never proves the applicant can now open the Space (D2 → D1/D8 outcome missing).
  - `test.setTimeout(60_000)` sits inside hooks.

### applications/space-applications-level-1.spec.ts
- Journeys: D2 at L1, B5. The seed makes `NON_SPACE_MEMBER` a member of the L0 parent, so "non space" is a parent member here.
- Writes through UI: Apply from the subspace About dialog; reject, delete and approve as in L0. Seeded via lib: L0 and L1 with the Applications policy.
- Lib helpers: same as L0.
- Personas: `NON_SPACE_MEMBER`, `SUBSPACE_ADMIN`, `SPACE_ADMIN`, `SPACE_MEMBER`, `SUBSPACE_MEMBER` (all shared).
- Weakest cases: `1.3 View Pending Applications as Subspace Admin` (static heading only); `1.2 Submit Application…` (success dialog only).
- Strongest cases: `1.1 View Private Level 1 Subspace Card…` (server-resolved card with the "Private" tag and an Apply button for the non-member); `2.3`/`2.4` (status-filter read-back).
- Skips/tolerance: the same optional "Application pending" branch in `beforeEach`.
- Defects/risks:
  - `2.5 Approve Application Directly from Data Grid` clicks `.filter({hasText:/applied to join/i}).first()`, which is not scoped to this subspace. With stale notifications it may navigate to a deleted Space and time out (flaky red, not a false green).
  - Bell checks are V, as in L0.

### applications/space-applications-level-1-public-parent.spec.ts
- Journeys: D2 at L1 by a non-parent-member (public L0, private L1), B5.
- Writes through UI: apply, approve, reject. Seeded via lib: scenario with `allowSubspaceAdminsToInviteMembers`.
- Lib helpers: same as L0.
- Personas: `NON_SPACE_MEMBER`, `SUBSPACE_ADMIN` (shared).
- Weakest cases: `1.1 Non-parent-member can see L1 subspace card…` is S-read of a seeded Space only.
- Strongest cases: `1.3 View Pending Application as Subspace Admin` (it does assert the row plus "Application received"); `2.1 Approve…` (row under the approved filter).
- Skips/tolerance: optional pending branch.
- Risks: no `test.setTimeout` in `beforeAll`/`beforeEach`, unlike its siblings, which raised it because creation exceeded 30 s. Bell checks are V.

### organization-space-invitations/us1-invite-organization.spec.ts
- Journeys: D5 (invite organization, revoke, search exclusion), D6 (gating of Add vs Invite Organisation), D9.
- Writes through UI: Invite Organisation dialog sends (AS2, AS3 Lead overflow, AS4 opted-out, AS6) and revoke+confirm (AS6). Seeded via lib/SDK:
  - 10 orgs (`createTestOrganization`)
  - Lead/Member grants (`assignOrgRole` → lib `assignRoleToOrganization`)
  - opt-out (`setAllowSpaceInvitations`)
  - pre-invite (`inviteOrganizationViaApi`)
  - org admin (`assignOrganizationAdmin`)
  - host org cleared (`clearHostOrgFromSpace`)
- Lib helpers: `TestScenarioFactory.createBaseScenario/cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `RoleName`, `RoleSetInvitationResultType`, `createOrganization`, `deleteOrganization`, `getGraphqlClient`, `assignRoleToOrganization`, `graphqlErrorWrapper`, `graphqlRequestAuth`, `TestUser`, `TestUserManager`, `UniqueIDGenerator`. SDK ops: `RemoveRoleFromOrganization`, `UpdateOrganizationSettings`, `InviteForEntryRoleOnRoleSet`, `assignRoleToUser`, `MeQuery`, `getSpaceInvitations`. Plus a raw `OrgRoleSetAdmins` query.
- Personas: `space.admin@alkem.io`, `admin@alkem.io` (shared, `createPersonaTest`); `TestUser.QA_USER` repurposed as orgAS6 admin (shared).
- Weakest cases:
  - both `US1-AS1 …` cases: an optional branch (`if isVisible → toBeDisabled else toHaveCount(0)`), UI-only gating.
  - `US1-AS9 … filters the list by name`: a client-side filter over lib-seeded members.
- Strongest cases:
  - `US1-AS2: inviting as Member…`: the result row reads "Invitation sent", a pending row shows "Role: Member", and the org is not in the user pending table.
  - `US1-AS3`: server Lead-limit message.
  - `US1-AS4`: server opted-out message.
  - `US1-AS6`: the invitation is visible to the org admin via `me.communityInvitations` before the revoke and gone after it.
- Skips/tolerance: `removeOrgRole` uses `.catch(() => undefined)` (teardown only).
- Risks:
  - The "creates nothing" checks in AS3/AS4 (`li` count 0) run immediately after the dialog closes and can pass before any refetch, so they are weak negatives.
  - `US1-AS5 (server safety net)` is pure API.
  - Serial file with one shared Space.

### organization-space-invitations/us2-org-admins-notified.spec.ts
- Journeys: D5, F5 (email, in-app and push for org-invited), F4 (settings row toggled in UI, AS6).
- Writes through UI: every invite (dialog with message); the AS6 email-toggle off/on in `/user/me/settings/notifications`. Seeded via lib/raw GQL: org admins (`assignOrganizationAdmin`), admin removal, notification settings (`updateUserSettings` raw), associate role, push subscription (`subscribeToPushForUser`).
- Lib helpers: `delay`, `deleteMailSlurperMails`, `getMailsData`, `getQueueStats`, `rabbitMqManagementConfigured`, `waitForQueuePublishIncrease`, `testConfiguration`, `TestScenarioFactory.*`, `UniqueIDGenerator`, `NotificationEvent`, `RoleName`, `ensurePersonaState`. Helpers file: SDK `SubscribeToPushNotifications` and `UnsubscribeFromPushNotifications`. Local `rawGql` (graphql-request) runs `me.notifications(filter:{types:[ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION]})`, `usersInRole`, `removeRoleFromUser`, `updateUserSettings`.
- Personas: all shared harness personas, repurposed as org admins:
  - `ORGANIZATION_ADMIN` (A)
  - `NON_SPACE_MEMBER` (B)
  - `SUBSPACE_MEMBER` (muted)
  - `SUBSPACE_ADMIN` (settings)
  - `SUBSUBSPACE_MEMBER` (associate)
  - `space.admin@` as inviter
  - `organization.admin@` (bell click)
- Mail: `waitForMailTo(recipientSubstring, orgDisplayName)` with a 20 s poll; `assertNoMailTo` gives a 20 s negative window.
  - AS1 pins: subject contains the Space name; body contains org name and Space name; HTML-escaped message (`&lt;b&gt;`), no raw `<b>`; CTA `/organization/<nameID>/settings/invitations`; message not in subject.
  - Inviter and role are NOT asserted, despite the title.
  - AS4 pins `support@alkem.io` with "Hello,", org and Space.
- Weakest cases:
  - `US2-AS5 … muted admin`: the in-app negative is read immediately after the invite (race, near-vacuous), and the muted admin's own mailbox is never checked. Only support is checked.
  - `US2-AS3`: the in-app check is `.some(...)`, fine but thin.
- Strongest cases: `US2-AS1/AS2` (mail facts, in-app payload space nameID, push publish delta); `US2-AS2` click-through (bell item → `/organization/<nameID>/settings/invitations`); `US2-AS6` (UI-persisted setting suppresses the mail but keeps in-app).
- Skips/tolerance:
  - The push assertion is skipped silently when `rabbitMqManagementConfigured()` is false (likely nightly).
  - afterAll restore wraps the settings write in try/catch with `console.error`.
- Risks:
  - `deleteMailSlurperMails()` (prune-all) in `beforeAll` wipes the SHARED inbox, contradicting the "no walk prunes" convention the 081 walks rely on. It is harmless only because nightly is `workers: 1`.
  - Mutates notification settings of shared personas.

### organization-space-invitations/us3-org-accepts-declines.spec.ts
- Journeys: D5 (org side: view, accept, decline), H3/H6 (org Invitations tab, opt-out toggle read), A5 (associate redirected).
- Writes through UI: Accept+confirm (AS2, AS4, AS7), Decline+confirm (AS3), revoke from the Space settings (AS8). Seeded via lib/raw: every invitation (`inviteOrganizationViaApi`, local `inviteWithExtraRole`), opt-out, 9 Lead fillers, associate role. The AS8 platform-admin accept goes through raw `eventOnInvitation` (API).
- Lib helpers: `getUserToken`, `TestScenarioFactory.*`, `RoleName`, plus the helpers-file set above. A local `rawGql` uses `fetch` to `ALKEMIO_SERVER` (default `http://localhost:3000/api/private/non-interactive/graphql`) for `me`, `assignRoleToUser`, `inviteForEntryRoleOnRoleSet`, `organizationsInRoles`, `invitations`, `eventOnInvitation`.
- Personas: `orgadmin-us3@alkem.io` and `orgassoc-us3@alkem.io` have fixed names, are registered in `config/global-setup.ts` and are never deleted; `admin@alkem.io` is shared. The file-header comment still says the personas are "per-run suffix" (stale).
- Weakest cases:
  - `US3-AS6 … opting out never hides`: the toggle state asserted is the lib seed (V); Accept/Decline enabled is U; only the row presence is S.
  - `US3-AS1`: the empty state passes for any server returning nothing.
- Strongest cases:
  - `US3-AS2` (accept, then Member AND Lead read back)
  - `US3-AS4` (accept on L2, then member of L0, L1 and L2)
  - `US3-AS7` (Lead slots full, so accept downgrades to Member only)
  - `US3-AS3` (decline, then not a member)
- Skips/tolerance: none.
- Risks:
  - `rawGql` endpoint defaults to localhost when `ALKEMIO_SERVER` is unset (env assumption).
  - The AS8 accept half is API-only.

### organization-space-membership/us1-membership-tab.spec.ts
- Journeys: H4/G5 (org → Settings → Membership tab), A5 (associate redirect).
- Writes through UI: none. Seeded via lib: org Member of S and S1 (`ensureOrgMemberOf` → `inviteAndAccept` SDK), persona user-member (`makePersonaUserMember`), Lead via invite+accept (AS5), empty org (`createOrganization`), associate role (`changeUserRole`).
- Lib helpers: `createOrganization`, `deleteOrganization`, `TestScenarioFactory.*`, `TestUser`, `TestUserManager.users.{organizationAdmin,qaUser}`, `UniqueIDGenerator`, `RoleName`, `getGraphqlClient`, `graphqlErrorWrapper`. SDK: `RoleSetMembersList`, `RemoveRoleFromOrganization`, `InviteForEntryRoleOnRoleSet`, `InvitationStateEvent`, `assignRoleToUser`, `removeRoleFromUser`.
- Personas: `organizationAdmin` (shared, via `createAuthenticatedSessionFixture` shared page); `qa.user@alkem.io` as associate.
- Weakest cases:
  - `US1-AS2 search…` and `US1-AS3 nothing matches…`: client-side filtering of seeded cards.
  - `US1-AS8 breadcrumb…`: U.
  - `US1-AS9 skeleton…`: U, uses route interception.
- Strongest cases: `US1-AS1` (server-listed memberships with type and role badges, count 2/2); `US1-AS5 Lead role shows the Lead badge`; `US1-AS7 a plain associate is redirected`; `US1-AS4` (empty org shows the empty caption).
- Skips/tolerance:
  - `test.skip('US1-AS8 the browser title…' — client-web#10415)`.
  - afterAll `changeUserRole(...).catch(() => undefined)`.
  - `gotoMembershipTab` wraps navigation in `toPass` (45 s) retries.
- Risks: serial shared page; AS5 grows the card count, which later cases rely on (they use count 2 after AS5's finally removes the roles).

### organization-space-membership/us2-org-leaves-space.spec.ts
- Journeys: D7 (organization leaves Space/Subspace), D6 (Lead removed).
- Writes through UI: Leave via card menu plus confirm (AS3–AS7), Cancel (AS2). Seeded via lib: memberships via invite+accept; AS6 removes the role behind the UI's back.
- Lib helpers: same as US1 plus `orgIsMemberOf`/`orgIsLeadOf` (SDK `RoleSetMembersList`).
- Personas: `organizationAdmin` (shared).
- Weakest cases: `US2-AS1 … opens a destructive confirmation` (dialog title is U; it uses a request listener to prove no mutation was fired).
- Strongest cases:
  - `US2-AS3` (leaves only S1, S kept)
  - `US2-AS4` (leaving S cascades to S1 and S2, API-verified)
  - `US2-AS5` (Lead removed too)
  - `US2-AS6` (stale row gives an error toast, never success)
  - `US2-AS7` (exactly 1 remove request while in flight, then membership gone)
- Skips/tolerance: none.
- Risks:
  - The serial chain depends on the previous case's state (AS4 reseeds; AS5 expects only L to remain).
  - The 3 s toast SLA (`SUCCESS_TOAST_MS`) is a timing assertion that may flake on slow envs.
  - AS7 uses a fixed 3 s delay inside the route handler.

### organization-user-associates/us1-invite-associates.spec.ts
- Journeys: H3 (invite associates, pending list, revoke, role caps, permissions).
- Writes through UI: invite U1 (Associate) and U2 (Associate+Owner) (AS2), revoke U1 (AS7). Seeded via lib: orgs, role grants, pre-invite, pre-application, caps filled with shared personas.
- Lib helpers: `createOrganization`, `deleteOrganization`, `getGraphqlClient`, `getUserToken`, `postGraphqlRaw`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `TestUser`, `TestUserManager.populateUserModelMap`, `UniqueIDGenerator`, `graphqlErrorWrapper`, `RoleName`, `RoleSetInvitationResultType`. SDK: `assignRoleToUser`, `InviteForEntryRoleOnRoleSet`, `deleteUser`, `DeletePlatformInvitation`. Raw: `me`, `applyForEntryRoleOnRoleSet`, `platform.configuration.language`, `me.organizationInvitations`, `inviteForEntryRoleOnRoleSet`.
- Personas:
  - disposable Kratos identities `us1-*-<suffix>@test.alkem.io` (10; deleted in afterAll)
  - shared fillers: `globalSupportAdmin`, `globalLicenseAdmin`, `spaceMember`, `subspaceMember`, `subsubspaceMember`, `nonSpaceMember`, `spaceAdmin`, `subspaceAdmin`, `subsubspaceAdmin` (get Admin/Owner on throwaway orgs)
- Weakest cases: `US1-AS1 …` (dialog controls; U apart from the language count); `US1-AS5 … OWNER who is not an ADMIN` (checkbox enabled state, U); `US1-AS8 (UI half)` (only `not.toHaveURL`).
- Strongest cases: `US1-AS2: inviting U1 … and U2 …` (pending rows "Associate" vs "Associate + Owner" after the UI send); `US1-AS7: revoking…` (row removed); the API `US1-AS7 (invitee view)` follow-up.
- API-only (no `page`), 7 cases: `US1-AS7 (invitee view)`, both `US1-AS3` cases, the three `US1-AS4` cases, `US1-AS6`, `US1-AS8 (API half)`.
- Risks: AS2 and AS7 are chained (AS7 revokes AS2's row); the user search uses `firstName` and is name-collision sensitive.

### organization-user-associates/us2-invitee-responds.spec.ts
- Journeys: H3 (invitee answers from the org profile hero and the personal pending list), B1 (pending-memberships dialog).
- Writes through UI: Accept (AS2, AS4, AS5), Decline (AS3). Seeded via lib: invitations (`inviteUserToOrganizationRaw` as a disposable admin) and Owner cap fill.
- Lib helpers: `registerTestUser` (via `registerPersona`), `getUserToken`, `postGraphqlRaw`, `assignRoleToUser`, `removeRoleFromUser`, `createOrganization`, `deleteOrganization`, `getGraphqlClient` (`deleteUser`, `GetRoleSetUsersInRoles`), `graphqlErrorWrapper`, `TestUserManager`. Raw `myAssociateEligibility` query.
- Personas: disposable `us2-<role>-<suffix>@alkem.io` (registered via lib `registerTestUser` with the harness password; deleted); shared `spaceAdmin`/`subspaceAdmin`/`subsubspaceAdmin` as Owner fillers.
- Weakest cases: `US2-AS4` opens the pending list via `getByRole('button', {name:/pending|invitation/i}).first()` (loose locator).
- Strongest cases:
  - `US2-AS2` (dialog shows offered role, inviter and message; accept grants Associate and Admin, API-verified; badges shown)
  - `US2-AS5` (withheld-Owner notice, Owner not granted)
  - `US2-AS3` (decline; after reload "Apply to associate" is offered)
- Skips/tolerance: none.
- Risks: the `ownRow` filter uses the email local-part regex.

### organization-user-associates/us3-apply-and-decide.spec.ts
- Journeys: H3 (apply to associate, admin approve/reject), F5 (admin and applicant mail and in-app), A5 (login redirect back to the profile).
- Writes through UI: Apply (AS1, AS4, AS8), Approve (AS3, AS8-decision), Reject+confirm (AS4-decision), login form (AS7). Seeded via lib: orgs, admins, the `allowApplications=false` setting, the AS6 application, and the AS9 DB strip (`queryHarnessDb`).
- Lib helpers: `harnessPostgresConfigured`, `registerTestUser`, `TestScenarioFactory.*`, `getMailsData`, `queryHarnessDb`, `postGraphqlRaw`, `getUserToken`, `assignRoleToUser`, `removeRoleFromUser`, `getGraphqlClient` (`UpdateOrganizationSettings`, `applyForEntryRole`, `deleteUser`). Raw `me.notifications` queries (`getInAppNotificationTypes`, `getInAppActorIdsForType`), `myAssociateEligibility`, `inviteForEntryRoleOnRoleSet`. `fillSecret` (login helper).
- Personas: disposable `us3-*-<suffix>@alkem.io` (7, deleted); `admin@alkem.io` (shared, as org owner and as a mail recipient).
- Mail:
  - AS2 pins exactly one mail per admin (3 admins incl. `admin@alkem.io`) with subject containing `applied to associate with <org>`, the note in the body and not in the subject.
  - AS4 pins any mail to the disposable applicant with subject containing `declined` (loose substring, but on a unique address).
  - AS8 pins exactly 1 mail to `support@alkem.io` for this org with `/no administrators/i`.
- Weakest cases: `US3-AS7 … unauthenticated visitor` (only that the URL returns to the org); `US3-AS1` (the "domain mismatch" in the title is not asserted; "Application pending" after reload is S).
- Strongest cases:
  - `US3-AS2` (fan-out of mails and in-app to every admin)
  - `US3-AS3` (approve gives `ALREADY_ASSOCIATE`; applicant in-app "approved"; the other admin gets "joined", the approver stays empty across a settle window)
  - `US3-AS4 (decision)` (reject gives `ELIGIBLE_TO_APPLY` and a declined mail)
  - `US3-AS8` (support escalation, owner decides)
- Skips/tolerance:
  - `US3-AS9` is tagged `@local-stack`, plus `viewerTest.skip(!harnessPostgresConfigured())`.
  - `isVisible({timeout:2000}).catch(() => false)` cookie handling in AS7.
  - `.catch(() => undefined)` on the orgZ Owner grant.
- Risks: the serial cross-persona chain (AS1 → AS2 → AS3, AS4 → AS4-decision, AS8 → AS8-decision); `US3-AS6` is pure API.

### organization-user-associates/us5-associates-editor.spec.ts
- Journeys: H3 (role editor), H6 (settings switches), plus the retired-URL redirect.
- Writes through UI: toggle Admin/Owner plus Save (refused), Remove sole Owner plus confirm (refused). No successful write. Seeded via lib: caps filled with shared personas, sole owner arranged.
- Lib helpers: `getGraphqlClient` (`deleteUser`, `GetRoleSetUsersInRoles`), `graphqlErrorWrapper`, `registerTestUser`, `getUserToken`, `postGraphqlRaw`, `assignRoleToUser`, `removeRoleFromUser`, `createOrganization`, `deleteOrganization`, `TestUserManager.populateUserModelMap`.
- Personas: disposable `us5-*-<suffix>@alkem.io` (5, deleted); 7 shared fillers (`spaceAdmin`, `spaceMember`, `subspaceAdmin`, `subspaceMember`, `subsubspaceAdmin`, `subsubspaceMember`, `nonSpaceMember`).
- Weakest cases: both `US5-AS1` cases (redirect plus tab strip); both `US5-AS4` cases (switch layout); all U.
- Strongest cases: `US5-AS3 (a)/(b)/(c)` (server refusal message rendered, nothing granted or removed per `getUserIdsInRole`); `US5-AS2` (Admin-only user listed with an Admin badge and no Associate badge).
- Gap: no case proves a SUCCESSFUL role change or removal through the editor. Only refusals are tested.

### organization-user-associates/us7-pending-lists-integrity.spec.ts
- Journeys: NEW-pending-list-authz (GraphQL partition, GRANT gating, cascade-on-delete, eligibility); no UI.
- Writes through UI: none. Everything goes through raw GraphQL and the lib.
- Lib helpers: `createOrganization`, `deleteOrganization`, `getGraphqlClient`, `getUserToken`, `harnessPostgresConfigured`, `postGraphqlRaw`, `queryHarnessDb`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `TestScenarioFactory.*`, `TestUser`, `TestUserManager`, `UniqueIDGenerator`, `graphqlErrorWrapper`, `NotificationEvent`, `RoleName`, `SpacePrivacyMode`, `getInAppActorIdsForType`.
- Personas: shared `QA_USER`, `GLOBAL_BETA_TESTER`, `SUBSUBSPACE_MEMBER`, `NON_SPACE_MEMBER`, `SPACE_ADMIN`, `GLOBAL_ADMIN`; one disposable Kratos identity (AS5).
- Skips: `US7-AS6` is `@local-stack` plus a `harnessPostgresConfigured` skip.
- Verdict rationale: a server-api suite living in a Playwright file. It is strong server-truth, but it does not survive the rewrite as a UI net and must be ported with the lib.

### organization-email-invitations/us1-invite-by-email.spec.ts
- Journeys: D4 (organization variant: invite an unregistered address), H3, A9 (suggested language).
- Writes through UI: paste-email invite with role, message and language (AS2), duplicate invite (AS4), revoke (AS7), mixed batch (AS5). The AS7 re-invite goes through the API. Seeded via lib: orgs, role grants.
- Lib helpers: `registerInKratosOrFail`, `verifyInKratosOrFail`, `getUserToken`, `postGraphqlRaw`, `getGraphqlClient` (`InviteForEntryRoleOnRoleSet`, `RoleSetPendingPlatformInvitations`, `RoleSetApplicationsInvitations`, `DeletePlatformInvitation`, `ResendPlatformInvitation`, `LookupPlatformInvitation`, `GetRoleSetUsersInRoles`, `UpdateOrganizationSettings`, `deleteUser`), `getMailsData`, `delay`, `TestUserManager`.
- Personas: disposable `us081-*-<suffix>@test.alkem.io` (8, deleted); invitee addresses `@example.com` (never registered); shared `globalSupportAdmin` (refused) and 7 shared Admin fillers on capOrg.
- Mail: `settledMailsTo(address, n)` is an exact per-address count held for a 4 s quiet period (45 s cap). AS2 pins exactly 1 mail with subject `You are invited to join <org> on Alkemio`. AS4 pins that no 2nd mail arrived. AS7 pins +1 after the re-invite.
- Weakest cases: `US1-AS1 …` (dialog controls, U).
- Strongest cases:
  - `US1-AS2` (record has `profileCreated:false`, `roleSetExtraRoles:[Admin]`, `welcomeMessage`, `suggestedLanguage`; exactly 1 mail; "Invited (external)" row)
  - `US1-AS4` (dedupe)
  - `US1-AS7` (revoke gives `ENTITY_NOT_FOUND`)
  - `US1-AS5` (per-chip outcomes)
- API-only: `US1-AS3`, `US1-AS6`, `US1-AS8`.
- Tolerance: AS7 branches on `gone.errors.length` (either error code or null record).

### organization-email-invitations/us2-invitee-signup.spec.ts
- Journeys: D4 (invitee side), A1 (partial: the link leads to sign-up, but the identity is created via the Kratos API, not the form), A9 (Dutch interface), H3 (accept), domain auto-join precedence.
- Writes through UI: sign-in form, accept in the pending dialog. Seeded via lib: verified-domain org (`applyOrganizationVerificationSequence`), invitations (`inviteRaw`), identities (`registerUserAtAddress`).
- Lib helpers: as US1 plus `applyOrganizationVerificationSequence`; `fillUpSignInPageElements`/`pressSignInButtonSignInPage` (identity-flows page objects).
- Personas: disposable `us081b-admin-<suffix>@test.alkem.io`; invitees at `<suffix>.example.com` (deleted).
- Mail: `US2-AS1/AS7` pins exactly 1 mail with:
  - exact subject, secret phrase absent from the subject
  - decoded body containing the inviter display name, org, "Associate + Admin", the phrase, `&lt;b&gt;hi&lt;/b&gt;` and no raw `<b>`
  - a CTA href with `dialog=invitations`, which the next case follows.
- Weakest cases: `US2-AS2 … suggested language (Dutch)` (runtime skip when `nl` is not eligible; it reads the dialog left open by the previous case).
- Strongest cases: `US2-AS2` (logged-out CTA leads to `/sign_up` with `returnUrl`; after sign-in the dialog lists the invitation with role, inviter and message); `US2-AS3` (accept, then Associate+Admin via `usersInRoles`, then badges); `US2-AS6` (converted row, no external row).
- API-only: `US2-AS1/AS7` (mail) and `US2-AS4` (precedence).
- Risks: the AS2 → AS3 chain shares a page across tests (`inviteePage`).

### organization-email-invitations/us3-resend.spec.ts
- Journeys: D4 (resend, throttle) on both the org Associates table and the Space community table.
- Writes through UI: Resend (AS1, AS3×2, AS2). Seeded via lib: email invitations (`inviteRaw` as global admin), associate role.
- Lib helpers: `TestScenarioFactory.*` (scenario name `'org-email-resend'` has no suffix), `TestUser`, plus the helpers set.
- Personas: shared `organization.admin@` and `space.admin@` (UI); shared `betaTester`, `qaUser`, `spaceMember` (refused); disposable `us081c-goneadmin-<suffix>@test.alkem.io`.
- Mail:
  - AS1: +1 mail whose body names the resending admin, with exact org subject; the record is otherwise unchanged.
  - AS3: throttle gives +0 mail; another address gives +1.
  - AS2: Space template subject `Invitation to join <Space>`.
- Strongest cases: `US3-AS1`, `US3-AS3 second click refused`, `US3-AS2`.
- Skips: `US3-AS3: after the window…` is `@local-stack`, with a runtime skip when the cooldown is over 30 s, and uses `page.waitForTimeout(window)`.
- Weak: `US3-AS6` `createdBy?.id not.toEqual(resender)` passes vacuously when the field fails to resolve (by design); the DB check runs only on loopback. AS4–AS6 are API-only.

### organization-email-invitations/us3-as1-two-rows.spec.ts
- Journeys: D4 (resend).
- Writes through UI: 3 resend clicks. Seeded via lib: 2 email invitations.
- Lib helpers: `TestScenarioFactory.*`, `TestUser`, `inviteRaw`, `settledMailsTo`, `mailsTo`.
- Personas: shared `organization.admin@`.
- Strongest case (single): per-row +1 mail, rows unchanged, 2 ok and 1 refused GraphQL responses, error toast scoped to `[data-sonner-toast][data-type="error"]`.
- Risks: unsuffixed scenario name; relies on the server's 300 s default cooldown.

## Group summary
- Journeys with STRONG coverage in this group:
  - D2: apply plus admin approve/reject at L0, L1 and L1 under a public parent; UI-driven on both sides.
  - D5: invite organization, org-admin notification fan-out, org accept/decline with role read-back.
  - D7 (organization variant): org leaves Space with cascade.
  - D4 (organization variant): invite by email, dedupe, revoke, resend, invitee follows the mail CTA and accepts.
  - H3: associate invite, apply, approve, reject, accept, decline, withheld role.
  - F5 for these events: real MailSlurper content pinned by exact subject and per-address count.
- Journeys only USABLE/WEAK:
  - H4/G5 org Membership tab (lib-seeded reads)
  - H3 role editor (refusals only, no successful edit)
  - D6 (only cap and Lead side effects)
  - F4 (one UI toggle in osi-US2-AS6)
  - B5 bell (vacuous in applications)
  - A9 (conditional Dutch skip)
- Journeys this group touches but does not really cover:
  - D1/D8: no case proves an approved applicant or accepting org can then open the Space.
  - A1: the email invitee's identity is created via the Kratos API, not the sign-up form.
  - D3 (a user invited to a Space is not in this group, except the Space resend template).
  - C3 (policy only seeded).
- ACCEPT/DECLINE/APPROVE location:
  - In the UI: Space applications approve/reject/delete; org invitation accept/decline (osi-US3); associate accept/decline (oua-US2, oei-US2); associate approve/reject (oua-US3); org leave (osm-US2).
  - Via the lib/API: the platform-admin accept (osi-US3-AS8); all `inviteAndAccept` seeding in osm.
  - Invitations sent via the UI: osi-US1/US2, oua-US1-AS2, oei-US1. Seeded via the API: osi-US3, oua-US2, oei-US2, oei-US3.
- Personas:
  - Applications and osi rely entirely on shared harness personas, repurposed as org admins/associates and with notification settings mutated.
  - osi-US3 uses two fixed, never-deleted identities from global-setup (`orgadmin-us3`, `orgassoc-us3`).
  - oua/oei use disposable run-suffixed Kratos identities (deleted in afterAll), plus shared personas as cap fillers.
- Mail risk:
  - `lib getMailsData()` issues `GET <MAIL_SLURPER_ENDPOINT>` with no page parameter, so every reader sees only MailSlurper's first page. Unverified here, but if the shared inbox exceeds one page, the per-address delta counts in oei and the exact-count checks in oua-US3 can under-count.
  - osi-US2 prunes the entire shared inbox in `beforeAll`.
- Pure-API cases inside these Playwright files: 23 of 126. They are not a UI net and are coupled to the current GraphQL shape. Also, most strong UI cases verify the outcome through raw GraphQL strings, which are not in the lib: `rawGql` in osi-US2 and osi-US3, the eligibility, notification and invitation queries in oua/oei helpers, and `notification-settings.helper.ts`. Those strings need porting alongside the lib.
- Lib helper union (exact names):
  - Scenario and personas: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager` (`populateUserModelMap`, `getUserModelByType`, `users.*`), `testConfiguration`, `UniqueIDGenerator`
  - Organizations and roles: `createOrganization`, `deleteOrganization`, `assignRoleToOrganization`, `assignRoleToUser`, `removeRoleFromUser`, `applyOrganizationVerificationSequence`
  - GraphQL clients: `getGraphqlClient`, `graphqlErrorWrapper`, `graphqlRequestAuth`, `postGraphqlRaw`
  - Identity: `getUserToken`, `registerTestUser`, `registerInKratosOrFail`, `verifyInKratosOrFail`
  - Harness infrastructure: `queryHarnessDb`, `harnessPostgresConfigured`, `getMailsData`, `deleteMailSlurperMails`, `MailItem`, `delay`, `getQueueStats`, `waitForQueuePublishIncrease`, `rabbitMqManagementConfigured`
  - Generated enums and types: `RoleName`, `RoleSetInvitationResultType`, `NotificationEvent`, `SpacePrivacyMode`, `CommunityMembershipPolicy` (client-lib), `InviteForEntryRoleOnRoleSetMutation`, `RoleSetApplicationsInvitationsQuery`, `RoleSetPendingPlatformInvitationsQuery`
  - SDK operations used through `getGraphqlClient()`: `RemoveRoleFromOrganization`, `UpdateOrganizationSettings`, `InviteForEntryRoleOnRoleSet`, `assignRoleToUser`, `removeRoleFromUser`, `MeQuery`, `getSpaceInvitations`, `SubscribeToPushNotifications`, `UnsubscribeFromPushNotifications`, `RoleSetMembersList`, `InvitationStateEvent`, `deleteUser`, `applyForEntryRole`, `GetRoleSetUsersInRoles`, `DeletePlatformInvitation`, `RoleSetPendingPlatformInvitations`, `RoleSetApplicationsInvitations`, `ResendPlatformInvitation`, `LookupPlatformInvitation`, `LookupPlatformInvitationCreatedBy`
- Proposed NEW journey IDs: `NEW-pending-list-authz` (oua-US7: partitioned and GRANT-gated pending lists, cascade on delete); `NEW-org-domain-autojoin` (oei-US2-AS4: verified-domain auto-join vs open invitation precedence); `NEW-org-invitation-resend` (resend plus throttle, if D4 is kept to Space-only).
