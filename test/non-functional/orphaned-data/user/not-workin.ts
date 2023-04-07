import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  getUser,
  registerVerifiedUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';

import { orgId } from '@test/non-functional/auth/common-auth-variables';
import {
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  verifyInKratosOrFail,
} from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
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
  changePreferenceUser,
  UserPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
const email = `dis${uniqueId}@$alkem.io`;
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
// const userId = '';
// beforeAll(async () => {
//   await registerInKratosOrFail(firstName, lastName, email);
//   await verifyInKratosOrFail(email);
//   await registerInAlkemioOrFail(firstName, lastName, email);
//   //await registerVerifiedUser(email, 'aa', 'bb');
//   const userData = await getUser(email);
//   userId = userData.body.data.user.id;
// });

describe('Full User Deletion', () => {
  test('should delete all user related data', async () => {
    //const email = `dis${uniqueId}@'alkem.io'`;
    await registerVerifiedUser(email, firstName, lastName);

    const userData = await getUser(email);
    console.log(userData.body);
    const userId = userData.body.data.user.id;
    // Change user preference
    await changePreferenceUser(
      userId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'true'
    );

    // User application to hub community
    await createApplication(entitiesId.hubCommunityId);

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
