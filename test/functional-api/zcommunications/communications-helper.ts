import { mutation } from '@test/utils/graphql.request';
import { getMails } from '@test/utils/mailslurper.rest.requests';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';

import {
  assignSpaceAdmin,
  userAsSpaceAdminVariablesData,
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

export const usersSet = [
  {
    // email: 'admin@alkem.io',
    globalAdminIdEmail: 'admin@alkem.io',
    globalAdminId: '',
    globalAdminDisplayName: '',
  },
  {
    email: 'community.admin@alkem.io',
    globalCommunityAdminEmail: 'community.admin@alkem.io',
    globalCommunityAdminId: '',
    globalCommunityAdminDisplayName: '',
  },
  {
    globalSpacesAdminEmail: 'spaces.admin@alkem.io',
    globalSpacesAdminId: '',
    globalSpacesAdminDisplayName: '',
  },
  {
    spaceMemberEmail: 'space.member@alkem.io',
    spaceMemberId: '',
    spaceMemberDisplayName: '',
  },
  {
    spaceAdminEmail: 'space.admin@alkem.io',
    spaceAdminId: '',
    spaceAdminDisplayName: '',
  },
  {
    spaceMemberEmail: 'space.member@alkem.io',
    spaceMemberId: '',
    spaceMemberDisplayName: '',
  },
  {
    challengeAdminEmail: 'challenge.admin@alkem.io',
    challengeAdminId: '',
    challengeAdminDisplayName: '',
  },
  {
    challengeMemberEmail: 'challenge.member@alkem.io',
    challengeMemberId: '',
    challengeMemberDisplayName: '',
  },
  {
    opportunityAdminEmail: 'opportunity.admin@alkem.io',
    opportunityAdminId: '',
    opportunityAdminDisplayName: '',
  },
  {
    opportunityMemberEmail: 'opportunity.member@alkem.io',
    opportunityMemberId: '',
    opportunityMemberDisplayName: '',
  },
  {
    nonSpaceMemberEmail: 'non.space@alkem.io',
    nonSpaceMemberId: '',
    nonSpaceDisplayName: '',
  },
  {
    qaUserEmail: 'qa.user@alkem.io',
    qaUserId: '',
    // qaUserProfileId: '',
    // qaUserNameId: '',
    qaUserDisplayName: '',
  },
  {
    notificationsAdminEmail: 'notifications@alkem.io',
    notificationsAdminId: '',
    notificationsAdminDisplayName: '',
  },
];

export const users = {
  globalAdminIdEmail: 'admin@alkem.io',
  globalAdminId: '',
  globalAdminDisplayName: '',

  globalCommunityAdminEmail: 'community.admin@alkem.io',
  globalCommunityAdminId: '',
  globalCommunityAdminDisplayName: '',

  globalSpacesAdminEmail: 'spaces.admin@alkem.io',
  globalSpacesAdminId: '',
  globalSpacesAdminDisplayName: '',

  spaceMemberEmail: 'space.member@alkem.io',
  spaceMemberId: '',
  spaceMemberDisplayName: '',

  spaceAdminEmail: 'space.admin@alkem.io',
  spaceAdminId: '',
  spaceAdminDisplayName: '',

  challengeAdminEmail: 'challenge.admin@alkem.io',
  challengeAdminId: '',
  challengeAdminDisplayName: '',

  challengeMemberEmail: 'challenge.member@alkem.io',
  challengeMemberId: '',
  challengeMemberDisplayName: '',

  opportunityAdminEmail: 'opportunity.admin@alkem.io',
  opportunityAdminId: '',
  opportunityAdminDisplayName: '',

  opportunityMemberEmail: 'opportunity.member@alkem.io',
  opportunityMemberId: '',
  opportunityMemberDisplayName: '',

  nonSpaceMemberEmail: 'non.space@alkem.io',
  nonSpaceMemberId: '',
  nonSpaceDisplayName: '',

  qaUserEmail: 'qa.user@alkem.io',
  qaUserId: '',
  qaUserProfileId: '',
  qaUserNameId: '',
  qaUserDisplayName: '',

  notificationsAdminEmail: 'notifications@alkem.io',
  notificationsAdminId: '',
};

export const entitiesId = {
  spaceId: '',
  organizationId: '',
  organizationVerificationId: '',
  organizationProfileId: '',
  organizationDisplayName: '',
  organizationNameId: '',
  spaceProfileId: '',

  spaceCommunityId: '',
  spaceUpdatesId: '',
  spaceApplicationId: '',
  spaceContextId: '',
  spaceCollaborationId: '',
  spaceCalloutId: '',
  spaceWhiteboardCalloutId: '',
  spaceDiscussionCalloutId: '',
  spaceDiscussionCalloutCommentsId: '',
  spaceTemplateId: '',
  spaceInnovationFlowTemplateOppId: '',
  spaceInnovationFlowTemplateChId: '',
  messageId: '',
  spaceCommunicationId: '',
  discussionId: '',
  challengeId: '',
  challengeNameId: '',
  challengeProfileId: '',
  challengeCommunityId: '',
  challengeUpdatesId: '',
  challengeCommunicationId: '',
  challengeContextId: '',
  challengeCollaborationId: '',
  challengeCalloutId: '',
  challengeWhiteboardCalloutId: '',
  challengeDiscussionCalloutId: '',
  challengeDiscussionCalloutCommentsId: '',
  opportunityId: '',
  opportunityNameId: '',
  opportunityProfileId: '',
  opportunityCommunityId: '',
  opportunityUpdatesId: '',
  opportunityCommunicationId: '',

  opportunityContextId: '',
  opportunityCollaborationId: '',

  opportunityCalloutId: '',
  opportunityWhiteboardCalloutId: '',
  opportunityDiscussionCalloutId: '',
  opportunityDiscussionCalloutCommentsId: '',
  whiteboardTemplateId: '',
};

export const assignUsersForPostTests = async () => {
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.spaceAdminId
    )
  );

  await mutation(
    assignSpaceAdmin,
    userAsSpaceAdminVariablesData(users.spaceAdminId, entitiesId.spaceId)
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.spaceMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.qaUserId
    )
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      users.spaceMemberId
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
    userAsChallengeAdminVariablesData(
      users.spaceMemberId,
      entitiesId.challengeId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      users.spaceMemberId
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
      users.spaceMemberId,
      entitiesId.opportunityId
    )
  );
};
