/**
 * Callout placement — the API gates behind W2 journey 6
 * (client-web/src/functional-e2e/callout-placement/callout-placement-test-plan.md,
 * "Not covered — known gaps"; test-suites#713 deferred them here).
 *
 * The journey's browser walks prove an admin can reorder posts, change a
 * post's phase and move a response, and that a member is not OFFERED those
 * actions. These cases prove the server REFUSES them when a plain member calls
 * the mutation directly, and that nothing changed. Every negative has a
 * positive control: the Space admin makes the same call, it succeeds, and the
 * read-back shows the change, so a refusal can never come from a broken call.
 *
 * Guards (server develop e120d25a1):
 * - updateCalloutsSortOrder: UPDATE on the callouts set
 *   (callouts.set.resolver.mutations.ts › updateCalloutsSortOrder).
 * - updateCallout: UPDATE on the callout (callout.resolver.mutations.ts ›
 *   updateCallout; the Platform Support branch applies to templates only).
 * - moveContributionToCallout: MOVE_CONTRIBUTION on the response
 *   (callout.contribution.move.resolver.mutations.ts).
 * - updateContributionsSortOrder: UPDATE on the callout, MOVE_TASK on a Tasks
 *   board (callout.resolver.mutations.ts › updateContributionsSortOrder).
 * Each refusal is grantAccessOrFail → ForbiddenAuthorizationPolicyException →
 * extensions.code FORBIDDEN_POLICY.
 *
 * The platform resource admin's move (platform-roles A9) is not repeated here.
 *
 * Data: one L0 Space per file; `space.admin` is admin + member,
 * `space.member` a plain member and the author of every response, so the
 * member negatives also cover the author (who holds UPDATE on the response).
 * Each case reads its starting state and assumes no other case ran.
 */
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  createContributionOnCallout,
  moveContributionToCallout,
  readCalloutContributions,
  readCalloutContributionsOrder,
  readCalloutsPlacement,
  readSpaceInnovationFlowStates,
  TagsetReservedName,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  updateCalloutData,
  updateCalloutsSortOrder,
  updateContributionsSortOrder,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();
let baseScenario: OrganizationWithSpaceModel | undefined;
let calloutsSetId = '';
let firstPhase = '';
let lastPhase = '';

