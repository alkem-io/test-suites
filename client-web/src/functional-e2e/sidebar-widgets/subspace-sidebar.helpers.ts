// workspace#086 (client-web#10350): shared seeding, teardown, API reads/writes and locators
// for the subspace sidebar walks (subspace-*.spec.ts). The sidebar of an L1/L2 is the stored
// list of its FIRST phase (lowest sortOrder, ties by id); Customize Sidebar edits that list.
import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { GraphQLClient } from 'graphql-request';
import {
  assignRoleToUser,
  createSubspace,
  deleteOrganization,
  deleteSpace,
  testConfiguration,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
  updateSpaceSettings,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  RoleName,
  SidebarWidget,
  SpacePrivacyMode,
  type CommunityMembershipPolicy,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteFixtureTree } from '../subspaces-callout/subspaces-callout.helpers';
import { grantCookieConsent } from '../helpers/cookies.helper';
import { baseUrl, WIDGET_LABEL } from './sidebar-widgets.helpers';

export { baseUrl, WIDGET_LABEL };

const rawClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);
const bearer = (authToken: string | undefined) =>
  authToken ? { authorization: `Bearer ${authToken}` } : undefined;

/** Fail the walk with the GraphQL errors instead of carrying on with half a fixture. */
function ok<T>(
  res: { data?: T; error?: { errors: unknown[] } },
  what: string
): T {
  if (res.error || !res.data) {
    throw new Error(`${what} failed: ${JSON.stringify(res.error)}`);
  }
  return res.data;
}

/** A raw GraphQL document as the given persona, failing loudly on any error. */
export async function rawGql<T>(
  document: string,
  variables: Record<string, unknown>,
  role: TestUser = TestUser.GLOBAL_ADMIN
): Promise<T> {
  const res = await graphqlErrorWrapper(
    (t: string | undefined) =>
      rawClient.rawRequest<T>(document, variables, bearer(t)),
    role
  );
  return ok(res, document.trim().split('\n')[0]);
}

// ---------------------------------------------------------------------------
// Vocabulary and defaults (spec 086 FR-009 positional lists, server#6683)
// ---------------------------------------------------------------------------

/** The platform subspace template's first-phase list — the sidebar of a fresh L1/L2. */
export const SUBSPACE_DEFAULT_SIDEBAR: SidebarWidget[] = [
  SidebarWidget.Intent,
  SidebarWidget.About,
  SidebarWidget.CreatePost,
  SidebarWidget.Community,
  SidebarWidget.Events,
  SidebarWidget.Activity,
  SidebarWidget.Index,
  SidebarWidget.SubspaceLinks,
  SidebarWidget.VirtualContributors,
  SidebarWidget.Updates,
];

/** The generic default list every added phase gets (position 4+ of any flow). */
export const GENERIC_SIDEBAR: SidebarWidget[] = [
  SidebarWidget.Intent,
  SidebarWidget.CreatePost,
  SidebarWidget.ApplicationButton,
  SidebarWidget.Search,
  SidebarWidget.Index,
];

/** The 13 widgets the subspace Customize Sidebar dialog offers on an L1 (11 on an L2). */
export const L1_VOCABULARY: SidebarWidget[] = [
  SidebarWidget.Intent,
  SidebarWidget.About,
  SidebarWidget.CreatePost,
  SidebarWidget.AddUser,
  SidebarWidget.CreateSubspace,
  SidebarWidget.Search,
  SidebarWidget.SubspaceLinks,
  SidebarWidget.Community,
  SidebarWidget.Events,
  SidebarWidget.Index,
  SidebarWidget.Updates,
  SidebarWidget.VirtualContributors,
  SidebarWidget.Activity,
];
export const L2_ONLY_HIDDEN: SidebarWidget[] = [
  SidebarWidget.CreateSubspace,
  SidebarWidget.SubspaceLinks,
];

export const labelsOf = (list: SidebarWidget[]) =>
  list.map(widget => WIDGET_LABEL[widget]);

/** The phase names of an L1/L2 created from the platform subspace template, in order. */
export const TEMPLATE_PHASES = [
  'Explore',
  'Define',
  'Brainstorm',
  'Validate',
  'Evaluate',
];

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

export type SubspaceRef = {
  id: string;
  nameId: string;
  url: string;
  roleSetId: string;
};

