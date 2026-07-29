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

/** Every single-role fixture this module seeds, spaces-reader included —
 * the set `verifyFixtureHoldings` checks after seeding (spec-ts-5/
 * qual-ts-10, 2026-07-30 fix wave). */
const ALL_TARGETS: ReadonlyArray<readonly [TestUser, RoleName]> = [
  ...SINGLE_ROLE_TARGETS,
  [TestUser.PLATFORM_SPACES_READER, RoleName.PlatformSpacesReader],
];

/**
 * Reads each fixture's OWN role holding back from the live role-set and
 * collects a problem string for anything missing. This is the guard the
 * original header comment claimed existed downstream ("the completeness
 * check downstream (server-api T017) is what actually catches a missing
 * grant") but does not: `matrix-completeness.it-spec.ts` only set-differences
 * the live role-set's role NAMES against the 13-role target model — it never
 * inspects fixture HOLDINGS, so a seeding gap surfaces as up to ~76 red
 * ALLOW cells that read as an enforcement defect in `server` rather than a
 * seeding bug here.
 */
const verifyFixtureHoldings = async (adminToken: string): Promise<string[]> => {
  const problems: string[] = [];
  for (const [testUser, role] of ALL_TARGETS) {
    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role },
      { authorization: `Bearer ${adminToken}` }
    );
    if (holders.errors?.length) {
      problems.push(
        `${testUser}: could not read ${role}'s holder list to verify seeding — ${JSON.stringify(holders.errors)}`
      );
      continue;
    }
    let fixtureId: string;
    try {
      fixtureId = await getUserIdByEmail(emailFor(testUser));
    } catch (error) {
      problems.push(
        `${testUser}: could not resolve user id to verify ${role} holding — ${error}`
      );
      continue;
    }
    const holderIds = holders.data?.platform.roleSet.usersInRole ?? [];
    if (!holderIds.some(u => u.id === fixtureId)) {
      problems.push(
        `${testUser} does not hold ${role} after seeding — a seeding gap that would otherwise surface as an enforcement defect in every matrix cell for this role`
      );
    }
  }
  return problems;
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
 * A failure for one fixture no longer aborts the REST of the loop (so one
 * bad grant does not prevent every other fixture from at least attempting
 * to seed), but every failure IS collected and, together with a holdings
 * verification pass, thrown as ONE named seeding error at the end
 * (spec-ts-5/qual-ts-10, 2026-07-30 fix wave) — this is a PRECONDITION, not
 * a test, and a silent gap here previously surfaced as up to ~76 red ALLOW
 * cells that read as a `server` enforcement defect rather than a seeding bug.
 */
export const grantSingleRoleFixtures = async (): Promise<void> => {
  const adminToken = await getUserToken(emailFor(TestUser.GLOBAL_ADMIN));
  const failures: string[] = [];

  for (const [testUser, role] of SINGLE_ROLE_TARGETS) {
    try {
      await grantRole(emailFor(testUser), role, adminToken);
    } catch (error) {
      failures.push(`${testUser} -> ${role}: ${error}`);
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

    // `updateUserServiceProfile` — a minimal `updateUser` variant selecting
    // only `id`, never the full `UserData` fragment (2026-07-30
    // live-verification finding): the ordinary `updateUser` echoes the
    // target's `settings`/`profile`/`account` sub-objects, each independently
    // privilege-gated, and PLATFORM_ROLES_ADMIN reading a THIRD PARTY's
    // private settings fails there even though the actual serviceProfile
    // WRITE (the thing this step cares about) succeeds — a collateral
    // response-shape error, not an authorization rejection of the write.
    const markerResult = await getGraphqlClient().updateUserServiceProfile(
      { userData: { ID: spacesReaderId, serviceProfile: true } },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    if (markerResult.errors?.length) {
      throw new Error(
        `setting serviceProfile failed: ${JSON.stringify(markerResult.errors)}`
      );
    }

    const grantResult = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: {
          actorID: spacesReaderId,
          role: RoleName.PlatformSpacesReader,
        },
      },
      { authorization: `Bearer ${adminToken}` }
    );
    if (grantResult.errors?.length) {
      throw new Error(
        `granting ${RoleName.PlatformSpacesReader} failed: ${JSON.stringify(grantResult.errors)}`
      );
    }
  } catch (error) {
    failures.push(
      `${TestUser.PLATFORM_SPACES_READER} -> ${RoleName.PlatformSpacesReader}: ${error}`
    );
  }

  failures.push(...(await verifyFixtureHoldings(adminToken)));

  if (failures.length > 0) {
    throw new Error(
      `grantSingleRoleFixtures: ${failures.length} fixture(s) failed to seed their target role — every ALLOW cell for the affected role(s) will misleadingly read as a server enforcement defect unless this is fixed first:\n` +
        failures.map(f => `  - ${f}`).join('\n')
    );
  }
};
