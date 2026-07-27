import {
  AuthorizationCredential,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * MIRRORED from `server`'s `ROLE_CREDENTIAL_MAP`
 * (`src/domain/access/platform-roles-access/platform.roles.access.service.ts`,
 * research D3, FR-011/SC-008) — T008's `credentialFor()` reads through this
 * map rather than a locally-maintained switch, for the same reason the
 * server-side consumers do: a second lookup is exactly how the C1
 * silent-void defect arose (`GLOBAL_SPACES_READER` naming a `RoleName` whose
 * credential key is `GlobalSpacesReader` value "GLOBAL_SPACES_READER", vs.
 * `GLOBAL_COMMUNITY_READER`'s `RoleName` resolving to the differently-named
 * `GlobalCommunityRead` credential — the KEY strings genuinely diverge for
 * two legacy roles, which is the whole point of routing every lookup
 * through one map instead of re-deriving it ad hoc).
 *
 * Only the platform role-set's `RoleName` members are mirrored (this
 * feature's matrix never calls `credentialFor` for a SPACE/ORGANIZATION
 * role) — server's full map additionally carries MEMBER/LEAD/ADMIN/
 * ASSOCIATE/OWNER, irrelevant here.
 */
export const ROLE_CREDENTIAL_MAP: Partial<Record<RoleName, AuthorizationCredential>> = {
  [RoleName.GlobalAdmin]: AuthorizationCredential.GlobalAdmin,
  [RoleName.GlobalSupport]: AuthorizationCredential.GlobalSupport,
  [RoleName.GlobalLicenseManager]: AuthorizationCredential.GlobalLicenseManager,
  [RoleName.GlobalCommunityReader]: AuthorizationCredential.GlobalCommunityRead,
  [RoleName.GlobalSpacesReader]: AuthorizationCredential.GlobalSpacesReader,
  [RoleName.GlobalPlatformManager]: AuthorizationCredential.GlobalPlatformManager,
  [RoleName.GlobalSupportManager]: AuthorizationCredential.GlobalSupportManager,
  [RoleName.PlatformOperationsAdmin]: AuthorizationCredential.PlatformOperationsAdmin,
  [RoleName.PlatformBetaTester]: AuthorizationCredential.BetaTester,
  [RoleName.PlatformAssistantAccess]: AuthorizationCredential.AssistantAccess,
  // --- 027-platform-role-redesign: target role model (identical strings, D2) ---
  [RoleName.PlatformRolesAdmin]: AuthorizationCredential.PlatformRolesAdmin,
  [RoleName.PlatformContentFullAccess]: AuthorizationCredential.PlatformContentFullAccess,
  [RoleName.PlatformResourceAdmin]: AuthorizationCredential.PlatformResourceAdmin,
  [RoleName.PlatformSettingsAdmin]: AuthorizationCredential.PlatformSettingsAdmin,
  [RoleName.PlatformUsersAdmin]: AuthorizationCredential.PlatformUsersAdmin,
  [RoleName.PlatformSupport]: AuthorizationCredential.PlatformSupport,
  [RoleName.PlatformLicenseManager]: AuthorizationCredential.PlatformLicenseManager,
  [RoleName.PlatformSpacesReader]: AuthorizationCredential.PlatformSpacesReader,
  [RoleName.PlatformAuditReader]: AuthorizationCredential.PlatformAuditReader,
  [RoleName.FeatureBetaTester]: AuthorizationCredential.FeatureBetaTester,
  [RoleName.FeatureVirtualAssistant]: AuthorizationCredential.FeatureVirtualAssistant,
  [RoleName.FeatureOrganizationCreator]: AuthorizationCredential.FeatureOrganizationCreator,
};

/**
 * The single canonical role→credential lookup (FR-011/D3) — throws rather
 * than silently returning `undefined` for an unmapped role, so a future
 * platform role added to the role-set without a matching entry here fails
 * the matrix generator loudly instead of producing a `credential: undefined`
 * that would `reachers()` never match against.
 */
export function credentialFor(role: RoleName): AuthorizationCredential {
  const credential = ROLE_CREDENTIAL_MAP[role];
  if (!credential) {
    throw new Error(
      `No ROLE_CREDENTIAL_MAP entry for RoleName "${role}" — mirror is stale (T007a) or the server's platform role-set gained a role this repo hasn't caught up to`
    );
  }
  return credential;
}
