// Page object for the User Settings → Profile tab (client-web#10437,
// `src/crd/components/user/settings/UserProfileTabView.tsx`).
//
// The tab is a column of `SettingsSection` cards — Identity (open by default),
// About You, Social Links and References (all collapsed by default) — plus the
// fixed Profile Picture card on the right. A collapsed section keeps its body
// mounted but `hidden`, so a field inside it only becomes visible after the
// section's `<h3><button>` trigger is clicked. Fields are plain labelled
// inputs; nothing saves per field any more — every edit is buffered and
// committed by the tab-wide bottom bar ("Unsaved changes" region → "Save
// changes" → toast "Changes saved"). Shared by every spec in this folder that
// touches the tab, so a copy or layout change is fixed here once.

import { expect, type Locator, type Page } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** The collapsible cards; the Profile Picture card on the right is fixed open and has no trigger. */
export type ProfileSection = 'Identity' | 'About You' | 'Social Links' | 'References';

export class UserProfileSettingsPage {
  constructor(private readonly page: Page) {}

  async goto(nameId: string) {
    await this.page.goto(`${baseUrl}/user/${nameId}/settings/profile`);
    await this.waitForLoaded();
  }

  /** Reloads the tab and waits for the saved values to render again. */
  async reload() {
    await this.page.reload();
    await this.waitForLoaded();
  }

  private async waitForLoaded() {
    await expect(this.page.getByRole('tab', { name: 'Profile' })).toBeVisible();
    // The Identity card renders only once the profile query resolved; the
    // skeleton before it has no fields at all.
    await expect(this.field('Display Name')).toBeVisible();
  }

  /** The section's collapse trigger — the button inside its `<h3>`. */
  sectionTrigger(title: ProfileSection): Locator {
    return this.page.getByRole('heading', { name: title, level: 3, exact: true }).getByRole('button', { name: title });
  }

  /** Expands a collapsed section; a no-op when it is already open. */
  async openSection(title: ProfileSection) {
    const trigger = this.sectionTrigger(title);
    await expect(trigger).toBeVisible();
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click();
    }
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  }

  /** A boxed text input by its visible label ("Display Name", "First Name", "Tagline", …). */
  field(label: string): Locator {
    return this.page.getByRole('textbox', { name: label, exact: true });
  }

  /**
   * The Country picker (About You → Location): a `role="combobox"` button whose
   * accessible name is the selected country or the "Select a country"
   * placeholder, so it is the only combobox on the tab rather than named.
   */
  get countryCombobox(): Locator {
    return this.page.getByRole('combobox');
  }

  async fillField(label: string, value: string) {
    const input = this.field(label);
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }

  get unsavedChangesBar(): Locator {
    return this.page.getByRole('region', { name: 'Unsaved changes' });
  }

  get saveChangesButton(): Locator {
    return this.unsavedChangesBar.getByRole('button', { name: 'Save changes', exact: true });
  }

  get discardButton(): Locator {
    return this.unsavedChangesBar.getByRole('button', { name: 'Discard', exact: true });
  }

  /**
   * Throws away buffered edits when the bar is showing: Discard → the
   * "Discard N unsaved changes?" confirmation → Discard. A clean tab is a
   * no-op. Used by cleanup so a half-finished edit never blocks the next
   * navigation behind the tab's leave guard.
   */
  async discardIfDirty() {
    if (!(await this.unsavedChangesBar.isVisible())) return;
    await this.discardButton.click();
    const dialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(this.unsavedChangesBar).toBeHidden();
  }

  /**
   * Commits every buffered edit on the tab and waits for the two signals a
   * user gets: the "Changes saved" toast and the bar sliding away. The bar's
   * region is `aria-hidden`/`inert` while clean, so "hidden" is the clean state.
   */
  async saveChanges() {
    await expect(this.unsavedChangesBar).toBeVisible();
    await expect(this.saveChangesButton).toBeEnabled();
    await this.saveChangesButton.click();
    await expect(this.page.getByText('Changes saved', { exact: true })).toBeVisible();
    await expect(this.unsavedChangesBar).toBeHidden();
  }
}
