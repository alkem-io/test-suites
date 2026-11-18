// workspace#027 — platform role redesign. Manual checklist C10–C12, automated:
// what each FEATURE role is offered in the product. The server side (the
// entitlement / privilege each role confers) is proven by the API suite
// (scenarios F1–F3); this file checks the OFFER the client makes on top of it.
// Roles are used as each other's negatives — no "plain" user is assumed, since
// a shared plain user can pick up roles during manual testing.
import { expect, type Page, type Response } from '@playwright/test';
import {
  LicenseEntitlementType,
  platformRoleEmail,
  readMyUser,
  readPlatformVirtualAssistantAccess,
  seedPlatformRoleUsers,
} from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { must, sessionActor } from '../helpers/lib-actor.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let seeded: Promise<unknown> | undefined;
const rolesAreSeeded = () => (seeded ??= seedPlatformRoleUsers());

const campaignBanner = (page: Page) => page.getByText('Create your Virtual Contributor');
const assistantButton = (page: Page) => page.getByRole('button', { name: 'Open the assistant' });
/** The client's RUNTIME assistant flag, as deployed in `/env-config.js` (`window._env_`).
 * `useAssistantEnabled` reads exactly this value; it is configuration, not the
 * button under test, so the offer check never infers the flag from the DOM. */
const clientAssistantFlagOn = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { _env_?: { VITE_APP_ASSISTANT_ENABLED?: string } })._env_
        ?.VITE_APP_ASSISTANT_ENABLED === 'true'
  );
/**
 * Opens /home and returns what the client's user context received from the
 * server: the two inputs of the dashboard's `showCampaign` other than the
 * client-side `isVcCampaignTargeted` gate.
 */
const openHomeReadingCampaignInputs = async (page: Page) => {
  const operation = (name: string) => (r: Response) =>
    r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === name;
  const rolesResponse = page.waitForResponse(operation('PlatformLevelAuthorization'));
  const userResponse = page.waitForResponse(operation('CurrentUserLight'));
  await page.goto(`${baseUrl}/home`);
  const roles = (await (await rolesResponse).json()).data?.platform?.roleSet?.myRoles ?? [];
  const entitlements =
    (await (await userResponse).json()).data?.me?.user?.account?.license?.availableEntitlements ?? [];
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  return { roles: roles as string[], entitlements: entitlements as string[] };
};
const myProfileUrl = async (page: Page) => {
  const actor = await sessionActor(page);
  const me = must(await readMyUser(actor), 'read own profile url');
  const platform = must(await readPlatformVirtualAssistantAccess(actor), 'read virtualAssistantAccess');
  return { url: me.me.user!.profile!.url as string, assistant: platform.platform.virtualAssistantAccess as boolean };
};

const asVcCampaign = createPersonaTest(platformRoleEmail('FEATURE_VC_CAMPAIGN'));
asVcCampaign.beforeEach(rolesAreSeeded);
// Skipped while Virtual Contributors are switched off in the client
// (client-web#10398: isVcCampaignTargeted is hard-wired to false). #10398 is
// CLOSED while the TEMP code is still on develop, so nothing open tracks the
// restore: the tripwire below goes red when the gate is lifted. Then un-skip
// this test and delete the tripwire.
asVcCampaign.skip('FEATURE_VC_CAMPAIGN: the dashboard shows the Virtual Contributor campaign (client-web#10398)', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(campaignBanner(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Create Virtual Contributor' })).toBeVisible();
});

// TRIPWIRE for the skip above (QA-CH-03, #727). The role and the VC
// entitlement are proven from what the client itself received, so the only
// thing that can withhold the banner is the client's TEMP gate. Without this,
// the "no campaign" negatives below could never fail: nobody sees the banner.
asVcCampaign('FEATURE_VC_CAMPAIGN: while the client-web#10398 TEMP gate holds, the campaign is withheld despite role and entitlement', async ({ page }) => {
  const { roles, entitlements } = await openHomeReadingCampaignInputs(page);
  expect(roles, 'platform roles the client received').toContain('FEATURE_VC_CAMPAIGN');
  expect(entitlements, 'account entitlements the client received').toContain(
    LicenseEntitlementType.AccountVirtualContributor
  );
  await expect(campaignBanner(page)).toHaveCount(0);
});

const asBetaTester = createPersonaTest(platformRoleEmail('FEATURE_BETA_TESTER'));
asBetaTester.beforeEach(rolesAreSeeded);
asBetaTester('FEATURE_BETA_TESTER: trial allowances on the account, no campaign, no "create organisation"', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  // Inert while the client-web#10398 TEMP gate hides the banner from everyone;
  // it bites again once the tripwire above goes red and the gate is lifted.
  await expect(campaignBanner(page)).toHaveCount(0);
  const { url } = await myProfileUrl(page);
  await page.goto(`${url}/settings/account`);
  // The trial entitlement: hosted spaces and Virtual Contributors above zero.
  await expect(page.getByRole('heading', { name: /^Hosted Spaces 0\/[1-9]/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /^Virtual Contributors 0\/[1-9]/ })).toBeVisible();
  await page.goto(`${url}/settings/organizations`);
  await expect(page.getByRole('tab', { name: 'Organisations' })).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 });
  await expect(page.getByRole('main').getByRole('button', { name: /create|new organi/i })).toHaveCount(0);
});

const asVirtualAssistant = createPersonaTest(platformRoleEmail('FEATURE_VIRTUAL_ASSISTANT'));
asVirtualAssistant.beforeEach(rolesAreSeeded);
asVirtualAssistant('FEATURE_VIRTUAL_ASSISTANT: the assistant is available (server), and offered exactly when the client flag is on', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  const { assistant } = await myProfileUrl(page);
  expect(assistant, 'platform.virtualAssistantAccess').toBe(true);
  // Inert while the client-web#10398 TEMP gate holds (see the tripwire above).
  await expect(campaignBanner(page)).toHaveCount(0);
  // The offer needs BOTH the privilege (asserted above) and the client's
  // runtime flag VITE_APP_ASSISTANT_ENABLED (useAssistantEnabled). The flag is
  // read from the deployed config, never inferred from the button: a missing
  // button used to SKIP this test, which is exactly what the regression looks
  // like (QA-CH-02, #727).
  if (await clientAssistantFlagOn(page)) {
    await expect(assistantButton(page)).toBeVisible();
  } else {
    // Flag off: the gate must hide the offer even from a holder of the privilege.
    await expect(assistantButton(page)).toHaveCount(0);
  }
});

const asOtherRole = createPersonaTest(platformRoleEmail('FEATURE_VC_CAMPAIGN'));
asOtherRole('a role WITHOUT Feature Virtual Assistant has no assistant access', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  expect((await myProfileUrl(page)).assistant).toBe(false);
  await expect(assistantButton(page)).toHaveCount(0);
});
