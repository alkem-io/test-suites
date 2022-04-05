import '../../utils/array.matcher';
import { removeHub } from '../integration/hub/hub.request.params';
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
  changePreferenceOrganization,
  OrganizationPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { createOrgAndHubWithUsers } from './create-entities-with-users-helper';
import { getUser, removeUser } from '../user-management/user.request.params';
import { eventOnOrganizationVerification } from '../integration/lifecycle/lifecycle.request.params';
import { registerVerifiedUser } from '@test/utils/create-user-full-flow';

let organizationName = 'h-pref-org-name' + uniqueId;
let hostNameId = 'h-pref-org-nameid' + uniqueId;
let hubName = 'h-pref-eco-name' + uniqueId;
let hubNameId = 'h-pref-eco-nameid' + uniqueId;
let domain = 'alkem.io';
let firstName = `fn${uniqueId}`;
let lastName = `ln${uniqueId}`;
let userId = '';

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await updateOrganization(
    entitiesId.organizationId,
    organizationName,
    'test',
    domain
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
  describe('DDT user privileges to update organization preferences', () => {
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

  describe('Unveified organization - domain match', () => {
    afterEach(async () => {
      await removeUser(userId);
    });
    test('assign new user to organization,domain preference enabled', async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      // Act
      let email = `enm${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert
      expect(organizationMembers).toHaveLength(1);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user to organization, domain preference disabled", async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'false'
      );

      // Act
      let email = `dism${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert
      expect(organizationMembers).toHaveLength(1);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user with different domain to organization,domain preference enabled", async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      // Act
      let email = `enms${uniqueId}@a${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert

      expect(organizationMembers).toHaveLength(1);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });
  });

  describe('Veified organization - domain match', () => {
    beforeAll(async () => {
      await eventOnOrganizationVerification(
        entitiesId.organizationVerificationId,
        'VERIFICATION_REQUEST'
      );

      await eventOnOrganizationVerification(
        entitiesId.organizationVerificationId,
        'MANUALLY_VERIFY'
      );
    });

    afterEach(async () => {
      await removeUser(userId);
    });
    test('assign new user to organization,domain preference enabled', async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      // Act
      let email = `en${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert
      expect(organizationMembers).toHaveLength(2);
      expect(organizationMembers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user to organization, domain preference disabled", async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'false'
      );

      // Act
      let email = `dis${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert
      expect(organizationMembers).toHaveLength(1);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });

    test("don't assign new user with different domain to organization,domain preference enabled", async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      // Act
      let email = `en${uniqueId}@a${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      let userData = await getUser(email);
      userId = userData.body.data.user.id;

      let organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      let organizationMembers = organizationData.body.data.organization.members;

      // Assert

      expect(organizationMembers).toHaveLength(1);
      expect(organizationMembers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: email,
          }),
        ])
      );
    });
  });
});
