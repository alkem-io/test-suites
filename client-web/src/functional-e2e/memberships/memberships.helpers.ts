import { expect, type Locator, type Page } from '@playwright/test';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  baseUrl,
  expectMutationAnswered,
} from '../helpers/space-access.helper';

/**
 * Shared by the memberships/* specs (plans/memberships-test-plan.md).
 *
 * Every display name a spec looks up on screen must be unique to the run: the
 * scenario factory gives subspaces the config's display name verbatim, so a
 * literal ("Subspace for Membership Tests") also matches every subspace an
 * earlier run leaked. The L0's config name is currently replaced by the
 * factory's own unique `l0-<scenario>-<id>`; it is made unique here too so the
 * specs stay correct if the factory ever honours it.
 */
export const uniqueName = (label: string): string =>
  `${label} ${UniqueIDGenerator.getID()}`;

export const membershipSettingsUrl = (userNameId: string): string =>
  `${baseUrl}/user/${userNameId}/settings/membership`;

/**
 * Rendered only after the tab's three membership queries have resolved (the
 * view shows skeletons until then): the "Showing N of M memberships" summary
 * when the user has memberships, the empty caption when they have none. An
 * absence asserted after this cannot pass on a page that has not rendered.
 */
export const membershipListRendered = (page: Page): Locator =>
  page
    .getByText(/^Showing \d+ of \d+ memberships$/)
    .or(
      page.getByText("You're not a member of any Spaces yet.", { exact: true })
    );

/** Opens a user's Membership settings tab and waits until the list has rendered. */
export const openMembershipSettings = async (
  page: Page,
  userNameId: string
): Promise<void> => {
  await page.goto(membershipSettingsUrl(userNameId));
  await expect(
    page.getByRole('heading', { name: 'My Memberships' })
  ).toBeVisible();
  await expect(membershipListRendered(page)).toBeVisible();
};

/** The "My Memberships" row of one space, by its run-unique display name. */
export const membershipRow = (page: Page, spaceName: string): Locator =>
  page.getByRole('listitem').filter({ hasText: spaceName });

/**
 * Leaves one membership through its row's "Leave <name>" button and the
 * destructive confirmation, and waits for the browser's own
 * `removeRoleFromUser` to have answered without errors.
 */
export const leaveMembership = async (
  page: Page,
  spaceName: string
): Promise<void> => {
  const row = membershipRow(page, spaceName);
  await expect(row).toHaveCount(1);
  await row
    .getByRole('button', { name: `Leave ${spaceName}`, exact: true })
    .click();

  const dialog = page.getByRole('alertdialog', {
    name: 'Leave this membership?',
  });
  await expect(dialog).toBeVisible();
  const answered = expectMutationAnswered(page, 'removeRoleFromUser');
  await dialog.getByRole('button', { name: 'Leave', exact: true }).click();
  await answered();
  await expect(dialog).toBeHidden();
};
