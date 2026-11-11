// spec: client-web/src/functional-e2e/profile-editing/profile-editing-test-plan.md
// W2 journey 7 (docs/qa/server-rebuild/plan.md § W2), an organisation created
// by a non-admin user: who is offered "Create Organisation" (H1-1), the create
// dialog (H1-2), editing what the creator then owns (H2-1), and two fields
// the dialog loses today: the description (H1-2b, client defect R-7) and a
// reference (H1-3, server defect R-3), each skipped with its record.
//
// The creator is a disposable user, granted Feature Organization Creator over
// the API (the seeded `feature.orgcreator` persona would gain and lose an
// Admin role every run). The file is SERIAL: H1-1 (grant) → H1-2 (create) →
// H2-1 (edit the created organisation). H1-2b and H1-3 need only H1-1, and
// each creates its own organisation after H1-2 has counted. Organisations
// the walk creates in the browser are known only by the nameID it typed, so
// each is recorded before it is submitted and deleted by that nameID, before
// the user.

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  assignPlatformRole,
  getUserToken,
  readMyPlatformRoles,
  RoleName,
  TestUserManager,
  updateOrganizationData,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import { grantCookieConsent } from '../helpers/cookies.helper';
import {
  addTags,
  baseUrl,
  cityCombobox,
  countryCombobox,
  createSectionTrigger,
  deleteDisposableUser,
  deleteOrganizationIfPresent,
  expectMutationAnswered,
  newOrganisationDialog,
  openOrganisationsTab,
  openPersonaPage,
  openSettingsSection,
  orgCapabilitiesInput,
  orgKeywordsInput,
  organizationIdByNameId,
  orgSettingsUrl,
  pickCountry,
  registerDisposableUser,
  chipButtons,
  runCleanup,
  saveWith,
  serverOrganization,
  sorted,
  tagsOf,
  uid,
  usersInOrgRole,
  type DisposableUser,
  type PersonaPage,
} from './profile-editing.helpers';

const RUN = uid();

