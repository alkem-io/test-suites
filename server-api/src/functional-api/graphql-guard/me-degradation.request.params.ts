/**
 * Helpers for the `me` graceful-degradation specs (server#6315 / PR #6324).
 *
 * Two things the existing harness cannot do are needed here:
 *  - carry an *arbitrary* bearer (a disposable user's token, a garbage string,
 *    or none at all) — `graphqlErrorWrapper` only accepts a `TestUser`;
 *  - see the **raw** HTTP body — the wrapper folds `BAD_USER_INPUT` and
 *    `FORBIDDEN_POLICY` into a synthetic `error` object, which is exactly the
 *    regression these specs fence.
 *
 * Hence a thin `axios` POST against the same private GraphQL endpoint. No
 * codegen'd operation covers this selection set, so the documents are inline.
 */
import {
  getGraphqlClient,
  getUserToken,
  testConfiguration,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { registerVerifiedUser } from '@functional-api/contributor-management/user/user.request.params';
import axios from 'axios';
import { randomUUID } from 'node:crypto';

/**
 * The acceptance query from `contracts/graphql-me-degradation.md` — one request
 * touching every guard that changed, plus `user` and `id` which did not.
 */
export const meCompositeQuery = `
  query MeDegradationComposite {
    me {
      id
      user {
        id
      }
      notificationsUnreadCount
      communityInvitationsCount
      communityInvitations(states: []) {
        id
      }
      communityApplications(states: []) {
        id
      }
      notifications {
        total
        inAppNotifications {
          id
        }
        pageInfo {
          hasNextPage
        }
      }
      conversations {
        conversations {
          id
        }
      }
    }
  }
`;

/** Guard 1 in isolation, with the full pageInfo the empty-page shape specifies. */
export const meNotificationsPageQuery = `
  query MeDegradationNotificationsPage {
    me {
      notifications {
        total
        inAppNotifications {
          id
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

/** Guard 7 in isolation — the nested resolver, not just its container. */
export const meConversationsQuery = `
  query MeDegradationConversations {
    me {
      conversations {
        conversations {
          id
        }
      }
    }
  }
`;

/** Who the bearer resolves to — the before/after probe around a deletion. */
export const meUserQuery = `
  query MeDegradationUser {
    me {
      id
      user {
        id
        nameID
      }
    }
  }
`;

/** The minimal selection used to compare bearer classes against each other. */
export const meIdentityProbeQuery = `
  query MeDegradationIdentityProbe {
    me {
      id
      notificationsUnreadCount
    }
  }
`;

export type MeCompositeData = {
  me: {
    id: string;
    user: { id: string } | null;
    notificationsUnreadCount: number;
    communityInvitationsCount: number;
    communityInvitations: Array<{ id: string }>;
    communityApplications: Array<{ id: string }>;
    notifications: {
      total: number;
      inAppNotifications: Array<{ id: string }>;
      pageInfo: { hasNextPage: boolean };
    };
    conversations: { conversations: Array<{ id: string }> };
  };
};

export type MeNotificationsPageData = {
  me: {
    notifications: {
      total: number;
      inAppNotifications: Array<{ id: string }>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor?: string | null;
        endCursor?: string | null;
      };
    };
  };
};

export type MeConversationsData = {
  me: { conversations: { conversations: Array<{ id: string }> } };
};

export type MeIdentityProbeData = {
  me: { id: string; notificationsUnreadCount: number };
};

export type MeUserData = {
  me: { id: string; user: { id: string; nameID: string } | null };
};

export type RawGraphqlResponse<TData> = {
  status: number;
  body: {
    data?: TData;
    errors?: Array<Record<string, unknown>>;
  };
  /** The serialised body, for assertions that scan for leaked strings. */
  raw: string;
};

/**
 * POST a document to the private GraphQL endpoint with an arbitrary bearer, or
 * none. Never throws on a non-2xx: the status/body pair *is* the assertion.
 */
export const postGraphqlRaw = async <TData>(
  query: string,
  bearerToken?: string
): Promise<RawGraphqlResponse<TData>> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      validateStatus: () => true,
    }
  );

  return {
    status: response.status,
    body: response.data,
    raw: JSON.stringify(response.data),
  };
};

export const getTokenForTestUser = (userRole: TestUser): string =>
  TestUserManager.getUserModelByType(userRole).authToken;

export type DisposableUser = {
  userId: string;
  email: string;
  /** Minted before deletion, so it survives as an orphaned-but-valid bearer. */
  token: string;
};

/**
 * A verified Kratos identity + Alkemio user that exists only to be deleted.
 * Never reuse a `TestUserManager` persona for this — deleting a shared persona
 * poisons every other suite in the run.
 */
export const createDisposableVerifiedUser = async (
  prefix = 'session-orphan'
): Promise<DisposableUser> => {
  const uniqueId = UniqueIDGenerator.getID();
  const email = `${prefix}-${uniqueId}@alkem.io`;
  const userId = await registerVerifiedUser(
    email,
    `fn${uniqueId}`,
    `ln${uniqueId}`
  );
  const token = await getUserToken(email);

  return { userId, email, token };
};

/**
 * The shared `deleteUser` helper hardcodes `deleteIdentity: true`. FR-025 needs
 * the other branch too, so this stream carries its own variant rather than
 * changing a helper the whole suite depends on.
 */
export const deleteUserWithOptions = async (
  userId: string,
  options: { deleteIdentity: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteUser(
      {
        deleteData: {
          ID: userId,
          deleteIdentity: options.deleteIdentity,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/** Cleanup delete — an already-deleted user is a success, not a failure. */
export const deleteUserTolerant = async (userId?: string) => {
  if (!userId) {
    return;
  }
  try {
    await deleteUserWithOptions(userId, { deleteIdentity: true });
  } catch {
    // Deliberately swallowed: cleanup must never fail a spec.
  }
};

/**
 * A syntactically valid, correctly-shaped HS256 JWT whose signature is
 * meaningless. Distinct from plain garbage: it gets past the parser and fails
 * verification, which is a different branch of the strategy.
 */
export const buildUnsignedHs256Bearer = (): string => {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: randomUUID(), iat: now, exp: now + 3600 });

  return `${header}.${payload}.${Buffer.from('not-a-valid-signature').toString('base64url')}`;
};
