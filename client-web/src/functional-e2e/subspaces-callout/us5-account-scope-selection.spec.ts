// story: client-web#10344 "Spaces callout: allow selecting other spaces from
// the same account in custom selection" (server#6667 + client-web#10430,
// workspace#084-spaces-callout-account-scope).
//
// The browser half of the feature's verification, persisted: the forge walks
// (US1 10/10, US2 3/3) ran once against the author's stack and were never
// committed. The account BOUNDARY (foreign-account ids rejected, stale ids
// dropped) is the API spec test-suites#675 `callout/spaces-selection-account-
// scope.it-spec.ts`; this file does not restate it.
//
// Fixture (spec §US2 "Independent Test", one account = the scenario
// organisation's): host L0 A (PUBLIC) with A1 → A1a; sibling L0 B (PRIVATE,
// the host admin is a member) with B1 (PUBLIC, named like A1 to force the
// chip's "in <parent>" context); L0 C (PRIVATE, the host admin is NOT a
// member — the candidate the picker must withhold), and B2 (PRIVATE under B;
// the host admin becomes its member only inside US5-AS6, which proves that
// membership of the private L0 alone does not reach its private subspaces).
// Four callouts on A: `pick` (AUTO, the admin curates it in the browser),
// `mixed` {A1a, B, B1}, `withheld` {B, B1} and `priv` (AUTO, curated to {B2}
// in US5-AS6). Three viewers: the host admin (member of A and B), a member of
// A only, and an anonymous visitor. US5-AS7 adds A2 (PRIVATE under A), a
// `matrix` post selecting {A1, A2, B, B1, B2}, and three more viewers: an
// admin of BOTH A and B, a member of B only, and a registered non-member.

import {
  type Browser,
  expect,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  assignRoleToUser,
  getUserToken,
} from '@alkemio/tests-lib';
import {
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { adminGql } from '../contributors-callout/cards-fixture';
import {
  createPersonaTest,
  ensurePersonaState,
} from '../fixtures/authenticated-session.fixture';
import { grantCookieConsent } from '../helpers/cookies.helper';
import {
  deleteFixtureTree,
  findArticleByName,
  newFixtureTree,
} from './subspaces-callout.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const ADMIN = 'space.admin@alkem.io';
const MEMBER = 'space.member@alkem.io';
const test = createPersonaTest(ADMIN);
const uid = UniqueIDGenerator.getID();
const shortId = (label: string) => `${label}${uid}`.toLowerCase().slice(0, 24);

// Copy (bundle crd-space, en)
const COPY = {
  manualSwitch: /^(Pick spaces manually|Manual selection)$/,
  search: 'Search spaces in this account',
  clearSearch: 'Clear search',
  hostBadge: 'Post is here',
  inHostTree: 'In this space',
  level: { space: 'Space', subspace: 'Subspace', subsubspace: 'Sub-subspace' },
  path: (level: string, path: string) => `${level} in ${path}`,
  chipsEmpty: 'No spaces picked yet. Search below to add some.',
  selected: (n: number) =>
    n === 1 ? '1 space selected' : `${n} spaces selected`,
  clearSelection: 'Clear selection',
  notice:
    "Some spaces in this overview are not shown because you don't have access to them.",
  save: 'Save',
} as const;

// A, A1 and A1a are read back from the scenario after creation: the factory
// names the L0 itself. B1 reuses A1's name on purpose (US3-AS4).
const NAMES = {
  A: '',
  A1: '',
  A1a: '',
  B: `Acct sibling B ${uid}`,
  B1: `Community of practice ${uid}`,
  C: `Acct closed C ${uid}`,
  B2: `Closed B2 ${uid}`,
  A2: `Closed A2 ${uid}`,
  pick: `Portfolio pick ${uid}`,
  mixed: `Portfolio mixed ${uid}`,
  withheld: `Portfolio withheld ${uid}`,
  auto: `Portfolio auto ${uid}`,
  priv: `Portfolio private B2 ${uid}`,
  matrix: `Portfolio matrix ${uid}`,
};

const scenarioConfig: TestScenarioConfig = {
  name: 'acct-scope-ui',
  space: {
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    subspace: {
      about: { profile: { displayName: `Community of practice ${uid}` } },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
      },
      subspace: {
        about: { profile: { displayName: `Deep A1a ${uid}` } },
        settings: { privacy: { mode: SpacePrivacyMode.Public } },
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_ADMIN],
        },
      },
    },
  },
};

