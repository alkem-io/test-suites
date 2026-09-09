// Memo signing — the Sign action gate in the memo dialog (server#6478 +
// client-web#10278, Release 75 verification rows 13 and 14; P13, P14).
//
// The "Sign memo" action renders only when the user has CONTRIBUTE, the space
// inherits SPACE_FLAG_MEMO_SIGNING, AND the identity has a Cleverbase login
// method. No harness persona has a Cleverbase method, so the action must be
// absent BOTH with the entitlement off (the shipped default) and with it on —
// the second case proves the identity gate holds on its own. The API side of
// the same contract lives in server-api entitlements/memo-signing-entitlement.
import { expect } from '@playwright/test';
import { getGraphqlClient, TestUser, UniqueIDGenerator } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { CalloutFramingType, CalloutVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const MEMO_SIGNING_PLAN_NAME = 'SPACE_FEATURE_MEMO_SIGNING';
const uniqueId = UniqueIDGenerator.getID();

const scenarioConfig: TestScenarioConfig = {
  name: 'memo-sign-gate',
  space: {
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let memoCalloutUrl = '';
let memoTitle = '';
let memoSigningPlanId = '';
const test = createPersonaTest('space.admin@alkem.io');
test.describe.configure({ mode: 'serial' });

const admin = async (fn: (token: string | undefined) => Promise<any>): Promise<any> =>
  graphqlErrorWrapper(fn as any, TestUser.GLOBAL_ADMIN);

test.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const client = getGraphqlClient();
  const displayName = `memo sign gate ${uniqueId}`;
  memoTitle = displayName;
  const created = await admin(token =>
    client.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID: baseScenario.space.collaboration.calloutsSetId,
          framing: {
            profile: { displayName },
            type: CalloutFramingType.Memo,
            memo: { markdown: `# ${displayName}`, profile: { displayName } },
          },
          settings: { visibility: CalloutVisibility.Published },
        },
      },
      { authorization: `Bearer ${token}` }
    )
  );
  memoCalloutUrl = created.data?.createCalloutOnCalloutsSet?.framing?.profile?.url ?? '';
  if (!memoCalloutUrl) throw new Error(`memo callout not created: ${JSON.stringify(created.error)}`);
  const plans = await admin(token => client.GetPlatformLicensePlans({}, { authorization: `Bearer ${token}` }));
  memoSigningPlanId =
    plans.data?.platform?.licensingFramework?.plans?.find((p: { name: string }) => p.name === MEMO_SIGNING_PLAN_NAME)?.id ?? '';
  if (!memoSigningPlanId) throw new Error(`license plan ${MEMO_SIGNING_PLAN_NAME} not found`);
});

test.afterAll(async () => {
  const client = getGraphqlClient();
  const licensingID = (await admin(token => client.GetPlatformLicensePlans({}, { authorization: `Bearer ${token}` }))).data?.platform?.licensingFramework?.id ?? '';
  if (memoSigningPlanId && baseScenario?.space?.id) {
    await admin(token =>
      client.RevokeLicensePlanFromSpace(
        { planData: { spaceID: baseScenario.space.id, licensePlanID: memoSigningPlanId, licensingID } },
        { authorization: `Bearer ${token}` }
      )
    );
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const openMemo = async (page: import('@playwright/test').Page) => {
  await page.goto(memoCalloutUrl);
  await page.getByRole('button', { name: 'Open Memo' }).first().click();
  const dialog = page.getByRole('dialog', { name: memoTitle });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  return dialog;
};

test('13.1 With the entitlement off (shipped default) the memo dialog offers no Sign action', async ({ page }) => {
  const dialog = await openMemo(page);
  await expect(dialog.getByRole('button', { name: 'Sign memo' })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Signed copies' })).toHaveCount(0);
});

test('14.1 With the entitlement granted, the identity gate still hides the Sign action', async ({ page }) => {
  const client = getGraphqlClient();
  const assigned = await admin(token =>
    client.AssignLicensePlanToSpace(
      { planData: { spaceID: baseScenario.space.id, licensePlanID: memoSigningPlanId } },
      { authorization: `Bearer ${token}` }
    )
  );
  expect(assigned.error).toBeUndefined();
  const dialog = await openMemo(page);
  // The memo itself still opens and is shareable…
  await expect(dialog.getByRole('button', { name: 'Share' })).toBeVisible();
  // …but signing is not offered to an identity without a Cleverbase method.
  await expect(dialog.getByRole('button', { name: 'Sign memo' })).toHaveCount(0);
});
