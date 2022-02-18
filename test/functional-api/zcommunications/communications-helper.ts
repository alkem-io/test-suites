import { mutation } from '@test/utils/graphql.request';
import { getMails } from '@test/utils/mailslurper.rest.requests';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignEcoverseAdmin,
  userAsEcoverseAdminVariablesData,
  assignChallengeAdmin,
  userAsChallengeAdminVariablesData,
  assignUserAsOpportunityAdmin,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createChallenge,
  challengeVariablesData,
  uniqueId,
  createOpportunity,
  opportunityVariablesData,
} from '@test/utils/mutations/create-mutation';
import {
  createTestEcoverse,
  hubId,
  hubName,
  hubNameId,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  organizationName,
  hostNameId,
} from '../integration/organization/organization.request.params';
import { getUser } from '../user-management/user.request.params';

// To be used only in tests, when there is dependancy on thrid party service (i.e. mailslurper)
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns 2 values:
 ** 1st: emails array
 ** 2nd: emails count
 */
export const getMailsData = async () => {
  let response = await getMails();
  let emailsData = response.body.mailItems;
  let emailsCount = response.body.totalRecords;

  return [emailsData, emailsCount];
};

export let users = {
  globalAdminIdEmail: 'admin@alkem.io',
  globalAdminId: '',
  hubMemberEmail: 'hub.member@alkem.io',
  hubMemberId: '',
  hubAdminEmail: 'hub.admin@alkem.io',
  hubAdminId: '',
  nonEcoverseMemberEmail: 'non.hub@alkem.io',
  nonEcoverseMemberId: '',
  qaUserEmail: 'qa.user@alkem.io',
  qaUserId: '',
};

export let entitiesId = {
  hubId: '',
  organizationId: '',
  hubCommunityId: '',
  hubUpdatesId: '',
  hubApplicationId: '',
  hubContextId: '',
  messageId: '',
  hubCommunicationId: '',
  discussionId: '',
  challengeId: '',
  challengeCommunityId: '',
  challengeUpdatesId: '',
  challengeCommunicationId: '',
  challengeContextId: '',
  opportunityId: '',
  opportunityCommunityId: '',
  opportunityUpdatesId: '',
  opportunityContextId: '',
};

export const prepareData = async (
  challengeName: string,
  opportunityName: string
) => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );

  entitiesId.hubId = responseEco.body.data.createEcoverse.id;
  entitiesId.hubCommunityId = responseEco.body.data.createEcoverse.community.id;
  entitiesId.hubUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;
  entitiesId.hubContextId = responseEco.body.data.createEcoverse.context.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `${challengeName}${uniqueId}`,
      entitiesId.hubId
    )
  );

  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  entitiesId.challengeUpdatesId =
    responseChallenge.body.data.createChallenge.community.communication.updates.id;
  entitiesId.challengeContextId =
    responseChallenge.body.data.createChallenge.context.id;

  const responseOpportunity = await mutation(
    createOpportunity,
    opportunityVariablesData(
      opportunityName,
      `${opportunityName}${uniqueId}`,
      entitiesId.challengeId
    )
  );

  entitiesId.opportunityId = responseOpportunity.body.data.createOpportunity.id;
  entitiesId.opportunityCommunityId =
    responseOpportunity.body.data.createOpportunity.community.id;
  entitiesId.opportunityUpdatesId =
    responseOpportunity.body.data.createOpportunity.community.communication.updates.id;
  entitiesId.opportunityContextId =
    responseOpportunity.body.data.createOpportunity.context.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonEcoverseMemberEmail);
  users.nonEcoverseMemberId = reqNonEco.body.data.user.id;

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
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(users.hubAdminId, entitiesId.hubId)
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

  return [
    entitiesId.hubId,
    entitiesId.hubContextId,
    entitiesId.challengeId,
    entitiesId.challengeContextId,
    entitiesId.opportunityId,
    entitiesId.opportunityContextId,
  ];
};
