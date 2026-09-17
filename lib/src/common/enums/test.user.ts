/**
 * Enum with Alkemio users used for testing different auth scenarios.
 */
export enum TestUser {
  /**
   * workspace#027-platform-role-redesign (T021, Slice B) — was `GLOBAL_ADMIN`.
   *
   * The ACCOUNT survives (`admin`); the role it holds does not. `global-admin`
   * left `AuthorizationCredential` with T077, and after that the only credential
   * `bootstrap.service.ts` knows how to (re-)grant this account is
   * `platform-roles-admin` — the break-glass role spec §Target global role model
   * §Design rules requires the platform to always retain ("restart *is* the
   * break-glass").
   *
   * Renamed rather than deleted BECAUSE of the rename's blast radius: this
   * fixture is the suite's default privileged caller at ~930 call sites, and a
   * silent value-only change would have left every one of them reading
   * "GLOBAL_ADMIN" while holding a single-purpose assignment role. It can now
   * assign roles and nothing else — a spec that needs content, settings or
   * user-record access must name the owning family's fixture instead, and will
   * fail loudly rather than passing on inherited god mode.
   */
  BOOTSTRAP_PLATFORM_ROLES_ADMIN = "admin",
  SPACE_ADMIN = "space.admin",
  SPACE_MEMBER = "space.member",
  SUBSPACE_MEMBER = "subspace.member",
  SUBSPACE_ADMIN = "subspace.admin",
  SUBSUBSPACE_MEMBER = "subsubspace.member",
  SUBSUBSPACE_ADMIN = "subsubspace.admin",
  NON_SPACE_MEMBER = "non.space",
  QA_USER = "qa.user",
  ORGANIZATION_ADMIN = "organization.admin",

  // workspace#027-platform-role-redesign (T003, T021) — one single-role fixture
  // per target platform role. Each holds EXACTLY one of the 14 (10 `Platform …`
  // + 4 `Feature …`, the fourth being FEATURE_VC_CAMPAIGN, added after the
  // original 13), which is what makes separation of duties testable at all.
  //
  // T021 (Slice B) removed the three legacy role fixtures that stood above and
  // renamed the fourth. Their successors are here: `global.license` ->
  // `PLATFORM_LICENSE_MANAGER`, `global.support` -> `PLATFORM_SUPPORT`,
  // `beta.tester` -> `FEATURE_BETA_TESTER`. Do NOT reintroduce a
  // multi-role fixture: a caller holding two roles cannot distinguish "this
  // surface is reachable by role X" from "…by role Y", which is the entire
  // premise of the FR-024 matrix.
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