let creator: DisposableUser | undefined;
let creatorPage: PersonaPage | undefined;
/** Every organisation the walk typed a nameID for, deleted in afterAll. */
const createdNameIds: string[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  // Recorded at once, so a half-failed beforeAll is still cleaned.
  creator = await registerDisposableUser(`orgcreator ${RUN}`);
  creatorPage = await openPersonaPage(browser, creator.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
// Organisations go before the user; the platform role disappears with the user.
test.afterAll(async () => {
  await runCleanup([
    ['close creator', () => creatorPage?.close() ?? Promise.resolve()],
    ...createdNameIds.map((nameId): [string, () => Promise<unknown>] => [
      `delete org ${nameId}`,
      () => deleteOrganizationIfPresent(nameId),
    ]),
    ['delete creator', () => deleteDisposableUser(creator)],
  ]);
});

const myPlatformRoles = async (): Promise<string[]> =>
  must(
    await readMyPlatformRoles({
      bearerToken: await getUserToken(creator!.email),
    }),
    'readMyPlatformRoles'
  ).platform.roleSet.myRoles as string[];

const EMPTY_STATE = "You're not associated with any organisations yet.";

/** Expands "Create Organisation", clicks "New Organisation" and returns the dialog. */
const openCreateDialog = async (page: Page) => {
  await openSettingsSection(page, 'Create Organisation');
  await page
    .getByRole('button', { name: 'New Organisation', exact: true })
    .click();
  const dialog = newOrganisationDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * Opens the "New organisation" dialog and types the name ID and display name.
 * The name ID is recorded BEFORE submitting: the browser creates the
 * organisation, and only the name ID typed here identifies it for cleanup.
 */
const startCreate = async (page: Page, nameId: string, name: string) => {
  await openOrganisationsTab(page, creator!.nameId);
  const dialog = await openCreateDialog(page);
  createdNameIds.push(nameId);
  await dialog.getByRole('textbox', { name: 'Alias (name ID)' }).fill(nameId);
  await dialog.getByRole('textbox', { name: 'Display name' }).fill(name);
  return dialog;
};

/** Clicks Create, fails on a server refusal, and waits for the new organisation's page. */
const submitCreate = async (page: Page, dialog: Locator, nameId: string) => {
  const created = expectMutationAnswered(page, 'createOrganization');
  await dialog
    .getByRole('button', { name: 'Create organisation', exact: true })
    .click();
  await created();
  await page.waitForURL(`**/organization/${nameId}`);
};

const nameIdOf = (suffix: string) => `w2-${suffix}-${RUN}`;
const NAME_ID_1 = nameIdOf('org');
const NAME_ID_2 = nameIdOf('org2');
const NAME_ID_3 = nameIdOf('org3');
const NAME_1 = `W2 Org ${RUN}`;
const NAME_2 = `W2 Org Two ${RUN}`;
const NAME_3 = `W2 Org Three ${RUN}`;

test.describe('W2 journey 7 — an organisation created from User Settings', () => {
  test('H1-1 only a user holding Feature Organization Creator is offered "Create Organisation"', async () => {
    const page = creatorPage!.page;

    // Precondition: a plain registered user holds no creation role.
    expect(await myPlatformRoles()).toEqual(['REGISTERED']);

    await openOrganisationsTab(page, creator!.nameId);
    // Positive control: the tab rendered its server answer (the empty state)
    // in the same render in which the section is absent.
    await expect(page.getByText(EMPTY_STATE, { exact: true })).toBeVisible();
    await expect(createSectionTrigger(page)).toHaveCount(0);

    must(
      await assignPlatformRole(
        creator!.id,
        RoleName.FeatureOrganizationCreator
      ),
      'grant Feature Organization Creator'
    );
    expect(await myPlatformRoles()).toContain('FEATURE_ORGANIZATION_CREATOR');

    // The client reads platform privileges once per page load.
    await page.reload();
    await expect(page.getByText(EMPTY_STATE, { exact: true })).toBeVisible();
    await expect(createSectionTrigger(page)).toBeVisible();
    await openSettingsSection(page, 'Create Organisation');
    await expect(
      page.getByRole('button', { name: 'New Organisation', exact: true })
    ).toBeVisible();
  });

  test('H1-2 the user creates an organisation in the dialog; every field is stored and the creator administers it', async () => {
    const page = creatorPage!.page;
    const tagline = `Org tagline ${RUN}`;
    const website = `https://example.org/w2-${RUN}`;

    // No description is typed here: the dialog loses it today (R-7). That
    // check is H1-2b, skipped with the defect record; everything else runs.
    const dialog = await startCreate(page, NAME_ID_1, NAME_1);
    await dialog.getByRole('textbox', { name: 'Tagline' }).fill(tagline);
    await dialog.getByRole('textbox', { name: 'Website' }).fill(website);
    await submitCreate(page, dialog, NAME_ID_1);

    await expect(
      page.getByText('Organisation created.', { exact: true })
    ).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 1, name: NAME_1, exact: true })
    ).toBeVisible();
    // The positive admin signal (organization-crud 2.2 asserts it absent for visitors).
    await expect(
      page.getByRole('link', { name: 'Open organisation settings' })
    ).toBeVisible();

    const id = await organizationIdByNameId(NAME_ID_1);
    expect(id).not.toBeNull();
    const org = await serverOrganization(id!);
    expect([
      org.nameID,
      org.profile.displayName,
      org.profile.tagline,
      org.website,
    ]).toEqual([NAME_ID_1, NAME_1, tagline, website]);

    // The server makes the creator Associate AND Admin.
    for (const role of [RoleName.Admin, RoleName.Associate]) {
      expect(
        await usersInOrgRole(org.roleSet.id, role),
        `creator holds ${role}`
      ).toContain(creator!.id);
    }

    await openOrganisationsTab(page, creator!.nameId);
    await expect(
      page.getByText('Showing 1 of 1 organisations', { exact: true })
    ).toBeVisible();
    await expect(
      page
        .getByRole('main')
        .getByRole('list')
        .getByRole('listitem')
        .getByRole('link', { name: NAME_1, exact: true })
    ).toBeVisible();
  });

  test('H2-1 the creator edits description, location, keywords and capabilities; stored, reloaded, seen anonymously', async ({
    browser,
  }) => {
    const page = creatorPage!.page;
    const desc = `ORG DESC ${RUN}`;
    const desc2 = `ORG DESC EDITED ${RUN}`;
    const k1 = `okw-a-${RUN}`;
    const k2 = `okw-b-${RUN}`;
    const c1 = `ocap-a-${RUN}`;

    const id = await organizationIdByNameId(NAME_ID_1);
    expect(id, `H1-2 created ${NAME_ID_1}`).not.toBeNull();
    // H1-2 types no description (R-7), so give the organisation one through
    // the lib: "the old text is replaced" needs an old text.
    must(
      await updateOrganizationData({
        ID: id!,
        profileData: { description: desc },
      }),
      'seed description'
    );
    const before = await serverOrganization(id!);
    expect(before.profile.description?.trim()).toBe(desc);
    // The update-by-id path: both reserved tagsets exist and are empty.
    expect(tagsOf(before.profile.tagsets, 'keywords')).toEqual([]);
    expect(tagsOf(before.profile.tagsets, 'capabilities')).toEqual([]);

    await page.goto(orgSettingsUrl(NAME_ID_1, 'profile'));
    await openSettingsSection(page, 'About');
    const description = page.getByRole('textbox', {
      name: 'Formatting toolbar',
    });
    await expect(description).toContainText(desc);

    await description.fill(desc2);
    await cityCombobox(page).fill('Rotterdam');
    await cityCombobox(page).press('Escape');
    await pickCountry(page, 'Netherlands');
    await addTags(orgKeywordsInput(page), [k1, k2]);
    await addTags(orgCapabilitiesInput(page), [c1]);

    // description, city, country, keywords and capabilities.
    await saveWith(page, 'updateOrganization', '5 unsaved changes');

    await page.reload();
    await openSettingsSection(page, 'About');
    await expect(description).toContainText(desc2);
    await expect(cityCombobox(page)).toHaveValue('Rotterdam');
    await expect(countryCombobox(page)).toContainText('Netherlands');
    for (const tag of [k1, k2, c1]) {
      await expect(chipButtons(page, tag)).toHaveCount(2);
    }

    const after = await serverOrganization(id!);
    // The old text is replaced: exactly the new paragraph is stored.
    expect(after.profile.description?.trim()).toBe(desc2);
    expect(after.profile.description).toContain(desc2);
    expect(after.profile.description).not.toContain(desc);
    expect(after.profile.location).toEqual({
      city: 'Rotterdam',
      country: 'NL',
    });
    // Cross-wiring guard: keywords never land in capabilities, or the reverse.
    expect(tagsOf(after.profile.tagsets, 'keywords')).toEqual(sorted([k1, k2]));
    expect(tagsOf(after.profile.tagsets, 'capabilities')).toEqual([c1]);

    const anonymous = await browser.newContext({ locale: 'en-US' });
    try {
      await grantCookieConsent(anonymous);
      const visitor = await anonymous.newPage();
      await visitor.goto(`${baseUrl}/organization/${NAME_ID_1}`);
      await expect(
        visitor.getByRole('heading', { level: 1, name: NAME_1, exact: true })
      ).toBeVisible();
      await expect(visitor.getByRole('main').getByText(desc2)).toBeVisible();
      const chips = (heading: string) =>
        visitor
          .getByRole('listitem')
          .filter({
            has: visitor.getByRole('heading', {
              level: 3,
              name: heading,
              exact: true,
            }),
          })
          .getByRole('list')
          .getByRole('listitem');
      const order = (name: 'keywords' | 'capabilities') =>
        after.profile.tagsets!.find(t => t.name.toLowerCase() === name)!.tags;
      await expect(chips('Keywords')).toHaveText(order('keywords'));
      await expect(chips('Capabilities')).toHaveText(order('capabilities'));
    } finally {
      await anonymous.close();
    }
  });

  // R-7 (ruling: client defect). REPRODUCED on test-alkem.io (2026-11-09, first
  // run) and on the local stack (client-web 907103f5f) with the converter
  // chunks delayed: the dialog's MarkdownEditor hands its value to the form
  // only after `htmlToMarkdown()` resolves (`useMarkdownEditorState` ›
  // `onUpdate`), and the converter lazy-loads its unified/rehype/remark
  // pipeline on first use, so a Create clicked before then stores "". Every
  // other field of the dialog is H1-2, live. Skipped, never `test.fail`: drop
  // the skip when the client keeps the description. The defect is not filed
  // yet (the plan carries the record); add the issue number to the title then.
  test.skip("H1-2b a description typed in the create dialog is kept (reproduced client defect R-7, unfiled: the description is lost when Create is clicked before the editor's async markdown conversion resolves)", async () => {
    const page = creatorPage!.page;
    const desc = `ORG DESC CREATE ${RUN}`;

    const dialog = await startCreate(page, NAME_ID_3, NAME_3);
    await dialog
      .getByRole('textbox', { name: 'Formatting toolbar' })
      .fill(desc);
    await submitCreate(page, dialog, NAME_ID_3);

    const id = await organizationIdByNameId(NAME_ID_3);
    expect(id).not.toBeNull();
    expect((await serverOrganization(id!)).profile.description?.trim()).toBe(
      desc
    );
  });

  // R-3 (ruling: defect). REPRODUCED RED on the local stack (server 51eb90878):
  // `organization.service.ts` › `createOrganization` (lines 120-121) overwrites
  // `profileData.referencesData` with `getDefaultContributorProfileReferences()`,
  // so the reference typed into the dialog is discarded and the organisation
  // holds only the three empty default social links (linkedin, github, bsky).
  // Skipped, never `test.fail`: drop the skip when the server keeps the row, or
  // when the dialog stops offering References. The defect is not filed yet
  // (the plan carries the record); add the issue number to the title then.
  test.skip('H1-3 a reference entered in the create dialog is kept (product defect, unfiled: server replaces it with the default social links)', async () => {
    const page = creatorPage!.page;
    const refName = `Charter ${RUN}`;
    const refUri = `https://example.org/charter-${RUN}`;

    const dialog = await startCreate(page, NAME_ID_2, NAME_2);
    await dialog.getByRole('button', { name: 'Add another reference' }).click();
    await dialog.getByRole('textbox', { name: 'Title' }).fill(refName);
    await dialog.getByRole('textbox', { name: 'URL' }).fill(refUri);

    await submitCreate(page, dialog, NAME_ID_2);

    const id = await organizationIdByNameId(NAME_ID_2);
    expect(id).not.toBeNull();
    const references = (await serverOrganization(id!)).profile.references;
    // Positive control: the read returned the default social links, so the
    // list was read and is not merely empty.
    expect((references ?? []).map(r => r.name)).toEqual(
      expect.arrayContaining(['bsky', 'github', 'linkedin'])
    );
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: refName, uri: refUri }),
      ])
    );
  });
});
