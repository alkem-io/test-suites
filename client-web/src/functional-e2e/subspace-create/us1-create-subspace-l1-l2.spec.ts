// spec: client-web/src/functional-e2e/subspace-create/subspace-create-test-plan.md
// W2 journey 3 (docs/qa/server-rebuild/plan.md § W2): create a subspace (L1,
// then L2 under it) through the UI.

import { test, expect, type Page } from '@playwright/test';
import {
  AuthorizationPrivilege,
  CommunityMembershipPolicy,
  readSpaceMyPrivileges,
  readSubspaceByNameId,
  SpaceLevel,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  spaceSidebar,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';

/**
 * A PRIVATE L0 Space seeded through the lib; everything below it is created in
 * the browser by its admin. Every subspace the walk creates lives under the
 * run's own L0, so `teardownScenario` removes them leaves-first even when the
 * walk stops half-way (the server refuses to delete an L0 that still has
 * subspaces, and a leaked L0 counts against the account's Space allowance).
 *
 *   admin     `space.admin` — creates L1 from the Space page, L2 from the L1 page
 *   bystander `non.space`   — not a member of the private L0 (negative control)
 */
const uid = UniqueIDGenerator.getID();
const scenarioName = `w2-sub-${uid}`;
const l1Name = `W2 L1 ${uid}`;
const l2Name = `W2 L2 ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let bystander: PersonaPage | undefined;
/** Filled the moment each subspace's URL is known. */
const created: { l1?: { id: string; nameId: string; url: string }; l2?: { id: string; nameId: string; url: string } } = {};

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await TestScenarioFactory.createBaseScenario({
    name: scenarioName,
    space: {
      community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
    },
  });
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
  bystander = await openPersonaPage(browser, TestUserManager.users.nonSpaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await bystander?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;

/** Fills the create-subspace dialog with a name only, submits, and returns
 * the new subspace's URL once the browser has landed on its page. */
const createThroughDialog = async (page: Page, name: string): Promise<string> => {
  const dialog = page.getByRole('dialog', { name: 'Create new Subspace' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Name *' }).fill(name);
  const answered = expectMutationAnswered(page, 'createSubspace');
  await dialog.getByRole('button', { name: 'Create Subspace', exact: true }).click();
  await answered();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
  return page.url();
};

/** The last path segment of a subspace URL is its nameID. */
const nameIdOf = (url: string): string => new URL(url).pathname.split('/').filter(Boolean).pop()!;

test.describe('W2 journey 3 — create a subspace (L1, then L2) through the UI', () => {
  test('S3-1 the admin creates an L1 from the Space page; it opens, is listed in the parent, and the server holds it as L1 under that parent', async () => {
    const page = admin!.page;
    await page.goto(`${baseUrl}/${space().nameId}`);
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    await spaceSidebar(page).getByRole('button', { name: 'Create Subspace', exact: true }).click();

    const url = await createThroughDialog(page, l1Name);
    expect(url).toMatch(new RegExp(`/${space().nameId}/challenges/[^/]+$`));
    const nameId = nameIdOf(url);

    const { lookup } = must(await readSubspaceByNameId(space().id, nameId), 'readSubspaceByNameId(L0, L1)');
    expect(lookup.space?.level).toBe(SpaceLevel.L0);
    const l1 = lookup.space!.subspaceByNameID;
    created.l1 = { id: l1.id, nameId, url };
    expect(l1.level).toBe(SpaceLevel.L1);
    expect(l1.about.profile.displayName).toBe(l1Name);

    // The parent lists it: a card in the Subspaces grid linking to that URL.
    await page.goto(`${baseUrl}/${space().nameId}`);
    await page.getByRole('tab', { name: 'Subspaces' }).click();
    const card = page
      .getByRole('region', { name: 'Subspaces grid' })
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: l1Name, exact: true }) });
    await expect(card).toHaveAttribute('href', url);
  });

  test('S3-2 the admin creates an L2 from the new L1 page; it opens, is listed in the L1, and the server holds it as L2 under that L1', async () => {
    const page = admin!.page;
    const l1 = created.l1!;
    await page.goto(l1.url);
    const sidebar = page.getByRole('complementary', { name: 'SubSpace sidebar' });
    await expect(sidebar.getByRole('heading', { name: 'Subspaces', level: 3 })).toBeVisible();
    await sidebar.getByRole('button', { name: 'Create', exact: true }).click();

    const url = await createThroughDialog(page, l2Name);
    expect(url).toMatch(new RegExp(`/${space().nameId}/challenges/${l1.nameId}/opportunities/[^/]+$`));
    const nameId = nameIdOf(url);

    const { lookup } = must(await readSubspaceByNameId(l1.id, nameId), 'readSubspaceByNameId(L1, L2)');
    expect(lookup.space?.level).toBe(SpaceLevel.L1);
    const l2 = lookup.space!.subspaceByNameID;
    created.l2 = { id: l2.id, nameId, url };
    expect(l2.level).toBe(SpaceLevel.L2);
    expect(l2.about.profile.displayName).toBe(l2Name);

    // The L1's sidebar lists it.
    await page.goto(l1.url);
    await expect(
      page.getByRole('complementary', { name: 'SubSpace sidebar' }).getByRole('link', { name: new RegExp(l2Name) })
    ).toBeVisible();
  });

  test('S3-3 both URLs resolve for the admin; a non-member of the private parent is turned away from both, and the server refuses them the read', async () => {
    const { l1, l2 } = created;
    const subs = [
      { name: l1Name, sub: l1!, parentId: space().id },
      { name: l2Name, sub: l2!, parentId: l1!.id },
    ];
    for (const { name, sub, parentId } of subs) {
      // Positive control: the admin opens the page, holds READ, and reads it through its parent.
      await admin!.page.goto(sub.url);
      await expect(admin!.page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
      const adminPrivileges = must(await readSpaceMyPrivileges(sub.id, TestUser.SPACE_ADMIN), 'admin privileges');
      expect(adminPrivileges.lookup.space?.authorization?.myPrivileges).toContain(AuthorizationPrivilege.Read);
      must(await readSubspaceByNameId(parentId, sub.nameId, TestUser.SPACE_ADMIN), 'admin read through the parent');

      const page = bystander!.page;
      await page.goto(sub.url);
      await expect(page.getByRole('dialog', { name: 'We are redirecting you...' })).toBeVisible();
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toHaveCount(0);
      const refused = await readSubspaceByNameId(parentId, sub.nameId, TestUser.NON_SPACE_MEMBER);
      expect(refused.error?.errors?.map(e => e.code), `non-member read of ${name}`).toContain('FORBIDDEN_POLICY');
    }
  });
});
