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
  roleSetId: string;
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
    accountId: string;
    agentId: string;
    verificationId: string;
    displayName: string;
  };
  space: CommonSpaceIds & {
    applicationId: string;
    templateId: string;
    templateSetId: string;
    subspaceCollaborationTemplateId: string;
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
    accountId: '',
    nameId: '',
    profileId: '',
    agentId: '',
    verificationId: '',
    displayName: '',
  },
  space: {
    applicationId: '',
    profileId: '',
    communityId: '',
    roleSetId: '',
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
    subspaceCollaborationTemplateId: '',
  },
  challenge: {
    id: '',
    nameId: '',
    profileId: '',
    communityId: '',
    roleSetId: '',
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
    roleSetId: '',
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
