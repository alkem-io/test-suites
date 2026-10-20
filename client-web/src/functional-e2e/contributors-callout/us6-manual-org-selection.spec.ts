// story: client-web#10300 "Organizations in Contributors manual selection"
// (client-web#10417, workspace#084). A Space admin can pick organisations as
// well as people in a Contributors post's Manual selection; the picker says
// which kind each result is; a chip shows the contributor's name, never an id;
// the type controls stay visible in custom mode; a selected contributor that
// left the community is relabelled "No longer available" and can be removed.
//
// The PR shipped with a human visual gate and no live-stack run. This file is
// that gate: one Space, one organisation member, one person member, one
// Contributors post created through the API, walked by the Space admin.
//
// Known debt ENG-084-01 (PR body): while the candidate query is in flight on a
// cold cache every chip reads "No longer available". Each chip assertion here
// first waits for a chip that MUST resolve (a current member) to show its
// name, so a stale-label assertion can never pass on the loading state.

import { expect, type Locator, type Page } from '@playwright/test';
import { TestScenarioFactory, TestUser, TestUserManager, UniqueIDGenerator } from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { adminGql, CardsFixture, createContributorsCalloutViaApi } from './cards-fixture';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const test = createPersonaTest('space.admin@alkem.io');
const uid = UniqueIDGenerator.getID();
const TITLE = `Manual selection ${uid}`;
const ORG = `MS Org ${uid}`;
const PERSON = `MS Person ${uid}`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Copy (bundle crd-space, en)
const COPY = {
  manualSelection: 'Manual selection',
  search: 'Search members',
  types: 'Contributor types',
  typeLabel: { organization: 'Organizations', user: 'People' },
  noLongerAvailable: 'No longer available',
  remove: (name: string) => `Remove ${name}`,
} as const;

const scenarioConfig: TestScenarioConfig = {
  name: 'manual-org-selection',
  space: {
    about: { profile: { displayName: 'Manual Org Selection Space' } },
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false, addWhiteboardCallout: false },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};

let scenario: OrganizationWithSpaceModel | undefined;
const fixture = new CardsFixture(uid);
let calloutId = '';
let orgId = '';
let personId = '';

// ---------------------------------------------------------------------------
// Picker locators (inside the edit dialog)
// ---------------------------------------------------------------------------
const dialog = (page: Page): Locator => page.getByRole('dialog');
const manualSwitch = (page: Page): Locator => dialog(page).getByRole('switch', { name: COPY.manualSelection });
const searchBox = (page: Page): Locator => dialog(page).getByRole('textbox', { name: COPY.search });
/** A result row: the button carrying the name and the kind label. */
const resultRow = (page: Page, name: string, kind: keyof typeof COPY.typeLabel): Locator =>
  dialog(page).getByRole('button').filter({ hasText: name }).filter({ hasText: COPY.typeLabel[kind] });
/** A selected chip, found by its remove control, which carries the chip's label. */
const chip = (page: Page, label: string): Locator =>
  dialog(page).getByRole('listitem').filter({ has: page.getByRole('button', { name: COPY.remove(label), exact: true }) });

const selection = async (): Promise<{ mode: string; selectedIds: string[] }> => {
  const data = await adminGql<{
    lookup: { callout: { settings: { framing: { selection: { mode: string; selectedIds: string[] } } } } };
  }>('query($id: UUID!){ lookup { callout(ID: $id) { settings { framing { selection { mode selectedIds } } } } } }', {
    id: calloutId,
  });
  return data.lookup.callout.settings.framing.selection;
};

const openEdit = async (page: Page): Promise<ContributorsCalloutPage> => {
  const cc = new ContributorsCalloutPage(page, baseUrl);
  await cc.navigateToSpace(scenario!.space.nameId);
  await cc.openEdit(TITLE);
  return cc;
};

const saveAndReload = async (page: Page, cc: ContributorsCalloutPage): Promise<void> => {
  await cc.saveEditButton.click();
  await expect(dialog(page).getByRole('switch', { name: COPY.manualSelection })).toHaveCount(0, { timeout: 15_000 });
  await page.reload();
};

// `cardFor` (the grid item holding the profile link) rather than the page
// object's `contributorCard`: an organisation card exposes its name on two
// links (avatar + title), which the strict single-link locator rejects.
const collection = async (page: Page, cc: ContributorsCalloutPage) => {
  const col = cc.collection(TITLE);
  await expect(col.region).toBeVisible({ timeout: 30_000 });
  return col;
};

