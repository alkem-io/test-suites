# Test plan — Contributors callout: richer contributor cards (077)

> **Status:** Draft — revised 2026-10-02 after the QA challenge of test-suites#641; awaiting QA lead review · **Depth:** standard (one P1 privacy rule, one content-injection risk, two repos) · **Story:** [client-web#10316](https://github.com/alkem-io/client-web/issues/10316) · **Spec:** `agents-hq/specs/077-richer-contributor-cards/` on `main` (amended 2026-09-28: tag lists merged, one row of pills with a "+N" chip) · **Product:** [server#6534](https://github.com/alkem-io/server/pull/6534), [client-web#10336](https://github.com/alkem-io/client-web/pull/10336), both merged 2026-09-29

- **Suites:** `client-web/src/functional-e2e/contributors-callout/` (acceptance walks, this directory) and `server-api/src/functional-api/callout/contributors-collection/` (API contract and visibility).
- **Product findings:** QA-PF-01 [client-web#10369](https://github.com/alkem-io/client-web/issues/10369) — two exact-name profile links per card (FR-016). QA-PF-03 [client-web#10370](https://github.com/alkem-io/client-web/issues/10370) — the "+N" chip wraps to a second row when the first tag fills the row (FR-003 / US1-AS7).
- **Requirement questions** (spec silent or self-contradictory): posted on the story, [client-web#10316 comment](https://github.com/alkem-io/client-web/issues/10316#issuecomment-5955451226).

Feature 077 adds five values to each card of the Contributors post — `tagline`, `tags`, `joinedDate`, `website`, `associatesCount` — and the card UI that shows them: tagline with a user fallback, one row of tag pills with a "+N" chip, a location row, a bottom line ("Joined this space …" / "N associates in this organization"), equal card heights, a "…" menu (View Profile, Message) and an organisation website control. **Headline claim:** the data contract and the members-only visibility rule are pinned at API level; every user story has a browser walk against self-seeded data; four tests (US1-AS7 tag-row wrap, US2-AS4, US3-AS7, US5 / FR-016) are `test.skip`ped by QA-lead decision (2026-10-05) against the two product findings — skipped, not failing — and keep their assertions as the acceptance oracle for the fixes.

## How to run

Needs a running app and GraphQL API reachable from `server-api/.env` / `client-web/.env`, the harness personas registered, and `AUTH_TEST_HARNESS_PASSWORD` set (US2 signs in as `non.space` and `space.admin`). No other setup: every file seeds its own public Space through the API and deletes it in `afterAll`.

```bash
cd server-api
pnpm exec vitest run --project callouts src/functional-api/callout/contributors-collection/

cd ../client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/contributors-callout --workers=1
```

Nightly: the API specs run in the `nightly` vitest project (`callout/**` glob). The five `us*` walks run as the **`Contributors callout`** project of `config/playwright.config.nightly.ts` (60 s / 10 s budgets). The shipped `0.1contributors-callout.spec.ts` is **not** in the nightly yet: its scenario cleanup lives only in its Member block, so a failure in the Admin block leaks a Space, an Organization and a VC — and it is red on QA-PF-01 today. Add it once its cleanup moves to file level (decision for the suite owner).

## Risk

| #   | Risk (in user terms)                                                             | Likelihood | Impact         | Level    | Drives                                                      |
| --- | -------------------------------------------------------------------------------- | ---------- | -------------- | -------- | ----------------------------------------------------------- |
| R1  | People's tagline, tags or join month reach non-members of a "members only" space | Low        | High (privacy) | **High** | API: `contributor-cards-visibility.it-spec.ts`; UI: US2-AS2 |
| R2  | A hostile stored website becomes a clickable link or runs script                 | Low        | High           | **High** | API website rule; UI US5-AS2                                |
| R3  | The join month shows the wrong month to viewers west or east of UTC              | Medium     | Medium         | **High** | US4-AS1/AS2 (two oracles, three timezones)                  |
| R4  | The associates number differs from the organisation's own profile                | Medium     | Medium         | Medium   | API parity at 0 and N                                       |
| R5  | The card list everyone uses (search, filter, paging, counts) regresses           | Medium     | High           | **High** | US2-AS1, shipped 0.1 suite                                  |
| R6  | Tags show the wrong list, order or duplicates                                    | Medium     | Low            | Medium   | API tag rule; US1-AS3                                       |
| R7  | Cards break layout: unequal heights, rows wrap, page scrolls sideways            | Medium     | Low            | Medium   | US1-AS6/AS7                                                 |
| R8  | A value belonging to one post (role, month) leaks into another post's card       | Low        | Medium         | Medium   | US2-AS6, US4-AS3                                            |

## Existing coverage before this work

| Area                                                                                                                                           | Where                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create / edit the Contributors post, type switch with counts, name search, empty states, List/Map, member cannot create (features 008/009/025) | `0.1contributors-callout.spec.ts` — kept, not in the nightly (see How to run); red on QA-PF-01 (test 1.4 finds two exact-name links) and leaks its scenario when it fails |
| `ContributorCollectionItem` before 077 (identity, role, location)                                                                              | `server-api/.../visual/*` (create helper only)                                                                                                                            |

## Scenario → test mapping

API (`server-api/src/functional-api/callout/contributors-collection/`):

| Spec                                                                                                                              | Test                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| FR-027/FR-028 null matrix                                                                                                         | `contributor-cards.it-spec.ts › FR-028 — USER has no website/associatesCount, …`                                             |
| FR-004 users: merged, case-dedupe (first spelling), blanks dropped                                                                | `… › US1-AS3 — a user gets skills then keywords merged, …`                                                                   |
| FR-004 users: keywords only; empty list                                                                                           | `… › US1-AS3 — a user with no skills gets the keywords`, `… › D-EMPTY — a user with no tags gets an empty list, not null`    |
| FR-001 tagline trimmed; blank ⇒ null                                                                                              | `… › FR-001 — the tagline is trimmed; …`                                                                                     |
| FR-004 organisations and VCs: keywords then capabilities                                                                          | `… › US1-AS3 — an organization gets keywords then capabilities …`, `… › US1-AS5 — a virtual contributor gets its tagline …`  |
| FR-026 website normalisation                                                                                                      | `… › US5 — a valid absolute URL passes through, …`                                                                           |
| FR-010/FR-029 join month (independent wall-clock oracle)                                                                          | `… › US4 — each member gets the first day (00:00 UTC) …`                                                                     |
| D-ZERO / FR-009 / FR-030 associates                                                                                               | `… › D-ZERO — …`, `… › US1-AS4 — adding N associates …`, `… › FR-030 — every fixture organization reports the same number …` |
| FR-032 / SC-009 members only: anonymous and non-member get no People, count 0; organisations and VCs enriched; member sees People | `contributor-cards-visibility.it-spec.ts › FR-032 — PUBLIC space, user information "members only" › …` (5 tests)             |
| Public space, default visibility: outsiders see enriched People (recorded privacy decision)                                       | `… › FR-032 — PUBLIC space, user information follows space visibility › …`                                                   |
| PRIVATE space: outsiders denied with `FORBIDDEN_POLICY`; member reads                                                             | `… › FR-032 — PRIVATE space keeps its existing read rule › …`                                                                |

Browser walks (this directory; every file seeds its own Space):

| Spec                                                                                                                                                                   | Test                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| US1-AS1 clamp, "+N" with the right N, location                                                                                                                         | `us1-card-content.spec.ts › US1-AS1 — …`                                                         |
| US1-AS2 italic fallback; no rows for empty org/VC                                                                                                                      | `… › US1-AS2 — …`                                                                                |
| US1-AS3 merged tag list incl. the "+N" popover                                                                                                                         | `… › US1-AS3 — …`                                                                                |
| US1-AS4 0 / 1 / N associates wording, tagline, tags, location                                                                                                          | `… › US1-AS4 — …`                                                                                |
| US1-AS5 VC rows                                                                                                                                                        | `… › US1-AS5 — …`                                                                                |
| FR-034 no bad strings, every segment                                                                                                                                   | `… › FR-034 — …`                                                                                 |
| US1-AS6 equal heights / bottom-line offset at 1440/768/390, no sideways scroll                                                                                         | `… › US1-AS6 — …`                                                                                |
| US1-AS7 two-line tagline, cut pill with hover tooltip                                                                                                                  | `… › US1-AS7 — at 1440 and 390 px …`                                                             |
| US1-AS7 tag row never wraps (**skipped: QA-PF-03, [client-web#10370](https://github.com/alkem-io/client-web/issues/10370)**)                                           | `… › US1-AS7 / FR-003 — the tag row never wraps …` (last in file)                                |
| US1-AS8 / FR-015 dialog and map list rows                                                                                                                              | `… › US1-AS8 / FR-015 — …`                                                                       |
| FR-015 deep link, map pin popup unchanged                                                                                                                              | `… › FR-015 — the callout deep link …`, `… › FR-015 — map pins and their popups are unchanged …` |
| US2-AS1 counts and filter, paging, name-only search, segments, List/Map                                                                                                | `us2-nothing-else-changes.spec.ts › US2-AS1 — …` (4 tests)                                       |
| US2-AS3 / FR-034 empty card valid, same height                                                                                                                         | `… › US2-AS3 / FR-034 — …`                                                                       |
| US2-AS5 existing post enriched, no new form option                                                                                                                     | `… › US2-AS5 — …`                                                                                |
| US2-AS6 role label per post (client-side navigation)                                                                                                                   | `… › US2-AS6 — …`                                                                                |
| US2-AS2 members only: anonymous, non-member, member                                                                                                                    | `… › US2-AS2 / FR-032 — …`                                                                       |
| US2-AS4 / FR-016 one profile link per card in feed, dialog, map list (**skipped: QA-PF-01, [client-web#10369](https://github.com/alkem-io/client-web/issues/10369)**)  | `… › US2-AS4 / FR-016 — …` (last in file)                                                        |
| US3-AS1..AS6, AS8 menu: View Profile, Message (user, organisation incl. discard and failed send), VC menu, own card, non-contactable, no Remove from Space, signed-out | `us3-card-menu.spec.ts › US3-AS1 … US3-AS8`                                                      |
| US3-AS7 keyboard order (**skipped: QA-PF-01, [client-web#10369](https://github.com/alkem-io/client-web/issues/10369)**)                                                | `… › US3-AS7 Keyboard-only: …` (last in file)                                                    |
| US4-AS1..AS5 join month: two oracles, three timezones, subspace month, Dutch, org/VC                                                                                   | `us4-joined-this-space.spec.ts › US4-AS1 … US4-AS5` — **removable** with gate G-1                |
| US5-AS1..AS3 website control                                                                                                                                           | `us5-organisation-website.spec.ts › US5-AS1 … US5-AS3`                                           |
| US5 / FR-016 one link next to the website control (**skipped: QA-PF-01, [client-web#10369](https://github.com/alkem-io/client-web/issues/10369)**)                     | `… › US5 / FR-016 — …` (last in file)                                                            |

### Card surfaces

| Surface                                     | Renders                                                                             | Checked | How                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Space feed (Home tab), any tab              | `ContributorCollection` via `LazyCalloutItem`                                       | yes     | all US1/US2 walks                                                                    |
| Subspace feed                               | same                                                                                | yes     | US2-AS6, US4-AS3                                                                     |
| Callout detail dialog                       | same, via `CalloutDetailDialogConnector`                                            | yes     | US1-AS8 row parity, US2-AS4 link count                                               |
| Callout deep link                           | same dialog via `CalloutDeeplinkView`                                               | yes     | FR-015 deep-link row parity                                                          |
| Map view "No location data" list            | same `ContributorCard`                                                              | yes     | US1-AS8 row parity                                                                   |
| Map pin popup                               | `ContributorMap` popup (name, avatar) — must stay unchanged                         | yes     | FR-015 popup shows the name and none of the card rows; needs a geocoder on the stack |
| Community tab default post                  | same component; harness scenario spaces carry no default Contributors post          | no      | the component is the one checked above                                               |
| Organisation / VC profile pages, hover card | not this card (`CompactContributorCard`); hover card client-web#9960 is not shipped | no      | out of scope                                                                         |

## Not covered — known gaps

| Gap                                                                                                   | Why                                                                                                  | Where it is decided                         |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Join month at a month boundary (US4-AS1's 31 Oct 23:30 UTC) and earliest-of-duplicate records (D-MIN) | needs a backdated or duplicated membership row; no SQL from this repo                                | server unit tests; forge `gql-live` probe 4 |
| Leaving and re-joining restarts the month (FR-013)                                                    | cannot cross a month inside one run                                                                  | requirement question on #10316              |
| A post-dependent month leaking between posts (US4-AS3 with _different_ months)                        | both memberships are made in the same month; US2-AS6 proves the post-keyed cache with the role label | —                                           |
| Associates parity with irregular association rows (FR-030)                                            | needs SQL-injected rows                                                                              | forge `gql-live` probe 6b                   |
| "The default tagset is never used" (FR-004)                                                           | harness-created profiles expose no default tagset to fill                                            | server unit tests                           |
| 300-character tagline (US1-AS7)                                                                       | the server rejects taglines over 128 characters; the walks use the 128 boundary                      | requirement question RQ-04                  |
| Constant number of reads (SC-007), payload size                                                       | no query profiler in this harness                                                                    | forge evidence                              |
| Screen-reader semantics, focus visibility (FR-038)                                                    | no accessibility harness                                                                             | manual release checklist                    |
| Languages other than English and Dutch (FR-037)                                                       | locale checks live with the locale files in client-web                                               | client-web parity test                      |
| Map pins and popups beyond "unchanged"                                                                | out of scope (spec)                                                                                  | —                                           |
| Join-date trust on acceptance data (gate G-1) and designer sign-off (G-3)                             | human gates; both still unticked on client-web#10336                                                 | release checklist                           |
| "Message" from a card sends nothing on the viewer's behalf (US3-AS2) beyond an empty composer         | the harness has no read of a 1:1 room's history                                                      | —                                           |
