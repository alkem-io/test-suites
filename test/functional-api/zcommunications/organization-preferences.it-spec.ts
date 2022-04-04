import '../../utils/array.matcher';
import { getHubData, removeHub } from '../integration/hub/hub.request.params';
import {
  deleteOrganization,
  getOrganizationData,
  updateOrganization,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import { entitiesId, users } from './communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  changePreferenceOrganization,
  HubPreferenceType,
  OrganizationPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { createOrgAndHubWithUsers } from './create-entities-with-users-helper';
import { createUserWithParams } from '../user-management/user.request.params';

let organizationName = 'h-pref-org-name' + uniqueId;
let hostNameId = 'h-pref-org-nameid' + uniqueId;
let hubName = 'h-pref-eco-name' + uniqueId;
let hubNameId = 'h-pref-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await mutation(
    assignUserAsOrganizationOwner,
    userAsOrganizationOwnerVariablesData(
      users.hubMemberId,
      entitiesId.organizationId
    )
  );
  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.hubAdminId,
      entitiesId.organizationId
    )
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Organization preferences', () => {
  describe.only('DDT user privileges to update organization preferences', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePreferenceOnOrganization"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePreferenceOnOrganization"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"updatePreferenceOnOrganization"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", whe intend to update organization preference ',
      async ({ userRole, message }) => {
        // Act
        let updateOrganizationPref = await changePreferenceOrganization(
          entitiesId.organizationId,
          OrganizationPreferenceType.MATCH_DOMAIN,
          'false',
          userRole
        );

        // Assert
        expect(updateOrganizationPref.text).toContain(message);
      }
    );
  });

  describe.skip('Assign users to organizations based on domain match', () => {
    test('assign user to organization with same domain', async () => {
      // Arrange
      let updateOrganizationPref = await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      let organizationMembersBefore = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers =
        organizationMembersBefore.body.data.organization.members;
      console.log(organizationMembers);

      let updateOrganizationDomain = await updateOrganization(
        entitiesId.organizationId,
        organizationName,
        'oLegalName',
        'orgtest'
      );
      let updatedOrg = updateOrganizationDomain.body.data;
      console.log(updatedOrg);

      let createUserRes = await createUserWithParams(
        'orgTestName',
        'test@orgtest.com'
      );
      console.log(createUserRes.body);

      let organizationMembersAfter = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembersAfters =
        organizationMembersAfter.body.data.organization.members;
      console.log(organizationMembersAfters);

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
      updateHubPref = await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
        'false'
      );
    });

    test("don't assign unverified user to verified organization with matching domain ", async () => {});
    test("don't assign verified user to unverified organization with matching domain ", async () => {});
    test("don't assign verified user to verified organization with different domains ", async () => {});
    test("don't assign verified user to verified organization with matching domain and disabled matching preference ", async () => {});
  });
});
