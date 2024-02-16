import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteUserCodegen,
  getUserDataCodegen,
  registerVerifiedUser,
} from '@test/functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { orgId } from '@test/non-functional/auth/common-auth-variables';
import {
  assignCommunityRoleToUserCodegen,
  assignUserToOrganizationCodegen,
} from '@test/functional-api/integration/community/community.request.params';
import { CommunityRole } from '@alkemio/client-lib';
import {
  assignUserAsOrganizationAdminCodegen,
  assignUserAsOrganizationOwnerCodegen,
  removeUserAsOrganizationOwnerCodegen,
} from '@test/utils/mutations/authorization-mutation';

const domain = 'alkem.io';
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
let userId = '';

describe('Full User Deletion', () => {
  test('should delete all user related data', async () => {
    // Act
    const email = `dis${uniqueId}@${domain}`;
    const a = await registerVerifiedUser(email, firstName, lastName);
    console.log(a);

    const userData = await getUserDataCodegen(email);
    console.log(userData);
    userId = userData?.data?.user.id ?? '';

    // User application to space community
    // const a = await createApplication(entitiesId.spaceCommunityId, userId);
    // console.log(a.body);

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.opportunityCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      userId,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    // Assign user as organization member
    await assignUserToOrganizationCodegen(orgId, userId);

    // Assign organization owner
    await assignUserAsOrganizationOwnerCodegen(userId, orgId);

    // Assign organization admin
    await assignUserAsOrganizationAdminCodegen(userId, orgId);

    // Remove user as organization owner
    await removeUserAsOrganizationOwnerCodegen(userId, orgId);

    // Act
    const resDelete = await deleteUserCodegen(userId);

    // Assert
    expect(resDelete?.data?.deleteUser.id).toEqual(userId);
  });
});
