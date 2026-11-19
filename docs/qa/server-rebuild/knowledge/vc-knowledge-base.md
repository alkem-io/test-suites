# Virtual contributor knowledge base, settings, well-known virtual contributors and room invocation: behaviour rules

_What the platform does today for a virtual contributor beyond its profile: its knowledge base, reading in its knowledge and the "ready" state, its settings, the well-known virtual contributors and the guidance chat, calling a virtual contributor in a room, the Space feature that allows virtual contributors, conversion and transfer. Profile, visibility, create, update and delete are CM-45 to CM-54 in `contributor-management.md` and are only cross-referenced here. What it does, why, who may, and what is still to answer. The file has three sections: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 14 · Technical Lead 8 · Quality Lead 1 · Security Lead 1 · Incident Lead 1 · Service Operations Lead 2 · Architecture Lead 1. By state: 26 open · 2 with a suggested answer. Proof of the 39 rules: 13 proven by a test · 26 untested (Appendix A)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason, when there is one. "—" means no source states one. Product has not reviewed this file yet and fills the missing user stories later.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided: exists in the code" means the behaviour is in the code and nobody chose it. "Not decided: a defect" means the behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Knowledge base: structure and defaults

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-01 | Every virtual contributor has exactly one knowledge base, created together with it. If the creation fails, nothing is left behind. | One container for a VC's own content, separate from any space. | — | Atomic create (code comment "no orphans if any step fails"). | Not decided: exists in the code |
| VCK-02 | A knowledge base created without a name is called "Knowledge Base". A virtual contributor of the knowledge-base kind created without callouts gets the platform's default set; other kinds start empty. **(open: Q-VCK-02)** | — | — | — | Not decided: exists in the code |
| VCK-03 | For a virtual contributor of the knowledge-base kind, its source of knowledge is always its own knowledge base. For the Space kind it is whatever Space id the creator typed, and nobody checks that this Space exists. **(defect in part: F5)** | — | — | The knowledge base is the body of knowledge for that kind; the space id is a free reference. | Not decided: exists in the code |
| VCK-04 | A form callout can never be put in a knowledge base, neither at creation nor later. Any other kind of callout can. | Forms live only on templates (callout rule R25, `callout.md`). | — | — | Callout rule R25 (callout.md) |
| VCK-05 | Whoever may see the virtual contributor may always read the About of its knowledge base. The contents (callouts, posts, files) are readable only while the "knowledge-base contents visible" setting is on. Only the admin of the account that owns it can add or change content. | CM-47: a VC's knowledge is private by default; the about is the shop window (`knowledge.base.service.authorization.ts` rule names "KnowledgeBase About visible" / "contents not visible"). | — | — | Contributor rule CM-47 (contributor-management.md) |
| VCK-06 | An office document can be created inside a knowledge base and opens in the editor, although it belongs to no Space. | — | — | Analytics attribution failure must never reach the caller (server spec 110). | Server spec 110 |
| VCK-07 | Updating a virtual contributor can change the description of its knowledge base and nothing else of the knowledge base's profile, although the update form accepts more. **(open: F4)** | — | — | — | Not decided: exists in the code |
| VCK-08 | There is no search inside a virtual contributor's knowledge base. Users reach its content only by browsing. **(open: OQ4)** | — | — | The "knowledge base search" of workspace spec 007 is the space knowledge-base *tab* (search per flow state), which a VC knowledge base does not have. | Not decided: exists in the code |

### Body of knowledge: reading it in and the "ready" state

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-09 | Asking to refresh a virtual contributor's knowledge sends one request to the AI engine for the kinds Space, knowledge base and website. For the kinds "none" and "other" nothing happens. **(open: OQ5, OQ7)** | — | — | Ingestion is the engine's job; the server only hands over what to ingest (sibling `virtual-contributor` README: "Ingest pipelines — website crawling and Alkemio space tree ingestion"). | Not decided: exists in the code |
| VCK-10 | The Guidance virtual contributor ignores its own source of knowledge: a refresh always reads three fixed Alkemio websites. **(open: F10, Q-VCK-10)** | — | — | — | Not decided: exists in the code |
| VCK-11 | A virtual contributor is "ready" once its knowledge was read in successfully. It drops back to "initializing" when storing the knowledge fails; any other failure leaves the state as it was. **(open: OQ5)** | — | — | The stamp is what makes a VC "ready" (CM-53): a lost vector collection must show as not-ready again. | Contributor rule CM-53 (contributor-management.md) |
| VCK-12 | When a virtual contributor becomes ready or not ready, people watching it (who may read it) are told live. No other change to it is pushed. **(open: F12, Q-VCK-12)** | — | — | — | Not decided: exists in the code |
| VCK-13 | A Platform Operations Admin can ask for all virtual contributors to refresh their knowledge at once. One failure does not stop the rest, and the action is audited. | Maintenance belongs to the operational family (032 FR-002/FR-015: "BoK refresh"). | — | — | Spec 032 FR-002/FR-015 |
| VCK-14 | Whenever a virtual contributor gets a role in a Space, the server asks the AI engine to read that Space as "context". That context is not used when the virtual contributor answers. **(open: F9)** | — | — | "the context is currently not used", code comment. | Not decided: exists in the code |

### Settings

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-15 | A virtual contributor has one privacy setting, "knowledge-base contents visible", off by default. Whoever may update the virtual contributor can change it, and it takes effect at once. | CM-47: the switch is the only way to open a VC's knowledge to its readers. | — | — | Contributor rule CM-47 (contributor-management.md) |
| VCK-16 | A virtual contributor has one platform setting, "prompt-graph editing enabled", off by default and changed only by a Platform Operations Admin. The server itself does nothing with it. **(open: F3)** | Assistant-capability configuration is operations' (027 row 5 / A11). | — | — | Spec 027 row 5 / A11 |
| VCK-17 | Four more attributes of a virtual contributor (data-access mode, interaction modes, description of its knowledge, prompt-graph definition) are stored and returned as written. The server does nothing with them. **(open: F3, OQ1)** | — | — | — | Not decided: exists in the code |
| VCK-18 | The "knowledge space" field of a virtual contributor is always empty. **(open: F3)** | — | — | — | Not decided: exists in the code |
| VCK-19 | A virtual contributor is marked "listed in store" (on by default; the account admin can change it), but no list or search takes the mark into account. **(open: F3, OQ6)** | — | — | — | Not decided: exists in the code |

### Well-known virtual contributors

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-20 | The platform links each well-known role (chat guidance, steward-ownership expert) to one virtual contributor. Only a Platform Settings Admin can set a link; a link can be replaced but not cleared, and every change is audited. **(open: F11)** | Platform settings are the settings admin's family (027 A10). | — | The gate is a resolver-local pin so no other role can reach it. | Spec 027 A10 |
| VCK-21 | Any signed-in user can read these links; visitors cannot. Every virtual contributor shows which well-known role it has, if any. | — | — | Reading the mapping is the interactive-guidance privilege, granted to every registered user so the client can find the guidance chat (040 FR-008: the client cross-references mappings with conversation members). | Server spec 040 FR-008 |
| VCK-22 | A fresh platform always has a guidance virtual contributor: if none is linked at start-up, the server creates one named "Guidance" and links it. | — | — | Every user gets a guidance conversation at registration (CM-09), so the VC must exist before the first user. | Contributor rule CM-09 (contributor-management.md) |
| VCK-23 | A new user's guidance chat is opened with the linked guidance virtual contributor. If none is linked, the chat is not opened, but the user is still created. | — | — | CM-09; registration must not depend on the AI stack. | Contributor rule CM-09 (contributor-management.md) |
| VCK-24 | When the guidance virtual contributor was recreated, the link was pointed back at the one already present in users' existing guidance chats, so old chats keep working. **(open: OQ2)** | — | — | Chat-side room identities cannot be migrated; the mapping follows the rooms (migration comment). | Server migration 1773800000002 |
| VCK-25 | The platform configuration says whether the guidance engine is on (on by default). The server refuses nothing when it is off. **(open: Q-VCK-25)** | — | — | — | Not decided: exists in the code |

