# Test plan — Platform roles: who can do what (workspace#027-platform-role-redesign)

> **Status:** Built — QA-lead directive in-session 2026-09-18 (single delivery); awaiting review at PR · **Depth:** Deep (authorization change, cross-repo, release-train gated) · **Story:** alkem-io/server#4764 · Epic alkem-io/server#6320 · **Generated** from `capabilities.data.ts` + `scenarios.data.ts` — do not edit by hand

The single Global Admin "god mode" is decomposed into 10 `Platform …` administration roles and 4 `Feature …` roles. This suite answers one question per role, in both directions: **can it do everything the acceptance criteria give it, and is it refused everything else.** It tracks **119 administrative capabilities** in 21 groups × **14 roles** = **142 positive** and **1482 negative** role-level checks, plus **27 rule scenarios** that a grid cannot express.

**Negatives run at Slice A.** Each test user holds exactly one target role and no legacy credential (scenario X1 proves it first), so "this role is refused" is a valid assertion today — it does not have to wait for the legacy roles to be removed.

## How to run

```bash
# Against a stack running the 027 server. Needs the usual server-api .env.
cd server-api
pnpm run test:platform-roles              # everything safe, two sequential phases, ~2 min warm
pnpm exec vitest run --project platform-roles src/functional-api/platform-roles/roles/platform-support.it-spec.ts   # one role
pnpm run test:platform-roles:exclusive    # platform-wide positives — ON DEMAND ONLY, never nightly; a stack nothing else is using
pnpm run test:platform-roles:plan         # re-render this file from the two data tables
```

Phase 1 (`platform-roles`) runs the 14 role files and the read-only specs in parallel; phase 2 (`platform-roles-rules`) runs the rule specs afterwards. One project-level globalSetup serves both: it seeds the 14 single-role users once, refuses to continue if any of them holds anything but its one role, and builds each capability group’s fixtures concurrently.

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| 1 | An operator with a narrow role can still do something outside it (a sibling mutation kept its old gate) | Med | High | **High** | every negative in the capability tables |
| 2 | A role cannot do its own job after the legacy grants are removed (lost capability on release day) | Med | High | **High** | every positive in the capability tables |
| 3 | Someone escalates: self-assignment, Users Admin handing out a Platform role, a Platform role reaching an organization | Low | Critical | **High** | R1–R6, O2, X2 |
| 4 | A revoked or demoted operator keeps access until a cache expires | Med | High | **High** | I1, O1 |
| 5 | The audit trail is readable by the people it records, or misses rejected attempts | Low | High | Med | T1, T2, AR1, AR2, H3 |
| 6 | The suite itself harms a shared environment or breaks other suites | Med | High | **High** | destructive positives isolated in an on-demand `exclusive` project that the nightly never runs + snapshot/restore + own vitest project + one-time seeding |

## Coverage at a glance

- Capabilities — positive: 93 automated · 14 exclusive · 8 not-applicable · 4 not-automated
- Capabilities — negative: 116 automated · 3 not-automated
- Rule scenarios — positive: 20 automated · 5 not-applicable · 2 not-automated
- Rule scenarios — negative: 21 automated · 1 planned · 1 exclusive · 1 not-applicable · 3 not-automated

| Role | Spec file | Can (positive) | Cannot (negative) |
|---|---|---|---|
| PLATFORM_ROLES_ADMIN | `roles/platform-roles-admin.it-spec.ts` | 20 | 96 |
| PLATFORM_CONTENT_FULL_ACCESS | `roles/platform-content-full-access.it-spec.ts` | 17 | 99 |
| PLATFORM_RESOURCE_ADMIN | `roles/platform-resource-admin.it-spec.ts` | 13 | 103 |
| PLATFORM_SETTINGS_ADMIN | `roles/platform-settings-admin.it-spec.ts` | 12 | 104 |
| PLATFORM_OPERATIONS_ADMIN | `roles/platform-operations-admin.it-spec.ts` | 24 | 92 |
| PLATFORM_USERS_ADMIN | `roles/platform-users-admin.it-spec.ts` | 17 | 99 |
| PLATFORM_SUPPORT | `roles/platform-support.it-spec.ts` | 15 | 101 |
| PLATFORM_LICENSE_MANAGER | `roles/platform-license-manager.it-spec.ts` | 7 | 109 |
| PLATFORM_SPACES_READER | `roles/platform-spaces-reader.it-spec.ts` | 1 | 115 |
| PLATFORM_AUDIT_READER | `roles/platform-audit-reader.it-spec.ts` | 15 | 101 |
| FEATURE_BETA_TESTER | `roles/feature-beta-tester.it-spec.ts` | 0 | 116 |
| FEATURE_VIRTUAL_ASSISTANT | `roles/feature-virtual-assistant.it-spec.ts` | 0 | 116 |
| FEATURE_ORGANIZATION_CREATOR | `roles/feature-organization-creator.it-spec.ts` | 1 | 115 |
| FEATURE_VC_CAMPAIGN | `roles/feature-vc-campaign.it-spec.ts` | 0 | 116 |

## Allowed — verified against the requirements

Checked 2026-09-18 against `spec.md` (§Target global role model, §Action → owning role) and `contracts/privilege-map.md`. **All 21 action families' owner sets match the spec exactly**, including the three declared exceptions (Content Full Access on A6 delete, A7 and the A16 read). The spec assigns owners per action FAMILY; per surface: **55** are named in the requirements, **56** are covered by their family's wording, **6** are backed by neither (⚠️), **2** contradict a requirement (❌).

| Capability | Allowed today | Finding |
|---|---|---|
| ⚠️ `A3.authorizationPolicyResetToGlobalAdminsAccess` | operations admin | spec A3 lists platform/account/user/org/all; this one is unnamed - and "global admins" cease to exist at Slice B |
| ⚠️ `A9.convertVirtualContributorToUseKnowledgeBase` | resource admin | spec A9 is "move resources"; converting a VC body of knowledge is not a move and the contract A9 list omits it |
| ❌ `A12.createWingbackAccount` | license manager | FR-021 requires this mutation to be DELETED, not re-gated to License Manager |
| ⚠️ `A13.createLicensePlan` | settings admin | the spec gives Settings Admin the DEFINITION of license plans; the server census (a.row.surfaces.ts, A13) lists update / delete and the three rule mutations but omits this one - found in the manual pass of 2026-09-21. Gate: CREATE on the licensing framework. |
| ⚠️ `A13.updateLicensePlan` | settings admin | PRODUCT BUG: LicensePlanService.update() saves the plan unchanged - the mutation reports success and nothing is applied (also on develop). The positive is RED until fixed |
| ❌ `A16.createPlatformRolesAccess` | spaces reader, content full access | the server DELIBERATELY grants Platform Resource Admin READ on every space (space.service.platform.roles.access.ts); the requirements allow only Spaces Reader plus the Content Full Access exception. The negative for PLATFORM_RESOURCE_ADMIN is RED until product decides |
| ⚠️ `A20.actorsWithCredential` | roles admin, audit reader | spec A20 names four holder-list fields; this credential query is not among them |
| ⚠️ `A20.usersWithAuthorizationCredential` | roles admin, audit reader | spec A20 names four holder-list fields; this credential query is not among them |
| ⚠️ `A20b.actorsWithCredential` | users admin, roles admin, audit reader | spec A20b names four holder-list fields; this credential query is not among them |
| ⚠️ `A20b.usersWithAuthorizationCredential` | users admin, roles admin, audit reader | spec A20b names four holder-list fields; this credential query is not among them |

These rows are still tested as implemented — the finding is for product/spec owners to confirm or correct, and the table is where the answer gets recorded.

## What a positive proves

"The call returned no error" is never sufficient on its own. Each capability declares what its positive must observe:

| Kind | Count | A passing positive means |
|---|---|---|
| **effect** | 65 | the call succeeded AND the effect is read back independently (entity gone / field changed / holder listed / resource on the target account) |
| **returns-data** | 18 | the read returned KNOWN fixture data — an always-empty or always-null resolver fails |
| **executed** | 21 | success payload only — maintenance jobs (resets, re-index, migrations) have no API-visible effect to read back; this is the honest limit |
| **reached-resolver** | 4 | an external dependency is absent in test environments; the oracle is a NON-authorization error on the root field, proving the gate was passed |

