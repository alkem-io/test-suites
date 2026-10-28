# G6 messaging, chat, user profile, authorization, platform roles

Repo: `~/repos/qa/test-suites` @ develop `b451c329`. Read-only review. S/U/V counts are per `expect`/`expect.poll`/helper-internal assertion that gates the case; "≈" marks counts where a loop or helper repeats an assertion.

## Files reviewed
- messaging-notifications/: `messaging.helpers.ts`, `us1-direct-message-notifications.spec.ts`, `us2-group-message-notifications.spec.ts`, `us3-messaging-settings-rows.spec.ts`, `messaging-notifications-test-plan.md`
- chat-avatars/: `chat-avatars.helpers.ts`, `us1-group-thread-sender-avatars.spec.ts`, `us2-group-header-identity.spec.ts`, `us3-direct-thread-header-identity.spec.ts`
- user-profile/: `access-user-profile-from-dashboard.spec.ts`, `direct-url-access-to-user-profile.spec.ts`, `update-basic-information.spec.ts`, `view-profile-information.spec.ts`, `mcp-api-keys-mint.spec.ts`, `mcp-api-keys-revoke.spec.ts`
- helpers/: `mcp-api-keys.helper.ts`, `notification-settings.helper.ts` (the second is not used by any spec in this group; its users are the `applications/` specs), `login.helper.ts` (`loginViaCrd`, `fillSecret`)
- authz-admin-guard/: `authz-admin-guard.helpers.ts`, `space-community-role-changes.spec.ts`, `org-associates-authorization.spec.ts`, `unverifiable-and-denied.spec.ts`, `platform-global-roles.spec.ts`, `memo-sign-action-gate.spec.ts`; plus the imported `organization-user-associates/organization-user-associates.helpers.ts` (`assignUserRoleOnOrganization`, `getUserIdsInRole`)
- platform-roles/: `admin-sections-per-role.spec.ts`, `authorization-page-per-viewer.spec.ts`, `resource-transfers-as-resource-admin.spec.ts`, `feature-roles-offers.spec.ts`, `space-conversion-as-resource-admin.spec.ts`, `users-admin-actions.spec.ts`, `space-support-flag.spec.ts`, `forum-discussion-controls.spec.ts`, `space-visibility-per-role.spec.ts`, `platform-roles-admin-manual-checklist.md`
- Runners: `config/playwright.config.nightly.ts`, `config/playwright.config.platform-roles.ts`, `config/global-setup.platform-roles.ts`, `playwright.config.ts`; lib `lib/src/scenario/platform-roles/platform-role-users.ts` (`seedPlatformRoleUsers`)
- Shared: `fixtures/authenticated-session.fixture.ts` (`createPersonaTest`), `my-dashboard/my-dashboard-page-objects.ts` (`expectSignedIn`)

Totals: **26 spec files, 134 cases** (1 `.fail`-marked as an expected failure, 1 conditional `skip`, 0 `test.skip`/`fixme`).

