# Coverage map

What `test-suites` actually covers, by area — so the next plan's §4 starts from
a warm baseline instead of a blank grep.

**Read before the coverage analysis. Append after it.** Every row is something
someone opened and read. A row here does *not* excuse you from checking the file
when it matters to a verdict — it tells you where to look, and what you expected
to find.

Format: area → the suites that touch it, what they assert, and the gaps proven
at the time. Cite the plan that established each row.

---

## Innovation flow / phases

*Established by `021-flow-state-post-layout`, 2026-07-27, on branch
`feat/030-move-subspace-parent`.*

| What | State |
|---|---|
| `server-api/src/functional-api/innovation-flow/` | **Helpers only — no spec file.** `innovation-flow.request.params.ts` has `getInnovationFlowStatesWithIds` (selects `id`, `displayName`) and `updateInnovationFlowState(id, displayName, description='Updated state')`. |
| ⚠ That helper **forces both `displayName` and `description`** | It cannot express a settings-only or partial update. Widening it is a prerequisite for any flow-state settings case. |
| `lib` GraphQL documents for innovation flow | `InnovationFlowStateData` selects only `description` + `displayName`; the states query selects `id`/`displayName`. **No `settings` selected anywhere.** |
| Callout ↔ flow-state transfer | `server-api/.../callout/transfer/transfer-callout-{changed-flow,template-flow,flow-state}.it-spec.ts` — flow-state matching on transfer, rename resync, template application. Reads `classification.flowState.tags[0]`. |
| Phase menu / default post template (UI) | `client-web/.../default-template/default-template-per-flow-state.spec.ts` — kebab `button "Column actions"` → `menuitem "Post Template"` → intermediate dialog → template picker. |
| **Per-phase layout settings** (`descriptionDisplayMode`, `showPublishDetails`) | **No coverage at any level in `test-suites`.** |

## Public / anonymous access

*Established by `021-flow-state-post-layout`, 2026-07-27.*

| What | State |
|---|---|
| `client-web/.../public-space/anonymous-user-access-public-space.spec.ts::1.2` | A genuinely anonymous visitor opens a PUBLIC space and sees the phase tabs. **The only live anonymous-render guard in the repo** — several risks lean on it incidentally. |
| `client-web/.../public-space/non-member-{tab,subspace}-navigation.spec.ts` | Same tab set as an authenticated non-member. |
| `server-api/.../graphql-guard/graphql-guard-public-private-access.it-spec.ts` | PUBLIC vs PRIVATE `myPrivileges` across all roles **and anonymous** — but the query selects only `nameID` + `authorization`. ⚠ **It never descends into `collaboration.innovationFlow`**, so it is not evidence about nested field reads. |

## Post / callout rendering

*Established by `021-flow-state-post-layout`, 2026-07-27.*

| What | State |
|---|---|
| Publisher / avatar / author / timestamp assertions **on a post card** | **0 hits** across the repo. All avatar matches are the header user menu, profile pages, or poll voters. |
| `client-web/.../callouts/0.9callout-viewing.spec.ts` | Draft/published visibility for admin and member; locates posts by exact heading role. |
| `client-web/.../contributors-callout/0.1contributors-callout.spec.ts` | 12 tests on the Contributors framing; cards by `heading` + `region "Contributors"`. |

## Space settings

*Established by `021-flow-state-post-layout`, 2026-07-27.*

| What | State |
|---|---|
| `client-web/.../space/pages/SpaceSettingsPage.ts` | Page object; `layoutTab` = `tab "Layout"`. |
| Space-wide `calloutDescriptionDisplayMode` | **Never asserted anywhere in `test-suites`** — 0 hits outside `lib/src/core/generated/*`. The setting shipped, was deprecated, and was replaced without this repo ever covering it. |

## User settings

*Established by `029-detect-signup-language`, 2026-07-29, on `origin/develop` = `4d26afc3`.*