## Capability → coverage

"Allowed" = owners, plus roles reaching it by a declared accepted exception (*italic*). Every role not listed is a negative.

### A1 — Assign / revoke a Platform role

Spec: A1 · FR-003 · FR-015 · FR-022

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `assignPlatformRoleToUser` | roles admin | **effect** — holder list shows the target after assign | ✅ automated | ✅ automated |
| `removePlatformRoleFromUser` | roles admin | **effect** — holder list no longer shows the target after remove | ✅ automated | ✅ automated |
| `grantCredentialToUser` (deleted at Slice B) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `revokeCredentialFromUser` (deleted at Slice B) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `grantCredentialToOrganization` (deleted at Slice B) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `revokeCredentialFromOrganization` (deleted at Slice B) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload) | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `grantCredentialToActor` | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |
| `revokeCredentialFromActor` | **nobody** | — | — n/a — no target role may reach this surface - every role is a negative | ✅ automated |

### A2 — Assign / revoke a Feature role (user or organization)

Spec: A2 · FR-002 · FR-003

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `assignPlatformRoleToUser` | users admin, roles admin | **effect** — holder list shows the target after assign | ✅ automated | ✅ automated |
| `removePlatformRoleFromUser` | users admin, roles admin | **effect** — holder list no longer shows the target after remove | ✅ automated | ✅ automated |
| `assignPlatformRoleToOrganization` | users admin, roles admin | **effect** — holder list shows the target after assign | ✅ automated | ✅ automated |
| `removePlatformRoleFromOrganization` | users admin, roles admin | **effect** — holder list no longer shows the target after remove | ✅ automated | ✅ automated |

### A3 — Authorization reset & license-entitlement reset

Spec: A3 · SC-002

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `authorizationPolicyResetOnPlatform` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules) | ✅ automated |
| `aiServerAuthorizationPolicyReset` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules) | ✅ automated |
| `authorizationPolicyResetOnUser` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | ✅ automated | ✅ automated |
| `authorizationPolicyResetOnOrganization` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | ✅ automated | ✅ automated |
| `authorizationPolicyResetOnAccount` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | ✅ automated | ✅ automated |
| `licenseResetOnAccount` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | ✅ automated | ✅ automated |
| `authorizationPolicyResetAll` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — resets every authorization policy on the platform | ✅ automated |
| `authorizationPlatformRolesAccessReset` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules) | ✅ automated |
| `authorizationPolicyResetToGlobalAdminsAccess` ⚠️ | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | ✅ automated | ✅ automated |
| `resetLicenseOnAccounts` | operations admin | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — recomputes licenses on every account | ✅ automated |

### A4 — Change a user's login email

Spec: A4 · SC-002

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `adminUserEmailChange` | users admin | **effect** — the user record reports the NEW email on re-read | ✅ automated | ✅ automated |
| `deleteUser` | **nobody** | — | ⛔ not automated — declaration only - the same resolver is exercised by A5.deleteUser | ⛔ not automated — declaration only - the same resolver is exercised by A5.deleteUser |
| `adminUserEmailChangeDriftResolve` | users admin | **reached-resolver** — no drift exists to resolve, so the oracle is the resolver-level "no drift" answer - never an authorization error | ✅ automated | ✅ automated |

### A5 — Delete a user; reset an identity/account; administer users' MCP keys

Spec: A5 · SC-002 · workspace#038

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `deleteUser` | users admin | **effect** — re-reading the disposable user returns not-found | ✅ automated | ✅ automated |
| `adminIdentityDeleteKratosIdentity` | users admin | **effect** — returns true for a disposable identity registered for this call; its login then fails | ✅ automated — targets a disposable identity registered for this one call | ✅ automated |
| `adminUserAccountDelete` | users admin | **effect** — returns the target id; the user can no longer sign in; the platform profile STILL exists (the resolver removes the sign-in account only) | ✅ automated | ✅ automated |
| `mcpApiKeys` | users admin | **returns-data** — the list contains the known fixture key of the target user | ✅ automated | ✅ automated |
| `adminRevokeMcpApiKey` | users admin | **effect** — the key is reported revoked on re-read | ✅ automated | ✅ automated |

### A6 — Create / delete an organization

Spec: A6 · FR-007(e) · SC-004

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `createOrganization` | support, f·organization creator | **effect** — the organization is readable by the returned id (then cleaned up) | ✅ automated | ✅ automated |
| `deleteOrganization` | support, *content full access* | **effect** — re-reading the organization returns not-found | ✅ automated | ✅ automated |

### A7 — Edit an organization-owned pack, hub or its templates

Spec: A7 · SC-003 · SC-004

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `updateInnovationPack` | support, *content full access* | **effect** — the changed field is visible on re-read | ✅ automated | ✅ automated |
| `updateInnovationHub` | support, *content full access* | **effect** — the changed field is visible on re-read | ✅ automated | ✅ automated |
| `createTemplate` | support, *content full access* | **effect** — the new template is listed in the pack templates set | ✅ automated | ✅ automated |
| `createTemplateFromSpace` | support, *content full access* | **effect** — the new template is listed in the pack templates set | ✅ automated | ✅ automated |
| `createTemplateFromContentSpace` | support, *content full access* | **effect** — the new template is listed in the pack templates set | ✅ automated | ✅ automated |
| `updateTemplate` | support, *content full access* | **effect** — the changed field is visible on re-read | ✅ automated | ✅ automated |
| `updateTemplateFromSpace` | support, *content full access* | **effect** — a marker callout added to the source space AFTER the template was cut appears in the template content space | ✅ automated | ✅ automated |
| `deleteTemplate` | support, *content full access* | **effect** — the template is no longer listed | ✅ automated | ✅ automated |
| `updateCallout` | support, *content full access* | **effect** — the framing display name of a CALLOUT TEMPLATE inside the organization pack changed on re-read (the isTemplate branch) | ✅ automated | ✅ automated |

### A8 — Delete content; set callout publisher

Spec: A8 · FR-004

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `deleteCallout` | content full access | **effect** — re-reading the deleted entity returns not-found | ✅ automated | ✅ automated |
| `deleteContribution` | content full access | **effect** — re-reading the deleted entity returns not-found | ✅ automated | ✅ automated |
| `deleteSpace` | content full access | **effect** — re-reading the deleted entity returns not-found | ✅ automated | ✅ automated |
| `deleteInnovationPack` | content full access | **effect** — re-reading the deleted entity returns not-found | ✅ automated | ✅ automated |
| `deleteInnovationHub` | content full access | **effect** — re-reading the deleted entity returns not-found | ✅ automated | ✅ automated |
| `updateCalloutPublishInfo` | content full access | **effect** — publisher / published date changed on re-read | ✅ automated | ✅ automated |

### A9 — Move resources between accounts / space levels

Spec: A9 · workspace#030

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `moveSpaceL1ToSpaceL0` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `moveSpaceL1ToSpaceL2` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `moveSpaceL2ToSpaceL1` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `convertSpaceL1ToSpaceL0` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `convertSpaceL2ToSpaceL1` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `convertSpaceL1ToSpaceL2` | resource admin | **effect** — the space reports the new level / parent on re-read | ✅ automated | ✅ automated |
| `convertVirtualContributorToUseKnowledgeBase` ⚠️ | resource admin | **effect** — the body-of-knowledge space callout is now listed in the VC knowledge base (the VC type label does NOT change - separate product finding) | ✅ automated | ✅ automated |
| `moveContributionToCallout` | resource admin | **effect** — the contribution is listed under the target callout | ✅ automated | ✅ automated |
| `transferCallout` | resource admin | **effect** — the callout is listed in the target callouts set and gone from the source | ✅ automated | ✅ automated |
| `transferInnovationHubToAccount` | resource admin | **effect** — the resource reports the TARGET account on re-read | ✅ automated | ✅ automated |
| `transferSpaceToAccount` | resource admin | **effect** — the resource reports the TARGET account on re-read | ✅ automated | ✅ automated |
| `transferInnovationPackToAccount` | resource admin | **effect** — the resource reports the TARGET account on re-read | ✅ automated | ✅ automated |
| `transferVirtualContributorToAccount` | resource admin | **effect** — the resource reports the TARGET account on re-read | ✅ automated | ✅ automated |

