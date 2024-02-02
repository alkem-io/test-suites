import {
  PostTypes,
  getDataPerSpaceCallout,
  createPostOnCalloutCodegen,
  getDataPerOpportunityCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import {
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';

import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_addMember_Invite,
  sorted__create_read_update_delete_grant_contribute,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted_sorted__create_read_update_delete_grant_contribute_movePost,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
  sorted__create_read_update_delete_grant,
} from '../../common';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/integration/community/community.request.params';
import { CommunityRole } from '@alkemio/client-lib';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
  await assignCommunityRoleToUserCodegen(
    users.qaUserId,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.opportunityUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.opportunityCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCalloutCodegen(
    entitiesId.opportunityCalloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('myPrivileges', () => {
  test('GlobalAdmin privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityDataCodegen(entitiesId.opportunityId);
    const data =
      response.data?.lookup.opportunity?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
  });

  describe('Community', () => {
    test('GlobalAdmin privileges to Opportunity / Community', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );
      const data =
        response.data?.lookup.opportunity?.community?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_addMember_Invite
      );
    });

    test('GlobalAdmin privileges to Opportunity / Community / Communication', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );
      const data =
        response.data?.lookup.opportunity?.community?.communication
          ?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalAdmin privileges to Opportunity / Community / Communication / Discussion', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );

      const data =
        response.data?.lookup.opportunity?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalAdmin privileges to Opportunity / Community / Communication / Updates', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );

      const data =
        response.data?.lookup.opportunity?.community?.communication?.updates
          ?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalAdmin privileges to Opportunity / Collaboration', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    test('GlobalAdmin privileges to Opportunity / Collaboration / Relations', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.relations?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_contribute
      );
    });

    test('GlobalAdmin privileges to Opportunity / Collaboration / Callout', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId
      );
      const data =
        response.data?.lookup.opportunity?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalAdmin privileges to Opportunity / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerOpportunityCalloutCodegen(
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_contribute_movePost
      );
    });

    // ToDo
    test.skip('GlobalAdmin privileges to Opportunity / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId
      // );
      // const data =
      //   response.data?.space.opportunity.collaboration.callouts[0].posts[0]
      //     .authorization.myPrivileges;
      // // Assert
      // expect(data).toEqual([
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
    test.skip('GlobalAdmin privileges to Opportunity / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );

      const data =
        response.body.data.space.opportunity.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

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
});
