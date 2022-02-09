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
  ecoverseId,
  ecoverseName,
  ecoverseNameId,
} from '../integration/ecoverse/ecoverse.request.params';
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
  ecoverseMemberEmail: 'ecoverse.member@alkem.io',
  ecoverseMemberId: '',
  ecoverseAdminEmail: 'ecoverse.admin@alkem.io',
  ecoverseAdminId: '',
  nonEcoverseMemberEmail: 'non.ecoverse@alkem.io',
  nonEcoverseMemberId: '',
  qaUserEmail: 'qa.user@alkem.io',
  qaUserId: '',
};

export let entitiesId = {
  ecoverseId: '',
  organizationId: '',
  ecoverseCommunityId: '',
  ecoverseUpdatesId: '',
  ecoverseApplicationId: '',
  hubContextId: '',
  messageId: '',
  ecoverseCommunicationId: '',
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
    ecoverseName,
    ecoverseNameId,
    entitiesId.organizationId
  );

  entitiesId.ecoverseId = responseEco.body.data.createEcoverse.id;
  entitiesId.ecoverseCommunityId =
    responseEco.body.data.createEcoverse.community.id;
  entitiesId.ecoverseUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;
  entitiesId.hubContextId = responseEco.body.data.createEcoverse.context.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `${challengeName}${uniqueId}`,
      entitiesId.ecoverseId
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

  const reqEcoAdmin = await getUser(users.ecoverseAdminEmail);
  users.ecoverseAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.ecoverseMemberEmail);
  users.ecoverseMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.ecoverseAdminId
    )
  );

  await mutation(
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(
      users.ecoverseAdminId,
      entitiesId.ecoverseId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.ecoverseMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.ecoverseCommunityId,
      users.qaUserId
    )
  );
  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.ecoverseMemberId
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
    userAsChallengeAdminVariablesData(
      users.ecoverseMemberId,
      entitiesId.challengeId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.opportunityCommunityId,
      users.ecoverseMemberId
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
      users.ecoverseMemberId,
      entitiesId.opportunityId
    )
  );

  return [
    entitiesId.ecoverseId,
    entitiesId.hubContextId,
    entitiesId.challengeId,
    entitiesId.challengeContextId,
    entitiesId.opportunityId,
    entitiesId.opportunityContextId,
  ];
};
