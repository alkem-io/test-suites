# Access matrix — cross-check: code vs acceptance data vs tests

_Companion to [`access-matrix.md`](access-matrix.md). Written 2026-10-29. Sources: `alkem-io/server` `origin/develop` @ `eeecf9ddb` (the derivation); the acceptance database on 2026-10-29 (v0.170.2, read-only aggregate dump with `_tools/access/acc-aggregates.sql`, no ids kept); the `platform-roles` (30 files, 2,071 cases) and `storage` (9 files, 917 cases) suites as collected in `_inventory.md` from test-suites `origin/develop` @ `df149442`. The authorization builders are byte-identical between `eeecf9ddb` and the `v0.170.2` tag (`git diff v0.170.2..eeecf9ddb -- '*service.authorization.ts'` is empty), so code and data are compared on the same rules. Every disagreement is classified **data defect** (the stored row is wrong and the register already knows it or now does), **code path** (the code does this and nothing tests it), or **derivation** (the matrix had it wrong and was corrected before this document was written). Nothing was filed; findings are for the QA lead to route._

## Totals

| Comparison | Result |
|---|---|
| Stored policy shapes vs derived rules, per resource type | 37 live policy types compared; the modal stored shape of every type equals the derived rule list (names, privileges, cascade flags, criterion kinds) once the register's A1/A3 rows and the orphan/stale rows are netted out — § 1.2 |
| Code-vs-data disagreements | 11 findings — 7 data defects (4 already in the register, 3 new signatures), 3 code paths with no test, 1 derivation correction — § 1.3 |
| `storage` suite (917 cases) | 896 decision-table cases mapped to a cell, **896 agree**, 0 disagree; 21 upload cases are not access cells; 0 unmapped — § 2.1 |
| `platform-roles` suite (2,071 cases) | 125 capability rows mapped to a cell (1,735 cases), **124 agree**, 0 disagree, 1 declaration-only row (0 cases); 2 rows / 28 cases unmapped (resolver pinned to a retired credential); 299 scenario cases and 9 coverage-guard cases are not access cells — § 2.2 |
| Cells no test touches | 60,451 of 61,811 (resource, role, privilege) cells; the tests touch 1,360 — § 3 |

## 1. Code vs acceptance data

### 1.1 What was netted out first

The dump is 348,156 `authorization_policy` rows over 67 type values. Before comparing shapes, these known signatures were removed from the comparison:

| Register row | How it shows in the stored rules | Rows affected (upper bound, rules × policies) |
|---|---|---|
| **A1** — subspace ADMIN role whose `parentCredentials` carries an ancestor's *member* credential | `credentialRule-spaceAdmins` (and the rules derived from the same credential list: `spaceAdminUpdateNameID`, `Space Admin receive notifications`, `roleSetAssign`, `roleSetEntryRoleInvite`, `contributionAdminsMove`, `postAdminsMove`, `Callout read access for draft callouts`) whose criteria mix `space-admin@id` and `space-member@id` | space 205 + 142 + 142; role-set 200 + 147 + 147; callout 1,014; callout-contribution 690 + 540; post 114 + 94; document 383; storage-bucket 2,743; profile 2,543; tagset 3,258 — i.e. every ancestor member holds CRUD + GRANT on those subspaces and everything under them, live |
| **A3** — `parentCredentials` of the wrong length | L1 roles with two parent credentials (2 × 3 roles) and L2 roles with one (136 × 3); on L2 admin roles with two parents, `parentCredentials[0]` is the direct parent in 249 of 347 and `[1]` the grandparent in 255 of 347 | the `space-admin@idx3` criteria on L1 policies and `@id`-only admin criteria on L2 policies |
| **A2** — role credential issued against another space's id | 1 L0 role and 2 L1 roles joined through a live space whose credential `resourceID` is not the space itself; 13 admin / 8 lead / 8 member role rows have an **empty** credential `resourceID` (a type-only criterion: every `space-admin` on the platform would match) — none of them is reached through a live space, so they sit on orphan role sets, but they are a new signature for the register | none live |
| **A7** — derived `space-subspace-admin` asymmetry | not visible: the derived credential appears only as a criterion of `roleSetEntryRoleInvite` where `allowSubspaceAdminsToInviteMembers` is set (267 + 178 + 153 + … role-set rules) | — |
| **G1** — orphan policies | policies whose rules still name a retired credential (`global-admin` 36,201 criteria, `global-support` 12,175, `global-spaces-read` 11,722, `global-community-read` 2,819, `global-license-manager` 1,425, `account-host` 1,008, …) are, with the exceptions in § 1.3 F2, exactly the rows no live entity points at: account 122 of 1,097 policies (957 accounts exist), template 790 of 2,647 (1,852 templates), `context` 949 of 951 (dead type), `space-defaults` 251, `unknown` 150, `communication-messaging` 309 of 310 (one live messaging), `ai-persona` 347 of 395, `user-settings` 80 of 519 (437 live) | excluded |
| **G2** — shared policies | not visible at shape level | — |
| stale reset worker | no live space policy carries a retired credential (0 of 1,943 spaces, 0 of 4,130 actors); the live rows that still do are leaves — § 1.3 F2 | — |

