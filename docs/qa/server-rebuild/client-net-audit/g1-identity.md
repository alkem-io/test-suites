# G1 identity & platform

Repo: `~/repos/qa/test-suites` @ develop `b451c329`. All paths below are relative to `client-web/src/functional-e2e/` unless noted.
Nightly = listed in `config/playwright.config.nightly.ts`. language-offer runs nightly as projects "Language offer setup" + "Language offer" (its own `config/playwright.config.language-offer.ts` is the local runner, with no globalSetup). Nothing else in this group is in any runner except the interactive `playwright.config.ts`. `config/playwright.config.local-stack.ts` does not list any account-deletion or session-revocation file either.

## Files reviewed
- authentication/: authentication-login, -page-verification, -registration, -password-recovery, -cookie-consent, -restricted-access, test.spec.ts, experiment.spec.ts. Page objects: login-page-objects.ts, common-authentication-page-elements.ts, TabsPage.ts
- identity-flows/: signin-, signup-, registration-, verify-page-objects.ts
- account-deletion/: account-deletion-visibility, former-member-activity, profile-removed-notification, us1-delete-own-account, us2-blocked-resources, us3-reauth-freshness. Helpers: account-deletion.helpers.ts, delete-account.helpers.ts
- session-revocation/: session-revocation-cascade, session-revocation-blast-radius. Helper: session-revocation.helpers.ts
- language-offer/: auth.setup.ts, us1-signup-offer, us2-cross-device-persistence, us3-anonymous-offer, us3b-review-fixes, us5-invite-suggestion. Helpers: helpers.ts, authState.ts
- root: home-menus.spec.ts, ts7-platform-smoke.spec.ts, seed.spec.ts, seed-all-top-level, seed-applications, seed-docs, seed-explore-welcome, seed-memberships, seed-minimal, seed-public-space, seed-template-default, seed-unauthenticated, user-profile-generator-seed
- shared: helpers/login.helper.ts, helpers/cookies.helper.ts, fixtures/authenticated-session.fixture.ts, space/pages/LoginPage.ts, my-dashboard/my-dashboard-page-objects.ts (`expectSignedIn`), config/global-setup.ts, config/playwright.config.{nightly,language-offer,local-stack,shared}.ts
- lib (to check dependencies): lib/src/scenario/registration/get-user-token.ts, register-test-user.ts, scenario/platform-roles/harness-admin-roles.ts

**Totals:** 34 spec files plus 1 setup file, 90 cases (19 skipped) plus 2 setup cases. 42 cases run nightly.

**What "signed in" means here (affects every S score):** `expectSignedIn` waits for the banner's "Notifications" button, then "Log in" count 0, then the avatar. In client-web, `isAuthenticated` comes ONLY from the server BFF probe `GET /api/auth/oidc/id-token-hint` returning 200 (`AuthenticationProvider.tsx`). Kratos alone is not enough. So `expectSignedIn` is a server-truth check on the server's OIDC/BFF session. I score it as 3 S.

