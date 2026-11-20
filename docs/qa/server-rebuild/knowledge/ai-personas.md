# AI server and AI personas: behaviour rules

_What the platform does today around the AI engines behind virtual contributors: the one AI server record and who may touch it, the persona of each virtual contributor and its secrets, the engines and how a question reaches them, the history sent along, the answer coming back, reading knowledge in, maintenance and limits: what it does, why, who may, and what is still to answer. The engine itself is out of scope. The layout is the one piloted in `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 12 · Quality Lead 2 · Security Lead 3 · Incident Lead 1 · Service Operations Lead 3. By state: 15 open · 6 with a suggested answer · 3 decided. Proof of the 20 rules: 4 proven by a test · 16 untested (Appendix A)._

_Whys of the 20 rules: 12 rest on a source or a product decision · 6 rest only on a technical QA draft, for the Technical Lead (AIP-01, AIP-09, AIP-15, AIP-16, AIP-17, AIP-20; AIP-05 also carries one) · 2 have none, and each carries a defect (AIP-04, AIP-10)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec with its requirement, a server pull request or commit, an issue or a document. "Not decided: exists in the code" means the behaviour is there and nobody chose it. "Not decided: a defect" means today's behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F6)** means a question on this rule is still open, **(defect: F1)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F4)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A **persona** is the engine set-up of one virtual contributor: which engine answers, with which prompt and which settings. An **engine** is the separate program that produces the answers.

## 1. Rules

### The AI server

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| AIP-01 | There is exactly one AI server record. Anyone, signed in or not, can fetch it, but reading its personas, its access rules or its default persona needs the right to read it. **(open: Q-AIP-01, F5)** | — | — | The platform runs one set of AI engines, so one record holds their shared configuration. _(draft)_ | Not decided: exists in the code |
| AIP-02 | Platform Content Full Access may create, read, change and delete on the AI server and on every persona. The Platform Operations Admin may only reset its access rules and create a persona. No other role may do anything on it. | Personas and engine configuration are platform content (027 row 2, T076) | — | the reset belongs to the operational family alone and content-full-access holds no GRANT (server#6619, fixed by #6626). | Spec 027 row 2, T076; server#6619, fixed by #6626 |
| AIP-03 | Resetting the AI server's access rules works them out again for the server and for every persona. The reset is recorded in the operations audit log, whether it succeeds or fails. | Operational maintenance is audited (032 FR-002). | — | — | Spec 032 FR-002 |
| AIP-04 | The AI server's "default persona" is never set, so asking for it always fails. **(defect: F1, OQ4)** | — | — | — | Not decided: a defect |

### Personas: definition and secrets

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| AIP-05 | Every virtual contributor gets its own persona, created together with it. The persona holds an engine ("expert" unless another is chosen), up to ten prompt lines and, optionally, the settings of an external AI service. | — | As a virtual contributor owner, I want to choose its engine and prompt, so that it answers the way my community needs. | A persona is the VC's engine binding; one persona per VC. _(draft)_ | Product, 2026-11-20 (product why); the technical why is still a QA draft |
| AIP-06 | A persona has no access rules of its own. It follows its virtual contributor: whoever may change, delete or read the virtual contributor may do the same to its persona. A persona created directly on the AI server follows the AI server's rules. **(open: Q-AIP-06)** | — | — | "Hack to deal with the fact that the AI Persona has an authorization policy that uses the VC's account" (code comment); no product statement. | Not decided: exists in the code |
| AIP-07 | A persona can also be created on its own on the AI server, by Platform Content Full Access or the Platform Operations Admin. It belongs to no virtual contributor, and the creation is audited. | — | — | Operational family keeps persona creation on the existing create grant (032 FR-015). | Spec 032 FR-015 |
| AIP-08 | Changing a persona replaces its prompt and engine when they are given and merges the other settings into the stored ones. The knowledge is not read in again after a change. **(open: Q-AIP-08)** | — | — | "TBD: trigger a re-ingest?", code comment | Product, 2026-11-20 (F6): stays as today, re-reading the knowledge when the engine changes is a wish on the product issues list |
| AIP-09 | The key and the assistant id of an external AI service are stored encrypted. A reader sees the key only as its first 7 and last 4 characters, and the model name in full. But the assistant id is returned in its encrypted form to every reader of the persona. **(defect in part: F4, OQ3)** | — | — | The key of a customer's own AI service is a secret: stored encrypted and shown only as a mask, it cannot leak through a read. _(draft)_ | Not decided: exists in the code |
| AIP-10 | Deleting a persona leaves its virtual contributor pointing at nothing, and every later question to it fails. Deleting a virtual contributor removes its persona only if that step succeeds, so a persona can be left without a virtual contributor. **(defect: F2, F8)** | — | — | — | Not decided: a defect |

### Engines and routing

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| AIP-11 | A persona's engine is one of six names. A question is sent to the queue of its engine, and queues exist for five of them. A question to a "community-manager" persona goes nowhere and gives no error. **(defect in part: F3, OQ1)** | — | — | Each engine is a separate worker (sibling `virtual-contributor` README); community-manager was decommissioned 2026-08-04 but the enum value survives. | Not decided: exists in the code |
| AIP-12 | For four engines a question is sent with the last 30 messages of its thread, or of the whole room when there is no thread, oldest first. Two of them also get the description of the callout or post the question was asked under, which takes one of the 30 places. The other two engines get no history. **(open: Q-AIP-12)** | — | As a member asking a virtual contributor, I want it to know the conversation so far, so that I don't have to repeat the context. | — | Product, 2026-11-20 (product why); the technical why waits for Q-AIP-12 |
| AIP-13 | In that history, a message counts as the virtual contributor's own when the chat id of its sender starts with `@virtualcontributor`. **(open: Q-AIP-13, F7)** | — | — | VC chat identities are minted with that prefix (communication adapter convention). | Not decided: exists in the code |
| AIP-14 | An "expert" persona with no prompt graph of its own runs on the platform's built-in one. Reading a persona's prompt graph gives the stored one, else the built-in one for "expert" and "libra-flow" personas, else nothing. **(open: Q-AIP-14)** | — | As a virtual contributor owner, I want an expert VC to work without designing a prompt graph, so that I can set one up quickly. | — | Product, 2026-11-20 (product why); the technical why waits for Q-AIP-14 |
| AIP-15 | With each question the engine receives the persona's prompt and settings, who asked, the message, which knowledge to use, the history, the virtual contributor's name and description, what to do with the answer, and the language. **(open: OQ2)** | — | — | The engine answers as the VC with the VC's own configuration; the server keeps the secrets and the room context. _(draft)_ | Not decided: exists in the code |
| AIP-16 | The engine's answer comes back with its text, its sources, the languages it detected and a thread id. The server does only what the question asked for: post a reply, post a message, or nothing. A reply is posted only when the question named a room and a thread. **(open: Q-AIP-16)** | — | — | A reply belongs in a thread, so the server only posts one when the question named both the room and the thread. _(draft)_ | Not decided: exists in the code |
| AIP-17 | A request to read knowledge in names what to read and for which persona; a request to read a Space in as context names the Space and no persona. The persona's "last read in" date follows the result, and it is the only thing the engine writes back to the server. | — | — | The engine owns the vectors; the server keeps only readiness. _(draft)_ | Not decided: exists in the code |

### Maintenance and limits

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| AIP-18 | A Platform Operations Admin can clean the AI knowledge store: a collection named after a Space's URL name is deleted when a twin named after the Space's id exists; all other collections are kept. The action is audited. | — | — | Legacy collections were keyed by nameID; the ids are the keys now (operational family, 032 "embeddings cleanup"). | Spec 032 ("embeddings cleanup") |
| AIP-19 | The server sets no limit on tokens, requests or cost for questions to a virtual contributor. The length of the history is the only bound. The only AI-token allowance on the platform belongs to the web assistant. **(open: OQ5)** | Virtual contributor use is not metered today; a usage limit is a wish on the product issues list because the cost is unbounded. | — | — | Product, 2026-11-20 (Q-AIP-19): stays as today |
| AIP-20 | A persona can only be read through the AI server (Platform Content Full Access) or through its virtual contributor. | — | — | A persona holds a virtual contributor's prompts and secrets, so it is reachable only through the AI server or the VC that owns it. _(draft)_ | Not decided: exists in the code |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. "Account admin" is the admin of the account that owns the virtual contributor. Evidence is in Appendix B._

### The AI server

| ID | Action | Platform Content Full Access | Platform Operations Admin | Other platform roles | Account admin | Space admin or member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Fetch the AI server record (its id) | Y | Y | Y | Y | Y | Y | Y¹ |
| W2 | Read the AI server's personas and access rules | Y | N | N | N | N | N | N |
| W3 | Reset the AI server's access rules | N² | Y | N | N | – | N | N |
| W4 | Create a persona on the AI server | Y | Y | N | N | N | N | N |
| W7 | Clean up the AI knowledge store | N | Y | N | N | – | N | N |

¹ No sign-in is needed; see F5. ² Since server#6626.

### Personas and questions

| ID | Action | Platform Content Full Access | Other platform roles | Account admin | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W5 | Change or delete a virtual contributor's persona | Y | N | Y³ | N | N | N | N |
| W6 | Read a virtual contributor's persona (engine, prompt, prompt graph, masked external settings) | Y | Y⁴ | Y | Y⁴ | Y⁴ | Y⁵ | Y⁵ |
| W8 | Ask a virtual contributor a question | Y⁶ | Y⁶ | Y⁶ | Y | Y | Y⁶ | N |

³ Through the rights on the virtual contributor (AIP-06). ⁴ Where they can see the virtual contributor. ⁵ Public virtual contributors only. ⁶ Where they may post in the room. W8 is the rule VCK-31 of the virtual contributor knowledge file, repeated here to close the loop.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). Ids: F = finding, OQ = open question, Q-AIP-nn = a rule whose reason no source states, GAPS and CONST = the test gaps and the constants. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 12 to answer, 4 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | AI server | tidy-up | The "default persona" of the AI server can never be read, because nothing ever sets it. Drop the field or give it a value? | Technical Lead | — | open |
| F3 | Engines | defect | The engine list holds a name that cannot be reached: a question to a "community-manager" persona goes nowhere and gives no error. Another, "openai-assistant", belongs to an archived repository. Limit the list to live engines? | Technical Lead (Service Operations Lead answers OQ1 first) | Shrink the list to live engines and refuse creating or changing a persona on a retired one. | suggested |
| F7 | Engines | decision | A message counts as "the assistant's" when its sender id starts with `@virtualcontributor`: that is any virtual contributor, not only the one asked, and it depends on a naming habit. Accept it as a convention, or mark messages by the kind of sender? | Technical Lead | — | open |
| OQ2 | Engines | check | Does the engine use everything the server sends: the language, the context, the interaction id, the request to read knowledge in, the prompt-graph override? The engine code was not read. | Technical Lead | — | open |
| OQ5 | Limits | check | Is there any limit on virtual contributor usage outside the server (in the engine, at the AI provider)? The server has none, and product may believe there is one. | Technical Lead (Product Lead decides whether a limit is needed) | Product, 2026-11-20: a limit is wanted. It stays as today; a usage limit per virtual contributor or per account is a wish on the product issues list. The check whether the engine or the AI provider already limits use remains. | open |
| Q-AIP-01 | AI server | decision | Why does this rule exist? No source states the reason. Why is there one AI server record that anyone can fetch? | Technical Lead | — | open |
| Q-AIP-06 | Personas | decision | Why does this rule exist? No source states the reason. The code calls it a workaround. Should a persona simply follow its virtual contributor? | Technical Lead | — | open |
| Q-AIP-08 | Personas | decision | Why does this rule exist? No source states the reason. Why are the settings merged and the prompt replaced? (Reading the knowledge in again is F6.) | Technical Lead | — | open |
| Q-AIP-12 | Engines | decision | Why does this rule exist? No source states the reason. Why 30 messages, and why do only some engines get the history and the callout or post description? | Technical Lead | Product, 2026-11-20: the product why on AIP-12 is confirmed. A technical why is still welcome. | suggested |
| Q-AIP-13 | Engines | decision | Why does this rule exist? No source states the reason. The only reason found is a naming habit of the chat adapter (see F7). | Technical Lead | — | open |
| Q-AIP-14 | Engines | decision | Why does this rule exist? No source states the reason. Why do "expert" personas fall back on a built-in prompt graph, and why does a read also show it for "libra-flow"? | Technical Lead | Product, 2026-11-20: the product why on AIP-14 is confirmed. A technical why is still welcome. | suggested |
| Q-AIP-16 | Engines | decision | Why does this rule exist? No source states the reason. Why does the server act on the answer only as the question instructed? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Personas | defect | A persona and its virtual contributor can lose each other: 159 personas have no virtual contributor on acceptance, and the cause is still live. Is that an incident or a backlog defect? Then: how are the two tied together in the new model, and are the 159 repaired? | Incident Lead, then Technical Lead | A firm link with automatic deletion in the new model; a repair for the 159. | suggested |
| F4 | Personas | defect | The settings of an external AI service are shown to everyone who can read the persona; for a public virtual contributor that is every visitor. The assistant id comes back in its encrypted form and the model name in full. Restrict this? | Security Lead, then Technical Lead | Show the external settings only to the account admin and the platform content roles, and never return the encrypted assistant id. | suggested |
| F8 | Personas | defect | Changing and deleting a persona is logged under organisation labels and writes no platform audit entry, although Platform Content Full Access can do both. | Security Lead, then Technical Lead | Add the audit entry and correct the labels. | suggested |
| OQ1 | Engines | check | Which engines run on acceptance and on production, and which names in the list should be refused? | Service Operations Lead (Technical Lead decides which to refuse) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Personas | check | Confirm F4 on a running system: does a visitor get the encrypted assistant id of a public virtual contributor? | Quality Lead | — | open |
| GAPS | All | test | 15 rules and parts of 5 more have no test, and 8 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| G1 | All | test | No environment the tests run on has an engine or a vector store, so a question answered from start to end and the effect of the knowledge-store clean-up were never seen. Can one test environment get both? | Service Operations Lead (Quality Lead writes the cases) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 3 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Personas | defect | The settings of an external AI service are shown to everyone who can read the persona; for a public virtual contributor that is every visitor. The assistant id comes back in its encrypted form and the model name in full. Restrict this? | Security Lead, then Technical Lead | Show the external settings only to the account admin and the platform content roles, and never return the encrypted assistant id. | suggested |
| F5 | AI server | risk | Anyone, without signing in, can fetch the AI server record; only its id is shown. Close it or accept it? | Security Lead | — | open |
| F8 | Personas | defect | Changing and deleting a persona is logged under organisation labels and writes no platform audit entry, although Platform Content Full Access can do both. | Security Lead, then Technical Lead | Add the audit entry and correct the labels. | suggested |


### Incident Lead

[Incident Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Enablement/Sub-circles/Incident%20Response/Roles/Incident%20Lead.md) · Enablement › Incident Response (Neil, Simone) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Personas | defect | A persona and its virtual contributor can lose each other: 159 personas have no virtual contributor on acceptance, and the cause is still live. Is that an incident or a backlog defect? Then: how are the two tied together in the new model, and are the 159 repaired? | Incident Lead, then Technical Lead | A firm link with automatic deletion in the new model; a repair for the 159. | suggested |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 3 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Engines | check | Which engines run on acceptance and on production, and which names in the list should be refused? | Service Operations Lead (Technical Lead decides which to refuse) | — | open |
| OQ4 | AI server | check | Was the default persona ever set on any environment? One database read answers it. | Service Operations Lead | — | open |
| G1 | All | test | No environment the tests run on has an engine or a vector store, so a question answered from start to end and the effect of the knowledge-store clean-up were never seen. Can one test environment get both? | Service Operations Lead (Quality Lead writes the cases) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Engines | defect | The engine list holds a name that cannot be reached: a question to a "community-manager" persona goes nowhere and gives no error. Another, "openai-assistant", belongs to an archived repository. Limit the list to live engines? | Technical Lead (Service Operations Lead answers OQ1 first) | Shrink the list to live engines and refuse creating or changing a persona on a retired one. | suggested |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| CONST | Product rules on the persona defaults and limits, the OpenAI model list and default, and the history length, ticked "yes" in Appendix E. Error texts, engines, routing, storage and security values go to the Technical Lead and the Security Lead. | Product, 2026-11-20 | Appendix E |
| F6 | Stays as today: a change of engine or prompt does not read the knowledge in again. Re-reading it when a virtual contributor's engine changes is a wish on the product issues list. | Product, 2026-11-20 | AIP-08; PRODUCT-ISSUES F6 (ai-personas) |
| Q-AIP-19 | Stays as today: questions to a virtual contributor have no token, request or cost limit. A usage limit per virtual contributor or per account is a wish, because the cost is unbounded today. | Product, 2026-11-20 | AIP-19; PRODUCT-ISSUES Q-AIP-19 |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The Actors column uses the role shorthands listed in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| AIP-01 | There is exactly one AI server, seeded with an empty policy that the server re-applies at start-up when it finds no rules; anyone — signed in or not — can fetch it, but reading its personas, its policy or its default persona needs read on it. | all | code › `src/migrations/1764590884533-seed.ts:412-436` · `src/core/bootstrap/bootstrap.service.ts:680-690` · `src/services/ai-server/ai-server/ai.server.resolver.queries.ts:420-427` · `ai.server.resolver.fields.ts:368-408` | untested (the ungated root read is F5) |
| AIP-02 | Platform Content Full Access may create, read, update and delete on the AI server and, by inheritance, every persona; Platform Operations Admin may only reset its authorization and create a persona; no other role has anything on it. | PCFA, POA | code › `ai.server.service.authorization.ts:65-121` · test › `platform-roles/_support/groups/a3` › `A3.aiServerAuthorizationPolicyReset` (POA can, 13 roles cannot; `generate-test-plan.ts:355`) · matrix › `access-matrix.md:844-870` | proven (the CRUD cells are matrix-only) |
| AIP-03 | Resetting the AI server's authorization recomputes its policy and every persona's, returns the server, and writes an operations audit row for success or failure. | POA | code › `ai.server.resolver.mutations.ts:266-299` · `ai.server.service.authorization.ts:27-63` · test › `a3` › `A3.aiServerAuthorizationPolicyReset` | proven (audit row untested) |
| AIP-04 | The AI server's "default persona" is never set, so asking for it always fails ("No default Virtual Personas found!"). | PCFA | code › `ai.server.service.ts:555-572` · grep: no writer of `defaultAiPersona` | untested (see F1) |
| AIP-05 | Every virtual contributor gets its own persona, created in the VC's own transaction, holding an engine (expert unless chosen), up to ten prompt lines of bounded length, and an optional external configuration; the VC reports that engine and persona to its readers. | account admin | code › `src/domain/community/virtual-contributor/virtual.contributor.service.ts:136-141, 184-189` · `ai-persona/ai.persona.service.ts:39-65` · `ai-persona/dto/ai.persona.dto.create.ts:15-35` · test › `contributor-management/virtual-contributor/model-card/engine-types` › `should have correct engine type in each model card` (libra-flow, expert, generic-openai, guidance read back) | proven (engine); the prompt limits are untested |
| AIP-06 | A persona carries no rules of its own: it inherits its VC's policy (so whoever may update or delete the VC may update or delete its persona, and whoever may read the VC may read its persona), or the AI server's policy when it was created directly on the server. | account admin, PCFA | code › `ai-persona/ai.persona.service.authorization.ts:284-335` · `virtual.contributor.service.authorization.ts:131-137` · `ai.server.service.ts:492-512` · crosscheck › `access-matrix-crosscheck.md:50, 291` | untested |
| AIP-07 | A persona can also be created stand-alone on the AI server by a create holder (content-full-access, operations admin); it belongs to no VC and the creation is audited with its engine. | PCFA, POA | code › `ai.server.resolver.mutations.ts:301-351` · spec › `agents-hq/specs/032-platform-ops-admin-role/spec.md:164` | untested |
| AIP-08 | Updating a persona replaces its prompt and engine when given, merges the external configuration over the stored one, clears the prompt graph when set to null and merges it key by key otherwise; no re-ingest follows an update. | account admin, PCFA | code › `ai.persona.service.ts:67-115` · `ai.server.service.ts:486-490` | untested |
| AIP-09 | The external API key and assistant id are stored encrypted; a reader sees the key only as a `first7...last4` signature, the external configuration only for generic-openai and libra-flow personas (null for the rest), and the model name in clear — but the assistant id comes back as its ciphertext, to every reader of the persona. | VC readers, account admin | code › `ai.persona.service.ts:221-264` · `ai-persona/ai.persona.resolver.fields.ts:409-412, 492-516` · `ai.persona.external.config.resolver.fields.ts:604-616` · `dto/external.config.ts:88-108` | untested (see F4) |
| AIP-10 | Deleting a persona removes it and its policy; the VC that pointed at it keeps the id and every later question fails ("Unable to find AI Persona with ID"); deleting a VC removes its persona best-effort, so a failed removal leaves a persona without a VC. | PCFA, account admin | code › `ai.persona.service.ts:117-137` · `virtual.contributor.service.ts:408-424` · `virtual.contributor.entity.ts:431-432` (no FK) · `src/domain/communication/virtual.contributor.message/virtual.contributor.message.service.ts:338-347` · register › `acc-defect-register.md:73` (E5: 159 personas without a VC) | untested (see F2) |
| AIP-11 | A persona's engine is one of six names; a question is published on the event bus with the engine name as routing key, and queues are configured for five of them — a community-manager persona's question is published to a key nobody listens on. | server | code › `src/common/enums/ai.persona.engine.ts` · `src/services/infrastructure/event-bus/publisher.ts:14-23` · `alkemio.yml:464-473` | untested (see F3) |
| AIP-12 | For expert, guidance, generic-openai and libra-flow personas the question is sent with the last 30 (configurable) messages of its thread — or of the whole room when there is no thread — oldest first, with the VC's own messages marked as the assistant's; expert and libra-flow additionally get the hosting callout's or post's description as the first message, which takes one of the slots; openai-assistant and community-manager personas get no history. | server | code › `ai.server.service.ts:343-380, 382-455` · `alkemio.yml:791` | untested |
| AIP-13 | A message counts as the VC's own in the history when its chat sender id starts with `@virtualcontributor`. | server | code › `ai.server.service.ts:407-410` | untested |
| AIP-14 | An expert persona without a prompt graph is run with the platform's built-in expert graph; a persona's "prompt graph" read returns the stored graph, else the built-in graph for expert and libra-flow personas, else nothing. | VC readers | code › `ai.persona.service.ts:195-216` · `ai.persona.resolver.fields.ts:421-466` · `prompt-graph/config/prompt.graph.expert.json` | untested |
| AIP-15 | A question hands the engine the persona's prompt and decrypted external configuration, the asker, the message, the body-of-knowledge id, the context id, the history, the engine thread id, the VC's name and description, the result instructions and the language; the operation is "query" unless an ingest is asked. | server | code › `ai.persona.service.ts:168-219` · `ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.invocation.input.ts:240-256` · `src/services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.invocation.ts:83-118` | untested |
| AIP-16 | The engine's answer arrives as a result event carrying the answer text, its sources (title, uri, score…), the detected languages and the engine thread id; the server acts on it only according to the result instructions the question carried (post a reply, post a message, or nothing), and a reply is posted only when the question named a room and thread. | server | code › `src/services/infrastructure/event-bus/messages/invoke.engine.result.ts:29-65` · `ai.server.service.ts:199-218, 631-637` · `src/domain/community/virtual-contributor/dto/utils.ts:7-17` | untested |
| AIP-17 | A knowledge ingest names the body-of-knowledge id, its kind, the purpose "knowledge" and the persona; a context ingest names a space with purpose "context" and no persona; the persona's "last ingested" stamp follows the result (VCK-11), and the stamp is the only state the engine writes back to the server. | server | code › `ai.server.service.ts:276-323` · `event-bus/messages/ingest.body.of.knowledge.command.ts:12-19` · `event-bus/handlers/*` | untested (cross-ref VCK-09/11) |
| AIP-18 | A Platform Operations Admin can clean the vector store: every collection named after a space's URL name is deleted when a twin named after the space's id exists; id-named and unknown-space collections are kept; the action is audited and, on a stack without a vector store, fails with "fetch failed". | POA | code › `ai.server.resolver.mutations.ts:175-264` · test › `a11` › `A11.cleanupCollections` (gate; failure accepted) · spec › `agents-hq/specs/032-platform-ops-admin-role/spec.md:21` | proven (gate); the effect is untested |
| AIP-19 | The server enforces no token, request or cost budget on a VC's questions; the history length is the only bound, and the platform's only AI-token entitlement belongs to the web assistant. | account holder | code › grep `src/services/ai-server` (no budget) · `alkemio.yml:791` · entitlements › ENT-13 | untested |
| AIP-20 | A persona can only be read through the AI server (content-full-access) or through its VC; the AI server's persona list and single-persona lookup need read on the server. | PCFA, VC readers | code › `ai.server.resolver.fields.ts:388-408` · `virtual.contributor.resolver.fields.ts:82-94` | untested |

### B. Rights: evidence

_The legend of the former who-may table (its shorthands are still used in Appendix A), then the evidence for section 2._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `ai.server.service.authorization.ts:76-121`; `ai.server.resolver.queries.ts:420-427` (no gate); `ai.server.resolver.fields.ts:368-408`; `ai.server.resolver.mutations.ts:182-189, 273-278, 310-315`; `ai.persona.resolver.mutations.ts:366-371, 386-391`; `ai.persona.resolver.fields.ts:434-439, 482-487, 505-510`; `ai.persona.service.authorization.ts:300-304` (inherit only); `virtual.contributor.service.authorization.ts:131-137, 219-235`; access matrix §ai-server (`access-matrix.md:844-870`), §virtual-contributor (`:1098-1134`); crosscheck A3 (`access-matrix-crosscheck.md:93`) and "`ai-persona` is not in the matrix" (`:291`). The summon row is VCK-31's (ungated) and is repeated here only to close the loop.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and its ask. The text keeps the old spelling of the ids ("F-3" is F3)._

#### Findings

- **F1 — The default persona can never be read (AIP-04).** Code: `aiServer.defaultAiPersona` is a non-null GraphQL field backed by a relation nothing writes; the resolver throws "No default Virtual Personas found!". Test/spec: none. Ruling: drop the field or seed a default.
- **F2 — Persona and VC can orphan each other (AIP-10).** Code: `aiPersonaID` is a bare uuid column; deleting a persona leaves the VC pointing at nothing (every question then fails), and VC deletion deletes the persona best-effort. Register E5: 159 personas without a VC on acceptance. Ruling: FK with cascade in the new model; a repair for E5.
- **F3 — An engine value with no queue (AIP-11).** Code: the enum has `community-manager` and `openai-assistant`; queues exist for `openai-assistant` but not `community-manager` (decommissioned 2026-08-04), so a persona on that engine publishes into the void with no error. `openai-assistant` is excluded from the externally-configurable list and its repo is archived (2026-05-28). Ruling: shrink the enum to live engines and refuse creation/updates on retired ones.
- **F4 — External configuration leaks to persona readers (AIP-09).** Code: `externalConfig` is returned for generic-openai/libra-flow personas to anyone with READ on the persona, which the persona inherits from the VC — for a public VC that is every visitor; `apiKey` is masked by a field resolver but `assistantId` has none and resolves to the stored ciphertext, and `model` is in clear. Test/spec: none (004 FR-007 covers the assistant only). Ruling: restrict `externalConfig` to the VC's account admin and platform content roles, and never return `assistantId` ciphertext.
- **F5 — `aiServer` root query is ungated (AIP-01).** Code: returns the singleton (id, dates) to anonymous callers; every field is READ-gated so only the id leaks. Mirrors CM finding 7 / VCK F-7. Ruling: gate or accept.
- **F6 — Updating a persona never re-ingests (AIP-08).** Code: "TBD: trigger a re-ingest?" — a changed engine or prompt keeps the old vectors. Ruling: define when ingest must re-run. **Product, 2026-11-20:** stays as today; re-reading on an engine change is a wish on the product issues list.
- **F7 — History role detection by chat-id prefix (AIP-13).** Code: a message is "the assistant's" iff the sender id starts with `@virtualcontributor` — any VC, not the asked one, and dependent on the adapter's naming convention. Ruling: accept as convention or mark messages by actor type.
- **F8 — Persona mutations log as organisation actions (AIP-10).** Code: `aiServerUpdateAiPersona` / `aiServerDeleteAiPersona` label their authorization check `orgUpdate` / `deleteOrg`; neither writes a platform audit row although content-full-access reaches them. Ruling: audit + relabel.

#### Open questions

- **OQ1 — Which engines are live.** Six enum values, five queues, two sibling repos locally (`virtual-contributor` @ `04ba7bd` 2026-08-04, `virtual-contributor-engine-libra-flow` @ `53d5546` 2026-07-21; clones may be stale), community-manager decommissioned 2026-08-04, others archived 2026-05-28. Someone must say which workers run on acceptance/production and which enum values should be refused.
- **OQ2 — Does the engine honour what the server sends** — `language`, `contextID`, `interactionID`, `operation: ingest`, the prompt-graph override? Engine code not read.
- **OQ3 — Live confirmation of F-4** (ciphertext `assistantId` to an anonymous reader of a public generic-openai VC).
- **OQ4 — Was `defaultAiPersona` ever populated** on any environment (a DB read of `ai_server.defaultAiPersonaId`)?
- **OQ5 — Is there any budget for VC usage** outside the server (per-engine rate limits in the worker, provider quotas)? The server has none (AIP-19); product may believe there is one. **Product, 2026-11-20:** a limit is wanted: a usage limit per virtual contributor or per account is a wish; the check for limits elsewhere remains.

### D. Test gaps

_For the Quality Lead (question GAPS in section 3). The first and the last bullet need an environment with an engine and a vector store: question G1._

Untested rules by id: AIP-04, AIP-06, AIP-07, AIP-08, AIP-09, AIP-10, AIP-11, AIP-12, AIP-13, AIP-14, AIP-15, AIP-16, AIP-17, AIP-19, AIP-20; plus the untested clauses of AIP-01 (ungated root read), AIP-02 (PCFA CRUD cells), AIP-03 (audit row), AIP-05 (prompt limits), AIP-18 (effect on a stack with a vector store).

Behaviours the area has that neither reading nor tests pinned down:
- A question answered end to end on a stack with an engine (publish → worker → result → reply) — no environment the suite runs on has the worker (a11 accepts "fetch failed" for the vector store).
- Creating, updating and deleting a stand-alone persona (all three mutations unreached; catalogue AI-2).
- Persona update through the VC owner (account admin) — the policy says yes; never exercised.
- Prompt limits (11th line, over-long line) and the external-config merge (partial update keeps the stored key).
- Prompt graph null-clear versus partial merge.
- History assembly: thread versus room, the 30 cap with and without the entity content, the sender-prefix rule.
- Reading `externalConfig` as a non-admin reader of a public generic-openai VC (F-4 repro).
- Vector-store cleanup effect (needs Chroma).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Engines (6) | `guidance`, `expert`, `libra-flow`, `generic-openai`, `openai-assistant`, `community-manager` | `src/common/enums/ai.persona.engine.ts`; `schema.graphql:81` | no | Technical Lead |
| Engines with a configured queue (5) | expert, libra-flow, guidance, generic (generic-openai), openai-assistant — `virtual-contributor-engine-<name>` (env-overridable) | `alkemio.yml:469-473` | no (F-3) | Technical Lead |
| Routing | exchange `event-bus`; routing key = engine name for questions, event class name otherwise | `publisher.ts:14-23` | no | Technical Lead |
| History-enabled engines | expert, guidance, generic-openai, libra-flow | `ai.server.service.ts:343-348` | no | Technical Lead |
| Entity-content engines | libra-flow, expert (callout framing / post description prepended) | `ai.server.service.ts:367-370, 439-451` | no | Technical Lead |
| Externally-configurable engines | generic-openai, libra-flow | `ai.persona.resolver.fields.ts:409-412` | no | Technical Lead |
| Built-in graph engines | expert (used at invocation), expert + libra-flow (returned on read) | `ai.persona.service.ts:195-216`; `ai.persona.resolver.fields.ts:445-449` | no | Technical Lead |
| Persona create defaults / limits | engine `expert`; prompt `[]`, max 10 lines, each ≤ `LONG_TEXT_LENGTH`; external config optional | `dto/ai.persona.dto.create.ts:15-35` | yes | Product Lead |
| OpenAI models (18) + default | gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-5.4-pro, gpt-5.2, gpt-5.2-pro, gpt-5.1, gpt-5.1-mini, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-pro, o4-mini, o3-pro, o3, o3-mini; default `gpt-5.4-nano` | `dto/external.config.ts:63-107`; `schema.graphql:747` | yes | Product Lead |
| Encrypted fields / masking | `apiKey`, `assistantId` encrypted at rest; `apiKey` read as `<first 7>...<last 4>` | `ai.persona.service.ts:226-264` | no (F-4) | Security Lead |
| History length | `platform.virtual_contributors.history_length` = `VC_HISTORY_LENGTH` default 30 | `alkemio.yml:791` | yes | Product Lead |
| VC sender prefix | `@virtualcontributor` | `ai.server.service.ts:408` | no | Technical Lead |
| Invocation operations / result actions | `query` (default), `ingest` / `postReply`, `postMessage`, `none` | `ai.server.adapter.dto.invocation.ts:83-92` | no | Technical Lead |
| Ingestion purposes | `knowledge`, `context` | `ingest.body.of.knowledge.command.ts:5-8` | no | Technical Lead |
| Result payload | `message, result, humanLanguage, resultLanguage, knowledgeLanguage, originalResult, sources[{chunkIndex?, documentId, embeddingType, source, title, type, score, uri}], threadId?` | `invoke.engine.result.ts:29-58` | no | Technical Lead |
| Vector store | `platform.vector_db` host `VECTOR_DB_HOST` (localhost), port `VECTOR_DB_PORT` (8765), credentials; collection names `<space nameID\|id>-(knowledge\|context)` | `alkemio.yml:785-787`; `ai.server.resolver.mutations.ts:225-259` | no | Technical Lead |
| Error texts | `No AiServer found!`; `No AI Persona Services found!`; `No default Virtual Personas found!`; `Unable to find AI Persona with ID: <id>`; `Unable to find all fields on AI Persona with ID: <id>` | `ai.server.service.ts:524-528, 546-551, 565-570`; `ai.persona.service.ts:126-130, 156-161` | no | Technical Lead |
| Roles / audit | PCFA (CRUD), POA (reset, create, cleanup); operations audit actions `aiServerAuthorizationPolicyReset`, `aiServerCreateAiPersona` (target: persona id + engine), `cleanupCollections` | `ai.server.service.authorization.ts`; `ai.server.resolver.mutations.ts:193-206, 284-297, 334-349` | no | Security Lead |
| GraphQL surface | `AiServer{aiPersona(ID), aiPersonas, authorization, defaultAiPersona}`, `AiPersona{engine, prompt, externalConfig, bodyOfKnowledgeLastUpdated, promptGraph, authorization}`, `ExternalConfig{apiKey, assistantId, model}`, `PromptGraph`, `VirtualContributor.{aiPersona, engine, modelCard}`; query `aiServer`; mutations `aiServerCreateAiPersona`, `aiServerUpdateAiPersona`, `aiServerDeleteAiPersona`, `aiServerAuthorizationPolicyReset`, `cleanupCollections` (→ `MigrateEmbeddings{success}`) | `schema.graphql:81, 747, 1854-1900, 3506, 4794, 4920-4926, 4972, 6191, 6315, 9759` | no | Technical Lead |

### F. Where this lands in the new core

The catalogue lands AI-2 in the "ai_engine registry" (slices 10–12, verdict absent, "admin-only; decide with the backend team whether it survives"). A persona today is one row per VC plus a stand-alone path nobody reaches; in the rebuild it becomes a registry entry (engine, prompt, prompt graph, external configuration) referenced by the VC's `actor` row, with no stored authorization policy and no reset (AIP-02/03 disappear; AIP-06's "inherit the VC" becomes the only rule, evaluated at read time). RabbitMQ goes, so AIP-11/12/15/16 — the queue-per-engine routing, the history assembly from Matrix, the result event — need a replacement transport that the deck does not name; and with chat moving browser → Synapse the server will no longer see room messages to build a history from (AIP-12). Three facts should shape the registry: (1) the enum carries engines that cannot be reached (F-3) — the registry should list only deployable engines; (2) secrets are handled per persona with a leak on read (F-4) — the registry needs a write-only secret column; (3) `defaultAiPersona` and the stand-alone create path have no user (F-1, AIP-07) — candidates for the expected-loss list rather than migration.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite — this feature (catalogue AI-2, verdict absent) has **no folder of its own**, so the proof is two `platform-roles` capability rows (A3 `aiServerAuthorizationPolicyReset`, A11 `cleanupCollections`, 14 roles each) and the three `contributor-management/virtual-contributor/model-card/engine-types` cases; the specs, issues and docs listed in § Sources. Scope: what the server guarantees around the engine — the AI server singleton and its policy, persona definitions and secrets, engines and queue routing, invocation input, history and results, ingest commands, maintenance, budgets. The engine itself (the `virtual-contributor` sibling) is out of scope; the model card sheet is CM-52 and the ready stamp is VCK-11 (cross-referenced). WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout: the single why was split in three, each rule got a plain-words sentence (the exact text moved to Appendix A), the who-may table became section 2, and every finding, open question and rule without a stated reason was routed to an organisation role in section 3.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. No new source was found for this area in the server or agents-hq specs, so the nine unsourced rules carry drafts.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/services/ai-server/ai-server/ai.server.entity.ts`, `ai.server.interface.ts`, `ai.server.service.ts`, `ai.server.service.authorization.ts`, `ai.server.resolver.queries.ts`, `ai.server.resolver.fields.ts`, `ai.server.resolver.mutations.ts`
- `src/services/ai-server/ai-persona/ai.persona.entity.ts`, `ai.persona.interface.ts`, `ai.persona.service.ts`, `ai.persona.service.authorization.ts`, `ai.persona.resolver.mutations.ts`, `ai.persona.resolver.fields.ts`, `ai.persona.external.config.resolver.fields.ts`, `dto/ai.persona.dto.create.ts`, `dto/ai.persona.dto.update.ts`, `dto/external.config.ts`, `dto/ai.persona.invocation/*`
- `src/services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter.ts`, `dto/ai.persona.engine.adapter.dto.invocation.input.ts`; `src/services/ai-server/prompt-graph/config/prompt.graph.expert.json`
- `src/services/adapters/ai-server-adapter/ai.server.adapter.ts`, `dto/*`
- `src/services/infrastructure/event-bus/publisher.ts`, `messages/*`, `handlers/*`; `src/services/auth-reset/publisher/auth-reset.service.ts`
- `src/domain/community/virtual-contributor/virtual.contributor.service.ts`, `virtual.contributor.service.authorization.ts`, `virtual.contributor.entity.ts`, `virtual.contributor.resolver.fields.ts`, `dto/utils.ts`; `src/domain/communication/virtual.contributor.message/virtual.contributor.message.service.ts`
- `src/common/enums/ai.persona.engine.ts`, `virtual.contributor.body.of.knowledge.type.ts`; `src/core/bootstrap/bootstrap.service.ts`; `src/migrations/1764590884533-seed.ts`; `alkemio.yml`; `src/types/alkemio.config.ts`; `schema.graphql`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/platform-roles/_support/groups/a3.ts`, `a11.ts`, `capabilities.data.ts`, `generate-test-plan.ts`, `platform-roles-test-plan.md`
- `server-api/src/functional-api/contributor-management/virtual-contributor/model-card/engine-types.it-spec.ts`, `model-card.it-spec.ts`, `engine.request.params.ts`
- `docs/qa/server-rebuild/knowledge/contributor-management.md` (CM-50, CM-52, CM-53), `entitlements.md` (ENT-13), `access-matrix.md` (§ai-server, §virtual-contributor), `access-matrix-crosscheck.md` (A3; "ai-persona not in the matrix"), `data-integrity/acc-defect-register.md` (E5), `catalogue/README.md` (AI-2), `catalogue/root-fields.md`

Specs / issues:
- `agents-hq/specs/032-platform-ops-admin-role/spec.md` (FR-002, FR-015; operational inventory)
- `agents-hq/worktrees/qa-pr-challenge/specs/027-platform-role-redesign` (row 2, T076)
- server `specs/064-ut-services-ai-server/spec.md` (unit-test scope only)
- alkem-io/server#6619 (Content Full Access could reset the AI server; fixed by PR #6626)
- Siblings (README only; clones may be stale): `virtual-contributor` @ `04ba7bd` (2026-08-04), `virtual-contributor-engine-libra-flow` @ `53d5546` (2026-07-21); `community-manager` decommissioned 2026-08-04; other engine repos archived 2026-05-28
