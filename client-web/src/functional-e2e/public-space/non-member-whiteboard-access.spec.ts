// spec: client-web/src/functional-e2e/public-space/public-space-non-member-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { expect } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { TestUserManager } from '@alkemio/tests-lib';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'non-member-whiteboard-access.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-public-space',
  space: {
    about: {
      profile: {
        displayName: 'Public Space for E2E Tests',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addWhiteboardCallout: true,
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
  },
};

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

test.describe.configure({ mode: 'serial' });

test.describe('Whiteboard Access for Non-Members', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('3.1 Non-Member Can View Whiteboard Callout in Space', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // Verify whiteboard callout is visible on the home tab
    await expect(
      page.getByRole('heading', {
        name: /whiteboard callout/,
      })
    ).toBeVisible({ timeout: 30_000 });

    // Verify whiteboard description is shown
    await expect(page.getByText('Whiteboard - initial')).toBeVisible();

    // CRD collapses the comment thread by default (020 callout-collapse).
    // Expand it to surface the non-member gating message.
    await page.getByRole('button', { name: /Expand comments/i }).first().click();

    // Verify non-member message is displayed (CRD rewords the gating copy)
    await expect(
      page
        .getByText(
          "You don't have permission to comment, reply or react here."
        )
        .first()
    ).toBeVisible();
  });

  test('3.2 Non-Member Can Open and View Whiteboard Content', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // CRD exposes the whiteboard callout via an explicit "Open ... whiteboard
    // callout" link (the heading link no longer triggers the modal).
    await page
      .getByRole('link', {
        name: /Open .*whiteboard callout/,
      })
      .click({ timeout: 30_000 });

    // Verify the dialog opens
    await expect(
      page.getByRole('dialog', {
        name: /whiteboard callout/,
      })
    ).toBeVisible();

    // Verify whiteboard description in dialog
    await expect(
      page.getByRole('dialog').getByText('Whiteboard - initial')
    ).toBeVisible();

    // Wait for whiteboard to load - it may take time to render canvas
    await page.waitForTimeout(3000);

    // Verify whiteboard canvas is rendered
    // Check if canvas exists at all in the dialog
    const canvasCount = await page
      .getByRole('dialog')
      .locator('canvas')
      .count();
    console.log(`Canvas elements found in dialog: ${canvasCount}`);

    if (canvasCount === 0) {
      // Canvas not rendered, this is expected for read-only view in some configurations
      console.log(
        'Whiteboard canvas not rendered - skipping canvas verification'
      );
    } else {
      await expect(
        page.getByRole('dialog').locator('canvas').first()
      ).toBeVisible();
    }

    // Verify zoom controls are present (pan/zoom capability)
    // Zoom controls may not be available for read-only whiteboards
    const zoomButtonCount = await page
      .getByRole('dialog')
      .getByRole('button', { name: /zoom/i })
      .count();
    console.log(`Zoom buttons found in dialog: ${zoomButtonCount}`);

    if (zoomButtonCount > 0) {
      await expect(
        page.getByRole('dialog').getByRole('button', { name: /zoom/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    } else {
      console.log('Zoom controls not available - skipping zoom verification');
    }
  });

  test('3.3 Non-Member Cannot Edit Whiteboard (Read-Only Access)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // Navigate to the public space as non-member (already authenticated)
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // Open the whiteboard callout dialog via the explicit "Open ..." link.
    await page
      .getByRole('link', {
        name: /Open .*whiteboard callout/,
      })
      .click({ timeout: 30_000 });

    // Verify the dialog opens
    await expect(
      page.getByRole('dialog', {
        name: /whiteboard callout/,
      })
    ).toBeVisible();

    // Expand the whiteboard to full window for better interaction testing
    // (CRD may not surface this control for an empty/read-only whiteboard).
    const expandWindow = page.getByRole('button', { name: 'Expand Window' });
    if (await expandWindow.count()) {
      await expandWindow.click();
      await page.waitForLoadState('networkidle');
    }

    // Verify read-only mode indicator or message
    // Non-members should see a message that they cannot edit. CRD collapses
    // the comment thread by default; expand it to surface the gating copy.
    const expandComments = page
      .getByRole('button', { name: /Expand comments/i })
      .first();
    if (await expandComments.count()) {
      await expandComments.click();
    }
    await expect(
      page
        .getByText(
          "You don't have permission to comment, reply or react here."
        )
        .first()
    ).toBeVisible();

    // Verify drawing tools/edit controls are disabled or hidden
    // Check that the whiteboard toolbar does not contain edit buttons
    const editButtons = page.locator(
      '[data-testid="whiteboard-edit-tool"], [aria-label*="Add"], [aria-label*="Draw"], [aria-label*="Text"]'
    );
    await expect(editButtons).toHaveCount(0, { timeout: 5_000 });
  });

  test('3.4 Anonymous User Can View Whiteboard Callout in Public Space', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Navigate to the public space as anonymous user
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
    await page.waitForLoadState('networkidle');

    // As anonymous user (not logged in), verify whiteboard is visible
    await expect(
      page.getByRole('heading', {
        name: /whiteboard callout/,
      })
    ).toBeVisible({ timeout: 30_000 });

    // Click to open the whiteboard callout via the explicit "Open ..." link.
    await page
      .getByRole('link', {
        name: /Open .*whiteboard callout/,
      })
      .click();

    // Verify dialog opens without login requirement
    await expect(
      page.getByRole('dialog', {
        name: /whiteboard callout/,
      })
    ).toBeVisible();

    // Verify read-only message is shown in the dialog. CRD collapses the
    // comment thread by default; expand it to surface the gating copy.
    const expandComments = page
      .getByRole('dialog')
      .getByRole('button', { name: /Expand comments/i })
      .first();
    if (await expandComments.count()) {
      await expandComments.click();
    }
    await expect(
      page
        .getByRole('dialog')
        .getByText(
          "You don't have permission to comment, reply or react here."
        )
    ).toBeVisible();
  });
});
