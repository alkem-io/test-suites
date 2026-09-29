import { createHash } from 'crypto';
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

// HELP is one of the four permanent target categories (060 forum category
// reorganisation); the legacy PLATFORM_FUNCTIONALITIES default is a
// retirement candidate and must not be the harness's silent fallback
// (test-suites forum-discussions-test-plan.md, U-4).
export const createDiscussion = async (
  forumID: string,
  title = 'Default title',
  category: ForumDiscussionCategory = ForumDiscussionCategory.Help,
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

// --- 061 Matrix hierarchy reconcile helpers -------------------------------
// Raw graphqlRequestAuth, same rationale as the two helpers above: the
// checked-in generated SDK predates these server mutations/queries. See
// forum-discussions-test-plan.md (061) for the case list these back.

const GET_DISCUSSION_IDENTITY_QUERY = `
  query GetDiscussionIdentity($discussionId: UUID!) {
    platform {
      forum {
        discussion(ID: $discussionId) {
          id
          nameID
          category
          profile {
            url
          }
          comments {
            id
            messagesCount
          }
        }
      }
    }
  }
`;

export const getDiscussionIdentity = async (
  discussionId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'GetDiscussionIdentity',
      query: GET_DISCUSSION_IDENTITY_QUERY,
      variables: { discussionId },
    },
    userRole
  );
};

const RECONCILE_FORUM_HIERARCHY_MUTATION = `
  mutation AdminCommunicationReconcileForumHierarchy($reconcileData: AdminCommunicationReconcileForumHierarchyInput!) {
    adminCommunicationReconcileForumHierarchy(reconcileData: $reconcileData)
  }
`;

export type ReconcileForumHierarchyData = {
  dryRun?: boolean;
  pruneUnknown?: boolean;
  repairRoomParentPointers?: boolean;
  maxOperations?: number;
};

/**
 * `userRole: undefined` sends the request unauthenticated (anonymous) — see
 * N-7's anonymous row.
 */
export const reconcileForumHierarchy = async (
  data: ReconcileForumHierarchyData = {},
  userRole?: TestUser
) => {
  return graphqlRequestAuth(
    {
      operationName: 'AdminCommunicationReconcileForumHierarchy',
      query: RECONCILE_FORUM_HIERARCHY_MUTATION,
      variables: { reconcileData: data },
    },
    userRole
  );
};

const SYNC_SPACE_HIERARCHY_MUTATION = `
  mutation AdminCommunicationSyncSpaceHierarchy {
    adminCommunicationSyncSpaceHierarchy
  }
`;

export const syncSpaceHierarchy = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'AdminCommunicationSyncSpaceHierarchy',
      query: SYNC_SPACE_HIERARCHY_MUTATION,
      variables: {},
    },
    userRole
  );
};

const GET_TASK_QUERY = `
  query GetTask($id: UUID!) {
    task(id: $id) {
      id
      status
      results
      errors
    }
  }
`;

export type TaskData = {
  id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ERRORED';
  results?: string[] | null;
  errors?: string[] | null;
};

export const getTask = async (
  id: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'GetTask',
      query: GET_TASK_QUERY,
      variables: { id },
    },
    userRole
  );
};

/**
 * Polls `task(id)` every second until its status is no longer IN_PROGRESS,
 * up to a 90s cap (061 build sheet). Returns whatever the last read was —
 * callers assert on the terminal status, which may be COMPLETED or ERRORED.
 */
export const waitForTaskSettled = async (
  id: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  { pollMs = 1_000, capMs = 90_000 }: { pollMs?: number; capMs?: number } = {}
): Promise<TaskData | undefined> => {
  const deadline = Date.now() + capMs;
  let last: TaskData | undefined;
  while (Date.now() < deadline) {
    const res = await getTask(id, userRole);
    last = res?.body?.data?.task as TaskData | undefined;
    if (last && last.status !== 'IN_PROGRESS') {
      return last;
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  return last;
};

/**
 * `results` carries one string per completed pass, prefixed by the
 * TaskService with an ISO timestamp and `::` before the message itself:
 * `[<ISO timestamp>]::Reconcile pass complete: <JSON>` (observed live,
 * 2026-09-29; message text from server
 * `admin.communication.forum.hierarchy.reconcile.service.ts`). Matched with
 * `indexOf`, not `startsWith`, to stay correct regardless of that prefix's
 * exact shape. Returns `undefined` if no such entry is present (e.g. the
 * pass never reached the summary line — an ERRORED-before-summary task).
 */
export const parseReconcileSummary = (
  task: TaskData | undefined
): Record<string, unknown> | undefined => {
  const marker = 'Reconcile pass complete: ';
  const line = task?.results?.find(result => result.includes(marker));
  if (!line) return undefined;
  return JSON.parse(line.slice(line.indexOf(marker) + marker.length));
};

// --- Deterministic forum-category Matrix space id -------------------------
// Duplicated from server `src/common/constants/forum.constants.ts`
// (`getForumCategoryContextId` / `FORUM_CATEGORY_NAMESPACE`) rather than
// imported: the harness has no dependency on the server's source tree. The
// `uuid` package is not a dependency of this workspace, so a minimal
// RFC 4122 v5 (namespace + SHA-1) implementation is inlined here instead of
// adding one for a single derivation.
const FORUM_CATEGORY_NAMESPACE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const uuidv5 = (name: string, namespace: string): string => {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1')
    .update(Buffer.concat([namespaceBytes, nameBytes]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

/**
 * Deterministic Matrix space (context) id for a forum category, matching
 * server `getForumCategoryContextId(forum.id, category)`. `category` MUST be
 * the server's stored kebab-case wire value (e.g. `'tips-and-tricks'`, not
 * `'TIPS_AND_TRICKS'`) — see `common/enums/forum.discussion.category.ts`.
 * The forum space's OWN context id is simply the forum id itself (no
 * derivation) — see `admin.communication.space.sync.service.ts`.
 */
export const forumCategorySpaceId = (
  forumId: string,
  category: string
): string => uuidv5(`${forumId}:category:${category}`, FORUM_CATEGORY_NAMESPACE);
