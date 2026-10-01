import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { GraphQLClient } from 'graphql-request';
import {
  deleteOrganization,
  deleteSpace,
  getGraphqlClient,
  testConfiguration,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CalendarEventType,
  SidebarWidget,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { ensurePersonaState } from '../fixtures/authenticated-session.fixture';
import { deleteFixtureTree } from '../subspaces-callout/subspaces-callout.helpers';

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** Admin-facing widget names (Space Settings > Layout), en locale. */
export const WIDGET_LABEL: Record<SidebarWidget, string> = {
  [SidebarWidget.Intent]: 'Intention & Leads',
  [SidebarWidget.About]: 'About this Space',
  [SidebarWidget.CreatePost]: 'Add Post',
  [SidebarWidget.ApplicationButton]: 'Apply / Join',
  [SidebarWidget.CreateSubspace]: 'Create Subspace',
  [SidebarWidget.SubspaceLinks]: 'Subspaces',
  [SidebarWidget.Events]: 'Upcoming Events',
  [SidebarWidget.Updates]: 'Latest Update',
  [SidebarWidget.ContactLeads]: 'Contact Leads',
  [SidebarWidget.AddUser]: 'Invite',
  [SidebarWidget.VirtualContributors]: 'Virtual Contributors',
  [SidebarWidget.Guidelines]: 'Community Guidelines',
  [SidebarWidget.Index]: 'Post Index',
  [SidebarWidget.Search]: 'Search',
};

/**
 * FR-009 positional defaults of an L0 Space created from the platform default template
 * (Home, Community, Subspaces, then every 4th+ or added tab), with SEARCH placed by the
 * 055 rule. Same oracle as `server-api/.../space-templates.it-spec.ts`.
 */
export const L0_DEFAULT_SIDEBARS: SidebarWidget[][] = [
  [
    SidebarWidget.Intent,
    SidebarWidget.About,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
    SidebarWidget.SubspaceLinks,
    SidebarWidget.Events,
    SidebarWidget.Updates,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
    SidebarWidget.ContactLeads,
    SidebarWidget.AddUser,
    SidebarWidget.VirtualContributors,
    SidebarWidget.Guidelines,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreateSubspace,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreatePost,
    SidebarWidget.ApplicationButton,
    SidebarWidget.Search,
    SidebarWidget.Index,
  ],
];
export const GENERIC_DEFAULT_SIDEBAR = L0_DEFAULT_SIDEBARS[3];
export const TAB_NAMES = ['Home', 'Community', 'Subspaces', 'Knowledge'];

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

export type SidebarFixture = {
  scenario: OrganizationWithSpaceModel;
  spaceUrl: string;
  subspaceName: string;
  eventTitle: string;
  updateText: string;
  guidelinesTitle: string;
};

/**
 * Seeds the walk's Space through the API: an L0 Space from the platform default template
 * (four tabs with their FR-009 lists), one subspace (feeds Subspaces), one future event
 * (Upcoming Events), one community update (Latest Update) and filled guidelines. Space admin
 * and lead: `spaceAdmin`; plain member: `spaceMember`. The UI is reserved for what is under
 * test.
 */
export async function seedSidebarSpace(name: string): Promise<SidebarFixture> {
  const runId = UniqueIDGenerator.getID();
  const subspaceName = `Sub One ${runId}`;
  const scenario = await TestScenarioFactory.createBaseScenario({
    name,
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        leads: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      subspace: { about: { profile: { displayName: subspaceName } } },
    },
  });
  const fixture: SidebarFixture = {
    scenario,
    spaceUrl: `${baseUrl}/${scenario.space.nameId}`,
    subspaceName,
    eventTitle: `Kickoff Call ${runId}`,
    updateText: `First milestone shipped ${runId}`,
    guidelinesTitle: `Guidelines ${runId}`,
  };
  const gql = getGraphqlClient();

  const calendar = ok(
    await graphqlErrorWrapper(
      (t: string | undefined) =>
        gql.GetSpaceCalendarId({ spaceId: scenario.space.id }, bearer(t)),
      TestUser.GLOBAL_ADMIN
    ),
    'GetSpaceCalendarId'
  );
  const calendarID = calendar.lookup.space?.collaboration.timeline.calendar.id;
  if (!calendarID) {
    throw new Error(
      `GetSpaceCalendarId returned no calendar for space ${scenario.space.id}`
    );
  }
  ok(
    await graphqlErrorWrapper(
      (t: string | undefined) =>
        gql.CreateCalendarEventOnCalendar(
          {
            eventData: {
              calendarID,
              profileData: { displayName: fixture.eventTitle },
              startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
              durationMinutes: 60,
              multipleDays: false,
              wholeDay: false,
              type: CalendarEventType.Meeting,
              visibleOnParentCalendar: true,
            },
          },
          bearer(t)
        ),
      TestUser.GLOBAL_ADMIN
    ),
    'CreateCalendarEventOnCalendar'
  );
  ok(
    await graphqlErrorWrapper(
      (t: string | undefined) =>
        gql.SendMessageToRoom(
          {
            messageData: {
              roomID: scenario.space.communication.updatesId,
              message: fixture.updateText,
            },
          },
          bearer(t)
        ),
      TestUser.GLOBAL_ADMIN
    ),
    'SendMessageToRoom (community update)'
  );
  const about = ok(
    await graphqlErrorWrapper(
      (t: string | undefined) =>
        rawClient.rawRequest<{
          lookup: { space: { about: { guidelines: { id: string } } } };
        }>(
          `query SidebarGuidelinesId($spaceId: UUID!) {
            lookup { space(ID: $spaceId) { about { guidelines { id } } } }
          }`,
          { spaceId: scenario.space.id },
          bearer(t)
        ),
      TestUser.GLOBAL_ADMIN
    ),
    'guidelines lookup'
  );
  ok(
    await graphqlErrorWrapper(
      (t: string | undefined) =>
        rawClient.rawRequest(
          `mutation SidebarGuidelines($data: UpdateCommunityGuidelinesEntityInput!) {
            updateCommunityGuidelines(communityGuidelinesData: $data) { id }
          }`,
          {
            data: {
              communityGuidelinesID: about.lookup.space.about.guidelines.id,
              profile: {
                displayName: fixture.guidelinesTitle,
                description: 'Be respectful and collaborative.',
              },
            },
          },
          bearer(t)
        ),
      TestUser.GLOBAL_ADMIN
    ),
    'updateCommunityGuidelines'
  );
  return fixture;
}