export type SubspaceFixture = {
  runId: string;
  scenario: OrganizationWithSpaceModel;
  l0Url: string;
  /** L1 created from the platform subspace template, untouched lists. */
  alpha: SubspaceRef;
  /** L2 under Alpha, untouched lists. */
  alpha2: SubspaceRef;
  /** Every space id to delete, children first; grows as a spec adds spaces. */
  cleanupIds: string[];
};

const spaceRefDocument = `query SubspaceSidebarSpaceRef($id: UUID!) {
  lookup { space(ID: $id) { id nameID community { roleSet { id } } } }
}`;
type SpaceRefData = {
  lookup: {
    space: {
      id: string;
      nameID: string;
      community: { roleSet: { id: string } };
    };
  };
};

async function spaceRef(id: string, url: string): Promise<SubspaceRef> {
  const data = await rawGql<SpaceRefData>(spaceRefDocument, { id });
  return {
    id,
    nameId: data.lookup.space.nameID,
    url,
    roleSetId: data.lookup.space.community.roleSet.id,
  };
}

/**
 * Seeds a PUBLIC L0 Space, an L1 "Alpha" from the platform subspace template and an L2
 * "Alpha-2" under it, through the API. `spaceAdmin` administers all three (L0 admin and lead,
 * explicit admin on Alpha and Alpha-2); `spaceMember` is a plain member of all three. Alpha's
 * members may NOT create subspaces (the platform template allows it, which would hand the
 * member CREATE_SUBSPACE and make the Create Subspace gate pass for the wrong reason).
 * The UI is reserved for what is under test.
 */
export async function seedSubspaceFixture(
  name: string
): Promise<SubspaceFixture> {
  const runId = UniqueIDGenerator.getID();
  const scenario = await TestScenarioFactory.createBaseScenario({
    name,
    space: {
      collaboration: { addTutorialCallouts: false },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        leads: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      subspace: {
        about: { profile: { displayName: `Alpha ${runId}` } },
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
        },
      },
    },
  });
  const cleanupIds: string[] = [scenario.subspace.id, scenario.space.id];
  const l0Url = `${baseUrl}/${scenario.space.nameId}`;
  const fixture: SubspaceFixture = {
    runId,
    scenario,
    l0Url,
    alpha: await spaceRef(
      scenario.subspace.id,
      `${l0Url}/challenges/${scenario.subspace.nameId}`
    ),
    alpha2: { id: '', nameId: '', url: '', roleSetId: '' },
    cleanupIds,
  };
  try {
    await pinMembersCannotCreateSubspaces(fixture.alpha.id);
    fixture.alpha2 = await addL2(fixture, 'Alpha-2');
  } catch (error) {
    await teardownSubspaceFixture(fixture).catch(() => undefined);
    throw error;
  }
  return fixture;
}

/** Adds an L2 under Alpha with `spaceAdmin` as admin and `spaceMember` as member. */
export async function addL2(
  fixture: SubspaceFixture,
  label: string
): Promise<SubspaceRef> {
  const nameId = `${label.toLowerCase().replace(/[^a-z0-9]/g, '')}${fixture.runId}`;
  const created = ok(
    await createSubspace(`${label} ${fixture.runId}`, nameId, fixture.alpha.id),
    `createSubspace ${label}`
  );
  const id = created.createSubspace.id;
  fixture.cleanupIds.unshift(id);
  const ref = await spaceRef(
    id,
    `${fixture.alpha.url}/opportunities/${nameId}`
  );
  await addMembers(ref.roleSetId);
  return ref;
}

/** Adds a second L1 under the L0 (a donor for the template walks), same personas as Alpha. */
export async function addL1(
  fixture: SubspaceFixture,
  label: string
): Promise<SubspaceRef> {
  const nameId = `${label.toLowerCase().replace(/[^a-z0-9]/g, '')}${fixture.runId}`;
  const created = ok(
    await createSubspace(
      `${label} ${fixture.runId}`,
      nameId,
      fixture.scenario.space.id
    ),
    `createSubspace ${label}`
  );
  const id = created.createSubspace.id;
  fixture.cleanupIds.unshift(id);
  const ref = await spaceRef(id, `${fixture.l0Url}/challenges/${nameId}`);
  await addMembers(ref.roleSetId);
  return ref;
}

