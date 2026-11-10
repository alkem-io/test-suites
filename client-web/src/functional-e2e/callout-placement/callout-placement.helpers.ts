import { expect, type Locator, type Page } from '@playwright/test';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  CommunityMembershipPolicy,
  createCalloutWithData,
  readCalloutsPlacement,
  readSpaceInnovationFlowStates,
  SpacePrivacyMode,
  TagsetReservedName,
  TestScenarioFactory,
  TestUser,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  contentFeed,
  expectMutationAnswered,
} from '../helpers/space-access.helper';

/**
 * Shared steps for W2 journey 6 (docs/qa/server-rebuild/plan.md § W2): a
 * post's phase, the order of posts, and the post a response belongs to.
 *
 * Vocabulary: a post is a callout, a response is a contribution, a phase is
 * an innovation-flow state (a page tab on an L0 Space). A post's phase is the
 * display name carried by its FLOW_STATE tag; its position is `sortOrder`,
 * ascending, top first. The server creates a new post at `min(sortOrder) - 1`.
 */

/** A PUBLIC + OPEN L0 Space with an admin and a member, nothing seeded in it. */
export const seedPlacementSpace = (
  area: string,
  uid: string
): Promise<OrganizationWithSpaceModel> =>
  TestScenarioFactory.createBaseScenario({
    name: `w2-j6-${area}-${uid}`,
    space: {
      collaboration: {},
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: { policy: CommunityMembershipPolicy.Open },
      },
    },
  });

export type Phase = { id: string; displayName: string };

/**
 * The Space's visible phases in tab order. Call it at the start of every case:
 * FS-2 renames the last one.
 */
export const phases = async (
  spaceId: string
): Promise<{ first: Phase; last: Phase; all: Phase[] }> => {
  const data = must(
    await readSpaceInnovationFlowStates(spaceId),
    `readSpaceInnovationFlowStates(${spaceId})`
  );
  const states = data.lookup.space?.collaboration.innovationFlow.states ?? [];
  const all = states
    .filter(state => state.settings.visible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, displayName }) => ({ id, displayName }));
  expect(
    all.length,
    'the Space has at least two visible phases'
  ).toBeGreaterThan(1);
  return { first: all[0], last: all[all.length - 1], all };
};

/**
 * Creates a published post in the named phase and returns its id. Every
 * create lands on top of its phase (`min(sortOrder) - 1`). Descriptions stay
 * short: feed cards render lazily.
 */
export const seedPost = async (
  calloutsSetID: string,
  displayName: string,
  phaseName: string,
  allowedTypes: CalloutContributionType[] = [CalloutContributionType.Post]
): Promise<string> => {
  const created = must(
    await createCalloutWithData({
      calloutsSetID,
      framing: {
        profile: { displayName, description: 'J6' },
        type: CalloutFramingType.None,
      },
      settings: {
        visibility: CalloutVisibility.Published,
        contribution: {
          enabled: true,
          allowedTypes,
          canAddContributions: CalloutAllowedActors.Members,
          commentsEnabled: true,
        },
        framing: { commentsEnabled: true },
      },
      classification: {
        tagsets: [{ name: TagsetReservedName.FlowState, tags: [phaseName] }],
      },
    }),
    `createCalloutWithData(${displayName})`
  );
  return created.createCalloutOnCalloutsSet.id;
};

export type Placement = {
  name: string;
  sortOrder: number;
  phase: string | undefined;
};

/** Where each post of the callouts set sits, as `actor` sees it. */
export const placement = async (
  calloutsSetId: string,
  actor: GraphqlActor
): Promise<Map<string, Placement>> => {
  const data = must(
    await readCalloutsPlacement(calloutsSetId, actor),
    `readCalloutsPlacement(${calloutsSetId})`
  );
  const callouts = data.lookup.calloutsSet?.callouts ?? [];
  return new Map(
    callouts.map(callout => [
      callout.id,
      {
        name: callout.framing.profile.displayName,
        sortOrder: callout.sortOrder,
        phase: callout.classification?.flowState?.tags[0],
      },
    ])
  );
};

