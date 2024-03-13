import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  sorted__create_read_update_delete_grant_authorizationReset,
  sorted__create_read_update_delete_grant,
} from '../../common';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import {
  deleteOrganizationCodegen,
  getOrganizationDataCodegen,
} from '@test/functional-api/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('myPrivileges', () => {
  test('GlobalAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data = response.data?.organization.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_authorizationReset
    );
  });

  test('GlobalAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.data?.organization.verification.authorization?.myPrivileges ??
      [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.data?.organization.profile.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.data?.organization.profile.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.data?.organization.profile.tagsets?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
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
