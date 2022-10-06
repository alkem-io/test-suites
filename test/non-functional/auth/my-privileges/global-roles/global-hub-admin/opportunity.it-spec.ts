import {
  AspectTypes,
  createAspectOnCallout,
  getDataPerHubCallout,
  getDataPerOpportunityCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import {
  getOpportunityData,
  removeOpportunity,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignUserAsGlobalHubsAdmin,
  removeUserAsGlobalHubsAdmin,
} from '@test/utils/mutations/authorization-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
} from '@test/utils/mutations/communications-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  cgrud_ca_ccan_ucan_ccom_sortedPrivileges,
  cgrud_cr_cal_sortedPrivileges,
  cgrud_innflow_sortedPrivileges,
  cgrud_uc_cc_sortedPrivileges,
  sortPrivileges,
} from '../../common';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    createDiscussion,
    createDiscussionVariablesData(
      entitiesId.opportunityCommunicationId,
      DiscussionCategory.GENERAL,
      'test'
    )
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

  await createAspectOnCallout(
    entitiesId.opportunityCalloutId,
    'aspectDisplayName',
    'aspectnameid',
    'aspectDescription',
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
  await assignUserAsGlobalHubsAdmin(users.hubAdminId);
});
afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalHubsAdmin(users.hubAdminId);
});

describe('myPrivileges', () => {
  test('GlobalHubAdmin privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityData(
      entitiesId.hubId,
      entitiesId.opportunityId,
      TestUser.HUB_ADMIN
    );
    const data = response.body.data.hub.opportunity.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(cgrud_innflow_sortedPrivileges);
  });

  describe('Community', () => {
    test('GlobalHubAdmin privileges to Opportunity / Community', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.opportunity.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Community / Communication', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.opportunity.community.communication.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Community / Communication / Discussion', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.community.communication
          .discussions[0].authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Community / Communication / Updates', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.community.communication.updates
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });
  });

  describe('Collaboration', () => {
    test('GlobalHubAdmin privileges to Opportunity / Collaboration', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.collaboration.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(cgrud_cr_cal_sortedPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Collaboration / Relations', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.collaboration.relations[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Collaboration / Callout', async () => {
      // Act
      const response = await getOpportunityData(
        entitiesId.hubId,
        entitiesId.opportunityId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.opportunity.collaboration.callouts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(cgrud_ca_ccan_ucan_ccom_sortedPrivileges);
    });

    test('GlobalHubAdmin privileges to Opportunity / Collaboration / Callout / Aspect', async () => {
      // Act
      const response = await getDataPerOpportunityCallout(
        entitiesId.hubId,
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    // ToDo
    test.skip('GlobalHubAdmin privileges to Opportunity / Collaboration / Callout / Canvas', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(cgrud_uc_cc_sortedPrivileges);
    });

    // ToDo
    test.skip('GlobalHubAdmin privileges to Opportunity / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_ADMIN
      );

      const data =
        response.body.data.hub.opportunity.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(cgrud_uc_cc_sortedPrivileges);
    });
  });
});