## Per-spec table
| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| authentication/authentication-login.spec.ts | yes | 5 (0) | A2, A3 | UI (sign-in and sign-out through Kratos UI + BFF) | 18/4/0 | STRONG | Every positive needs a live BFF session. Wrong password checks the Kratos error. Logout checks that the server session is gone |
| authentication/authentication-page-verification.spec.ts | yes | 5 (0) | A1, A2, A4 (form shells only) | none | 0/29/9 | WEAK | Static Kratos form fields, headings and disabled buttons. 9 assertions sit behind `if (count()>0)` |
| authentication/authentication-registration.spec.ts | yes | 2 (0) | A1, A2 | UI (Kratos sign-up, email link, sign-in) | 10/5/0 | STRONG | Real sign-up, verification mail, verify, then sign in. Gap: the Alkemio user/profile is never read back. Leaks a user every run |
| authentication/authentication-password-recovery.spec.ts | yes | 1 (0) | A4, A2 | mixed: recovery through UI; identity seeded via lib | 7/3/0 | STRONG | New password accepted and old one refused with exact 401 `invalid_credentials` from the server endpoint |
| authentication/authentication-cookie-consent.spec.ts | yes | 4 (0) | A6 | none (client cookie) | 0/7/4 | WEAK | Client-only. The 4 "banner stays away" negatives have no settle window |
| authentication/authentication-restricted-access.spec.ts | yes | 5 (0) | A5, A2 | UI sign-in | 7/5/0 | USABLE | Non-admin gets the restricted page and the returnUrl round trip works. No positive control (no admin is ever let in) |
| authentication/test.spec.ts | no | 5 (5) | none (legacy tabs) | lib (createOrganization inside test) | 0/0/0 | NOT-A-NET | `describe.skip`, dead `/checkdefaultcallouts` selectors |
| authentication/experiment.spec.ts | no | 1 (1) | A1 | lib scenario | 0/0/0 | NOT-A-NET | `test.skip`. beforeEach calls banned `deleteMailSlurperMails` |
| account-deletion/account-deletion-visibility.spec.ts | yes | 1 (0) | A8, G6 | none (personas) | 2/3/1 | USABLE | Owner sees the card. Admin is redirected away from another user's Security tab |
| account-deletion/former-member-activity.spec.ts | yes | 1 (0) | A8, NEW-space-activity-feed | lib (member, post, deletion all API) | 2/1/1 | USABLE | Server sentinel "Former member" plus post title rendered in the Activity dialog. Read path only |
| account-deletion/profile-removed-notification.spec.ts | yes | 2 (0) | A8, F5, L4 | lib (roles, settings, deletion all API) | 4/2/1 | USABLE | Case 1 is API-only (good routing check). The UI case can pass on a stale entry from an earlier run |
| account-deletion/us1-delete-own-account.spec.ts | **no** | 6 (0) | A8 | UI (the deletion itself) + lib/DB seed | 12/9/1 | NOT-A-NET | Would be STRONG (UI delete, then login refused, then audit row), but it is unregistered and needs loopback Postgres |
| account-deletion/us2-blocked-resources.spec.ts | **no** | 5 (0) | A8, G3 | mixed: lib spaces; UI delete attempts | 14/3/0 | NOT-A-NET | Would be STRONG (server blocker list, raw-bypass refusal, TOCTOU, 25-item cap). Unregistered, needs DB |
| account-deletion/us3-reauth-freshness.spec.ts | **no** | 2 (0) | A8, NEW-privileged-session-reauth | UI delete + Redis session ageing | 3/2/1 | NOT-A-NET | Unregistered. Rewrites the server's Redis BFF session record directly |
| session-revocation/session-revocation-cascade.spec.ts | **no** | 8 (0) | A7 | lib (admin deleteUser over bearer); UI only for login | 32/0/3 | NOT-A-NET | Excellent wire-level server checks. Not in any runner |
| session-revocation/session-revocation-blast-radius.spec.ts | **no** | 3 (0) | A7, A3 | lib deletion; UI login and logout (with API fallback) | 23/0/2 | NOT-A-NET | Same as cascade: strong design, unregistered |
| language-offer/auth.setup.ts | yes (setup) | 2 setup | A2 | UI sign-in | 0/2/0 | n/a | Setup only. `loginViaCrd` waits for URL `/home`, not for a signed-in signal |
| language-offer/us1-signup-offer.spec.ts | yes | 3 (0) | A9 | none (anonymous) | 1/5/0 | WEAK | The title says sign-up but there is none. Anonymous browser-locale detection only |
| language-offer/us2-cross-device-persistence.spec.ts | yes | 2 (0) | A9, G8 | UI (`updateUserSettings` via settings select) | 5/5/0 | STRONG | UI write, then a fresh context renders Dutch, so the server persisted it |
| language-offer/us3-anonymous-offer.spec.ts | yes | 6 (0) | A9, A6 | none | 5/17/0 | WEAK | Client feature. The server is involved only through the eligible-language Config |
| language-offer/us3b-review-fixes.spec.ts | yes | 3 (0) | A6, A9 | none | 2/11/0 | WEAK | Client robustness against a malformed consent cookie |
| language-offer/us5-invite-suggestion.spec.ts | yes | 2 (0) | A9, D4 | UI (invite sent from dialog); space seeded via lib | 8/9/0 | STRONG | UI invite plus GraphQL read-back of `PlatformInvitation.suggestedLanguage` |
| home-menus.spec.ts | no | 3 (3) | B2, B1 | lib scenario | 0/0/0 | NOT-A-NET | `describe.skip`, pre-CRD selectors ("Tools Menu", "Sign out", `/user/admin-alkemio`) |
| ts7-platform-smoke.spec.ts | no | 4 (0) | NEW-platform-smoke (health + public metadata), A2, B1 | UI sign-in | 10/5/0 | NOT-A-NET | Unregistered. Would be a useful migration smoke test (health, public GraphQL, sign-in) |
| seed.spec.ts | no | 1 (0) | A2 | UI sign-in | 3/0/0 | NOT-A-NET | Duplicate of the login spec. Fallback password `change-me!` differs from everywhere else |
| seed-docs.spec.ts | no | 1 (1) | none | none | 0 | NOT-A-NET | Skipped, dead PersonIcon / "Log In \| Sign Up" selectors |
| seed-unauthenticated.spec.ts | no | 1 (1) | none | none | 0 | NOT-A-NET | `describe.skip`, no assertion |
| user-profile-generator-seed.spec.ts | no | 1 (1) | none | none | 0 | NOT-A-NET | Skipped, dead selectors |
| seed-minimal.spec.ts | no | 1 (1) | none | lib scenario (hooks never run) | 0 | NOT-A-NET | Data seeder, skipped |
| seed-applications.spec.ts | no | 1 (1) | none | lib scenario | 0 | NOT-A-NET | Data seeder, skipped |
| seed-memberships.spec.ts | no | 1 (1) | none | lib scenario | 0 | NOT-A-NET | Data seeder, skipped |
| seed-public-space.spec.ts | no | 1 (1) | none | lib scenario | 0 | NOT-A-NET | Data seeder, skipped |
| seed-all-top-level.spec.ts | no | 1 (1) | none | lib (pack, VC, discussion) | 0/0/4 | NOT-A-NET | Skipped. Asserts only on the lib's own seed model |
| seed-explore-welcome.spec.ts | no | 1 (1) | none | lib | 0/0/4 | NOT-A-NET | Same as seed-all-top-level |
| seed-template-default.spec.ts | no | 1 (1) | none | lib | 0/0/4 | NOT-A-NET | Same as seed-all-top-level |

