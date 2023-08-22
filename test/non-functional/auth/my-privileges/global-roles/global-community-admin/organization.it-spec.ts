import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import {
  deleteOrganization,
  getOrganizationData,
} from '@test/functional-api/integration/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { sorted__create_read_update_delete_grant } from '../../common';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  //await assignUserAsGlobalCommunityAdmin(users.spaceMemberId);
});
afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data = response.body.data.organization.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.body.data.organization.verification.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.body.data.organization.profile.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.body.data.organization.profile.references[0].authorization
        .myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.body.data.organization.profile.tagsets[0].authorization
        .myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  test('GlobalCommunityAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data = response.body.data.organization.preferences;
    // Assert
    data.map((item: any) => {
      expect(item.authorization.myPrivileges.sort()).toEqual(
        sorted__create_read_update_delete_grant
      );
    });
    expect(data).toHaveLength(1);
  });
});
