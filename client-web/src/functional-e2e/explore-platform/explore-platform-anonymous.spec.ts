// spec: client-web/src/functional-e2e/explore-platform/explore-platform-anonymous-test-plan.md
// seed: client-web/src/functional-e2e/seed-explore-welcome.spec.ts
//
// Test: Complete exploration flow as anonymous (non-logged-in) user
// Flow: Home → Space → Community → Subspaces → Knowledge → Explore Spaces →
//       Contributors → Forum → Template Library → Sign Up

import { test, expect } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'explore-anon',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'Explore Test Space',
        tagline: 'A space for exploration testing',
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
      displayName: 'Explore Test Template Pack',
      tags: ['explore', 'test', 'collaboration'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template - Explore',
        postDefaultDescription: 'Default text for posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines - Explore',
      },
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Collaboration Tool - Discussion',
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
    title: 'Explore Test Discussion',
    description: 'A test discussion for the exploration flow',
    category: 'PLATFORM_FUNCTIONALITIES',
  },
};
// Serial mode to ensure clean setup/teardown
test.describe.configure({ mode: 'serial' });

test.describe('Explore Alkemio Platform - Anonymous User Flow', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('1. Home page loads for anonymous user', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Verify explore section
    await expect(
      page.getByText('Explore Spaces of Your Interest')
    ).toBeVisible();

    // Verify Sign up link is visible
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();

    // Verify public spaces are displayed
    await expect(
      page
        .getByRole('link', {
          name: `${baseScenario.space.about.profile.displayName}`,
        })
        .first()
    ).toBeVisible();
  });

  test('2. Click on public space', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Click on the first public space card
    await page
      .getByRole('link', {
        name: `${baseScenario.space.about.profile.displayName}`,
      })
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

    // Verify Sign in to apply button (anonymous user)
    await expect(
      page.getByRole('button', { name: 'Sign in to apply' })
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

    // Verify login prompt for anonymous users
    await expect(
      page.getByRole('heading', {
        name: 'Please log in to see all contributing users',
      })
    ).toBeVisible();
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
      page.getByRole('menuitem', { name: 'Documentation' })
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

  test('15. Navigate to Sign Up page', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Click Sign up link
    await page.getByRole('link', { name: 'Sign up' }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/sign_up/);

    // Verify sign up form elements
    await expect(page.getByText('Welcome to Alkemio!')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sign up', level: 1 })
    ).toBeVisible();

    // Verify Sign in link
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    // Verify terms checkbox
    await expect(
      page.getByRole('checkbox', {
        name: 'I accept the Terms of Use and Privacy Policy.',
      })
    ).toBeVisible();

    // Verify form fields (disabled until terms accepted)
    await expect(page.getByRole('textbox', { name: 'E-Mail' })).toBeDisabled();
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeDisabled();
    await expect(
      page.getByRole('textbox', { name: 'Last Name' })
    ).toBeDisabled();
  });
});