Nobody on the acceptance environment holds any of the retired credential types (the `credential` table has only current types: 3,937 `space-member`, 1,863 `space-lead`, 1,365 `account-admin`, 1,256 `space-admin`, 357 `space-subspace-admin`, 219 `space-invitee`, 6 `platform-operations-admin`, 5 `platform-support`, 4 each of `platform-license-manager` / `platform-roles-admin` / `platform-users-admin`, 3 `platform-settings-admin` / `platform-resource-admin`, 2 `platform-content-full-access`, 1 `platform-spaces-reader`, 1 `feature-beta-tester`, 1 `feature-vc-campaign`), so a stale rule grants nothing today; it only proves which rows the last reset did not rewrite.

### 1.2 Agreed shapes

Method: `_tools/access/acc-aggregates.sql` § 2 lists every distinct credential rule per policy type (rule name, cascade flag, granted privileges, criterion types with ids reduced to `@id`); § 5/5b/5c list the full rule list of space, role-set and callouts-set policies per settings variant; § 10/10b the document and bucket policies per owning profile type. `gen_access_matrix.py --dump-rules <resource> <variant>` prints the derived list for the same variant. The two were compared rule by rule.

| Resource type (policies on ACC) | Modal stored shape under the matching variant | Verdict |
|---|---|---|
| space (3,375 incl. 1,415 about policies still typed `space`; 175 distinct shapes) | L0 private/active (131): the 13 rules of `space@L0` under `priv-applications`; L0 public (119): `pub-open`; L1 public under public L0 (341 with support, 113 without): `space@L1` under `t-pub-pub`; private L1 (72): the `Private spaces content…` + `spacePlatformSettings read-about` pair; archived L0 (5): only the root, license, reader and resource-admin rules — no member/admin rules | agreed; every other shape is one of the netted signatures or a flag combination the variants cover (`memberCreateSubspace`, support on, `account-admin@idx2..4` = several open invitations) |
| role-set (2,461; 142 shapes) | L0 private/applications (131): 7 rules = derived `role-set@L0` under `defaults`; L1 public/open (338 + 117 + 88): parent-member join + non-member join (`allowSubspaceAdminsToInviteMembers` on the L0) + assign/invite for admins with parents; L1 applications (50): parent-member apply + non-member apply; invitations (10): no entry rule at all | agreed, including the combined-eligibility rules (`subspaceNonMember*` 533 + 101, `subspaceAncestorMember*` 92) |
| community (1,960) | space rules + `communityReadGlobalRegistered` on public spaces (1,412) | agreed |
| collaboration (2,411), callouts-set (2,705), callout (17,644; 144 shapes) | `collaborationContributors` update for admins (no parents) and contribute for members (+ parent members where `inheritMembershipRights`), transfer offer/accept for the resource admin, `create→create-callout` (+ `contribute→create-callout` on 1,270 sets); callouts: creator CRUD (12,134), publisher rule (17,551), per-type privilege rules (create-post 2,830, contribute 2,798, create-whiteboard 1,170, move-task 4), draft read rule (90 + 40 + 31 + 27 + 16 …) | agreed; `callout` policies inherit the **collaboration** policy, not the callouts-set's (`callouts.set.service.authorization.ts:69`), which the data confirms (no `create-callout` privilege rule on callouts) |
| callout-contribution (4,829), post (1,010), link (2,998), whiteboard (2,828), memo (253), collabora-document (119), media-gallery (172), poll (31) | creator rules (`contributionCreatedBy` 3,604 + non-cascading delete 3,604; `postCreatedBy` 1,010; `linkCreatedBy` 2,361; `whiteboard-created-by` 2,078; `memoCreatedBy` 214; `collaboraDocumentCreatedBy` 112; `media-gallery-created-by` 90); mover rules (`contributionAdminsMove` 2,208 + …, `postAdminsMove` 262 + …) listing the resource admin, the admins with parents and support where flagged; whiteboard `contribute→update-content` 2,085 / `update→update-content` 716 / `grant→public-share` 300 matching the 2,110 / 716 / 2 content-update policies and the guest-contribution spaces | agreed |
| document (16,954), storage-bucket (44,392), profile (38,869), visual (32,907), reference (4,698), tagset (70,132) | inherited parent rules + `documentCreatedBy` CRUD (1,855 explicit; the rest inherit the callout/contribution creator rules), bucket privilege rules `update→file-upload` / `contribute→file-upload` / `delete→file-delete` on all 43,310 live buckets, `contribute→update` on 32,101 visuals, `platformSupportOrgResources→create,file-upload,update` threaded on 1,965 profiles / 2,064 visuals / 1,965 buckets / 37 references | agreed; see F1 for the direct buckets |
| space-about (994 + 1,415 typed `space`), community-guidelines (2,920) | `Read access to About` cascading READ for the visibility criteria (anonymous/guest/registered where the chain is public, members of the parent, invitees, resource admin); guidelines add anonymous READ unconditionally | agreed (and the storage suite confirms the About documents of a private L0 are world-readable — intended) |
| account (1,097) | 975 fresh: 13 rules = derived `account`; +`platformSupportOrgResources` on the 502 organisation-hosted accounts | agreed |
| innovation-pack (105), innovation-hub (14), templates-set (578), template (2,647) | account child-entity CRUD+GRANT + anonymous READ (+ support org-resources on organisation accounts, 53 packs / 9 hubs / 140 templates) | agreed |
| user (441), user-settings (519) | 435 fresh users: 7 rules = derived `user`; PII readers = self, users-admin, the admins of the user's spaces, the admins of the user's organisations (138 + 54 + 37 + 26 + 20 + 19 + 15 + 12 + 12 + 7 … combinations) | agreed |
| organization (500), organization-verification (500), organization role-set | 497 fresh: 5 rules = derived `organization`; role-set adds assign (admins), apply (registered), support membership (cascading) + support invite; verification = support read/update/grant + account-admin read/update, no inheritance | agreed |
| virtual-contributor (282), knowledge-base (458), ai-persona (395) | platform-settings → operations admin (279), account-admin manage (279), visibility READ rule by `searchVisibility` (public 89 = anonymous+registered; account 73 + 40 + 30 + 16 … = one `space-member` criterion per space of the account; hidden 3 = none); knowledge base `contents visible` READ (8 + 2) vs `contents not visible` READ_ABOUT (83 + 73 + …) | agreed |
| platform (1), platform role-set (1), forum (1), discussion (103), library (1), licensing (1), license-policy (1), messaging (1), conversation (648), virtual-assistant (1), ai-server (1) | the 18 platform rules, the 4 role-set rules, forum read/contribute/create-discussion, discussion `updateForumDiscussion` for support (90) + anonymous READ on public discussions, licensing `licenseManager` CRUD for settings-admin + `licensePlanUsage` GRANT for the license manager + reset, messaging `create` for registered, conversation participants READ+CONTRIBUTE (578 + 77 + 75 …), virtual-assistant manage/read, ai-server CRUD for content-full-access + reset/persona-create for operations | agreed |
| application (270), invitation (612), calendar-event (151), innovation-flow (2,851), room (12,350), license (7,816), user-group (11) | applicant read/update/delete; invitee's account admin read/update/accept; event creator CRUD; `create→update-innovation-flow`; room `create→create-message…` (12,309) + `contribute→reply/react` (12,275) + `contribute→create-message` (10,145 — not on the 2,152 `updates` rooms); user-group member READ | agreed |

