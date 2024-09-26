import {
  createPostOnCallout,
  getDataPerChallengeCallout,
} from '@test/functional-api/callout/post/post.request.params';
import {
  deleteChallenge,
  getChallengeData,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { createRelation } from '@test/functional-api/relations/relations.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceChallenge,
  changePreferenceSpace,
} from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege, sorted__read_createRelation } from '../../common';
import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import {
  ChallengePreferenceType,
  CommunityRoleType,
  SpacePreferenceType,
} from '@alkemio/client-lib';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
import { entitiesId } from '@test/types/entities-helper';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpace(challengeName);

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'true'
  );

  await changePreferenceChallenge(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
    'true'
  );

  await changePreferenceChallenge(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    'true'
  );

  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Lead
  );

  await createApplication(
    entitiesId.challenge.communityId,
    TestUser.QA_USER
  );

  await sendMessageToRoom(
    entitiesId.challenge.updatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.challenge.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCallout(
    entitiesId.challenge.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteChallenge(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges - Challenge of Public Space', () => {
  test('RegisteredUser privileges to Challenge', async () => {
    // Act
    const response = await getChallengeData(
      entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
      const response = await getDataPerChallengeCallout(
        entitiesId.challenge.id,
        entitiesId.challenge.calloutId,
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
      //   entitiesId.space.calloutId,
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
      //   entitiesId.space.calloutId,
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
      const response = await getChallengeData(
        entitiesId.challenge.id,
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
