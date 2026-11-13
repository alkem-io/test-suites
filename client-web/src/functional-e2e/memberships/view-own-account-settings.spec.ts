// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md (3.1)

import { expect } from '@playwright/test';
import {
  createSpaceOnAccount,
  SpacePrivacyMode,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { must } from '../helpers/lib-actor.helper';
import { baseUrl } from '../helpers/space-access.helper';
import { deleteSpaceTree } from '../helpers/space-cleanup.helper';
import { uniqueName } from './memberships.helpers';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'view-own-account-settings.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

/**
 * The account tab lists what the user's OWN account hosts. The skip this file
 * carried ("todo: the user should be a host") was a set-up gap: the scenario's
 * space is hosted by the scenario organisation's account, so SPACE_ADMIN's
 * account had nothing of this run's to show. The global admin now creates one
 * space on SPACE_ADMIN's account, and afterAll deletes it.
 */
const hostedSpaceName = uniqueName('Hosted by me');
let hostedSpaceId = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  await TestUserManager.populateUserModelMap();
  const host = TestUserManager.users.spaceAdmin;
  expect(host.accountId, 'space.admin account id resolved').not.toBe('');
  const created = must(
    await createSpaceOnAccount(
      {
        accountID: host.accountId,
        nameID: `own-acct-${UniqueIDGenerator.getID()}`,
        about: { profileData: { displayName: hostedSpaceName } },
        collaborationData: { calloutsSetData: {} },
        settings: { privacy: { mode: SpacePrivacyMode.Private } },
      },
      TestUser.GLOBAL_ADMIN
    ),
    'createSpaceOnAccount(space.admin)'
  );
  hostedSpaceId = created.createSpace.id;
  await setupAuthentication(browser, host.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await teardownAuthentication();
  } finally {
    await deleteSpaceTree(hostedSpaceId);
  }
});

test.describe('User Account Settings', () => {
  test(
    'View Own Account Settings',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      const host = TestUserManager.users.spaceAdmin;

      // 1. Own account settings open (no redirect to the public profile).
      await page.goto(`${baseUrl}/user/${host.nameId}/settings/account`);
      await expect(page).toHaveURL(/\/settings\/account$/);

      // 2. The four resource sections. (The pre-CRD "Here you find all your
      //    Spaces…" intro no longer exists on develop and is not asserted.)
      for (const section of [
        'Hosted Spaces',
        'Virtual Contributors',
        'Template Packs',
        'Custom Homepages',
      ]) {
        await expect(
          page.getByText(section, { exact: true }).first()
        ).toBeVisible();
      }

      // 3. The space this run created on the user's own account is listed.
      await expect(
        page.getByText(hostedSpaceName, { exact: true })
      ).toBeVisible();
    }
  );
});
