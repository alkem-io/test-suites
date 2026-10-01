import { expect } from 'vitest';
import { rawRead, rawRequest } from '../raw-request';
import { bearer } from '../types';
import type { GroupModule } from '../types';

/**
 * A11 — operational machinery. Owner: Platform Operations Admin.
 *
 * Most of these jobs act on the whole platform, so their positives live in the
 * exclusive project; here they only have to be REFUSED for the other 13 roles.
 * The few that take a target get a throwaway one: an organization profile for
 * the avatar job, a space community for the communications job.
 */
type Toggle = { capability: string; enabled: boolean };
type A11 = {
  organizationId: string;
  profileId: string;
  spaceId: string;
  communityId: string;
  assistant: { id: string; capabilityGrant: Toggle[] };
  /** Written by the exclusive positive on top of the snapshot, then removed. */
  probeCapability: string;
};

/** A well-formed room id that no Matrix room carries. */
const ABSENT_ROOM_ID = '00000000-0000-4000-8000-000000000001';

const ORGANIZATION_PROFILE =
  'query($id: UUID!) { lookup { organization(ID: $id) { profile { id } } } }';
const SPACE_COMMUNITY =
  'query($id: UUID!) { lookup { space(ID: $id) { community { id } } } }';
const MY_ACCOUNT =
  'query { me { user { account { id spaces { id nameID } } } } }';
const DELETE_SPACE =
  'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }';
const NAME_PREFIX = 'pr-a11-';
const STALE_AFTER_MS = 15 * 60_000;
const ASSISTANT =
  'query { platformAdmin { virtualAssistant { id capabilityGrant { capability enabled } } } }';

/**
 * A space this group created in a run that started long enough ago to be dead.
 * The name carries the run id, which is that run's start time in base 36 —
 * anything that does not decode to a recent date is not ours to delete.
 */
const isStale = (nameID: string): boolean => {
  if (!nameID.startsWith(NAME_PREFIX)) return false;
  const startedAt = parseInt(nameID.slice(NAME_PREFIX.length), 36);
  const age = Date.now() - startedAt;
  return age > STALE_AFTER_MS && age < 365 * 24 * 3_600_000;
};

/**
 * The ONE read in this group that no target role can make:
 * `platformAdmin.virtualAssistant` is gated on the legacy `platform-admin`
 * privilege, which none of the 14 roles holds — not even Platform Operations
 * Admin, who owns the mutation this field is the documented discovery path for.
 * Until the server re-gates it, the break-glass account is the only reader.
 */
const readAssistantAsLegacyAdmin = async (
  bootstrapToken: string
): Promise<A11['assistant']> =>
  (
    await rawRead<{ platformAdmin: { virtualAssistant: A11['assistant'] } }>(
      bootstrapToken,
      ASSISTANT
    )
  ).platformAdmin.virtualAssistant;