### Calling a virtual contributor in a room

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-26 | A virtual contributor is called into a room by mentioning it in a message. A mention of a virtual contributor that does not exist makes the whole message fail. | — | — | One mention syntax for users, organisations and VCs. | Not decided: exists in the code |
| VCK-27 | In comment threads, the first virtual contributor mentioned in a new thread becomes that thread's virtual contributor. When two are mentioned in one message, the first is asked twice and the second never. **(open: F2)** | — | — | Only the first VC mention starts an interaction (code comment); the double-ask is unexplained. | Not decided: exists in the code |
| VCK-28 | Every later message in that thread goes to the thread's virtual contributor without a new mention. Its own messages are never sent back to it. | — | — | A VC thread is a conversation, not a series of summons; the self-check prevents an infinite loop (code comment). | Not decided: exists in the code |
| VCK-29 | In a direct or group chat, every message goes to every virtual contributor in the chat except the sender. One failing does not stop the others. | — | — | USER–VC conversations where the VC answers every message (040; code comment). | Server spec 040 |
| VCK-30 | A message that is only an attachment never reaches a virtual contributor, in any room. | — | — | "Their body would be a filename, which is no prompt" (code comment). | Not decided: exists in the code |
| VCK-31 | Calling in a virtual contributor is not restricted: anyone who can post in a room can call any virtual contributor on the platform by name, whether or not it is a member of that Space or visible to the poster. **(open: F1)** | — | — | — | Not decided: exists in the code |
| VCK-32 | A question sent to the AI engine carries the virtual contributor's persona and knowledge, its name and description, who asks, the Space of the room, and the thread so far. **(open: OQ1)** | — | — | The engine answers as the VC, with the VC's knowledge, remembering the thread. | Not decided: exists in the code |
| VCK-33 | The answer is posted in the thread as a reply by the virtual contributor, with its sources as a list of links. An answer posted as a new message says "Sorry, no sources are available for this response" when it has none. **(open: Q-VCK-33)** | — | — | — | Not decided: exists in the code |
| VCK-34 | A room lists which virtual contributor answers in which thread, for anyone who may read the room. Chats never record this. **(open: Q-VCK-34)** | — | — | — | Not decided: exists in the code |
| VCK-35 | A virtual contributor can be added to a direct or group chat without asking: the "allow messages" setting applies to users only. **(open: Q-VCK-35)** | — | — | A VC has no messaging preference (code comment). | Not decided: exists in the code |

### Space access, conversion, transfer, reads

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VCK-36 | A virtual contributor can get a role in a Space, or be invited to it, only while the Space's "virtual-contributor access" feature is on. | ENT-30 (`entitlements.md`); feature-flag plan per space (083). | — | — | Entitlement rule ENT-30 (entitlements.md); server spec 083 |
| VCK-37 | A Platform Resource Admin can convert a Space-kind virtual contributor to use a knowledge base: all callouts of its Space move into the knowledge base. A Space holding a form callout is refused up front. Afterwards the virtual contributor still reports the kind "Space" and the old Space. **(open: F6)** | — | — | Converting is a resource move (027 A9); forms cannot be transferred (callout R25); the up-front check exists because the move is not transactional (code comment). | Spec 027 A9; callout rule R25 |
| VCK-38 | A Platform Resource Admin can move a virtual contributor to another account. Its visibility is worked out again for the new account and the move is audited. **(open: F8)** | 027 A9 move-resources family (`account.md` owns the transfer rules). | — | — | Spec 027 A9 (account.md owns the transfer rules) |
| VCK-39 | The roles of any virtual contributor can be read by anyone who knows its id, visitors included. No access check is made. **(defect: F7)** | — | — | — | Not decided: a defect |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. "Account admin" is the admin of the account that owns the virtual contributor. A cell in bold is one a reader may not expect (see F7). Evidence is in Appendix B. Creating, updating and deleting a virtual contributor is in `contributor-management.md`._

### Knowledge base and settings

| ID | Action | Platform roles | Account admin | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|
| W1 | Read the About of a knowledge base | Y¹ | Y | Y² | Y² | Y³ | Y³ |
| W2 | Read the contents of a knowledge base (callouts, files) | Y⁴ | Y | Y⁵ | Y⁵ | Y⁶ | Y⁶ |
| W3 | Add or change callouts in a knowledge base | Y⁷ | Y | N | N | N | N |
| W4 | Change the virtual contributor's settings (contents visible) | Y⁷ | Y | N | N | N | N |
| W5 | Change its platform settings (prompt-graph editing) | Y⁸ | N | N | N | N | N |
| W6 | Ask for a refresh of one virtual contributor's knowledge | Y⁷ | Y | N | N | N | N |
| W7 | Refresh the knowledge of all virtual contributors | Y⁸ | N | – | – | N | N |

¹ Platform Content Full Access; other platform roles as the virtual contributor's visibility allows. ² As the virtual contributor's visibility allows. ³ On public virtual contributors. ⁴ Platform Content Full Access; other platform roles only while "contents visible" is on. ⁵ Only while "contents visible" is on. ⁶ Only while "contents visible" is on, and on public virtual contributors. ⁷ Platform Content Full Access. ⁸ Platform Operations Admin only.

### Well-known virtual contributors

| ID | Action | Platform roles | Account admin | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|
| W8 | Link a well-known role to a virtual contributor | Y¹ | N | N | N | N | N |
| W9 | Read the links | Y | Y | Y | Y | Y | N |

¹ Platform Settings Admin only.

### Rooms

| ID | Action | Platform roles | Account admin | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|
| W10 | Call a virtual contributor into a room by a mention | Y¹ | Y¹ | Y | Y | Y¹ | N |
| W11 | Read which virtual contributor answers in which thread of a room | Y² | Y² | Y | Y | Y³ | Y³ |

¹ Where they may post in the room. ² Where they may read the room. ³ On public rooms.

### Space access, conversion, transfer, reads

| ID | Action | Platform roles | Account admin | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|
| W12 | Give a virtual contributor a role in a Space, or invite it¹ | Y² | – | Y | N | N | N |
| W13 | Convert a Space-kind virtual contributor to use a knowledge base | Y³ | N | N | N | N | N |
| W14 | Move a virtual contributor to another account | Y³ | N | – | – | N | N |
| W15 | Read a virtual contributor's roles | Y | Y | Y | Y | **Y** | **Y** |
| W16 | Follow a virtual contributor's live updates | Y⁴ | Y | Y⁵ | Y⁵ | Y⁶ | Y⁶ |

