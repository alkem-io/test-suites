import { Page, expect, Locator } from '@playwright/test';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "December 2026" — the popover month caption format. */
export const monthYear = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Ordinal-tolerant matcher for the DateField trigger / badge text, which date-fns
 * renders with 'PPP' as e.g. "December 3rd, 2026". We do not reproduce the ordinal
 * suffix (st/nd/rd/th) — matching it loosely keeps the test resilient while still
 * pinning month, day and year, which is what a ±1-day drift would change.
 */
export const dateLabelRe = (d: Date): RegExp =>
  new RegExp(`${MONTHS[d.getMonth()]} ${d.getDate()}(st|nd|rd|th)?, ${d.getFullYear()}`);

/**
 * Page object for the CRD calendar event dialog (create / detail / edit / delete).
 * Drives the real UI so the client write path — `toWholeDayWire`, the whole-day
 * toggle side-effects, and the falsy-guarded duration update — is exercised end to
 * end, not bypassed by API seeding.
 *
 * Selectors verified live against the running app (react-day-picker v8):
 *   - date pickers are popover calendars: trigger button aria-label = field label,
 *     trigger TEXT = date-fns 'PPP' of the current value ("December 3rd, 2026");
 *   - the popover month caption is `div[role="presentation"]` = "December 2026";
 *   - day cells are `button[name="day"]`; adjacent-month cells carry `.day-outside`.
 */
export class CalendarEventFormPage {
  constructor(
    private readonly page: Page,
    private readonly baseUrl: string
  ) {}

  private get popover(): Locator {
    return this.page.locator('[data-radix-popper-content-wrapper]').first();
  }

  async gotoCalendar(spaceNameId: string): Promise<void> {
    await this.page.goto(`${this.baseUrl}/${spaceNameId}/calendar`);
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateForm(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add event' }).first().click();
    await expect(this.page.getByLabel('Whole day')).toBeVisible({ timeout: 10_000 });
  }

  async setTitle(title: string): Promise<void> {
    await this.page.getByLabel('Title').fill(title);
  }

  async setType(label: string): Promise<void> {
    await this.page.getByLabel('Type').click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  async setWholeDay(on: boolean): Promise<void> {
    const toggle = this.page.getByLabel('Whole day');
    if ((await toggle.getAttribute('aria-checked')) !== String(on)) {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-checked', String(on));
  }

  /**
   * Pick `target` in the named date field by navigating the popover calendar.
   * Reads the month caption and steps prev/next until it matches, then clicks the
   * in-month day cell (never an adjacent-month `.day-outside` cell).
   */
  async pickDate(fieldLabel: 'Start date' | 'End date', target: Date): Promise<void> {
    // If the field already shows the target date, do NOT click it: react-day-picker
    // single-mode toggles the selected day OFF when it is clicked again, which would
    // clear the field. This also handles the create form auto-coupling End to Start
    // (so picking a single-day event's End == Start is a no-op, not a deselect).
    if (dateLabelRe(target).test(await this.readDate(fieldLabel))) return;

    // Ensure no previous date popover is still mid-close: Radix keeps the closing
    // popper wrapper in the DOM for an animation frame, and `.first()` would then
    // resolve to that stale calendar (wrong month) instead of the one we just
    // opened. Wait for zero wrappers before opening the next picker.
    await expect(this.page.locator('[data-radix-popper-content-wrapper]')).toHaveCount(0, {
      timeout: 5000,
    });
    await this.page.getByRole('button', { name: fieldLabel }).click();
    const pop = this.popover;
    await expect(pop).toBeVisible({ timeout: 5000 });

    const wanted = monthYear(target);
    const wantIdx = target.getFullYear() * 12 + target.getMonth();
    const caption = pop.locator('div[role="presentation"]').first();
    for (let i = 0; i < 36; i++) {
      const shown = (await caption.textContent())?.trim() ?? '';
      if (shown === wanted) break;
      const [name, yr] = shown.split(' ');
      const shownIdx = Number(yr) * 12 + MONTHS.indexOf(name);
      const dir = wantIdx > shownIdx ? 'Go to next month' : 'Go to previous month';
      await pop.getByRole('button', { name: dir }).click();
      await this.page.waitForTimeout(120);
    }
    await expect(caption).toHaveText(wanted);

    const dayNum = String(target.getDate());
    await pop
      .locator('button[name="day"]:not(.day-outside)', { hasText: new RegExp(`^${dayNum}$`) })
      .first()
      .click();
    // Popover closes on select; assert the trigger now reflects the chosen date.
    await expect(this.page.getByRole('button', { name: fieldLabel })).toContainText(
      dateLabelRe(target)
    );
  }

  /** The trigger's rendered date text, e.g. "December 3rd, 2026" — the round-trip source of truth. */
  async readDate(fieldLabel: 'Start date' | 'End date'): Promise<string> {
    return (await this.page.getByRole('button', { name: fieldLabel }).textContent())?.trim() ?? '';
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  /** After save the app lands on the event DETAIL view; reopen the edit form from there. */
  async openEditFromDetail(): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(this.page.getByLabel('Whole day')).toBeVisible({ timeout: 10_000 });
  }

  async deleteFromEdit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Delete event', exact: true }).click();
    // AlertDialog confirm.
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  fieldPresent(fieldLabel: string): Locator {
    return this.page.getByLabel(fieldLabel);
  }
}
