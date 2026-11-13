// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect } from '@playwright/test';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { baseUrl, teardownScenario } from '../helpers/space-access.helper';
import { uniqueName } from './memberships.helpers';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'view-own-user-profile-public.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: uniqueName('Membership Test Space'),
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await teardownAuthentication();
  } finally {
    await teardownScenario(baseScenario);
  }
});

test.describe('User Profile Membership Display', () => {
  test(
    'View Own User Profile - Public Information',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}`
      );

      await expect(page).toHaveURL(
        new RegExp(`/user/${TestUserManager.users.spaceMember.nameId}`)
      );

      const userNameHeading = page.getByRole('heading', {
        level: 1,
        name: new RegExp(TestUserManager.users.spaceMember.displayName, 'i'),
      });
      await expect(userNameHeading).toBeVisible();

      // CRD: the public "Bio" section is the sidebar "About" block.
      await expect(
        page.getByRole('heading', { name: /About/i }).first()
      ).toBeVisible();

      // CRD: spaces are organised under resource tabs; the membership space
      // lives under the "Member Of" tab.
      const memberOfTab = page.getByRole('tab', { name: /Member Of/i });
      await expect(memberOfTab).toBeVisible();
      await memberOfTab.click();

      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible();

      // CRD: the settings entry point is an icon link with an accessible name.
      const settingsLink = page.getByRole('link', {
        name: /Open user settings/i,
      });
      await expect(settingsLink).toBeVisible();
      await settingsLink.click();

      await expect(page).toHaveURL(
        new RegExp(`/user/${TestUserManager.users.spaceMember.nameId}/settings`)
      );

      // CRD: the settings page exposes the contributor settings tabs.
      await expect(
        page.getByRole('tab', { name: /Profile/i }).first()
      ).toBeVisible();
    }
  );
});
