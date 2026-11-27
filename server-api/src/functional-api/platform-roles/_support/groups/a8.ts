import { expect } from 'vitest';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import { rawRead, rawRequest } from '../raw-request';
import type { GroupModule, Headers, PerRole } from '../types';
import { NEUTRAL_ERROR_CODE } from '@functional-api/error-response/error-response.constants';
import {
  createCallout,
  createHubAsLicenseManager,
  createOwnedOrganization,
  createPack,
  createSpace,
  organizationAdminOf,
  removeOwnedOrganization,
} from './organization-content';

/**
 * A8 — delete content; set a callout's publisher. Deletes are owned by Platform
 * Content Full Access and nobody else — in particular NOT Platform Support,
 * which may edit an organization's pack and hub (A7) but never delete them.
 * Setting the publisher is shared with Platform Resource Admin (027 operator
 * amendment 2026-10-07).
 *
 * Destructive: one dedicated `doomed` target per capability, and a `kept` twin
 * that every negative aims at and that must outlive the run. The publisher
 * positive has its own callout per allowed role, so the two owners never race
 * on one entity and neither can pass on the other's write.
 * Everything sits in an organization's account, in a PRIVATE space.
 */
type Pair = { doomed: string; kept: string };

type A8 = {
  organizationId: string;
  callout: Pair;
  contribution: Pair;
  space: Pair;
  pack: Pair;
  hub: Pair;
  /** Positive targets of `updateCalloutPublishInfo`, one per allowed role;
   * negatives use `callout.kept`. */
  republishedCalloutIds: PerRole;
  publisherId: string;
};

/** 2020-01-01 — no callout created by this run can carry it by accident. */
const PUBLISH_DATE = Date.UTC(2020, 0, 1);

const OWNER = 'PLATFORM_CONTENT_FULL_ACCESS';
const PUBLISH = CAPABILITIES.find(c => c.id === 'A8.updateCalloutPublishInfo')!;

const READ = {
  callout: 'query($id: UUID!) { lookup { callout(ID: $id) { id } } }',
  contribution: 'query($id: UUID!) { lookup { contribution(ID: $id) { id } } }',
  space: 'query($id: UUID!) { lookup { space(ID: $id) { id } } }',
  pack: 'query($id: UUID!) { lookup { innovationPack(ID: $id) { id } } }',
  hub: 'query($id: UUID!) { platform { innovationHub(id: $id) { id } } }',
} as const;

/**
 * After the delete, the reader's read returns no entity and the generic code.
 * `build` made the same read with the same token (Platform Content Full
 * Access, the `reader` every spec passes) and it returned the entity with no
 * error, so this token may read it: the generic answer now means the entity is
 * gone rather than refused.
 */
const expectGone = async (
  reader: Headers,
  kind: keyof typeof READ,
  id: string
): Promise<void> => {
  const { data, errors } = await rawRequest(
    reader.authorization.replace(/^Bearer /, ''),
    READ[kind],
    { id }
  );
  expect(
    !JSON.stringify(data ?? null).includes(id),
    'no entity is returned after the delete'
  ).toBe(true);
  expect(errors.map(e => e.extensions?.code)).toEqual([NEUTRAL_ERROR_CODE]);
};

const pairOf = async (
  make: (tag: string) => Promise<string>
): Promise<Pair> => ({
  doomed: await make('doomed'),
  kept: await make('kept'),
});

