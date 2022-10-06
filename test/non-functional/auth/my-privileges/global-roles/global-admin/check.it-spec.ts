import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import {
  deleteOrganization,
  getOrganizationData,
} from '@test/functional-api/integration/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { cgrud_authRes_sortedPrivileges, sortPrivileges } from '../../common';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
});
afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe.skip('ChallengeAdmin - Assign / Remove Mutation', () => {
  test.each`
    operations                      | expected
    ${'authorization.myPrivileges'} | ${cgrud_authRes_sortedPrivileges}
  `('$operation', async ({ operations, expected }) => {
    const a = '{"authorization":{"myPrivileges":""}}';

    const b = JSON.parse(a);
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    console.log(response.body);
    // console.log(response.body.data.organization);

    //   const a = String(operations);
    const data = response.body.data.organization.b;
    console.log(data);
    // const jsonEvents = JSON.stringify(data);
    //const ole = jsonEvents.a;
    // console.log(jsonEvents);

    // Assert
    expect(data.sort()).toEqual(expected);
  });
});

describe.skip('myPrivileges', () => {
  test('GlobalAdmin privileges to Organization', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data = response.body.data.organization.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(cgrud_authRes_sortedPrivileges);
  });

  test('GlobalAdmin privileges to Organization / Verification', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.body.data.organization.verification.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to Organization / Profile', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.body.data.organization.profile.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to Organization / Profile / References', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.body.data.organization.profile.references[0].authorization
        .myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to Organization / Profile / Tagsets', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data =
      response.body.data.organization.profile.tagsets[0].authorization
        .myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to Organization / Preferences', async () => {
    // Act
    const response = await getOrganizationData(
      entitiesId.organizationId,
      TestUser.GLOBAL_ADMIN
    );
    const data = response.body.data.organization.preferences;
    // Assert
    data.map((item: any) => {
      expect(item.authorization.myPrivileges.sort()).toEqual(sortPrivileges);
    });
    expect(data).toHaveLength(1);
  });
});
