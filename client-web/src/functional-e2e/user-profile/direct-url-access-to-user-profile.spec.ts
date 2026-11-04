// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { UserProfileSettingsPage } from './user-profile-settings.page';

// admin@alkem.io is the globalAdmin persona (shares persona.admin-alkem-io.json
// with the fixture-based specs, so it logs in at most once per run).
const test = createPersonaTest('admin@alkem.io');

test.describe('Navigation and Access', () => {
  test('Direct URL Access to User Profile', async ({ page }) => {
    const profile = new UserProfileSettingsPage(page);

    // Already authenticated as admin via the shared persona session.
    // 1. Navigate directly to /user/admin-alkemio/settings/profile; the
    // "Profile" tab is active (CRD renames "My profile") and the Identity
    // section — open by default (client-web#10437) — shows the name fields as
    // plain labelled inputs.
    await profile.goto('admin-alkemio');
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');

    await expect(profile.field('First Name')).toBeVisible();
    await expect(profile.field('Last Name')).toBeVisible();
  });
});
