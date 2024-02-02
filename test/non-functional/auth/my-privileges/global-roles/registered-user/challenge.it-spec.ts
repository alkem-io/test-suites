import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerChallengeCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  deleteChallengeCodegen,
  getChallengeDataCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';

import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceChallengeCodegen,
  changePreferenceSpaceCodegen,
} from '@test/utils/mutations/preferences-mutation';

import { users } from '@test/utils/queries/users-data';
import { readPrivilege, sorted__read_createRelation } from '../../common';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/integration/community/community.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  ChallengePreferenceType,
  CommunityRole,
  SpacePreferenceType,
} from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'true'
  );

  await changePreferenceChallengeCodegen(
    entitiesId.challengeId,
    ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
    'true'
  );

  await changePreferenceChallengeCodegen(
    entitiesId.challengeId,
    ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    'true'
  );

  await assignCommunityRoleToUserCodegen(
    users.qaUserId,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    users.qaUserId,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await createApplicationCodegen(
    entitiesId.challengeCommunityId,
    TestUser.QA_USER
  );

  await sendMessageToRoomCodegen(
    entitiesId.challengeUpdatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.challengeCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCalloutCodegen(
    entitiesId.challengeCalloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('myPrivileges - Challenge of Public Space', () => {
  test('RegisteredUser privileges to Challenge', async () => {
    // Act
    const response = await getChallengeDataCodegen(
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.lookup.challenge?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('RegisteredUser privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.challenge?.community?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.challenge?.community?.applications?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.challenge?.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test.skip('RegisteredUser privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.challenge?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.challenge?.community?.communication?.updates
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('RegisteredUser privileges to Challenge / Collaboration / Relations', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.relations?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'CREATE_RELATION',
        'CREATE_CALLOUT',
      ]);
    });

    test('RegisteredUser privileges to Challenge / Collaboration / Callout', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Challenge / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerChallengeCalloutCodegen(
        entitiesId.challengeId,
        entitiesId.challengeCalloutId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Challenge / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCallout(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId,
      //   TestUser.NON_HUB_MEMBER
      // );
      // const data =
      //   response.data?.lookup.challenge?.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data.sort()).toEqual([
      //   'CREATE',
      //   'GRANT',
      //   'READ',
      //   'UPDATE',
      //   'DELETE',
      //   'UPDATE_WHITEBOARD',
      //   'CREATE_COMMENT',
      // ]);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      // const response = await getDataPerSpaceCallout(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId,
      //   TestUser.NON_HUB_MEMBER
      // );
      // const data =
      //   response.data?.lookup.challenge?.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data.sort()).toEqual([
      //   'CREATE',
      //   'GRANT',
      //   'READ',
      //   'UPDATE',
      //   'DELETE',
      //   'UPDATE_WHITEBOARD',
      //   'CREATE_COMMENT',
      // ]);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.lookup.challenge?.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges).toEqual(['READ']);
      });
    });
  });
});
