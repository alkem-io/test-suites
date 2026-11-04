import {
  postGraphqlRaw,
  RawGraphqlResponse,
} from '../utils/graphql.raw.client';

/**
 * 054-delete-own-account — contracts/graphql-account-deletion.md §1,
 * contracts/deleteuser-self-branch.md.
 *
 * Both calls below are raw (`postGraphqlRaw`), not codegen'd SDK operations:
 * `me.accountDeletion` and the self-branch `deleteUser` semantics are new
 * server-wave-1 surface with no `schema.graphql` snapshot in this worktree
 * yet, and the self-caller path needs an arbitrary bearer/cookie a
 * `TestUser`-keyed `graphqlErrorWrapper` call cannot carry (a freshly
 * registered disposable user, or a fabricated BFF cookie session — see
 * `scenario/registration/mint-bff-session.ts`).
 */

export type AccountDeletionBlockerKind =
  | 'ACCOUNT_SPACE'
  | 'ACCOUNT_VIRTUAL_CONTRIBUTOR'
  | 'ACCOUNT_INNOVATION_PACK'
  | 'ACCOUNT_INNOVATION_HUB'
  | 'SOLE_ORGANIZATION_OWNER';

export type AccountDeletionBlocker = {
  kind: AccountDeletionBlockerKind;
  resourceID: string;
  displayName: string;
  url?: string | null;
  selfResolvable: boolean;
};

export type AccountDeletionBlockerTotal = {
  kind: AccountDeletionBlockerKind;
  total: number;
};

export type MeAccountDeletionData = {
  me: {
    accountDeletion: {
      canDelete: boolean;
      sessionFresh: boolean;
      blockers: AccountDeletionBlocker[];
      truncated: boolean;
      totals: AccountDeletionBlockerTotal[];
      externalSubscriptionLinked: boolean;
    };
  };
};

/** contracts/graphql-account-deletion.md §1 — exact selection set. */
export const meAccountDeletionQuery = `
  query MeAccountDeletion {
    me {
      accountDeletion {
        canDelete
        sessionFresh
        blockers {
          kind
          resourceID
          displayName
          url
          selfResolvable
        }
        truncated
        totals {
          kind
          total
        }
        externalSubscriptionLinked
      }
    }
  }
`;

export type RawAuth = { bearerToken?: string; cookieHeader?: string };

/**
 * Runs the `me.accountDeletion` pre-flight as an arbitrary caller — a bearer
 * token (a `TestUser`'s, or a plain registered user's non-interactive-login
 * token) or a fabricated BFF cookie header (needed once `sessionFresh` itself
 * is under test, since the bearer path never stamps `ActorContext.issuedAt`
 * — contracts/deleteuser-self-branch.md §2).
 */
export const getMeAccountDeletion = async (
  auth: RawAuth
): Promise<RawGraphqlResponse<MeAccountDeletionData>> =>
  postGraphqlRaw<MeAccountDeletionData>(meAccountDeletionQuery, auth);

export type DeleteUserMutationData = { deleteUser: { id: string } };

/** Byte-identical to the codegen'd `deleteUser` document
 * (`scenario/graphql/mutations/user/removeUser.graphql`) — kept as an inline
 * string here only because this call needs a non-`TestUser` auth header,
 * which the codegen'd SDK client cannot carry. */
const deleteUserMutation = `
  mutation deleteUser($deleteData: DeleteUserInput!) {
    deleteUser(deleteData: $deleteData) {
      id
    }
  }
`;

/**
 * Calls `deleteUser` on the account identified by the SAME caller the
 * `bearerToken`/`cookieHeader` authenticates as — i.e. self-deletion, the
 * branch this feature hardens. `deleteUserId` is passed as `deleteData.ID`
 * per the mutation's frozen signature; the server resolves whether that ID
 * is "self" from the caller's own actor context, not from anything in the
 * input (contracts/graphql-account-deletion.md §1 — signature unchanged).
 *
 * `deleteIdentity` defaults to `false` on purpose, mirroring the shared
 * admin-facing `deleteUser` helper's default AND the pinning assertion in
 * contracts/deleteuser-self-branch.md §3: a self-caller passing `false` must
 * still end up with their Kratos identity deleted.
 */
export const deleteUserAsSelf = async (
  deleteUserId: string,
  auth: RawAuth,
  deleteIdentity = false
): Promise<RawGraphqlResponse<DeleteUserMutationData>> =>
  postGraphqlRaw<DeleteUserMutationData>(deleteUserMutation, {
    ...auth,
    variables: {
      deleteData: {
        ID: deleteUserId,
        deleteIdentity,
      },
    },
  });