`platformRolesAccess` (stored per space, § 8) also matches the derivation: anonymous/guest/registered carry `read-about` and (public only) `read` exactly where every ancestor is public (147 + 40 + 28 L0 public shapes vs 142 + 102 + 3 private; 391 + 114 L1 under a readable chain vs 194 + 180 + 90 + 23 not), the license manager only on L0, the resource admin `read,read-about` everywhere, support `create,delete,grant,read,update` only where the L0 flag is on (147 + 31 with `public-share`) or the parent has it (378 L1 with the flag off themselves — the subspace flag is inert, § 1.3 F8).

### 1.3 Disagreements and findings

| # | Finding | Evidence | Class |
|---|---|---|---|
| **F1** | **Every document in a space's direct storage bucket is readable without signing in, whatever the space's privacy.** `storage.aggregator.service.authorization.ts:52` appends anonymous + registered READ (cascading) to the aggregator of every space, account, user and organisation; the direct bucket and its files inherit it. The space-tree variants of the matrix show `anonymous: read` on `storage-aggregator@L0/bucket/document` under `priv-applications`. The direct bucket is the storage aggregator's own bucket (every space, account, user and organisation has one, separate from the profile buckets); callout staging uploads go to the space *profile* bucket (`space.service.authorization.ts:482-490`), so what lands in the direct bucket is whatever is uploaded against the space storage itself (`uploadFileOnStorageBucket` with that bucket id) — 318 files under private L0 spaces alone on ACC. | ACC: 252 of 252 direct buckets of private L0 spaces, 206 of 206 private L1, 74 of 74 private L2 carry the rule; 296 of the 318 files in private-L0 direct buckets and 75 of 78 in private-L1 ones have anonymous READ on their own policy (§ 16b). The storage suite reads only profile buckets (About, callout framing, post, whiteboard, link, organisation, user) — the direct bucket is in no test. | **code path, untested** — candidate product defect for the QA lead to route (the W5 assertion for this cell is the derivation's `anonymous: read`; whether that is wanted is a product ruling) |
| **F2** | Rules naming retired credentials survive on live leaf rows: 1,018 of 16,945 files with a policy, 872 of 44,392 buckets, 2,000 of 68,684 tagsets, 820 of 20,674 classifications, 51 profiles, 18 references, 17 visuals, 8 rooms, 4 flow states, 3 flows, 3 callouts, 2 user settings, 1 contribution, 1 communication, 1 guidelines (§ 14). The parent entities of all of them are fresh (0 of 1,943 spaces, 0 of 4,130 actors), so these leaves were skipped by the last reset — the `resilientCascade` wrappers log and skip a subtree on a data anomaly (`space.service.authorization.ts:244-270`, `account.service.authorization.ts:258-283`), which leaves exactly this pattern. | § 13/13b/14; inert today because no actor holds the credentials (§ 13c), but a reset that re-grants a retired credential name, or a migration that maps `global-admin` to a new role, would wake them | **data defect — new signature** for the register (classify V with the ETL: no stored policies in the new core) |
| **F3** | Policies with an **empty** `credentialRules` list on live types: space 33, callout 90, document 13, bucket 370, profile 278, room 40, reference 30, aggregator 50, tagset 2,275, visual 806, classification 2,270, flow state 178, timeline/calendar 247 (§ 4). The engine throws `AuthorizationInvalidPolicyException` on an empty rule list (`authorization.service.ts:validateAuthorization`), so these entities deny everyone, admins included. | § 4; whether each is an orphan (G1) or a live entity under a skipped cascade needs the id-level drill the register's probes already do | **data defect** — the register's G1 should split "orphan" from "live but empty" |
| **F4** | Stored role definitions drift from the code: 483 L1/L2 `member` rows cap virtual contributors at 9 (code: unlimited), 709 `lead` rows cap VCs at 0 (code: 1), 12 L0 `lead` rows cap organisations at 9 (code: 2), 11 L0 `member` rows require the same role in the parent (code: false), 13 admin / 8 lead / 8 member rows have an empty credential `resourceID` (§ 6). | role definitions file vs § 6 | **data defect — new signature**; the caps are constants (rebaseline rows), the empty resourceIDs are an escalation if ever attached to a live space (none is, § 6b) |
| **F5** | Policy `type` lags the entity: 1,415 `space_about` rows have a policy typed `space` (the about policy was created before the `space-about` type existed and `reset` keeps the type), 951 `context` policies (dead type), and two spellings coexist for three types (`template_default`/`template-default`, `templates_manager`/`templates-manager`, `templates_set`/`templates-set`). | § 1, § 15 | **data defect** (cosmetic; any ETL keyed on `authorization_policy.type` would mis-bucket 2,400 rows) |
| **F6** | The gate of eight administrative families is a resolver-local `IN_MEMORY` policy that is never stored: user deletion, Kratos identity deletion, account deletion, login-email change (users-admin), space moves/conversions and the VC knowledge-base conversion (resource-admin), the well-known-VC setting (settings-admin), licence-plan and licence-rule definition (settings-admin), the admin communication mutations (operations-admin). A dump of stored policies cannot see them, and for licence definition the stored entity policy says the opposite: `licensing` inherits the root rule, so `platform-content-full-access` holds CRUD on it, while the gate (`license.definition.policy.ts`) admits settings-admin alone. | `global.policy.constants.ts`; the matrix lists them as `synthetic/*` resources; the platform-roles rows A4, A5, A9, A10, A13 and A11.adminCommunication* only agree once mapped to those | **derivation** — corrected (first run mapped A13 to the entity policy and reported content-full-access as an over-grant) |
| **F7** | A1 is live on the stored policies (§ 1.1): ancestor members hold CRUD+GRANT on 205 space, 200 role-set, 1,014 callout, 690 contribution, 383 document, 2,743 bucket and 2,543 profile policies, can rename (142), invite (147), assign (147), move (540 + 94) and read drafts (180 + 88 + 88 + 68). | § 2 criteria mixing `space-admin@id` and `space-member@id` | **data defect** (register A1; the matrix cells for `space-member@L0` on L1/L2 resources are the correct target) |
| **F8** | `privacy.allowPlatformSupportAsAdmin` on an L1/L2 is inert: the subspace's support privileges come from the parent's (`space.service.platform.roles.access.ts:138-153`), so 378 L1 and 89 L2 spaces with the flag off still grant support CRUD+GRANT, and 12 + 14 with it on grant nothing (§ 12). | § 12 | **code path** — consistent with the spec's "L0 flag bounds Support's reach"; the UI exposes the flag per space, which is the mismatch to raise |
| **F9** | `forum.service.authorization.ts:70` sets `createRule.cascade = true` where `contributeRule` was meant; both rules cascade anyway (type-only default), so every discussion carries `create-discussion` for registered users. | code; ACC discussion rules show the cascaded `credentialRuleTypes-forumRead | create-discussion` on all 103 | **code path** — harmless, a tidy-up |
| **F10** | Memo contributions get no privilege of their own in `getPrivilegesForCalloutAllowedContributions` (`callout.service.authorization.ts:383-398`: LINK and COLLABORA_DOCUMENT → `contribute`, POST → `create-post`, WHITEBOARD → `create-whiteboard`, MEMO → nothing); `createContributionOnCallout` gates on `contribute` (`callout.resolver.mutations.ts:565`), so a memo-only callout is governed by the generic contribute cell. | code | **code path** — note for the new core's per-type privileges |
| **F11** | The about-profile documents of a **private** L0 are world-readable (`Read access to About` cascades anonymous/guest/registered READ into the About profile bucket): 202 of 202 files on ACC (§ 17). | code + data + storage suite (`private-space-document-auth`: `undefined`/non-member READ on space about documents) | agreed on all three sides; listed because it surprises — the About page is public by design |

