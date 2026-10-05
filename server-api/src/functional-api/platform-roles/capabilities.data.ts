/**
 * workspace#027-platform-role-redesign — THE single source of truth for what the
 * platform-roles API suite covers.
 *
 * Every administrative capability the 027 acceptance criteria name is one row
 * here: which surface it is, which of the 14 target roles MAY reach it, and
 * whether its positive ("the owning role can") and negative ("every other role
 * cannot") scenario is automated, planned, local-only, or deliberately not
 * automated — with the reason written down.
 *
 * Two things are generated FROM this file and never edited by hand:
 *   - the per-role specs under `roles/` iterate it (`capabilitiesFor(role)`);
 *   - `platform-roles-test-plan.md` is rendered from it
 *     (`pnpm --filter server-api exec tsx src/functional-api/platform-roles/generate-test-plan.ts`).
 * So the list of what is covered cannot drift from what actually runs.
 *
 * `owners` + `acceptedExtra` were seeded from the server's own census
 * (`server: src/platform/platform-role/verification/a.row.surfaces.ts` @ 6f1763dc1,
 * 118 entries) and then become this suite's independent statement of the
 * acceptance criteria. When the two disagree, that is a finding, not a merge
 * error — a test that imports its own expectation proves nothing.
 *
 * Roles are string literals ON PURPOSE: this table must load without the
 * generated SDK, so the plan and the coverage guard run offline.
 */

