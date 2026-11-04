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
import { signInSignUpLink } from '../authentication/common-authentication-page-elements';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'access-private-subspace-in-private-space.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: 'Private Space for Membership Tests',
        tagline: 'Testing private space with private subspace',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      about: {
        profile: {
          displayName: 'Private Subspace in Private Space',
          tagline: 'Testing nested private subspace access',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
      },
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
    },
  },
};

test.describe('Space/Subspace Settings Access Control', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test(
    'Access Private Subspace in Private Space - As Non-Member',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Attempt to navigate to private subspace within private space
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}`
      );

      // 3. Verify modal or message about redirecting to closest parent
      await expect(page.getByText(/We are redirecting you/i)).toBeVisible();

      // 4. Verify option to navigate to parent space (about page)
      const redirectButton = page.getByRole('button', {
        name: /Go now/i,
      });
      await expect(redirectButton).toBeVisible();

      // 5. Click redirect button and verify navigation to parent space about
      await redirectButton.click();

      // 6. Verify redirected to parent space URL
      await expect(page).toHaveURL(new RegExp(`/${baseScenario.space.nameId}`));

      // 7. Verify on parent space about/preview page
      await expect(
        page
          .getByRole('heading', {
            name: baseScenario.space.nameId,
          })
          .first()
      ).toBeVisible({ timeout: 3000 });

      // CRD: the about/preview dialog exposes a "Close" button (replaces the
      // legacy CloseIcon test id).
      const closeButton = page.getByRole('button', { name: 'Close' });
      await expect(closeButton).toBeVisible();
    }
  );

  test(
    'Access Private Subspace in Private Space - Unauthenticated',
    {
      tag: ['@regrerssion'],
    },
    async ({ page, context }) => {
      // 1. Clear authentication by creating new context
      await context.clearCookies();

      // 2. Attempt to navigate to private subspace as unauthenticated user
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}`
      );

      // 3. Verify "Access Restricted" page is displayed
      await expect(page.getByText(/Access Restricted/i)).toBeVisible({
        timeout: 3000,
      });

      // 4. Verify "Sign in / Sign up" button is available
      const signInButton = signInSignUpLink(page);
      await expect(signInButton).toBeVisible();

      // 5. Verify "Return to dashboard as guest" button is available
      const guestButton = page.getByRole('link', {
        name: /Return to Dashboard as guest/i,
      });
      await expect(guestButton).toBeVisible();
    }
  );
});
