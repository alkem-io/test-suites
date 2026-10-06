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
 *
 * Feature 077 (richer contributor cards) adds `contributorCardsIn(region)`
 * below: the card grid and the per-card rows, usable on any surface that
 * renders the collection (feed, detail dialog, the map's "No location data"
 * list). Locators follow the accessibility contract in
 * `agents-hq/specs/077-richer-contributor-cards/contracts/crd-contributor-card.md`
 * §5 — role and accessible name wherever the markup exposes one. The location
 * row and the bottom line have no role of their own; they are matched by
 * their text (the §6 strings) or, for the location row's absence, by its
 * decorative MapPin icon.
 */
export type ContributorType =
  | 'People'
  | 'Organizations'
  | 'Virtual Contributors';

/** The full set of contributor types, in render order. */
const ALL_CONTRIBUTOR_TYPES: ContributorType[] = [
  'People',
  'Organizations',
  'Virtual Contributors',
];

/** Escape a string for safe interpolation into a `RegExp` source. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The "+N" overflow chip of a tag row (`CollapsibleTagList`, `tags.moreAria`). */
const MORE_CHIP_NAME = /^Show (\d+) more$/;

/** Text that must never reach a card (FR-034). */
export const BAD_CARD_TEXT = /\bundefined\b|\bnull\b|Invalid Date|\bNaN\b/i;

/**
 * Feature 077 card locators for one rendered contributor collection — any
 * `region "Contributors"` (feed, detail dialog). Works in List view and on the
 * map's "No location data" list, which render the same card.
 */
export function contributorCardsIn(region: Locator) {
  const page = region.page();
  // The card grid is the region's first list; each card's tag row is a nested
  // list that comes after it in document order.
  const grid = region.getByRole('list').first();
  const items = grid.locator(':scope > li');
  const cardFor = (name: string): Locator =>
    items.filter({ has: page.getByRole('link', { name, exact: true }) });
  const moreChipOf = (name: string): Locator =>
    cardFor(name).getByRole('button', { name: MORE_CHIP_NAME });
  return {
    /** Every card (top-level grid item) currently rendered. */
    cardItems: items,
    cardFor,
    /** Tagline or the user fallback — the card's only paragraph (§4.2). */
    taglineOf: (name: string): Locator => cardFor(name).getByRole('paragraph'),
    /** The tag row (a list; the hidden measuring mirror is aria-hidden). */
    tagListOf: (name: string): Locator => cardFor(name).getByRole('list'),
    /** The visible tag pills, excluding the "+N" chip. */
    tagPillsOf: (name: string): Locator =>
      cardFor(name)
        .getByRole('list')
        .getByRole('listitem')
        .filter({ hasNot: page.getByRole('button', { name: MORE_CHIP_NAME }) }),
    moreChipOf,
    /** N on the "+N" chip, or 0 when every tag fits. */
    hiddenTagCount: async (name: string): Promise<number> => {
      const chip = moreChipOf(name);
      if ((await chip.count()) === 0) return 0;
      const label = (await chip.getAttribute('aria-label')) ?? '';
      return Number(MORE_CHIP_NAME.exec(label)?.[1] ?? NaN);
    },
    /** The location row ("City, CC"); it has no role, only a decorative MapPin. */
    locationOf: (name: string): Locator =>
      cardFor(name).locator('svg.lucide-map-pin').locator('xpath=..'),
    /** The bottom line: "Joined this space …" or "N associate(s) in this organization". */
    bottomLineOf: (name: string): Locator =>
      cardFor(name).getByText(
        /^(Joined this space .+|\d+ associates? in this organization)$/
      ),
    actionsButton: (name: string): Locator =>
      region.getByRole('button', {
        name: new RegExp(`^Actions for ${escapeForRegExp(name)}`),
      }),
    menuItem: (label: string): Locator =>
      page.getByRole('menuitem', { name: label }),
    websiteLink: (name: string): Locator =>
      region.getByRole('link', {
        name: new RegExp(`^Visit the website of ${escapeForRegExp(name)}`),
      }),
  };
}

export type ContributorCards = ReturnType<typeof contributorCardsIn>;

/**
 * The rows and controls one card shows, independent of how many tag pills fit
 * the card's width (US1-AS8 / FR-015 parity across surfaces).
 */
export async function cardRowSignature(cards: ContributorCards, name: string) {
  return {
    tagline: (await cards.taglineOf(name).allInnerTexts()).join(''),
    firstTag: (await cards.tagPillsOf(name).allInnerTexts())[0] ?? null,
    totalTags:
      (await cards.tagPillsOf(name).count()) +
      (await cards.hiddenTagCount(name)),
    location: (await cards.locationOf(name).allInnerTexts()).join(''),
    bottomLine: (await cards.bottomLineOf(name).allInnerTexts()).join(''),
    actions: await cards.actionsButton(name).count(),
    website: await cards.websiteLink(name).count(),
  };
}

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
    await expect(this.framingContributorsOption).toBeVisible({
      timeout: 10000,
    });
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
      .filter({
        has: this.page.getByRole('heading', { name: title, exact: true }),
      })
      .filter({
        has: this.page.getByRole('region', {
          name: 'Contributors',
          exact: true,
        }),
      })
      .last();
  }

  /**
   * A set of locators/actions for one rendered contributor collection, scoped to
   * the callout with the given title.
   */
  collection(title: string) {
    const card = this.calloutCard(title);
    const region = card.getByRole('region', {
      name: 'Contributors',
      exact: true,
    });
    const cards = contributorCardsIn(region);
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
      // Exact: an organisation card's website control also carries the
      // organisation's name in its accessible name, so a substring match is
      // ambiguous. FR-016 / contract §5: exactly one profile link per card.
      contributorCard: (name: string): Locator =>
        region.getByRole('link', { name, exact: true }),
      ...cards,
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
  private async openCalloutMenuItem(
    displayName: string,
    item: string | RegExp
  ) {
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
    await expect(this.framingContributorsOption).toBeVisible({
      timeout: 10000,
    });
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
