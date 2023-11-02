/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceOrganizationCodegen } from '@test/utils/mutations/preferences-mutation';
import { assignUserAsOrganizationOwnerCodegen } from '@test/utils/mutations/authorization-mutation';
import {
  registerVerifiedUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { eventOnOrganizationVerification } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import {
  deleteOrganizationCodegen,
  getOrganizationDataCodegen,
  updateOrganizationCodegen,
} from '../organization/organization.request.params';
import { OrganizationPreferenceType } from '@alkemio/client-lib';

const organizationName = 'h-pref-org-name' + uniqueId;
const hostNameId = 'h-pref-org-nameid' + uniqueId;
const spaceName = 'h-pref-eco-name' + uniqueId;
const spaceNameId = 'h-pref-eco-nameid' + uniqueId;
const domain = 'alkem.io';
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
let userId = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateOrganizationCodegen(entitiesId.organizationId, {
    profileData: {
      displayName: organizationName,
    },
    domain: domain,
    website: domain,
  });

  await assignUserAsOrganizationOwnerCodegen(
    users.spaceMemberEmail,
    entitiesId.organizationId
  );

  await assignUserAsOrganizationOwnerCodegen(
    users.spaceAdminId,
    entitiesId.organizationId
  );
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Organization preferences', () => {
  describe('DDT user WITH privileges to update organization preferences', () => {
    // Arrange
    test.each`
      userRole                 | message
      ${TestUser.GLOBAL_ADMIN} | ${'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN'}
      ${TestUser.HUB_ADMIN}    | ${'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN'}
      ${TestUser.HUB_MEMBER}   | ${'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN'}
    `(
      'User: "$userRole" get message: "$message", when intend to update organization preference ',
      async ({ userRole, message }) => {
        // Act
        const res = await changePreferenceOrganizationCodegen(
          entitiesId.organizationId,
          OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
          'false',
          userRole
        );

        // Assert
        expect(
          res?.data?.updatePreferenceOnOrganization.definition.type
        ).toContain(message);
      }
    );
  });

  describe('DDT user WITHOUT privileges to update organization preferences', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'update' privilege: organization preference update:"}
    `(
      'User: "$userRole" get message: "$message", when intend to update organization preference ',
      async ({ userRole, message }) => {
        // Act
        const res = await changePreferenceOrganizationCodegen(
          entitiesId.organizationId,
          OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
          'false',
          userRole
        );

        // Assert
        expect(res?.error?.errors[0].message).toContain(message);
      }
    );
  });

  describe('Unverified organization - domain match', () => {
    afterEach(async () => {
      await removeUser(userId);
    });
    test("don't assign new user to organization,domain preference enabled", async () => {
      // Arrange
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `enm${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'false'
      );

      // Act
      const email = `dism${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `enms${uniqueId}@a${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `en${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'false'
      );

      // Act
      const email = `dis${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
      await changePreferenceOrganizationCodegen(
        entitiesId.organizationId,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `en${uniqueId}@a${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organizationId
      );
      const organizationMembers =
        organizationData?.data?.organization.associates;

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
