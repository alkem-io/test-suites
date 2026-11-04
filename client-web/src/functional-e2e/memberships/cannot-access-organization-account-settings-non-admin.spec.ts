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
    storageStateName: 'cannot-access-org-account-non-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  organization: {
    community: {
      addMembers: true,
      addAdmin: true,
    },
  },
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

test.describe('Organization Account Settings', () => {
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
    'Cannot Access Organization Account Settings - Non-Admin',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Attempt to access organization account settings as non-admin
      await page.goto(
        `${baseUrl}/organization/${baseScenario.organization.nameId}/settings/account`
      );

      // 2. CRD flow change: a non-admin is redirected straight to the parent
      // organization profile page (no intermediate "We are redirecting you"
      // modal / "Go now" button). The behavioral outcome — denied access to
      // the account settings, landed on the org profile — is unchanged.
      await expect(page).toHaveURL(
        `${baseUrl}/organization/${baseScenario.organization.nameId}`,
        { timeout: 10000 }
      );

      // 3. Verify the account settings UI is NOT shown (no settings tabs).
      await expect(
        page.getByRole('tab', { name: 'Account' })
      ).not.toBeVisible();
    }
  );
});
