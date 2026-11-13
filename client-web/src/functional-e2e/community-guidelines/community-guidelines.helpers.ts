import { expect, type Locator, type Page } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  readSpaceCommunityGuidelines,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import { baseUrl } from '../helpers/space-access.helper';
import { openSettingsSection } from '../helpers/settings-section.helper';

/**
 * Shared steps for the community-guidelines walks (W2 extras,
 * test-suites#722, catalogue SP-10). The guidelines are a profile on the
 * Space's About (title = displayName, body = markdown description, related
 * links = references). The admin edits them in Space Settings → Community →
 * "Community Guidelines" → "Edit Guidelines"; members read them in the
 * Community tab's sidebar block.
 */

export {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  spaceSidebar,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
export { openTab } from '../sidebar-widgets/sidebar-widgets.helpers';

/**
 * A PRIVATE, application-only Space with `space.admin` (admin, member) and
 * `space.member`. Private, so the member's view is a member's, not the
 * public's.
 */
export const seedGuidelinesSpace = async (
  uid: string
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: `w2-cg-${uid}`,
    space: {
      collaboration: {
        addTutorialCallouts: false,
        addPostCollectionCallout: false,
        addWhiteboardCallout: false,
      },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
    },
  });
  expect(scenario.scenarioSetupSucceeded, 'guidelines scenario set up').toBe(
    true
  );
  return scenario;
};

export type StoredGuidelines = {
  id: string;
  title: string;
  body: string;
  references: { id: string; name: string; uri: string }[];
};

/** The guidelines as `actor` reads them from the server. */
export const serverGuidelines = async (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<StoredGuidelines> => {
  const guidelines = must(
    await readSpaceCommunityGuidelines(spaceId, actor),
    `readSpaceCommunityGuidelines(${spaceId})`
  ).lookup.space?.about.guidelines;
  if (!guidelines) throw new Error(`space ${spaceId} has no guidelines`);
  return {
    id: guidelines.id,
    title: guidelines.profile.displayName,
    body: (guidelines.profile.description ?? '').trim(),
    references: (guidelines.profile.references ?? []).map(
      ({ id, name, uri }) => ({ id, name, uri })
    ),
  };
};

/** Space Settings → Community, with the "Community Guidelines" section open. */
export const openGuidelinesSettings = async (page: Page, nameId: string) => {
  await page.goto(`${baseUrl}/${nameId}/settings/community`);
  await openSettingsSection(page, 'Community Guidelines');
};

/** The edit dialog ("Edit Guidelines" opens it). */
export const editorDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Community Guidelines', exact: true });

export const openEditor = async (page: Page): Promise<Locator> => {
  await page
    .getByRole('button', { name: 'Edit Guidelines', exact: true })
    .click();
  const dialog = editorDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * The guidelines' own Title field. A reference row also has a textbox named
 * "Title", so this is the one with the guidelines' placeholder.
 */
export const titleField = (dialog: Locator): Locator =>
  dialog.getByPlaceholder('Name your community guidelines', { exact: true });

/** The markdown body, named by its placeholder. */
export const bodyEditor = (dialog: Locator): Locator =>
  dialog.getByRole('textbox', {
    name: "Describe your space's code of conduct…",
    exact: true,
  });

/** The reference row inputs, by their placeholders (the row's Title shares the guidelines' accessible name). */
export const referenceTitleFields = (dialog: Locator): Locator =>
  dialog.getByPlaceholder('Reference title', { exact: true });
export const referenceUrlFields = (dialog: Locator): Locator =>
  dialog.getByRole('textbox', { name: 'URL', exact: true });

/**
 * The inline preview of the stored guidelines on the settings page: its
 * title is an h4, its links are anchors.
 */
export const previewTitle = (page: Page, title: string): Locator =>
  page.getByRole('heading', { level: 4, name: title, exact: true });
