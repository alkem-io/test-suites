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
    storageStateName: 'access-private-subsubspace-non-member.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-memberships',
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
      admins: [TestUser.SPACE_ADMIN, TestUser.GLOBAL_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      about: {
        profile: {
          displayName: 'Subspace for Membership Tests',
          tagline: 'Testing subspace memberships',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        about: {
          profile: {
            displayName: 'Subsubspace for Membership Tests',
            tagline: 'Testing subsubspace memberships',
          },
        },
        collaboration: {
          addTutorialCallouts: false,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: {
            policy: CommunityMembershipPolicy.Applications,
          },
        },
      },
    },
  },
};

test.describe('Space/Subspace Settings Access Control', () => {
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

  test('Access Private Subsubspace - As Non-Member', async ({ page }) => {
    // 1. Navigate to "Subsubspace for Membership Tests"
    // When parent is public and subspace is private, users can still preview the about section
    await page.goto(
      `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}/opportunities/${baseScenario.subsubspace.nameId}`
    );

    // 2. Verify URL is correct - user can access the page but with limited preview
    await expect(page).toHaveURL(
      new RegExp(`/${baseScenario.subsubspace.nameId}`)
    );
    await expect(page).toHaveURL(new RegExp('/about'));

    // 3. Verify about section/dialog is visible with space name
    await expect(
      page
        .getByRole('heading', {
          name: baseScenario.subsubspace.about.profile.displayName,
        })
        .first()
    ).toBeVisible({ timeout: 3000 });

    // 4. Verify either "Apply" button (logged in, applications enabled) or action button is visible
    // Since user is logged in and applications are enabled, should see Apply or Join button
    await expect(
      page.getByRole('button', { name: /Apply|Join|Sign in/i })
    ).toBeVisible();

    // 5. Verify cannot access full content
    await expect(
      page.getByRole('button', { name: /contributors/i })
    ).not.toBeVisible();

    // 6. Verify privacy is indicated - limited preview mode
    const privacyIcon = page.locator('[data-testid="LockOutlinedIcon"]');
    await expect(privacyIcon).toBeVisible();
  });
});
