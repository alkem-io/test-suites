import { mutation } from '@test/utils/graphql.request';
import { getMails } from '@test/utils/mailslurper.rest.requests';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';

import {
  assignHubAdmin,
  userAsHubAdminVariablesData,
  assignChallengeAdmin,
  userAsChallengeAdminVariablesData,
  assignUserAsOpportunityAdmin,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';

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
  const response = await getMails();
  const emailsData = response.body.mailItems;
  const emailsCount = response.body.totalRecords;

  return [emailsData, emailsCount];
};

export const users = {
  globalAdminIdEmail: 'admin@alkem.io',
  globalAdminId: '',
  hubMemberEmail: 'hub.member@alkem.io',
  hubMemberId: '',
  hubAdminEmail: 'hub.admin@alkem.io',
  hubAdminId: '',
  nonHubMemberEmail: 'non.hub@alkem.io',
  nonHubMemberId: '',
  qaUserEmail: 'qa.user@alkem.io',
  qaUserId: '',
  qaUserProfileId: '',
  qaUserNameId: '',
};

export const entitiesId = {
  hubId: '',
  organizationId: '',
  organizationVerificationId: '',
  organizationProfileId: '',
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

export const assignUsersForAspectTests = async () => {
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.hubAdminId
    )
  );

  await mutation(
    assignHubAdmin,
    userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(users.hubMemberId, entitiesId.challengeId)
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
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