### A10 — Platform settings & configuration

Spec: A10

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `updatePlatformSettings` | settings admin | **effect** — the changed setting is visible on the platform settings read | ✅ automated | ✅ automated |
| `addIframeAllowedURL` | settings admin | **effect** — the entry is present in the platform settings read | ✅ automated | ✅ automated |
| `removeIframeAllowedURL` | settings admin | **effect** — the entry is absent from the platform settings read | ✅ automated | ✅ automated |
| `addNotificationEmailToBlacklist` | settings admin | **effect** — the entry is present in the platform settings read | ✅ automated | ✅ automated |
| `removeNotificationEmailFromBlacklist` | settings admin | **effect** — the entry is absent from the platform settings read | ✅ automated | ✅ automated |
| `setPlatformWellKnownVirtualContributor` | settings admin | **effect** — the well-known mapping reports the chosen VC (restored after) | ✅ automated | ✅ automated |

### A11 — Operational machinery

Spec: A11 · SC-002

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `cleanupCollections` | operations admin | **reached-resolver** — vector store may be absent: a non-authorization error on the root field is accepted | ✅ automated — where the vector store is absent the oracle is "reached the resolver": a non-authorization error on the root field | ✅ automated |
| `updateAssistantActorCapabilities` | operations admin | **effect** — capabilityGrant reports the written value (snapshotted before, restored after) | 🟠 exclusive (on demand, never nightly) — overwrites the singleton Web Assistant grant - capabilityGrant is snapshotted first and restored after | ✅ automated |
| `adminInAppNotificationsPrune` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — deletes notifications platform-wide | ✅ automated |
| `adminUpdateContributorAvatars` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | ✅ automated | ✅ automated |
| `adminUpdateGeoLocationData` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — rewrites geolocation on every profile | ✅ automated |
| `adminSearchIngestFromScratch` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — drops and rebuilds the search index | ✅ automated |
| `migrateLegacyMemoContent` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — irreversible content migration | ✅ automated |
| `migrateLegacyWhiteboardContent` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — irreversible content migration | ✅ automated |
| `refreshAllBodiesOfKnowledge` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — re-ingests every body of knowledge | ✅ automated |
| `adminCommunicationEnsureAccessToCommunications` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | ✅ automated | ✅ automated |
| `adminCommunicationRemoveOrphanedRoom` | operations admin | **executed** — returns true - the server treats an absent room as already removed | ✅ automated | ✅ automated |
| `adminCommunicationUpdateRoomState` | operations admin | **reached-resolver** — needs a real Matrix room id: a not-found from the adapter on the root field is accepted | ✅ automated | ✅ automated |
| `adminCommunicationMigrateOrphanedConversations` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — platform-wide Matrix migration | ✅ automated |
| `adminCommunicationSyncSpaceHierarchy` | operations admin | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back | 🟠 exclusive (on demand, never nightly) — platform-wide Matrix sync | ✅ automated |

### A12 — License usage

Spec: A12

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `createWingbackAccount` ❌ | license manager | **reached-resolver** — Wingback disabled: "not enabled" on the root field is accepted | ✅ automated — where Wingback is disabled the oracle is "reached the resolver": a non-authorization error on the root field. FR-021 says this surface must be DELETED - the row goes when the server complies | ✅ automated |
| `assignLicensePlanToAccount` | license manager | **effect** — the plan appears among the account / space subscriptions | ✅ automated | ✅ automated |
| `assignLicensePlanToSpace` | license manager | **effect** — the plan appears among the account / space subscriptions | ✅ automated | ✅ automated |
| `revokeLicensePlanFromAccount` | license manager | **effect** — the plan no longer appears | ✅ automated | ✅ automated |
| `revokeLicensePlanFromSpace` | license manager | **effect** — the plan no longer appears | ✅ automated | ✅ automated |
| `updateBaselineLicensePlanOnAccount` | license manager | **effect** — the baseline plan value changed on re-read | ✅ automated | ✅ automated |

### A13 — License plan definition

Spec: A13

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `createLicensePlan` | settings admin | **effect** — the new plan is listed by the licensing framework read (then deleted) | ✅ automated | ✅ automated |
| `deleteLicensePlan` | settings admin | **effect** — the plan / rule is gone from the licensing framework read | ✅ automated | ✅ automated |
| `updateLicensePlan` | settings admin | **effect** — the changed field is visible on re-read | ✅ automated | ✅ automated |
| `adminLicensePolicyDeleteCredentialRule` | settings admin | **effect** — the plan / rule is gone from the licensing framework read | ✅ automated | ✅ automated |
| `adminLicensePolicyUpdateCredentialRule` | settings admin | **effect** — the changed field is visible on re-read | ✅ automated | ✅ automated |
| `adminLicensePolicyCreateCredentialRule` | settings admin | **effect** — the new rule is present in the license policy read (then removed) | ✅ automated | ✅ automated |

### A14 — Space visibility

Spec: A14

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `updateSpacePlatformSettings` (renamed `adminUpdateSpaceVisibility` at Slice B) | license manager | **effect** — the space reports the new visibility on re-read (restored after) | ✅ automated | ✅ automated |

### A15 — Support inside a flag-enabled space; manage the forum

Spec: A15 · FR-007(e)

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `getAccessPrivilegesForPlatformSupport` | support | **returns-data** — on a space WITH allowPlatformSupportAsAdmin the holder has the admin privileges - and on a space WITHOUT the flag it does not (both asserted) | ✅ automated | ✅ automated |
| `updateDiscussion` | support | **effect** — the discussion title changed on re-read | ✅ automated | ✅ automated |
| `deleteDiscussion` | support | **effect** — the discussion is gone on re-read | ✅ automated | ✅ automated |
| `adminForumRemoveDiscussionCategory` | support | **effect** — the category is no longer among the forum discussion categories | ⛔ not automated — removal is permanent and the API has no add-category mutation, so the test cannot restore what it removes | ✅ automated |

### A16 — Read across spaces (service accounts only)

Spec: A16 · FR-002 · FR-010

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `createPlatformRolesAccess` ❌ | spaces reader, *content full access* | **returns-data** — reads the collaboration of a PRIVATE space it is not a member of | ✅ automated | ✅ automated |

### A17 — Rename an entity (nameID)

Spec: A17 · FR-020

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `updateActorNameID` | **nobody** | — | ⛔ not automated — surface does not exist until Slice B | ⛔ not automated — surface does not exist until Slice B |
| `nameID (protected section of the general content-entity update)` | **nobody** | — | ⛔ not automated — surface does not exist until Slice B | ⛔ not automated — surface does not exist until Slice B |

### A19 — Read the platform audit trail

Spec: A19 · FR-028 · SC-014

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `audit-log-analyze` (MCP tool) | audit reader | **returns-data** — returns the known email-change entry of the fixture user, with personal data masked | ✅ automated — the MCP tool analyze_audit_log - detected automatically; a visible todo where the server runs with MCP off | ✅ automated — the MCP tool analyze_audit_log - detected automatically; a visible todo where the server runs with MCP off |
| `latestUserEmailChangeAuditEntry` | audit reader | **returns-data** — returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool | ✅ automated | ✅ automated |
| `userEmailChangeAuditEntries` | audit reader | **returns-data** — returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool | ✅ automated | ✅ automated |

### A20 — Read Platform-role holder lists

Spec: A20 · FR-032 · SC-017

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `usersInRole` | roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `usersInRoles` | roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `organizationsInRole` | roles admin, audit reader | **returns-data** — asserted EMPTY: no organization can ever hold a Platform role (holder-kind rule), so there is no known holder to find | ✅ automated | ✅ automated |
| `organizationsInRoles` | roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `actorsWithCredential` ⚠️ | roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `usersWithAuthorizationCredential` ⚠️ | roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |

### A20b — Read Feature-role holder lists

Spec: A20b · FR-032 · SC-017

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `usersInRole` | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `usersInRoles` | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `organizationsInRole` | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `organizationsInRoles` | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `actorsWithCredential` ⚠️ | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |
| `usersWithAuthorizationCredential` ⚠️ | users admin, roles admin, audit reader | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail | ✅ automated | ✅ automated |

### A21 — Set / clear the service-profile marker

Spec: A21 · FR-002

| Capability | Allowed | Positive — must observe | Positive | Negative |
|---|---|---|---|---|
| `updateUser` (set serviceProfile) | roles admin | **effect** — serviceProfile has NO output field, so the marker is observed through its only visible effect: a set marker admits a Platform Spaces Reader grant | ✅ automated | ✅ automated |
| `updateUser` (clear serviceProfile) | roles admin | **effect** — serviceProfile has NO output field: a cleared marker makes the Platform Spaces Reader grant fail with the service-account rule | ✅ automated | ✅ automated |

## Per role — what it can do, and what it is refused

One section per role, in the order of `roles/*.it-spec.ts`. **Can** lists every capability the role is allowed, with what a passing positive must observe. **Cannot** lists everything else — each one is a negative that must be refused at the authorization gate. Marks: 🟠 runs in the on-demand project only · ⛔ not automated (see gaps) · no mark = runs in the default project.

### PLATFORM_ROLES_ADMIN

**Platform Roles Admin** — `roles/platform-roles-admin.it-spec.ts`

- **Owns:** Role assignment and nothing else: assigns and revokes all 14 roles (sole authority for the Platform ones), reads every holder list, sets the service-profile marker.
- **Must not:** Any content, settings, operational or user-record action; reading the audit trail; assigning any role to ITSELF.

**Can (20)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A1.assignPlatformRoleToUser#0` | owner | **effect** — holder list shows the target after assign |
| `A1.removePlatformRoleFromUser#1` | owner | **effect** — holder list no longer shows the target after remove |
| `A2.assignPlatformRoleToUser` | owner | **effect** — holder list shows the target after assign |
| `A2.removePlatformRoleFromUser` | owner | **effect** — holder list no longer shows the target after remove |
| `A2.assignPlatformRoleToOrganization` | owner | **effect** — holder list shows the target after assign |
| `A2.removePlatformRoleFromOrganization` | owner | **effect** — holder list no longer shows the target after remove |
| `A20.usersInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.usersInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.organizationsInRole` | owner | **returns-data** — asserted EMPTY: no organization can ever hold a Platform role (holder-kind rule), so there is no known holder to find |
| `A20.organizationsInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.actorsWithCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.usersWithAuthorizationCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.actorsWithCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersWithAuthorizationCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A21.updateUser#0` (set serviceProfile) | owner | **effect** — serviceProfile has NO output field, so the marker is observed through its only visible effect: a set marker admits a Platform Spaces Reader grant |
| `A21.updateUser#1` (clear serviceProfile) | owner | **effect** — serviceProfile has NO output field: a cleared marker makes the Platform Spaces Reader grant fail with the service-account rule |

**Cannot (99)** — by group:

- **A1** Assign / revoke a Platform role: `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`

### PLATFORM_CONTENT_FULL_ACCESS

**Platform Content Full Access** — `roles/platform-content-full-access.it-spec.ts`

- **Owns:** Full create / read / update / delete on all platform content. By the single accepted exception it also deletes an organization and edits an organization's packs, hubs and templates.
- **Must not:** Role assignment - absolutely, itself included; settings; operations; user records; resource moves; the forum; space visibility; entity renames.

**Can (17)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A6.deleteOrganization` | *accepted exception* | **effect** — re-reading the organization returns not-found |
| `A7.updateInnovationPack` | *accepted exception* | **effect** — the changed field is visible on re-read |
| `A7.updateInnovationHub` | *accepted exception* | **effect** — the changed field is visible on re-read |
| `A7.createTemplate` | *accepted exception* | **effect** — the new template is listed in the pack templates set |
| `A7.createTemplateFromSpace` | *accepted exception* | **effect** — the new template is listed in the pack templates set |
| `A7.createTemplateFromContentSpace` | *accepted exception* | **effect** — the new template is listed in the pack templates set |
| `A7.updateTemplate` | *accepted exception* | **effect** — the changed field is visible on re-read |
| `A7.updateTemplateFromSpace` | *accepted exception* | **effect** — a marker callout added to the source space AFTER the template was cut appears in the template content space |
| `A7.deleteTemplate` | *accepted exception* | **effect** — the template is no longer listed |
| `A7.updateCallout` | *accepted exception* | **effect** — the framing display name of a CALLOUT TEMPLATE inside the organization pack changed on re-read (the isTemplate branch) |
| `A8.deleteCallout` | owner | **effect** — re-reading the deleted entity returns not-found |
| `A8.deleteContribution` | owner | **effect** — re-reading the deleted entity returns not-found |
| `A8.deleteSpace` | owner | **effect** — re-reading the deleted entity returns not-found |
| `A8.deleteInnovationPack` | owner | **effect** — re-reading the deleted entity returns not-found |
| `A8.deleteInnovationHub` | owner | **effect** — re-reading the deleted entity returns not-found |
| `A8.updateCalloutPublishInfo` | owner | **effect** — publisher / published date changed on re-read |
| `A16.createPlatformRolesAccess` | *accepted exception* | **returns-data** — reads the collaboration of a PRIVATE space it is not a member of |

**Cannot (102)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_RESOURCE_ADMIN

**Platform Resource Admin** — `roles/platform-resource-admin.it-spec.ts`

- **Owns:** Resource moves: a space, hub, pack or VC to another account; promote, demote or move a space; move a callout or a contribution.
- **Must not:** Everything else - role assignment, settings, operations, user records, content access, the forum, support.

**Can (13)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A9.moveSpaceL1ToSpaceL0` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.moveSpaceL1ToSpaceL2` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.moveSpaceL2ToSpaceL1` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.convertSpaceL1ToSpaceL0` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.convertSpaceL2ToSpaceL1` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.convertSpaceL1ToSpaceL2` | owner | **effect** — the space reports the new level / parent on re-read |
| `A9.convertVirtualContributorToUseKnowledgeBase` | owner | **effect** — the body-of-knowledge space callout is now listed in the VC knowledge base (the VC type label does NOT change - separate product finding) |
| `A9.moveContributionToCallout` | owner | **effect** — the contribution is listed under the target callout |
| `A9.transferCallout` | owner | **effect** — the callout is listed in the target callouts set and gone from the source |
| `A9.transferInnovationHubToAccount` | owner | **effect** — the resource reports the TARGET account on re-read |
| `A9.transferSpaceToAccount` | owner | **effect** — the resource reports the TARGET account on re-read |
| `A9.transferInnovationPackToAccount` | owner | **effect** — the resource reports the TARGET account on re-read |
| `A9.transferVirtualContributorToAccount` | owner | **effect** — the resource reports the TARGET account on re-read |

**Cannot (106)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_SETTINGS_ADMIN

**Platform Settings Admin** — `roles/platform-settings-admin.it-spec.ts`

- **Owns:** Platform settings and configuration; DEFINING license plans and their entitlement rules.
- **Must not:** USING licenses (that is License Manager); role assignment; content; operations; user records.

**Can (12)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A10.updatePlatformSettings` | owner | **effect** — the changed setting is visible on the platform settings read |
| `A10.addIframeAllowedURL` | owner | **effect** — the entry is present in the platform settings read |
| `A10.removeIframeAllowedURL` | owner | **effect** — the entry is absent from the platform settings read |
| `A10.addNotificationEmailToBlacklist` | owner | **effect** — the entry is present in the platform settings read |
| `A10.removeNotificationEmailFromBlacklist` | owner | **effect** — the entry is absent from the platform settings read |
| `A10.setPlatformWellKnownVirtualContributor` | owner | **effect** — the well-known mapping reports the chosen VC (restored after) |
| `A13.createLicensePlan` | owner | **effect** — the new plan is listed by the licensing framework read (then deleted) |
| `A13.deleteLicensePlan` | owner | **effect** — the plan / rule is gone from the licensing framework read |
| `A13.updateLicensePlan` | owner | **effect** — the changed field is visible on re-read |
| `A13.adminLicensePolicyDeleteCredentialRule` | owner | **effect** — the plan / rule is gone from the licensing framework read |
| `A13.adminLicensePolicyUpdateCredentialRule` | owner | **effect** — the changed field is visible on re-read |
| `A13.adminLicensePolicyCreateCredentialRule` | owner | **effect** — the new rule is present in the license policy read (then removed) |