## 2. Code vs tests

### 2.1 `storage` (9 files, 917 cases)

896 cases are decision-table rows (`test.each` of test user × expected `myPrivileges` list, plus the REST status of the document download); 21 are upload-flow cases without an access expectation. Mapping (`_tools/access/crosscheck.py#OWNER_NODE`, `TEST_USER_ACTOR`, `FILE_VARIANT`): the six space files are the `t-pub-pub`, `t-pub-priv`, `t-priv-pub`, `t-priv-priv` variants (L0 privacy as configured, L1 with `inheritMembershipRights` on and members-create off as the files set it, L2 at server defaults); the resource kinds map to `space-about@L/profile/bucket[/document]`, `callout@L/framing/profile/bucket[/document]`, `callout@L/contribution[post]/post/profile/bucket[/document]`, `callout@L/contribution[whiteboard]/whiteboard[contributors]/profile/bucket[/document]`, `callout@L/contribution[link]/link/profile/bucket/document` (the link *bucket* row reads the framing bucket, as the extraction notes), `callout[whiteboard-framing]@L/framing/whiteboard/profile/bucket[/document]`, `organization/profile/bucket[/document]`, `user/profile/bucket[/document]`. The harness admin (`admin@`) is the creator of every scenario entity, so it is evaluated as the composite it really is — 8 platform roles + member/lead/admin on every level (`space.service.ts:1840-1870`) + organisation admin/associate (`organization.service.ts:206-216`) + `user-self` on the documents it uploaded; `SPACE_MEMBER` / `SUBSPACE_ADMIN` in the organisation file are the associate / admin the file assigns them.

