import { TestUser } from '../../common/enums/test.user';
import { RoleName } from '../../core/generated/alkemio-schema';
import { getGraphqlClient } from '../../utils/graphqlClient';
import { getUserToken } from './get-user-token';

/**
 * workspace#027-platform-role-redesign (Slice A, T004).
 *
 * One target role per Slice-A single-role fixture (T003) — each fixture
 * holds EXACTLY this role and no other. `PLATFORM_SPACES_READER` is
 * deliberately excluded from this table: it has a prerequisite
 * (`serviceProfile`) the others do not, so it is granted as a distinct,
 * later step in `grantSingleRoleFixtures` rather than folded into this loop.
 */
const SINGLE_ROLE_TARGETS: ReadonlyArray<readonly [TestUser, RoleName]> = [
  // Listed first deliberately: every other grant below (including
  // PLATFORM_SPACES_READER's) is made by the legacy GLOBAL_ADMIN fixture,
  // which still reaches PLATFORM_ROLES_ASSIGN via the Slice A root cascade —
  // but PLATFORM_SPACES_READER's serviceProfile prerequisite can only be set
  // by a user who already holds PLATFORM_ROLES_ADMIN (A21/SET_SERVICE_PROFILE,
  // server T052), so that fixture must exist and be granted first.
  [TestUser.PLATFORM_ROLES_ADMIN, RoleName.PlatformRolesAdmin],
  [TestUser.PLATFORM_USERS_ADMIN, RoleName.PlatformUsersAdmin],
  [TestUser.PLATFORM_OPERATIONS_ADMIN, RoleName.PlatformOperationsAdmin],
  [TestUser.PLATFORM_SUPPORT, RoleName.PlatformSupport],
  [TestUser.PLATFORM_LICENSE_MANAGER, RoleName.PlatformLicenseManager],
  [TestUser.PLATFORM_SETTINGS_ADMIN, RoleName.PlatformSettingsAdmin],
  [TestUser.PLATFORM_RESOURCE_ADMIN, RoleName.PlatformResourceAdmin],
  [TestUser.PLATFORM_AUDIT_READER, RoleName.PlatformAuditReader],
  [TestUser.PLATFORM_CONTENT_FULL_ACCESS, RoleName.PlatformContentFullAccess],
  [TestUser.FEATURE_BETA_TESTER, RoleName.FeatureBetaTester],
  [TestUser.FEATURE_ORGANIZATION_CREATOR, RoleName.FeatureOrganizationCreator],
  [TestUser.FEATURE_VIRTUAL_ASSISTANT, RoleName.FeatureVirtualAssistant],
];

const emailFor = (userName: string): string => `${userName}@alkem.io`;

const getUserIdByEmail = async (email: string): Promise<string> => {
  const token = await getUserToken(email);
  const result = await getGraphqlClient().getMyUserInfo(
    {},
    { authorization: `Bearer ${token}` }
  );
  const id = result.data?.me?.user?.id;
  if (!id) {
    throw new Error(`Unable to resolve Alkemio user ID for '${email}'`);
  }
  return id;
};

const grantRole = async (
  targetEmail: string,
  role: RoleName,
  grantorToken: string
): Promise<void> => {
  const actorID = await getUserIdByEmail(targetEmail);
  await getGraphqlClient().assignPlatformRoleToUser(
    { roleData: { actorID, role } },
    { authorization: `Bearer ${grantorToken}` }
  );
};

/**
 * Grants each Slice-A single-role fixture its one target role through the
 * platform's own assignment surface (`assignPlatformRoleToUser`) — not a
 * direct credential insert, so seeding exercises the real path (T004).
 *
 * Runs after every test user has already been registered + verified in
 * Kratos (`registerAllTestUsers`): role assignment is an Alkemio-side call
 * with no Kratos rate-limit concern, so it does not need to be interleaved
 * with that (sequential, rate-limit-sensitive) loop.
 *
 * A failure for one fixture is logged and does not abort the rest — mirrors
 * `registerTestUser`'s tolerance, so one bad grant doesn't take the whole
 * suite's fixture set down; the completeness check downstream (server-api
 * T017) is what actually catches a missing grant.
 */
export const grantSingleRoleFixtures = async (): Promise<void> => {
  const adminToken = await getUserToken(emailFor(TestUser.GLOBAL_ADMIN));

  for (const [testUser, role] of SINGLE_ROLE_TARGETS) {
    try {
      await grantRole(emailFor(testUser), role, adminToken);
      console.error(`[role-grant] ${testUser} -> ${role}`);
    } catch (error) {
      console.error(`[role-grant] ${testUser} -> ${role} failed: ${error}`);
    }
  }

  // platform-spaces-reader: evaluateOrFail() rule 3 (server T030) rejects the
  // grant unless the target already carries `user.serviceProfile === true`,
  // and setting that marker is itself gated on SET_SERVICE_PROFILE
  // (A21, server T052) — held by PLATFORM_ROLES_ADMIN alone, never by legacy
  // GLOBAL_ADMIN's root cascade (this is brand-new functionality with no
  // legacy path to union with, so there is nothing for the Slice A
  // {owning role} ∪ legacy rule to widen here). So this step MUST run as the
  // PLATFORM_ROLES_ADMIN fixture granted above, and MUST run before the grant
  // below — asserted here in the helper rather than left to call-site
  // discipline, per T004.
  try {
    const rolesAdminToken = await getUserToken(
      emailFor(TestUser.PLATFORM_ROLES_ADMIN)
    );
    const spacesReaderEmail = emailFor(TestUser.PLATFORM_SPACES_READER);
    const spacesReaderId = await getUserIdByEmail(spacesReaderEmail);

    await getGraphqlClient().updateUser(
      { userData: { ID: spacesReaderId, serviceProfile: true } },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: {
          actorID: spacesReaderId,
          role: RoleName.PlatformSpacesReader,
        },
      },
      { authorization: `Bearer ${adminToken}` }
    );
    console.error(
      `[role-grant] ${TestUser.PLATFORM_SPACES_READER} -> ${RoleName.PlatformSpacesReader} (serviceProfile set first)`
    );
  } catch (error) {
    console.error(
      `[role-grant] ${TestUser.PLATFORM_SPACES_READER} -> ${RoleName.PlatformSpacesReader} failed: ${error}`
    );
  }
};
