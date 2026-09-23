# Contributors callout — test plan

Maps the business scenarios that render on the Contributors post (the same
post a space's Community tab shows) to the spec files that cover them.

## Feature 008/025 — the callout itself

| Scenario | Spec file |
|---|---|
| Admin is offered the "Contributors" framing; zero-type validation; default settings render all three types with a segmented switch; the Virtual Contributors segment is list-only; name search; List/Map toggle; editing an existing callout's types persists; a single type shows no segmented switch; a non-default `defaultType` opens on that segment; a space member cannot create the callout | `0.1contributors-callout.spec.ts` |

## Feature 077 — richer contributor cards

Workspace spec: `agents-hq/specs/077-richer-contributor-cards/spec.md`. Each
user story below persists to its own spec file once its acceptance walk
passes (`forge-verify`, tagged `@forge-acceptance`); US2's walk has not landed
yet — that row is filled in once it does.

| User story | Spec file | Notes |
|---|---|---|
| US1 — Recognise a contributor from the card (tagline, tags, location, bottom line, equal heights) | `us1-card-content.spec.ts` | Landed. Highest risk after US2; walked third. |
| US2 — Everything else keeps working (search, filter, paging, counts, map, privacy, all-values-absent card) | `us2-nothing-else-changes.spec.ts` | Not yet landed. Walked first — the regression risk the feature is most likely to introduce. |
| US3 — Act from the card: View Profile / Message | `us3-card-menu.spec.ts` | Landed. Walked fourth. |
| US4 — See when a person joined this space | `us4-joined-this-space.spec.ts` | Landed. **Removable** — human gate G-1 (spec.md) drops this file, its request selection, its text key and the story itself if the acceptance-database join-date distribution check finds import-clustered dates. Walked third, after US5. |
| US5 — Visit an organisation's website from its card | `us5-organisation-website.spec.ts` | Landed. Carries the feature's only content-injection risk (a hostile stored website); walked second, right after US2. |

Durable, non-acceptance coverage for the same contract:

| Level | Location |
|---|---|
| Committed schema types | `lib/src/core/generated/{graphql,alkemio-schema}.ts` (regenerated from the wave-1 server) |
| API (server contract pin) | `server-api/src/functional-api/callout/contributors-collection/contributor-cards.it-spec.ts` — null matrix per contributor type, tags preference rule, website normalisation, month-precision UTC `joinedDate`, associates-count parity |
| e2e page object | `pages/ContributorsCalloutPage.ts` — exact-name `contributorCard`, plus `cardFor`/`taglineOf`/`tagsOf`/`locationOf`/`bottomLineOf`/`actionsButton`/`menuItem`/`websiteLink` |