test.describe.serial('US6 — Organisations in Manual selection (client-web#10300)', () => {
  test.beforeAll(async () => {
    test.setTimeout(180_000);
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    const roleSet = scenario.space.community.roleSetId;
    orgId = await fixture.organization(ORG, `msorg${uid}`, roleSet, { associates: 0 }, TestUserManager.users.globalAdmin.id);
    personId = await fixture.user(PERSON, roleSet);
    calloutId = await createContributorsCalloutViaApi(scenario.space.collaboration.calloutsSetId, TITLE);
    expect(await selection()).toEqual({ mode: 'AUTO', selectedIds: [] });
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    try {
      await fixture.cleanUp();
    } finally {
      if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario);
    }
  });

  test('US6-AS1 — Manual selection offers the organisation and the person, each labelled by kind; chips carry names; the type controls stay; the post renders exactly the two picked; the editor reopens with both', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const cc = await openEdit(page);

    await manualSwitch(page).click();
    await expect(manualSwitch(page)).toBeChecked();
    // 084 FR-002: the type controls are not hidden in custom mode.
    await expect(dialog(page).getByRole('group', { name: COPY.types })).toBeVisible();

    await searchBox(page).fill(ORG);
    await expect(resultRow(page, ORG, 'organization')).toBeVisible();
    await expect(resultRow(page, ORG, 'user')).toHaveCount(0);
    await resultRow(page, ORG, 'organization').click();
    await expect(chip(page, ORG)).toBeVisible();

    await searchBox(page).fill(PERSON);
    await expect(resultRow(page, PERSON, 'user')).toBeVisible();
    await resultRow(page, PERSON, 'user').click();
    await expect(chip(page, PERSON)).toBeVisible();

    // Chips: the display name, never an id, and no stale label for a current member.
    for (const c of [chip(page, ORG), chip(page, PERSON)]) {
      await expect(c).not.toContainText(UUID);
      await expect(c).not.toContainText(COPY.noLongerAvailable);
    }
    // An already-selected contributor leaves the result list.
    await searchBox(page).fill(ORG);
    await expect(resultRow(page, ORG, 'organization')).toHaveCount(0);

    await saveAndReload(page, cc);
    expect(await selection()).toEqual({ mode: 'CUSTOM', selectedIds: expect.arrayContaining([orgId, personId]) });
    expect((await selection()).selectedIds).toHaveLength(2);

    const col = await collection(page, cc);
    await col.switchType('Organizations');
    await expect(col.cardFor(ORG)).toBeVisible();
    await expect(col.cardItems).toHaveCount(1);
    await col.switchType('People');
    await expect(col.cardFor(PERSON)).toBeVisible();
    // The admin is a member too, and is NOT rendered: the selection, not the community, drives the post.
    await expect(col.cardItems).toHaveCount(1);

    // AC "a mixed selection stays intact across save → reload → edit": the editor
    // reopens with both chips resolved to their names. Both are current members, so
    // once each name shows no chip may read "No longer available" (ENG-084-01 settled).
    await openEdit(page);
    await expect(manualSwitch(page)).toBeChecked();
    await expect(chip(page, ORG)).toBeVisible({ timeout: 20_000 });
    await expect(chip(page, PERSON)).toBeVisible();
    await expect(chip(page, COPY.noLongerAvailable)).toHaveCount(0);
  });

  test('US6-AS2 — an organisation that left the community reads "No longer available" on its chip, not an id, and is no longer rendered', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await adminGql(
      'mutation($d: RemoveRoleOnRoleSetInput!){ removeRoleFromOrganization(roleData: $d) { id } }',
      { d: { actorID: orgId, roleSetID: scenario!.space.community.roleSetId, role: 'MEMBER' } }
    );

    const cc = await openEdit(page);
    // The person is still a member: their chip resolving proves the candidates loaded (ENG-084-01).
    await expect(chip(page, PERSON)).toBeVisible({ timeout: 20_000 });
    await expect(chip(page, COPY.noLongerAvailable)).toBeVisible();
    await expect(chip(page, COPY.noLongerAvailable)).not.toContainText(UUID);
    await expect(chip(page, ORG)).toHaveCount(0);
    // Still selected on the server: the relabel is presentation only.
    expect((await selection()).selectedIds).toEqual(expect.arrayContaining([orgId, personId]));

    // Leave without saving: a fresh load of the Space is the clean way out of the
    // edit dialog AND the detail dialog beneath it.
    await cc.navigateToSpace(scenario!.space.nameId);
    // One kind left, so the post shows no type switch: the grid is the oracle.
    const col = await collection(page, cc);
    await expect(col.cardFor(PERSON)).toBeVisible();
    await expect(col.cardFor(ORG)).toHaveCount(0);
    await expect(col.cardItems).toHaveCount(1);
  });

  test('US6-AS3 — removing the stale chip and saving leaves only the person, on the post and on the server', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const cc = await openEdit(page);
    await expect(chip(page, PERSON)).toBeVisible({ timeout: 20_000 });
    await dialog(page).getByRole('button', { name: COPY.remove(COPY.noLongerAvailable), exact: true }).click();
    await expect(chip(page, COPY.noLongerAvailable)).toHaveCount(0);
    await expect(chip(page, PERSON)).toBeVisible();

    await saveAndReload(page, cc);
    expect(await selection()).toEqual({ mode: 'CUSTOM', selectedIds: [personId] });

    const col = await collection(page, cc);
    await expect(col.cardFor(PERSON)).toBeVisible();
    await expect(col.cardItems).toHaveCount(1);
  });
});