/** The given ids, top first. An id the actor cannot see throws, never sorts silently. */
export const orderOf = (map: Map<string, Placement>, ids: string[]): string[] =>
  [...ids].sort((a, b) => get(map, a).sortOrder - get(map, b).sortOrder);

/** One post's placement; a missing post fails with its id. */
export const get = (map: Map<string, Placement>, id: string): Placement => {
  const found = map.get(id);
  if (!found) throw new Error(`post ${id} is not in the placement read`);
  return found;
};

/**
 * The first and last post of a phase's tab by stored order, whoever created
 * them (a template post such as "Welcome" can be the last).
 */
export const tabEnds = (
  map: Map<string, Placement>,
  phaseName: string
): { top: string; bottom: string } => {
  const inTab = [...map]
    .filter(([, p]) => p.phase === phaseName)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([id]) => id);
  if (inTab.length < 2)
    throw new Error(`phase ${phaseName} holds fewer than two posts`);
  return { top: inTab[0], bottom: inTab[inTab.length - 1] };
};

/** The seeded posts' titles in the visible tab, in page order. */
export const seededHeadings = (page: Page, uid: string): Locator =>
  contentFeed(page).getByRole('heading', {
    level: 3,
    name: new RegExp(`^J6 .+ ${uid}$`),
  });

/**
 * Scrolls each post's feed item into view so its card renders. Feed cards
 * mount lazily (`triggerOnce` intersection), and every item's wrapper div
 * carries the callout id even as a skeleton. This is a CSS last resort, scoped
 * to the feed region and keyed by the API id: a skeleton has no role or name.
 */
export const renderFeed = async (
  page: Page,
  calloutIds: string[]
): Promise<void> => {
  for (const id of calloutIds) {
    await contentFeed(page).locator(`[id="${id}"]`).scrollIntoViewIfNeeded();
  }
};

/** A post's card in the feed. `[data-slot="card"]` is the precedent in sidebar-widgets.helpers. */
export const postCard = (page: Page, name: string): Locator =>
  contentFeed(page)
    .locator('[data-slot="card"]')
    // `has` is matched inside each card, so it cannot reuse `calloutHeading`
    // (which is rooted in the feed region and would look for a region in the card).
    .filter({
      has: page.getByRole('heading', { name, level: 3, exact: true }),
    });

/** Opens a post's Settings menu in the feed and returns the open menu. */
export const openPostMenu = async (
  page: Page,
  name: string
): Promise<Locator> => {
  await postCard(page, name)
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
};

export const openPhaseTab = async (
  page: Page,
  phaseName: string
): Promise<void> => {
  await page.getByRole('tab', { name: phaseName, exact: true }).click();
  await expect(
    page.getByRole('tab', { name: phaseName, exact: true, selected: true })
  ).toBeVisible();
};

/** A phase's column on Settings › Layout, found by its title. */
export const layoutColumn = (page: Page, title: string): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByTitle(title, { exact: true }) });

/** A post's row on Settings › Layout (the row's own attribute, keyed by the API id). */
export const layoutRow = (page: Page, calloutId: string): Locator =>
  page.locator(`[data-callout-id="${calloutId}"]`);

/** Opens Settings › Layout. L0 shows "Add tab"; L1/L2 would show "Add phase". */
export const openLayout = async (
  page: Page,
  spaceNameId: string
): Promise<void> => {
  await page.goto(`${baseUrl}/${spaceNameId}/settings/layout`);
  await expect(
    page.getByRole('button', { name: 'Add tab', exact: true })
  ).toBeVisible();
};

/**
 * Saves the pending Layout edits and waits for the server to have taken each
 * named mutation (a field name without its parenthesis, as
 * `expectMutationAnswered` takes it). The "N unsaved change(s)" text is not pinned: a Move to
 * counts the move plus two column-order changes.
 */
export const saveUnsaved = async (
  page: Page,
  fieldNames: string[]
): Promise<void> => {
  const unsaved = page.getByRole('region', { name: 'Unsaved changes' });
  await expect(unsaved).toBeVisible();
  const answers = fieldNames.map(field => expectMutationAnswered(page, field));
  await unsaved
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  for (const answered of answers) await answered();
  await expect(unsaved).toBeHidden();
};
