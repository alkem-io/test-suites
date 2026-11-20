# Media gallery and references: behaviour rules

_What the platform does today for the media gallery of a callout and its items, and for references (named links) on profiles: what it does, why, who may, and what is still to answer. File storage, upload limits and document access belong to the storage area; the rules for image slots are in `visual.md`. It follows the three-section layout accepted in the product review of `communications.md` (alkem-io/test-suites#717): **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**. Product reviewed section 3 on 2026-11-20._

_Open questions per owner: Product Lead 0 · Technical Lead 6 · Quality Lead 5 · Security Lead 2. By state: 11 open · 2 with a suggested answer · 5 decided. Proof of the 18 rules: 5 proven by a test · 13 untested (Appendix A)._

_Whys of the 18 rules: 16 rest on a source or a product decision · 1 technical why is still a QA draft, for the Technical Lead (MED-23) · 2 have none, and each carries an open question (MED-04, MED-22)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit, a pull request, an issue or a document. "Not decided: exists in the code" means the behaviour is in the code and nobody chose it. "Not decided: a defect" means today's behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Media gallery on a callout

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MED-01 | A media gallery exists only as the main content of a callout of the media-gallery kind. It is created with the callout, or when a callout is switched to that kind, and deleted when the callout is switched away from it or deleted. | Richer posts: "If users can easily add and organize attachments, posts will become richer and more engaging, leading to more clicks, views, and reactions" (alkemio#1605). | — | The framing is the callout's own content (CAL-01, PR #5202); a create that fails before the callout is saved must leave no orphan gallery (server#6614, `buildMediaGallery` comment). | Server PR #5202; server#6614 (code comment) |
| MED-02 | A gallery callout made from a template gets the template's images: each one is copied into the new gallery, in the same position. An image that cannot be copied is skipped and the callout is still created. | — | — | Templates copy a definition's content into the new owner's storage so it survives the template (CAL-09; VIS-13 copy rule); a bad template image should not block the whole callout (code comment "skipping"). | Code comment; same copy rule as CAL-09 and VIS-13 |
| MED-03 | Gallery items are added one at a time by whoever may update the gallery. A new item goes last unless a position is given. Items show in position order, and anyone who can read the callout can see them. **(open: OQ1)** | — | — | "Media galleries are the one surface with a variable number of visuals" (VIS-16; server spec 039). | Server spec 039; server PR #5798, whose story is client-web#9184 (the PR text states no intent) |
| MED-04 | Any of the seven kinds of image slot (avatar, banner, card and so on) is accepted as a gallery item, each with its own size limits, although only gallery images and gallery videos are meant. **(open: F2, OQ1)** | — | — | — (the input's description says "e.g. MEDIA_GALLERY_IMAGE, MEDIA_GALLERY_VIDEO"; nothing enforces it) | Not decided: exists in the code |
| MED-05 | Removing an item needs the right to update the gallery. The item disappears, but the uploaded file stays in the gallery's storage. **(open: F6)** | — | As a post author or moderator, I want to remove an attachment after posting (alkemio#1605, must-have scope), so that a wrong or outdated file does not stay on the post. | — | Not decided: exists in the code; removal by author or moderator: alkemio#1605; Product, 2026-11-20 (F5): the file stays as today, deleting it is a wish on the product issues list |
| MED-06 | There is no limit on the number of items, two items can share a position, and an item's position cannot be changed: to reorder, remove the item and add it again. **(open: OQ1)** | — | As a post author, I want to reorder the attachments of my post, so that my post becomes richer and more engaging (alkemio#1605: must-have and hypothesis; drag and drop in client-web#9271). | The server has no move: the web client reorders by deleting and re-uploading the items (client-web#10371, "known limitation"). | Product, 2026-11-20 (F8): no item cap and no server move, as today; a server move is a wish (client-web#10371) |
| MED-07 | Filling an item is an upload into its slot: images in nine formats from 1 to 8000 px, videos as mp4, webm, ogg or quicktime. Anyone who may contribute to the callout can fill a slot, but only a manager creates or removes one. **(open: F7)** | Every image type the platform can display is accepted, in any aspect ratio: the grid crops, the opened image does not (client-web#9184). | — | Bucket rights follow the callout's contribute/update split (crosscheck § creator and bucket privilege rules) | Not decided: exists in the code |
| MED-08 | The person who created the gallery keeps the right to update and delete it, whatever happens to the role that let them create the callout. **(open: OQ1)** | — | As a post author, I want to keep removing attachments from my post after posting (alkemio#1605: "by author/moderator afterwards"), so that I stay in control of my post even when my role changes. | — ("creator rules" — the same pattern as post, whiteboard, memo and link creators; crosscheck `:43`: 90 of 172 ACC gallery policies carry it) | Product, 2026-11-20 (Q-MED-08); the author keeping removal: alkemio#1605 |
| MED-09 | Adding an item is recorded as a media-gallery contribution for the platform's engagement dashboard. The record is made when the slot is created, not when a file is uploaded, and a failure to record never blocks the user. | Platform admins watch engagement with photo/video content on the Kibana dashboard next to whiteboard and memo edits (server spec 039 US1/US2, FR-001…FR-006). | — | — | Server spec 039 US1/US2, FR-001…FR-006; Product, 2026-11-20 (F1): adding an item counts as the contribution, as today; spec 039 is amended |
| MED-10 | Deleting a gallery deletes every item and its file storage with it. A gallery that has lost its storage or its access policy cannot be deleted. | — | — | Orphan-free deletion: nothing of the callout's content survives the callout (orphan-free-deletion area; W4 register). | Orphan-free-deletion area (W4 register) |

### References on profiles

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MED-20 | A reference (a named link) is added to a profile only by whoever manages that profile: a user on their own, an organisation's owner or admin, a space's admins, or the creator of a callout or post. Space members and non-members are refused. | A profile is managed by whoever manages the thing it describes; members may contribute content, not edit someone else's profile. | — | Access matrix § profile; `credentialRule-userSelfAdmin`, `credentialRule-organizationAdmin`, `credentialRule-spaceAdmins` | Product, 2026-11-20 |
| MED-21 | A reference has a name of at least 3 characters and an optional address and description. A second reference with the same name on the same profile is refused. It shows on the profile to everyone who can read the profile. | The name identifies the link to the reader ("Name of the reference, e.g. Linkedin, Twitter etc.", schema) | — | Duplicate names were made an error in `eff43ae16` | Commit eff43ae16; Product, 2026-11-20 (F4): stays as today, unique names on every path are a wish on the product issues list |
| MED-22 | The address of a reference or a link is stored exactly as typed: any text up to the length limit, with no check that it is a web address. **(open: F3)** | — | — | — | Not decided: exists in the code |
| MED-23 | Whoever may update a reference changes its name, address and description one by one; a field left out keeps its value. A profile update can change a whole list of references at once, and that path does not refuse a duplicate name. | — | — | A field left out keeps its value: partial update is the house convention for update inputs. _(draft)_ | Product, 2026-11-20 (F4): the bulk path stays as today, unique names on every path are a wish on the product issues list |
| MED-24 | Deleting a reference removes it from the profile at once. A file uploaded on it stays in the profile's storage and can still be downloaded. Deleting a profile deletes all its references. | — | — | Files belong to the bucket, not to the reference that pointed at them (storage suite rule "file is available after related reference is deleted"). | Product, 2026-11-20 (F5): stays as today, the file stays downloadable (a storage test pins it) |
| MED-25 | A file uploaded on a reference is stored with the profile, and the reference then points at that file. The same file uploaded twice is stored once. The upload needs the right to update the reference and to upload to the profile's storage. | A reference is the profile's way to attach a file, not only to link out. | — | — | Product, 2026-11-20 |
| MED-26 | When a space, callout, post or template is created with references that point at Alkemio files, each file is copied into the new profile's storage and the reference points at the copy. Any other address is kept as it is. | — | — | Content must follow the entity into its own storage so it survives the source (profile re-homing, `profile.service.ts:59-69` comments; VIS-13 copy rule). | Code comments (`profile.service.ts`); same copy rule as VIS-13 |

### The profile page

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MED-30 | A user's own profile settings show a References section. When it is empty it says "No references yet" and offers "Add another reference". | Users curate the links on their profile (user-profile plan § 2.8). | — | — | User-profile test plan § 2.8 |

Numbering note: MED-11…19 and MED-27…29 are intentionally unused (section gaps).

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W10 follow the order of the former who-may table. Nobody has confirmed the cells yet. Evidence is in Appendix B. The storage rules behind uploads and downloads are in the storage area._

### Media gallery

| ID | Action | Platform admin roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Add an item to a gallery callout, or remove one | Y¹ | N | N | Y² | N³ | N | N |
| W2 | Fill an existing item (upload into the slot) | Y⁴ | N | N | Y | Y⁵ | N⁶ | N |
| W3 | Read a gallery and its items | Y⁷ | Y⁸ | Y⁹ | Y | Y | Y¹⁰ | Y¹⁰ |

¹ Platform Content Full Access; Platform Support only where the space allows platform support. ² At the callout's own level, and admins of the top-level space on its subspaces; a subspace admin not on the top-level space. ³ The right to contribute is not the right to update. A member may only as the creator of the gallery (MED-08). ⁴ Platform Content Full Access. ⁵ The right to contribute gives the right to upload into the gallery's storage. ⁶ Also on a public space: a non-member has no right to contribute. ⁷ All of them; the spaces reader everywhere. ⁸ On top-level spaces, through platform-roles access. ⁹ On their own spaces. ¹⁰ On public content.

### References on profiles

| ID | Action | Platform admin roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W4 | Create, update or delete a reference on their own user profile | Y | Y | Y | Y | Y | Y | N |
| W5 | Create, update or delete a reference on another user's profile | Y¹ | N | N | N | N | N | N |
| W6 | Create, update or delete a reference on an organisation's profile | Y² | N | Y³ | N | N | N⁴ | N |
| W7 | Create, update or delete a reference on a callout's or post's profile | Y⁵ | N | N | Y⁶ | N | N | N |
| W8 | Upload a file on a reference | Y⁷ | N | Y⁷ | Y⁷ | N | N | N |
| W9 | Read a profile's references | Y | Y | Y | Y | Y | Y⁸ | Y⁹ |
| W10 | Download a user's reference document without signing in | Y | Y | Y | Y | Y | **Y** | **Y**¹⁰ |

¹ Platform Content Full Access only; the Platform Users Admin reads personal data but does not write. ² Platform Content Full Access; Platform Support where the organisation allows it. ³ The organisation's owner or admin. ⁴ An associate of the organisation included. ⁵ Platform Content Full Access. ⁶ Admins of that level; a member who created a post may on their own post. ⁷ Whoever may update that reference (W4 to W7) and may also upload to the profile's storage. ⁸ Where the profile is readable. ⁹ Public profiles; not the content of a private space. ¹⁰ Recorded as storage finding F1, with a "GDPR" code comment; owned by the storage area.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Gallery | decision | A contribution is recorded when an empty slot is created, not when a file is uploaded, although spec 039 says "on successful upload". Move the record to the upload (and reset the dashboard numbers), or amend the spec? | Technical Lead (Product Lead says what counts as a contribution) | Product, 2026-11-20: adding an item counts as the contribution, as today; amend spec 039 FR-001 to match. | suggested |
| F2 | Gallery | decision | Any kind of image slot can be added as a gallery item, not only gallery images and videos. Refuse the other kinds on the server, or record that the web client is the gate? | Technical Lead | — | open |
| F6 | Gallery | tidy-up | Removing a gallery item needs the "update" right on the gallery, not "delete" on the item as everywhere else on the platform. Align it, or record it as intended? | Technical Lead | — | open |
| F7 | Gallery | follow-up | The stored ratio cannot hold the range allowed for gallery items. This is decided in `visual.md` finding 4, not here; apply that decision. | Technical Lead | — | open |
| OQ1 | Gallery | check | What did the media-gallery MVP (server PR #5798) intend for the item limit, the allowed kinds and who may add? The pull request text was not read. | Technical Lead | The PR text states no intent; its stories do. client-web#9184 (MVP): all displayable image types, several files at once. client-web#9271: reordering by drag and drop; video left out "because of the lack of a way to save a thumbnail". alkemio#1605: reorder and remove by author/moderator are must-have. No source sets an item limit. Who may add: only gallery update today; client-web#10371 (open) asks the server to let contributors add and remove their own. | suggested |
| OQ3 | Gallery | check | Does deleting a gallery's storage also delete its files, so that the files of removed items (F5) are freed when the callout goes? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | References | risk | The address of a reference or link is not checked, so it can hold `javascript:` or free text that the web client shows as a link. Check it on the server, or record the client as the gate? The new core needs the same decision. | Security Lead (Technical Lead implements) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | Gallery | check | Does the web client restrict the kinds and the number of items? This decides whether F2 and F8 are visible to users. | Quality Lead | — | open |
| OQ4 | References | check | The three text-length limits behind the reference fields were not read. Read the values and fill the constants row. | Quality Lead | — | open |
| OQ5 | Gallery | check | Can items be added to the gallery of a template callout and copied when the template is used, and is that audited? Belongs to the templates area. | Quality Lead | — | open |
| OQ6 | Rights | tidy-up | The access matrix has no section for the media gallery or for references. Is a table per type wanted from the matrix generator? | Quality Lead | — | open |
| GAPS | All | test | 6 rules have no test, 7 more are disputed or unexplained with no case on any clause, and 12 behaviours were never pinned down (Appendix D); the media gallery has no test at all. Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | References | risk | The address of a reference or link is not checked, so it can hold `javascript:` or free text that the web client shows as a link. Check it on the server, or record the client as the gate? The new core needs the same decision. | Security Lead (Technical Lead implements) | — | open |
| G12 | Both | check | Does a platform role (Content Full Access, Support) that edits a gallery or a reference write a platform audit row? None was found. | Security Lead | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F4 | Stays as today: a duplicate reference name is refused only when one reference is added. Unique names on every path, with the existing duplicates cleaned up, are a wish on the product issues list. | Product, 2026-11-20 | MED-21, MED-23; PRODUCT-ISSUES F4 |
| F5 | Stays as today: removing a gallery item or a reference leaves its file in storage; a reference file stays downloadable. Deleting the file of a removed gallery item is a wish on the product issues list (DPO Lead to be consulted). | Product, 2026-11-20 | MED-05, MED-24; PRODUCT-ISSUES F5 |
| F8 | Stays as today: no limit on the number of items, and no move on the server; the web client reorders by removing and re-adding. A server move is a wish (client-web#10371). | Product, 2026-11-20 | MED-06; PRODUCT-ISSUES F8 |
| Q-MED-08 | The creator keeps update and delete so the author can still remove attachments after posting (alkemio#1605). | Product, 2026-11-20 | MED-08 |
| CONST | Product rules on the gallery image and video limits, item positions, the item cap and the reference field limits, ticked "yes" in Appendix E. Error texts, kinds, policies and the GraphQL surface go to the Technical Lead. | Product, 2026-11-20 | Appendix E |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›`, `infra ›` or `register ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| MED-01 | A media gallery exists only as the framing content of a callout whose framing kind is "media gallery": it is created with the callout (its own file bucket, no items, the creator recorded), created when an existing callout's framing is switched to that kind, and deleted when the framing is switched away or the callout is deleted. | callout creator, callout managers | code › `src/domain/collaboration/callout-framing/callout.framing.service.ts:188-195, 518-528, 740-750, 815-852` · `src/domain/common/media-gallery/media.gallery.service.ts:30-75, 142-184` · `src/common/enums/callout.framing.type.ts:8` | untested |
| MED-02 | A gallery callout created from a template carries the template's items: each item whose address is an Alkemio file is copied into the new gallery's bucket and becomes an item in the same position; an item that fails to copy is skipped and logged rather than failing the creation; items are never requested without a bucket to hold them. | template users | code › `callout.framing.service.ts:282-331, 462-507` · `src/services/api/input-creator/input.creator.service.ts:160-162, 578-586` · `dto/callout.framing.dto.create.ts:83-96` (input not exposed to clients) | untested |
| MED-03 | Gallery items are visual slots added one at a time by whoever holds "update" on the gallery; a new item takes the next position (highest existing + 1, or 1 in an empty gallery) unless a position is given; items are listed in position order with unpositioned items last; the items are readable by whoever can read the callout. | callout managers, gallery creator | code › `media.gallery.resolver.mutations.ts:400-444` · `media.gallery.service.ts:77-114, 202-209` · `media.gallery.resolver.fields.ts:518-533` · `schema.graphql:4578-4592, 8336` | untested |
| MED-04 | Any of the seven visual kinds — avatar, banner, card, wide banner, whiteboard preview, gallery image, gallery video — is accepted as a gallery item, each with its own kind's size bounds, although only the two gallery kinds are meant. | callout managers | code › `dto/media.gallery.dto.add.visual.ts:596-600` (`visualType: VisualType`) · `media.gallery.service.ts:98-103` (`DEFAULT_VISUAL_CONSTRAINTS[visualType]`) · `src/common/enums/visual.type.ts` | untested (see F2) |
| MED-05 | Removing an item needs "update" on the gallery (not "delete" on the item); the item must belong to that gallery ("Visual '<id>' not found in media gallery '<id>'"); the slot and its policy are removed while the uploaded file stays in the gallery's bucket. | callout managers, gallery creator | code › `media.gallery.resolver.mutations.ts:482-507` · `media.gallery.service.ts:120-140` · `src/domain/common/visual/visual.service.ts:85-103` (no document deletion) | untested (see F5, F6) |
| MED-06 | There is no cap on the number of items, positions need not be unique, and an item's position cannot be changed after creation — reordering means removing the item and adding it again with a position. | callout managers | code › `media.gallery.service.ts:86-96` (no count check) · `src/domain/common/visual/dto/visual.dto.update.ts` (no `sortOrder`; VIS-09) · `visual.entity.ts:61-62` (`int`, nullable, no unique index) | untested (see F8) |
| MED-07 | Filling an item is an image upload into the slot (VIS-04…08): a gallery image accepts the nine image formats at 1–8000 px either way and a ratio of 0.01–100, a gallery video accepts mp4, webm, ogg and quicktime; the upload needs the file-upload right on the gallery's bucket — which every holder of "contribute" on the callout receives — so a contributor can fill a slot a manager created but cannot create or remove one. | contributors, callout managers | code › `src/domain/common/visual/visual.resolver.mutations.ts:64-69, 84-117` · `src/domain/common/visual/visual.constraints.ts:16-21, 89-108` · VIS-16 (disputed F-4 there: the ratio column cannot hold 100) | untested |
| MED-08 | The person who created the gallery (the callout's creator) keeps "update" and "delete" on it through their own self-management credential, independent of the role that let them create the callout. | gallery creator | code › `media.gallery.service.authorization.ts:329-360` · `src/common/constants/authorization/credential.rule.constants.ts:49` · matrix › `access-matrix-crosscheck.md:43` | untested (see Q-MED-08) |
| MED-09 | Adding an item writes a "media gallery contribution" event to the contribution index, named "Media Gallery of <callout name>" (or "Media Gallery" when the callout cannot be found) with the top-level space, fire-and-forget: a reporting failure is logged and never fails the user's action. The event fires when the slot is created, not when the file is uploaded. | callout managers | code › `media.gallery.resolver.mutations.ts:438-480` · `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts:441-454` · `src/services/infrastructure/entity-resolver/community.resolver.service.ts:176-202` · spec › `server/specs/039-media-gallery-contributions/spec.md:51-56, 67-70` | untested (see F1) |
| MED-10 | Deleting a gallery deletes every item, its bucket and its policy in that order; a gallery that has lost its bucket or its policy cannot be deleted ("Storage bucket not found on media gallery …", "Authorization not found on media gallery …"). | callout managers | code › `media.gallery.service.ts:142-184` | untested |
| MED-20 | Creating a reference on a profile needs "create" on that profile: a user on their own profile, an organisation's owner or admin on the organisation's, a space's admins (and the callout's or post's creator) on a callout's or post's profile; a space member or non-member is refused with "Authorization: unable to grant 'create' privilege: profile: <id>". | profile owner / managers | code › `src/domain/common/profile/profile.resolver.mutations.ts:72-98` · test › `callout/post/post-on-callout` › `HM should NOT add reference to post created on space callout from GA`, `NON-HM should NOT add reference …`, `HA should add reference to post created on space callout from GA`; `storage/auth/user-document-auth` › `Access to User Profile reference document` (the QA user creates on their own profile — precondition) · matrix › `access-matrix.md:285-370, 360-361` | proven |
| MED-21 | A reference carries a name of at least 3 characters, an optional address and an optional description; a second reference with the same name on the same profile is refused ("Reference with the provided name already exists: <name>"); once created it appears on the profile for whoever may read the profile. | profile managers, readers | code › `profile.service.ts:584-611` · `src/domain/common/reference/dto/reference.dto.create.ts:323-340` · `reference.entity.ts:282-313` · test › `post-on-callout` › `HA should add reference …` (read-back `{id, name}` on `post.profile.references`) | proven (the duplicate-name clause is untested) |
| MED-22 | The address of a reference — and of a link — is stored exactly as given: any text up to the length limit, no URL, scheme or host check, at creation, at update and in a bulk profile update. | profile managers | code › `reference.dto.create.ts:331-334`, `reference.dto.update.ts:357-360` (`MaxLength` only) · `reference.service.ts:25-36, 42-57` · `src/domain/collaboration/link/dto/link.dto.create.ts` (same) · test › `references.request.params.ts` always sends `https://testref.io` | untested (see F3) |
| MED-23 | A reference is changed by whoever holds "update" on it (inherited from its profile): name, address and description independently, an omitted field keeps its value; through the profile's own update a whole list of references is changed at once and each row must belong to that profile ("Unable to update reference with supplied ID: <id> - no reference in parent entity."); the bulk path does not refuse a duplicate name. | profile managers | code › `reference.resolver.mutations.ts:166-186` · `reference.service.ts:42-92` · `profile.service.ts:311-315` · `profile.service.authorization.ts:110-119` (reference policy = profile policy + threaded rules) | untested (see F4) |
| MED-24 | Deleting a reference needs "delete" on it (inherited from its profile); it leaves the profile's list at once; a file that was uploaded on it stays in the profile's bucket, still downloadable and deletable by its own id; deleting the profile deletes all its references. | profile managers | code › `reference.resolver.mutations.ts:188-205` · `reference.service.ts:110-128` · `profile.service.ts:370-373` · test › `post-on-callout` › `HA should remove reference from post created EA`; `storage/uploads` › `file is available after releted reference is deleted` | proven (see F5 for the product question) |
| MED-25 | A file uploaded on a reference becomes a document in the profile's bucket and the reference's address becomes that document's URL; the same bytes uploaded twice resolve to the same document; the upload needs "update" on the reference and the file-upload right on the profile's bucket, and the storage rules decide formats and size ("Upload on reference or link failed!"). | profile managers | code › `reference.resolver.mutations.ts:207-275` · test › `storage/uploads` › `Successful upload of file type: "$file" on reference` (8), `DDT upload all file types`, `upload same file twice`, `read uploaded file`, `upload file bigger than 15 MB`, `fail to upload .sql file` | proven (limits owned by storage) |
| MED-26 | References created together with a profile (a new space, callout, post or template) whose address points at an Alkemio file get that file copied into the new profile's bucket and the address rewritten to the copy; any other address is kept untouched. | server | code › `profile.service.ts:92-94, 134-145` · `src/domain/profile-documents/profile.documents.service.ts:66-71` | untested |
| MED-30 | A user's own profile settings show a References section that, when empty, offers "Add another reference" and says "No references yet". | user | test › client-web `user-profile/view-profile-information` (`:74-79`) · spec › `client-web/src/functional-e2e/user-profile-test-plan.md:93, 212-228` | proven |

### B. Rights: evidence

_The legend and the evidence line of the former who-may table, unchanged. Section 2 spells the role names out, so the shorthands matter only for reading the evidence._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `media.gallery.resolver.mutations.ts:414-419, 496-501` (`UPDATE` on the gallery for both); `media.gallery.service.authorization.ts:300-324, 341-354` (inherit framing, creator rule, cascade to bucket + visuals); `visual.resolver.mutations.ts:84-117` (`FILE_UPLOAD` on the gallery bucket, fallback `UPDATE`); `profile.resolver.mutations.ts:84-89` (`CREATE` on the profile); `reference.resolver.mutations.ts:176-181, 198-203, 229-249`; `profile.service.authorization.ts:110-119`; access matrix `profile` canonical `callout@L1/framing/profile` (`access-matrix.md:285-330`: contribute for members, create/delete/update for level admins, creator-member, PCFA; `− create … for space-admin@L1` on L0 resources), `user/profile` (`:360`: `user-self` create/delete/update; `platform-users-admin` read-user-pii / read-user-settings only), `organization/profile` (`:361`: owner + admin), `document` / `storage-bucket` sections for the download row; crosscheck `:43-44` (creator rules; bucket privilege rules `update→file-upload`, `contribute→file-upload` on all 43,310 live buckets), F1/F11 (`:60, 70`). The matrix has no `media-gallery` or `reference` section of its own (open question 6). GLOBAL_ADMIN-style catch-alls are retired (027 Slice B); the legacy reference cases run as the harness admin or as space admin / member / non-member personas.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and its proposed ruling. The findings and open questions keep their old numbers._

#### Findings

- **F1 — The contribution event fires on slot creation, not on upload (MED-09).** Code: `addVisualToMediaGallery` reports; `uploadImageOnVisual` does not. Spec 039 FR-001: "when a user successfully uploads a visual"; edge case: "The contribution should only be reported on successful upload completion"; US1-AS2: "each upload generates its own contribution event". Test: none. Consequence: an empty slot counts as a contribution; re-uploading into a slot counts nothing. Ruling: move the report to the upload (then rebaseline the Kibana numbers) or amend the spec. **Product, 2026-11-20:** adding an item counts, as today; amend spec 039.
- **F2 — Any visual kind can be added as a gallery item (MED-04).** Code: the input takes the whole `VisualType` enum and the slot copies that kind's bounds (an `avatar` item is 190–410 px square). Description: "e.g. MEDIA_GALLERY_IMAGE, MEDIA_GALLERY_VIDEO". Test/spec: none. The client (stale clone) has a `mediaGalleryVisualType.ts` guard — not read. Ruling: refuse non-gallery kinds server-side, or record that the client is the gate.
- **F3 — No address validation on references or links (MED-22).** Code: `uri` is `MaxLength`-only on `CreateReferenceInput`, `UpdateReferenceInput` and `CreateLinkInput`; `updateVisual.uri` has the same gap (VIS finding 7). Test: every case sends `https://testref.io`. Spec: none. A reference can carry `javascript:` or free text that the client renders as a link. Ruling: validate (http(s) / mailto, or an Alkemio document URL) on the server, or record the client as the gate — and decide for the new `file_ref`/link row.
- **F4 — Duplicate reference names are refused on one path only (MED-21/23).** Code: `profile.service.ts:596-602` checks on `createReferenceOnProfile`; `updateReferences` (bulk through `updateProfile`) and `createProfile(referencesData)` do not. Test: none. Ruling: is the name unique per profile (then enforce everywhere, and migrate duplicates) or not (then drop the single check)? **Product, 2026-11-20:** stays as today; unique names on every path are a wish on the product issues list.
- **F5 — Removing an item or a reference leaves the file behind (MED-05/24).** Code: `deleteVisual` and `deleteReference` delete the row and policy, never the document; the storage suite pins "file is available after related reference is deleted" as a feature. Spec: none. For a gallery the file stays in a bucket nobody can list from the UI. Ruling: intended (files are bucket-owned; the W4 orphan rows apply) or a leak to clean on removal. **Product, 2026-11-20:** stays as today; deleting a removed gallery item's file is a wish on the product issues list.
- **F6 — Removing an item needs "update" on the gallery, not "delete" (MED-05).** Code: both gallery mutations gate on `UPDATE` of the gallery; the visual's own policy (which inherits DELETE for managers) is not consulted. Everywhere else on the platform a removal needs DELETE on the thing. Test/spec: none. Ruling: align or record.
- **F7 — The ratio column cannot hold the gallery range (MED-07).** Cross-reference visual.md finding 4 (`aspectRatio decimal(3,1)` vs allowed 100 and an unbounded computed ratio) — decided there, not here.
- **F8 — No cap, no unique position, no reorder (MED-06).** Code: nothing limits item count; `sortOrder` accepts duplicates and negatives; `updateVisual` has no `sortOrder`. Test/spec: none; PR #5798's intent unread. Ruling: product to state the maximum items per gallery and whether reordering is a feature — both are rebaseline rows for the new post kind. **Product, 2026-11-20:** stays as today: no cap, no server move; a move is a wish (client-web#10371).

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — What did the media-gallery MVP intend?** PR #5798 (`b5727c846`) is the origin of the entity, the two mutations and the creator rule; its body was not read (the `gh` budget went to issues). It may state the item cap, the allowed kinds and who may add — the whys of MED-03/04/06/08.
- **OQ2 — Does the client restrict item kinds and count?** `client-web/src/domain/collaboration/mediaGallery/mediaGalleryVisualType.ts` and `useUploadMediaGalleryVisuals.ts` exist in the stale local clone (`7a37d4c4b`); not read. Decides whether F2 and F8 are live-visible.
- **OQ3 — Does deleting a gallery's bucket delete its documents?** `storageBucketService.deleteStorageBucket` is the storage area's; whether removed items' files (F5) are finally freed when the callout goes was not followed.
- **OQ4 — Field length constants.** `SMALL_TEXT_LENGTH`, `MID_TEXT_LENGTH`, `LONG_TEXT_LENGTH` values were not re-read; the constants row names them only.
- **OQ5 — Template callouts.** Whether items can be added to the gallery of a *template* callout (and copied on apply) and whether that is audited — route to the templates area.
- **OQ6 — The matrix has no `media-gallery` or `reference` section.** Both types are in the JSON aggregate only (crosscheck `:43-44`); the who-may block above is derived from the `profile`, `callout`, bucket and document sections plus the gallery's own rules. Route to the matrix generator (same ask as visual.md OQ 2) if a per-type table is wanted.

### D. Test gaps

_For the Quality Lead. G12 in section 3 is the twelfth bullet below (audit), routed to the Security Lead._

Untested rules by id: MED-01, MED-02, MED-03, MED-07, MED-10, MED-26; plus the untested clauses of MED-21 (duplicate name) and every disputed row (MED-04, 05, 06, 09, 22, 23 — no case on any clause) and MED-08 (creator rule).

Behaviours the area has that neither reading nor tests pinned down:
- The whole media-gallery surface has **zero** legacy cases: create a gallery callout, add an image and a video item, upload into each, read back in order, remove an item, switch the framing away (gallery deleted), delete the callout (bucket deleted), create from a template with items.
- A contributor (space member) uploading into a slot an admin created, and being refused when adding a slot — the contribute/update split (MED-07).
- The gallery creator keeping update after losing the admin role (MED-08).
- A position given explicitly, a duplicate position, a negative position, and the read order with nulls (MED-03/06).
- The contribution event's presence in the index after adding an item (MED-09; 039 SC-001 has no case).
- `updateReference` (unreached by any spec per the catalogue), bulk `updateProfile.references` with a foreign reference id, and the duplicate-name refusal (MED-21/23).
- A reference on an organisation profile by its owner vs by a plain associate (MED-20; only user, callout and post profiles are covered).
- References on a space profile / space-about profile (matrix rows exist; no case).
- `uploadFileOnReference` on a reference whose profile has no bucket ("Unable to find profile for Reference") and by a holder of update-on-reference without file-upload on the bucket.
- Reference re-homing at creation (MED-26): a post created with a reference pointing at another space's document.
- UI: user-profile plan § 2.8 (add / edit / delete a reference on the profile page) was never written; no client walk creates a gallery callout (the form helper offers the chip, no case picks it).
- Audit: whether a platform role (PCFA, support) editing a gallery or a reference writes a platform audit row — none was found in these paths.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Visual kinds (7) | `avatar`, `banner`, `whiteboardPreview`, `card`, `bannerWide`, `mediaGalleryImage`, `mediaGalleryVideo` — all accepted as gallery items | `src/common/enums/visual.type.ts`; `dto/media.gallery.dto.add.visual.ts:596-600` | no (F2) | Technical Lead |
| Gallery image limits | 1–8000 px width and height, ratio default 1, range 0.01–100, nine image formats | `visual.constraints.ts:89-98` (VIS-03/16) | yes (VIS F-4) | Product Lead |
| Gallery video limits | 1–8000 px, ratio 0.01–100, `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime` | `visual.constraints.ts:16-21, 99-108` | yes | Product Lead |
| Item position | `sortOrder` int, nullable; default = max + 1, first = 1; read ascending, null last; not updatable | `media.gallery.service.ts:86-96, 202-209`; `visual.entity.ts:61-62` | yes (F8) | Product Lead |
| Item cap | none | `media.gallery.service.ts:77-114` | yes (F8) | Product Lead |
| Framing kinds (10) incl. `media_gallery` | `none, whiteboard, link, memo, media_gallery, poll, collabora_document, contributors, spaces, form` | `callout.framing.type.ts` (CAL-01) | no | Technical Lead |
| Policy types | `media-gallery`, `reference` | `authorization.policy.type.ts:20`; `reference.service.ts:31-33` | no | Technical Lead |
| Gallery creator rule | `CREDENTIAL_RULE_MEDIA_GALLERY_CREATED_BY`: `update` + `delete` for `user-self-management` of `createdBy` | `credential.rule.constants.ts:49`; `media.gallery.service.authorization.ts:341-354` | no | Security Lead |
| Contribution event | type `MEDIA_GALLERY_CONTRIBUTION`; name `Media Gallery of <framing displayName>` / `Media Gallery`; `space` = L0 id; fired on slot creation | `contribution.reporter.service.ts:441-454`; `media.gallery.resolver.mutations.ts:446-472` | no (F1) | Technical Lead |
| Reference field limits | `name` 3…`SMALL_TEXT_LENGTH`; `uri` ≤ `MID_TEXT_LENGTH` (any text); `description` ≤ `LONG_TEXT_LENGTH` | `reference.dto.create.ts:323-340`; `reference.dto.update.ts:350-366` (values of the three constants not re-read) | yes (F3) | Product Lead |
| Reference defaults | `uri` `''` when absent; `description` `''` | `reference.entity.ts:305-313` | no | Technical Lead |
| Error text — duplicate name | `Reference with the provided name already exists: <name>` (single-create path only) | `profile.service.ts:598-602` | no (F4) | Technical Lead |
| Error text — bulk update | `Unable to update reference with supplied ID: <id> - no reference in parent entity.` | `reference.service.ts:84-87` | no | Technical Lead |
| Error texts — gallery | `Visual '<id>' not found in media gallery '<id>'` · `No MediaGallery found with the given id: <id>` · `Storage bucket not found on media gallery: '<id>'` · `Authorization not found on media gallery: '<id>'` · `Unable to find Space for given media gallery` · `Missing required relation for phase-2 materialization` (`mediaGallery.storageBucket`) | `media.gallery.service.ts:131-134, 153-165, 196-199`; `community.resolver.service.ts:195-199`; `callout.framing.service.ts:287-295` | no | Technical Lead |
| Error text — refusal | `Authorization: unable to grant 'create' privilege: profile: <id>` (pinned by 2 cases) | `profile.resolver.mutations.ts:84-89` | no | Technical Lead |
| GraphQL surface | `MediaGallery{id, createdBy, visuals: [Visual!]!, storageBucket, authorization}`, `CalloutFraming.mediaGallery`, `Visual.sortOrder: Float`, mutations `addVisualToMediaGallery(addData{mediaGalleryID, visualType, sortOrder})`, `deleteVisualFromMediaGallery(deleteData{mediaGalleryID, visualID})`; `Reference{id, name, uri, description, authorization}`, `Profile.references`, mutations `createReferenceOnProfile(referenceInput{profileID, name, uri, description})`, `updateReference(referenceData{ID, name, uri, description})`, `deleteReference(deleteData{ID})`, `uploadFileOnReference(uploadData{referenceID}, file)`, `updateProfile(profileData{references[]})` | `schema.graphql:4578-4592, 6491-6505, 8336`; `root-fields.md:159-176` | no | Technical Lead |

### F. Where this lands in the new core

The catalogue puts CT-9 on **`storage_bucket`, `file`, `file_ref`** — content-addressed blobs, uploads straight to the file container by signed token (slice 4–5) — and the briefing folds callout, contribution and post into **one recursive `post` with a kind**. The gallery therefore stops being a side entity on a framing and becomes a post of kind "media gallery" whose items are ordered `file_ref`s; every rule above survives as a behaviour, but three facts should shape the model: (1) the item is a slot first and a file second today (MED-03/09, F1) — in a content-addressed store the item *is* the file, so "add item" and "upload" collapse and the contribution event has one natural trigger; (2) position is a nullable int with no uniqueness and no reorder (MED-06, F8) — the new post needs an explicit ordering contract; (3) the creator rule is a stored policy row (MED-08) and stored authorization policies disappear — it becomes a computed rule on the post's `created_by`. References have no stated successor beyond `file_ref`: a reference is a named outbound link on a profile (MED-21/22) that may also point at an owned file (MED-25); the new profile needs a typed link row with a validated address (F3) and a uniqueness rule that holds on every write path (F4). Uploads, the GDPR-motivated anonymous read of profile documents and the F1 direct-bucket exposure are the storage area's to carry over.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy suites — this catalogue feature (CT-9) has no `server-api/src/functional-api/<area>/` folder (`references/` holds request params only), so the proof is the cases of other areas that exercise it: `callout/post/post-on-callout` (4 reference cases), `storage/uploads` (12 upload-on-reference cases), `storage/auth/*` (reference-document rows of the document-auth decision table, cross-referenced) and 1 client-web walk (`user-profile/view-profile-information`); **no case anywhere touches a media gallery** (`addVisualToMediaGallery`, `deleteVisualFromMediaGallery`, `mediaGallery` and `updateReference` have 0 hits in server-api, client-web and lib). Scope: the media-gallery framing of a callout and its items (creation, positions, limits, removal, who may), and references on profiles (create, update, delete, file on a reference, address validation). Buckets, documents, uploads limits and document access are the storage area and the access matrix; the visual slot rules (formats, sizes, ratio, upload rights) are visual.md VIS-04…08 and VIS-16/17 — cross-referenced, not redone. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout: the single why was split in three, every finding, open question and unexplained rule was routed to an organisation role, and the status legend and review-load line were dropped (the counts line at the top replaces them). Old finding ids written "F-3" are now "F3".


2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. The stories behind the media-gallery MVP (alkemio#1605, client-web#9184, #9271, #10009, #10032, #10371) were added as sources; they suggest answers for OQ1, F8 and Q-MED-08.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/common/media-gallery/media.gallery.entity.ts`, `media.gallery.interface.ts`, `media.gallery.service.ts`, `media.gallery.service.authorization.ts`, `media.gallery.resolver.mutations.ts`, `media.gallery.resolver.fields.ts`, `dto/media.gallery.dto.add.visual.ts`, `dto/media.gallery.dto.delete.visual.ts`
- `src/domain/collaboration/callout-framing/callout.framing.service.ts`, `callout.framing.service.authorization.ts`, `callout.framing.resolver.fields.ts`, `callout.framing.entity.ts`, `dto/callout.framing.dto.create.ts`; `src/services/api/input-creator/input.creator.service.ts`
- `src/common/enums/callout.framing.type.ts`, `visual.type.ts`, `authorization.policy.type.ts`; `src/common/constants/authorization/credential.rule.constants.ts`
- `src/domain/common/visual/visual.constraints.ts`, `visual.entity.ts`, `visual.service.ts`, `visual.resolver.mutations.ts`, `dto/visual.dto.update.ts`
- `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`; `src/services/infrastructure/entity-resolver/community.resolver.service.ts`
- `src/domain/common/reference/reference.entity.ts`, `reference.interface.ts`, `reference.service.ts`, `reference.resolver.mutations.ts`, `dto/reference.dto.create.ts`, `dto/reference.dto.update.ts`, `dto/reference.dto.delete.ts`
- `src/domain/common/profile/profile.service.ts`, `profile.resolver.mutations.ts`, `profile.service.authorization.ts`, `dto/profile.dto.create.reference.ts`; `src/domain/profile-documents/profile.documents.service.ts`
- `src/domain/collaboration/link/link.service.ts`, `link.resolver.mutations.ts`, `dto/link.dto.create.ts`
- `schema.graphql`; git `b5727c846` (PR #5798 media-gallery-mvp), `eff43ae16`, `13da6cd93`, `39165799d` (reference name rule)

Tests (worktree `w1-access-matrix/test-suites`):
- server-api: `callout/post/post-on-callout.it-spec.ts` (`Posts - References`), `storage/uploads.it-spec.ts` (`Upload document`), `storage/auth/user-document-auth.it-spec.ts` and the seven other `storage/auth/*-document-auth.it-spec.ts` (reference-document rows), `references/references.request.params.ts`, `storage/upload.params.ts`
- client-web: `user-profile/view-profile-information.spec.ts`, `user-profile-test-plan.md` (§ 2.8), `helpers/callout-form.helper.ts`, `templates-CRD/template-types/forms/callout/callout-template-framing.ts`, `templates-CRD/instructions.md`
- lib: `scenario/graphql/mutations/reference/createReferenceOnProfile.graphql`, `deleteReferenceOnProfile.graphql`
- `docs/qa/server-rebuild/knowledge/`: `visual.md` (VIS-01…05, 08, 09, 13, 16, 17; finding 4; OQ 2, 4), `callout.md` (CAL-01, CAL-03, CAL-07, CAL-09), `access-matrix.md` § profile, callout, link, visual, storage-bucket, document; `access-matrix-crosscheck.md` (§ creator rules `:43-44`, F1, F2, F3, F11); `catalogue/README.md` CT-9, ID-3; `catalogue/root-fields.md:159-176`

Specs / issues:
- server `specs/039-media-gallery-contributions/spec.md` (US1/US2, FR-001…FR-006, SC-001…004, edge cases)
- server#6614 (orphan-free callout create — cited by code comments; owned by the orphan-free-deletion area)
- `agents-hq/specs/*` grep: no spec names the media gallery; `017-innovation-hub-resources`, `025-callout-manual-selection` checked, not about profile references
- alkemio#1605 (richer posts: media gallery); client-web#9184 (MVP), #9271 (improvements: reorder, video out of scope), #10009 and #10032 (members add pictures, design), #10371 (open: server side of member adds)
