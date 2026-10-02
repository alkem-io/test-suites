import { Locator, Page } from '@playwright/test';

/**
 * CRD renders "About this Space" twice on a space page — as a tooltip-trigger
 * button in the "Space navigation tabs" nav and again inside the desktop
 * sidebar (#crd-space-sidebar-desktop) — so a bare getByRole lookup is a
 * strict-mode violation. Both open the same About dialog; scope to the
 * navigation-tabs instance.
 */
export const aboutThisSpaceButton = (page: Page): Locator =>
  page
    .getByRole('navigation', { name: 'Space navigation tabs' })
    .getByRole('button', { name: 'About this Space' });
