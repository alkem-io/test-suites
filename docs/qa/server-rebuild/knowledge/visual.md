# Visuals (avatar, banner and card images): behaviour rules

_What the platform does today for images on profiles: the image slots every profile carries (avatar, banner, card, wide banner, whiteboard preview, media-gallery image and video), their allowed formats and sizes, what an upload does to the image, the adjustable banner shape, and default and copied-in avatars: what it does, why, who may, and what is still to answer. The file follows the three-section layout of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 2 · Technical Lead 6 · Quality Lead 6 · Security Lead 2 · Service Operations Lead 1. By state: 12 open · 5 with a suggested answer. Proof of the 18 rules: 8 proven by a test · 10 untested (Appendix A)._

_Whys of the 18 rules: 13 rest on a source · 4 carry a draft for product to decide · 1 has none, and it already carries an open question (VIS-17)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a doc. "Not decided" means the behaviour exists in the code and nobody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F7)** means a question on this rule is still open, **(defect: …)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: …)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Kinds and slots

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VIS-01 | There are seven kinds of image slot, and every profile is created with a fixed set of empty slots: a space gets avatar, banner and card; a user, an organisation and a virtual contributor get an avatar. Slots are never added or removed later, except in a media gallery. **(open: Q-VIS-01)** | — | As a space admin, I want my space to have an avatar, a banner and a card image, so that it is recognisable wherever it shows. _(draft)_ | — (each surface renders a fixed set of image slots; no spec states the set) | Not decided: exists in the code |
| VIS-02 | Each slot keeps its own copy of the size limits from the day it was created, so a changed size limit reaches old slots only through a data migration. The allowed shape range and the accepted formats are always the current platform ones. | — | — | Bounds are denormalised for speed; the three banner migrations exist precisely because the upload validator reads the row (migration comments); formats and ratio were deliberately made row-independent so HEIC and the 6–10 range applied without a migration (code comments). | Not decided: exists in the code (migration and code comments) |
| VIS-03 | The platform publishes default limits per kind: avatar 190–410 px square, banner 1200–3840 × 120–640 px, card 307–410 × 192–256 px. Only the banner's shape can be adjusted (ratio 6 to 10, default 10); every other kind has one fixed shape. **(open: F1)** | Banners must be stored large enough for wide and HiDPI screens (server#6269). | — | The client's crop dialog clamps against these numbers and mirrors 6/10 locally (client plan TC-03, client-web#10178). | client-web#10178; server#6269 |

### Uploading an image

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VIS-04 | An image is uploaded or replaced by whoever manages the profile: a space's admins for its images, a user for their own avatar, an organisation's admins for its avatar, a callout's or post's managers for theirs. The space's rule on who may upload files applies too. | — | — | The bucket check is what lets members upload only where the space allows member content (server spec 102). | Server spec 102 |
| VIS-05 | An upload is accepted only as one of nine image formats: png, jpeg, jpg, svg, webp, gif, avif, heic, heif. The server checks the type the client declares; the file service then checks the real content against a wider list. **(defect in part: F3)** **(open: F2, F8)** | iPhone photos arrive as HEIC/HEIF and must be accepted (001 FR-001/002). | — | Old slots created before HEIC existed still accept it without a migration (code comment). | Server spec 001 FR-001/002 |
| VIS-06 | The stored image's width and height must both fit the slot's limits, the limits included. Otherwise the upload is refused and the stored file is deleted again. A 1200 × 120 banner passes; 1199 × 120 fails. **(open: F6)** | Images must fit the slot they render in; the measurement is taken after rotation so a sideways phone photo is judged by what will be shown (#6053); the banner floor was lowered to 1200 so admins can crop images that used to be refused (client-web#10178). | — | — | Server PR #6053; client-web#10178 |
| VIS-07 | Every uploaded image is re-encoded before it is stored: iPhone formats (HEIC, HEIF) become JPEG, JPEG and WebP are recompressed, sides over 4096 px are scaled down, and camera and location data are removed. SVG and GIF pass through untouched. A file over 15 MB is refused. **(open: OQ1)** | iPhone users could not upload at all; smaller files load faster; stripping GPS/camera metadata minimises GDPR exposure (001 FR-003..FR-018, Clarifications). | — | — | Server spec 001 FR-003..FR-018 |
| VIS-08 | A successful upload points the slot at the new file and records the image's real shape and the alternative text. The previous image is deleted only when it was a different file in the same storage; uploading the same image again keeps the same file. | — | — | The stored ratio must be what the pixels are, so the page renders the image unchanged (#6452 migration comment); replacing an image must never delete a file that belongs elsewhere (code comment). | Not decided: exists in the code (code and migration comments) |

### Shape and text

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VIS-09 | Whoever may update a slot may change its alternative text (120 characters at most) and its shape. The shape must stay in the kind's range: 6 to 10 for a banner, the one fixed value for every other kind. A refused change leaves the stored shape untouched. **(open: F6, F7, OQ5)** | A space admin picks the banner shape between the slim strip and the historic 6:1 (client-web#10178, server#6346). | — | The range is a property of the kind, not the slot (code comment). | client-web#10178; server#6346 |
| VIS-10 | The banner is the only adjustable slot. A banner with no image has the slim 10:1 shape. Once an image is uploaded the shape becomes the image's own, and the admin may then choose any value from 6 to 10. Existing banners were never reshaped. **(open: F1, OQ5)** | Spaces without a banner show the gradient at 10:1 and cannot change it; the crop tool opens on 10:1; existing images keep their proportion (client-web#10178 ACs; PR #6452 aligned the server default with the client's). | — | — | client-web#10178; server PR #6452 |
| VIS-11 | The banner's height limits (120 to 640 px) cover its whole shape range, so an upload at any allowed shape passes the size check. **(open: OQ5)** | — | — | Pinning the heights to one shape would reject a legitimate 10:1 or 6:1 upload (migration and constants comments). | Not decided: exists in the code (migration comments) |

### Default and external avatars

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VIS-12 | Every new user, organisation and virtual contributor gets an avatar: the one supplied, else the sign-in provider's picture, else a generated one with their initials. It is copied into Alkemio's storage; if that fails, the contributor is still created and keeps the outside link. **(open: F5)** | Every contributor needs a picture; serving it from Alkemio avoids hot-linking a third party; an avatar problem must never block sign-up (code comments; #6396 — LinkedIn's CDN rejected the default user agent). | — | — | Server PR #6396; code comments |
| VIS-13 | At creation, an image address is copied into the profile's storage only when it already points at an Alkemio file. Any other address is ignored, except an avatar from one of six trusted hosts, which is accepted and copied in. | — | — | Narrowing the external hosts limits SSRF exposure through user-controlled profile input (code comment, PR #5976); "needs to be a url inside Alkemio already uploaded to a StorageBucket" (schema). | Server PR #5976 |
| VIS-14 | A space created from a template takes the template's avatar, card and banner images, unless the creator supplies their own for that slot. | A template carries a look, and the creator's own choice wins. _(draft)_ | — | — | Not decided: exists in the code |

### Reading, galleries and lifecycle

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| VIS-15 | Anyone who may read a profile may read its slots: address, shape, limits, formats and alternative text. Who may fetch the image file itself is a storage rule. | An image is part of the profile it illustrates, so it is as readable as the profile. _(draft)_ | — | — | Not decided: exists in the code |
| VIS-16 | A media gallery's images and videos are slots too, added or removed by whoever may update the gallery. An image may be any size from 1 to 8000 px; a video must be mp4, webm, ogg or quicktime. **(defect in part: F4)** | — | — | Media galleries are the one surface with a variable number of visuals (server spec 039 — CAL-40). | Server spec 039 |
| VIS-17 | A slot cannot be deleted on its own; it goes with its profile, or when it is removed from a media gallery. Its image address is at most 2048 characters and its alternative text at most 120. **(open: Q-VIS-17)** | — | — | — | Not decided: exists in the code |
| VIS-18 | A Platform Operations Admin may force a contributor's avatar to be stored on Alkemio. The action is audited. | — | — | Operational repair of avatars that were never re-hosted (admin tool). _(draft)_ | Not decided: exists in the code |

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W11 follow the order of the former who-may table. "Space admin" means an admin of the space itself or of a space above it. Product has not reviewed these cells yet. Evidence, with the cells a test proves, is in Appendix B. Who may fetch the image file itself is a storage rule (W11)._

### Space, callout and gallery images

| ID | Action | Space admin | Space lead | Space member | Registered user, not a member | Visitor | Platform Content Full Access | Platform Support | Platform Resource Admin |
|---|---|---|---|---|---|---|---|---|---|
| W1 | Upload or replace a space's avatar, banner or card image | Y | N | N | N | N | Y | N¹ | N |
| W2 | Set a space banner's ratio or alternative text | Y | N | N | N | N | Y | N¹ | N |
| W3 | Upload or replace a callout framing or post image | Y | N | N² | N | N | Y | N¹ | N |
| W6 | Add or remove a media-gallery image or video | Y | N | N² | N | N | Y | N¹ | N |

¹ Y on a space that allows platform support as admin. ² Except the creator of the callout or post, who may (callout rule CAL-29). No other platform role may do any of these.

### Avatars

| ID | Action | The user themself | Organisation admin, own organisation | Registered user | Visitor | Platform Content Full Access | Platform Operations Admin | Other platform roles |
|---|---|---|---|---|---|---|---|---|
| W4 | Upload or replace a user's avatar | Y | N | N | N | Y³ | N | N |
| W5 | Upload or replace an organisation's avatar | N | Y | N | N | Y³ | N | N |
| W7 | Force a contributor's avatar to be stored on Alkemio | N | N | N | N | N | Y | N |

³ Through the root content cascade; not verified here. Space roles do not apply to W4 and W5 and give nothing on W7.

### Reading

| ID | Action | Space admin | Space lead | Space member | Registered user, not a member | Visitor | Platform roles |
|---|---|---|---|---|---|---|---|
| W8 | Read a public space's slot details | Y | Y | Y | Y | Y | Y |
| W9 | Read a private space's slot details | Y | Y | Y | N | N | Y⁴ |
| W10 | Read the platform default limits per kind | Y | Y | Y | Y | Y | Y |
| W11 | Fetch the image file of a space image | Y | Y | Y | Y⁵ | Y⁵ | Y |

⁴ Platform Content Full Access and the platform spaces reader; Platform Support only on a space that allows platform support as admin; the Platform Resource Admin and the other platform roles no. ⁵ Also on a private space: a storage finding (crosscheck F1 and F11), handled in the storage area. W10 is open to users and organisation admins as well.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding (F) and open question (OQ), with code lines and data, is in Appendix C under the same id. A question "Why does this rule exist?" (Q-…) means the rule holds but no source states its reason._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| Q-VIS-01 | Kinds | decision | Why does this rule exist? No source states the reason. No spec states which image slots each kind of profile gets. | Product Lead | — | open |
| CONST | All | decision | 20 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rows pre-filled with their role) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ5 | Shape | spec | There is no workspace spec for the adjustable banner; its whys come from two issues and migration comments. Is a retrospective spec wanted before the new core rebuilds it? | Technical Lead (Product Lead confirms the banner behaviour) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Upload | defect | The server checks only the type the client declares. A PDF declared as PNG is stored first, then refused with a misleading message and deleted. Refuse it before it is stored? | Technical Lead (Security Lead consulted) | Pass the image format list to the file service, as the Collabora path does, so the content is refused before it is stored. | suggested |
| F4 | Galleries | defect | The stored ratio only holds values below 99.9, but a media-gallery image may have a ratio up to 100 and an upload can compute far more (8000 × 1 px). Clamp the value, or widen the column? | Technical Lead (Quality Lead probes it live, OQ4) | — | open |
| F5 | Avatars | tidy-up | Copied-in avatars are always declared PNG and stored without a file extension, whatever they are. | Technical Lead | Harmless today; tidy when the file container owns typing. | suggested |
| F6 | Upload | tidy-up | Two error texts embed the uploaded values, against the repo rule, and two legacy cases pin parts of them. | Technical Lead (Quality Lead rebaselines the two cases) | Not a behaviour change: rebaseline those assertions when the messages are cleaned. | suggested |
| OQ5 | Shape | spec | There is no workspace spec for the adjustable banner; its whys come from two issues and migration comments. Is a retrospective spec wanted before the new core rebuilds it? | Technical Lead (Product Lead confirms the banner behaviour) | — | open |
| Q-VIS-17 | Galleries | decision | Why does this rule exist? No source states the reason. A slot cannot be deleted on its own, its address is at most 2048 characters and its alternative text at most 120. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Shape | risk | Changing a slot accepts any image address with no check, so whoever may update a slot can point it at an outside image or at nothing. Addresses are checked at creation but not on update. Validate them, or keep this as intended for import tooling? | Security Lead, then Technical Lead | — | open |
| CONST | All | decision | 20 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rows pre-filled with their role) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 6 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Kinds | test | Two legacy suites disagree on the banner's default ratio: one case (configuration TC-03) still pins 6, while the code and two other suites say 10. | Quality Lead | Rebaseline TC-03 to 10; there is no behaviour question. | suggested |
| F2 | Upload | test | No case proves the list of accepted image formats; the one case named for it tests the size refusal instead. | Quality Lead | Add a type-refusal case and rename the storage case. | suggested |
| OQ2 | Rights | check | The access matrix covers space slots only; the user, organisation and virtual contributor avatar cells in section 2 are derived from code. Route them to contributor management, or extend the matrix generator? | Quality Lead | — | open |
| OQ3 | Kinds | check | Is configuration TC-03 red on the nightly? It pins the old default ratio (6). Check the last report before rebaselining (F1). | Quality Lead | — | open |
| OQ4 | Galleries | check | Does a media-gallery image with an extreme ratio fail at the database, or is it clamped somewhere unread (F4)? One live probe. | Quality Lead | — | open |
| GAPS | All | test | 10 rules have no test, and Appendix D lists more untested clauses and behaviours that were never pinned down. Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Galleries | defect | The stored ratio only holds values below 99.9, but a media-gallery image may have a ratio up to 100 and an upload can compute far more (8000 × 1 px). Clamp the value, or widen the column? | Technical Lead (Quality Lead probes it live, OQ4) | — | open |
| F6 | Upload | tidy-up | Two error texts embed the uploaded values, against the repo rule, and two legacy cases pin parts of them. | Technical Lead (Quality Lead rebaselines the two cases) | Not a behaviour change: rebaseline those assertions when the messages are cleaned. | suggested |
| OQ1 | Upload | check | Which file-service version runs with Release 79? VIS-07 was read from the develop clone and no case exercises it. Confirm the deployed tag, then verify one HEIC upload live. | Service Operations Lead (Quality Lead verifies the upload) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Shape | risk | Changing a slot accepts any image address with no check, so whoever may update a slot can point it at an outside image or at nothing. Addresses are checked at creation but not on update. Validate them, or keep this as intended for import tooling? | Security Lead, then Technical Lead | — | open |
| F8 | Upload | risk | SVG is refused in chat uploads because it can carry active content, yet every profile slot accepts it and it is stored unprocessed. One policy for SVG: serve it as an attachment everywhere, or drop it from the image list? | Security Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Upload | defect | The server checks only the type the client declares. A PDF declared as PNG is stored first, then refused with a misleading message and deleted. Refuse it before it is stored? | Technical Lead (Security Lead consulted) | Pass the image format list to the file service, as the Collabora path does, so the content is refused before it is stored. | suggested |
| CONST | All | decision | 20 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rows pre-filled with their role) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Upload | check | Which file-service version runs with Release 79? VIS-07 was read from the develop clone and no case exercises it. Confirm the deployed tag, then verify one HEIC upload live. | Service Operations Lead (Quality Lead verifies the upload) | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `client ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| VIS-01 | There are seven visual kinds — avatar, banner, card, wide banner, whiteboard preview, media-gallery image, media-gallery video — and every profile is created with a fixed set of empty slots for its owner: a space gets avatar + banner + card; a user, an organisation and a virtual contributor get an avatar; a callout framing and a post get banner + card; a whiteboard gets card + preview; a memo, a template, a flow state and community guidelines get a card; an innovation hub a wide banner; an innovation pack avatar + card. Slots are never added or removed afterwards except in a media gallery. | server | code › `src/common/enums/visual.type.ts:24-32` · `src/domain/common/profile/profile.service.ts:196-221, 479-547` · owners: `space.about.service.ts:130`, `profile.avatar.service.ts:84-92`, `callout.framing.service.ts:297-303`, `post.service.ts:81`, `whiteboard.service.ts:237`, `memo.service.ts:67`, `template.service.ts:330`, `innovation.flow.service.ts:133`, `community.guidelines.service.ts:97`, `innovation.hub.service.ts:122`, `innovation.pack.service.ts:112` · test › `space-banner-constraints` › `TC-01` (a space has a BANNER slot) | untested (one case reads a space's banner slot; no other owner is checked) |
| VIS-02 | Each slot carries its own copy of the kind's limits — minimum and maximum width and height, the display ratio, the accepted formats — taken from the platform defaults when it is created. An upload is checked against the **slot's stored** width/height bounds (so a changed platform bound reaches old slots only through a data migration), while the ratio range and the accepted formats are checked against the **current platform defaults** (so widening them needs none). | server | code › `src/domain/common/visual/visual.service.ts:45-69, 270-296, 298-336, 338-406` · `visual.entity.ts:163-227` · `src/migrations/1785283200000-WidenSpaceBannerVisualConstraints.ts`, `1787600000000-LowerSpaceBannerMinWidth.ts` · test › `banner-aspect-ratio` › `the space BANNER row carries the WIDENED bounds`; `space-banner-constraints` › `TC-01 — BANNER visual reports minWidth 1200 / minHeight 120` | proven |
| VIS-03 | The platform publishes the default limits per kind (`defaultVisualTypeConstraints`): avatar 190–410 px square, ratio fixed 1; banner 1200–3840 × 120–640, default 10, adjustable 6–10; card 307–410 × 192–256, fixed 1.6; wide banner 640–2560 × 64–256, fixed 10; whiteboard preview 500–1800 × 200–720, fixed 2.5; media-gallery image and video 1–8000 px either way, ratio 0.01–100. Every kind but the banner has a fixed shape (minimum = maximum = default). | all readers | code › `visual.constraints.ts:38-109` · `src/platform/configuration/config/config.resolver.fields.ts:15-19` · test › `banner-aspect-ratio` › `BANNER is the adjustable type: the ratio range is 6..10`, `AVATAR / BANNER_WIDE / CARD keeps a FIXED shape` (3 rows); `configuration/banner-visual-constraints` › `TC-03` (stale on the default — F-1) | proven |
| VIS-04 | Uploading or replacing an image needs the "update" right on the slot — which every holder of "contribute" on the owning profile's parent receives — plus the right to upload files into the profile's storage bucket (or, where the bucket has no rules of its own, "update" on the gallery, profile or slot). In practice: a space's admins for its avatar/banner/card, a user for their own avatar, an organisation's admins for its avatar, the callout's or post's managers for theirs. | space admin, self, organisation admin, callout manager | code › `src/domain/common/visual/visual.resolver.mutations.ts:53-134` · `visual.service.authorization.ts:185-216` · `user.service.authorization.ts:243-252` · `organization.service.authorization.ts:212-242` · matrix › `access-matrix.md:2384-2420` (`visual`) · test › `space-banner-constraints` › `TC-02` (admin on a space banner); `storage/uploads` › `Upload visual tests › upload visual` (admin on an organisation avatar) | proven (only the admin cells; every refusal untested) |
| VIS-05 | An upload is accepted only when the **declared** image type is one of nine — png, jpeg, jpg, svg+xml, webp, gif, avif, heic, heif — for the slot (checked against the slot's list **or** the current defaults), and the file service then checks the **actual** content against the bucket's allowed types; a declared type outside the list is refused ("Image upload type not in allowed mime types"), always wrapped as "Upload on visual failed!". | uploaders | code › `visual.constraints.ts:4-14` · `visual.service.ts:113, 270-296, 204-218` · `src/common/enums/mime.file.type.ts:17-20` · `src/domain/storage/storage-bucket/storage.bucket.service.ts:359-412, 812-822` · spec › `server/specs/001-heic-jpeg-conversion/spec.md:111-112` | untested (see F2: no case proves the list; F3: declared against real type) |
| VIS-06 | After the file service has stored and measured the image, its pixel width and height must both fall inside the slot's stored bounds; otherwise the upload is refused — "Upload image has a width resolution of '<w>' which is not in the allowed range of <min> - <max> pixels!" (height likewise) — and the just-stored file is deleted again. The boundary values are inclusive: a 1200 × 120 banner passes, 1199 × 120 fails. | uploaders | code › `visual.service.ts:152-180, 250-312` · test › `space-banner-constraints` › `TC-02 — 1200×120 upload accepted; 1199×120 rejected`; `storage/uploads` › `should not upload unsupported file type` (1299 px on a 190–410 avatar) | proven |
| VIS-07 | Every uploaded image is re-encoded by the file service before it is stored: HEIC/HEIF become JPEG; JPEG and WebP are recompressed to JPEG (quality 82, kept as-is when that would not shrink them); images longer than 4096 px on a side are scaled down; EXIF/IPTC/XMP metadata is stripped and the orientation applied to the pixels; PNG, BMP and AVIF are re-encoded only when they need rotating; SVG and GIF pass through untouched; a multi-frame HEIC keeps only its primary still; a file over 15 MB is refused; a failed HEIC conversion refuses the upload, a failed compression stores the uncompressed image. | uploaders | spec › `server/specs/001-heic-jpeg-conversion/spec.md:107-128` · code › file-service `internal/imaging/processor.go:33-85, 188-231`, `internal/domain/service/ingest.go:46-55, 246-260` (develop clone — see Open questions) · `src/migrations/1770909862763-AddHeicHeifMimeTypes.ts` | untested |
| VIS-08 | A successful upload points the slot at the new file (`/api/private/rest/storage/document/<id>`), records the image's real shape as the slot's display ratio (width ÷ height, one decimal), stores the alternative text given, and deletes the previous image only when it lived in the same bucket and is a different file; uploading the same bytes again keeps the same file. | uploaders | code › `visual.resolver.mutations.ts:146-170` · `visual.service.ts:182-203` · `document.service.ts:247-250` · test › `space-banner-constraints` › `TC-02` (uri path, ratio ≈ 10); `storage/uploads` › `upload visual`, `upload same visual twice` (slot uri equals the returned document) | proven (old-file deletion untested) |
| VIS-09 | A holder of "update" on a slot may change its alternative text (at most 120 characters) and its display ratio; the ratio must lie within the kind's current range — 6 to 10 for a banner, exactly the single value for every other kind — otherwise "Aspect ratio '<x>' is not in the allowed range of <min> - <max>!" and the stored ratio is left untouched; the current image address must be re-sent with the change. | space admin, profile manager | code › `visual.resolver.mutations.ts:34-48` · `visual.service.ts:71-83, 321-336` · `dto/visual.dto.update.ts` · test › `banner-aspect-ratio` › `accepts the lower bound (6) / an interior value (8) / the upper bound (10) and persists it`, `rejects just below the lower bound (5.9) / just above (10.1) / far below (1)`, `a rejected write leaves the stored ratio untouched` | proven |
| VIS-10 | The banner is the only adjustable slot. A banner slot that has never received an image carries the default ratio 10 (the slim strip); the moment an image is uploaded the ratio becomes the image's own, and the admin may then choose any value from 6 to 10. Banners already carrying an image were never reshaped by the platform. | space admin | code › `visual.constraints.ts:23-31, 49-58` · `src/migrations/1788300000000-SetBannerDefaultAspectRatio.ts` · test › `banner-aspect-ratio` › `BANNER is the adjustable type …` (default 10); `space-banner-constraints` › `TC-01` (stored default 10); client › `space-banner/bannerless-space-gradient.spec.ts` › TC-04/TC-06, `banner-crop-default-shape.spec.ts` › TC-05 | proven |
| VIS-11 | The banner's height bounds span its whole ratio range — minimum height = ⌈minimum width ÷ 10⌉ = 120, maximum height = maximum width ÷ 6 = 640 — so an upload at any allowed shape passes the size check. | server | code › `visual.constraints.ts:33-37, 49-58` · migrations `1785283200000`, `1787600000000` · test › `banner-aspect-ratio` › `BANNER is the adjustable type …` (both invariants); `configuration/banner-visual-constraints` › `TC-03` (minHeight invariant) | proven |
| VIS-12 | A new user, organisation or virtual contributor always gets an avatar: the one supplied at creation if it is a valid http(s) address, else the identity provider's picture (users signing in through Kratos), else a generated initials avatar (random background colour, white initials, 200 px, from `eu.ui-avatars.com`). The avatar is then downloaded and stored in the contributor's own bucket; if that fails the contributor is still created and keeps the external link (the failure is logged with host and status). | server, platform-operations-admin (re-host) | code › `src/domain/common/profile/profile.avatar.service.ts:52-156` · `src/services/external/avatar-creator/avatar.creator.service.ts:8-57, 70-117` · `storage.bucket.service.ts:867-899` · `user.identity.service.ts:303-312` · callers `user.service.ts:232-238, 274-278`, `organization.service.ts:159-164, 224`, `virtual.contributor.service.ts:163-166, 195` | untested |
| VIS-13 | At creation, a visual address is copied into the profile's bucket only when it already points at an Alkemio file; any other address is ignored with a warning — except an avatar from one of six trusted hosts (the initials service, LinkedIn's two media hosts, GitHub avatars, Microsoft Graph), which is accepted and re-hosted. | server | code › `profile.service.ts:463-477, 519-540, 740-747` · `src/domain/profile-documents/profile.documents.service.ts:60-73` · `schema.graphql:9547-9554` | untested |
| VIS-14 | A space created from a template takes the template's avatar, card and banner images unless the request supplies its own for that slot. | space creator | code › `src/domain/space/space.about/space.about.service.ts:455-478` | untested (templates area) |
| VIS-15 | Anyone who may read a profile may read its slots — address, shape, bounds, accepted formats, alternative text — one by kind or all at once; the image bytes themselves are a storage document under the profile's bucket, whose readability is the storage area's (crosscheck F1: direct-bucket files readable by anyone; F11: about-profile files of a private space readable by anyone). | all readers | code › `profile.resolver.fields.ts:35-51` · `schema.graphql:6186-6188, 8316-8340` · matrix › `access-matrix.md:2384-2420, 598-640`; `access-matrix-crosscheck.md:56-70` (F1, F11) · test › every read in `visual/*` (as the harness admin) | untested (admin reads proven) |
| VIS-16 | A media gallery's images and videos are slots too: adding or removing one needs "update" on the gallery; an image slot accepts the nine image formats at any size from 1 to 8000 px and a ratio from 0.01 to 100; a video slot accepts mp4, webm, ogg and quicktime. | callout managers | code › `src/domain/common/media-gallery/media.gallery.resolver.mutations.ts:42-70, 124-145` · `visual.constraints.ts:16-21, 89-108` | untested (see F4: the ratio column cannot hold the allowed range) |
| VIS-17 | A slot cannot be deleted on its own; it disappears with its profile (or when removed from a media gallery). Its image address is at most 2048 characters, its alternative text at most 120. | server | code › `visual.entity.ts:166-202` · `profile.service.ts:444-448` · `src/common/constants/entity.field.length.constants.ts:3, 40` · no `deleteVisual` resolver | untested |
| VIS-18 | A platform operations admin may force a contributor's avatar to be stored on Alkemio (re-hosting an external link); the action is audited. | POA | code › `src/platform-admin/services/avatars/admin.avatarresolver.mutations.ts:31-60` | untested |

### B. Rights: evidence

Evidence: access matrix `visual` (`access-matrix.md:2384-2420`, canonical `space-about@L1/profile/visual` under a public space — create/delete/grant/update C for `space-admin@L0` and `space-admin@L1`, CT for `platform-content-full-access`, read CTS for every role incl. anonymous; members, leads, `space-admin@L2` on the L1 slot hold nothing), `document` (`:598-640`) and crosscheck F1/F11 (`access-matrix-crosscheck.md:56-70`); `visual.resolver.mutations.ts:34-48, 76-134` (gates: UPDATE on the slot; FILE_UPLOAD on the bucket or the parent fallback); `visual.service.authorization.ts:200-216` (UPDATE ← CONTRIBUTE); `user.service.authorization.ts:243-252` (self CRUD); `organization.service.authorization.ts:212-242` (organisation admin); `media.gallery.resolver.mutations.ts:52-57, 134-139`; `admin.avatarresolver.mutations.ts:40-46` (`PLATFORM_OPERATIONS_ADMIN`); `config.resolver.fields.ts:15-19`. Proven cells: `space-banner-constraints › TC-02` and `banner-aspect-ratio › accepts …` (space admin via the harness admin), `storage/uploads › upload visual` (organisation avatar as the harness admin). The user/organisation PCFA cells and the private-space read cells are derived from the parent profile rules, not from the matrix (which covers space-about slots only).

The legend of the former who-may table, kept for the record (section 2 spells the roles out):

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. The old file wrote the findings as F-1 to F-8; they are F1 to F8 here, and "finding 4" in the old text is F4. "F1/F11" in VIS-15 and in the rights are findings of the access-matrix crosscheck, not of this file._

#### Findings

- **F1 — Two legacy suites disagree on the banner default ratio (VIS-03/10).** Code: `visual.constraints.ts:54` `aspectRatio: 10` (PR #6452). Tests: `visual/banner-aspect-ratio` and `space-banner-constraints › TC-01` pin 10 (the latter notes it "caught the 6 → 10 move on the 2026-09-03 nightly"); `configuration/banner-visual-constraints › TC-03` still pins `aspectRatio: 6`. Spec: client-web#10178 AC "10:1 instead of 6:1"; the approved client plan predates #6452 and says "= 1200/120/6/6/10". Ruling: rebaseline TC-03 to 10 (configuration area); no behaviour question.
- **F2 — The format allowlist is unproven and the one case named for it tests something else (VIS-05).** `storage/uploads › should not upload unsupported file type` uploads a 1299 px PNG to an avatar slot and asserts the **dimension** refusal. No case anywhere sends a non-image or an unlisted image type. Ruling: add a type-refusal case (and rename the storage case) — gap, not a product decision.
- **F3 — Declared type vs real type (VIS-05).** Code: the server checks the client-declared MIME against the visual allowlist (`visual.service.ts:270-296`); the file service sniffs the content against the **bucket** allowlist, which includes every document type (`mime.file.type.ts:17-20`). A PDF declared as `image/png` passes the server check, is accepted and written by the file service, and is refused only by "Image dimensions missing from upload response" — then deleted. Fail-closed, but the file is written first and the message is misleading. Test/spec: none. Ruling: pass the visual allowlist to the file service as the override (as the Collabora path does) so the content is refused before it is stored.
- **F4 — Ratio column cannot hold the media-gallery range (VIS-16).** Code: `aspectRatio` is `decimal(3,1)` ("< 99.9"), while MEDIA_GALLERY_IMAGE allows a ratio up to 100 and an upload computes `width / height` unbounded (an 8000 × 1 image → 8000.0). Test/spec: none. Ruling: clamp or widen the column; confirm live whether such an upload errors.
- **F5 — Re-hosted avatars are declared PNG whatever they are (VIS-12).** `avatar.creator.service.ts:119-132` hard-codes `image/png` (TODO #4459); the stored row carries the sniffed type, but the file is named `avatar` with no extension and the server-side allowlist check is nominal. Ruling: harmless today (the file service sniffs); tidy when the file container owns typing.
- **F6 — Error texts embed dynamic values (VIS-06/09).** `Upload image has a width resolution of '1299' …` and `Aspect ratio '5.9' …` contradict the repo rule against dynamic data in exception messages; two legacy cases pin substrings of them (`1200`, `not in the allowed range of 6 - 10`). Ruling: when the messages are cleaned, rebaseline those assertions; not a behaviour change.
- **F7 — `updateVisual` accepts any address (VIS-09).** Code: `uri` is required and written verbatim (`visual.service.ts:73`) with no check that it is an Alkemio document or even a URL; the test re-sends the current uri "or it fails at variable coercion before validation is reached". A holder of "update" on a slot can point it at an external image or an empty string. Creation-time addresses are checked (VIS-13), updates are not. Test/spec: none. Ruling: validate (Alkemio document only, or allowlisted hosts) or document it as intended for the migration/import tooling.
- **F8 — SVG is an allowed visual format but is excluded from conversation uploads as active content (VIS-05).** `mime.file.type.ts:28-32`: "SVG can carry active content, so it is not offered for member-to-member upload" — yet every profile slot accepts `image/svg+xml` and file-service passes SVG through unprocessed (VIS-07). Ruling: one policy for SVG (serve as attachment everywhere, or drop it from the visual list).

#### Open questions

- **OQ1 — file-service version.** Everything under VIS-07 (quality 82, 4096 px, HEIC primary frame, `.jpg` rename of 001 FR-011) is read from the `file-service` clone at `develop @ 2fddade`, not from the image deployed with Release/79, and no case exercises it. Confirm the deployed tag, then verify one HEIC upload live.
- **OQ2 — Who-may outside the space.** The access matrix's `visual` section covers space-about slots only; the user, organisation and VC avatar cells above are derived from the self-management and organisation-admin rules in code. Route to contributor-management, or extend the matrix generator to `user/profile/visual` and `organization/profile/visual`.
- **OQ3 — Is `configuration/banner-visual-constraints › TC-03` red on the nightly?** It pins the pre-#6452 default (6). Expected red since Release 74; check the last report before rebaselining.
- **OQ4 — Finding 4 live probe.** Whether an extreme-ratio media-gallery image fails at the database or is clamped somewhere unread.
- **OQ5 — No workspace spec for the banner work.** The client plan is explicit ("No workspace spec exists"); the whys for VIS-09/10/11 come from client-web#10178, server#6269 and migration comments. Decide whether a retrospec (`speckit-retrospec`) is wanted before the new core reimplements the adjustable banner.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: VIS-07, VIS-12, VIS-13, VIS-14, VIS-15, VIS-18; plus the untested clauses of VIS-01 (every owner but the space), VIS-04 (every refusal — member, lead, non-member, anonymous on a space slot; another user on a user avatar; a non-admin on an organisation avatar), VIS-05 (any type refusal), VIS-08 (previous image deleted only within the same bucket; same-bytes re-upload reuses the file), VIS-16 (add/remove, video format refusal), VIS-17 (no delete; lengths).

Behaviours the area has that neither reading nor tests pinned down:
- A HEIC upload end to end: accepted, stored as JPEG, measured after rotation, metadata gone (001 SC-001/002/004).
- An oversized image (4097 px side) scaled down; a 15 MB + 1 image refused on a visual.
- A rotated phone photo (EXIF orientation 6) judged by its post-rotation width/height.
- An avatar/card/wide-banner/preview upload at its own bounds (only the banner's 1200 floor is proven; the avatar's 190–410 only via the 1299 refusal).
- A new user with no supplied avatar getting the generated initials avatar and having it re-hosted; an OIDC (LinkedIn/GitHub/Microsoft) avatar accepted; an avatar from an untrusted host ignored.
- Creating a space whose request supplies visual addresses outside Alkemio (ignored) or inside Alkemio (copied into the new bucket).
- Alternative text persisted and read back; the 120-character limit.
- Fixed-shape kinds refusing a ratio change (only the banner range is proven).
- Who can read a private space's slot metadata and image bytes (F1/F11 — storage).
- The media gallery: add, upload, order, remove (CAL-40 has no server-api case either).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values and user-facing copy, Technical Lead for engineering limits and wire shapes, Security Lead for security limits. The "product must rule?" column is unchanged: the reviewer ticks the rows product must rule on. "F-4" in the tick column is finding F4._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Visual kinds (7) | `avatar`, `banner`, `card`, `bannerWide`, `whiteboardPreview`, `mediaGalleryImage`, `mediaGalleryVideo` (enum `VisualType`) | `visual.type.ts:24-32`; `schema.graphql:1193` | | Technical Lead |
| Slots per owner | space about: avatar+banner+card; user / organisation / VC: avatar; callout framing, post: banner+card; whiteboard: card+preview; memo, template, flow state, guidelines: card; innovation hub: wide banner; innovation pack: avatar+card | callers listed under VIS-01 | | Product Lead |
| AVATAR limits | 190–410 × 190–410 px, ratio 1 fixed | `visual.constraints.ts:39-48` | | Product Lead |
| BANNER limits | 1200–3840 × 120–640 px, default ratio 10, range 6–10 (history: 384–1536 × 64–256 ratio 6 → #6346 1536–3840 × 154–640 → #6439 1200/120 → #6452 default 10) | `visual.constraints.ts:49-58`; migrations `1785283200000`, `1787600000000`, `1788300000000` | | Product Lead |
| CARD limits | 307–410 × 192–256 px, ratio 1.6 fixed | `visual.constraints.ts:69-78` | | Product Lead |
| BANNER_WIDE limits (innovation hubs) | 640–2560 × 64–256 px, ratio 10 fixed — never touched by the banner migrations | `visual.constraints.ts:79-88` | | Product Lead |
| WHITEBOARD_PREVIEW limits | 500–1800 × 200–720 px, ratio 2.5 fixed | `visual.constraints.ts:59-68` | | Product Lead |
| MEDIA_GALLERY_IMAGE / _VIDEO limits | 1–8000 × 1–8000 px, default ratio 1, range 0.01–100; video formats mp4, webm, ogg, quicktime | `visual.constraints.ts:16-21, 89-108` | F-4 | Product Lead |
| Accepted image formats (9) | `image/png`, `image/jpeg`, `image/jpg`, `image/svg+xml`, `image/webp`, `image/gif`, `image/avif`, `image/heic`, `image/heif` (`VISUAL_ALLOWED_TYPES`; `MimeTypeVisual` additionally lists `image/bmp`, `image/x-png` for buckets) | `visual.constraints.ts:4-14`; `mime.file.type.visual.ts:3-15` | F-8 (SVG) | Product Lead (formats) · Security Lead (SVG, F8) |
| Bucket allowlist the sniffed type is checked against | `DEFAULT_ALLOWED_MIME_TYPES` = all document + all visual MIMEs (conversation buckets: minus SVG) | `mime.file.type.ts:17-39` | F-3 | Security Lead |
| Maximum file size | 15,728,640 bytes (bucket default; upload middleware; 001 FR-014 for HEIC) | `storage.bucket.service.ts:60`; `alkemio.yml:353-358` | | Product Lead |
| Upload stream timeout | 60,000 ms | `alkemio.yml:360`; `visual.service.ts:123-127` | | Technical Lead |
| Image processing (file service) | HEIC/HEIF → JPEG; JPEG/WebP → JPEG quality 82; longest side ≤ 4096 px; EXIF/IPTC/XMP stripped, orientation applied; PNG/BMP/AVIF re-encoded only to rotate; SVG/GIF untouched; primary frame only for multi-frame HEIC | spec 001 FR-003..FR-018; file-service `processor.go:33-85, 188-231` | | Technical Lead |
| Display ratio storage | decimal(3,1) — one decimal, below 99.9; upload writes `round1(width / height)` | `visual.entity.ts:184-185`; `visual.resolver.mutations.ts:158-168` | F-4 | Technical Lead |
| Alternative text / address length | 120 / 2048 characters | `entity.field.length.constants.ts:3, 40` | | Technical Lead |
| Image address shape | `/api/private/rest/storage/document/<document id>` | `document.service.ts:247-250`; test TC-02 | | Technical Lead |
| Default avatar | `https://eu.ui-avatars.com/api/?name=<first>+<last>&background=<random hex>&color=ffffff&size=200`; names reduced to `[a-z0-9-]` | `avatar.creator.service.ts:8, 45-68` | | Product Lead |
| Avatar precedence at creation | supplied http(s) URI → identity-provider `avatarURL` → generated | `profile.avatar.service.ts:59-83` | | Product Lead |
| Trusted external avatar hosts (6) | `eu.ui-avatars.com`, `ui-avatars.com`, `media.licdn.com`, `media.licdn-ei.com`, `avatars.githubusercontent.com`, `graph.microsoft.com` (https only) | `profile.service.ts:463-477, 740-747` | | Security Lead |
| Outbound image fetch | `User-Agent: Alkemio-Server (+https://alkem.io)`, `Accept: image/*`; static error `Error fetching or processing the image`; re-hosted file named `avatar`, declared `image/png` | `avatar.creator.service.ts:18-29, 70-132`; `storage.bucket.service.ts:884-896` | F-5 | Technical Lead |
| Error text — declared type | `Image upload type not in allowed mime types` (details: mimeType, allowedTypes), wrapped in `Upload on visual failed!` | `visual.service.ts:287-295, 208-217` | | Technical Lead |
| Error text — dimensions | `Upload image has a width resolution of '<w>' which is not in the allowed range of <min> - <max> pixels!` / `… height resolution …`; `Image dimensions missing from upload response — cannot validate against visual constraints` | `visual.service.ts:256-311` | F-6 | Technical Lead |
| Error text — ratio | `Aspect ratio '<x>' is not in the allowed range of <min> - <max>!` | `visual.service.ts:330-334` | F-6 | Technical Lead |
| Error text — kind | `Invalid VisualType: <name>`; `Visual type (name) must be provided when creating a visual.` | `visual.type.ts:42-45`; `visual.service.ts:50-53` | | Technical Lead |
| Log signatures | `AVATAR_NOT_STORED_LOCALLY` (profileID, avatarHost, httpStatus, errorCode); `Visual with URL '<uri>' ignored when creating profile <id>` | `profile.avatar.service.ts:141-153`; `profile.service.ts:537-541` | | Technical Lead |
| Authorization rules | privilege rule `POLICY_RULE_VISUAL_UPDATE` (`update` ← `contribute`); gates: `updateVisual` UPDATE, `uploadImageOnVisual` UPDATE + bucket `FILE_UPLOAD` (fallback UPDATE on gallery/profile/visual when the bucket has no rules); gallery add/remove UPDATE on the gallery; admin re-host `PLATFORM_OPERATIONS_ADMIN` | `visual.service.authorization.ts:200-216`; `visual.resolver.mutations.ts`; `media.gallery.resolver.mutations.ts`; `admin.avatarresolver.mutations.ts` | | Security Lead |
| GraphQL surface | `Visual{allowedTypes, alternativeText, aspectRatio, authorization, id, maxHeight, maxWidth, minHeight, minWidth, name, sortOrder, uri}`, `VisualConstraints{… minAspectRatio, maxAspectRatio}`, `Config.defaultVisualTypeConstraints(type)`, `Profile.visual(type)`, `Profile.visuals`, `MediaGallery.visuals`, `CreateVisualOnProfileInput{name, uri}`, mutations `updateVisual{visualID, uri!, alternativeText?, aspectRatio?}`, `uploadImageOnVisual(file){visualID, alternativeText?}`, `addVisualToMediaGallery`, `deleteVisualFromMediaGallery`, `adminUpdateContributorAvatars(profileID)`; enum `MimeTypeVisual` | `schema.graphql:1193, 2828, 4590-4591, 5474, 5492, 6186-6188, 8316-8360, 9320-9321, 9547-9554` | | Technical Lead |

### F. Where this lands in the new core

A visual is a typed image slot on the `space` document and on the `post` kinds (the catalogue's SP-2 "space document; file container blobs" and CT-9 "content-addressed blobs; upload by signed token to the file container"). Every rule above stays a behaviour; what changes is where the limits live. Three facts found here should shape the model: (1) the limits are **denormalised per row today** and have needed three data migrations for one slot kind (VIS-02) — the new core should keep limits on the kind (one table or constants) and store on the slot only what the user chose: the image blob, the alternative text and, for the banner, the chosen ratio; (2) the real image shape is decided by the file container after re-encoding (VIS-06/07/08) — keep "measure after canonicalise, then validate, then delete on refusal" as one transactional step in the file container rather than a server-side compensation; (3) the default avatar and the external-host allowlist (VIS-12/13) are a sign-up concern that should move with identity resolution, and the declared-type check (F-3) should disappear in favour of the sniffed type only. The adjustable banner (VIS-09/10/11) is the one piece of product logic: default 10, range 6–10, pixels win on upload — it belongs on the space document as a typed column. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/visual/`, 2 files, 14 cases = 14 test blocks, 0 skipped) plus the visual cases of `storage/uploads` and `configuration/banner-visual-constraints` (listed, cross-referenced); the specs, issues and docs listed in § Sources. Scope: the visual slots every profile carries (avatar, banner, card, wide banner, whiteboard preview, media-gallery image and video), their allowed formats and sizes, what an upload does to the image, the adjustable banner shape, default and re-hosted avatars. Who may read the image **bytes** is the storage area (matrix `document`, crosscheck F1/F11) and is cross-referenced, not re-derived; media-gallery framing behaviour is CAL-40. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `visual-dossier.md`.

2026-11-19 converted to the three-section layout. The single why was split over three columns without rewording, the who-may table was rebuilt as section 2, and every finding, open question and rule without a stated reason became a row in section 3 with an owner.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains. No new source was found; Q-VIS-01 and Q-VIS-17 stay open.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/common/enums/visual.type.ts`, `mime.file.type.visual.ts`, `mime.file.type.ts`, `mime.file.type.document.ts`; `src/common/constants/entity.field.length.constants.ts`, `authorization/policy.rule.constants.ts`
- `src/domain/common/visual/visual.constraints.ts`, `visual.entity.ts`, `visual.interface.ts`, `visual.service.ts`, `visual.service.authorization.ts`, `visual.resolver.mutations.ts`, `dto/visual.dto.{create,update,upload.image,delete}.ts`
- `src/domain/common/profile/profile.service.ts`, `profile.avatar.service.ts`, `profile.resolver.fields.ts`, `profile.service.authorization.ts`; `src/domain/profile-documents/profile.documents.service.ts`; `src/services/external/avatar-creator/avatar.creator.service.ts`
- `src/domain/storage/storage-bucket/storage.bucket.service.ts`; `src/domain/storage/document/document.service.ts`; `src/platform/configuration/config/config.resolver.fields.ts`; `src/platform-admin/services/avatars/admin.avatarresolver.mutations.ts`; `src/domain/common/media-gallery/media.gallery.resolver.mutations.ts`
- owners: `src/domain/space/space.about/space.about.service.ts`, `src/domain/community/user/user.service.ts`, `user.service.authorization.ts`, `src/domain/community/user-identity/user.identity.service.ts`, `src/domain/community/organization/organization.service.ts`, `organization.service.authorization.ts`, `src/domain/community/virtual-contributor/virtual.contributor.service.ts`, `src/domain/collaboration/callout-framing/callout.framing.service.ts`, `src/domain/collaboration/post/post.service.ts`, `src/domain/common/whiteboard/whiteboard.service.ts`, `src/domain/common/memo/memo.service.ts`, `src/domain/template/template/template.service.ts`, `src/domain/collaboration/innovation-flow/innovation.flow.service.ts`, `src/domain/community/community-guidelines/community.guidelines.service.ts`, `src/domain/innovation-hub/innovation.hub.service.ts`, `src/library/innovation-pack/innovation.pack.service.ts`
- `src/migrations/1770909862763-AddHeicHeifMimeTypes.ts`, `1785283200000-WidenSpaceBannerVisualConstraints.ts`, `1787600000000-LowerSpaceBannerMinWidth.ts`, `1788300000000-SetBannerDefaultAspectRatio.ts`
- `alkemio.yml` (`storage.file`); `schema.graphql`
- git: `05d284bc7` (#5834), `64ca38f1b` (#6346), `5ad0dbb84` (#6439), `5971a138f` (#6452), `d24f19435` (#6053), `1ed43bc5d` (#5976), `9a42ab29c` (#6396), `3f0fb84f9` (#5969)
- file-service (develop @ `2fddade`, read for delegation only): `internal/imaging/processor.go`, `internal/domain/service/ingest.go`

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/visual/banner-aspect-ratio.it-spec.ts`, `space-banner-constraints.it-spec.ts`, `visual.request.params.ts`; `lib/src/scenario/fixtures/pngFixture.ts` (`createPngFixture`)
- cross-referenced: `server-api/src/functional-api/configuration/banner-visual-constraints.it-spec.ts`; `storage/uploads.it-spec.ts` (`Upload visual tests`, `Upload visual to innovation space`), `storage/upload.params.ts` (`uploadImageOnVisual`); `storage/auth/*-document-auth.it-spec.ts` (set-up only)
- `client-web/src/functional-e2e/space-banner/space-banner-test-plan.md`, `bannerless-space-gradient.spec.ts`, `banner-crop-default-shape.spec.ts`; `chat-avatars/chat-avatars-test-plan.md` (presentational)
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ `visual`, `document`, `profile`), `access-matrix-crosscheck.md` (F1, F3, F11), `callout.md` (CAL-29, CAL-40), `_inventory.md:3451-3475`; `catalogue/README.md` (SP-2, CT-9)

Specs / issues:
- server `specs/001-heic-jpeg-conversion/spec.md` (FR-001..FR-018, SC-001..SC-009, Clarifications), `specs/102-space-member-file-upload/spec.md` (FR-001..FR-009, storage cross-reference), `specs/039-media-gallery-contributions` (via CAL-40)
- alkem-io/client-web#10178 (default banner behaviour; PRs client-web#10222, server#6439, server#6452); alkem-io/server#6269 (higher-resolution banners; PR #6346); server PRs #5834, #5976, #6053, #6396; issue #4459 (file-type detection TODO)
- no workspace spec for the banner work (client plan statement); `agents-hq/specs/033-chat-avatars` is presentational and out of scope
- 2026-11-20 whys pass: no new sources; `src/platform-admin/services/avatars/admin.avatarresolver.mutations.ts` (mutation description) read for VIS-18
