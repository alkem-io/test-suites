// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { delay, TestUserManager } from '@alkemio/tests-lib';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-contributions',
  space: {
    about: {
      profile: {
        displayName: 'Callout Contributions Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true, // For post contributions
      addLinkCollectionCallout: true, // For link contributions
      addWhiteboardCallout: false,
      addWhiteboardCollectionCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-contributions-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

memberFixture.test.describe.serial('Callout Contributions - Member', () => {
  memberFixture.test.beforeAll(async ({ browser }) => {
    memberFixture.test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await memberFixture.setupAuthentication(
      browser,
      TestUserManager.users.spaceMember.email
    );
  });

  memberFixture.test.afterAll(async () => {
    memberFixture.test.setTimeout(30_000);
    await memberFixture.teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  memberFixture.test(
    '6.1 Add Post Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const postTitle = `Test Post ${Date.now()}`;
      const postContent = 'This is a test post contribution from a member';

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      expect(
        collaborationPage.getCalloutByName(
          baseScenario.space.collaboration.calloutPostCollectionDisplayName
        )
      ).toBeDefined();
      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutPostCollectionDisplayName
      );
      await delay(500); // Wait for contributions to load
      await expect(collaborationPage.addContributionButton).toBeVisible({
        timeout: 5000,
      });

      await collaborationPage.addPostContribution(postTitle, postContent);

      await expect(page.getByText(postTitle).first()).toBeVisible();
    }
  );

  memberFixture.test(
    '6.2 Add Link Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const linkUrl = 'https://example.com/test-resource';
      const linkTitle = `Test Link ${Date.now()}`;

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);

      // Use the pre-created link collection callout from scenario
      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutLinkCollectionDisplayName
      );
      await delay(500); // Wait for contributions to load
      await expect(collaborationPage.addContributionButton.first()).toBeVisible(
        { timeout: 3000 }
      );

      await collaborationPage.addLinkContribution(linkUrl, linkTitle);

      await expect(page.getByText(linkTitle).first()).toBeVisible();
    }
  );

  memberFixture.test(
    '6.4 Edit Own Contribution - As Space Member',
    async ({ page }) => {
      memberFixture.test.setTimeout(45_000);
      const collaborationPage = new CollaborationPage(page, baseUrl);
      const originalTitle = 'Original Post Title';
      const originalContent = 'Original content for testing';
      const editedTitle = `Edited Post ${Date.now()}`;
      const editedContent = 'This content has been edited';

      await collaborationPage.navigateToSpace(baseScenario.space.nameId);
      await collaborationPage.clickCallout(
        baseScenario.space.collaboration.calloutPostCollectionDisplayName
      );

      // Add a post contribution
      await delay(500); // Wait for contributions to load
      await collaborationPage.addPostContribution(
        originalTitle,
        originalContent
      );
      await expect(page.getByText(originalTitle).first()).toBeVisible();

      // Find and open the contribution card inside the open callout dialog
      // (the same title also appears in the feed behind the dialog). The card is
      // a button whose accessible name begins with the contribution title.
      const contributionCard = page
        .getByRole('dialog')
        .getByRole('button', { name: originalTitle })
        .first();
      await contributionCard.click();

      // CRD: the opened contribution preview exposes an "Edit response" button.
      const editButton = page.getByRole('button', { name: 'Edit response' });
      await expect(editButton).toBeVisible();
      await editButton.click();

      await delay(500); // Small delay to allow editor to load

      // Edit the title (CRD: textbox named "Title")
      const titleInput = page.getByRole('textbox', { name: 'Title' });
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      // Edit the content (CRD: editor placeholder "Write your post..."/"Write something...")
      const contentEditor = page.getByRole('textbox', {
        name: /write (something|your post)/i,
      });
      await contentEditor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(editedContent, { delay: 50 });

      // Save changes (CRD primary submit)
      await page.getByRole('button', { name: /^(save|update|post)$/i }).click();

      // Verify edited content is visible
      await expect(page.getByText(editedTitle).first()).toBeVisible({
        timeout: 5000,
      });
    }
  );
});
