import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerOpportunityCalloutCodegen,
} from '@test/functional-api/integration/post/post.request.params';
import { removeChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import {
  getOpportunityDataCodegen,
  removeOpportunityCodegen,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege, sorted__read_createRelation } from '../../common';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

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

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'true'
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.qaUserId
    )
  );

  // await mutation(
  //   createDiscussion,
  //   createDiscussionVariablesData(
  //     entitiesId.opportunityCommunicationId,
  //     DiscussionCategory.GENERAL,
  //     'test'
  //   )
  // );

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
  await removeOpportunityCodegen(entitiesId.opportunityId);
  await removeChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('myPrivileges - Opportunity of Public Space', () => {
  test('RegisteredUser privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityDataCodegen(
      entitiesId.opportunityId,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response.data?.lookup.opportunity?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('RegisteredUser privileges to Opportunity / Community', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.opportunity?.community?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Opportunity / Community / Communication', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.opportunity?.community?.communication
          ?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test.skip('RegisteredUser privileges to Opportunity / Community / Communication / Discussion', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.opportunity?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Opportunity / Community / Communication / Updates', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.opportunity?.community?.communication?.updates
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Opportunity / Collaboration', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    test('RegisteredUser privileges to Opportunity / Collaboration / Relations', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.relations?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Opportunity / Collaboration / Callout', async () => {
      // Act
      const response = await getOpportunityDataCodegen(
        entitiesId.opportunityId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.lookup.opportunity?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Opportunity / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerOpportunityCalloutCodegen(
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.lookup.opportunity?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Opportunity / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId,
      //   TestUser.NON_HUB_MEMBER
      // );
      // const data =
      //   response.data?.space.opportunity?.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Opportunity / Collaboration / Callout / Comments', async () => {
      // Act
      // const response = await getDataPerSpaceCallout(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId,
      //   TestUser.NON_HUB_MEMBER
      // );
      // const data =
      //   response.data?.lookup.opportunity?.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data.sort()).toEqual(readPrivilege);
    });
  });
});
