# G4 templates, form callouts, forum

Repo `~/repos/qa/test-suites` @ `b451c329` (develop). All paths below are under `client-web/src/functional-e2e/`.

## Files reviewed
- `templates-CRD/instructions.md`
- `templates-CRD/template-types/callout-tests.spec.ts` (1260 lines, 69 cases)
- `templates-CRD/template-types/community-guidelines-template.spec.ts`
- `templates-CRD/template-types/post-template.spec.ts`
- `templates-CRD/template-types/whiteboard-template.spec.ts`
- `templates-CRD/template-types/poll-form-save-as-template.spec.ts`
- Helpers: `section-helpers.ts`; `forms/{template-form,template-form.models,rich-text,post-template-form,whiteboard-template-form,community-guidelines-template-form}.ts`; `forms/whiteboards/whiteboard-dialog.ts`; `forms/callout/{callout-template-form,callout-template-form.models,callout-template-framing}.ts`; `forms/callout/collection/index.ts`; `verify/{template-verify,verify-opened-template,open-template,callout-template-verify,post-template-verify,whiteboard-template-verify,community-guidelines-template-verify}.ts`; `usage/callout-template.use.ts`; `usage/contributions/callout-template.use.{contributions,links,posts,memos,whiteboards}.ts`
- `form-callout-framing/us1-create-form.spec.ts`, `us2-submit-response.spec.ts`, `us3-response-visibility.spec.ts`, `us4-notifications.spec.ts`, `us4a-review-responses.spec.ts`, `form-callout-framing-test-plan.md`, runner `client-web/config/playwright.config.form-callout-framing.ts`
- `forum-categories/edit-dialog-recategorise.spec.ts`, `forum-categories/locale-labels.spec.ts`
- Shared: `fixtures/authenticated-session.fixture.ts` (`createAuthenticatedSessionFixture`, `createPersonaTest`, `ensurePersonaState`, `ensureIdentityExists`), `language-offer/helpers.ts` (`gql`, `languageConfig`), `helpers/login.helper.ts` (`fillSecret`), `helpers/cookies.helper.ts` (`acceptCookiesIfVisible`)

