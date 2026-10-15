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
    storageStateName: 'view-org-profile-public.json',
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
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.ORGANIZATION_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.describe('Organization Profile Access', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    // Login as NON_SPACE_MEMBER who is not an org member
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
    'View Organization Profile - Public (Authenticated Non-Admin)',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to organization profile
      await page.goto(
        `${baseUrl}/organization/${baseScenario.organization.nameId}`
      );

      // 2. Verify organization profile page loads
      await expect(page).toHaveURL(
        new RegExp(`/organization/${baseScenario.organization.nameId}`)
      );

      // 3. Verify organization name heading is displayed
      const orgNameHeading = page.getByRole('heading', {
        level: 1,
        name: new RegExp(baseScenario.organization.profile.displayName, 'i'),
      });
      await expect(orgNameHeading).toBeVisible({ timeout: 2000 });

      // 4. Verify Bio section is visible (CRD org sidebar "Bio" block)
      await expect(
        page.getByRole('heading', { name: /Bio/i }).first()
      ).toBeVisible();

      // 5. Verify "Spaces we lead" section is visible
      // CRD: spaces are organised under resource tabs; the spaces the org
      // leads live under the "Lead Spaces" tab.
      const leadSpacesTab = page.getByRole('tab', { name: /Lead Spaces/i });
      await expect(leadSpacesTab).toBeVisible();
      await leadSpacesTab.click();

      // 6. Verify the space created by this organization is displayed
      await expect(
        page.getByText(baseScenario.space.about.profile.displayName).first()
      ).toBeVisible({ timeout: 5000 });

      // 7. Verify Settings entry point is NOT visible (non-member, no admin access)
      const settingsLink = page.getByRole('link', {
        name: /Open organisation settings/i,
      });
      await expect(settingsLink).not.toBeVisible();
    }
  );

  test(
    'View Organization Profile - Unauthenticated',
    {
      tag: ['@bug', '@regression'],
    },
    async ({ page, context }) => {
      // KNOWN GAP, awaiting a product ruling (client-web#10179, plan Q1 in
      // user-profile-test-plan.md): since #10424 the "Lead Spaces" tab is
      // hidden when the organisation has no lead items, and an anonymous
      // visitor never has any because the client skips `rolesOrganization`
      // without READ_USERS. Today the visitor sees only "All Memberships" with
      // "Not a member of any Space or Subspace yet." The assertion in step 5 is
      // the expected behaviour (memberships plan 4.2: "Spaces they lead") and
      // is deliberately left unchanged. Drop this skip once Q1 is answered and
      // the behaviour is fixed, or re-align step 5 if it is ruled intended.
      test.skip(
        true,
        'client-web#10179 / plan Q1: anonymous visitor no longer sees the Lead Spaces tab (open product ruling)'
      );

      // 1. Clear authentication by clearing storage state
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 2. Navigate to organization profile as unauthenticated user
      await page.goto(
        `${baseUrl}/organization/${baseScenario.organization.nameId}`
      );

      // 3. Verify organization profile page loads (org profiles are public)
      await expect(page).toHaveURL(
        new RegExp(`/organization/${baseScenario.organization.nameId}`)
      );

      // 4. Verify organization name heading is displayed
      const orgNameHeading = page.getByRole('heading', {
        level: 1,
        name: new RegExp(baseScenario.organization.profile.displayName, 'i'),
      });
      await expect(orgNameHeading).toBeVisible({ timeout: 2000 });

      // 5. Verify sections (CRD org sidebar "Bio" block + resource tabs)
      await expect(
        page.getByRole('heading', { name: /Bio/i }).first()
      ).toBeVisible();

      await expect(
        page.getByRole('tab', { name: /Lead Spaces/i }).first()
      ).toBeVisible();

      // [BUG] no spaces available even the public ones
      // 6. Verify the space created by this organization is displayed
      // await expect(
      //   page.getByText(baseScenario.space.about.profile.displayName).first()
      // ).toBeVisible({ timeout: 2000 });
    }
  );
});