let scenario: OrganizationWithSpaceModel | undefined;
const extra = newFixtureTree(); // B, B1, B2, C — removed leaves-first in afterAll
const ids = { A: '', A1: '', A1a: '', A2: '', B: '', B1: '', B2: '', C: '' };
const roleSets = { B: '', B2: '' };
const callouts = {
  pick: '',
  mixed: '',
  withheld: '',
  auto: '',
  priv: '',
  matrix: '',
};
// Viewers added in US5-AS7 (harness personas; no role on A or B until then).
const BOTH_ADMIN = 'subspace.admin@alkem.io';
const B_MEMBER = 'subspace.member@alkem.io';
const NON_MEMBER = 'non.space@alkem.io';
let spaceAdminId = '';

// ---------------------------------------------------------------------------
// API helpers (global admin)
// ---------------------------------------------------------------------------
const createL0 = async (
  displayName: string,
  nameID: string,
  privacy: SpacePrivacyMode
): Promise<{ id: string; roleSetId: string }> => {
  const data = await adminGql<{
    createSpace: { id: string; community: { roleSet: { id: string } } };
  }>(
    'mutation($d: CreateSpaceOnAccountInput!){ createSpace(spaceData: $d) { id community { roleSet { id } } } }',
    {
      d: {
        accountID: scenario!.organization.accountId,
        nameID,
        about: { profileData: { displayName } },
        collaborationData: { calloutsSetData: {}, addTutorialCallouts: false },
        settings: { privacy: { mode: privacy } },
      },
    }
  );
  return {
    id: data.createSpace.id,
    roleSetId: data.createSpace.community.roleSet.id,
  };
};

const createL1 = async (
  parentId: string,
  displayName: string,
  nameID: string,
  privacy: SpacePrivacyMode
): Promise<{ id: string; roleSetId: string }> => {
  const data = await adminGql<{
    createSubspace: { id: string; community: { roleSet: { id: string } } };
  }>(
    'mutation($d: CreateSubspaceInput!){ createSubspace(subspaceData: $d) { id community { roleSet { id } } } }',
    {
      d: {
        spaceID: parentId,
        nameID,
        about: { profileData: { displayName } },
        collaborationData: { calloutsSetData: {}, addTutorialCallouts: false },
        settings: { privacy: { mode: privacy } },
      },
    }
  );
  return {
    id: data.createSubspace.id,
    roleSetId: data.createSubspace.community.roleSet.id,
  };
};

const createSpacesPost = async (
  displayName: string,
  selection?: { mode: 'AUTO' | 'CUSTOM'; selectedIds: string[] }
): Promise<string> => {
  const data = await adminGql<{ createCalloutOnCalloutsSet: { id: string } }>(
    'mutation($c: CreateCalloutOnCalloutsSetInput!){ createCalloutOnCalloutsSet(calloutData: $c) { id } }',
    {
      c: {
        calloutsSetID: scenario!.space.collaboration.calloutsSetId,
        framing: { type: 'SPACES', profile: { displayName } },
        ...(selection ? { settings: { framing: { selection } } } : {}),
      },
    }
  );
  return data.createCalloutOnCalloutsSet.id;
};

const selectionOf = async (
  calloutId: string
): Promise<{ mode: string; selectedIds: string[] }> =>
  (
    await adminGql<{
      lookup: {
        callout: {
          settings: {
            framing: { selection: { mode: string; selectedIds: string[] } };
          };
        };
      };
    }>(
      'query($id: UUID!){ lookup { callout(ID: $id) { settings { framing { selection { mode selectedIds } } } } } }',
      { id: calloutId }
    )
  ).lookup.callout.settings.framing.selection;

const userIdByEmail = async (email: string): Promise<string> =>
  (
    await adminGql<{ usersPaginated: { users: { id: string }[] } }>(
      'query($f: UserFilterInput){ usersPaginated(filter: $f, first: 1) { users { id } } }',
      { f: { email } }
    )
  ).usersPaginated.users[0].id;

const grantRole = async (
  email: string,
  roleSetId: string,
  role: RoleName
): Promise<void> => {
  const res = await assignRoleToUser(
    await userIdByEmail(email),
    roleSetId,
    role
  );
  if (res.error)
    throw new Error(`${role} for ${email}: ${JSON.stringify(res.error)}`);
};

const renderedIdsFor = async (
  calloutId: string,
  as: TestUser
): Promise<{ ids: string[]; hidden: boolean }> => {
  const res = await graphqlRequestAuth(
    {
      query:
        'query($id: UUID!){ lookup { callout(ID: $id) { hasHiddenSpaces framing { subspaces { id } } } } }',
      variables: { id: calloutId },
    },
    as
  );
  const c = res.body.data.lookup.callout;
  return {
    ids: c.framing.subspaces.map((s: { id: string }) => s.id),
    hidden: c.hasHiddenSpaces,
  };
};

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
const dialog = (page: Page): Locator => page.getByRole('dialog');
/**
 * The post's own block: the innermost element holding both its "Open <title>"
 * link and its collection (a card, or the hidden-spaces notice when nothing
 * renders). Anchoring on the heading alone lands on the heading's wrapper.
 */