const scenarioConfig: TestScenarioConfig = {
  name: `callout-placement-authz-${uniqueId}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
  },
};

/** A published post that takes post responses from members, in the named phase. */
const seedPost = async (name: string, phase: string): Promise<string> => {
  const res = await createCalloutWithData({
    calloutsSetID: calloutsSetId,
    framing: {
      profile: { displayName: `${name} ${uniqueId}`, description: 'J6 API' },
      type: CalloutFramingType.None,
    },
    settings: {
      visibility: CalloutVisibility.Published,
      contribution: {
        enabled: true,
        allowedTypes: [CalloutContributionType.Post],
        canAddContributions: CalloutAllowedActors.Members,
        commentsEnabled: true,
      },
      framing: { commentsEnabled: true },
    },
    classification: {
      tagsets: [{ name: TagsetReservedName.FlowState, tags: [phase] }],
    },
  });
  const id = res.data?.createCalloutOnCalloutsSet.id;
  if (!id) throw new Error(`seed post ${name}: ${JSON.stringify(res.error)}`);
  return id;
};

/** A post response written by the plain member. */
const seedResponse = async (
  calloutID: string,
  name: string
): Promise<string> => {
  const res = await createContributionOnCallout(
    {
      calloutID,
      type: CalloutContributionType.Post,
      sendNotification: false,
      post: {
        profileData: { displayName: `${name} ${uniqueId}`, description: 'r' },
      },
    },
    TestUser.SPACE_MEMBER
  );
  const id = res.data?.createContributionOnCallout.id;
  if (!id)
    throw new Error(`seed response ${name}: ${JSON.stringify(res.error)}`);
  return id;
};

type Placement = { sortOrder: number; phase?: string; flowTagsetId?: string };

/** Each post's sortOrder and phase, read as the global admin. */
const placement = async (): Promise<Map<string, Placement>> => {
  const res = await readCalloutsPlacement(calloutsSetId);
  const callouts = res.data?.lookup.calloutsSet?.callouts;
  if (!callouts)
    throw new Error(`placement read: ${JSON.stringify(res.error)}`);
  return new Map(
    callouts.map(c => [
      c.id,
      {
        sortOrder: c.sortOrder,
        phase: c.classification?.flowState?.tags[0],
        flowTagsetId: c.classification?.flowState?.id,
      },
    ])
  );
};

const placementOf = (map: Map<string, Placement>, id: string): Placement => {
  const found = map.get(id);
  if (!found) throw new Error(`post ${id} missing from the placement read`);
  return found;
};

/** The given posts, top first, by stored sortOrder. */
const orderOf = (map: Map<string, Placement>, ids: string[]): string[] =>
  [...ids].sort(
    (a, b) => placementOf(map, a).sortOrder - placementOf(map, b).sortOrder
  );

/** The response ids a post holds, read as the global admin. */
const responsesOf = async (calloutId: string): Promise<string[]> => {
  const res = await readCalloutContributions(calloutId);
  const contributions = res.data?.lookup.callout?.contributions;
  if (!contributions)
    throw new Error(`responses of ${calloutId}: ${JSON.stringify(res.error)}`);
  return contributions.map(c => c.id).sort();
};

/** A post's response ids in stored order (ascending sortOrder), read as the global admin. */
const responseOrder = async (calloutId: string): Promise<string[]> => {
  const res = await readCalloutContributionsOrder(calloutId);
  const contributions = res.data?.lookup.callout?.contributions;
  if (!contributions)
    throw new Error(
      `response order of ${calloutId}: ${JSON.stringify(res.error)}`
    );
  return [...contributions]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => c.id);
};

const errorCodes = (res: {
  error?: { errors: Array<Record<string, unknown>> };
}) => (res.error?.errors ?? []).map(e => e.code);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
  const flow = await readSpaceInnovationFlowStates(baseScenario.space.id);
  const states = (
    flow.data?.lookup.space?.collaboration.innovationFlow.states ?? []
  )
    .filter(s => s.settings.visible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (states.length < 2)
    throw new Error(`the Space needs two visible phases, got ${states.length}`);
  firstPhase = states[0].displayName;
  lastPhase = states[states.length - 1].displayName;
});

afterAll(async () => {
  if (baseScenario) await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Post order: updateCalloutsSortOrder', () => {
  const posts: string[] = [];

  beforeAll(async () => {
    for (const name of ['PO-a', 'PO-b', 'PO-c']) {
      posts.push(await seedPost(name, firstPhase));
    }
  });

  test('PO-1 a plain member is refused with FORBIDDEN_POLICY, and no post moves', async () => {
    const before = await placement();
    const reversed = orderOf(before, posts).reverse();

    const res = await updateCalloutsSortOrder(
      calloutsSetId,
      reversed,
      TestUser.SPACE_MEMBER
    );

    expect(errorCodes(res)).toEqual(['FORBIDDEN_POLICY']);
    expect(res.data?.updateCalloutsSortOrder).toBeUndefined();
    const after = await placement();
    for (const id of posts) {
      expect(placementOf(after, id).sortOrder).toBe(
        placementOf(before, id).sortOrder
      );
    }
  });

  test('PO-1c control: the Space admin makes the same call and the stored order follows it', async () => {
    const before = await placement();
    const reversed = orderOf(before, posts).reverse();

    const res = await updateCalloutsSortOrder(
      calloutsSetId,
      reversed,
      TestUser.SPACE_ADMIN
    );

    expect(res.error).toBeUndefined();
    expect(orderOf(await placement(), posts)).toEqual(reversed);
  });
});

describe("A post's phase: updateCallout with a FLOW_STATE classification", () => {
  let memberTarget = '';
  let adminTarget = '';

  beforeAll(async () => {
    memberTarget = await seedPost('PH-member', firstPhase);
    adminTarget = await seedPost('PH-admin', firstPhase);
  });

  const movePhase = (calloutId: string, tagsetId: string, actor: TestUser) =>
    updateCalloutData(
      {
        ID: calloutId,
        classification: { tagsets: [{ ID: tagsetId, tags: [lastPhase] }] },
      },
      actor
    );

  test('PH-1 a plain member is refused with FORBIDDEN_POLICY, and the post stays in its phase', async () => {
    const before = placementOf(await placement(), memberTarget);
    expect(before.phase).toBe(firstPhase);

    const res = await movePhase(
      memberTarget,
      before.flowTagsetId ?? '',
      TestUser.SPACE_MEMBER
    );

    expect(errorCodes(res)).toEqual(['FORBIDDEN_POLICY']);
    const after = placementOf(await placement(), memberTarget);
    expect(after.phase).toBe(firstPhase);
    expect(after.sortOrder).toBe(before.sortOrder);
  });

  test('PH-1c control: the Space admin makes the same call and the post is stored in the last phase', async () => {
    const before = placementOf(await placement(), adminTarget);
    expect(before.phase).toBe(firstPhase);

    const res = await movePhase(
      adminTarget,
      before.flowTagsetId ?? '',
      TestUser.SPACE_ADMIN
    );

    expect(res.error).toBeUndefined();
    expect(placementOf(await placement(), adminTarget).phase).toBe(lastPhase);
  });
});

describe('Moving a response: moveContributionToCallout', () => {
  let source = '';
  let target = '';
  let memberResponse = '';
  let adminResponse = '';
  let sibling = '';

  beforeAll(async () => {
    source = await seedPost('MV-source', firstPhase);
    target = await seedPost('MV-target', lastPhase);
    memberResponse = await seedResponse(source, 'MV-member');
    adminResponse = await seedResponse(source, 'MV-admin');
    sibling = await seedResponse(source, 'MV-sibling');
  });

  test("MV-1 a plain member, the response's author, is refused with FORBIDDEN_POLICY, and the response stays in its post", async () => {
    const res = await moveContributionToCallout(
      memberResponse,
      target,
      TestUser.SPACE_MEMBER
    );

    expect(errorCodes(res)).toEqual(['FORBIDDEN_POLICY']);
    expect(await responsesOf(source)).toContain(memberResponse);
    expect(await responsesOf(target)).not.toContain(memberResponse);
  });

  test('MV-1c control: the Space admin moves a response; it leaves the source, keeps its id, and the sibling stays', async () => {
    const res = await moveContributionToCallout(
      adminResponse,
      target,
      TestUser.SPACE_ADMIN
    );

    expect(res.error).toBeUndefined();
    expect(res.data?.moveContributionToCallout.id).toBe(adminResponse);
    const sourceNow = await responsesOf(source);
    expect(sourceNow).not.toContain(adminResponse);
    expect(sourceNow).toContain(sibling);
    expect(await responsesOf(target)).toContain(adminResponse);
  });
});

describe('Response order inside a post: updateContributionsSortOrder', () => {
  let post = '';
  let otherPost = '';
  let foreignResponse = '';
  const responses: string[] = [];

  beforeAll(async () => {
    post = await seedPost('CS-post', firstPhase);
    otherPost = await seedPost('CS-other', firstPhase);
    for (const name of ['CS-1', 'CS-2', 'CS-3']) {
      responses.push(await seedResponse(post, name));
    }
    foreignResponse = await seedResponse(otherPost, 'CS-foreign');
  });

  test('CS-1 the Space admin reverses the responses and the stored order follows', async () => {
    const before = await responseOrder(post);
    expect([...before].sort()).toEqual([...responses].sort());
    const reversed = [...before].reverse();

    const res = await updateContributionsSortOrder(
      post,
      reversed,
      TestUser.SPACE_ADMIN
    );

    expect(res.error).toBeUndefined();
    expect(await responseOrder(post)).toEqual(reversed);
  });

  test("CS-2 a plain member, the responses' author, is refused with FORBIDDEN_POLICY, and the order is unchanged", async () => {
    const before = await responseOrder(post);

    const res = await updateContributionsSortOrder(
      post,
      [...before].reverse(),
      TestUser.SPACE_MEMBER
    );

    expect(errorCodes(res)).toEqual(['FORBIDDEN_POLICY']);
    expect(await responseOrder(post)).toEqual(before);
  });

  test("CS-3 a response id from another post is refused with ENTITY_NOT_FOUND, and neither post's order changes", async () => {
    const before = await responseOrder(post);
    const otherBefore = await responseOrder(otherPost);

    // The foreign id comes last, so a server that renumbered the valid ids
    // before refusing would show as a changed order.
    const res = await updateContributionsSortOrder(
      post,
      [...[...before].reverse(), foreignResponse],
      TestUser.SPACE_ADMIN
    );

    expect(errorCodes(res)).toEqual(['ENTITY_NOT_FOUND']);
    expect(await responseOrder(post)).toEqual(before);
    expect(await responseOrder(otherPost)).toEqual(otherBefore);
  });
});
