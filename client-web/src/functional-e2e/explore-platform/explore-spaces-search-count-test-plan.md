# Test plan — Spaces explorer search count

> **Basis:** server#3700 (search `total` was hard-coded to -1). The Spaces search now
> returns the exact number of Spaces and Subspaces the requester may see, and a null
> cursor on the last page; the explorer (`/spaces`) states that number.
> **Runs on:** the local stack only (`@local-stack`): it needs Elasticsearch, which the
> shared test cluster does not run. The walk re-ingests the index from scratch.

```bash
cd client-web && PW_BROWSER=chromium UI_HEADLESS=true pnpm run test:local-stack --project="Local stack — search"
cd server-api && pnpm exec vitest run --project search ./src/functional-api/search/search-spaces-total.it-spec.ts
```

Each file self-seeds an L0 Space with one Subspace and one sub-Subspace whose display
names carry a run-unique word, so the search matches only them.

## Risks

| # | Risk | Covered by |
|---|------|------------|
| R1 | The count includes results the user may not see (a private Subspace counted for a non-member) | API-05, API-06, UI-04 |
| R2 | The count ignores the Type filter | API-03, UI-02 |
| R3 | The explorer shows a number that is wrong because Privacy still filters in the browser | UI-03 |
| R4 | Paging repeats or skips a result, or leaves a cursor to hidden results ("Load more" that loads nothing) | API-02, API-06, UI-04 |
| R5 | A Space-scoped search starts reporting a count it does not compute | API-04 |

## Cases

| ID | Scenario | Spec | Case |
|----|----------|------|------|
| API-01 | All three found on one page; total 3; no cursor | `server-api/.../search/search-spaces-total.it-spec.ts` | counts every matching Space and Subspace and ends on the first page when they fit |
| API-02 | Pages of 2: 2 + 1, each result once, total 3 on both, no cursor on the last | same | pages through the results with the cursor, returning each result once |
| API-03 | Type SPACE → total 1; SUBSPACE → total 2 | same | narrows the results and the total to types … |
| API-04 | Scoped to a Space → total -1 | same | does not count results when the search is scoped to a Space |
| API-05 | Private Subspace, no re-ingest: admin 3, Subspace member 3, non-member 1 | same | User "…" is told about the … results they may see |
| API-06 | Private Subspace: non-member, page of 1 → the Space, no cursor | same | a non-member gets a full first page and no cursor to hidden results |
| UI-01 | "3 spaces matching “word”" and three cards | `explore-spaces-search-count.spec.ts` | states how many Spaces and Subspaces match the search |
| UI-02 | Type "Subspaces only" → "2 spaces matching" and two cards | same | counts only Subspaces when Type is "Subspaces only" |
| UI-03 | Privacy "Public only" → "Spaces matching “word”", no number, cards still shown | same | names the terms without a number while Privacy filters the results |
| UI-04 | Private Subspace: non-member sees "1 space matching", one card, no Load more; the admin's API total stays 3 | same | counts only what the user may see when a Subspace is private |