| What | State |
|---|---|
| `lib/.../fragments/user/userSettingsData.graphql` (`userSettingsFragment`) | The single fragment every settings assertion reads through. Selects `communication`, `privacy`, `notification` **only**. Any new settings block must be added here first or it is invisible to every test. |
| `server-api/.../contributor-management/user/user.request.params.ts::updateUserSettings` | `(userID, UpdateUserSettingsEntityInput, TestUser)` — **already generic**, no signature change needed for a new settings field. Contrast with the 021 innovation-flow helper, which forced its arguments. |
| Who uses `updateUserSettings` today | 20 files, **all** notification/push-notification preference specs. None asserts strict equality over the whole settings object, so adding fields does not break them. |
| Language settings (`language`, `languageOfferAnswered`) | **0 coverage in `test-suites`.** |
| User settings **page** in e2e | **0 specs.** `client-web/.../user-profile/` has 4 specs (profile access, direct URL, basic info, view) and none opens the settings tab. |

## Invitations / roleset

*Established by `029-detect-signup-language`, 2026-07-29.*

| What | State |
|---|---|
| `server-api/.../roleset/invitations/invitation-{external,contributors,subspace-admin}.it-spec.ts` | Invitation lifecycle, `PlatformInvitation` (email/external) create + delete, admin permissions. |
| ⚠ `lib/.../mutations/access/inviteForEntryRoleOnRoleSet.graphql` + `invitation.request.params.ts::inviteForEntryRoleOnRoleSet` | **Fixed 5-variable signature** (`roleSetId`, `invitedActorIds`, `invitedUserEmails`, `welcomeMessage`, `extraRoles`). Any new field on `InviteForEntryRoleOnRoleSetInput` needs both widened before it can be tested — the same trap as 021's flow-state helper. |
| ⚠ `lib/.../fragments/access/invitationData.graphql` / `invitationDataExternal.graphql` | Thin. `InvitationData` = id/state/nextEvents/isFinalized/lifecycle/createdBy/actor/authorization. `PlatformInvitationData` = id/email/authorization/profileCreated/firstName/lastName. **Neither selects `createdDate`**, which several determinism assertions need. |

## Registration / signup

*Established by `029-detect-signup-language`, 2026-07-29.*

| What | State |
|---|---|
| **`lib/src/scenario/registration/`** | **Ad-hoc per-user registration is available and exported** from `@alkemio/tests-lib`: `registerTestUser(userName)`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `registerInAlkemioOrFail(first, last, email)`, `getUserToken(email)`. This makes the **real** `finalizeUserRegistration` / `processPendingInvitations` path reachable from `server-api` — not just from the browser. |
| Alkemio account creation | Happens lazily on the first authenticated call; `registerInAlkemioOrFail` triggers it with `{ me { user { id } } }`. |
| ⚠ `registerTestUser` swallows Kratos 4000007 ("already exists") | A re-used email silently becomes a no-op that still passes. Always use `UniqueIDGenerator.getID()` in the address, and assert on the returned user `id`. |
| ⚠ Kratos rejects parallel registration flows | `registerAllTestUsers` documents this. Any file registering users must run serially. |
| `client-web/.../authentication/authentication-registration.spec.ts` | **Full signup e2e already works**: unique email → form → password → MailSlurper `getVerificationLink` → verified → dashboard. Reusable page objects in `identity-flows/`. |
| ⚠ No `deleteUser` helper exists | Registered test accounts accumulate; the registration spec documents this as accepted. |

## i18n / language

*Established by `029-detect-signup-language`, 2026-07-29.*

| What | State |
|---|---|
| Language behaviour at any level | **0 coverage.** `rg -il 'language\|locale\|i18n'` across `server-api/src`, `client-web/src`, `lib/src` → 8 hits, all prose or unrelated. |
| `client-web/playwright.config.ts` | **Sets no `locale`** → every existing spec runs at Chrome's `en-US`. This is why the Dutch offer banner never appears in the current suite. A future global `locale` would break several specs at once. |
| Browser-language staging | `test.use({ locale })` / `browser.newContext({ locale })` sets `navigator.languages` **and** `Accept-Language` — the supported way to drive detection headlessly. |
| Supported interface languages | `en nl es bg de fr`, hard-coded **twice**: server `src/common/constants/supported.languages.ts`, client `src/core/i18n/config.ts::supportedLngs`. No parity check anywhere. |

