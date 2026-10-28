# ACC data-defect register — W4 seed

_Known data-defect signatures on the acceptance dataset, measured 2026-10-28 on v0.170.2 across all seven databases on the acceptance postgres server (alkemio, kratos, hydra, synapse, wopi, assistant, filebackup). Read-only audit; nothing filed, nothing written. Queries: [`acc-audit-queries/`](acc-audit-queries/README.md). Identifiers are stripped here; the local outputs hold the ids._

This is step 1 of the W4 addendum in [`../plan.md`](../plan.md#w4-addendum--data-quality-the-acceptance-dataset-and-the-production-data-we-may-not-see): the register the reconciliation runs net of. Each row is one signature with its count on ACC, its likely origin, and a **proposed** classification of what the rebuild does with it. The classification is a QA proposal until decision 8 (expected-loss list) and decision 11 (ETL quarantine contract) are taken with the backend team.

**Severity.** H = grants or denies access, or breaks a tree or a URL · M = wrong behaviour or data-loss risk · L = noise or housekeeping · info = measured for the baseline only.

**Proposed classification.**

| Code | Meaning | Where it lands |
|---|---|---|
| **V** | vanishes by construction: the new core does not store the thing (policies, derived credentials, lifecycle blobs, counters) | expected-loss list, no ETL work; verify the ETL does not re-create it |
| **R** | must be repaired by the ETL or before the dry run: would reproduce the defect, or breaks the mapping | ETL spec; a probe on the post-image confirms count 0 |
| **E** | drop in the ETL as an expected loss: orphan or dangling rows nothing references | expected-loss list with the count |
| **Q** | quarantine: the ETL cannot map it; it must report the rows, never drop silently | ETL quarantine contract (decision 11) |
| **P** | repair on the legacy side now, independent of the migration | follow-up list; owner named |
| **O** | ops hygiene on a legacy store that is retired or re-created at cutover | ops; not a migration item |
| **ruling** | product decides what the right state is before any of the above | decision 7 / 8 |

## A. Authorization and roles

| # | Sev | Signature | ACC count | Likely origin | Proposed | Query |
|---|---|---|---|---|---|---|
| A1 | H | Subspace ADMIN role whose `parentCredentials` holds an **ancestor's** `space-member` credential, so every ancestor member is admin of the subspace (CRUD + GRANT, live in `authorization_policy`) | 147 roles (88 L1, 59 L2); 69 users; 1,492 user × subspace grants | 2022–mid-2023 legacy `community_policy`, copied verbatim by the 2024-09 roleSet migration; 3 L2s created in 2025 inherited it | **P** now (live escalation on ACC; draft issue held locally, unfiled; production unchecked) · **V** at the rebuild, provided the ETL never translates `parentCredentials` into grants | 03, 10, 12 |
| A2 | H | Subspace role set whose member/lead/admin credential `resourceID` is **another space**: in 51 of 54 its own L2 child, 48 of them created within 60 s of the parent. Nobody holds membership on the space's own id; `communication.spaceID` empty on all 54 | 54 spaces (52 L1, 1 L0, 1 L2); 162 roles; 2025-07 → 2026-08, still occurring | Nested creation path (space template with subspaces, or create-subspace-with-child) writes the child's id into the parent's role credentials. Not yet reproduced | **R**: the ETL must key membership by role-set owner, not by the credential's `resourceID` · product defect to reproduce (W1 `journey` area) | 03, 10, 12 |
| A3 | H | `parentCredentials` whose `resourceID` is not an ancestor; L2 roles with 1 parent credential instead of 2, L1 with 2 | 414 roles | Downstream of A2 and of cross-level moves | **V** (parent credentials are not stored in the new model) | 03 |
| A4 | M | Subspace member credential without the parent space's member credential; 121 of them also lack L0 membership | 246 (users 141, orgs 102); 100 created 2025, 42 in 2026 | Removal and move paths revoke upward but not downward (server#6710 family) | **ruling** then **R** (grant the parent) or **E** (drop the child) | 02, 10 |
| A5 | M | `space-admin` or `space-lead` without `space-member` on the same space | 67 (45 of them organisations) | Org lead assignment skips the entry role | **R** | 02 |
| A6 | M | Organisation owner/admin credential without `organization-associate` | 757 credentials, 26 users | Legacy or seeding; entry-role rule not enforced for orgs | **R** | 02 |
| A7 | M | `space-subspace-admin` without `space-admin` on the same space (73); L0 `space-admin` without `space-subspace-admin` (289) | 362 | Derived credential not maintained symmetrically | **V** (derived credentials disappear with the SQL verdict) | 02 |
| A8 | M | `account-admin` held by someone who is neither the account's user nor an owner/admin of its organisation (7); org owner/admin lacking `account-admin` (2) | 9 | — | **R** | 02 |
| A9 | M | `space-invitee` with no pending invitation (23) or actor already a member (31); pending invitations for members (22); pending applications for members (54); duplicate pending applications (3) / invitations (1) | 134 | Accept/decline flows leave the marker credential | **E** (stale `membership_request` rows dropped, counted) | 10, 11 |

## B. Credential hygiene

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| B1 | M | Credentials with `actorId` NULL | 54 | **Q** | 02 |
| B2 | M | `space-*` credentials pointing at deleted spaces (133); `organization-*` at a deleted org (5); `account-*` at a deleted account (2) | 140 | **E** | 02 |
| B3 | L | Duplicate (actor, type, resourceID) credentials | 182 | **E** (dedupe, counted) | 02 |
| B4 | L | Expired `space-license-plus` credentials still present | 54 | **V** (plans resolved at read) | 02 |
| B5 | M | Spaces with more than one `space-license-*` credential (57); L0 without any (4); subspace holding one (1); accounts without `account-license-*` (774 of 975); accounts holding `space-*` credentials (4) | — | **R** into the plan tables | 02, 10 |

## C. Space hierarchy

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| C1 | H | Broken tree: one level-0 space **with** a parent (an L1), its two children with `levelZeroSpaceID` pointing at it; two L2 spaces under an L2 parent | 5 spaces | **R before the first dry run**, or **Q**: a tree ETL fails on first contact | 04, 10 |
| C2 | H | Duplicate **L0** nameIDs (URL collision) ×3 pairs; duplicate sibling nameIDs ×2 pairs | 5 pairs | **R before the first dry run**: `resolve(url)` cannot be unique otherwise | 04 |
| C3 | M | Subspace visibility ≠ its L0's visibility | 11 | **R** | 04 |
| C4 | L | Public subspace under a private parent (allowed by the model) | 441 | none; layer 4 sample | 04 |
| C5 | M | L0 storage aggregator without parent (95), pointing at another account's aggregator (2), subspace aggregator parent ≠ parent space (1), aggregators with empty `type` (118) | 216 | **V** if the file container drops aggregators; confirm | 04, 10 |

## D. Communication, lifecycles, invitations

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| D1 | M | `communication.spaceID` empty (350 L0 / 802 L1 / 366 L2 → server#6594) or wrong (190 = parent id, 117 = other space) | 1,825 | **V** (thread anchors come from the tree, not from a `communication` row) | 01, 08, 10 |
| D2 | L | Communications without updates room (6); rooms with empty `type` (5); conversations with fewer than 2 members (96, 9 with zero) | 107 | **E** | 08 |
| D3 | M | `lifecycle.machineState` in three formats: xstate v5, xstate v4 legacy (115), empty string (258) | 373 | **V** (`membership_request` carries a plain state) | 10, 11 |
| D4 | L | `platform_invitation` whose e-mail is already a registered user (86); `profileCreated=true` still carrying `roleSetId` (89) | 175 | **E** | 11 |
| D5 | L | Unowned lifecycles | 85 | **E** | 01 |

## E. Users, organisations, accounts, virtual contributors

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| E1 | M | Users with `authenticationID` NULL (11 from 2022–2023, 1 from 2025-12, 1 service profile 2026-09): no Kratos identity can be matched | 13 | **Q** (see I1, I2) | 07, 10 |
| E2 | M | Organisations with zero owners (126, 40 with neither owner nor admin); zero associates (372 of 500) | 126 | **ruling** | 07 |
| E3 | M | Accounts referenced by no user and no organisation | 43 | **E** | 07 |
| E4 | L | Orphan `user_settings` (2); active `mcp_api_key` for a deleted user (2); `organization_verification` without org (3) | 7 | **E** | 01 |
| E5 | L | `ai_persona` rows with no virtual contributor (159); VCs whose `bodyOfKnowledgeID` points nowhere (10) | 169 | **E** / **Q** for the 10 | 07 |
| E6 | L | Duplicate `actor.nameID` within type `space` across trees | 109 | none (see C2 for the harmful cases) | 04 |

## F. Collaboration content and storage

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| F1 | M | Callouts with comments **enabled** but no comments room | 1,915 | **ruling**: lazily created thread on the new core, or a loss | 08 |
| F2 | M | `callout_framing` type ≠ attached content (94); `none` framing with content (2); contributions with no content or type mismatch (17) | 113 | **Q** | 08 |
| F3 | L | Duplicate callout nameID inside one callouts set | 38 | **R** (URL uniqueness) | 08 |
| F4 | M | Orphan `template_content_space` not referenced by any template, each carrying a collaboration, community and about | 310 of 465 | **E** | 06 |
| F5 | L | Unowned rows across 19 entity types (calendar_event 145, profile 33, storage_aggregator 29, room 21, communication 20, community_guidelines 17 …) | ~360 | **E** | 06 |
| F6 | M | Storage: buckets owned by nothing (841, 72 holding files); files without bucket (573, ongoing: 155 in 2026); temporary files never attached (58); files without authorization policy (3,129); `file_backup_outbox` rows for deleted files (8), dead-letter (5) | — | **E** for orphans, **V** for policies; layer 3 (content hashes) decides what is a loss | 06, 11 |
| F7 | L | Profiles with empty displayName (community-guidelines 1,306, innovation-flow 315 …) | 1,624 | none | 11 |
| F8 | L | Activity feed: collaboration gone (911), resource gone (~2,800), `triggeredBy` deleted (4,405) | ~8,100 | **E** (append-only activity: drop dangling, counted) | 11 |
| F9 | L | Deleted-user references kept on content (`callout.createdBy` 2,160, `file.createdBy` 938, contributions 247, notifications 191 …) | — | **ruling**: tombstone actor or null | 11 |

## G. Authorization policy table

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| G1 | M | Orphan `authorization_policy` rows: room 1,772, tagset 1,624, `context` 951 (dead type), template 795, visual 693, innovation-flow-state 682 … | ~9,400 of 348k; table 594 MB | **V** | 05 |
| G2 | M | Policies referenced by more than one entity (cascade and reset side effects) | 578 | **V** | 05 |
| G3 | M | `file.authorizationId` NULL | 3,129 | **V** | 05 |

## H. Housekeeping (alkemio)

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| H1 | L | Migration backup tables still present (`_agent_backup_*`, `_agent_table_backup`, `_auth_profile_backup_*`, `_invitation_contributor_type_backup`) | 12 tables | **E** (never migrated) | 09 |
| H2 | L | `authorization_policy` 594 MB with 37k dead tuples; `whiteboard` 75 MB; `callout_contribution_defaults` 66 MB | — | **O** | 09 |

## I. Identity (Kratos ↔ Alkemio)

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| I1 | M | Alkemio users with **no Kratos identity** at all (phantoms that can never log in) | 12 | **Q**, then **ruling** (delete before cutover?) | 13 |
| I2 | L | User with NULL `authenticationID` but a matching active, verified identity by e-mail | 1 | **P** (relink) | 13 |
| I3 | M | Kratos identities with **no Alkemio user** (all 2026, 3 verified): registrations that never completed profile creation | 12 | **E** on the Kratos side, or re-trigger profile creation | 13 |
| I4 | L | Users whose identity e-mail is unverified | 56 | none | 13 |

## J. Settings payloads

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| J1 | L | `space.settings.privacy.userInformationVisibility` present on only 2 spaces (partial key rollout) | 2 | **V** (settings re-shaped; default applies) | 14 |
| J2 | L | Spaces with duplicate `sortOrder` among siblings | 2 | **R** | 14 |
| J3 | L | Organisations with empty `domain` / `legalEntityName` | 95 | none | 14 |
| J4 | L | VCs `listedInStore=true` with `searchVisibility` account (156) or hidden (2) | 158 | **ruling** | 14 |

## K. Membership policy and community health

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| K1 | M | Spaces exceeding the lead role's organisation maximum | 5 | **Q** | 14 |
| K2 | M | L0 spaces with zero members (8); L0 with no admin or lead and the account host not a member (11) | 8 / 11 | **ruling** | 16 |
| K3 | L | Subspaces with no admin and no lead of their own (admin inherited) | 404 | none; layer 4 sample | 16 |
| K4 | M | L0 holding plus/premium `space-license-*` while the owning account has no `account-license-*` (13); one enabled entitlement with limit 0 | 14 | **R** into the plan tables | 16 |
| K5 | L | Active `mcp_api_key` rows past `expiresAt` | 3 | **E** | 16 |

## L. Callouts, flow states, classification

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| L1 | M | `flow-state` tagset tags not in their `tagset_template.allowedValues` (template not updated on state rename); the state names still match in all but 14 | 1,100 (994 in real spaces) | **R**: the stage mapping must key on the flow's state names, never on the template | 14, 16 |
| L2 | L | Callouts whose flow-state tag names a state that no longer exists in the flow | 14 | **Q** | 16 |
| L3 | M | Published callouts without `publishedDate` (2024–2025, path fixed since); draft callouts carrying one | 1,159 / 130 | **R** (derive from status; drop on drafts) | 14 |
| L4 | L | Callout sets with duplicate `sortOrder` values | 1,215 sets | **R** (deterministic order on import) | 16 |
| L5 | L | Flow-state duplicate displayName (2), duplicate sortOrder (4), flows with more than 8 states (10) | 16 | **Q** | 16 |
| L6 | L | Tagset duplicate name within one profile | 23 | **E** | 14 |
| L7 | M | `template_content_space` L1/L2 rows without parent | 144 of 438 | **E** (with F4) | 16 |

## M. Visuals, files, content

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| M1 | M | Visual URIs (4) and reference URIs (10) pointing at a storage document that no longer exists | 14 | **E** | 14 |
| M2 | L | Visuals with empty URI (defaults) 23,318; external visual URIs 76; empty reference URIs 2,984; empty link URIs 468 | — | none | 14 |
| M3 | L | One `externalID` shared by up to 1,203 file rows (content-addressed dedupe); zero-byte files | 25 | layer 3 fact: 20,074 files = 8,937 blobs | 14 |
| M4 | L | Whiteboards with empty content (173) or above 1 MB (2); memos empty (65); **two storage formats coexist** (2,655 compressed, the rest raw JSON) | 240 | **R**: the document ETL must decompress | 15 |
| M5 | L | Deleted author ids kept on whiteboards 576, posts 406, discussions 34, memos 31 | 1,047 | **ruling** (with F9) | 15 |
| M6 | L | Profiles without location 2,462; fully empty user profiles 6 | — | none | 14 |

## N. Kratos store

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| N1 | L | Self-service flow tables never cleaned: every stored flow is expired; 122k of the login flows are `type=api` test-harness logins | 136k rows, 211 MB, ~85 % of the DB | **O** (`kratos cleanup` job) | 22 |
| N2 | L | Sessions never pruned (9,144 inactive and expired; 2,387 `active=true` but expired) | 11,561 | **O** | 22 |
| N3 | L | `oidc` credentials with `providers: null` and no identifier row (abandoned social-link flows) | 4 | **O** | 22b |
| N4 | L | Addresses `verified=true` with `status='sent'`, all from one bulk admin verification | 14 | none | 22 |
| N5 | L | Identities with no `metadata_public` (4 of them have an Alkemio user: metadata never written) | 13 | **R** on the Kratos side (metadata is the identity ↔ user link) | 22b |
| N6 | L | Identities with empty name traits | 3 | none | 22 |
| N7 | info | Courier failures in 3 SMTP outages (72); messages to e-mails no longer identities (97) | 72 / 97 | none | 22 |
| N8 | info | `selfservice_errors`: OIDC provider 403s (2025-04), oidc-service post-login webhook giving up (2026-03 → 06), CSRF 2022–23 | 224 | none | 22 |
| N9 | info | Identities carrying an external CDN picture URL in traits | 5 | none | 22 |

## O. Hydra store

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| O1 | L | No janitor: all access tokens expired but `active=true`; refresh tokens, auth codes, sessions retained | ~4k rows | **O** | 24 |
| O2 | L | Token / session subjects whose Kratos identity no longer exists (Hydra not notified on identity deletion) | 22 subjects | **O** | 24b |
| O3 | L | A local-development OAuth client with `localhost` redirect URIs registered on ACC | 1 client | **P** (hygiene) | 24 |
| O4 | info | Auth sessions with `expires_at IS NULL` (pre-migration rows) (18); unused logout requests (3) | 21 | none | 24 |
| O5 | info | One subject holds 441 of 922 auth sessions (repeated login flow) | 441 | none | 24 |

## P. Synapse store

Mapping used: Matrix user `@<alkemio actor id>:<matrix host>`; room alias `#<alkemio room id>` for content rooms, `#<alkemio actor id>` for `m.space` rooms (one per space actor).

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| P1 | M | **Orphan Matrix rooms**: no alias at all (318; 238 from 2026, still 41 in 2026-10) or alias pointing at nothing in alkemio (109; 86 still have real members); 281 messages inside | 427 rooms | **E** for the rooms, counted in layer 6; product defect: entity deletion / rollback never removes the room (ongoing) | 23, 23b, 23c |
| P2 | M | **Alkemio rooms with no Matrix room**: 6 group conversations (0 msgs) + 1 direct conversation with `messagesCount=1` | 7 | **Q** (a thread anchor with no room) | 23b, 29c |
| P3 | L | `room.messagesCount` drift vs non-redacted `m.room.message` (90 under, 10 over) | 100 of 10,571 | **V** (counts derived); layer 6 tolerance = this list | 23b |
| P4 | L–M | **Orphan Matrix accounts** for deleted actors (displayname kept, 65 still joined, 1,780 messages by deleted senders) | 84, ongoing | **P** (PII residue; deactivate on actor deletion) | 23c |
| P5 | L | Pending `invite` memberships, 2,498 in `updates` rooms, 361 to actors that no longer exist | 2,504 | **ruling**: the AppService model changes at the rebuild | 23c |
| P6 | L | Rooms with zero joined members (293 of them P1); `room_stats_current.joined_members` over-counted | 307 / 1,414 | **E** | 23 |
| P7 | info | `threads` rows for purged rooms (142); redactions not censored (2) | 144 | **O** | 23 |
| P8 | info | State groups referenced by no event (~128 MB); `device_lists_changes_in_room` 327k rows | — | **O** (`synapse_auto_compressor`, purge) | 23 |
| P9 | info | Rooms created by real users instead of the adapter admin (9); one extra admin account with a password; one deactivated account still joined to 3 rooms | 11 | none | 23 |

## Q–R. WOPI and assistant stores

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| Q | ✓ | Tokens 0, locks 0, 23 preview-cache rows all pointing at existing files | clean | — | 25 |
| R1 | info | LangGraph checkpoint threads with no conversation or invocation row; everything else empty | 5 threads | **E** | 26 |

## S. File backup (offsite target)

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| S1 | **H** | **2026 blobs missing from the offsite backup**: distinct `externalID`s created 2026 (Jun 628, Aug 115, May 103, Apr 38) absent from `file_backup_object`; their outbox rows are `status=skipped`, `attempts=0`, no `lastError` (3,780 file rows); 668 file rows have no outbox row. Not a size threshold; mostly images and office documents | 719 blobs / 1,475 files / 1.75 GB | **P** before any cutover (decision 12 input): find the consumer's skip rule, backfill, then layer 3 proves every legacy hash is present | 27, 27b, 29, 29b |
| S2 | M | 2023 blobs never backfilled (2024 and 2025 backfill ≈ 99 %) | 938 of 1,038 (149 MB) | **P** | 29 |
| S3 | L | Outbox dead-letter: `invalid content hash: 46 chars, want 64` (legacy externalIDs) (5); file-service fetch failures (2) | 7 | **R**: the plan's hash-function match applies to legacy ids too | 27 |
| S4 | info | Backup objects whose externalID no longer exists in alkemio (deleted files kept offsite) | 2,092 | **ruling** (retention) | 29 |

## T. Alkemio rooms found via the Matrix check

| # | Sev | Signature | ACC count | Proposed | Query |
|---|---|---|---|---|---|
| T1 | L | `room` rows no entity points to (10 callout, 6 updates, 4 discussion_forum, 1 conversation) | 21 | **E** | 29c |

## Checks that came back clean

Space ↔ community/collaboration/about/license/storage links · L0 `accountId` · `platformRolesAccess` · settings keys · `role_set.parentRoleSetId` · org role sets and role policies · user-self / global-registered per user · account-host uniqueness · `innovation_flow.currentState` · MCP keys → actors · `user_settings.homeSpace` shape · template ↔ content type · in-app notification refs · VC ↔ persona link · whiteboard content never references a missing storage document · poll votes · classification entries · push subscriptions · well-known guidance VC exists · every alkemio user, org and VC has a Matrix user · no dangling Matrix aliases/memberships/events · Kratos: all identities active, one e-mail per identity, bcrypt throughout · Hydra: 3 clients, no orphan flows · WOPI clean.

## False positives already dropped

`account-host` credential type no longer exists · `community.parentID` holds the space id (correct) · `actor.profileId` NULL for spaces by design · `space-*` LIKE also matches `space-license-*` / `space-feature-*` held by space actors · `space-feature-*` vs `space-flag-*` naming differs by design · whiteboard "not JSON" = compressed format · `wellKnownVirtualContributors` is a `mappings` array · 25 Kratos password credentials with no hash = social sign-ups · Hydra "unmatched subjects" first count loaded the CSV header as a row (corrected in `24b`) · 146 calendar-event rooms reported orphan by `29b` (join omitted `calendar_event.commentsId`, corrected in `29c`) · Synapse `users` 1,021 vs alkemio `user` 435 is expected (orgs and VCs get Matrix users).

## What the register changes in W4

1. **Before the first dry run:** C1 and C2 must be repaired or excluded (the tree and URL layers fail on them); S1/S2 must be backfilled or every "legacy hash present" check in layer 3 reports a known gap of 719 + 938 blobs.
2. **The expected-loss list (decision 8)** starts from every **V** and **E** row with its count: ~9,400 policies, ~8,100 activity rows, 427 Matrix rooms, 310 + 144 template sub-levels, 182 + 140 + 54 credentials, 373 lifecycle blobs, 1,825 communication ids.
3. **The quarantine contract (decision 11)** has concrete shapes to ask for: B1, C1, E1/I1, F2, K1, L2, L5, P2.
4. **Layer 6 (chat parity)** gets its tolerance list from P1–P3 instead of assuming zero drift.
5. **Three product defects are live, not historical:** A2 (role credentials keyed on the child), P1 (rooms outlive their entity), F6 (files without bucket). They belong in the W1 documents as "legacy status: defective" and in W2's walks as negative checks.
6. **Rerun on PROD** is the next measurement: the queries are environment-agnostic; an operator runs them and returns aggregates only.
