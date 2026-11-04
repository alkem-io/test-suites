/**
 * Platform-level activity feed: `activityFeed` / `activityFeedGrouped`
 * (plan: ./activity-logs-test-plan.md)
 *
 * - server#6640 (fix 3c88578cc): the grouped feed must be EMPTY when the actor can read no
 *   collaboration. Pre-fix, an empty authorization scope meant "no constraint" and the feed
 *   returned the platform-wide newest rows.
 * - server#6561 (server#6639, 6f68dbc83): `excludeMyActivity` hides the caller's own rows, is
 *   applied in the query (pages stay full), and composes with `myActivity`.
 *
 * Needs a server that contains 3c88578cc. On older servers the cases are red by design:
 * the empty-scope cases leak, and every `excludeMyActivity` call fails GraphQL input validation.
 *
 * The two stories keep separate describes with their own fixtures. Shared plumbing is the
 * helpers in ./activity-log-params.ts (rawRequest-based, so `data` and `errors` stay visible).
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  CalloutVisibility,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createCalloutOnCalloutsSet,
  updateCalloutVisibility,
} from '@functional-api/callout/callouts.request.params';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import { deleteDisposableUsers } from '@functional-api/platform-roles/_support/groups/disposable-user';
import { rawRequest } from '@functional-api/platform-roles/_support/raw-request';
import {
  registerUser,
  RegisteredUser,
} from '@functional-api/platform-roles/_support/users';
import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import {
  ActivityFeedRow,
  getActivityFeedAs,
  getActivityFeedGroupedAs,
} from './activity-log-params';

const MEMBERSHIP_PROBE = 'query { me { spaceMembershipsFlat { id } } }';

const rowsOf = (res: {
  data: { activityFeedGrouped: ActivityFeedRow[] } | null;
}) => res.data?.activityFeedGrouped ?? [];

const messages = (errors: readonly { message: string }[]) =>
  errors.map(e => e.message).join(' | ');

// Publish a callout and add a post to it as GLOBAL_ADMIN. Produces visible CALLOUT_PUBLISHED and
// CALLOUT_POST_CREATED rows whose description contains `name` (proven shape from
// activity-log-on-transfer-conversion.it-spec.ts).
const seedCalloutActivity = async (calloutsSetId: string, name: string) => {
  const created = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: { profile: { displayName: name, description: name } },
  });
  const calloutId = created.data?.createCalloutOnCalloutsSet.id;
  if (!calloutId) {
    throw new Error(`fixture invalid: could not create callout ${name}`);
  }
  await updateCalloutVisibility(calloutId, CalloutVisibility.Published);
  await createPostOnCallout(
    calloutId,
    { displayName: `post-${name}` },
    `post-${name}`,
    TestUser.GLOBAL_ADMIN
  );
  return calloutId;
};

const throwIfRejected = (settled: PromiseSettledResult<unknown>[]) => {
  const failed = settled.flatMap(outcome =>
    outcome.status === 'rejected' ? [String(outcome.reason)] : []
  );
  if (failed.length > 0) {
    throw new Error(`teardown left something behind: ${failed.join(' | ')}`);
  }
};

// ---------------------------------------------------------------------------------------------
// server#6640 — empty authorization scope
// ---------------------------------------------------------------------------------------------
describe('activityFeedGrouped — empty authorization scope (server#6640)', () => {
  const uniqueId = UniqueIDGenerator.getID();
  const seedName = `afg-seed-${uniqueId}`;

  let scenario: OrganizationWithSpaceModel | undefined;
  let actor: RegisteredUser | undefined;

  const scenarioConfig: TestScenarioConfig = {
    name: 'activity-feed-grouped',
    space: {
      settings: { privacy: { mode: SpacePrivacyMode.Private } },
      community: { members: [TestUser.SPACE_MEMBER] },
    },
  };

  const base = () => {
    if (!scenario || !actor) {
      throw new Error('fixture invalid: beforeAll did not complete');
    }
    return { scenario, actor };
  };

  const memberToken = () => TestUserManager.users.spaceMember.authToken;

  // The activity rows are written fire-and-forget by the server, so the control (and only the
  // control) is polled, bounded, until the seeded rows are visible to a member.
  const memberSeesSeedGrouped = async () => {
    const { scenario } = base();
    const res = await getActivityFeedGroupedAs(memberToken(), {
      spaceIds: [scenario.space.id],
      limit: 100,
    });
    return {
      errors: res.errors.length,
      seeded: rowsOf(res).filter(
        r =>
          r.collaborationID === scenario.space.collaboration.id &&
          r.description.includes(seedName)
      ).length,
    };
  };

  beforeAll(async () => {
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    actor = await registerUser(
      `afg.${Date.now().toString(36)}${uniqueId.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );
    await seedCalloutActivity(
      scenario.space.collaboration.calloutsSetId,
      seedName
    );
    await vi.waitFor(
      async () => {
        expect((await memberSeesSeedGrouped()).seeded).toBeGreaterThan(0);
      },
      { timeout: 15_000, interval: 1_000 }
    );
  });

  afterAll(async () => {
    const settled = await Promise.allSettled([
      actor
        ? deleteDisposableUsers(TestUserManager.users.globalAdmin.authToken, [
            actor,
          ])
        : Promise.resolve(),
      scenario
        ? TestScenarioFactory.cleanUpBaseScenario(scenario)
        : Promise.resolve(),
    ]);
    throwIfRejected(settled);
  });

  test('AF-01 — a user with no space memberships gets no grouped activity, even though private activity exists', async () => {
    const { scenario, actor } = base();

    // Fixture: the actor really holds no space membership.
    const probe = await rawRequest<{
      me: { spaceMembershipsFlat: { id: string }[] };
    }>(actor.token, MEMBERSHIP_PROBE);
    expect(probe.errors, `probe errors: ${messages(probe.errors)}`).toEqual([]);
    expect(
      probe.data?.me.spaceMembershipsFlat,
      'fixture invalid: the actor holds a space membership'
    ).toHaveLength(0);

    // Control: a member sees the seeded activity through the same grouped code path.
    const control = await getActivityFeedGroupedAs(memberToken(), {
      spaceIds: [scenario.space.id],
      limit: 100,
    });
    expect(
      control.errors,
      `control errors: ${messages(control.errors)}`
    ).toEqual([]);
    expect(
      rowsOf(control).some(
        r =>
          r.collaborationID === scenario.space.collaboration.id &&
          r.description.includes(seedName)
      ),
      'control: seeded activity not visible to a member in the grouped feed — the negative below would be vacuous'
    ).toBe(true);

    // Negative: the membership-less actor gets exactly [] and no error.
    const negative = await getActivityFeedGroupedAs(actor.token, {
      limit: 100,
    });
    expect(
      negative.errors,
      `negative errors: ${messages(negative.errors)}`
    ).toEqual([]);
    const rows = rowsOf(negative);
    const hit = rows.some(
      r => r.collaborationID === scenario.space.collaboration.id
    );
    expect(
      rows,
      `leaked ${rows.length} rows; seeded space present: ${hit}`
    ).toEqual([]);
  });

  test('AF-02 — a member whose spaceIds filter excludes every space they hold gets no grouped activity', async () => {
    // Control first, so this test cannot pass alone on an empty stack (e.g. under -t).
    const control = await memberSeesSeedGrouped();
    expect(control.errors, 'control: member read errored').toBe(0);
    expect(
      control.seeded,
      'control: seeded activity not visible to the member — the negative below would be vacuous'
    ).toBeGreaterThan(0);

    const negative = await getActivityFeedGroupedAs(memberToken(), {
      spaceIds: [randomUUID()],
      limit: 100,
    });
    expect(
      negative.errors,
      `negative errors: ${messages(negative.errors)}`
    ).toEqual([]);
    const rows = rowsOf(negative);
    expect(rows, `leaked ${rows.length} rows`).toEqual([]);
  });

  test('AF-15 — the paginated feed is empty for a user who can read no collaboration', async () => {
    const { scenario, actor } = base();

    const control = await getActivityFeedAs(memberToken(), {
      first: 25,
      args: { spaceIds: [scenario.space.id] },
    });
    expect(
      control.errors,
      `control errors: ${messages(control.errors)}`
    ).toEqual([]);
    expect(
      (control.data?.activityFeed.activityFeed ?? []).some(
        r =>
          r.collaborationID === scenario.space.collaboration.id &&
          r.description.includes(seedName)
      ),
      'control: seeded activity not visible to a member in the paginated feed — the negative below would be vacuous'
    ).toBe(true);

    const negative = await getActivityFeedAs(actor.token, { first: 25 });
    expect(
      negative.errors,
      `negative errors: ${messages(negative.errors)}`
    ).toEqual([]);
    const page = negative.data?.activityFeed;
    expect(
      page?.activityFeed,
      `leaked ${page?.activityFeed.length} rows`
    ).toEqual([]);
    expect(page?.total).toBe(0);
    expect(page?.pageInfo.hasNextPage).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// server#6561 — excludeMyActivity
// ---------------------------------------------------------------------------------------------
describe('activityFeed — excludeMyActivity (server#6561)', () => {
  const PAGE = 5; // BVA anchor
  const BIG = 100; // one-page baseline
  const POST_CREATED = 'CALLOUT_POST_CREATED';

  const uniqueId = UniqueIDGenerator.getID();
  const tag = `afx-${uniqueId}`;

  let scenario: OrganizationWithSpaceModel | undefined;
  let callerId = '';
  let callerToken = '';
  // Baseline B: the whole scope, no flags, in server order.
  let B: { total: number; rows: ActivityFeedRow[] };
  let Bc: ActivityFeedRow[]; // the caller's rows
  let Bo: ActivityFeedRow[]; // everyone else's rows

  const baseArgs = (spaceId: string) => ({
    spaceIds: [spaceId],
    // mirrors client-web's spaceActivityFilter_ (DashboardWithMemberships.tsx)
    excludeTypes: ['CALLOUT_WHITEBOARD_CONTENT_MODIFIED'],
  });

  const spaceId = () => {
    if (!scenario)
      throw new Error('fixture invalid: beforeAll did not complete');
    return scenario.space.id;
  };

  const feed = (
    first: number,
    extra: Record<string, unknown> = {},
    after?: string
  ) =>
    getActivityFeedAs(callerToken, {
      first,
      after,
      args: { ...baseArgs(spaceId()), ...extra },
    });

  const ids = (rows: ActivityFeedRow[]) => rows.map(r => r.id);
  const authoredByCaller = (r: ActivityFeedRow) =>
    r.triggeredBy?.id === callerId;
  const mentions = (rows: ActivityFeedRow[], name: string) =>
    rows.filter(r => r.description?.includes(name));

  beforeAll(async () => {
    const uid = uniqueId;
    scenario = await TestScenarioFactory.createBaseScenario({
      name: 'activity-feed-exclude-mine',
      space: {
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
        },
      },
    } as TestScenarioConfig);
    callerId = TestUserManager.users.spaceAdmin.id;
    callerToken = TestUserManager.users.spaceAdmin.authToken;

    // Callout, published (as GLOBAL_ADMIN, the wrapper default).
    const created = await createCalloutOnCalloutsSet(
      scenario.space.collaboration.calloutsSetId,
      {
        framing: {
          profile: { displayName: `${tag}-callout`, description: tag },
        },
      }
    );
    const calloutId = created.data?.createCalloutOnCalloutsSet.id;
    if (!calloutId) {
      throw new Error('fixture invalid: could not create the callout');
    }
    await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

    // Others' posts O1..O6, in order, two distinct people.
    for (let i = 1; i <= 6; i++) {
      await createPostOnCallout(
        calloutId,
        { displayName: `${tag}-O${i}` },
        `afx-o${i}-${uid}`,
        i % 2 === 1 ? TestUser.SPACE_MEMBER : TestUser.GLOBAL_ADMIN
      );
    }

    // Activity rows are written fire-and-forget: poll (bounded) until all of them are readable.
    // This also guarantees every "others" row has a lower rowId than every caller post.
    const countsOf = async (prefix: string) => {
      const res = await feed(BIG);
      const rows = res.data?.activityFeed.activityFeed ?? [];
      return {
        posts: rows.filter(r => r.description?.includes(`${tag}-${prefix}`))
          .length,
        published: rows.filter(
          r =>
            r.type === 'CALLOUT_PUBLISHED' &&
            r.description?.includes(`${tag}-callout`)
        ).length,
      };
    };
    await vi.waitFor(
      async () => {
        expect(await countsOf('O')).toMatchObject({ posts: 6, published: 1 });
      },
      { timeout: 15_000, interval: 500 }
    );

    // Caller's posts C1..C4.
    for (let i = 1; i <= 4; i++) {
      await createPostOnCallout(
        calloutId,
        { displayName: `${tag}-C${i}` },
        `afx-c${i}-${uid}`,
        TestUser.SPACE_ADMIN
      );
    }
    await vi.waitFor(
      async () => {
        expect((await countsOf('C')).posts).toBe(4);
      },
      { timeout: 15_000, interval: 500 }
    );

    // Baseline B.
    const baseline = await feed(BIG);
    expect(baseline.errors, 'fixture invalid: baseline errored').toEqual([]);
    const page = baseline.data?.activityFeed;
    B = { total: page?.total ?? -1, rows: page?.activityFeed ?? [] };
    Bc = B.rows.filter(authoredByCaller);
    Bo = B.rows.filter(r => !authoredByCaller(r));

    expect(B.total, 'fixture invalid: the whole scope must fit one page').toBe(
      B.rows.length
    );
    const callerPosts = Bc.filter(r => r.type === POST_CREATED);
    expect(
      callerPosts
        .map(r =>
          [1, 2, 3, 4].find(i => r.description.includes(`${tag}-C${i}`))
        )
        .sort(),
      'fixture invalid: the caller must hold exactly the four posts C1..C4 as CALLOUT_POST_CREATED'
    ).toEqual([1, 2, 3, 4]);
    for (let i = 1; i <= 6; i++) {
      expect(
        mentions(Bo, `${tag}-O${i}`),
        `fixture invalid: O${i} must be in the others' rows`
      ).toHaveLength(1);
    }
    expect(
      Bo.length,
      'fixture invalid: others must exceed one page'
    ).toBeGreaterThan(PAGE);
    // Bc may also hold the caller's own MEMBER_JOINED row — derived, not asserted.
  });

  afterAll(async () => {
    const settled = await Promise.allSettled([
      scenario
        ? TestScenarioFactory.cleanUpBaseScenario(scenario)
        : Promise.resolve(),
    ]);
    throwIfRejected(settled);
  });

  test('AF-11 — excludeMyActivity: no caller rows, page 1 full at the limit, paging continues without them', async () => {
    // Control: without the flag the newest 5 are 4 caller posts + 1 other, so an in-memory
    // filter of a 5-row page could not return a full page.
    const control = await feed(PAGE);
    expect(
      control.errors,
      `control errors: ${messages(control.errors)}`
    ).toEqual([]);
    const controlRows = control.data?.activityFeed.activityFeed ?? [];
    expect(ids(controlRows)).toEqual(ids(B.rows.slice(0, PAGE)));
    expect(
      controlRows.filter(authoredByCaller),
      'control: the newest 5 must be 4 caller posts + 1 other, or the length check below cannot tell server-side from in-memory filtering'
    ).toHaveLength(4);

    // Page 1, at the limit.
    const args = { excludeMyActivity: true };
    const p1 = await feed(PAGE, args);
    expect(p1.errors, `page 1 errors: ${messages(p1.errors)}`).toEqual([]);
    const page1 = p1.data!.activityFeed;
    expect(page1.activityFeed, 'page 1 must be full').toHaveLength(PAGE);
    expect(
      ids(page1.activityFeed.filter(authoredByCaller)),
      'caller rows on page 1'
    ).toEqual([]);
    expect(ids(page1.activityFeed)).toEqual(ids(Bo.slice(0, PAGE)));
    expect(page1.total).toBe(Bo.length);
    expect(page1.total).toBe(B.total - Bc.length);
    expect(page1.pageInfo.hasNextPage).toBe(true);
    expect(page1.pageInfo.endCursor).toBe(page1.activityFeed[PAGE - 1].id);

    // Walk to the end.
    const walked = [...ids(page1.activityFeed)];
    let current = page1;
    const bound = Math.ceil(Bo.length / PAGE) + 1;
    let pages = 1;
    while (current.pageInfo.hasNextPage) {
      expect(
        ++pages,
        `paging did not terminate within ${bound} pages`
      ).toBeLessThanOrEqual(bound);
      const next = await feed(
        PAGE,
        args,
        current.pageInfo.endCursor ?? undefined
      );
      expect(
        next.errors,
        `page ${pages} errors: ${messages(next.errors)}`
      ).toEqual([]);
      current = next.data!.activityFeed;
      expect(
        ids(current.activityFeed.filter(authoredByCaller)),
        `caller rows on page ${pages}`
      ).toEqual([]);
      const repeated = ids(current.activityFeed).filter(id =>
        walked.includes(id)
      );
      expect(repeated, `ids repeated on page ${pages}`).toEqual([]);
      if (current.pageInfo.hasNextPage) {
        expect(current.activityFeed, `page ${pages} must be full`).toHaveLength(
          PAGE
        );
      }
      walked.push(...ids(current.activityFeed));
    }
    expect(
      walked,
      "the cursor walk must return all others' rows, in order, once"
    ).toEqual(ids(Bo));
  });

  describe('AF-12 — myActivity × excludeMyActivity decision table', () => {
    // D3 (unset × true) is AF-11. D1 first: it is the control for the rest.
    test("AF-12 D1 (control) — neither flag: the whole scope, caller rows and others' rows", async () => {
      const res = await feed(BIG);
      expect(res.errors, messages(res.errors)).toEqual([]);
      const page = res.data!.activityFeed;
      expect(ids(page.activityFeed)).toEqual(ids(B.rows));
      for (let i = 1; i <= 4; i++) {
        const row = mentions(page.activityFeed, `${tag}-C${i}`);
        expect(row, `C${i} present once`).toHaveLength(1);
        expect(authoredByCaller(row[0]), `C${i} authored by caller`).toBe(true);
      }
      for (let i = 1; i <= 6; i++) {
        const row = mentions(page.activityFeed, `${tag}-O${i}`);
        expect(row, `O${i} present once`).toHaveLength(1);
        expect(authoredByCaller(row[0]), `O${i} authored by others`).toBe(
          false
        );
      }
    });

    test('AF-12 D2 — excludeMyActivity: false behaves as unset', async () => {
      const res = await feed(BIG, { excludeMyActivity: false });
      expect(res.errors, messages(res.errors)).toEqual([]);
      const page = res.data!.activityFeed;
      expect(ids(page.activityFeed)).toEqual(ids(B.rows));
      expect(page.total).toBe(B.total);
    });

    test("AF-12 D4 — myActivity: true returns exactly the caller's rows", async () => {
      const res = await feed(BIG, { myActivity: true });
      expect(res.errors, messages(res.errors)).toEqual([]);
      const page = res.data!.activityFeed;
      expect(
        ids(page.activityFeed.filter(r => !authoredByCaller(r))),
        'non-caller rows under myActivity'
      ).toEqual([]);
      expect(ids(page.activityFeed)).toEqual(ids(Bc));
      for (let i = 1; i <= 4; i++) {
        expect(
          mentions(page.activityFeed, `${tag}-C${i}`),
          `C${i}`
        ).toHaveLength(1);
      }
      expect(page.total).toBe(Bc.length);
    });

    test('AF-12 D5 — myActivity: true with excludeMyActivity: true composes to an empty result, not an error', async () => {
      const res = await feed(PAGE, {
        myActivity: true,
        excludeMyActivity: true,
      });
      expect(res.errors, `errors: ${messages(res.errors)}`).toEqual([]);
      const page = res.data?.activityFeed;
      expect(page?.activityFeed).toEqual([]);
      expect(page?.total).toBe(0);
      expect(page?.pageInfo.hasNextPage).toBe(false);
    });
  });

  test('AF-14 — the grouped feed honours excludeMyActivity', async () => {
    const grouped = (extra: Record<string, unknown>) =>
      getActivityFeedGroupedAs(callerToken, {
        spaceIds: [spaceId()],
        limit: BIG,
        ...extra,
      });

    // Control: without the flag the caller's own groups are present.
    const control = await grouped({});
    expect(
      control.errors,
      `control errors: ${messages(control.errors)}`
    ).toEqual([]);
    expect(
      rowsOf(control).filter(authoredByCaller).length,
      'control: caller rows must be present without the flag'
    ).toBeGreaterThan(0);

    const excluded = await grouped({ excludeMyActivity: true });
    expect(excluded.errors, `errors: ${messages(excluded.errors)}`).toEqual([]);
    const rows = rowsOf(excluded);
    expect(
      rows.filter(authoredByCaller).map(r => r.id),
      'caller rows with excludeMyActivity'
    ).toEqual([]);
    for (let i = 1; i <= 6; i++) {
      expect(mentions(rows, `${tag}-O${i}`), `O${i} present`).not.toHaveLength(
        0
      );
    }

    const both = await grouped({ myActivity: true, excludeMyActivity: true });
    expect(both.errors, `errors: ${messages(both.errors)}`).toEqual([]);
    expect(rowsOf(both)).toEqual([]);
  });
});
