// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
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
    storageStateName: 'view-another-user-profile-public.json',
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
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(
    browser,
    TestUserManager.users.subspaceMember.email
  );
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
  // Un-skipped 2026-11-12 (W2 Tier 0 item 1). The skip read "memberships are
  // not surfaced to other viewers — pending product decision"; on develop
  // they are: rolesUser needs only the platform READ_USERS every registered
  // user holds, and the profile page splits the result by role
  // (useFilteredMemberships: LEAD/ADMIN → "Leading", the rest → "Member Of").
  // SPACE_ADMIN is ADMIN of the seeded space, so it is under "Leading"; the
  // case used to open "Member Of" and found nothing — a test-side gap.
  test(
    'View Another User Profile - Public View',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      const other = TestUserManager.users.spaceAdmin;

      // 1. Another user's public profile renders with their name.
      await page.goto(`${baseUrl}/user/${other.nameId}`);
      await expect(page).toHaveURL(new RegExp(`/user/${other.nameId}$`));
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: new RegExp(other.displayName, 'i'),
        })
      ).toBeVisible();

      // 2. The space they administer is listed under "Leading" (unique name;
      //    `.first()` only because a card may repeat its own name).
      const leadingTab = page.getByRole('tab', {
        name: 'Leading',
        exact: true,
      });
      await expect(leadingTab).toBeVisible();
      await leadingTab.click();
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible();

      // 3. No settings entry point on someone else's profile — read after the
      //    profile and its tabs rendered above. (Opening the settings URL
      //    directly is cannot-access-other-user-*-settings.spec.ts.)
      await expect(
        page.getByRole('link', { name: /Open user settings/i })
      ).toHaveCount(0);
    }
  );
});
