/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SpacePrivacyMode,
  CommunityMembershipPolicy,
} from '@alkemio/client-lib';
import { delay, getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  CreateSpaceOnAccountInput,
  SpaceSortMode,
  SpaceVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { getAccountMainEntities } from '@functional-api/account/account.params.request';
const uniqueId = UniqueIDGenerator.getID();

export const spaceName = `testEcoName${uniqueId}`;
export const spaceNameId = `testecoeid${uniqueId}`;

export const createSpaceBasicData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  addTutorialCallouts = true,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const spaceData: CreateSpaceOnAccountInput = {
    nameID: spaceNameId,
    about: {
      profileData: {
        displayName: spaceName,
      },
    },
    collaborationData: {
      addTutorialCallouts,
      calloutsSetData: {},
    },
    accountID,
  };
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSpaceBasicData(
      {
        spaceData,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Account-space creation resilient to the ENV_FAILURE retry-after-commit race,
 * mirroring `createSubspaceOrFail`.
 *
 * On a ~5s connection reset `graphqlErrorWrapper` retries the create, but the
 * root space may already have committed (reserving the nameID), so the retry
 * comes back as `nameID already taken` (BAD_USER_INPUT). The space *does* exist;
 * recover it by looking it up under its owning account by nameID rather than
 * failing a test for a create that actually succeeded (the 2026-07-15
 * `space1-… already taken` entitlements failure, test-suites#563).
 *
 * A preflight lookup establishes provenance: we reject a nameID that already
 * exists *before* creating, so the recovery only ever returns a space this call
 * committed — never a pre-existing one, which would hide a genuine duplicate.
 *
 * The lookup POLLS: like subspaces, root-space creation is not atomic — the
 * space row lands first and community/collaboration keep landing for ~30s, and
 * while the space is half-built the `account.spaces` query nulls via non-null
 * bubbling on a failing child resolver. We retry until it reads clean and, if it
 * never does, throw with both the create error and the last lookup failure.
 */
const RECOVERY_LOOKUP_ATTEMPTS = 10;
const RECOVERY_LOOKUP_DELAY_MS = 5000;
export const createSpaceBasicDataOrFail = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  addTutorialCallouts = true,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => {
  // Preflight for provenance: if the nameID is already on the account BEFORE we
  // create, a later `already taken` is a GENUINE duplicate — not our own
  // retry-after-commit — and the recovery below would wrongly return that
  // pre-existing space, hiding the failure. Reject it up front so the recovery
  // can trust that any `already taken` is our own committed-then-retried create.
  // (Belt-and-suspenders for the nightly: nameIDs are run-unique on a per-run
  // fresh DB and the single worker has no concurrent creator; a lookup that
  // errors/half-reads fails open, since it cannot prove pre-existence.)
  const preflight = await getAccountMainEntities(accountID, userRole);
  const preflightSpaces = preflight.data?.lookup?.account?.spaces as
    | Array<{ id: string; nameID: string }>
    | undefined;
  if (preflightSpaces?.some(s => s.nameID === spaceNameId)) {
    throw new Error(
      `Refusing to create space '${spaceName}': nameID '${spaceNameId}' already exists on account '${accountID}' before creation — genuine duplicate, not a retry-after-commit`
    );
  }

  const response = await createSpaceBasicData(
    spaceName,
    spaceNameId,
    accountID,
    addTutorialCallouts,
    userRole
  );
  const id = response.data?.createSpace?.id;
  if (id) {
    return id;
  }

  const alreadyTaken = response.error?.errors?.some(e =>
    String((e as { message?: unknown }).message ?? '').includes(
      'nameID is already taken'
    )
  );
  const createDetail = response.error
    ? JSON.stringify(response.error.errors)
    : 'server returned no createSpace.id and no error';

  if (alreadyTaken) {
    let lastLookupDetail = '';
    for (let attempt = 1; attempt <= RECOVERY_LOOKUP_ATTEMPTS; attempt++) {
      const existing = await getAccountMainEntities(accountID, userRole);
      const spaces = existing.data?.lookup?.account?.spaces as
        | Array<{ id: string; nameID: string }>
        | undefined;
      if (existing.error || !spaces) {
        // Half-built space (or a transient env failure): record why and retry.
        lastLookupDetail = `lookup failed: ${JSON.stringify(
          existing.error?.errors ?? 'no data'
        )}`;
      } else {
        const match = spaces.find(s => s.nameID === spaceNameId);
        if (match?.id) {
          return match.id;
        }
        lastLookupDetail = `no space with nameID '${spaceNameId}' among [${spaces
          .map(s => s.nameID)
          .join(', ')}]`;
      }
      if (attempt < RECOVERY_LOOKUP_ATTEMPTS) {
        await delay(RECOVERY_LOOKUP_DELAY_MS);
      }
    }
    throw new Error(
      `Failed to create space '${spaceName}' (nameID '${spaceNameId}', account '${accountID}'): create reported '${createDetail}' and the committed-create recovery did not stabilise after ${RECOVERY_LOOKUP_ATTEMPTS} lookups: ${lastLookupDetail}`
    );
  }

  throw new Error(
    `Failed to create space '${spaceName}' (nameID '${spaceNameId}', account '${accountID}'): ${createDetail}`
  );
};

export const createSpaceAndGetData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const response = await createSpaceBasicData(
    spaceName,
    spaceNameId,
    accountID,
    false,
    role
  );

  const spaceId = response?.data?.createSpace.id ?? '';
  await updateSpaceSettings(spaceId, {
    privacy: { allowPlatformSupportAsAdmin: true },
  });

  const spaceData = await getSpaceData(spaceId);

  return spaceData;
};

export const getSpacesCount = async () => {
  const res = await getSpacesData();
  const spacesData = res?.data?.spaces ?? [];
  const count = Object.keys(spacesData[0]).length;
  return count;
};

export const getSpaceData = async (
  spaceId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getSpaceCommunication = async (
  spaceId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceCommunication(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getSpacesData = async (role = TestUser.GLOBAL_ADMIN) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getRoleSetUserPrivilege = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetUserPrivileges(
      { roleSetId: roleSetId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getPrivateSpaceData = async (
  nameId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.PrivateSpaceData(
      {
        nameId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const spaceId = async (): Promise<any> => {
  const responseQuery = await getSpaceData();

  const response = responseQuery?.data?.lookup?.space?.id;
  return response;
};

export const deleteSpace = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteSpace(
      {
        deleteData: {
          ID: spaceId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpacePlatformSettings = async (
  spaceId: string,
  nameId: any,
  visibility: SpaceVisibility,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpacePlatformSettings(
      {
        spaceId,
        nameId,
        visibility,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceSettings = async (
  spaceID: string,
  // options?: {
  settings?: {
    privacy?: {
      mode?: SpacePrivacyMode;
      allowPlatformSupportAsAdmin?: boolean;
    };
    membership?: {
      allowSubspaceAdminsToInviteMembers?: boolean;
      policy?: CommunityMembershipPolicy;
      trustedOrganizations?: string[];
    };
    collaboration?: {
      allowMembersToCreateCallouts?: boolean;
      allowMembersToCreateSubspaces?: boolean;
      inheritMembershipRights?: boolean;
      allowEventsFromSubspaces?: boolean;
      allowMembersToVideoCall?: boolean;
      allowGuestContributions?: boolean;
    };
    sortMode?: SpaceSortMode;
  },

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  if (!spaceID) {
    throw new Error('Space ID is required');
  }
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceSettings(
      {
        // todo: defaults?
        settingsData: {
          spaceID,
          settings: {
            privacy: {
              // mode: settings?.privacy?.mode || SpacePrivacyMode.Private, // todo
              mode: settings?.privacy?.mode, // todo
              allowPlatformSupportAsAdmin:
                settings?.privacy?.allowPlatformSupportAsAdmin || true,
            },
            membership: {
              allowSubspaceAdminsToInviteMembers:
                settings?.membership?.allowSubspaceAdminsToInviteMembers ??
                true,
              policy:
                settings?.membership?.policy || CommunityMembershipPolicy.Open,
              trustedOrganizations: [],
            },
            collaboration: {
              allowMembersToCreateCallouts:
                settings?.collaboration?.allowMembersToCreateCallouts || false,
              allowMembersToCreateSubspaces:
                settings?.collaboration?.allowMembersToCreateSubspaces || false,
              inheritMembershipRights:
                settings?.collaboration?.inheritMembershipRights ?? true,
              allowEventsFromSubspaces:
                settings?.collaboration?.allowEventsFromSubspaces || true,
              allowMembersToVideoCall:
                settings?.collaboration?.allowMembersToVideoCall ?? true,
              allowGuestContributions:
                settings?.collaboration?.allowGuestContributions ?? false,
            },
            ...(settings?.sortMode !== undefined && {
              sortMode: settings.sortMode,
            }),
          }, // Add an empty object for the settings property
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceLocation = async (
  spaceId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateSpace(
      {
        spaceData: {
          ID: spaceId,
          about: {
            profile: { location: { country, city } },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceContext = async (
  spaceId: string,
  displayName?: string,
  options?: {
    why?: string | 'Updated Why';
    who?: string | 'Updated Who';
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateSubspace(
      {
        spaceData: {
          ID: spaceId,
          about: {
            profile: { displayName },
            ...options,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpacesFilteredByVisibilityWithAccess = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesFilteredByVisibilityWithAccess(
      {
        spaceIDs: spaceId,
        spaceFilter: {
          visibilities: [
            SpaceVisibility.Archived,
            SpaceVisibility.Active,
            SpaceVisibility.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpacesFilteredByVisibilityNoAccess = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesFilteredByVisibilityWithAccess(
      {
        spaceIDs: spaceId,
        spaceFilter: {
          visibilities: [
            SpaceVisibility.Archived,
            SpaceVisibility.Active,
            SpaceVisibility.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getUserRoleSpacesVisibility = async (
  actorID: string,
  visibility: SpaceVisibility,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  if (actorID.length !== 36) {
    throw new Error(`Invalid actor ID: ${actorID}`);
  }
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserRoles(
      {
        rolesData: {
          actorID,
          filter: { visibilities: [visibility] },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