## Per-spec table
| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| messaging-notifications/us1-direct-message-notifications | **NO** (not in nightly; not ignored by the interactive config) | 8 (0) | A1, F1, F4, F5 | UI-write (sign-up, 1:1 chat, message, email toggle) + raw GQL push subscription | ≈30/8/1 | NOT-A-NET as registered (would be STRONG) | Exact email/push-queue deltas after UI sends, but it runs in no CI job and wipes the shared inbox |
| messaging-notifications/us2-group-message-notifications | **NO** | 9 (0) | A1, F2, F4, F5 | UI-write (group create/rename, send, remove member, toggles) | ≈26/9/1 | NOT-A-NET as registered (would be STRONG) | Recipient-set pinned through exact push deltas and mail addresses; unregistered |
| messaging-notifications/us3-messaging-settings-rows | **NO** | 5 (0) | A1, F1, F4, F5 | UI-write (toggle, send); AS3 writes `updateUserSettings` via raw same-origin fetch | ≈24/9/2 | NOT-A-NET as registered (would be STRONG) | Server defaults, persistence across reload, email honoured; unregistered |
| chat-avatars/us1-group-thread-sender-avatars | yes (Chat avatars, long) | 8 (0) | A1, F2, F6, N1, E5-like reactions | UI-write (sign-up, avatar upload, group create, messages, reaction) | ≈16/30/0 | STRONG | Every message goes through the live room and the exact uploaded avatar src is pinned. Run-layout checks are client-side |
| chat-avatars/us2-group-header-identity | yes | 4 (0) | F2, F6, N1 | UI-write (group create, group photo upload/replace) | ≈5/20/0 | USABLE | Mostly compares the header with the list row (client consistency). Cell counts and photo change need server data |
| chat-avatars/us3-direct-thread-header-identity | yes | 3 (0) | F1, F6 | UI-write (1:1 create, avatar upload, messages both ways) | ≈6/12/0 | USABLE | Uploaded src in list row + two-way delivery are S; the rest is layout |
| user-profile/access-user-profile-from-dashboard | yes (User Profile, extended) | 1 (0) | B2, G1 | none | 3/8/0 | WEAK | Mostly static tab labels; only the `admin alkemio` h1 and the URL slug depend on the server |
| user-profile/direct-url-access-to-user-profile | yes | 1 (0) | G1 | none | 0/3/0 | WEAK | Tab and two inline-edit buttons render whatever the server returns |
| user-profile/update-basic-information | yes | 1 (0) | G2 | UI-write (first/last name on the shared admin persona) | 0/2/1 (+2 in afterEach) | WEAK | No reload or read-back, the toast check is swallowed, and it mutates the shared `admin` persona |
| user-profile/view-profile-information | yes | 1 (0) | G1, G2 | none | 0/16/1 | WEAK | Field-presence inventory. "No references yet" is an environment-dependent assertion on admin's data |
| user-profile/mcp-api-keys-mint | yes | 5 (0) | G6 | UI-write (mint key) | ≈9/12/0 | STRONG | Server-generated `mcp_` value, key listed by name after reload, chosen expiry listed. AS4a/AS6 are client-only |
| user-profile/mcp-api-keys-revoke | yes | 6 (0) | G6 | UI-write (mint, revoke) | ≈14/6/0 | STRONG | Revoke through the UI, then real `/rest/mcp` 200→401/404 checks and last-used history. Best server-truth in the group |
| authz-admin-guard/space-community-role-changes | yes (Authz admin guard) | 7 (0) | C3, D6, D8, L5 | UI-write (lead/admin/remove on a lib-seeded space) | ≈9/12/6 | STRONG | Every role change is re-read after a reload. "No denied toast" is checked with no settle window |
| authz-admin-guard/org-associates-authorization | yes | 6 (0) | H3, L5 | mixed: associate seeded via lib; admin/remove/owner via UI | ≈5/5/8 | STRONG (2.1–2.3) / NOT-A-NET (2.4, 4.1, 4.2 branches) | `getUserIdsInRole` lib read-back after each UI write. Probes return green on "not offered" |
| authz-admin-guard/unverifiable-and-denied | yes | 3 (0) | L5 (client gate) | none reaching the server (6.1's mutation is stubbed) | 1/10/2 | WEAK | Network fault injection tests client gating only. 6.1's "nothing applied" is tautological because the request never left the browser |
| authz-admin-guard/platform-global-roles | **yes, and also in the platform-roles runner** | 2 (0) | L4 | UI-write (add/remove FEATURE_VIRTUAL_ASSISTANT) | 4/4/2 | STRONG | Holder list is re-read after a reload, with the role tab proven before acting |
| authz-admin-guard/memo-sign-action-gate | yes | 2 (0) | E10, L7 | lib-write (memo callout, licence plan assign/revoke) | 4/3/2 | USABLE | Entitlement- and identity-driven gate on the Sign action. All writes are seeded |
| platform-roles/admin-sections-per-role | NO (own runner) | 28 (0) | L1–L7 (section access), A5 | none (seed via lib) | ≈56/14/0 | USABLE | Exact tab set per role + URL-typed section bounce. All server-privilege driven |
| platform-roles/authorization-page-per-viewer | NO | 15 (0) | L4 | UI-write (add/remove platform & feature role holders) | ≈22/14/3 | STRONG | Persisted across reload, plus server refusals surfaced ("mutually exclusive", "service account", "self-assignment") |
| platform-roles/resource-transfers-as-resource-admin | NO | 2 (1 `.fail`) | L3, H4 (transfer) | UI-write (transfer space) | 2/1/1 | USABLE (case 1) / NOT-A-NET (case 2) | Mutation returns no errors, but the space's new owner account is never read back |
| platform-roles/feature-roles-offers | NO | 4 (1 conditional skip) | B1, G3, I1, L4 | none | 6/6/1 | USABLE | Role-driven offers (campaign banner, trial allowances, `virtualAssistantAccess`). Seeded reads only |
| platform-roles/space-conversion-as-resource-admin | NO | 1 (0) | C5 | UI-write (L1→L0 promote) | 3/1/0 | STRONG | Level is read back as `L0` through GraphQL |
| platform-roles/users-admin-actions | NO | 3 (0) | L1 | UI-write (admin email change, delete user) | 6/2/0 | STRONG | No GraphQL errors, the new email is shown after reload, and the user is gone after reload |
| platform-roles/space-support-flag | NO | 4 (0) | C3, L4, L5 | lib-write (`updateSpaceSettings` flag) | 6/4/2 | USABLE | Server-privilege-driven presence/absence of settings, flipped through the lib |
| platform-roles/forum-discussion-controls | NO | 2 (0) | J2, J4, L4 | UI-write (create discussion) | 4/1/1 | STRONG | Create via UI with no GraphQL errors; edit/delete offered to Support and not to the author. Case 2 depends on case 1 |
| platform-roles/space-visibility-per-role | NO | 3 (0) | C10, L3, L7 | UI-write (visibility inline change) | 6/4/1 | STRONG | `visibilityOf` GraphQL read-back polled to `DEMO`, then shown after reload |

Verdict distribution (26 specs): **STRONG 11**, **USABLE 7**, **WEAK 5**, **NOT-A-NET 3** (the three messaging specs: strong code, unregistered). Two specs have sub-verdicts: org-associates 2.4/4.x are NOT-A-NET, and resource-transfers case 2 is `.fail`.
Nightly reality: of the 134 cases only **50** run nightly (chat-avatars 15 + user-profile 15 + authz-admin-guard 20). The other **84** (messaging 22, platform-roles 62) run in no scheduled job.

### Can the platform-roles runner run against plain develop?
**Yes, by its preconditions; no, by any scheduled job.** The runner header (`config/playwright.config.platform-roles.ts`) and `playwright.config.ts` `testIgnore` still say it "needs a stack running the 027 SERVER AND CLIENT". That comment is now **stale**: server develop holds 027 Slice B (`04de7f148`, #6582) and the legacy-bridge removal (#6618), and client develop holds Slice A (#10102) and Slice B (#10380, `b1095a408`). The actual runtime preconditions are:
1. `admin@alkem.io` holds `PLATFORM_ROLES_ADMIN`. `seedPlatformRoleUsers` throws otherwise. The server re-seeds it on start.
2. Either the Kratos admin endpoint (`provisionTestIdentities`) is reachable, or `registerUsers` is set. Without one, the 14 `platform.*`/`feature.*` identities are never created.
3. `ensureHarnessAdminRoles()` in `global-setup.platform-roles.ts` must succeed.

So a current develop stack satisfies them. But the folder is in **no** nightly `suite({...})`, so its 62 cases protect nothing unless someone runs `pnpm run test:platform-roles` by hand. Two more points:
- The runner defines its own `use`/`timeout`/`retries: 0`/`workers: 3`/`fullyParallel`, contrary to conventions §1.
- `authz-admin-guard/platform-global-roles.spec.ts` is matched by BOTH the nightly and this runner, so it is the only 027 UI spec that runs nightly.

## Per-spec notes

### messaging-notifications/us1-direct-message-notifications.spec.ts
- Journeys: A1 (inline sign-up + verify), F1, F4 (direct row email/in-app toggles), F5 (digest email + push emit).
- Writes through UI: sign-up ×2, start 1:1 chat, all messages, enable direct email. Seeded outside the lib: `subscribeToPushNotifications` via same-origin `page.evaluate` fetch (helper `subscribeToPush`).
- Lib helpers: `delay`, `deleteMailSlurperMails`, `digestTestTimeoutMs`, `digestWindow`, `getMailsData`, `getQueueStats`, `getVerificationLinkFor`, `UniqueIDGenerator`, `waitForQueuePublishIncrease`. Local: `loginViaCrd`, `registerAndVerifyUser`, `settledPushDelta`, `pushPublishedTotal`, `waitForMailsCountAtLeast`. Page objects: `navigateToRegistrationFromSignUpFillFormAndContinue`, `fillUpSignUpPasswordElements`, `fillUpSignInPageElements`, `pressSignInButtonSignInPage`, `nextButton`.
- Personas: none from the harness. Two throwaway users registered through the real sign-up form.
- Weakest: the 3 `setup:` cases (only "chat opened / name visible"). In US1-AS2, the in-app toggle click is wrapped in `.catch(() => {})`, so if the click throws, the "stays off" re-check proves nothing. `sendMessage` asserts only that the text is visible locally, which may be optimistic.
- Strongest: US1-AS1 pins the push publish delta to exactly 1 and email to 0 for the default settings. US1-AS2 pins the email count to exactly 1 and checks the subject `^<A> sent you …$`, no message content, a `/settings/notifications` link and no sender address. US1-AS3 checks that nothing is sent inside the quiet window, then exactly one digest. US1-AS4 shows sender exclusion with the delta staying 1 while A holds a subscription.
- Skips/tolerance: the `.catch` above, and `continueLink.isVisible(...).catch(() => false)` in the helper.
- Defects/risks: **not registered in any nightly project**. It calls `deleteMailSlurperMails()` before every scenario (helper + each AS), which conventions §2 reserve for "suites that are the only thing running — today, none". It cannot share a run. It needs the RabbitMQ management API (`getQueueStats`) and the nine `MESSAGING_DIGEST_*` env vars; without them it falls back to production windows, which means very long runtimes. It runs as a serial chain: a setup failure skips all 5 AS cases. Registered users are never deleted (the plan admits it).

### messaging-notifications/us2-group-message-notifications.spec.ts
- Journeys: A1, F2 (create group, rename, remove member), F4, F5.
- Writes through UI: 4 sign-ups, group create + rename, sends, B/D email toggles, B push toggle, remove C. Raw-fetch seed: push subscriptions.
- Lib helpers: same set as US1.
- Personas: 4 throwaway users.
- Weakest: US2-AS4. The baseline uses `toBeGreaterThanOrEqual(1)` and there is a `delay(3_000)` marked as known debt. Its claim is "notifications stop", not "access is revoked" (stated in the code). US2-AS5 can only show B gets 0 because C is already removed, so the comparative half is not here.
- Strongest: US2-AS1 pins the push delta to exactly 2 (B+C, never A). US2-AS2 checks the subject `^(New message in G|N new messages in G)$`. US2-AS3 shows a non-member with email on gets nothing, by address, after a max-delay settle.
- Skips/tolerance: the `snap()` screenshot is `.catch(() => {})` (harmless).
- Defects/risks: same registration, inbox-wipe and env gaps as US1. The 9-case serial chain means AS4/AS5 depend on AS1–AS3 state. Group member removal still leaves Matrix/authz divergence (server#6329).

### messaging-notifications/us3-messaging-settings-rows.spec.ts
- Journeys: A1, F1, F4 (defaults, locked in-app, persistence), F5.
- Writes through UI: sign-ups, email toggle, 1:1 chat + message. Raw same-origin GQL: `updateUserSettings` (forcing in-app on, AS3), `me.notificationsUnreadCount`, `me.notifications`.
- Lib helpers: `delay`, `deleteMailSlurperMails`, `digestTestTimeoutMs`, `digestWindow`, `getMailsData`, `UniqueIDGenerator`. Local: `registerAndVerifyUser`, `loginViaCrd`, `acceptCookiesIfVisible`.
- Personas: `admin@alkem.io` (AS2, read-only) plus throwaway users.
- Weakest: US3-AS2. Two static labels plus `getByText('INTERNAL_SERVER_ERROR')`/`'Cannot return null'` at count 0; a GraphQL error is not normally rendered as that text, so this is V. US3-AS5 asserts the URL regex and static labels (U). `getMessagingRowSwitches` walks the DOM up from a text match through `body *` (fragile).
- Strongest: US3-AS1 checks the server defaults for a fresh account (email off, push on, in-app disabled and off). US3-AS4 checks that the toggle persists across a reload and an email naming the sender arrives. US3-AS3 checks a forced in-app flag still yields 0 unread / 0 in-app (server enforcement).
- Defects/risks: unregistered, and wipes the inbox. AS3–AS5 depend on AS1 (guarded by `requireRecipientFromAS1`). `sendDirectMessage` uses `getByRole('button', { name })` without `exact`, so it can collide with stale same-prefix users.

### chat-avatars/us1-group-thread-sender-avatars.spec.ts
- Journeys: A1 (form-driven sign-up), F2, F6, N1 (avatar upload + crop), reactions inside chat.
- Writes through UI: 3 sign-ups and sign-ins, Bella's avatar upload, group creation, every message, a reaction. Lib: `registerInAlkemioOrFail` (materialises the user, captures the id), `deleteUser` teardown.
- Lib helpers: `createPngFixture`, `getGraphqlClient` (`deleteUser`), `getMails`, `getUserToken`, `registerInAlkemioOrFail`, `UniqueIDGenerator`. The local `fillSecret` comes from `login.helper`.
- Personas: `admin@alkem.io` for cleanup only, plus 3 throwaway users.
- Weakest: US1-AS4 (own-message layout: `toHaveClass(/items-end/)`, CSS-class assertion, U). US1-AS7 checks reaction pill placement (U), though the reaction round-trip is real. The selectors in `messageColumn`/`gutterRow`/`gutterAvatar` are Tailwind classes (`div.group`, `div.flex.items-start.gap-2`, `div.w-8`, `span.truncate`), which conventions §4 forbid. A styling refactor turns them red, or worse, to 0-count matches that pass the "absent" assertions vacuously.
- Strongest: `expectMessageReceived` waits for each message to arrive over the room subscription. US1-AS1 pins `src === bellaAvatarSrc`, the exact uploaded image as served back. US1-AS3/AS8 check sender names match the server-known display names.
- Skips/tolerance: `acceptCookiesIfPresent` waits up to 15 s with `.catch(() => undefined)`. `chatPanel().isVisible().catch(() => false)` probes the current view (by design).
- Defects/risks: the negative "absent" assertions (`toHaveCount(0)` on class-based locators) are vacuous if the class names change. The `beforeAll` takes 600 s. The password fallback `'ChatAvatars!Test2026'` differs from other suites.

### chat-avatars/us2-group-header-identity.spec.ts
- Journeys: F2, F6, N1 (group photo upload/replace).
- Writes through UI: group creation (×2), group photo set and replace. Lib: `registerInAlkemioOrFail`, teardown via `deleteUser`.
- Lib helpers: as US1.
- Personas: 1 driven throwaway user plus 5 account-only users.
- Weakest: US2-AS1 compares the header composite with the list composite, which is client consistency from one Apollo cache (U). US2-AS2/AS3 never reload, so the photo could live only in the cache.
- Strongest: US2-AS4 needs exactly 4 cells from a 5-member group, which needs server membership. US2-AS3 checks the new photo src differs from the previous one.
- Defects/risks: US2-AS3 has an optional branch that sets the photo if AS2 did not run. A screenshot is written per case (artifact noise only).

### chat-avatars/us3-direct-thread-header-identity.spec.ts
- Journeys: F1, F6.
- Writes through UI: 2 1:1 chats, avatar upload, messages both directions.
- Lib helpers: as US1.
- Personas: 3 throwaway users.
- Weakest: US3-AS2 has a conditional initials branch (the platform assigns avatars, so it is effectively always the image branch).
- Strongest: US3-AS1 checks the list row `imgSrcs` equal `[picturedAvatarSrc]`, showing the server returns the counterpart's uploaded avatar. US3-AS3 checks two-way live delivery.
- Defects/risks: US3-AS3 alignment is CSS-class assertions (`items-end`/`items-start`).

### user-profile/access-user-profile-from-dashboard.spec.ts
- Journeys: B2, G1. Writes: none. Lib: none directly (`createPersonaTest` → `registerInKratosOrFail`, `verifyInKratosOrFail`). Persona: `admin@alkem.io`.
- Case "1.1 Access User Profile from Dashboard": S = `expectSignedIn` (banner Notifications + user menu, no Log in), URL `/user/admin-alkemio/settings/account`, h1 `admin alkemio`. U = 6 tab labels.
- Risks: hard-coded nameID `admin-alkemio` and display name `admin alkemio`. If the new server derives nameIDs differently, the test goes red for a harness reason.

### user-profile/direct-url-access-to-user-profile.spec.ts
- Journeys: G1. Writes: none. Persona: admin.
- Case "Direct URL Access to User Profile": three visibility checks of static controls. They would still render on an error or empty user only if the page shell renders regardless. Treat as U.

### user-profile/update-basic-information.spec.ts
- Journeys: G2. Writes through UI: first/last name of **the shared `admin` persona** (convention §2 violation). Persona: admin.
- Case "Update Basic Information": `updateInlineField` asserts the button `toContainText(value)` right after Enter. There is no reload or GraphQL read-back, so an optimistic or cached value passes (U). The toast assertion is `.catch(() => {})` (V).
- Risks: if the revert in `afterEach` fails, admin is left as "TestFirstName TestLastName". Every spec that matches on `admin alkemio` (e.g. access-from-dashboard) then goes red. `originalFirstName` is module-level and set inside the test, so a failure before it is read skips the restore silently.

### user-profile/view-profile-information.spec.ts
- Journeys: G1/G2 (field inventory). Writes: none. Persona: admin.
- Case "View Profile Information": 16 presence checks of static controls (U). "No references yet" asserts admin has no references, an environment assumption (V/fragile).

### user-profile/mcp-api-keys-mint.spec.ts
- Journeys: G6. Writes through UI: `mintMcpApiKey` (5 keys). Teardown via lib-adjacent raw GQL `revokeMcpApiKey`.
- Lib helpers: `getUserToken`, `postGraphqlRaw` (in `listMcpKeyIds`, `revokeMintedMcpKeys`). Page elements: `acceptAllCookiesButton`, `logInHeaderLink`, `fillSecret`.
- Persona: `admin@alkem.io` (signs in through the form in every `beforeEach`).
- Weakest: US1-AS4a is accessibility attributes only (U). US1-AS6 is client-side validation (U), though it asserts no `mintMcpApiKey` request was sent.
- Strongest: US1-AS2 checks the revealed `^mcp_` value is gone after a reload while the key is still listed by name. US1-AS5 checks the chosen expiry date is rendered in the row.
- Tolerance: in `signIn`, cookie/login-link `isVisible({timeout}).catch(() => false)` (the timeout option does not wait).
- Risks: the server caps usable keys at 10 per user. The cleanup revokes only `ACTIVE` keys with the listed prefixes, so a crash before `afterAll` leaks keys onto the shared admin. Five UI sign-ins per file add Kratos 429 risk.

### user-profile/mcp-api-keys-revoke.spec.ts
- Journeys: G6. Writes through UI: mint ×6, revoke ×3. External: `/rest/mcp` JSON-RPC `initialize`/`tools/list` via Playwright `request`.
- Lib helpers: as mint.
- Persona: admin.
- Strongest: US2-AS4 checks a revoked key gets **401** from `/rest/mcp`. US2-AS5 checks an established session with no bearer gets **401**, then **404** (session closed). US2-AS3 checks revoked status plus a last-used timestamp and an IP after a real MCP call. These pin real server behaviour and would catch a rewrite regression.
- Weakest: US2-AS1 (row text contains Read/Active/Never expires/Never used: S, but loose). US2-AS6 is a pure absence-of-controls check, with a positive control (Create/Revoke visible).
- Risks: `mcpUrl` resolution depends on `ALKEMIO_MCP_URL` / `ALKEMIO_SERVER_REST` / localhost:4000. A nightly with the wrong env gave 405 reds (2026-10-12, noted in the file). US2-AS3's IP regex assumes the address is displayed. The empty state (AS1a) is delegated to the component test.

### authz-admin-guard/space-community-role-changes.spec.ts
- Journeys: C3 (Community tab), D6, D8 (remove member), L5 (client gate = server privilege).
- Writes through UI: lead on/off, admin on/off, remove member. Seeded via lib: the space and its community (admins/members).
- Lib helpers: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager` (`users.qaUser`).
- Personas: `space.admin`, `global.support`, `space.member`; subject `qa.user`.
- Strongest: 1.2/1.3/1.4/2.1 check the role change persists across a reload (checkbox state is re-read from the server). 2.2 checks the removed member's row is gone after a reload.
- Weakest: 3.1 "A plain member has no Community admin surface at all". It checks the banner is visible and the Actions button count is 0, with no positive control on what page was reached (V). Every "no denied toast" is `toHaveCount(0)` immediately after the dialog closes, with no settle (V-ish; the reload check covers it).
- Risks: one serial chain across three persona test objects (file-level `describe.configure`). 2.2 removes `qa.user`, so 3.1 runs on a space without the subject. The `global.support` cases depend on Slice B privileges.

### authz-admin-guard/org-associates-authorization.spec.ts
- Journeys: H3, L5.
- Writes through UI: grant/revoke Admin, remove from organisation, grant Owner. Seeded via lib: the organisation, associate role (`assignUserRoleOnOrganization` → lib `assignRoleToUser`).
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUserManager`, `RoleName`, `assignRoleToUser`, `getGraphqlClient().GetRoleSetUsersInRoles` + `graphqlErrorWrapper` (via `getUserIdsInRole`).
- Personas: `organization.admin`, `global.support`; subject `qa.user`.
- Strongest: 2.1/2.2/2.3 check, after each UI write, that `expect.poll(getUserIdsInRole(...))` contains or omits the subject. This is a true server read-back.
- Weakest: 2.4 returns green when the Owner switch is absent or disabled (it only annotates). 4.1 returns green when Invite is not offered. 4.2 returns green on four different "gated" branches and has a `waitFor(...).catch(() => undefined)`. These probes accept almost any outcome (V).
- Risks: `RegExp(subject())` is built from a display name without escaping. `getByRole('switch', { name: 'Admin' }).click()` toggles; if a previous run left state, the direction inverts (mitigated by a fresh scenario per run).

### authz-admin-guard/unverifiable-and-denied.spec.ts
- Journeys: L5 (client fail-closed / denied UX). Writes: none reach the server.
- Lib helpers: `TestScenarioFactory`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager`.
- Persona: `space.admin`.
- 5.1 and 5.2: the GraphQL response is rewritten to strip or downgrade `myPrivileges` on the role set, then the test checks the client gates (U). The 5.1 recovery half (lead enabled after unroute) is S.
- 6.1: `AssignRoleToUser` is fulfilled with a fake FORBIDDEN. The toast is U. "Lead not checked after reload" is tautological, because the mutation never reached the server (V).
- Risks for the migration: `injectRoleSetAuthorizationFault` matches `record.id === roleSetId && record.authorization`. If the new schema renames or moves `authorization.myPrivileges`, the injection silently becomes a no-op (`touched=false`). 5.1 would then go red rather than pass, but 6.1 keys on operationName `AssignRoleToUser`, which a client regen could rename. The `route.fetch` error is swallowed when it contains "already handled".

### authz-admin-guard/platform-global-roles.spec.ts
- Journeys: L4. Writes through UI: add/remove `qa.user` on `FEATURE_VIRTUAL_ASSISTANT`. Teardown via lib.
- Lib helpers: `getGraphqlClient().platformRoleSetUsersInRole`, `getGraphqlClient().PlatformRolesRemoveRoleFromUser`, `TestUserManager.populateUserModelMap`, `TestUserManager.users` (`qaUser`, `globalAdmin.authToken`), `RoleName`.
- Persona: `admin@alkem.io` (bootstrap Roles Admin); subject `qa.user`.
- Strongest: 4.1/4.2 prove the right role tab is shown (`expectRoleSelected`), then check the member row appears or disappears after a reload.
- Weakest: "no denied toast" is checked without a settle.
- Risks: it mutates the shared `qa.user` persona's platform roles (restored in `afterAll` via the API). It is registered in the nightly AND in the platform-roles runner.

### authz-admin-guard/memo-sign-action-gate.spec.ts
- Journeys: E10, L7. Writes: lib only (`CreateCalloutOnCalloutsSet` memo, `AssignLicensePlanToSpace`, `RevokeLicensePlanFromSpace`).
- Lib helpers: `getGraphqlClient` (`CreateCalloutOnCalloutsSet`, `GetPlatformLicensePlans`, `AssignLicensePlanToSpace`, `RevokeLicensePlanFromSpace`, `GetSpaceLicenseEntitlements`), `graphqlErrorWrapper`, `TestScenarioFactory`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `UniqueIDGenerator`, `CalloutFramingType`, `CalloutVisibility`, `LicenseEntitlementType`.
- Persona: `space.admin`.
- 13.1 checks no Sign / Signed copies with the entitlement off, with the dialog-open positive control (S-ish). 14.1 polls the API until the entitlement is on, then checks a **disabled** Sign button plus the Cleverbase guidance (S). `expect(assigned.error).toBeUndefined()` asserts the lib write (V for UI purposes).
- Risks: depends on the licence plan name `SPACE_FEATURE_MEMO_SIGNING` existing. `.first()` on "Open Memo".

### platform-roles/admin-sections-per-role.spec.ts
- Journeys: L1–L7 (section visibility), A5 (restricted).
- Writes: none. Lib: `PLATFORM_ROLE_NAMES`, `platformRoleEmail`, `seedPlatformRoleUsers` (inside: `provisionTestIdentities`/`registerTestUser`, `getUserToken`, `getGraphqlClient().updateUserServiceProfile`, `getGraphqlClient().PlatformRolesAssignRoleToUser`).
- Personas: the 14 `platform.*`/`feature.*` users.
- 28 cases (2 per role). The exact tab list per role and the `/restricted` bounce are the expectations the suite states itself (not imported from client code). "No other section opens by URL" collects leaks across up to 10 navigations. S because the visible sections derive from server privileges.
- Risks: `getByRole('main').waitFor(...).catch(() => undefined)` only feeds the leak message. Not in the nightly.

### platform-roles/authorization-page-per-viewer.spec.ts
- Journeys: L4.
- Writes through UI: add/remove holders on PLATFORM_SUPPORT and FEATURE_VIRTUAL_ASSISTANT, plus attempted refused adds. Lib: `seedPlatformRoleUsers`, `registerTestUser`, `getUserToken`, `getGraphqlClient().PlatformRolesRemoveRoleFromUser`, `testConfiguration`, `RoleName`, `SeededPlatformRoleUsers`.
- Personas: `platform.rolesadmin`, `platform.usersadmin`, `platform.auditreader`, plus persistent subjects `platformroles.uisubjecta`/`uisubjectb`.
- Strongest: "adds a user to a Platform role; it persists across a reload". "Audit Reader exclusion…" checks the server message "mutually exclusive" and that no holder exists after a reload. Spaces Reader checks "service account". Self-assign checks "self-assignment".
- Weakest: `getByRole('alert')).toHaveCount(0)` immediately after Add (no settle). The "Platform role cannot be held by organizations" heading checks are U.
- Risks: serial chain inside the Roles Admin block (Audit-exclusion depends on the earlier add). `normaliseSubject` strips every non-REGISTERED role from the subject.

### platform-roles/resource-transfers-as-resource-admin.spec.ts
- Journeys: L3, H4 (account transfers).
- Writes: UI transfer of space. Lib seeds: `TestScenarioFactory.createBaseScenario`, `createOrganization`, `createInnovationPack`; teardown `deleteInnovationPack`, `deleteOrganization`, `cleanUpBaseScenario`, all `.catch(() => undefined)`.
- Case 1 "Transfer Space…" asserts only that the `TransferSpaceToAccount` response has no errors. It does not check the space now belongs to the target account. A server that returns success without moving passes (weak S).
- Case 2 "Transfer Innovation Pack…" is `asResourceAdmin.fail(true, …)`, a recorded client defect (NOT-A-NET).
- Risk: the stale comment block in case 1 still describes the defect as live while the code expects success.

### platform-roles/feature-roles-offers.spec.ts
- Journeys: B1 (campaign banner), G3 (trial allowances), I1, L4.
- Writes: none. Lib: `platformRoleEmail`, `seedPlatformRoleUsers`.
- S: banner visible for VC Campaign, "Hosted Spaces 0/[1-9]" for Beta Tester, `platform.virtualAssistantAccess` true/false via same-origin GQL.
- Conditional: `asVirtualAssistant.skip(!offered, …)` when the client build flag is off.
- Risks: `asOtherRole` does not call `rolesAreSeeded`. Under `fullyParallel` it can run in a worker that never seeded (OK only once the env is seeded). `myProfileUrl` reads `data.me...` with no error check.

### platform-roles/space-conversion-as-resource-admin.spec.ts
- Journeys: C5. UI-write `ConvertSpaceL1ToL0`. Lib: `seedPlatformRoleUsers`, `TestScenarioFactory`, `TestUserManager`.
- The single case "promotes a subspace to a top-level space (L1 → L0)" checks the GraphQL `level` before (L1) and after (`expect.poll` → L0). STRONG.

### platform-roles/users-admin-actions.spec.ts
- Journeys: L1. UI-write `AdminUserEmailChange`, `deleteUser`. Lib: `registerTestUser`, `getUserToken`, `seedPlatformRoleUsers`, `testConfiguration`, `TestUserManager`.
- Persona: `platform.usersadmin`; throwaway victim.
- S: no GraphQL errors, the new email is shown after a reload, "Showing 0" after delete and after a reload.
- Risks: 3-case serial chain. `search()` uses `.or(textbox).first()`. The confirm dialog is `alertdialog.or(dialog).first()`.

### platform-roles/space-support-flag.spec.ts
- Journeys: C3, L4, L5. Lib-write `updateSpaceSettings` (flag on/off). Lib: `seedPlatformRoleUsers`, `TestScenarioFactory`, `TestUserManager`, `updateSpaceSettings`, `SpacePrivacyMode`.
- S: Settings link absent/present per flag, settings URL bounces to `/about`, Edit space name offered.
- Weak: the Resource Admin case accepts `restricted.or(About heading)`, and "flag switched OFF again" only checks the URL.

### platform-roles/forum-discussion-controls.spec.ts
- Journeys: J2, J4, L4. UI-write `createDiscussion`. Teardown via raw GQL against `/api/private/non-interactive/graphql`. Lib: `seedPlatformRoleUsers`, `TestUserManager`.
- S: no create errors, the discussion URL and heading, edit/delete offered to Support.
- Weak: the author's "no edit/delete" is checked right after the heading appears (no settle). Support depends on case 1's `discussionUrl`. The category is `getByRole('option').first()`.

### platform-roles/space-visibility-per-role.spec.ts
- Journeys: C10, L3, L7. UI-write visibility via the Licensing inline combobox. Lib: `seedPlatformRoleUsers`, `TestScenarioFactory`, `TestUserManager`.
- S: `visibilityOf` stays `ACTIVE` for Content Full Access, and is polled to `DEMO` for the License Manager, then the combobox shows Demo after a reload.
- Weak: "license USAGE only…" asserts absences via broad regexes (`/wingback/i` count 0) plus 3 inner tabs.

## Group summary
- **STRONG coverage:**
  - F1/F2/F5/F4 **only in code**: the messaging walks are unregistered. Nightly F1/F2 delivery comes from chat-avatars.
  - F6 (chat-avatars US1).
  - G6 (MCP keys mint + revoke, incl. live `/rest/mcp` 401/404).
  - D6/D8 on the space Community tab.
  - H3 role edits with lib read-back.
  - L4 (platform-global-roles nightly; authorization-page-per-viewer manual runner).
  - L1 user admin actions, C5 L1→L0 conversion, C10 visibility (manual runner).
  - J2 create discussion (manual runner).
- **Only USABLE/WEAK:**
  - G1/G2: the profile specs are field inventories. The only edit has no read-back and mutates the shared admin.
  - B2 (dashboard → My Account).
  - E10 memo signing (lib-seeded).
  - L5 client gating (fault-injection only).
  - L3/H4 transfers (no ownership read-back).
  - C3 support-as-admin flag (lib-flipped).
  - L7 (memo licence via lib).
- **Touched but not really covered:**
  - A1: sign-up is driven only as setup.
  - N1: avatar upload is asserted only through the chat surfaces.
  - G3 (trial allowance heading only).
  - I1 (banner only).
  - F3 not touched.
  - G4/G5/G7/G8 not touched beyond tab labels.
  - B5: in-app notifications are only asserted as **zero** via GQL in US3-AS3.
- **Lib helper union (exact names):** `assignRoleToUser`, `CalloutFramingType`, `CalloutVisibility`, `createInnovationPack`, `createOrganization`, `createPngFixture`, `delay`, `deleteInnovationPack`, `deleteMailSlurperMails`, `deleteOrganization`, `digestTestTimeoutMs`, `digestWindow`, `ensureHarnessAdminRoles`, `getGraphqlClient` (ops: `deleteUser`, `GetRoleSetUsersInRoles`, `platformRoleSetUsersInRole`, `PlatformRolesRemoveRoleFromUser`, `PlatformRolesAssignRoleToUser`, `updateUserServiceProfile`, `CreateCalloutOnCalloutsSet`, `GetPlatformLicensePlans`, `AssignLicensePlanToSpace`, `RevokeLicensePlanFromSpace`, `GetSpaceLicenseEntitlements`), `getMails`, `getMailsData`, `getQueueStats`, `getUserToken`, `getVerificationLinkFor`, `graphqlErrorWrapper`, `LicenseEntitlementType`, `OrganizationWithSpaceModel`, `PLATFORM_ROLE_NAMES`, `platformRoleEmail`, `postGraphqlRaw`, `provisionTestIdentities` (via seed), `registerInAlkemioOrFail`, `registerInKratosOrFail` + `verifyInKratosOrFail` (persona fixture), `registerTestUser`, `RoleName`, `seedPlatformRoleUsers`, `SeededPlatformRoleUsers`, `SpacePrivacyMode`, `TestScenarioConfig`, `TestScenarioFactory` (`createBaseScenario`, `cleanUpBaseScenario`), `testConfiguration`, `TestUser`, `TestUserManager` (`populateUserModelMap`, `getUserModelByType`, `users.*`), `UniqueIDGenerator`, `updateSpaceSettings`, `waitForQueuePublishIncrease`.
  - Not via the lib (each needs its own migration check): same-origin raw GraphQL inside `page.evaluate` for `subscribeToPushNotifications`, `updateUserSettings`, `me.notificationsUnreadCount`, `me.notifications`, `me.user.profile.url`, `platform.virtualAssistantAccess`, `lookup.space.level`, `lookup.space.visibility`, `platform.forum.discussions`, `deleteDiscussion`; the REST `/rest/mcp` JSON-RPC.
- **Proposed NEW journey IDs:**
  - `NEW-F-push-emit`: push notification publish per recipient (queue-level), as distinct from F5 email/in-app.
  - `NEW-F-group-membership-edit`: rename group / remove member from a group conversation.
  - `NEW-L-admin-section-guard`: per-role Administration section visibility and URL bounce.
  - `NEW-L-user-email-change`: platform admin login-email change with reason/approver.
  - `NEW-G-mcp-endpoint-auth`: MCP key authenticates/refuses at `/rest/mcp`, and session revocation (server truth beyond G6's UI).

### Migration-relevant takeaways
1. **84 of 134 cases run in no scheduled job.** The messaging walks (22) are the only UI coverage of digest email + push emit, and they wipe the shared inbox. Platform-roles (62) can run on plain develop now; its "needs 027 stack" comment is stale. Neither protects the migration unless it is registered or run by hand.
2. The strongest server-truth checks here bypass the UI for the read: `/rest/mcp` status codes, `getUserIdsInRole`, `visibilityOf`/`levelOf`, mail and push-queue counters. They will survive the server rewrite only if the lib's GraphQL readers and the raw `page.evaluate` queries are migrated too. List them as migration items.
3. Chat-avatars and authz-admin-guard locate elements through Tailwind class and CSS selectors (`div.group`, `div.w-8`, `span.truncate`, `[data-slot=…]`, `ancestor::span[@tabindex="0"]`). If a client change breaks those selectors, the many `toHaveCount(0)` "absent" assertions match nothing and pass vacuously. This is not a server-migration risk, but a client refactor during the migration would silently hollow these specs.
