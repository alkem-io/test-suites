// US3-AS1 (review-fix walk): two open email invitations on one organization.
// Resend on row A and then, immediately, on row B must both dispatch (per-row
// in-flight state: A's pending request must not block B), +1 mail each; a second
// Resend on A inside the window shows an ERROR toast "Already resent recently".
//
// @forge-acceptance

import { expect, test as baseTest } from '@playwright/test';
import { TestScenarioFactory, TestUser } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  adminToken,
  baseUrl,
  escapeRegExp,
  inviteRaw,
  mailsTo,
  runSuffix,
  settledMailsTo,
  TestUserManager,
} from './organization-email-invitations.helpers';

baseTest.describe.configure({ mode: 'serial' });

const orgAdminTest = createPersonaTest(
  `${TestUser.ORGANIZATION_ADMIN}@alkem.io`
);
const emailA = `us081c-twoa-${runSuffix}@example.com`;
const emailB = `us081c-twob-${runSuffix}@example.com`;

let scenario: OrganizationWithSpaceModel;

baseTest.beforeAll(async () => {
  baseTest.setTimeout(300_000);
  await TestUserManager.populateUserModelMap();
  const globalAdminToken = await adminToken();
  scenario = await TestScenarioFactory.createBaseScenario({
    name: 'org-email-two-rows',
    space: { collaboration: { addTutorialCallouts: false } },
  });
  for (const email of [emailA, emailB]) {
    const res = await inviteRaw(
      scenario.organization.roleSetId,
      globalAdminToken,
      {
        emails: [email],
        roles: [],
        message: `US3 two rows ${runSuffix}`,
      }
    );
    if (res.errors.length > 0)
      throw new Error(`invite ${email} failed: ${res.raw}`);
  }
  await Promise.all([settledMailsTo(emailA, 1), settledMailsTo(emailB, 1)]);
});

baseTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(scenario);
});

orgAdminTest(
  'US3-AS1: Resend A then B back-to-back dispatches both; a second Resend on A is an error toast',
  async ({ page }) => {
    orgAdminTest.setTimeout(150_000);
    const row = (email: string) =>
      page.getByRole('row', { name: new RegExp(escapeRegExp(email)) });
    const resend = (email: string) =>
      row(email).getByRole('button', { name: 'Resend invitation email' });

    const aBefore = (await mailsTo(emailA)).length;
    const bBefore = (await mailsTo(emailB)).length;
    const graphqlResends: Array<{ at: number; status: number; ok: boolean }> =
      [];
    page.on('response', async r => {
      if (!r.url().includes('graphql')) return;
      const post = r.request().postData() ?? '';
      if (!/resendPlatformInvitation/i.test(post)) return;
      const body = await r.text().catch(() => '');
      graphqlResends.push({
        at: Date.now(),
        status: r.status(),
        ok: !body.includes('"errors"'),
      });
    });

    await page.goto(
      `${baseUrl}/organization/${scenario.organization.nameId}/settings/community`
    );
    await expect(row(emailA)).toBeVisible({ timeout: 25_000 });
    await expect(row(emailB)).toBeVisible();
    const rowBefore = {
      a: await row(emailA).innerText(),
      b: await row(emailB).innerText(),
    };

    // Back-to-back: no awaiting of A's outcome before B is clicked.
    await resend(emailA).click();
    await expect(resend(emailB)).toBeEnabled();
    await resend(emailB).click();

    await expect(
      page.getByText('Invitation email sent again').first()
    ).toBeVisible({ timeout: 15_000 });
    expect(await settledMailsTo(emailA, aBefore + 1)).toHaveLength(aBefore + 1);
    expect(await settledMailsTo(emailB, bBefore + 1)).toHaveLength(bBefore + 1);
    // Two success toasts (one per row) or at least two successful resend calls.
    await expect
      .poll(() => graphqlResends.filter(r => r.ok).length, { timeout: 10_000 })
      .toBe(2);
    expect(await row(emailA).innerText()).toEqual(rowBefore.a);
    expect(await row(emailB).innerText()).toEqual(rowBefore.b);

    // Second Resend on A within the window.
    const aAfterFirst = (await settledMailsTo(emailA, aBefore + 1)).length;
    await resend(emailA).click();
    // The refusal is an ERROR toast, not a success one: sonner marks the variant
    // on the toast element (`data-type`), so the oracle is the typed element with
    // the readable message, never a success toast that happens to carry it.
    const errorToast = page
      .locator('[data-sonner-toast][data-type="error"]')
      .filter({
        hasText: 'Already resent recently — try again in a few minutes',
      });
    await expect(errorToast).toBeVisible({ timeout: 15_000 });
    expect(await settledMailsTo(emailA, aAfterFirst)).toHaveLength(aAfterFirst);
    // Entries are pushed once each response body has been read; wait for the third.
    await expect.poll(() => graphqlResends.length, { timeout: 10_000 }).toBe(3);
    expect(graphqlResends.filter(r => r.ok)).toHaveLength(2);
  }
);
