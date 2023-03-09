/* eslint-disable quotes */
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
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
import {
  getUser,
  registerVerifiedUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { eventOnOrganizationVerification } from '@test/functional-api/integration/lifecycle/lifecycle.request.params';
import {
  deleteOrganization,
  getOrganizationData,
  updateOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { createOrgAndHubWithUsers } from '../zcommunications/create-entities-with-users-helper';
import { entitiesId } from '../zcommunications/communications-helper';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'h-pref-org-name' + uniqueId;
const hostNameId = 'h-pref-org-nameid' + uniqueId;
const hubName = 'h-pref-eco-name' + uniqueId;
const hubNameId = 'h-pref-eco-nameid' + uniqueId;
const domain = 'alkem.io';
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
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
    domain,
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
        const updateOrganizationPref = await changePreferenceOrganization(
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

  describe('Unverified organization - domain match', () => {
    afterEach(async () => {
      await removeUser(userId);
    });
    test("don't assign new user to organization,domain preference enabled", async () => {
      // Arrange
      await changePreferenceOrganization(
        entitiesId.organizationId,
        OrganizationPreferenceType.MATCH_DOMAIN,
        'true'
      );

      // Act
      const email = `enm${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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
      const email = `dism${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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
      const email = `enms${uniqueId}@a${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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

  describe('Verified organization - domain match', () => {
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
      const email = `en${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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
      const email = `dis${uniqueId}@${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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
      const email = `en${uniqueId}@a${domain}`;
      await registerVerifiedUser(email, firstName, lastName);

      const userData = await getUser(email);
      userId = userData.body.data.user.id;

      const organizationData = await getOrganizationData(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData.body.data.organization.associates;

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
