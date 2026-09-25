import type { Coverage } from './capabilities.data';

/**
 * workspace#027-platform-role-redesign — the acceptance scenarios a
 * role × capability grid CANNOT express: they need a payload-dependent rule,
 * a state change between two assertions, or a record read back afterwards.
 *
 * Same contract as `capabilities.data.ts`: one row per scenario, a positive and
 * a negative half each with an explicit coverage status, and
 * `platform-roles-test-plan.md` is rendered from it.
 *
 * `oracle` is what the test must OBSERVE to pass — written down because the
 * review of test-suites#600 found several scenarios whose assertion could not
 * fail (error-only checks, reads of data the wrapper had already discarded,
 * probes that flushed the very cache they were probing).
 */

export type ScenarioArea =
  | 'assignment-rules'
  | 'grantability'
  | 'immediacy'
  | 'organization-inheritance'
  | 'holder-lists'
  | 'audit-trail'
  | 'audit-records'
  | 'service-profile'
  | 'role-integrity'
  | 'lifecycle';

export type Scenario = {
  id: string;
  area: ScenarioArea;
  title: string;
  spec: string;
  /** Planned spec file, relative to this directory. */
  file: string;
  positive: Coverage & { oracle?: string };
  negative: Coverage & { oracle?: string };
};

/** `pending`: the part of the oracle that is still a visible `test.todo`, and why. */
const automated = (oracle: string, pending?: string) => ({
  status: 'automated' as const,
  oracle,
  ...(pending ? { reason: pending } : {}),
});

/** Automated; on a server with MCP switched off (sandbox) it shows as a `todo`. */
const waitsOnMcp = (oracle: string) => ({
  status: 'automated' as const,
  oracle,
  reason:
    'reads audit records through the MCP tool — detected automatically; a visible todo where the server runs with MCP off',
});

