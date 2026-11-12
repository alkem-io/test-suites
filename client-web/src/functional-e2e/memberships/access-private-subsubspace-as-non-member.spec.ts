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
    storageStateName: 'access-private-subsubspace-non-member.json',
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
          displayName: uniqueName('Subspace for Membership Tests'),
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
            displayName: uniqueName('Subsubspace for Membership Tests'),
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
    'Access Private Subsubspace - As Non-Member',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
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
      ).toBeVisible();

      // 4. Verify either "Apply" button (logged in, applications enabled) or action button is visible
      // Since user is logged in and applications are enabled, should see Apply or Join button
      await expect(
        page.getByRole('button', { name: /Apply|Join|Sign in/i })
      ).toBeVisible();

      // 5. Verify cannot access full content
      // CRD: full member access exposes a "Community" view; a non-member in
      // preview mode must not see it.
      await expect(
        page.getByRole('button', { name: 'Community', exact: true })
      ).not.toBeVisible();

      // 6. Verify privacy is indicated - limited preview mode
      // CRD: a non-member previewing a private subsubspace gets a gated About
      // dialog whose privacy/no-access state is surfaced as an image with the
      // accessible name "You don't have access to this space." (the icon's alt
      // text is the stable hook; there is no literal "Private" label here).
      await expect(
        page
          .getByRole('img', { name: /don't have access to this space/i })
          .first()
      ).toBeVisible();
    }
  );
});
