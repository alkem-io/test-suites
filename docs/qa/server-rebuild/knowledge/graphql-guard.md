# GraphQL guard (API-level protection): behaviour rules

_What the platform does today at the door of its API: how it works out who the caller is, how each field is protected, what "me" returns to a caller without an account, the endpoints and their limits, and the shape of errors. Which role holds which right is in the access matrix and the platform-roles table, and is only cross-referenced here. What it does, why, who may, and what is still to answer. The file has three sections: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 7 · Quality Lead 4 · Security Lead 4 · Service Operations Lead 3 · Architecture Lead 2. By state: 15 open · 5 with a suggested answer · 2 decided. Proof of the 32 rules: 16 proven by a test · 16 untested (Appendix A)._

_Whys of the 32 rules: 31 rest on a source or a product decision · 1 technical why is still a QA draft, for the Technical Lead (GQL-15)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided: exists in the code" means the behaviour is in the code and nobody chose it. "Not decided: a defect" means the behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Who the caller is

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| GQL-01 | A request with no credentials at all is never turned away. It is served as an anonymous visitor, and each field decides what that visitor gets. **(open: OQ5)** | — | — | FR-024b state (a) of the OIDC/BFF design: absent credentials degrade to anonymous, present-but-invalid ones do not (code comment, PR #6143). | OIDC design FR-024b (server PR #6143) |
| GQL-02 | A request with credentials the platform cannot verify (a bad or expired token, an ended session) is refused as a whole, with a clear "not signed in" answer and no data. It is never quietly treated as anonymous. **(open: OQ5)** | — | — | FR-024b state (b): a caller holding bad credentials must get a signal, not a silent anonymous page (code comment; `authentication.exception.ts` sets the wire status so Apollo does not answer 200). | OIDC design FR-024b (server PR #6143) |
| GQL-03 | Three kinds of credential are accepted, tried in a fixed order: the browser session cookie, a test-only login token (never available in production), and a token issued by the sign-in service. **(open: OQ5)** | — | — | T042b / FR-025 of the OIDC design: browser sessions take the cookie path, API clients the bearer path, test harnesses the non-interactive path; the non-interactive path is inert in production by construction (`NonInteractiveLoginConfig.assertSafe`). | OIDC design T042b, FR-025 (server PR #6143) |
| GQL-04 | Refusing a bad token reveals nothing about accounts. A still-valid token of a deleted account gets exactly the same answer as no credentials. | No existence oracle across bearer classes (107 FR-009a; test rationale: "a deleted account's still-valid bearer must be indistinguishable from presenting no credentials"). | — | — | Spec 107 FR-009a |
| GQL-05 | A visitor without an account who gives a guest name is served as a named guest. A resource can allow guests what it refuses anonymous visitors. **(open: F8)** | Ephemeral guests for public share links (the guest-share whiteboard SPA) without accounts or tokens (`docs/Guest-Users.md`; server spec `021-toggle-whiteboard-guest`). | — | — | Server spec 021; docs/Guest-Users.md |
| GQL-06 | A browser session ended on the server (account deleted, session revoked, 30 days reached) is refused on its next request and its cookie is cleared. The sign-in and sign-out pages still work, so the person can sign in again. | — | — | server#6315: an orphaned session left the browser "logged-in but no account"; the cookie clear plus the entry-point exception is what makes sign-in a single click again (107 FR-009/009a). | Spec 107 FR-009/009a; server#6315 |
| GQL-07 | When the session store is down, a request with a session cookie gets a "try again later" answer and keeps its cookie. A request without a cookie continues as anonymous. | — | — | A Redis blip must degrade authentication, not sign the whole platform out or masquerade as 401 (server#6332; 109 D3, FR-016…FR-018). | Spec 109 D3, FR-016 to FR-018; server#6332 |
| GQL-08 | A live-update connection is checked once, when it opens. It is closed when the session behind it passes its 30-day limit. **(open: OQ5)** | — | — | FR-023 (OIDC design): credentials must not bypass the upgrade-time check; long-lived sockets must not outlive the session ceiling (code comments). | OIDC design FR-023 (server PR #6143) |
| GQL-09 | On non-production environments only, a test tool can exchange an email and password for a 4-hour token. Wrong password and unknown email get the same refusal, and every attempt is audited. | — | — | A credential→bearer path for harnesses that cannot run the browser flow, hard-gated out of production so it can never become a password-login backdoor (`non-interactive-login.config.ts` header). | Not decided: exists in the code |

### The field gate

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| GQL-10 | Access is decided per field. A field that needs a right is served only when the caller holds that right on the item it belongs to; a field that needs none is not checked. | — | — | Credential-based authorization evaluated at the resolver boundary; the guard was made synchronous so DataLoader batching keeps working (PR #5848). | Server PR #5848; docs/credential-based-authorization.md |
| GQL-11 | The caller is identified once per request and every part of the request is checked against that same caller. Requests running at the same time never see each other's rights. | — | — | PR #5848: authentication moved to a single global interceptor, the guard reads `req.user`; the nested-query tests are the regression fence for the rewrite. | Server PR #5848 |
| GQL-12 | Every item can list the rights the caller holds on it, so a refusal can be predicted before a call is made. **(open: Q-GQL-12)** | — | As a user, I want the app to offer only the actions I may take, so that I do not run into refusals. | — | Product, 2026-11-20 (product why); the technical why waits for Q-GQL-12 |
| GQL-13 | A refused field returns one structured "forbidden" error, and the rest of the request is still answered. **(open: F2)** | — | — | Refusals are data, not transport failures, so the client can render the parts it may see (032 error-code system; FR-024b wire semantics for authn only — see F-10). | Spec 032 |
| GQL-14 | Asking for something that does not exist returns one "not found" error, never a crash or an empty success. **(open: F2, F3)** | 032: a not-found is a 10xxx error the support desk can triage from the code. | — | — | Spec 032 |
| GQL-15 | An item whose access rules are missing or empty cannot be served at all: the gate fails closed. **(open: Q-GQL-15)** | — | — | Failing closed means a missing or broken policy can never expose data; the cost is a refusal, not a leak. _(draft)_ | Not decided: exists in the code |
| GQL-16 | On a private top-level Space, non-members and visitors can read the About card and nothing else; on a public one they can read the Space. A private Subspace is refused to non-members; a member of the parent sees its About card only. **(open: F3, F7)** | Private spaces content is only visible to members (rule text in `space.service.authorization.ts:659`); READ_ABOUT exists so the About card and the application door stay reachable. | — | — | Space rules and the access matrix (cross-referenced, not owned here); Product, 2026-11-20 (F9): by design, the cross-reference to the Space rules is enough |
| GQL-17 | Switching a Space between public and private takes effect on the very next request for non-members. Members see no difference. | — | — | The policy is recomputed and stored on the settings write; the guard reads the stored policy per request, so there is no cache to wait for (PR #5848 test rationale). | Server PR #5848 |
| GQL-18 | The few REST routes that need a caller (calendar feed, content signing, memo PDF) accept the same three credentials. Bad credentials are refused as "not signed in", any other failure as "forbidden". | — | — | FR-025: REST and GraphQL share one credential model after the Oathkeeper chain was retired (`rest.guard.ts` header). | OIDC design FR-025 |
| GQL-19 | An MCP API key is not a credential for the GraphQL API. A request that carries only such a key is refused and changes nothing. | 038 FR-015: contain a leaked key — it must not mint, list or revoke keys through any surface. | — | — | Spec 038 FR-015 |

### "me" for a caller without an account

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| GQL-20 | For a caller without an account, "me" never errors: it returns an empty profile, zero counts and empty lists, exactly like a legitimately empty one. **(open: OQ6)** | — | — | server#6315: every anonymous visitor hit seven throwing guards; a degraded `me` must be byte-identical to a legitimately empty one so the client needs no change (107 FR-029/029a, contract). | Spec 107 FR-029/029a; server#6315 |
| GQL-21 | For a signed-in caller, "me" is unchanged and carries the caller's real values. | — | — | 107 FR-031: behaviour for a fully signed-in account must be unchanged. | Spec 107 FR-031 |
| GQL-22 | Each time "me" falls back to empty values, the server logs a warning, so an orphaned session can be found. | — | — | 107 FR-030. | Spec 107 FR-030 |

### Endpoints and limits

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| GQL-30 | There is one GraphQL endpoint. The three public addresses ("public", "private", "private non-interactive") all lead to it and are treated the same; the names are a convention, not a protection. **(open: F4, OQ4, Q-GQL-30)** | — | — | The split dates from the retired Oathkeeper chain, where only `/api/private/graphql` ran the cookie authenticator; that chain is gone — `rest.guard.ts:78-80`. | Not decided: exists in the code |
| GQL-31 | The API description (schema) can be read by anyone in every environment, production included, and a query page is served. **(open: F5)** | — | — | "Enabled introspection in all cases so gql schema is visible" (commit `673e22654`); the public contract is also published as `schema.graphql` (002/012). | Commit 673e22654 |
| GQL-32 | The API sets no limit on how deep or complex a request is and no general rate limit. Only a few features have their own limits (invitation emails, push, location lookups, sign-in). **(open: F6)** | — | — | 008 (external MCP): abuse is to be capped per source IP "at the edge" as a stopgap; the application-level `mcp.rate_limit` setting exists but is not enforced (#1956). | Not decided: exists in the code |
| GQL-33 | Request size is limited by configuration: 64 MB for ordinary requests, 256 kB for MCP requests, 15 MB for file uploads. | — | — | The upload cap "only defers rejection until after the whole file has been buffered" if larger than the bucket default (`alkemio.yml:354-358`); the MCP cap is a hard-coded guard. | Not decided: exists in the code |
| GQL-34 | The API description is a versioned contract. Every merge refreshes the baseline, and breaking changes are detected and held before release. | — | — | Contract stability (server constitution principle 3 via 002; 012 keeps the baseline current; 107 uses `schema:diff` as an exit gate). | Server specs 002, 012 |

### Error shape

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| GQL-40 | Every error carries a text code, a five-digit number whose first two digits give the category, a translatable message key, and an error id for support. | 032 (#5714) FR-001…FR-007: a numeric code the user can quote and support can triage by its first two digits, with the string code kept for backward compatibility. | — | — | Spec 032 FR-001 to FR-007 (#5714) |
| GQL-41 | Only in production mode is an error reduced to its message, code and error id. In any other mode the full internal error, with stack trace, is returned. **(defect: F1)** | — | — | Non-production diagnostics (filter comments "if not in PROD, return everything"); 032 FR-007 promises callers only the errorId. | Not decided: a defect |
| GQL-42 | When a request variable has an invalid value, the error says so in fixed words and never repeats the rejected value. | — | — | Variable-coercion messages reflect user content (potentially large or sensitive input) back to the browser before any resolver runs (`graphql.error.sanitizer.ts` header; #6399). | Server PR #6399 |
| GQL-43 | Only sign-in problems change the HTTP status: 401 for bad credentials, 503 when the session store is down. A refused field, a not-found or a validation error arrive inside a normal 200 answer. **(open: F10, OQ5)** | — | — | FR-024b wants authn (401), authz (403) and system (500) distinguishable on the wire (comment in `authentication.exception.ts`); 109 FR-017 for the 503. | OIDC design FR-024b; spec 109 FR-017 |
| GQL-44 | An error nobody mapped is still answered: with a generic code, the number 99999 and a fresh error id, and a warning is logged. | 032 US4 / FR-005/FR-006: no error goes unreported, every error stays traceable. | — | — | Spec 032 US4, FR-005/FR-006 |

Numbering note: GQL-23…29 and GQL-35…39 are intentionally unused (reserved for the sub-topics above).

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under the table. This table only says what the gate itself allows. Which role holds which right on which item is in the access matrix. Evidence is in Appendix B._

Every signed-in role is treated the same at this gate: platform roles, Platform License Manager, account admins and owners, Space admins, Space members and registered users. The former table had one column for each, all with the same value; they are one column here.

| ID | Action | Any signed-in user | Visitor (no account) |
|---|---|---|---|
| W1 | Send a request with no credentials and be answered as anonymous | – | Y |
| W2 | Send a request with a guest name and be answered as a guest | – | Y |
| W3 | Send a request with a verified session cookie or sign-in token | Y | – |
| W4 | Send a request with an unverifiable token or an ended session | N¹ | N¹ |
| W5 | Use an MCP API key as the GraphQL credential | N | N |
| W6 | Read the list of own rights on any item the request reaches | Y | Y |
| W7 | Read a field that needs a right the caller lacks | N² | N² |
| W8 | Read the API description, open the query page or the playground | Y | Y |
| W9 | Get a test-only login token | Y³ | N |
| W10 | Open a live-update connection | Y⁴ | Y⁵ |
| W11 | Call a guarded REST route (calendar feed, content signing, memo PDF) | Y | N⁶ |

¹ The whole request is refused with HTTP 401. ² The field is refused with a "forbidden" error; the rest of the request is answered. ³ On non-production environments only; any account with a password. ⁴ With the credentials given when the connection opens only. ⁵ As an anonymous connection. ⁶ Refused with HTTP 401.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 7 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Errors | tidy-up | Two error messages break the house rule on dynamic data: the "forbidden" text carries the caller id and the policy id, and the Space not-found text reads "options 'undefined'". Clean them? | Technical Lead (Quality Lead updates the one test) | When the messages are cleaned, rebaseline the one case; treat the red as a text change, not a behaviour change. | suggested |
| F8 | Caller | tidy-up | docs/Guest-Users.md describes a query and a sign-in strategy that no longer exist. Fix the document? | Technical Lead | Fix the doc; the behaviour stands. | suggested |
| OQ5 | Caller | spec | Where is the OIDC sign-in spec? The code cites FR-023, FR-024b, FR-025 and T042b from server PR #6143, but the spec is not in the server repo. Until it is found, the why of GQL-01, 02, 03, 08 and 43 rests on code comments. | Technical Lead | — | open |
| OQ6 | me | check | Does the web client depend on the "me" id being exactly "me-" for a caller without an account? Confirm before the new core changes it. | Technical Lead | — | open |
| Q-GQL-12 | Field gate | decision | Why can every caller list their own rights on every item? No source states a reason. | Technical Lead | Product, 2026-11-20: the product why on GQL-12 is confirmed (the app offers only the actions a user may take). A technical why is still welcome. | suggested |
| Q-GQL-15 | Field gate | decision | Why is an item with missing or empty access rules refused outright? No source states a reason. | Technical Lead | — | open |
| Q-GQL-30 | Endpoints | decision | Why are there three addresses for one endpoint? No source states a reason; the split dates from a sign-in chain that was retired. (F4 asks what to do with them.) | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Errors | defect | Outside production mode, error answers include stack traces and internal paths (seen on acceptance on 2026-10-14, server#6663). Should errors be reduced to message, code and error id everywhere? | Security Lead (Technical Lead fixes it on server#6663; Service Operations Lead answers OQ3) | Track it on server#6663, never a new issue. | suggested |
| F3 | Field gate | decision | A visitor can tell that an id belongs to a real private Subspace, because a missing Space answers "not found" and a private one answers "forbidden". Is the existence of a private Space confidential? If yes, both should answer "not found". | Security Lead (Technical Lead changes the lookup if yes) | — | open |
| F10 | Errors | decision | A refused field arrives inside a normal 200 answer, while a code comment says refusals should be a 403. The web client relies on the 200. Which is intended? | Architecture Lead (Technical Lead finds the spec, OQ5) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 4 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Field gate | test | Two guard test titles mislead: "Anonymous user cannot access private space data" proves the About card is readable, and "Non-member cannot access private subspace" only checks that some error exists. Rename them and tighten the second? | Quality Lead | Rebaseline the titles to the rule ("about only" / "refused with FORBIDDEN_POLICY") and tighten the second assertion to the code. No product decision. | suggested |
| OQ1 | All | test | Nothing in this area runs nightly: every "proven" here means green when last run by hand. When was that, and should the graphql-guard, configuration and platform test projects join the nightly? They need no stack of their own. | Quality Lead | — | open |
| OQ7 | Field gate | test | Which credentials do the test admin and test support admin hold? The rights pinned by the guard tests assume them; the platform-roles table owns the answer. | Quality Lead | — | open |
| GAPS | All | test | 13 rules have no test and 12 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Errors | tidy-up | Two error messages break the house rule on dynamic data: the "forbidden" text carries the caller id and the policy id, and the Space not-found text reads "options 'undefined'". Clean them? | Technical Lead (Quality Lead updates the one test) | When the messages are cleaned, rebaseline the one case; treat the red as a text change, not a behaviour change. | suggested |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 4 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Errors | defect | Outside production mode, error answers include stack traces and internal paths (seen on acceptance on 2026-10-14, server#6663). Should errors be reduced to message, code and error id everywhere? | Security Lead (Technical Lead fixes it on server#6663; Service Operations Lead answers OQ3) | Track it on server#6663, never a new issue. | suggested |
| F3 | Field gate | decision | A visitor can tell that an id belongs to a real private Subspace, because a missing Space answers "not found" and a private one answers "forbidden". Is the existence of a private Space confidential? If yes, both should answer "not found". | Security Lead (Technical Lead changes the lookup if yes) | — | open |
| F5 | Endpoints | decision | The API description, the query page and the playground are open in every environment, production included. Should production expose them? (The schema is public in the repository anyway, so the exposure is the playground.) | Security Lead, with Product Lead | Product, 2026-11-20: product has no need for the playground in production, but it stays as today; the Security Lead decides whether closing it goes on the product issues list. | open |
| F6 | Endpoints | risk | The API has no depth, complexity or rate limit of its own, and the MCP rate setting is not enforced. Does a rate cap exist at the edge on acceptance and production (OQ2), and does the new core's gateway own depth and complexity limits? | Security Lead (Service Operations Lead answers OQ2; Architecture Lead decides for the new gateway) | — | open |


### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 3 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | Endpoints | check | Does a rate cap exist at the edge on acceptance and production? Spec 008 names it as the stopgap for the MCP rate setting that is not enforced. | Service Operations Lead | — | open |
| OQ3 | Errors | check | Do acceptance and production run in production mode (NODE_ENV=production)? The evidence on server#6663 shows the non-production error path running on acceptance. | Service Operations Lead | — | open |
| OQ4 | Endpoints | check | Is the routing read for GQL-30 current? It was read from a local copy that may be stale, and the acceptance and production routing was not read. Do the three addresses still share one chain? | Service Operations Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Errors | defect | Outside production mode, error answers include stack traces and internal paths (seen on acceptance on 2026-10-14, server#6663). Should errors be reduced to message, code and error id everywhere? | Security Lead (Technical Lead fixes it on server#6663; Service Operations Lead answers OQ3) | Track it on server#6663, never a new issue. | suggested |
| F6 | Endpoints | risk | The API has no depth, complexity or rate limit of its own, and the MCP rate setting is not enforced. Does a rate cap exist at the edge on acceptance and production (OQ2), and does the new core's gateway own depth and complexity limits? | Security Lead (Service Operations Lead answers OQ2; Architecture Lead decides for the new gateway) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Endpoints | decision | The "public" and "private" API addresses are one endpoint with the same rules. Document them as equal and retire the misleading names in the new core, or make them really differ? | Architecture Lead | — | open |
| F10 | Errors | decision | A refused field arrives inside a normal 200 answer, while a code comment says refusals should be a 403. The web client relies on the 200. Which is intended? | Architecture Lead (Technical Lead finds the spec, OQ5) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Endpoints | risk | The API has no depth, complexity or rate limit of its own, and the MCP rate setting is not enforced. Does a rate cap exist at the edge on acceptance and production (OQ2), and does the new core's gateway own depth and complexity limits? | Security Lead (Service Operations Lead answers OQ2; Architecture Lead decides for the new gateway) | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F9 | By design: visitors and non-members read the About card of a private top-level Space. The cross-reference to the Space rules is enough; no ruling is needed here. | Product, 2026-11-20 | GQL-16 |
| CONST | No constant here needs a product ruling: all are engineering or security values, ticked "no" in Appendix E. | Product, 2026-11-20 | Appendix E |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `register ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| GQL-01 | A request that presents no credentials at all (no session cookie, no Authorization header) is never refused at the door: it is served as the anonymous actor, and only each field's own policy decides what it gets. | anonymous | code › `src/core/interceptors/auth.interceptor.ts:158-164, 285, 296-302` · `src/core/actor-context/actor.context.service.ts:26-36` · `src/core/authorization/graphql.guard.ts:41-43` · test › `me-degradation-anonymous` › SRA-G1; `graphql-guard-public-private-access` › `Anonymous user can read public space basic data` | proven |
| GQL-02 | A request that presents credentials the platform cannot verify — a garbage bearer, a well-formed token with a bad signature, wrong issuer or audience, an expired token, a token without an Alkemio actor claim, or a session cookie that was revoked, tombstoned or past its 30-day ceiling — is refused as a whole with HTTP 401, a single error `unauthenticated` carrying code `UNAUTHENTICATED` (11101) and a reason in `error_code`, and no data. It is never downgraded to anonymous. | anonymous, registered, MCP-key holder | code › `auth.interceptor.ts:165-249` · `src/core/auth/oidc/strategies/hydra-bearer.validator.ts:55-114` · `src/common/exceptions/authentication.exception.ts:6-25` · test › `me-degradation-anonymous` › SRA-N2 (garbage + unsigned HS256 → 401); `platform/mcp-api-keys-containment` › US3-AS1, US3-AS2 (MCP key on GraphQL → 401) | proven |
| GQL-03 | Three credential carriers are accepted, tried in this order and the first that resolves wins: the browser session cookie `alkemio_session`; an HS256 non-interactive-login token (only on stacks where that feature is enabled, which production can never be); a Hydra-issued RS256 bearer whose audience is on the allow-list and that carries `alkemio_actor_id`. | all | code › `auth.interceptor.ts:338-366` · `src/core/authorization/rest.guard.ts:82-91` · `src/core/auth/non-interactive-login/non-interactive-login.config.ts:15-51, 60-80` · `hydra-bearer.validator.ts:73-103` · `src/core/auth/oidc/bearer-aud-allow-list.ts` | untested (the non-interactive path is what every harness call uses — SRA-G4 proves it alone; cookie and Hydra paths are covered elsewhere: client-web `session-revocation/*`) |
| GQL-04 | Refusing a bad bearer reveals nothing about accounts: the signature is checked before any account lookup, so a 401 is a property of the token, and a still-valid bearer whose account has since been deleted resolves to the anonymous actor with a response byte-identical to presenting no credentials. | anonymous, deleted user | code › `hydra-bearer.validator.ts:73-109` (verify, then `createActorContext`) · `src/core/authentication/authentication.service.ts:64-88` (actor not found → anonymous) · test › `me-degradation-anonymous` › SRA-N2 · spec › `server/specs/107-oidc-session-revocation/spec.md:314-323` | proven |
| GQL-05 | A request with no credentials but an `x-guest-name` header (UTF-8 base64 or plain ASCII, no control characters) is served as a *guest* actor — a named anonymous visitor carrying the `GLOBAL_GUEST` credential instead of `GLOBAL_ANONYMOUS` — so a resource may grant guests what it denies anonymous. | guest | code › `auth.interceptor.ts:289-302` · `src/core/authentication/guest-name.resolver.ts` · `actor.context.service.ts:39-47` · doc › `docs/Guest-Users.md:1-25` | untested (covered elsewhere: whiteboard guest suites, not read here) |
| GQL-06 | A browser session that has been ended on the server (account deleted, session revoked, 30-day ceiling reached) is rejected on its next request with 401 and the cookie is cleared, so the browser does not keep presenting it; the sign-in, callback, logout and app-handoff routes alone are let through as anonymous so the person can sign in again. | registered (ended session) | code › `auth.interceptor.ts:88-107, 175-226` · `src/core/auth/oidc/strategies/cookie-session.strategy.ts:118-193` · spec › `107-oidc-session-revocation/spec.md:149-180, 314-323` | untested (covered elsewhere: client-web `session-revocation-cascade` › SRB-G1/G2, `session-revocation-blast-radius` › SRB-E3/E4/N2) |
| GQL-07 | When the session store (Redis) is unreachable, a request carrying a session cookie is answered 503 with `Retry-After` and code `SESSION_STORE_UNAVAILABLE` (14119) on every transport, its cookie re-asserted rather than cleared; a request without a cookie proceeds as anonymous. | all | code › `auth.interceptor.ts:250-277` · `cookie-session.strategy.ts:99-107` · spec › `server/specs/109-redis-session-store-resilience/spec.md:279-291` | untested |
| GQL-08 | Subscriptions authenticate once, from the HTTP upgrade only — a bearer smuggled in `connectionParams` is ignored — and a socket whose session passes its absolute 30-day ceiling is closed with "Session expired". | registered | code › `src/app.module.ts:208-226, 243-264` · `cookie-session.strategy.ts:239-243` | untested |
| GQL-09 | On a non-production stack with the feature enabled, `POST /api/auth/non-interactive-login` with e-mail + password mints a 4-hour bearer; it answers 404 when the feature is off (as if the route did not exist), 400 `invalid_request`, 401 `invalid_credentials` without distinguishing a wrong password from an unknown e-mail, 422 `actor_id_missing`, 429 `rate_limited` when Kratos throttles, 503 `kratos_unavailable`; every outcome is audited. | harness / API client | code › `non-interactive-login.controller.ts:25-100` · `non-interactive-login.config.ts:60-80` · `non-interactive-login.service.ts:57-125, 175-205` | untested (every harness token comes from it — `lib getUserToken` — but no case asserts its refusals) |
| GQL-10 | Authorization is decided per field: a field that declares a required privilege is served only when the caller's credentials satisfy the *parent entity's* stored policy for that privilege; a field that declares none is not gated by the guard at all (96 declared fields across 30 resolvers today). | all | code › `graphql.guard.ts:28-57` · `src/app.module.ts:199` · `src/core/authorization/authorization.service.ts:29-52` · test › `graphql-guard-authorization` › every privilege-set case · doc › `docs/credential-based-authorization.md` | proven |
| GQL-11 | The caller is authenticated once per request and every field of the document — however deep, and however many requests run concurrently — is evaluated against that same caller: parallel requests from different users never see each other's privileges, and each nesting level reports its own correct set. | all | code › `auth.interceptor.ts:142-287` · `graphql.guard.ts:39-43` · test › `graphql-guard-nested-queries` › all 8 cases; `graphql-guard-authorization` › `Global admin has consistent elevated access across all levels` | proven |
| GQL-12 | `authorization.myPrivileges` on any entity lists exactly the privileges the caller holds on it — the same evaluation the guard performs — so a refusal can be predicted before a call is made. | all | code › `authorization.service.ts:107-135` · test › every `myPrivileges` case in the four files | proven |
| GQL-13 | A refused field answers with one structured error of code `FORBIDDEN_POLICY` (11104) whose message names the privilege, the policy and the actor; the HTTP status stays 200 and the rest of the document still resolves. | all | code › `authorization.service.ts:44-52` · `src/common/exceptions/forbidden.authorization.policy.exception.ts` · `error.status.metadata.ts:108-111` · test › `graphql-guard-authorization` › `Forbidden access returns structured error with FORBIDDEN_POLICY code` | proven (the message text is F2) |
| GQL-14 | Looking up an entity that does not exist answers one `ENTITY_NOT_FOUND` error (10101) — for a space the text is `Unable to find Space using options 'undefined'` — and never a crash or an empty success. | all | code › `src/services/api/lookup/lookup.resolver.fields.ts:141-153` · `src/domain/space/space/space.service.ts:851-861` · test › `graphql-guard-authorization` › `Requesting a non-existent space returns error, not crash` | proven (text is F2; code-vs-forbidden ordering is F3) |
| GQL-15 | An entity whose stored policy has no credential rules cannot be served at all (`AUTHORIZATION_INVALID_POLICY`, 11106), and a field whose parent has no policy is refused with `FORBIDDEN` ("no definition provided"): the gate fails closed. | all | code › `authorization.service.ts:86-103, 119-126` | untested |
| GQL-16 | What the guard tests prove about space visibility (rules owned by the space/journey table and the access matrix, cross-referenced here): on a **private** L0 a non-member and an anonymous visitor hold `READ_ABOUT` only — the About card is readable, nothing else; on a **public** L0 they hold `READ`, `READ_ABOUT`, `READ_LICENSE`; a **private L1/L2** is refused outright to non-members, and a member of the parent who is not a member of the subspace holds `READ_ABOUT` there. | anonymous, registered, space member | code › `src/domain/space/space/space.service.authorization.ts:300-330, 606-668` · test › `graphql-guard-authorization` › the 5 persona rows, `Anonymous user cannot access private space data`, `Space member without subspace membership…`, `Non-space member cannot access private subspace`, `…consistently no access to private hierarchy`; `graphql-guard-public-private-access` › the 9 persona/anonymous cases · matrix › `access-matrix.md` § space | proven (titles mislead — F7) |
| GQL-17 | Changing a space between public and private takes effect on the very next request for non-members, while a member's privilege set is identical in both modes. | space admin (changes), non-member, member | code › `graphql.guard.ts:46-56` · test › `graphql-guard-public-private-access` › `Changing from public to private immediately restricts non-member access`, `Member access remains consistent through privacy toggle` | proven |
| GQL-18 | REST routes that need a caller accept the same three carriers; invalid credentials answer 401 `UNAUTHENTICATED`, any other guard failure 403. Only the calendar ICS, content-signing and memo-PDF routes are guarded this way; `/rest/mcp` has its own MCP-key guard and the `/rest/internal*` and `/health` routes carry no caller guard. | API clients | code › `rest.guard.ts:78-124` · `src/services/mcp-server/mcp-server.controller.ts:55` · grep `@Controller(` (14 controllers) | untested |
| GQL-19 | An MCP API key is not a GraphQL credential: a request to GraphQL whose only authentication is an MCP key is refused 401 `UNAUTHENTICATED` and has no side effect, so a leaked key cannot reach the key-management or any other GraphQL surface. | MCP-key holder | code › `hydra-bearer.validator.ts:60-84` (a key is not a JWT → `BearerValidationError`) · `auth.interceptor.ts:150-156` (only a guard-set actor survives) · test › `platform/mcp-api-keys-containment` › US3-AS1, US3-AS2 · spec › `agents-hq/specs/038-mcp-api-key-management/spec.md:299-303` | proven |
| GQL-20 | `me` never errors for a caller with no account (anonymous, guest, or a bearer whose account is gone): `id` is the literal `me-`, `user` is null, the unread and invitation counts are 0, the invitation, application and conversation lists are empty, and the notifications page is the contract empty page (total 0, no items, no next/previous, null cursors) — and the body contains no `BAD_USER_INPUT`, `FORBIDDEN`, "Unable to retrieve" or "no userID provided". | anonymous, guest, deleted user | code › `src/services/api/me/me.resolver.fields.ts:63-70, 95-112, 124-128, 145-176, 198-203, 225-233, 256-261, 287-292, 414-418` · `me.conversations.resolver.fields.ts:28-33` · test › `me-degradation-anonymous` › SRA-G1, SRA-G2, SRA-G3, SRA-R1 · spec › `107-oidc-session-revocation/spec.md:391-404`, `contracts/graphql-me-degradation.md` | proven |
| GQL-21 | For a signed-in caller `me` is unchanged by the degradation: `id` is `me-<actor id>` and every field carries the caller's real values. | registered | code › `me.resolver.fields.ts:112` · test › `me-degradation-anonymous` › SRA-G4 | proven |
| GQL-22 | Each `me` field that degrades writes one warning-level log line naming the field, so an orphaned session can be located from the logs. | server | code › `me.resolver.fields.ts` (the seven guards) · spec › `107-oidc-session-revocation/spec.md:402-403` | untested |
| GQL-30 | There is one GraphQL endpoint. The three public paths — `/api/public/graphql`, `/api/private/graphql`, `/api/private/non-interactive/graphql` — are edge aliases that the ingress strips to the same `/graphql` on the same server through the same middleware chain; the server applies no different rule per path, so "public" versus "private" is a naming convention, not a trust boundary. | all | code › `src/app.module.ts:158-268` (single module) · `dev-orchestration/…/server/34-, 35-, 36-*.yml`, `…/traefik/22-strip-prefix-middleware.yml:55-75` · `lib/src/utils/graphql.actor.ts:33-43` · test › every harness call (private non-interactive path), `configuration` › anonymous read on that path | proven (see F4) |
| GQL-31 | Schema introspection is enabled in every environment, production included; a GraphiQL page is served at `/graphiql`, and the playground offers sample tabs that point `Me`/`Spaces` at the private endpoint and `Configuration`/`Server Metadata` at the public one. | anonymous | code › `src/app.module.ts:171-198` · `src/main.server.ts:207-213` · `dev-orchestration/…/32-graphiql-ingress-route.yml` | untested (F5) |
| GQL-32 | The GraphQL API applies no query-depth or complexity limit and no application-level request rate limit; the only throttles are domain ones (invitation resend and e-mail budget, push, geo lookups) and the identity provider's login-flow limit surfaced as 429. | all | code › `src/app.module.ts:200` (`plugins: [ApmApolloPlugin]` only) · grep for throttle, rate, complexity, depth (domain throttles only) · `src/services/mcp-server/mcp-server.config.ts` · spec › `agents-hq/specs/008-external-mcp-access/spec.md:142-144, 218` | untested (see F6) |
| GQL-33 | Request size is bounded by configuration: JSON bodies up to `hosting.max_json_payload_size` (64 MB default), `/rest/mcp` bodies to 256 kB, and GraphQL multipart uploads to `storage.file.max_file_size` (15 MB default — the same figure the configuration document publishes, CFG-08). | all | code › `src/main.server.ts:193-204` · `src/core/middleware/json-body-parser.middleware.ts:4-24` · `alkemio.yml:53, 358` | untested |
| GQL-34 | The GraphQL schema is a versioned contract: a baseline is regenerated on every merge to develop and breaking changes are detected and gated before release; a behaviour fix that changes no field (such as the `me` degradation) must show zero breaking changes. | server | spec › `server/specs/002-schema-contract-diffing/spec.md`, `server/specs/012-generate-schema-baseline/spec.md`, `107-…/contracts/graphql-me-degradation.md:4-9` · code › `schema.graphql`, `src/schema-contract/` | untested |
| GQL-40 | Every GraphQL error raised by the platform carries `extensions.code` (the string status), `numericCode` (five digits: category 10 not-found / 11 authorization / 12 validation / 13 operations / 14 system / 99 fallback × 1000 + a specific code), `userMessage` (an i18n key), and `errorId` (a UUID for support). | all | code › `src/common/exceptions/base.exception.ts:10-33` · `error.status.metadata.ts:17-22` · `src/common/enums/error.category.ts` · spec › `server/specs/032-error-codes/spec.md` · doc › `docs/error-codes.md` · test › `graphql-guard-authorization` › `Forbidden…` (code); `me-degradation-anonymous` › SRA-N2 (code + message) | proven (code; `numericCode`/`userMessage`/`errorId` are asserted by no case) |
| GQL-41 | Only when the server runs as production is a thrown error reduced to its message, code and errorId; in any other mode the full exception — stack trace, details, the original error for unhandled failures, and for REST the context — is returned in the body. | all | code › `src/core/error-handling/graphql.exception.filter.ts:57-72` · `unhandled.exception.filter.ts:151-187` · `http.exception.filter.ts:245-259` | untested (see F1) |
| GQL-42 | A GraphQL variable that fails coercion is reported as `Invalid value supplied for a GraphQL variable` with only the stable metadata kept; the rejected value is never echoed back to the caller. | all | code › `src/core/error-handling/graphql.error.sanitizer.ts:90-114` · `src/app.module.ts:201` | untested |
| GQL-43 | HTTP status carries only the authentication verdict: unverifiable credentials are a wire-level 401 and a session-store outage a 503; an authorization refusal, a not-found or a validation error ship inside a 200 with the errors envelope. | all | code › `authentication.exception.ts:14-24` · `forbidden.authorization.policy.exception.ts` (no wire status) · `src/common/exceptions/session.store.unavailable.exception.ts` · test › `me-degradation-anonymous` › SRA-N2 (401); client-web `session-revocation-cascade` › SRB-G2 (wire-level 401) | proven (see F10) |
| GQL-44 | An error nobody mapped (a plain `Error`, a library failure) is still answered: code `UNSPECIFIED`, numeric 99999, a fresh errorId; a warning is logged so the gap can be mapped. | all | code › `unhandled.exception.filter.ts:135-187` · `error.status.metadata.ts:24-29, 510` · spec › `032-error-codes/spec.md` US4 | untested |

### B. Rights: evidence

_The evidence line of the former who-may table, with the legend that table used._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `auth.interceptor.ts:142-302`; `graphql.guard.ts:28-57`; `hydra-bearer.validator.ts:55-114`; `non-interactive-login.config.ts:15-51`; `non-interactive-login.controller.ts:53-100`; `rest.guard.ts:87-124`; `app.module.ts:171-198, 208-264`; `main.server.ts:207-213`; matrix › the per-resource tables of `access-matrix.md` decide the privilege cells, not this table. "–" = not applicable to the role. Which roles hold which privilege on which resource is the access matrix's job; this block only says what the gate itself allows.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and its ask. Inside these texts the old spelling "F-3" means F3._

#### Findings

- **F1 — Error bodies leak stack traces and internal paths outside production (GQL-41).** Code: the three global filters return the full exception, stack and details unless `NODE_ENV === 'production'`. Test: none asserts the body is clean. Spec/issue: 032 FR-007 promises only `errorId`; server#6663 observed the leak on **acc** on 2026-10-14 ("any server-side error that flows through the global exception handling exhibits the same leakage"). Ruling: route to server#6663 — never a new issue; decide whether acc/prod run with `NODE_ENV=production` and whether the redaction should be unconditional.
- **F2 — Exception messages embed dynamic data (GQL-13/14).** Code: the FORBIDDEN_POLICY text carries the actor id and the policy id; the space not-found text stringifies the lookup options, which are `undefined` on the `lookup.space` path, so callers read the nonsense `… options 'undefined'`. Test: `Requesting a non-existent space…` pins that exact string; `Forbidden…` pins only the code. House rule (`CLAUDE.md:164-174`): never include dynamic data in messages. Ruling: when the messages are cleaned, rebaseline the one case; treat the red as a text change, not a behaviour change.
- **F3 — Not-found and forbidden are distinguishable on lookup (GQL-14 vs GQL-16).** Code: `lookup.space` loads first (10101 for a nonexistent id) and checks `READ_ABOUT` second (11104 for an existing private L1/L2 the caller may not see), so an anonymous caller can confirm that a UUID is a real, private space. Test: the two negatives assert exactly these two different codes, enshrining the oracle. Spec: 107's design intent (SRA-N2, SRB-N2) is "no existence oracle" at the credential boundary; no spec covers the lookup boundary. Ruling: is the existence of a private space (not its content) considered confidential? If yes, lookups should answer not-found for both; if no, record the rule as accepted.
- **F4 — "Public" and "private" endpoints are one endpoint (GQL-30).** Code: one Apollo module; the ingress strips all three prefixes to `/graphql` with the same middleware chain. Test: the harness reads the public configuration document on the *private non-interactive* path without credentials and the public-path tab in the playground is just a label. Spec: none states a difference; the historic difference was the retired Oathkeeper cookie authenticator on `/api/private/graphql`. Ruling: document the aliases as equivalent (and retire the misleading names in the new core), or make the public path reject credentials / the private path require them.
- **F5 — Introspection is on everywhere, by intent (GQL-31).** Code: `introspection: true` without an environment gate, commit message "so gql schema is visible"; GraphiQL and the playground are served and routed. Test/spec: none for production. Ruling: product/security statement whether production exposes the schema and the GraphiQL page (the schema is public in the repo anyway, so the exposure is the playground, not the SDL).
- **F6 — No depth, complexity or rate limit at the application layer (GQL-32).** Code: `plugins: [ApmApolloPlugin]` only; no throttler; `mcp.rate_limit` configured but unenforced. Spec: 008 relies on "a per-source-IP rate cap at the edge" as a stopgap (#1956). Test: none. Ruling: confirm the edge cap exists on acc/prod (ops, outside the three sources — open question 2) and decide whether the new core's gateway owns depth/complexity limits.
- **F7 — Guard test titles and oracles mislead (GQL-16).** Code/test: "Anonymous user cannot access private space data" and "Non-member cannot access private subspace" — the first asserts that the About *is* readable (`READ_ABOUT`), the second asserts only that *an* error exists (no code). Spec: none. Ruling: rebaseline the titles to the rule ("about only" / "refused with FORBIDDEN_POLICY") and tighten the second assertion to the code; no product decision.
- **F8 — `docs/Guest-Users.md` is stale (GQL-05).** It documents a `whoAmI` query and an `OryStrategy` that no longer exist (`schema.graphql` has no `whoAmI`; the guest resolution lives in `auth.interceptor.ts:296-302`). Ruling: fix the doc; the behaviour stands.
- **F9 — Space `READ_ABOUT` for anonymous on a private L0 is a design, not a leak (GQL-16).** Code: anonymous and registered non-members receive `READ_ABOUT` on a private L0 and nothing on a private L1/L2. Test: pinned in both files. Spec: the space table owns this; recorded here because a reviewer of this area will otherwise read the test title as a failed denial. Ruling: none here — cross-reference to the journey table. **Product, 2026-11-20:** by design; the cross-reference is enough.
- **F10 — Authorization refusals are HTTP 200, authentication refusals 401 (GQL-43).** Code: only `AuthenticationException` sets `extensions.http.status`; the comment in that file says FR-024b wants "authn (401), authz (403) and system (500)" distinguishable on the wire, yet `ForbiddenAuthorizationPolicyException` sets no status, so a FORBIDDEN_POLICY ships as 200 + envelope. Test: the guard test does not assert the status; SRA-N2 asserts 401 for authn only. Spec: the FR-024b spec is not in the local tree (open question 5). Ruling: is 200-with-envelope the intended authz answer (the client relies on it) or should authz be 403 as the comment claims?

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Nothing in this area runs nightly.** `graphql-guard`, `configuration` and `platform` are on-demand vitest projects; the `nightly` project lists 17 other folders (`server-api/vitest.config.ts:188-253`). Every *proven* row above means "green when last run on demand" — when was that, and should these three join the nightly (they need no exclusive stack)?
- **OQ2 — Does an edge rate cap exist on acc and prod?** 008 names it as the stopgap for the unenforced `mcp.rate_limit`; infra-ops was not read. Route to ops.
- **OQ3 — Do acc and prod run with `NODE_ENV=production`?** server#6663's acc evidence shows the non-production branch of the REST filter executing. Route with #6663.
- **OQ4 — Is the Traefik routing read here current?** `dev-orchestration` is a gitignored sibling clone whose branch/SHA was not checked (the memory notes say sibling clones are often stale), and the acc/prod routing lives in infra-ops, not read. Confirm the three aliases still share one chain before signing GQL-30.
- **OQ5 — Where is the OIDC IdP spec?** The code cites FR-023, FR-024b, FR-025 and T042b from PR #6143 (`feat/003-alkemio-oidc-idp`), but the local server `specs/` has no such directory (only `109-…/data-model.md` mentions FR-024b). The why for GQL-01/02/03/08/43 is taken from code comments until that spec is found.
- **OQ6 — Does the client depend on `me.id === 'me-'`?** The 107 contract keeps it as an Apollo cache key by clarification; confirm with client-web before the new core changes the id.
- **OQ7 — Which credentials do the harness `GLOBAL_ADMIN` and `GLOBAL_SUPPORT_ADMIN` personas hold?** The privilege sets pinned by the guard tests (`privileges.ts:850-869`) encode them; the platform-roles table owns the answer.

### D. Test gaps

_For the Quality Lead._

Untested rules by id: GQL-03 (cookie and Hydra bearer paths), GQL-05, GQL-06, GQL-07, GQL-08, GQL-09, GQL-18, GQL-22, GQL-31, GQL-33, GQL-34, GQL-42, GQL-44; plus the untested clauses of GQL-40 (`numericCode`, `userMessage`, `errorId` present) and GQL-43 (FORBIDDEN_POLICY and not-found are HTTP 200; store outage is 503).

Behaviours the area has that neither reading nor tests pinned down:
- A Hydra bearer with a valid signature but an audience outside the allow-list, or without `alkemio_actor_id` → 401 with the specific `error_code` (only garbage and unsigned tokens are exercised).
- A valid bearer for an actor that is not a user (organisation, VC, space) — what `me` and the gate do with it.
- A guest-named request on a resource with a guest policy versus one without (`GLOBAL_GUEST` vs `GLOBAL_ANONYMOUS` outcomes).
- Variable-coercion sanitisation (GQL-42) — a malformed variable must not echo the value.
- An unhandled error's `UNSPECIFIED` + `errorId` shape (GQL-44).
- `AUTHORIZATION_INVALID_POLICY` on an entity whose policy has no rules (GQL-15) — the reset-worker drift case the memory notes describe.
- Subscriptions: a `connectionParams` bearer is ignored; a socket past the absolute ceiling closes (GQL-08).
- Session-store outage 503 on the GraphQL transport (GQL-07) — unit-tested in the server only.
- The non-interactive login refusals (GQL-09): 404 when disabled, 401 `invalid_credentials`, 429.
- Body-size refusals (GQL-33): a document above 64 MB, an MCP body above 256 kB, an upload above the file limit.
- REST guard semantics (GQL-18): 401 vs 403 on the three guarded routes.
- That a field *without* a privilege declaration is served to anonymous (the negative half of GQL-10) — the configuration case proves one instance only.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| GraphQL endpoint on the server | `/graphql` (single Apollo module) | `app.module.ts:158`; `main.server.ts:209` | no | Technical Lead |
| Edge aliases | `/api/public/graphql`, `/api/private/graphql`, `/api/private/non-interactive/graphql`, all stripped to `/graphql`; `/graphiql` | `dev-orchestration/…/server/34,35,36,32-*.yml`; `22-strip-prefix-middleware.yml` | no (F-4) | Technical Lead |
| Harness endpoint | `ALKEMIO_SERVER` → `/api/private/non-interactive/graphql`; `session` → `/api/private/graphql`; `public` → `/api/public/graphql` | `lib/src/config/create-config-using-envvars.ts:14-17`; `lib/src/utils/graphql.actor.ts:33-43` | no | Technical Lead |
| Credential strategy order | `cookie-session`, `non-interactive-login`, `hydra-bearer` | `auth.interceptor.ts:357-362`; `rest.guard.ts:87-91` | no | Security Lead |
| Session cookie | name `alkemio_session`; idle 1,209,600 s (14 d, sliding); absolute 2,592,000 s (30 d) | `alkemio.yml:217-222`; `main.server.ts:94-163` | no | Security Lead |
| Bearer audience allow-list | `alkemio-web,synapse-client,element-client,ecosystem-analytics` (empty list refuses to boot) | `alkemio.yml:212`; `bearer-aud-allow-list.ts` | no | Security Lead |
| Bearer clock tolerance | 30 s | `hydra-bearer.validator.ts:78` | no | Security Lead |
| Required bearer claim | `alkemio_actor_id` (non-empty) | `hydra-bearer.validator.ts:86-103` | no | Security Lead |
| Bearer failure `error_code`s | `malformed_bearer_header`, `invalid_audience`, `invalid_<claim>`, `claim_validation_failed`, `missing_alkemio_actor_id`, … | `hydra-bearer.validator.ts:62-103, 118-140` | no | Security Lead |
| Cookie failure `error_code`s | tombstone reason, `subject_revoked`, `absolute_ttl_exceeded` | `cookie-session.strategy.ts:118-193` | no | Technical Lead |
| Non-interactive login | enabled only when `enabled && NODE_ENV!=='production' && key ≥ 32 bytes`; token TTL 14,400 s; issuer `alkemio-non-interactive-login`; HS256 | `non-interactive-login.config.ts:25-51`; `alkemio.yml:223-226` | no | Security Lead |
| Non-interactive login responses | 201 `{api_token, expires_at, token_type: "Bearer"}`; 404 disabled; 400 `invalid_request`; 401 `invalid_credentials`; 422 `actor_id_missing`; 429 `rate_limited`; 503 `kratos_unavailable` | `non-interactive-login.controller.ts:34-100` | no | Security Lead |
| Auth entry points let through on a rejected session | `/api/auth/oidc/login`, `/callback`, `/logout`, `/app-handoff` (exact paths) | `auth.interceptor.ts:88-100` | no | Security Lead |
| Guest header | `x-guest-name` (base64/UTF-8 first, raw ASCII fallback) | `src/core/authentication/constants.ts`; `guest-name.resolver.ts` | no | Technical Lead |
| Anonymous actor | `actorID = ''`, credential `GLOBAL_ANONYMOUS`; guest → `GLOBAL_GUEST` | `actor.context.service.ts:26-47` | no | Technical Lead |
| `me.id` for no account | `me-` | `me.resolver.fields.ts:112`; 107 contract | no | Technical Lead |
| Degraded `me` values | counts 0, lists `[]`, `user` null, notifications `{total 0, items [], hasNextPage false, hasPreviousPage false, cursors null}` | `me.resolver.fields.ts`; 107 FR-029a | no | Technical Lead |
| Field-gate marker | `@AuthorizationActorHasPrivilege(<privilege>)` + `@UseGuards(GraphqlGuard)`; 96 fields in 30 resolvers | grep | no | Technical Lead |
| Refusal text | `Authorization: unable to grant '<privilege>' privilege: <Parent>.<field> user: <actorID> on authorization <policyId> of type '<type>'` | `authorization.service.ts:44` | no (F-2) | Technical Lead |
| Not-found text (space) | `Unable to find Space using options 'undefined'` | `space.service.ts:858`; test pins it | no (F-2) | Technical Lead |
| Authentication refusal | message `unauthenticated`, code `UNAUTHENTICATED`, HTTP 401, `data: null`, `extensions.error_code` | `auth.interceptor.ts:237-242`; `authentication.exception.ts` | no | Technical Lead |
| Store-outage refusal | HTTP 503 + `Retry-After`, code `SESSION_STORE_UNAVAILABLE` (14119) | `auth.interceptor.ts:265-277`; 109 FR-017/018 | no | Technical Lead |
| Error codes used here | `UNAUTHENTICATED` 11101 · `FORBIDDEN` 11103 · `FORBIDDEN_POLICY` 11104 · `AUTHORIZATION_INVALID_POLICY` 11106 · `API_RESTRICTED_ACCESS` 11110 · `ENTITY_NOT_FOUND` 10101 · `BAD_USER_INPUT` 12101 · `SESSION_STORE_UNAVAILABLE` 14119 · `UNSPECIFIED` 99999 | `error.status.metadata.ts`; `docs/error-codes.md` | no | Technical Lead |
| Error categories | 10 not-found · 11 authorization · 12 validation · 13 operations · 14 system · 99 fallback | `src/common/enums/error.category.ts` | no | Technical Lead |
| Error extensions | `code`, `numericCode`, `userMessage`, `errorId`, `details` (+ `http.status`, `error_code` on authentication) | `base.exception.ts:22-30`; `authentication.exception.ts` | no | Technical Lead |
| Production redaction | `NODE_ENV === 'production'` → `{message, errorId, code}` (+ form reason code); otherwise full exception | `graphql.exception.filter.ts:57-72` | no (F-1) | Security Lead |
| Coercion sanitiser | message `Invalid value supplied for a GraphQL variable`; kept keys `code, numericCode, userMessage, errorId` | `graphql.error.sanitizer.ts:77-114` | no | Security Lead |
| Unhandled error | `UNSPECIFIED` 99999 + `errorId`; REST 500 JSON | `unhandled.exception.filter.ts` | no | Technical Lead |
| Introspection / playground / persisted queries | `introspection: true`; playground tabs Me, Spaces (private) · Configuration, Server Metadata (public); `persistedQueries: false`; `cors: false` (edge) | `app.module.ts:167-203` | no (F-5) | Security Lead |
| Depth / complexity / rate limit | none at the application layer | `app.module.ts:200`; grep | no (F-6) | Security Lead |
| JSON body limit | `hosting.max_json_payload_size` = `64mb`; `/rest/mcp` 256 kB | `alkemio.yml:53`; `json-body-parser.middleware.ts` | no | Technical Lead |
| Upload limit | `storage.file.max_file_size` = 15,728,640 (15 MB) | `alkemio.yml:354-358`; `main.server.ts:193-199` | no (CFG F-1) | Technical Lead |
| Subscription close | `CloseCode.Unauthorized`, reason `Session expired`, on `absoluteExpiry < now` | `app.module.ts:250-263` | no | Technical Lead |
| Guarded REST routes | `rest/calendar`, `rest/content-signing`, `rest/memo` (RestGuard); `/rest/mcp` (McpAuthGuard); `/rest/internal*`, `health`, `api/auth*` unguarded by a caller guard | grep `@Controller(`, `RestGuard` | no | Security Lead |
| House rule | no dynamic data (IDs, e-mails) in exception messages | `CLAUDE.md:164-174` | no (F-2) | Security Lead |

### F. Where this lands in the new core

The rebuild keeps one GraphQL contract (`schema.graphql`, 002/012) and resolves authorization at read time from the capability ledger instead of stored per-entity policies, so GQL-10/11/12/16/17 survive as behaviours (per-field privilege, one caller per request, `myPrivileges` as the client's oracle, visibility by privacy mode) while the *mechanism* — the stored policy the guard reads, the reset mutations, the "no credential rules" failure in GQL-15 — disappears. Three facts here should shape the core: (1) authentication must keep its three wire states — absent → anonymous, invalid → 401, valid → actor — and the no-oracle property of GQL-04/20 (a deleted account and no credentials look the same); (2) the error contract (GQL-40: `code`, `numericCode`, `userMessage`, `errorId`) is what the client and the support desk already consume, so it is a rebaseline row, not a design choice, and the production-only redaction of GQL-41 must become unconditional (F-1); (3) the endpoint split (GQL-30) and introspection/limits (GQL-31/32) are deployment facts that the new core's API gateway must decide explicitly rather than inherit. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/graphql-guard/`, 4 files, 45 cases); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The area covers who the caller is, the field-level gate, the `me` degradation, the endpoints and limits, and the error shape; the privilege sets per role belong to the access matrix and the platform-roles table and are only cross-referenced here.

2026-11-19 converted to the three-section layout. The status legend of the old layout was dropped: proof is now in Appendix A, and open points are markers on the rules.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue, pull request or code comment states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/app.module.ts`; `src/main.server.ts`; `src/core/middleware/json-body-parser.middleware.ts`
- `src/core/interceptors/auth.interceptor.ts`; `src/core/authorization/graphql.guard.ts`, `rest.guard.ts`, `authorization.service.ts`
- `src/core/auth/oidc/strategies/hydra-bearer.strategy.ts`, `hydra-bearer.validator.ts`, `cookie-session.strategy.ts`, `strategy.names.ts`; `src/core/auth/oidc/bearer-aud-allow-list.ts`
- `src/core/auth/non-interactive-login/non-interactive-login.config.ts`, `.strategy.ts`, `.controller.ts`, `.service.ts`
- `src/core/authentication/authentication.service.ts`, `guest-name.resolver.ts`, `constants.ts`; `src/core/actor-context/actor.context.service.ts`, `is.anonymous.actor.ts`
- `src/core/error-handling/graphql.exception.filter.ts`, `graphql.error.sanitizer.ts`, `unhandled.exception.filter.ts`, `http.exception.filter.ts`, `rest.error.response.ts`
- `src/common/exceptions/base.exception.ts`, `authentication.exception.ts`, `forbidden.authorization.policy.exception.ts`, `error.status.metadata.ts`; `src/common/enums/alkemio.error.status.ts`, `error.category.ts`
- `src/common/pipes/validation.pipe.ts`; `src/core/validation/*`
- `src/services/api/me/me.resolver.queries.ts`, `me.resolver.fields.ts`, `me.conversations.resolver.fields.ts`; `src/services/api/lookup/lookup.resolver.fields.ts`
- `src/domain/space/space/space.service.ts`, `space.service.authorization.ts`, `space.resolver.queries.ts`
- `src/services/mcp-server/mcp-server.controller.ts`, `auth/mcp-auth.guard.ts`, `mcp-server.config.ts`
- `alkemio.yml` (hosting, security, identity, storage); `schema.graphql`; `CLAUDE.md` (exception rule); `docs/Guest-Users.md`, `docs/error-codes.md`, `docs/credential-based-authorization.md`
- git: `36e2f3bfb` (#5848), `d34d0b1ca`, `673e22654`, `a0cc3a817` (#6399), `9b6a81eeb` (#6143), `8a15aee5b` (#6324), `1a1b29904` (#6333)

Edge (sibling clone `dev-orchestration`, staleness unverified):
- `01-alkemio-platform/base/alkemio/collaboration-platform/backend/server/32,34,35,36-*-ingress-route.yml`; `base/alkemio/networking/traefik/22-strip-prefix-middleware.yml`; `overlays/sandbox/third-party/identity/ory/02-overlay-oathkeeper-values.yml`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/graphql-guard/graphql-guard-authorization.it-spec.ts`, `graphql-guard-public-private-access.it-spec.ts`, `graphql-guard-nested-queries.it-spec.ts`, `me-degradation-anonymous.it-spec.ts`, `me-degradation.request.params.ts`
- `lib/src/common/constants/privileges.ts`; `lib/src/utils/graphql.wrapper.ts`, `graphql.actor.ts`; `lib/src/config/create-config-using-envvars.ts`; `server-api/vitest.config.ts`
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ platform, § space), `access-matrix-crosscheck.md`
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- server `specs/107-oidc-session-revocation/spec.md` + `contracts/graphql-me-degradation.md`; `specs/109-redis-session-store-resilience/spec.md`; `specs/032-error-codes/spec.md`; `specs/002-schema-contract-diffing/spec.md`; `specs/012-generate-schema-baseline/spec.md`; `specs/108-redis-outage-resilience/spec.md` (checked; the GraphQL arm is in 109)
- agents-hq `specs/008-external-mcp-access/spec.md` (edge rate cap); `specs/038-mcp-api-key-management/spec.md` (FR-015); `specs/007-connection-resilience/spec.md` and `specs/033-client-runtime-hardening/spec.md` (checked, not about the gate)
- alkem-io/server#6663 (stack-trace leak — route here), #6315 (orphaned sessions / `me` degradation), #6332 (store outage), PR #5848, PR #6143, PR #6399
