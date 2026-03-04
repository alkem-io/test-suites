import { createSubspace } from '../subspace/subspace.request.params';
import { deleteSpace } from '../space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  assignRoleToUserExtendedData,
  removeRoleFromUserExtendedData,
} from '../../roleset/roles-request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

const credentialsType = 'SPACE_ADMIN';
const subsubspaceName = `op-dname${uniqueId}`;
const subsubspaceNameId = `op-nameid${uniqueId}`;
let subsubspaceId = '';
let subsubspaceRoleSetId = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'subsubspace-authorization',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {},
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

beforeEach(async () => {
  const responseCreateSubsubspaceOnSubspace = await createSubspace(
    subsubspaceName,
    subsubspaceNameId,
    baseScenario.subspace.id
  );

  const oppData = responseCreateSubsubspaceOnSubspace?.data?.createSubspace;

  subsubspaceId = oppData?.id ?? '';
  subsubspaceRoleSetId = oppData?.community?.roleSet.id ?? '';
});

afterEach(async () => {
  await deleteSpace(subsubspaceId);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Subsubspace Admin', () => {
  test('should create subsubspace admin', async () => {
    // Act
    const res = await assignRoleToUserExtendedData(
      TestUserManager.users.subspaceMember.id,
      subsubspaceRoleSetId,
      RoleName.Admin
    );

    // Assert
    expect(res?.data?.assignRoleToUser?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: subsubspaceId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should add same user as admin of 2 opportunities', async () => {
    // Arrange
    const responseOppTwo = await createSubspace(
      `oppdname-${uniqueId}`,
      `oppnameid-${uniqueId}`,
      baseScenario.subspace.id
    );
    const oppDataTwo = responseOppTwo?.data?.createSubspace;
    const subsubspaceIdTwo = oppDataTwo?.id ?? '';
    const subsubspaceRoleSetId2 = oppDataTwo?.community?.roleSet.id ?? '';

    // Act
    const resOne = await assignRoleToUserExtendedData(
      TestUserManager.users.subspaceMember.id,
      subsubspaceRoleSetId,
      RoleName.Admin
    );

    const resTwo = await assignRoleToUserExtendedData(
      TestUserManager.users.subsubspaceMember.id,
      subsubspaceRoleSetId2,
      RoleName.Admin
    );

    // Assert
    expect(resOne?.data?.assignRoleToUser?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: subsubspaceId,
          type: credentialsType,
        }),
      ])
    );
    expect(resTwo?.data?.assignRoleToUser?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: subsubspaceIdTwo,
          type: credentialsType,
        }),
      ])
    );
    await deleteSpace(subsubspaceIdTwo);
  });

  test('should be able one subsubspace admin to remove another admin from subsubspace', async () => {
    // Arrange
    await assignRoleToUserExtendedData(
      TestUserManager.users.subspaceMember.id,
      subsubspaceRoleSetId,
      RoleName.Admin
    );

    await assignRoleToUserExtendedData(
      TestUserManager.users.subsubspaceMember.email,
      subsubspaceRoleSetId,
      RoleName.Admin
    );

    const res = await removeRoleFromUserExtendedData(
      TestUserManager.users.subsubspaceMember.email,
      subsubspaceRoleSetId,
      RoleName.Admin,
      TestUser.SUBSPACE_MEMBER
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.credentials).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: subsubspaceId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should remove the only admin of an subsubspace', async () => {
    // Arrange
    await assignRoleToUserExtendedData(
      TestUserManager.users.subspaceMember.id,
      subsubspaceRoleSetId,
      RoleName.Admin
    );

    // Act
    const res = await removeRoleFromUserExtendedData(
      TestUserManager.users.subspaceMember.id,
      subsubspaceRoleSetId,
      RoleName.Admin,
      TestUser.SUBSPACE_MEMBER
    );

    // Assert
    expect(res?.data?.removeRoleFromUser?.credentials).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: subsubspaceId,
          type: credentialsType,
        }),
      ])
    );
  });
});
