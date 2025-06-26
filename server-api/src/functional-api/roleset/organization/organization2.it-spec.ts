import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { assignRoleToOrganization, getRoleName } from '../roles-request.params';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const spaceRoles = ['lead', 'member'];
const availableRoles = ['member', 'lead'];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-activity',
  space: {
    subspace: {
      subspace: {},
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Member
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Member
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subsubspace.community.roleSetId,
    RoleName.Member
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.space.community.roleSetId,
    RoleName.Lead
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subsubspace.community.roleSetId,
    RoleName.Lead
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Organization role', () => {
  test('Organization role - assignment to 1 Organization, Space, Subspace, Subsubspace', async () => {
    // Act
    const res = await getRoleName(baseScenario.organization.id);
    const spacesData = res?.data?.rolesOrganization.spaces ?? [];

    // Assert
    expect(spacesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: baseScenario.space.nameId,
          roles: expect.arrayContaining(spaceRoles),
        }),
      ])
    );

    expect(spacesData[0].subspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: baseScenario.subspace.nameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    // expect(spacesData[0].subspaces).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       nameID: entitiesId.subsubspace.nameId,
    //       roles: expect.arrayContaining(availableRoles),
    //     }),
    //   ])
    // );
  });
});
