// spec: client-web/src/functional-e2e/explore-platform/explore-platform-anonymous-test-plan.md
// seed: client-web/src/functional-e2e/seed-explore-welcome.spec.ts
//
// Test: Complete exploration flow as authenticated user (organization.admin)
// Flow: Home → Space → Community → Subspaces → Knowledge → Explore Spaces →
//       Contributors → Forum → Template Library

import { expect } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'explore-platform-authenticated.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'explore-auth',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'Explore Test Space Auth',
        tagline: 'A space for exploration testing with auth',
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
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
  // Innovation Pack with Callout templates (collaboration tools)
  innovationPack: {
    useBaseOrganization: true,
    pack: {
      displayName: 'Explore Test Template Pack Auth',
      tags: ['explore', 'test', 'collaboration'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template - Explore Auth',
        postDefaultDescription: 'Default text for posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines - Explore Auth',
      },
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Collaboration Tool - Discussion Auth',
        calloutFramingType: 'MEMO',
        calloutResponseTypes: ['POST', 'MEMO'],
        calloutAllowedContributors: 'MEMBERS',
        calloutMemoFramingMarkdown:
          '# Discussion Guidelines\n\nShare your ideas and collaborate with others.',
      },
    ],
  },
  // Platform discussion for forum testing
  platformDiscussion: {
    title: 'Explore Test Discussion Auth',
    description: 'A test discussion for the exploration flow',
    category: 'PLATFORM_FUNCTIONALITIES',
  },
};

// Serial mode to ensure clean setup/teardown
(test.describe as any).configure?.({ mode: 'serial' });

test.describe('Explore Alkemio Platform - Authenticated User Flow', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Authenticate as organization admin
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('1. Home page loads for authenticated user', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Verify welcome heading with user name
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Welcome'
    );

    // [BUG] todo: verify the below expectations as the user has memberships and these are for users without memberships
    // Verify explore section
    // await expect(page.getByText('Explore Spaces of Your Interest')).toBeVisible(
    //   { timeout: 3000 }
    // );

    // Verify public spaces are displayed
    // await expect(
    //   page.getByRole('link', { name: /Card banner:/ }).first()
    // ).toBeVisible({ timeout: 3000 });

    // Verify user is logged in - should see My Dashboard
    // await expect(page.getByRole('link', { name: 'My Dashboard' })).toBeVisible({
    //   timeout: 3000,
    // });
  });

  test('2. Click on public space', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Click on the first public space card
    await page
      .getByRole('link', { name: /Card banner:/ })
      .first()
      .click();

    // Wait for space page to load
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Verify space heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify tabs are visible
    await expect(page.getByRole('tab', { name: 'community' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Subspaces' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Knowledge' })).toBeVisible();

    // Authenticated user should see apply/join button (not "Sign in to apply")
    await expect(
      page.getByRole('button', { name: /apply|join/i })
    ).toBeVisible();
  });

  test('3. Click on Community tab', async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Click Community tab
    await page.getByRole('tab', { name: 'community' }).click();

    // Verify tab is selected
    await expect(page.getByRole('tab', { name: 'community' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Verify community content
    await expect(
      page.getByText('The contributors to this Space!')
    ).toBeVisible();

    // Authenticated user should NOT see login prompt
    await expect(
      page.getByRole('heading', {
        name: 'Please log in to see all contributing users',
      })
    ).not.toBeVisible();
  });

  test('4. Click on Subspaces tab', async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Click Subspaces tab
    await page.getByRole('tab', { name: 'Subspaces' }).click();

    // Verify tab is selected
    await expect(page.getByRole('tab', { name: 'Subspaces' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Verify empty state message (no subspaces)
    await expect(page.getByText('No Subspace found.')).toBeVisible();
  });

  test('5. Click on Knowledge tab', async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Click Knowledge tab
    await page.getByRole('tab', { name: 'Knowledge' }).click();

    // Verify tab is selected
    await expect(page.getByRole('tab', { name: 'Knowledge' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    // Verify knowledge content
    await expect(
      page.getByText(/In the Knowledge Base you will find/)
    ).toBeVisible();
  });

  test('6. Click on Explore Spaces in Tools Menu', async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Verify menu items
    await expect(
      page.getByRole('menuitem', { name: 'Template Library' })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Alkemio Forum' })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Explore Spaces' })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Find contributors' })
    ).toBeVisible();

    // Click Explore Spaces
    await page.getByRole('menuitem', { name: 'Explore Spaces' }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/spaces/);
    await expect(
      page.getByRole('heading', { name: 'Explore Spaces', level: 1 })
    ).toBeVisible();
  });

  test('7. Click on public space from Explore page', async ({ page }) => {
    await page.goto(`${baseUrl}/spaces`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: 'Explore Spaces', level: 1 })
    ).toBeVisible();

    // Verify filter buttons
    await expect(
      page.getByRole('button', { name: 'All Spaces' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Public Spaces' })
    ).toBeVisible();
  });

  test('8. Explore Contributors page', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Click Find contributors
    await page.getByRole('menuitem', { name: 'Find contributors' }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/contributors/);
    await expect(
      page.getByRole('heading', {
        name: 'Find talent and expertise!',
        level: 1,
      })
    ).toBeVisible();

    // Verify sections
    await expect(
      page.getByRole('heading', { name: 'Users', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Virtual Contributors' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Organizations' })
    ).toBeVisible();

    // Authenticated user should see users list (not login prompt)
    await expect(
      page.getByRole('heading', {
        name: 'Please log in to see all contributing users',
      })
    ).not.toBeVisible();
  });

  test('10. Explore Forum', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Click Alkemio Forum
    await page.getByRole('menuitem', { name: 'Alkemio Forum' }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/forum/);
    await expect(
      page.getByRole('heading', {
        name: 'Welcome to the Alkemio Forum',
        level: 1,
      })
    ).toBeVisible();

    // Verify discussions section
    await expect(
      page.getByRole('heading', { name: /Discussions/ })
    ).toBeVisible();
  });

  test('12. Explore Template Library', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Click Template Library
    await page.getByRole('menuitem', { name: 'Template Library' }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/innovation-library/);
    await expect(
      page.getByRole('heading', {
        name: "Alkemio's Template Library",
        level: 1,
      })
    ).toBeVisible();

    // Verify template type filters
    await expect(
      page.getByRole('button', { name: 'Collaboration Tool Template' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Community Guidelines Template' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Post Template' })
    ).toBeVisible();
  });

  test('14. Click on Collaboration Tool Template filter', async ({ page }) => {
    await page.goto(`${baseUrl}/innovation-library`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', {
        name: "Alkemio's Template Library",
        level: 1,
      })
    ).toBeVisible();

    // Click Collaboration Tool Template filter
    await page
      .getByRole('button', { name: 'Collaboration Tool Template' })
      .click();

    // Verify filter is active (button should have active state)
    // The button should remain visible and be clickable
    await expect(
      page.getByRole('button', { name: 'Collaboration Tool Template' })
    ).toBeVisible();
  });

  test('15. Verify user profile is accessible', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Click on user avatar/profile
    const avatarButton = page.locator('img[alt="Avatar"]').first();
    if (await avatarButton.isVisible()) {
      await avatarButton.click();
      await page.waitForTimeout(500);

      // Verify profile menu or navigation to profile page
      // This may vary based on UI - adjust as needed
      await expect(
        page.getByText(/profile|settings|logout/i).first()
      ).toBeVisible();
    } else {
      // Alternative: check if My Dashboard link is accessible
      await expect(
        page.getByRole('link', { name: 'My Dashboard' })
      ).toBeVisible();
    }
  });
});
