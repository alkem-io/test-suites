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
  name: 'seed-space-full',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        //TestUser.SUBSPACE_MEMBER,
        //TestUser.SUBSPACE_ADMIN,
        //TestUser.SUBSUBSPACE_MEMBER,
        //TestUser.SUBSUBSPACE_ADMIN,
      ],
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
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          //TestUser.SUBSUBSPACE_MEMBER,
          //TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },

        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: {
            policy: CommunityMembershipPolicy.Applications,
          },
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [
            //TestUser.SUBSPACE_MEMBER,
            //TestUser.SUBSPACE_ADMIN,
            TestUser.SUBSUBSPACE_MEMBER,
            TestUser.SUBSUBSPACE_ADMIN,
          ],
        },
      },
    },
  },
};

test.beforeAll(async () => {
  //baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});
test.afterAll(async () => {
  //await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
test('seed', async ({ browser }) => {
  test.setTimeout(0); // Disable timeout

  // First browser instance - NON_SPACE_MEMBER user
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  await page1.goto(baseUrl);
  await page1.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page1.getByTestId('PersonIcon').click();
  await page1.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page1.waitForURL(/.*login.*/);
  await page1
    .getByRole('textbox', { name: 'E-Mail' })
    .fill(`${TestUser.NON_SPACE_MEMBER}@alkem.io`);
  await page1.getByRole('textbox', { name: 'Password' }).fill(password);
  await page1.getByRole('button', { name: 'Sign in' }).click();
  await page1.waitForURL(/.*home.*/);

  // Second browser instance - SPACE_MEMBER user
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  await page2.goto(baseUrl);
  await page2.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page2.getByTestId('PersonIcon').click();
  await page2.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page2.waitForURL(/.*login.*/);
  await page2
    .getByRole('textbox', { name: 'E-Mail' })
    .fill(`${TestUser.SPACE_ADMIN}@alkem.io`);
  await page2.getByRole('textbox', { name: 'Password' }).fill(password);
  await page2.getByRole('button', { name: 'Sign in' }).click();
  await page2.waitForURL(/.*home.*/);

  // Keep browsers open indefinitely
  await new Promise(resolve => setTimeout(resolve, 1 * 60 * 1000));
});