## Per-spec table
| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| templates-CRD/…/callout-tests.spec.ts | yes (Templates) | 69 (0 skipped; 10 run under a hidden `test.fail`) | C8, E1, E4, E2(read), E13(poll/form render) | UI-write (template create, callout-from-template, contributions); lib seeds only the space | per case ≈ S 14–40 / U 6–10 / V 0–2 | STRONG | Every case creates a callout template in the UI and publishes a callout from it, then reads back preview, feed, edit-dialog settings and a contribution; but 10 whiteboard-framing cases stop at a known-failing assert and 4 comments-only cases assert nothing that differs from their twin |
| templates-CRD/…/community-guidelines-template.spec.ts | yes | 4 (0; delete commented out) | C8, C9 | UI-write create/edit; CG "use" never saved | S 9 / U 5 / V 0 | STRONG | Create + edit survive a reload in the preview; apply-to-community fills the form but never saves |
| templates-CRD/…/post-template.spec.ts | yes | 4 (0; delete commented out) | C8 | UI-write create/edit | S 6 / U 6 / V 0 | STRONG | Create + edit survive reload; the post template is never used to create a post |
| templates-CRD/…/whiteboard-template.spec.ts | yes | 4 (0; delete commented out) | C8, E8 (editor only) | UI-write create/edit | S 8 / U 7 / V 1 | USABLE | Metadata round-trips; drawing content and template application are unverifiable (canvas) and `img.first()` is loose |
| templates-CRD/…/poll-form-save-as-template.spec.ts | yes | 2 (0) | C8, E1, E13, NEW-save-post-as-template | mixed: source Posts lib-seeded; save-as-template, use-template, publish, vote, submit all UI | S 40 / U 4 / V 0 | STRONG | UI writes read back through GraphQL (definition, OPEN, totalVotes 0→1, responses 0→1) |
| form-callout-framing/us1-create-form.spec.ts | NO (own runner, needs Kratos admin) | 13 (0) | E1, E2, E13, I3, C5-ish (VC conversion) | mixed: builder create + edit/close/collapse/type-change via UI; fixtures by raw GraphQL | S ≈ 70 / U ≈ 50 / V ≈ 4 | STRONG (not a net today: unregistered) | UI-built Form read back field by field; edits polled via GraphQL; but AS11 is pure layout |
| form-callout-framing/us2-submit-response.spec.ts | NO | 14 (0) | E13, A5-ish (non-member/anonymous), E2 (settings via API) | mixed: submit/withdraw via UI; Form settings changes via raw GraphQL | S ≈ 100 / U ≈ 35 / V 1 | STRONG (not a net today) | Submit/withdraw/resubmit in the UI, each pinned by a `lookup.calloutFormResponses` read-back; 3 cases API-only |
| form-callout-framing/us3-response-visibility.spec.ts | NO | 8 (0) | E13, E2, D8 (demoted admin), A5 | mixed: widen-visibility + parent-member submit via UI; rest raw GraphQL | S ≈ 85 / U ≈ 15 / V 0 | STRONG (not a net today) | Read scope per role pinned by UI absence + API lookup with positive controls |
| form-callout-framing/us4-notifications.spec.ts | NO | 8 (2 conditional skips: AS6, AS8) | F5, B5, F4 | lib/raw-API-write (all submits via GraphQL); UI only reads bell + settings | S ≈ 24 / U 1 / V 1 | USABLE (not a net today) | Notification assertions are server-truth (MailSlurper subjects, in-app payload, push count) but nothing is written through the UI |
| form-callout-framing/us4a-review-responses.spec.ts | NO | 5 (0) | E13 (review), NEW-form-response-moderation | mostly raw-API seeds; delete via UI (AS3) | S ≈ 45 / U ≈ 7 / V 0 | STRONG (not a net today) | Review table content, pagination (50/120) and UI delete pinned against API totals |
| forum-categories/edit-dialog-recategorise.spec.ts | yes (Forum categories) | 1 (0) | J4, J1 | mixed: discussion lib/raw-API seeded + deleted; recategorise via UI | S 9 / U 4 / V 0 | STRONG | UI update checked on the mutation response, the back-link and both category listings |
| forum-categories/locale-labels.spec.ts | yes | 1 (0) | J1, G8 (language via API) | raw-API write (language setting); UI only reads | S 0–3 / U 3–6 / V 1 | WEAK | Labels are client i18n strings; only the `nl` pass (if `nl` is eligible on the env) depends on the server persisting the language |

## Per-spec notes

### templates-CRD/template-types/callout-tests.spec.ts
- Journeys: C8 (create callout/collaboration-tool template: 5 framings × 5 response types × comments, plus 16 poll-settings combos, references, Form), E1 (publish a callout from the template via `Add Post` → `Find Template`), E4 (as space admin: add link, post, memo [create + rename + edit body], whiteboard [create + rename]), E2 (Edit dialog opened read-only to read settings back), E13 (poll/form rendering only, no vote/submit).
- Writes through UI: template create (Save); callout publish from template; one contribution per response type. Seeded via lib: the space only (`TestScenarioFactory.createBaseScenario`).
- Lib helpers used: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `TestUser` (`SPACE_ADMIN`, `SPACE_MEMBER`), `TestUserManager.users.spaceAdmin.email`, `OrganizationWithSpaceModel`; indirectly through the session fixture: `registerInKratosOrFail`, `verifyInKratosOrFail`.
- Personas: space.admin (session); space.member is a scenario member but never acts.
- Weakest cases:
  - `3`, `4`, `11`, `12`, `19`, `20`, `27`, `28`, `35`, `36` (every Whiteboard framing): `verifyCalloutTemplate` calls `test.fail(true, 'client-web#10283 …')` and then asserts the preview `img`. The assertion fails as expected and ends the case, so `verifyPollSettings`, `verifyCalloutTemplateUsage` and every contribution flow never run. Whiteboard framing × {Links, Posts, Memos, Whiteboards} has zero in-feed/contribution coverage while these cases report as passing.
  - `2`, `4`, `6`, `8`, and by design `42`–`58`: `commentsEnabled` (callout-level "Allow comments") is asserted only inside `verifyContributionSettings`, which returns early for `responseType: 'none'`. So `2`/`6`/`8` assert exactly what `1`/`5`/`7` assert; the comments flag is never read back.
  - `9b`, `17b`, `25b`, `33b` (admins off): the contribution check is `expect(addXButton).not.toBeVisible()`, a negative on a name-based locator. It also passes if the button is renamed. The admins-switch read-back in the Edit dialog is still S.
  - "Members can add" is only read back as a switch state; no case acts as space.member, so member permission to contribute is never exercised.