const postBlock = (page: Page, title: string): Locator =>
  page
    .locator('div')
    .filter({
      has: page.getByRole('link', { name: `Open ${title}`, exact: true }),
    })
    .filter({
      has: page
        .locator('article')
        .or(page.getByText(COPY.notice, { exact: true })),
    })
    .last();
const esc = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Candidate row = the button whose accessible name reads
 * "<initials> <name> <level sub-line> [badges]". Anchored on the name AND the
 * sub-line so "Space" never matches "Subspace" and a parent's name in a
 * child's path never matches the parent's row.
 */
const row = (page: Page, name: string, subLine?: string): Locator =>
  dialog(page).getByRole('button', {
    name: new RegExp(`^\\S+ ${esc(name)} ${subLine ? esc(subLine) : ''}`),
  });
const chip = (page: Page, removeLabel: string): Locator =>
  dialog(page)
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: removeLabel, exact: true }),
    });

/**
 * Edit through the post's detail dialog ("Open <title>" → settings → Edit): the
 * path a Space admin has (the feed's inline Settings button is the global
 * admin's). The edit form opens over the detail dialog, so `dialog(page)` is
 * only ever chained to a child locator, never asserted on its own.
 */
const openEdit = async (page: Page, title: string): Promise<void> => {
  await openSpace(page, title);
  await page.getByRole('link', { name: `Open ${title}` }).click();
  await dialog(page).getByRole('button', { name: 'settings' }).click();
  await page.getByRole('menuitem', { name: /edit/i }).click();
  await expect(
    dialog(page).getByRole('switch', { name: COPY.manualSwitch })
  ).toBeVisible({ timeout: 15_000 });
};

const viewAs = async (
  browser: Browser,
  email: string | null,
  walk: (page: Page) => Promise<void>
): Promise<void> => {
  // Playwright Test folds the config's context options (incl. the persona's
  // storage state) into `browser.newContext`, so the visitor must be given an
  // explicitly EMPTY state or it inherits the admin's session.
  const context = await browser.newContext({
    storageState: email
      ? await ensurePersonaState(browser, email)
      : { cookies: [], origins: [] },
    locale: 'en-US',
  });
  try {
    if (!email) await grantCookieConsent(context);
    await walk(await context.newPage());
  } finally {
    await context.close();
  }
};

/**
 * The feed mounts posts lazily as they scroll into view, so a post further down
 * is not in the DOM after navigation. Scroll until its heading exists.
 */
const revealPost = async (page: Page, title: string): Promise<Locator> => {
  const heading = page.getByRole('heading', { name: title, exact: true });
  // Bringing the last mounted post into view is what makes the feed mount the
  // next one; a wheel event alone depends on what sits under the pointer.
  const lastPost = page.getByRole('link', { name: /^Open / }).last();
  await expect
    .poll(
      async () => {
        if ((await heading.count()) === 0) {
          await lastPost.scrollIntoViewIfNeeded().catch(() => undefined);
          await page.keyboard.press('End');
        }
        return heading.count();
      },
      { timeout: 60_000 }
    )
    .toBeGreaterThan(0);
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeVisible();
  return postBlock(page, title);
};

const openSpace = async (page: Page, title: string): Promise<Locator> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  return revealPost(page, title);
};

