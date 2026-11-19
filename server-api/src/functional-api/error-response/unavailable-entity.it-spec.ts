/**
 * Same response for unavailable entities: a caller who names an entity by id
 * gets the same answer whether it does not exist or the caller may not act on
 * it. Each pair is taken at the field that receives the id, so both answers
 * share one `path`, and the whole responses are compared with only the
 * reference number removed. Every comparison goes through
 * `error-response.checks.ts`, so a failing check reports its name and never a
 * response.
 */
import { randomUUID } from 'node:crypto';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  createMemoFramedCallout,
  createWhiteboardFramedCallout,
  postGraphqlRawAs,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import {
  NEUTRAL_ERROR_CODE,
  NEUTRAL_ERROR_MESSAGE,
} from './error-response.constants';
import {
  RawResponse,
  getMemoPdf,
  graphqlErrors,
  holdsNone,
  idsOf,
  isUuid,
  keysWithin,
  sameResponse,
  samePath,
} from './error-response.checks';

const uniqueId = UniqueIDGenerator.getID();
const outsider = TestUser.NON_SPACE_MEMBER;

let baseScenario: OrganizationWithSpaceModel;
const ids = {
  post: '',
  callout: '',
  whiteboard: '',
  memo: '',
  collaboration: '',
  space: '',
};

const scenarioConfig: TestScenarioConfig = {
  name: 'unavailable-entity',
  space: {
    collaboration: {
      addPostCollectionCallout: true,
      addTutorialCallouts: false,
    },
    community: {
      members: [TestUser.SPACE_MEMBER],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
    },
    subspace: {
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
      },
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    visibility: { listedInStore: false, searchVisibility: 'HIDDEN' },
    virtualContributors: [
      { profileDisplayName: `unavailable-entity-vc-${uniqueId}` },
    ],
  },
};

type Pair = {
  name: string;
  kind: keyof typeof ids;
  query: string;
};

/** Each selects `id` only, so nothing below the named entity is resolved. */
const PAIRS: Pair[] = [
  {
    name: 'deletePost',
    kind: 'post',
    query:
      'mutation($id: UUID!) { deletePost(deleteData: { ID: $id }) { id } }',
  },
  {
    name: 'updatePost',
    kind: 'post',
    query: 'mutation($id: UUID!) { updatePost(postData: { ID: $id }) { id } }',
  },
  {
    name: 'deleteCallout',
    kind: 'callout',
    query:
      'mutation($id: UUID!) { deleteCallout(deleteData: { ID: $id }) { id } }',
  },
  {
    name: 'updateCallout',
    kind: 'callout',
    query:
      'mutation($id: UUID!) { updateCallout(calloutData: { ID: $id }) { id } }',
  },
  {
    name: 'updateWhiteboard',
    kind: 'whiteboard',
    query:
      'mutation($id: UUID!) { updateWhiteboard(whiteboardData: { ID: $id }) { id } }',
  },
  {
    name: 'deleteMemo',
    kind: 'memo',
    query: 'mutation($id: UUID!) { deleteMemo(memoData: { ID: $id }) { id } }',
  },
  {
    name: 'updateSpace',
    kind: 'space',
    query:
      'mutation($id: UUID!) { updateSpace(spaceData: { ID: $id }) { id } }',
  },
  {
    name: 'lookup post',
    kind: 'post',
    query: 'query($id: UUID!) { lookup { post(ID: $id) { id } } }',
  },
  {
    name: 'lookup callout',
    kind: 'callout',
    query: 'query($id: UUID!) { lookup { callout(ID: $id) { id } } }',
  },
  {
    name: 'lookup whiteboard',
    kind: 'whiteboard',
    query: 'query($id: UUID!) { lookup { whiteboard(ID: $id) { id } } }',
  },
  {
    name: 'lookup memo',
    kind: 'memo',
    query: 'query($id: UUID!) { lookup { memo(ID: $id) { id } } }',
  },
  {
    name: 'lookup collaboration',
    kind: 'collaboration',
    query: 'query($id: UUID!) { lookup { collaboration(ID: $id) { id } } }',
  },
];

