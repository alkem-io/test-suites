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
}
