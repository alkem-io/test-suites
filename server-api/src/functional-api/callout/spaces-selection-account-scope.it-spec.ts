/**
 * The account boundary of a Spaces-collection callout's manual (CUSTOM)
 * selection, executed against a real database (workspace#084, T201-T203).
 *
 * WHY THIS LIVES HERE AND NOT IN `server`'s UNIT SPECS — do not move these
 * assertions back. A unit assertion against a mocked repository is not proof
 * of a SQL join: `server`'s vitest runs `environment: 'node'` with hand-wired
 * repository mocks and no database (`vitest.config.ts:43`), so
 * `createQueryBuilder` is itself a mock and `getMany` returns whatever the
 * test fed it. Every set semantic asserted below would pass there against a
 * predicate that filters `space."accountId"` directly — the exact defect
 * FR-004a exists to prevent, because `space.accountId` is meaningfully
 * populated on level-zero rows only. See spec Clarifications (rev 5, COMP-01)
 * and spec A6 / A25.
 *
 * These tests run against a live API stack. They are self-seeding: every
 * required entity is created in beforeAll and removed in afterAll.
 *
 * EXPECTED RED until the `server` slice of workspace#084 is deployed to the
 * stack this suite points at: `accountSpaces` does not exist before it, and
 * the pre-084 write guard rejects every same-account non-subspace. Do not
 * soften a case to make it pass earlier — this file is the feature's only
 * executed security proof (SC-002). Every case below goes GREEN once that
 * slice is deployed; nothing here is knowingly permanent-red.
 *
 * NOT ASSERTED HERE, deliberately — S9 ("the stored selection is not handed to
 * a viewer who is not a host-space admin"). 084 widens what `selectedIds` may
 * hold from the host's own subspaces to every space of the account, while
 * `Callout.settings` carries no privilege decorator and the 084 `server` slice
 * adds none — so the exposure is real and UNFIXED, and its owning fix is
 * server-side. A case for it would be permanently red, is outside the six
 * assertions this slice was scoped to (`tasks/test-suites.md` T202), and this
 * directory is enrolled in the shared-cluster `nightly` project, where a
 * knowingly-red case normalises the colour of the only file that proves
 * SC-002. It is carried as a finding against the 084 `server` PR instead. Do
 * not add it here before that gate ships.
 *
 * ORDERING PREREQUISITE — read before merging this file.
 * `server-api/vitest.config.ts` puts `src/functional-api/callout/**` in the
 * `nightly` project, which runs against the SHARED test cluster. So from the
 * moment this file is on `develop` the nightly executes it — fixture writes
 * included — and reports it red until the `server` slice is deployed there.
 * The remedy is merge/deploy ORDER (the feature's wave 1 is `server`, wave 4 is
 * this), not confinement: the task sheet's "assert ALKEMIO_SERVER resolves to
 * localhost" pre-flight is deliberately absent because it is unimplementable
 * alongside that nightly enrollment — it would red the nightly by construction.
 * Pointing a `.env` at a local stack is an operator prerequisite of the
 * verification track (`tasks/test-suites.md`, prerequisite (a)), not a property
 * this spec can assert. And the slice contract forbids buying the window with a
 * skip, so if the order cannot be held the nightly is KNOWINGLY red for it.
 *
 * Execution: pnpm --filter @alkemio/test-suite-server-api run test:callouts
 */

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  postGraphqlRaw,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CalloutFramingType,
  CalloutSelectionMode,
  SpaceLevel,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { SpacePrivacyMode } from '@alkemio/client-lib';

import { deleteCallout, getCalloutsData } from './callouts.request.params';
import {
  createSpacesCollectionCallout,
  getCalloutSpacesSettings,
  updateCalloutSpacesSettings,
} from './spaces-collection/spaces-collection.request.params';
import {
  createSpaceBasicDataOrFail,
  deleteSpace,
  updateSpaceSettings,
} from '@functional-api/journey/space/space.request.params';
import { createSubspaceOrFail } from '@functional-api/journey/subspace/subspace.request.params';

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let calloutsSetId = '';

/** The host space's own tree (scenario organization's account). */
let hostSpaceId = '';
let hostL2Id = '';
/** A second L0 of the SAME account, PUBLIC, with one L1 beneath it. */
let siblingL0Id = '';
let siblingL1Id = '';
/** A throwaway L1 under the sibling L0, created only so case 3 can delete it. */
let staleL1Id = '';
/** A space on a DIFFERENT account — the boundary under test. */
let foreignSpaceId = '';

const createdCalloutIds: string[] = [];