**Result: 896 of 896 agree; 0 disagree; 0 unmapped.** Every expected privilege list — including the `PLATFORM_CONTENT_FULL_ACCESS` the admin lists carry, the `undefined` (unreachable) cells for non-members on callout content inside a private level, and the `CONTRIBUTE` an L0 member gets on public-L1 content through `inheritMembershipRights` — is reproduced by the derivation. Observations the suite itself carries: `ANONYMOUS` and `NON_SPACE_MEMBER` expect the same list in every table (a registered outsider is never distinguished from the public, correct for these resources); in `public-space-private-ch` › `Access to Space Profile reference` the bucket table lists `GLOBAL_ADMIN` twice, so its `SUBSPACE_ADMIN` cell is untested; the `WhiteboardRt` blocks duplicate the whiteboard-framed blocks.

### 2.2 `platform-roles` (30 files, 2,071 cases)

The suite is a 127-row capability table × 14 roles (1,763 grid cases: the owning role's positive, every other role's negative, 14 exclusive positives in their own file), 30 scenario rows (299 cases: the six assignment rules, grantability, immediacy, organisation inheritance, holder lists, the audit trail, service profile, role integrity, notification routing, lifecycle) and 9 coverage-guard cases. Each capability row was mapped to one cell (`_tools/access/crosscheck.py#CAP_MAP`: resource, the privilege(s) the gate accepts, the variant the fixture uses) and the set of platform roles the derivation grants it was compared with `owners ∪ acceptedExtra`:

| capability | cases | cell | test: allowed roles | derivation: allowed roles | verdict |
|---|---|---|---|---|---|
| A1.assignPlatformRoleToUser#0 | 14 | `platform/role-set` · platform-roles-assign @ pub-open | platform-roles-admin | platform-roles-admin | agree |
| A1.removePlatformRoleFromUser#1 | 14 | `platform/role-set` · platform-roles-assign @ pub-open | platform-roles-admin | platform-roles-admin | agree |
| A2.assignPlatformRoleToUser | 14 | `platform/role-set` · feature-role-assign @ pub-open | platform-roles-admin, platform-users-admin | platform-roles-admin, platform-users-admin | agree |
| A2.removePlatformRoleFromUser | 14 | `platform/role-set` · feature-role-assign @ pub-open | platform-roles-admin, platform-users-admin | platform-roles-admin, platform-users-admin | agree |
| A2.assignPlatformRoleToOrganization | 14 | `platform/role-set` · feature-role-assign @ pub-open | platform-roles-admin, platform-users-admin | platform-roles-admin, platform-users-admin | agree |
| A2.removePlatformRoleFromOrganization | 14 | `platform/role-set` · feature-role-assign @ pub-open | platform-roles-admin, platform-users-admin | platform-roles-admin, platform-users-admin | agree |
| A3.authorizationPolicyResetOnPlatform | 14 | `platform` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.aiServerAuthorizationPolicyReset | 14 | `ai-server` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPolicyResetOnUser | 14 | `user` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPolicyResetOnOrganization | 14 | `organization` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPolicyResetOnAccount | 14 | `account` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.licenseResetOnAccount | 14 | `account` · license-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPolicyResetAll | 14 | `platform` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPlatformRolesAccessReset | 14 | `platform` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.authorizationPolicyResetToGlobalAdminsAccess | 14 | `organization` · authorization-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A3.resetLicenseOnAccounts | 14 | `licensing` · license-reset @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A4.adminUserEmailChange | 14 | `synthetic/admin-user-email-change` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A4.deleteUser | 0 | `synthetic/admin-user-email-change` · platform-users-admin @ pub-open | — | platform-users-admin | no-cases |
| A4.adminUserEmailChangeDriftResolve | 14 | `synthetic/admin-user-email-change` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A5.deleteUser | 14 | `synthetic/registration-delete-user` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A5.adminIdentityDeleteKratosIdentity | 14 | `synthetic/admin-identity-delete-kratos` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A5.adminUserAccountDelete | 14 | `synthetic/admin-user-account-delete` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A5.mcpApiKeys | 14 | `platform` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A5.adminRevokeMcpApiKey | 14 | `platform` · platform-users-admin @ pub-open | platform-users-admin | platform-users-admin | agree |
| A6.createOrganization | 14 | `platform` · create-organization @ pub-open | feature-organization-creator, platform-support | feature-organization-creator, platform-support | agree |
| A6.deleteOrganization | 14 | `organization` · delete/delete-organization @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.updateInnovationPack | 14 | `innovation-pack` · update/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.updateInnovationHub | 14 | `innovation-hub` · update/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.createTemplate | 14 | `innovation-pack/template` · create/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.createTemplateFromSpace | 14 | `innovation-pack/template` · create/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.createTemplateFromContentSpace | 14 | `innovation-pack/template` · create/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.updateTemplate | 14 | `innovation-pack/template` · update/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.updateTemplateFromSpace | 14 | `innovation-pack/template` · update/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.deleteTemplate | 14 | `innovation-pack/template` · delete/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A7.updateCallout | 14 | `innovation-pack/template/callout` · update/platform-support-org-resources @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A8.deleteCallout | 14 | `callout@L0` · delete @ priv-applications | platform-content-full-access | platform-content-full-access | agree |
| A8.deleteContribution | 14 | `callout@L0/contribution[post]` · delete @ priv-applications | platform-content-full-access | platform-content-full-access | agree |
| A8.deleteSpace | 14 | `space@L0` · delete @ priv-applications | platform-content-full-access | platform-content-full-access | agree |
| A8.deleteInnovationPack | 14 | `innovation-pack` · delete @ pub-open | platform-content-full-access | platform-content-full-access | agree |
| A8.deleteInnovationHub | 14 | `innovation-hub` · delete @ pub-open | platform-content-full-access | platform-content-full-access | agree |
| A8.updateCalloutPublishInfo | 14 | `callout@L0` · update-callout-publisher @ pub-open | platform-content-full-access, platform-resource-admin | platform-content-full-access, platform-resource-admin | agree |
| A9.moveSpaceL1ToSpaceL0 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.moveSpaceL1ToSpaceL2 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.moveSpaceL2ToSpaceL1 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.convertSpaceL1ToSpaceL0 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.convertSpaceL2ToSpaceL1 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.convertSpaceL1ToSpaceL2 | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.convertVirtualContributorToUseKnowledgeBase | 14 | `synthetic/conversion-global-admins` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.moveContributionToCallout | 14 | `callout@L0/contribution[post]` · move-contribution @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.transferCallout | 14 | `callouts-set@L0` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.transferInnovationHubToAccount | 14 | `account` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.transferSpaceToAccount | 14 | `account` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.transferInnovationPackToAccount | 14 | `account` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A9.transferVirtualContributorToAccount | 14 | `account` · transfer-resource-offer @ pub-open | platform-resource-admin | platform-resource-admin | agree |
| A10.updatePlatformSettings | 14 | `platform` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A10.addIframeAllowedURL | 14 | `platform` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A10.removeIframeAllowedURL | 14 | `platform` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A10.addNotificationEmailToBlacklist | 14 | `platform` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A10.removeNotificationEmailFromBlacklist | 14 | `platform` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A10.setPlatformWellKnownVirtualContributor | 14 | `synthetic/platform-well-known-vc-set` · platform-settings-admin @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A11.cleanupCollections | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.updateAssistantActorCapabilities | 14 | `virtual-assistant` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminInAppNotificationsPrune | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminUpdateContributorAvatars | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminUpdateGeoLocationData | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminSearchIngestFromScratch | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.migrateLegacyMemoContent | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.migrateLegacyWhiteboardContent | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminRepairTemplateFiles | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.refreshAllBodiesOfKnowledge | 14 | `platform` · platform-operations-admin @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminCommunicationEnsureAccessToCommunications | 14 | `synthetic/admin-communication-grant` · platform-operations-admin/grant @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminCommunicationRemoveOrphanedRoom | 14 | `synthetic/admin-communication-grant` · platform-operations-admin/grant @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminCommunicationUpdateRoomState | 14 | `synthetic/admin-communication-grant` · platform-operations-admin/grant @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminCommunicationMigrateOrphanedConversations | 14 | `synthetic/admin-communication-grant` · platform-operations-admin/grant @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A11.adminCommunicationSyncSpaceHierarchy | 14 | `synthetic/admin-communication-grant` · platform-operations-admin/grant @ pub-open | platform-operations-admin | platform-operations-admin | agree |
| A12.assignLicensePlanToAccount | 14 | `licensing` · grant @ pub-open | platform-license-manager | platform-license-manager | agree |
| A12.assignLicensePlanToSpace | 14 | `licensing` · grant @ pub-open | platform-license-manager | platform-license-manager | agree |
| A12.revokeLicensePlanFromAccount | 14 | `licensing` · grant @ pub-open | platform-license-manager | platform-license-manager | agree |
| A12.revokeLicensePlanFromSpace | 14 | `licensing` · grant @ pub-open | platform-license-manager | platform-license-manager | agree |
| A12.updateBaselineLicensePlanOnAccount | 14 | `account` · account-license-manage @ pub-open | platform-license-manager | platform-license-manager | agree |
| A13.createLicensePlan | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A13.deleteLicensePlan | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A13.updateLicensePlan | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A13.adminLicensePolicyDeleteCredentialRule | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A13.adminLicensePolicyUpdateCredentialRule | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A13.adminLicensePolicyCreateCredentialRule | 14 | `synthetic/license-definition-admin` · create/update/delete @ pub-open | platform-settings-admin | platform-settings-admin | agree |
| A14.adminUpdateSpaceVisibility | 14 | `space@L0` · account-license-manage @ user-hosted | platform-license-manager | platform-license-manager | agree |
| A15.getAccessPrivilegesForPlatformSupport | 14 | `role-set@L0` · grant @ priv-applications+support | platform-support | platform-support | agree |
| A15.updateDiscussion | 14 | `discussion[authenticated]` · platform-forum-manage @ pub-open | platform-support | platform-support | agree |
| A15.deleteDiscussion | 14 | `discussion[authenticated]` · platform-forum-manage @ pub-open | platform-support | platform-support | agree |
| A15.adminForumRemoveDiscussionCategory | 13 | `forum` · platform-forum-manage @ pub-open | platform-support | platform-support | agree |
| A16.createPlatformRolesAccess | 14 | `callouts-set@L0` · read @ priv-applications | platform-content-full-access, platform-spaces-reader | platform-content-full-access, platform-spaces-reader | agree |
| A17.updateActorNameID | 14 | `user` · update-nameid @ pub-open | — | — | agree |
| A17.updateSpace.nameID | 14 | `space@L0` · update-nameid @ user-hosted | — | — | agree |
| A19.audit-log-analyze | 14 | `platform` · platform-audit-read @ pub-open | platform-audit-reader | platform-audit-reader | agree |
| A19.latestUserEmailChangeAuditEntry | 14 | `platform` · platform-audit-read @ pub-open | platform-audit-reader | platform-audit-reader | agree |
| A19.userEmailChangeAuditEntries | 14 | `platform` · platform-audit-read @ pub-open | platform-audit-reader | platform-audit-reader | agree |
| A20.usersInRole | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20.usersInRoles | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20.organizationsInRole | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20.organizationsInRoles | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20.actorsWithCredential | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20.usersWithAuthorizationCredential | 14 | `platform/role-set` · platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin | platform-audit-reader, platform-roles-admin | agree |
| A20b.usersInRole | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A20b.usersInRoles | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A20b.organizationsInRole | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A20b.organizationsInRoles | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A20b.actorsWithCredential | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A20b.usersWithAuthorizationCredential | 14 | `platform/role-set` · feature-role-holders-read/platform-role-holders-read @ pub-open | platform-audit-reader, platform-roles-admin, platform-users-admin | platform-audit-reader, platform-roles-admin, platform-users-admin | agree |
| A21.updateUser#0 | 14 | `platform` · set-service-profile @ pub-open | platform-roles-admin | platform-roles-admin | agree |
| A21.updateUser#1 | 14 | `platform` · set-service-profile @ pub-open | platform-roles-admin | platform-roles-admin | agree |
| A22.assignRoleToUser | 14 | `role-set@L0` · roleset-entry-role-assign @ user-hosted | — | — | agree |
| A22.assignRoleToVirtualContributor | 14 | `role-set@L0` · roleset-entry-role-assign @ user-hosted | — | — | agree |
| A22.assignRoleToOrganization | 14 | `role-set@L0` · roleset-entry-role-assign-organization @ user-hosted | — | — | agree |
| A22.assignRoleToUser#org-entry | 14 | `organization/role-set` · roleset-entry-role-assign @ pub-open | — | — | agree |
| A22.assignRoleToUser#org-elevated | 14 | `organization/role-set` · roleset-entry-role-assign @ pub-open | — | — | agree |
| A23.inviteForEntryRoleOnRoleSet | 14 | `organization/role-set` · roleset-entry-role-invite @ pub-open | platform-support | platform-support | agree |
| A23.resendPlatformInvitation | 14 | `organization/role-set` · platform-support-org-membership @ pub-open | platform-support | platform-support | agree |
| A23.assignRoleToUser | 14 | `organization/role-set` · grant/platform-support-org-membership @ pub-open | platform-support | platform-support | agree |
| A23.removeRoleFromUser | 14 | `organization/role-set` · grant/platform-support-org-membership @ pub-open | platform-support | platform-support | agree |
| A23.eventOnApplication | 14 | `organization/application` · grant/platform-support-org-membership @ pub-open | platform-support | platform-support | agree |
| A23.eventOnApplication#reject | 14 | `organization/application` · update/platform-support-org-membership @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A23.deleteInvitation | 14 | `organization/invitation` · delete/platform-support-org-membership @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A23.deletePlatformInvitation | 14 | `organization/role-set` · delete/platform-support-org-membership @ pub-open | platform-content-full-access, platform-support | platform-content-full-access, platform-support | agree |
| A23.applications | 14 | `organization/role-set` · grant/platform-support-org-membership @ pub-open | platform-support | platform-support | agree |