¹ The Space needs the "virtual-contributor access" feature. ² Where the role holds the right to grant roles on the Space's role set. ³ Platform Resource Admin only. ⁴ Where the role may read the virtual contributor. ⁵ As the virtual contributor's visibility allows. ⁶ On public virtual contributors.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 14 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Rooms | decision | Anyone who can post in a room can call in any virtual contributor on the platform, also one that is not a member of the Space and that the poster cannot see. Must a virtual contributor be a member of the Space, or at least visible to the poster, to be called in? | Product Lead (Security Lead for the access risk) | — | open |
| F2 | Rooms | decision | When two virtual contributors are mentioned in one message, the first is asked twice and the second never. Is this a defect (ask each one once), or is the rule one virtual contributor per thread, with extra mentions ignored? | Product Lead, then Technical Lead | — | open |
| F10 | Body of knowledge | decision | The three websites the Guidance virtual contributor reads are fixed in the code and are the production addresses on every environment. Should they be configuration, or are they a product constant? | Product Lead, then Technical Lead | — | open |
| OQ3 | All | decision | Is the virtual contributor UI coming back? Virtual contributors are hidden in the web client since 2026-10-30. The rules here are API rules; whether a user can reach any of them today is a product question. | Product Lead | — | open |
| OQ4 | Knowledge base | spec | Does spec 007 ("knowledge base search") mean to cover the knowledge base of a virtual contributor? It searches per innovation-flow state, which such a knowledge base does not have, while the catalogue lists "search" under it. Confirm the catalogue wording. | Product Lead (Quality Lead corrects the catalogue) | — | open |
| OQ6 | Settings | decision | A test pins that "listed in store" plays no part in what an unrelated user sees. Is that the intended product rule, or a store feature that is missing? (See F3.) | Product Lead | — | open |
| CONST | All | decision | 25 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? Among them are the default names, the three guidance websites and the texts users see. | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |
| Q-VCK-02 | Knowledge base | decision | Why does a knowledge base get the name "Knowledge Base" and, for the knowledge-base kind, the default callouts? No source states a reason. | Product Lead | — | open |
| Q-VCK-10 | Body of knowledge | decision | Why does the Guidance virtual contributor ignore its own source of knowledge and read three fixed websites? No source states a reason. (F10 asks where the list should live.) | Product Lead | — | open |
| Q-VCK-12 | Body of knowledge | decision | Why is the ready state the only change of a virtual contributor that is pushed live? No source states a reason. | Product Lead | — | open |
| Q-VCK-25 | Well-known | decision | Why does the configuration report whether the guidance engine is on, when the server refuses nothing if it is off? No source states a reason. | Product Lead | — | open |
| Q-VCK-33 | Rooms | decision | Why is an answer formatted this way: sources as links, and the "Sorry, no sources are available" line only on a new message? No source states a reason. | Product Lead | — | open |
| Q-VCK-34 | Rooms | decision | Why does a room list which virtual contributor answers in which thread, and why do chats never record it? No source states a reason. | Product Lead | — | open |
| Q-VCK-35 | Rooms | decision | Why can a virtual contributor be added to a chat without any consent check? The only reason found is a code comment: a virtual contributor has no messaging preference. | Product Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Settings | decision | Six stored attributes of a virtual contributor have no effect on the server: prompt-graph editing, data-access mode, interaction modes, prompt-graph definition, listed in store, and the always-empty knowledge space. Which stay as switches for the client, which go to the AI engine, and which are dead? | Technical Lead (Product Lead for "listed in store", OQ6) | — | open |
| F6 | Conversion | defect | Converting a virtual contributor moves the callouts into its knowledge base, but it still reports the kind "Space" and the old, now empty Space. Set the kind and id on success, or describe the conversion as a move of content only? | Technical Lead (Product Lead confirms what a conversion means) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 8 to answer, 5 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Settings | decision | Six stored attributes of a virtual contributor have no effect on the server: prompt-graph editing, data-access mode, interaction modes, prompt-graph definition, listed in store, and the always-empty knowledge space. Which stay as switches for the client, which go to the AI engine, and which are dead? | Technical Lead (Product Lead for "listed in store", OQ6) | — | open |
| F4 | Knowledge base | tidy-up | The update of a knowledge base accepts a full profile but saves only the description. Save everything, or narrow what the update accepts? | Technical Lead | — | open |
| F6 | Conversion | defect | Converting a virtual contributor moves the callouts into its knowledge base, but it still reports the kind "Space" and the old, now empty Space. Set the kind and id on success, or describe the conversion as a move of content only? | Technical Lead (Product Lead confirms what a conversion means) | — | open |
| F8 | Transfer | tidy-up | The "move a virtual contributor to another account" call declares that it returns an innovation pack, while it returns a virtual contributor. Fix the API description? | Technical Lead | Schema fix (breaking change report). | suggested |
| F9 | Body of knowledge | tidy-up | Every time a virtual contributor gets a Space role, the server asks for the Space to be read as "context", but that context is never used. Drop the request or start using it? | Technical Lead | — | open |
| F11 | Well-known | decision | A well-known link can be set but never cleared. Add a way to clear it, or accept? | Technical Lead | — | open |
| OQ1 | Rooms | check | Does the AI engine use what the server sends and stores (the context id, data-access mode, interaction modes, prompt-graph definition)? The engine code was not read. Someone who knows the engine must say which are live. | Technical Lead | — | open |
| OQ7 | Body of knowledge | check | Can the web client ask for a knowledge refresh at all, and how does a new virtual contributor get its knowledge read in for the first time? Nothing in the server does it at creation. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Rooms | decision | When two virtual contributors are mentioned in one message, the first is asked twice and the second never. Is this a defect (ask each one once), or is the rule one virtual contributor per thread, with extra mentions ignored? | Product Lead, then Technical Lead | — | open |
| F5 | Knowledge base | defect | The Space id of a Space-kind virtual contributor is never checked. On acceptance 10 virtual contributors point at nothing and 159 personas are orphans, and the cause is still live. Is that an incident or a backlog defect? Then: check at creation (an existing Space, on the same account?), and decide what a virtual contributor with a dangling Space should report. | Incident Lead, then Technical Lead | — | open |
| F7 | Reads | defect | Anyone, visitors included, can read the roles of any virtual contributor by its id. Close it? | Security Lead (Technical Lead fixes it) | Check the read right on the virtual contributor, as the lookup of a virtual contributor already does. | suggested |
| F10 | Body of knowledge | decision | The three websites the Guidance virtual contributor reads are fixed in the code and are the production addresses on every environment. Should they be configuration, or are they a product constant? | Product Lead, then Technical Lead | — | open |
| CONST | All | decision | 25 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? Among them are the default names, the three guidance websites and the texts users see. | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| GAPS | All | test | 26 rules have no test, 5 more are only partly tested, and 10 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ4 | Knowledge base | spec | Does spec 007 ("knowledge base search") mean to cover the knowledge base of a virtual contributor? It searches per innovation-flow state, which such a knowledge base does not have, while the catalogue lists "search" under it. Confirm the catalogue wording. | Product Lead (Quality Lead corrects the catalogue) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Reads | defect | Anyone, visitors included, can read the roles of any virtual contributor by its id. Close it? | Security Lead (Technical Lead fixes it) | Check the read right on the virtual contributor, as the lookup of a virtual contributor already does. | suggested |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Rooms | decision | Anyone who can post in a room can call in any virtual contributor on the platform, also one that is not a member of the Space and that the poster cannot see. Must a virtual contributor be a member of the Space, or at least visible to the poster, to be called in? | Product Lead (Security Lead for the access risk) | — | open |

### Incident Lead