## Platform configuration

*Established by `029-detect-signup-language`, 2026-07-29.*

| What | State |
|---|---|
| `server-api/.../configuration/configuration.it-spec.ts` | One test, `toStrictEqual` over the whole `platform.configuration` object. |
| ⚠ It is **not** a full-config guard | `lib/.../full-configuration.graphql` is a hand-written selection set, so any newly-shipped `Config` field is silently absent from both query and assertion and the test stays green. It has already missed `Config.language`. |
| ⚠ The file carries a `test.only` | Any test added to it will never run until that is removed. |
| Anonymous request pattern | `graphqlErrorWrapper(callback)` **with no role argument** → `authToken` undefined, header omitted. Pattern lives in `graphql-guard/graphql-guard-public-private-access.it-spec.ts`. |

## Cookie consent

*Established by `029-detect-signup-language`, 2026-07-29.*

| What | State |
|---|---|
| `client-web/.../authentication/authentication-cookie-consent.spec.ts` | 4 tests: banner on first visit; consent persists across acceptance, reload, and navigation. Locators in `common-authentication-page-elements.ts`. |
| `client-web/.../helpers/cookies.helper.ts::acceptCookiesIfVisible` | Tolerant helper (clicks "accept all cookies" if present) — reuse it rather than re-rolling one. |
| Consent categories | `technical` + `analysis` only. A `preference` category was introduced and then removed during 029; `client-web`'s `useAlkemioCookies.test.ts` now asserts `not.toContain('preference')`. |
| Interaction with other banners | Anything gated on "consent resolved" reads `cookies[ALKEMIO_COOKIE_NAME] !== undefined`. |

---

## Standing observations

- **A shipped feature having zero `test-suites` coverage is the norm, not the
  exception.** Two consecutive features (space-wide collapse, then per-phase
  layout) reached production with none. Budget the coverage analysis expecting
  to find nothing, and treat a hit as the surprise.
- **Owning-repo unit suites are often strong where `test-suites` is empty.**
  Check `server/src/**/*.spec.ts` and `client-web/src/**/*.test.tsx` before
  proposing a case — the right verdict is frequently "covered at unit level, no
  new system case needed".
- **Forge-generated `repos.yaml` verification blocks name acceptance specs that
  may never have been written.** Check whether `persist_spec_to` paths actually
  exist; in 021 they did not, and `forge-run.md` recorded the walks as never
  machine-run. **In 029 it was worse:** `forge-run.md` explicitly claimed the specs
  *were* written and were sitting uncommitted in the `test-suites` clone — and
  `git log --all -- <path>` returned nothing. Verify with
  `git log --all -- <path>` plus `git status`, not by trusting the ledger.
- **Read the forge ledger for what it says was *not* verified.** Both 021 and 029
  had whole tracks blocked by environment (`ENABLE_NON_INTERACTIVE_LOGIN` absent →
  the authenticated `gql-live` probes and the entire `test-suites` track never ran
  in 029). Those blocked tracks are where the uncovered risk concentrates.
- **A forge ledger can be stale about its own feature.** 029's Phase-R security
  verdict describes a consent design that was removed two days later, before merge.
  Check the ledger's late sections ("post-merge-prep change", "post-ship
  remediations") before quoting an earlier one.
- **A green unit suite is not evidence the feature runs in production.** 029's
  registration seeding was dead on the real signup path (`User.settings` is
  `eager:false` and unloaded) while 7281 server unit tests passed — the tests
  injected synthetic settings. When a diff relies on a lazily-loaded relation, that
  is exactly where a system-level case earns its cost.
