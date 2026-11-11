import { expect, type Locator, type Page } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  readOrganization,
  readSpaceAbout,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
} from '../helpers/space-access.helper';
import { openSettingsSection } from '../helpers/settings-section.helper';
import {
  deleteDisposableUser,
  deleteOrganizationIfPresent,
  organizationIdByNameId,
  orgSettingsUrl,
  registerDisposableUser,
  runCleanup,
  unsavedChangesBar,
  userSettingsUrl,
  type DisposableUser,
} from '../contributors-crud/contributors-crud.helpers';

/**
 * Shared set-up, locators and read-back wrappers for the profile-editing
 * walks (W2 journey 7, docs/qa/server-rebuild/plan.md § W2): a Space's About,
 * the signed-in user's own profile, and an organisation that user creates.
 * Every edit is checked on the page after a reload and through one read-back
 * by a named `@alkemio/tests-lib` function, and a field others can see also
 * through what a DIFFERENT viewer is shown.
 */

export {
  baseUrl,
  deleteDisposableUser,
  deleteOrganizationIfPresent,
  expectMutationAnswered,
  openPersonaPage,
  openSettingsSection,
  organizationIdByNameId,
  orgSettingsUrl,
  registerDisposableUser,
  runCleanup,
  unsavedChangesBar,
  type DisposableUser,
};
export {
  aboutDialog,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
export { usersInOrgRole } from '../contributors-crud/contributors-crud.helpers';
export {
  cityCombobox,
  countryCombobox,
  pickCountry,
} from '../user-profile/user-profile-settings.page';

/** A fresh run id. Each spec takes one at module scope, so every name and nameID of a file run carries it. */
export const uid = (): string => UniqueIDGenerator.getID();

export const sorted = (xs: ReadonlyArray<string>): string[] => [...xs].sort();

type ReservedTagset = 'skills' | 'keywords' | 'capabilities';

/**
 * The tags of a reserved tagset, sorted. `Tagset.name` on the wire is the
 * server's STORED lowercase string (`skills`), while the generated
 * `TagsetReservedName` enum values are uppercase (`SKILLS`), so comparing
 * against the enum is always false. Match case-insensitively, as client-web's
 * `findTagset` does, and throw when the tagset is absent so a missing tagset
 * can never read as an empty one.
 */
export const tagsOf = (
  tagsets: ReadonlyArray<{ name: string; tags: string[] }> | undefined,
  name: ReservedTagset
): string[] => {
  const found = (tagsets ?? []).find(t => t.name.toLowerCase() === name);
  if (!found) {
    throw new Error(
      `no ${name} tagset: ${(tagsets ?? []).map(t => t.name).join(', ') || '(none)'}`
    );
  }
  return sorted(found.tags);
};

/**
 * Saves the tab's pending edits through the bar. The bar's counter is
 * asserted first (exact copy): it proves the client registered every edit,
 * so a field missing later is the server's, not the form's. The mutation is
 * awaited so a refusal fails at the click with the server's message.
 * `mutationField` is `updateSpace` (About tab: it never matches
 * `updateSpaceSettings(`), `updateUser` or `updateOrganization`.
 *
 * A "Changes saved" toast sits over the bar's Save button, and a pointer
 * resting on it pauses its dismissal. So a save first waits for an EARLIER
 * save's toast to leave (a no-op on the first save of a page; without it this
 * save's toast check would be vacuous), and parks the pointer after its own.
 * The last save of a walk therefore never waits out a toast it does not need.
 */
export const saveWith = async (
  page: Page,
  mutationField: 'updateSpace' | 'updateUser' | 'updateOrganization',
  expectedCountText: string
): Promise<void> => {
  const bar = unsavedChangesBar(page);
  const toast = page.getByText('Changes saved', { exact: true });
  await expect(toast).toBeHidden({ timeout: 15_000 });
  await expect(bar.getByText(expectedCountText, { exact: true })).toBeVisible();
  const answered = expectMutationAnswered(page, mutationField);
  await bar.getByRole('button', { name: 'Save changes', exact: true }).click();
  await answered();
  await expect(toast).toBeVisible();
  await expect(bar).toBeHidden();
  await page.mouse.move(0, 0);
};

// ------------------------------------------------------------- tags input

/** The tag input, named by its placeholder (kept as the aria-label once chips exist). */
export const tagsInput = (
  scope: Page | Locator,
  placeholder: string
): Locator => scope.getByRole('textbox', { name: placeholder, exact: true });

/** Types each tag and presses Enter. */
export const addTags = async (input: Locator, tags: string[]) => {
  for (const tag of tags) {
    await input.fill(tag);
    await input.press('Enter');
    await expect(input).toHaveValue('');
  }
};

/**
 * A chip's two buttons (edit and remove, both named after the tag: a known
 * accessibility finding). Presence is `toHaveCount(2)`, absence `0`. Never
 * click the second one; remove with `removeLastTag`.
 */
export const chipButtons = (scope: Page | Locator, tag: string): Locator =>
  scope.getByRole('button', { name: tag, exact: true });

/** Backspace on the empty input removes the LAST chip (`tags-input.tsx` › handleKeyDown). */
export const removeLastTag = async (input: Locator, removed: string) => {
  const scope = input.page();
  await expect(chipButtons(scope, removed)).toHaveCount(2);
  await input.focus();
  await expect(input).toHaveValue('');
  await input.press('Backspace');
  await expect(chipButtons(scope, removed)).toHaveCount(0);
};

// ------------------------------------------------------------ Space About

/**
 * A PRIVATE, application-only Space with one admin. Private is deliberate: a
 * non-member is routed to `/<nameID>/about` and shown the About dialog, so no
 * "About this Space" click is needed. Applications, not Open: no Join button
 * to press by accident.
 */
export const seedAboutSpace = async (
  id: string
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: `w2-about-${id}`,
    space: {
      collaboration: {
        addTutorialCallouts: false,
        addPostCollectionCallout: false,
        addWhiteboardCallout: false,
      },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
    },
  });
  expect(scenario.scenarioSetupSucceeded, 'about scenario set up').toBe(true);
  return scenario;
};

