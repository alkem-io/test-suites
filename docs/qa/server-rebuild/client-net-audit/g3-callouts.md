# G3 callouts & collaboration

Repo: `~/repos/qa/test-suites` @ develop. Paths below are relative to `client-web/`.
Nightly runner: `config/playwright.config.nightly.ts`, `workers: 1`, `fullyParallel: false`, so the admin and member `describe`s in one file run in order and share the module-level `baseScenario`.

## Files reviewed
- `src/functional-e2e/callouts/0.1…0.9*.spec.ts` (9), `callouts/pages/CollaborationPage.ts`, `helpers/callout-form.helper.ts`
- `src/functional-e2e/contributors-callout/0.1contributors-callout.spec.ts`, `us1…us5*.spec.ts` (6), `cards-fixture.ts`, `pages/ContributorsCalloutPage.ts`, `contributors-callout-test-plan.md`
- `src/functional-e2e/subspaces-callout/us1…us4*.spec.ts` (4), `subspaces-callout.helpers.ts`, `subspaces-callout-test-plan.md` (header)
- `src/functional-e2e/default-template/default-template-per-flow-state.spec.ts`
- `src/functional-e2e/timeline/whole-day-events-crud.spec.ts`, `whole-day-events-timezone.spec.ts`, `pages/CalendarEventFormPage.ts`
- `src/functional-e2e/classifications/classifications-space.spec.ts`, `classifications-templates.spec.ts`, `classifications.fixture.ts`, `classifications.helpers.ts` (exports), `console-guard.ts`, `config/playwright.config.classifications.ts`
- `tests/callout-reactions.spec.ts`, `tests/callout-reaction-notifications.spec.ts`, `tests/contribution-notify-switch.spec.ts`

Totals: 27 specs, 157 cases. 6 are hard `test.skip`. 2 skip conditionally and do not run nightly (subspaces us2-AS6 `@local-stack`, notify-switch US2-AS1). 10 belong to `0.1contributors-callout.spec.ts`, which is unregistered.

## Callout types created through the UI (E1) and content editing (E4/E8/E9/E10)
| Type | Created via UI? | Where | What the assertion proves |
|---|---|---|---|
| Post (no framing) | yes | callouts 0.5 1.1, 0.2 7.1, 0.6, 0.7, 0.8 (L1) | a heading with the title renders |
| Post collection (Posts responses) | yes | 0.5 1.5, 0.1 Step 1 | title heading only; 0.1 Step 3 later proves a member can add a post |
| Whiteboard (framing) | yes | 0.5 1.2 | **title heading only**. The whiteboard is never opened, and the test would pass if the server dropped the framing |
| Whiteboard collection | yes | 0.5 1.8 | title heading only; no whiteboard contribution added |
| Link collection (Links & Files) | yes | 0.5 1.6 | title heading only. Link *contribution* is covered on a lib-seeded callout (0.4 6.2) |
| Memo (framing) | yes | 0.5 1.4 | **title heading only**; the memo is never opened or edited |
| Memos collection | yes | 0.5 1.7 | title heading only; no memo contribution |
| Call to Action | yes | 0.5 1.3 | title heading only (the URL is never checked) |
| Contributors | yes | contributors 0.1 (unregistered), us3 `beforeAll` (heading wait only) | 0.1 1.3/1.7/1.9 assert the settings persist, but 0.1 does not run nightly |
| Subspaces | yes | subspaces us2-AS2 (+ edits in AS3/AS4/AS7) | STRONG: rendered cards plus GraphQL read-back of `settings.framing.spaces.cardVariant` / `selection` |
| Tasks board | yes | notify-switch US1-AS5 | board visible after reload; a task created via UI is visible on the board and in Recent Activity |
| Media gallery | **no** | — | — |
| Poll / Form | **no** (us2-AS5 subspaces clicks the "Poll" chip and never submits) | — | — |
| Collabora document | **no** | — | — |

Content editing:
- **E8, whiteboard editing / guest share: not exercised anywhere in G3.**
- **E9, Collabora: not exercised.**
- **E10, memo editing / signing: not exercised.**
- E4 contributions through the UI: post (0.1, 0.4, notify-switch), link (0.4) and task (notify-switch). No whiteboard or memo contribution is ever added.

