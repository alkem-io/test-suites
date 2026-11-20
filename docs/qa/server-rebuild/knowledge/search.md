# Search: behaviour rules

_What the platform does today for search: what is in the index, how terms match, the categories and kinds of results, sizes and paging, searching inside one space or flow state, who sees which results, and how the index is rebuilt. "Explore spaces" is not search; its constants are recorded in Appendix E for the journey area (JRN-64). The layout is that of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**. Product has not reviewed this file yet._

_Open questions per owner: Product Lead 10 · Technical Lead 4 · Quality Lead 2 · Service Operations Lead 1 · Architecture Lead 1. By state: 14 open · 4 with a suggested answer. Proof of the 18 rules: 7 proven by a test · 11 untested (Appendix A)._

_Whys of the 18 rules: 15 rest on a source · 2 carry a draft for product to decide · 1 have none, and each already carries an open question (SRCH-16)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit, a pull request or an issue. "Not decided: exists in the code" means the behaviour is in the code and no source shows that anybody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F2)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F2)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### The engine

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SRCH-01 | Search runs on a separate search index (Elasticsearch), never on the database. On a server where that index is not set up, every search fails with a clear error. | — | — | One engine for all kinds, scored per category (`docs/search/Search.md`); 102 FR-003: when the backend is unavailable return a clear error, never hang. | `docs/search/Search.md`; server spec 102 FR-003 |
| SRCH-02 | A search takes at most 10 terms and at most 2 tag-set names. It can be limited to one existing space and to one flow state. The number of results asked per category cannot be negative, and all together cannot be more than 40. **(open: F8, F9, F10)** | — | — | Bound the cost of a query (`docs/search/Search.md` "max result amount … sum of all sizes … cannot exceed that threshold"). | `docs/search/Search.md` |
| SRCH-03 | Results come in five categories: spaces (space, subspace), contributors (user, organisation), collaboration tools (callout), framings (memo, whiteboard, office document) and contributions (post, whiteboard, memo, office document). A filter picks a category and, if wanted, kinds inside it. | — | — | Similar kinds are scored together so small entities are not drowned by large ones (`docs/search/Search.md` Solution). | `docs/search/Search.md` |
| SRCH-04 | Without filters, every category returns 4 results. With filters, each category returns at most the number asked for. Inside a category the best match comes first. **(open: F10)** | — | — | Over-fetch "as an attempt to ensure the requested size after authorization" (code); 4 per category is the documented default. | `docs/search/Search.md` (the default of 4); the rest exists in the code only |
| SRCH-05 | The search terms are matched against every indexed text. A match in the title counts three times and a match in a tag twice. Body text also matches with small typing errors and ranks higher when the terms stand close together. Every result says which terms matched. **(open: OQ3)** | — | — | Title stays a strong signal on long documents; fuzziness only on content keeps queries fast; tag ≈ content parity accepted (M-05 code comment); matched terms per server#3702. | Server#3702 (matched terms); the rest exists in the code (comment M-05) |
| SRCH-06 | The index holds, for active spaces at every level, their about texts and profile (title, tagline, description, city, country, tags); for users and organisations the same profile fields; and for callouts, posts, whiteboards, memos and office documents in active spaces, their profile and their text. **(open: F6)** | Knowledge that lives only in post bodies and office documents must be findable, not just titles (009 US1; 007 US1). | — | content search added by 009. | Spec 009 FR-001…FR-003, FR-016 |
| SRCH-07 | The index is rebuilt as a whole, never updated piece by piece. A rebuild is started by a Platform Operations Admin (audited), by an internal job, or every hour on acceptance and production. Content that was created, changed or deleted shows in search only after the next rebuild. **(open: F7, OQ1)** | — | — | Synchronisation is lazy by decision (009 FR-010/FR-011: "reindex sweep"); the mutation is an operations action (027 A11). | Spec 009 FR-010/FR-011; spec 027 A11 |

