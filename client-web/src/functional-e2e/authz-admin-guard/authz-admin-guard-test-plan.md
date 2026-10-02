# Test plan — admin role surfaces gated on the server's privilege (085 / client-web#9537) + memo Sign action gate (server#6478 / client-web#10278)

**Status:** Draft — implemented 2026-09-09 on the QA lead's instruction during the Release 75 verification; awaiting plan review.
**Release:** 75 (client-web `0.164.0`, server `0.165.0`). Bug found and fixed during verification: client-web#10279 → #10280.
**Source of truth:** `agents-hq/test-suites/docs/runs/release-75-verification.md` rows 1–6, 13–14 and procedures P1–P6, P13–P14.

## What this covers

client-web#9537 introduced `useActionPermission` + `GatedAction`: every role-assignment control on four admin
surfaces is enabled only when the current user's `myPrivileges` on the role set contains the privilege the
server enforces for that action, fails closed when the privileges cannot be read, and surfaces a server
refusal as one toast. server#6478 + client-web#10278 hide the memo "Sign memo" action behind the
`SPACE_FLAG_MEMO_SIGNING` entitlement and a Cleverbase login method.

The API side of the same contracts is already covered: the role-set privilege matrix in
`server-api/.../roleset/user/user.authorization.it-spec.ts`, and the new
`server-api/.../entitlements/memo-signing-entitlement.it-spec.ts` (entitlement default, grant, inheritance,
revoke, gate order). This folder covers the **UI** side, which had none.

## How to run

```bash
# against the local stack (release branch checked out in server/ and client-web/)
pnpm --filter @alkemio/test-suite-client-web exec playwright test src/functional-e2e/authz-admin-guard --workers=1
```

Personas are the standard harness users (`space.admin`, `space.member`, `organization.admin`, `admin`,
`global.support`, `qa.user` as the subject whose roles change). Each file creates and deletes its own
scenario; the platform-roles file uses no scenario and therefore populates the persona map itself.
Registered in the nightly config as project **Authz admin guard**.

## Scenario → test mapping

| # | Scenario | Persona | Spec |
|---|----------|---------|------|
| 1.1–1.4 | Space Community: Lead / Admin / Remove enabled; Lead and Admin changes persist after reload; no denied toast; revert | `space.admin` | `space-community-role-changes.spec.ts` |
| 2.1–2.2 | Space Community as GLOBAL_SUPPORT: controls enabled, Lead change persists, member removal persists — never "enabled then refused" (R-2) | `global.support` | same |
| 3.1 | Space Community boundary: a plain member gets no admin surface (no per-member Actions menu) | `space.member` | same |
| 2.1, 2.2 | Org Associates: add / remove associate persists | `organization.admin` | `org-associates-authorization.spec.ts` |
| 3.1–3.3 | Org Authorization: add / remove admin persists; Owner controls gated off for a non-owner admin | `organization.admin` | same |
| 4.1, 4.2 | Org tabs as GLOBAL_SUPPORT: control is gated off with the tooltip, not offered, or enabled AND honoured — the outcome is recorded as a test annotation | `global.support` | same |
| 4.1, 4.2 | Platform Global Roles: add / remove a user on `GLOBAL_COMMUNITY_READER`; persists; no denied toast | `admin` | `platform-global-roles.spec.ts` |
| 4.3 | Platform Global Roles as GLOBAL_SUPPORT: admin area unreachable, or Add gated off with the tooltip | `global.support` | same |
| 5.1 | Unverifiable: every read of this role set's authorization answered without `myPrivileges` → the Community tab lists no members and offers no Actions menu (READ is gone too); a reload without the fault restores it | `space.admin` + route fault | `unverifiable-and-denied.spec.ts` |
| 5.2 | Denied by derivation: privileges present but without the assign token → Lead/Admin/Remove each disabled with the tooltip "You don't have permission to change members of this role." | `space.admin` + route fault | same |
| 6.1 | Denied toast: `AssignRoleToUser` answered with FORBIDDEN → "You don't have permission to make this change. The change was not saved."; nothing applied after reload | `space.admin` + route fault | same |
| 13.1 | Memo dialog with the entitlement off: no "Sign memo", no "Signed copies" | `space.admin` | `memo-sign-action-gate.spec.ts` |
| 14.1 | Memo dialog with the entitlement granted (license plan assigned via API): still no "Sign memo" — identity gate | `space.admin` | same |

## Not covered — known gaps

- The **add-member (invite) path** on the Community tab: a different feature (invitations), not a role change.
- A real **`unverifiable` tooltip** on the Community tab cannot be reached: a role set without readable
  privileges has no READ either, so the tab shows no members. 5.1 asserts that fail-closed outcome instead.
- **Overlay layout and memo dialog visuals** (Release 75 rows 7, 8 and the memo UI): manual, by decision.
- **Sign flow past the gate** (Cleverbase identity + trust gateway): not reachable with harness personas and
  deliberately not deployed on ACC/PROD in Release 75.
- **Owner-level org controls as an owner**: the scenario grants `organization.admin` the Admin role only.

## Notes for whoever maintains this

- Confirmation dialogs are Radix **AlertDialog** (`role="alertdialog"`), not `dialog`.
- Candidate lists in the org Authorization tab and the platform roles editor are searched server-side and
  render as `listitem`s reading `"<name> (<email>)"`; the platform editor's current members carry a
  **Remove** button, candidates an **Add** button — that is how the two lists are told apart.
- Org Admin/Owner candidates are drawn from the organization's **associates**: keep "add associate"
  before any Admin case and "remove associate" after.
- `TestUserManager.users` is populated by `createBaseScenario`; a file without a scenario must call
  `TestUserManager.populateUserModelMap()` first, and persona emails for `createPersonaTest` must be literals
  (the map is empty at module load).
- Faults are injected with `page.route` on `**/api/private/graphql` keyed on `operationName`
  (`AssignRoleToUser`); always `unroute` before asserting the healthy state.
- The role-set fault must be applied to **every** response carrying `RoleSet:<id>`, not to one
  operation: the Community tab reads the same role set through `RoleSetAuthorization` and
  `CommunityApplicationsInvitations`, Apollo merges them, and the last response wins — a
  single-operation fault is a race (red on Test, green locally). `injectRoleSetAuthorizationFault`
  walks each response for this role set's id.