**Verdict distribution (34 specs):** STRONG 5 · USABLE 4 · WEAK 5 · NOT-A-NET 20. The 20 are 11 seeders (including seed.spec.ts); 3 skipped legacy specs (test.spec.ts, experiment.spec.ts, home-menus.spec.ts); and 6 unregistered specs that would be STRONG or USABLE if they ran (us1, us2, us3, cascade, blast-radius, ts7).

## Per-spec notes

### authentication/authentication-login.spec.ts
- Journeys: A2, A3.
- Writes through UI: sign-in, sign-out (session only). Seeded via lib: nothing in the file. Relies on globalSetup `registerAllTestUsers` for `admin@` and `non.space@`.
- Lib helpers used: none directly.
- Harness personas: `admin@alkem.io`, `non.space@alkem.io`, both hardcoded rather than taken from `TestUserManager`.
- Weakest cases: "invalid credentials show error message" asserts the Kratos text `/email address or password.*invalid/i` (Kratos, not Alkemio server) plus 4 U assertions that the form is still visible.
- Strongest cases: "user can logout and re-authenticate". BFF session goes up, is torn down ("Log in" back), then is re-established.
- Skips/tolerance: `pressSignInButtonSignInPage` does `waitForURL(...).catch(() => {})`, so a stuck login is only caught by `expectSignedIn`, which is fine. `navigateToLoginPageFromMenu` falls back to `goto('/login')` when the header link is not visible. `userMenuAvatar` = `banner.getByRole('button').last()` is positional.
- Defects/risks: there is no negative for an unknown or unverified account.

### authentication/authentication-page-verification.spec.ts
- Journeys: A1, A2, A4 form shells.
- Writes: none. "verify verification page with resend code elements" clicks Resend for a random email, which sends a Kratos mail as a side effect, but asserts only that the button is enabled.
- Lib helpers: `UniqueIDGenerator`.
- Personas: none.
- Weakest cases: all five. These are Kratos-rendered static screens. `verifyRegistrationPageElements`, `verifySignUpPageElements` and `verifySignInPageElements` contain 9 conditional `if (count()>0) expect(...)` assertions (V). `toContainText('Terms')` on `body`. The heading regex `/sign in/i` is loose.
- Strongest: none relative to the Alkemio server. It would only catch a Kratos UI or config regression.
- Risks: Microsoft and LinkedIn buttons are asserted as mandatory. They depend on the environment's Kratos OIDC provider config.

### authentication/authentication-registration.spec.ts
- Journeys: A1 (+A2).
- Writes through UI: Kratos sign-up (email, names, password), email-link verification, first sign-in. The first sign-in is what creates the Alkemio user server-side. Seeded via lib: none.
- Lib helpers: `getVerificationLinkFor`, `UniqueIDGenerator`.
- Personas: disposable `test+<id>@alkem.io`.
- Weakest: "user registration with accept terms first then fill form" is near-duplicate coverage of the first case.
- Strongest: "user successful registration with email verification". Mail arrives for this recipient, Kratos confirms "You successfully verified", and `expectSignedIn` on the new identity proves the BFF accepts it.
- Tolerance: `continueLink.isVisible(...).catch(() => false)` optional branch.
- Defects/risks: (1) The Alkemio user and profile are never read back, so first/last name "Test Alkemio" could be lost and the test still passes. (2) There is no cleanup: every nightly leaks two Kratos identities and two Alkemio users. The comment says deleteUser is missing from the lib, but `postGraphqlRaw` deleteUser is already used by the recovery spec. (3) The serial-mode comment says beforeEach "clears" the inbox. It does not; the comment is stale.