### Who sees what

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SRCH-08 | Every result except top-level spaces and users is checked against what the searcher can read; what they cannot read is left out. A member of a public space with a private subspace finds the space only. Members and admins of the subspaces find all levels. | — | — | Reuse the platform's authorization per entity (`docs/search/Search.md` step 7; 007 FR-009; 009 FR-009). | `docs/search/Search.md`; spec 007 FR-009; spec 009 FR-009 |
| SRCH-09 | A top-level space is shown to every searcher, member or not, even when the space is private. Users are shown without a check. **(open: F2)** | — | — | "no authorization check — all spaces must be visible; context, profile and others are readable by all" (code comment); users are only reachable by signed-in searchers. | Not decided: exists in the code (a code comment) |
| SRCH-10 | A visitor who is not signed in searches only spaces, framings and contributions, and finds only what a visitor can read. A visitor never finds users, organisations or callouts. **(open: F5)** | Hide contributor data from the unauthenticated (server PR #4712). | — | — | Server PR #4712 |
| SRCH-11 | A post in a callout that is still a draft never shows in search, whatever the searcher's rights. | Drafts are not published content (callout area). _(draft)_ | — | — | Not decided: exists in the code |
| SRCH-12 | A search inside one space returns only content of that space, only users and organisations that are members or admins of it, and, under spaces, the space itself. A space with no matching content returns nothing. **(open: F4, OQ2)** | — | — | Search inside one space (`docs/search/Search.md` filter API). | `docs/search/Search.md` |
| SRCH-13 | In a search inside one flow state, or when asked to fold results, a matching post, whiteboard, memo or office document counts as a match of its callout. The callout is shown once, best match first and then newest first. | — | — | The unit of a scoped search is the callout (007 FR-017); recency tiebreak (FR-019); office-doc matches fold the same way (009 FR-006/007). | Spec 007 FR-017, FR-019; spec 009 FR-006/007 |

### Paging and the shape of the answer

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SRCH-14 | Each category returns a marker for its last result; sending the marker back continues after it. A broken marker is refused. The total number of results per category is not given: it is always −1. **(open: F3, OQ4)** | — | — | Keyset paging per category over the index (`docs/search/Search.md`); total "Not implemented yet" (server#3700). | `docs/search/Search.md`; server#3700 |
| SRCH-15 | The answer has five groups: people and organisations, spaces, callouts, framings and contributions. Every result carries its score, the terms that matched, its kind and what it belongs to, for example a post with its space and callout. | — | — | Results are enriched so the client can render and link them (`docs/search/Search.md` step 6; 009 FR-008). | `docs/search/Search.md`; spec 009 FR-008 |

### Archiving and data

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SRCH-16 | Archiving a space does not take it or its content out of search until the next rebuild. Until then the archived top-level space is still shown to everyone, and its subspaces to whoever can still read them. **(open: F1a, F1b)** | — | — | — | Not decided: exists in the code |
| SRCH-17 | Service accounts are never put in the index, and a user's email address and phone number are never written to it. **(open: Q-SRCH-17)** | Contact details are personal data and stay behind the platform's own access control; service accounts are not people anyone looks for. _(draft)_ | — | — | Not decided: exists in the code |
| SRCH-18 | A client that connects through MCP searches with the same engine and sees what its user is allowed to see. | — | — | 102 FR-001/FR-002. | Server spec 102 FR-001/FR-002 |

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. The row ids are new; the cells are those of the former who-may table and product has not reviewed them yet. Evidence is in Appendix B._

### Searching

| ID | Action | Platform roles | Space admin | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|
| W1 | Find top-level spaces | Y | Y | Y | Y¹ | Y¹ |
| W2 | Find subspaces | Y² | Y³ | Y⁴ | Y⁵ | Y⁵ |
| W3 | Find users | Y | Y | Y | Y | N⁶ |
| W4 | Find organisations | Y | Y | Y | Y | N |
| W5 | Find callouts | Y² | Y | Y | Y⁵ | N⁶ |
| W6 | Find posts, whiteboards, memos and office documents | Y² | Y | Y | Y⁵ | Y⁵ |
| W7 | Search inside one space | Y | Y | Y | Y | Y |

¹ Private top-level spaces included; question F2. ² Where the role can read them. ³ In their own space tree. ⁴ In their own space tree; private sibling subspaces are not found. ⁵ On public spaces only. ⁶ The index for these is not searched for a visitor; for callouts see question F5.

### Rebuilding the index

| ID | Action | Platform roles | Space admin | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|
| W8 | Rebuild the index (admin action) | Y⁷ | N | N | N | N |
| W9 | Rebuild through the internal job address | –⁸ | – | – | – | – |

⁷ Platform Operations Admin only. Platform Settings Admin, Platform Content Full Access, Platform Resource Admin, Platform License Manager and Platform Support are refused. ⁸ Reachable only from inside the cluster; no identity is checked.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and question, with code lines and data, is in Appendix C under the same id; GAPS is Appendix D and CONST is Appendix E._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 10 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1a | Archiving | decision | An archived space and its content stay in search until the next rebuild; the archived top-level space is shown to everyone. Is that acceptable? | Product Lead | — | open |
| F2 | Who sees what | decision | Private top-level spaces are shown in search to everyone. Record that as a rule (that a private space exists is public), or check top-level spaces like subspaces? | Product Lead (Security Lead rates the exposure) | — | open |
| F3 | Paging | decision | The total number of results per category is always −1, so no client can show counts. Build it, or drop the field from the API? | Product Lead, then Architecture Lead | — | open |
| F4 | Who sees what | decision | A search inside one space returns that space itself under spaces, not its subspaces, and the 8 cases on it are skipped with a reference to #5114. What should a search inside a space return? | Product Lead (Technical Lead answers OQ2 first) | — | open |
| F5 | Who sees what | decision | A visitor never finds callouts, while posts under public callouts are found. Intended, or forgotten when callouts became searchable? | Product Lead | — | open |
| F6 | Engine | decision | Only active spaces are indexed. Demo, inactive and archived spaces and their content are found by nobody, while a code comment suggests demo spaces were meant to be hidden from visitors only. Which space states are searchable, and for whom? | Product Lead | — | open |
| F7 | Engine | decision | Nothing updates the index when content is created, changed or deleted; acceptance and production rebuild every hour, at 25 past. Is up to one hour of delay the rule? | Product Lead | Accept up to one hour of staleness as the rule, and name it in the client. | suggested |
| F8 | Engine | decision | An empty or blank list of terms now runs and returns results up to the limit; a skipped case expected terms that are too short to be skipped. Is there a minimum term length? | Product Lead | — | open |
| Q-SRCH-17 | Archiving | decision | Why does this rule exist? No source says why service accounts, email addresses and phone numbers are kept out of the index. | Product Lead (DPO Lead consulted) | — | open |
| CONST | All | decision | 22 of the 27 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 4 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F9 | Engine | tidy-up | The schema description says at most 5 terms; the code allows 10. Fix the description? | Technical Lead | Fix the description. | suggested |
| F10 | Engine | defect | A size of 0 and sizes that are not whole numbers are accepted; only negative sizes are refused. What are the bounds? | Technical Lead | Bounds of 1 to the maximum. | suggested |
| OQ2 | Who sees what | check | Is issue #5114 still open, and what does it say a search inside a space should return? The 8 skipped scope cases cite it. (Feeds F4.) | Technical Lead | server#5114 is open (bug, reproduced). It expects a search inside a space to return only the subspace, not the space itself. | suggested |
| OQ3 | Engine | check | The field settings of the index live in `reporting-orchestration` and were not read. Do they match what the match weights in SRCH-05 assume? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Who sees what | decision | A search inside one space returns that space itself under spaces, not its subspaces, and the 8 cases on it are skipped with a reference to #5114. What should a search inside a space return? | Product Lead (Technical Lead answers OQ2 first) | — | open |
| CONST | All | decision | 22 of the 27 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1b | Archiving | test | The three archived-space cases pass whether or not the space is returned. Rewrite them so they assert by id that the space is absent? (What they must assert follows from F1a.) | Quality Lead | — | open |
| GAPS | All | test | 11 rules have no test that proves them and 10 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Who sees what | decision | Private top-level spaces are shown in search to everyone. Record that as a rule (that a private space exists is public), or check top-level spaces like subspaces? | Product Lead (Security Lead rates the exposure) | — | open |
| CONST | All | decision | 22 of the 27 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Engine | check | Does the test cluster have Elasticsearch, and does the hourly rebuild job exist there? Only the acceptance and production overlays carry the job, and the dev environment has no Elasticsearch. | Service Operations Lead | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ4 | Paging | contract | Scores drift from one rebuild to the next, so a paging marker from before a rebuild may skip or repeat results. No source says how the client copes. What must the new core promise? | Architecture Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Paging | decision | The total number of results per category is always −1, so no client can show counts. Build it, or drop the field from the API? | Product Lead, then Architecture Lead | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| OQ5 | Nothing is left to determine: the Explore spaces constants are recorded, so the journey table can cite them. | Extraction, 2026-11-06 | Appendix E, "Explore spaces" |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. Actors and evidence keep the shorthands of the former table; the legend is in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| SRCH-01 | Platform search runs against an Elasticsearch index, never the database; on a server without a configured Elasticsearch client every search fails with "Elasticsearch client not initialized". | all | code › `src/services/api/search/extract/search.extract.service.ts:188-203` · `src/services/external/elasticsearch/elasticsearch-client/elasticsearch.client.factory.ts:5-55` · spec › `server/specs/102-mcp-content-search-hardening/spec.md` FR-003 | untested |
| SRCH-02 | A search takes up to 10 terms (an eleventh is refused with "Maximum number of search terms is 10; supplied: <n>"), up to 2 tagset names, an optional space scope that must name an existing space ("Space with the given identifier not found"), an optional flow-state scope, and per-category filters whose sizes may not be negative and may not add up to more than the platform maximum (40). | all | code › `src/services/api/search/util/validate.search.parameters.ts:5-47` · `search.service.ts:43-59` · `alkemio.yml:87-92` · test › `search` › `should throw limit error for too many terms` | proven for the term limit; the other refusals untested |
| SRCH-03 | Results come in five categories — spaces (space, subspace), contributors (user, organisation), collaboration tools (callout), framings (memo, whiteboard, office document) and contributions (post, whiteboard, memo, office document); a filter names a category and optionally the kinds within it, and a kind outside its category is ignored. | all | code › `search.category.ts:3-9` · `search.result.type.ts:18-28` · `search.extract.service.ts:20-93, 150-168, 233-264` · test › `search` › `Search types` (3 cases) | proven |
| SRCH-04 | Without filters every category is searched with 4 results each; with filters each category returns at most its `size`, after fetching twice that many from the index so that authorization drops still leave a full page; within a category results are ranked by score, then by id. | all | code › `search.service.ts:17, 37-41, 85-90` · `search.extract.service.ts:170, 393-415` · `extract/build.multi.search.request.items.ts:38-43, 72-74` · `result/search.result.service.ts:1594-1633` · test › `search` › `should search without filters` [skip: "now returns results up to the limit"] | untested |
| SRCH-05 | Terms are matched (joined by spaces) against every indexed text field, with a title match weighing ×3 and a tag match ×2; body content additionally matches with typo tolerance (first two characters fixed) and ranks higher when the terms appear close together; a full name, a word from a description, a city name, a single word all match, a nonexistent word matches nothing, and each result reports the terms that matched it. | all | code › `extract/build.search.query.ts:3-97` · `search.extract.service.ts:501-517` · test › `search` › `should search by full user name`, `… common word filter`, `… location filter`, `… term users only`, `should not return any results for invalid term` | proven |
| SRCH-06 | The index holds, for active spaces at every level, the about (why, who) and profile (title, tagline, description, city, country, tags); for users and organisations the same profile fields; and for callouts, posts, whiteboards, memos and office documents under active spaces their profile plus extracted text, each tagged with its space and flow state. | all | code › `ingest/search.ingest.service.ts:42-78, 486-600, 790-1990` · spec › `agents-hq/specs/009-office-doc-search/spec.md` FR-001…FR-003, FR-016 | proven for spaces, users, organisations and posts by the scenario cases; whiteboards, memos, office documents untested |
| SRCH-07 | The index is rebuilt from scratch — new indices, alias swap, old indices deleted — only by an operations admin (platform audit row, task id returned, work continues asynchronously), by the in-cluster internal job endpoint, or by the hourly cron on acceptance and production; nothing updates the index when content is created, changed or deleted, so results reflect the last rebuild. | POA, cluster job | code › `src/platform-admin/services/search/admin.search.ingest.resolver.mutations.ts` · `src/services/api-rest/internal-admin/internal-admin.controller.ts:20-75` · `ingest/search.ingest.service.ts:183-230` · infra › `infrastructure-operations/orchestration/overlays/{acceptance,production}/third-party/search/01-search-ingest-cron-job.yml:9` · test › `search` › `beforeAll` (ingest + 15 s wait) | untested (gate covered elsewhere: `platform-roles/_support/groups/a11.ts`) |
| SRCH-08 | Every hit except top-level spaces and users is checked at query time against the searcher's read right: a subspace, organisation, callout, post, whiteboard, memo or office document the searcher cannot read is dropped, so a member of a public L0 with a private L1 sees the L0 only, while L1/L2 members and admins see all three levels. | all | code › `result/search.result.service.ts:285-293, 399-407, 434-440, 488, 546, 605, 702` · test › `search` › `Search Public Space Private Subspace Data` (7 rows), `Search Private Space Private Subspace Data` (7 rows) | proven |
| SRCH-09 | A top-level space is returned to every searcher, member or not, even when the space is private; users are returned without a read check. | all | code › `result/search.result.service.ts:242-243, 353` · test › `search` › `Private Space Private Subspace` › `non.space` gets 1 result | proven (see F2) |
| SRCH-10 | A visitor who is not signed in searches only spaces, framings and contributions — never users, organisations or callouts — and then only what the read check lets through. | anonymous | code › `search.service.ts:60-61` · `search.extract.service.ts:94-148, 278-288` | untested (see F5) |
| SRCH-11 | A post inside a callout that is still a draft is never a search result, whatever the searcher's rights. | all | code › `result/search.result.service.ts:974-977` | untested |
| SRCH-12 | With a space scope, hits are limited to entities tagged with that space (entities without a space tag are kept), users and organisations to members and admins of that space, and the spaces category answers with the scoped space itself; a space with no matching content answers nothing. | all | code › `extract/build.search.query.ts:107-161` · `result/search.result.service.ts:211-218, 329-332, 372-377, 1554-1580` · test › `search` › `should search JOURNEY data filtered empty space`; `should search JOURNEY data filtered space` [skip, #5114]; `Search IN Public Space Private Subspace Data` (7 rows, skip #5114) | untested (see F4: only the empty-space case runs, the other scope cases are skipped) |
| SRCH-13 | With a flow-state scope — or when asked to fold — a matching post, whiteboard, memo or office document counts as a match of its callout: the callout is returned once, in the callout bucket, ranked by relevance then newest first, and the folded kinds are not listed separately unless their own category was requested. | all | code › `search.service.ts:66-73` · `search.extract.service.ts:266-347` · `result/search.result.service.ts:154-191, 674, 1635+` · spec › `agents-hq/specs/007-knowledge-base-search/spec.md` FR-001…FR-003, FR-007, FR-017, FR-019 | untested |
| SRCH-14 | Each category answers with a cursor (the score and id of its last result) that, passed back in that category's filter, continues after it; a malformed cursor is refused; the per-category `total` is always −1. | all | code › `util/calculate.search.cursor.ts`, `try.parse.search.cursor.ts` · `extract/build.multi.search.request.items.ts:76-91` · `result/search.result.service.ts:1598-1599, 1627-1631` · `schema.graphql:4049-4058` | untested (see F3) |
| SRCH-15 | The answer has five buckets — actors, spaces, callouts, framings, contributions — and every result carries its score, the matched terms, its kind and the entity with its parents: a subspace with its parent space, a post with its space and callout, a framing or contribution with its callout and space and whether it is a contribution. | all | code › `dto/results/*.ts` · `result/search.result.service.ts:99-200` · `schema.graphql:1263-1274, 4060-4075` · test › `search` › `Search types` (3 cases: `parentSpace`, `space{level}`, `callout`, `post`) | proven |
| SRCH-16 | Archiving a space does not remove it or its content from the index: until the next rebuild the archived top-level space is still returned to everyone and its subspaces to whoever still passes the read check. | all | code › `ingest/search.ingest.service.ts:790-795` (ACTIVE filter at ingest only) · `result/search.result.service.ts:242-243` · test › `search` › `Search Archived Space Data` (3 role rows + `GA get results for archived spaces` = 3) | untested (see F1: the cases pass whether or not the space is returned) |
| SRCH-17 | Users with a service profile are never indexed, and a user's email and phone are never written to the index. | all | code › `ingest/search.ingest.service.ts:952-986` | untested |
| SRCH-18 | An MCP client searches through the same engine with the same actor-scoped visibility. | MCP actors | spec › `server/specs/102-mcp-content-search-hardening/spec.md` FR-001…FR-003 | untested (covered elsewhere: MCP suites) |

### B. Rights: evidence

Legend of the former who-may table. Its shorthands are still used in the evidence below and in Appendix A:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `search.resolver.queries.ts:14-23` (no guard); `search.service.ts:60-61` + `search.extract.service.ts:94-148, 278-288` (anonymous → public indices only); `result/search.result.service.ts:242-243, 285-293, 353, 399-407, 434-440, 488, 546, 605, 702` (per-hit READ); `admin.search.ingest.resolver.mutations.ts` (PLATFORM_OPERATIONS_ADMIN + audit); `internal-admin.controller.ts:20-33`; crosscheck `access-matrix-crosscheck.md:151` (A11, agree). The legacy suite proves the space-member/non-member/admin rows for spaces and subspaces; the anonymous column is matrix/code only.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Where the old text says "finding 2" or "F-2" it means F2, and "open question 2" means OQ2. F1 appears twice in section 3 (a and b) because it holds two questions for two owners. OQ5 is settled and sits under Decided. Q-SRCH-17 is new in section 3 and has no older text._

#### Findings

- **F1 — Archived-space cases prove nothing (SRCH-16).** Code: ingest filters ACTIVE only at rebuild time; archiving does not touch the index; a top-level space hit has no read check. Test: the three role rows assert `not.toContainObject({… visibility: 'ACTIVE'})` after the space became ARCHIVED, which passes whether or not the space is returned; the admin row expects 3 hits — the archived tree is still returned. Spec: none. Ruling: is an archived space searchable until the next rebuild acceptable, and should the three rows be rewritten to assert absence by id?
- **F2 — Private top-level spaces are returned to everyone (SRCH-09).** Code comment: "all spaces must be visible". Test: `non.space` gets 1 hit on a private L0. Journey: private-space abouts are world-readable (cross-ref). Ruling: record as a rule (existence of private spaces is public) or gate L0 hits like subspaces.
- **F3 — `total` is −1 (SRCH-14).** Code todo server#3700; schema says "Not implemented yet". Clients cannot show counts. Ruling: implement, or drop the field from the API.
- **F4 — Space scope returns the scoped space, not its subspaces (SRCH-12).** Code: with a scope the spaces bucket is `[the filter space]` from the first hit; subspace hits are resolved but the scope clause keys on `spaceID` as indexed. Test: `filtered space` and the 7 "IN … Subspace" rows are skipped citing #5114 (not read — cited only in tests). Ruling: define what a scoped space search returns.
- **F5 — Anonymous never sees callouts (SRCH-10).** Code: the public index store omits `callouts` (and users, organisations); posts under public callouts are searchable. PR #4712 says "demo spaces" in its title. Ruling: intended, or an omission when callouts became searchable?
- **F6 — DEMO spaces are never indexed (SRCH-06).** Ingest keeps `ACTIVE` only; DEMO, INACTIVE and ARCHIVED spaces and their content are absent for every searcher, while the public-store comment suggests demo spaces were meant to be hidden only from visitors. Ruling: which visibilities are searchable, and for whom?
- **F7 — Index freshness (SRCH-07).** Nothing re-indexes on create/update/delete; acceptance and production rebuild hourly at :25; the test cluster relies on the suite's own trigger; dev has no Elasticsearch (env fact — the ES-backed cases cannot run there). 009 FR-010 calls this "lazy" by decision. Ruling: accept up to one hour of staleness as the rule, and name it in the client.
- **F8 — Empty-term behaviour changed silently (SRCH-02).** The skipped case expected "Search: Skipping term below minimum length"; today an empty or blank term list runs and "returns results up to the limit". No spec. Ruling: minimum term length?
- **F9 — Schema says 5 terms, code allows 10 (SRCH-02).** Stale description on `SearchInput.terms`. Ruling: fix the description (rebaseline).
- **F10 — Size 0 and non-integer sizes are accepted (SRCH-02/04).** Only negatives are refused; a size of 0 still issues an index query. Ruling: define the bounds (1..max).

#### Open questions

- **OQ1 — Environments without Elasticsearch.** The brief states the dev env has none, so every ES-backed case (all 29 running ones) can run only on test/acc/local-with-ES. Confirm the test cluster's ES and whether its hourly cron exists (only acceptance and production overlays carry the CronJob).
- **OQ2 — Issue #5114.** Cited by the 8 skipped scope cases (not read, test-only citation). Someone must say whether it is open and what the scoped-space contract is (finding 4).
- **OQ3 — Index templates.** Field mappings (`profile.displayName.text`, stored `content`, highlight limits) live in `reporting-orchestration` (workspace#009) and were not read; the boosts in SRCH-05 assume them.
- **OQ4 — Score drift across rebuilds.** The M-05 comment says absolute scores drift on the multi-shard index, so a cursor from before a rebuild may skip or repeat; no source says how the client copes.
- **OQ5 — Explore-spaces constants (closes journey open question 2).** `EXPLORE_SPACES_LIMIT = 30`, `EXPLORE_SPACES_ACTIVITY_DAYS_OLD = 30`, `EXPLORE_SPACES_OVERFETCH_FACTOR = 3`, excluded activity type `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` (`space.service.ts:113-124`). Nothing left to determine; recorded here so the journey table can cite them.

### D. Test gaps

_For the Quality Lead. The GAPS row in section 3 asks which of these get a case._

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

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is unchanged: product ticks the rows it must rule on (the CONST row in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Categories (5) | `spaces`, `collaboration-tools`, `framings`, `contributions`, `contributors` | `search.category.ts:3-9` | | Product Lead |
| Result kinds (9) | `user`, `organization`, `space`, `subspace`, `post`, `callout`, `whiteboard`, `memo`, `collabora_document` | `search.result.type.ts:18-28` | | Technical Lead |
| Kinds per category | spaces{space, subspace}; contributors{user, organization}; collaboration-tools{callout}; framings{memo, whiteboard, collabora_document}; contributions{post, whiteboard, memo, collabora_document} | `search.extract.service.ts:150-168` | | Product Lead |
| Public (anonymous) categories | spaces, framings, contributions | `search.extract.service.ts:94-148` | F-5 | Product Lead |
| Default size per category | 4 | `search.service.ts:17`; `search.filter.input.ts` | | Product Lead |
| Maximum total results | 40 (`SEARCH_MAX_RESULTS`), split evenly across the categories queried when no size is given | `alkemio.yml:89`; `search.extract.service.ts:399-413` | | Technical Lead |
| Over-fetch multiplier | 2 | `search.extract.service.ts:170` | | Technical Lead |
| Term limit | 10 (schema description still says "Max 5") | `validate.search.parameters.ts:5`; `search.dto.input.ts` | F-9 | Technical Lead |
| Tagset-name limit | 2 | `validate.search.parameters.ts:6` | | Technical Lead |
| Index pattern | `alkemio-data-` (`ELASTIC_SEARCH_INDEX_PATTERN`); aliases `spaces`, `subspaces`, `organizations`, `users`, `posts`, `callouts`, `whiteboards`, `memos`, `office-document` | `extract/search.index.ts`; `ingest/search.ingest.service.ts:139-151` | | Technical Lead |
| Indexed profile fields | displayName, tagline, description, location.city, location.country, tags; spaces + about.why, about.who, level, visibility | `search.ingest.service.ts:42-78` | | Product Lead |
| Ingest filters | spaces `visibility = ACTIVE` (all levels); content only under ACTIVE spaces; users `serviceProfile = false`, email/phone stripped; organisations all | `search.ingest.service.ts:790-1990` | F-6 | Product Lead · Security Lead (email and phone stripped) |
| Ingest batch sizes | spaces/subspaces/orgs/users 100; callouts 30; posts/whiteboards/memos 50; office documents 15 | `search.ingest.service.ts:505-565` | | Technical Lead |
| Content cap | `CONTENT_FIELD_SIZE_LIMIT` 1,000,000 characters; office-document source cap 15 MiB | `extract/collabora.text.extract.service.ts:73`; `alkemio.yml:93-99` | | Technical Lead |
| Query boosts | `profile.displayName.text^3`, `profile.tags^2`, `content^0` in the all-fields matcher; content fuzziness `AUTO`, `prefix_length 2`, `max_expansions 50`; phrase `slop 2`, `boost 2` | `extract/build.search.query.ts:37-89` | | Technical Lead |
| Highlight | fields `*`, `fragment_size 100`, `number_of_fragments 3`, `max_analyzed_offset 999,999` | `build.multi.search.request.items.ts:61-70` | | Technical Lead |
| Index sort | `_score desc, id desc` | `build.multi.search.request.items.ts:74` | | Technical Lead |
| Cursor format | `<score>::<entity uuid>` | `util/calculate.search.cursor.ts` | | Technical Lead |
| `total` | always −1 ("Not implemented yet", server#3700) | `search.result.service.ts:1598-1599`; `schema.graphql:4056-4057` | F-3 | Product Lead |
| Scope filters | `spaceID`, `flowStateID`: "field absent OR equals" | `build.search.query.ts:107-161` | | Technical Lead |
| Space-scope contributor rule | users/orgs ∩ (SPACE_MEMBER ∪ SPACE_ADMIN credential holders of the space) | `search.result.service.ts:1554-1580` | | Product Lead |
| Rebuild triggers | GraphQL `adminSearchIngestFromScratch` (POA, audited, returns task id); REST `POST /rest/internal/admin/search-ingest` (202, in-cluster); CronJob `25 */1 * * *` acceptance + production | resolver; controller; infra-ops overlays | F-7 | Technical Lead |
| Error texts | `Maximum number of search terms is 10; supplied: <n>`; `Maximum number of tagset names is 2; supplied: <n>`; `Size cannot be a negative number`; `The requested <n> results cannot exceed the maximum allowed 40 over all categories.`; `Space with the given identifier not found`; `Elasticsearch client not initialized`; `Invalid search cursor` / `Invalid first part of cursor` / `Invalid second part of cursor` | `validate.search.parameters.ts`; `search.service.ts:53-57`; `search.extract.service.ts:202`; `try.parse.search.cursor.ts` | | Technical Lead |
| ES client prerequisites | host + api_key (else no client); TLS per `tls.ca_cert_path` | `elasticsearch.client.factory.ts:10-55` | | Technical Lead |
| Explore spaces (DB, journey JRN-64) | `EXPLORE_SPACES_LIMIT` 30; `EXPLORE_SPACES_ACTIVITY_DAYS_OLD` 30; `EXPLORE_SPACES_OVERFETCH_FACTOR` 3; excluded activity `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` | `src/domain/space/space/space.service.ts:113-124` | | Product Lead |
| Flow-state search page (client) | 10 per page | spec 007 FR-006 | | Product Lead |
| GraphQL surface | `search(searchData: SearchInput!)`; `SearchInput{terms, tagsetNames, searchInSpaceFilter, searchInFlowStateFilter, filters[{category, cursor, size, types}], foldCalloutResources}`; `ISearchResults{actorResults, spaceResults, calloutResults, framingResults, contributionResults}`; `ISearchCategoryResult{results, cursor, total}`; `SearchResult{id, score, terms, type}` + per-kind types; mutation `adminSearchIngestFromScratch: String` | `schema.graphql:1263-1274, 4049-4075, 6384` | | Technical Lead |

### F. Where this lands in the new core

Per the rebuild briefing (`plan.md` § 1, catalogue), search stays an external index fed from the core, so the rules above split in two: what is indexed and when (SRCH-06/07/16/17) is a sync contract the new core must own — ideally event-driven on write rather than an hourly full rebuild, which would retire finding 1 and 7 as a class; how results are scoped and filtered (SRCH-08…13) must move inside the viewer's read-time authorization so a hit is never returned for a row the viewer cannot read — which settles finding 2 (private L0 existence) by whatever the space document's read rule becomes. Three facts should shape the port: (1) anonymous visibility is decided by index selection, not by the read rule (SRCH-10, F-5) — one mechanism in the new core; (2) `total` was never implemented (F-3) — decide whether the API promises it; (3) the explore ranking is a separate DB query (constants above) and should stay out of the search service. Error texts, boosts and sizes are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/search/`, 1 file, 39 cases — 29 run, 10 skipped); the specs, issues and docs listed in § Sources. Scope: the platform search query — what is indexed, how terms match, categories and result kinds, sizes and cursors, the space and flow-state scopes, visibility filtering at query time, and the index rebuild. "Explore spaces" is database-ranked, not search; it is cross-referenced (journey JRN-64) and its constants are recorded here to close journey open question 2. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file:line is `search-dossier.md` beside this file.

2026-11-19 converted to the three-section layout: the single why was split in three, the who-may table was rebuilt with footnotes, and every finding, open question and rule without a stated reason was routed to an organisation role. The old status legend was dropped; proof is in Appendix A.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it (SRCH-11, SRCH-17). Server#5114 was read: it answers OQ2 (suggested).

#### Sources

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
- server#5114 read 2026-11-20 (open; expects only the subspace when searching inside a space)
