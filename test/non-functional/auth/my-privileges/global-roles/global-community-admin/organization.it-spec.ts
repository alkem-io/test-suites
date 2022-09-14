import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
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
  assignUserAsGlobalCommunityAdmin,
  removeUserAsGlobalCommunityAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const cgrud = ['GRANT', 'CREATE', 'READ', 'UPDATE', 'DELETE'];

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await assignUserAsGlobalCommunityAdmin(users.hubMemberId);
});
afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalCommunityAdmin(users.hubMemberId);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data = response.body.data.organization.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalCommunityAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data =
      response.body.data.organization.verification.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data =
      response.body.data.organization.profile.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data =
      response.body.data.organization.profile.references[0].authorization
        .myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalCommunityAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data =
      response.body.data.organization.profile.tagsets[0].authorization
        .myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalCommunityAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.HUB_MEMBER
    );
    const data = response.body.data.organization;
    // Assert
    expect(data.preferences[0].authorization.myPrivileges).toEqual(cgrud);
    expect(data.preferences).toHaveLength(1);
  });
});
