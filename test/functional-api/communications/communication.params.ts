import { ForumDiscussionCategory } from '@test/generated/alkemio-schema';
import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const sendMessageToRoom = async (
  roomID: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.SendMessageToRoom(
      {
        messageData: {
          roomID,
          message,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const sendMessageToUser = async (
  receiverIds: string[],
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.SendMessageToUser(
      {
        messageData: {
          receiverIds,
          message,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const sendMessageToOrganization = async (
  organizationId: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.SendMessageToOrganization(
      {
        messageData: {
          organizationId,
          message,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const sendMessageToCommunityLeads = async (
  communityId: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.SendMessageToCommunityLeads(
      {
        messageData: {
          communityId,
          message,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeMessageOnRoom = async (
  roomID: string,
  messageID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveMessageOnRoom(
      {
        messageData: {
          roomID,
          messageID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformForumData = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformForumData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformDiscussionsData = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformDiscussionsData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformDiscussionsDataById = async (
  discussionId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformDiscussionsDataById(
      {
        discussionId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformDiscussionsDataByTitle = async (title: string) => {
  const platformDiscussions = await getPlatformDiscussionsData();
  const allDiscussions = platformDiscussions?.data?.platform.forum.discussions;
  const filteredDiscussion = allDiscussions?.filter(
    (obj: { profile: { displayName: string } }) => {
      return obj.profile.displayName === title;
    }
  );
  return filteredDiscussion;
};

export const deleteDiscussion = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteDiscussion(
      {
        deleteData: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createDiscussion = async (
  forumID: string,
  title = 'Default title',
  category: ForumDiscussionCategory = ForumDiscussionCategory.PlatformFunctionalities,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateDiscussion(
      {
        createData: {
          forumID,
          profile: {
            displayName: title,
          },
          category,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateDiscussion = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
    category?: ForumDiscussionCategory;
  }
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateDiscussion(
      {
        updateData: {
          ID,
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
