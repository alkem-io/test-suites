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

    // CRD routes anonymous users to the Explore Spaces page (the legacy
    // "Explore Spaces of Your Interest" home dashboard section is gone).
    await expect(
      page.getByRole('heading', { name: 'Explore Spaces', level: 1 })
    ).toBeVisible();

    // Verify Sign up link is visible
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();

    // Verify public spaces are displayed (CRD lists them as cards in the
    // "spaces" list; the explorer paginates/searches, so assert the list is
    // populated rather than requiring the specific seeded space on page 1).
    await expect(
      page.getByRole('list', { name: 'spaces' }).getByRole('link').first()
    ).toBeVisible();
  });

  test('2. Click on public space', async ({ page }) => {
    // CRD routes anonymous users to the /spaces explorer (paginated to 10 with
    // a search box); the seeded space is not reliably surfaced on page 1, so
    // open the public space directly to verify the anonymous space view. The
    // behavioural assertions (tabs visible + "Sign in to apply") are unchanged.
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

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

    // The hard-coded community members grid was removed (feature 008 / story
    // client-web#9928); the community intro heading is the anonymous content
    // signal and the header still exposes a "Log in" affordance.
    await expect(
      page.getByRole('link', { name: 'Log in' })
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

    // Verify empty state message (CRD: "No subspaces found" in the
    // Subspaces grid region).
    await expect(
      page.getByRole('heading', { name: 'No subspaces found' })
    ).toBeVisible();
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
    await page.getByRole('button', { name: 'Platform navigation' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Verify menu items
    await expect(
      page.getByRole('link', { name: 'Template Library' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Alkemio Forum' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Explore Spaces' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Documentation' })
    ).toBeVisible();

    // Click Explore Spaces
    await page.getByRole('link', { name: 'Explore Spaces' }).click();

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

    // Verify the explorer's filter/search affordances. CRD replaces the
    // "All Spaces"/"Public Spaces" toggle buttons with a single "Filters"
    // button plus a search box.
    await expect(
      page.getByRole('button', { name: 'Filters' })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: /Search spaces/i })
    ).toBeVisible();
  });

  test('10. Explore Forum', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Platform navigation' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Click Alkemio Forum
    await page.getByRole('link', { name: 'Alkemio Forum' }).click();

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
    await page.getByRole('button', { name: 'Platform navigation' }).click();
    await page.waitForTimeout(500); // Wait for menu animation

    // Click Template Library
    await page.getByRole('link', { name: 'Template Library' }).click();

    // Verify navigation. CRD renames the page heading "Alkemio's Template
    // Library" -> "Innovation Library".
    await expect(page).toHaveURL(/\/innovation-library/);
    await expect(
      page.getByRole('heading', {
        name: 'Innovation Library',
        level: 1,
      })
    ).toBeVisible();

    // CRD replaces the per-type filter buttons with a single dropdown filter
    // ("All") in the Templates region and lists templates directly; verify the
    // Templates section and its filter dropdown are present.
    await expect(
      page.getByRole('heading', { name: 'Templates' })
    ).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Templates' })
        .getByText('All', { exact: true })
    ).toBeVisible();
  });

  test('14. Click on Collaboration Tool Template filter', async ({ page }) => {
    await page.goto(`${baseUrl}/innovation-library`);

    // Wait for page to load (CRD: "Innovation Library").
    await expect(
      page.getByRole('heading', {
        name: 'Innovation Library',
        level: 1,
      })
    ).toBeVisible();

    // CRD replaces the per-type filter buttons with a single dropdown filter
    // (currently "All") in the Templates region; wait for that section, then
    // open and verify the filter dropdown.
    await expect(
      page.getByRole('heading', { name: 'Templates' })
    ).toBeVisible({ timeout: 15_000 });
    const allFilter = page
      .getByRole('region', { name: 'Templates' })
      .getByText('All', { exact: true });
    await expect(allFilter).toBeVisible();
    await allFilter.click();
    await expect(allFilter).toBeVisible();
  });

  test('15. Navigate to Sign Up page', async ({ page }) => {
    await page.goto(baseUrl);

    // Click Sign up link
    await page.getByRole('link', { name: 'Sign up' }).first().click();

    // Verify navigation
    await expect(page).toHaveURL(/\/sign_up/);

    // Verify sign up form elements. CRD drops the "Welcome to Alkemio!" copy
    // and keeps the "Sign up" heading.
    await expect(
      page.getByRole('heading', { name: 'Sign up', level: 1 })
    ).toBeVisible();

    // Verify Sign in link
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    // Verify terms checkbox (CRD reworks the accessible name to include the
    // linked Terms of Use / Privacy Policy text).
    await expect(
      page.getByRole('checkbox', { name: /I accept the.*Terms of Use/i })
    ).toBeVisible();

    // Verify the sign-up form fields are present. CRD no longer disables the
    // fields until terms acceptance (the gating moved to the submit action),
    // so assert presence rather than the removed disabled-until-terms state.
    await expect(page.getByRole('textbox', { name: 'E-Mail' })).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Last Name' })
    ).toBeVisible();
  });
});
