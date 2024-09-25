import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { readPrivilege } from '../../common';
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
});
afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('RegisteredUser privileges to Organization', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data = response.data?.organization.authorization?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual(readPrivilege);
  });

  test('RegisteredUser privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.organization.verification?.authorization?.myPrivileges ??
      [];

    // Assert
    expect(data).toEqual([]);
  });

  test('RegisteredUser privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.organization.profile.authorization?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual(readPrivilege);
  });

  test('RegisteredUser privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.organization.profile.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual(readPrivilege);
  });

  test('RegisteredUser privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.organization.profile.tagsets?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual(readPrivilege);
  });
  test('RegisteredUser privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationDataCodegen(
      entitiesId.organization.id,
      TestUser.NON_HUB_MEMBER
    );
    const data = response.data?.organization.preferences ?? [];
    // Assert
    data.map((item: any) => {
      expect(item.authorization.myPrivileges).toEqual(readPrivilege);
    });
    expect(data).toHaveLength(1);
  });
});