**Cannot (107)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_OPERATIONS_ADMIN

**Platform Operations Admin** — `roles/platform-operations-admin.it-spec.ts`

- **Owns:** Operational machinery: authorization and license resets, search and AI re-ingest, migrations, notification prune, Matrix housekeeping.
- **Must not:** Reading user personal data; email change or identity deletion; role assignment; content; settings; space visibility or structure.

**Can (24)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A3.authorizationPolicyResetOnPlatform` 🟠 | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.aiServerAuthorizationPolicyReset` 🟠 | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPolicyResetOnUser` | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPolicyResetOnOrganization` | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPolicyResetOnAccount` | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.licenseResetOnAccount` | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPolicyResetAll` 🟠 | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPlatformRolesAccessReset` 🟠 | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.authorizationPolicyResetToGlobalAdminsAccess` | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A3.resetLicenseOnAccounts` 🟠 | owner | **executed** — returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back |
| `A11.cleanupCollections` | owner | **reached-resolver** — vector store may be absent: a non-authorization error on the root field is accepted |
| `A11.updateAssistantActorCapabilities` 🟠 | owner | **effect** — capabilityGrant reports the written value (snapshotted before, restored after) |
| `A11.adminInAppNotificationsPrune` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminUpdateContributorAvatars` | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminUpdateGeoLocationData` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminSearchIngestFromScratch` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.migrateLegacyMemoContent` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.migrateLegacyWhiteboardContent` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.refreshAllBodiesOfKnowledge` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminCommunicationEnsureAccessToCommunications` | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminCommunicationRemoveOrphanedRoom` | owner | **executed** — returns true - the server treats an absent room as already removed |
| `A11.adminCommunicationUpdateRoomState` | owner | **reached-resolver** — needs a real Matrix room id: a not-found from the adapter on the root field is accepted |
| `A11.adminCommunicationMigrateOrphanedConversations` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |
| `A11.adminCommunicationSyncSpaceHierarchy` 🟠 | owner | **executed** — returns its success payload with no error; a maintenance job has no API-visible effect to read back |

**Cannot (95)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_USERS_ADMIN

**Platform Users Admin** — `roles/platform-users-admin.it-spec.ts`

- **Owns:** User records: login email change, user / identity / account deletion, users' MCP keys. Assigns the FEATURE roles and reads their holder lists.
- **Must not:** Assigning PLATFORM roles; reading Platform holder lists; the audit trail; content; settings; authorization reset.

**Can (17)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A2.assignPlatformRoleToUser` | owner | **effect** — holder list shows the target after assign |
| `A2.removePlatformRoleFromUser` | owner | **effect** — holder list no longer shows the target after remove |
| `A2.assignPlatformRoleToOrganization` | owner | **effect** — holder list shows the target after assign |
| `A2.removePlatformRoleFromOrganization` | owner | **effect** — holder list no longer shows the target after remove |
| `A4.adminUserEmailChange` | owner | **effect** — the user record reports the NEW email on re-read |
| `A4.adminUserEmailChangeDriftResolve` | owner | **reached-resolver** — no drift exists to resolve, so the oracle is the resolver-level "no drift" answer - never an authorization error |
| `A5.deleteUser` | owner | **effect** — re-reading the disposable user returns not-found |
| `A5.adminIdentityDeleteKratosIdentity` | owner | **effect** — returns true for a disposable identity registered for this call; its login then fails |
| `A5.adminUserAccountDelete` | owner | **effect** — returns the target id; the user can no longer sign in; the platform profile STILL exists (the resolver removes the sign-in account only) |
| `A5.mcpApiKeys` | owner | **returns-data** — the list contains the known fixture key of the target user |
| `A5.adminRevokeMcpApiKey` | owner | **effect** — the key is reported revoked on re-read |
| `A20b.usersInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.actorsWithCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersWithAuthorizationCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |

**Cannot (102)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `deleteUser` ⛔
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_SUPPORT

**Platform Support** — `roles/platform-support.it-spec.ts`

- **Owns:** The organization lifecycle (create and delete); editing an organization's packs, hubs and the templates inside; the platform forum; admin rights inside a space ONLY where that space enables the support flag.
- **Must not:** Moving those resources; deleting the pack or hub itself; any space that has not enabled the flag; role assignment; settings; operations; user records.

**Can (15)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A6.createOrganization` | owner | **effect** — the organization is readable by the returned id (then cleaned up) |
| `A6.deleteOrganization` | owner | **effect** — re-reading the organization returns not-found |
| `A7.updateInnovationPack` | owner | **effect** — the changed field is visible on re-read |
| `A7.updateInnovationHub` | owner | **effect** — the changed field is visible on re-read |
| `A7.createTemplate` | owner | **effect** — the new template is listed in the pack templates set |
| `A7.createTemplateFromSpace` | owner | **effect** — the new template is listed in the pack templates set |
| `A7.createTemplateFromContentSpace` | owner | **effect** — the new template is listed in the pack templates set |
| `A7.updateTemplate` | owner | **effect** — the changed field is visible on re-read |
| `A7.updateTemplateFromSpace` | owner | **effect** — a marker callout added to the source space AFTER the template was cut appears in the template content space |
| `A7.deleteTemplate` | owner | **effect** — the template is no longer listed |
| `A7.updateCallout` | owner | **effect** — the framing display name of a CALLOUT TEMPLATE inside the organization pack changed on re-read (the isTemplate branch) |
| `A15.getAccessPrivilegesForPlatformSupport` | owner | **returns-data** — on a space WITH allowPlatformSupportAsAdmin the holder has the admin privileges - and on a space WITHOUT the flag it does not (both asserted) |
| `A15.updateDiscussion` | owner | **effect** — the discussion title changed on re-read |
| `A15.deleteDiscussion` | owner | **effect** — the discussion is gone on re-read |
| `A15.adminForumRemoveDiscussionCategory` ⛔ | owner | **effect** — the category is no longer among the forum discussion categories |

**Cannot (104)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_LICENSE_MANAGER

**Platform License Manager** — `roles/platform-license-manager.it-spec.ts`

- **Owns:** License usage: assigns and revokes plans on accounts and spaces, sets the baseline plan, changes space visibility.
- **Must not:** Defining plans (that is Settings Admin); everything else.

**Can (7)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A12.createWingbackAccount` | owner | **reached-resolver** — Wingback disabled: "not enabled" on the root field is accepted |
| `A12.assignLicensePlanToAccount` | owner | **effect** — the plan appears among the account / space subscriptions |
| `A12.assignLicensePlanToSpace` | owner | **effect** — the plan appears among the account / space subscriptions |
| `A12.revokeLicensePlanFromAccount` | owner | **effect** — the plan no longer appears |
| `A12.revokeLicensePlanFromSpace` | owner | **effect** — the plan no longer appears |
| `A12.updateBaselineLicensePlanOnAccount` | owner | **effect** — the baseline plan value changed on re-read |
| `A14.updateSpacePlatformSettings` | owner | **effect** — the space reports the new visibility on re-read (restored after) |

**Cannot (112)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_SPACES_READER

**Platform Spaces Reader** — `roles/platform-spaces-reader.it-spec.ts`

- **Owns:** Reads across all spaces. Service accounts only - a grant to a human is rejected.
- **Must not:** Everything else.

