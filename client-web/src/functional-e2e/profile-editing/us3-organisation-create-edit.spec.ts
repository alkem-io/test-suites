// spec: client-web/src/functional-e2e/profile-editing/profile-editing-test-plan.md
// W2 journey 7 (docs/qa/server-rebuild/plan.md § W2), an organisation created
// by a non-admin user: who is offered "Create Organisation" (H1-1), the create
// dialog (H1-2), editing what the creator then owns (H2-1), and a reference
// typed into the dialog (H1-3).
//
// The creator is a disposable user, granted Feature Organization Creator over
// the API (the seeded `feature.orgcreator` persona would gain and lose an
// Admin role every run). The file is SERIAL: H1-1 (grant) → H1-2 (create) →
// H2-1 (edit the created organisation). H1-3 needs only H1-1. Organisations
// the walk creates in the browser are known only by the nameID it typed, so
// each is recorded before it is submitted and deleted by that nameID, before
// the user.

import { test, expect, type Page } from '@playwright/test';
import {
  assignPlatformRole,
  getUserToken,
  readMyPlatformRoles,
  readRoleSetUsersInRole,
  RoleName,
  TestUserManager,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import { grantCookieConsent } from '../helpers/cookies.helper';
import {
  addTags,
  baseUrl,
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
  registerDisposableUser,
  chipButtons,
  runCleanup,
  saveWith,
  serverOrganization,
  sorted,
  tagsOf,
  uid,
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
    ...createdNameIds.map(
      (nameId): [string, () => Promise<unknown>] => [
        `delete org ${nameId}`,
        () => deleteOrganizationIfPresent(nameId),
      ]
    ),
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
  await page.getByRole('button', { name: 'New Organisation', exact: true }).click();
  const dialog = newOrganisationDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

const nameIdOf = (suffix: string) => `w2-${suffix}-${RUN}`;
const NAME_ID_1 = nameIdOf('org');
const NAME_ID_2 = nameIdOf('org2');
const NAME_1 = `W2 Org ${RUN}`;
const NAME_2 = `W2 Org Two ${RUN}`;

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
    const desc = `ORG DESC ${RUN}`;
    const website = `https://example.org/w2-${RUN}`;

    await openOrganisationsTab(page, creator!.nameId);
    const dialog = await openCreateDialog(page);

    // Recorded before submitting: the browser creates the organisation, and
    // only the nameID typed here identifies it for the cleanup.
    createdNameIds.push(NAME_ID_1);
    await dialog.getByRole('textbox', { name: 'Alias (name ID)' }).fill(NAME_ID_1);
    await dialog.getByRole('textbox', { name: 'Display name' }).fill(NAME_1);
    await dialog.getByRole('textbox', { name: 'Tagline' }).fill(tagline);
    await dialog.getByRole('textbox', { name: 'Formatting toolbar' }).fill(desc);
    await dialog.getByRole('textbox', { name: 'Website' }).fill(website);

    const created = expectMutationAnswered(page, 'createOrganization');
    await dialog.getByRole('button', { name: 'Create organisation', exact: true }).click();
    await created();

    await expect(page.getByText('Organisation created.', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await page.waitForURL(`**/organization/${NAME_ID_1}`);
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
    expect(org.profile.description).toContain(desc);

    // The server makes the creator Associate AND Admin.
    for (const role of [RoleName.Admin, RoleName.Associate]) {
      const holders = must(
        await readRoleSetUsersInRole(org.roleSet.id, role),
        `usersInRole(${role})`
      ).lookup.roleSet?.usersInRole;
      expect(
        (holders ?? []).map(u => u.id),
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
    const before = await serverOrganization(id!);
    // The update-by-id path: both reserved tagsets exist and are empty.
    expect(tagsOf(before.profile.tagsets, 'keywords')).toEqual([]);
    expect(tagsOf(before.profile.tagsets, 'capabilities')).toEqual([]);

    await page.goto(orgSettingsUrl(NAME_ID_1, 'profile'));
    await openSettingsSection(page, 'About');
    const location = page.getByRole('group', { name: 'Location' });
    const city = location.getByRole('combobox', { name: 'City', exact: true });
    const country = location.getByRole('combobox', { name: /^(?!City$)/ });

    await page.getByRole('textbox', { name: 'Formatting toolbar' }).fill(desc2);
    await city.fill('Rotterdam');
    await city.press('Escape');
    await country.click();
    await page.getByPlaceholder('Search country…').fill('Netherlands');
    await page.getByRole('button', { name: 'Netherlands', exact: true }).click();
    await expect(country).toContainText('Netherlands');
    await addTags(orgKeywordsInput(page), [k1, k2]);
    await addTags(orgCapabilitiesInput(page), [c1]);

    // description, city, country, keywords and capabilities.
    await saveWith(page, 'updateOrganization', '5 unsaved changes');

    await page.reload();
    await openSettingsSection(page, 'About');
    await expect(page.getByRole('textbox', { name: 'Formatting toolbar' })).toContainText(desc2);
    await expect(city).toHaveValue('Rotterdam');
    await expect(country).toContainText('Netherlands');
    for (const tag of [k1, k2, c1]) {
      await expect(chipButtons(page, tag)).toHaveCount(2);
    }

    const after = await serverOrganization(id!);
    // The old text is replaced; desc2 present is the positive control.
    expect(after.profile.description).toContain(desc2);
    expect(after.profile.description).not.toContain(desc);
    expect(after.profile.location).toEqual({ city: 'Rotterdam', country: 'NL' });
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
            has: visitor.getByRole('heading', { level: 3, name: heading, exact: true }),
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

    await openOrganisationsTab(page, creator!.nameId);
    const dialog = await openCreateDialog(page);
    createdNameIds.push(NAME_ID_2);
    await dialog.getByRole('textbox', { name: 'Alias (name ID)' }).fill(NAME_ID_2);
    await dialog.getByRole('textbox', { name: 'Display name' }).fill(NAME_2);
    await dialog.getByRole('button', { name: 'Add another reference' }).click();
    await dialog.getByRole('textbox', { name: 'Title' }).fill(refName);
    await dialog.getByRole('textbox', { name: 'URL' }).fill(refUri);

    const created = expectMutationAnswered(page, 'createOrganization');
    await dialog.getByRole('button', { name: 'Create organisation', exact: true }).click();
    await created();
    await page.waitForURL(`**/organization/${NAME_ID_2}`);

    const id = await organizationIdByNameId(NAME_ID_2);
    expect(id).not.toBeNull();
    const references = (await serverOrganization(id!)).profile.references;
    // Positive control: the read returned the default social links, so the
    // list was read and is not merely empty.
    expect((references ?? []).map(r => r.name).sort()).toEqual(
      expect.arrayContaining(['bsky', 'github', 'linkedin'])
    );
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: refName, uri: refUri }),
      ])
    );
  });
});