async function addMembers(roleSetId: string) {
  const admin = TestUserManager.users.spaceAdmin.id;
  const member = TestUserManager.users.spaceMember.id;
  for (const [userId, role] of [
    [admin, RoleName.Member],
    [admin, RoleName.Admin],
    [member, RoleName.Member],
  ] as const) {
    ok(
      await assignRoleToUser(userId, roleSetId, role),
      `assignRoleToUser ${role}`
    );
  }
}

const settingsDocument = `query SubspaceSidebarSettings($id: UUID!) {
  lookup { space(ID: $id) { settings {
    privacy { mode allowPlatformSupportAsAdmin }
    membership { policy allowSubspaceAdminsToInviteMembers trustedOrganizations }
    collaboration {
      allowMembersToCreateCallouts allowMembersToCreateSubspaces inheritMembershipRights
      allowEventsFromSubspaces allowMembersToVideoCall allowGuestContributions
    }
  } } }
}`;
type SettingsData = {
  lookup: {
    space: {
      settings: {
        privacy: {
          mode: SpacePrivacyMode;
          allowPlatformSupportAsAdmin: boolean;
        };
        membership: {
          policy: CommunityMembershipPolicy;
          allowSubspaceAdminsToInviteMembers: boolean;
          trustedOrganizations: string[];
        };
        collaboration: {
          allowMembersToCreateCallouts: boolean;
          allowMembersToCreateSubspaces: boolean;
          inheritMembershipRights: boolean;
          allowEventsFromSubspaces: boolean;
          allowMembersToVideoCall: boolean;
          allowGuestContributions: boolean;
        };
      };
    };
  };
};

/**
 * Sets allowMembersToCreateSubspaces=false, sending every other stored setting back
 * unchanged: the lib's updateSpaceSettings fills each omitted field with its own default
 * (membership policy OPEN, allowMembersToCreateCallouts false, …) and the server stores the
 * whole block, so a bare override would also take Add Post away from members
 * (docs/qa-knowledge/harness.md). The server re-applies the space's authorization policy in
 * the same request, so the member's CREATE_SUBSPACE is gone when this resolves.
 */
export async function pinMembersCannotCreateSubspaces(
  spaceId: string
): Promise<void> {
  const { settings } = (
    await rawGql<SettingsData>(settingsDocument, { id: spaceId })
  ).lookup.space;
  ok(
    await updateSpaceSettings(spaceId, {
      privacy: settings.privacy,
      membership: settings.membership,
      collaboration: {
        ...settings.collaboration,
        allowMembersToCreateSubspaces: false,
      },
    }),
    'updateSpaceSettings'
  );
}

/** The privileges `role` holds on a space — what gates Create Subspace (CREATE_SUBSPACE) and Invite (UPDATE). */
export async function myPrivileges(
  spaceId: string,
  role: TestUser
): Promise<string[]> {
  const data = await rawGql<{
    lookup: { space: { authorization: { myPrivileges: string[] } } };
  }>(
    'query SubspaceSidebarMyPrivileges($id: UUID!) { lookup { space(ID: $id) { authorization { myPrivileges } } } }',
    { id: spaceId },
    role
  );
  return data.lookup.space.authorization.myPrivileges;
}

/**
 * Deletes every seeded space, children first, then the scenario organization, and throws
 * listing anything left behind. A leaked Space costs account capacity on the shared stack.
 */