const scenarioConfig: TestScenarioConfig = {
  name: `spaces-selection-account-scope-${uniqueId}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      subspace: { collaboration: { addTutorialCallouts: false } },
    },
  },
};

type GqlError = { message: string; extensions?: { code?: string } };
type RawResult<T> = { data: T | null; errors: GqlError[] };

/**
 * Raw GraphQL, as `journey/space/space-classifications.request.params.ts` does
 * it. Both documents below are hand-written rather than generated-SDK calls
 * because the SDK cannot carry them: it is generated in the `lib` package from
 * a LIVE server (`lib/codegen.ts`), `accountSpaces` appears zero times in
 * `lib/src/core/generated/*`, and no shipped operation selects
 * `CalloutFraming.subspaces` at all. A bare worktree has no stack to
 * regenerate from, and the committed SDK is in any case already stale against
 * the server (its `RoleName` enum predates workspace#027).
 */
const rawQuery = async <T>(
  query: string,
  variables: Record<string, unknown>,
  as: TestUser
): Promise<RawResult<T>> => {
  const bearerToken = TestUserManager.getUserModelByType(as).authToken;
  const res = await postGraphqlRaw<T>(query, { variables, bearerToken });
  if (res.status !== 200) {
    throw new Error(
      `GraphQL transport failure (HTTP ${res.status}): ${res.raw}`
    );
  }
  return {
    data: (res.body.data ?? null) as T | null,
    errors: (res.body.errors ?? []) as unknown as GqlError[],
  };
};

type AccountSpacesData = {
  lookup: {
    space: {
      accountSpaces: Array<{
        id: string;
        displayName: string;
        level: SpaceLevel;
        parentSpaceID: string | null;
      }>;
    } | null;
  };
};

/** AC2 / FR-009. Four scalars — the whole `SpaceSelectionCandidate` DTO. The field takes no arguments. */
const ACCOUNT_SPACES_QUERY = `
  query AccountSpaces($spaceId: UUID!) {
    lookup {
      space(ID: $spaceId) {
        accountSpaces {
          id
          displayName
          level
          parentSpaceID
        }
      }
    }
  }
`;

type RenderedSpacesData = {
  lookup: {
    callout: {
      framing: {
        subspaces: Array<{
          id: string;
          level: SpaceLevel;
          visibility: string;
          pinned: boolean;
          sortOrder: number;
        }>;
      };
    } | null;
  };
};

/**
 * The CUSTOM read path, selecting FOUR NON-NULL scalars on purpose
 * (COMP-084-R5-06 / FEAS-01, FR-017): `ISpace.level`, `.visibility`, `.pinned`
 * and `.sortOrder` are `@Field(nullable: false)` and `CalloutFraming.subspaces`
 * is `[Space!]!`, so a column-restricted select in the CUSTOM branch — e.g.
 * `.select(['space.id'])`, a natural reading of "load no relation other than
 * authorization" — nullifies every element and the whole list. These are also
 * exactly the fields the real consumer selects (`subspaceCard.graphql`).
 */
const RENDERED_SPACES_QUERY = `
  query CalloutRenderedSpaces($calloutId: UUID!) {
    lookup {
      callout(ID: $calloutId) {
        framing {
          subspaces {
            id
            level
            visibility
            pinned
            sortOrder
          }
        }
      }
    }
  }
`;

const calloutDisplayName = (label: string) => `spaces-${label}-${uniqueId}`;

/** Creates a SPACES callout with a CUSTOM selection, as the space admin. */
const createSpacesCalloutWithSelection = async (
  label: string,
  selectedIds: string[]
) =>
  createSpacesCollectionCallout(
    {
      calloutsSetID: calloutsSetId,
      framing: {
        type: CalloutFramingType.Spaces,
        profile: { displayName: calloutDisplayName(label) },
      },
      settings: {
        framing: {
          selection: { mode: CalloutSelectionMode.Custom, selectedIds },
        },
      },
    },
    TestUser.SPACE_ADMIN
  );

/** The persisted selection, read back fresh — the mutation answers with what it just saved. */
const storedSelection = async (calloutId: string) => {
  const reread = await getCalloutSpacesSettings(calloutId);
  expect(reread.error).toBeUndefined();
  return reread?.data?.lookup?.callout?.settings?.framing?.selection;
};

const REJECTION_REASON =
  'One or more selected spaces do not belong to the account of this space.';

beforeAll(async () => {
  try {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
    hostSpaceId = baseScenario.space.id;
    hostL2Id = baseScenario.subsubspace.id;

    // The host space sits on the scenario ORGANIZATION's account, which
    // TestScenarioFactory pre-licenses with ACCOUNT_LICENSE_PLUS
    // (ACCOUNT_SPACE_FREE limit 3; the scenario space uses one, the sibling L0
    // below uses a second). No licence call is therefore needed here. If a
    // create below is nevertheless denied on an entitlement, it throws from
    // `createSpaceBasicDataOrFail` naming the entitlement — a FIXTURE error, not
    // a product verdict — and the permitted remedy is one
    // `assignLicensePlanToAccount(accountId, getLicensePlanByName('ACCOUNT_LICENSE_PLUS'))`
    // line here (T202).
    siblingL0Id = await createSpaceBasicDataOrFail(
      `acct-scope-sibling-${uniqueId}`,
      `acctsibling${uniqueId}`,
      baseScenario.organization.accountId,
      false
    );
    // PUBLIC, immediately. Left PRIVATE (the space-template default) the
    // host-space admin holds no role on it, so FR-010's per-viewer READ filter
    // would exclude it and its L1 from `accountSpaces`, making case 5 and case
    // 4's rendered half RED for environment reasons. Acting as GLOBAL_ADMIN
    // instead would reach PRIVATE spaces through the inherited root policy and
    // destroy case 6's contrast (FEAS-084-R5-01).
    await updateSpaceSettings(siblingL0Id, {
      privacy: { mode: SpacePrivacyMode.Public },
    });
    siblingL1Id = await createSubspaceOrFail(
      `acct-scope-sibling-l1-${uniqueId}`,
      `acctsiblingl1${uniqueId}`,
      siblingL0Id
    );
    staleL1Id = await createSubspaceOrFail(
      `acct-scope-stale-l1-${uniqueId}`,
      `acctstalel1${uniqueId}`,
      siblingL0Id
    );

    // A DIFFERENT account: `spaceAdmin`'s own user account, which the factory
    // also pre-licenses. Created BY `spaceAdmin` (not the default GLOBAL_ADMIN),
    // because the creating actor is assigned MEMBER/LEAD/ADMIN on the new space
    // (`space.service.ts` → `assignUserToRoles`) and `spaceAdmin` holds
    // CREATE_SPACE on their own account. That is load-bearing for case 5, not
    // tidiness: `accountSpaces` filters per viewer on READ, not READ_ABOUT, and a
    // PRIVATE L0 created by someone else grants the account owner READ_ABOUT
    // only — so the exclusion would hold even with NO account predicate at all,
    // and the case would be over-determined. Owning it as its admin gives plain
    // READ while the space keeps the PRIVATE default, so the only thing that can
    // keep it out of `accountSpaces` is the account boundary itself.
    foreignSpaceId = await createSpaceBasicDataOrFail(
      `acct-scope-foreign-${uniqueId}`,
      `acctforeign${uniqueId}`,
      TestUserManager.users.spaceAdmin.accountId,
      false,
      TestUser.SPACE_ADMIN
    );

    // A fixture that silently failed must fail AS A FIXTURE ERROR, never as a
    // green test over `undefined`.
    expect(hostSpaceId).toBeTruthy();
    expect(hostL2Id).toBeTruthy();
    expect(siblingL0Id).toBeTruthy();
    expect(siblingL1Id).toBeTruthy();
    expect(staleL1Id).toBeTruthy();
    expect(foreignSpaceId).toBeTruthy();
  } catch (error) {
    // Clean up whatever was created before rethrowing, so a failed setup never
    // leaves fixture spaces behind on a shared cluster. The rethrow keeps the
    // suite red: this swallows nothing.
    await tearDownFixture();
    throw error;
  }
});

/**
 * ONE owner for teardown, called from `afterAll` AND from `beforeAll`'s own
 * failure path.
 *
 * Why both: this file is enrolled in the `nightly` project, which runs against
 * the SHARED test cluster, and Vitest 4 does not document whether `afterAll`
 * runs when `beforeAll` throws (reviewed on PR #675; the docs are silent and a
 * local probe was inconclusive). A `beforeAll` that fails after creating two of
 * its four spaces would then leak them into a shared environment, which is
 * precisely the risk the slice already records as a residual. So setup cleans
 * up after itself rather than relying on the hook ordering.
 *
 * Every step is individually guarded and failure-tolerant: ids are read off the
 * module bindings, so whichever ones were assigned before the throw are removed
 * and the rest are skipped.
 */
const tearDownFixture = async () => {
  await Promise.allSettled(createdCalloutIds.map(id => deleteCallout(id)));
  // Children before parents; `staleL1Id` is already gone by case 3.
  for (const id of [siblingL1Id, staleL1Id, siblingL0Id, foreignSpaceId]) {
    if (id) await deleteSpace(id).catch(() => undefined);
  }
  if (baseScenario) {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario).catch(
      () => undefined
    );
  }
};