/** The Space's About as the server holds it (platform admin read). */
export const serverAbout = async (spaceId: string) =>
  must(await readSpaceAbout(spaceId), `readSpaceAbout(${spaceId})`).lookup
    .space!.about;

export const spaceNameField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Space Name', exact: true });
export const spaceTaglineField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Tagline', exact: true });
/** The What / Why editors are named by their placeholder; both sit in the collapsed Context card. */
export const whatEditor = (page: Page): Locator =>
  page.getByRole('textbox', { name: "What's this space about…", exact: true });
export const whyEditor = (page: Page): Locator =>
  page.getByRole('textbox', {
    name: 'Why does this space exist…',
    exact: true,
  });
export const spaceTagsInput = (page: Page): Locator =>
  tagsInput(page, 'Add a tag and press Enter');

export const openAboutTab = async (page: Page, nameId: string) => {
  await page.goto(`${baseUrl}/${nameId}/settings/about`);
  await expect(spaceNameField(page)).toBeVisible();
};

// ----------------------------------------------------------- Organisation

export const orgKeywordsInput = (scope: Page | Locator): Locator =>
  tagsInput(scope, 'e.g. climate, governance, open source');
export const orgCapabilitiesInput = (scope: Page | Locator): Locator =>
  tagsInput(scope, 'e.g. research, funding, training');

export const openOrganisationsTab = async (page: Page, nameId: string) => {
  await page.goto(userSettingsUrl(nameId, 'organizations'));
  await expect(
    page.getByRole('tab', { name: 'Organisations', selected: true })
  ).toBeVisible();
};

/** The "Create Organisation" settings-section trigger (collapsed by default). */
export const createSectionTrigger = (page: Page): Locator =>
  page.getByRole('heading', {
    level: 3,
    name: 'Create Organisation',
    exact: true,
  });

export const newOrganisationDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'New organisation', exact: true });

/** An organisation as the server holds it (platform admin read); its profile and role set always exist. */
export const serverOrganization = async (organizationId: string) => {
  const org = must(
    await readOrganization(organizationId),
    `readOrganization(${organizationId})`
  ).organization;
  return { ...org, profile: org.profile!, roleSet: org.roleSet! };
};
