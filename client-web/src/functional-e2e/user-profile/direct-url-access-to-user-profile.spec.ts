// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// admin@alkem.io is the globalAdmin persona (shares persona.admin-alkem-io.json
// with the fixture-based specs, so it logs in at most once per run).
const test = createPersonaTest('admin@alkem.io');

test.describe('Navigation and Access', () => {
  test('Direct URL Access to User Profile', async ({ page }) => {
    // Already authenticated as admin via the shared persona session.
    // 1. Navigate directly to /user/admin-alkemio/settings/profile
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // Verify the "Profile" tab is active (CRD renames "My profile").
    await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible();

    // CRD renders the name fields as inline-edit buttons (popover editors)
    // instead of textboxes, and removes the bottom "Save" button (each field
    // auto-saves via its popover).
    await expect(
      page.getByRole('button', { name: 'First Name' })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Last Name' })
    ).toBeVisible();
  });
});