const ACTOR = 'query($id: UUID!) { actor(id: $id) { id } }';

const send = (user: TestUser, query: string, id: string) =>
  postGraphqlRawAs(user, query, { id });

/** The checks every pair must pass, whole responses compared. */
const expectSameNeutralResponse = (
  real: RawResponse,
  missing: RawResponse,
  sentIds: { real: string; missing: string }
) => {
  const realErrors = graphqlErrors(real);
  const missingErrors = graphqlErrors(missing);

  expect(real.status).toBe(missing.status);
  expect(
    sameResponse(real, missing),
    'the two whole responses are equal apart from the reference number'
  ).toBe(true);
  for (const errors of [realErrors, missingErrors]) {
    expect(errors.length).toBe(1);
    expect(errors[0].extensions?.code).toBe(NEUTRAL_ERROR_CODE);
    expect(
      errors[0].message === NEUTRAL_ERROR_MESSAGE,
      'the answer carries the generic sentence'
    ).toBe(true);
  }
  const realErrorId = realErrors[0]?.extensions?.errorId;
  const missingErrorId = missingErrors[0]?.extensions?.errorId;
  expect(
    isUuid(realErrorId) && isUuid(missingErrorId),
    'each answer carries a reference number'
  ).toBe(true);
  expect(
    realErrorId !== missingErrorId,
    'each answer has its own reference number'
  ).toBe(true);
  expect(
    holdsNone(real.body, [sentIds.real]) &&
      holdsNone(missing.body, [sentIds.missing]),
    'neither answer repeats the id sent'
  ).toBe(true);
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const { space } = baseScenario;
  const calloutsSetId = space.collaboration.calloutsSetId;

  const post = await createPostOnCallout(
    space.collaboration.calloutPostCollectionId,
    { displayName: `unavailable-post-${uniqueId}` },
    `unavailable-post-${uniqueId}`
  );
  const whiteboard = await createWhiteboardFramedCallout(
    calloutsSetId,
    `unavailable-whiteboard-${uniqueId}`,
    `unavailable-wb-${uniqueId}`
  );
  const memo = await createMemoFramedCallout(calloutsSetId, {
    displayName: `unavailable-memo-${uniqueId}`,
    memoTitle: `unavailable-memo-title-${uniqueId}`,
    markdown: 'Memo content',
  });

  ids.post = post.data?.createContributionOnCallout.post?.id ?? '';
  ids.callout = space.collaboration.calloutPostCollectionId;
  ids.whiteboard = whiteboard.whiteboardId;
  ids.memo = memo.memoId;
  ids.collaboration = space.collaboration.id;
  ids.space = space.id;
  const unset = Object.entries(ids).filter(([, id]) => !id);
  if (unset.length > 0) {
    throw new Error(
      `set-up: no id for ${unset.map(([kind]) => kind).join(', ')}`
    );
  }
  if (!baseScenario.virtualContributors?.[0]?.id) {
    throw new Error('set-up: the virtual contributor was not created');
  }
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Same response for unavailable entities', () => {
  test.each(PAIRS)(
    '$name: an entity the caller may not act on and an unknown id get the same response',
    async ({ kind, query }) => {
      const realId = ids[kind];
      const missingId = randomUUID();

      const real = await send(outsider, query, realId);
      const missing = await send(outsider, query, missingId);

      expectSameNeutralResponse(real, missing, {
        real: realId,
        missing: missingId,
      });
    }
  );

  test('actor: an actor the caller may not read and an unknown id get the same response', async () => {
    const realId = baseScenario.virtualContributors?.[0]?.id ?? '';
    const missingId = randomUUID();

    const real = await send(outsider, ACTOR, realId);
    // The fixture: an actor this caller may not read. If it is returned, the
    // fixture is wrong, not the comparison.
    expect(graphqlErrors(real).length).toBe(1);
    const missing = await send(outsider, ACTOR, missingId);

    for (const response of [real, missing]) {
      expect(
        (response.body as { data?: { actor?: unknown } }).data?.actor === null,
        'the actor field is null'
      ).toBe(true);
    }
    expectSameNeutralResponse(real, missing, {
      real: realId,
      missing: missingId,
    });
  });

  test.each(
    PAIRS.filter(p =>
      ['deletePost', 'lookup post', 'updateWhiteboard'].includes(p.name)
    )
  )(
    '$name: a global admin naming an unknown id gets the generic answer',
    async ({ query }) => {
      const response = await send(TestUser.GLOBAL_ADMIN, query, randomUUID());
      const errors = graphqlErrors(response);

      expect(errors.length).toBe(1);
      expect(errors[0].extensions?.code).toBe(NEUTRAL_ERROR_CODE);
      expect(
        errors[0].message === NEUTRAL_ERROR_MESSAGE,
        'the answer carries the generic sentence'
      ).toBe(true);
    }
  );

  test('memo PDF: a memo the caller may not read and an unknown id get the same response', async () => {
    const real = await getMemoPdf(ids.memo, outsider);
    const missing = await getMemoPdf(randomUUID(), outsider);

    expect(real.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(
      sameResponse(real, missing),
      'the two bodies are equal apart from the reference number and timestamp'
    ).toBe(true);
    for (const response of [real, missing]) {
      expect((response.body as { code?: unknown } | undefined)?.code).toBe(
        NEUTRAL_ERROR_CODE
      );
    }
  });

  describe('Refused below a readable entity', () => {
    const member = TestUser.SPACE_MEMBER;
    const SUBSPACE_ABOUT =
      'query($id: UUID!) { lookup { space(ID: $id) { about { id } } } }';
    const SUBSPACE_COLLABORATION =
      'query($id: UUID!) { lookup { space(ID: $id) { collaboration { id } } } }';

    test('a member of the parent Space is shown the private subspace', async () => {
      const response = await send(
        member,
        SUBSPACE_ABOUT,
        baseScenario.subspace.id
      );
      const space = (
        response.body as {
          data?: { lookup?: { space?: { about?: { id?: string } } } };
        }
      ).data?.lookup?.space;

      expect(graphqlErrors(response).length).toBe(0);
      expect(
        space?.about?.id === baseScenario.subspace.about.id,
        "the caller reads the subspace's about"
      ).toBe(true);
    });

    test('a part the caller may not read is refused with the generic answer at that part', async () => {
      const subspaceId = baseScenario.subspace.id;
      const response = await send(member, SUBSPACE_COLLABORATION, subspaceId);
      const errors = graphqlErrors(response);

      expect(errors.length).toBe(1);
      expect(errors[0].extensions?.code).toBe(NEUTRAL_ERROR_CODE);
      expect(
        errors[0].message === NEUTRAL_ERROR_MESSAGE,
        'the answer carries the generic sentence'
      ).toBe(true);
      expect(
        keysWithin(errors[0].extensions, [
          'code',
          'numericCode',
          'userMessage',
          'errorId',
        ]),
        'the answer carries no extension outside the public set'
      ).toBe(true);
      expect(
        samePath(errors[0], ['lookup', 'space', 'collaboration']),
        'the error is at the part that refused'
      ).toBe(true);
      expect(
        holdsNone(response.body, [subspaceId, ...idsOf(member), 'privilege']),
        'the answer names no id and no privilege'
      ).toBe(true);
    });

    test('an unknown id is refused with the generic answer at the field that receives it', async () => {
      const response = await send(member, SUBSPACE_COLLABORATION, randomUUID());
      const errors = graphqlErrors(response);

      expect(errors.length).toBe(1);
      expect(errors[0].extensions?.code).toBe(NEUTRAL_ERROR_CODE);
      expect(
        errors[0].message === NEUTRAL_ERROR_MESSAGE,
        'the answer carries the generic sentence'
      ).toBe(true);
      expect(
        samePath(errors[0], ['lookup', 'space']),
        'the error is at the field that receives the id'
      ).toBe(true);
    });
  });
});