**Can (1)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A16.createPlatformRolesAccess` | owner | **returns-data** — reads the collaboration of a PRIVATE space it is not a member of |

**Cannot (118)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### PLATFORM_AUDIT_READER

**Platform Audit Reader** — `roles/platform-audit-reader.it-spec.ts`

- **Owns:** Reads the platform audit trail (the only role that may) and every holder list.
- **Must not:** EVERY administrative action - it performs none, so it can never review its own work. Mutually exclusive with every other Platform role.

**Can (15)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A19.audit-log-analyze` | owner | **returns-data** — returns the known email-change entry of the fixture user, with personal data masked |
| `A19.latestUserEmailChangeAuditEntry` | owner | **returns-data** — returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool |
| `A19.userEmailChangeAuditEntries` | owner | **returns-data** — returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool |
| `A20.usersInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.usersInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.organizationsInRole` | owner | **returns-data** — asserted EMPTY: no organization can ever hold a Platform role (holder-kind rule), so there is no known holder to find |
| `A20.organizationsInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.actorsWithCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20.usersWithAuthorizationCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRole` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.organizationsInRoles` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.actorsWithCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |
| `A20b.usersWithAuthorizationCredential` | owner | **returns-data** — the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail |

**Cannot (104)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### FEATURE_BETA_TESTER

**Feature Beta Tester** — `roles/feature-beta-tester.it-spec.ts`

- **Owns:** Carries the trial license entitlement. Owns no administrative capability.
- **Must not:** Every administrative capability - including creating organizations, which moved to Feature Organization Creator.

**Can:** nothing in the capability table — this role owns no administrative capability. What it confers is proven by the Feature-role scenarios (F1–F3) below.

**Cannot (119)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### FEATURE_VIRTUAL_ASSISTANT

**Feature Virtual Assistant** — `roles/feature-virtual-assistant.it-spec.ts`

- **Owns:** Access to the virtual assistant. Owns no administrative capability.
- **Must not:** Every administrative capability.

**Can:** nothing in the capability table — this role owns no administrative capability. What it confers is proven by the Feature-role scenarios (F1–F3) below.

**Cannot (119)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### FEATURE_ORGANIZATION_CREATOR

**Feature Organization Creator** — `roles/feature-organization-creator.it-spec.ts`

- **Owns:** Creates organizations.
- **Must not:** Deleting organizations (that is Platform Support); every other administrative capability.

**Can (1)**

| Capability | Reaches it as | A passing positive must observe |
|---|---|---|
| `A6.createOrganization` | owner | **effect** — the organization is readable by the returned id (then cleaned up) |

**Cannot (118)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

### FEATURE_VC_CAMPAIGN

**Feature VC Campaign** — `roles/feature-vc-campaign.it-spec.ts`

- **Owns:** Shown the dashboard Virtual Contributor offer; carries the trial entitlement. Owns no administrative capability.
- **Must not:** Every administrative capability.

**Can:** nothing in the capability table — this role owns no administrative capability. What it confers is proven by the Feature-role scenarios (F1–F3) below.

**Cannot (119)** — by group:

- **A1** Assign / revoke a Platform role: `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `grantCredentialToUser`, `revokeCredentialFromUser`, `grantCredentialToOrganization`, `revokeCredentialFromOrganization`, `assignPlatformRoleToUser` (legacy GLOBAL_ADMIN role payload), `removePlatformRoleFromUser` (legacy GLOBAL_ADMIN role payload), `grantCredentialToActor`, `revokeCredentialFromActor`
- **A2** Assign / revoke a Feature role (user or organization): `assignPlatformRoleToUser`, `removePlatformRoleFromUser`, `assignPlatformRoleToOrganization`, `removePlatformRoleFromOrganization`
- **A3** Authorization reset & license-entitlement reset: `authorizationPolicyResetOnPlatform`, `aiServerAuthorizationPolicyReset`, `authorizationPolicyResetOnUser`, `authorizationPolicyResetOnOrganization`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `authorizationPolicyResetAll`, `authorizationPlatformRolesAccessReset`, `authorizationPolicyResetToGlobalAdminsAccess`, `resetLicenseOnAccounts`
- **A4** Change a user's login email: `adminUserEmailChange`, `deleteUser` ⛔, `adminUserEmailChangeDriftResolve`
- **A5** Delete a user; reset an identity/account; administer users' MCP keys: `deleteUser`, `adminIdentityDeleteKratosIdentity`, `adminUserAccountDelete`, `mcpApiKeys`, `adminRevokeMcpApiKey`
- **A6** Create / delete an organization: `createOrganization`, `deleteOrganization`
- **A7** Edit an organization-owned pack, hub or its templates: `updateInnovationPack`, `updateInnovationHub`, `createTemplate`, `createTemplateFromSpace`, `createTemplateFromContentSpace`, `updateTemplate`, `updateTemplateFromSpace`, `deleteTemplate`, `updateCallout`
- **A8** Delete content; set callout publisher: `deleteCallout`, `deleteContribution`, `deleteSpace`, `deleteInnovationPack`, `deleteInnovationHub`, `updateCalloutPublishInfo`
- **A9** Move resources between accounts / space levels: `moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL0`, `convertSpaceL2ToSpaceL1`, `convertSpaceL1ToSpaceL2`, `convertVirtualContributorToUseKnowledgeBase`, `moveContributionToCallout`, `transferCallout`, `transferInnovationHubToAccount`, `transferSpaceToAccount`, `transferInnovationPackToAccount`, `transferVirtualContributorToAccount`
- **A10** Platform settings & configuration: `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist`, `setPlatformWellKnownVirtualContributor`
- **A11** Operational machinery: `cleanupCollections`, `updateAssistantActorCapabilities`, `adminInAppNotificationsPrune`, `adminUpdateContributorAvatars`, `adminUpdateGeoLocationData`, `adminSearchIngestFromScratch`, `migrateLegacyMemoContent`, `migrateLegacyWhiteboardContent`, `refreshAllBodiesOfKnowledge`, `adminCommunicationEnsureAccessToCommunications`, `adminCommunicationRemoveOrphanedRoom`, `adminCommunicationUpdateRoomState`, `adminCommunicationMigrateOrphanedConversations`, `adminCommunicationSyncSpaceHierarchy`
- **A12** License usage: `createWingbackAccount`, `assignLicensePlanToAccount`, `assignLicensePlanToSpace`, `revokeLicensePlanFromAccount`, `revokeLicensePlanFromSpace`, `updateBaselineLicensePlanOnAccount`
- **A13** License plan definition: `createLicensePlan`, `deleteLicensePlan`, `updateLicensePlan`, `adminLicensePolicyDeleteCredentialRule`, `adminLicensePolicyUpdateCredentialRule`, `adminLicensePolicyCreateCredentialRule`
- **A14** Space visibility: `updateSpacePlatformSettings`
- **A15** Support inside a flag-enabled space; manage the forum: `getAccessPrivilegesForPlatformSupport`, `updateDiscussion`, `deleteDiscussion`, `adminForumRemoveDiscussionCategory`
- **A16** Read across spaces (service accounts only): `createPlatformRolesAccess`
- **A17** Rename an entity (nameID): `updateActorNameID` ⛔, `nameID` ⛔
- **A19** Read the platform audit trail: `audit-log-analyze`, `latestUserEmailChangeAuditEntry`, `userEmailChangeAuditEntries`
- **A20** Read Platform-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A20b** Read Feature-role holder lists: `usersInRole`, `usersInRoles`, `organizationsInRole`, `organizationsInRoles`, `actorsWithCredential`, `usersWithAuthorizationCredential`
- **A21** Set / clear the service-profile marker: `updateUser` (set serviceProfile), `updateUser` (clear serviceProfile)

## Rule scenarios

