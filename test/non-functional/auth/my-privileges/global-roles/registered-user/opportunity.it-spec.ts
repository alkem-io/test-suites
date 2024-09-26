import {
  createPostOnCalloutCodegen,
  getDataPerOpportunityCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import {
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { readPrivilege, sorted__read_createRelation } from '../../common';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { CommunityRoleType, SpacePreferenceType } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createRelationCodegen } from '@test/functional-api/relations/relations.request.params';
import { entitiesId } from '@test/types/entities-helper';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'true'
  );
  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Member
  );

  await sendMessageToRoom(
    entitiesId.opportunity.updatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.opportunity.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCallout(
    entitiesId.opportunity.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteOpportunity(entitiesId.opportunity.id);
  await deleteChallenge(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges - Opportunity of Public Space', () => {
  test('RegisteredUser privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityData(
      entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getOpportunityData(
        entitiesId.opportunity.id,
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
      const response = await getDataPerOpportunityCallout(
        entitiesId.opportunity.id,
        entitiesId.opportunity.calloutId,
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
      // const response = await getDataPerSpaceCallout(
      //   entitiesId.spaceId,
      //   entitiesId.space.calloutId,
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
      //   entitiesId.space.calloutId,
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
