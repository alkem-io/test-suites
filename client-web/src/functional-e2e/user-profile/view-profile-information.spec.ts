// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { UserProfileSettingsPage } from './user-profile-settings.page';

const test = createPersonaTest('admin@alkem.io');

test.describe('My Profile Tab - View and Edit', () => {
  test('View Profile Information', async ({ page }) => {
    const profile = new UserProfileSettingsPage(page);

    // Already authenticated as admin via the shared persona session.
    // Navigate to the Profile settings tab
    await profile.goto('admin-alkemio');

    // client-web#10437 lays the tab out as collapsible SettingsSection cards:
    //  - Identity (open by default): Display/First/Last Name, Email (read-only), Phone
    //  - About You (collapsed): Tagline, Location (City + Country), Bio, Skills, Keywords
    //  - Social Links (collapsed): LinkedIn / Bluesky / GitHub
    //  - References (collapsed): the references editor
    //  - Profile Picture: the fixed avatar card on the right
    // Every field is a plain labelled input; the legacy "Full Name" field and
    // the per-field inline editors no longer exist (edits are saved by the
    // tab-wide "Save changes" bar — covered by update-basic-information).

    // 1. Verify the avatar editor is displayed
    await expect(page.getByRole('heading', { name: 'Profile Picture' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change Avatar' })).toBeVisible();

    // 2. Verify the identity fields are visible, in the open Identity section
    await expect(profile.sectionTrigger('Identity')).toHaveAttribute('aria-expanded', 'true');
    await expect(profile.field('Display Name')).toBeVisible();
    await expect(profile.field('First Name')).toBeVisible();
    await expect(profile.field('Last Name')).toBeVisible();
    await expect(profile.field('Phone')).toBeVisible();

    // 2. Email is shown read-only, with the "contact support" caption
    await expect(profile.field('Email')).toBeVisible();
    await expect(profile.field('Email')).toHaveAttribute('readonly', '');
    await expect(page.getByText('Contact support to change email')).toBeVisible();

    // 3. About You starts collapsed — its fields are in the DOM but hidden
    // until the section is opened.
    await expect(profile.field('Tagline')).toBeHidden();
    await profile.openSection('About You');
    await expect(profile.field('Tagline')).toBeVisible();

    // 3. Verify City textbox is visible
    await expect(profile.field('City')).toBeVisible();

    // 3. Verify the Country picker is visible (a combobox button under the
    // "Location" legend, named by the selected country or its placeholder).
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
    await expect(profile.countryCombobox).toBeVisible();

    // 3. Verify Bio rich-text editor is visible
    await expect(page.getByRole('textbox', { name: 'Formatting toolbar' })).toBeVisible();

    // 3. Verify Skills section input is visible
    await expect(
      page.getByRole('textbox', {
        name: 'e.g. UX research, TypeScript, facilitation',
      })
    ).toBeVisible();

    // 3. Verify social link textboxes are visible (Social Links section)
    await profile.openSection('Social Links');
    await expect(profile.field('LinkedIn')).toBeVisible();
    await expect(profile.field('Bluesky')).toBeVisible();
    await expect(profile.field('GitHub')).toBeVisible();

    // 3. Verify Add Reference button is visible (References section)
    await profile.openSection('References');
    await expect(page.getByRole('button', { name: 'Add another reference' })).toBeVisible();

    // 3. Verify References section shows no references message
    await expect(page.getByText('No references yet')).toBeVisible();

    // Nothing above edited a field, so the tab must still be clean: the
    // unsaved-changes bar stays hidden.
    await expect(profile.unsavedChangesBar).toBeHidden();
  });
});