export const PLATFORM_ROLES = [
  'PLATFORM_ROLES_ADMIN',
  'PLATFORM_CONTENT_FULL_ACCESS',
  'PLATFORM_RESOURCE_ADMIN',
  'PLATFORM_SETTINGS_ADMIN',
  'PLATFORM_OPERATIONS_ADMIN',
  'PLATFORM_USERS_ADMIN',
  'PLATFORM_SUPPORT',
  'PLATFORM_LICENSE_MANAGER',
  'PLATFORM_SPACES_READER',
  'PLATFORM_AUDIT_READER',
  'FEATURE_BETA_TESTER',
  'FEATURE_VIRTUAL_ASSISTANT',
  'FEATURE_ORGANIZATION_CREATOR',
  'FEATURE_VC_CAMPAIGN',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * What each role is FOR, in the words of the requirements (spec.md §Target
 * global role model). Rendered at the top of the role's section in the plan;
 * the header comment of `roles/<role>.it-spec.ts` repeats it.
 */
export const ROLE_SUMMARY: Record<
  PlatformRole,
  { name: string; owns: string; mustNot: string }
> = {
  PLATFORM_ROLES_ADMIN: {
    name: 'Platform Roles Admin',
    owns: 'Role assignment and nothing else: assigns and revokes all 14 roles (sole authority for the Platform ones), reads every holder list, sets the service-profile marker.',
    mustNot:
      'Any content, settings, operational or user-record action; reading the audit trail; assigning any role to ITSELF.',
  },
  PLATFORM_CONTENT_FULL_ACCESS: {
    name: 'Platform Content Full Access',
    owns: "Full create / read / update / delete on all platform content. By the single accepted exception it also deletes an organization and edits an organization's packs, hubs and templates.",
    mustNot:
      'Role assignment - absolutely, itself included; settings; operations; user records; resource moves; the forum; space visibility; entity renames.',
  },
  PLATFORM_RESOURCE_ADMIN: {
    name: 'Platform Resource Admin',
    owns: 'Resource moves: a space, hub, pack or VC to another account; promote, demote or move a space; move a callout or a contribution.',
    mustNot:
      'Everything else - role assignment, settings, operations, user records, content access, the forum, support.',
  },
  PLATFORM_SETTINGS_ADMIN: {
    name: 'Platform Settings Admin',
    owns: 'Platform settings and configuration; DEFINING license plans and their entitlement rules.',
    mustNot:
      'USING licenses (that is License Manager); role assignment; content; operations; user records.',
  },
  PLATFORM_OPERATIONS_ADMIN: {
    name: 'Platform Operations Admin',
    owns: 'Operational machinery: authorization and license resets, search and AI re-ingest, migrations, notification prune, Matrix housekeeping.',
    mustNot:
      'Reading user personal data; email change or identity deletion; role assignment; content; settings; space visibility or structure.',
  },
  PLATFORM_USERS_ADMIN: {
    name: 'Platform Users Admin',
    owns: "User records: login email change, user / identity / account deletion, users' MCP keys. Assigns the FEATURE roles and reads their holder lists.",
    mustNot:
      'Assigning PLATFORM roles; reading Platform holder lists; the audit trail; content; settings; authorization reset.',
  },
  PLATFORM_SUPPORT: {
    name: 'Platform Support',
    owns: "The organization lifecycle (create and delete); editing an organization's packs, hubs and the templates inside; the platform forum; admin rights inside a space ONLY where that space enables the support flag.",
    mustNot:
      'Moving those resources; deleting the pack or hub itself; any space that has not enabled the flag; role assignment; settings; operations; user records.',
  },
  PLATFORM_LICENSE_MANAGER: {
    name: 'Platform License Manager',
    owns: 'License usage: assigns and revokes plans on accounts and spaces, sets the baseline plan, changes space visibility.',
    mustNot: 'Defining plans (that is Settings Admin); everything else.',
  },
  PLATFORM_SPACES_READER: {
    name: 'Platform Spaces Reader',
    owns: 'Reads across all spaces. Service accounts only - a grant to a human is rejected.',
    mustNot: 'Everything else.',
  },
  PLATFORM_AUDIT_READER: {
    name: 'Platform Audit Reader',
    owns: 'Reads the platform audit trail (the only role that may) and every holder list.',
    mustNot:
      'EVERY administrative action - it performs none, so it can never review its own work. Mutually exclusive with every other Platform role.',
  },
  FEATURE_BETA_TESTER: {
    name: 'Feature Beta Tester',
    owns: 'Carries the trial license entitlement. Owns no administrative capability.',
    mustNot:
      'Every administrative capability - including creating organizations, which moved to Feature Organization Creator.',
  },
  FEATURE_VIRTUAL_ASSISTANT: {
    name: 'Feature Virtual Assistant',
    owns: 'Access to the virtual assistant. Owns no administrative capability.',
    mustNot: 'Every administrative capability.',
  },
  FEATURE_ORGANIZATION_CREATOR: {
    name: 'Feature Organization Creator',
    owns: 'Creates organizations.',
    mustNot:
      'Deleting organizations (that is Platform Support); every other administrative capability.',
  },
  FEATURE_VC_CAMPAIGN: {
    name: 'Feature VC Campaign',
    owns: 'Shown the dashboard Virtual Contributor offer; carries the trial entitlement. Owns no administrative capability.',
    mustNot: 'Every administrative capability.',
  },
};

/**
 * - `automated`     a test exists and runs in the `platform-roles` project
 * - `planned`       approved for automation, not written yet
 * - `exclusive`     automated, but the ALLOW touches platform-wide or singleton
 *                   state — lives in the separate `platform-roles-exclusive`
 *                   project, which is NEVER part of the nightly. Run on demand:
 *                   on a local stack, or as a release-verification step while
 *                   nothing else uses the environment. Serial; singleton state is
 *                   snapshotted and restored
 * - `not-applicable` the scenario cannot exist (e.g. no role may reach it)
 * - `not-automated` deliberately left out — `reason` and `belongs` say why/where
 */
export type CoverageStatus =
  | 'automated'
  | 'planned'
  | 'exclusive'
  | 'not-applicable'
  | 'not-automated';

export type Coverage = {
  status: CoverageStatus;
  reason?: string;
  belongs?:
    | 'slice-b'
    | 'manual'
    | 'server-unit'
    | 'covered-elsewhere'
    | 'server-change'
    | 'isolated-stack-lane'
    | 'environment';
};

export type CapabilityGroupId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'
  | 'A10'
  | 'A11'
  | 'A12'
  | 'A13'
  | 'A14'
  | 'A15'
  | 'A16'
  | 'A17'
  | 'A19'
  | 'A20'
  | 'A20b'
  | 'A21';

export type CapabilityGroup = { title: string; spec: string };

export const CAPABILITY_GROUPS: Record<CapabilityGroupId, CapabilityGroup> = {
  A1: {
    title: 'Assign / revoke a Platform role',
    spec: 'A1 · FR-003 · FR-015 · FR-022',
  },
  A2: {
    title: 'Assign / revoke a Feature role (user or organization)',
    spec: 'A2 · FR-002 · FR-003',
  },
  A3: {
    title: 'Authorization reset & license-entitlement reset',
    spec: 'A3 · SC-002',
  },
  A4: { title: "Change a user's login email", spec: 'A4 · SC-002' },
  A5: {
    title:
      "Delete a user; reset an identity/account; administer users' MCP keys",
    spec: 'A5 · SC-002 · workspace#038',
  },
  A6: {
    title: 'Create / delete an organization',
    spec: 'A6 · FR-007(e) · SC-004',
  },
  A7: {
    title: 'Edit an organization-owned pack, hub or its templates',
    spec: 'A7 · SC-003 · SC-004',
  },
  A8: { title: 'Delete content; set callout publisher', spec: 'A8 · FR-004' },
  A9: {
    title: 'Move resources between accounts / space levels',
    spec: 'A9 · workspace#030',
  },
  A10: { title: 'Platform settings & configuration', spec: 'A10' },
  A11: { title: 'Operational machinery', spec: 'A11 · SC-002' },
  A12: { title: 'License usage', spec: 'A12' },
  A13: { title: 'License plan definition', spec: 'A13' },
  A14: { title: 'Space visibility', spec: 'A14' },
  A15: {
    title: 'Support inside a flag-enabled space; manage the forum',
    spec: 'A15 · FR-007(e)',
  },
  A16: {
    title: 'Read across spaces (service accounts only)',
    spec: 'A16 · FR-002 · FR-010',
  },
  A17: { title: 'Rename an entity (nameID)', spec: 'A17 · FR-020' },
  A19: {
    title: 'Read the platform audit trail',
    spec: 'A19 · FR-028 · SC-014',
  },
  A20: {
    title: 'Read Platform-role holder lists',
    spec: 'A20 · FR-032 · SC-017',
  },
  A20b: {
    title: 'Read Feature-role holder lists',
    spec: 'A20b · FR-032 · SC-017',
  },
  A21: {
    title: 'Set / clear the service-profile marker',
    spec: 'A21 · FR-002',
  },
};

export type Capability = {
  /** Stable id — `<group>.<surface>`; `#n` only where a group lists a surface twice. */
  id: string;
  group: CapabilityGroupId;
  /** The GraphQL field / MCP tool name at Slice A. */
  surface: string;
  kind: 'mutation' | 'query' | 'field' | 'mcp-tool';
  /** Roles the acceptance criteria name as owning this capability. */
  owners: readonly PlatformRole[];
  /** Roles that reach it by a DECLARED, accepted exception (SC-004 / FR-010). */
  acceptedExtra: readonly PlatformRole[];
  /** What distinguishes two rows that share a surface (payload differs). */
  variant?: string;
  renamedAtSliceB?: string;
  retiredAtSliceB?: boolean;
  /**
   * How the Allowed set is backed by the requirements (spec.md + contracts):
   * `named` the surface is named there · `family` the spec assigns the owner at
   * action-family level and the family wording covers this surface · `silent`
   * neither - the membership is the implementation's claim and needs product
   * confirmation · `conflict` the requirements say something else.
   */
  requirement: {
    basis: 'named' | 'family' | 'silent' | 'conflict';
    note?: string;
  };
  /**
   * What a PASSING positive must observe. "No error" is never enough on its own:
   * `effect` success AND the effect read back independently · `returns-data`
   * the result contains known fixture data · `executed` success payload only
   * (maintenance jobs with no API-visible effect) · `reached-resolver` an
   * absent external dependency: a NON-authorization error on the root field.
   * Absent when no role may reach the surface.
   */
  verifies?: {
    kind: 'effect' | 'returns-data' | 'executed' | 'reached-resolver';
    oracle: string;
  };
  /** "Every role in owners ∪ acceptedExtra CAN." */
  positive: Coverage;
  /** "Every other target role CANNOT, with an authorization error on the root field." */
  negative: Coverage;
};

export const CAPABILITIES: readonly Capability[] = [
  // ===== A1 — Assign / revoke a Platform role =====
  {
    id: 'A1.assignPlatformRoleToUser#0',
    group: 'A1',
    surface: 'assignPlatformRoleToUser',
    kind: 'mutation',
    owners: ['PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list shows the target after assign',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.removePlatformRoleFromUser#1',
    group: 'A1',
    surface: 'removePlatformRoleFromUser',
    kind: 'mutation',
    owners: ['PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list no longer shows the target after remove',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.grantCredentialToUser',
    group: 'A1',
    surface: 'grantCredentialToUser',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    retiredAtSliceB: true,
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.revokeCredentialFromUser',
    group: 'A1',
    surface: 'revokeCredentialFromUser',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    retiredAtSliceB: true,
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.grantCredentialToOrganization',
    group: 'A1',
    surface: 'grantCredentialToOrganization',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    retiredAtSliceB: true,
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.revokeCredentialFromOrganization',
    group: 'A1',
    surface: 'revokeCredentialFromOrganization',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    retiredAtSliceB: true,
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.assignPlatformRoleToUser#6',
    group: 'A1',
    surface: 'assignPlatformRoleToUser',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    variant: 'legacy GLOBAL_ADMIN role payload',
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.removePlatformRoleFromUser#7',
    group: 'A1',
    surface: 'removePlatformRoleFromUser',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    variant: 'legacy GLOBAL_ADMIN role payload',
    requirement: { basis: 'named' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.grantCredentialToActor',
    group: 'A1',
    surface: 'grantCredentialToActor',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A1.revokeCredentialFromActor',
    group: 'A1',
    surface: 'revokeCredentialFromActor',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    positive: {
      status: 'not-applicable',
      reason:
        'no target role may reach this surface - every role is a negative',
    },
    negative: { status: 'automated' },
  },
  // ===== A2 — Assign / revoke a Feature role (user or organization) =====
  {
    id: 'A2.assignPlatformRoleToUser',
    group: 'A2',
    surface: 'assignPlatformRoleToUser',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN', 'PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list shows the target after assign',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A2.removePlatformRoleFromUser',
    group: 'A2',
    surface: 'removePlatformRoleFromUser',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN', 'PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list no longer shows the target after remove',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A2.assignPlatformRoleToOrganization',
    group: 'A2',
    surface: 'assignPlatformRoleToOrganization',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN', 'PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list shows the target after assign',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A2.removePlatformRoleFromOrganization',
    group: 'A2',
    surface: 'removePlatformRoleFromOrganization',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN', 'PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'holder list no longer shows the target after remove',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A3 — Authorization reset & license-entitlement reset =====
  {
    id: 'A3.authorizationPolicyResetOnPlatform',
    group: 'A3',
    surface: 'authorizationPolicyResetOnPlatform',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason:
        'recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules)',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.aiServerAuthorizationPolicyReset',
    group: 'A3',
    surface: 'aiServerAuthorizationPolicyReset',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason:
        'recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules)',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPolicyResetOnUser',
    group: 'A3',
    surface: 'authorizationPolicyResetOnUser',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPolicyResetOnOrganization',
    group: 'A3',
    surface: 'authorizationPolicyResetOnOrganization',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPolicyResetOnAccount',
    group: 'A3',
    surface: 'authorizationPolicyResetOnAccount',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.licenseResetOnAccount',
    group: 'A3',
    surface: 'licenseResetOnAccount',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPolicyResetAll',
    group: 'A3',
    surface: 'authorizationPolicyResetAll',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 'resets every authorization policy on the platform',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPlatformRolesAccessReset',
    group: 'A3',
    surface: 'authorizationPlatformRolesAccessReset',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason:
        'recomputes platform-wide authorization policies in place - any test reading a policy meanwhile sees it EMPTY (observed: wrong baselines, AuthorizationPolicy without credential rules)',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.authorizationPolicyResetToGlobalAdminsAccess',
    group: 'A3',
    surface: 'authorizationPolicyResetToGlobalAdminsAccess',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A3 lists platform/account/user/org/all; this one is unnamed - and "global admins" cease to exist at Slice B',
    },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A3.resetLicenseOnAccounts',
    group: 'A3',
    surface: 'resetLicenseOnAccounts',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns the reset entity / true with no error; the policy recompute has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 'recomputes licenses on every account',
    },
    negative: { status: 'automated' },
  },
  // ===== A4 — Change a user's login email =====
  {
    id: 'A4.adminUserEmailChange',
    group: 'A4',
    surface: 'adminUserEmailChange',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the user record reports the NEW email on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A4.deleteUser',
    group: 'A4',
    surface: 'deleteUser',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    positive: {
      status: 'not-automated',
      reason:
        'declaration only - the same resolver is exercised by A5.deleteUser',
      belongs: 'covered-elsewhere',
    },
    negative: {
      status: 'not-automated',
      reason:
        'declaration only - the same resolver is exercised by A5.deleteUser',
      belongs: 'covered-elsewhere',
    },
  },
  {
    id: 'A4.adminUserEmailChangeDriftResolve',
    group: 'A4',
    surface: 'adminUserEmailChangeDriftResolve',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'reached-resolver',
      oracle:
        'no drift exists to resolve, so the oracle is the resolver-level "no drift" answer - never an authorization error',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A5 — Delete a user; reset an identity/account; administer users' MCP keys =====
  {
    id: 'A5.deleteUser',
    group: 'A5',
    surface: 'deleteUser',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the disposable user returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A5.adminIdentityDeleteKratosIdentity',
    group: 'A5',
    surface: 'adminIdentityDeleteKratosIdentity',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'returns true for a disposable identity registered for this call; its login then fails',
    },
    positive: {
      status: 'automated',
      reason: 'targets a disposable identity registered for this one call',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A5.adminUserAccountDelete',
    group: 'A5',
    surface: 'adminUserAccountDelete',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'returns the target id; the user can no longer sign in; the platform profile STILL exists (the resolver removes the sign-in account only)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A5.mcpApiKeys',
    group: 'A5',
    surface: 'mcpApiKeys',
    kind: 'field',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle: 'the list contains the known fixture key of the target user',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A5.adminRevokeMcpApiKey',
    group: 'A5',
    surface: 'adminRevokeMcpApiKey',
    kind: 'mutation',
    owners: ['PLATFORM_USERS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the key is reported revoked on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A6 — Create / delete an organization =====
  {
    id: 'A6.createOrganization',
    group: 'A6',
    surface: 'createOrganization',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT', 'FEATURE_ORGANIZATION_CREATOR'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'the organization is readable by the returned id (then cleaned up)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A6.deleteOrganization',
    group: 'A6',
    surface: 'deleteOrganization',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the organization returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A7 — Edit an organization-owned pack, hub or its templates =====
  {
    id: 'A7.updateInnovationPack',
    group: 'A7',
    surface: 'updateInnovationPack',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the changed field is visible on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.updateInnovationHub',
    group: 'A7',
    surface: 'updateInnovationHub',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the changed field is visible on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.createTemplate',
    group: 'A7',
    surface: 'createTemplate',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the new template is listed in the pack templates set',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.createTemplateFromSpace',
    group: 'A7',
    surface: 'createTemplateFromSpace',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the new template is listed in the pack templates set',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.createTemplateFromContentSpace',
    group: 'A7',
    surface: 'createTemplateFromContentSpace',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the new template is listed in the pack templates set',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.updateTemplate',
    group: 'A7',
    surface: 'updateTemplate',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the changed field is visible on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.updateTemplateFromSpace',
    group: 'A7',
    surface: 'updateTemplateFromSpace',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle:
        'a marker callout added to the source space AFTER the template was cut appears in the template content space',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.deleteTemplate',
    group: 'A7',
    surface: 'deleteTemplate',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'family' },
    verifies: { kind: 'effect', oracle: 'the template is no longer listed' },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A7.updateCallout',
    group: 'A7',
    surface: 'updateCallout',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'the framing display name of a CALLOUT TEMPLATE inside the organization pack changed on re-read (the isTemplate branch)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A8 — Delete content; set callout publisher =====
  {
    id: 'A8.deleteCallout',
    group: 'A8',
    surface: 'deleteCallout',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the deleted entity returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A8.deleteContribution',
    group: 'A8',
    surface: 'deleteContribution',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the deleted entity returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A8.deleteSpace',
    group: 'A8',
    surface: 'deleteSpace',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the deleted entity returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A8.deleteInnovationPack',
    group: 'A8',
    surface: 'deleteInnovationPack',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the deleted entity returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A8.deleteInnovationHub',
    group: 'A8',
    surface: 'deleteInnovationHub',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 're-reading the deleted entity returns not-found',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A8.updateCalloutPublishInfo',
    group: 'A8',
    surface: 'updateCalloutPublishInfo',
    kind: 'mutation',
    owners: ['PLATFORM_CONTENT_FULL_ACCESS'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'publisher / published date changed on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A9 — Move resources between accounts / space levels =====
  {
    id: 'A9.moveSpaceL1ToSpaceL0',
    group: 'A9',
    surface: 'moveSpaceL1ToSpaceL0',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.moveSpaceL1ToSpaceL2',
    group: 'A9',
    surface: 'moveSpaceL1ToSpaceL2',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.moveSpaceL2ToSpaceL1',
    group: 'A9',
    surface: 'moveSpaceL2ToSpaceL1',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.convertSpaceL1ToSpaceL0',
    group: 'A9',
    surface: 'convertSpaceL1ToSpaceL0',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.convertSpaceL2ToSpaceL1',
    group: 'A9',
    surface: 'convertSpaceL2ToSpaceL1',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.convertSpaceL1ToSpaceL2',
    group: 'A9',
    surface: 'convertSpaceL1ToSpaceL2',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the space reports the new level / parent on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.convertVirtualContributorToUseKnowledgeBase',
    group: 'A9',
    surface: 'convertVirtualContributorToUseKnowledgeBase',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A9 is "move resources"; converting a VC body of knowledge is not a move and the contract A9 list omits it',
    },
    verifies: {
      kind: 'effect',
      oracle:
        'the body-of-knowledge space callout is now listed in the VC knowledge base (the VC type label does NOT change - separate product finding)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.moveContributionToCallout',
    group: 'A9',
    surface: 'moveContributionToCallout',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the contribution is listed under the target callout',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.transferCallout',
    group: 'A9',
    surface: 'transferCallout',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'the callout is listed in the target callouts set and gone from the source',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.transferInnovationHubToAccount',
    group: 'A9',
    surface: 'transferInnovationHubToAccount',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the resource reports the TARGET account on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.transferSpaceToAccount',
    group: 'A9',
    surface: 'transferSpaceToAccount',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the resource reports the TARGET account on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.transferInnovationPackToAccount',
    group: 'A9',
    surface: 'transferInnovationPackToAccount',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the resource reports the TARGET account on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A9.transferVirtualContributorToAccount',
    group: 'A9',
    surface: 'transferVirtualContributorToAccount',
    kind: 'mutation',
    owners: ['PLATFORM_RESOURCE_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the resource reports the TARGET account on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A10 — Platform settings & configuration =====
  {
    id: 'A10.updatePlatformSettings',
    group: 'A10',
    surface: 'updatePlatformSettings',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the changed setting is visible on the platform settings read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A10.addIframeAllowedURL',
    group: 'A10',
    surface: 'addIframeAllowedURL',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the entry is present in the platform settings read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A10.removeIframeAllowedURL',
    group: 'A10',
    surface: 'removeIframeAllowedURL',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the entry is absent from the platform settings read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A10.addNotificationEmailToBlacklist',
    group: 'A10',
    surface: 'addNotificationEmailToBlacklist',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the entry is present in the platform settings read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A10.removeNotificationEmailFromBlacklist',
    group: 'A10',
    surface: 'removeNotificationEmailFromBlacklist',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the entry is absent from the platform settings read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A10.setPlatformWellKnownVirtualContributor',
    group: 'A10',
    surface: 'setPlatformWellKnownVirtualContributor',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the well-known mapping reports the chosen VC (restored after)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A11 — Operational machinery =====
  {
    id: 'A11.cleanupCollections',
    group: 'A11',
    surface: 'cleanupCollections',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'reached-resolver',
      oracle:
        'vector store may be absent: a non-authorization error on the root field is accepted',
    },
    positive: {
      status: 'automated',
      reason:
        'where the vector store is absent the oracle is "reached the resolver": a non-authorization error on the root field',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.updateAssistantActorCapabilities',
    group: 'A11',
    surface: 'updateAssistantActorCapabilities',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle:
        'capabilityGrant reports the written value (snapshotted before, restored after)',
    },
    positive: {
      status: 'exclusive',
      reason:
        'overwrites the singleton Web Assistant grant - capabilityGrant is snapshotted first and restored after',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminInAppNotificationsPrune',
    group: 'A11',
    surface: 'adminInAppNotificationsPrune',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 'deletes notifications platform-wide',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminUpdateContributorAvatars',
    group: 'A11',
    surface: 'adminUpdateContributorAvatars',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminUpdateGeoLocationData',
    group: 'A11',
    surface: 'adminUpdateGeoLocationData',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 'rewrites geolocation on every profile',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminSearchIngestFromScratch',
    group: 'A11',
    surface: 'adminSearchIngestFromScratch',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 'drops and rebuilds the search index',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.migrateLegacyMemoContent',
    group: 'A11',
    surface: 'migrateLegacyMemoContent',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'exclusive', reason: 'irreversible content migration' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.migrateLegacyWhiteboardContent',
    group: 'A11',
    surface: 'migrateLegacyWhiteboardContent',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'exclusive', reason: 'irreversible content migration' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.refreshAllBodiesOfKnowledge',
    group: 'A11',
    surface: 'refreshAllBodiesOfKnowledge',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: {
      status: 'exclusive',
      reason: 're-ingests every body of knowledge',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminCommunicationEnsureAccessToCommunications',
    group: 'A11',
    surface: 'adminCommunicationEnsureAccessToCommunications',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminCommunicationRemoveOrphanedRoom',
    group: 'A11',
    surface: 'adminCommunicationRemoveOrphanedRoom',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns true - the server treats an absent room as already removed',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminCommunicationUpdateRoomState',
    group: 'A11',
    surface: 'adminCommunicationUpdateRoomState',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'reached-resolver',
      oracle:
        'needs a real Matrix room id: a not-found from the adapter on the root field is accepted',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminCommunicationMigrateOrphanedConversations',
    group: 'A11',
    surface: 'adminCommunicationMigrateOrphanedConversations',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'exclusive', reason: 'platform-wide Matrix migration' },
    negative: { status: 'automated' },
  },
  {
    id: 'A11.adminCommunicationSyncSpaceHierarchy',
    group: 'A11',
    surface: 'adminCommunicationSyncSpaceHierarchy',
    kind: 'mutation',
    owners: ['PLATFORM_OPERATIONS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'executed',
      oracle:
        'returns its success payload with no error; a maintenance job has no API-visible effect to read back',
    },
    positive: { status: 'exclusive', reason: 'platform-wide Matrix sync' },
    negative: { status: 'automated' },
  },
  // ===== A12 — License usage =====
  {
    id: 'A12.createWingbackAccount',
    group: 'A12',
    surface: 'createWingbackAccount',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: {
      basis: 'conflict',
      note: 'FR-021 requires this mutation to be DELETED, not re-gated to License Manager',
    },
    verifies: {
      kind: 'reached-resolver',
      oracle: 'Wingback disabled: "not enabled" on the root field is accepted',
    },
    positive: {
      status: 'automated',
      reason:
        'where Wingback is disabled the oracle is "reached the resolver": a non-authorization error on the root field. FR-021 says this surface must be DELETED - the row goes when the server complies',
    },
    negative: { status: 'automated' },
  },
  {
    id: 'A12.assignLicensePlanToAccount',
    group: 'A12',
    surface: 'assignLicensePlanToAccount',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the plan appears among the account / space subscriptions',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A12.assignLicensePlanToSpace',
    group: 'A12',
    surface: 'assignLicensePlanToSpace',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the plan appears among the account / space subscriptions',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A12.revokeLicensePlanFromAccount',
    group: 'A12',
    surface: 'revokeLicensePlanFromAccount',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: { kind: 'effect', oracle: 'the plan no longer appears' },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A12.revokeLicensePlanFromSpace',
    group: 'A12',
    surface: 'revokeLicensePlanFromSpace',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: { kind: 'effect', oracle: 'the plan no longer appears' },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A12.updateBaselineLicensePlanOnAccount',
    group: 'A12',
    surface: 'updateBaselineLicensePlanOnAccount',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the baseline plan value changed on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A13 — License plan definition =====
  {
    id: 'A13.createLicensePlan',
    group: 'A13',
    surface: 'createLicensePlan',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: {
      basis: 'family',
      note: 'the spec gives Settings Admin the DEFINITION of license plans; the server census (a.row.surfaces.ts, A13) lists update / delete and the three rule mutations but omits this one - found in the manual pass of 2026-09-21. Gate: CREATE on the licensing framework.',
    },
    verifies: {
      kind: 'effect',
      oracle:
        'the new plan is listed by the licensing framework read (then deleted)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A13.deleteLicensePlan',
    group: 'A13',
    surface: 'deleteLicensePlan',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the plan / rule is gone from the licensing framework read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A13.updateLicensePlan',
    group: 'A13',
    surface: 'updateLicensePlan',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: {
      basis: 'family',
      note: 'PRODUCT BUG: LicensePlanService.update() saves the plan unchanged - the mutation reports success and nothing is applied (also on develop). The positive is RED until fixed',
    },
    verifies: {
      kind: 'effect',
      oracle: 'the changed field is visible on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A13.adminLicensePolicyDeleteCredentialRule',
    group: 'A13',
    surface: 'adminLicensePolicyDeleteCredentialRule',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the plan / rule is gone from the licensing framework read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A13.adminLicensePolicyUpdateCredentialRule',
    group: 'A13',
    surface: 'adminLicensePolicyUpdateCredentialRule',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle: 'the changed field is visible on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A13.adminLicensePolicyCreateCredentialRule',
    group: 'A13',
    surface: 'adminLicensePolicyCreateCredentialRule',
    kind: 'mutation',
    owners: ['PLATFORM_SETTINGS_ADMIN'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'effect',
      oracle:
        'the new rule is present in the license policy read (then removed)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A14 — Space visibility =====
  {
    id: 'A14.updateSpacePlatformSettings',
    group: 'A14',
    surface: 'updateSpacePlatformSettings',
    kind: 'mutation',
    owners: ['PLATFORM_LICENSE_MANAGER'],
    acceptedExtra: [],
    renamedAtSliceB: 'adminUpdateSpaceVisibility',
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'the space reports the new visibility on re-read (restored after)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A15 — Support inside a flag-enabled space; manage the forum =====
  {
    id: 'A15.getAccessPrivilegesForPlatformSupport',
    group: 'A15',
    surface: 'getAccessPrivilegesForPlatformSupport',
    kind: 'field',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'on a space WITH allowPlatformSupportAsAdmin the holder has the admin privileges - and on a space WITHOUT the flag it does not (both asserted)',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A15.updateDiscussion',
    group: 'A15',
    surface: 'updateDiscussion',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the discussion title changed on re-read',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A15.deleteDiscussion',
    group: 'A15',
    surface: 'deleteDiscussion',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: [],
    requirement: { basis: 'family' },
    verifies: { kind: 'effect', oracle: 'the discussion is gone on re-read' },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A15.adminForumRemoveDiscussionCategory',
    group: 'A15',
    surface: 'adminForumRemoveDiscussionCategory',
    kind: 'mutation',
    owners: ['PLATFORM_SUPPORT'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle: 'the category is no longer among the forum discussion categories',
    },
    positive: {
      status: 'not-automated',
      reason:
        'removal is permanent and the API has no add-category mutation, so the test cannot restore what it removes',
      belongs: 'server-change',
    },
    negative: { status: 'automated' },
  },
  // ===== A16 — Read across spaces (service accounts only) =====
  {
    id: 'A16.createPlatformRolesAccess',
    group: 'A16',
    surface: 'createPlatformRolesAccess',
    kind: 'field',
    owners: ['PLATFORM_SPACES_READER'],
    acceptedExtra: ['PLATFORM_CONTENT_FULL_ACCESS'],
    requirement: {
      basis: 'conflict',
      note: 'the server DELIBERATELY grants Platform Resource Admin READ on every space (space.service.platform.roles.access.ts); the requirements allow only Spaces Reader plus the Content Full Access exception. The negative for PLATFORM_RESOURCE_ADMIN is RED until product decides',
    },
    verifies: {
      kind: 'returns-data',
      oracle:
        'reads the collaboration of a PRIVATE space it is not a member of',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A17 — Rename an entity (nameID) =====
  {
    id: 'A17.updateActorNameID',
    group: 'A17',
    surface: 'updateActorNameID',
    kind: 'mutation',
    owners: [],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    positive: {
      status: 'not-automated',
      reason: 'surface does not exist until Slice B',
      belongs: 'slice-b',
    },
    negative: {
      status: 'not-automated',
      reason: 'surface does not exist until Slice B',
      belongs: 'slice-b',
    },
  },
  {
    id: 'A17.nameID (protected section of the general content-entity update)',
    group: 'A17',
    surface: 'nameID (protected section of the general content-entity update)',
    kind: 'field',
    owners: [],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    positive: {
      status: 'not-automated',
      reason: 'surface does not exist until Slice B',
      belongs: 'slice-b',
    },
    negative: {
      status: 'not-automated',
      reason: 'surface does not exist until Slice B',
      belongs: 'slice-b',
    },
  },
  // ===== A19 — Read the platform audit trail =====
  {
    id: 'A19.audit-log-analyze',
    group: 'A19',
    surface: 'audit-log-analyze',
    kind: 'mcp-tool',
    owners: ['PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'returns the known email-change entry of the fixture user, with personal data masked',
    },
    positive: {
      status: 'automated',
      reason:
        'the MCP tool analyze_audit_log - detected automatically; a visible todo where the server runs with MCP off',
    },
    negative: {
      status: 'automated',
      reason:
        'the MCP tool analyze_audit_log - detected automatically; a visible todo where the server runs with MCP off',
    },
  },
  {
    id: 'A19.latestUserEmailChangeAuditEntry',
    group: 'A19',
    surface: 'latestUserEmailChangeAuditEntry',
    kind: 'field',
    owners: ['PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A19.userEmailChangeAuditEntries',
    group: 'A19',
    surface: 'userEmailChangeAuditEntries',
    kind: 'field',
    owners: ['PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'returns the known email-change entry of the fixture user. These two GraphQL fields return emails UNMASKED by pre-existing design; masking exists only in the MCP tool',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A20 — Read Platform-role holder lists =====
  {
    id: 'A20.usersInRole',
    group: 'A20',
    surface: 'usersInRole',
    kind: 'field',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20.usersInRoles',
    group: 'A20',
    surface: 'usersInRoles',
    kind: 'field',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20.organizationsInRole',
    group: 'A20',
    surface: 'organizationsInRole',
    kind: 'field',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'asserted EMPTY: no organization can ever hold a Platform role (holder-kind rule), so there is no known holder to find',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20.organizationsInRoles',
    group: 'A20',
    surface: 'organizationsInRoles',
    kind: 'field',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20.actorsWithCredential',
    group: 'A20',
    surface: 'actorsWithCredential',
    kind: 'query',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A20 names four holder-list fields; this credential query is not among them',
    },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20.usersWithAuthorizationCredential',
    group: 'A20',
    surface: 'usersWithAuthorizationCredential',
    kind: 'query',
    owners: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A20 names four holder-list fields; this credential query is not among them',
    },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A20b — Read Feature-role holder lists =====
  {
    id: 'A20b.usersInRole',
    group: 'A20b',
    surface: 'usersInRole',
    kind: 'field',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20b.usersInRoles',
    group: 'A20b',
    surface: 'usersInRoles',
    kind: 'field',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20b.organizationsInRole',
    group: 'A20b',
    surface: 'organizationsInRole',
    kind: 'field',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20b.organizationsInRoles',
    group: 'A20b',
    surface: 'organizationsInRoles',
    kind: 'field',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: { basis: 'named' },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20b.actorsWithCredential',
    group: 'A20b',
    surface: 'actorsWithCredential',
    kind: 'query',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A20b names four holder-list fields; this credential query is not among them',
    },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A20b.usersWithAuthorizationCredential',
    group: 'A20b',
    surface: 'usersWithAuthorizationCredential',
    kind: 'query',
    owners: [
      'PLATFORM_USERS_ADMIN',
      'PLATFORM_ROLES_ADMIN',
      'PLATFORM_AUDIT_READER',
    ],
    acceptedExtra: [],
    requirement: {
      basis: 'silent',
      note: 'spec A20b names four holder-list fields; this credential query is not among them',
    },
    verifies: {
      kind: 'returns-data',
      oracle:
        'the KNOWN single-role fixture holder is present in the result - an always-empty resolver must fail',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  // ===== A21 — Set / clear the service-profile marker =====
  {
    id: 'A21.updateUser#0',
    group: 'A21',
    surface: 'updateUser',
    kind: 'mutation',
    owners: ['PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    variant: 'set serviceProfile',
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'serviceProfile has NO output field, so the marker is observed through its only visible effect: a set marker admits a Platform Spaces Reader grant',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
  {
    id: 'A21.updateUser#1',
    group: 'A21',
    surface: 'updateUser',
    kind: 'mutation',
    owners: ['PLATFORM_ROLES_ADMIN'],
    acceptedExtra: [],
    variant: 'clear serviceProfile',
    requirement: { basis: 'named' },
    verifies: {
      kind: 'effect',
      oracle:
        'serviceProfile has NO output field: a cleared marker makes the Platform Spaces Reader grant fail with the service-account rule',
    },
    positive: { status: 'automated' },
    negative: { status: 'automated' },
  },
];

/** Roles allowed on a capability: its owners plus its declared accepted exceptions. */
export const allowedRoles = (c: Capability): readonly PlatformRole[] => [
  ...c.owners,
  ...c.acceptedExtra,
];

/** A role's view of the table: what it can and what it cannot. */
export const capabilitiesFor = (
  role: PlatformRole
): { can: Capability[]; cannot: Capability[] } => ({
  can: CAPABILITIES.filter(c => allowedRoles(c).includes(role)),
  cannot: CAPABILITIES.filter(c => !allowedRoles(c).includes(role)),
});