const name = (runId: string) =>
  `${NAME_PREFIX}${runId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 25);

export const A11_GROUP: GroupModule<A11> = {
  group: 'A11',

  // Platform Support creates the organization. The space is hosted by Feature
  // VC Campaign on its own account — a Feature role whose license entitles it to
  // host spaces. Platform Content Full Access reads the ids back.
  build: async (ctx, sdk) => {
    const reader = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;

    const organizationId = (
      await sdk.PlatformRolesCreateOrganization(
        {
          organizationData: {
            nameID: name(ctx.runId),
            profileData: { displayName: `platform-roles a11 ${ctx.runId}` },
          },
        },
        bearer(ctx.tokens.PLATFORM_SUPPORT)
      )
    ).data.createOrganization.id;
    const profileId = (
      await rawRead<{
        lookup: { organization: { profile: { id: string } } | null };
      }>(reader, ORGANIZATION_PROFILE, { id: organizationId })
    ).lookup.organization?.profile.id;
    if (!profileId) {
      throw new Error(`A11: no profile id for organization ${organizationId}`);
    }

    const account = (
      await rawRead<{
        me: {
          user: {
            account: {
              id: string;
              spaces: { id: string; nameID: string }[];
            } | null;
          };
        };
      }>(ctx.tokens.FEATURE_VC_CAMPAIGN, MY_ACCOUNT)
    ).me.user.account;
    if (!account) {
      throw new Error(
        'A11: Feature VC Campaign could not read its own account'
      );
    }
    // The host's license allows three spaces, and a run that died before its
    // teardown leaves one behind: reclaim this group's own dead spaces first.
    for (const space of account.spaces.filter(s => isStale(s.nameID))) {
      await rawRead(ctx.tokens.FEATURE_VC_CAMPAIGN, DELETE_SPACE, {
        id: space.id,
      });
    }
    const accountId = account.id;
    const spaceId = (
      await sdk.CreateSpaceBasicData(
        {
          spaceData: {
            accountID: accountId,
            nameID: name(ctx.runId),
            about: {
              profileData: { displayName: `platform-roles a11 ${ctx.runId}` },
            },
            collaborationData: { calloutsSetData: {} },
          },
        },
        bearer(ctx.tokens.FEATURE_VC_CAMPAIGN)
      )
    ).data.createSpace.id;
    const communityId = (
      await rawRead<{
        lookup: { space: { community: { id: string } } | null };
      }>(reader, SPACE_COMMUNITY, { id: spaceId })
    ).lookup.space?.community.id;
    if (!communityId) {
      throw new Error(`A11: no community id for space ${spaceId}`);
    }

    return {
      organizationId,
      profileId,
      spaceId,
      communityId,
      assistant: await readAssistantAsLegacyAdmin(ctx.bootstrapToken),
      probeCapability: `platform-roles-probe-${ctx.runId}`,
    };
  },

  teardown: async (ctx, sdk, fx) => {
    const failures: string[] = [];
    const remove = async (token: string, mutation: string, id: string) => {
      const { errors } = await rawRequest(token, mutation, { id });
      if (errors.length > 0) failures.push(`${id}: ${errors[0].message}`);
    };
    await remove(ctx.tokens.FEATURE_VC_CAMPAIGN, DELETE_SPACE, fx.spaceId);
    await remove(
      ctx.tokens.PLATFORM_SUPPORT,
      'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
      fx.organizationId
    );

    // Only the exclusive positive writes the grant, and it restores it itself;
    // this matters when that positive died between its write and its restore.
    const current = await readAssistantAsLegacyAdmin(ctx.bootstrapToken);
    if (
      current.capabilityGrant.some(t => t.capability === fx.probeCapability)
    ) {
      await restoreGrant(sdk, ctx.tokens.PLATFORM_OPERATIONS_ADMIN, fx);
    }
    if (failures.length > 0) {
      throw new Error(`A11: not deleted — ${failures.join('; ')}`);
    }
  },

  invocations: {
    'A11.cleanupCollections': {
      gate: ['cleanupCollections'],
      call: (sdk, headers) => sdk.cleanupCollections({}, headers),
      verify: async ({ data }) =>
        expect(data).toEqual({ cleanupCollections: { success: true } }),
      // No vector store on this stack: the Chroma client cannot connect.
      acceptFailure: /^UNSPECIFIED: fetch failed$/,
    },
    'A11.updateAssistantActorCapabilities': {
      gate: ['updateAssistantActorCapabilities'],
      call: (sdk, headers, fx) =>
        sdk.updateAssistantActorCapabilities(
          {
            grantData: {
              virtualAssistantID: fx.assistant.id,
              enabledCapabilities: [
                ...fx.assistant.capabilityGrant,
                { capability: fx.probeCapability, enabled: false },
              ],
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, sdk, data }) => {
        try {
          expect(
            (data as { updateAssistantActorCapabilities: { id: string } })
              .updateAssistantActorCapabilities.id
          ).toBe(fx.assistant.id);
          expect(
            (await readAssistantAsLegacyAdmin(ctx.bootstrapToken))
              .capabilityGrant
          ).toEqual([
            ...fx.assistant.capabilityGrant,
            { capability: fx.probeCapability, enabled: false },
          ]);
        } finally {
          await restoreGrant(sdk, ctx.tokens.PLATFORM_OPERATIONS_ADMIN, fx);
        }
        expect(
          (await readAssistantAsLegacyAdmin(ctx.bootstrapToken)).capabilityGrant
        ).toEqual(fx.assistant.capabilityGrant);
      },
    },
    'A11.adminInAppNotificationsPrune': {
      gate: ['adminInAppNotificationsPrune'],
      call: (sdk, headers) => sdk.adminInAppNotificationsPrune({}, headers),
      verify: async ({ data }) =>
        expect(
          (
            data as {
              adminInAppNotificationsPrune: {
                removedCountExceedingUserLimit: number;
              };
            }
          ).adminInAppNotificationsPrune.removedCountExceedingUserLimit
        ).toBeGreaterThanOrEqual(0),
    },
    'A11.adminUpdateContributorAvatars': {
      gate: ['adminUpdateContributorAvatars'],
      call: (sdk, headers, fx) =>
        sdk.adminUpdateContributorAvatars({ profileID: fx.profileId }, headers),
      verify: async ({ data, fx }) =>
        expect(data).toEqual({
          adminUpdateContributorAvatars: { id: fx.profileId },
        }),
    },
    'A11.adminUpdateGeoLocationData': {
      gate: ['adminUpdateGeoLocationData'],
      call: (sdk, headers) => sdk.adminUpdateGeoLocationData({}, headers),
      // `false` is a success too: it is what the job answers where the
      // geolocation provider is switched off.
      verify: async ({ data }) =>
        expect([true, false]).toContain(
          (data as { adminUpdateGeoLocationData: boolean })
            .adminUpdateGeoLocationData
        ),
    },
    'A11.adminSearchIngestFromScratch': {
      gate: ['adminSearchIngestFromScratch'],
      call: (sdk, headers) => sdk.AdminSearchIngestFromScratch({}, headers),
      // The server answers with the id of the ingest task it started.
      verify: async ({ data }) =>
        expect(
          (data as { adminSearchIngestFromScratch: string })
            .adminSearchIngestFromScratch
        ).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/),
    },
    'A11.migrateLegacyMemoContent': {
      gate: ['migrateLegacyMemoContent'],
      call: (sdk, headers) => sdk.migrateLegacyMemoContent({}, headers),
      verify: async ({ data }) => {
        const { total, migrated } = (
          data as {
            migrateLegacyMemoContent: { total: number; migrated: number };
          }
        ).migrateLegacyMemoContent;
        expect(migrated).toBeLessThanOrEqual(total);
      },
    },
    'A11.migrateLegacyWhiteboardContent': {
      gate: ['migrateLegacyWhiteboardContent'],
      call: (sdk, headers) => sdk.migrateLegacyWhiteboardContent({}, headers),
      verify: async ({ data }) => {
        const { total, migrated } = (
          data as {
            migrateLegacyWhiteboardContent: { total: number; migrated: number };
          }
        ).migrateLegacyWhiteboardContent;
        expect(migrated).toBeLessThanOrEqual(total);
      },
    },
    'A11.refreshAllBodiesOfKnowledge': {
      gate: ['refreshAllBodiesOfKnowledge'],
      call: (sdk, headers) => sdk.refreshAllBodiesOfKnowledge({}, headers),
      verify: async ({ data }) =>
        expect(data).toEqual({ refreshAllBodiesOfKnowledge: true }),
    },
    'A11.adminCommunicationEnsureAccessToCommunications': {
      gate: ['adminCommunicationEnsureAccessToCommunications'],
      call: (sdk, headers, fx) =>
        sdk.adminCommunicationEnsureAccessToCommunications(
          { communicationData: { communityID: fx.communityId } },
          headers
        ),
      verify: async ({ data }) =>
        expect(data).toEqual({
          adminCommunicationEnsureAccessToCommunications: true,
        }),
    },
    'A11.adminCommunicationRemoveOrphanedRoom': {
      gate: ['adminCommunicationRemoveOrphanedRoom'],
      call: (sdk, headers) =>
        sdk.adminCommunicationRemoveOrphanedRoom(
          { orphanedRoomData: { roomID: ABSENT_ROOM_ID } },
          headers
        ),
      // The adapter treats deleting an absent room as done.
      verify: async ({ data }) =>
        expect(data).toEqual({ adminCommunicationRemoveOrphanedRoom: true }),
      acceptFailure: /^MATRIX_ENTITY_NOT_FOUND_ERROR: /,
    },
    'A11.adminCommunicationUpdateRoomState': {
      gate: ['adminCommunicationUpdateRoomState'],
      call: (sdk, headers) =>
        sdk.adminCommunicationUpdateRoomState(
          {
            roomStateData: {
              roomID: ABSENT_ROOM_ID,
              isPublic: false,
              isWorldVisible: false,
            },
          },
          headers
        ),
      acceptFailure:
        /^MATRIX_ENTITY_NOT_FOUND_ERROR: Communication adapter getRoom failed: Room not found$/,
    },
    'A11.adminCommunicationMigrateOrphanedConversations': {
      gate: ['adminCommunicationMigrateOrphanedConversations'],
      call: (sdk, headers) =>
        sdk.adminCommunicationMigrateOrphanedConversations({}, headers),
      verify: async ({ data }) =>
        expect(
          (
            data as {
              adminCommunicationMigrateOrphanedConversations: {
                migrated: number;
              };
            }
          ).adminCommunicationMigrateOrphanedConversations.migrated
        ).toBeGreaterThanOrEqual(0),
    },
    'A11.adminCommunicationSyncSpaceHierarchy': {
      gate: ['adminCommunicationSyncSpaceHierarchy'],
      call: (sdk, headers) =>
        sdk.adminCommunicationSyncSpaceHierarchy({}, headers),
      verify: async ({ data }) =>
        expect(data).toEqual({ adminCommunicationSyncSpaceHierarchy: true }),
    },
  },
};

const restoreGrant = async (
  sdk: Parameters<GroupModule<A11>['teardown']>[1],
  operationsAdminToken: string,
  fx: A11
): Promise<void> => {
  await sdk.updateAssistantActorCapabilities(
    {
      grantData: {
        virtualAssistantID: fx.assistant.id,
        enabledCapabilities: fx.assistant.capabilityGrant,
      },
    },
    bearer(operationsAdminToken)
  );
};
