import { getSpaceData } from '@test/functional-api/journey/space/space.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/contributor-management/organization/organization.request.params';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  removeUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceOrganizationCodegen } from '@test/utils/mutations/preferences-mutation';
import { OrganizationPreferenceType } from '@alkemio/client-lib';
import { eventOnOrganizationVerificationCodegen } from '@test/functional-api/templates/lifecycle/innovation-flow.request.params';
import {
  assignOrganizationAsCommunityLeadCodegen,
  assignRoleToOrganization,
  assignUserToOrganizationCodegen,
} from '@test/functional-api/roleset/roles-request.params';
import { mutation } from '@test/utils/graphql.request';
import { users } from '@test/utils/queries/users-data';

const legalEntityName = 'Legal alkemio';
const domain = 'alkem.io';
const website = 'alkem.io';
const contactEmail = 'contact@alkem.io';
const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;

let orgId = '';

describe('Full Organization Deletion', () => {
  test('should delete all organization related data', async () => {
    // Arrange
    const spaceData = await getSpaceData('eco1');
    const spaceCommunityId = spaceData?.data?.space?.community?.id ?? '';

    const res = await createOrganization(
      organizationName,
      hostNameId,
      legalEntityName,
      domain,
      website,
      contactEmail
    );

    const data = res?.data?.createOrganization;
    orgId = data?.id ?? '';
    const organizationVerificationId = data?.verification.id ?? '';

    // Verify organization
    await eventOnOrganizationVerificationCodegen(
      organizationVerificationId,
      'VERIFICATION_REQUEST'
    );

    // Change organization preference
    await changePreferenceOrganizationCodegen(
      orgId,
      OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
      'true'
    );
    // Assign user as organization member
    await assignUserToOrganizationCodegen(users.notificationsAdmin.id, orgId);

    // Assign organization as space community member and lead
    await assignRoleToOrganization(
      spaceCommunityId,
      'eco1host'
    );
    await assignOrganizationAsCommunityLeadCodegen(
      spaceCommunityId,
      'eco1host'
    );

    // Assign organization owner
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.notificationsAdmin.id, orgId)
    );

    // Assign organization admin
    await mutation(
      assignUserAsOrganizationAdmin,
      userAsOrganizationOwnerVariablesData(users.notificationsAdmin.id, orgId)
    );

    // Assign another organization owner and remove it
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.globalAdmin.id, orgId)
    );
    await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.globalAdmin.id, orgId)
    );

    // Act
    const resDelete = await deleteOrganization(orgId);

    // Assert
    expect(resDelete?.data?.deleteOrganization.id).toEqual(orgId);
  });
});
