// spec: client-web/src/functional-e2e/community-guidelines/community-guidelines-test-plan.md
// W2 extras (test-suites#722, catalogue SP-10): a Space's community
// guidelines, edited in Space Settings → Community.
//
// CG-1 `space.admin` replaces the title and body and adds a related link;
//      the server keeps exactly those, the reloaded settings page shows them,
//      and `space.member` is shown them on the Community tab (but no Edit).
// CG-2 the admin removes the link; the server drops it and keeps the text.
// Serial: CG-2 removes the link CG-1 added.

import { test, expect } from '@playwright/test';
import {
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  updateCommunityGuidelines,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  bodyEditor,
  editorDialog,
  expectMutationAnswered,
  openEditor,
  openGuidelinesSettings,
  openPersonaPage,
  openTab,
  previewTitle,
  referenceTitleFields,
  referenceUrlFields,
  seedGuidelinesSpace,
  serverGuidelines,
  spaceSidebar,
  teardownScenario,
  titleField,
  type PersonaPage,
} from './community-guidelines.helpers';

const uid = UniqueIDGenerator.getID();
const oldTitle = `CG old title ${uid}`;
const oldBody = `CG old body ${uid}`;
const newTitle = `CG rules ${uid}`;
const newBody = `CG be kind ${uid}`;
const linkName = `CG charter ${uid}`;
const linkUrl = `https://alkem.io/cg-${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await seedGuidelinesSpace(uid);
  // A starting text, so "replaced" is distinguishable from "appended" and
  // from "never written".
  const { id } = await serverGuidelines(scenario.space.id);
  must(
    await updateCommunityGuidelines({
      communityGuidelinesID: id,
      profile: { displayName: oldTitle, description: oldBody },
    }),
    'seed the old guidelines'
  );
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;

test.describe("W2 extras — a Space's community guidelines, edited in Space Settings", () => {
  test('CG-1 the admin replaces the title and body and adds a link; the server keeps exactly those and a member is shown them', async ({
    browser,
  }) => {
    const before = await serverGuidelines(space().id);
    expect(before.title).toBe(oldTitle);
    expect(before.body).toBe(oldBody);
    expect(before.references).toEqual([]);

    const page = admin!.page;
    await openGuidelinesSettings(page, space().nameId);
    await expect(previewTitle(page, oldTitle)).toBeVisible();
    const dialog = await openEditor(page);
    await expect(titleField(dialog)).toHaveValue(oldTitle);
    await titleField(dialog).fill(newTitle);
    await bodyEditor(dialog).fill(newBody);
    await dialog
      .getByRole('button', { name: 'Add another reference', exact: true })
      .click();
    await referenceTitleFields(dialog).fill(linkName);
    await referenceUrlFields(dialog).fill(linkUrl);

    const linkCreated = expectMutationAnswered(
      page,
      'createReferenceOnProfile'
    );
    const updated = expectMutationAnswered(page, 'updateCommunityGuidelines');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await linkCreated();
    await updated();
    await expect(editorDialog(page)).toBeHidden();

    // Server: exactly the new text (the old is gone, not kept beside it) and
    // exactly one link.
    const after = await serverGuidelines(space().id);
    expect(after.title).toBe(newTitle);
    expect(after.body).toBe(newBody);
    expect(after.references.map(({ name, uri }) => ({ name, uri }))).toEqual([
      { name: linkName, uri: linkUrl },
    ]);

    // The reloaded settings preview shows the stored guidelines.
    await page.reload();
    await openGuidelinesSettings(page, space().nameId);
    await expect(previewTitle(page, newTitle)).toBeVisible();
    await expect(page.getByText(newBody, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: linkName, exact: true })
    ).toHaveAttribute('href', linkUrl);
    await expect(previewTitle(page, oldTitle)).toHaveCount(0);

    // The admin's Community tab offers Edit on the block: the control for the
    // member's absence below.
    await openTab(page, `${baseUrl}/${space().nameId}`, 'Community');
    const adminSidebar = spaceSidebar(page);
    await expect(
      adminSidebar.getByRole('heading', { name: newTitle, exact: true })
    ).toBeVisible();
    await expect(
      adminSidebar.getByRole('button', { name: 'Edit', exact: true })
    ).toHaveCount(1);

    // A member reads the same over the API…
    const asMember = await serverGuidelines(space().id, TestUser.SPACE_MEMBER);
    expect(asMember).toEqual(after);

    // …and is shown it on the Community tab, without an Edit.
    const viewer = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      await openTab(viewer.page, `${baseUrl}/${space().nameId}`, 'Community');
      const sidebar = spaceSidebar(viewer.page);
      await expect(
        sidebar.getByRole('heading', { name: newTitle, exact: true })
      ).toBeVisible();
      await expect(sidebar.getByText(newBody, { exact: true })).toBeVisible();
      await expect(
        sidebar.getByRole('heading', { name: oldTitle, exact: true })
      ).toHaveCount(0);
      await expect(
        sidebar.getByRole('button', { name: 'Edit', exact: true })
      ).toHaveCount(0);
      // The full guidelines, with the link, open from "Read more".
      await sidebar
        .getByRole('button', { name: 'Read more', exact: true })
        .click();
      const full = viewer.page.getByRole('dialog', {
        name: newTitle,
        exact: true,
      });
      await expect(full).toBeVisible();
      await expect(full.getByRole('link', { name: linkName })).toHaveAttribute(
        'href',
        linkUrl
      );
    } finally {
      await viewer.close();
    }
  });

  test('CG-2 the admin removes the link; the server drops it and keeps the text', async () => {
    const before = await serverGuidelines(space().id);
    test.skip(before.references.length !== 1, 'CG-1 did not add the link');
    const kept = { title: before.title, body: before.body };

    const page = admin!.page;
    await openGuidelinesSettings(page, space().nameId);
    const dialog = await openEditor(page);
    await expect(referenceTitleFields(dialog)).toHaveValue(
      before.references[0].name
    );
    await dialog
      .getByRole('button', { name: 'Remove reference', exact: true })
      .click();
    const confirm = page.getByRole('alertdialog', {
      name: 'Remove this reference?',
      exact: true,
    });
    await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(referenceTitleFields(dialog)).toHaveCount(0);

    const deleted = expectMutationAnswered(page, 'deleteReference');
    const updated = expectMutationAnswered(page, 'updateCommunityGuidelines');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await deleted();
    await updated();
    await expect(editorDialog(page)).toBeHidden();

    const after = await serverGuidelines(space().id);
    expect(after.references).toEqual([]);
    expect({ title: after.title, body: after.body }).toEqual(kept);

    await page.reload();
    await openGuidelinesSettings(page, space().nameId);
    await expect(previewTitle(page, kept.title)).toBeVisible();
    await expect(
      page.getByRole('link', { name: linkName, exact: true })
    ).toHaveCount(0);
  });
});
