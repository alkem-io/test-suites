/**
 * Activity log follows the callout/space on transfer and conversion
 * (alkem-io/server#6023; verified against server#4971, client-web#7947)
 *
 * Scenarios:
 * - Callout transfer: the callout's activity moves to the destination space and is removed from
 *   the source; activity log queries for both do not error.
 * - L1 -> L0 promotion: the activity stays readable on the promoted L0 collaboration; no error.
 * - Transfer to a private subspace of the same space (server#4971): a space member no longer
 *   sees the moved callout's activity and reading the log throws no error.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createCalloutOnCalloutsSet,
  updateCalloutVisibility,
  transferCallout,
} from '@functional-api/callout/callouts.request.params';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import { getActivityLogOnCollaboration } from './activity-log-params';
import { convertSpaceL1ToSpaceL0 } from '../journey/conversion/conversion.request.params';
import { getSpaceData } from '../journey/space/space.request.params';
import {
  CalloutVisibility,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let transferSource: OrganizationWithSpaceModel;
let transferTarget: OrganizationWithSpaceModel;
let promotionScenario: OrganizationWithSpaceModel;
let privateSubspaceScenario: OrganizationWithSpaceModel;

const collaboration = { addPostCallout: true };

// Generate activity tied to a callout: publish it and add a post.
const generateCalloutActivity = async (calloutsSetId: string, name: string) => {
  const created = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: { profile: { displayName: name, description: name } },
  });
  const calloutId = created.data?.createCalloutOnCalloutsSet.id ?? '';
  await updateCalloutVisibility(calloutId, CalloutVisibility.Published);
  await createPostOnCallout(
    calloutId,
    { displayName: `post-${name}` },
    `post-${name}`,
    TestUser.GLOBAL_ADMIN
  );
  return calloutId;
};

const readActivity = async (
  collaborationId: string,
  role: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const res = await getActivityLogOnCollaboration(collaborationId, 30, role);
  return {
    error: res.error?.errors,
    descriptions: (res.data?.activityLogOnCollaboration ?? []).map(
      e => e.description ?? ''
    ),
  };
};

const hasActivityFor = (
  result: { descriptions: string[] },
  name: string
) => result.descriptions.some(d => d.includes(name));

beforeAll(async () => {
  transferSource = await TestScenarioFactory.createBaseScenario({
    name: 'activity-transfer-src',
    space: { collaboration },
  } as TestScenarioConfig);
  transferTarget = await TestScenarioFactory.createBaseScenario({
    name: 'activity-transfer-dst',
    space: { collaboration },
  } as TestScenarioConfig);
  promotionScenario = await TestScenarioFactory.createBaseScenario({
    name: 'activity-promotion',
    space: { collaboration, subspace: { collaboration } },
  } as TestScenarioConfig);
  privateSubspaceScenario = await TestScenarioFactory.createBaseScenario({
    name: 'activity-private-subspace',
    space: {
      collaboration,
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      subspace: {
        collaboration,
        settings: { privacy: { mode: SpacePrivacyMode.Private } },
        community: { admins: [TestUser.SUBSPACE_ADMIN] },
      },
    },
  } as TestScenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(transferSource);
  await TestScenarioFactory.cleanUpBaseScenario(transferTarget);
  await TestScenarioFactory.cleanUpBaseScenario(promotionScenario);
  await TestScenarioFactory.cleanUpBaseScenario(privateSubspaceScenario);
});

// alkem-io/server#6023 / alkem-io/server#4971 — activity log entries that belong to a callout
// must move with it to the destination space when the callout is transferred, so destination
// members can read them and source members no longer reference the moved entity.
describe('Activity log follows a transferred callout', () => {
  const calloutName = `xfer-activity-${uniqueId}`;
  let sourceBefore: Awaited<ReturnType<typeof readActivity>>;
  let sourceAfter: Awaited<ReturnType<typeof readActivity>>;
  let destAfter: Awaited<ReturnType<typeof readActivity>>;

  beforeAll(async () => {
    const calloutId = await generateCalloutActivity(
      transferSource.space.collaboration.calloutsSetId,
      calloutName
    );
    sourceBefore = await readActivity(transferSource.space.collaboration.id);

    await transferCallout(
      calloutId,
      transferTarget.space.collaboration.calloutsSetId
    );

    sourceAfter = await readActivity(transferSource.space.collaboration.id);
    destAfter = await readActivity(transferTarget.space.collaboration.id);
  });

  test('the callout activity exists in the source space before transfer (precondition)', () => {
    expect(hasActivityFor(sourceBefore, calloutName)).toBe(true);
  });

  // alkem-io/client-web#7947 — activity log queries must not throw after a transfer.
  test('activity log queries for source and destination do not error', () => {
    expect(sourceAfter.error).toBeUndefined();
    expect(destAfter.error).toBeUndefined();
  });

  test('the transferred callout activity appears in the destination space', () => {
    expect(hasActivityFor(destAfter, calloutName)).toBe(true);
  });

  test('the transferred callout activity no longer appears in the source space', () => {
    expect(hasActivityFor(sourceAfter, calloutName)).toBe(false);
  });
});

// alkem-io/server#6023 — when an L1 is promoted to L0 its collaboration (and therefore its
// activity log) moves with it; the entries remain readable on the promoted space.
describe('Activity log follows an L1 space promoted to L0', () => {
  const calloutName = `promo-activity-${uniqueId}`;
  let before: Awaited<ReturnType<typeof readActivity>>;
  let after: Awaited<ReturnType<typeof readActivity>>;

  beforeAll(async () => {
    await generateCalloutActivity(
      promotionScenario.subspace.collaboration.calloutsSetId,
      calloutName
    );
    before = await readActivity(promotionScenario.subspace.collaboration.id);

    await convertSpaceL1ToSpaceL0(promotionScenario.subspace.id);
    const promoted = await getSpaceData(promotionScenario.subspace.id);
    const promotedCollaborationId =
      promoted.data?.lookup.space?.collaboration.id ?? '';
    after = await readActivity(promotedCollaborationId);
  });

  test('the callout activity exists before promotion (precondition)', () => {
    expect(hasActivityFor(before, calloutName)).toBe(true);
  });

  // alkem-io/client-web#7947 — activity log query must not throw after promotion.
  test('activity log query does not error after promotion', () => {
    expect(after.error).toBeUndefined();
  });

  test('the activity remains readable on the promoted L0 collaboration', () => {
    expect(hasActivityFor(after, calloutName)).toBe(true);
  });
});

// alkem-io/server#4971 — when a callout is transferred from a space to a private subspace of
// that same space, a member of the space (not of the private subspace) should simply no longer
// see the callout's activity in the space's log, with no error thrown when reading it.
describe('Activity log after a callout is transferred to a private subspace', () => {
  const calloutName = `private-xfer-activity-${uniqueId}`;
  let memberBefore: Awaited<ReturnType<typeof readActivity>>;
  let memberAfter: Awaited<ReturnType<typeof readActivity>>;

  beforeAll(async () => {
    const calloutId = await generateCalloutActivity(
      privateSubspaceScenario.space.collaboration.calloutsSetId,
      calloutName
    );
    memberBefore = await readActivity(
      privateSubspaceScenario.space.collaboration.id,
      TestUser.SPACE_MEMBER
    );

    await transferCallout(
      calloutId,
      privateSubspaceScenario.subspace.collaboration.calloutsSetId
    );

    memberAfter = await readActivity(
      privateSubspaceScenario.space.collaboration.id,
      TestUser.SPACE_MEMBER
    );
  });

  test('the space member sees the callout activity before transfer (precondition)', () => {
    expect(hasActivityFor(memberBefore, calloutName)).toBe(true);
  });

  // alkem-io/client-web#7947 — reading the activity log must not throw for the space member.
  test('reading the activity log as the space member does not error after transfer', () => {
    expect(memberAfter.error).toBeUndefined();
  });

  test('the moved callout activity is no longer shown to the space member', () => {
    expect(hasActivityFor(memberAfter, calloutName)).toBe(false);
  });
});
