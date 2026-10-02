# Test plan — Space Classifications (024)

> **Status:** Implemented — challenged and reworked 2026-10-01 (test-suites#613, QA-CH-01…22) · **Story:** epic [alkem-io/alkemio#1985](https://github.com/alkem-io/alkemio/issues/1985), story [alkem-io/alkemio#2049](https://github.com/alkem-io/alkemio/issues/2049) · **Spec:** `specs/024-classifications/` in `alkem-io/agents-hq` (source of truth; walk ids `USn-ASm` are `repos.yaml › tracks › acceptance`). Where #2049's acceptance list and the spec disagree (compact card/tile/search display, "other defaults"), the spec's operator rulings D2/D6 win — see QA-PF-02.

- **Suites:**
  - `client-web/src/functional-e2e/classifications/classifications-space.spec.ts` — Space-side walks SL-01…08 (US1, US3, REMOVAL).
  - `client-web/src/functional-e2e/classifications/classifications-templates.spec.ts` — template-side walks TL-01…08 (US1, US2, seed, out of scope).
  - `server-api/src/functional-api/journey/space/space-classifications.it-spec.ts` — the API contract: authorization, read surface, write rules, value ids.
  - Shared: `classifications.fixture.ts` (seed/teardown, personas, raw GraphQL), `classifications.helpers.ts` (page helpers), `console-guard.ts` (crash tripwire — not counted as coverage).
- **Product under test when last run:** server `develop` @ `615817441` (0.167.0), client-web `develop` @ `2e576ee17` — both include server#6380 and client-web#10163.
- **Personas** (harness, `AUTH_TEST_HARNESS_PASSWORD`): `spaceAdmin` — the Space's own admin, the editor (FR-014a grants writes to whoever can edit the About; a platform admin would pass for the wrong reason); `spaceMember` — a plain member, the viewer; `nonSpaceMember` and an anonymous caller for the read-surface and denial cases.

## How to run

```bash
cd client-web
UI_HEADLESS=true pnpm run test:classifications      # both walk files, 2 workers

cd ../server-api
pnpm exec vitest run --project journey src/functional-api/journey/space/space-classifications.it-spec.ts
```

- **Nightly:** the walks run in the nightly Playwright project `Classifications` (`client-web/config/playwright.config.nightly.ts`); the it-spec runs nightly through the `journey/**` glob of the server-api `nightly` project.
- **Data:** each file seeds its own Space through `TestScenarioFactory` (the Space walk adds one subspace) and two freeform Tags, and deletes subspace, Space and organization in `afterAll`; the teardown throws if anything is left. Entries hang off the Space About and templates live in the Space's own library, so the tree deletion removes everything. Nothing reads or writes pre-existing stack data.
- **Order:** inside a file tests run in declaration order on one worker (`describe.configure({ mode: 'default' })`); every test owns uniquely labelled artifacts, so none depends on another. TL-05 is one journey written as five `test.step`s.

## Risk

| #         | Risk (in user terms)                                                                      | Likelihood | Impact | Level    | Drives                                         |
| --------- | ----------------------------------------------------------------------------------------- | ---------- | ------ | -------- | ---------------------------------------------- |
| R-1       | Editing, renaming or deleting a template changes the classifications Spaces already added | Low        | High   | **High** | TL-05 (byte-identical API snapshot), SL-06     |
| R-8       | "Hidden" is read as "private" — a hidden entry is in fact anonymously readable            | Med        | High   | **High** | SL-05 wording + anonymous read; it-spec        |
| R-6       | Narrowing multi→single silently truncates a selection                                     | Med        | High   | **High** | it-spec (API-only path, D4)                    |
| A-1       | A member or outsider can add, select, hide, edit or remove a classification               | Low        | High   | **High** | it-spec FR-014a denials; SL-07 (UI half)       |
| A-2       | The selection write clobbers sibling values, or a reselection re-adds the entry           | Med        | Med    | Med      | SL-01 (sibling-safe deselect, SC-002 identity) |
| A-3       | Duplicate labels slip through (case/whitespace), or groups render alphabetically          | Med        | Med    | Med      | SL-02, SL-04, it-spec                          |
| A-4       | Value ids drift between Spaces or are re-derived on rename, breaking aggregation          | Low        | High   | Med      | TL-04b, TL-06, TL-08, it-spec (SC-007)         |
| R-4       | The seeded SDGs pack is invisible to pickers                                              | Low        | High   | Med      | TL-01, TL-02, TL-03                            |
| R-10      | Classification actions emit activity-stream entries                                       | Low        | Med    | Low      | TL-07 (UI absence only)                        |
| R-5/13/14 | Seed re-run overwrites edits, races across pods, or leaves empty auth policies            | Med        | Med    | Med      | **not reachable here** — see Not covered       |

## Existing coverage before this work

- **Searched:** `server-api/src`, `client-web/src`, `lib/src` on `origin/develop` @ `7b1b6ce73`. No classification operation documents or request wrappers existed; the generated types (`lib/src/core/generated/alkemio-schema.ts`) already carried the six mutations.
- **Owning-repo coverage** (`server`): unit specs under `src/domain/space/classification.entry/`, `src/domain/common/classification-value/`, `src/core/bootstrap/bootstrap.service.classification.spec.ts`, and `test/integration/classification/classification-entry.spec.ts` — which is **mock-only** ("no real DB or HTTP server", per its header). Nothing durable exercised the GraphQL contract against a running stack; the forge run's gql-live probes were one-off.

## Scenario → test

| Scenario                                                                                                    | Test                                                                              |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| US1-AS1 picker lists platform + top-level Space templates, distinguished, with descriptions, no create path | `classifications-templates.spec.ts › TL-03`                                       |
| US1-AS2 picked entry persists with 0 selected                                                               | `classifications-space.spec.ts › SL-01`                                           |
| US1-AS3 single-select: second value replaces the first                                                      | `classifications-space.spec.ts › SL-03`                                           |
| US1-AS4 multi-select values persist on reload, no form save                                                 | `classifications-space.spec.ts › SL-01`                                           |
| US1-AS5 template rename/edit/delete leaves the entry byte-identical                                         | `classifications-templates.spec.ts › TL-05`                                       |
| US1-AS6 duplicate label (incl. case/whitespace) rejected; alias succeeds                                    | `classifications-space.spec.ts › SL-02`; API: it-spec › write rules               |
| US1-AS7 subspace picker offers the top-level library; entry attaches to the subspace                        | `classifications-space.spec.ts › SL-08`                                           |
| US1-AS8 / SC-002 reselection keeps the same entry id, sortOrder and position                                | `classifications-space.spec.ts › SL-01`                                           |
| US2-AS1 template created with no approval, all fields captured                                              | `classifications-templates.spec.ts › TL-04a`, `TL-04b`                            |
| US2-AS2 slugified ids, deterministic suffix, rename keeps the id                                            | `classifications-templates.spec.ts › TL-08`, `TL-04b`; API: it-spec › value ids   |
| US2-AS3 duplicate explicit id rejected, never suffixed                                                      | `classifications-templates.spec.ts › TL-08`; API: it-spec › value ids             |
| US2-AS4 a newly saved template is offered by the picker                                                     | `classifications-templates.spec.ts › TL-04b`                                      |
| US3-AS1 labelled groups, authored value order, separate from Tags                                           | `classifications-space.spec.ts › SL-04`                                           |
| US3-AS2 hidden: editor badge, viewer absence, anonymous API still returns it with its flag                  | `classifications-space.spec.ts › SL-05`; API: it-spec › read surface              |
| US3-AS4 zero-value entry: editor-only empty group                                                           | `classifications-space.spec.ts › SL-04`                                           |
| US3-AS5 addition order; remove + re-add moves to the end                                                    | `classifications-space.spec.ts › SL-04`; API: it-spec › read surface              |
| REM-AS1 confirmed, permanent removal; template and other Spaces untouched                                   | `classifications-space.spec.ts › SL-06`                                           |
| FR-014a writes need the Space's edit right — UI affordances                                                 | `classifications-space.spec.ts › SL-07`                                           |
| FR-014a writes need the Space's edit right — API denials (member, non-member, 6 mutations)                  | `space-classifications.it-spec.ts › authorization`                                |
| FR-002a value-set bounds 0/1/50/51 (entry and template paths)                                               | `space-classifications.it-spec.ts › write rules`; client 0-values guard: `TL-04a` |
| FR-012c narrowing rejected atomically, naming the selection                                                 | `space-classifications.it-spec.ts › write rules`                                  |
| FR-010c / SC-007 two Spaces hold the template's value ids verbatim                                          | `space-classifications.it-spec.ts › value ids`; import copy: `TL-06`              |
| FR-013 / SC-006 Tags untouched by adds and removals                                                         | `classifications-space.spec.ts › SL-04`                                           |
| FR-005a seed present, 17 values in order, no Language/Sector (D6)                                           | `classifications-templates.spec.ts › TL-01`, `TL-02`                              |
| Walk §11 import from the platform library                                                                   | `classifications-templates.spec.ts › TL-06`                                       |
| Walk §12 out of scope: no Explore filter/chips, no search hit, no activity (D2, FR-021)                     | `classifications-templates.spec.ts › TL-07`                                       |

## Not covered

| Scenario                                                                                    | Why not automated                                                                                                                     | Where it belongs                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| US2-S2 two same-named templates told apart by `name-id`                                     | `name-id` is not rendered; spec routes it to the server unit spec                                                                     | server T046 (`template.service.classification.spec.ts`) |
| Seed re-run idempotency, parallel-bootstrap race, seeded-pack auth (R-5/13/14, SC-003a, D5) | Needs a bootstrap restart / fresh DB — no infra lever from inside a test (harness.md)                                                 | server T047/T055; release-ops check                     |
| FR-005b a classification template in another public platform pack is offered                | Needs a second publicly listed platform pack — a platform-level write on the shared stack                                             | Manual QA on a disposable stack                         |
| FR-021 no analytics events                                                                  | No analytics harness; TL-07 covers only the visible activity feed                                                                     | server T067 (absence of emission)                       |
| Free-text search does not index classification text                                         | TL-07's check is soft: a meaningful negative needs `adminSearchIngestFromScratch` + settle on a stack with Elasticsearch (harness.md) | Manual QA, or an it-spec once re-ingest is affordable   |
| FR-017a / SC-010 ad-hoc create + edit-definition parity with template-sourced entries       | API-only (D4) and the writer client (vng-gemeente-delers) is out of tree; the it-spec covers its validation rules, not display parity | Follow-up it-spec if the API gains callers here         |
| Section placement, keyboard-only walk, screen-reader labels, i18n (walk §2, §13)            | Visual judgement; no axe harness; locale copy belongs to client-web                                                                   | Manual QA; client-web locale tests                      |
| Walk §11 platform-pack create dialog                                                        | Needs platform-admin pack writes on the shared stack; TL-04 covers the identical form in a Space library                              | Manual QA on a disposable stack                         |

## Product findings

- **QA-PF-01 — pending product decision.** Manual walk §11 expects a "Classifications" entry in the `/innovation-library` type filter and a Multi-select badge on the gallery card; neither is rendered (`TemplateTypeFilter.tsx` `ALL_TYPES` omits classification) and no FR asks for them. Not chased now (QA lead, 2026-10-02): the two checks live in `TL-01b`, a `test.skip` whose assertions are the oracle for that decision — un-skip if product builds them, delete the test if the walk record is corrected instead.
- **QA-PF-02 — spec vs story.** #2049's acceptance list still names compact card/tile/search display and "other defaults"; the epic's 2026-08-20 must-have edit dropped the show/hide toggle and SDG seeding. The spec (D2, D6) governs these suites; product should reconcile the story.
- **QA-PF-03 — note.** FR-002a requires a "clear, actionable" error; the server returns the raw class-validator dump (`arrayMinSize` / `arrayMaxSize`) with the generic `badUserInput` user message.
