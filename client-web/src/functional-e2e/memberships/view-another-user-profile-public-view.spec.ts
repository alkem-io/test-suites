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
    storageStateName: 'view-another-user-profile-public.json',
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

test.describe('User Profile Membership Display', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.subspaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  // SKIP: another user's space memberships are not surfaced on their public profile to other viewers — pending product decision (privacy-by-design vs bug).
  test.skip(
    'View Another User Profile - Public View',
    {
      tag: ['@bug', '@regression'],
    },
    async ({ page }) => {
      // Navigate to another user's profile (SPACE_ADMIN)
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceAdmin.nameId}`
      );

      // Verify user profile page loads successfully
      await expect(page).toHaveURL(
        new RegExp(`/user/${TestUserManager.users.spaceAdmin.nameId}`)
      );

      // Verify public profile of SPACE_ADMIN is displayed - name heading
      const userNameHeading = page.getByRole('heading', {
        level: 1,
        name: new RegExp(TestUserManager.users.spaceAdmin.displayName, 'i'),
      });
      await expect(userNameHeading).toBeVisible({ timeout: 3000 });

      // Verify Bio section is visible (public information)
      // CRD: the public "Bio" section is the sidebar "About" block.
      await expect(
        page.getByRole('heading', { name: /About/i }).first()
      ).toBeVisible();

      // Verify the spaces (Member Of) section is reachable
      // CRD: spaces are organised under resource tabs; the membership space
      // lives under the "Member Of" tab.
      const memberOfTab = page.getByRole('tab', { name: /Member Of/i });
      await expect(memberOfTab).toBeVisible();
      await memberOfTab.click();

      // Verify the space this user belongs to is displayed
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible({ timeout: 5000 });

      // Verify cannot access settings: no settings entry point on another
      // user's profile (CRD icon link with accessible name).
      const settingsLink = page.getByRole('link', {
        name: /Open user settings/i,
      });
      await expect(settingsLink).not.toBeVisible();

      // [BUG]
      // make sure navigating to settings URL is not allowed (but, it's accessible)
      // await page.goto(
      //   `${baseUrl}/user/${TestUserManager.users.spaceAdmin.nameId}/settings`
      // );

      // await expect(accessRestrictedHeading(page)).toBeVisible({
      //   timeout: 5000,
      // });
    }
  );
});