| Id | Scenario | Spec | File | Positive — what the test must observe | Negative — what the test must observe |
|---|---|---|---|---|---|
| R1.assigner-capability | Rule 1 — the assigner must hold the capability for that role family | FR-003 · SC-002 | `rules/assignment-rules.it-spec.ts` | ✅ automated — Users Admin grants a Feature role → holder list shows the target | ✅ automated — Users Admin (holds FEATURE_ROLE_ASSIGN, so it PASSES the resolver pre-check and reaches the rule engine) grants a Platform role → rule-1 error text, target does not hold the role, one role_grant_rejected audit record |
| R2.holder-kind | Rule 2 — a Platform role can never be held by an organization | FR-002 | `rules/assignment-rules.it-spec.ts` | ✅ automated — each of the 4 Feature roles granted to an organization → organizationsInRole shows it | ✅ automated — a Platform role granted to an organization → holder-kind error text (NOT RoleSetPolicyRoleLimitsException), organization absent from the holder list, rejection audit record — ⚠️ the ORGANIZATION-subject rejection record stays a test.todo: the audit tool filters by subject USER only (needs a server change) |
| R3.spaces-reader-service-account | Rule 3 — Platform Spaces Reader goes to service accounts only | FR-002 · A16 | `rules/assignment-rules.it-spec.ts` | ✅ automated — target with serviceProfile=true is granted Spaces Reader and can read a private space | ✅ automated — human target → rule-3 error text, not a holder, rejection audit record |
| R4.audit-reader-exclusion | Rule 4 — Audit Reader is mutually exclusive with every other Platform role, both directions | FR-028 | `rules/assignment-rules.it-spec.ts` | ✅ automated — an Audit Reader is granted a FEATURE role → allowed (the boundary of the exclusion) | ✅ automated — direction 1: Platform-role holder + Audit Reader; direction 2: Audit Reader + another Platform role → rule-4 text, state unchanged IN BOTH directions, rejection audit record |
| R5.last-roles-admin | Rule 5 — the last Platform Roles Admin cannot be revoked | FR-013a | `rules/assignment-rules.it-spec.ts` | ✅ automated — with two holders, revoking one succeeds (proves the block is about the LAST one) | 🟠 exclusive (on demand, never nightly) — rule-5 text + ruleId, holder still present, rejection audit record. Restore the stripped holders in a finally block, fixture first. If the rule is BROKEN at Slice B nobody can re-grant — recovery is a server restart (bootstrap re-seed), one more reason this never runs in the nightly — ⚠️ reaching "last holder" means temporarily stripping every other Roles Admin, including the break-glass account — safe only while nothing else runs |
| R6.self-assignment | Rule 6 — nobody assigns or revokes a role on themselves | FR-015 | `rules/assignment-rules.it-spec.ts` | ✅ automated — two-person path: a SECOND Roles Admin grants the first the same role | ✅ automated — self-grant of a Platform role, of a Feature role, and self-revoke → separation-of-duties text, myRoles unchanged, rejection audit record found by a before/after count (never "newest row") |
| G1.every-role-round-trip | Every one of the 14 roles is grantable and revocable, and the holder really gets the capability | SC-009 | `rules/grantability.it-spec.ts` | ✅ automated — on a disposable subject: before → grant → exact privilege delta per role + one owned action succeeds → revoke → delta gone AND holder list no longer shows the subject | ✅ automated — after revoke the owned action is denied with an authorization error on the root field |
| G2.organization-holder | Feature roles are grantable to and revocable from an organization | SC-009 · FR-026 | `rules/grantability.it-spec.ts` | ✅ automated — grant → organizationsInRole shows it + organization-subject audit record; revoke → gone — ⚠️ the organization-subject audit record is a test.todo: the audit tool filters by subject USER only (needs a server change) and MCP is off | — n/a — negative half is R2 |
| F1.beta-tester-entitlement | Feature Beta Tester confers the trial license entitlement | spec row 11 · server T040a | `rules/feature-roles.it-spec.ts` | ✅ automated — after the grant the holder’s account reports the ACCOUNT_LICENSE_PLUS entitlement; after revoke it does not | ✅ automated — holder cannot create an organization (that capability moved to Feature Organization Creator) |
| F2.virtual-assistant-access | Feature Virtual Assistant confers access to the assistant | spec row 12 | `rules/feature-roles.it-spec.ts` | ✅ automated — holder has ACCESS_VIRTUAL_ASSISTANT on the platform policy | ✅ automated — a registered user without the role does not |
| F3.vc-campaign-entitlement | Feature VC Campaign confers the trial entitlement and nothing else | spec row 14 (tenth clarification pass) | `rules/feature-roles.it-spec.ts` | ✅ automated — holder’s account reports ACCOUNT_LICENSE_PLUS; myRoles lists the role (what the client offer keys on) | ✅ automated — exact privilege delta on platform and role-set policies is empty |
| I1.grant-revoke-next-request | A grant works and a revoke denies on the very next request | FR-031 · SC-016 | `rules/immediacy.it-spec.ts` | ✅ automated — subject makes a denied request first (cache is WARM with "no role"), is granted, next request succeeds — no reset, no re-login, no wait | ✅ automated — subject makes an allowed request (cache WARM with the role), is revoked, next request is denied; repeated 3× to catch flapping |
| O1.admin-inherits-feature-role | An organization admin/owner inherits the organization’s Feature role; an associate never does | FR-002 · FR-031 | `rules/organization-inheritance.it-spec.ts` | ✅ automated — org holds Feature Organization Creator → its admin passes a READ-ONLY privilege probe (myPrivileges contains CREATE_ORGANIZATION) | ✅ automated — associate fails the same probe; after demoting the admin, the NEXT probe fails. Probe must be read-only: createOrganization grants the caller roles and flushes its own cache, which made this assertion unfalsifiable in #600 |
| O2.no-platform-role-via-organization | No Platform role is ever conferred through organization standing | FR-002 | `rules/organization-inheritance.it-spec.ts` | — n/a — a pure negative | ✅ automated — org admin of an organization holding every Feature role has NO Platform-role privilege on the platform or role-set policy |
| H1.partitioned-read | Holder lists are readable per role family, across all four fields | FR-032 · SC-017 · A20 · A20b | `holder-lists.it-spec.ts` | ✅ automated — Roles Admin + Audit Reader read Platform lists; those two + Users Admin read Feature lists — and the KNOWN single-role fixture holder is present in the result (an always-empty resolver must fail) | ✅ automated — every other role, Users Admin included for Platform lists, is denied on each of usersInRole / usersInRoles / organizationsInRole / organizationsInRoles |
| H2.mixed-request-fails-closed | One request naming a Feature and a Platform role is rejected whole for Users Admin | FR-032 | `holder-lists.it-spec.ts` | — n/a — a pure negative | ✅ automated — raw request keeping BOTH data and errors: authorization error AND data carries zero rows (the shared wrapper drops data on error, so it cannot be used here) |
| H3.denied-read-writes-no-audit-record | A denied holder-list READ writes no audit record (unlike a denied write) | FR-032 · T011 asymmetry | `holder-lists.it-spec.ts` | — n/a — a pure negative | ✅ automated — audit record count for the caller is identical before and after — ⚠️ reads audit records through the MCP tool — detected automatically; a visible todo where the server runs with MCP off |
| T1.audit-reader-alone | Only Platform Audit Reader reads the audit trail — all three surfaces | FR-028 · SC-014 · A19 | `audit-trail.it-spec.ts` | ✅ automated — Audit Reader reads both GraphQL fields and the MCP analyze_audit_log tool; personal data in the result is masked — ⚠️ all three surfaces. Masking applies to the MCP tool only — the two GraphQL fields return emails unmasked by pre-existing design | ✅ automated — all 13 other roles denied on all three surfaces — Roles Admin and Users Admin called out by name (D23 withdrawal) |
| T2.trail-is-unwritable | Nobody can write, alter or delete audit records through the API | FR-028 | `audit-trail.it-spec.ts` | — n/a — a pure negative | ✅ automated — schema introspection: no mutation accepts or returns a platform audit entry |
| AR1.grant-revoke-recorded | Every grant and revoke is recorded with operator, target, authorizing role and outcome | FR-018 · FR-019 · FR-026 · FR-027 | `audit-records.it-spec.ts` | ✅ automated — read back through the MCP tool as Audit Reader, on a FRESH subject: category, outcome, initiatorRole, initiator and subject ids — ⚠️ reads audit records through the MCP tool — detected automatically; a visible todo where the server runs with MCP off | ⛔ not automated — ORGANIZATION-subject records: the MCP tool filters by subjectUserId only and this repo has no database access. Closes with a one-field server change (subjectOrganizationId filter) |
| AR2.self-affecting-predicate | Self-affecting actions are retrievable; platform-wide ones are not false positives | SC-015 · FR-015 · FR-030 | `audit-records.it-spec.ts` | ✅ automated — a rejected self-grant and a self-targeted admin action are returned by initiator = subject — ⚠️ reads audit records through the MCP tool — detected automatically; a visible todo where the server runs with MCP off | ✅ automated — a grant to another user is NOT returned (normal run). The platform-wide half — a reset with no subject — runs in the on-demand exclusive project: a platform reset must never run beside other tests — ⚠️ reads audit records through the MCP tool — detected automatically; a visible todo where the server runs with MCP off |
| AR3.audit-store-outage | Fail-open / fail-closed behaviour when the audit store is unwritable | FR-025 · research D25 | — | ⛔ not automated — needs fault injection (REVOKE INSERT on the audit table) — impossible against a shared API, straightforward on a throwaway compose stack | ⛔ not automated — same enabler; until then server unit specs + the quickstart §5 drill |
| S1.marker-owned-by-roles-admin | Only Platform Roles Admin sets or clears the service-profile marker | A21 · FR-002 | `rules/service-profile.it-spec.ts` | ✅ automated — Roles Admin sets then clears it; each change is recorded; a cleared account can no longer be granted Spaces Reader | ✅ automated — all 13 other roles, via the MINIMAL updateUserServiceProfile document (never the heavy updateUser fragment — a forbidden sub-field reads as a denial): authorization error on the root field AND the marker did not move, on a target whose marker WAS set |
| X1.single-role-fixtures | Each test user holds exactly its one role — the premise of every negative | test integrity | `role-integrity.it-spec.ts` | ✅ automated — myRoles equals [role, REGISTERED] for all 14 fixtures | ✅ automated — no fixture holds PLATFORM_ADMIN or any legacy global-* credential; runs FIRST and aborts the project when it fails |
| X2.root-cascade-limits | Content Full Access holds cascaded CRUD and still cannot escalate | FR-004 · SC-004 | `role-integrity.it-spec.ts` | ✅ automated — holds DELETE on a space it has no membership in | ✅ automated — cannot assign any role, cannot manage the forum, cannot change visibility — asserted after proving it holds the root cascade |
| L1.seed-survives-restart | Bootstrap re-seeds a Roles Admin on every start; a rule-violating seed fails startup | FR-013 · FR-013b | — | ⛔ not automated — needs a stack restart between two assertions | ⛔ not automated — needs a stack start with a deliberately invalid seed |
| L2.legacy-roles-gone | After Slice B no legacy global role or credential remains | SC-005 · FR-012 | — | — n/a — a pure negative | 🟡 planned — schema introspection: RoleName and AuthorizationCredential list none of the 10 legacy values; usersWithAuthorizationCredential rejects them. No database needed — ⚠️ activates at Slice B |

