import { Page, expect, Locator } from '@playwright/test';

/**
 * Page object for the admin-only **Contributors callout** (client-web feature
 * 008 / story client-web#9928).
 *
 * Covers two CRD surfaces:
 *  1. The create/edit callout form — the "Contributors" framing **radio**, the
 *     contributor-type multi-select (**buttons** with `aria-pressed`: People /
 *     Organizations / Virtual Contributors), the default-type **radiogroup**,
 *     and the default-display (List/Map) **radiogroup**.
 *  2. The rendered contributor-collection body — a `region` labelled
 *     "Contributors" containing the segmented type-switch `tab`s (each carrying
 *     its per-type count, e.g. "People3"), the client-side name-search
 *     `textbox`, the List/Map view toggle, the contributor cards, and the empty
 *     state.
 *
 * All selectors were verified against a live CRD build; see the selector
 * contract at
 * `agents-hq/specs/009-contributors-callout-ui-tests/contracts/`.
 */
export type ContributorType = 'People' | 'Organizations' | 'Virtual Contributors';

/** The full set of contributor types, in render order. */
const ALL_CONTRIBUTOR_TYPES: ContributorType[] = [
  'People',
  'Organizations',
  'Virtual Contributors',
];

export class ContributorsCalloutPage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  // ---------------------------------------------------------------- navigation

  async navigateToSpace(spaceNameId: string) {
    await this.page.goto(`${this.baseUrl}/${spaceNameId}`);
    await this.dismissCookieBanner();
  }

  /**
   * Wait until the space content feed (the callout list) has rendered. Needed
   * before any non-retrying check such as `calloutCard(...).count()`, which
   * would otherwise race the feed load right after navigation.
   */
  async waitForContentFeed() {
    await this.page
      .getByRole('region', { name: 'Space content feed' })
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  private async dismissCookieBanner() {
    const accept = this.page.getByRole('button', {
      name: /accept all cookies/i,
    });
    // Wait for the banner to actually render before clicking — a snapshot check
    // can miss it in the moment right after goto(). No banner is fine.
    try {
      await accept.waitFor({ state: 'visible', timeout: 2000 });
      await accept.click();
    } catch {
      /* no banner surfaced — nothing to dismiss */
    }
  }

  // ------------------------------------------------------------- create form

  get addCalloutButton() {
    // CRD: the tab-level create trigger is exactly "Add Post".
    return this.page.getByRole('button', { name: 'Add Post', exact: true });
  }

  async isAddCalloutVisible(): Promise<boolean> {
    // A real wait rather than an immediate snapshot: return true only if the
    // button actually appears within the window, false once it times out.
    return await this.addCalloutButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }

  /** The "Contributors" framing radio in the create/edit callout form. */
  get framingContributorsOption() {
    return this.page.getByRole('radio', { name: 'Contributors', exact: true });
  }

  get titleInput() {
    return this.page.getByRole('textbox', { name: 'Title' });
  }

  get postButton() {
    return this.page.getByRole('button', { name: 'Post', exact: true });
  }

  get saveEditButton() {
    // Edit mode primary submit is "Save".
    return this.page.getByRole('button', { name: 'Save', exact: true });
  }

  /** Dialog dismiss / cancel button. */
  get closeButton() {
    return this.page.getByRole('button', { name: 'Close' }).first();
  }

  /** Contributor-type multi-select toggle (button with `aria-pressed`). */
  typeToggle(type: ContributorType): Locator {
    return this.page.getByRole('button', { name: type, exact: true });
  }

  /** Default-type picker option (radio; shown only when >1 type is selected). */
  defaultTypeRadio(type: ContributorType): Locator {
    return this.page.getByRole('radio', { name: type, exact: true });
  }

  /** Default-display option (radio: List / Map). */
  defaultViewRadio(view: 'List' | 'Map'): Locator {
    return this.page.getByRole('radio', { name: view, exact: true });
  }

  /** Validation message shown when zero contributor types are selected. */
  get typesRequiredError() {
    return this.page.getByText('Select at least one contributor type.');
  }

  async openCreateForm() {
    await this.addCalloutButton.click();
    await expect(this.framingContributorsOption).toBeVisible({ timeout: 10000 });
  }

  async selectContributorsFraming() {
    await this.framingContributorsOption.click();
    // Type toggles appear once the framing is selected.
    await expect(this.typeToggle('People')).toBeVisible({ timeout: 5000 });
  }

  async isTypeSelected(type: ContributorType): Promise<boolean> {
    return (
      (await this.typeToggle(type).getAttribute('aria-pressed')) === 'true'
    );
  }

  /** Toggle a type only if its current pressed-state differs from `selected`. */
  async setTypeSelected(type: ContributorType, selected: boolean) {
    if ((await this.isTypeSelected(type)) !== selected) {
      await this.typeToggle(type).click();
    }
  }

  /**
   * Create a Contributors callout.
   * @param types the contributor types to include (defaults to all three).
   * @param defaultType default type shown first (only applied when >1 type).
   * @param defaultView default display when a locatable type is present.
   */
  async createContributorsCallout(
    displayName: string,
    options?: {
      types?: ContributorType[];
      defaultType?: ContributorType;
      defaultView?: 'List' | 'Map';
    }
  ) {
    const types = options?.types ?? ALL_CONTRIBUTOR_TYPES;

    await this.openCreateForm();
    await this.selectContributorsFraming();
    await this.titleInput.fill(displayName);

    for (const t of ALL_CONTRIBUTOR_TYPES) {
      await this.setTypeSelected(t, types.includes(t));
    }

    if (options?.defaultType && types.length > 1) {
      await this.defaultTypeRadio(options.defaultType).click();
    }
    if (options?.defaultView) {
      await this.defaultViewRadio(options.defaultView).click();
    }

    // Every toggle/radio interaction above is already awaited, and the
    // post-click heading assertion below auto-retries — no fixed sleep needed.
    await this.postButton.click();

    // The rendered collection carries the callout title as a heading.
    await expect(
      this.page.getByRole('heading', { name: displayName }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  // ------------------------------------------------------- rendered collection

  /**
   * The callout card for a given title — the innermost element containing BOTH
   * the callout's title heading and a `region "Contributors"`. Scoping to this
   * card (instead of a page-wide `region "Contributors"`) keeps every assertion
   * unambiguous even when the space **also** carries an auto-provisioned default
   * Contributors callout (migrated envs — dev/CI), where more than one
   * `region "Contributors"` is present on the page. See spec 009 / FR-011.
   */
  calloutCard(title: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: title, exact: true }) })
      .filter({
        has: this.page.getByRole('region', { name: 'Contributors', exact: true }),
      })
      .last();
  }

  /**
   * A set of locators/actions for one rendered contributor collection, scoped to
   * the callout with the given title.
   */
  collection(title: string) {
    const card = this.calloutCard(title);
    const region = card.getByRole('region', { name: 'Contributors', exact: true });
    return {
      card,
      region,
      /** Segmented type-switch tab (name carries the count, e.g. "People 3"). */
      typeSwitchTab: (type: ContributorType): Locator =>
        // Require the trailing count digit so this never collides with the
        // type-toggle buttons / default-type radios (or the All/Lead/Member
        // role-filter tabs).
        card.getByRole('tab', { name: new RegExp(`^${type}\\s*\\d`) }),
      searchInput: (): Locator =>
        region.getByRole('textbox', { name: 'Search by name…' }),
      viewToggle: (view: 'List' | 'Map'): Locator =>
        region.getByRole('button', { name: view, exact: true }),
      // Both the wrapping `<section aria-label="Map">` and the MapLibre canvas
      // expose the "Map" name — scope to the first match within the card.
      mapRegion: (): Locator =>
        card.getByRole('region', { name: 'Map', exact: true }).first(),
      emptyState: (): Locator => region.getByText('No contributors to show.'),
      emptySearchState: (): Locator =>
        region.getByText('No contributors match your search.'),
      contributorCard: (name: string): Locator =>
        region.getByRole('link', { name }),
      switchType: async (type: ContributorType) => {
        const tab = card.getByRole('tab', {
          name: new RegExp(`^${type}\\s*\\d`),
        });
        await tab.click();
        // Wait for the tab to actually become active rather than a fixed sleep.
        await expect(tab).toHaveAttribute('aria-selected', 'true');
      },
      search: async (term: string) => {
        const input = region.getByRole('textbox', { name: 'Search by name…' });
        await input.fill(term);
        // Confirm the value landed; the debounced filter settling is covered by
        // each caller's auto-retrying visibility assertion.
        await expect(input).toHaveValue(term);
      },
    };
  }

  // ------------------------------------------------------------- edit / settings

  /**
   * Open a callout's detail dialog via its "Open {title}" link and click a
   * context-menu item. The callout renders inline; its "Open" link opens a
   * role=dialog carrying the single "Settings" (3-dots) button.
   */
  private async openCalloutMenuItem(displayName: string, item: string | RegExp) {
    // Ensure the feed has rendered the callout before reaching for its link.
    await expect(
      this.page.getByRole('heading', { name: displayName }).first()
    ).toBeVisible({ timeout: 15000 });
    await this.page
      .getByRole('link', { name: `Open ${displayName}` })
      .click({ timeout: 10000 });
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'settings' }).click();
    await this.page.getByRole('menuitem', { name: item }).click();
  }

  /** Open the callout context (3-dots) menu, then Edit. */
  async openEdit(displayName: string) {
    await this.openCalloutMenuItem(displayName, /edit/i);
    await expect(this.framingContributorsOption).toBeVisible({ timeout: 10000 });
  }

  /** Delete a Contributors callout via the CRD two-step confirmation flow. */
  async deleteContributorsCallout(displayName: string) {
    await this.openCalloutMenuItem(displayName, 'Delete');
    const confirm = this.page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(
      this.page.getByRole('heading', { name: displayName })
    ).toHaveCount(0, { timeout: 10000 });
  }
}
