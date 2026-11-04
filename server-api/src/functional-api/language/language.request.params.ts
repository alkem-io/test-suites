import { TestUser } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

/**
 * Raw GraphQL operations for feature 029 (detect signup language & persist it as
 * a user setting).
 *
 * These use `graphqlRequestAuth` rather than the generated client because the
 * lib's committed codegen output predates the 029 server schema — it has neither
 * `UpdateUserSettingsEntityInput.language` nor
 * `InviteForEntryRoleOnRoleSetInput.suggestedLanguage`. Keeping the operations
 * here means the whole feature's API contract is expressed in one file; when the
 * lib codegen is next refreshed these can move to the generated client without
 * touching the specs.
 */

/** An Invitation as the language operations select it. */
export type InvitationLanguage = {
  id: string;
  suggestedLanguage: string | null;
  actor?: { id: string } | null;
};

/** A PlatformInvitation (invited email that has no account yet). */
export type PlatformInvitationLanguage = {
  id: string;
  email: string;
  suggestedLanguage: string | null;
};

/** One entry of the `inviteForEntryRoleOnRoleSet` result array. */
export type InviteResult = {
  type: string;
  invitation?: InvitationLanguage | null;
  platformInvitation?: PlatformInvitationLanguage | null;
};

export type InviteWithLanguageOptions = {
  roleSetID: string;
  invitedActorIDs?: string[];
  invitedUserEmails?: string[];
  suggestedLanguage?: string;
  extraRoles?: RoleName[];
  welcomeMessage?: string;
};

/** `inviteForEntryRoleOnRoleSet`, optionally carrying a suggested language. */
export const inviteWithSuggestedLanguage = async (
  options: InviteWithLanguageOptions,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const invitationData: Record<string, unknown> = {
    roleSetID: options.roleSetID,
    invitedActorIDs: options.invitedActorIDs ?? [],
    invitedUserEmails: options.invitedUserEmails ?? [],
    extraRoles: options.extraRoles ?? [],
    welcomeMessage: options.welcomeMessage ?? 'Please join us.',
  };
  // Omit the field entirely when not suggesting — "absent" and "null" are
  // different inputs and FR-015 is about absence.
  if (options.suggestedLanguage !== undefined) {
    invitationData.suggestedLanguage = options.suggestedLanguage;
  }

  return graphqlRequestAuth(
    {
      operationName: 'InviteWithSuggestedLanguage',
      query: `mutation InviteWithSuggestedLanguage($invitationData: InviteForEntryRoleOnRoleSetInput!) {
        inviteForEntryRoleOnRoleSet(invitationData: $invitationData) {
          type
          invitation { id suggestedLanguage actor { id } }
          platformInvitation { id email suggestedLanguage }
        }
      }`,
      variables: { invitationData },
    },
    userRole
  );
};

/** All invitations + platform invitations on a role set, with their languages. */
export const getRoleSetInvitationLanguages = async (
  roleSetID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'RoleSetInvitationLanguages',
      query: `query RoleSetInvitationLanguages($roleSetID: UUID!) {
        lookup {
          roleSet(ID: $roleSetID) {
            invitations { id suggestedLanguage actor { id } }
            platformInvitations { id email suggestedLanguage }
          }
        }
      }`,
      variables: { roleSetID },
    },
    userRole
  );

/** A user's language settings — the per-user store the story is about. */
export const getUserLanguageSettings = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'UserLanguageSettings',
      query: `query UserLanguageSettings($userID: UUID!) {
        lookup { user(ID: $userID) { id email settings { language languageOfferAnswered } } }
      }`,
      variables: { userID },
    },
    userRole
  );

/** Write language and/or the offer-answered latch through updateUserSettings. */
export const updateUserLanguageSettings = async (
  userID: string,
  settings: { language?: string | null; languageOfferAnswered?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'UpdateUserLanguageSettings',
      query: `mutation UpdateUserLanguageSettings($settingsData: UpdateUserSettingsInput!) {
        updateUserSettings(settingsData: $settingsData) {
          id
          settings { language languageOfferAnswered }
        }
      }`,
      variables: { settingsData: { userID, settings } },
    },
    userRole
  );

/** Platform language configuration — the eligible set every other rule derives from. */
export const getLanguageConfig = async (userRole: TestUser = TestUser.GLOBAL_ADMIN) =>
  graphqlRequestAuth(
    {
      operationName: 'PlatformLanguageConfig',
      query: `query PlatformLanguageConfig {
        platform { configuration { language { eligible default } } }
      }`,
    },
    userRole
  );

export const deletePlatformInvitationById = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'DeletePlatformInvitationById',
      query: `mutation DeletePlatformInvitationById($ID: UUID!) {
        deletePlatformInvitation(deleteData: { ID: $ID }) { id }
      }`,
      variables: { ID },
    },
    userRole
  );

/** Create a platform user as the global admin — the same code path a Kratos
 *  registration finalizes through, so invitation-driven language seeding runs. */
export const createUserWithEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'CreateUserForLanguage',
      query: `mutation CreateUserForLanguage($userData: CreateUserInput!) {
        createUser(userData: $userData) {
          id
          email
          settings { language languageOfferAnswered }
        }
      }`,
      variables: {
        userData: {
          email,
          firstName,
          lastName,
          profileData: { displayName: `${firstName} ${lastName}` },
        },
      },
    },
    userRole
  );
