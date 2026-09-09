import { ForumDiscussionCategory } from '@alkemio/client-lib/dist/types/alkemio-schema';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

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
    graphqlClient.sendMessageToUsers(
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

// The two calls below talk to the raw GraphQL endpoint via `graphqlRequestAuth`
// (supertest-based) instead of the generated SDK: the checked-in codegen
// output was generated before the platform forum grew a discussionCategories
// field and an adminForumRemoveDiscussionCategory mutation, and regenerating
// it requires a live server. Wire names travel over GraphQL by name, so this
// is a correct way to exercise both against a server that already has them.
// See `mcp-api-keys-containment.it-spec.ts` for the same pattern.

const PLATFORM_FORUM_DISCUSSION_CATEGORIES_QUERY = `
  query PlatformForumDiscussionCategories {
    platform {
      forum {
        id
        discussionCategories
      }
    }
  }
`;

export const getPlatformForumDiscussionCategories = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string[] | undefined> => {
  const response = await graphqlRequestAuth(
    {
      operationName: 'PlatformForumDiscussionCategories',
      query: PLATFORM_FORUM_DISCUSSION_CATEGORIES_QUERY,
      variables: {},
    },
    userRole
  );

  return response?.body?.data?.platform?.forum?.discussionCategories;
};

const ADMIN_FORUM_REMOVE_DISCUSSION_CATEGORY_MUTATION = `
  mutation AdminForumRemoveDiscussionCategory($removeData: ForumRemoveDiscussionCategoryInput!) {
    adminForumRemoveDiscussionCategory(removeData: $removeData) {
      id
      discussionCategories
    }
  }
`;

export const adminRemoveForumDiscussionCategory = async (
  category: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'AdminForumRemoveDiscussionCategory',
      query: ADMIN_FORUM_REMOVE_DISCUSSION_CATEGORY_MUTATION,
      variables: { removeData: { category } },
    },
    userRole
  );
};
