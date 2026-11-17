// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md

import { expect, test } from '@playwright/test';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { baseUrl, teardownScenario } from '../helpers/space-access.helper';
import { uniqueName } from './memberships.helpers';

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
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

test.beforeAll(async () => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await teardownScenario(baseScenario);
});

test.describe('User Profile Membership Display', () => {
  test(
    'View Unauthenticated User Profile',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.spaceMember.nameId}`
      );

      await expect(page.getByText(/Access Restricted/i)).toBeVisible();
    }
  );
});