export const A8_GROUP: GroupModule<A8> = {
  group: 'A8',

  build: async ctx => {
    const admin = (await organizationAdminOf()).token;
    const { organizationId, accountId } = await createOwnedOrganization(
      ctx,
      'a8'
    );
    const name = (tag: string) => `pr-a8-${tag}-${ctx.runId}`;

    const host = await createSpace(accountId, name('kept'));
    const callout = await pairOf(tag =>
      createCallout(host.calloutsSetId, name(tag))
    );
    const contribution = await pairOf(
      async tag =>
        (
          await rawRead<{ createContributionOnCallout: { id: string } }>(
            admin,
            'mutation($data: CreateContributionOnCalloutInput!) { createContributionOnCallout(contributionData: $data) { id } }',
            {
              data: {
                calloutID: callout.kept,
                type: 'POST',
                post: { profileData: { displayName: name(tag) } },
              },
            }
          )
        ).createContributionOnCallout.id
    );
    const republishedCalloutIds: PerRole = {};
    for (const [i, role] of allowedRoles(PUBLISH).entries())
      republishedCalloutIds[role] = await createCallout(
        host.calloutsSetId,
        name(`republished${i}`)
      );

    const fx: A8 = {
      organizationId,
      callout,
      contribution,
      space: {
        doomed: (await createSpace(accountId, name('doomed'))).spaceId,
        kept: host.spaceId,
      },
      pack: await pairOf(
        async tag => (await createPack(accountId, name(tag))).packId
      ),
      hub: await pairOf(tag =>
        createHubAsLicenseManager(ctx, accountId, name(tag))
      ),
      republishedCalloutIds,
      publisherId: ctx.userIds[OWNER],
    };
    // The read `expectGone` repeats after each delete, made now with the same
    // token: the build fails unless it returns the entity with no error.
    const reader = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;
    for (const kind of Object.keys(READ) as (keyof typeof READ)[]) {
      const id = fx[kind].doomed;
      const read = await rawRead(reader, READ[kind], { id });
      if (!JSON.stringify(read).includes(id)) {
        throw new Error(`A8 build: the reader cannot read the doomed ${kind}`);
      }
    }
    return fx;
  },

  teardown: async (ctx, _sdk, fx) =>
    removeOwnedOrganization(ctx, fx.organizationId, {
      packs: [fx.pack.doomed, fx.pack.kept],
      hubs: [fx.hub.doomed, fx.hub.kept],
      spaces: [fx.space.doomed, fx.space.kept],
    }),

  invocations: {
    'A8.deleteCallout': {
      gate: ['deleteCallout'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteCallout({ calloutId: pick(fx.callout, role) }, headers),
      verify: ({ fx, reader }) =>
        expectGone(reader, 'callout', fx.callout.doomed),
    },
    'A8.deleteContribution': {
      gate: ['deleteContribution'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteContribution(
          { deleteData: { ID: pick(fx.contribution, role) } },
          headers
        ),
      verify: ({ fx, reader }) =>
        expectGone(reader, 'contribution', fx.contribution.doomed),
    },
    'A8.deleteSpace': {
      gate: ['deleteSpace'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteSpace({ deleteData: { ID: pick(fx.space, role) } }, headers),
      verify: ({ fx, reader }) => expectGone(reader, 'space', fx.space.doomed),
    },
    'A8.deleteInnovationPack': {
      gate: ['deleteInnovationPack'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteInnovationPack(
          { innovationPackId: pick(fx.pack, role) },
          headers
        ),
      verify: ({ fx, reader }) => expectGone(reader, 'pack', fx.pack.doomed),
    },
    'A8.deleteInnovationHub': {
      gate: ['deleteInnovationHub'],
      call: (sdk, headers, fx, role) =>
        sdk.DeleteInnovationHub({ input: { ID: pick(fx.hub, role) } }, headers),
      verify: ({ fx, reader }) => expectGone(reader, 'hub', fx.hub.doomed),
    },
    'A8.updateCalloutPublishInfo': {
      gate: ['updateCalloutPublishInfo'],
      call: (sdk, headers, fx, role) =>
        sdk.updateCalloutPublishInfo(
          {
            calloutData: {
              calloutID: fx.republishedCalloutIds[role] ?? fx.callout.kept,
              publisherID: fx.publisherId,
              publishDate: PUBLISH_DATE,
            },
          },
          headers
        ),
      // Built by the organization's admin, so the publisher was NOT this role
      // and the date was "now".
      verify: async ({ fx, reader, role }) => {
        const { lookup } = await rawRead<{
          lookup: {
            callout: { publishedBy: { id: string }; publishedDate: string };
          };
        }>(
          reader.authorization.replace(/^Bearer /, ''),
          'query($id: UUID!) { lookup { callout(ID: $id) { publishedBy { id } publishedDate } } }',
          { id: fx.republishedCalloutIds[role] }
        );
        expect(lookup.callout.publishedBy.id).toBe(fx.publisherId);
        expect(Date.parse(lookup.callout.publishedDate)).toBe(PUBLISH_DATE);
      },
    },
  },
};

const pick = (pair: Pair, role: string): string =>
  role === OWNER ? pair.doomed : pair.kept;
