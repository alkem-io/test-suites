/**
 * Enum with Alkemio users used for testing different auth scenarios.
 */
export enum TestUser {
  GLOBAL_ADMIN = "admin",
  GLOBAL_LICENSE_ADMIN = "global.license",
  GLOBAL_SUPPORT_ADMIN = "global.support",
  SPACE_ADMIN = "space.admin",
  SPACE_MEMBER = "space.member",
  SUBSPACE_MEMBER = "subspace.member",
  SUBSPACE_ADMIN = "subspace.admin",
  SUBSUBSPACE_MEMBER = "subsubspace.member",
  SUBSUBSPACE_ADMIN = "subsubspace.admin",
  NON_SPACE_MEMBER = "non.space",
  QA_USER = "qa.user",
  GLOBAL_BETA_TESTER = "beta.tester",
  ORGANIZATION_ADMIN = "organization.admin",

  // workspace#027-platform-role-redesign (Slice A, T003) — one single-role
  // fixture per target platform role. Each holds EXACTLY one of the 14 new
  // roles (10 `Platform …` + 4 `Feature …`, the fourth being
  // FEATURE_VC_CAMPAIGN, added after the original 13), which is what makes
  // separation of duties testable at all. The 13 pre-existing users above are
  // retained until Slice B (T021 removes the 4 legacy global-role ones), so
  // at Slice A this enum carries 13 + 14 = 27 members.
  PLATFORM_ROLES_ADMIN = "platform.rolesadmin",
  PLATFORM_USERS_ADMIN = "platform.usersadmin",
  PLATFORM_OPERATIONS_ADMIN = "platform.opsadmin",
  PLATFORM_SUPPORT = "platform.support",
  PLATFORM_LICENSE_MANAGER = "platform.licensemanager",
  PLATFORM_SETTINGS_ADMIN = "platform.settingsadmin",
  PLATFORM_RESOURCE_ADMIN = "platform.resourceadmin",
  PLATFORM_SPACES_READER = "platform.spacesreader",
  PLATFORM_AUDIT_READER = "platform.auditreader",
  PLATFORM_CONTENT_FULL_ACCESS = "platform.contentfullaccess",
  FEATURE_BETA_TESTER = "feature.betatester",
  FEATURE_ORGANIZATION_CREATOR = "feature.orgcreator",
  FEATURE_VC_CAMPAIGN = "feature.vccampaign",
  FEATURE_VIRTUAL_ASSISTANT = "feature.virtualassistant",
}