### authentication/authentication-password-recovery.spec.ts
- Journeys: A4 (+A2).
- Writes through UI: recovery request, following the link, saving the new password (Kratos). Seeded via lib: the identity (`registerInKratosOrFail` + `verifyInKratosOrFail`), the user id via `getUserToken` + `postGraphqlRaw('{ me { user { id } } }')`, and teardown via raw `deleteUser(deleteIdentity:true)` as GLOBAL_ADMIN.
- Lib helpers: `getRecoveryLinkFor`, `getUserToken`, `postGraphqlRaw`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `TestUser`, `UniqueIDGenerator`.
- Personas: disposable `recovery.<id>@alkem.io`. Uses `TestUser.GLOBAL_ADMIN` for teardown.
- Weakest: `page.getByText(/sent|check your/i).first()` is a loose confirmation.
- Strongest: "user successful password recovery". Server non-interactive login succeeds with the new password and returns exactly `{ok:false,status:401,message:'invalid_credentials'}` for the old one.
- Risks: the assertion is bound to `POST /api/auth/non-interactive-login`, which is feature-flagged (`ENABLE_NON_INTERACTIVE_LOGIN`), and to its exact error body. The new server must keep the route and payload, or this check must move. Teardown uses `TestUser.GLOBAL_ADMIN`; on the platform-role model this depends on what that persona can still do.

### authentication/authentication-cookie-consent.spec.ts
- Journeys: A6. Client-only (`accepted_cookies` cookie). Irrelevant to the server rewrite.
- Lib: none. Personas: none.
- Weakest: "cookie consent persists after acceptance / page reload / across navigation". `expect(banner).not.toBeVisible()` right after `goto` or `reload` passes immediately on a blank page. There is no positive signal that the page rendered first (conventions §4).
- Strongest: "cookie consent banner appears on first visit" (U).

### authentication/authentication-restricted-access.spec.ts
- Journeys: A5 (+A2).
- Writes: UI sign-in only.
- Lib: none. Personas: `non.space@alkem.io` (hardcoded). The password falls back to `''`.
- Weakest: "unauthenticated user accessing admin area sees restricted page" and "...can navigate to sign-in" are a client-side route gate (U).
- Strongest: "sign in after restricted page attempt returns to restricted page authenticated" (BFF returnUrl plus the authenticated restricted variant). "regular user can return to dashboard" ends on the "My Account" link, which needs a resolved user.
- Risks: a negative with no positive control. If the server stopped returning privileges altogether, a non-admin still sees "Access Restricted". No case shows an admin getting in. `toBeVisible({timeout: 5000})` is tight for the shared cluster.

### authentication/test.spec.ts, authentication/experiment.spec.ts
- Skipped (`describe.skip` / `test.skip`) and not in nightly. test.spec.ts calls `createOrganization` inside a test with no cleanup, and its `TabsPage` targets `/checkdefaultcallouts`, which is dead. experiment.spec.ts runs `deleteMailSlurperMails` in beforeEach, which conventions §2 forbid. Lib: `TestScenarioFactory.createBaseScenarioEmpty / createBaseScenario / cleanUpBaseScenario`, `createOrganization`, `deleteMailSlurperMails`, `TestUser`, `UniqueIDGenerator`. Recommendation: delete both.

### account-deletion/account-deletion-visibility.spec.ts
- Journeys: A8 (entry point), G6.
- Writes: none. Seeded: `createBaseScenarioEmpty` (only populates `TestUserManager.users`).
- Lib: `TestScenarioFactory.createBaseScenarioEmpty`, `TestUserManager`. Local `signIn` (UI) and `gotoUserSecuritySettings`.
- Personas: `TestUserManager.users.globalAdmin`, `TestUserManager.users.spaceMember`.
- Case: "TC-16 — the Delete-account card is owner-only". The admin is redirected to `/settings/profile` (route guard; a `waitForURL` gate) and the card is absent (2 U negatives). The member sees the heading (S), the static copy (U) and the button (S). `expect(subject.nameId).toBeTruthy()` reads back seed data (V).
- Risks: none major. The positive control is present.

### account-deletion/former-member-activity.spec.ts
- Journeys: A8 (consequence), NEW-space-activity-feed.
- Writes: all via lib or raw API: `createBaseScenario` (post-collection callout), `provisionDisposableUser`, `assignRoleToUser(...RoleName.Member)`, raw `createContributionOnCallout` as the contributor, `deleteUserAsGlobalAdmin`.
- Lib: `assignRoleToUser`, `getUserToken`, `TestScenarioFactory`, `RoleName`, `OrganizationWithSpaceModel`, `TestScenarioConfig`, plus session-revocation helpers (`registerInKratosOrFail`, `verifyInKratosOrFail`).
- Personas: admin (`AUTH_ADMIN_EMAIL` or `admin@alkem.io`) signs in through the UI.
- Case: "TC-15 — the activity feed shows Former member and still loads". S: a row named `/Former member/` contains the post title. U: dialog visible. V: the translated-variant negative.
- Risks: `row.first()` on a regex is acceptable because the post title is unique. Admin readability of the space depends on the platform-role model.

