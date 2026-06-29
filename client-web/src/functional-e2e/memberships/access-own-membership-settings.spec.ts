// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md
// seed: client-web/src/functional-e2e/seed-memberships.spec.ts

import { expect } from '@playwright/test';
import {
  TestUser,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'my-feature-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: 'Membership Test Space',
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.describe('User Membership Settings', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test(
    'Access Own Membership Settings',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to own membership settings
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}/settings/membership`
      );

      // 2. Verify URL changed to membership settings
      await expect(page).toHaveURL(/.*\/settings\/membership/);

      const spaceName = baseScenario.space.about.profile.displayName;

      // 3. Verify the "My Memberships" section is visible and shows the space.
      // CRD: memberships are a searchable card grid; narrow to the one space
      // so the per-card actions are unambiguous.
      await expect(
        page.getByRole('heading', { name: /My Memberships/i })
      ).toBeVisible({ timeout: 5000 });

      const search = page.getByPlaceholder('Search memberships...');
      await search.fill(spaceName);

      await expect(
        page.getByRole('link', { name: spaceName }).first()
      ).toBeVisible({ timeout: 5000 });

      // 4. Leave the space.
      // CRD flow change: the Leave action lives in the membership card's
      // "More actions" (kebab) menu, then a confirmation alertdialog.
      await page.getByRole('button', { name: 'More actions' }).first().click();
      await page.getByRole('menuitem', { name: /Leave/i }).click();

      // Confirm in the destructive alertdialog ("Leave this membership?").
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await confirmDialog.getByRole('button', { name: 'Leave' }).click();

      // 5. Re-open membership settings and verify the space is gone.
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}/settings/membership`
      );
      // With leftover memberships the search box exists (narrow to the space);
      // if this was the last membership the page shows an empty state with no
      // search box, so only fill it when present.
      const leftoverSearch = page.getByPlaceholder('Search memberships...');
      if (await leftoverSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
        await leftoverSearch.fill(spaceName);
      }

      await expect(
        page.getByRole('link', { name: spaceName })
      ).not.toBeVisible();
    }
  );
});
