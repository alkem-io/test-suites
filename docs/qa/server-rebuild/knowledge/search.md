# Search — behaviour knowledge

_Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/search/`, 1 file, 39 cases — 29 run, 10 skipped); the specs, issues and docs listed in § Sources. Scope: the platform search query — what is indexed, how terms match, categories and result kinds, sizes and cursors, the space and flow-state scopes, visibility filtering at query time, and the index rebuild. "Explore spaces" is database-ranked, not search; it is cross-referenced (journey JRN-64) and its constants are recorded here to close journey open question 2. WHAT and WHY only — no mutations, fixtures or request params. Status legend: **proven** = a green legacy case asserts it; **untested** = code and/or spec only, no case; **disputed** = sources disagree, see § Findings; **unknown-why** = the rule holds but no source states the reason — the reviewer fills the why or writes "unknown, ask product". Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file:line is `search-dossier.md` beside this file._

_Review load: 10 findings · 1 unknown-why row · 7 untested rows (gaps) · 27 constants to tick · 5 open questions. Manual points sit in five places: the Findings, the `unknown-why` rows, the `untested` rows (repeated under Gaps), the "product must rule?" column of the constants, and the Open questions._

## Behaviour rules

| ID | Rule the platform guarantees | Why (business reason, origin) | Actors | Sources (code › file:line · test › spec › case · spec › path) | Status |
|---|---|---|---|---|---|
| **### the engine** | | | | | |
| SRCH-01 | Platform search runs against an Elasticsearch index, never the database; on a server without a configured Elasticsearch client every search fails with "Elasticsearch client not initialized". | One engine for all kinds, scored per category (`docs/search/Search.md`); 102 FR-003: when the backend is unavailable return a clear error, never hang. | all | code › `src/services/api/search/extract/search.extract.service.ts:188-203` · `src/services/external/elasticsearch/elasticsearch-client/elasticsearch.client.factory.ts:5-55` · spec › `server/specs/102-mcp-content-search-hardening/spec.md` FR-003 | untested |
| SRCH-02 | A search takes up to 10 terms (an eleventh is refused with "Maximum number of search terms is 10; supplied: <n>"), up to 2 tagset names, an optional space scope that must name an existing space ("Space with the given identifier not found"), an optional flow-state scope, and per-category filters whose sizes may not be negative and may not add up to more than the platform maximum (40). | Bound the cost of a query (`docs/search/Search.md` "max result amount … sum of all sizes … cannot exceed that threshold"). | all | code › `src/services/api/search/util/validate.search.parameters.ts:5-47` · `search.service.ts:43-59` · `alkemio.yml:87-92` · test › `search` › `should throw limit error for too many terms` | proven for the term limit; the other refusals untested |
| SRCH-03 | Results come in five categories — spaces (space, subspace), contributors (user, organisation), collaboration tools (callout), framings (memo, whiteboard, office document) and contributions (post, whiteboard, memo, office document); a filter names a category and optionally the kinds within it, and a kind outside its category is ignored. | Similar kinds are scored together so small entities are not drowned by large ones (`docs/search/Search.md` Solution). | all | code › `search.category.ts:3-9` · `search.result.type.ts:18-28` · `search.extract.service.ts:20-93, 150-168, 233-264` · test › `search` › `Search types` (3 cases) | proven |
| SRCH-04 | Without filters every category is searched with 4 results each; with filters each category returns at most its `size`, after fetching twice that many from the index so that authorization drops still leave a full page; within a category results are ranked by score, then by id. | Over-fetch "as an attempt to ensure the requested size after authorization" (code); 4 per category is the documented default. | all | code › `search.service.ts:17, 37-41, 85-90` · `search.extract.service.ts:170, 393-415` · `extract/build.multi.search.request.items.ts:38-43, 72-74` · `result/search.result.service.ts:1594-1633` · test › `search` › `should search without filters` [skip: "now returns results up to the limit"] | untested |
| SRCH-05 | Terms are matched (joined by spaces) against every indexed text field, with a title match weighing ×3 and a tag match ×2; body content additionally matches with typo tolerance (first two characters fixed) and ranks higher when the terms appear close together; a full name, a word from a description, a city name, a single word all match, a nonexistent word matches nothing, and each result reports the terms that matched it. | Title stays a strong signal on long documents; fuzziness only on content keeps queries fast; tag ≈ content parity accepted (M-05 code comment); matched terms per server#3702. | all | code › `extract/build.search.query.ts:3-97` · `search.extract.service.ts:501-517` · test › `search` › `should search by full user name`, `… common word filter`, `… location filter`, `… term users only`, `should not return any results for invalid term` | proven |
| SRCH-06 | The index holds, for active spaces at every level, the about (why, who) and profile (title, tagline, description, city, country, tags); for users and organisations the same profile fields; and for callouts, posts, whiteboards, memos and office documents under active spaces their profile plus extracted text, each tagged with its space and flow state. | What a person types is a name, a description, a place or a tag; content search added by 009. | all | code › `ingest/search.ingest.service.ts:42-78, 486-600, 790-1990` · spec › `agents-hq/specs/009-office-doc-search/spec.md` FR-001…FR-003, FR-016 | proven for spaces, users, organisations and posts by the scenario cases; whiteboards, memos, office documents untested |
| SRCH-07 | The index is rebuilt from scratch — new indices, alias swap, old indices deleted — only by an operations admin (platform audit row, task id returned, work continues asynchronously), by the in-cluster internal job endpoint, or by the hourly cron on acceptance and production; nothing updates the index when content is created, changed or deleted, so results reflect the last rebuild. | Synchronisation is lazy by decision (009 FR-010/FR-011: "reindex sweep"); the mutation is an operations action (027 A11). | POA, cluster job | code › `src/platform-admin/services/search/admin.search.ingest.resolver.mutations.ts` · `src/services/api-rest/internal-admin/internal-admin.controller.ts:20-75` · `ingest/search.ingest.service.ts:183-230` · infra › `infrastructure-operations/orchestration/overlays/{acceptance,production}/third-party/search/01-search-ingest-cron-job.yml:9` · test › `search` › `beforeAll` (ingest + 15 s wait) | untested (gate covered elsewhere: `platform-roles/_support/groups/a11.ts`) |
| **### who sees what** | | | | | |
| SRCH-08 | Every hit except top-level spaces and users is checked at query time against the searcher's read right: a subspace, organisation, callout, post, whiteboard, memo or office document the searcher cannot read is dropped, so a member of a public L0 with a private L1 sees the L0 only, while L1/L2 members and admins see all three levels. | Reuse the platform's authorization per entity (`docs/search/Search.md` step 7; 007 FR-009; 009 FR-009). | all | code › `result/search.result.service.ts:285-293, 399-407, 434-440, 488, 546, 605, 702` · test › `search` › `Search Public Space Private Subspace Data` (7 rows), `Search Private Space Private Subspace Data` (7 rows) | proven |
| SRCH-09 | A top-level space is returned to every searcher, member or not, even when the space is private; users are returned without a read check. | "no authorization check — all spaces must be visible; context, profile and others are readable by all" (code comment); users are only reachable by signed-in searchers. | all | code › `result/search.result.service.ts:242-243, 353` · test › `search` › `Private Space Private Subspace` › `non.space` gets 1 result | disputed (F-2) |
| SRCH-10 | A visitor who is not signed in searches only spaces, framings and contributions — never users, organisations or callouts — and then only what the read check lets through. | Hide contributor data from the unauthenticated (server PR #4712). | anonymous | code › `search.service.ts:60-61` · `search.extract.service.ts:94-148, 278-288` | untested (F-5) |
| SRCH-11 | A post inside a callout that is still a draft is never a search result, whatever the searcher's rights. | Drafts are not published content (callout area). | all | code › `result/search.result.service.ts:974-977` | untested |
| SRCH-12 | With a space scope, hits are limited to entities tagged with that space (entities without a space tag are kept), users and organisations to members and admins of that space, and the spaces category answers with the scoped space itself; a space with no matching content answers nothing. | Search inside one space (`docs/search/Search.md` filter API). | all | code › `extract/build.search.query.ts:107-161` · `result/search.result.service.ts:211-218, 329-332, 372-377, 1554-1580` · test › `search` › `should search JOURNEY data filtered empty space`; `should search JOURNEY data filtered space` [skip, #5114]; `Search IN Public Space Private Subspace Data` (7 rows, skip #5114) | disputed (F-4) |
| SRCH-13 | With a flow-state scope — or when asked to fold — a matching post, whiteboard, memo or office document counts as a match of its callout: the callout is returned once, in the callout bucket, ranked by relevance then newest first, and the folded kinds are not listed separately unless their own category was requested. | The unit of a scoped search is the callout (007 FR-017); recency tiebreak (FR-019); office-doc matches fold the same way (009 FR-006/007). | all | code › `search.service.ts:66-73` · `search.extract.service.ts:266-347` · `result/search.result.service.ts:154-191, 674, 1635+` · spec › `agents-hq/specs/007-knowledge-base-search/spec.md` FR-001…FR-003, FR-007, FR-017, FR-019 | untested |
| **### paging and shape** | | | | | |
| SRCH-14 | Each category answers with a cursor (the score and id of its last result) that, passed back in that category's filter, continues after it; a malformed cursor is refused; the per-category `total` is always −1. | Keyset paging per category over the index (`docs/search/Search.md`); total "Not implemented yet" (server#3700). | all | code › `util/calculate.search.cursor.ts`, `try.parse.search.cursor.ts` · `extract/build.multi.search.request.items.ts:76-91` · `result/search.result.service.ts:1598-1599, 1627-1631` · `schema.graphql:4049-4058` | disputed (F-3) |
| SRCH-15 | The answer has five buckets — actors, spaces, callouts, framings, contributions — and every result carries its score, the matched terms, its kind and the entity with its parents: a subspace with its parent space, a post with its space and callout, a framing or contribution with its callout and space and whether it is a contribution. | Results are enriched so the client can render and link them (`docs/search/Search.md` step 6; 009 FR-008). | all | code › `dto/results/*.ts` · `result/search.result.service.ts:99-200` · `schema.graphql:1263-1274, 4060-4075` · test › `search` › `Search types` (3 cases: `parentSpace`, `space{level}`, `callout`, `post`) | proven |
| **### archiving and data** | | | | | |
| SRCH-16 | Archiving a space does not remove it or its content from the index: until the next rebuild the archived top-level space is still returned to everyone and its subspaces to whoever still passes the read check. | — | all | code › `ingest/search.ingest.service.ts:790-795` (ACTIVE filter at ingest only) · `result/search.result.service.ts:242-243` · test › `search` › `Search Archived Space Data` (3 role rows + `GA get results for archived spaces` = 3) | disputed (F-1) |
| SRCH-17 | Users with a service profile are never indexed, and a user's email and phone are never written to the index. | — | all | code › `ingest/search.ingest.service.ts:952-986` | unknown-why |
| SRCH-18 | An MCP client searches through the same engine with the same actor-scoped visibility. | 102 FR-001/FR-002. | MCP actors | spec › `server/specs/102-mcp-content-search-hardening/spec.md` FR-001…FR-003 | untested (covered elsewhere: MCP suites) |

## Who may (role × action)

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

| action | platform admin roles (which) | space admin | space member | registered (non-member) | anonymous |
|---|---|---|---|---|---|
| search spaces (top-level) | Y | Y | Y | Y | Y |
| search subspaces | Y where the role reads them | Y (own tree) | Y (own tree; private siblings N) | Y on public | Y on public |
| search users | Y | Y | Y | Y | **N** (index not queried) |
| search organisations | Y | Y | Y | Y | **N** |
| search callouts | Y where READ | Y | Y | Y on public | **N** (index not queried) |
| search posts / whiteboards / memos / office documents | Y where READ | Y | Y | Y on public | Y on public |
| search inside one space (space scope) | Y | Y | Y | Y | Y |
| rebuild the index (`adminSearchIngestFromScratch`) | Y — platform-operations-admin only (PSA, PCFA, PRA, PLM, support: N) | N | N | N | N |
| rebuild via `/rest/internal/admin/search-ingest` | – (in-cluster only, no identity) | – | – | – | – |

Evidence: `search.resolver.queries.ts:14-23` (no guard); `search.service.ts:60-61` + `search.extract.service.ts:94-148, 278-288` (anonymous → public indices only); `result/search.result.service.ts:242-243, 285-293, 353, 399-407, 434-440, 488, 546, 605, 702` (per-hit READ); `admin.search.ingest.resolver.mutations.ts` (PLATFORM_OPERATIONS_ADMIN + audit); `internal-admin.controller.ts:20-33`; crosscheck `access-matrix-crosscheck.md:151` (A11, agree). The legacy suite proves the space-member/non-member/admin rows for spaces and subspaces; the anonymous column is matrix/code only.

## Constants the rules depend on (rebaseline candidates)

| Constant | Value today | Source | product must rule? |
|---|---|---|---|
| Categories (5) | `spaces`, `collaboration-tools`, `framings`, `contributions`, `contributors` | `search.category.ts:3-9` | |
| Result kinds (9) | `user`, `organization`, `space`, `subspace`, `post`, `callout`, `whiteboard`, `memo`, `collabora_document` | `search.result.type.ts:18-28` | |
| Kinds per category | spaces{space, subspace}; contributors{user, organization}; collaboration-tools{callout}; framings{memo, whiteboard, collabora_document}; contributions{post, whiteboard, memo, collabora_document} | `search.extract.service.ts:150-168` | |
| Public (anonymous) categories | spaces, framings, contributions | `search.extract.service.ts:94-148` | F-5 |
| Default size per category | 4 | `search.service.ts:17`; `search.filter.input.ts` | |
| Maximum total results | 40 (`SEARCH_MAX_RESULTS`), split evenly across the categories queried when no size is given | `alkemio.yml:89`; `search.extract.service.ts:399-413` | |
| Over-fetch multiplier | 2 | `search.extract.service.ts:170` | |
| Term limit | 10 (schema description still says "Max 5") | `validate.search.parameters.ts:5`; `search.dto.input.ts` | F-9 |
| Tagset-name limit | 2 | `validate.search.parameters.ts:6` | |
| Index pattern | `alkemio-data-` (`ELASTIC_SEARCH_INDEX_PATTERN`); aliases `spaces`, `subspaces`, `organizations`, `users`, `posts`, `callouts`, `whiteboards`, `memos`, `office-document` | `extract/search.index.ts`; `ingest/search.ingest.service.ts:139-151` | |
| Indexed profile fields | displayName, tagline, description, location.city, location.country, tags; spaces + about.why, about.who, level, visibility | `search.ingest.service.ts:42-78` | |
| Ingest filters | spaces `visibility = ACTIVE` (all levels); content only under ACTIVE spaces; users `serviceProfile = false`, email/phone stripped; organisations all | `search.ingest.service.ts:790-1990` | F-6 |
| Ingest batch sizes | spaces/subspaces/orgs/users 100; callouts 30; posts/whiteboards/memos 50; office documents 15 | `search.ingest.service.ts:505-565` | |
| Content cap | `CONTENT_FIELD_SIZE_LIMIT` 1,000,000 characters; office-document source cap 15 MiB | `extract/collabora.text.extract.service.ts:73`; `alkemio.yml:93-99` | |
| Query boosts | `profile.displayName.text^3`, `profile.tags^2`, `content^0` in the all-fields matcher; content fuzziness `AUTO`, `prefix_length 2`, `max_expansions 50`; phrase `slop 2`, `boost 2` | `extract/build.search.query.ts:37-89` | |
| Highlight | fields `*`, `fragment_size 100`, `number_of_fragments 3`, `max_analyzed_offset 999,999` | `build.multi.search.request.items.ts:61-70` | |
| Index sort | `_score desc, id desc` | `build.multi.search.request.items.ts:74` | |
| Cursor format | `<score>::<entity uuid>` | `util/calculate.search.cursor.ts` | |
| `total` | always −1 ("Not implemented yet", server#3700) | `search.result.service.ts:1598-1599`; `schema.graphql:4056-4057` | F-3 |
| Scope filters | `spaceID`, `flowStateID`: "field absent OR equals" | `build.search.query.ts:107-161` | |
| Space-scope contributor rule | users/orgs ∩ (SPACE_MEMBER ∪ SPACE_ADMIN credential holders of the space) | `search.result.service.ts:1554-1580` | |
| Rebuild triggers | GraphQL `adminSearchIngestFromScratch` (POA, audited, returns task id); REST `POST /rest/internal/admin/search-ingest` (202, in-cluster); CronJob `25 */1 * * *` acceptance + production | resolver; controller; infra-ops overlays | F-7 |
| Error texts | `Maximum number of search terms is 10; supplied: <n>`; `Maximum number of tagset names is 2; supplied: <n>`; `Size cannot be a negative number`; `The requested <n> results cannot exceed the maximum allowed 40 over all categories.`; `Space with the given identifier not found`; `Elasticsearch client not initialized`; `Invalid search cursor` / `Invalid first part of cursor` / `Invalid second part of cursor` | `validate.search.parameters.ts`; `search.service.ts:53-57`; `search.extract.service.ts:202`; `try.parse.search.cursor.ts` | |
| ES client prerequisites | host + api_key (else no client); TLS per `tls.ca_cert_path` | `elasticsearch.client.factory.ts:10-55` | |
| Explore spaces (DB, journey JRN-64) | `EXPLORE_SPACES_LIMIT` 30; `EXPLORE_SPACES_ACTIVITY_DAYS_OLD` 30; `EXPLORE_SPACES_OVERFETCH_FACTOR` 3; excluded activity `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` | `src/domain/space/space/space.service.ts:113-124` | |
| Flow-state search page (client) | 10 per page | spec 007 FR-006 | |
| GraphQL surface | `search(searchData: SearchInput!)`; `SearchInput{terms, tagsetNames, searchInSpaceFilter, searchInFlowStateFilter, filters[{category, cursor, size, types}], foldCalloutResources}`; `ISearchResults{actorResults, spaceResults, calloutResults, framingResults, contributionResults}`; `ISearchCategoryResult{results, cursor, total}`; `SearchResult{id, score, terms, type}` + per-kind types; mutation `adminSearchIngestFromScratch: String` | `schema.graphql:1263-1274, 4049-4075, 6384` | |

## Where this lands in the new core

Per the rebuild briefing (`plan.md` § 1, catalogue), search stays an external index fed from the core, so the rules above split in two: what is indexed and when (SRCH-06/07/16/17) is a sync contract the new core must own — ideally event-driven on write rather than an hourly full rebuild, which would retire finding 1 and 7 as a class; how results are scoped and filtered (SRCH-08…13) must move inside the viewer's read-time authorization so a hit is never returned for a row the viewer cannot read — which settles finding 2 (private L0 existence) by whatever the space document's read rule becomes. Three facts should shape the port: (1) anonymous visibility is decided by index selection, not by the read rule (SRCH-10, F-5) — one mechanism in the new core; (2) `total` was never implemented (F-3) — decide whether the API promises it; (3) the explore ranking is a separate DB query (constants above) and should stay out of the search service. Error texts, boosts and sizes are rebaseline rows, not rules.

## Findings (sources disagree, or likely defect)

1. **Archived-space cases prove nothing (SRCH-16).** Code: ingest filters ACTIVE only at rebuild time; archiving does not touch the index; a top-level space hit has no read check. Test: the three role rows assert `not.toContainObject({… visibility: 'ACTIVE'})` after the space became ARCHIVED, which passes whether or not the space is returned; the admin row expects 3 hits — the archived tree is still returned. Spec: none. Ruling: is an archived space searchable until the next rebuild acceptable, and should the three rows be rewritten to assert absence by id?
2. **Private top-level spaces are returned to everyone (SRCH-09).** Code comment: "all spaces must be visible". Test: `non.space` gets 1 hit on a private L0. Journey: private-space abouts are world-readable (cross-ref). Ruling: record as a rule (existence of private spaces is public) or gate L0 hits like subspaces.
3. **`total` is −1 (SRCH-14).** Code todo server#3700; schema says "Not implemented yet". Clients cannot show counts. Ruling: implement, or drop the field from the API.
4. **Space scope returns the scoped space, not its subspaces (SRCH-12).** Code: with a scope the spaces bucket is `[the filter space]` from the first hit; subspace hits are resolved but the scope clause keys on `spaceID` as indexed. Test: `filtered space` and the 7 "IN … Subspace" rows are skipped citing #5114 (not read — cited only in tests). Ruling: define what a scoped space search returns.
5. **Anonymous never sees callouts (SRCH-10).** Code: the public index store omits `callouts` (and users, organisations); posts under public callouts are searchable. PR #4712 says "demo spaces" in its title. Ruling: intended, or an omission when callouts became searchable?
6. **DEMO spaces are never indexed (SRCH-06).** Ingest keeps `ACTIVE` only; DEMO, INACTIVE and ARCHIVED spaces and their content are absent for every searcher, while the public-store comment suggests demo spaces were meant to be hidden only from visitors. Ruling: which visibilities are searchable, and for whom?
7. **Index freshness (SRCH-07).** Nothing re-indexes on create/update/delete; acceptance and production rebuild hourly at :25; the test cluster relies on the suite's own trigger; dev has no Elasticsearch (env fact — the ES-backed cases cannot run there). 009 FR-010 calls this "lazy" by decision. Ruling: accept up to one hour of staleness as the rule, and name it in the client.
8. **Empty-term behaviour changed silently (SRCH-02).** The skipped case expected "Search: Skipping term below minimum length"; today an empty or blank term list runs and "returns results up to the limit". No spec. Ruling: minimum term length?
9. **Schema says 5 terms, code allows 10 (SRCH-02).** Stale description on `SearchInput.terms`. Ruling: fix the description (rebaseline).
10. **Size 0 and non-integer sizes are accepted (SRCH-02/04).** Only negatives are refused; a size of 0 still issues an index query. Ruling: define the bounds (1..max).

## Gaps (no legacy case)

Untested rules by id: SRCH-01, SRCH-04, SRCH-07, SRCH-10, SRCH-11, SRCH-13, SRCH-18; plus the untested clauses of SRCH-02 (tagset limit, size validation, unknown space), SRCH-06 (whiteboards, memos, office documents), SRCH-17 and the whole of SRCH-09, SRCH-12, SRCH-14, SRCH-16.

Behaviours the area has that neither reading nor tests pinned down:
- Anonymous search: spaces/contributions only; no users, organisations, callouts.
- Paging a category with its cursor; a malformed cursor refused.
- Size handling: default 4, custom sizes, the 40 cap, over-fetch after authorization drops.
- Content matches (whiteboard text, memo markdown, office-document text), fuzzy matches, phrase ranking, and the `terms` field.
- Flow-state scope and callout folding (007) — the whole feature has no server-api case.
- Framing vs contribution office documents (009 FR-006/007).
- Draft-callout posts hidden.
- Tagset-name search (`tagsetNames`).
- Index rebuild as a non-operations role (refused + audit); the task's lifecycle.
- A search when Elasticsearch is down.

## Open questions (could not be determined from the three sources)

1. **Environments without Elasticsearch.** The brief states the dev env has none, so every ES-backed case (all 29 running ones) can run only on test/acc/local-with-ES. Confirm the test cluster's ES and whether its hourly cron exists (only acceptance and production overlays carry the CronJob).
2. **Issue #5114.** Cited by the 8 skipped scope cases (not read, test-only citation). Someone must say whether it is open and what the scoped-space contract is (finding 4).
3. **Index templates.** Field mappings (`profile.displayName.text`, stored `content`, highlight limits) live in `reporting-orchestration` (workspace#009) and were not read; the boosts in SRCH-05 assume them.
4. **Score drift across rebuilds.** The M-05 comment says absolute scores drift on the multi-shard index, so a cursor from before a rebuild may skip or repeat; no source says how the client copes.
5. **Explore-spaces constants (closes journey open question 2).** `EXPLORE_SPACES_LIMIT = 30`, `EXPLORE_SPACES_ACTIVITY_DAYS_OLD = 30`, `EXPLORE_SPACES_OVERFETCH_FACTOR = 3`, excluded activity type `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` (`space.service.ts:113-124`). Nothing left to determine; recorded here so the journey table can cite them.

## Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/services/api/search/search.service.ts`, `search.resolver.queries.ts`, `search.category.ts`, `search.result.type.ts`, `dto/inputs/*.ts`, `dto/results/*.ts`, `util/validate.search.parameters.ts`, `util/calculate.search.cursor.ts`, `util/try.parse.search.cursor.ts`
- `src/services/api/search/extract/search.extract.service.ts`, `build.search.query.ts`, `build.multi.search.request.items.ts`, `search.index.ts`, `collabora.text.extract.service.ts`; `ingest/search.ingest.service.ts`, `get.index.pattern.ts`; `result/search.result.service.ts`
- `src/services/external/elasticsearch/elasticsearch-client/elasticsearch.client.factory.ts`, `elasticsearch.client.provider.ts`
- `src/platform-admin/services/search/admin.search.ingest.resolver.mutations.ts`; `src/services/api-rest/internal-admin/internal-admin.controller.ts`
- `src/domain/space/space/space.service.ts:113-124, 865-920` (explore constants); `src/common/enums/space.visibility.ts`
- `alkemio.yml` (`search:`); `docs/search/Search.md`; `schema.graphql`
- git: `f0ec67e30`, `3e598b845` (#3714), `9b5c8e663` (#4712)
- infra: `infrastructure-operations/orchestration/overlays/{acceptance,production}/third-party/search/01-search-ingest-cron-job.yml`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/search/search.it-spec.ts`, `search.request.params.ts`
- `docs/qa/server-rebuild/knowledge/access-matrix-crosscheck.md` (row A11)
- Other suites touching the area (list only): see dossier § 2

Specs / issues:
- `agents-hq/specs/007-knowledge-base-search/spec.md`; `agents-hq/specs/009-office-doc-search/spec.md`
- server `specs/102-mcp-content-search-hardening/spec.md`; server `specs/035-optimize-explore-spaces/spec.md` (via journey JRN-64)
- server#3700 (total), #3702 (matched terms), #5114 (scope, cited by tests only), PRs #3714, #4712
