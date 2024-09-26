import {
  createPostOnCallout,
  getDataPerChallengeCallout,
} from '@test/functional-api/callout/post/post.request.params';
import {
  getChallengeData,
  deleteChallenge,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceChallenge } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted_sorted__create_read_update_delete_grant_contribute_movePost,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
  sorted__create_read_update_delete_grant_createOpportunity,
} from '../../common';
import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { ChallengePreferenceType, CommunityRole } from '@alkemio/client-lib';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
import { createRelation } from '@test/functional-api/relations/relations.request.params';
import { entitiesId } from '@test/types/entities-helper';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';
let postId: string;

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpace(challengeName);

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
    CommunityRoleType.Lead
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

  const createPost = await createPostOnCallout(
    entitiesId.challenge.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
  postId = createPost.data?.createContributionOnCallout?.post?.id ?? '';
});
afterAll(async () => {
  await deleteSubspace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('GlobalAdmin privileges to Challenge', async () => {
    // Act
    const response = await getChallengeData(entitiesId.challenge.id);
    const data =
      response.data?.lookup.challenge?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_createOpportunity
    );
  });

  describe('Community', () => {
    test('GlobalAdmin privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);
      const data =
        response?.data?.lookup?.challenge?.community?.authorization
          ?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite
      );
    });

    test('GlobalAdmin privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);

      const data =
        response?.data?.lookup?.challenge?.community?.applications?.[0]
          .authorization?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalAdmin privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);
      const data =
        response?.data?.lookup?.challenge?.community?.communication
          ?.authorization?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalAdmin privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);

      const data =
        response?.data?.lookup?.challenge?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalAdmin privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);

      const data =
        response?.data?.lookup?.challenge?.community?.communication?.updates
          ?.authorization?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalAdmin privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);
      const data =
        response?.data?.lookup?.challenge?.collaboration?.authorization
          ?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    test('GlobalAdmin privileges to Challenge / Collaboration / Callout', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);
      const data =
        response?.data?.lookup?.challenge?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges;

      // Assert
      expect(data?.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalAdmin privileges to Challenge / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerChallengeCallout(
        entitiesId.challenge.id,
        entitiesId.challenge.calloutId
      );

      const data =
        response?.data?.lookup.challenge?.collaboration?.callouts?.[0].contributions?.find(
          c => c.post && c.post.id === postId
        )?.post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_contribute_movePost
      );
    });

    // ToDo
    test.skip('GlobalAdmin privileges to Challenge / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerChallengeCallout(
        entitiesId.challenge.id,
        entitiesId.challenge.calloutId
      );

      const data =
        response?.data?.lookup?.challenge?.collaboration?.callouts?.[0]
          ?.authorization?.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_WHITEBOARD',
        'CREATE_COMMENT',
      ]);
    });

    // ToDo
    test.skip('GlobalAdmin privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerChallengeCallout(
        entitiesId.challenge.id,
        entitiesId.challenge.calloutId
      );

      const data =
        response?.data?.lookup?.challenge?.collaboration?.callouts?.[0]
          ?.authorization?.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_WHITEBOARD',
        'CREATE_COMMENT',
      ]);
    });
  });

  describe('Preferences', () => {
    test('GlobalAdmin privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeData(entitiesId.challenge.id);
      const data = response?.data?.lookup?.challenge?.preferences;

      data?.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(
          sorted__create_read_update_delete_grant
        );
      });
    });
  });
});
