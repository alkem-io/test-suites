// spec: client-web/src/functional-e2e/task-boards/task-boards-test-plan.md
// W2 extras (test-suites#722, catalogue CT-8): moving tasks on a Tasks board.
//
// TB-3 a member drags a task into another column; the server re-tags it.
// TB-4 a member drags a task above another in the same column; the server
//      stores the new order (sortOrder) and the reloaded board shows it.
// TB-5 a non-member sees the board but is offered neither "Add task" nor a
//      draggable card, and the server refuses the move.
//
// The board and its tasks are seeded through the lib, each task in its own
// column, so every case reads its starting state and the cases have no order:
//   A "move me"   To Do  (TB-3 moves it to In Progress)
//   B "first"     Done   ┐ TB-4 drags C above B
//   C "second"    Done   ┘
//   N "not yours" To Do  (TB-5 tries to move it; never moves)

import { test, expect } from '@playwright/test';
import {
  AuthorizationPrivilege,
  moveTaskToColumn,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  boardCard,
  boardColumn,
  columnOrder,
  columnTitlesOnPage,
  DEFAULT_COLUMNS,
  draggableCards,
  dragTask,
  expectBoardRendered,
  openPersonaPage,
  phases,
  readBoard,
  seedBoard,
  seedBoardSpace,
  seedTask,
  taskCard,
  taskNamed,
  teardownScenario,
  type PersonaPage,
} from './task-boards.helpers';

const uid = UniqueIDGenerator.getID();
const boardName = `TB moves ${uid}`;
const A = `TB move me ${uid}`;
const B = `TB first ${uid}`;
const C = `TB second ${uid}`;
const N = `TB not yours ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let member: PersonaPage | undefined;
let boardId = '';
const ids: Record<string, string> = {};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await seedBoardSpace('tb2', uid);
  const { first } = await phases(scenario.space.id);
  boardId = await seedBoard(
    scenario.space.collaboration.calloutsSetId,
    boardName,
    first.displayName
  );
  // Seeded one by one, in this order, so B and C have a known stored order.
  for (const [title, column] of [
    [A, 'To Do'],
    [B, 'Done'],
    [C, 'Done'],
    [N, 'To Do'],
  ]) {
    ids[title] = await seedTask(boardId, title, column, TestUser.SPACE_MEMBER);
  }
  member = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await member?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const openBoard = async (page: PersonaPage['page']) => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
  const card = boardCard(page, boardName);
  await expectBoardRendered(card, DEFAULT_COLUMNS);
  return card;
};

test.describe('W2 extras — moving tasks on a Tasks board', () => {
  test('TB-3 a member drags a task into another column; the server re-tags it and the counts follow', async () => {
    const page = member!.page;
    const before = await readBoard(boardId);
    expect(taskNamed(before, A).column).toBe('To Do');
    expect(before.counts['In Progress']).toBe(0);

    const card = await openBoard(page);
    const source = taskCard(boardColumn(card, 'To Do'), A);
    // An empty column is dropped onto as a whole (its droppable).
    await dragTask(page, source, boardColumn(card, 'In Progress'), [
      'moveTaskToColumn',
      'updateContributionsSortOrder',
    ]);

    const after = await readBoard(boardId);
    expect(taskNamed(after, A).column).toBe('In Progress');
    // Nothing else moved.
    expect(taskNamed(after, N).column).toBe('To Do');
    expect(taskNamed(after, B).column).toBe('Done');
    expect(after.counts).toEqual({
      'To Do': before.counts['To Do'] - 1,
      'In Progress': 1,
      Done: before.counts['Done'],
    });

    await page.reload();
    await expectBoardRendered(card, DEFAULT_COLUMNS);
    await expect(taskCard(boardColumn(card, 'In Progress'), A)).toBeVisible();
    await expect(
      boardColumn(card, 'To Do').getByRole('button', { name: A, exact: true })
    ).toHaveCount(0);
  });

  test('TB-4 a member drags a task above another in the same column; the server stores the new order and the reloaded board shows it', async () => {
    const page = member!.page;
    const before = columnOrder(await readBoard(boardId), 'Done');
    expect(before).toHaveLength(2);
    expect(new Set(before)).toEqual(new Set([B, C]));
    const [top, bottom] = before;

    const card = await openBoard(page);
    const done = boardColumn(card, 'Done');
    // The page shows the stored order before the move.
    await expect(columnTitlesOnPage(done)).toHaveText(before);
    await dragTask(
      page,
      taskCard(done, bottom),
      taskCard(done, top),
      ['updateContributionsSortOrder'],
      'top'
    );

    const after = await readBoard(boardId);
    expect(columnOrder(after, 'Done')).toEqual([bottom, top]);
    // A reorder is not a move.
    expect(taskNamed(after, top).column).toBe('Done');
    expect(taskNamed(after, bottom).column).toBe('Done');

    await page.reload();
    await expectBoardRendered(card, DEFAULT_COLUMNS);
    await expect(columnTitlesOnPage(boardColumn(card, 'Done'))).toHaveText([
      bottom,
      top,
    ]);
  });

  test('TB-5 a non-member sees the board but may neither add nor drag a task, and the server refuses the move', async ({
    browser,
  }) => {
    // Positive control on the server: the member holds MOVE_TASK and
    // CONTRIBUTE on this board, the non-member holds neither.
    const asMember = await readBoard(boardId, TestUser.SPACE_MEMBER);
    expect(asMember.privileges).toEqual(
      expect.arrayContaining([
        AuthorizationPrivilege.MoveTask,
        AuthorizationPrivilege.Contribute,
      ])
    );
    const asNonMember = await readBoard(boardId, TestUser.NON_SPACE_MEMBER);
    expect(asNonMember.privileges).not.toContain(
      AuthorizationPrivilege.MoveTask
    );
    expect(asNonMember.privileges).not.toContain(
      AuthorizationPrivilege.Contribute
    );

    // Positive control on the page: the member is offered both.
    const memberCard = await openBoard(member!.page);
    await expect(
      memberCard.getByRole('button', { name: 'Add task', exact: true })
    ).toHaveCount(DEFAULT_COLUMNS.length);
    await expect(draggableCards(memberCard)).toHaveCount(asMember.tasks.length);

    const viewer = await openPersonaPage(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
    try {
      const card = await openBoard(viewer.page);
      // The board and its tasks render for the non-member…
      await expect(taskCard(card, N)).toBeVisible();
      // …without an add affordance or a draggable card.
      await expect(
        card.getByRole('button', { name: 'Add task', exact: true })
      ).toHaveCount(0);
      await expect(draggableCards(card)).toHaveCount(0);
    } finally {
      await viewer.close();
    }

    // The server refuses the move to the non-member, and N stays put.
    const refused = await moveTaskToColumn(
      ids[N],
      'Done',
      TestUser.NON_SPACE_MEMBER
    );
    expect(refused.data?.moveTaskToColumn).toBeFalsy();
    // Refused for lack of MOVE_TASK, not for any other reason.
    expect(
      refused.error?.errors.map(e => e.code),
      'the non-member is refused'
    ).toEqual(['FORBIDDEN_POLICY']);
    expect(taskNamed(await readBoard(boardId), N).column).toBe('To Do');
  });
});
