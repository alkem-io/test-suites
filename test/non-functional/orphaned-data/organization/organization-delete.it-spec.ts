import { getHubData } from '@test/functional-api/integration/hub/hub.request.params';
import { eventOnOrganizationVerification } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { users } from '@test/functional-api/zcommunications/communications-helper';
import { mutation } from '@test/utils/graphql.request';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignOrganizationAsCommunityMemberFunc,
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  removeUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceOrganization,
  OrganizationPreferenceType,
} from '@test/utils/mutations/preferences-mutation';

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
    const hubData = await getHubData('eco1');
    const hubCommunityId = hubData.body.data.hub.community.id;

    const res = await createOrganization(
      organizationName,
      hostNameId,
      legalEntityName,
      domain,
      website,
      contactEmail
    );

    const data = res.body.data.createOrganization;
    orgId = data.id;
    const organizationVerificationId = data.verification.id;

    // Verify organization
    await eventOnOrganizationVerification(
      organizationVerificationId,
      'VERIFICATION_REQUEST'
    );

    // Change organization preference
    await changePreferenceOrganization(
      orgId,
      OrganizationPreferenceType.MATCH_DOMAIN,
      'true'
    );
    // Assign user as organization member
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(orgId, users.notificationsAdminId)
    );

    // Assign organization as hub community member and lead
    await assignOrganizationAsCommunityMemberFunc(hubCommunityId, 'eco1host');
    await assignOrganizationAsCommunityLeadFunc(hubCommunityId, 'eco1host');

    // Assign organization owner
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.notificationsAdminId, orgId)
    );

    // Assign organization admin
    await mutation(
      assignUserAsOrganizationAdmin,
      userAsOrganizationOwnerVariablesData(users.notificationsAdminId, orgId)
    );

    // Assign another organization owner and remove it
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.globalAdminId, orgId)
    );
    await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(users.globalAdminId, orgId)
    );

    // Act
    const resDelete = await deleteOrganization(orgId);

    // Assert
    expect(resDelete.body.data.deleteOrganization.id).toEqual(orgId);
  });
});