### account-deletion/profile-removed-notification.spec.ts
- Journeys: A8, F5 (in-app notification), L4 (platform roles).
- Writes: all lib or raw: `seedPlatformRoleUsers`, `assignPlatformRole`, `setProfileRemovedInApp` (updateUserSettings), `provisionIdentity` (`provisionTestIdentities` or `registerTestUser`), `waitUntilUsable`, `deleteUserAs`.
- Lib: `seedPlatformRoleUsers`, `UniqueIDGenerator`, `getUserToken`, `provisionTestIdentities`, `registerTestUser`, `testConfiguration`, `PlatformRoleName`. Raw operations: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `platform.roleSet.myRoles`, `me.notifications(filter:{types:[PLATFORM_ADMIN_USER_PROFILE_REMOVED]})`, `updateUserSettings`, `deleteUser`, `__type(name:"RoleName")`. Kratos admin `/admin/identities` delete.
- Personas: platform-role single-role users (PLATFORM_ROLES_ADMIN, PLATFORM_USERS_ADMIN) and the persistent pool user `prpool.tc14viewer`.
- Strongest: "TC-14 — the other Users Admin gets the entry, the remover does not". Pure API, no browser: a poll for the new entry plus `expectNoNewIds` over a settle window. This is a good server-routing check but not a UI test.
- Weakest: "TC-14 — no PII, no blank row, list stays populated". The poll matches the static text "A user profile was removed from the platform" (`.first()`), and the persistent viewer can hold entries from earlier runs, so it passes on stale data (V). The "No notifications" and "undefined" negatives are U. The page-content PII scans are S. Loading-status wait uses `.catch(() => {})`.
- Risks: `requirePlatformRoleModel` hard-fails unless the server's `RoleName` enum has `PLATFORM_USERS_ADMIN` and no `GLOBAL_ADMIN`, read by introspection. A rewritten schema must keep these names. `waitUntilUsable` polls `myPrivileges` for UPDATE, a server internal.

### account-deletion/us1-delete-own-account.spec.ts (unregistered)
- Journeys: A8.
- Writes through UI: the self-deletion (AS3, AS6) plus the typed-name confirm. Seeded via lib: `provisionSubject` (Kratos registration, then polls Postgres for `user`/`actor`/`profile` rows). AS6 does a direct SQL `UPDATE account SET "externalSubscriptionID"`.
- Lib: `queryHarnessDb`, `UniqueIDGenerator`, `getUserToken`, `postGraphqlRaw`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `testConfiguration`.
- Strongest: "US1-AS4: the deleted account can never sign in again" (Kratos identity removed). "US1-AS5: exactly one durable, self-initiated account_deleted audit row" (DB). "US1-AS6" (pre-flight shows the subscription and the audit details carry it).
- Weakest: "US1-AS1" and "US1-AS2" are pure U. In "US1-AS3", the `Couldn't delete...` toHaveCount(0) check runs immediately after the click (V).
- Risks: a 6-step serial walk where AS2 to AS5 depend on AS1's page and AS3's one-way door. Direct SQL against `user`, `actor`, `profile`, `account`, `platform_audit_entry` is coupled to the current DB schema and will break on a server rewrite. **Not in nightly or local-stack, so it never runs.**

### account-deletion/us2-blocked-resources.spec.ts (unregistered)
- Journeys: A8, G3 (account resources page).
- Writes through UI: delete attempts (trigger, confirm in AS5). Seeded via lib or raw: `assignPlatformRoleToUser(PLATFORM_BETA_TESTER)`, `createSpace` and `deleteSpace` on the subject's account (×26 for the AS3 file), `provisionSubject` (DB).
- Lib: `getUserToken`, `postGraphqlRaw`, `queryHarnessDb`, `UniqueIDGenerator`.
- Strongest: "US2-AS1" (the dialog names the blocking space, and a raw same-cookie `deleteUser` returns `ACCOUNT_DELETION_BLOCKED`). "US2-AS5" (TOCTOU: a server-side re-check refuses the confirm, and the DB has no audit row). "US2-AS3" (25-item cap, accurate total 26, truncation text, 25 list items).
- Weakest: the start of "US2-AS2" relies on the dialog left open by AS1, plus the `mailto:` href (U).
- Risks: a serial chain on one page. The raw bypass hits `${baseUrl}/api/private/graphql`. Teardown uses `.catch(() => {})` on space deletion, so leaks are silent. Admin `getUserToken(adminEmail)` must be able to create spaces on any account.

