/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceOrganizationCodegen } from '@test/utils/mutations/preferences-mutation';
import { assignUserAsOrganizationOwnerCodegen } from '@test/utils/mutations/authorization-mutation';
import {
  deleteUser,
  registerVerifiedUser,
} from '@test/functional-api/contributor-management/user/user.request.params';
import { eventOnOrganizationVerificationCodegen } from '@test/functional-api/templates/lifecycle/innovation-flow.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import {
  deleteOrganization,
  getOrganizationDataCodegen,
  updateOrganizationCodegen,
} from '../organization/organization.request.params';
import { OrganizationPreferenceType } from '@alkemio/client-lib';
import { entitiesId } from '../../types/entities-helper';

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

  await updateOrganizationCodegen(entitiesId.organization.id, {
    profileData: {
      displayName: organizationName,
    },
    domain: domain,
    website: domain,
  });

  await assignUserAsOrganizationOwnerCodegen(
    users.spaceMember.email,
    entitiesId.organization.id
  );

  await assignUserAsOrganizationOwnerCodegen(
    users.spaceAdmin.id,
    entitiesId.organization.id
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
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
          entitiesId.organization.id,
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
          entitiesId.organization.id,
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
      await deleteUser(userId);
    });
    test("don't assign new user to organization,domain preference enabled", async () => {
      // Arrange
      await changePreferenceOrganizationCodegen(
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `enm${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'false'
      );

      // Act
      const email = `dism${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `enms${uniqueId}@a${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
      await eventOnOrganizationVerificationCodegen(
        entitiesId.organization.verificationId,
        'VERIFICATION_REQUEST'
      );

      await eventOnOrganizationVerificationCodegen(
        entitiesId.organization.verificationId,
        'MANUALLY_VERIFY'
      );
    });

    afterEach(async () => {
      await deleteUser(userId);
    });
    test('assign new user to organization,domain preference enabled', async () => {
      // Arrange
      await changePreferenceOrganizationCodegen(
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `en${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'false'
      );

      // Act
      const email = `dis${uniqueId}@${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
        entitiesId.organization.id,
        OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
        'true'
      );

      // Act
      const email = `en${uniqueId}@a${domain}`;
      userId = await registerVerifiedUser(email, firstName, lastName);

      const organizationData = await getOrganizationDataCodegen(
        entitiesId.organization.id
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
