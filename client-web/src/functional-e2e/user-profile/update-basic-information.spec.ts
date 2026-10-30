// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { UserProfileSettingsPage } from './user-profile-settings.page';

const test = createPersonaTest('admin@alkem.io');

// client-web#10437: the identity fields are plain labelled inputs inside the
// Identity section; nothing saves per field. Edits are buffered on the tab and
// committed by the bottom "Unsaved changes" bar ("Save changes" → toast
// "Changes saved"). The proof of a save is the reloaded page showing the new
// values — the toast alone could lie about persistence.

test.describe('My Profile Tab - View and Edit', () => {
  let originalFirstName: string;
  let originalLastName: string;

  test('Update Basic Information', async ({ page }) => {
    const profile = new UserProfileSettingsPage(page);

    // Already authenticated as admin via the shared persona session.
    // Navigate to the Profile settings tab
    await profile.goto('admin-alkemio');

    // Store originals so afterEach can put the shared persona back.
    originalFirstName = await profile.field('First Name').inputValue();
    originalLastName = await profile.field('Last Name').inputValue();
    expect(originalFirstName).toBeTruthy();
    expect(originalLastName).toBeTruthy();

    // 1-4. Update First Name and Last Name. The bar appears with the edit
    // count as soon as a field differs from its saved value.
    await expect(profile.unsavedChangesBar).toBeHidden();
    await profile.fillField('First Name', 'TestFirstName');
    await expect(profile.unsavedChangesBar).toBeVisible();
    await expect(profile.unsavedChangesBar.getByText('1 unsaved change', { exact: true })).toBeVisible();
    await profile.fillField('Last Name', 'TestLastName');
    await expect(profile.unsavedChangesBar.getByText('2 unsaved changes', { exact: true })).toBeVisible();

    // 5. Save through the bar; the "Changes saved" toast confirms the commit.
    await profile.saveChanges();

    // 6. The values survive a reload — the save really reached the server.
    await profile.reload();
    await expect(profile.field('First Name')).toHaveValue('TestFirstName');
    await expect(profile.field('Last Name')).toHaveValue('TestLastName');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: revert the shared persona to its original values whatever
    // happened above, and verify the revert the same way (reload → values).
    if (originalFirstName && originalLastName) {
      const profile = new UserProfileSettingsPage(page);
      // A failure between an edit and its save leaves the tab dirty, and a
      // dirty tab guards navigation (beforeunload); drop the buffer first.
      await profile.discardIfDirty();
      await profile.goto('admin-alkemio');
      const dirty =
        (await profile.field('First Name').inputValue()) !== originalFirstName ||
        (await profile.field('Last Name').inputValue()) !== originalLastName;
      if (dirty) {
        await profile.fillField('First Name', originalFirstName);
        await profile.fillField('Last Name', originalLastName);
        await profile.saveChanges();
      }
      await profile.reload();
      await expect(profile.field('First Name')).toHaveValue(originalFirstName);
      await expect(profile.field('Last Name')).toHaveValue(originalLastName);
    }
  });
});
