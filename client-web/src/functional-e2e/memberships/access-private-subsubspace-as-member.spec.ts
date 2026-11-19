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
    storageStateName: 'access-private-subsubspace-member.json',
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
      addPostCollectionCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_MEMBER,
      ],
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
        addPostCollectionCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
        ],
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
          addPostCollectionCallout: true,
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
  await setupAuthentication(
    browser,
    TestUserManager.users.subsubspaceMember.email
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

test.describe('Space/Subspace Settings Access Control', () => {
  test(
    'Access Private Subsubspace - As Member',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to "Subsubspace for Membership Tests"
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}/opportunities/${baseScenario.subsubspace.nameId}`
      );

      // 2. Verify full access to private subsubspace granted
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subsubspace.nameId}`)
      );

      // 3. Verify can view all content and discussions
      await expect(
        page
          .getByRole('heading', {
            name: baseScenario.subsubspace.about.profile.displayName,
          })
          .first()
      ).toBeVisible();

      // 4. Verify full member access to the space content/community
      // CRD: members can open the "Community" view (replaces the legacy
      // "contributors" affordance), confirming non-preview access.
      await expect(
        page.getByRole('button', { name: 'Community', exact: true }).first()
      ).toBeVisible();

      // 5. Verify cannot access settings (not admin)
      // CRD: the space-settings entry is a banner link named "Settings"; a
      // non-admin member must not see it.
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).not.toBeVisible();
    }
  );
});
