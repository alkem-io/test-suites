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
    storageStateName: 'cannot-access-org-account-non-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

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
        displayName: uniqueName('Membership Test Space'),
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

test.describe('Organization Account Settings', () => {
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
