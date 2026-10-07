/**
 * An organization's own administrators and owners may remove the organization
 * from a Space community; nobody else may, unless they already hold the
 * Space-side GRANT privilege on that role set (Space admins, platform admins).
 *
 * The matrix runs on both removal operations — the organization-specific
 * `removeRoleFromOrganization` and the generic `removeRole` — and every
 * outcome is asserted through a role-set read, not only the mutation result.
 *
 * Fixtures:
 * - Organization A (scenario organization, host of Space S): ORGANIZATION_ADMIN
 *   is ASSOCIATE+ADMIN, SUBSPACE_MEMBER is promoted to OWNER, QA_USER is a
 *   plain ASSOCIATE.
 * - Organization B: NON_SPACE_MEMBER is its ADMIN (no role in A, none in S).
 * - SPACE_ADMIN is ADMIN of S; SUBSUBSPACE_ADMIN holds no Space or
 *   organization role here and no platform role at all.
 * - A is (re)seeded as MEMBER of S, S1 and S2 before every test.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToOrganization,
  assignRoleToUser,
  removeRole,
  removeRoleFromOrganization,
  removeRoleFromUser,
} from '../roles-request.params';
import { getRoleSetMembersList } from '../roleset.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';

const NOT_AUTHORIZED = /Authorization: unable to grant/;
const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let orgAId = '';
let orgARoleSetId = '';
let orgBId = '';
let orgBRoleSetId = '';
let spaceRoleSetId = '';
let subspaceRoleSetId = '';
let subsubspaceRoleSetId = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'orgSelfRemoval',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      subspace: {
        collaboration: { addTutorialCallouts: false },
      },
    },
  },
};

const organizationsInRole = async (
  roleSetId: string,
  role: RoleName.Member | RoleName.Lead
): Promise<string[]> => {
  const res = await getRoleSetMembersList(roleSetId);
  const roleSet = res.data?.lookup.roleSet;
  const orgs =
    role === RoleName.Lead
      ? roleSet?.leadOrganizations
      : roleSet?.memberOrganizations;
  if (!orgs) {
    throw new Error(
      `Unable to read organizations in role ${role} of role set ${roleSetId}: ${JSON.stringify(res.error?.errors)}`
    );
  }
  return orgs.map(org => org.id);
};

const isOrgAMember = async (roleSetId: string) =>
  (await organizationsInRole(roleSetId, RoleName.Member)).includes(orgAId);

const isOrgALead = async (roleSetId: string) =>
  (await organizationsInRole(roleSetId, RoleName.Lead)).includes(orgAId);

const ensureOrgARole = async (
  roleSetId: string,
  role: RoleName.Member | RoleName.Lead
) => {
  if ((await organizationsInRole(roleSetId, role)).includes(orgAId)) return;
  const res = await assignRoleToOrganization(orgAId, roleSetId, role);
  if (res.error) {
    throw new Error(
      `Seeding ${role} of organization A on ${roleSetId} failed: ${JSON.stringify(res.error.errors)}`
    );
  }
};

// Parent before child: a Subspace role requires the parent Space role.
const seedMembership = async () => {
  await ensureOrgARole(spaceRoleSetId, RoleName.Member);
  await ensureOrgARole(subspaceRoleSetId, RoleName.Member);
  await ensureOrgARole(subsubspaceRoleSetId, RoleName.Member);
};

const assignUserRoleOrFail = async (
  userID: string,
  roleSetID: string,
  role: RoleName
) => {
  const res = await assignRoleToUser(userID, roleSetID, role);
  if (res.error) {
    throw new Error(
      `Assigning ${role} on ${roleSetID} failed: ${JSON.stringify(res.error.errors)}`
    );
  }
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  orgAId = baseScenario.organization.id;
  orgARoleSetId = baseScenario.organization.roleSetId;
  spaceRoleSetId = baseScenario.space.community.roleSetId;
  subspaceRoleSetId = baseScenario.subspace.community.roleSetId;
  subsubspaceRoleSetId = baseScenario.subsubspace.community.roleSetId;

  // Owner and plain associate of A.
  await assignUserRoleOrFail(
    TestUserManager.users.subspaceMember.id,
    orgARoleSetId,
    RoleName.Owner
  );
  await assignUserRoleOrFail(
    TestUserManager.users.qaUser.id,
    orgARoleSetId,
    RoleName.Associate
  );

  // Admin of a different organization B.
  const orgB = await createOrganization(
    'ha-org-b',
    `ha-org-b-${uniqueId}`.toLowerCase()
  );
  orgBId = orgB.data?.createOrganization?.id ?? '';
  orgBRoleSetId = orgB.data?.createOrganization?.roleSet.id ?? '';
  if (!orgBId || !orgBRoleSetId) {
    throw new Error(
      `Creating organization B failed: ${JSON.stringify(orgB.error?.errors)}`
    );
  }
  await assignUserRoleOrFail(
    TestUserManager.users.nonSpaceMember.id,
    orgBRoleSetId,
    RoleName.Associate
  );
  await assignUserRoleOrFail(
    TestUserManager.users.nonSpaceMember.id,
    orgBRoleSetId,
    RoleName.Admin
  );
});

afterAll(async () => {
  // Removing MEMBER on the L0 role set cascades to every Subspace.
  await removeRoleFromOrganization(orgAId, spaceRoleSetId, RoleName.Lead);
  await removeRoleFromOrganization(orgAId, spaceRoleSetId, RoleName.Member);

  await removeRoleFromUser(
    TestUserManager.users.subspaceMember.id,
    orgARoleSetId,
    RoleName.Owner
  );
  await removeRoleFromUser(
    TestUserManager.users.qaUser.id,
    orgARoleSetId,
    RoleName.Associate
  );
  await removeRoleFromUser(
    TestUserManager.users.nonSpaceMember.id,
    orgBRoleSetId,
    RoleName.Admin
  );
  await removeRoleFromUser(
    TestUserManager.users.nonSpaceMember.id,
    orgBRoleSetId,
    RoleName.Associate
  );

  await deleteOrganization(orgBId);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Organization self-removal from a Space community', () => {
  beforeEach(async () => {
    await seedMembership();
  });

  test('US3-AS3 associate-only of A is denied', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.QA_USER
    );

    // Assert
    expect(res.error?.errors[0].message).toMatch(NOT_AUTHORIZED);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);
  });

  test('US3-AS4 admin of B is denied', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.NON_SPACE_MEMBER
    );

    // Assert
    expect(res.error?.errors[0].message).toMatch(NOT_AUTHORIZED);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);
  });

  test('US3-AS5 unrelated user is denied', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    expect(res.error?.errors[0].message).toMatch(NOT_AUTHORIZED);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);
  });

  test('US3-AS1 org admin removes A from S1', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      subspaceRoleSetId,
      RoleName.Member,
      TestUser.ORGANIZATION_ADMIN
    );

    // Assert
    expect(res.error).toBeUndefined();
    expect(await isOrgAMember(subspaceRoleSetId)).toBe(false);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);
  });

  test('US3-AS2 org owner removes A from S (cascade to S2)', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.SUBSPACE_MEMBER
    );

    // Assert
    expect(res.error).toBeUndefined();
    expect(await isOrgAMember(spaceRoleSetId)).toBe(false);
    expect(await isOrgAMember(subspaceRoleSetId)).toBe(false);
    expect(await isOrgAMember(subsubspaceRoleSetId)).toBe(false);
  });

  test('US3-AS6 space admin path unchanged', async () => {
    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.SPACE_ADMIN
    );

    // Assert
    expect(res.error).toBeUndefined();
    expect(await isOrgAMember(spaceRoleSetId)).toBe(false);
  });

  test('US3-AS7 generic removeRole twin', async () => {
    // Act — admin of B through the generic operation
    const denied = await removeRole(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.NON_SPACE_MEMBER
    );

    // Assert
    expect(denied.error?.errors[0].message).toMatch(NOT_AUTHORIZED);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);

    // Act — admin of A through the generic operation
    const allowed = await removeRole(
      orgAId,
      spaceRoleSetId,
      RoleName.Member,
      TestUser.ORGANIZATION_ADMIN
    );

    // Assert
    expect(allowed.error).toBeUndefined();
    expect(await isOrgAMember(spaceRoleSetId)).toBe(false);
  });

  test("US3-AS8 org admin removes A's LEAD", async () => {
    // Arrange
    await ensureOrgARole(spaceRoleSetId, RoleName.Lead);
    expect(await isOrgALead(spaceRoleSetId)).toBe(true);

    // Act
    const res = await removeRoleFromOrganization(
      orgAId,
      spaceRoleSetId,
      RoleName.Lead,
      TestUser.ORGANIZATION_ADMIN
    );

    // Assert
    expect(res.error).toBeUndefined();
    expect(await isOrgALead(spaceRoleSetId)).toBe(false);
    expect(await isOrgAMember(spaceRoleSetId)).toBe(true);
  });
});
