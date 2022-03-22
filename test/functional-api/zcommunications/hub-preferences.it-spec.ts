import '../../utils/array.matcher';
import {
  createTestHub,
  getHubData,
  removeHub,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import { entitiesId, users } from './communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';

let organizationName = 'h-pref-org-name' + uniqueId;
let hostNameId = 'h-pref-org-nameid' + uniqueId;
let hubName = 'h-pref-eco-name' + uniqueId;
let hubNameId = 'h-pref-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestHub(
    'dodo' + hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createHub.id;
  entitiesId.hubCommunityId = responseEco.body.data.createHub.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createHub.community.communication.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(users.hubMemberEmail);
  users.hubMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = requestReaderNotMemberData.body.data.user.id;

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.APPLICATIONS_FROM_ANYONE,
    'false'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'false'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
    'false'
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Hub preferences', () => {
  describe('DDT non-hub member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                               | value      | expectedPrefenceValue                                        | expectedCommunityMyPrivileges
      ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'true'}  | ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${['READ']}
      ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'false'} | ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${[]}
      ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'true'}  | ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${['COMMUNITY_APPLY']}
      ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'false'} | ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'true'}  | ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${['COMMUNITY_JOIN']}
      ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'false'} | ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'true'}  | ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'false'} | ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
    `(
      'Non-hub member should have privileges: "$expectedCommunityMyPrivileges" for hub with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,

        expectedCommunityMyPrivileges,
      }) => {
        let updateHubPref = await changePreferenceHub(
          entitiesId.hubId,
          preferenceType,
          value
        );

        let nonHubQueryMemebrs = await getHubData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(updateHubPref.body.data.updatePreferenceOnHub.value).toEqual(
          value
        );
        expect(
          updateHubPref.body.data.updatePreferenceOnHub.definition.type
        ).toEqual(expectedPrefenceValue);
        expect(
          nonHubQueryMemebrs.body.data.hub.community.authorization
        ).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });
      }
    );
  });
  describe('Update hub preferences ', () => {
    test('GA set hub preferences MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS to true nonHubMember, member of Organization', async () => {
      // Arrange
      await mutation(
        assignUserToOrganization,
        assignUserToOrganizationVariablesData(
          entitiesId.organizationId,
          users.nonHubMemberId
        )
      );

      // Act
      let updateHubPref = await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
        'true'
      );
      let nonHubQueryMemebrs = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(updateHubPref.statusCode).toEqual(200);
      expect(updateHubPref.body.data.updatePreferenceOnHub.value).toEqual(
        'true'
      );
      expect(
        updateHubPref.body.data.updatePreferenceOnHub.definition.type
      ).toEqual(HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS);

      expect(nonHubQueryMemebrs.body.data.hub.community.authorization).toEqual({
        anonymousReadAccess: false,
        myPrivileges: ['COMMUNITY_JOIN'],
      });
    });
  });
});
