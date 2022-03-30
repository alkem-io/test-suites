import { mutation } from '@test/utils/graphql.request';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignChallengeAdmin,
  assignHubAdmin,
  assignUserAsOpportunityAdmin,
  userAsChallengeAdminVariablesData,
  userAsHubAdminVariablesData,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  createOpportunity,
  opportunityVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import { createTestHub } from '../integration/hub/hub.request.params';
import { createOrganization } from '../integration/organization/organization.request.params';
import { getUser } from '../user-management/user.request.params';
import { entitiesId, users } from './communications-helper';

export const createOrgAndHubWithUsers = async (
  organizationName: string,
  hostNameId: string,
  hubName: string,
  hubNameId: string
) => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestHub(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createHub.id;
  entitiesId.hubCommunityId = responseEco.body.data.createHub.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createHub.community.communication.id;

  entitiesId.hubUpdatesId =
    responseEco.body.data.createHub.community.communication.updates.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.hubAdminId
    )
  );

  await mutation(
    assignHubAdmin,
    userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );
};

export const createChallengeWithUsers = async (challengeName: string) => {
  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.hubId
    )
  );
  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  entitiesId.challengeCommunicationId =
    responseChallenge.body.data.createChallenge.community.communication.id;
  entitiesId.challengeUpdatesId =
    responseChallenge.body.data.createChallenge.community.communication.updates.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(users.hubMemberId, entitiesId.challengeId)
  );
};

export const createOpportunityWithUsers = async (opportunityName: string) => {
  const responseOpportunity = await mutation(
    createOpportunity,
    opportunityVariablesData(
      opportunityName,
      `opnameid${uniqueId}`,
      entitiesId.challengeId
    )
  );
  entitiesId.opportunityId = responseOpportunity.body.data.createOpportunity.id;
  entitiesId.opportunityCommunityId =
    responseOpportunity.body.data.createOpportunity.community.id;
  entitiesId.opportunityUpdatesId =
    responseOpportunity.body.data.createOpportunity.community.communication.updates.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.opportunityCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.opportunityCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(
      users.hubMemberId,
      entitiesId.opportunityId
    )
  );
};