[Incident Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Enablement/Sub-circles/Incident%20Response/Roles/Incident%20Lead.md) · Enablement › Incident Response (Neil, Simone) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Knowledge base | defect | The Space id of a Space-kind virtual contributor is never checked. On acceptance 10 virtual contributors point at nothing and 159 personas are orphans, and the cause is still live. Is that an incident or a backlog defect? Then: check at creation (an existing Space, on the same account?), and decide what a virtual contributor with a dangling Space should report. | Incident Lead, then Technical Lead | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | Well-known | check | Which virtual contributor is the chat-guidance link pointing at on acceptance and production today, after the two repair migrations? One live read of the links and of a sample guidance chat. | Service Operations Lead | — | open |
| OQ5 | Body of knowledge | check | Which queues for reading in knowledge and for its results exist on each environment? Without them VCK-09 and VCK-11 cannot be exercised on the test environment. | Service Operations Lead | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F12 | Body of knowledge | contract | The live update is the only signal that a virtual contributor became ready, and the rebuild drops live updates. How does the new client learn that a virtual contributor is ready (ask for its status from time to time)? | Architecture Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `register ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| VCK-01 | Every virtual contributor owns exactly one knowledge base — a profile plus a callouts set of kind "knowledge base" with one empty free-form tagset — created in the same transaction as the VC and its AI persona, so a failed creation leaves no orphan. | account admin, PCFA | code › `src/domain/community/virtual-contributor/virtual.contributor.service.ts:120-134, 168-192` · `src/domain/common/knowledge-base/knowledge.base.service.ts:42-129` · test › `callout/form/form-placement-guards` › `positive control: the same knowledge base is created with a NONE callout`; `collabora/collabora-editor-url` › setup (KB callouts set exists) | proven (existence); the atomicity clause is untested |
| VCK-02 | A knowledge base created without a name is called "Knowledge Base"; a knowledge-base-kind VC created without callouts receives the platform's default "subspace knowledge" callouts, every other kind starts empty, and callouts supplied by the creator are used as given. | account admin | code › `src/domain/community/virtual-contributor-defaults/virtual.contributor.defaults.service.ts:356-404` · `src/domain/space/account/account.service.ts:480-486` | untested |
| VCK-03 | For a knowledge-base-kind VC the body-of-knowledge id is the knowledge base's own id (any supplied id is overwritten); for a space-kind VC it is whatever id the creator supplied, stored without checking that such a space exists. | account admin | code › `virtual.contributor.service.ts:177-182` · `dto/virtual.contributor.dto.create.ts:43-48` · test › `contributor-management/virtual-contributor/vc` › `query virtual contributor data` (space id read back) · register › `acc-defect-register.md:73` (E5: 10 VCs point nowhere) | proven (see F5) |
| VCK-04 | A FORM callout can never be seeded into a knowledge base at creation nor added to one later ("FORM_FRAMING_NOT_ALLOWED" / bad user input), while any other callout kind can. | account admin | test › `callout/form/form-placement-guards` › `a virtual contributor knowledge base cannot be seeded with a FORM callout`, `positive control: the same knowledge base is created with a NONE callout`, `a FORM callout cannot be added to an existing knowledge base (US1-AS3)` · spec › callout area (R25) | proven |
| VCK-05 | Whoever may read the VC may always read the knowledge base's about (profile); its callouts, posts and files are readable by those same readers only while the VC's "knowledge-base contents visible" setting is on; the callouts set carries no space-style role rules, so only the VC's account admin (and content-full-access) can add or change knowledge-base content. | VC readers, account admin, PCFA | code › `src/domain/common/knowledge-base/knowledge.base.service.authorization.ts:289-354` · `virtual.contributor.service.authorization.ts:84-88, 139-147` · test › `contributor-management/virtual-contributor/knowledge-base-access` › all four blocks (CM-47) · matrix › `access-matrix.md:1136-1175` | proven (CM-47 owns the cases; CM finding 14 applies) |
| VCK-06 | A Collabora document callout can be created inside a knowledge base and its editor opens even though the document has no space to attribute analytics to. | account admin | test › `collabora/collabora-editor-url` › `opens normally even though attribution cannot resolve a Space` · spec › server `specs/110-collabora-editor-url-latency/spec.md` | proven |
| VCK-07 | Updating a VC may change the knowledge base's description, and nothing else about the knowledge base's profile, even though the update accepts a full profile. | account admin | code › `virtual.contributor.service.ts:339-345` · `dto/virtual.contributor.dto.update.ts:91-98` | untested (see F4) |
| VCK-08 | The server offers no search scoped to a VC's knowledge base; knowledge-base content reaches a user only by browsing the callouts set, and reaches the engine only through ingest. | — | code › grep `src/services/api/search` (no knowledge-base path) · spec › `agents-hq/specs/007-knowledge-base-search/spec.md:158-169` (FR-001, FR-008, FR-012) | untested |
| VCK-09 | A refresh of a VC's body of knowledge (asked by whoever may update the VC — CM-53) publishes one knowledge-ingest command naming the body-of-knowledge id, its kind and the persona for the kinds space, knowledge base and website, and does nothing (answers "false") for the kinds none and other. | account admin | code › `virtual.contributor.service.ts:524-550` · `src/services/ai-server/ai-server/ai.server.service.ts:276-313` · `src/services/infrastructure/event-bus/messages/ingest.body.of.knowledge.command.ts:12-19` | untested |
| VCK-10 | A guidance-engine VC ignores its own body of knowledge: a refresh ingests three fixed Alkemio websites (documentation, alkemio.org, welcome page) instead. | account admin, POA | code › `ai.server.service.ts:287-303` | untested |
| VCK-11 | A VC's "last ingested" stamp is set when a knowledge-purpose ingest reports success (to the reported time), cleared when the ingest fails on vector insertion (the VC drops back to "initializing"), and left alone on any other failure or on a context-purpose result; a website ingest sets it on anything but an explicit failure. | server | code › `src/services/infrastructure/event-bus/handlers/ingest.body.of.knowledge.result.handler.ts:70-108` · `handlers/ingest.website.result.handler.ts:128-160` · `ai.server.service.ts:236-274` | untested |
| VCK-12 | Every change of the stamp is pushed to subscribers of that VC's updates; subscribing needs read on the VC and delivers only that VC's events; no other change to a VC (profile, settings, visibility) is pushed. | VC readers | code › `ai.server.service.ts:253-273` · `src/services/subscriptions/subscription-service/subscription.publish.service.ts:134-150` · `virtual.contributor.resolver.subscriptions.ts:327-373` | untested |
| VCK-13 | A Platform Operations Admin can ask for every VC's body of knowledge to be refreshed at once; one VC's failure is logged and the rest continue; the call always answers "true" and writes an operations audit row. | POA | code › `src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts:174-206` · `virtual.contributor.service.ts:552-569` · test › `platform-roles/_support/groups/a11` › `A11.refreshAllBodiesOfKnowledge` (14 roles) · spec › `agents-hq/specs/032-platform-ops-admin-role/spec.md:164` | proven (gate and payload); the per-VC continue-on-failure clause is untested |
| VCK-14 | Whenever a VC is given a role in a space, a context-purpose ingest of that space is requested in the background; context results never touch the stamp and the context is not consulted when the VC is asked a question. | space admin (indirectly) | code › `src/domain/access/role-set/role.set.service.ts:2866-2875` · `ai.server.service.ts:315-323, 325-337, 460-484` · `ingest.body.of.knowledge.result.handler.ts:78-90` | untested (see F9) |
| VCK-15 | A VC's settings hold one privacy switch, "knowledge-base contents visible", off by default; whoever may update the VC can change it, an omitted value leaves the stored one, and the VC's authorization is recomputed at once so the switch takes effect without a reset. | account admin, PCFA | code › `src/domain/community/virtual-contributor-settings/virtual.contributor.settings.service.ts:262-279` · `definition/virtual.contributor.settings.default.ts:246-250` · `virtual.contributor.resolver.mutations.ts:338-389` · test › `knowledge-base-access` › every block toggles it and the privilege tables change (CM-47) | proven (effect); the omitted-value clause is untested |
| VCK-16 | A VC's platform settings hold one switch, "prompt-graph editing enabled", off by default, changed only by a Platform Operations Admin (CM-49); no server behaviour reads it — it is a client-side gate. | POA | code › `src/domain/community/virtual-contributor-platform-settings/virtual.contributor.platform.settings.service.ts:310-317` · `virtual.contributor.service.ts:116-118` · grep: no reader | untested (see F3) |
| VCK-17 | A VC's data-access mode (default "space profile and contents"), interaction modes (default "discussion tagging"), body-of-knowledge description and prompt-graph definition are stored and returned exactly as written and nothing on the server acts on them. | account admin | code › `virtual.contributor.entity.ts:437-467` · `dto/virtual.contributor.dto.create.ts:29-61` · `virtual.contributor.service.ts:347-368` · grep: no reader outside the VC folder | untested (see F3) |
| VCK-18 | A VC's "knowledge space" field is always empty, whatever its body-of-knowledge kind. | VC readers | code › `virtual.contributor.interface.ts:570-575` (declared) · grep: no resolver | untested (see F3) |
| VCK-19 | A VC is marked "listed in store" (on by default, changeable by the account admin — CM-48) but no listing, search or hosted-resources read honours the mark. | account admin | code › `virtual.contributor.service.ts:106` · grep: readers are packs/hubs only · test › `account/hosted-resources` › `an unrelated registered user sees the PUBLIC pack and the HIDDEN hub only; the store-listed ACCOUNT VC stays hidden` | proven (see F3) |
| VCK-20 | The platform keeps one mapping from a well-known kind (chat guidance, steward-ownership expert) to a VC; only a Platform Settings Admin can set it, setting replaces the kind's previous VC, there is no way to clear a kind, and every change writes a configuration audit row. | PSA | code › `src/platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.resolver.mutations.ts:106-187` · `…service.ts:43-78` · test › `platform-roles/_support/groups/a10` › `A10.setPlatformWellKnownVirtualContributor` (14 roles; read-back, restore; "no unset" comment) | proven (the audit row is untested) |
| VCK-21 | Any signed-in user can read the mapping (anonymous visitors cannot), and every readable VC says which well-known kind, if any, it is mapped to. | registered | code › `src/platform/platform/platform.resolver.fields.ts:125-146` · `platform.service.authorization.ts:218-233` · `virtual.contributor.resolver.fields.ts:43-66` · test › `a10` (read as registered reader) · spec › server `specs/040-group-conversations/spec.md:115` | proven (registered read); anonymous refusal untested |
| VCK-22 | A fresh platform always has a chat-guidance VC: if the kind is unmapped at start-up the server creates a VC named "Guidance" (guidance engine, website body of knowledge, no data access) on the host organisation's account and maps it. | server (bootstrap) | code › `src/core/bootstrap/bootstrap.service.ts:1005-1083` | untested |
| VCK-23 | A new user's guidance conversation is opened with whichever VC the chat-guidance kind maps to; if the kind is unmapped the opening is refused ("Well-known virtual contributor not found") and, at registration, the failure is logged and the user is still created. | server | code › `src/domain/community/user/user.service.ts:650-675` · `src/domain/communication/messaging/messaging.service.ts:424-436` · `src/domain/communication/conversation/conversation.service.ts:584-603` | untested (CM-09 covers the best-effort clause) |
| VCK-24 | When the guidance VC was recreated under a new identity, the mapping is pointed back at the VC actor already present in users' existing guidance conversations — only when exactly one such actor exists — so old conversations keep working. | server (migration) | code › `src/migrations/1773800000002-FixGuidanceVCMemberships.ts:1-40` · `1773800000001-FixWellKnownVCMappingsFormat.ts` | untested |
| VCK-25 | The platform configuration reports whether the guidance engine is enabled (default on); the server does not refuse anything when it is off. | all | code › `alkemio.yml:782-783` · `src/platform/configuration/config/config.service.ts:116-121` · `messaging.service.ts:796-800` (helper, no caller found) | untested |
| VCK-26 | A VC is summoned in a room message by a mention link whose path ends in `/vc/<its nameID>`; a mention of an unknown nameID makes the whole message fail ("Unable to find VirtualContributor with NameID"). | room posters | code › `src/domain/communication/room-mentions/room.mentions.service.ts:24-27, 163-205` · `src/domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service.ts:110-130` | untested |
| VCK-27 | In a thread-based room (callout or post comments, discussions, updates) the first VC mentioned in a new thread becomes the thread's VC, recorded on the room; the message is sent to that VC — and when two different VCs are mentioned in one message, the first one is asked twice and the second never. | room posters | code › `room.mentions.service.ts:72-116` · `src/services/event-handlers/internal/message-inbox/vc.invocation.service.ts:400-439` | untested (see F2) |
| VCK-28 | Every later message in that thread, by anyone but the thread's VC, is sent to the thread's VC without a mention; the VC's own messages are never fed back to it. | room posters | code › `vc.invocation.service.ts:360-394` · `message.inbox.service.ts:455-471` | untested |
| VCK-29 | In a direct or group conversation every message is sent to every VC member of the room except the sender, in parallel; one VC's failure is logged and does not stop the others. | conversation members | code › `vc.invocation.service.ts:274-354` · `message.inbox.service.ts:448-453` · spec › server `specs/040-group-conversations/spec.md:30, 125` | untested |
| VCK-30 | A message that is only an attachment (empty text, or text equal to the single attachment's file name) never reaches a VC, in any room. | room posters | code › `src/domain/communication/message-attachment/attachment.only.message.ts:11-19` · `message.inbox.service.ts:184-200` | untested |
| VCK-31 | Summoning is not gated: anyone who can post in a room can summon any VC on the platform by nameID, whether or not the VC is a member of that space or readable by the poster; the space's VC flag (VCK-36) governs membership only. | room posters | code › `room.mentions.service.ts:72-116` (no membership or READ check) · `vc.invocation.service.ts:400-439` | untested (see F1) |
| VCK-32 | A question handed to the engine carries the VC's persona, body-of-knowledge id, display name and description, the asker's actor id, the space the room belongs to as context (empty for conversations) and, for a known thread, the engine's own thread id. | server | code › `src/domain/communication/virtual.contributor.message/virtual.contributor.message.service.ts:296-386` | untested |
| VCK-33 | The VC's answer is posted in the thread as a reply by the VC, with any sources appended as a list of links; an answer posted as a new room message adds a "Sources:" heading or, with none, "Sorry, no sources are available for this response"; the engine's thread id from the first answer is stored on the thread and reused. | server | code › `src/services/room-integration/room.controller.service.ts:61-127` · `src/services/ai-server/ai-server/ai.server.service.ts:199-218, 631-637` | untested |
| VCK-34 | A room lists its VC interactions (thread id + VC) to anyone who may read the room; a new room has none, and conversation rooms never record any. | room readers | code › `src/domain/communication/room/room.resolver.fields.ts:546-564` · `room/room.service.ts:42, 80` · `room-lookup/room.lookup.service.ts:501-531` · matrix › `access-matrix.md:443-460` | untested |
| VCK-35 | A VC can be added to a direct or group conversation without any consent check — the inbound-messaging consent applies to users only. | conversation creators | code › `src/domain/communication/messaging/messaging.service.ts:250-280` | untested |
| VCK-36 | A VC can be given a role in, or invited to, a space only while the space's "virtual-contributor access" flag is on ("Entitlement space-flag-virtual-contributor-access is not available"). | space admin / lead | code › `src/domain/access/role-set/role.set.resolver.mutations.ts:655-665` · `role.set.resolver.mutations.membership.ts:489-498` · test › `contributor-management/virtual-contributor/vc-access` › all blocks | proven (cross-ref ENT-30) |
| VCK-37 | A Platform Resource Admin can convert a space-kind VC into a knowledge-base VC: the VC must be space-kind with a body-of-knowledge space on the same account; if that space holds a FORM callout the conversion is refused up front and the space is untouched; otherwise every callout of the space moves into the VC's knowledge base — but the VC still reports kind "space" and the old space id afterwards. | PRA | code › `src/services/api/conversion/conversion.resolver.mutations.ts:60-78, 387-516` · test › `callout/form/form-placement-guards` › `a virtual contributor cannot be converted to a knowledge base while the space holds a FORM, and the space is left untouched`; `platform-roles/_support/groups/a9` › `A9.convertVirtualContributorToUseKnowledgeBase` (14 roles) | proven (see F6) |
| VCK-38 | A Platform Resource Admin can move a VC to another account; its visibility is recomputed against the new account's spaces and the move is audited. | PRA | code › `src/domain/space/account/account.resolver.mutations.ts:570-630` · test › `a9` › `A9.transferVirtualContributorToAccount` | proven (cross-ref account area) |
| VCK-39 | The roles (credentials) of any VC can be read by anyone who knows its id — no authorization is checked. | anonymous, registered | code › `src/services/api/roles/roles.resolver.queries.ts:51-58` · `roles.service.ts:67-78` | untested (see F7) |

### B. Rights: evidence

_The evidence line of the former who-may table, with the legend that table used._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `knowledge.base.service.authorization.ts:289-354`; `virtual.contributor.service.authorization.ts:186-247` (account-admin manage rule, POA platform-settings rule); `virtual.contributor.resolver.mutations.ts:314-319, 364-368, 405-410, 474-478`; `admin.authorization.resolver.mutations.ts:183-187`; `platform.well.known.virtual.contributors.resolver.mutations.ts:125-157`; `platform.resolver.fields.ts:134-140` + `platform.service.authorization.ts:218-233`; `room.mentions.service.ts:72-116`; `room.resolver.fields.ts:551-556`; `role.set.resolver.mutations.ts:655-665`; `conversion.resolver.mutations.ts:72-78, 392-397`; `account.resolver.mutations.ts:584-596`; `roles.service.ts:67-78`; `virtual.contributor.resolver.subscriptions.ts:360-365`; access matrix §virtual-contributor (`access-matrix.md:1098-1134`), §knowledge-base (`:1136-1175`), §room (`:443-460`), §platform (`:118-140`), crosscheck rows A9, A10, A11 (`access-matrix-crosscheck.md:133, 139, 145, 155`) and F6 (`:65`, in-memory gates). The platform-roles capability groups assign plans and VC flags as the harness admin, whose credential set is not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and its ask. Inside these texts the old spelling "F-3" means F3._

#### Findings

- **F1 — Summoning a VC is ungated (VCK-31).** Code: `room.mentions.service.ts:72-116` resolves the mention by nameID and invokes without checking that the VC is a member of the space, readable by the poster, or even enabled for the account; the space VC flag (ENT-30/VCK-36) gates role assignment only. Test: none. Spec: 040 speaks only of conversation membership. Ruling: must a VC be a member of the space (or at least readable by the poster) to be summoned?
- **F2 — Two VC mentions in one message ask the first VC twice (VCK-27).** Code: the loop creates the interaction for the first mention and then invokes `vcInteraction.virtualContributorID` on every iteration. Test: none. Spec: none. Ruling: defect (invoke each mentioned VC once) or rule (one VC per thread, extra mentions ignored)?
- **F3 — Six stored VC attributes have no server effect (VCK-16…19).** Code: `promptGraphEditingEnabled`, `dataAccessMode`, `interactionModes`, `promptGraphDefinition`, `listedInStore` have no reader outside the VC folder; `knowledgeSpace` has no resolver and is always null. Test: `hosted-resources` pins that `listedInStore` plays no part. Spec: CM-52's model card prints a *fixed* data-access sheet, not `dataAccessMode`. Ruling: which of these are client-only switches to keep, which go to the engine, and which are dead?
- **F4 — Knowledge-base profile update accepts a full profile but applies only the description (VCK-07).** Code: `UpdateKnowledgeBaseInput.profile` is an `UpdateProfileInput`; the service copies `description` only. Test/spec: none. Ruling: implement or narrow the input.
- **F5 — Space-kind body-of-knowledge id is never validated (VCK-03).** Code: free string at create; register E5 counts 10 VCs whose id points nowhere and 159 orphan personas. Test: the read-back case only. Ruling: validate at create (existing space, same account?) and decide what a dangling VC should report.
- **F6 — Conversion moves the callouts but not the kind (VCK-37).** Code: `bodyOfKnowledgeType` stays `alkemio-space` and `bodyOfKnowledgeID` keeps the (now emptied) space id after `convertVirtualContributorToUseKnowledgeBase`; the mutation description says "to be of type KNOWLEDGE_BASE". Test: a9 asserts the callout moved; `platform-roles-test-plan.md:205` already flags "the VC type label does NOT change — separate product finding". Ruling: set kind + id on success, or document the conversion as a content move.
- **F7 — `rolesVirtualContributor` is ungated (VCK-39).** Code: returns any VC's credentials to any caller including anonymous. Mirrors CM finding 7 (`virtualContributor(ID)` ungated). Ruling: gate on READ of the VC, as `lookup.virtualContributor` does.
- **F8 — Transfer VC returns the wrong GraphQL type.** Code/schema: `transferVirtualContributorToAccount` is declared `IInnovationPack` (`account.resolver.mutations.ts:569-571`, `schema.graphql:5320`) while resolving a VC. Test: a9 reads only `id`. Ruling: schema fix (breaking change report).
- **F9 — Context ingest is requested but never used (VCK-14).** Code: every VC role grant publishes a context-purpose space ingest; the invocation path has the context check commented out and logs "still need to use the context". Spec: none. Ruling: drop the context ingest or wire it.
- **F10 — Guidance ingest URLs are hard-coded (VCK-10).** Code: three production URLs in `ai.server.service.ts:288-292`, ignoring the VC's own body of knowledge and the environment. Ruling: configuration or product constant?
- **F11 — No way to clear a well-known mapping (VCK-20).** Code: set-only; the a10 group refuses to run when CHAT_GUIDANCE had no mapping because it could not be restored. Ruling: add an unset, or accept.
- **F12 — The subscription is the only live signal and it is on the retire list (VCK-12).** Code: `virtualContributorUpdated` fires only on the ready stamp; the rebuild drops subscriptions. Ruling: how the new client learns a VC became ready (poll `status`?).

#### Open questions

- **OQ1 — Does the engine use what the server sends?** `contextID`, `dataAccessMode`, `interactionModes` and the prompt-graph definition are stored or forwarded but the server never acts on them; the engine repos (`virtual-contributor` @ `04ba7bd` 2026-08-04, `virtual-contributor-engine-libra-flow` @ `53d5546` 2026-07-21, local clones that may be stale) were not read. Someone who knows the engine must say which attributes are live.
- **OQ2 — Which VC the CHAT_GUIDANCE mapping points at on acceptance/production today**, after the two repair migrations (`1773800000001`, `1773800000002`) — a live read of `platform.wellKnownVirtualContributors` and of a sample guidance conversation's members.
- **OQ3 — Is the VC UI coming back?** VCs are hidden in the client since 2026-10-30 (journey 9 parked; the pinned guidance conversation hidden by client-web#10434 in v0.169.1). The rules above are API rules; whether any of them is user-reachable today is a product question, not a rule.
- **OQ4 — Does spec 007 ("knowledge base search") intend to cover VC knowledge bases?** The spec scopes search by innovation-flow state, which a VC knowledge base does not have; the catalogue row AI-1 lists "search" under the knowledge base. Confirm the catalogue wording.
- **OQ5 — Which deployed queue bindings exist for the ingest/result queues on each environment** (`alkemio.yml` names are env-overridable); without them VCK-09/11 cannot be exercised on the test stack.
- **OQ6 — Whether `hosted-resources`' "listedInStore plays no part" is the intended product rule** or a missing store feature (F-3).
- **OQ7 — Is the VC refresh (VCK-09) reachable by the client at all?** `refreshVirtualContributorBodyOfKnowledge` is unreached by any lib function (catalogue AI-1 "unreached"); if the client never calls it, the only ingest trigger is creation-time (not found in the server — nothing publishes an ingest on create) or the POA refresh-all. Someone must confirm how a new VC gets its first ingest.

### D. Test gaps

_For the Quality Lead._

Untested rules by id: VCK-02, VCK-07, VCK-08, VCK-09, VCK-10, VCK-11, VCK-12, VCK-14, VCK-16, VCK-17, VCK-18, VCK-22, VCK-23, VCK-24, VCK-25, VCK-26, VCK-27, VCK-28, VCK-29, VCK-30, VCK-31, VCK-32, VCK-33, VCK-34, VCK-35, VCK-39; plus the untested clauses of VCK-01 (atomic create), VCK-13 (continue on failure), VCK-15 (omitted value), VCK-20 (audit row), VCK-21 (anonymous refused).

Behaviours the area has that neither reading nor tests pinned down:
- The end-to-end VC answer in a room (summon → engine → reply posted as the VC with sources) — W2 journey 9, parked while VCs are hidden in the client; no API-level case either (needs a live engine on the stack).
- What a VC does when its body-of-knowledge space is deleted (E5 dangling ids): refresh outcome, status, answers.
- Ingest of a knowledge-base-kind VC after its callouts change (is a re-ingest needed, and who triggers it — the `updateAiPersona` path has a "TBD: trigger a re-ingest?" comment).
- The ready stamp after a *second* ingest that fails for a reason other than vector insert (stays ready — VCK-11) — worth one case once the result queue can be driven.
- Deleting a VC that is bound to open threads: the interaction record stays on the room (nothing cleans `vcInteractionsByThread`); later messages in that thread try to invoke a deleted actor.
- A VC mentioned in a thread it was not started in (a later mention in an existing thread is ignored — VCK-28 path never parses mentions).
- The guidance conversation for a user registered while the mapping was absent (never recreated).
- Setting the well-known mapping to a VC id that does not exist (no existence check in `setMapping`).
- Configuration audit row for the well-known mapping and operations audit row for refresh-all.
- `virtualContributorUpdated` filtering (only the subscribed VC's events).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is unchanged._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Body-of-knowledge kinds (5) | `alkemio-space`, `alkemio-knowledge-base`, `website`, `other`, `none` | `src/common/enums/virtual.contributor.body.of.knowledge.type.ts`; `schema.graphql:1148` | | Technical Lead |
| Create defaults | kind `alkemio-space`; data access `space_profile_and_contents`; interaction modes `[discussion-tagging]`; `listedInStore` true; visibility `account`; settings `{privacy.knowledgeBaseContentVisible:false}`; platform settings `{promptGraphEditingEnabled:false}` | `dto/virtual.contributor.dto.create.ts:29-61`; `virtual.contributor.service.ts:106-118` | | Product Lead |
| Knowledge-base defaults | profile name `Knowledge Base`; callouts set kind `knowledge-base`; tagset `default` (freeform, empty); default callouts from template default `PLATFORM_SUBSPACE_KNOWLEDGE` (knowledge-base kind only) | `virtual.contributor.defaults.service.ts:382-401`; `knowledge.base.service.ts:55-70`; `account.service.ts:480-483` | | Product Lead |
| Guidance VC seed | name `Guidance`, description `Guidance Virtual Contributor`, engine `guidance`, data access `none`, kind `website`, KB `Knowledge Base for Virtual Contributor`, on the host organisation `DEFAULT_HOST_ORG_NAMEID` | `bootstrap.service.ts:1030-1053` | | Product Lead |
| Guidance ingest websites (3) | `https://alkem.io/documentation`, `https://www.alkemio.org`, `https://welcome.alkem.io` | `ai.server.service.ts:288-292` | | Product Lead |
| Ingestion purposes | `knowledge`, `context` | `ingest.body.of.knowledge.command.ts:5-8` | | Technical Lead |
| Ingest result values / error code that clears the stamp | `success`, `failure`; `VECTOR_INSERT` | `messages/types/ingestion.result.ts`; `ingest.body.of.knowledge.result.handler.ts:102` | | Technical Lead |
| Queues | `virtual-contributor-ingest-body-of-knowledge[-result]`, `virtual-contributor-ingest-website[-result]`, `virtual-contributor-invoke-engine-result` (env-overridable) | `alkemio.yml:464-468` | | Technical Lead |
| Well-known kinds (2) | `CHAT_GUIDANCE`, `STEWARD_OWNERSHIP_EXPERT` | `virtual.contributor.well.known.ts`; `schema.graphql:1188` | | Product Lead |
| Well-known storage shape | `platform.wellKnownVirtualContributors = {mappings:[{wellKnown, virtualContributorID}]}` | `…service.ts:34-40, 58-68`; migration `1773800000001` | | Technical Lead |
| Guidance feature flag | `platform.guidance_engine.enabled` default `true` (`GUIDANCE_ENGINE_ENABLED`); exposed as `GUIDENCE_ENGINE` | `alkemio.yml:782-783`; `config.service.ts:116-121` | | Technical Lead |
| Mention syntax | `[@…](http(s)://…/(user\|organization\|vc)/<nameid>)`; VC path segment `vc` | `room.mentions.service.ts:24-27`; `mention.interface.ts:2-4` | | Technical Lead |
| Thread id rule | `message.threadID \|\| message.id`; conversations use the message id | `message.inbox.service.ts:457`; `vc.invocation.service.ts:323` | | Technical Lead |
| Attachment-only rule | no attachments → false; empty text → true; exactly one attachment whose display name equals the text → true | `attachment.only.message.ts:11-19` | | Technical Lead |
| Interaction record | `room.vcData.interactionsByThread[threadID] = {virtualContributorActorID, externalThreadId?}` | `room.entity.ts:28-45`; migration `1771000015000` | | Technical Lead |
| Reply formatting | sources as `- [title‖uri](uri)` lines; `\n##### Sources:` label and `*Sorry, no sources are available for this response*` only for room-level posts | `room.controller.service.ts:103-127` | | Product Lead |
| Result actions | `postReply`, `postMessage`, `none` | `dto/virtual.contributor.dto.invocation.input.ts:167-171` | | Technical Lead |
| History length | `platform.virtual_contributors.history_length` default 30 (`VC_HISTORY_LENGTH`) | `alkemio.yml:791` | | Product Lead |
| Conversion refusal texts | `Virtual Contributor is not of type Space: <id>`; `Virtual Contributor does not have a body of knowledge: <id>`; `Virtual Contributor and Space do not belong to the same account: <id>`; `A space with a Form callout cannot be converted to a knowledge base` (code `FORM_TRANSFER_NOT_ALLOWED`) | `conversion.resolver.mutations.ts:423-470` | | Technical Lead |
| Lookup refusal texts | `Unable to find VirtualContributor with NameID` (details carry the nameID); `Unable to find Virtual with ID: <id>`; `Unable to find knowledge base for VirtualContributor: <id>`; `AI Persona ID not set for VirtualContributor <id>` | `virtual.contributor.lookup.service.ts:122-127`; `virtual.contributor.service.ts:462-467, 631-636`; `virtual.contributor.message.service.ts:309-314` | | Technical Lead |
| Well-known refusal text | `Well-known virtual contributor not found` | `conversation.service.ts:592-596` | | Technical Lead |
| VC flag refusal text | `Entitlement space-flag-virtual-contributor-access is not available for License: <id>` (ENT-30) | `license.service.ts:202` | | Technical Lead |
| Roles owning the gates | account admin (CRUD, contribute, notifications, rename); `platform-operations-admin` (platform settings, refresh-all); `platform-settings-admin` (well-known); `platform-resource-admin` (convert, transfer); `platform-content-full-access` (root cascade) | `virtual.contributor.service.authorization.ts:199-235`; resolvers above | | Security Lead |
| Audit rows | configuration `wellKnownVirtualContributor:<kind>`; operations `refreshAllBodiesOfKnowledge`; resource `moved` for convert / transfer | `…well.known…resolver.mutations.ts:165-174`; `admin.authorization.resolver.mutations.ts:195-206`; `conversion.resolver.mutations.ts:518-540`; `account.resolver.mutations.ts:612-623` | | Security Lead |
| GraphQL surface | `VirtualContributor{knowledgeBase, knowledgeSpace, bodyOfKnowledgeType/ID/Description/LastUpdated, settings, platformSettings, dataAccessMode, interactionModes, promptGraphDefinition, listedInStore, status, wellKnownVirtualContributor}`, `KnowledgeBase{profile, calloutsSet, authorization}`, `VirtualContributorSettings{privacy{knowledgeBaseContentVisible}}`, `VirtualContributorPlatformSettings{promptGraphEditingEnabled}`, `Platform.wellKnownVirtualContributors`, `PlatformWellKnownVirtualContributors{mappings}`, `Room.vcInteractions`, `VcInteraction{threadID, virtualContributorID}`; mutations `updateVirtualContributorSettings`, `updateVirtualContributorPlatformSettings`, `refreshVirtualContributorBodyOfKnowledge`, `refreshAllBodiesOfKnowledge`, `setPlatformWellKnownVirtualContributor`, `convertVirtualContributorToUseKnowledgeBase`, `transferVirtualContributorToAccount` (returns `InnovationPack!`); queries `rolesVirtualContributor`; subscription `virtualContributorUpdated` | `schema.graphql:4075, 4986, 5200, 5204, 5300, 5320, 5464-5470, 5765-5767, 6003, 6382, 6874, 7471, 8171, 8201-8311` | | Technical Lead |

