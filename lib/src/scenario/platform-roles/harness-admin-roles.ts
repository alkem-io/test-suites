import { RoleName } from "../../core/generated/alkemio-schema";
import { getGraphqlClient } from "../../utils/graphqlClient";
import { testConfiguration } from "../../config/test.configuration";
import { LogManager } from "../LogManager";
import { getUserToken } from "../registration/get-user-token";
import { provisionTestIdentities } from "../registration/provision-test-identities";
import { registerTestUser } from "../registration/register-test-user";
import {
  BOOTSTRAP_ROLES_ADMIN_EMAIL,
  PLATFORM_ROLE_USERS,
  platformRoleEmail,
} from "./platform-role-users";
import axios from "axios";

/**
 * workspace#027 Slice B — the harness's default privileged caller.
 *
 * `admin@alkem.io` (`TestUser.GLOBAL_ADMIN`, the default actor of ~900 call
 * sites) is bootstrapped at Slice B with Platform Roles Admin, Operations Admin,
 * Users Admin and Settings Admin ONLY: no content CRUD, no organization
 * creation, no visibility changes, no conversions, no forum management. Every
 * scenario builder would fail before its first assertion.
 *
 * This grants it the remaining administrative families the way production
 * operators get theirs (runbook §2c): a SECOND Platform Roles Admin does it,
 * because self-assignment is blocked by the rule engine. The only exclusion
 * rule is Audit Reader, which is deliberately NOT granted — the audit trail
 * stays readable by its own single-role fixture alone.
 *
 * No-op whenever the account already reaches content (Slice A's `global-admin`
 * cascade, or a previous run), so the Slice A baseline is untouched.
 */
const HARNESS_ADMIN_ROLES: readonly RoleName[] = [
  RoleName.PlatformContentFullAccess,
  RoleName.PlatformSupport,
  RoleName.PlatformResourceAdmin,
  RoleName.PlatformLicenseManager,
];

const WHO_AM_I =
  "query { me { user { id } } platform { roleSet { myRoles } authorization { myPrivileges } } }";

const whoAmI = async (
  token: string,
): Promise<{ id: string; roles: string[]; platformPrivileges: string[] }> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query: WHO_AM_I },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      validateStatus: () => true,
    },
  );
  const data = response.data?.data;
  if (!data?.me?.user?.id) {
    throw new Error(
      `harness admin roles: could not read the signed-in user: ${JSON.stringify(response.data?.errors ?? response.data).slice(0, 300)}`,
    );
  }
  return {
    id: data.me.user.id,
    roles: data.platform.roleSet.myRoles,
    platformPrivileges: data.platform.authorization?.myPrivileges ?? [],
  };
};

export const ensureHarnessAdminRoles = async (): Promise<void> => {
  const logger = LogManager.getLogger();
  const adminToken = await getUserToken(BOOTSTRAP_ROLES_ADMIN_EMAIL);
  const admin = await whoAmI(adminToken);

  const missing = HARNESS_ADMIN_ROLES.filter(r => !admin.roles.includes(r));
  if (missing.length === 0) return;

  // Slice A: the account reaches content through the legacy `global-admin`
  // cascade without holding the Content Full Access ROLE — leave it exactly as
  // bootstrapped, so the Slice A baseline is untouched.
  if (
    admin.platformPrivileges.includes("PLATFORM_CONTENT_FULL_ACCESS") &&
    !admin.roles.includes(RoleName.PlatformContentFullAccess)
  ) {
    return;
  }
  if (!admin.roles.includes("PLATFORM_ROLES_ADMIN")) {
    throw new Error(
      `${BOOTSTRAP_ROLES_ADMIN_EMAIL} holds neither content access nor PLATFORM_ROLES_ADMIN — is the server under test bootstrapped with workspace#027?`,
    );
  }

  // The second Roles Admin: the suite's own single-role fixture.
  const secondAdminName = PLATFORM_ROLE_USERS.PLATFORM_ROLES_ADMIN;
  if (testConfiguration.endPoints.kratos.admin) {
    await provisionTestIdentities([secondAdminName]);
  } else if (testConfiguration.registerUsers) {
    await registerTestUser(secondAdminName);
  }
  const secondToken = await getUserToken(
    platformRoleEmail("PLATFORM_ROLES_ADMIN"),
  );
  const second = await whoAmI(secondToken);
  const sdk = getGraphqlClient();
  if (!second.roles.includes("PLATFORM_ROLES_ADMIN")) {
    await sdk.PlatformRolesAssignRoleToUser(
      { roleData: { actorID: second.id, role: RoleName.PlatformRolesAdmin } },
      { authorization: `Bearer ${adminToken}` },
    );
  }
  for (const role of missing) {
    await sdk.PlatformRolesAssignRoleToUser(
      { roleData: { actorID: admin.id, role } },
      { authorization: `Bearer ${secondToken}` },
    );
    logger.info?.(
      `[harness-admin-roles] granted ${role} to ${BOOTSTRAP_ROLES_ADMIN_EMAIL}`,
    );
  }
  const after = await whoAmI(adminToken);
  const still = HARNESS_ADMIN_ROLES.filter(r => !after.roles.includes(r));
  if (still.length > 0) {
    throw new Error(
      `harness admin roles: ${BOOTSTRAP_ROLES_ADMIN_EMAIL} still lacks ${still.join(", ")} after the grant`,
    );
  }
};
