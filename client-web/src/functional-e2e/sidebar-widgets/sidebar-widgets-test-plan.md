# Test plan — per-tab sidebar widgets (040)

> **Status:** Draft · **Story:** [client-web#10092](https://github.com/alkem-io/client-web/issues/10092) (Space Sidepanel — this feature is its configurability slice) · **Spec:** `specs/040-sidebar-widget-config/` in `alkem-io/agents-hq` (source of truth for the US/AS/FR/SC ids below) · **PR:** test-suites#615

- **Suites:**
  - `client-web/src/functional-e2e/sidebar-widgets/` — the US1 and US2 acceptance walks, plus the shared fixture in `sidebar-widgets.helpers.ts`.
  - `server-api/src/functional-api/templates/space/space-templates.it-spec.ts` › `innovation flow state sidebar round-trip` — the template round-trip that operator RULING 3 makes binding, plus the default lists at API level.
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

| Scenario                                                                                                                 | Test                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1-AS1 Home default, order                                                                                              | `us1-default-rendering.spec.ts › US1-AS1 — Home tab renders Intention & Leads, About, Search, Subspaces, Events, Update in order`                                                                                               |
| US1-AS2 Community default, order                                                                                         | `us1-default-rendering.spec.ts › US1-AS2 — Community tab renders Intention & Leads, Search, Contact Leads, Guidelines in order`                                                                                                 |
| US1-AS3 Subspaces default                                                                                                | `us1-default-rendering.spec.ts › US1-AS3 — Subspaces tab renders Intention & Leads then Search, and nothing from tabs 1, 2 or 4`                                                                                                |
| US1-AS4 4th+ / added tab default, Post Index                                                                             | `us1-default-rendering.spec.ts › US1-AS4 — Knowledge and an added tab render Intention & Leads, Search, Post Index in order; Post Index opens`                                                                                  |
| FR-012 + story "visibility rules"                                                                                        | `us1-default-rendering.spec.ts › FR-012 / story visibility rule — action widgets render for the Space admin but not for a plain member`                                                                                         |
| US4-AS2 added tab stores the generic default                                                                             | `us1-default-rendering.spec.ts › US4-AS2 — a tab added through Settings > Layout stores the generic default`                                                                                                                    |
| US2-AS1 vocabulary, names, selection and order                                                                           | `us2-admin-config.spec.ts › US2-AS1 — Layout dialog lists the whole vocabulary by name, with the current selection in its stored order`                                                                                         |
| US2-AS2 remove a widget; other tabs unchanged; FR-019/SC-008                                                             | `us2-admin-config.spec.ts › US2-AS2 — removing Upcoming Events from Home persists, stops its data request, and leaves every other tab unchanged`                                                                                |
| US2-AS3 add and reorder                                                                                                  | `us2-admin-config.spec.ts › US2-AS3 — adding Upcoming Events to Community and moving it to the top renders it first, then the rest in saved order`                                                                              |
| US2-AS4 empty sidebar (FR-016)                                                                                           | `us2-admin-config.spec.ts › US2-AS4 — deselecting every widget on Subspaces empties that sidebar while the tab content still works`                                                                                             |
| US2-AS5 member write rejected                                                                                            | `us2-admin-config.spec.ts › US2-AS5 — a plain member cannot change a sidebar through the API and the stored list is unchanged`                                                                                                  |
| US2-AS6 concurrent edits                                                                                                 | `us2-admin-config.spec.ts › US2-AS6 — a sidebar-only save and a concurrent rename by another admin both persist` — **skipped pending server#6571**                                                                              |
| US2-AS7 invalid input                                                                                                    | `us2-admin-config.spec.ts › US2-AS7 — duplicate and unknown widget IDs are rejected with a validation error and leave stored data unchanged`                                                                                    |
| US4-AS1 all four FR-009 defaults (API); US4-AS3 store half; US3-AS1; US3-AS2 update path on L1; FR-003 mutation response | `space-templates.it-spec.ts › innovation flow state sidebar round-trip › save-as-template then apply onto a subspace carries every state sidebar verbatim, content and order, including empty`                                  |
| US3-AS2 on an existing L0 (wholesale replace since server#6418)                                                          | `space-templates.it-spec.ts › innovation flow state sidebar round-trip › apply-from-template onto an existing L0 Space replaces its flow wholesale: template states, order and sidebars arrive verbatim over the target values` |

## Not covered

| Item                                                                                                                                                                | Why                                                                                                                                                                                                                                                                                     | Clears when                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| US1-AS5 — missing or unknown stored entries render safely                                                                                                           | Needs a hand-edited `settings` row. Since 2026-09-28 the harness has a loopback-only Postgres primitive (`queryHarnessDb`), so this can now be built for the local stack (it would skip itself nightly). Not built in this PR; unit-pinned in server `normalize.state.settings.spec.ts` | Someone adds the loopback case                                                                |
| US3-AS3 — a pre-feature template gets defaults on apply                                                                                                             | Same: needs a template row without the key                                                                                                                                                                                                                                              | Same as above                                                                                 |
| US3-AS2 create-from-template path, and the story's "subspace template used to create an L0 Space gets the Tab 4 widgets on every tab"                               | Only the update-to-template path is exercised. Creating a Space from a template is a separate code path                                                                                                                                                                                 | An API case creating an L0 from a subspace template (cheap; open decision for the plan owner) |
| US4-AS3 UI half and the story's "L1 & L2 have no sidebar settings" — the subspace Layout dialog hides the sidebar section and round-trips the stored list untouched | No walk drives subspace settings. The store half (subspace states carry the generic default) is pinned by the it-spec                                                                                                                                                                   | A walk on subspace Settings > Layout                                                          |
| SC-003 / FR-008 backfill, and the story's "migration leaves all spaces looking the same"                                                                            | Pre-existing rows are unreachable: every entity these suites create is post-migration, and DB access is loopback-only (`docs/qa-knowledge/deferred.md` D-01)                                                                                                                            | Not expected to clear; release-ops SQL check                                                  |
| SC-006 additive contract                                                                                                                                            | Owning repo's schema-diff gate                                                                                                                                                                                                                                                          | n/a here                                                                                      |
| FR-005 "reject lists longer than 20"                                                                                                                                | Unreachable through the API: input is enum-typed and duplicates are rejected, so no valid list exceeds the 14-value vocabulary (QA-PF-03). Pinned by the server DTO unit spec only                                                                                                      | The spec drops the clause, or the vocabulary outgrows 20                                      |
| Six-locale widget names (FR-014)                                                                                                                                    | Locale assertions have no home in this repo (standing gap)                                                                                                                                                                                                                              | A `client-web` unit test beside the locale files                                              |

## Open questions (need a decision, not a test)

- **OQ-1 (QA-PF-02):** spec US1-AS2/AS3/AS4 and US4-AS2 list orders and default lists that contradict FR-009 and the story. The edge cases still say "vocabulary is 12". The tests follow FR-009 plus 055.
- **OQ-2 (QA-PF-04):** FR-015 and US3-AS2 still say "subject to the existing L0 fixed-tab preservation rules", but server#6418 removed them.
- **OQ-3:** a member page that is already open keeps the tab composition it loaded before an admin saved. Observed live: US2-AS3 before the walk reloads, tab switch only. Does "members see the new composition on their next visit" mean the next page load (what US2 asserts) or the next tab switch?
