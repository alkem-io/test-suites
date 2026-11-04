/**
 * Memo signing is gated by the SPACE_FLAG_MEMO_SIGNING entitlement
 * (server#6478, Release 75). This spec pins the licensing contract at the API:
 *
 *  - every new space and subspace carries the entitlement, disabled (backfill +
 *    create-time default);
 *  - `prepareMemoSigning` is refused on the ENTITLEMENT while it is off, for an
 *    admin and for a plain member alike;
 *  - granting the memo-signing license plan to the L0 space enables it there
 *    AND on its subspace (collaboration-license inheritance), after which the
 *    same mutation is refused one gate later — on the missing Cleverbase
 *    identity — proving the entitlement gate is what changed;
 *  - revoking the plan closes the gate again.
 *
 * Nothing here reaches the trust gateway: the identity gate always trips first
 * for the harness personas, which is exactly the inert state Release 75 ships.
 */
import {
  getGraphqlClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  getCalloutFramingMemo,
  getSpaceLicenseEntitlements,
  prepareMemoSigning,
} from '@alkemio/tests-lib/scenario/baseFunctions';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CalloutFramingType,
  CalloutVisibility,
  LicenseEntitlementType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignLicensePlanToSpace,
  getLicensePlanByName,
  revokeLicensePlanFromSpace,
} from '@functional-api/license/license.params.request';

const uniqueId = UniqueIDGenerator.getID();
const MEMO_SIGNING_PLAN_CREDENTIAL = 'SPACE_FEATURE_MEMO_SIGNING';
// The server prints the entitlement's enum VALUE (lower-kebab), not its name.
const ENTITLEMENT_ERROR = /Entitlement space-flag-memo-signing is not available/i;
const IDENTITY_ERROR = /Link a Cleverbase identity before signing this memo/;

