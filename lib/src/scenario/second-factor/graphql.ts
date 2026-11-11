import { type GraphqlActor } from '../../utils/graphql.actor';
import {
  postGraphqlRawAs,
  type RawGraphqlResponse,
} from '../../utils/graphql.raw.client';

/**
 * The second-factor GraphQL surface, sent raw: the cases assert on the HTTP
 * status and on `errors[].extensions.code` as much as on data, which the
 * generated SDK's error wrapper would hide.
 */

export type SecondFactorRequirement = {
  covered: boolean;
  deadline: string | null;
  satisfied: boolean;
};

export type PlatformSecurity = {
  secondFactorRequiredForPlatformRoles: boolean;
  secondFactorRequiredForPlatformRolesSince: string | null;
} | null;

export type ResetResult = {
  removedCredentialTypes: string[];
  sessionsRevoked: number;
  passwordInvalidated: boolean;
};

const PLATFORM_SECURITY_FIELDS =
  'security { secondFactorRequiredForPlatformRoles secondFactorRequiredForPlatformRolesSince }';

/** The `extensions.code` of every error in a response, in order. */
export const errorCodes = (response: RawGraphqlResponse<unknown>): string[] =>
  (response.body?.errors ?? []).map(e =>
    String((e.extensions as { code?: string } | undefined)?.code)
  );

export const readSecondFactorRequirement = (actor: GraphqlActor) =>
  postGraphqlRawAs<{ me: { secondFactorRequirement: SecondFactorRequirement } }>(
    actor,
    'query { me { secondFactorRequirement { covered deadline satisfied } } }'
  );

export const readPlatformSecurity = (actor: GraphqlActor) =>
  postGraphqlRawAs<{ platform: { settings: { security: PlatformSecurity } } }>(
    actor,
    `query { platform { settings { ${PLATFORM_SECURITY_FIELDS} } } }`
  );

export const setPlatformRule = (on: boolean, actor: GraphqlActor) =>
  postGraphqlRawAs<{ updatePlatformSettings: { security: PlatformSecurity } }>(
    actor,
    `mutation($settingsData: UpdatePlatformSettingsInput!) {
       updatePlatformSettings(settingsData: $settingsData) { ${PLATFORM_SECURITY_FIELDS} }
     }`,
    { settingsData: { security: { secondFactorRequiredForPlatformRoles: on } } }
  );

export const setOrganizationRule = (
  organizationID: string,
  on: boolean,
  actor: GraphqlActor
) =>
  postGraphqlRawAs<{
    updateOrganizationSettings: {
      settings: { security: { secondFactorRequired: boolean } };
    };
  }>(
    actor,
    `mutation($settingsData: UpdateOrganizationSettingsInput!) {
       updateOrganizationSettings(settingsData: $settingsData) {
         settings { security { secondFactorRequired } }
       }
     }`,
    {
      settingsData: {
        organizationID,
        settings: { security: { secondFactorRequired: on } },
      },
    }
  );

/** `adminResetUserSecondFactor`; `invalidatePassword` has no default. */
export const resetSecondFactor = (
  userID: string,
  actor: GraphqlActor,
  options: { invalidatePassword: boolean }
) =>
  postGraphqlRawAs<{ adminResetUserSecondFactor: ResetResult }>(
    actor,
    `mutation($resetData: AdminResetUserSecondFactorInput!) {
       adminResetUserSecondFactor(resetData: $resetData) {
         removedCredentialTypes sessionsRevoked passwordInvalidated
       }
     }`,
    { resetData: { userID, invalidatePassword: options.invalidatePassword } }
  );
