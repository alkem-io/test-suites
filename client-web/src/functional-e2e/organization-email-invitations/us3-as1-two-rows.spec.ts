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
  waitForMailsTo,
} from './organization-email-invitations.helpers';
import fs from 'fs';

baseTest.describe.configure({ mode: 'serial' });

const EVIDENCE_DIR = process.env.US3_EVIDENCE_DIR;
const shot = async (page: import('@playwright/test').Page, name: string) => {
  if (EVIDENCE_DIR) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: `${EVIDENCE_DIR}/${name}.png` });
  }
};

const orgAdminTest = createPersonaTest(`${TestUser.ORGANIZATION_ADMIN}@alkem.io`);
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
    const res = await inviteRaw(scenario.organization.roleSetId, globalAdminToken, {
      emails: [email],
      roles: [],
      message: `US3 two rows ${runSuffix}`,
    });
    if (res.errors.length > 0) throw new Error(`invite ${email} failed: ${res.raw}`);
  }
  await Promise.all([waitForMailsTo(emailA, 1), waitForMailsTo(emailB, 1)]);
});

baseTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(scenario);
});

orgAdminTest('US3-AS1: Resend A then B back-to-back dispatches both; a second Resend on A is an error toast', async ({ page }) => {
  orgAdminTest.setTimeout(150_000);
  const row = (email: string) => page.getByRole('row', { name: new RegExp(escapeRegExp(email)) });
  const resend = (email: string) => row(email).getByRole('button', { name: 'Resend invitation email' });

  const aBefore = (await mailsTo(emailA)).length;
  const bBefore = (await mailsTo(emailB)).length;
  const graphqlResends: Array<{ at: number; status: number; ok: boolean }> = [];
  page.on('response', async r => {
    if (!r.url().includes('graphql')) return;
    const post = r.request().postData() ?? '';
    if (!/resendPlatformInvitation/i.test(post)) return;
    const body = await r.text().catch(() => '');
    graphqlResends.push({ at: Date.now(), status: r.status(), ok: !body.includes('"errors"') });
  });

  await page.goto(`${baseUrl}/organization/${scenario.organization.nameId}/settings/community`);
  await expect(row(emailA)).toBeVisible({ timeout: 25_000 });
  await expect(row(emailB)).toBeVisible();
  await shot(page, 'US3-AS1-v3-0-two-rows');
  const rowBefore = { a: await row(emailA).innerText(), b: await row(emailB).innerText() };

  // Back-to-back: no awaiting of A's outcome before B is clicked.
  await resend(emailA).click();
  await expect(resend(emailB)).toBeEnabled();
  await resend(emailB).click();

  await expect(page.getByText('Invitation email sent again').first()).toBeVisible({ timeout: 15_000 });
  await shot(page, 'US3-AS1-v3-1-after-A-and-B');
  expect(await waitForMailsTo(emailA, aBefore + 1)).toHaveLength(aBefore + 1);
  expect(await waitForMailsTo(emailB, bBefore + 1)).toHaveLength(bBefore + 1);
  // Two success toasts (one per row) or at least two successful resend calls.
  await expect.poll(() => graphqlResends.filter(r => r.ok).length, { timeout: 10_000 }).toBe(2);
  expect(await row(emailA).innerText()).toEqual(rowBefore.a);
  expect(await row(emailB).innerText()).toEqual(rowBefore.b);

  // Second Resend on A within the window.
  const aAfterFirst = (await settledMailsTo(emailA, 3_000)).length;
  await resend(emailA).click();
  const toast = page.getByText('Already resent recently — try again in a few minutes').first();
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await shot(page, 'US3-AS1-v3-2-second-A-error-toast');
  const toastEl = page.locator('[data-sonner-toast], [role="alert"], [role="status"]').filter({ hasText: 'Already resent recently' }).first();
  const toastInfo = await toastEl.evaluate(el => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    dataType: el.getAttribute('data-type'),
    cls: el.className?.toString().slice(0, 200),
    ancestorTypes: (() => {
      const out: string[] = [];
      for (let n: Element | null = el; n && out.length < 6; n = n.parentElement) out.push(`${n.tagName}[type=${n.getAttribute('data-type')}][role=${n.getAttribute('role')}]`);
      return out;
    })(),
  }));
  console.info(`[US3-AS1] error toast element: ${JSON.stringify(toastInfo)}`);
  expect(await settledMailsTo(emailA)).toHaveLength(aAfterFirst);
  expect(graphqlResends.filter(r => r.ok)).toHaveLength(2);
  expect(graphqlResends).toHaveLength(3);
  expect(toastInfo.ancestorTypes.join(' ') + toastInfo.cls).toMatch(/error|destructive|danger/i);
});