/**
 * Deletes the subspace, then the Space, then the scenario organization, and throws listing
 * anything left behind. A Space that still has a subspace cannot be deleted, and a swallowed
 * failure here leaks a Space per run until the hosting account hits its capacity.
 */
export async function teardownSidebarSpace(
  scenario: OrganizationWithSpaceModel | undefined
): Promise<void> {
  if (!scenario) return;
  const throwing = async (id: string) => {
    const res = await deleteSpace(id);
    if (res.error) throw new Error(JSON.stringify(res.error));
  };
  const failures: string[] = [];
  try {
    await deleteFixtureTree(
      { spaceId: scenario.space.id, subspaceIds: [scenario.subspace.id] },
      throwing
    );
  } catch (error) {
    failures.push(String(error));
  }
  const org = await deleteOrganization(scenario.organization.id);
  if (org.error) failures.push(`organization: ${JSON.stringify(org.error)}`);
  if (failures.length > 0) {
    throw new Error(`sidebar fixture teardown failed:\n${failures.join('\n')}`);
  }
}

/** One isolated, already-authenticated browser context per persona. */
export async function openPersona(
  browser: Browser,
  email: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: await ensurePersonaState(browser, email),
    viewport: { width: 1920, height: 1080 },
  });
  return { context, page: await context.newPage() };
}