export async function teardownSubspaceFixture(
  fixture: SubspaceFixture | undefined
): Promise<void> {
  if (!fixture) return;
  const throwing = async (id: string) => {
    const res = await deleteSpace(id);
    if (res.error) throw new Error(JSON.stringify(res.error));
  };
  const failures: string[] = [];
  const [spaceId, ...rest] = [...fixture.cleanupIds].reverse();
  try {
    await deleteFixtureTree({ spaceId, subspaceIds: rest.reverse() }, throwing);
  } catch (error) {
    failures.push(String(error));
  }
  const org = await deleteOrganization(fixture.scenario.organization.id);
  if (org.error) failures.push(`organization: ${JSON.stringify(org.error)}`);
  if (failures.length > 0) {
    throw new Error(
      `subspace sidebar fixture teardown failed:\n${failures.join('\n')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Flow states over the API
// ---------------------------------------------------------------------------

export type PhaseState = {
  id: string;
  displayName: string;
  sortOrder: number;
  settings: {
    visible: boolean;
    sidebar: SidebarWidget[];
    descriptionDisplayMode: string;
  };
};

/** Lowest sortOrder first, ties broken by id (plain code-unit compare) — the first-state rule. */
export function rankStates<T extends { sortOrder: number; id: string }>(
  states: readonly T[]
): T[] {
  return [...states].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const [x, y] = [a.id.toLowerCase(), b.id.toLowerCase()];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

const phasesDocument = `query SubspaceSidebarPhases($id: UUID!) {
  lookup { space(ID: $id) { collaboration { innovationFlow { id states {
    id displayName sortOrder settings { visible sidebar descriptionDisplayMode } } } } } }
}`;

/** A space's flow id and its phases ranked by the first-state rule. */
export async function readPhases(
  spaceId: string
): Promise<{ flowId: string; phases: PhaseState[] }> {
  const data = await rawGql<{
    lookup: {
      space: {
        collaboration: { innovationFlow: { id: string; states: PhaseState[] } };
      };
    };
  }>(phasesDocument, { id: spaceId });
  const flow = data.lookup.space.collaboration.innovationFlow;
  return { flowId: flow.id, phases: rankStates(flow.states) };
}

/** The first phase's stored list — the subspace sidebar. */
export async function readSidebar(spaceId: string): Promise<SidebarWidget[]> {
  return (await readPhases(spaceId)).phases[0].settings.sidebar;
}

/** Settings-only phase update as the global admin: keys left out keep their stored values. */
export async function updatePhaseSettings(
  stateId: string,
  settings: {
    sidebar?: SidebarWidget[];
    visible?: boolean;
    descriptionDisplayMode?: string;
    showPublishDetails?: boolean;
  }
): Promise<void> {
  await rawGql(
    `mutation SubspaceSidebarPhaseSettings($id: UUID!, $s: UpdateInnovationFlowStateSettingsInput) {
      updateInnovationFlowState(stateData: { innovationFlowStateID: $id, settings: $s }) { id } }`,
    { id: stateId, s: settings }
  );
}

export const setSidebar = (stateId: string, sidebar: SidebarWidget[]) =>
  updatePhaseSettings(stateId, { sidebar });

export async function setPhaseOrder(
  flowId: string,
  stateIds: string[]
): Promise<void> {
  await rawGql(
    `mutation SubspaceSidebarSortOrder($d: UpdateInnovationFlowStatesSortOrderInput!) {
      updateInnovationFlowStatesSortOrder(sortOrderData: $d) { id } }`,
    { d: { innovationFlowID: flowId, stateIDs: stateIds } }
  );
}

/**
 * Puts a subspace back to its seeded state: template phase order, expanded descriptions, a
 * visible first phase carrying the positional default list. Every Customize case starts here,
 * and the file's afterAll calls it too so a red case never cascades into the next file.
 */
export async function restoreSubspaceFlow(spaceId: string): Promise<void> {
  const { flowId, phases } = await readPhases(spaceId);
  const canonical = TEMPLATE_PHASES.map(name =>
    phases.find(p => p.displayName === name)
  );
  if (canonical.every(Boolean)) {
    await setPhaseOrder(
      flowId,
      (canonical as PhaseState[]).map(p => p.id)
    );
  }
  const ranked = (await readPhases(spaceId)).phases;
  for (const phase of ranked) {
    await updatePhaseSettings(phase.id, {
      descriptionDisplayMode: 'EXPANDED',
      showPublishDetails: true,
    });
  }
  await updatePhaseSettings(ranked[0].id, {
    visible: true,
    sidebar: SUBSPACE_DEFAULT_SIDEBAR,
  });
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export { openPersona } from './sidebar-widgets.helpers';

/** A signed-out context at desktop width, cookie consent granted so the banner never covers the page. */
export async function openAnonymous(
  browser: Browser
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await grantCookieConsent(context);
  return { context, page: await context.newPage() };
}

// ---------------------------------------------------------------------------
// Locators — the subspace page
// ---------------------------------------------------------------------------

/** The subspace sidebar (expanded and collapsed rail share the landmark). */
export const subspaceSidebar = (page: Page) =>
  page.getByRole('complementary', { name: 'SubSpace sidebar' });

/**
 * The page's main landmark by id: subspace pages render a nested second <main> (pre-existing
 * markup, also on production), so `getByRole('main')` is ambiguous.
 */
export const mainContent = (page: Page) => page.locator('#crd-main-content');

export const QUICK_ACTIONS = [
  'Community',
  'Events',
  'Recent Activity',
  'Post Index',
] as const;

/** Member-visible widget locators inside a subspace sidebar surface (sidebar or drawer). */
export const subspaceWidgets = (root: Locator) => ({
  about: root.getByRole('button', { name: 'About this Subspace', exact: true }),
  createPost: root.getByRole('button', { name: 'Add Post', exact: true }),
  createSubspace: root.getByRole('button', {
    name: 'Create Subspace',
    exact: true,
  }),
  addUser: root.getByRole('button', { name: 'Invite', exact: true }),
  search: root.getByRole('searchbox', { name: 'Search posts' }),
  quickActions: root.getByRole('navigation', { name: 'Quick Actions' }),
  community: root.getByRole('button', { name: 'Community', exact: true }),
  events: root.getByRole('button', { name: 'Events', exact: true }),
  activity: root.getByRole('button', { name: 'Recent Activity', exact: true }),
  index: root.getByRole('button', { name: 'Post Index', exact: true }),
  subspaceLinks: root.getByRole('heading', { name: 'Subspaces', exact: true }),
  updates: root.getByRole('heading', { name: 'Updates', exact: true }),
  collapse: root.getByRole('button', { name: 'Collapse', exact: true }),
  expand: root.getByRole('button', { name: 'Expand', exact: true }),
});

export const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };
export const PHONE_VIEWPORT = { width: 400, height: 900 };

/** Loads a subspace page at desktop width (a previous case may have left the page at phone width) and waits for its sidebar. */
export async function openSubspace(page: Page, url: string): Promise<void> {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(url);
  await expect(subspaceSidebar(page)).toBeVisible();
}

/** SPA navigation (no document load): a `window` marker set before it survives, which proves "no reload". */
export async function spaNavigate(page: Page, url: string): Promise<void> {
  await page.evaluate(target => {
    const u = new URL(target);
    history.pushState({}, '', u.pathname + u.search);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, url);
}

/** Records the GraphQL mutations the page sends from now on (operation name + variables). */
export function recordMutations(
  page: Page
): { operationName: string; variables: unknown }[] {
  const sent: { operationName: string; variables: unknown }[] = [];
  page.on('request', request => {
    if (request.method() !== 'POST' || !/graphql/.test(request.url())) return;
    const body = request.postDataJSON?.() as {
      query?: string;
      operationName: string;
      variables: unknown;
    } | null;
    if (body && /^\s*mutation/.test(body.query ?? '')) {
      sent.push({
        operationName: body.operationName,
        variables: body.variables,
      });
    }
  });
  return sent;
}

/** Interactive entries of a sidebar surface in DOM order (`TAG:label`), for order and absence checks. */
export function sidebarEntries(surface: Locator): Promise<string[]> {
  return surface.evaluate(el =>
    [...el.querySelectorAll('input,button,a,h3,nav')].map(
      e =>
        `${e.tagName}:${e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.textContent?.trim().slice(0, 40)}`
    )
  );
}

/** Switches the page to a phone viewport, reloads `url` and opens the menu drawer. */
export async function openPhoneDrawer(
  page: Page,
  url: string
): Promise<Locator> {
  await page.setViewportSize(PHONE_VIEWPORT);
  await page.goto(url);
  await page.getByRole('button', { name: 'Open menu' }).click();
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawer).toBeVisible();
  return drawer;
}

/** The accessible names of the phase buttons in the subspace's phase navigation. */
export async function phaseButtonNames(page: Page): Promise<string[]> {
  return page
    .getByRole('navigation', { name: 'Innovation flow phases' })
    .getByRole('button')
    .evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''));
}

// ---------------------------------------------------------------------------
// Locators — subspace Settings › Layout and the Customize Sidebar dialog
// ---------------------------------------------------------------------------

/** Opens Settings › Layout of a subspace at desktop width and waits for its header actions. */
export async function openSettingsLayout(
  page: Page,
  url: string
): Promise<void> {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${url}/settings/layout`);
  await expect(
    page.getByRole('button', { name: 'Add phase', exact: true })
  ).toBeVisible();
}

export async function openCustomizeSidebar(page: Page): Promise<Locator> {
  await page
    .getByRole('button', { name: 'Customize Sidebar', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Layout: Sidebar' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Labels of the checked (reorderable) widgets, in dialog order. */
export function selectedWidgets(dialog: Locator): Promise<string[]> {
  return dialog
    .getByRole('checkbox', { checked: true })
    .evaluateAll(els =>
      els.map(e => (e.getAttribute('aria-label') ?? '').replace('Toggle ', ''))
    );
}

export function unselectedWidgets(dialog: Locator): Promise<string[]> {
  return dialog
    .getByRole('checkbox', { checked: false })
    .evaluateAll(els =>
      els.map(e => (e.getAttribute('aria-label') ?? '').replace('Toggle ', ''))
    );
}

export const toggle = (dialog: Locator, label: string) =>
  dialog.getByRole('checkbox', { name: `Toggle ${label}` });

/** Opens the per-phase Layout dialog of one column on subspace Settings › Layout. */
export async function openPhaseLayoutDialog(
  page: Page,
  phaseName: string
): Promise<Locator> {
  await page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByTitle(phaseName, { exact: true }) })
    .getByRole('button', { name: 'Column actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Layout' }).click();
  const dialog = page.getByRole('dialog', { name: `Layout: ${phaseName}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The phase column titles in their on-page order. */
export function columnOrder(page: Page): Promise<string[]> {
  return mainContent(page)
    .getByText(new RegExp(`^(${TEMPLATE_PHASES.join('|')})$`))
    .allTextContents();
}

// ---------------------------------------------------------------------------
// dnd-kit keyboard drag
// ---------------------------------------------------------------------------

const MAX_KEYBOARD_STEPS = 40; // > the longest list (13 widgets, 5 phases) with room for swallowed presses
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finite animations and CSS transitions still running anywhere on the page. */
const runningTransitions = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          a =>
            a.playState === 'running' &&
            a.effect?.getTiming().iterations !== Infinity
        ).length
  );

/**
 * dnd-kit keyboard drag: Space lifts, `key` is pressed one step at a time until the polite
 * live region announces the item is over `targetId` (sortable ids: a widget id such as
 * `intent` in the Layout dialog, `col:<stateId>` for a phase column), Space drops.
 *
 * The sortable drops a press that arrives in the same tick as the previous one, and while
 * its rows or columns are still sliding it computes the next step from mid-transition rects.
 * So every press waits for the live region to acknowledge the step, then for the slide
 * transition to end — conditions, never a fixed sleep. A press the sortable swallows (it
 * measures its droppables just after pick-up) goes unacknowledged and is re-pressed on the
 * next turn; the bound on presses keeps a stuck drag finite.
 */
export async function keyboardDrag(
  page: Page,
  handle: Locator,
  key: 'ArrowUp' | 'ArrowLeft',
  targetId: string
): Promise<void> {
  const liveRegions = page.locator('[id^="DndLiveRegion"]');
  const announcements = async () =>
    (await liveRegions.allTextContents()).join('|');
  const overTarget = new RegExp(`droppable area ${escapeRegExp(targetId)}\\.$`);
  const idle = await announcements();
  await handle.focus();
  await page.keyboard.press('Space');
  await expect
    .poll(announcements, { message: 'dnd-kit announces the lift' })
    .not.toBe(idle);

  for (let presses = 0; presses < MAX_KEYBOARD_STEPS; presses++) {
    const before = await announcements();
    if (overTarget.test(before)) break;
    await page.keyboard.press(key);
    await expect
      .poll(announcements, { intervals: [50], timeout: 750 })
      .not.toBe(before)
      .catch(() => undefined); // swallowed press: re-press on the next turn
    await expect
      .poll(() => runningTransitions(page), { intervals: [50] })
      .toBe(0);
  }
  expect(
    await announcements(),
    `keyboard drag reaches droppable area ${targetId}`
  ).toMatch(overTarget);

  await page.keyboard.press('Space');
  await expect.poll(announcements).toMatch(/dropped/i);
}