### account-deletion/us3-reauth-freshness.spec.ts (unregistered)
- Journeys: A8, NEW-privileged-session-reauth.
- Writes through UI: re-authentication, then deletion. Seeded via lib: `provisionSubject`. The real BFF session is aged in Redis with `findBffSessionIdBySub` + `ageBffSessionCreatedAt`, the sub is read via `getUserToken` + `decodeJwtPayloadUnsafe`.
- Strongest: "US3-AS1/AS2". A stale session leaves the Security tab, the DB shows no audit row, and after re-login the confirm reopens empty.
- Weakest: in "US3-AS3", the error-text count-0 check runs right after the click (V).
- Risks: depends on the server's internal Redis session layout. That layout is not a contract, so this spec cannot survive the rewrite as written.

### session-revocation/session-revocation-cascade.spec.ts (unregistered)
- Journeys: A7.
- Writes: deletion via raw bearer `deleteUser(deleteIdentity:false)` as admin. The UI is only `loginViaCrd`, three times in three contexts plus one more later.
- Lib: `getUserToken`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `testConfiguration`, `UniqueIDGenerator`. Raw `me { user { id } }` and `deleteUser`.
- Personas: disposable `test+cascade-<id>@alkem.io`. Admin `AUTH_TEST_HARNESS_EMAIL` or `admin@alkem.io`.
- Strongest: "SRB-G1" (the first request after deletion returns 401, with a proven-alive precondition), "SRB-E1" (all 3 sessions die), "SRB-E2" (a session created after revocation works, `revoked_at` treated as a timestamp), "SRB-N1" (no token material or PII on the wire).
- Weakest: in "SRB-R2", `expect(result.json?.data?.me?.id).not.toBe('me-')` always passes on a 401 body (V). In "SRB-G3", the "Log out" menuitem count 0 is always true with the menu closed (V). In "SRB-N1", `capturedWireBodies.length > 0` is weak.
- Risks: an 8-case serial one-way door. It pins server internals: the `me-` anonymous id, `extensions.error_code ∈ {account_deleted, subject_revoked}`, the `HttpExceptionFilter` 401 envelope, the `alkemio_session` express-session cookie, `/api/auth/oidc/id-token-hint`, `/api/private/graphql`. It uses `waitForTimeout(2000)` (lint-disabled). `assertSecureProbeOrigin` refuses non-https non-loopback origins, so it would throw on an http test cluster.

