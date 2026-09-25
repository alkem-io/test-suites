import { expect } from 'vitest';
import { rawRead, rawRequest } from '../raw-request';
import type { GroupModule, Headers } from '../types';
import {
  createCallout,
  createHubAsLegacyAdmin,
  createOwnedOrganization,
  createPack,
  createSpace,
  organizationAdminOf,
  removeOwnedOrganization,
} from './organization-content';

/**
 * A8 — delete content; set a callout's publisher. Owner: Platform Content Full
 * Access, and nobody else — in particular NOT Platform Support, which may edit
 * an organization's pack and hub (A7) but never delete them.
 *
 * Destructive and single-owner: one dedicated `doomed` target per capability,
 * and a `kept` twin that every negative aims at and that must outlive the run.
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
  /** Positive target of `updateCalloutPublishInfo`; negatives use `callout.kept`. */
  republishedCalloutId: string;
  publisherId: string;
};

/** 2020-01-01 — no callout created by this run can carry it by accident. */
const PUBLISH_DATE = Date.UTC(2020, 0, 1);

const OWNER = 'PLATFORM_CONTENT_FULL_ACCESS';

const READ = {
  callout: 'query($id: UUID!) { lookup { callout(ID: $id) { id } } }',
  contribution: 'query($id: UUID!) { lookup { contribution(ID: $id) { id } } }',
  space: 'query($id: UUID!) { lookup { space(ID: $id) { id } } }',
  pack: 'query($id: UUID!) { lookup { innovationPack(ID: $id) { id } } }',
  hub: 'query($id: UUID!) { platform { innovationHub(id: $id) { id } } }',
} as const;

/** The reader MAY read it, so the only acceptable answer is "not found". */
const expectGone = async (
  reader: Headers,
  kind: keyof typeof READ,
  id: string
): Promise<void> => {
  const { errors } = await rawRequest(
    reader.authorization.replace(/^Bearer /, ''),
    READ[kind],
    { id }
  );
  expect(errors.map(e => e.extensions?.code)).toEqual(['ENTITY_NOT_FOUND']);
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

    return {
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
        createHubAsLegacyAdmin(ctx, accountId, name(tag))
      ),
      republishedCalloutId: await createCallout(
        host.calloutsSetId,
        name('republished')
      ),
      publisherId: ctx.userIds[OWNER],
    };
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
              calloutID:
                role === OWNER ? fx.republishedCalloutId : fx.callout.kept,
              publisherID: fx.publisherId,
              publishDate: PUBLISH_DATE,
            },
          },
          headers
        ),
      // Built by the organization's admin, so the publisher was NOT this role
      // and the date was "now".
      verify: async ({ fx, reader }) => {
        const { lookup } = await rawRead<{
          lookup: {
            callout: { publishedBy: { id: string }; publishedDate: string };
          };
        }>(
          reader.authorization.replace(/^Bearer /, ''),
          'query($id: UUID!) { lookup { callout(ID: $id) { publishedBy { id } publishedDate } } }',
          { id: fx.republishedCalloutId }
        );
        expect(lookup.callout.publishedBy.id).toBe(fx.publisherId);
        expect(Date.parse(lookup.callout.publishedDate)).toBe(PUBLISH_DATE);
      },
    },
  },
};

const pick = (pair: Pair, role: string): string =>
  role === OWNER ? pair.doomed : pair.kept;
