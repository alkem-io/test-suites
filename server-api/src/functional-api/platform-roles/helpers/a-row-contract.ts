import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * workspace#027-platform-role-redesign — THE per-role privilege contract, in
 * one place, hand-transcribed.
 *
 * Deliberately NOT derived from a server constant, and deliberately not
 * imported from the server's `privilege.grants.ts`: a contract test that
 * imports its own expectation asserts only that the code equals itself. This
 * is an independent restatement, and it is the thing that fails when the
 * server's grants change.
 *
 * Every row below was MEASURED LIVE on 2026-08-05 by granting the role to a
 * zero-role subject (`admin.test@alkem.io`) and diffing BOTH policies against
 * that subject's own pre-grant baseline. The numbers are observations, not a
 * reading of the source.
 *
 * Measured ordinary-registered-user baseline:
 *   platform = ['ACCESS_INTERACTIVE_GUIDANCE', 'READ_USERS']
 *   roleSet  = []
 *   myRoles  = ['REGISTERED']
 *
 * TWO DOUBLINGS, both correct — do not "fix" them:
 *
 *  * `PLATFORM_FORUM_MANAGE` (Platform Support) is the single A-row credential
 *    rule with `cascade: true`.
 *  * `PlatformContentFullAccess`'s five privileges come from the ROOT cascade.
 *
 *  The platform role-set policy is applied with `platform.authorization` as
 *  its PARENT, so any cascading platform rule also surfaces on policy B. That
 *  is inheritance, not a duplicated rule.
 *
 * NO `PlatformSpacesReader` ROW EXISTS HERE, ON PURPOSE. The handover states
 * no privilege values for A13 ("not grantable to a human — see D2"). Inventing
 * an empty row would fabricate an expectation that would then be asserted
 * against the real `TestUser.PLATFORM_SPACES_READER` fixture, and a fabricated
 * green is worse than a declared gap.
 */

/**
 * Privileges ADDED over the ordinary-registered-user baseline, per role, per
 * policy. Empty arrays are measurements too: A10 is anchored on the ACCOUNT /
 * CALLOUTS-SET / SPACE policies and A11 on the ACCOUNT policy, while A12 holds
 * no authorization-policy privilege at all (its capability is a licensing
 * entitlement) — so all three correctly add nothing at platform level.
 */
export const A_ROW_DELTA: Partial<
  Record<RoleName, { platform: readonly string[]; roleSet: readonly string[] }>
