import axios from "axios";
import { testConfiguration } from "../../config/test.configuration";
import { RoleName } from "../../core/generated/alkemio-schema";
import { getGraphqlClient } from "../../utils/graphqlClient";
import { getUserToken } from "../registration/get-user-token";
import { provisionTestIdentities } from "../registration/provision-test-identities";
import { registerTestUser } from "../registration/register-test-user";

/**
 * workspace#027 — the 14 single-role users, shared by the API suite
 * (`server-api/.../platform-roles`) and the Playwright suite
 * (`client-web/.../platform-roles`). ONE implementation on purpose: a UI test
 * that only works because the API suite happened to run first is the
 * cross-suite coupling that made the earlier attempt order-dependent.
 *
 * Deliberately NOT members of the shared `TestUser` enum: every other project
 * iterates that enum at startup (registration + one login per member per
 * worker), so adding 14 there would tax suites that never use them.
 */
export const PLATFORM_ROLE_USERS = {
  PLATFORM_ROLES_ADMIN: "platform.rolesadmin",
  PLATFORM_CONTENT_FULL_ACCESS: "platform.contentfullaccess",
  PLATFORM_RESOURCE_ADMIN: "platform.resourceadmin",
  PLATFORM_SETTINGS_ADMIN: "platform.settingsadmin",
  PLATFORM_OPERATIONS_ADMIN: "platform.opsadmin",
  PLATFORM_USERS_ADMIN: "platform.usersadmin",
  PLATFORM_SUPPORT: "platform.support",
  PLATFORM_LICENSE_MANAGER: "platform.licensemanager",
  PLATFORM_SPACES_READER: "platform.spacesreader",
  PLATFORM_AUDIT_READER: "platform.auditreader",
  FEATURE_BETA_TESTER: "feature.betatester",
  FEATURE_VIRTUAL_ASSISTANT: "feature.virtualassistant",
  FEATURE_ORGANIZATION_CREATOR: "feature.orgcreator",
  FEATURE_VC_CAMPAIGN: "feature.vccampaign",
} as const;

export type PlatformRoleName = keyof typeof PLATFORM_ROLE_USERS;

export const PLATFORM_ROLE_NAMES = Object.keys(
  PLATFORM_ROLE_USERS,
) as PlatformRoleName[];

export const platformRoleEmail = (role: PlatformRoleName): string =>
  `${PLATFORM_ROLE_USERS[role]}@alkem.io`;

/**
 * The bootstrap account. The ONLY thing the platform-roles suites rely on it
 * for is holding Platform Roles Admin — the break-glass role the server
 * re-seeds on every start, and the one capability this account keeps at Slice B.
 */
export const BOOTSTRAP_ROLES_ADMIN_EMAIL = "admin@alkem.io";

/** Roles whose grant needs the target to carry the service-profile marker first. */
export const NEEDS_SERVICE_PROFILE: ReadonlySet<PlatformRoleName> = new Set([
  "PLATFORM_SPACES_READER",
]);

export type SeededPlatformRoleUsers = {
  tokens: Record<PlatformRoleName, string>;
  userIds: Record<PlatformRoleName, string>;
  bootstrapToken: string;
};

const WHO_AM_I = "query { me { user { id } } platform { roleSet { myRoles } } }";

const whoAmI = async (
  token: string,
): Promise<{ id: string; roles: string[] }> => {
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
      `platform-role users: could not read the signed-in user: ${JSON.stringify(response.data?.errors ?? response.data).slice(0, 300)}`,
    );
  }
  return { id: data.me.user.id, roles: data.platform.roleSet.myRoles };
};

/** `PLATFORM_ROLES_ADMIN` → `PlatformRolesAdmin` (the generated enum's key). */
const roleNameOf = (role: PlatformRoleName): RoleName =>
  RoleName[
    role
      .toLowerCase()
      .split("_")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("") as keyof typeof RoleName
  ];

/**
 * Makes every one of the 14 users hold EXACTLY its one role, granting through
 * the platform's own assignment mutation as the break-glass Roles Admin, and
 * refuses to continue if any of them holds anything else — every "this role is
 * refused" assertion, API or UI, rests on that.
 *
 * Idempotent and cheap once seeded: 15 sign-ins and 15 reads, no writes.
 */
export const seedPlatformRoleUsers =
  async (): Promise<SeededPlatformRoleUsers> => {
    const sdk = getGraphqlClient();

    // Same two paths as the root setup: the Kratos ADMIN API where it is
    // reachable (CI), self-service registration otherwise. The root setup
    // provisions only the shared `TestUser` enum, so these 14 are ours to do.
    if (testConfiguration.endPoints.kratos.admin) {
      await provisionTestIdentities(Object.values(PLATFORM_ROLE_USERS));
    } else if (testConfiguration.registerUsers) {
      for (const userName of Object.values(PLATFORM_ROLE_USERS)) {
        await registerTestUser(userName);
      }
    }

    const bootstrapToken = await getUserToken(BOOTSTRAP_ROLES_ADMIN_EMAIL);
    const bootstrap = { authorization: `Bearer ${bootstrapToken}` };
    if (!(await whoAmI(bootstrapToken)).roles.includes("PLATFORM_ROLES_ADMIN")) {
      throw new Error(
        `${BOOTSTRAP_ROLES_ADMIN_EMAIL} does not hold PLATFORM_ROLES_ADMIN — is the server under test running workspace#027 with its migrations applied?`,
      );
    }

    const tokens = {} as Record<PlatformRoleName, string>;
    const userIds = {} as Record<PlatformRoleName, string>;
    const contaminated: string[] = [];

    for (const role of PLATFORM_ROLE_NAMES) {
      tokens[role] = await getUserToken(platformRoleEmail(role));
      let me = await whoAmI(tokens[role]);
      userIds[role] = me.id;

      if (!me.roles.includes(role)) {
        if (NEEDS_SERVICE_PROFILE.has(role)) {
          await sdk.updateUserServiceProfile(
            { userData: { ID: me.id, serviceProfile: true } },
            bootstrap,
          );
        }
        await sdk.PlatformRolesAssignRoleToUser(
          { roleData: { actorID: me.id, role: roleNameOf(role) } },
          bootstrap,
        );
        // The token carries no roles; the server resolves them per request.
        me = await whoAmI(tokens[role]);
        console.log(
          `[platform-role users] granted ${role} to ${platformRoleEmail(role)}`,
        );
      }

      const extra = me.roles.filter((r) => r !== role && r !== "REGISTERED");
      if (!me.roles.includes(role) || extra.length > 0) {
        contaminated.push(
          `${platformRoleEmail(role)} holds [${me.roles.join(", ")}]`,
        );
      }
    }

    if (contaminated.length > 0) {
      throw new Error(
        "platform-role users: every test user must hold EXACTLY its one role — every negative in these suites depends on it.\n  " +
          contaminated.join("\n  "),
      );
    }

    return { tokens, userIds, bootstrapToken };
  };