### session-revocation/session-revocation-blast-radius.spec.ts (unregistered)
- Journeys: A7, A3 (sign-out with fallback).
- Writes: same as cascade.
- Strongest: "SRB-E3 — blast radius" (the bystander's `me.user.id` still resolves). "SRB-N2 — no existence oracle" (a fabricated cookie gives byte-identical output to no cookie).
- Weakest: in "SRB-E3", the `if (victimMe.status === 200)` branch is conditional. In "SRB-E4", `signOutThroughTheApp` swallows a UI logout failure and falls back to `GET /api/auth/oidc/logout`, so A3 is not really asserted.
- Risks: same server-internal coupling as cascade (`'me-'`, cookie format, file/line references in comments).

### language-offer/auth.setup.ts
- Signs in `admin@alkem.io` and `non.space@alkem.io` via `loginViaCrd` and persists storage state to `client-web/.auth/language-offer-*.json`. It asserts the state carries no language keys (U). `loginViaCrd` waits only for URL `/home`, not `expectSignedIn` (conventions §3).

### language-offer/us1-signup-offer.spec.ts
- Journeys: A9, anonymous only. **No sign-up despite the title.** The file header admits that AS1, AS2, AS3 and AS8 are not covered.
- Lib: none. Personas: anonymous.
- Strongest: "US1-AS6 — nl-BE browser is offered Dutch". The banner only appears if the server Config lists `nl` as eligible.
- Weakest: "US1-AS5" and "US1-AS7" assert footer = English plus a 3 s no-banner window. Both are client-side (U).

### language-offer/us2-cross-device-persistence.spec.ts
- Journeys: A9, G8 (general settings: interface language).
- Writes through UI: the language select fires `updateUserSettings`; the response is awaited and `errors` must be undefined. Reset to English goes through cookie-session `gql` (`${BASE_URL}/graphql`) in afterEach.
- Lib: none. The local `gql` uses `page.request` cookies against `ALKEMIO_GRAPHQL` or `/graphql`.
- Personas: `non.space@alkem.io` via `MEMBER_STATE`.
- Strongest: "US2-AS5 — settings language change is served to a fresh device". A brand-new context with no language in storage renders Dutch, so the server persisted the setting.
- Weakest: the device-1 footer check after the switch (client-side).
- Risks: **it mutates a shared harness persona** (forbidden by conventions §2). If the afterEach reset fails, `non.space` stays Dutch and every text-locator spec using that persona goes red. `deriveUserSlug` uses a CSS `a[href*="/settings/account"]` `.first()`.

### language-offer/us3-anonymous-offer.spec.ts and us3b-review-fixes.spec.ts
- Journeys: A9, A6. Client-side feature: banner after consent, session-only memory, footer endonym, localStorage nulls, malformed-cookie robustness.
- Lib: none. Personas: anonymous.
- S is limited to "banner visible", which needs the server Config eligible set. Everything else is U.
- Weakest: "US3-SC005" (footer reads English), "US3-AS2b" (a 3 s negative), "corr-client-2" and "corr-client-2b" (error-boundary absence).
- Note: these are well-built client regression tests but give near-zero server protection.

### language-offer/us5-invite-suggestion.spec.ts
- Journeys: A9, D4 (platform invitation by email).
- Writes through UI: the invite dialog sends an invitation to a new email with or without a suggested language. Seeded via lib: `TestScenarioFactory.createBaseScenario` (space). Cleanup: cookie `gql deletePlatformInvitation`, then `cleanUpBaseScenario`.
- Lib: `TestScenarioConfig`, `TestScenarioFactory`, `OrganizationWithSpaceModel`. Raw: `platform.configuration.language { eligible default }`, `lookup.roleSet(ID).platformInvitations { id email suggestedLanguage }`, `deletePlatformInvitation`.
- Personas: `admin@alkem.io` via `ADMIN_STATE`.
- Strongest: "US5-AS1 — mark invitee as expecting Dutch and send". The option list exactly equals "No preference" plus the server's eligible set, "Invitation sent" appears exactly, and the read-back gives `suggestedLanguage === 'nl'`. "US5-AS6" checks the read-back is null.
- Risks: `Date.now()` emails rather than `UniqueIDGenerator`. When run through `playwright.config.language-offer.ts` there is no globalSetup, so `createBaseScenario` depends on the admin's harness roles already existing.

### home-menus.spec.ts
- `describe.skip` with 3 cases ("Tools Menu Navigation", "User Menu Navigation", "Left Sidebar Menu Navigation"). Pre-CRD selectors (Tools Menu, `img 'User Menu'`, 'Sign out', `/user/admin-alkemio`); the comment admits "selectors migrated only". It would fail if unskipped. Lib: `TestScenarioFactory`, `TestUser`, `OrganizationWithSpaceModel`. Recommendation: delete, or rewrite as B2.

### ts7-platform-smoke.spec.ts (unregistered)
- Journeys: NEW-platform-smoke (server readiness `/health/ready`, public GraphQL `platform.metadata.services`), A2, B1 (weak).
- Writes: none. Lib: none.
- Strongest: "US2-AS1" (health reports `ok`) and "US2-AS2" (the public metadata version matches semver). Both are cheap, direct server checks that would be valuable as a migration canary.
- Weakest: in "US2-AS3", `expect(page.url()).toContain(baseUrl)` does not retry (U). "US2-AS4" asserts an "Explore Spaces" heading and button that render even with zero spaces (U).
- Risks: the health URL defaults to `http://localhost:4000` (local only). There is a hand-rolled `setTimeout` retry loop that sidesteps the lint ban.

### seed*.spec.ts and user-profile-generator-seed.spec.ts
- These are data seeders or Playwright-codegen leftovers, not tests. 10 of 11 are skipped. The file-level `beforeAll` (`createBaseScenario`) never runs because Playwright skips hooks when every test in scope is skipped. seed-all-top-level, seed-explore-welcome and seed-template-default assert only on the lib's returned model (`scenarioSetupSucceeded`, `innovationPack.id`), which is V. seed-docs, seed-minimal, seed-applications, seed-memberships, seed-public-space and user-profile-generator-seed use dead pre-CRD selectors (`PersonIcon`, "Log In | Sign Up"). seed.spec.ts is live but duplicates the admin login case. Lib: `TestScenarioFactory`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUserManager`, `TestUser`, `SpacePrivacyMode`, `CommunityMembershipPolicy` (client-lib). The scenario config also uses the `innovationPack`, `virtualContributors` and `platformDiscussion` options. All NOT-A-NET.

### Shared harness (helpers/fixtures/global-setup)
- `config/global-setup.ts`: `clearPersonaSessions()`, then (if `testConfiguration.registerUsers`) `registerAllTestUsers()`. **That call swallows every per-user error with `console.error`.** Then `ensureHarnessAdminRoles()` and `registerTestUser` for `US3_REGISTERED_USER_NAMES` (imported from organization-space-invitations helpers). Lib: `ensureHarnessAdminRoles`, `registerAllTestUsers`, `registerTestUser`, `stringifyConfig`, `testConfiguration`.
- `fixtures/authenticated-session.fixture.ts`: `ensurePersonaState` logs in once per persona per run via `LoginPage.login`, which waits for URL `/home` only, and caches to `.auth/persona.*.json`. `ensureIdentityExists` uses `registerInKratosOrFail` + `verifyInKratosOrFail` and treats Kratos message id 4000007 as "already exists". The shared-singleton `createAuthenticatedSessionFixture` is used by the seeders.
- `helpers/login.helper.ts`: `fillSecret` (sets the value via evaluate so the password stays out of reports) and `loginViaCrd` (no signed-in wait; swallows the new-design dialog click). `helpers/cookies.helper.ts`: `grantCookieConsent` and `acceptCookiesIfVisible`, client-only.
- **Lib depends on these server routes:** `getUserToken`, which nearly every seed and teardown path calls, is `POST {server}/api/auth/non-interactive-login`. That route is feature-flagged (`ENABLE_NON_INTERACTIVE_LOGIN` + signing key, non-production only) and returns an HS256 `api_token` that the API must accept as a bearer. `registerInKratosOrFail` and `verifyInKratosOrFail` use Kratos public plus the MailSlurper verification link. `provisionTestIdentities` uses Kratos admin `/admin/identities`. `queryHarnessDb` and `find/ageBffSession*` need loopback Postgres or Redis. The client's signed-in state needs `/api/auth/oidc/id-token-hint`. Raw cookie GraphQL goes to `/api/private/graphql` (session-revocation, us2) and `/graphql` (language-offer `gql`); public GraphQL goes to `/api/public/graphql` (ts7).

## Group summary
- **Journeys with STRONG coverage (nightly):** A1 (registration, Kratos-level plus BFF sign-in), A2 (sign-in), A3 (sign-out), A4 (password recovery with a server login proof), A9 for the persisted account preference (US2) and the invite-time suggestion (US5), D4 (one email invitation, through the US5 walk).
- **Journeys only USABLE/WEAK:** A5 (restricted access, no positive control), A6 (cookie consent, client-only, vacuous negatives), A9 for anonymous detection (client-only), A8 nightly (visibility, Former-member sentinel, notification routing; **the deletion itself is never done through the UI nightly**), F5 (one in-app notification type, stale-tolerant UI check), G6, G8.
- **Journeys this group touches but does not really cover:** A7 session revocation (strong specs, but unregistered), A8 UI self-deletion, blocked-resources, re-auth freshness (strong but unregistered, and DB/Redis-coupled), B1/B2 home and menus (skipped, dead selectors), L4 (only used as API setup), NEW-platform-smoke (ts7 unregistered).
- **Lib helper union (exact names):** `registerInKratosOrFail`, `verifyInKratosOrFail`, `getUserToken`, `postGraphqlRaw`, `getVerificationLinkFor`, `getRecoveryLinkFor`, `deleteMailSlurperMails`, `UniqueIDGenerator`, `TestUser`, `TestUserManager`, `TestScenarioFactory` (`createBaseScenario`, `createBaseScenarioEmpty`, `cleanUpBaseScenario`), `TestScenarioConfig`, `TestScenarioNoPreCreationConfig`, `OrganizationWithSpaceModel`, `assignRoleToUser`, `RoleName` (tests-lib generated schema), `PlatformRoleName`, `seedPlatformRoleUsers`, `provisionTestIdentities`, `registerTestUser`, `registerAllTestUsers`, `ensureHarnessAdminRoles`, `stringifyConfig`, `testConfiguration`, `createOrganization`, `queryHarnessDb`, `findBffSessionIdBySub`, `ageBffSessionCreatedAt`, `decodeJwtPayloadUnsafe`. From `@alkemio/client-lib`: `SpacePrivacyMode`, `CommunityMembershipPolicy`.
  - Raw GraphQL documents sent outside the lib also need migrating: `me{user{id}}`, `me{user{id profile{displayName} authorization{myPrivileges}}}`, `deleteUser(deleteData:{ID,deleteIdentity})`, `createContributionOnCallout`, `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `platform{roleSet{myRoles}}`, `updateUserSettings` (notification + language), `me{notifications(filter:{types})}`, `__type(name:"RoleName")`, `createSpace`, `deleteSpace`, `lookup{roleSet(ID){platformInvitations{...suggestedLanguage}}}`, `deletePlatformInvitation`, `platform{configuration{language{eligible default}}}`, `platform{metadata{services{name version}}}`.
  - Direct SQL: `user`, `actor`, `profile`, `account."externalSubscriptionID"`, `platform_audit_entry`. Redis: BFF session by `sub`.
- **Proposed NEW journey IDs:** NEW-space-activity-feed (Recent Activity dialog attribution), NEW-privileged-session-reauth (fresh-session gate on destructive actions), NEW-platform-smoke (server readiness plus public metadata canary).
- **Top recommendations for the migration net:**
  1. Register session-revocation, us1/us2 and ts7 in nightly, rewritten to assert through GraphQL or the UI instead of SQL, Redis or server-internal error codes. This is the cheapest large gain.
  2. Add an Alkemio profile read-back and cleanup to registration.
  3. Add a positive control to restricted access (an admin gets in).
  4. Delete the 11 seeders and test/experiment/home-menus.
