//const { test } = require('@playwright/test');
import { test, expect } from '@playwright/test';

import {
  TestScenarioConfig,
  TestUser,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-space-applications',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },

      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },

        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_ADMIN, TestUser.SUBSUBSPACE_MEMBER],
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

test.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});
test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
test('seed', async ({ page }) => {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page
    .getByRole('textbox', { name: 'E-Mail' })
    .fill(`${TestUser.NON_SPACE_MEMBER}@alkem.io`);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/.*home.*/);
});
