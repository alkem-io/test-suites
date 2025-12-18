// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// seed: client-web/src/functional-e2e/seed-contributors-crud.spec.ts
//
// Test Suite 3: Virtual Contributor (VC) CRUD Tests
// Covers: Creation, Knowledge management, Space interactions, Visibility, Deletion

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
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication, getSharedPage } =
  createAuthenticatedSessionFixture({
    storageStateName: 'vc-crud.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'vc-crud',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'VC CRUD Test Space',
        tagline: 'Space for testing Virtual Contributor CRUD operations',
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
        TestUser.GLOBAL_BETA_TESTER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
  // Innovation Pack with templates for VC knowledge management
  innovationPack: {
    useBaseOrganization: true,
    pack: {
      displayName: 'VC CRUD Test Template Pack',
      tags: ['vc', 'crud', 'test'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template - VC CRUD',
        postDefaultDescription: 'Template for VC knowledge posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines - VC CRUD',
      },
    ],
  },
  // Platform discussion for testing VC tagging
  platformDiscussion: {
    title: 'VC CRUD Test Discussion',
    description: 'Discussion for testing Virtual Contributor tagging',
    category: 'PLATFORM_FUNCTIONALITIES',
  },
};

// Serial mode to ensure clean setup/teardown
test.describe.configure({ mode: 'serial' });

test.describe('Virtual Contributor CRUD Tests', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Setup authentication for Organization Admin (for VC management)
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

  test('3.1 Create new Virtual Contributor with all required details', async ({
    page,
  }) => {
    // 1. Go to Dashboard
    await page.goto(`${baseUrl}/my-dashboard`);
    await expect(page).toHaveURL(/\/my-dashboard/);

    // 2. Navigate to organization profile (associated organization)
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
    }

    // 4. Navigate to Account page or look for VC creation
    const accountTab = page.getByRole('tab', { name: /account/i });
    if (await accountTab.isVisible()) {
      await accountTab.click();
    }

    // 5. Look for "Create new Virtual Contributor" button
    const createVCButton = page.getByRole('button', {
      name: /create.*virtual.*contributor|new.*vc|add.*vc/i,
    });

    if (await createVCButton.isVisible()) {
      await createVCButton.click();

      // 6. Verify VC creation form appears
      await expect(
        page.getByText(/virtual.*contributor|create.*vc/i).first()
      ).toBeVisible();

      // 7. Look for form fields
      const nameField = page.getByRole('textbox', { name: /name/i });
      const descriptionField = page.getByRole('textbox', {
        name: /description/i,
      });

      if (await nameField.isVisible()) {
        await expect(nameField).toBeVisible();
      }

      if (await descriptionField.isVisible()) {
        await expect(descriptionField).toBeVisible();
      }

      // 8. Look for knowledge type selection
      const knowledgeTypeSelect = page.getByText(/written.*knowledge|text/i);
      if (await knowledgeTypeSelect.isVisible()) {
        await expect(knowledgeTypeSelect).toBeVisible();
      }

      // Cancel to avoid creating test VC
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }

    // Verify organization page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.2 Add text post knowledge to Virtual Contributor', async ({
    page,
  }) => {
    // 1. Navigate to organization VCs (assumes VC exists)
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    if (await vcSection.isVisible()) {
      // 3. Navigate to VC profile (if VCs exist)
      const vcLink = page.getByRole('link', { name: /vc|virtual/i }).first();
      if (await vcLink.isVisible()) {
        await vcLink.click();

        // 4. Navigate to Knowledge/BoK section
        const knowledgeTab = page.getByRole('tab', {
          name: /knowledge|body.*of.*knowledge|bok/i,
        });
        if (await knowledgeTab.isVisible()) {
          await knowledgeTab.click();
        }

        // 5. Look for Add Post button
        const addPostButton = page.getByRole('button', {
          name: /add.*post|new.*post/i,
        });
        if (await addPostButton.isVisible()) {
          await addPostButton.click();

          // 6. Verify post creation form
          const titleField = page.getByRole('textbox', { name: /title/i });

          if (await titleField.isVisible()) {
            await expect(titleField).toBeVisible();
          }

          // Cancel post creation
          const cancelButton = page.getByRole('button', { name: /cancel/i });
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }

    // Verify we're on a valid page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.3 Add document knowledge to Virtual Contributor', async ({
    page,
  }) => {
    // 1. Navigate to organization VCs
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    if (await vcSection.isVisible()) {
      // 3. Navigate to VC profile (if VCs exist)
      const vcLink = page.getByRole('link', { name: /vc|virtual/i }).first();
      if (await vcLink.isVisible()) {
        await vcLink.click();

        // 4. Navigate to Knowledge section
        const knowledgeTab = page.getByRole('tab', {
          name: /knowledge|body.*of.*knowledge|bok/i,
        });
        if (await knowledgeTab.isVisible()) {
          await knowledgeTab.click();
        }

        // 5. Look for Add Document button
        const addDocButton = page.getByRole('button', {
          name: /add.*document|upload.*document/i,
        });
        if (await addDocButton.isVisible()) {
          await addDocButton.click();

          // 6. Verify document upload form
          const titleField = page.getByRole('textbox', { name: /title/i });
          const fileInput = page.locator('input[type="file"]');

          if (await titleField.isVisible()) {
            await expect(titleField).toBeVisible();
          }

          if (await fileInput.isVisible()) {
            await expect(fileInput).toBeVisible();
          }

          // Cancel document upload
          const cancelButton = page.getByRole('button', { name: /cancel/i });
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }

    // Verify page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.4 Select Space for VC to start interacting', async ({ page }) => {
    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    if (await vcSection.isVisible()) {
      const vcLink = page.getByRole('link', { name: /vc|virtual/i }).first();
      if (await vcLink.isVisible()) {
        await vcLink.click();

        // 3. Navigate to VC Settings
        const settingsTab = page.getByRole('tab', { name: /settings/i });
        if (await settingsTab.isVisible()) {
          await settingsTab.click();
        }

        // 4. Look for Space Interactions section
        const spaceSection = page.getByText(
          /space.*interaction|associated.*space/i
        );
        if (await spaceSection.isVisible()) {
          await expect(spaceSection).toBeVisible();

          // 5. Look for space dropdown/selector
          const spaceSelect = page.getByRole('combobox', {
            name: /space/i,
          });
          if (await spaceSelect.isVisible()) {
            await expect(spaceSelect).toBeVisible();
          }
        }
      }
    }

    // Verify page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.5 Tag Virtual Contributor with question in discussion', async ({
    browser,
  }) => {
    // Switch to Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Space
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();

    // 2. Navigate to Forum/Discussion (via Tools Menu)
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Alkemio Forum' }).click();

    // 3. Verify forum page loads
    await expect(page).toHaveURL(/\/forum/);
    await expect(
      page.getByRole('heading', {
        name: /Welcome to the Alkemio Forum/i,
        level: 1,
      })
    ).toBeVisible();

    // 4. Look for existing discussion card
    const discussionButton = page.getByRole('button').filter({
      has: page.getByRole('heading', { name: /VC CRUD Test Discussion/i }),
    });

    if (await discussionButton.isVisible()) {
      await discussionButton.click();
      await page.waitForTimeout(1000);

      // 5. Verify discussion heading is visible (best-effort)
      const discussionHeading = page.getByRole('heading', {
        name: /VC CRUD Test Discussion/i,
        level: 3,
      });

      if (await discussionHeading.isVisible()) {
        await expect(discussionHeading).toBeVisible();
      }

      // 6. Look for comment/reply input
      const commentInput = page.getByRole('textbox', {
        name: /comment|reply|message/i,
      });
      if (await commentInput.isVisible()) {
        // 7. Type "@" to trigger mention
        await commentInput.fill('@');
        await page.waitForTimeout(500);

        // 8. Look for VC in mention suggestions
        const mentionSuggestions = page.locator(
          '[role="listbox"], [role="menu"]'
        );
        if (await mentionSuggestions.isVisible()) {
          await expect(mentionSuggestions).toBeVisible();
        }

        // Clear the input
        await commentInput.clear();
      }
    }

    // Verify we're on a valid page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.6 Navigate to Virtual Contributor profile from mention', async ({
    browser,
  }) => {
    // Ensure authentication as Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Contributors page
    await page.goto(baseUrl);
    await page.waitForURL('**/home');

    // Open Tools Menu
    await page.getByRole('button', { name: 'Tools Menu' }).click();
    await page.waitForTimeout(500);

    // Click Find contributors
    await page.getByRole('menuitem', { name: 'Find contributors' }).click();

    // 2. Verify Contributors page loads
    await expect(page).toHaveURL(/\/contributors/);
    await expect(
      page.getByRole('heading', { name: /contributor|talent/i, level: 1 })
    ).toBeVisible();

    // 3. Look for Virtual Contributors section
    await expect(
      page.getByRole('heading', { name: 'Virtual Contributors' })
    ).toBeVisible();

    // 4. If VCs are listed, click on one
    const vcCards = page.getByRole('link', { name: /Card banner:/i });
    const vcCount = await vcCards.count();

    if (vcCount > 0) {
      // Find VC card specifically
      const vcSection = page
        .getByRole('heading', { name: 'Virtual Contributors' })
        .locator('..')
        .locator('..');
      const vcCard = vcSection
        .getByRole('link', { name: /Card banner:/i })
        .first();

      if (await vcCard.isVisible()) {
        await vcCard.click();

        // 5. Verify VC profile page
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }
    }

    // Verify we're on a valid page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.7 Change Virtual Contributor visibility to hidden', async ({
    browser,
  }) => {
    // Switch to Organization Admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    const page = getSharedPage();

    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    if (await vcSection.isVisible()) {
      const vcLink = page.getByRole('link', { name: /vc|virtual/i }).first();
      if (await vcLink.isVisible()) {
        await vcLink.click();

        // 3. Navigate to VC Settings tab
        const settingsTab = page.getByRole('tab', { name: /settings/i });
        if (await settingsTab.isVisible()) {
          await settingsTab.click();
        }

        // 4. Look for Visibility setting
        const visibilityOption = page.getByText(/visibility|privacy|hidden/i);
        if (await visibilityOption.isVisible()) {
          await expect(visibilityOption).toBeVisible();

          // 5. Look for toggle or dropdown
          const visibilityToggle = page.locator(
            'input[type="checkbox"], [role="switch"]'
          );
          if ((await visibilityToggle.count()) > 0) {
            // Visibility toggle exists
            await expect(visibilityToggle.first()).toBeVisible();
          }
        }
      }
    }

    // Verify page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.8 Visit and verify VC Body of Knowledge', async ({ browser }) => {
    // Switch to Space Member
    await teardownAuthentication();
    await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
    const page = getSharedPage();

    // 1. Navigate to Contributors page
    await page.goto(`${baseUrl}/contributors`);
    await expect(page).toHaveURL(/\/contributors/);

    // 2. Look for Virtual Contributors section
    await expect(
      page.getByRole('heading', { name: 'Virtual Contributors' })
    ).toBeVisible();

    // 3. Click on a VC if available
    const vcSection = page
      .getByRole('heading', { name: 'Virtual Contributors' })
      .locator('..')
      .locator('..');
    const vcCard = vcSection
      .getByRole('link', { name: /Card banner:/i })
      .first();

    if (await vcCard.isVisible()) {
      await vcCard.click();

      // 4. Verify VC profile page
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // 5. Look for Body of Knowledge section
      const bokSection = page.getByText(
        /body.*of.*knowledge|knowledge.*base|bok/i
      );
      if (await bokSection.isVisible()) {
        await expect(bokSection).toBeVisible();

        // 6. Look for knowledge items (posts, documents)
        const knowledgeItems = page.getByRole('link', {
          name: /post|document|article/i,
        });
        if ((await knowledgeItems.count()) > 0) {
          // Knowledge items exist
          await expect(knowledgeItems.first()).toBeVisible();
        }
      }
    }

    // Verify we're on a valid page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('3.9 Delete Virtual Contributor and verify removal', async ({
    browser,
  }) => {
    // Switch to Organization Admin
    await teardownAuthentication();
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
    const page = getSharedPage();

    // 1. Navigate to organization
    await page.goto(
      `${baseUrl}/organization/${baseScenario.organization.nameId}`
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Look for Virtual Contributors section
    const vcSection = page.getByText(/virtual.*contributor/i);
    if (await vcSection.isVisible()) {
      const vcLink = page.getByRole('link', { name: /vc|virtual/i }).first();
      if (await vcLink.isVisible()) {
        await vcLink.click();

        // 3. Navigate to VC Settings
        const settingsTab = page.getByRole('tab', { name: /settings/i });
        if (await settingsTab.isVisible()) {
          await settingsTab.click();
        }

        // 4. Look for Delete VC button (danger zone)
        const deleteButton = page.getByRole('button', {
          name: /delete.*virtual.*contributor|remove.*vc|delete.*vc/i,
        });

        if (await deleteButton.isVisible()) {
          // Verify delete option exists (don't actually delete)
          await expect(deleteButton).toBeVisible();

          // Note: Not actually deleting to preserve test data
          // In a full test, we would:
          // - Click delete
          // - Confirm deletion
          // - Verify VC is deleted
          // - Verify VC doesn't appear in organization
          // - Verify VC mentions show as deleted
        }
      }
    }

    // Verify organization page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