/** Reads a Space's flow states in tab order as the given persona. */
export async function readStates(spaceId: string) {
  const res = await graphqlErrorWrapper(
    (t: string | undefined) =>
      getGraphqlClient().GetInnovationFlowStatesWithIds({ spaceId }, bearer(t)),
    TestUser.GLOBAL_ADMIN
  );
  const flow = ok(res, 'GetInnovationFlowStatesWithIds').lookup.space
    ?.collaboration.innovationFlow;
  return [...(flow?.states ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The visible Space sidebar (the mobile drawer copy is display:none at desktop width). */
export const spaceSidebar = (page: Page) =>
  page.getByRole('navigation', { name: 'Space sidebar' });

/** Member-visible widget locators inside the sidebar, by role and accessible name. */
export const widgets = (sidebar: Locator) => ({
  intent: sidebar.getByText(/^Space Leads?$/),
  about: sidebar.getByRole('button', { name: 'About this Space' }),
  createPost: sidebar.getByRole('button', { name: 'Add Post' }),
  createSubspace: sidebar.getByRole('button', { name: 'Create Subspace' }),
  search: sidebar.getByRole('searchbox', { name: 'Search posts' }),
  subspaceLinks: sidebar.getByRole('heading', {
    name: 'Subspaces',
    exact: true,
  }),
  events: sidebar.getByRole('heading', { name: 'Events', exact: true }),
  updates: sidebar.getByRole('heading', { name: 'Updates', exact: true }),
  contactLeads: sidebar.getByRole('button', { name: 'Contact Leads' }),
  addUser: sidebar.getByRole('button', { name: 'Invite', exact: true }),
  virtualContributors: sidebar.getByRole('heading', {
    name: 'Virtual Contributors',
  }),
  index: sidebar.getByRole('button', { name: 'Post Index' }),
});

/** Opens a tab through the Space's own tab bar. */
export async function openTab(page: Page, spaceUrl: string, tabName: string) {
  const onSpacePage = new RegExp(
    `^${spaceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?(\\?tab=\\d+)?$`
  ).test(page.url());
  if (!onSpacePage) await page.goto(spaceUrl);
  await page
    .getByRole('navigation', { name: 'Space navigation tabs' })
    .getByRole('tab', { name: tabName, exact: true })
    .click();
  await expect(
    page
      .getByRole('navigation', { name: 'Space navigation tabs' })
      .getByRole('tab', { name: tabName, exact: true })
  ).toHaveAttribute('aria-selected', 'true');
}

/** Asserts the locators are each visible and appear in this document order. */
export async function expectInDocumentOrder(locators: Locator[]) {
  for (const locator of locators) await expect(locator).toBeVisible();
  for (let i = 0; i < locators.length - 1; i++) {
    const follows = await locators[i].evaluate(
      (a, b) =>
        !!(
          a.compareDocumentPosition(b as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      await locators[i + 1].elementHandle()
    );
    expect(follows, `${locators[i]} must precede ${locators[i + 1]}`).toBe(
      true
    );
  }
}

/** Opens the per-phase Layout dialog of one column on Space Settings > Layout. */
export async function openLayoutDialog(
  page: Page,
  spaceUrl: string,
  tabName: string
): Promise<Locator> {
  await page.goto(`${spaceUrl}/settings/layout`);
  await page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByTitle(tabName, { exact: true }) })
    .getByRole('button', { name: 'Column actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Layout' }).click();
  const dialog = page.getByRole('dialog', { name: `Layout: ${tabName}` });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Accessible names of the selected (reorderable) widgets, in their dialog order. */
export async function selectedWidgetLabels(dialog: Locator): Promise<string[]> {
  const names = await dialog
    .getByRole('button', { name: /^Reorder / })
    .evaluateAll(els => els.map(el => el.getAttribute('aria-label') ?? ''));
  return names.map(name => name.replace(/^Reorder /, ''));
}

export const labelsOf = (list: SidebarWidget[]) =>
  list.map(widget => WIDGET_LABEL[widget]);
