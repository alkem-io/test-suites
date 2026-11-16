# Data findings of the acceptance review, with their rulings (W4)

_Acceptance data, backup of 2026-11-11, all seven databases restored locally. Counts only: no ids, names or e-mail addresses. Nothing here was applied to any database. Production was not analysed._

The architect classified every row of the acceptance database by the rules of the legacy server and reported 25 findings in three classes. QA reviewed each finding on its own copy of the data, ruled what should happen to each part, and wrote a read-only guard for every check. This page lists each finding with its ruling, ties it to the rows of the [defect register](acc-defect-register.md) that describe the same data, and to the features of the [catalogue](../catalogue/README.md), so that a feature owner sees which data problems sit under the feature.

**Not the same numbering as the register.** The ids A1 to C9 on this page are the architect's finding ids. The [defect register](acc-defect-register.md) of 2026-10-28 uses its own ids (A1 to T1) for QA's earlier signatures. The column *Register rows* names the register rows that describe the same data, and the register has a column that points back here. A register row with no finding was not part of the review of the architect.

## How to read a row

| Column | Meaning |
|---|---|
| Class | The architect's class. **orphaned**: the owner of the row is gone. **bug heritage**: the row breaks a rule of the legacy server. **valid**: allowed by the legacy rules but a problem. |
| Ruling | What QA rules for the rows: reject (not copied to the new database), repair (copied, then corrected), keep (copied as stored), track (kept, with a follow-up). |
| Status | **accepted**: the QA lead accepted the ruling. **proposed**: reviewed by QA, awaiting the QA lead. |
| Guards | The read-only checks of the finding in the QA guard kit. The kit runs on any backup. It is not in this repository yet. |
| Tracked | Cases of data that is kept on purpose, each with an owner follow-up (T-numbers of the kit). |

## Findings

### A. Rows whose owner is gone