export const SCENARIOS: readonly Scenario[] = [
  // ===== assignment rules — six rules, each with its own error text ==========
  {
    id: 'R1.assigner-capability',
    area: 'assignment-rules',
    title:
      'Rule 1 — the assigner must hold the capability for that role family',
    spec: 'FR-003 · SC-002',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'Users Admin grants a Feature role → holder list shows the target'
    ),
    negative: automated(
      'Users Admin (holds FEATURE_ROLE_ASSIGN, so it PASSES the resolver pre-check and reaches the rule engine) grants a Platform role → rule-1 error text, target does not hold the role, one role_grant_rejected audit record'
    ),
  },
  {
    id: 'R2.holder-kind',
    area: 'assignment-rules',
    title: 'Rule 2 — a Platform role can never be held by an organization',
    spec: 'FR-002',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'each of the 4 Feature roles granted to an organization → organizationsInRole shows it'
    ),
    negative: automated(
      'a Platform role granted to an organization → holder-kind error text (NOT RoleSetPolicyRoleLimitsException), organization absent from the holder list, rejection audit record',
      'the ORGANIZATION-subject rejection record stays a test.todo: the audit tool filters by subject USER only (needs a server change)'
    ),
  },
  {
    id: 'R3.spaces-reader-service-account',
    area: 'assignment-rules',
    title: 'Rule 3 — Platform Spaces Reader goes to service accounts only',
    spec: 'FR-002 · A16',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'target with serviceProfile=true is granted Spaces Reader and can read a private space'
    ),
    negative: automated(
      'human target → rule-3 error text, not a holder, rejection audit record'
    ),
  },
  {
    id: 'R4.audit-reader-exclusion',
    area: 'assignment-rules',
    title:
      'Rule 4 — Audit Reader is mutually exclusive with every other Platform role, both directions',
    spec: 'FR-028',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'an Audit Reader is granted a FEATURE role → allowed (the boundary of the exclusion)'
    ),
    negative: automated(
      'direction 1: Platform-role holder + Audit Reader; direction 2: Audit Reader + another Platform role → rule-4 text, state unchanged IN BOTH directions, rejection audit record'
    ),
  },
  {
    id: 'R5.last-roles-admin',
    area: 'assignment-rules',
    title: 'Rule 5 — the last Platform Roles Admin cannot be revoked',
    spec: 'FR-013a',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'with two holders, revoking one succeeds (proves the block is about the LAST one)'
    ),
    negative: {
      status: 'exclusive',
      reason:
        'reaching "last holder" means temporarily stripping every other Roles Admin, including the break-glass account — safe only while nothing else runs',
      oracle:
        'rule-5 text + ruleId, holder still present, rejection audit record. Restore the stripped holders in a finally block, fixture first. If the rule is BROKEN at Slice B nobody can re-grant — recovery is a server restart (bootstrap re-seed), one more reason this never runs in the nightly',
    },
  },
  {
    id: 'R6.self-assignment',
    area: 'assignment-rules',
    title: 'Rule 6 — nobody assigns or revokes a role on themselves',
    spec: 'FR-015',
    file: 'rules/assignment-rules.it-spec.ts',
    positive: automated(
      'two-person path: a SECOND Roles Admin grants the first the same role'
    ),
    negative: automated(
      'self-grant of a Platform role, of a Feature role, and self-revoke → separation-of-duties text, myRoles unchanged, rejection audit record found by a before/after count (never "newest row")'
    ),
  },

  // ===== grantability =========================================================
  {
    id: 'G1.every-role-round-trip',
    area: 'grantability',
    title:
      'Every one of the 14 roles is grantable and revocable, and the holder really gets the capability',
    spec: 'SC-009',
    file: 'rules/grantability.it-spec.ts',
    positive: automated(
      'on a disposable subject: before → grant → exact privilege delta per role + one owned action succeeds → revoke → delta gone AND holder list no longer shows the subject'
    ),
    negative: automated(
      'after revoke the owned action is denied with an authorization error on the root field'
    ),
  },
  {
    id: 'G2.organization-holder',
    area: 'grantability',
    title: 'Feature roles are grantable to and revocable from an organization',
    spec: 'SC-009 · FR-026',
    file: 'rules/grantability.it-spec.ts',
    positive: automated(
      'grant → organizationsInRole shows it + organization-subject audit record; revoke → gone',
      'the organization-subject audit record is a test.todo: the audit tool filters by subject USER only (needs a server change) and MCP is off'
    ),
    negative: { status: 'not-applicable', reason: 'negative half is R2' },
  },

  // ===== feature roles — their capability is NOT an admin surface, so the
  // capability grid shows them with zero positives; these rows are their positives
  {
    id: 'F1.beta-tester-entitlement',
    area: 'grantability',
    title: 'Feature Beta Tester confers the trial license entitlement',
    spec: 'spec row 11 · server T040a',
    file: 'rules/feature-roles.it-spec.ts',
    positive: automated(
      'after the grant the holder’s account reports the ACCOUNT_LICENSE_PLUS entitlement; after revoke it does not'
    ),
    negative: automated(
      'holder cannot create an organization (that capability moved to Feature Organization Creator)'
    ),
  },
  {
    id: 'F2.virtual-assistant-access',
    area: 'grantability',
    title: 'Feature Virtual Assistant confers access to the assistant',
    spec: 'spec row 12',
    file: 'rules/feature-roles.it-spec.ts',
    positive: automated(
      'holder has ACCESS_VIRTUAL_ASSISTANT on the platform policy'
    ),
    negative: automated('a registered user without the role does not'),
  },
  {
    id: 'F3.vc-campaign-entitlement',
    area: 'grantability',
    title: 'Feature VC Campaign confers the trial entitlement and nothing else',
    spec: 'spec row 14 (tenth clarification pass)',
    file: 'rules/feature-roles.it-spec.ts',
    positive: automated(
      'holder’s account reports ACCOUNT_LICENSE_PLUS; myRoles lists the role (what the client offer keys on)'
    ),
    negative: automated(
      'exact privilege delta on platform and role-set policies is empty'
    ),
  },

  // ===== immediacy ============================================================
  {
    id: 'I1.grant-revoke-next-request',
    area: 'immediacy',
    title: 'A grant works and a revoke denies on the very next request',
    spec: 'FR-031 · SC-016',
    file: 'rules/immediacy.it-spec.ts',
    positive: automated(
      'subject makes a denied request first (cache is WARM with "no role"), is granted, next request succeeds — no reset, no re-login, no wait'
    ),
    negative: automated(
      'subject makes an allowed request (cache WARM with the role), is revoked, next request is denied; repeated 3× to catch flapping'
    ),
  },

  // ===== organization inheritance ============================================
  {
    id: 'O1.admin-inherits-feature-role',
    area: 'organization-inheritance',
    title:
      'An organization admin/owner inherits the organization’s Feature role; an associate never does',
    spec: 'FR-002 · FR-031',
    file: 'rules/organization-inheritance.it-spec.ts',
    positive: automated(
      'org holds Feature Organization Creator → its admin passes a READ-ONLY privilege probe (myPrivileges contains CREATE_ORGANIZATION)'
    ),
    negative: automated(
      'associate fails the same probe; after demoting the admin, the NEXT probe fails. Probe must be read-only: createOrganization grants the caller roles and flushes its own cache, which made this assertion unfalsifiable in #600'
    ),
  },
  {
    id: 'O2.no-platform-role-via-organization',
    area: 'organization-inheritance',
    title: 'No Platform role is ever conferred through organization standing',
    spec: 'FR-002',
    file: 'rules/organization-inheritance.it-spec.ts',
    positive: { status: 'not-applicable', reason: 'a pure negative' },
    negative: automated(
      'org admin of an organization holding every Feature role has NO Platform-role privilege on the platform or role-set policy'
    ),
  },

  // ===== holder lists =========================================================
  {
    id: 'H1.partitioned-read',
    area: 'holder-lists',
    title: 'Holder lists are readable per role family, across all four fields',
    spec: 'FR-032 · SC-017 · A20 · A20b',
    file: 'holder-lists.it-spec.ts',
    positive: automated(
      'Roles Admin + Audit Reader read Platform lists; those two + Users Admin read Feature lists — and the KNOWN single-role fixture holder is present in the result (an always-empty resolver must fail)'
    ),
    negative: automated(
      'every other role, Users Admin included for Platform lists, is denied on each of usersInRole / usersInRoles / organizationsInRole / organizationsInRoles'
    ),
  },
  {
    id: 'H2.mixed-request-fails-closed',
    area: 'holder-lists',
    title:
      'One request naming a Feature and a Platform role is rejected whole for Users Admin',
    spec: 'FR-032',
    file: 'holder-lists.it-spec.ts',
    positive: { status: 'not-applicable', reason: 'a pure negative' },
    negative: automated(
      'raw request keeping BOTH data and errors: authorization error AND data carries zero rows (the shared wrapper drops data on error, so it cannot be used here)'
    ),
  },
  {
    id: 'H3.denied-read-writes-no-audit-record',
    area: 'holder-lists',
    title:
      'A denied holder-list READ writes no audit record (unlike a denied write)',
    spec: 'FR-032 · T011 asymmetry',
    file: 'holder-lists.it-spec.ts',
    positive: { status: 'not-applicable', reason: 'a pure negative' },
    negative: waitsOnMcp(
      'audit record count for the caller is identical before and after'
    ),
  },

  // ===== audit trail (reading it) ============================================
  {
    id: 'T1.audit-reader-alone',
    area: 'audit-trail',
    title:
      'Only Platform Audit Reader reads the audit trail — all three surfaces',
    spec: 'FR-028 · SC-014 · A19',
    file: 'audit-trail.it-spec.ts',
    positive: automated(
      'Audit Reader reads both GraphQL fields and the MCP analyze_audit_log tool; personal data in the result is masked',
      'all three surfaces. Masking applies to the MCP tool only — the two GraphQL fields return emails unmasked by pre-existing design'
    ),
    negative: automated(
      'all 13 other roles denied on all three surfaces — Roles Admin and Users Admin called out by name (D23 withdrawal)'
    ),
  },
  {
    id: 'T2.trail-is-unwritable',
    area: 'audit-trail',
    title: 'Nobody can write, alter or delete audit records through the API',
    spec: 'FR-028',
    file: 'audit-trail.it-spec.ts',
    positive: { status: 'not-applicable', reason: 'a pure negative' },
    negative: automated(
      'schema introspection: no mutation accepts or returns a platform audit entry'
    ),
  },

  // ===== audit records (what gets written) ===================================
  {
    id: 'AR1.grant-revoke-recorded',
    area: 'audit-records',
    title:
      'Every grant and revoke is recorded with operator, target, authorizing role and outcome',
    spec: 'FR-018 · FR-019 · FR-026 · FR-027',
    file: 'audit-records.it-spec.ts',
    positive: waitsOnMcp(
      'read back through the MCP tool as Audit Reader, on a FRESH subject: category, outcome, initiatorRole, initiator and subject ids'
    ),
    negative: {
      status: 'not-automated',
      reason:
        'ORGANIZATION-subject records: the MCP tool filters by subjectUserId only and this repo has no database access. Closes with a one-field server change (subjectOrganizationId filter)',
      belongs: 'server-change',
    },
  },
  {
    id: 'AR2.self-affecting-predicate',
    area: 'audit-records',
    title:
      'Self-affecting actions are retrievable; platform-wide ones are not false positives',
    spec: 'SC-015 · FR-015 · FR-030',
    file: 'audit-records.it-spec.ts',
    positive: waitsOnMcp(
      'a rejected self-grant and a self-targeted admin action are returned by initiator = subject'
    ),
    negative: waitsOnMcp(
      'a grant to another user is NOT returned (normal run). The platform-wide half — a reset with no subject — runs in the on-demand exclusive project: a platform reset must never run beside other tests'
    ),
  },
  {
    id: 'AR3.audit-store-outage',
    area: 'audit-records',
    title:
      'Fail-open / fail-closed behaviour when the audit store is unwritable',
    spec: 'FR-025 · research D25',
    file: '-',
    positive: {
      status: 'not-automated',
      reason:
        'needs fault injection (REVOKE INSERT on the audit table) — impossible against a shared API, straightforward on a throwaway compose stack',
      belongs: 'isolated-stack-lane',
    },
    negative: {
      status: 'not-automated',
      reason:
        'same enabler; until then server unit specs + the quickstart §5 drill',
      belongs: 'isolated-stack-lane',
    },
  },

  // ===== service profile ======================================================
  {
    id: 'S1.marker-owned-by-roles-admin',
    area: 'service-profile',
    title:
      'Only Platform Roles Admin sets or clears the service-profile marker',
    spec: 'A21 · FR-002',
    file: 'rules/service-profile.it-spec.ts',
    positive: automated(
      'Roles Admin sets then clears it; each change is recorded; a cleared account can no longer be granted Spaces Reader'
    ),
    negative: automated(
      'all 13 other roles, via the MINIMAL updateUserServiceProfile document (never the heavy updateUser fragment — a forbidden sub-field reads as a denial): authorization error on the root field AND the marker did not move, on a target whose marker WAS set'
    ),
  },

  // ===== role integrity =======================================================
  {
    id: 'X1.single-role-fixtures',
    area: 'role-integrity',
    title:
      'Each test user holds exactly its one role — the premise of every negative',
    spec: 'test integrity',
    file: 'role-integrity.it-spec.ts',
    positive: automated(
      'myRoles equals [role, REGISTERED] for all 14 fixtures'
    ),
    negative: automated(
      'no fixture holds PLATFORM_ADMIN or any legacy global-* credential; runs FIRST and aborts the project when it fails'
    ),
  },
  {
    id: 'X2.root-cascade-limits',
    area: 'role-integrity',
    title: 'Content Full Access holds cascaded CRUD and still cannot escalate',
    spec: 'FR-004 · SC-004',
    file: 'role-integrity.it-spec.ts',
    positive: automated('holds DELETE on a space it has no membership in'),
    negative: automated(
      'cannot assign any role, cannot manage the forum, cannot change visibility — asserted after proving it holds the root cascade'
    ),
  },

  // ===== lifecycle (cannot be driven through a remote API) ====================
  {
    id: 'L1.seed-survives-restart',
    area: 'lifecycle',
    title:
      'Bootstrap re-seeds a Roles Admin on every start; a rule-violating seed fails startup',
    spec: 'FR-013 · FR-013b',
    file: '-',
    positive: {
      status: 'not-automated',
      reason: 'needs a stack restart between two assertions',
      belongs: 'isolated-stack-lane',
    },
    negative: {
      status: 'not-automated',
      reason: 'needs a stack start with a deliberately invalid seed',
      belongs: 'isolated-stack-lane',
    },
  },
  {
    id: 'L2.legacy-roles-gone',
    area: 'lifecycle',
    title: 'After Slice B no legacy global role or credential remains',
    spec: 'SC-005 · FR-012',
    file: '-',
    positive: {
      status: 'not-applicable',
      reason: 'a pure negative',
    },
    negative: {
      status: 'planned',
      reason: 'activates at Slice B',
      oracle:
        'schema introspection: RoleName and AuthorizationCredential list none of the 10 legacy values; usersWithAuthorizationCredential rejects them. No database needed',
    },
  },
];
