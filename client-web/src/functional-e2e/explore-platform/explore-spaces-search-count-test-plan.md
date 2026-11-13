# Test plan — Spaces explorer search count

> **Status:** Implemented 2026-11-13 (test-suites#700). Challenged by the QA PR
> challenge; two basis decisions are open (below).
> **Story:** server#3700 (search `total` was hard-coded to -1). **Product:** server#6744
> (exact `spaceResults.total` and cursor pagination, opt-in `countTotal`) and
> client-web#10547 (the count on `/spaces`). No workspace spec.
> **Open decisions:**
> - server#3700 AC2 ("decide what is counted") is not recorded on the story. These tests pin
>   what server#6744 shipped: the Spaces and Subspaces the requester may see, respecting
>   `types`, among the 1000 best ranked, only with `countTotal`, never in a Space-scoped
>   search. Other categories stay -1.
> - client-web `specs/039-crd-spaces-page/explore-filters-and-count/spec.md` FR-EX-3 / AS-4
>   still say "no count". The UI cases pin the count client-web#10547 shipped. Amend the spec,
>   or the UI cases change.
>
> **Runs on:** the local stack only (`@local-stack`). It needs Elasticsearch, which the
> shared test cluster does not run, and each file re-ingests the index from scratch.

```bash
cd client-web && PW_BROWSER=chromium UI_HEADLESS=true pnpm run test:local-stack --project="Local stack — search"
cd server-api && pnpm exec vitest run --project search ./src/functional-api/search/search-spaces-total.it-spec.ts
```

Each file self-seeds an L0 Space with one Subspace and one sub-Subspace. Their display
names carry a run-unique word, so the search matches only them. In the UI file,
`space.member` is a member of the Space only.

## Risks

| # | Risk | Priority | Covered by |
|---|------|----------|------------|
| R1 | The count includes results the user may not see (a private Subspace counted for a non-member) | P1 | API-05, API-05a, API-06, UI-04 |
| R2 | The count ignores the Type filter | P2 | API-03, UI-02 |
| R3 | The explorer shows a number that is wrong because Privacy or Membership still filter in the browser | P2 | UI-03, UI-03a, UI-05 |
| R4 | Paging repeats or skips a result, or leaves a cursor to hidden results ("Load more" that loads nothing) | P1 | API-02, API-06, UI-04 |
| R5 | A search that should not be counted reports a count (Space-scoped, or `countTotal` unset) | P2 | API-04, API-07 |
| R6 | A second SPACES filter adds hits the total and the cursor do not cover | P3 | API-08 |

## Cases

DT = decision table (requester × privacy, filter × count shown); EP = equivalence
partitioning; BVA = page size at and below the number of results.

| ID | Pri | Technique | Scenario | Spec | Case |
|----|-----|-----------|----------|------|------|
| API-01 | P1 | BVA | All three found on one page (size = 3); total 3; no cursor | `server-api/.../search/search-spaces-total.it-spec.ts` | counts every matching Space and Subspace and ends on the first page when they fit |
| API-05a | P1 | DT (control row) | Everything public: the non-member gets total 3 and all three | same | a non-member is told about all three results while every space is public |
| API-02 | P1 | BVA | Pages of 2: 2 + 1, each result once, total 3 on both, no cursor on the last | same | pages through the results with the cursor, returning each result once |
| API-03 | P2 | EP | Type SPACE → total 1; SUBSPACE → total 2 | same | narrows the results and the total to types … |
| API-04 | P2 | EP | Scoped to a Space → total -1 | same | does not count results when the search is scoped to a Space |
| API-07 | P2 | EP | `countTotal: false` → total -1 | same | does not count results unless countTotal is asked for |
| API-08 | P3 | EP (invalid) | Two SPACES filters with `countTotal` → rejected | same | rejects a second SPACES filter when countTotal is set |
| API-05 | P1 | DT | Private Subspace, no re-ingest: admin 3, Subspace member 3, non-member 1 | same | User "…" is told about the … results they may see |
| API-06 | P1 | DT | Private Subspace: non-member, page of 1 → the Space, no cursor | same | a non-member gets a full first page and no cursor to hidden results |
| UI-01 | P1 | UC | "3 spaces matching “word”" and three cards | `explore-spaces-search-count.spec.ts` | states how many Spaces and Subspaces match the search |
| UI-02 | P2 | DT | Type "Subspaces only" → "2 spaces matching" and two cards | same | counts only Subspaces when Type is "Subspaces only" |
| UI-03 | P2 | DT | Privacy "Public only" → "Spaces matching “word”", no number, cards still shown | same | names the terms without a number while Privacy filters the results |
| UI-05 | P2 | DT | `space.member` (Space only), Membership "My Spaces" → one card, "Spaces matching “word”", no number | same | names the terms without a number while Membership filters the results |
| UI-03a | P2 | DT | Admin, private Subspace, "Public only" → fewer cards, no number | same | hides a private Subspace under Public only |
| UI-04 | P1 | DT | Private Subspace: non-member sees "1 space matching", one card, no Load more; the admin's API total stays 3 | same | counts only what the user may see when a Subspace is private |

## Not covered

| What | Why | Where it is covered instead |
|------|-----|------------------------------|
| An anonymous requester's total (the `onlyPublicResults` path) | Needs the anonymous visitor's READ on a public Subspace confirmed on a first run before the oracle can be written | Open (QA challenge QA-CH-03) |
| The explorer shows the server total, not the loaded cards | Every case has at most one batch (24 cards). Telling them apart would need more than 24 matching spaces per run | client-web `SpaceExplorer.test.tsx` ("counts the search's total, not the loaded cards") |
| "Load more" appears while more results exist | Same: needs more than 24 matches. UI-04 asserts only its absence | Open |
| The Elasticsearch count fails → Spaces empty, total -1, explorer line without a number | No way to stop Elasticsearch from inside a test (`deferred.md` D-02) | server unit tests; client-web `useSpaceExplorer.test.tsx` (-1 → no number) |
| The 1000 scan limit | Would need more than 1000 matching spaces | server unit tests |
| Other categories keep total -1; a counted Spaces search mixed with other categories | Not part of the explorer flow; no current client sends that combination | Open |
| Zero results ("0 spaces matching") and the other five locales | Locale assertions have no home in this repo (`deferred.md` D-03) | client-web `SpaceExplorer.test.tsx` |
