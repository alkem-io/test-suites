import { expect, type Locator, type Page } from '@playwright/test';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  CommunityMembershipPolicy,
  createCalloutWithData,
  createContributionOnCallout,
  readTaskBoard,
  SpacePrivacyMode,
  TagsetReservedName,
  TestScenarioFactory,
  TestUser,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import { expectMutationAnswered } from '../helpers/space-access.helper';
import { postCard } from '../callout-placement/callout-placement.helpers';

/**
 * Shared steps for the Tasks board walks (W2 extras, test-suites#722,
 * catalogue CT-8). A Tasks board is a POSTS callout carrying the reserved
 * `task` classification tagset: its `allowedValues` are the ordered columns,
 * each task (a post contribution) carries its column as the single tag of its
 * own `task` tagset, and its position is `sortOrder`, ascending, top first.
 */

export {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
export { phases } from '../callout-placement/callout-placement.helpers';
export { chooseResponseChip } from '../helpers/callout-form.helper';

/**
 * A PUBLIC + OPEN L0 Space with `space.admin` (admin, member) and
 * `space.member`. Public, so a non-member reads the board (TB-5's viewer).
 */
export const seedBoardSpace = async (
  file: string,
  uid: string
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: `w2-tb-${file}-${uid}`,
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
  expect(scenario.scenarioSetupSucceeded, 'board scenario set up').toBe(true);
  return scenario;
};

/** The columns the server seeds when a board is created without a column list (`TASK_BOARD_DEFAULT_COLUMNS`). */
export const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

const TASK_TAGSET = 'task';

export type BoardTask = {
  id: string;
  title: string;
  column: string | undefined;
  sortOrder: number;
  authorId: string | undefined;
};

export type Board = {
  /** The ordered columns (the callout's `task` tagset), undefined when the callout is not a board. */
  columns: string[] | undefined;
  allowedTypes: string[];
  counts: Record<string, number>;
  privileges: string[];
  tasks: BoardTask[];
};

/** A Tasks board as `actor` reads it from the server, flattened. */
export const readBoard = async (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<Board> => {
  const callout = must(
    await readTaskBoard(calloutId, actor),
    `readTaskBoard(${calloutId})`
  ).lookup.callout;
  if (!callout) throw new Error(`callout ${calloutId} is not readable`);
  const marker = callout.classification?.tagsets?.find(
    t => t.name === TASK_TAGSET
  );
  return {
    columns: marker?.allowedValues,
    allowedTypes: callout.settings.contribution.allowedTypes.map(String),
    counts: Object.fromEntries(
      (callout.taskColumnCounts ?? []).map(c => [c.column, c.count])
    ),
    privileges: (callout.authorization?.myPrivileges ?? []).map(String),
    tasks: (callout.contributions ?? []).map(c => ({
      id: c.id,
      title: c.post?.profile.displayName ?? '',
      column: c.classification?.tagsets?.find(t => t.name === TASK_TAGSET)
        ?.tags[0],
      sortOrder: c.sortOrder,
      authorId: c.post?.createdBy?.id,
    })),
  };
};

/** One task by title; a missing task fails with the titles that do exist. */
export const taskNamed = (board: Board, title: string): BoardTask => {
  const found = board.tasks.filter(t => t.title === title);
  if (found.length !== 1) {
    throw new Error(
      `expected one task "${title}", found ${found.length} among: ${board.tasks.map(t => t.title).join(', ')}`
    );
  }
  return found[0];
};

/** The titles in a column, top first, by stored sortOrder. */
export const columnOrder = (board: Board, column: string): string[] =>
  board.tasks
    .filter(t => t.column === column)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(t => t.title);

/** Seeds a published Tasks board (default columns) in the given phase; returns its callout id. */
export const seedBoard = async (
  calloutsSetID: string,
  displayName: string,
  phaseName: string
): Promise<string> => {
  const created = must(
    await createCalloutWithData({
      calloutsSetID,
      framing: {
        profile: { displayName, description: 'Tasks board' },
        type: CalloutFramingType.None,
      },
      settings: {
        visibility: CalloutVisibility.Published,
        contribution: {
          enabled: true,
          allowedTypes: [CalloutContributionType.Post],
          canAddContributions: CalloutAllowedActors.Members,
          commentsEnabled: true,
        },
        framing: { commentsEnabled: true },
      },
      classification: {
        tagsets: [{ name: TagsetReservedName.FlowState, tags: [phaseName] }],
      },
      taskBoard: {},
    }),
    `createCalloutWithData(${displayName})`
  );
  return created.createCalloutOnCalloutsSet.id;
};

/** Seeds a task in a column as `actor`; returns its contribution id. */
export const seedTask = async (
  calloutID: string,
  title: string,
  column: string,
  actor: GraphqlActor
): Promise<string> =>
  must(
    await createContributionOnCallout(
      {
        calloutID,
        type: CalloutContributionType.Post,
        taskColumn: column,
        post: { profileData: { displayName: title } },
      },
      actor
    ),
    `createContributionOnCallout(${title})`
  ).createContributionOnCallout.id;

// ------------------------------------------------------------- the board

/** The board's callout card in the feed. */
export const boardCard = (page: Page, boardName: string): Locator =>
  postCard(page, boardName);

/**
 * A board column, for a viewer who may add tasks. Columns have no role or
 * name of their own; the column is the innermost element holding both the
 * column's exact title and an "Add task" button (the header holds the title
 * only, the board every title), hence `.last()`.
 */
export const boardColumn = (card: Locator, column: string): Locator =>
  card
    .locator('div')
    .filter({ has: card.page().getByText(column, { exact: true }) })
    .filter({
      has: card.page().getByRole('button', { name: 'Add task', exact: true }),
    })
    .last();

/**
 * A task card. For a viewer holding MOVE_TASK the card is wrapped in a
 * dnd-kit sortable that is itself a button of the same name, so the name
 * matches twice; `.first()` is the outer (draggable) one.
 */
export const taskCard = (scope: Locator, title: string): Locator =>
  scope.getByRole('button', { name: title, exact: true }).first();

/**
 * The cards a viewer may drag. dnd-kit marks each sortable with
 * `aria-roledescription="sortable"`, and it renders the sortable only when
 * the viewer holds MOVE_TASK (`TaskBoardConnector` › canMove).
 */
export const draggableCards = (card: Locator): Locator =>
  card.locator('[aria-roledescription="sortable"]');

/** The task titles of a column on the page, top first. */
export const columnTitlesOnPage = (column: Locator): Locator =>
  column.locator('[aria-roledescription="sortable"]');

/**
 * Drags a task card onto a target (a card or a column) with the pointer, in
 * steps, so dnd-kit's pointer sensor (5 px activation) and `pointerWithin`
 * collision see the move, and waits for the named mutations to answer.
 */
export const dragTask = async (
  page: Page,
  source: Locator,
  target: Locator,
  mutations: string[],
  where: 'center' | 'top' = 'center'
): Promise<void> => {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target has no box');
  const answered = mutations.map(m => expectMutationAnswered(page, m));
  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2;
  const ty =
    where === 'top' ? to.y + Math.min(8, to.height / 4) : to.y + to.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 10, { steps: 5 });
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.move(tx, ty + 1, { steps: 2 });
  await page.mouse.up();
  for (const a of answered) await a();
};

/** Waits until the card has rendered the board (its first column title is shown). */
export const expectBoardRendered = async (card: Locator, columns: string[]) => {
  for (const column of columns) {
    await expect(card.getByText(column, { exact: true })).toBeVisible();
  }
};
