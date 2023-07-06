/* eslint-disable prettier/prettier */
import '@test/utils/array.matcher';
import {
  createApplication,
  removeApplication,
} from '@test/functional-api/user-management/application/application.request.params';
import {
  getExternalInvitation,
  getInvitation,
  getInvitations,
  inviteExistingUser,
  inviteExternalUser,
  removeInvitation,
} from './invitation.request.params';
import {
  getSpaceData,
  removeSpace,
} from '../../integration/space/space.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { mutation } from '@test/utils/graphql.request';
import { eventOnCommunityInvitation } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

import { createOrgAndSpaceWithUsers } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { TestUser, delay } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege } from '@test/non-functional/auth/my-privileges/common';
import {
  rolesUserQuery,
  rolesUserQueryVariablesData,
} from '@test/utils/queries/roles';
import { registerVerifiedUser, removeUser } from '../user.request.params';

const emailExternalUser = `external${uniqueId}@alkem.io`;
const firstNameExternalUser = `FirstName${uniqueId}`;
const message = 'Hello, feel free to join our community!';

let invitationId = '';
let invitationData: any;
const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
const spaceNameId = 'appl-eco-nameid' + uniqueId;
let userId = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

afterEach(async () => {
  await removeUser(userId);
});

describe('Invitations', () => {
  afterEach(async () => {
    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberId
      )
    );

    await removeInvitation(invitationId);
  });
  test.only('should create invitation', async () => {
    // Act
    invitationData = await inviteExternalUser(
      entitiesId.spaceCommunityId,
      emailExternalUser,
      message,
      firstNameExternalUser,
      TestUser.GLOBAL_ADMIN
    );
    console.log(invitationData.body);
    const invitationInfo =
      invitationData.body.data.inviteExternalUserForCommunityMembership;
    invitationId = invitationInfo.id;

    const getInvBefore = await getInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );
    console.log(getInvBefore.body.data.space.community.invitations);

    userId = await registerVerifiedUser(
      emailExternalUser,
      firstNameExternalUser,
      firstNameExternalUser
    );
    console.log(userId);

    const getInvExt = await getExternalInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );

    console.log(getInvExt.body.data.space.community);

    const getInvAfter = await getInvitation(
      entitiesId.spaceId,
      TestUser.GLOBAL_ADMIN
    );
    console.log(getInvAfter.body.data.space.community.invitations);
    // Assert
    expect(getInvBefore.body.data.space.community.invitations).toHaveLength(0);
    expect(
      getInvAfter.body.data.space.community.invitations[0].lifecycle.state
    ).toEqual('invited');
  });
});