## Existing tests requiring update

| File | Currently | Must become |
|---|---|---|
| `server-api/.../graphql-guard/graphql-guard-nested-queries.it-spec.ts` | Expects GLOBAL_ADMIN space privileges with `PLATFORM_ADMIN` — 5 of 8 tests red on the 027 server (run 2026-09-18) | Same swap its two sibling guard specs got: drop `PLATFORM_ADMIN`, add `ACCOUNT_LICENSE_MANAGE` + `PLATFORM_CONTENT_FULL_ACCESS` |
| `client-web/.../authz-admin-guard/platform-global-roles.spec.ts` | Navigates to the removed `GLOBAL_COMMUNITY_READER` role page; on the 027 client that falls back to the first offered role and **grants Platform Roles Admin to `qa.user`** | Rewrite against a target role before the 027 client reaches the nightly (UI phase) |

## Not covered — known gaps

| Item | Half | Why not automated | Where it belongs |
|---|---|---|---|
| `A4.deleteUser` | positive | declaration only - the same resolver is exercised by A5.deleteUser | covered-elsewhere |
| `A15.adminForumRemoveDiscussionCategory` | positive | removal is permanent and the API has no add-category mutation, so the test cannot restore what it removes | server-change |
| `A17.updateActorNameID` | positive | surface does not exist until Slice B | slice-b |
| `A17.nameID (protected section of the general content-entity update)` | positive | surface does not exist until Slice B | slice-b |
| AR1.grant-revoke-recorded — Every grant and revoke is recorded with operator, target, authorizing role and outcome | negative | ORGANIZATION-subject records: the MCP tool filters by subjectUserId only and this repo has no database access. Closes with a one-field server change (subjectOrganizationId filter) | server-change |
| AR3.audit-store-outage — Fail-open / fail-closed behaviour when the audit store is unwritable | positive | needs fault injection (REVOKE INSERT on the audit table) — impossible against a shared API, straightforward on a throwaway compose stack | isolated-stack-lane |
| AR3.audit-store-outage — Fail-open / fail-closed behaviour when the audit store is unwritable | negative | same enabler; until then server unit specs + the quickstart §5 drill | isolated-stack-lane |
| L1.seed-survives-restart — Bootstrap re-seeds a Roles Admin on every start; a rule-violating seed fails startup | positive | needs a stack restart between two assertions | isolated-stack-lane |
| L1.seed-survives-restart — Bootstrap re-seeds a Roles Admin on every start; a rule-violating seed fails startup | negative | needs a stack start with a deliberately invalid seed | isolated-stack-lane |
| UI behaviour per role | both | Sections per role and the Authorization page ARE automated in `client-web/src/functional-e2e/platform-roles/` (`pnpm run test:platform-roles` in client-web, 47 tests). One UI can/cannot per role and immediacy in the UI are still manual | `platform-roles-admin-manual-checklist.md`, Parts C and D |

## Currently red — product findings, not test defects

| Test | Observed | Why it stays red |
|---|---|---|
| `PLATFORM_SETTINGS_ADMIN › can › A13.updateLicensePlan` | the mutation reports success; the value re-reads unchanged | `LicensePlanService.update()` saves the plan without applying the input (also on `develop`). A positive must observe its effect — there is none to observe |
| `PLATFORM_RESOURCE_ADMIN › cannot › A16.createPlatformRolesAccess` | Resource Admin READS a private space it is not a member of | the server grants it READ on every space deliberately; the requirements allow only Spaces Reader (+ the Content Full Access exception). Needs a product decision — then either the table or the server changes |
| `PLATFORM_CONTENT_FULL_ACCESS › cannot › A13.createLicensePlan` | Content Full Access CREATES a license plan | the five censused A13 mutations check a dedicated in-memory policy, exactly so that the root CRUD cascade does not admit Content Full Access; `createLicensePlan` was left out of the census and still checks `licensingFramework.authorization`, which inherits that cascade. Found 2026-09-21 |

## What is genuinely proven

Verified live against the 027 server, twice in a row with identical results (2026-09-18): **93 of 119 capabilities have an automated positive and 116 an automated negative**, run for all 14 roles — 142 positive and 1482 negative role-level checks in the table, of which the exclusive and not-automated rows are excluded from the default run. Every negative is a refusal AT THE AUTHORIZATION GATE (an authorization code on the gate path), never a validation error, a not-found, or a forbidden sub-field. Every positive observes what its row declares — an effect read back, known data returned, a success payload, or (5 rows) a non-authorization error proving the gate was passed.

Rule scenarios: 20 positive and 21 negative halves automated. **What is NOT proven:** anything that reads a role-assignment audit record (the MCP endpoint is disabled on the stack this was built against — those halves are visible `test.todo`s that switch on with `PLATFORM_ROLES_MCP=1` once the endpoint answers); the 14 platform-wide positives in the `exclusive` project, which are written and type-checked but have NEVER been executed; restart and fault-injection scenarios; and the UI.
