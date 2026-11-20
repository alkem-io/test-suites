# Platform configuration: behaviour rules

_What the platform does today for the public configuration document that the web client reads when it starts: feature switches, locations, monitoring addresses, the upload limit, languages, the sign-in provider and the limits for images and videos: what it does, why, who may, and what is still to answer. The layout is the three-section one of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 1 · Technical Lead 4 · Quality Lead 7 · Service Operations Lead 1 · Architecture Lead 1. By state: 7 open · 7 with a suggested answer. Proof of the 13 rules: 6 proven by a test · 7 untested (Appendix A)._

_Whys of the 13 rules: 10 rest on a source · 1 carries a draft for product to decide (CFG-02) · 2 have none, and each already carries an open question (CFG-04: Q-CFG-04; CFG-10: F7)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit, a pull request or an issue. "Not decided: exists in the code" means the behaviour is in the code and nobody chose it in a source we could find.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule; **Decided by** then keeps the trail.
- Most rules here carry **(open: F3)**. F3 is one question about the single test that covers CFG-01 to CFG-10; it is not a doubt about the rule itself.

## 1. Rules

### The document

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CFG-01 | Anyone can read the platform configuration, signed in or not, and everyone gets the same complete document. **(open: F3)** | — | — | "Provides configuration to external services in the Alkemio ecosystem" (schema description): the client and other services need it before anyone is signed in. | Not decided: exists in the code |
| CFG-02 | The document is put together on every request from the server's deployment settings. It is not stored and nothing in the API can change it; only a change of the settings and a restart does. **(open: F3)** | — | — | Deployment-owned settings published to clients; the same keys drive the server itself. _(draft)_ | Not decided: exists in the code |
| CFG-03 | The document lists exactly eight feature switches, always in the same order. On a standard installation all are on except the landing page. **(open: F3, F6)** | — | — | Client-side feature switches driven by the deployment (the flag list was introduced with the licence/feature-flag module, #3351). | Server PR #3351 |
| CFG-04 | The published switches are advice for the web client: the server never reads the list back, and each switch may or may not also change what the server itself does. **(open: Q-CFG-04, F3)** | — | — | — | Not decided: exists in the code |
| CFG-05 | The document carries 24 locations: the domain, the environment name, the documentation address and 21 outside links such as terms, privacy, support and help. None of them is ever empty. **(open: F3)** | Legal, help and marketing links the client renders are owned by the deployment, not the client build (`alkemio.yml:705` "legal / usability aspects of the platform"). | — | — | Not decided: exists in the code |
| CFG-06 | The document tells the web client whether error and performance monitoring are on and where to send the data. Where no address is set, the field reads "0". **(defect in part: F5)** **(open: F3)** | — | — | Client monitoring is switched on per deployment (`alkemio.yml:316-334`); the `"0"` is a loader artefact — an unset string setting becomes the number 0 (F-5). | Not decided: exists in the code |
| CFG-07 | The document says whether finding a location from an IP address is switched on, and which address the client calls for it. **(open: F3)** | — | — | The web client labels its performance monitoring with the user's rough location (client-web `src/core/analytics/apm/useApmInit.ts:111`, `src/core/analytics/geo/useUserGeo.ts`); the switch lets a deployment without the lookup service leave it out (`alkemio.yml:477-481`). | Not decided: exists in the code |
| CFG-08 | The document publishes the largest file the server accepts: 15 MB by default. The same figure guards uploads and is the starting limit of every storage area. **(open: F1, F3)** | — | — | One limit, three places: the published value lets the client refuse before uploading; the middleware guard and the bucket default must stay equal or a larger file is buffered and then refused (`alkemio.yml:354-358`; lowered from 20 MB in #6196). | Server #6196 |
| CFG-09 | The document publishes the languages the platform offers to people by itself and the default language, which falls back to English when the configured default is not supported. **(open: F3)** | — | — | 029 detect-signup-language: every other language rule derives from this set (`language.request.params.ts:139`). | Spec 029 |
| CFG-10 | The document lists exactly one sign-in provider, Ory Kratos, with its public address. **(open: F7, F3)** | — | — | — (the block predates the OIDC/BFF sign-in; whether the client still reads it is F-7). | Not decided: exists in the code |

### Image and video limits

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CFG-11 | The document publishes the limits for a banner image: 1200 to 3840 wide, 120 to 640 high, a default shape of 10:1 that can be adjusted down to 6:1, and nine image types. **(open: F2)** | — | — | The client's crop dialog clamps against this contract (client-web#10178 / #10222); 1200 px floor from #6439; 10:1 default from #6452 — "narrowing them to one ratio would reject legitimate uploads at another" (`visual.constraints.ts:26-37`). | client-web#10178, #10222; server #6439, #6452 |
| CFG-12 | The other six image and video types each have one fixed shape: avatar square, 190 to 410; card 307–410 by 192–256; whiteboard preview 500–1800 by 200–720; wide banner 640–2560 by 64–256; gallery images and videos 1 to 8000 either way. | — | — | "`aspectRatio` is the DEFAULT shape … for every type except BANNER they equal `aspectRatio`, i.e. the shape is fixed" (`visual.constraints.ts:26-30`). | Not decided: exists in the code |
| CFG-13 | The published limits are the ones the server enforces when an image is uploaded. Each stored image keeps its own copy of the limits, so a changed limit reaches existing images only through a migration. | — | — | #6439 lowered the floor and migrated every existing banner row (space-banner plan R2). | Server #6439 |

## 2. Rights

_Y = may · N = refused. The condition is a footnote under the table. Row ids W1–W3 follow the order of the former who-may table. Nothing here depends on who asks: the document has no access rule at all. Product has not reviewed these cells yet. Evidence is in Appendix B._

### The configuration document

| ID | Action | Platform roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Read the platform configuration (switches, locations, monitoring, location lookup, storage, language, sign-in providers) | Y | Y | Y | Y | Y | Y | Y |
| W2 | Read the image and video limits for any of the seven types | Y | Y | Y | Y | Y | Y | Y |
| W3 | Change any value of the document through the API | N¹ | N | N | N | N | N | N |

¹ No such action exists: the values change only through the deployment settings and a restart.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 12 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and security values) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 4 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Document | defect | A monitoring address that is not set is published as "0", and the case pins that. A client that treats "0" as an address would try to reach it. | Technical Lead | Publish an empty value (or allow the field to be empty) and rebaseline the case. | suggested |
| F7 | Document | check | The sign-in provider block still describes Ory Kratos and was not changed by the newer sign-in work (server PR #6143). Does the web client still read it at start-up, or is the block dead? Decide before the new core carries it over. | Technical Lead, then Architecture Lead | — | open |
| OQ2 | Document | check | What does the web client read from this document at start-up, and does it hard-code any of it? Client code was not checked. The answer decides F6 and F7. | Technical Lead | — | open |
| Q-CFG-04 | Document | decision | Why does this rule exist? No source says why the switches are only advice for the client, or which of them should also change what the server does. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Document | test | The configuration case expects an upload limit of 20 MB; the server has published 15 MB since server#6196. The case is stale. Does the web client read the published value, or does it hard-code 20 MB? | Quality Lead (Technical Lead confirms what the web client reads) | Rebaseline the case to 15 MB. | suggested |
| F6 | Document | contract | One of the eight public switch names is misspelt (`GUIDENCE_ENGINE`). Keep it as it is, because renaming breaks the published schema, or add the right name and retire the old one? | Architecture Lead (Technical Lead makes the schema change) | — | open |
| CONST | All | decision | 12 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and security values) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 7 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Document | test | The configuration case expects an upload limit of 20 MB; the server has published 15 MB since server#6196. The case is stale. Does the web client read the published value, or does it hard-code 20 MB? | Quality Lead (Technical Lead confirms what the web client reads) | Rebaseline the case to 15 MB. | suggested |
| F2 | Limits | test | The banner case expects a default shape of 6:1; the server has published 10:1 since server#6452, so the case should be red on Release 79. | Quality Lead | Rebaseline to 10 after a live run confirms. | suggested |
| F3 | Document | test | The one configuration case can only pass on a local stack, because it compares against local values, and it is marked to run alone, so any other case added to its file is skipped without notice. It is not in the nightly. | Quality Lead | Split it into checks of the shape (keys present, switches in order, types) and a check of the values read from the environment; stop running it alone; add the project to the nightly. | suggested |
| F4 | Document | test | The "full configuration" comparison is a hand-written part of the document: it leaves out the language block, the documentation address, the monitoring environment, the location switch and the image limits, so a change to any of those goes unseen. | Quality Lead | Regenerate the selection from the schema, so the comparison covers the whole document. | suggested |
| OQ1 | Document | test | When did the configuration project last run green, and where? It is not in the nightly, the one case fits only a local stack (F3), and the banner case must be red since server#6452 (F2). | Quality Lead | A live run on the local stack settles both. | suggested |
| OQ4 | Document | tidy-up | Is the second library query for the configuration used anywhere? Only two queries have callers. | Quality Lead | If it is dead, retire it with the W2 library boundary work. | suggested |
| GAPS | All | test | 4 rules have no test here, parts of 4 more are not checked, and 6 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 12 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and security values) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Document | check | Are the deployment settings read for this file current? The test-cluster values come from a local copy whose version was not checked; the acceptance and production values were not read. | Service Operations Lead | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Document | contract | One of the eight public switch names is misspelt (`GUIDENCE_ENGINE`). Keep it as it is, because renaming breaks the published schema, or add the right name and retire the old one? | Architecture Lead (Technical Lead makes the schema change) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Document | check | The sign-in provider block still describes Ory Kratos and was not changed by the newer sign-in work (server PR #6143). Does the web client still read it at start-up, or is the block dead? Decide before the new core carries it over. | Technical Lead, then Architecture Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `client ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| CFG-01 | The configuration document is readable by anyone — a visitor with no credentials gets the same complete document as a signed-in user; nothing in it depends on who asks. | anonymous, registered | code › `src/platform/platform/platform.resolver.fields.ts:89-96` (no guard) · `schema.graphql:2820-2821` · test › `configuration` › `Full configuration defaults to be same as the one on alkemio.yml` (no Authorization header) | proven |
| CFG-02 | The document is assembled on every request from the server's deployment configuration (`alkemio.yml` with environment substitution); it is not stored and no API call can change it — only a configuration change and restart does. | server, operators | code › `src/platform/configuration/config/config.service.ts:19-176` · `src/config/configuration.ts:7-19` | untested |
| CFG-03 | `featureFlags` lists exactly eight flags, always in this order, each the value of one deployment key: COMMUNICATIONS, COMMUNICATIONS_DISCUSSIONS, SUBSCRIPTIONS, NOTIFICATIONS, WHITEBOARDS, MEMO, LANDING_PAGE, GUIDENCE_ENGINE; on an out-of-the-box server all are on except LANDING_PAGE. | anonymous, registered | code › `config.service.ts:72-122` · `src/common/enums/platform.feature.flag.name.ts` · `alkemio.yml:46, 340, 346, 508, 646, 649, 779, 783` · test › `configuration` › the one case (all eight, in order, local defaults) | proven |
| CFG-04 | The published flag list is advisory for the client: the server never reads it back, and whether the underlying key also gates server behaviour is decided key by key (the communications key, for one, has no other reader). | server | code › grep `featureFlags` / `communications.enabled` (no consumer outside `config.service.ts`) | untested |
| CFG-05 | `locations` carries 24 entries: `domain` (the hostname of the cluster endpoint), `environment` (the deployment's environment name), `documentation` (`https://<domain>` + the documentation path) and 21 outbound URLs (terms, privacy, security, support, feedback, forumreleases, about, landing, blog, impact, inspiration, innovationLibrary, foundation, contactsupport, switchplan, opensource, releases, help, community, newuser, tips, aup); every one is a non-null string. | anonymous, registered | code › `config.service.ts:20-29, 123-151` · `alkemio.yml:706-770` · `schema.graphql:5929-5960` · test › `configuration` › the one case (23 of 24; `documentation` not selected) | proven |
| CFG-06 | `sentry` publishes {enabled, endpoint, submitPII, environment} and `apm` {rumEnabled, endpoint} for client-side monitoring; where a deployment sets no endpoint the field reads `"0"`. | anonymous, registered | code › `config.service.ts:152-161` · `src/config/configuration.ts:34-50` · test › `configuration` › the one case (`endpoint: '0'` for both, `enabled false`, `submitPII false`, `rumEnabled false`) | proven (F5) |
| CFG-07 | `geo` publishes whether the IP-geolocation integration is on and the REST endpoint the client should call for it. | anonymous, registered | code › `config.service.ts:162-165` · test › `configuration` › the one case (endpoint only) | proven |
| CFG-08 | `storage.file.maxFileSize` publishes the server's upload ceiling in bytes — 15 MB (15,728,640) by default — the same figure that guards GraphQL uploads and that every storage bucket is seeded with. | anonymous, registered | code › `config.service.ts:166-170` · `alkemio.yml:354-358` · `src/main.server.ts:193-199` · test › `configuration` › the one case pins **20,971,520** | untested (see F1: the case pins the old 20 MB) |
| CFG-09 | `language` publishes the eligible languages the platform proactively offers (a subset of the supported interface languages, invalid entries dropped with a warning; empty = no proactive offers) and the platform default (falls back to `en` when the configured default is unsupported). | anonymous, registered | code › `config.service.ts:40-66, 171-174` · `alkemio.yml:701-703` · `schema.graphql:4107-4112` · spec › `agents-hq/specs/029-detect-signup-language/spec.md` | untested (covered elsewhere: `language/user-language-settings` › `the platform default language is configured`; `language/invitation-language-seeding` › `platform advertises an eligible language set and a default`) |
| CFG-10 | `authentication.providers` lists exactly one provider, "Ory Kratos Config", enabled, with no icon, whose config carries the Kratos public base URL and the issuer. | anonymous, registered | code › `config.service.ts:178-201` · `alkemio.yml:125-128` · `schema.graphql:1943-1952, 5655` · test › `configuration` › the one case | proven (F7) |
| CFG-11 | `defaultVisualTypeConstraints(BANNER)` publishes the banner's upload and crop envelope: width 1200–3840, height 120–640, default aspect ratio 10 (the slim strip), adjustable between 6 (the historic shape) and 10; the height bounds span the whole ratio range (`minHeight = ceil(minWidth / maxAspectRatio)`, `maxHeight = maxWidth / minAspectRatio`); allowed types are the nine image types. | anonymous, registered, space admin (uploads) | code › `src/platform/configuration/config/config.resolver.fields.ts:11-19` · `src/domain/common/visual/visual.constraints.ts:26-58` · test › `banner-visual-constraints` › TC-03 (pins **aspectRatio 6**) · plan › client-web `space-banner/space-banner-test-plan.md:49-65` | untested (see F2: the case pins the old ratio 6) |
| CFG-12 | The other six visual types have a fixed shape (min = max = default aspect ratio): AVATAR 190–410 square (1); CARD 307–410 × 192–256 (1.6); WHITEBOARD_PREVIEW 500–1800 × 200–720 (2.5); BANNER_WIDE 640–2560 × 64–256 (10); MEDIA_GALLERY_IMAGE and MEDIA_GALLERY_VIDEO 1–8000 either way, ratio 0.01–100, the video type with its own four video mime types. | anonymous, registered | code › `visual.constraints.ts:4-21, 38-109` · `src/common/enums/visual.type.ts:5-13` | untested |
| CFG-13 | The published table is the same one the server enforces when a visual is uploaded, and each stored visual carries its own copy of its type's bounds (so a lowered floor needs a migration to reach existing visuals). | space admin (uploads) | code › `visual.constraints.ts:23-24` ("Keep in sync with client-web …") · plan › `space-banner-test-plan.md:41, 83` | untested (covered elsewhere: `visual/space-banner-constraints` › TC-01/TC-02 — visual area) |

### B. Rights: evidence

_The legend and the evidence line of the former who-may table, as they were. The shorthands in the legend are those of the evidence line; section 2 spells the roles out._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `platform.resolver.fields.ts:89-96` and `config.resolver.fields.ts:11-19` carry no privilege decorator and no `grantAccessOrFail`; `schema.graphql` has no mutation touching `Config`; the legacy case reads the document with no Authorization header. The access matrix has no `configuration` resource (there is no policy to map); the `platform` row's `read` cells do not apply because the field is not gated.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and the ruling it asks for._

#### Findings

- **F1 — Upload ceiling 20 MB in the test, 15 MB in the code (CFG-08).** Code: `max_file_size` default 15,728,640 since #6196 (`49f96273e`), with the comment that it must equal the bucket default and the middleware guard. Test: the single configuration case pins `maxFileSize: 20971520` (the pre-#6196 value, `26edac549`). Spec: none. No `STORAGE_MAX_FILE_SIZE` override found in the base or test deployment config. Ruling: the test is stale — rebaseline to 15 MB (and confirm that the client's pre-upload check reads this value rather than hard-coding 20 MB).
- **F2 — Banner default aspect ratio 6 in the test, 10 in the code (CFG-11).** Code: `aspectRatio: 10` since `5971a138f` (#6452, 2026-09-02, "make 10:1 the banner default … (was 6)"). Test: TC-03 (`d6dd066c8`, #625, same day, titled "coverage for default 10:1 banner") asserts `aspectRatio: 6` and spells "1200/120/6/6/10" in its title. Spec: client-web#10178 wants the 10:1 default. Ruling: the test pins the pre-#6452 value and should be red on Release/79 — rebaseline to 10 after a live run confirms.
- **F3 — The configuration case can only be green on a local stack, and it hides any sibling (CFG-01…10).** Test: `test.only` on the one case (every other test added to that file would be silently skipped — the banner test was put in a new file for exactly that reason), and `toStrictEqual` against local-stack literals (`domain 'localhost'`, `environment 'local'`, `issuer 'http://alkemio-server-dev/'`, local Kratos URL, `'0'` endpoints). Code/deployment: the test cluster serves `ENVIRONMENT: test` and its own hostnames. Ruling: split the case into shape assertions (keys present, flags in order, types) and a constants probe that reads the expected values from the environment, drop `test.only`, and put the project on the nightly.
- **F4 — The "full configuration" strict-equal is a hand-written subset.** Test: `full-configuration.graphql` omits `language`, `locations.documentation`, `sentry.environment`, `geo.enabled` and `defaultVisualTypeConstraints`, so a change to any of those is invisible; the client-web banner plan already flags the case as "not evidence". Ruling: regenerate the selection from the schema (the lib's codegen) so the oracle covers the whole document.
- **F5 — An unset string setting is published as `"0"` (CFG-06).** Code: the YAML loader converts any value that passes `!isNaN()` to a number, and an unset variable with no default is the empty string, which `Number('')` turns into `0`; the `String!` field then serialises `"0"`. Test: pins `endpoint: '0'` for sentry and apm, enshrining the artefact. Spec: none. Ruling: publish `""` (or make the fields nullable) and rebaseline — a client that treats `"0"` as an endpoint would try to reach it.
- **F6 — `GUIDENCE_ENGINE` is a public enum name with a typo.** Code: `PlatformFeatureFlagName.GUIDENCE_ENGINE = 'guidance-engine'` since #3351; the schema exposes the misspelt name. Test: pins it. Ruling: keep (renaming is a breaking schema change under 002) or deprecate-and-add under the schema-contract rules.
- **F7 — The authentication-provider block still describes Ory Kratos (CFG-10).** Code: one hard-coded provider "Ory Kratos Config" with `kratosPublicBaseURL` and an `issuer` defaulting to `http://alkemio-server-dev/`, unchanged by the OIDC/BFF sign-in work (PR #6143). Test: pins it. Spec: the OIDC spec is not in the local tree (graphql-guard open question 5). Ruling: does client-web still read `kratosPublicBaseURL` at boot (self-service flows: recovery, verification, settings) or is the block dead? Decide before the new core carries it.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — When did the configuration project last run green, and where?** It is not in the nightly (`server-api/vitest.config.ts:65-67, 193-253`), and the single case's literals fit only a local stack (F-3); the banner case must be red since #6452 (F-2). A live run on the local stack settles both.
- **OQ2 — What does the client read at boot?** Whether client-web consumes `featureFlags`, `locations`, `sentry`/`apm`, `authentication.providers` and `storage.file.maxFileSize` (and hard-codes any of them) was not checked — client code is outside the three sources. Route to the client-web owner; it decides F-6 and F-7.
- **OQ3 — Is the deployment config read here current?** The flag and endpoint values for the test cluster come from the gitignored `dev-orchestration` clone (branch/SHA unchecked); acc/prod values live in infra-ops, not read.
- **OQ4 — Is the second lib query (`queries/configuration/configuration.graphql`) used anywhere?** Only `full-configuration` and `banner-visual-constraints` have callers; if it is dead, retire it with the W2 lib boundary work.

### D. Test gaps

_For the Quality Lead._

Untested rules by id: CFG-02, CFG-09 (covered by the language area), CFG-12, CFG-13 (covered by the visual area); plus the unasserted parts of CFG-05 (`documentation`), CFG-06 (`sentry.environment`), CFG-07 (`geo.enabled`) and CFG-11 (`allowedTypes` beyond png/jpeg).

Behaviours the area has that neither reading nor tests pinned down:
- A flag flipped in the deployment is reflected on the next request after restart (CFG-02) — no case flips one.
- `defaultVisualTypeConstraints` for the six fixed-shape types (CFG-12) and the invariant `maxHeight = maxWidth / minAspectRatio` for BANNER.
- The `language` block's warning-and-drop behaviour for an unsupported eligible entry and the `en` fallback (CFG-09) — the language suite reads the values but does not provoke an invalid configuration.
- The document on a deployment with Sentry/APM enabled (real endpoints, `submitPII` true).
- That the published upload ceiling equals the enforced one (CFG-08 / GQL-33): upload a file just over the published value and expect the refusal.
- `documentation` URL composition when `endpoint_cluster` carries a port (`https://localhost` vs `http://localhost:3000`).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, limits a user notices and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for access and security values. The "product must rule?" column is unchanged: the reviewer ticks the rows product must rule on._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Feature flags (8, in order) | `COMMUNICATIONS`, `COMMUNICATIONS_DISCUSSIONS`, `SUBSCRIPTIONS`, `NOTIFICATIONS`, `WHITEBOARDS`, `MEMO`, `LANDING_PAGE`, `GUIDENCE_ENGINE` (wire `communications`, `communications-discussions`, `subscriptions`, `notifications`, `whiteboards`, `memo`, `landing-page`, `guidance-engine`) | `platform.feature.flag.name.ts`; `config.service.ts:72-122` | F-6 | Technical Lead |
| Flag → deployment key and default | `communications.enabled` true · `communications.discussions.enabled` true · `hosting.subscriptions.enabled` true · `notifications.enabled` true · `collaboration.whiteboards.enabled` true · `collaboration.memo.enabled` true · `platform.landing_page.enabled` false (k8s base `"true"`, test overlay `"false"`) · `platform.guidance_engine.enabled` true | `alkemio.yml`; `dev-orchestration/…/01-configMap-base.yml:16`, `overlays/test/…/01-configMap-overlay.yml:17` |  | Technical Lead |
| Locations (24 keys) | `domain`, `environment`, `documentation`, `terms`, `privacy`, `security`, `support`, `feedback`, `forumreleases`, `about`, `landing`, `blog`, `impact`, `inspiration`, `innovationLibrary`, `foundation`, `contactsupport`, `switchplan`, `opensource`, `releases`, `help`, `community`, `newuser`, `tips`, `aup` | `schema.graphql:5929-5960`; `config.service.ts:123-151` |  | Technical Lead |
| Location defaults | `welcome.alkem.io` (terms, privacy, security, support, feedback, about, landing, inspiration, contactsupport, switchplan, newuser, tips, aup), `alkem.io` (forumreleases, innovationLibrary, releases, help, community), `blog.alkem.io`, `alkemio.org` (impact, foundation), `github.com/alkem-io/`; `environment` `local`; `documentation_path` `/documentation` | `alkemio.yml:706-770`; test pins all 23 selected |  | Product Lead |
| Sentry / APM defaults | enabled false, submit_pii false, environment `development`, endpoints unset → `"0"`; rumEnabled false | `alkemio.yml:316-334`; `configuration.ts:34-50` | F-5 | Security Lead |
| Geo | enabled false; endpoint `<cluster>/api/public/rest/geo` | `alkemio.yml:477-481` |  | Technical Lead |
| Upload ceiling | `storage.file.max_file_size` 15,728,640 (15 MB); was 20,971,520 (20 MB) until #6196; the test pins 20 MB | `alkemio.yml:354-358`; `49f96273e` | F-1 | Product Lead |
| Language | eligible `nl`; default `en`; invalid entries dropped with a warning; unsupported default → `en` | `alkemio.yml:701-703`; `config.service.ts:40-66` |  | Product Lead |
| Authentication provider | one entry: name/label `Ory Kratos Config`, icon `''`, enabled true, `issuer` `http://alkemio-server-dev/`, `kratosPublicBaseURL` `<cluster>/ory/kratos/public` | `config.service.ts:178-201`; `alkemio.yml:125-128` | F-7 | Security Lead |
| Visual types (7) | `AVATAR`, `BANNER`, `WHITEBOARD_PREVIEW`, `CARD`, `BANNER_WIDE`, `MEDIA_GALLERY_IMAGE`, `MEDIA_GALLERY_VIDEO` (wire camelCase) | `visual.type.ts:5-13` |  | Technical Lead |
| BANNER constraints | 1200–3840 × 120–640; aspect 10, min 6, max 10 | `visual.constraints.ts:49-58`; #6439, #6452 | F-2 | Product Lead |
| AVATAR / CARD / WHITEBOARD_PREVIEW / BANNER_WIDE | 190–410 × 190–410, 1 · 307–410 × 192–256, 1.6 · 500–1800 × 200–720, 2.5 · 640–2560 × 64–256, 10 | `visual.constraints.ts:39-88` |  | Product Lead |
| MEDIA_GALLERY_IMAGE / _VIDEO | 1–8000 × 1–8000; aspect 1, min 0.01, max 100 | `visual.constraints.ts:89-108` |  | Product Lead |
| Allowed image types (9) | `image/png`, `image/jpeg`, `image/jpg`, `image/svg+xml`, `image/webp`, `image/gif`, `image/avif`, `image/heic`, `image/heif` | `visual.constraints.ts:4-14` |  | Product Lead |
| Allowed video types (4) | `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime` | `visual.constraints.ts:16-21` |  | Product Lead |
| Height-bound invariant (BANNER) | `minHeight = ceil(minWidth / maxAspectRatio)`; `maxHeight = maxWidth / minAspectRatio` | `visual.constraints.ts:33-37`; test TC-03 asserts the first |  | Technical Lead |
| GraphQL surface | `Platform.configuration: Config!`; `Config {apm, authentication, defaultVisualTypeConstraints(type), featureFlags, geo, language, locations, sentry, storage}`; no mutations | `schema.graphql:2822-2835, 5721-5740` |  | Technical Lead |

### F. Where this lands in the new core

The document is pure deployment configuration published through the API: it has no entity, no policy and no mutation, so in the new core it is a read-only `viewer`-independent slice served from the gateway's configuration rather than from the domain. What must survive is the *contract* the client already consumes — the eight flag names (typo included, unless deliberately renamed with a client change, F-6), the 24 location keys, the monitoring blocks, the upload ceiling and the language pair — and the one derived table, the visual constraints, which the briefing's `document`/`blob` model should own in one place (today it is copied into every stored visual, CFG-13). Two facts here should shape the core: (1) the upload ceiling is published, enforced and seeded in three places that must agree (CFG-08) — make it one value; (2) the authentication-provider block describes a sign-in path (Kratos public URL) the BFF/OIDC move may have retired (F-7) — decide what the client needs to know at boot before carrying it over. Error texts are not involved; the values are rebaseline rows.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/configuration/`, 2 files, 2 cases); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The document is what the client reads at boot: feature flags, locations, monitoring endpoints, storage limit, language, the authentication provider, and the visual constraint table.

History: 2026-11-19 converted to the three-section layout: the single why was split in three, the who-may table became section 2, and every finding, open question and unexplained rule became a question row routed to an organisation role. Nothing in this file has been reviewed by product yet.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. CFG-07 takes its why from the web client code that reads the location (performance monitoring). CFG-04 and CFG-10 keep no why; their open questions ask for one.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/platform/platform/platform.resolver.fields.ts`; `src/platform/configuration/config/config.service.ts`, `config.resolver.fields.ts`, `config.interface.ts`, `config.entity.ts`, `authentication/**`, `locations/**`, `sentry/**`, `apm/**`, `integrations/**`, `storage/**`, `language/**`; `src/platform/configuration/feature-flag/platform.feature.flag.interface.ts`
- `src/common/enums/platform.feature.flag.name.ts`, `visual.type.ts`; `src/domain/common/visual/visual.constraints.ts`
- `src/config/configuration.ts` (YAML loader); `alkemio.yml` (hosting, identity.ory, monitoring, communications, storage.file, integrations.geo, notifications, collaboration, language, platform)
- `src/main.server.ts:193-199` (upload guard); `src/app.module.ts:187-196` (playground tab)
- `schema.graphql` (Config, PlatformLocations, PlatformFeatureFlag, VisualConstraints, AuthenticationConfig, OryConfig, LanguageConfig, Geo, StorageConfig)
- git: `26edac549`, `49f96273e` (#6196), `5ad0dbb84` (#6439), `5971a138f` (#6452), `7357822b2` (#3351), `673e22654`

Deployment (sibling clone `dev-orchestration`, staleness unverified): `01-alkemio-platform/base/alkemio/config/01-configMap-base.yml`; `overlays/test/alkemio/config/01-configMap-overlay.yml`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/configuration/configuration.it-spec.ts`, `banner-visual-constraints.it-spec.ts`, `configuration.request.params.ts`; `lib/src/scenario/graphql/queries/configuration/full-configuration.graphql`, `banner-visual-constraints.graphql`; `lib/src/utils/graphql.wrapper.ts:71-88` (no role → no header); `server-api/vitest.config.ts`
- `client-web/src/functional-e2e/space-banner/space-banner-test-plan.md`
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- client-web#10178, client-web#10222, server#6439, server#6452 (banner constraints); server#6196 / workspace 009 (upload ceiling); server PR #3351 (feature flags); agents-hq `specs/029-detect-signup-language/spec.md` (language block)
- No spec describes the configuration document itself (grep over `agents-hq/specs/*/spec.md` and server `specs/*/spec.md`)
- client-web `src/core/analytics/apm/useApmInit.ts:111`, `src/core/analytics/geo/useUserGeo.ts` (what the location switch is used for, CFG-07)
