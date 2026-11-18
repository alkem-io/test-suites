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
import {
  baseUrl,
  calloutHeading,
  spaceTitle,
  teardownScenario,
} from '../helpers/space-access.helper';
import { uniqueName } from './memberships.helpers';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'access-space-settings-member.json',
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
      // A published post: what a member can read, the positive control.
      addPostCallout: true,
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

test.describe('Space/Subspace Settings Access Control', () => {
  test(
    'Access Space Settings - As Space Member',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      const space = baseScenario.space;
      // 1. Open the space as a member.
      await page.goto(`${baseUrl}/${space.nameId}`);

      // 2. Positive control: the page has resolved the member's standing —
      //    the title renders and the member reads the seeded post, which only
      //    a viewer with READ on the content gets.
      await expect(
        spaceTitle(page, space.about.profile.displayName)
      ).toBeVisible();
      await expect(
        calloutHeading(page, space.collaboration.calloutPostDisplayName)
      ).toBeVisible();

      // 3. The settings entry point (CRD: banner link "Settings") is absent
      //    for a plain member. (The admin's positive is
      //    access-space-settings-as-space-admin.spec.ts.)
      await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    }
  );
});