**Result: 125 rows mapped (1,735 cases), 124 agree, 0 disagree, 1 declaration-only (`A4.deleteUser`, 0 cases, covered by A5).** Unmapped: `A1.grantCredentialToActor` and `A1.revokeCredentialFromActor` (28 cases) — the resolver pins these to a retired credential ahead of the policy check (`admin.authorization.resolver.mutations.ts`, T034a), so no role reaches them and no policy cell expresses that. The 299 scenario cases assert the assignment-rule engine, audit records, holder-list partitioning, Kratos identity and schema lifecycle — behaviour of the mutations, not of a policy cell; they stay in the roleset/platform knowledge documents. The 9 coverage-guard cases assert the table itself.

Dual-path gates the mapping had to encode: `deleteOrganization` (`delete` for content-full-access, `delete-organization` for support), A7 (`update`/`create`/`delete` or `platform-support-org-resources`), A20b (`feature-role-holders-read` or `platform-role-holders-read`), A23 (organisation role-set `grant` or `platform-support-org-membership`, application `update`/`grant` or the membership privilege, invitation `delete` or the membership privilege). The A15 twin (`allowPlatformSupportAsAdmin` true/false on a private user-hosted L0) is the `priv-applications+support` variant against `priv-applications`.

### 2.3 Cases that could not be mapped

| Suite | Cases | Why |
|---|---|---|
| platform-roles › A1.grantCredentialToActor / revokeCredentialFromActor | 28 | gate is a hard-coded check on a retired credential, not a policy |
| platform-roles › 30 scenario rows | 299 | rule engine / audit / lifecycle behaviour, not an access cell |
| platform-roles › coverage-guard | 9 | asserts the capability table |
| storage › uploads.it-spec.ts | 21 | upload flow (mime types, sizes, visual replacement), not an access cell |

