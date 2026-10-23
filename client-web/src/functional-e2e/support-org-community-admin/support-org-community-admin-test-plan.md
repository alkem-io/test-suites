# Test plan — Platform Support on the organisation Community tab (090)

> **Status:** Approved (2026-10-23, QA lead) · **Depth:** Deep — authorization change (new privilege on every organisation role set, activated by reset), migration (audit category), cross-repo contract (enum + error code), new audit trail · **Story:** [alkem-io/server#6692](https://github.com/alkem-io/server/issues/6692) · **Spec:** `specs/090-support-org-community-admin/` in `alkem-io/agents-hq` · **Diff:** server#6708 (`5a61e53b1`), client-web#10468 (`4f1a41d04`)

Platform Support now does on `/organization/<org>/settings/community` what an org admin does there (invite, promote/demote, remove, approve/reject, revoke, resend, read), never direct add. Every action it takes writes an `organization_administration` audit row. Before this plan, test-suites had **no** test that exercised Support on an organisation's Community tab: five tests asserted the opposite and turn red tonight. The plan re-aligns those five, then adds API cases where the risk sits (gates, self-target, accept-time honouring, audit rows, stored policy). Two UI walks cover what only the browser shows: the community-only shell and the end-to-end repair.

## How to run

```bash
# API (nightly via roleset/**). Needs MCP on the server for the audit halves (MCP_ENABLED=true; test env has it).
cd server-api && pnpm exec vitest run --project roleset src/functional-api/roleset/associates/support-org-community-*.it-spec.ts
# Local-stack-only halves (S-07, A-04, A-11 SQL): loopback Postgres configured (harnessPostgresConfigured()).
# UI walks: Kratos sign-ups through the shared MailSlurper inbox, so one worker.
cd client-web && UI_HEADLESS=true pnpm exec playwright test --workers=1 src/functional-e2e/support-org-community-admin
# 027 matrix rows (U-6), on demand, not nightly:
cd server-api && pnpm run test:platform-roles && pnpm run test:platform-roles:plan
```

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A Support user makes themself Admin/Owner of any organisation (self-invite, self-approve, self-promote, self-offer at accept) and gains account-admin standing over everything it hosts | M | H | High | A-09, A-10, W-03 |
| R2 | Support adds someone to an organisation without their consent (direct add) | L | H | High | S-03, U-6 |
| R3 | Support reaches more than the Community tab (form, profile, settings, invitation lifecycle), or another platform role (Content Full Access in particular) gains or loses reach | L | H | High | S-02, S-04, S-05, W-02, U-6 |
| R4 | A Support action goes unaudited, is audited wrongly (wrong action/outcome/initiator), or the audit leaks an email address; an org-admin action is audited as Support | M | H | High | A-01…A-11 audit halves |
| R5 | The repair does not work: a Support-offered Admin is not granted on accept, or is granted although the credential was revoked or the cap is full | M | H | High | A-01, A-02, A-03 |
| R6 | After deploy the feature looks broken until each organisation is reset; reset-all run from a stale auth-reset worker image silently rewrites policies without the grant | M | M | Medium | S-01, S-06, S-07, manual M1/M2 |
| R7 | The gate rewrite changes what org admins (or Space admins) can do, or org admins start writing Support audit rows | L | H | Medium | existing roleset/** + 062/081 suites, A-11 |
| R8 | Support cannot find or open the tab, sees a control that then errors, or lands on other tabs | M | M | Medium | W-01, W-02, U-5 |
| R9 | Rollback by image revert after a reset breaks `myPrivileges` for Support viewers | L | M | Medium | manual M3 (runbook) |
| R10 | Collateral (not in spec): `buildForActor` now loads credentials, which changes inbound Matrix message notifications, VC invocation and MCP actor-bound keys | M | M | Medium | charter E-2 |

Elevated-risk triggers present: ☑ migration · ☐ breaking contract (additive enum + new error code `PLATFORM_SUPPORT_SELF_TARGET`) · ☑ authorization/visibility · ☑ cross-repo contract · ☐ infra/config (reset runbook only) · ☐ data-destructive · ☐ performance-sensitive. Release 79 (alkem-io/alkemio#2196) has no risk rows for this change yet. Its post-deploy task runs reset-all directly and skips the spec's canary step (TU Delft TBM first) — **reconcile**.

## Existing coverage before this work

Searched `origin/develop` @ `6a59a74a` (server-api, client-web, lib) by `GLOBAL_SUPPORT_ADMIN|global.support|PLATFORM_SUPPORT`, org role-set wrappers, `organization_administration`, `credentialRules`, settings URLs, and the 062/081/085/027 areas. Every candidate file was opened.

- **Proven absent:** any Support action on an organisation role set; any read of `organization_administration` rows; any `myPrivileges`/`credentialRules` read on an *organisation* role set; any community-only settings shell test.
- **Invalidated, red on tonight's nightly** (assert Slice B "Support refused"): `roleset/associates/organization-associate-invitation-external.it-spec.ts` › US1-AS8 (Slice B); `organization-associate-invitation.it-spec.ts` › US2-AS9 (Slice B); `pending-confidentiality.it-spec.ts` › "Platform Support is refused every pending list"; client-web `organization-email-invitations/us1-invite-by-email.spec.ts` › AS8 Support tail; `authz-admin-guard/org-associates-authorization.spec.ts` › 4.1. 4.2 stays green but now accepts "gated off" for a role that must be enabled.
- **Stale but not red:** `platform-roles/capabilities.data.ts` (Support `mustNot: role assignment`; no rows for the new surfaces; no org variant in A22). The generated `platform-roles-test-plan.md` must be regenerated after U-6. Nothing reds, because the table does not import the server census (harness.md gap).
- **Confirmed unaffected** (opened): `platform-roles/rules/organization-inheritance.it-spec.ts` (Support acts as the creator, so the entity-admin path applies), `contributor-management/organization/organization-owner.it-spec.ts`, `roleset/organization/*` (organisations inside Spaces), `memberships/*organization*settings*`, `roleset/invitations/invitation-organization.it-spec.ts`. `roleset/user/user.authorization.it-spec.ts` pins exact Space role-set privileges for the Support persona, so it already **proves FR-004's Space half**.
- **Reused as regression guards:** 062 `organization-associate-invitation.it-spec.ts` › US2-AS6 (an admin-offered Admin is honoured; this depends on the `buildForActor` credentials fix), › US2-AS8 (an admin who lost standing has the offer withheld); 062/081 fixtures (an org admin assigning ADMIN to a non-associate passes the new consent split); `organization-owner.it-spec.ts` › last-owner error text; `pending-confidentiality` › a plain user is refused the lists (FR-011 error contract).
- **Owning repos:** the server unit specs pin the gate, the per-site audit calls, the five accept-time branches, fail-open and the census. The client-web unit tests pin the access-mode, routes-table, `canManage` OR and self-target mapping. client-web's six `e2e/specs/090-*.e2e.spec.ts` are `@forge-acceptance` and env-seeded, so **never executed in CI**. They give locator evidence only.
- **Reuse figure:** of the 22 scenarios mapped below, 2 need no new case (re-aligned existing tests cover them fully: U-3, U-5). 7 reuse existing coverage partly, either a different branch or the functional half only: FR-004 Space half, 062 US2-AS5/AS6, 081 email allow, last-owner text, org-admin functional behaviour, client unit routes. 13 had no coverage.

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| Stored rules on org role set + children; none on org/Space/root | FR-002/003/004, K2 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-01 — the stored rules (P1, decision table)` | API |
| Privilege matrix, 14 platform roles × org role set/org/children | FR-003/004, US3-AS5, SC-005 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-02 — who holds what: the 14 platform roles (P1, decision table)` | API |
| No direct add (4 variants) | FR-006, US3-AS2 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-03 — Support can never add anyone directly (P1, equivalence partitions)`; 027 `platform-roles` A22 rows `A22.assignRoleToUser#org-entry` / `#org-elevated` (all 14 roles refused) | API |
| Form / profile / settings / invitation lifecycle refused | FR-010, C-12, US3-AS3 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-04 — surfaces outside the Community tab stay closed to Support (P1, equivalence partitions)` | API |
| Content Full Access: exactly today's reach, no rows | US3-AS5 (OP-6) | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-05 — Content Full Access keeps exactly today's reach, no more (P1, decision table)`; W-04 not built (P3, below the floor) | API |
| Reset idempotent; pre-reset invitation revocable | US3-AS6, FR-025 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-06 — the reset is idempotent and keeps a pre-reset invitation revocable (P2, state transition)` | API |
| Not-yet-reset org: nothing granted until reset | US3-AS6, R6 | `server-api/…/roleset/associates/support-org-community-scope.it-spec.ts` › `S-07 — an organisation not yet reset grants nothing until it is (P2, state transition; local stack only)` (skips off the local stack) | API |
| Support reads members/pending/applications | US1-AS1, FR-011 | U-3: `roleset/associates/pending-confidentiality.it-spec.ts` › `Platform Support reads every pending list of an organisation (090 FR-011)`; also A-06 step 1 | API |
| Invite user offering Admin → accept → Associate+Admin, 2 rows | US1-AS2/AS3, FR-013 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-01 — repair an orphan by invitation: offer Admin, the invitee accepts (P1, use case)`; U-2: `organization-associate-invitation.it-spec.ts` › `US2-AS9 (090): a Platform Support invitation offering Admin is created and listed with its offer` | API |
| Credential revoked before accept → withheld `standing_lost` | US1-AS4 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-02 — the offerer loses the Support credential before the accept (P1, state transition)` | API |
| Owner cap at accept: on-limit honoured, over-limit withheld | US1-AS5 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-03 — the Owner cap at accept time: on the limit honoured, one over withheld (P2, boundary values)` | API |
| Email invite / resend / revoke: allowed; rows carry no address | US1-AS6, FR-017 | U-1: `organization-associate-invitation-external.it-spec.ts` › `US1-AS8 (090): Platform Support may invite, list, resend and revoke email invitations on an organisation`; U-4: `organization-email-invitations/us1-invite-by-email.spec.ts` › `US1-AS8 …` (Support tail); `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-04 — email-invitation audit rows carry no address (P2, use case; local stack only)` | API, UI |
| Promote / demote / remove member, one row each | US2-AS1/2/3 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-05 — promote, demote and remove a member (P1, use case)` | API |
| Approve / reject / reopen / archive, one row each; invalid event no row | US2-AS4, FR-015b | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-06 — application events, one row per state change (P1, state transition)` | API |
| Revoke user invitation | US2-AS5 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-07 — revoke a pending user invitation (P1, use case)` | API |
| Last owner refused, no row | US2-AS6 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-08 — the last owner cannot be removed, and no row is written (P2, boundary values)` | API |
| Self-target refusals (code `PLATFORM_SUPPORT_SELF_TARGET`) | US3-AS4, FR-008 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-09 — self-targeted Support actions are refused (P1, decision table)`; `client-web/…/support-org-community-admin/us3-community-only-shell.spec.ts` › `W-03 — the self-target refusal reaches the user` | API, UI |
| Self-offered Owner withheld at accept | US3-AS4, OP-1 | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-10 — a self-offered Owner is withheld at accept (P2, state transition)` | API |
| Org admin / admin+Support write no row: promote, demote, invite + accept, revoke, approve, reject, remove, reopen, archive, and an admin's offer withheld for lost standing | US2-AS7, FR-018, SC-003 (org-admin controls) | `server-api/…/roleset/associates/support-org-community-actions.it-spec.ts` › `A-11 — organisation-admin actions write no Support row (P1, decision table)` (two tests; the email-invite half skips off the local stack) | API |
| Orphan repaired end to end in the UI | US1-AS1…AS3, FR-020/021, SC-001 | `client-web/…/support-org-community-admin/us1-support-repairs-orphan.spec.ts` › `W-01 — Support repairs an orphaned organisation: reach the tab and invite`, `W-01 — the invitee accepts`, `W-01 — Support sees the repaired organisation` | UI |
| Other settings paths redirect; one tab; no extra affordance | US3-AS1, FR-019/022 | `client-web/…/support-org-community-admin/us3-community-only-shell.spec.ts` › `W-02 — Support is confined to the Community tab` and the control `W-02 (control) — an organisation admin keeps the full shell`; client unit routes table | UI |
| Support invite control honoured | US1-AS1 (UI), R8 | U-5: `authz-admin-guard/org-associates-authorization.spec.ts` › `4.1 Invite: Platform Support's invite control is enabled and honoured (090)` and `4.2 Row editor: the control is enabled and honoured, never enabled-then-refused (090: gated off is now the regression)` | UI |
| Support's reach as capability rows: nine Community-tab surfaces (Support, plus Content Full Access on revoke/reject) and no direct add for any of the 14 roles | FR-005/009/011, FR-006, SC-005 | 027 `platform-roles` (on demand, not nightly): `A23.*` (9 rows) and `A22.assignRoleToUser#org-entry` / `#org-elevated`; `platform-roles-test-plan.md` regenerated, `coverage-guard` green | API |

### Regression guards

- **Accept-time standing (`buildForActor` loaded no credentials).** The server PR found that every offered role was withheld as `standing_lost`, because the offerer's context was built without credentials. A-01 (Support path) and 062 › US2-AS6 (admin path) pin both branches.
- **Silent lifecycle no-op.** An event that is valid by name but fails its guard returns success without changing state (`lifecycle.service.ts` only warns). A-06 asserts "exactly one row per state change", and S-05 asserts that Content Full Access's APPROVE leaves the state `new`.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Audit fail-open (store down → action stands, error logged) | Deferred: no infra lever to fail the audit insert | server unit `organization.administration.audit.service.spec.ts` |
| `mark_application_approved` row | Deferred: no lever to stall an application in `approving` | server unit (event→action map test) |
| Email-invitation audit rows on the nightly | Deferred: rows have no subject user; MCP reads by subject only | A-04 on local stack; manual M4 on ACC |
| Migration on real ACC/PROD rows | Additive `ADD VALUE IF NOT EXISTS`; every audit positive proves the value exists on the env it runs on (a missing value is a missing row, because writes fail open) | manual M4 |
| Support + Content Full Access holder revokes/rejects unaudited (Content Full Access supplies the base privilege → entity-admin path) | Deferred pending ruling Q1 | open question |
| Second account / colluding colleague made Owner | Accepted design (R-1, OP-8): detective control only | Release 79 risk profile |
| Demote/remove self on the Support path | Unit only: holding Admin/Owner makes the actor entity-admin, and leaving is self-removal. A-09 pins the only reachable form (removing a role not held) | server unit gate spec |
| TU Delft canary: "not reset" then "reset" on a pre-deploy org | Manual: only a pre-deploy org shows the first half | M1 |
| Reset-all from the auth-reset worker; rollback | Manual: release ops | M2, M3 |
| Screen-reader semantics of the single-tab strip and the self-target toast | Manual: no a11y harness | M5 |
| Content Full Access settings shell in the browser (W-04): six tabs on `/settings/profile`, Invite disabled on Community | Not built: P3, below the P2 floor of the implementing run. The API half (S-05) pins the reach | W-04, when scheduled |
| Six-locale copy of `platformSupportSelfTarget` | Locale gap; client-web i18n parity unit test | owning repo |
| `buildForActor` collateral (notifications, VC, MCP actor keys) | Exploratory: not in spec, no oracle agreed | charter E-2 |

Proven once these cases land: every reachable Support-path write is admitted, takes effect as it would for an org admin, and leaves exactly one correct, address-free row. Every exclusion (direct add, form, profile, settings, invitation lifecycle, self-target) is refused. No other platform role gains a privilege. The stored policy carries exactly the two rules and survives a reset. **Not proven by automation:** that a pre-deploy organisation (TU Delft TBM) is repaired after the canary reset (SC-007, manual M1); that reset-all ran on a matching worker image; and fail-open under a real audit outage. Email-invitation audit rows are proven on the local stack only (A-04, the A-11 add-on and S-07 skip themselves where Postgres is not loopback, so the nightly reports them as skipped, never green).
