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
import { openSettingsSection, settingsSectionTrigger } from '../helpers/settings-section.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// The Location fields (City + Country) are the same CRD component on the user,
// organisation and Space settings tabs, so they are exported as functions too:
// the organisation walks in `profile-editing/` use them without this class.

/**
 * The City field: since client-web#10499 a free-text
 * `<input role="combobox" aria-label="City">` with suggestions, no longer a
 * textbox, so a textbox lookup for "City" matches nothing.
 */
export const cityCombobox = (page: Page): Locator =>
  page.getByRole('combobox', { name: 'City', exact: true });

/**
 * The Country picker: a `role="combobox"` button whose accessible name is the
 * selected country or the "Select a country" placeholder (plus its nested
 * "Clear country" button once set). Since client-web#10499 it is the SECOND
 * combobox of the Location group, next to City, so it is found as the group's
 * combobox that is not City.
 */
export const countryCombobox = (page: Page): Locator =>
  page
    .getByRole('group', { name: 'Location' })
    .getByRole('combobox', { name: /^(?!City$)/ });

/**
 * Picks a country from the combobox's popover and proves it took. Asserts with
 * `toContainText`: the trigger nests a "Clear country" button, so its
 * accessible name is not just the country.
 */
export const pickCountry = async (page: Page, name: string) => {
  await countryCombobox(page).click();
  await page.getByPlaceholder('Search country…').fill(name);
  await page.getByRole('button', { name, exact: true }).click();
  await expect(countryCombobox(page)).toContainText(name);
};

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
    return settingsSectionTrigger(this.page, title);
  }

  /** Expands a collapsed section; a no-op when it is already open. */
  async openSection(title: ProfileSection) {
    await openSettingsSection(this.page, title);
  }

  /** A boxed text input by its visible label ("Display Name", "First Name", "Tagline", …). */
  field(label: string): Locator {
    return this.page.getByRole('textbox', { name: label, exact: true });
  }

  /** About You → Location → City (see `cityCombobox`). */
  get cityCombobox(): Locator {
    return cityCombobox(this.page);
  }

  /** About You → Location → Country (see `countryCombobox`). */
  get countryCombobox(): Locator {
    return countryCombobox(this.page);
  }

  async pickCountry(name: string) {
    await pickCountry(this.page, name);
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
