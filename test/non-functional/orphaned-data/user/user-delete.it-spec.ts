import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  removeUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  getUser,
  registerVerifiedUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { orgId } from '@test/non-functional/auth/common-auth-variables';
import {
  assignUserAsCommunityMemberFunc,
  assignUserAsCommunityLeadFunc,
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';

const domain = 'alkem.io';
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
let userId = '';

describe('Full User Deletion', () => {
  test('should delete all user related data', async () => {
    // Act
    const email = `dis${uniqueId}@${domain}`;
    await registerVerifiedUser(email, firstName, lastName);

    const userData = await getUser(email);
    console.log(userData.body);
    userId = userData.body.data.user.id;

    // User application to hub community
    // const a = await createApplication(entitiesId.hubCommunityId, userId);
    // console.log(a.body);

    await assignUserAsCommunityMemberFunc(entitiesId.hubCommunityId, userId);
    await assignUserAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      userId
    );
    await assignUserAsCommunityMemberFunc(
      entitiesId.opportunityCommunityId,
      userId
    );
    await assignUserAsCommunityLeadFunc(entitiesId.hubCommunityId, userId);
    await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      userId
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      userId
    );

    // Assign user as organization member
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(orgId, userId)
    );

    // Assign organization owner
    await mutation(
      assignUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userId, orgId)
    );

    // Assign organization admin
    await mutation(
      assignUserAsOrganizationAdmin,
      userAsOrganizationOwnerVariablesData(userId, orgId)
    );

    // Remove user as organization owner
    await mutation(
      removeUserAsOrganizationOwner,
      userAsOrganizationOwnerVariablesData(userId, orgId)
    );

    // Act
    const resDelete = await removeUser(userId);

    // Assert
    expect(resDelete.body.data.deleteUser.id).toEqual(userId);
  });
});