const scenarioConfig: TestScenarioConfig = {
  name: 'memo-signing-entitlement',
  space: {
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
      },
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let l0MemoId = '';
let subspaceMemoId = '';
let memoSigningPlanId = '';

const createMemoCallout = async (calloutsSetID: string, label: string) => {
  const graphqlClient = getGraphqlClient();
  const displayName = `memo-signing ${label} ${uniqueId}`;
  const res = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      graphqlClient.CreateCalloutOnCalloutsSet(
        {
          calloutData: {
            calloutsSetID,
            framing: {
              profile: { displayName },
              type: CalloutFramingType.Memo,
              memo: {
                markdown: `# ${displayName}\n\nA memo to (not) sign.`,
                profile: { displayName },
              },
            },
            settings: { visibility: CalloutVisibility.Published },
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const calloutId = res.data?.createCalloutOnCalloutsSet?.id;
  if (!calloutId) {
    throw new Error(`memo callout not created: ${JSON.stringify(res.error)}`);
  }
  const framing = await getCalloutFramingMemo(calloutId);
  const memoId = framing.data?.lookup?.callout?.framing?.memo?.id;
  if (!memoId) {
    throw new Error(`memo id not resolved: ${JSON.stringify(framing.error)}`);
  }
  return memoId;
};

const memoSigningEntitlement = async (spaceId: string) => {
  const res = await getSpaceLicenseEntitlements(spaceId);
  const entitlement = res.data?.lookup?.space?.license?.entitlements?.find(
    e => e.type === LicenseEntitlementType.SpaceFlagMemoSigning
  );
  return entitlement;
};

type WithGraphqlError = { error?: { errors?: Array<{ message?: string }> } };
const firstErrorMessage = (res: WithGraphqlError) =>
  res.error?.errors?.[0]?.message ?? '';

describe('Memo signing — SPACE_FLAG_MEMO_SIGNING entitlement (server#6478)', () => {
  beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    l0MemoId = await createMemoCallout(baseScenario.space.collaboration.calloutsSetId, 'L0');
    subspaceMemoId = await createMemoCallout(
      baseScenario.subspace.collaboration.calloutsSetId,
      'L1'
    );
    const plans = await getLicensePlanByName(MEMO_SIGNING_PLAN_CREDENTIAL);
    memoSigningPlanId = plans[0]?.id ?? '';
    if (!memoSigningPlanId) {
      throw new Error(`No license plan with credential ${MEMO_SIGNING_PLAN_CREDENTIAL}`);
    }
  });

  afterAll(async () => {
    // `graphqlErrorWrapper` reports GraphQL failures in `result.error` rather
    // than throwing: inspect the revoke, still clean the scenario up, then
    // report every teardown failure together.
    const failures: string[] = [];
    if (memoSigningPlanId && baseScenario?.space?.id) {
      // Idempotent: leaves the plan revoked whatever the last test did.
      const revoked = await revokeLicensePlanFromSpace(baseScenario.space.id, memoSigningPlanId);
      if (revoked?.error) failures.push(`revokeLicensePlanFromSpace: ${JSON.stringify(revoked.error)}`);
    }
    try {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    } catch (error) {
      failures.push(`cleanUpBaseScenario: ${String(error)}`);
    }
    if (failures.length > 0) {
      throw new Error(`memo-signing-entitlement teardown failed:\n${failures.join('\n')}`);
    }
  });

  test('a new space and its subspace carry the entitlement, disabled', async () => {
    const l0 = await memoSigningEntitlement(baseScenario.space.id);
    const l1 = await memoSigningEntitlement(baseScenario.subspace.id);
    expect(l0).toMatchObject({ enabled: false, limit: 0 });
    expect(l1).toMatchObject({ enabled: false, limit: 0 });
  });

  test.each`
    role                    | memo
    ${TestUser.SPACE_ADMIN} | ${'L0'}
    ${TestUser.SPACE_MEMBER}| ${'L0'}
    ${TestUser.SPACE_ADMIN} | ${'L1'}
  `(
    'prepareMemoSigning is refused on the ENTITLEMENT while it is off ($role, $memo memo)',
    async ({ role, memo }) => {
      const res = await prepareMemoSigning(memo === 'L0' ? l0MemoId : subspaceMemoId, role);
      expect(res.data?.prepareMemoSigning).toBeUndefined();
      expect(firstErrorMessage(res)).toMatch(ENTITLEMENT_ERROR);
      // The entitlement gate runs BEFORE the identity gate: no identity error leaks.
      expect(firstErrorMessage(res)).not.toMatch(IDENTITY_ERROR);
    }
  );

  test('granting the memo-signing plan to the L0 space enables it there and on the subspace', async () => {
    const assigned = await assignLicensePlanToSpace(baseScenario.space.id, memoSigningPlanId);
    expect(assigned.error).toBeUndefined();
    const l0 = await memoSigningEntitlement(baseScenario.space.id);
    const l1 = await memoSigningEntitlement(baseScenario.subspace.id);
    expect(l0).toMatchObject({ enabled: true, limit: 1 });
    expect(l1).toMatchObject({ enabled: true, limit: 1 });
  });

  // Both memos are exercised by the L0 space admin: the identity gate sits
  // behind CONTRIBUTE on the memo, which the subspace-only personas do not
  // hold on a callout created by the platform admin (that refusal is the
  // authorization gate, a different contract).
  test.each`
    role                    | memo
    ${TestUser.SPACE_ADMIN} | ${'L0'}
    ${TestUser.SPACE_ADMIN} | ${'L1'}
  `(
    'with the entitlement on, the refusal moves to the identity gate ($role, $memo memo)',
    async ({ role, memo }) => {
      const res = await prepareMemoSigning(memo === 'L0' ? l0MemoId : subspaceMemoId, role);
      expect(res.data?.prepareMemoSigning).toBeUndefined();
      expect(firstErrorMessage(res)).toMatch(IDENTITY_ERROR);
      expect(firstErrorMessage(res)).not.toMatch(ENTITLEMENT_ERROR);
    }
  );

  test('revoking the plan closes the gate again', async () => {
    const revoked = await revokeLicensePlanFromSpace(baseScenario.space.id, memoSigningPlanId);
    if (revoked.error) {
      console.log('REVOKE_ERROR', JSON.stringify(revoked.error));
    }
    expect(revoked.error).toBeUndefined();
    const l0 = await memoSigningEntitlement(baseScenario.space.id);
    expect(l0).toMatchObject({ enabled: false });
    const res = await prepareMemoSigning(l0MemoId, TestUser.SPACE_ADMIN);
    expect(firstErrorMessage(res)).toMatch(ENTITLEMENT_ERROR);
  });
});