## Per-spec table
| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| callouts/0.1callout-full-workflow | yes (Callouts) | 5 (0) | E1, E2, E4, E5 | UI-write (create draft post-collection, publish, member post, member comment) | ~8/2/3 | STRONG | Cross-session chain (the member sees the published callout; admin sees the contribution and comment), but it is a serial chain and Step 5's "contributions" count is vacuous |
| callouts/0.2callout-access-control | yes | 2 (0) | E1, E5, E2 (privileges), A5-like authz | mixed (7.1 UI create; 7.2 lib seed) | ~15/2/1 | USABLE | Menu-privilege matrix is S with a positive control; the 7.1 create is asserted only by its heading; `toBeDefined()` on a Promise |
| callouts/0.3callout-comments | yes | 3 (0) | E5 | UI-write (comments) on lib-seeded callout | ~5/3/1 | STRONG | The comment renders after send; 5.5 re-reads in a new page (count ≥1, so it depends on 5.1) |
| callouts/0.4callout-contributions | yes | 3 (0) | E4 | UI-write (post, link, edit post) on lib-seeded collections | ~8/1/1 | STRONG | Contribution titles render after save; the edit is checked by a title round-trip only, never via reload or API |
| callouts/0.5callout-creation | yes | 9 (0) | E1 | UI-write ×8 + lib seed for 1.9 | ~20/8/0 | USABLE | Eight types are created through the UI, but the only oracle is the title heading, which is blind to framing and response type |
| callouts/0.6callout-deletion | yes | 2 (0) | E3 | UI-write (create + delete) | ~4/3/1 | WEAK | The deletion oracle `toBeHidden` runs right after `goto` with no positive control, so it passes before the feed renders |
| callouts/0.7callout-editing | yes | 4 (0) | E2 | UI-write (edit, publish) | ~8/4/3 | WEAK | Edit title is S. The description `getByText` can match the editor itself, publish is never verified, and 3.2 "Edit Callout Settings" edits nothing |
| callouts/0.8callout-subspace-creation | yes | 2 (0) | E1 (L1), authz | UI-write | ~2/0/1 | USABLE | Create in L1 is S; the "cannot create in parent" negative has no positive control (the page object itself documents that the check is false before render) |
| callouts/0.9callout-viewing | yes | 4 (0) | E2 (visibility), authz | lib-write (`updateCalloutVisibility`) + one unasserted UI publish | ~3/5/1 | WEAK | The draft-hidden check for a member is vacuous (Home tab is the only control); 2.3 flips visibility *after* `goto` (race) |
| contributors-callout/0.1contributors-callout | **no (unregistered)** | 10 (0) | E1, E2, E3, E11 | UI-write (create/edit/delete contributors callout) | ~20/12/2 | NOT-A-NET | Not in nightly (cleanup leak + QA-PF-01 red); it holds the only UI create/edit/delete checks for the contributors framing |
| contributors-callout/us1-card-content | yes (Contributors callout) | 12 (1) | E11, I4 | lib-write (everything; anonymous viewer) | ~45/50/4 | USABLE | Card values are checked against an API oracle (`apiCards`) plus hard literals; about half is CSS/layout geometry |
| contributors-callout/us2-nothing-else-changes | yes | 9 (1) | E11, C3 (user-info privacy), M2-like paging/search | lib-write | ~45/10/3 | USABLE | Exact server counts, paging partition and the MEMBERS_ONLY privacy rule for anonymous, non-member and member viewers |
| contributors-callout/us3-card-menu | yes | 9 (1) | E11, G1, F1, F3 | mixed (UI: callout create in `beforeAll`, send message to org; lib: users/orgs/settings) | ~18/25/0 | USABLE | The server refusal for a non-contactable user is S; the org message send is checked by toast only; chat panel opens but nothing is sent |
| contributors-callout/us4-joined-this-space | yes | 5 (0) | E11 | lib-write | ~14/3/2 | USABLE | Join month vs the API and an independent wall-clock window, in 3 timezones and 2 locales; per-space role month |
| contributors-callout/us5-organisation-website | yes | 4 (1) | E11, H2 (website) | lib-write (hostile values via API) | ~8/14/0 | USABLE | Server website normalisation (null for `javascript:`/schemeless, trim) is read through the UI; the rest is link attributes |
| subspaces-callout/us1-expanded-cards | yes (Subspaces callout) | 7 (0) | E11 | lib-write (inline rawGql) | ~15/40/0 | WEAK | Mostly CSS-class geometry (`.w-[320px]`, `span.uppercase`); AS5/AS6/AS7 (counts, private-subspace parity, search) are the S part |
| subspaces-callout/us2-expanded-card-switch | yes | 7 (1 cond. `@local-stack`) | E1 (subspaces), E2 | UI-write (create + 3 edits) + GraphQL read-back | ~14/20/0 | STRONG | Saved card variant and the untouched CUSTOM selection are re-read over GraphQL after UI saves |
| subspaces-callout/us3-excerpt-safety | yes | 7 (0) | E11 (XSS/sanitisation) | lib-write | ~5/30/0 | WEAK | Client-side rendering safety; the server only stores the text |
| subspaces-callout/us4-narrow-layout | yes | 3 (0) | E11 (responsive) | lib-write | ~1/25/0 | WEAK | Pure layout |
| default-template/default-template-per-flow-state | yes | 5 (1) | C7, C8 | UI-write (set the flow-state default template twice) | ~1/10/0 | WEAK | Writes are asserted only by "dialog hidden"; the one S case (4.1, member gets the default) is skipped (client-web#10416) |
| timeline/whole-day-events-crud | yes (Timeline) | 8 (0) | E12 | UI-write (create/edit/delete events) | ~16/8/0 | STRONG | Create/edit/delete are read back on reopen (no ±1-day drift, shrink/widen persist, covered cells, delete gone); T5/T6 are form-only U |
| timeline/whole-day-events-timezone | yes | 6 (0) | E12 | lib-write (`CreateCalendarEventOnCalendar`) | ~14/9/1 | USABLE | Rendered date in 4 timezones plus the multi-day cell count; UI-D1 is form-only |
| classifications/classifications-space | yes (Classifications) + own runner | 8 (0) | C12, C2 | UI-write (add entry, select/deselect, alias, hide, remove, subspace) + reload + API read-back | ~140/35/3 | STRONG | Every write is followed by reload and `entriesOf`/`readEntries`; viewer/outsider/anonymous negatives have positive controls; server-conflict path is anchored on the response |
| classifications/classifications-templates | yes + own runner | 11 (1) | C8, C12, K1, K3, M1, M3 | UI-write (template create/edit/delete, library copy, ids) + API read-back | ~130/60/5 | STRONG | Template CRUD through the UI with `libraryTemplates` read-back; TL-07 search check is `expect.soft`; TL-01b skipped (no FR) |
| tests/callout-reactions | yes (Callout reactions) | 3 (0) | E5 (reactions) | mixed (lib: callout; UI: reaction) | ~8/19/1 | STRONG | The UI reaction is re-read after reload in AS3 ("1 person reacted"); AS2 checks a client-side picker constant |
| tests/callout-reaction-notifications | yes (Callout reaction notifications) | 4 (0) | B5, F5, E5 | lib-write (reactions via `AddReactionToCallout` as reactor) | ~12/3/3 | USABLE | Bell rows (one per genuine reaction, none for self or swap) and deep link are server-truth; the actor never clicks |
| tests/contribution-notify-switch | yes (Contribution notify switch) | 5 (1 cond. queue) | E4, E1 (tasks board), F4, NEW-recent-activity | UI-write (post response, tasks-board callout, task) | ~6/10/1 on nightly (+5 S queue checks off nightly) | STRONG | UI-created response and task are re-read after reload in the callout and in Recent Activity; zero-emission checks never run nightly (no `RABBITMQ_MANAGEMENT_*`) |

Verdicts: STRONG 9 · USABLE 10 · WEAK 7 · NOT-A-NET 1.

## Per-spec notes

### callouts/0.1callout-full-workflow.spec.ts
- Journeys: E1 (post-collection, draft), E2 (publish), E4 (post contribution), E5 (comment).
- Writes through UI: create draft callout, publish, member post contribution, member comment. Seeded via lib: space + community only.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.{spaceAdmin,spaceMember}`. Local: `createAuthenticatedSessionFixture`, `CollaborationPage`.
- Personas: space.admin, space.member.
- Weakest: "Step 2: Admin publishes the callout" asserts `publishMenuItem` not visible after reopening the menu. That passes if the menu never opens, and `publishCallout()` swallows a missing confirm dialog. "Step 5: Admin moderates content": `contributionsList` = `calloutDialog.getByRole('heading', { level: 2 })`, which matches the dialog's own title, so `toBeGreaterThan(0)` is vacuous.
- Strongest: "Step 3: Member adds post contribution". The member can only open the callout if Step 2's publish reached the server, so this is the real publish oracle.
- Tolerance: `isCalloutVisible` uses `.catch(() => false)` (still hard-expected to be true); `dismissCookieBanner` swallows errors.
- Risks: a single serial chain across three fixture `describe`s, so one failure hides the rest. Names use `Date.now()`, not `UniqueIDGenerator`. The CRD `saveButton` regex `/^(create|post|save|publish)$/i` is loose.

### callouts/0.2callout-access-control.spec.ts
- Journeys: E1, E2 (menu privileges), E5 (comment input), authz.
- Writes through UI: 7.1 creates a draft post callout, then publishes it (unasserted). Seeded via lib: 7.2 callout via `createCalloutOnCalloutsSet`.
- Lib helpers: `TestScenarioFactory`, `createCalloutOnCalloutsSet`, `TestUserManager`, `CommunityMembershipPolicy`, `SpacePrivacyMode` (client-lib).
- Personas: space.admin, space.member.
- Weakest: "7.2 Space Member - Limited Access" `expect(collaborationPage.getCalloutByName(...)).toBeDefined()` asserts on an un-awaited Promise (V).
- Strongest: 7.2. The negatives Edit/Delete/Publish are absent while the positive control Share is visible, after `expectAddCalloutAbsent` (seeded heading plus Add Post count 0).
- Risks: the final `publishCallout()` in 7.1 has no assertion.

### callouts/0.3callout-comments.spec.ts
- Journeys: E5.
- Writes through UI: comments as admin (5.2) and member (5.1). Seeded via lib: the post callout (`addPostCallout`).
- Lib helpers: `TestScenarioFactory`, `TestUserManager`, client-lib enums. Personas: space.admin, space.member.
- Weakest: "5.5 View Comments Thread" counts `Reply` buttons ≥1. That depends on 5.1 (or 5.2) and does not identify which comment.
- Strongest: 5.1/5.2. `page.locator('p', { hasText })` renders after Send; this requires the mutation round trip, though it is the same session with no reload.
- Risks: `commentInput` uses `.first()` on a placeholder.

### callouts/0.4callout-contributions.spec.ts
- Journeys: E4.
- Writes through UI: post contribution, link contribution, edit own post contribution. Seeded via lib: post-collection and link-collection callouts.
- Lib helpers: `TestScenarioFactory`, `TestUserManager`. Persona: space.member.
- Weakest: 6.1 `expect(getCalloutByName(...)).toBeDefined()` (V). 6.4 reuses the fixed title "Original Post Title".
- Strongest: "6.4 Edit Own Contribution" (edited title renders after save) and 6.2 (link display name renders).
- Risks: `addPostContribution` types with `{ delay: 50 }`; there is no reload or API read-back.

### callouts/0.5callout-creation.spec.ts
- Journeys: E1 for post, whiteboard, CTA, memo, posts/links/memos/whiteboards collections; authz negative.
- Writes through UI: all 8 creates. Seeded via lib: the 1.9 positive-control callout.
- Lib helpers: `TestScenarioFactory`, `createCalloutOnCalloutsSet`, `TestUserManager`. Personas: space.admin, space.member.
- Weakest: every create case asserts only `getByRole('heading', { name })` visible (twice: once in the helper, once in the spec). A server that persisted every callout as a plain post would pass all 8. The framing and response type are never read back.
- Strongest: "1.9 Cannot Create Callout - As Space Member" (positive control plus count 0).
- Risks: 8 callouts in one space; `createCallout` waits for `heading(...).first()` with a non-exact name.

### callouts/0.6callout-deletion.spec.ts
- Journeys: E3.
- Writes through UI: create + delete. Seeded via lib: post callout for 4.2.
- Weakest: "4.1 Delete Callout - As Space Admin" `toBeHidden({timeout:5000})` runs directly after `navigateToSpace`, with no positive control that the feed rendered, so it is V. Nothing checks the API either.
- Strongest: "4.2 Cannot Delete Callout - As Space Member" (menu open, Delete count 0).
- Risks: the deletion journey has effectively no oracle.

### callouts/0.7callout-editing.spec.ts
- Journeys: E2.
- Writes through UI: create draft, edit title/description, publish (twice). Seeded via lib: post collection for 3.3.
- Weakest:
  - "3.2 Edit Callout Settings" edits nothing: it has `toBeDefined()` (V) and an Edit-visible check (S privilege).
  - "3.4 Publish Draft Callout" proves publish only by `publishMenuItem` not visible (V).
  - In "3.1", `getByText(updatedDescription)` would also match the still-open TipTap editor if save failed (V).
- Strongest: "3.1" updated title visible after save (the title input value is not matched by `getByText`). "3.3" member has no Edit (positive control: menu visible).
- Risks: `currentCalloutName` is mutated across tests, so 3.2 depends on 3.1.

### callouts/0.8callout-subspace-creation.spec.ts
- Journeys: E1 at L1, authz.
- Writes through UI: post callout in a subspace.
- Personas: subspace.admin (persona `TestUserManager.users.subspaceAdmin`).
- Weakest: "Verify: Subspace Admin cannot create callout in parent Space" uses `isAddCalloutVisible()` with no positive control. `CollaborationPage.expectAddCalloutAbsent` documents that this exact check is false before render, even for an admin, so it is V.
- Strongest: "1.6 Create Callout in Subspace" (exact heading).

### callouts/0.9callout-viewing.spec.ts
- Journeys: E2 (visibility draft/published), authz.
- Writes through UI: "2.1 View Published Callout - As Space Admin" publishes via the UI, but asserts only that `commentInput` is visible (U). Seeded via lib: `updateCalloutVisibility` (Draft/Published) in 2.3, 2.1-member and 2.2.
- Lib helpers: `TestScenarioFactory`, `TestUserManager`, `updateCalloutVisibility`, `CalloutVisibility`.
- Weakest:
  - "2.2 Cannot View Draft Callout - As Space Member": the heading `toBeHidden` has only the Home tab as control, so it is V.
  - "2.3 View Draft Callout - As Space Admin" calls `updateCalloutVisibility` *after* `navigateToSpace` (a race).
- Strongest: "2.1 View Published Callout - As Space Member" (member sees the lib-published callout).
- Risks: two `2.1` titles; the order of the admin and member blocks matters.

### contributors-callout/0.1contributors-callout.spec.ts
- Not in nightly (deliberately, per the nightly config comment and the test plan): cleanup lives only in the Member block, and 1.4 is red on QA-PF-01 (client-web#10369).
- Journeys: E1/E2/E3/E11 for the contributors framing.
- Writes through UI: create (1.3/1.8/1.9), edit types (1.7), delete (1.8). Seeded via lib: VC role.
- Lib helpers: `TestScenarioFactory`, `TestUserManager`, `assignRoleToVirtualContributor`, `RoleName`.
- Weakest: "2.1 A space member cannot create a Contributors callout" has no positive control. "1.2 Zero contributor types blocks save" is client validation only (U); its heading count 0 runs right after close (V).
- Strongest: "1.7 Excluding a type on an existing callout persists" (re-navigate, VC tab gone). "1.9" default type honoured.

### contributors-callout/us1-card-content.spec.ts
- Journeys: E11, I4 (VC on cards).
- Writes: all lib. That covers the contributors callout via `createContributorsCalloutViaApi` (raw GraphQL), users via `registerFixtureUser` (Kratos), organizations with associates, VC roles, profiles via `setProfile` (raw GraphQL), and privacy via `setSpacePrivacy` (raw GraphQL).
- Lib helpers: `TestScenarioFactory`, `TestScenarioConfig`, `TestUserManager.populateUserModelMap`/`users.globalAdmin`, `UniqueIDGenerator`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `registerInAlkemioOrFail`, `assignRoleToUser`, `assignRoleToOrganization`, `assignRoleToVirtualContributor`, `createOrganization`, `deleteOrganization`, `removeRoleFromUser`, `graphqlRequestAuth`, `TestUser.GLOBAL_ADMIN`, `RoleName`.
- Inline GraphQL documents in `cards-fixture.ts` are a lib-migration item: `deleteUser`, `createCalloutOnCalloutsSet` (CONTRIBUTORS settings), `updateSpaceSettings`, `lookup.callout.framing.contributors(type)`, `updateUser`/`updateOrganization`/`updateVirtualContributor` tagsets, `usersPaginated`, `lookupByName`.
- Personas: anonymous viewer; global admin for seeding.
- Weakest: "US1-AS6" and "US1-AS7" are geometry only (U). "US1-AS4" ends with `expect(api[P.orgMany].associatesCount).toBe(3)`, which is the oracle read back (V).
- Strongest: "US1-AS3" (merged/deduped tag order equals the API), "US1-AS2" (empty-profile fallbacks), "US1-AS8 / FR-015" (dialog and map list match the feed).
- Skips: "US1-AS7 / FR-003 … +N chip" (client-web#10370).
- Risks: the oracle is the same server under test, so a migrated server that is self-consistently wrong passes. The hard literals ('Barcelona, ES', '3 associates…', 'Policy','Energy') mitigate this.

### contributors-callout/us2-nothing-else-changes.spec.ts
- Journeys: E11, C3 (userInformationVisibility), paging/search.
- Writes: all lib (13 users, leads, org, VC, subspace callout). The privacy flip goes through `setSpacePrivacy`.
- Lib helpers: as us1, plus `assignRoleToUser` for the subspace roles. Local: `loginViaCrd` (types the harness password).
- Personas: anonymous, non.space (`nonSpaceMember`), space.admin.
- Strongest:
  - "US2-AS2 / FR-032": under MEMBERS_ONLY, anonymous and non-member see no People, with organizations enriched as a positive control; a member sees People.
  - "US2-AS1 — paging": exact 9 + rest, none repeated or missing.
- Weakest: "US2-AS5" opens the edit form and asserts a switch list (client-only).
- Skips: "US2-AS4 / FR-016" (client-web#10369).
- Risks: AS2's `try/finally` restores privacy, but a non-member context leaks if an assertion fails before `close`.

### contributors-callout/us3-card-menu.spec.ts
- Journeys: E11, G1 (profile in new tab), F1 (open 1:1 chat, nothing sent), F3 (message organization).
- Writes through UI: contributors callout create in `beforeAll` (only the heading wait asserts it); `sendMessageToOrganization` via the dialog (asserted by success toast). Seeded via lib: org and VC roles, a throwaway user with messaging disabled (raw `updateUserSettings`), org website (raw `updateOrganization`).
- Lib helpers: `TestScenarioFactory`, `TestUserManager`, `UniqueIDGenerator`, `getGraphqlClient().deleteUser`, `graphqlErrorWrapper`, `graphqlRequestAuth`, `assignRoleToOrganization`, `assignRoleToVirtualContributor`, `assignRoleToUser`, `RoleName`, `SpacePrivacyMode`; `registerFixtureUser` (from cards-fixture).
- Personas: space.admin (fixture session), space.member (target), anonymous.
- Strongest: "US3-AS6" (server refuses messaging the quiet user and shows a friendly toast with no raw error). "US3-AS1" (profile page heading in the new tab).
- Weakest: "US3-AS2" (panel open/close only, U). "US3-AS3" (the success is a toast; no email or API check, so it is partly U).
- Skips: "US3-AS7 Keyboard-only" (client-web#10369).

### contributors-callout/us4-joined-this-space.spec.ts
- Journeys: E11.
- Writes: lib.
- Lib helpers: as us1, plus `assignRoleToUser`.
- Persona: anonymous (fresh contexts).
- Strongest: "US4-AS1" (API month inside the independent wall-clock window; card text) and "US4-AS3" (per-space month).
- Weakest: the `expect(parentWindowMonths).toContain(parentApiMonth)` checks are API-only (no UI) but legitimate.

### contributors-callout/us5-organisation-website.spec.ts
- Journeys: E11, H2.
- Writes: lib (`createOrganization` with raw website values).
- Lib helpers: `createOrganization`, `deleteOrganization`, `TestScenarioFactory`, `TestUserManager`, `UniqueIDGenerator`, `assignRoleToOrganization`, `assignRoleToVirtualContributor`, `RoleName`.
- Persona: space.admin.
- Strongest: "US5-AS2" (no control for `javascript:` or schemeless values; no `javascript:` anchor). "US5-AS3" (trimmed href), which pins server normalisation.
- Skip: "US5 / FR-016" (client-web#10369).
- Risk: the afterAll `expect(failures).toEqual([])` fails the hook (intended).

### subspaces-callout/us1-expanded-cards.spec.ts
- Journeys: E11.
- Writes: lib, via a *file-local* `rawGql` to `/api/private/non-interactive/graphql`: `createSpace`, `createSubspace`, `removeRoleFromUser`, `updateSpace`, `createCalloutOnCalloutsSet` (SPACES), `deleteSpace`, `me`.
- Lib helpers: `getUserToken`, `UniqueIDGenerator` only. Personas: admin@alkem.io (token), non.space (token), anonymous browser.
- Weakest: "US1-AS1", "US1-AS2" and "US1-AS3" assert Tailwind classes (`.w-[320px]`, `span.uppercase`, `.border-t`) and pixel geometry (U, implementation accidents).
- Strongest: "US1-AS6" (callout subspaces equal the direct lookup per viewer; private-subspace parity) and "US1-AS5" (3 / Show 4 more / 7; compact 6).
- Risks: hard-coded `non.space@alkem.io`; this file is the source of the raw-GQL convention that others copy.

### subspaces-callout/us2-expanded-card-switch.spec.ts
- Journeys: E1 (subspaces framing via the UI), E2.
- Writes through UI: AS2 create post with the switch on; AS3/AS4/AS7 edit and save. Seeded via lib/raw: space, subspaces, posts for AS3–AS7.
- Lib helpers: `getUserToken`, `harnessPostgresConfigured`, `queryHarnessDb` (SQL `UPDATE callout SET settings = settings #- '{framing,spaces}'`), `UniqueIDGenerator`. Local: `createPersonaTest`, `chooseFramingChip`.
- Personas: admin (persona session), anonymous.
- Strongest: "US2-AS4" (CUSTOM selection survives an Expanded flip on API re-read) and "US2-AS3" (both directions re-read via `readCalloutSettings`).
- Weakest: "US2-AS1" (placement by bounding box) and "US2-AS5" (chips clicked, never submitted).
- Skips: "US2-AS6" skips unless loopback Postgres is configured, so it never runs nightly. Its SQL is tied to the current DB schema.

### subspaces-callout/us3-excerpt-safety.spec.ts
- Journeys: E11 (content-injection safety).
- Writes: lib (raw GQL).
- Lib helpers: `getUserToken`, `UniqueIDGenerator`.
- All 7 cases assert client sanitisation and layout (no img/iframe fetch, no fixed overlay, no table/bullets, 500-char wrap, search <2 s). Mostly U; only the "surrounding text still shows" checks need server data.

### subspaces-callout/us4-narrow-layout.spec.ts
- Journeys: E11 (responsive).
- Writes: lib (raw GQL).
- Lib helpers: `getUserToken`, `UniqueIDGenerator`.
- All U (stacked vs side-by-side arrangement, clamps, resize survival).

### default-template/default-template-per-flow-state.spec.ts
- Journeys: C7, C8 (flow-state default callout template), K3-adjacent.
- Writes through UI: "3.1 Add new default template" and "3.2 Update existing default template". Seeded via lib: innovation pack with 2 CALLOUT templates (`innovationPack` scenario config), private space with `allowMembersToCreateCallouts`.
- Lib helpers: `TestScenarioFactory`, `TestScenarioConfig`, `TestUserManager`, `TestUser`, client-lib `CommunityMembershipPolicy`/`SpacePrivacyMode`. Local: `SpacePage`, `SpaceSettingsPage`, `LoginPage`, `acceptCookiesIfVisible`.
- Personas: space.admin; space.member (skipped case).
- Weakest: 3.1/3.2. The only oracle is "Use a template dialog hidden" (U). The write is never read back, so a server that ignores it stays green.
- Skip: "4.1 Default template is loaded when member creates a post" (client-web#10416). This is the only S case.
- Risks: `(test.describe as any).configure?.(...)`; `click({ force: true })`; `Home` matched with `.first()`.

### timeline/whole-day-events-crud.spec.ts
- Journeys: E12.
- Writes through UI: create (T1–T4, T7, T8), edit (T2–T4), delete (T8).
- Lib helpers: `TestScenarioFactory`, `TestScenarioConfig`, `TestUserManager`, `TestUser`. Local: `ensurePersonaState`, `CalendarEventFormPage`.
- Persona: space.admin (context pinned to Europe/Sofia).
- Strongest: "T3: shrinking a 4-day whole-day event to a single day PERSISTS on save" (reopen reads the server value), "T4" (covered cells = 4) and "T8" (deleted title count 0 after delete).
- Weakest: "T5" and "T6" (form toggles only, U; T6 does not check the duration value). "T8" absence has no positive control after the redirect.
- Risks: dates use next year; `coveredDayCells` couples to `bg-primary/20`.

### timeline/whole-day-events-timezone.spec.ts
- Journeys: E12.
- Writes: lib (`getGraphqlClient().CreateCalendarEventOnCalendar`, whose result is not checked).
- Lib helpers: `getGraphqlClient().GetSpaceCalendarId`, `CalendarEventType`, `TestScenarioFactory`, `TestUserManager.users.spaceAdmin.authToken`. Persona: space.admin.
- Strongest: "UI-A … for a viewer in <tz>" ×4 (correct badge, off-by-one absent) and "UI-C1" (exactly 3 cells).
- Weakest: "UI-D1" is form-only (U).

### classifications/classifications-space.spec.ts
- Journeys: C12, C2 (About display), authz.
- Writes through UI: add entry from the picker, select/deselect values, conflict/alias add, show/hide toggle, remove entry, subspace add. Seeded via lib/raw: space tree, templates (`createTemplateApi`), entries for read-only cases (`addEntryApi`).
- Lib helpers: `TestScenarioFactory`, `TestUserManager.getUserModelByType`, `UniqueIDGenerator`, `postGraphqlRaw`, `deleteSpace`, `deleteOrganization`, `TestUser`.
- Inline GraphQL (migration items): `ClassificationsRead`, `ClassificationTemplatesRead`, `ClassificationTemplateCreate`, `ClassificationEntryAdd`, `updateClassificationEntrySelection` and others in fixture/specs.
- Personas: space.admin (editor), space.member (viewer), non.space (outsider, API read), anonymous (API read). CRD flag pinned via localStorage.
- Strongest:
  - "SL-01" (immediate commit, persists over reload; sibling-safe deselect checked against an API `selectedValueIDs` equal to [V3]; same id and sortOrder).
  - "SL-02" (server conflict anchored on the `AddClassificationEntryFromTemplate` response).
  - "SL-05" (anonymous/outsider API still return hidden entries).
- Tolerance: console guard with allow-list; `selectionSaved` waits for the server ack.
- Risks: one long `test.step` walk per case (one failure hides later steps), but every case owns uniquely labelled data.

### classifications/classifications-templates.spec.ts
- Journeys: C8, C12, K1/K3 (innovation library / seed pack), M1/M3 (negatives), B6-adjacent.
- Writes through UI: template create (reorder, custom id), edit, delete; "Select from library" copy; value-id rules. Seeded via lib: templates and entries for TL-05/TL-07.
- Strongest: "TL-04b" (UI create, then `libraryTemplates` cardinality/values/ids, edit round-trip, delete re-read), "TL-05" (template rename/delete never touches the entry) and "TL-08" (id suffixing and rejection).
- Weakest: "TL-07" platform-search negative is `expect.soft`, and "TL-02" reads the platform seed pack (env-dependent: the SDG seed must exist).
- Skip: "TL-01b Innovation Library offers a Classifications type filter…" (product finding, no FR).

### tests/callout-reactions.spec.ts
- Journeys: E5 (reactions).
- Writes through UI: add heart reaction. Seeded via lib: published callout.
- Lib helpers: `TestScenarioFactory`, `createCalloutOnCalloutsSet`, `delay`, `CalloutVisibility`. Local: `loginViaCrd`.
- Persona: admin@alkem.io (platform admin, hard-coded).
- Strongest: "US1-AS3" reloads and reads "1 person reacted" plus one who-reacted row, so the AS1 write persisted.
- Weakest: "US1-AS2" (7 picker options is a client constant, U). In AS1 the pill state could be optimistic.
- Tolerance: afterAll cleanup is wrapped in `try/catch {}` and `isVisible().catch`.
- Risks: serial; AS3 depends on AS1. A second reactor is never exercised.

### tests/callout-reaction-notifications.spec.ts
- Journeys: B5, F5, E5.
- Writes: lib only. Reactions go through `getGraphqlClient().AddReactionToCallout` with reactor and admin tokens. The browser only reads the bell.
- Lib helpers: `TestScenarioFactory`, `createCalloutOnCalloutsSet`, `assignRoleToUser`, `registerInKratosOrFail`, `verifyInKratosOrFail`, `registerInAlkemioOrFail`, `getUserToken`, `getGraphqlClient` (`AddReactionToCallout`, `getMyUserInfo`, `deleteUser`), `UniqueIDGenerator`, `TestUserManager.users.globalAdmin`, `delay`, `CalloutVisibility`, `RoleName`. Local: `enableCalloutReactionNotifications` (uses `testConfiguration`, `TestUser`, `TestUserManager`), `loginViaCrd`.
- Personas: admin@alkem.io (recipient), throwaway Kratos user (reactor).
- Strongest: "US1-AS1" (exactly one row with the exact accessible name and glyph) and "US1-AS4"/"US1-AS2" (stable-window negatives with a positive baseline of 1).
- Tolerance: `waitFor(...).catch(() => undefined)` grace waits; reactor delete `.catch(() => undefined)`.
- Risks: it mutates the shared admin's notification settings, but restores them in afterAll. AS4 hard-codes `before = 1` from AS1.

### tests/contribution-notify-switch.spec.ts
- Journeys: E4, E1 (tasks board), F4 (per-action notify), NEW-recent-activity.
- Writes through UI: Post response (switch ON in AS2, OFF in AS3), tasks-board callout create, task create. Seeded via lib: published Post-response callout.
- Lib helpers: `TestScenarioFactory`, `createCalloutOnCalloutsSet`, `delay`, `getQueueStats`, `rabbitMqManagementConfigured`, `waitForQueuePublishIncrease`, `CalloutAllowedActors`, `CalloutVisibility`; client-lib `CalloutContributionType`. Local: `loginViaCrd`.
- Persona: admin@alkem.io.
- Strongest: "US1-AS3/AS4" and "US1-AS5". The UI-created response and task are visible after reload in the callout card and in Recent Activity.
- Weakest: "US1-AS1" (default switch state, U). On nightly the RabbitMQ checks are skipped, so AS2/AS3/AS5 emission assertions never run there.
- Skip: "US2-AS1" (`@local-stack`, skipped without the RabbitMQ management API).
- Risks: serial; AS5 creates the board that US2-AS1 depends on.

## Group summary
- **STRONG coverage** in this group:
  - E12 calendar (timeline CRUD).
  - C12 classifications plus classification templates (C8 part).
  - E1/E2 for the subspaces framing (subspaces us2).
  - E4 post/link/task contributions (0.1, 0.4, notify-switch).
  - E5 comments (0.3) and reactions (callout-reactions).
  - E1 tasks board (notify-switch AS5).
- **Only USABLE/WEAK**:
  - E1 for post/whiteboard/memo/CTA/collections: created via the UI, but only the title is checked, never the type.
  - E2 edit/publish/visibility (0.7/0.9 weak).
  - E3 delete (0.6 has a vacuous absence check).
  - E11 contributors callout (rich lib-seeded reads; UI create/edit/delete only in the unregistered 0.1).
  - C7/C8 flow-state default template (writes unverified; S case skipped).
  - B5/F5 reaction notifications (writes via API).
  - F3 message org (toast only).
- **Touched but not really covered**:
  - E8 whiteboard editing / guest share: none.
  - E9 Collabora: none.
  - E10 memo editing / signing: none.
  - E1 media gallery, poll/form, Collabora doc: never created.
  - E13 form/poll responses: none.
  - E6 reorder and E7 move contribution: none.
  - E5 mentions: none (only the button locator exists).
  - E2 flow-state change: none.
  - F4 notification emission: queue checks off on nightly.
- **Lib helper union** (exact names):
  - Scenario and personas: `TestScenarioFactory` (`createBaseScenario`, `cleanUpBaseScenario`), `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager` (`users.*`, `populateUserModelMap`, `getUserModelByType`), `UniqueIDGenerator`, `testConfiguration`.
  - Callouts and calendar: `createCalloutOnCalloutsSet`, `updateCalloutVisibility`, `CalloutVisibility`, `CalloutAllowedActors`, `CalendarEventType`.
  - Roles and organizations: `RoleName`, `assignRoleToUser`, `assignRoleToOrganization`, `assignRoleToVirtualContributor`, `removeRoleFromUser`, `createOrganization`, `deleteOrganization`, `deleteSpace`.
  - Identity and tokens: `registerInKratosOrFail`, `verifyInKratosOrFail`, `registerInAlkemioOrFail`, `getUserToken`.
  - GraphQL transport: `graphqlRequestAuth`, `graphqlErrorWrapper`, `getGraphqlClient` (`deleteUser`, `CreateCalendarEventOnCalendar`, `GetSpaceCalendarId`, `AddReactionToCallout`, `getMyUserInfo`), `postGraphqlRaw`.
  - Infra: `harnessPostgresConfigured`, `queryHarnessDb`, `getQueueStats`, `rabbitMqManagementConfigured`, `waitForQueuePublishIncrease`, `delay`.
  - client-lib enums: `CommunityMembershipPolicy`, `SpacePrivacyMode`, `CalloutContributionType`.
  - **Outside the lib but migration-critical:**
    - Hand-written GraphQL documents in `contributors-callout/cards-fixture.ts` (`adminGql`), `subspaces-callout/us1–us4` (file-local `rawGql` against `/api/private/non-interactive/graphql` and `/api/public/graphql`), `classifications/classifications.fixture.ts` (`gql`/`gqlOk`), us3 `updateUserSettings`/`updateOrganization`.
    - Direct SQL on `callout.settings` (subspaces us2-AS6).
- **Proposed NEW journey IDs**:
  - `NEW-recent-activity-feed`: the space "Recent Activity" dialog (notify-switch).
  - `NEW-contributor-card-actions`: View Profile / Message / website from contributor cards (us3/us5).
  - `NEW-callout-draft-visibility`: draft hidden from members, publish dialog (0.1/0.7/0.9).
  - `NEW-per-action-notify-switch`: "Notify space members" on contributions and tasks (notify-switch).
- **Other observations**:
  - Callout titles in 0.x specs use `Date.now()` rather than `UniqueIDGenerator`.
  - The local clone has 4 untracked `.md` files in `classifications/` ("Evidence gathered.md", etc.). They are not in the repo, so this is local noise only.