## 3. Cells no test covers

A cell is one (resource, role, privilege) of the matrix over all variants; "touched" means a mapped test asserts it under at least one variant. 1,360 of 61,811 cells are touched:

| policy type | cells | touched by tests | untouched |
|---|---|---|---|
| account | 330 | 56 | 274 |
| ai-server | 105 | 14 | 91 |
| application | 900 | 42 | 858 |
| calendar-event | 798 | 0 | 798 |
| callout | 5300 | 56 | 5244 |
| callout-contribution | 912 | 28 | 884 |
| callouts-set | 1140 | 28 | 1112 |
| collabora-document | 912 | 0 | 912 |
| collaboration | 798 | 0 | 798 |
| communication-conversation | 42 | 0 | 42 |
| communication-messaging | 126 | 0 | 126 |
| community | 684 | 0 | 684 |
| community-guidelines | 684 | 0 | 684 |
| discussion | 336 | 14 | 322 |
| document | 7669 | 187 | 7482 |
| forum | 168 | 14 | 154 |
| in-memory | 204 | 154 | 50 |
| innovation-flow | 912 | 0 | 912 |
| innovation-hub | 154 | 42 | 112 |
| innovation-pack | 154 | 42 | 112 |
| invitation | 1038 | 28 | 1010 |
| knowledge-base | 756 | 0 | 756 |
| library | 126 | 0 | 126 |
| license | 684 | 0 | 684 |
| license-policy | 147 | 0 | 147 |
| licensing | 168 | 28 | 140 |
| link | 798 | 0 | 798 |
| memo | 2736 | 0 | 2736 |
| organization | 240 | 42 | 198 |
| organization-verification | 72 | 0 | 72 |
| platform | 462 | 98 | 364 |
| post | 912 | 0 | 912 |
| profile | 5863 | 0 | 5863 |
| role-set | 1735 | 140 | 1595 |
| room | 4782 | 0 | 4782 |
| space | 1482 | 42 | 1440 |
| space-about | 684 | 0 | 684 |
| storage-bucket | 9324 | 207 | 9117 |
| template | 508 | 56 | 452 |
| templates-set | 228 | 0 | 228 |
| user | 220 | 28 | 192 |
| user-group | 588 | 0 | 588 |
| user-settings | 176 | 0 | 176 |
| virtual-assistant | 126 | 14 | 112 |
| virtual-contributor | 840 | 0 | 840 |
| visual | 684 | 0 | 684 |
| whiteboard | 4104 | 0 | 4104 |

What the untouched cells are, in words — these are what the matrix now covers for free and the W5 re-point can assert directly:

- **Every space-role row on every resource except documents and buckets**: member / lead / admin at L0, L1, L2 on space, community, role-set, collaboration, callouts-set, callout, contributions, posts, whiteboards, memos, links, calendar events, innovation flow, about, guidelines. The storage suite proves them only through profile documents; the platform-roles suite never provisions a space role.
- **Every settings variant**: `allowMembersToCreateCallouts`, `allowMembersToCreateSubspaces`, `inheritMembershipRights` beyond the one storage shape, `allowSubspaceAdminsToInviteMembers` and the combined apply/join path, `allowGuestContributions` + the whiteboard guest toggle, `trustedOrganizations`, membership policy on subspaces, archived / demo / inactive visibility, user-hosted vs organisation-hosted accounts (except the A14/A15/A16/A17/A22 fixtures).
- **Entry-role privileges** (`roleset-entry-role-join/apply/invite/assign`, `community-assign-vc-from-account`) for every non-platform actor; **notification privileges** (`receive-notifications*`) everywhere; **rename** (`update-nameid`) for space and organisation admins; **move** (`move-post`, `move-contribution`, `move-task`) for space admins; **transfer offer/accept** for account admins; **draft-callout readers**; **creator rights** after leaving the space; **content-update policies** (`contentUpdatePolicy` owner / admins / contributors) on whiteboards and memos; **public-share**.
- **Invitees and applicants** (`space-invitee` read-about on private, read on public; applicant / invited-account-admin on their own request), **virtual contributors as members** (no `global-registered`), **user-group members**, the **PII readers** of a user, **organisation owner vs admin vs associate** on the organisation tree (only support and content-full-access are tested there).
- **Platform-level reads**: `read-users`, `access-interactive-guidance`, `access-virtual-assistant`, `platform-support-lists-read`, `platform-licensing-lists-read`, the virtual-assistant actor, the licence policy reads, forum/discussion for registered users and guests, conversation participants and conversation documents, the library.
- **F1**: `anonymous` / `guest` / `registered` READ on direct-bucket documents of private spaces.

## 4. Limits of the derivation

- Data-dependent criteria are modelled on one representative: the account admins of actors with an open invitation (a visibility criterion on every space, `space.service.authorization.ts:338-344`), the spaces a user is member of and the organisations it belongs to (PII readers), the spaces of a VC's account (account-visibility READ). The JSON marks those paths `data-dependent`.
- Template content spaces, user groups, AI personas, platform invitations and the `license` leaves are modelled minimally (inherit only); `ai-persona` is not in the matrix.
- The harness admin composite in § 2.1 is the only actor with more than one role family; the matrix proper keeps one role per row and assumes the server's invariants (admin ⇒ member, subspace member ⇒ parent member, subspace admin ⇒ derived credential on the parent).
- The variants are 18 named settings combinations, not the cross product; `equivalentVariants` in the JSON says which of them a resource cannot tell apart.