afterAll(async () => {
  await tearDownFixture();
});

describe('Spaces-collection CUSTOM selection — the account boundary', () => {
  test('case 1 (AC4 / FR-003, create) — a foreign-account id is rejected and nothing is persisted', async () => {
    const displayName = calloutDisplayName('create-foreign');
    const res = await createSpacesCalloutWithSelection('create-foreign', [
      foreignSpaceId,
    ]);

    // The wrapper also reports `error` on a connection failure, so a rejection
    // is only proven by its reason.
    expect(res.error).toBeDefined();
    expect(JSON.stringify(res.error?.errors)).toContain(REJECTION_REASON);
    expect(res?.data?.createCalloutOnCalloutsSet?.id).toBeUndefined();

    // "Persists nothing" is only shown by listing the set afterwards.
    const listed = await getCalloutsData(calloutsSetId);
    expect(listed.error).toBeUndefined();
    const names = (listed.data?.lookup.calloutsSet?.callouts ?? []).map(
      c => c.framing.profile.displayName
    );
    expect(names).not.toContain(displayName);
  });

  test('case 2 (AC4 / FR-003b, update) — a NEWLY ADDED foreign id is rejected and the stored list is unchanged', async () => {
    // The half that had no coverage anywhere, and the one a wrong pre-merge
    // snapshot point makes impossible to catch (ruling D3): read the stored
    // list at the guard call site and `stored === submitted`, so `added` is
    // empty, the foreign id is treated as carried over, and it is accepted.
    const created = await createSpacesCalloutWithSelection('update-reject', [
      hostL2Id,
    ]);
    expect(created.error).toBeUndefined();
    const calloutId = created?.data?.createCalloutOnCalloutsSet?.id ?? '';
    expect(calloutId).toBeTruthy();
    createdCalloutIds.push(calloutId);

    const updated = await updateCalloutSpacesSettings(
      {
        ID: calloutId,
        settings: {
          framing: {
            selection: {
              mode: CalloutSelectionMode.Custom,
              selectedIds: [hostL2Id, foreignSpaceId],
            },
          },
        },
      },
      TestUser.SPACE_ADMIN
    );
    expect(updated.error).toBeDefined();
    expect(JSON.stringify(updated.error?.errors)).toContain(REJECTION_REASON);

    const stored = await storedSelection(calloutId);
    expect(stored?.mode).toBe(CalloutSelectionMode.Custom);
    expect(stored?.selectedIds).toEqual([hostL2Id]);
  });

  test('case 3 (AC7 / FR-003b) — an id that has LEFT the account is dropped silently, with no error', async () => {
    // The matched half of case 2. The pair is what discriminates: snapshot
    // after the merge and case 2 passes wrongly; treat every submitted id as
    // newly added and this case throws instead of dropping.
    //
    // FR-020 guarantees the stale id survives the delete: selection ids carry
    // no FK and no cascade, which is exactly why they go stale.
    const created = await createSpacesCalloutWithSelection('update-drop', [
      hostL2Id,
      staleL1Id,
    ]);
    expect(created.error).toBeUndefined();
    const calloutId = created?.data?.createCalloutOnCalloutsSet?.id ?? '';
    expect(calloutId).toBeTruthy();
    createdCalloutIds.push(calloutId);
    expect((await storedSelection(calloutId))?.selectedIds).toEqual([
      hostL2Id,
      staleL1Id,
    ]);

    const deleted = await deleteSpace(staleL1Id);
    expect(deleted.error).toBeUndefined();

    // An update that submits NO selection leaves the stale id inert: the guard
    // runs only on ids the caller explicitly submitted, so no admin action is
    // required to tidy a since-departed space (FR-008). Asserted, because the
    // chunk brief described the drop as happening on "an otherwise unrelated
    // update" and the shipped server deliberately does not do that — the
    // boundary is worth pinning so a later round does not "fix" it.
    const unrelated = await updateCalloutSpacesSettings(
      { ID: calloutId, settings: { framing: { commentsEnabled: false } } },
      TestUser.SPACE_ADMIN
    );
    expect(unrelated.error).toBeUndefined();
    expect((await storedSelection(calloutId))?.selectedIds).toEqual([
      hostL2Id,
      staleL1Id,
    ]);

    // The drop: the client posts back the selection it holds on every update,
    // stale entry included. No error, no warning field — the entry is simply
    // not persisted.
    const resubmitted = await updateCalloutSpacesSettings(
      {
        ID: calloutId,
        settings: {
          framing: {
            selection: {
              mode: CalloutSelectionMode.Custom,
              selectedIds: [hostL2Id, staleL1Id],
            },
          },
        },
      },
      TestUser.SPACE_ADMIN
    );
    expect(resubmitted.error).toBeUndefined();

    const stored = await storedSelection(calloutId);
    expect(stored?.mode).toBe(CalloutSelectionMode.Custom);
    expect(stored?.selectedIds).toEqual([hostL2Id]);
  });

  test('case 4 (AC1 / FR-004a, FR-017) — a space under a DIFFERENT L0 of the same account and the host’s own L2 are accepted, persisted and rendered whole', async () => {
    // RED if the predicate joins `space."accountId"` directly instead of
    // resolving the account through `levelZeroSpaceID` (see file header) — and
    // the only executed proof that the READ path, not just the write guard,
    // resolves it that way.
    const created = await createSpacesCalloutWithSelection('cross-l0', [
      siblingL1Id,
      hostL2Id,
    ]);
    expect(created.error).toBeUndefined();
    const calloutId = created?.data?.createCalloutOnCalloutsSet?.id ?? '';
    expect(calloutId).toBeTruthy();
    createdCalloutIds.push(calloutId);

    const stored = await storedSelection(calloutId);
    expect(stored?.mode).toBe(CalloutSelectionMode.Custom);
    expect(stored?.selectedIds).toEqual([siblingL1Id, hostL2Id]);

    const rendered = await rawQuery<RenderedSpacesData>(
      RENDERED_SPACES_QUERY,
      { calloutId },
      TestUser.SPACE_ADMIN
    );
    // A restricted column select nullifies every element and then the whole
    // non-null list, so an empty `errors` is itself part of the assertion.
    expect(rendered.errors).toEqual([]);
    const subspaces = rendered.data?.lookup?.callout?.framing?.subspaces ?? [];
    expect(subspaces.map(s => s.id).sort()).toEqual(
      [siblingL1Id, hostL2Id].sort()
    );
    // Every non-null scalar the real consumer selects came back populated.
    for (const space of subspaces) {
      expect(space.level).toBeTruthy();
      expect(space.visibility).toBeTruthy();
      expect(typeof space.pinned).toBe('boolean');
      expect(typeof space.sortOrder).toBe('number');
    }
  });

  test('case 5 (AC2 / FR-010) — accountSpaces offers the account’s spaces at every level and never the foreign one', async () => {
    const res = await rawQuery<AccountSpacesData>(
      ACCOUNT_SPACES_QUERY,
      { spaceId: hostSpaceId },
      TestUser.SPACE_ADMIN
    );
    expect(res.errors).toEqual([]);
    const candidates = res.data?.lookup?.space?.accountSpaces ?? [];
    const ids = candidates.map(c => c.id);

    // Spaces of that account at EVERY level, across BOTH of its L0 trees.
    expect(ids).toEqual(
      expect.arrayContaining([
        hostSpaceId,
        baseScenario.subspace.id,
        hostL2Id,
        siblingL0Id,
        siblingL1Id,
      ])
    );
    // The boundary, and the only thing that can produce it: the acting admin
    // holds READ on this space — they are its admin (see the fixture) — so the
    // per-viewer READ filter cannot account for the exclusion.
    expect(ids).not.toContain(foreignSpaceId);

    // The four DTO scalars, and the parentage the picker sorts by.
    const host = candidates.find(c => c.id === hostSpaceId);
    expect(host?.level).toBe(SpaceLevel.L0);
    expect(host?.parentSpaceID).toBeNull();
    expect(host?.displayName).toBeTruthy();
    const siblingL1 = candidates.find(c => c.id === siblingL1Id);
    expect(siblingL1?.level).toBe(SpaceLevel.L1);
    expect(siblingL1?.parentSpaceID).toBe(siblingL0Id);
  });

  test('case 6 (AC3 / FR-009) — accountSpaces is refused to an actor holding READ but not UPDATE on the host space', async () => {
    // `tasks/server.md` T010 asserts the decorator structurally; this asserts
    // the behaviour. SPACE_MEMBER is a member of the host space, so READ is
    // held and only UPDATE is missing.
    const res = await rawQuery<AccountSpacesData>(
      ACCOUNT_SPACES_QUERY,
      { spaceId: hostSpaceId },
      TestUser.SPACE_MEMBER
    );
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0].extensions?.code).toBe('FORBIDDEN_POLICY');
    expect(res.data?.lookup?.space).toBeNull();
  });
});