| ID | Finding | Class | Acceptance count | Register rows | Features | Ruling | Status | Guards | Tracked |
|---|---|---|---|---|---|---|---|---|---|
| <a id="a1"></a>A1 | Leftover migration backup tables | orphaned | 5,322 rows in 6 tables (8,423 in 12 with the stale ones) | H1 | [OP-1](#op-1), [AI-1](#ai-1) | Reject by table. Exception: keep the one table that maps 450 old virtual contributor ids in room thread data until those are rewritten (C3) | accepted | A1 G1–G2 | — |
| <a id="a2"></a>A2 | Accounts and licences that belong to nobody | orphaned | 712 rows (43 accounts) | E3 | [SP-13](#sp-13), [LI-1](#li-1) | Reject, after the guards read 0. 2 accounts carry an outside subscription id: look up the billing record first | accepted | A2 1–4 | — |
| <a id="a3"></a>A3 | Space structure with no owner | orphaned | 762 rows | F4, F5, P1, P5 | [SP-6](#sp-6), [SP-8](#sp-8), [SP-10](#sp-10), [CT-14](#ct-14), [CM-6](#cm-6) | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted | A3 G1–G8 | — |
| <a id="a4"></a>A4 | Unreferenced classification and tag-template containers | orphaned | 4,295 rows | — | [SP-9](#sp-9), [SP-6](#sp-6) | Reject, after the guards show no live callout or callouts set lost its container | accepted | A4 G1–G8 | — |
| <a id="a5"></a>A5 | Profiles, tags, locations, visuals and references with no owner | orphaned | 6,729 rows | F5 | [ID-3](#id-3), [SP-2](#sp-2), [SP-6](#sp-6) | Reject or follow the owner. A profile that a live row still names is a repair, not a reject | accepted | A5 G1–G4 | — |
| <a id="a6"></a>A6 | Storage, files and documents with no owner | orphaned | 3,772 rows | F6 | [CT-9](#ct-9), [CT-4](#ct-4), [CT-6](#ct-6), [SP-6](#sp-6) | Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it | accepted | A6 G1–G9, body scans | — |
| <a id="a7"></a>A7 | AI personas, virtual contributors and knowledge bases with no owner | orphaned | 192 rows | E5 | [AI-1](#ai-1), [AI-2](#ai-2) | Reject the 159 personas and 3 knowledge bases. Keep the 10 virtual contributors whose knowledge source is gone, unchanged, and track them | accepted | A7 G1–G15 | T1 |
| <a id="a8"></a>A8 | Credentials with no holder or pointing at deleted things | orphaned | 178 rows | B1, B2 | [MB-4](#mb-4), [MB-8](#mb-8), [SP-6](#sp-6) | Reject. No live role definition uses a deleted id | accepted | A8 G1–G12 | — |
| <a id="a9"></a>A9 | Authorization policies held by nothing | orphaned | 23,258 rows | G1 | [MB-9](#mb-9), [SP-6](#sp-6), [CM-1](#cm-1) | Reject, except 130 policies that belong to the kept virtual contributors. 58 live conversations with an empty rule are kept and tracked | accepted | A9 G1–G19 | — |
| <a id="a10"></a>A10 | Activity entries, rooms and conversations of deleted owners | orphaned | 966 rows | D2, F5, F8, P1, T1 | [CT-12](#ct-12), [CT-3](#ct-3), [CM-1](#cm-1), [CM-6](#cm-6) | Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step | accepted | A10 G1–G9 | T2 |
| <a id="a11"></a>A11 | Small leftovers | orphaned | 223 rows | D5, E4 | [MB-2](#mb-2), [MB-7](#mb-7), [ID-3](#id-3), [ID-6](#id-6) | Reject. 3 keys of the web assistant that looked orphaned are valid and kept | accepted | A11 G1–G9 | — |

### B. Rows that break the old system's own rules

| ID | Finding | Class | Acceptance count | Register rows | Features | Ruling | Status | Guards | Tracked |
|---|---|---|---|---|---|---|---|---|---|
| <a id="b1"></a>B1 | Duplicate or empty names where the old system requires unique ones | bug heritage | 96 rows (104 by the QA rule) | F3, L1, L2, L6 | [CT-1](#ct-1), [CT-4](#ct-4), [CT-14](#ct-14), [CT-15](#ct-15), [CM-1](#cm-1), [SP-8](#sp-8) | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted | B1 G1–G18 | T3, T30 |
| <a id="b2"></a>B2 | Spaces with an inconsistent hierarchy or a forbidden name | bug heritage | 13 spaces | C1, C2 | [SP-4](#sp-4), [SP-5](#sp-5), [SP-7](#sp-7), [SP-11](#sp-11) | Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word | accepted | B2 G1–G20 | T4, T32 |
| <a id="b3"></a>B3 | Content that contradicts its declared type | bug heritage | 115 rows | F2 | [CT-1](#ct-1), [CT-2](#ct-2), [CT-4](#ct-4), [CT-6](#ct-6), [MB-3](#mb-3) | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted | B3 G1–G15 | T5, T6 |
| <a id="b4"></a>B4 | Values outside the allowed vocabulary | bug heritage | 955 rows | C5, D2, L1 | [MB-9](#mb-9), [LI-1](#li-1), [CT-9](#ct-9), [CT-10](#ct-10), [MB-3](#mb-3), [SP-8](#sp-8) | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted | B4 G1–G16 | T7, T8 |
| <a id="b5"></a>B5 | Files breaking their bucket limits | bug heritage | 7 files | — | [CT-9](#ct-9), [CT-6](#ct-6) | Keep all 7. Three checks are open: a running server, production counts, bucket limits on import | accepted | B5 G1–G8 | T9 |

### C. Valid rows with notable problems

| ID | Finding | Class | Acceptance count | Register rows | Features | Ruling | Status | Guards | Tracked |
|---|---|---|---|---|---|---|---|---|---|
| <a id="c1"></a>C1 | Organizations without an owner | valid | 127 organizations (architect 125) | E2, K1 | [MB-7](#mb-7) | Keep all, change nothing. An organization without an owner is valid data. Product decides for the 40 nobody can act for | accepted | C1 G1–G11 | T10 |
| <a id="c2"></a>C2 | Users without a login binding | valid | 13 users | E1, I1, I2 | [ID-1](#id-1), [ID-4](#id-4) | Keep all 13. Users are never deleted. The impact is settled later from production counts and team knowledge | accepted | C2 G1–G7 | T11 |
| <a id="c3"></a>C3 | Virtual contributor conversation bindings | valid | 515 bindings in 237 rooms | — | [AI-1](#ai-1), [CT-3](#ct-3) | Rewrite 428 old ids, remove 25 bindings that name no virtual contributor, keep the rest. 362 bindings sit on thread ids the chat server no longer has | accepted | C3 G1–G6 | T12 |
| <a id="c4"></a>C4 | Credential hygiene | valid | 13,119 credentials | A7, B1, B3, B4, B5, K4 | [LI-1](#li-1), [MB-4](#mb-4), [MB-8](#mb-8), [AI-1](#ai-1) | Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked | accepted | C4 G1–G20 | T13–T16 |
| <a id="c5"></a>C5 | Missing creator and author attribution | valid | 123 person ids that name nobody, in 17 columns | F8, F9, M5 | [CT-1](#ct-1), [CT-12](#ct-12), [CM-4](#cm-4), [ID-4](#id-4) | Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data | accepted | C5 G1–G13 | T17, T18 |
| <a id="c6"></a>C6 | File contents missing from storage | not classified | 730 stored files on 1,501 file rows; 729 with no off-site copy | C5, M1, S1, S2 | [CT-9](#ct-9), [CT-6](#ct-6) | Keep every file row and link. Counted from a listing of the acceptance file store on 2026-11-16, which matches the architect | accepted | C6 G1–G12, volume check | T19–T21 |
| <a id="c7"></a>C7 | URL handles: invalid, reserved, duplicate and colliding names | valid | 66 handles fail the new rule | C2, E6 | [SP-11](#sp-11), [SP-7](#sp-7), [CT-1](#ct-1) | Keep every handle; a rename breaks an address with no redirect. One callout with no handle gets one (repair rehearsed) | accepted | C7 G1–G13 | T22, T23 |
| <a id="c8"></a>C8 | Role definitions scoped to the wrong space | not classified | 162 definitions in 54 spaces | A1, A2, A3, A4 | [MB-4](#mb-4), [SP-4](#sp-4), [SP-5](#sp-5) | Repair in five steps that go together, so that nobody loses a role (rehearsed). One-entry parent lists on second-level subspaces are a live generator and are tracked | accepted | C8 G1–G15 | T24–T26 |
| <a id="c9"></a>C9 | Other visible inconsistencies | valid | see the parts | F7, L5, M2 | [SP-2](#sp-2), [SP-8](#sp-8), [CT-2](#ct-2), [MB-7](#mb-7) | Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern | accepted | C9 G1–G15 | T27–T29 |

## By feature

Every catalogue feature that has at least one finding.

### ID-1

Sign-up, email verification, sign-in, sign-out, password recovery

| Finding | Ruling | Status |
|---|---|---|
| [C2](#c2) Users without a login binding | Keep all 13. Users are never deleted. The impact is settled later from production counts and team knowledge | accepted |

### ID-3

User profile, references, tagsets, user settings

| Finding | Ruling | Status |
|---|---|---|
| [A5](#a5) Profiles, tags, locations, visuals and references with no owner | Reject or follow the owner. A profile that a live row still names is a repair, not a reject | accepted |
| [A11](#a11) Small leftovers | Reject. 3 keys of the web assistant that looked orphaned are valid and kept | accepted |

### ID-4

Account deletion and admin identity operations

| Finding | Ruling | Status |
|---|---|---|
| [C2](#c2) Users without a login binding | Keep all 13. Users are never deleted. The impact is settled later from production counts and team knowledge | accepted |
| [C5](#c5) Missing creator and author attribution | Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data | accepted |

### ID-6

MCP API keys

| Finding | Ruling | Status |
|---|---|---|
| [A11](#a11) Small leftovers | Reject. 3 keys of the web assistant that looked orphaned are valid and kept | accepted |

### SP-2

Space profile, about, tagline, tags, visuals and banner

| Finding | Ruling | Status |
|---|---|---|
| [A5](#a5) Profiles, tags, locations, visuals and references with no owner | Reject or follow the owner. A profile that a live row still names is a repair, not a reject | accepted |
| [C9](#c9) Other visible inconsistencies | Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern | accepted |

### SP-4

Subspaces (L1, L2): create, pin, sort, sidebar

| Finding | Ruling | Status |
|---|---|---|
| [B2](#b2) Spaces with an inconsistent hierarchy or a forbidden name | Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word | accepted |
| [C8](#c8) Role definitions scoped to the wrong space | Repair in five steps that go together, so that nobody loses a role (rehearsed). One-entry parent lists on second-level subspaces are a live generator and are tracked | accepted |

### SP-5

Move or convert a subspace between levels and parents

| Finding | Ruling | Status |
|---|---|---|
| [B2](#b2) Spaces with an inconsistent hierarchy or a forbidden name | Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word | accepted |
| [C8](#c8) Role definitions scoped to the wrong space | Repair in five steps that go together, so that nobody loses a role (rehearsed). One-entry parent lists on second-level subspaces are a live generator and are tracked | accepted |

### SP-6

Delete a Space; orphan-free deletion

| Finding | Ruling | Status |
|---|---|---|
| [A3](#a3) Space structure with no owner | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted |
| [A4](#a4) Unreferenced classification and tag-template containers | Reject, after the guards show no live callout or callouts set lost its container | accepted |
| [A5](#a5) Profiles, tags, locations, visuals and references with no owner | Reject or follow the owner. A profile that a live row still names is a repair, not a reject | accepted |
| [A6](#a6) Storage, files and documents with no owner | Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it | accepted |
| [A8](#a8) Credentials with no holder or pointing at deleted things | Reject. No live role definition uses a deleted id | accepted |
| [A9](#a9) Authorization policies held by nothing | Reject, except 130 policies that belong to the kept virtual contributors. 58 live conversations with an empty rule are kept and tracked | accepted |

### SP-7

Admin: space visibility, licence, nameID

| Finding | Ruling | Status |
|---|---|---|
| [B2](#b2) Spaces with an inconsistent hierarchy or a forbidden name | Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word | accepted |
| [C7](#c7) URL handles: invalid, reserved, duplicate and colliding names | Keep every handle; a rename breaks an address with no redirect. One callout with no handle gets one (repair rehearsed) | accepted |

### SP-8

Innovation flow and states (stages), default callout templates per state

| Finding | Ruling | Status |
|---|---|---|
| [A3](#a3) Space structure with no owner | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted |
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |
| [C9](#c9) Other visible inconsistencies | Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern | accepted |

### SP-9

Classifications and sidebar widgets

| Finding | Ruling | Status |
|---|---|---|
| [A4](#a4) Unreferenced classification and tag-template containers | Reject, after the guards show no live callout or callouts set lost its container | accepted |

### SP-10

Community guidelines

| Finding | Ruling | Status |
|---|---|---|
| [A3](#a3) Space structure with no owner | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted |

### SP-11

URL resolution and lookups (nameID, legacy URLs)

| Finding | Ruling | Status |
|---|---|---|
| [B2](#b2) Spaces with an inconsistent hierarchy or a forbidden name | Repair 7 (leftover parent pointer, 6 twins on one handle; rehearsed). Keep and track 2 sub-subspaces on a fourth level and 2 spaces on a restricted word | accepted |
| [C7](#c7) URL handles: invalid, reserved, duplicate and colliding names | Keep every handle; a rename breaks an address with no redirect. One callout with no handle gets one (repair rehearsed) | accepted |

### SP-13

Accounts: hosted resources and transfers between accounts

| Finding | Ruling | Status |
|---|---|---|
| [A2](#a2) Accounts and licences that belong to nobody | Reject, after the guards read 0. 2 accounts carry an outside subscription id: look up the billing record first | accepted |

### MB-2

Apply for membership; admin approves or rejects; application form

| Finding | Ruling | Status |
|---|---|---|
| [A11](#a11) Small leftovers | Reject. 3 keys of the web assistant that looked orphaned are valid and kept | accepted |

### MB-3

Invitations: existing user, by email, organisation, platform

| Finding | Ruling | Status |
|---|---|---|
| [B3](#b3) Content that contradicts its declared type | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted |
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |

### MB-4

Roles: assign and remove for users, organisations, VCs; leave; access loss

| Finding | Ruling | Status |
|---|---|---|
| [A8](#a8) Credentials with no holder or pointing at deleted things | Reject. No live role definition uses a deleted id | accepted |
| [C4](#c4) Credential hygiene | Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked | accepted |
| [C8](#c8) Role definitions scoped to the wrong space | Repair in five steps that go together, so that nobody loses a role (rehearsed). One-entry parent lists on second-level subspaces are a live generator and are tracked | accepted |

### MB-7

Organisations: create, edit, verify, settings, associates, domain match

| Finding | Ruling | Status |
|---|---|---|
| [A11](#a11) Small leftovers | Reject. 3 keys of the web assistant that looked orphaned are valid and kept | accepted |
| [C1](#c1) Organizations without an owner | Keep all, change nothing. An organization without an owner is valid data. Product decides for the 40 nobody can act for | accepted |
| [C9](#c9) Other visible inconsistencies | Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern | accepted |

### MB-8

Platform roles and credentials

| Finding | Ruling | Status |
|---|---|---|
| [A8](#a8) Credentials with no holder or pointing at deleted things | Reject. No live role definition uses a deleted id | accepted |
| [C4](#c4) Credential hygiene | Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked | accepted |

### MB-9

Authorization policies and reset cascades

| Finding | Ruling | Status |
|---|---|---|
| [A9](#a9) Authorization policies held by nothing | Reject, except 130 policies that belong to the kept virtual contributors. 58 live conversations with an empty rule are kept and tracked | accepted |
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |

### CT-1

Callouts: create per type, edit, publish, visibility, sort, transfer, forms

| Finding | Ruling | Status |
|---|---|---|
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |
| [B3](#b3) Content that contradicts its declared type | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted |
| [C5](#c5) Missing creator and author attribution | Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data | accepted |
| [C7](#c7) URL handles: invalid, reserved, duplicate and colliding names | Keep every handle; a rename breaks an address with no redirect. One callout with no handle gets one (repair rehearsed) | accepted |

### CT-2

Contributions: posts, links, whiteboards, memos on callouts; move and reorder

| Finding | Ruling | Status |
|---|---|---|
| [B3](#b3) Content that contradicts its declared type | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted |
| [C9](#c9) Other visible inconsistencies | Keep all. Phase problems are for the space admins, who are informed. Never delete "test data" by a name pattern | accepted |

### CT-3

Comments, replies, reactions, mentions, read marks (rooms)

| Finding | Ruling | Status |
|---|---|---|
| [A10](#a10) Activity entries, rooms and conversations of deleted owners | Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step | accepted |
| [C3](#c3) Virtual contributor conversation bindings | Rewrite 428 old ids, remove 25 bindings that name no virtual contributor, keep the rest. 362 bindings sit on thread ids the chat server no longer has | accepted |

### CT-4

Whiteboards: editing, drafts, guest access, content replace

| Finding | Ruling | Status |
|---|---|---|
| [A6](#a6) Storage, files and documents with no owner | Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it | accepted |
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |
| [B3](#b3) Content that contradicts its declared type | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted |

### CT-6

Collabora (office) documents

| Finding | Ruling | Status |
|---|---|---|
| [A6](#a6) Storage, files and documents with no owner | Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it | accepted |
| [B3](#b3) Content that contradicts its declared type | Repair 95, keep 3, leave out 17 empty responses. No whiteboard is removed. On production every part is read row by row first | accepted |
| [B5](#b5) Files breaking their bucket limits | Keep all 7. Three checks are open: a running server, production counts, bucket limits on import | accepted |
| [C6](#c6) File contents missing from storage | Keep every file row and link. Counted from a listing of the acceptance file store on 2026-11-16, which matches the architect | accepted |

### CT-9

Files, references, media gallery, storage buckets and document access

| Finding | Ruling | Status |
|---|---|---|
| [A6](#a6) Storage, files and documents with no owner | Reject, except 29 files that 16 live whiteboards show: those are repaired. A stored file is never deleted because a rejected row names it | accepted |
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |
| [B5](#b5) Files breaking their bucket limits | Keep all 7. Three checks are open: a running server, production counts, bucket limits on import | accepted |
| [C6](#c6) File contents missing from storage | Keep every file row and link. Counted from a listing of the acceptance file store on 2026-11-16, which matches the architect | accepted |

### CT-10

Calendar events (incl. whole-day and timezone)

| Finding | Ruling | Status |
|---|---|---|
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |

### CT-12

Activity log and activity feed

| Finding | Ruling | Status |
|---|---|---|
| [A10](#a10) Activity entries, rooms and conversations of deleted owners | Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step | accepted |
| [C5](#c5) Missing creator and author attribution | Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data | accepted |

### CT-14

Templates and the innovation library; template defaults; file repair

| Finding | Ruling | Status |
|---|---|---|
| [A3](#a3) Space structure with no owner | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted |
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |

### CT-15

Innovation packs and hubs

| Finding | Ruling | Status |
|---|---|---|
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |

### CM-1

Direct and group conversations (chat), Matrix session

| Finding | Ruling | Status |
|---|---|---|
| [A9](#a9) Authorization policies held by nothing | Reject, except 130 policies that belong to the kept virtual contributors. 58 live conversations with an empty rule are kept and tracked | accepted |
| [A10](#a10) Activity entries, rooms and conversations of deleted owners | Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step | accepted |
| [B1](#b1) Duplicate or empty names where the old system requires unique ones | Repair, never delete. 10 phase tags that match no phase move to the current phase of their flow (repair rehearsed). 3 duplicate guidance chats are kept. The other repairs have no repair file yet | accepted |

### CM-4

Notifications: in-app inbox, email, settings, blacklist, recipients

| Finding | Ruling | Status |
|---|---|---|
| [C5](#c5) Missing creator and author attribution | Keep every row and every stored id. A placeholder is a display rule of the new server, not a rewrite of the data | accepted |

### CM-6

Admin communication operations (Matrix reconcile, orphaned rooms)

| Finding | Ruling | Status |
|---|---|---|
| [A3](#a3) Space structure with no owner | Reject with the credentials, notifications and invitations that name it. The chat server rooms need their own step. 8 of the leftovers come from failed space creations (server#6596, fixed) | accepted |
| [A10](#a10) Activity entries, rooms and conversations of deleted owners | Reject 911 activity entries, repair 3. Reject 47 room rows; the rooms behind them on the chat server need a separate step | accepted |

### AI-1

Virtual contributors: create, settings, knowledge base, platform well-known, roles

| Finding | Ruling | Status |
|---|---|---|
| [A1](#a1) Leftover migration backup tables | Reject by table. Exception: keep the one table that maps 450 old virtual contributor ids in room thread data until those are rewritten (C3) | accepted |
| [A7](#a7) AI personas, virtual contributors and knowledge bases with no owner | Reject the 159 personas and 3 knowledge bases. Keep the 10 virtual contributors whose knowledge source is gone, unchanged, and track them | accepted |
| [C3](#c3) Virtual contributor conversation bindings | Rewrite 428 old ids, remove 25 bindings that name no virtual contributor, keep the rest. 362 bindings sit on thread ids the chat server no longer has | accepted |
| [C4](#c4) Credential hygiene | Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked | accepted |

### AI-2

AI server and AI personas

| Finding | Ruling | Status |
|---|---|---|
| [A7](#a7) AI personas, virtual contributors and knowledge bases with no owner | Reject the 159 personas and 3 knowledge bases. Keep the 10 virtual contributors whose knowledge source is gone, unchanged, and track them | accepted |

### LI-1

License plans, assignments, entitlements, credential rules

| Finding | Ruling | Status |
|---|---|---|
| [A2](#a2) Accounts and licences that belong to nobody | Reject, after the guards read 0. 2 accounts carry an outside subscription id: look up the billing record first | accepted |
| [B4](#b4) Values outside the allowed vocabulary | Repair five of six parts to the value the server writes today. Invitations to people who are not registered are always kept. Phase names with a comma are left to the space admins, who are informed | accepted |
| [C4](#c4) Credential hygiene | Keep every credential with a holder. Merge 179 exact second copies (repair rehearsed). Lapsed plus trials stay and are tracked | accepted |

### OP-1

Admin data operations and background tasks

| Finding | Ruling | Status |
|---|---|---|
| [A1](#a1) Leftover migration backup tables | Reject by table. Exception: keep the one table that maps 450 old virtual contributor ids in room thread data until those are rewritten (C3) | accepted |

## Features with no finding

ID-2, ID-5, SP-1, SP-3, SP-12, MB-1, MB-5, MB-6, CT-5, CT-7, CT-8, CT-11, CT-13, CT-16, CM-2, CM-3, CM-5, AI-3, OP-2, OP-3.

No finding does not mean clean data: a row of a kind nobody has looked for is counted as valid.

## Related, outside the 25 findings

- **Register A1** (147 admin role definitions of subspaces that list a member credential of a space above, MB-4): a separate finding, counted by guard C8 G14. It is not repaired by C8.
- **Live generators.** Some rows are still being created by the current server: the double credential grant (C4), the one-entry parent lists (C8, a regression of server#5203), bindings left behind when a virtual contributor is deleted (C3). Until the server is fixed, a clean-up does not stay clean.
- **Outside the main database.** The chat server (A3, A10), the AI engine store (A7) and file storage (A6, C6) each need their own step.

## What is not verified

- **Production.** Every number is from acceptance. Production can hold kinds of bad data that acceptance does not have.
- **A running server.** Server behaviour was read from the code of `alkem-io/server` `develop` (2026-11-10), not tried. Every repair was rehearsed on the local copy inside a transaction that was rolled back.
- **The new server.** What it refuses or changes on import is not known for most findings and is listed as questions for the architect.

## Maintenance

Generated by `_tools-gen-findings.py` in this folder. The finding table is hand-maintained in that file; the index by feature is computed from it and checked against the catalogue's feature ids. The same run writes the column *Finding (2026-11 review)* into `acc-defect-register.md` from the table `REG`; it is safe to run again.