test.describe
  .serial('US5 — Spaces from the whole account in Manual selection (client-web#10344)', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    ids.A = scenario.space.id;
    ids.A1 = scenario.subspace.id;
    ids.A1a = scenario.subsubspace.id;
    NAMES.A = scenario.space.about.profile.displayName;
    NAMES.A1 = scenario.subspace.about.profile.displayName;
    NAMES.A1a = scenario.subsubspace.about.profile.displayName;
    expect(NAMES.A1, "B1 must share A1's name").toBe(
      `Community of practice ${uid}`
    );

    // Every extra space is registered for the teardown the moment it exists,
    // leaves first (each child is created after its parent, so `unshift`
    // keeps that order), so a failure later in this hook leaks nothing.
    const b = await createL0(
      NAMES.B,
      shortId('acctb'),
      SpacePrivacyMode.Private
    );
    ids.B = b.id;
    roleSets.B = b.roleSetId;
    extra.subspaceIds.unshift(ids.B);
    const adminId = (
      await adminGql<{ lookupByName: { user: { id: string } } }>(
        'query($e: String!){ lookupByName { user(NAMEID: $e) { id } } }',
        { e: 'space-admin' }
      ).catch(() => ({ lookupByName: { user: { id: '' } } }))
    ).lookupByName.user.id;
    spaceAdminId =
      adminId ||
      (
        await adminGql<{ usersPaginated: { users: { id: string }[] } }>(
          'query($f: UserFilterInput){ usersPaginated(filter: $f, first: 1) { users { id } } }',
          { f: { email: ADMIN } }
        )
      ).usersPaginated.users[0].id;
    const member = await assignRoleToUser(
      spaceAdminId,
      b.roleSetId,
      RoleName.Member
    );
    if (member.error)
      throw new Error(`admin member of B: ${JSON.stringify(member.error)}`);
    ids.B1 = (
      await createL1(
        ids.B,
        NAMES.B1,
        shortId('acctb1'),
        SpacePrivacyMode.Public
      )
    ).id;
    extra.subspaceIds.unshift(ids.B1);
    // B2: private under private B. The admin is a member of B, NOT of B2, so
    // B2 is the one row of B's tree the admin cannot read (until US5-AS6).
    const b2 = await createL1(
      ids.B,
      NAMES.B2,
      shortId('acctb2'),
      SpacePrivacyMode.Private
    );
    ids.B2 = b2.id;
    roleSets.B2 = b2.roleSetId;
    extra.subspaceIds.unshift(ids.B2);
    const c = await createL0(
      NAMES.C,
      shortId('acctc'),
      SpacePrivacyMode.Private
    );
    ids.C = c.id;
    extra.subspaceIds.unshift(ids.C);

    callouts.pick = await createSpacesPost(NAMES.pick);
    callouts.mixed = await createSpacesPost(NAMES.mixed, {
      mode: 'CUSTOM',
      selectedIds: [ids.A1a, ids.B, ids.B1],
    });
    callouts.withheld = await createSpacesPost(NAMES.withheld, {
      mode: 'CUSTOM',
      selectedIds: [ids.B, ids.B1],
    });
    callouts.auto = await createSpacesPost(NAMES.auto);
    callouts.priv = await createSpacesPost(NAMES.priv);

    // Precondition read-backs: the privilege shape the whole file rests on.
    expect(
      (await renderedIdsFor(callouts.mixed, TestUser.SPACE_ADMIN)).ids.sort()
    ).toEqual([ids.A1a, ids.B, ids.B1].sort());
    const asMember = await renderedIdsFor(
      callouts.mixed,
      TestUser.SPACE_MEMBER
    );
    expect(
      asMember,
      'member of A only must see A1a and be told something is hidden'
    ).toEqual({ ids: [ids.A1a], hidden: true });
    expect(
      (await renderedIdsFor(callouts.mixed, TestUser.SPACE_ADMIN)).ids,
      'B2 is not selected anywhere yet; its existence must not surface'
    ).not.toContain(ids.B2);
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    // `deleteFixtureTree` throws by design when any delete fails; the host
    // space and the scenario organisation must still go.
    try {
      await deleteFixtureTree(extra, async id =>
        adminGql(
          'mutation($d: DeleteSpaceInput!){ deleteSpace(deleteData: $d) { id } }',
          { d: { ID: id } }
        )
      );
    } finally {
      if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario);
    }
  });

  test('US5-AS1 — the picker lists the whole account with level + path, badges the host and its tree, withholds C, searches, clears with Escape; the saved pick renders exactly B, B1 and A1a', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await openEdit(page, NAMES.pick);
    const sw = dialog(page).getByRole('switch', { name: COPY.manualSwitch });
    await sw.click();
    await expect(sw).toBeChecked();
    await expect(
      dialog(page).getByText(COPY.chipsEmpty, { exact: true })
    ).toBeVisible();

    // Empty query: everything the admin can read, with level and ancestor path (US3-AS1/AS2).
    const host = row(page, NAMES.A, COPY.level.space);
    await expect(host).toBeVisible({ timeout: 15_000 });
    await expect(host.getByText(COPY.hostBadge, { exact: true })).toBeVisible();
    await expect(
      row(page, NAMES.A1, COPY.path(COPY.level.subspace, NAMES.A))
    ).toBeVisible();
    await expect(
      row(page, NAMES.A1, COPY.path(COPY.level.subspace, NAMES.A)).getByText(
        COPY.inHostTree,
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      row(
        page,
        NAMES.A1a,
        COPY.path(COPY.level.subsubspace, `${NAMES.A} › ${NAMES.A1}`)
      )
    ).toBeVisible();
    await expect(row(page, NAMES.B, COPY.level.space)).toBeVisible();
    await expect(
      row(page, NAMES.B, COPY.level.space).getByText(COPY.inHostTree, {
        exact: true,
      })
    ).toHaveCount(0);
    await expect(
      row(page, NAMES.B1, COPY.path(COPY.level.subspace, NAMES.B))
    ).toBeVisible();
    // C is in the account but the admin cannot read it: never offered (US2-AS7).
    await expect(dialog(page).getByText(NAMES.C)).toHaveCount(0);

    // Search narrows to name matches (US1-AS3); the clear affordance restores the full list (US3-AS6).
    const search = dialog(page).getByRole('textbox', { name: COPY.search });
    await search.fill('sibling B');
    await expect(row(page, NAMES.B, COPY.level.space)).toBeVisible();
    await expect(row(page, NAMES.A1a)).toHaveCount(0);
    await dialog(page)
      .getByRole('button', { name: COPY.clearSearch, exact: true })
      .click();
    await expect(search).toHaveValue('');
    await expect(row(page, NAMES.A1a)).toBeVisible();

    // Pick B, B1 (its name clashes with A1 → chip carries "in B"), A1a (US3-AS4/AS5).
    await row(page, NAMES.B, COPY.level.space).click();
    await row(page, NAMES.B1, COPY.path(COPY.level.subspace, NAMES.B)).click();
    await row(page, NAMES.A1a).click();
    await expect(chip(page, `Remove ${NAMES.B}`)).toBeVisible();
    await expect(chip(page, `Remove ${NAMES.B1}, in ${NAMES.B}`)).toBeVisible();
    await expect(chip(page, `Remove ${NAMES.A1a}`)).toBeVisible();
    await expect(
      dialog(page).getByText(COPY.selected(3), { exact: true })
    ).toBeVisible();
    await expect(
      dialog(page).getByRole('button', {
        name: COPY.clearSelection,
        exact: true,
      })
    ).toBeVisible();

    await dialog(page)
      .getByRole('button', { name: COPY.save, exact: true })
      .click();
    await expect(
      dialog(page).getByRole('switch', { name: COPY.manualSwitch })
    ).toHaveCount(0, { timeout: 15_000 });
    expect(await selectionOf(callouts.pick)).toEqual({
      mode: 'CUSTOM',
      selectedIds: expect.arrayContaining([ids.B, ids.B1, ids.A1a]),
    });
    expect((await selectionOf(callouts.pick)).selectedIds).toHaveLength(3);

    // The post renders exactly the pick: the admin's own direct subspace A1 is NOT there (US1-AS1).
    const block = await openSpace(page, NAMES.pick);
    await findArticleByName(block, NAMES.B);
    await findArticleByName(block, NAMES.A1a);
    // B1 and A1 share a name: B1's card is the one that is not A1 — count the shared heading once.
    await expect(
      block
        .locator('article')
        .filter({
          has: page.getByRole('heading', { name: NAMES.B1, exact: true }),
        })
    ).toHaveCount(1);
    await expect(block.locator('article')).toHaveCount(3);
    await expect(block.getByText(COPY.notice, { exact: true })).toHaveCount(0);
  });

  test("US5-AS1b — the host space's own row is disabled and cannot be picked (US1-AS4)", async ({
    page,
  }) => {
    // KNOWN DEFECT, product: the host row carries the badge but stays enabled;
    // a click selects the host itself (chip + "4 spaces selected", save
    // succeeds). Observed 2026-10-19 on develop (client-web 17c1aa6d3).
    test.skip(
      true,
      'alkem-io/client-web#10439: the host row in the Spaces picker is not disabled and can be picked (084 US1-AS4)'
    );
    test.setTimeout(120_000);
    await openEdit(page, NAMES.mixed);
    const host = row(page, NAMES.A, COPY.level.space);
    await expect(host).toBeVisible({ timeout: 15_000 });
    await expect(host.getByText(COPY.hostBadge, { exact: true })).toBeVisible();
    // Behaviour first (can the host be picked?), then the control's state.
    await host.click({ force: true });
    await expect(
      dialog(page).getByText(COPY.selected(3), { exact: true })
    ).toBeVisible();
    await expect(chip(page, `Remove ${NAMES.A}`)).toHaveCount(0);
    await expect(host).toBeDisabled();
  });

  test('US5-AS1c — Escape in a non-empty search box clears the query and keeps the editor open (US3-AS6)', async ({
    page,
  }) => {
    // KNOWN DEFECT, product: with the editor opened from the post's detail
    // dialog, Escape closes the Edit Post dialog (or raises "Discard your
    // changes?") instead of clearing the query. Observed 2026-10-19 on develop.
    test.skip(
      true,
      'alkem-io/client-web#10440: Escape in the Spaces picker search closes the Edit Post dialog instead of clearing the query (084 US3-AS6)'
    );
    test.setTimeout(120_000);
    await openEdit(page, NAMES.mixed);
    const search = dialog(page).getByRole('textbox', { name: COPY.search });
    await expect(row(page, NAMES.A1a)).toBeVisible({ timeout: 15_000 });
    await search.fill('sibling B');
    await expect(row(page, NAMES.A1a)).toHaveCount(0);
    await search.press('Escape');
    // The editor must survive: no "discard changes?" prompt, the picker still there, the query gone.
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(search).toBeVisible();
    await expect(search).toHaveValue('');
    await expect(row(page, NAMES.A1a)).toBeVisible();
  });

  test("US5-AS2 — a new subspace anywhere in the account does not change a manual post (US1-AS2); AUTO keeps the host's own subspaces only (AC8)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const newId = (
      await createL1(
        ids.B,
        `Late arrival ${uid}`,
        shortId('acctlate'),
        SpacePrivacyMode.Public
      )
    ).id;
    extra.subspaceIds.unshift(newId);

    const pick = await openSpace(page, NAMES.pick);
    await findArticleByName(pick, NAMES.B);
    await expect(pick.locator('article')).toHaveCount(3);
    await expect(pick.getByText(`Late arrival ${uid}`)).toHaveCount(0);

    const auto = await revealPost(page, NAMES.auto);
    await findArticleByName(auto, NAMES.A1);
    await expect(auto.locator('article')).toHaveCount(1);
    await expect(auto.getByText(COPY.notice, { exact: true })).toHaveCount(0);
  });

  test('US5-AS3 — the host admin sees all three cards of the mixed post and no notice (US2-AS1/AS4)', async ({
    page,
  }) => {
    const block = await openSpace(page, NAMES.mixed);
    await findArticleByName(block, NAMES.B);
    await expect(block.locator('article')).toHaveCount(3);
    await expect(block.getByText(COPY.notice, { exact: true })).toHaveCount(0);
  });

  test("US5-AS4 — a member of A only sees A1a's card plus the notice, which names nothing (US2-AS2); the stored ids are not served to them", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    await viewAs(browser, MEMBER, async page => {
      const block = await openSpace(page, NAMES.mixed);
      await findArticleByName(block, NAMES.A1a);
      await expect(block.locator('article')).toHaveCount(1);
      await expect(block.getByText(COPY.notice, { exact: true })).toBeVisible();
      await expect(block.getByText(NAMES.B, { exact: true })).toHaveCount(0);
      await expect(
        block.getByRole('link', { name: /not shown|access/i })
      ).toHaveCount(0);
    });
    // SEC-084-CW-01: a viewer without UPDATE cannot diff selectedIds against the cards.
    const token = await getUserToken(MEMBER);
    const res = await fetch(
      process.env.ALKEMIO_SERVER ||
        `${baseUrl}/api/private/non-interactive/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query:
            'query($id: UUID!){ lookup { callout(ID: $id) { settings { framing { selection { mode selectedIds } } } } } }',
          variables: { id: callouts.mixed },
        }),
      }
    );
    const body = await res.json();
    // The server redacts the LIST only (`selectedIds: []`) and keeps `mode`, so
    // the mode is the positive anchor: a failed or empty read cannot pass.
    expect(
      body.errors,
      `member API read: ${JSON.stringify(body).slice(0, 300)}`
    ).toBeUndefined();
    expect(body.data.lookup.callout.settings.framing.selection).toEqual({
      mode: 'CUSTOM',
      selectedIds: [],
    });
  });

  test('US5-AS5 — an anonymous visitor on the withheld-only post gets no cards, the empty state and the notice (US2-AS3)', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    // Server half first, as the anonymous actor: the flag must be raised and
    // the list empty, so a missing notice is the client's and not the server's.
    const anon = await fetch(`${baseUrl}/api/public/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'query($id: UUID!){ lookup { callout(ID: $id) { hasHiddenSpaces framing { subspaces { id } } } } }',
        variables: { id: callouts.withheld },
      }),
    });
    const anonBody = await anon.json();
    expect(
      anonBody.data?.lookup?.callout,
      `anonymous API read: ${JSON.stringify(anonBody).slice(0, 300)}`
    ).toEqual({
      hasHiddenSpaces: true,
      framing: { subspaces: [] },
    });
    await viewAs(browser, null, async page => {
      const block = await openSpace(page, NAMES.withheld);
      // Positive control that this context really is anonymous.
      await expect(
        page.getByRole('link', { name: /sign in|log in/i }).first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(block.getByText(COPY.notice, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(block.locator('article')).toHaveCount(0);
      await expect(block.getByText(NAMES.B, { exact: true })).toHaveCount(0);
    });
  });

  test('US5-AS6 — membership of a private sibling does not reach its private subspace: B2 is withheld until the admin joins B2, then offered, saved, rendered to the admin and hidden (with the notice) from a member of A only', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    // Server half first: the picker's candidate query, as the admin, before the membership change.
    const candidates = async (): Promise<string[]> => {
      const token = await getUserToken(ADMIN);
      const res = await fetch(
        process.env.ALKEMIO_SERVER ||
          `${baseUrl}/api/private/non-interactive/graphql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query:
              'query($id: UUID!){ lookup { space(ID: $id) { accountSpaces { id } } } }',
            variables: { id: ids.A },
          }),
        }
      );
      const body = await res.json();
      expect(
        body.errors,
        `accountSpaces as the admin: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`
      ).toBeUndefined();
      return body.data.lookup.space.accountSpaces.map(
        (s: { id: string }) => s.id
      );
    };
    const before = await candidates();
    expect(before, 'member of B → B and public B1 are candidates').toEqual(
      expect.arrayContaining([ids.B, ids.B1])
    );
    expect(
      before,
      'member of B only → private B2 is not a candidate'
    ).not.toContain(ids.B2);

    // Browser: B's tree lists B and B1, and nothing of B2.
    await openEdit(page, NAMES.priv);
    const sw = dialog(page).getByRole('switch', { name: COPY.manualSwitch });
    await sw.click();
    await expect(sw).toBeChecked();
    await expect(row(page, NAMES.B, COPY.level.space)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      row(page, NAMES.B1, COPY.path(COPY.level.subspace, NAMES.B))
    ).toBeVisible();
    await expect(dialog(page).getByText(NAMES.B2)).toHaveCount(0);
    const search = dialog(page).getByRole('textbox', { name: COPY.search });
    await search.fill('Closed B2');
    await expect(row(page, NAMES.B, COPY.level.space)).toHaveCount(0);
    await expect(dialog(page).getByText(NAMES.B2)).toHaveCount(0);

    // The admin joins B2 (global admin assigns the role) → READ on B2.
    const joined = await assignRoleToUser(
      spaceAdminId,
      roleSets.B2,
      RoleName.Member
    );
    if (joined.error)
      throw new Error(`admin member of B2: ${JSON.stringify(joined.error)}`);
    expect(await candidates(), 'member of B2 → B2 is a candidate').toContain(
      ids.B2
    );

    // Fresh editor: B2 is offered with its path under B, picked and saved.
    await openEdit(page, NAMES.priv);
    const sw2 = dialog(page).getByRole('switch', { name: COPY.manualSwitch });
    await sw2.click();
    await expect(sw2).toBeChecked();
    const b2Row = row(page, NAMES.B2, COPY.path(COPY.level.subspace, NAMES.B));
    await expect(b2Row).toBeVisible({ timeout: 15_000 });
    await b2Row.click();
    await expect(chip(page, `Remove ${NAMES.B2}`)).toBeVisible();
    await expect(
      dialog(page).getByText(COPY.selected(1), { exact: true })
    ).toBeVisible();
    await dialog(page)
      .getByRole('button', { name: COPY.save, exact: true })
      .click();
    await expect(
      dialog(page).getByRole('switch', { name: COPY.manualSwitch })
    ).toHaveCount(0, { timeout: 15_000 });
    expect(await selectionOf(callouts.priv)).toEqual({
      mode: 'CUSTOM',
      selectedIds: [ids.B2],
    });

    // Rendering follows READ per viewer: the admin gets B2's card, a member of A only gets the notice.
    expect(await renderedIdsFor(callouts.priv, TestUser.SPACE_ADMIN)).toEqual({
      ids: [ids.B2],
      hidden: false,
    });
    expect(await renderedIdsFor(callouts.priv, TestUser.SPACE_MEMBER)).toEqual({
      ids: [],
      hidden: true,
    });
    const block = await openSpace(page, NAMES.priv);
    await findArticleByName(block, NAMES.B2);
    await expect(block.locator('article')).toHaveCount(1);
    await expect(block.getByText(COPY.notice, { exact: true })).toHaveCount(0);
    await viewAs(browser, MEMBER, async memberPage => {
      const memberBlock = await openSpace(memberPage, NAMES.priv);
      await expect(
        memberBlock.getByText(COPY.notice, { exact: true })
      ).toBeVisible({ timeout: 20_000 });
      await expect(memberBlock.locator('article')).toHaveCount(0);
      await expect(
        memberBlock.getByText(NAMES.B2, { exact: true })
      ).toHaveCount(0);
    });
  });

  test('US5-AS7 — viewer matrix on a post selecting {A1, A2, B, B1, B2}: an admin of both L0s reads every private (sub)space, everyone else gets exactly what READ allows plus the notice, and no viewer gets an error', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    // A2: PRIVATE under the public host. Created last so the AUTO/pick counts
    // of the earlier cases are untouched (serial describe).
    ids.A2 = (
      await createL1(
        ids.A,
        NAMES.A2,
        shortId('accta2'),
        SpacePrivacyMode.Private
      )
    ).id;
    extra.subspaceIds.unshift(ids.A2);
    // Roles: BOTH_ADMIN administers A and B (admin of an L0 reads its private
    // subspaces through the cascading admin rule); B_MEMBER is a member of B only.
    for (const rs of [scenario!.space.community.roleSetId, roleSets.B]) {
      await grantRole(BOTH_ADMIN, rs, RoleName.Member);
      await grantRole(BOTH_ADMIN, rs, RoleName.Admin);
    }
    await grantRole(B_MEMBER, roleSets.B, RoleName.Member);
    const all = [ids.A1, ids.A2, ids.B, ids.B1, ids.B2];
    callouts.matrix = await createSpacesPost(NAMES.matrix, {
      mode: 'CUSTOM',
      selectedIds: all,
    });
    expect((await selectionOf(callouts.matrix)).selectedIds.sort()).toEqual(
      [...all].sort()
    );

    // The expected rows. A1 is public under public A → anyone. B1 is public
    // under PRIVATE B → members of B only. A2 and B2 are private → their own
    // members and their L0's admins.
    const rows: {
      label: string;
      email: string | null;
      as?: TestUser;
      ids: string[];
      hidden: boolean;
    }[] = [
      {
        label: 'admin of A and B',
        email: BOTH_ADMIN,
        as: TestUser.SUBSPACE_ADMIN,
        ids: all,
        hidden: false,
      },
      {
        label: 'member of A only',
        email: MEMBER,
        as: TestUser.SPACE_MEMBER,
        ids: [ids.A1],
        hidden: true,
      },
      {
        label: 'member of B only',
        email: B_MEMBER,
        as: TestUser.SUBSPACE_MEMBER,
        ids: [ids.A1, ids.B, ids.B1],
        hidden: true,
      },
      {
        label: 'registered non-member',
        email: NON_MEMBER,
        as: TestUser.NON_SPACE_MEMBER,
        ids: [ids.A1],
        hidden: true,
      },
      { label: 'anonymous', email: null, ids: [ids.A1], hidden: true },
    ];
    const nameOf = new Map<string, string>([
      [ids.A1, NAMES.A1],
      [ids.A2, NAMES.A2],
      [ids.B, NAMES.B],
      [ids.B1, NAMES.B1],
      [ids.B2, NAMES.B2],
    ]);

    for (const r of rows) {
      // Server half: the per-viewer list and flag, with no GraphQL error.
      if (r.as) {
        expect(await renderedIdsFor(callouts.matrix, r.as), r.label).toEqual({
          ids: expect.arrayContaining(r.ids),
          hidden: r.hidden,
        });
        expect(
          (await renderedIdsFor(callouts.matrix, r.as)).ids,
          r.label
        ).toHaveLength(r.ids.length);
      } else {
        const anon = await fetch(`${baseUrl}/api/public/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query:
              'query($id: UUID!){ lookup { callout(ID: $id) { hasHiddenSpaces framing { subspaces { id } } } } }',
            variables: { id: callouts.matrix },
          }),
        });
        const body = await anon.json();
        expect(
          body.errors,
          `${r.label}: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`
        ).toBeUndefined();
        expect(body.data.lookup.callout.hasHiddenSpaces, r.label).toBe(
          r.hidden
        );
        expect(
          body.data.lookup.callout.framing.subspaces.map(
            (x: { id: string }) => x.id
          ),
          r.label
        ).toEqual(r.ids);
      }

      // Browser half: exactly the readable cards, the notice iff something is withheld, no error surface.
      await viewAs(browser, r.email, async page => {
        const block = await openSpace(page, NAMES.matrix);
        await expect(block.locator('article'), r.label).toHaveCount(
          r.ids.length,
          { timeout: 20_000 }
        );
        // A1 and B1 share a name: count headings per distinct name.
        const expectedNames = r.ids.map(id => nameOf.get(id)!);
        for (const name of new Set(expectedNames)) {
          await expect(
            block.getByRole('heading', { name, exact: true }),
            `${r.label}: ${name}`
          ).toHaveCount(expectedNames.filter(n => n === name).length);
        }
        for (const [id, name] of nameOf) {
          if (!r.ids.includes(id) && !expectedNames.includes(name)) {
            await expect(
              block.getByText(name, { exact: true }),
              `${r.label} must not see ${name}`
            ).toHaveCount(0);
          }
        }
        if (r.hidden)
          await expect(
            block.getByText(COPY.notice, { exact: true }),
            r.label
          ).toBeVisible();
        else
          await expect(
            block.getByText(COPY.notice, { exact: true }),
            r.label
          ).toHaveCount(0);
        await expect(
          page.getByText(/something went wrong|unexpected error/i),
          r.label
        ).toHaveCount(0);
      });
    }
  });
});
