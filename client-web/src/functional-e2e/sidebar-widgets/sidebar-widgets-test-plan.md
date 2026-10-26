# Test plan — sidebar widgets: per-tab (040) and subspace (086)

> **Status:** Draft · **Story:** [client-web#10092](https://github.com/alkem-io/client-web/issues/10092) (Space Sidepanel — this feature is its configurability slice) · **Spec:** `specs/040-sidebar-widget-config/` in `alkem-io/agents-hq` (source of truth for the US/AS/FR/SC ids below) · **PR:** test-suites#615
>
> **086 slice — Status:** Approved — QA lead, 2026-10-26; S-01…S-16 and U-1 implemented on branch `test/086-subspace-sidebar-ui` (this PR) · **Depth:** Deep (migration + cross-repo contract + visibility + full-replacement writes; see §086) · **Story:** [client-web#10350](https://github.com/alkem-io/client-web/issues/10350) (design alkem-io/product#2195) · **Spec:** `specs/086-subspace-sidebar-config/` in `alkem-io/agents-hq` — its ids carry an `086/` prefix below · **Diffs:** server#6683 (`f0837080`), client-web#10444 (`f028c891`), test-suites#677 (API half)

- **Suites:**
  - `client-web/src/functional-e2e/sidebar-widgets/` — the US1 and US2 acceptance walks, plus the shared fixture in `sidebar-widgets.helpers.ts`.
  - `server-api/src/functional-api/templates/space/space-templates.it-spec.ts` › `innovation flow state sidebar round-trip` — the template round-trip that operator RULING 3 makes binding, plus the default lists at API level.
  - 086: `client-web/src/functional-e2e/sidebar-widgets/subspace-us2-defaults.spec.ts` (S-01…S-04), `subspace-us1-customize.spec.ts` (S-07…S-13), `subspace-us3-widgets.spec.ts` (S-05, S-06), `subspace-us6-flow-changes.spec.ts` (S-14, S-15), `l0-community-activity.spec.ts` (S-16), sharing `subspace-sidebar.helpers.ts` (seeding, API reads/writes, locators, the announcement-driven `keyboardDrag`); API half in `server-api/src/functional-api/journey/subspace/subspace-sidebar-positional.it-spec.ts` (test-suites#677).
- **Product under test when this plan was last run:** server `develop` @ `615817441` (0.167.0) and client-web `develop` @ `2e576ee17`. This includes 055 (the `SEARCH` widget) and server#6418 (L0 Spaces have no fixed tabs). The expected lists below therefore have 14 vocabulary values and include `SEARCH`.
- **Personas:** all seeded by `TestScenarioFactory`.
  - `spaceAdmin`: Space admin and lead. Drives the Layout dialog.
  - `spaceMember`: a plain member. Every rendering check and the rejected write.
  - `globalAdmin`: the second admin in US2-AS6 and the API reads.

  Each persona gets its own browser context from a stored session (`ensurePersonaState`).

## How to run

Needs the server, client-web and the GraphQL API reachable from `client-web/.env` / `server-api/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/sidebar-widgets

cd ../server-api
pnpm exec vitest run --project templates src/functional-api/templates/space/space-templates.it-spec.ts
```

- **Nightly:** the walks run in the nightly Playwright project `Sidebar widgets` (`client-web/config/playwright.config.nightly.ts`). The it-spec runs nightly through the `templates/**` glob of the server-api `nightly` project.
- **Data:** each walk file seeds one Space (with one subspace, one future event, one update and filled guidelines) in `beforeAll`. It deletes the subspace, then the Space, then the scenario organization in `afterAll`, and the teardown throws if anything is left behind.
- **Serial:** the files run serially (`describe.configure({ mode: 'serial' })`).
- **US2-AS6 is skipped** (`test.skip`) by decision of the QA lead on 2026-10-01. It pins [server#6571](https://github.com/alkem-io/server/issues/6571) (QA-PF-01): a concurrent sidebar-only save is silently dropped by a rename. Its assertions are the acceptance oracle for that fix; un-skip when the server fix ships, never soften.

## Risk

| #   | Risk (in user terms)                                                                                                                            | Likelihood     | Impact | Level        | Drives                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ | ------------ | ---------------------------------------- |
| R1  | Saving a Space as a template, or applying one, silently drops or reorders the tabs' sidebars                                                    | Med            | High   | **High**     | it-spec round-trip (L1 and L0)           |
| R2  | After the switch to one widget-driven layout, a tab renders another tab's widgets, the wrong order, or loses one (zero visual diff is the gate) | Med            | High   | **High**     | US1-AS1..AS4                             |
| R3  | An admin's change does not persist, persists to the wrong tab, or changes other tabs                                                            | Med            | Med    | **Med-High** | US2-AS1..AS4                             |
| R4  | Configuration grants access: a member sees an action widget they could not use before                                                           | Low            | High   | Med          | FR-012 gating case                       |
| R5  | Two admins editing the same tab clobber each other                                                                                              | Low (operator) | Med    | Med          | US2-AS6 — **skipped, server#6571**       |
| R6  | Invalid input is stored, or a member can write                                                                                                  | Low            | Med    | Med          | US2-AS5, US2-AS7                         |
| R7  | A tab fetches data for widgets it does not show                                                                                                 | Med            | Low    | Low          | US2-AS2 (`SpaceCalendarEvents`)          |
| R8  | Backfill mis-maps pre-existing rows                                                                                                             | Med            | High   | High         | **not reachable here** — see Not covered |

## Existing coverage before this work

- **Searched:** `server-api/src`, `client-web/src` and `lib/src` on `origin/develop`.
- **API:** the only system-level sidebar assertions are in `journey/conversion/convert-L1-to-L0-flow-states.it-spec.ts`, which covers sidebars carried over on L1→L0 promotion, including an explicitly empty one. Nothing covered templates, defaults, validation or authorization.
- **E2E:** no spec asserted a widget list. A few specs use `nav "Space sidebar"` only as a scope.
- **Owning-repo unit coverage** (`server`): `innovation.flow.state.sidebar.defaults.spec.ts`, `normalize.state.settings.spec.ts`, `innovation.flow.state.settings.dto.update.spec.ts` (including `@ArrayMaxSize(20)`), and the migration specs (static only).

## Scenario → test

| Scenario                                                                                                                                                                                                                                                                                              | Test                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1-AS1 Home default, order                                                                                                                                                                                                                                                                           | `us1-default-rendering.spec.ts › US1-AS1 — Home tab renders Intention & Leads, About, Search, Subspaces, Events, Update in order`                                                                                               |
| US1-AS2 Community default, order                                                                                                                                                                                                                                                                      | `us1-default-rendering.spec.ts › US1-AS2 — Community tab renders Intention & Leads, Search, Contact Leads, Guidelines in order`                                                                                                 |
| US1-AS3 Subspaces default                                                                                                                                                                                                                                                                             | `us1-default-rendering.spec.ts › US1-AS3 — Subspaces tab renders Intention & Leads then Search, and nothing from tabs 1, 2 or 4`                                                                                                |
| US1-AS4 4th+ / added tab default, Post Index                                                                                                                                                                                                                                                          | `us1-default-rendering.spec.ts › US1-AS4 — Knowledge and an added tab render Intention & Leads, Search, Post Index in order; Post Index opens`                                                                                  |
| FR-012 + story "visibility rules"                                                                                                                                                                                                                                                                     | `us1-default-rendering.spec.ts › FR-012 / story visibility rule — action widgets render for the Space admin but not for a plain member`                                                                                         |
| US4-AS2 added tab stores the generic default                                                                                                                                                                                                                                                          | `us1-default-rendering.spec.ts › US4-AS2 — a tab added through Settings > Layout stores the generic default`                                                                                                                    |
| US2-AS1 vocabulary, names, selection and order                                                                                                                                                                                                                                                        | `us2-admin-config.spec.ts › US2-AS1 — Layout dialog lists the whole vocabulary by name, with the current selection in its stored order`                                                                                         |
| US2-AS2 remove a widget; other tabs unchanged; FR-019/SC-008                                                                                                                                                                                                                                          | `us2-admin-config.spec.ts › US2-AS2 — removing Upcoming Events from Home persists, stops its data request, and leaves every other tab unchanged`                                                                                |
| US2-AS3 add and reorder                                                                                                                                                                                                                                                                               | `us2-admin-config.spec.ts › US2-AS3 — adding Upcoming Events to Community and moving it to the top renders it first, then the rest in saved order`                                                                              |
| US2-AS4 empty sidebar (FR-016)                                                                                                                                                                                                                                                                        | `us2-admin-config.spec.ts › US2-AS4 — deselecting every widget on Subspaces empties that sidebar while the tab content still works`                                                                                             |
| US2-AS5 member write rejected                                                                                                                                                                                                                                                                         | `us2-admin-config.spec.ts › US2-AS5 — a plain member cannot change a sidebar through the API and the stored list is unchanged`                                                                                                  |
| US2-AS6 concurrent edits                                                                                                                                                                                                                                                                              | `us2-admin-config.spec.ts › US2-AS6 — a sidebar-only save and a concurrent rename by another admin both persist` — **skipped pending server#6571**                                                                              |
| US2-AS7 invalid input                                                                                                                                                                                                                                                                                 | `us2-admin-config.spec.ts › US2-AS7 — duplicate and unknown widget IDs are rejected with a validation error and leave stored data unchanged`                                                                                    |
| US4-AS1 all four FR-009 defaults (API); US4-AS3 store half; US3-AS1; US3-AS2 update path on L1; FR-003 mutation response                                                                                                                                                                              | `space-templates.it-spec.ts › innovation flow state sidebar round-trip › save-as-template then apply onto a subspace carries every state sidebar verbatim, content and order, including empty`                                  |
| US3-AS2 on an existing L0 (wholesale replace since server#6418)                                                                                                                                                                                                                                       | `space-templates.it-spec.ts › innovation flow state sidebar round-trip › apply-from-template onto an existing L0 Space replaces its flow wholesale: template states, order and sidebars arrive verbatim over the target values` |
| workspace#086 positional subspace sidebars (API): L1 reorder keeps lists by position, L0 lists stay with their tab, template level follows the source space, first-phase delete inheritance on L1 only, subset reorder rejected, `COMMUNITY`/`ACTIVITY` round-trip, member write → `FORBIDDEN_POLICY` | `journey/subspace/subspace-sidebar-positional.it-spec.ts` (10 cases, test-suites#677)                                                                                                                                           |

## 086 — subspace configurable sidebar (UI half)

A subspace (L1/L2) now renders one sidebar for all its phases, read from its **first** phase's stored list. Admins edit that list through **Customize Sidebar** in subspace Settings › Layout. `COMMUNITY` and `ACTIVITY` join the vocabulary at every level. A data-only migration rewrote untouched subspace flows to positional defaults. test-suites#677 pinned the server half over the API. This section covers the client half.

The headline claim is narrower than the feature. Once built, these walks prove that **fresh** subspaces look as they did before the change and that the customize, reorder, add-phase and replace-flow journeys keep the right list on the page. They do not prove the migration, and they do not prove subspace search (see *Not covered*).

**Depth: Deep.** The release carries a migration. The vocabulary and positional semantics are a cross-repo contract. The change alters widget visibility (anonymous viewers lose Recent Activity), and every save is a full-replacement write that could delete stored values. Effort goes to the client integration seams, because the server half is already pinned or unreachable.

### How to run (086)

- **Nightly:** the `subspace-*.spec.ts` and `l0-community-activity.spec.ts` files join the `Sidebar widgets` project through its `/sidebar-widgets/*.spec.ts` glob. They run on the `extended` tier and add about 10 minutes (on a local stack, three batch runs that together covered the five new files took 2 min + 1.9 min + 2.3 min file-serially; the whole `Sidebar widgets` project — these five plus the two existing 040 files, 30 cases — ran in 4.1 min in each of the two verification runs). Each file seeds its own PUBLIC Space → L1 "Alpha" (from the platform subspace template, `allowMembersToCreateSubspaces` pinned to false) → L2 "Alpha-2" and tears it down; the flow-changes file adds a donor L1 "Beta" and a space template made from it.
- **Not built — S-17 and S-18.** Subspace search needs Elasticsearch: the test env has none (dev-orchestration `overlays/test/.../01-elastic-configMap-overlay.yml`: `ELASTICSEARCH_URL: ""`) and neither did the local stack the implementation ran against, so there was no stack to verify them on. They stay in *Not covered* until a stack with Elasticsearch exists for the nightly or a local run (OQ-6).
- **Not coverage:** client-web PR #10444 shipped 25 `@forge-acceptance` walks (`e2e/specs/subspaceSidebar{Customize,Defaults,Widgets}.e2e.spec.ts`). No CI runs them, and they depend on hand-seeded `E2E_SIDEBAR_*` fixtures. This plan read them for locator and copy evidence only and counts them as **zero** coverage.

### Risk (086)

| #   | Risk (in user terms)                                                                                                                                  | Likelihood | Impact | Level        | Drives                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------ | ------------------------- |
| R9  | A never-customized subspace looks different: Quick Actions lost, a search field gained, a different order, or the rail or mobile drawer broken          | Med        | High   | **High**     | S-01, S-02 (S-03, S-04)   |
| R10 | An admin's customization does not appear, appears in only some phases or surfaces, or only after a reload                                              | Med        | High   | **High**     | S-08, S-09                |
| R11 | A per-phase Layout save or a phase reorder writes a stale list back and silently undoes the subspace sidebar (spec R-1)                               | High       | Med    | **High**     | S-12, S-13                |
| R12 | Adding a phase or replacing the flow changes the sidebar unexpectedly, or does not replace it when it should                                           | Med        | Med    | Med          | S-14, S-15                |
| R13 | Configuration grants an action (Add Post, Create Subspace, Invite), or shows anonymous viewers an erroring Recent Activity                             | Low        | High   | Med          | S-05, S-03, S-16          |
| R14 | A save deletes stored values the level does not show (Create Subspace on L2, Apply/Join from an L0 template)                                           | Med        | Med    | Med          | S-06, S-07                |
| R15 | The editor and the page disagree on which phase is first (hidden first phase)                                                                         | Med        | Med    | Med          | S-10                      |
| R16 | An empty sidebar breaks the page, or leaves mobile members with a dead menu                                                                           | Low        | Med    | Low          | S-11                      |
| R17 | Subspace search returns nothing, or leaks posts from other phases (it must use the root Space id, spec R-3)                                           | High       | Med    | **High**     | S-17, S-18 — **deferred** |
| R18 | Community and Recent Activity on an L0 tab do not open their dialogs                                                                                  | Low        | Low    | Low          | S-16                      |
| R19 | The 040 regression net stops running: US2-AS3 has been red since #10444 deployed and, in serial mode, it masks AS4, AS5 and AS7                       | High       | Med    | **High**     | U-1                       |

**Elevated-risk triggers present:** ☑ migration (data-only, unreachable here) · ☑ cross-repo contract · ☑ authorization/visibility (widget gates, D-11) · ☑ data-destructive (full-replacement write) · ☐ breaking contract (additive only) · ☐ infra · ☐ performance.

**Release 79 (alkem-io/alkemio#2196) reconciliation:** the risk profile says customised subspaces are hit by the "irreversible rewrite". In fact the migration leaves touched flows alone. They change because the page now renders their stored first list (spec R-13). The profile also misses two points:
- Anonymous viewers lose Recent Activity at every level (D-11). This needs a release note.
- Rollout order matters (FR-033). A new client against an un-migrated server shows generic lists with a search field, and every save that contains the new values fails.

### Existing coverage before this work (086)

**Searched** 2026-10-26 on `origin/develop` @ `07992141`, across `server-api/src`, `client-web/src` and `lib/src`. Searches were by entity, operation, label and copy: `sidebar`, `SubSpace sidebar`, `Quick Actions`, `Customize Sidebar`, `Recent Activity`, `Add phase`, `Replace innovation flow`, `settings/layout`. Product code was read at client-web `f028c891` (sidebar paths unchanged on develop since) and server `f0837080`.

- **API, full:**
  - `journey/subspace/subspace-sidebar-positional.it-spec.ts` (#677) covers US4-AS1…AS7 and US5 storage of `COMMUNITY`/`ACTIVITY`, and confirms a member's write gets `FORBIDDEN_POLICY` (FR-028 adds no new authorization surface).
  - `templates/space/space-templates.it-spec.ts › …round-trip` covers US2-AS4/AS8 store half (fresh subspaces carry the positional lists), US6-AS2 store half and US5-AS3.
  - `journey/conversion/convert-L1-to-L0-flow-states.it-spec.ts` covers L1→L0 carry-over.
- **API, partial:**
  - `convert-L2-to-L1.it-spec.ts › innovation flow states are preserved` compares whole states, sidebar included, but only on default lists, so a reset to defaults would pass.
  - The positional spec creates phases, but never asserts an appended phase's list (US4-AS11).
- **E2E, full:** `us2-admin-config.spec.ts › US2-AS1` lists all 16 labels (re-aligned by #680), so the L0 editor offering Community and Recent Activity (US5-AS1 editor half) is covered.
- **E2E, incidental (partial for US2-AS1):** a signed-in viewer on the *default* subspace sidebar is exercised by:
  - `public-space/non-member-subspace-navigation.spec.ts` 5.2 (nested-subspace link), 5.3 (Community quick action) and 5.4 (About this Subspace)
  - `callouts/pages/CollaborationPage.ts › addCalloutButton` (subspace Add Post)
  - `form-callout-framing/us3-response-visibility.spec.ts` (Recent Activity on a subspace)

  None of them asserts order, the rail, the drawer, or an anonymous viewer. **No spec drives subspace Settings › Layout.**
- **Owning-repo unit tests (client-web #10444, run in `ci-test.yml`):**
  - `SubspaceSidebar.test.tsx`: default order, Quick Actions grouping, rail, empty list, gates
  - `CustomizeSidebarConnector.test.tsx`: targets the lowest `(sortOrder, id)`; saves only `sidebar`; L2 re-insertion; 13 widgets; target resolved at save time
  - `PhaseLayoutDialog.test.tsx` (sidebar-only mode)
  - `useColumnMenu.test.ts`: no `sidebar` key on L1/L2
  - `useCrdSubspace.test.tsx`: hidden first phase; L2 plan; `subspaceLinks` skip
  - `CrdSubspacePageLayout.search.test.tsx`: search scoped to the root Space id and the active phase; reset on phase switch; fetch parity; anonymous viewers get no activity; Invite gate
  - `sidebarWidgetPlan.test.ts`, `selectFirstFlowState.test.ts`, `SpaceTabSidebarConnector.test.tsx`, `CrdApplySpaceTemplateDialog.test.tsx`
- **Reuse:** 13 of 44 acceptance scenarios need no new test: US3-AS5, AS7, AS9; US4-AS1…AS9; US5-AS3.
  - 5 cannot be reached from here (US2-AS2, AS3, AS5, AS6, AS7: the migration).
  - 4 are deferred or exploratory (US3-AS1, AS2, AS8; US4-AS12).
  - The remaining 22 drive 16 new cases (S-01…S-16) plus two local-stack cases (S-17, S-18).

### Scenario → test (086)

| Scenario                                                                                                                       | Covers                                         | Automated by                       | Layer        |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------- | ------------ |
| An untouched L1 looks as before for an admin: expanded order, collapsed rail, 400 px drawer, no search                         | 086/US2-AS1, AS4/AS8 render, SC-001 (fresh)    | `subspace-us2-defaults.spec.ts › S-01`   | E2E          |
| The same for a plain member, without any editing entry point                                                                   | 086/US2-AS1, US1-AS9                           | `subspace-us2-defaults.spec.ts › S-02`                     | E2E          |
| Anonymous viewer: the same minus Add Post and Recent Activity, no activity request                                              | 086/US2-AS9, SC-008, FR-021                    | `subspace-us2-defaults.spec.ts › S-03`                     | E2E          |
| An untouched L2 looks as before (no nested-subspaces section)                                                                  | 086/US2-AS1 (L2), FR-005                       | `subspace-us2-defaults.spec.ts › S-04`                     | E2E          |
| Gates: admin × member × anonymous over Add Post, Create Subspace, Invite and Recent Activity; a member cannot open Settings › Layout | 086/US3-AS3, US1-AS9, FR-021                   | `subspace-us3-widgets.spec.ts › S-05`                     | E2E (DT)     |
| An L0-tab list on an L1: Apply/Join skipped on render and kept at its index on save                                            | 086/US3-AS6, FR-006, SC-010                    | `subspace-us3-widgets.spec.ts › S-06`                     | E2E + API    |
| L2 Customize: Create Subspace and Subspaces neither offered nor shown, but kept on save; 11 labels                              | 086/US1-AS4, US1-AS2 (L2), SC-010              | `subspace-us1-customize.spec.ts › S-07`                     | E2E + API    |
| Entry point on L1 and L2 (absent on L0); dialog title, help text, no switches, first-phase pre-selection, 13 labels             | 086/US1-AS1, US1-AS2, FR-026/027               | `subspace-us1-customize.spec.ts › S-08`                     | E2E + API    |
| Customize: remove Post Index, put Search first; every phase, rail and drawer without a reload; the API list equals the dialog | 086/US1-AS3, US3-AS4, FR-028                   | `subspace-us1-customize.spec.ts › S-09`                     | E2E + API    |
| A hidden first phase stays authoritative for both the page and the editor                                                      | 086/US1-AS5, FR-002                            | `subspace-us1-customize.spec.ts › S-10`                     | E2E + API    |
| An empty list: no sidebar, rail or collapse control; drawer for admins only                                                     | 086/US1-AS7 (A-5)                              | `subspace-us1-customize.spec.ts › S-11`                     | E2E + API    |
| A per-phase save from a page left stale by a reorder writes no sidebar                                                         | 086/US1-AS6, US4-AS10, FR-029                  | `subspace-us1-customize.spec.ts › S-12`                     | E2E + API    |
| Customize during a pending column reorder, then Save Changes: the list lands at position 1; editor stays honest afterwards     | 086/US1-AS8, US1-AS6, US4-AS10, FR-026/030     | `subspace-us1-customize.spec.ts › S-13`                     | E2E + API    |
| Story QA "customize, then add a phase": appended phase gets the generic list, the sidebar is unchanged                          | 086/US4-AS11                                   | `subspace-us6-flow-changes.spec.ts › S-14`                     | E2E + API    |
| Story QA "load a new flow": the confirmation carries the sidebar sentence and the template's first list replaces the sidebar   | 086/US6-AS1, US6-AS2, FR-032                   | `subspace-us6-flow-changes.spec.ts › S-15`                     | E2E + API    |
| L0 tab: the Community and Recent Activity buttons open their dialogs; anonymous viewers get no Recent Activity                  | 086/US5-AS1 render, US5-AS2, FR-007            | `l0-community-activity.spec.ts › S-16` (two cases)                     | E2E          |
| L0 editor offers Community and Recent Activity                                                                                 | 086/US5-AS1 editor                             | `us2-admin-config.spec.ts › US2-AS1` | E2E          |
| Positional reorder and delete on L1, L0 controls, template level, partial reorder rejected, member write refused               | 086/US4-AS1…AS7, FR-014…018, FR-028            | `subspace-sidebar-positional.it-spec.ts` | API      |
| Fresh subspaces carry the positional lists; apply onto L1 or L0 carries lists verbatim                                         | 086/US2-AS4/AS8 store, US6-AS2 store, US5-AS3  | `space-templates.it-spec.ts › innovation flow state sidebar round-trip` | API |
| Story QA "convert": L1→L0 carry-over                                                                                           | 086/US5-AS3                                    | `convert-L1-to-L0-flow-states.it-spec.ts › per-state settings (sidebar) carried over verbatim` | API |
| Story QA "convert": L2→L1 carry-over of a customized list                                                                      | story QA substep                               | `convert-L2-to-L1.it-spec.ts › the customized first-phase sidebar survives the promotion (086 U-2)` | API |
| Search filters the active phase, root-scoped (not the parent's same-named phase); on L2 a phase switch resets                   | 086/US3-AS1, US3-AS2, SC-005                   | **not built** (no Elasticsearch anywhere to verify; see *Not covered*) | E2E (local) |

### Regression guards and existing tests the change invalidates (086)

- **U-1 — `us2-admin-config.spec.ts › US2-AS3` (P1) — re-aligned in this PR.**
  - **Evidence:** red on every nightly since #10444 deployed. On 2026-10-22 (run 39803834920) the poll timed out after 20 s with `Intention & Leads` still first, so the drag never moved the row; it failed on all 3 retries.
  - **Cause (confirmed on a local stack):** the poll fired `Space`, `ArrowUp` and `Space` back to back; dnd-kit measures droppable rects only after the lift, so an arrow pressed that early is a no-op, and a press that lands in the same tick as the previous one is dropped. 086 also lengthened the dialog's list to 16 entries.
  - **Done:** the case now uses `subspace-sidebar.helpers.ts › keyboardDrag` (wait for the live-region lift, press one step at a time until "over droppable area intent", each press acknowledged by the live region and followed by the end of the sortable's slide transition, then drop and wait for "dropped"). Every assertion is kept; the case is green locally.
  - **U-1b (QA lead's call, OQ-5):** `mode: 'serial'` is left in place.
- **U-2 — `convert-L2-to-L1.it-spec.ts` (P3).** Before converting, give the L2's first phase a non-default list (`[COMMUNITY, CREATE_SUBSPACE, SUBSPACE_LINKS, ACTIVITY]`). The existing equality assertion then catches a sidebar reset.
- **Already re-aligned:** the positional-defaults assertion in `space-templates.it-spec.ts` (#677), and `WIDGET_LABEL` gaining `COMMUNITY`/`ACTIVITY` (#680).
- **Confirmed unaffected:** the green 2026-10-22 nightly re-ran each of these against #10444:
  - `us1-default-rendering.spec.ts` (all six cases; L0 lists are unchanged)
  - `us2-admin-config.spec.ts › US2-AS1, AS2`
  - `non-member-subspace-navigation.spec.ts` 5.2–5.4, plus the `CollaborationPage.addCalloutButton` consumers on subspaces. The default subspace list keeps Community, About, Add Post and nested links.
  - `form-callout-framing/us3-response-visibility.spec.ts` (signed-in viewers keep Recent Activity)
  - `account-deletion/former-member-activity.spec.ts` (header Activity button, unchanged)

### Non-functional (086)

- **Performance:** no new query unless `search` is configured. FR-022 skip flags are pinned by unit tests. The reorder response grows to every phase, at most about 9 rows. No automation; the 055 query-profiling gap (D-04) still stands.
- **Security:** no new privilege or resolver. API negatives are covered (#677). The UI gates are S-05, S-03 and S-16. Search is scoped by the root Space id and a globally unique phase id, and the scope is unit-pinned. Sidebar edits are not audited, and nothing requires that.
- **Reliability:** a failed save keeps the dialog open, and the save target is resolved at save time; both are unit-pinned. Delete-first atomicity (US4-AS12) is server-unit only, because nothing here can inject a fault. Deploy order goes to a manual row.
- **Compatibility and a11y:** cases run at 1920/1440 desktop and at a 400 px phone width. Rail buttons are located by accessible name, which pins their labels. Keyboard reorder is covered by U-1. Screen-reader output and drawer focus need a manual row, because there is no axe harness (D-05).

### Exploratory charters (086)

- **EXP-1 (US3-AS8):** throttle the network on a subspace with a non-default list and look for any flash of the default widget set, or of the generic list, while the flow loads. An automated oracle would need a fixed delay inside a route handler.
- **EXP-2:** two admins. One reorders, deletes the first phase or replaces the flow; the other then saves Customize Sidebar from a page that is now stale. The suspect: `CustomizeSidebarConnector` resolves the "first" phase from the Apollo cache, so the write may land on a phase that is no longer first and change nothing visible. This belongs to the same class as server#6571.

## Not covered

| Item                                                                                                                                                                | Why                                                                                                                                                                                                                                                                                     | Clears when                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| US1-AS5 — missing or unknown stored entries render safely                                                                                                           | Needs a hand-edited `settings` row. Since 2026-09-28 the harness has a loopback-only Postgres primitive (`queryHarnessDb`), so this can now be built for the local stack (it would skip itself nightly). Not built in this PR; unit-pinned in server `normalize.state.settings.spec.ts` | Someone adds the loopback case                                                                |
| US3-AS3 — a pre-feature template gets defaults on apply                                                                                                             | Same: needs a template row without the key                                                                                                                                                                                                                                              | Same as above                                                                                 |
| US3-AS2 create-from-template path, and the story's "subspace template used to create an L0 Space gets the Tab 4 widgets on every tab"                               | Only the update-to-template path is exercised. Creating a Space from a template is a separate code path                                                                                                                                                                                 | An API case creating an L0 from a subspace template (cheap; open decision for the plan owner) |
| US4-AS3 UI half and the story's "L1 & L2 have no sidebar settings" — the subspace Layout dialog hides the sidebar section and round-trips the stored list untouched | No walk drives subspace settings. The store half (subspace states carry the 086 positional defaults; see `journey/subspace/subspace-sidebar-positional.it-spec.ts`) is pinned by the it-spec                                                                                            | **Covered since the 086 UI PR by `subspace-us1-customize.spec.ts › S-12, S-13`** (§086). 086 supersedes "no sidebar settings on L1/L2": subspaces edit theirs through Customize Sidebar |
| SC-003 / FR-008 backfill, and the story's "migration leaves all spaces looking the same"                                                                            | Pre-existing rows are unreachable: every entity these suites create is post-migration, and DB access is loopback-only (`docs/qa-knowledge/deferred.md` D-01)                                                                                                                            | Not expected to clear; release-ops SQL check                                                  |
| SC-006 additive contract                                                                                                                                            | Owning repo's schema-diff gate                                                                                                                                                                                                                                                          | n/a here                                                                                      |
| FR-005 "reject lists longer than 20"                                                                                                                                | Unreachable through the API: input is enum-typed and duplicates are rejected, so no valid list exceeds the 14-value vocabulary (QA-PF-03). Pinned by the server DTO unit spec only                                                                                                      | The spec drops the clause, or the vocabulary outgrows 20                                      |
| Six-locale widget names (FR-014)                                                                                                                                    | Locale assertions have no home in this repo (standing gap)                                                                                                                                                                                                                              | A `client-web` unit test beside the locale files                                              |
| 086/SC-001 + US2-AS2…AS7 — the migration rewrote real pre-existing subspace flows (untouched → positional; touched left alone; null rows; orphans; idempotent), so the subspaces that exist today look as before | No DB access (D-01): every subspace here is post-migration. Server proof is static (`1791100000000-SubspaceSidebarPositionalDefaults.spec.ts`) plus the spec's throwaway-Postgres run (`verification/migration-live.txt`) | Not expected to clear — manual rows M-1, M-2 on ACC |
| 086/US3-AS1, AS2, SC-005 — subspace search end to end (S-17, S-18) | No Elasticsearch on the test env (`ELASTICSEARCH_URL: ""`) nor on the local stack the walks were built against — the 055 search blocker; a case nobody can run green is not built. Root-id + phase scoping is unit-pinned (`CrdSubspacePageLayout.search.test.tsx`) | A stack with Elasticsearch for the nightly or a local run (OQ-6); manual row M-3 meanwhile |
| 086/US3-AS8 — no flash of a default widget set while the flow loads | The oracle needs a delayed response — a fixed wait in a route handler | Charter EXP-1 |
| 086/US4-AS12 — delete-first inheritance is atomic with the delete | No fault-injection lever (standing). Server unit `innovation.flow.service.spec.ts` | A fault-injection lever exists |
| 086/US3-AS5 grouping, US3-AS7 fetch parity, US4-AS8 tie-break, US4-AS9 unknown values move verbatim | Covered at unit level (client `SubspaceSidebar.test.tsx`, `CrdSubspacePageLayout.search.test.tsx`, `useCrdSubspace.test.tsx`; server `sortBySortOrder.spec.ts`, `withRawSidebar.spec.ts`). An unknown value cannot traverse the API | n/a — no system case needed |
| 086/US3-AS9 — Add Post pre-selects the active phase | Path unchanged by #10444 (`CalloutFormConnector activeFlowStateName`). Subspace Add Post is exercised by the callout specs on the default list | Re-open if the create dialog changes |
| 086/US5-AS3 — rendering after apply or L1→L0 conversion | Composition of the API store half (pinned) and the L0 render of `COMMUNITY`/`ACTIVITY` (S-16) | n/a |
| 086/SC-009, FR-031 — six-locale copy of the seven new `spaceSettings` keys | client-web has **no** `spaceSettings` parity test (the `space` namespace has one). All 7 keys exist in all 6 files at `f028c891` (checked 2026-10-26) | client-web adds `spaceSettings.parity.test.ts` |
| 086/SC-003 "under a minute", pixel parity of the untouched look, keyboard and screen-reader use of the dialog and drawer | Usability and visual judgement. No a11y or visual-diff harness (D-05) | Manual row M-4 |
| 086/FR-033 — server and migration roll out before the client | Release procedure, not product behaviour | Manual row M-5 |

## Open questions (need a decision, not a test)

- **OQ-1 (QA-PF-02):** spec US1-AS2/AS3/AS4 and US4-AS2 list orders and default lists that contradict FR-009 and the story. The edge cases still say "vocabulary is 12". The tests follow FR-009 plus 055.
- **OQ-2 (QA-PF-04):** FR-015 and US3-AS2 still say "subject to the existing L0 fixed-tab preservation rules", but server#6418 removed them.
- **OQ-3:** a member page that is already open keeps the tab composition it loaded before an admin saved. Observed live: US2-AS3 before the walk reloads, tab switch only. Does "members see the new composition on their next visit" mean the next page load (what US2 asserts) or the next tab switch?
- **OQ-4 (086):** the story's QA step says "load a new flow: setting survives". Spec US6 (operator ruling D-19) says the sidebar is **replaced** by the template's. S-15 follows the spec. The story text should be corrected.
- **OQ-5 (086, U-1b):** should `us2-admin-config.spec.ts` drop serial mode, so that one red no longer stops AS4, AS5 and AS7 from running nightly?
- **OQ-6 (086):** S-17 and S-18 can only run as `@local-stack`, because the test env has no ES. Accept that, or ask ops for ES on the test env? The 055 search walks deferred on the same blocker could take the same route.
- **OQ-7 (086, EXP-2):** if Customize Sidebar saved from a stale page writes a phase that is no longer first, is that a defect, or the accepted two-admin race (server#6571 class)?
