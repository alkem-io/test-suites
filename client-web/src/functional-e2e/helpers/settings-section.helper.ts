import { expect, type Locator, type Page } from '@playwright/test';

/**
 * client-web#10437: every settings tab is a stack of CRD `SettingsSection`
 * cards (`src/crd/components/common/SettingsSection.tsx`). A collapsible one
 * renders `<h3><CollapsibleTrigger>…</CollapsibleTrigger></h3>`, the trigger
 * carrying `aria-expanded` and wrapping the title, any badge and the
 * description — so the h3's accessible name is "Title Description…". Pass a
 * string for an exact title (sections without a description) or a RegExp
 * (e.g. `/^User Notifications/`) when the description or the locale varies.
 */
export type SettingsSectionOptions = {
  /** Narrow the lookup, e.g. to the section's anchor (`#classifications`). */
  scope?: Page | Locator;
  /** Timeout for the trigger to appear and to read expanded. */
  timeout?: number;
};

/** The section's collapse trigger: the button inside its level-3 heading. */
export function settingsSectionTrigger(
  page: Page,
  name: string | RegExp,
  { scope = page }: SettingsSectionOptions = {}
): Locator {
  const heading =
    typeof name === 'string'
      ? scope.getByRole('heading', { level: 3, name, exact: true })
      : scope.getByRole('heading', { level: 3, name });
  return heading.getByRole('button');
}

/**
 * Expands a settings section and proves it is expanded. Clicks only while it
 * reads collapsed, so it is a no-op on an open (or deep-linked) section rather
 * than a toggle that closes it. Returns the trigger.
 */
export async function openSettingsSection(
  page: Page,
  name: string | RegExp,
  options: SettingsSectionOptions = {}
): Promise<Locator> {
  const trigger = settingsSectionTrigger(page, name, options);
  await expect(trigger).toBeVisible({ timeout: options.timeout });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute('aria-expanded', 'true', {
    timeout: options.timeout,
  });
  return trigger;
}