- Strongest cases: `17`–`17f` (posts: default title/description prefilled from the server template, post created and opened, `Discussion` heading toggled by enableCommentsOnPosts, round-tripped switches); `25`/`29` (memo create + rename + body autosave, re-read on the card); `42`–`57` (each poll flag read back in the Edit → Poll Settings dialog AND observed on the published poll: radio vs checkbox, "Add your own option", "Anonymous poll", "(0)" tallies); `58` (Form preview lists the numbered questions, type badges and Required; builder prefilled; published Form box with one "Submit Form"); `41` (callout references reach the feed with the exact href).
- Skips / soft / tolerance: hidden `test.fail` (above); `createNewItem.isVisible().catch(() => false)` inside a `toPass` retry; `moreOptions.isVisible().catch(() => false)` and discard-alert `isVisible({timeout:500}).catch` in `verifyContributionSettings`; `openWhiteboardEditor` `isVisible().catch`.
- Defects / risks: `test.describe.serial` over 69 cases means the first hard failure skips every later case (the live run noted case 25 failing). The usage URL hard-codes `?tab=4`. The feed card is `title.locator('xpath=ancestor::*[2]')`. The callout description is typed with `.fill()` into a Tiptap editor, which `rich-text.ts` says can drop content on the slow env (the feed's `- ID:` assert would catch it). `afterAll` needs 120 s to delete 68 templates. Template delete is not covered anywhere.

### templates-CRD/template-types/community-guidelines-template.spec.ts
- Journeys: C8 (CG template CRUD minus delete), C9 (apply template in `/settings/community`).
- Writes through UI: create, edit (incl. reference rename + add); "Use a template" only fills the form and is never saved. Seeded via lib: the space.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `TestUser`, `TestUserManager.users.spaceAdmin.email`, `OrganizationWithSpaceModel`.
- Personas: space.admin.
- Weakest: `1.0 Navigate to templates settings` (`expect(page.url()).toMatch`, U, non-retrying); `1.3 Verify edit and cancel and confirm dialog` (checks the unchanged cached list with no reload, so it is U); `1.4 Use Community Guidelines Template` (S on the template read, but the community's guidelines are never persisted, so C9 has no write).
- Strongest: `1.2 Edit Community Guidelines Template` (edited name, description, tags, guidelines and references re-verified after `page.reload()`).
- Tolerance: replace-alert `isVisible({timeout:500}).catch`.
- Risks: the guidelines rich text is filled with `.fill()`. Reference URLs are edited but only link names are asserted. Serial.

### templates-CRD/template-types/post-template.spec.ts
- Journeys: C8.
- Writes through UI: create, edit. Seeded via lib: the space.
- Lib helpers: same set as CG.
- Personas: space.admin.
- Weakest: `1.0` (U URL); `1.3 Verify edit and cancel and confirm dialog` (U: no reload, cache read).
- Strongest: `1.2 Edit Post Template` (reload, default content phrases in the preview).
- Risks: `typeIntoRichTextEditor` appends the whole new `defaultContent` into an editor that already holds the old content, so duplicated text still passes the substring checks. The template is never used to create a post. Delete is commented out.

### templates-CRD/template-types/whiteboard-template.spec.ts
- Journeys: C8; E8 is touched only as an editor interaction (the content cannot be asserted).
- Writes through UI: create (drawing autosave), edit, create a second template from the first via `Find Template`.
- Lib helpers: same set as CG.
- Personas: space.admin.
- Weakest: `1.0` (U); `1.3 Use whiteboard template in a whiteboard` (the picker listing the source template is S, but whether its content was applied is never checked; only the new template's name and description are); `verifyWhiteboardTemplate` uses `previewDialog.locator('img').first()`, which any image satisfies (V-ish).
- Strongest: `1.2 Edit Whiteboard Template` (metadata after reload).
- Tolerance: `openWhiteboardEditor` `isVisible().catch`.
- Risks: the create dialog is retitled to "Edit" mid-flow (regex locator); `closeWhiteboardEditor` waits on the "Saved" status (server autosave, effectively S).

### templates-CRD/template-types/poll-form-save-as-template.spec.ts
- Journeys: C8, E1 (poll and form Posts), E13 (vote, form response), NEW-save-post-as-template.
- Writes through UI: "Save as Template" from a Post, template preview, "Use template" into a new Post, edit the question/prompt, publish, cast a vote, submit a form response. Seeded via lib: two source Posts (poll, form) + publish.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `TestUser.GLOBAL_ADMIN`, `TestUserManager.users.spaceAdmin.email`, `getGraphqlClient` (`createPollCalloutOnCalloutsSet`, `createFormCalloutOnCalloutsSet`, `UpdateCalloutVisibility`, `calloutsSetFramingDefinitions`, `calloutFormResponses`), `graphqlErrorWrapper`, `GraphQLReturnType`, generated enums `CalloutFormQuestionType`, `CalloutFormResponseMode`, `CalloutFormResponseVisibility`, `CalloutFramingType`, `CalloutVisibility`, `PollStatus`, type `CreateCalloutOnCalloutsSetInput`, `OrganizationWithSpaceModel`.
- Personas: space.admin (UI), global admin (API seed/read).
- Weakest: none really; the UI-only bits are the dialog/picker visibility asserts.
- Strongest: `US5-AS5 a Poll Post is saved as a template and a new Post started from it votes` (edited question persisted, options in order, OPEN, totalVotes 0 → 1 after a UI vote); `US5-AS1/AS2 a Form Post …` (full definition incl. visibility/responseMode carried; responses 0 → 1 after a UI submit).
- Risks: depends on new lib ops (`calloutsSetFramingDefinitions`, `calloutFormResponses`, `createFormCalloutOnCalloutsSet`) that must be ported. Mode is `default`, not serial, so the cases are independent.

### form-callout-framing/us1-create-form.spec.ts
- Journeys: E1 (Form chip, builder), E2 (edit a Form with responses, close/reopen, default-collapsed, type change), E13, I3 (VC knowledge base refuses Form), NEW-vc-kb-conversion-guard.
- Writes through UI: build and publish a 4-question Form (`US1-AS4/5/7`), edit with responses incl. drag reorder (`US1-AS8/AS9`), close/reopen (`US1-AS7a`), title/description (`US1-AS10`), collapsed default (`US1-AS12`), type change (`US1-AS13`). Seeded via raw GraphQL: identities (Kratos admin API), space, subspace, roles, 5 Forms, seed responses, VCs.
- Lib helpers: none from `@alkemio/tests-lib`; only `fillSecret` (repo helper). Everything goes through inline GraphQL strings to `/api/private/non-interactive/graphql` plus `POST {KRATOS_ADMIN_URL}/identities`.
- Personas: throwaway `us1-a2/m1/m2-<run>@alkem.io` + platform admin `ALKEMIO_ADMIN_EMAIL`.
- Weakest: `US1-AS11 each question is a two-column card…` (≈30 bounding-box/font-size/scroll-width asserts and no save: pure U, and fragile); `US1-AS1 a Subspace-only admin is offered the Form chip` (one S-ish privilege read).
- Strongest: `US1-AS4/5/7 …` (UI-built Form read back: prompts, types, required, option labels); `US1-AS8/AS9 …` (reordered/renamed/added/removed questions polled via `lookup.callout`, snapshot prompt of the removed answered question); `US1-AS2` / `US1-AS3` / `US1-AS7` (server refusals `FORBIDDEN_POLICY`, `FORM_FRAMING_FIXED_KIND`, `FORM_TRANSFER_NOT_ALLOWED` with unchanged callout count, `FORM_QUESTIONS_COUNT`).
- Tolerance: `acceptCookies` `.catch(() => undefined)`; `newDesign.isVisible().catch`; `if (await confirm.isVisible())` while removing options; `page.waitForTimeout(100)` (eslint-disabled, dnd-kit).
- Risks: serial chain (`US1-AS6` needs `builtUrl` from `US1-AS4/5/7`); no cleanup (identities, 2 spaces, 2 VCs leak every run); `ADMIN_PASSWORD` falls back to `'password'`; error-code and `extensions.details.code` assertions pin the current server's error contract.

### form-callout-framing/us2-submit-response.spec.ts
- Journeys: E13 (render, validate, submit, withdraw, single/multiple modes), A5-ish (non-member read-only), E2 (settings changes via API).
- Writes through UI: submit (`AS4`, `AS5`, `AS6`, `AS10`, `AS11`, `AS14`), withdraw (`AS5`, `AS9`, `AS14`). Seeded via raw GraphQL: identities, space/subspace/roles, Forms, settings flips (`updateCalloutForm`), seed responses.
- Lib helpers: none (raw GraphQL + Kratos admin); `fillSecret`.
- Personas: throwaway a2/m1/m2/p + platform admin.
- Weakest: `US2-AS13 the Form box: header always visible, chevron…` (mostly U collapse/expand; the header text from the server is S); `US2-AS1 …` (rendering + duplicate-id DOM check, S on the seeded definition only).
- Strongest: `US2-AS4 valid answers are stored, attributed to the respondent…` (mine = 1, `createdBy.id` = m1, admin total = 1); `US2-AS5` (withdraw → mine 0 → resubmit → 1); `US2-AS11` (FORM_VISIBILITY_CHANGED surfaced in the UI, draft kept, resubmit stored); `US2-AS12` (5 parallel submits → exactly 1, API).
- Soft / tolerance: `US2-AS9` uses `expect.soft` on the "Closed" label when an own response exists; cookie/new-design `.catch`.
- Risks: `AS5`–`AS7` depend on the response written in `AS4` (serial); no cleanup; `US2-AS7` pins the Mutation field list by introspection (`deleteCalloutFormResponse`, `submitCalloutFormResponse`), which will need re-baselining on the new server.

### form-callout-framing/us3-response-visibility.spec.ts
- Journeys: E13 (read scope), E2 (visibility widen/narrow), D8 (demoted admin loses moderation), A5 (anonymous / non-member).
- Writes through UI: widen + save visibility (`US3-AS4`), parent-only member submit (`US3-AS7`). Seeded via raw GraphQL: everything else, incl. responses, demotion (`removeRoleFromUser`), a control callout + contribution.
- Lib helpers: none; `fillSecret`.
- Personas: throwaway a2/m1/m2/p/n + platform admin + anonymous context.
- Weakest: `US3-AS1 Form settings offers Admins only / Space members…` (create-flow default radio is client state, U; the edit-flow checked radio is a weak S).
- Strongest: `US3-AS4 …` (UI widen → `canReadAll` flips for m2, m2 sees M1's earlier answer in the table, narrowing asks nothing); `US3-AS6 …` (no leak into contributions, contributionsCount, activity log, in-app; schema reachability guard; positive control post present); `US3-AS8 …` (demoted admin: own scope only, delete of another's response `FORBIDDEN_POLICY`).
- Tolerance: login `toPass` with 240 s retry; new-design `.catch`.
- Risks: the `US3-AS6` introspection guard is tightly coupled to today's type names (`LookupQueryResults`, `PaginatedCalloutFormResponses`, `InAppNotification*`), so it will fail on any rename in the rewrite even when behaviour is right. The `try/finally` restores shared-Form visibility. No cleanup of spaces/identities (only contexts are closed).

### form-callout-framing/us4-notifications.spec.ts
- Journeys: F5 (admin email/in-app/push on Form response, submitter receipt), B5 (bell item opens the Post), F4 (notification settings row renders with the default).
- Writes through UI: none (all submits via GraphQL). The UI is only used for the bell click (`AS1`) and the settings page (`AS8`).
- Lib helpers: `harnessPostgresConfigured`, `queryHarnessDb`; plus raw GraphQL, MailSlurper REST (`MAIL_SLURPER_ENDPOINT`), RabbitMQ management API.
- Personas: throwaway a2/m1/sa + platform admin.
- Weakest: `US4-AS6 (re-scoped …)` (skips unless `NOTIFICATIONS_STOP_CMD`/`_START_CMD`, and `expect(id).toBeTruthy()`); `US4-AS8 …` (skips without loopback Postgres; mutates `user_settings.notification` JSONB directly, so it is coupled to the current DB schema).
- Strongest: `US4-AS1 …` (exact admin subject to a2, in-app payload URL = Post URL, push publish delta 1, parent-space admin gets nothing over a 10 s window); `US4-AS5 …` (admin-submitter gets the receipt only); `US4-AS7 …` (3 submissions → exactly 3 mails and 3 in-app, no 4th).
- Tolerance: cookie/new-design `.catch`; push asserts silently skipped when `RABBITMQ_MANAGEMENT_ENDPOINT` is unset.
- Risks: `AS2`–`AS5` read mails produced by `AS1` (serial; `AS5` expects the admin count to be 2 because `AS1` already sent one); `staysAt` uses fixed 1 s sleeps; shares the MailSlurper inbox.

### form-callout-framing/us4a-review-responses.spec.ts
- Journeys: E13 (review dialogs), NEW-form-response-moderation (delete), G-adjacent (deleted account → "Deleted user").
- Writes through UI: delete a response with confirmation (`US4a-AS3`). Seeded via raw GraphQL: 4 + 2 + 120 + 3 responses, question removal, option relabel, `deleteUser`.
- Lib helpers: none; `fillSecret`.
- Personas: throwaway a2/m1/m2/gone + platform admin.
- Weakest: none U-dominated; `US4a-AS4` is S on reads plus API refusals.
- Strongest: `US4a-AS1 single dialog and all-at-once table` (removed-question column, "Deleted user", option labels, "No answer given"); `US4a-AS2 120 responses load in pages of 50` (Showing 50/100/120, request page size ≤ 50, no 5xx); `US4a-AS3 …` (cancel keeps total 4; delete → 3 via API).
- Risks: `AS3` depends on `AS1`'s Form One staying at 4 responses (serial); 120 sequential API submits per run; no cleanup.

### forum-categories/edit-dialog-recategorise.spec.ts
- Journeys: J4 (recategorise via the edit dialog), J1 (category listing pages).
- Writes through UI: `updateDiscussion` via the Edit Discussion dialog. Seeded via raw GraphQL with the GA token: `createDiscussion` (category HELP); `deleteDiscussion` in `afterAll`.
- Lib helpers: `TestUserManager.populateUserModelMap`, `TestUserManager.users.globalAdmin.authToken`; fixture `createPersonaTest` (→ `registerInKratosOrFail`, `verifyInKratosOrFail` when missing).
- Personas: admin@alkem.io (global admin).
- Weakest: the `options.count() > 1` and option-visibility asserts (U, static enum).
- Strongest: `TC-E1 — admin recategorises through the edit dialog (US2-AS1/2, SC-002)` (mutation has no errors, back-link `/forum/tips-and-tricks`, listed on the new category and absent from `/forum/help` after navigation).
- Risks: `afterAll` delete result unchecked; the raw GraphQL strings bypass the lib (`createDiscussion`, `deleteDiscussion`, `platform.forum`).

### forum-categories/locale-labels.spec.ts
- Journeys: J1 (category nav), G8 (language preference, set via API only).
- Writes through UI: none. Via API: `updateUserSettings` language per locale (+ reset in `afterEach`).
- Lib helpers: `TestUserManager.populateUserModelMap`; `gql`/`languageConfig` from `language-offer/helpers.ts`; fixture `createPersonaTest('forum.locale@alkem.io')`, which provisions a non-harness identity on demand via `registerInKratosOrFail`/`verifyInKratosOrFail`.
- Personas: `forum.locale@alkem.io` (not a lib persona; self-registered).
- Weakest: `TC-E3 …`. "Q&A" is identical in en and nl; on an env where only `en` is eligible the case is pure U (client i18n). `expect(codes.length).toBeGreaterThan(0)` is always true because `en` is forced in (V).
- Strongest: the `nl` iteration ("Nieuwsbrief", "Tips & Trucs") requires the server to persist and return the language setting.
- Risks: the case loops locales inside one test.

## Group summary
- Journeys with STRONG coverage in this group: C8 (callout, post and CG template create/edit via UI with read-back; poll/form templates), E1 for callouts created from templates (incl. poll and form framings), E4 as space admin (link/post/memo/whiteboard contributions on template-made callouts), E13 (form submit/withdraw/review/delete and poll vote; but the deep coverage sits in the non-nightly form walks), J4 (recategorise).
- Journeys only USABLE/WEAK: C8 for whiteboard templates (content unverifiable); F5/B5/F4 for Form-response notifications (API-driven, not nightly); J1/G8 locale labels.
- Journeys this group touches but does not really cover: C9 (CG template applied but never saved); E2 callout settings (Edit dialog opened read-only, never saved, except in the form walks); E8 whiteboard content (canvas); template delete (commented out in every spec); member-side contribution permissions (only switch states are read; no member persona acts); I3 (only a negative Form check on a VC knowledge base).
- Not a net today: all five `form-callout-framing` walks (48 cases, the group's richest server-truth assertions) are outside the nightly and need `KRATOS_ADMIN_URL` + admin password. They do not use `@alkemio/tests-lib` at all (inline GraphQL against the current schema + Kratos admin REST + direct Postgres in US4-AS8), so adapting the lib will not carry them through the migration; each `beforeAll` has to be rewritten or moved onto the lib. They also leak identities/spaces/VCs on every run.
- Hidden gap in the nightly: in `callout-tests.spec.ts`, 10 of 69 cases (every Whiteboard framing) end at a `test.fail` assert before their in-feed and contribution checks; 4 more (`2`, `4`, `6`, `8`) duplicate their twins because callout-level comments are never asserted when Response = None. The suite is `describe.serial`, so one hard failure skips everything after it.
- Lib helper union (exact names): `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser` (`SPACE_ADMIN`, `SPACE_MEMBER`, `GLOBAL_ADMIN`), `TestUserManager.users.spaceAdmin`, `TestUserManager.users.globalAdmin.authToken`, `TestUserManager.populateUserModelMap`, `registerInKratosOrFail`, `verifyInKratosOrFail` (via the session fixture), `getGraphqlClient` (`createPollCalloutOnCalloutsSet`, `createFormCalloutOnCalloutsSet`, `UpdateCalloutVisibility`, `calloutsSetFramingDefinitions`, `calloutFormResponses`), `graphqlErrorWrapper`, `GraphQLReturnType`, generated `alkemio-schema` enums/types (`CalloutFormQuestionType`, `CalloutFormResponseMode`, `CalloutFormResponseVisibility`, `CalloutFramingType`, `CalloutVisibility`, `PollStatus`, `CreateCalloutOnCalloutsSetInput`), `harnessPostgresConfigured`, `queryHarnessDb`. Non-lib server couplings to port as well: inline GraphQL in all form walks and both forum specs (`createDiscussion`, `deleteDiscussion`, `updateUserSettings`, `platform.configuration.language`), Kratos admin `/identities`, MailSlurper REST, RabbitMQ management.
- Proposed NEW journey IDs: `NEW-save-post-as-template` (Post "…" → Save as Template), `NEW-callout-from-template` (Add Post → Find Template → publish; currently split across C8/E1/K3), `NEW-form-response-moderation` (review table, pagination, delete), `NEW-vc-kb-conversion-guard` (space-to-knowledge-base conversion refused while a Form exists).