### F. Where this lands in the new core

The catalogue puts AI-1 at "agent (kind vc) + ai_engine registry" (slices 10–12, verdict partial; W2 journey 9 parked while VCs are hidden in the client). In the rebuild a VC is an `actor` row of kind vc, its knowledge base becomes an ordinary post container (callout/contribution/post collapse into one recursive `post` with a kind — the knowledge base is then just a post tree owned by the VC), its persona is a row in the `ai_engine` registry, and the stored authorization policies plus every reset disappear, so VCK-05/VCK-15 become read-time rules on the VC's visibility and its one privacy flag. RabbitMQ and the matrix-adapter go; chat moves browser → Synapse, so VCK-26…VCK-34 (mention parsing, thread binding, reply posting, interaction records) need a new home — the deck says nothing about who summons a VC and posts its answer once the server no longer sees Matrix traffic, and that is the biggest open design point this table surfaces. Three facts should shape it: (1) summoning today is ungated (F-1), so the new core must decide whether a VC answers only where it is a member; (2) six stored VC attributes have no server behaviour (F-3) and should be dropped or implemented, not migrated blindly; (3) the ready stamp (VCK-11/12) is the only VC state the engine writes back, and the subscription that carries it is on the retire list.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite — this feature (catalogue AI-1, the half not in `contributor-management.md`) has **no folder of its own**, so the proof is the handful of cases of other areas that happen to exercise it — `contributor-management/virtual-contributor` (3 files), `callout/form` (4 cases), `collabora` (1), `account/hosted-resources` (1) and the `platform-roles` capability groups A9, A10, A11 (4 capability rows × 14 roles); the specs, issues and docs listed in § Sources. Scope: the knowledge base (structure, defaults, visibility), body-of-knowledge ingest and the ready stamp, VC settings and platform settings, well-known VCs and the guidance chat, VC invocation in rooms and the interaction records, the VC access flag on spaces, conversion and transfer. Profile, visibility-of-the-VC, create/update/delete, model card and the refresh trigger are CM-45…CM-54 in `contributor-management.md` and are cross-referenced, not redone. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The status legend of the old layout was dropped: proof is now in Appendix A, and open points are markers on the rules.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/community/virtual-contributor/virtual.contributor.service.ts`, `virtual.contributor.service.authorization.ts`, `virtual.contributor.resolver.mutations.ts`, `virtual.contributor.resolver.fields.ts`, `virtual.contributor.resolver.queries.ts`, `virtual.contributor.resolver.subscriptions.ts`, `virtual.contributor.entity.ts`, `virtual.contributor.interface.ts`, `definition/virtual.contributor.settings.default.ts`, `dto/virtual.contributor.dto.create.ts`, `dto/virtual.contributor.dto.update.ts`, `dto/virtual.contributor.dto.update.settings.ts`, `dto/virtual.contributor.dto.update.platform.settings.ts`, `dto/virtual.contributor.dto.invocation.input.ts`, `dto/utils.ts`
- `src/domain/community/virtual-contributor-settings/*`, `virtual-contributor-platform-settings/*`, `virtual-contributor-defaults/virtual.contributor.defaults.service.ts`, `virtual-contributor-lookup/virtual.contributor.lookup.service.ts`
- `src/domain/common/knowledge-base/knowledge.base.service.ts`, `knowledge.base.service.authorization.ts`, `knowledge.base.resolver.fields.ts`, `knowledge.base.interface.ts`, `dto/*`
- `src/platform/platform.well.known.virtual.contributors/*`; `src/platform/platform/platform.resolver.fields.ts`, `platform.service.authorization.ts`; `src/common/constants/authorization/global.policy.constants.ts`
- `src/domain/communication/room-mentions/room.mentions.service.ts`, `virtual.contributor.message/virtual.contributor.message.service.ts`, `vc-interaction/*`, `room/room.entity.ts`, `room/room.service.ts`, `room/room.resolver.fields.ts`, `room-lookup/room.lookup.service.ts`, `message-attachment/attachment.only.message.ts`, `messaging/messaging.service.ts`, `messaging/mention.interface.ts`, `conversation/conversation.service.ts`
- `src/services/event-handlers/internal/message-inbox/message.inbox.service.ts`, `vc.invocation.service.ts`; `src/services/room-integration/room.controller.service.ts`
- `src/services/adapters/ai-server-adapter/ai.server.adapter.ts`; `src/services/ai-server/ai-server/ai.server.service.ts`; `src/services/infrastructure/event-bus/messages/*`, `handlers/*`; `src/services/subscriptions/subscription-service/subscription.publish.service.ts`
- `src/domain/space/account/account.service.ts`, `account.resolver.mutations.ts`, `account.resolver.fields.ts`; `src/domain/access/role-set/role.set.service.ts`, `role.set.resolver.mutations.ts`, `role.set.resolver.mutations.membership.ts`
- `src/services/api/conversion/conversion.resolver.mutations.ts`; `src/services/api/roles/roles.resolver.queries.ts`, `roles.service.ts`; `src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts`; `src/platform-admin/admin/platform.admin.resolver.fields.ts`
- `src/domain/community/user/user.service.ts`; `src/core/bootstrap/bootstrap.service.ts`; `src/platform/configuration/config/config.service.ts`; `src/types/alkemio.config.ts`; `alkemio.yml`
- `src/common/enums/virtual.contributor.*.ts`, `search.visibility.ts`; `src/migrations/1771000015000-MergeRoomVcDataColumns.ts`, `1773800000001-FixWellKnownVCMappingsFormat.ts`, `1773800000002-FixGuidanceVCMemberships.ts`
- `schema.graphql`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/contributor-management/virtual-contributor/knowledge-base-access.it-spec.ts`, `vc-access.it-spec.ts`, `vc.it-spec.ts`, `vc.request.params.ts`, `model-card/engine-types.it-spec.ts`
- `server-api/src/functional-api/callout/form/form-placement-guards.it-spec.ts`; `collabora/collabora-editor-url.it-spec.ts`; `account/hosted-resources.it-spec.ts`
- `server-api/src/functional-api/platform-roles/_support/groups/a9.ts`, `a10.ts`, `a11.ts`, `a22.ts`, `capabilities.data.ts`, `platform-roles-test-plan.md`
- `client-web/src/functional-e2e/chat-avatars/chat-avatars-test-plan.md`, `chat-avatars.helpers.ts` (guidance conversation hidden); manual plans `explore-platform-anonymous-test-plan.md`, `user-profile-test-plan.md`
- `docs/qa/server-rebuild/knowledge/contributor-management.md` (CM-09, CM-45…CM-54), `entitlements.md` (ENT-30), `access-matrix.md` (§platform, §room, §virtual-contributor, §knowledge-base), `access-matrix-crosscheck.md` (A9, A10, A11, F6), `data-integrity/acc-defect-register.md` (E5), `catalogue/README.md` (AI-1), `catalogue/root-fields.md`

Specs / issues:
- `agents-hq/specs/007-knowledge-base-search/spec.md` (FR-001, FR-008, FR-012 — space flow-state search, not VC KB)
- `agents-hq/specs/032-platform-ops-admin-role/spec.md` (FR-002, FR-015 — BoK refresh in the operational family)
- `agents-hq/specs/004-web-ai-assistant/spec.md` (FR-016 — the assistant is a sibling of the VC)
- `agents-hq/worktrees/qa-pr-challenge/specs/027-platform-role-redesign` (A9/A10/A11 ownership, cited by code comments)
- server `specs/040-group-conversations/spec.md`, `specs/027-conversation-consolidation/spec.md`, `specs/020-user-owned-conversations/spec.md`, `specs/110-collabora-editor-url-latency/spec.md`, `specs/083-cross-space-moves/spec.md`
- Siblings (not read beyond README; clones may be stale): `virtual-contributor` @ `04ba7bd` (2026-08-04), `virtual-contributor-engine-libra-flow` @ `53d5546` (2026-07-21)
- Known: `community-manager` engine decommissioned 2026-08-04; other engine repos archived 2026-05-28; VCs hidden in the client since 2026-10-30 (journey 9 parked)
