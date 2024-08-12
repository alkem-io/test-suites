import { getMails } from '@test/utils/mailslurper.rest.requests';

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

interface CommonSpaceIds {
  profileId: string;
  communityId: string;
  updatesId: string;
  communicationId: string;
  contextId: string;
  collaborationId: string;
  calloutId: string;
  whiteboardCalloutId: string;
  discussionCalloutId: string;
  discussionCalloutCommentsId: string;
}

interface ProfileableIds {
  id: string;
  nameId: string;
  profileId: string;
}
interface EntityIds {
  accountId: string;
  spaceId: string;
  whiteboardTemplateId: string;
  messageId: string;
  discussionId: string;
  organization: ProfileableIds & {
    agentId: string;
    verificationId: string;
    displayName: string;
  };
  space: CommonSpaceIds & {
    templateId: string;
    templateSetId: string;
    innovationFlowTemplateOppId: string;
    innovationFlowTemplateChId: string;
  };
  challenge: CommonSpaceIds & ProfileableIds;
  opportunity: CommonSpaceIds & ProfileableIds;
}

export const entitiesId: EntityIds = {
  accountId: '',
  spaceId: '',
  whiteboardTemplateId: '',
  messageId: '',
  discussionId: '',
  organization: {
    id: '',
    nameId: '',
    profileId: '',
    agentId: '',
    verificationId: '',
    displayName: '',
  },
  space: {
    profileId: '',
    communityId: '',
    updatesId: '',
    communicationId: '',
    contextId: '',
    collaborationId: '',
    calloutId: '',
    whiteboardCalloutId: '',
    discussionCalloutId: '',
    discussionCalloutCommentsId: '',
    templateId: '',
    templateSetId: '',
    innovationFlowTemplateOppId: '',
    innovationFlowTemplateChId: '',
  },
  challenge: {
    id: '',
    nameId: '',
    profileId: '',
    communityId: '',
    updatesId: '',
    communicationId: '',
    contextId: '',
    collaborationId: '',
    calloutId: '',
    whiteboardCalloutId: '',
    discussionCalloutId: '',
    discussionCalloutCommentsId: '',
  },
  opportunity: {
    id: '',
    nameId: '',
    profileId: '',
    communityId: '',
    updatesId: '',
    communicationId: '',
    contextId: '',
    collaborationId: '',
    calloutId: '',
    whiteboardCalloutId: '',
    discussionCalloutId: '',
    discussionCalloutCommentsId: '',
  },
};

// export const entitiesId = {
//   agentId: '',
//   accountId: '',
//   spaceId: '',
//   organizationId: '',
//   organizationVerificationId: '',
//   organizationProfileId: '',
//   organizationDisplayName: '',
//   organizationNameId: '',
//   spaceProfileId: '',

//   spaceCommunityId: '',
//   spaceUpdatesId: '',
//   spaceApplicationId: '',
//   spaceContextId: '',
//   spaceCollaborationId: '',
//   spaceCalloutId: '',
//   spaceWhiteboardCalloutId: '',
//   spaceDiscussionCalloutId: '',
//   spaceDiscussionCalloutCommentsId: '',
//   spaceTemplateId: '',
//   spaceTemplateSetId: '',
//   spaceInnovationFlowTemplateOppId: '',
//   spaceInnovationFlowTemplateChId: '',
//   messageId: '',
//   spaceCommunicationId: '',
//   discussionId: '',
//   challengeId: '',
//   challengeNameId: '',
//   challengeProfileId: '',
//   challengeCommunityId: '',
//   challengeUpdatesId: '',
//   challengeCommunicationId: '',
//   challengeContextId: '',
//   challengeCollaborationId: '',
//   challengeCalloutId: '',
//   challengeWhiteboardCalloutId: '',
//   challengeDiscussionCalloutId: '',
//   challengeDiscussionCalloutCommentsId: '',
//   opportunityId: '',
//   opportunityNameId: '',
//   opportunityProfileId: '',
//   opportunityCommunityId: '',
//   opportunityUpdatesId: '',
//   opportunityCommunicationId: '',

//   opportunityContextId: '',
//   opportunityCollaborationId: '',

//   opportunityCalloutId: '',
//   opportunityWhiteboardCalloutId: '',
//   opportunityDiscussionCalloutId: '',
//   opportunityDiscussionCalloutCommentsId: '',
//   whiteboardTemplateId: '',
// };
