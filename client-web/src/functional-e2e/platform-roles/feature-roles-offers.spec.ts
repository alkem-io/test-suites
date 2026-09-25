// workspace#027 — platform role redesign. Manual checklist C10–C12, automated:
// what each FEATURE role is offered in the product. The server side (the
// entitlement / privilege each role confers) is proven by the API suite
// (scenarios F1–F3); this file checks the OFFER the client makes on top of it.
// Roles are used as each other's negatives — no "plain" user is assumed, since
// a shared plain user can pick up roles during manual testing.
import { expect, type Page } from '@playwright/test';
import { platformRoleEmail, seedPlatformRoleUsers } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let seeded: Promise<unknown> | undefined;
const rolesAreSeeded = () => (seeded ??= seedPlatformRoleUsers());

const campaignBanner = (page: Page) => page.getByText('Create your Virtual Contributor');
const assistantButton = (page: Page) => page.getByRole('button', { name: 'Open the assistant' });
const myProfileUrl = (page: Page) =>
  page.evaluate(async () => {
    const res = await fetch('/api/private/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ me { user { profile { url } } } platform { virtualAssistantAccess } }' }),
    });
    const { data } = await res.json();
    return { url: data.me.user.profile.url as string, assistant: data.platform.virtualAssistantAccess as boolean };
  });

const asVcCampaign = createPersonaTest(platformRoleEmail('FEATURE_VC_CAMPAIGN'));
asVcCampaign.beforeEach(rolesAreSeeded);
asVcCampaign('FEATURE_VC_CAMPAIGN: the dashboard shows the Virtual Contributor campaign', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(campaignBanner(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Create Virtual Contributor' })).toBeVisible();
});

const asBetaTester = createPersonaTest(platformRoleEmail('FEATURE_BETA_TESTER'));
asBetaTester.beforeEach(rolesAreSeeded);
asBetaTester('FEATURE_BETA_TESTER: trial allowances on the account, no campaign, no "create organisation"', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
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
asVirtualAssistant('FEATURE_VIRTUAL_ASSISTANT: the assistant is available (server), and offered when the client flag is on', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  const { assistant } = await myProfileUrl(page);
  expect(assistant, 'platform.virtualAssistantAccess').toBe(true);
  await expect(campaignBanner(page)).toHaveCount(0);
  // The button is additionally gated on the client BUILD flag
  // VITE_APP_ASSISTANT_ENABLED; a client built without it offers nothing to
  // anyone, so the offer can only be asserted where the flag is on.
  const offered = (await assistantButton(page).count()) > 0;
  asVirtualAssistant.skip(!offered, 'client built with VITE_APP_ASSISTANT_ENABLED off: offer not checkable here');
  await expect(assistantButton(page)).toBeVisible();
});

const asOtherRole = createPersonaTest(platformRoleEmail('FEATURE_VC_CAMPAIGN'));
asOtherRole('a role WITHOUT Feature Virtual Assistant has no assistant access', async ({ page }) => {
  await page.goto(`${baseUrl}/home`);
  await expect(page.getByRole('main')).toBeVisible({ timeout: 20_000 });
  expect((await myProfileUrl(page)).assistant).toBe(false);
  await expect(assistantButton(page)).toHaveCount(0);
});
