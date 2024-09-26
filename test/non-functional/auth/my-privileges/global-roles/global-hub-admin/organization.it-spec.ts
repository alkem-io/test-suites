import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  sorted__create_read_update_delete_grant_authorizationReset,
  sorted__create_read_update_delete_grant,
} from '../../common';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import {
  deleteOrganization,
  getOrganizationDataCodegen,
} from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  // await assignUserAsGlobalSpacesAdmin(users.spaceAdmin.id);
});
afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
  // await removeUserAsGlobalSpacesAdmin(users.spaceAdmin.id);
});

describe('myPrivileges', () => {
  test('GlobalSpaceAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response.data?.organization.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_authorizationReset
    );
  });

  test('GlobalSpaceAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response.data?.organization.verification.authorization?.myPrivileges ??
      [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalSpaceAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response.data?.organization.profile.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalSpaceAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response.data?.organization.profile.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalSpaceAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response.data?.organization.profile.tagsets?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalSpaceAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organization.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response.data?.organization.preferences ?? [];
    // Assert
    data.map((item: any) => {
      expect(item.authorization.myPrivileges.sort()).toEqual(
        sorted__create_read_update_delete_grant
      );
    });
    expect(data).toHaveLength(1);
  });
});
