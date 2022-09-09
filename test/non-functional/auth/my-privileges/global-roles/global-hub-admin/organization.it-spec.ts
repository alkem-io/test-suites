import {
  deleteOrganization,
  getOrganizationData,
} from '@test/functional-api/integration/organization/organization.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import {
  assignUserAsGlobalHubsAdmin,
  removeUserAsGlobalHubsAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const cgrud = ['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE'];

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await assignUserAsGlobalHubsAdmin(users.hubAdminId);
});
afterAll(async () => {
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalHubsAdmin(users.hubAdminId);
});

describe('myPrivileges', () => {
  test('GlobalHubAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data = response.body.data.organization.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([['GRANT', 'CREATE', 'READ', 'UPDATE', 'DELETE']]);
  });

  test('GlobalHubAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data =
      response.body.data.organization.verification.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  test('GlobalHubAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data =
      response.body.data.organization.profile.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalHubAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data =
      response.body.data.organization.profile.references[0].authorization
        .myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalHubAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data =
      response.body.data.organization.profile.tagsets[0].authorization
        .myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalHubAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_ADMIN
    );
    const data = response.body.data.organization;
    // Assert
    expect(data.preferences[0].authorization.myPrivileges).toEqual(cgrud);
    expect(data.preferences).toHaveLength(1);
  });
});
