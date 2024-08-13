import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { sorted__create_read_update_delete_grant } from '../../common';
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
  //await assignUserAsGlobalCommunityAdmin(users.spaceMember.id);
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data = response.data?.organization.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.data?.organization.verification.authorization?.myPrivileges ??
      [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.data?.organization.profile.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.data?.organization.profile.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.data?.organization.profile.tagsets?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.GLOBAL_COMMUNITY_ADMIN
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