> = {
  // A1 — assignment powers live on the ROLE SET; the only platform-entity
  // privilege is the service-account marker (FR-020).
  [RoleName.PlatformRolesAdmin]: {
    platform: ['SET_SERVICE_PROFILE'],
    roleSet: [
      'FEATURE_ROLE_ASSIGN',
      'GRANT_GLOBAL_ADMINS',
      'PLATFORM_ROLE_HOLDERS_READ',
    ],
  },
  // A2 — the Feature family only, in both directions (FR-003, one-way).
  [RoleName.PlatformUsersAdmin]: {
    platform: ['PLATFORM_USERS_ADMIN'],
    roleSet: ['FEATURE_ROLE_ASSIGN', 'FEATURE_ROLE_HOLDERS_READ'],
  },
  // A3 — the only doubling that comes from a cascading A-row rule.
  [RoleName.PlatformSupport]: {
    platform: ['CREATE_ORGANIZATION', 'PLATFORM_FORUM_MANAGE'],
    roleSet: ['PLATFORM_FORUM_MANAGE'],
  },
  // A4
  [RoleName.PlatformSettingsAdmin]: {
    platform: ['PLATFORM_SETTINGS_ADMIN'],
    roleSet: [],
  },
  // A5
  [RoleName.PlatformOperationsAdmin]: {
    platform: ['AUTHORIZATION_RESET', 'PLATFORM_OPERATIONS_ADMIN'],
    roleSet: [],
  },
  // A6 — the five CRUD privileges arrive by ROOT cascade, which is why they
  // appear on both policies. FR-004/SC-004's single named exception.
  [RoleName.PlatformContentFullAccess]: {
    platform: [
      'CREATE',
      'DELETE',
      'PLATFORM_CONTENT_FULL_ACCESS',
      'READ',
      'UPDATE',
    ],
    roleSet: [
      'CREATE',
      'DELETE',
      'PLATFORM_CONTENT_FULL_ACCESS',
      'READ',
      'UPDATE',
    ],
  },
  // A7 — reads the trail, and the holder lists needed to interpret it, but
  // cannot assign (FR-028 separation of duties).
  [RoleName.PlatformAuditReader]: {
    platform: ['PLATFORM_AUDIT_READ'],
    roleSet: ['PLATFORM_ROLE_HOLDERS_READ'],
  },
  // A8
  [RoleName.FeatureVirtualAssistant]: {
    platform: ['ACCESS_VIRTUAL_ASSISTANT'],
    roleSet: [],
  },
  // A9
  [RoleName.FeatureOrganizationCreator]: {
    platform: ['CREATE_ORGANIZATION'],
    roleSet: [],
  },
  // A10 — anchored away from the platform: TRANSFER_RESOURCE_OFFER /
  // TRANSFER_RESOURCE_ACCEPT on the ACCOUNT (and callouts-set) policies, and
  // MOVE_CONTRIBUTION on the SPACE policy — all three owned by
  // `platform-resource-admin` (server `privilege.grants.ts`). Nothing at
  // platform level, measured.
  [RoleName.PlatformResourceAdmin]: { platform: [], roleSet: [] },
  // A11 — anchored on the ACCOUNT policy: ACCOUNT_LICENSE_MANAGE.
  [RoleName.PlatformLicenseManager]: { platform: [], roleSet: [] },
  // A12 — no authorization-policy privilege AT ALL, on any tree. Its
  // capability is the ACCOUNT_LICENSE_PLUS licensing entitlement that
  // assignPlatformRoleToUser grants on the holder's account (server T040a) —
  // "the one target role whose capability lives in a manual entitlement grant
  // rather than an authorization policy". Do NOT re-attribute
  // MOVE_CONTRIBUTION here: that belongs to A10 above.
  [RoleName.FeatureBetaTester]: { platform: [], roleSet: [] },
};

/**
 * EXACT-set semantics — the grant/revoke delta spec's view. The returned
 * arrays are the COMPLETE set of privileges the grant may add on each policy;
 * anything else appearing is over-grant.
 */
export const expectedDeltaFor = (role: RoleName) => A_ROW_DELTA[role];

/**
 * MEMBERSHIP semantics — the steady-state contract spec's view. These
 * privileges MUST be present on `policy` for a holder of `role`; the read also
 * carries the baseline privileges every authenticated user has, so this view
 * can never be used as an exact set.
 *
 * Two named views rather than one constant, on purpose: the two consumers
 * assert genuinely different things, and a single ambiguous export is how one
 * of them ends up silently asserting the weaker one.
 */
export const mustContainOn = (
  role: RoleName,
  policy: 'platform' | 'roleSet'
): readonly string[] => A_ROW_DELTA[role]?.[policy] ?? [];

/**
 * The twelve roles a human can be granted. `PlatformSpacesReader` is absent by
 * construction — it is the keys of {@link A_ROW_DELTA}, not a second list that
 * could drift out of step with it.
 */
export const GRANTABLE_TO_HUMAN: readonly RoleName[] = Object.keys(
  A_ROW_DELTA
) as RoleName[];

/**
 * DOCUMENTATION ONLY. Specs must MEASURE the baseline live (read the subject
 * before the grant) and never hardcode it: the baseline is whatever the
 * platform grants every authenticated user, it is not this feature's to pin,
 * and pinning it here would turn an unrelated platform change into a
 * platform-roles failure.
 */
export const ORDINARY_USER_BASELINE = {
  platform: ['ACCESS_INTERACTIVE_GUIDANCE', 'READ_USERS'],
  roleSet: [],
} as const;
