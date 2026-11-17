// spec: client-web/src/functional-e2e/task-boards/task-boards-test-plan.md
// W2 extras (test-suites#722, catalogue CT-8): a Tasks board created in the
// browser, and a task added to one of its columns.
//
// TB-1 `space.admin` creates a post with the "Tasks board" response; the
//      server stores a POST-only callout carrying the default columns.
// TB-2 `space.member` adds a task through a column's "Add task"; the server
//      stores it in THAT column, as the member, and the reloaded board shows it
//      there. Serial: TB-2 adds to TB-1's board.

import { test, expect } from '@playwright/test';
import {
  readCalloutsPlacement,
  readMyUser,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  boardCard,
  boardColumn,
  chooseResponseChip,
  DEFAULT_COLUMNS,
  expectBoardRendered,
  expectMutationAnswered,
  openPersonaPage,
  readBoard,
  seedBoardSpace,
  taskCard,
  taskNamed,
  teardownScenario,
  type PersonaPage,
} from './task-boards.helpers';

const uid = UniqueIDGenerator.getID();
const boardName = `TB board ${uid}`;
const taskTitle = `TB task ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
/** Set by TB-1 from the server read, used by TB-2. */
let boardId = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await seedBoardSpace('tb1', uid);
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
  member = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await member?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

test.describe('W2 extras — a Tasks board created and added to in the browser', () => {
  test('TB-1 the admin creates a post with a Tasks board response; the server stores a POST-only board with the default columns', async () => {
    const page = admin!.page;
    await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
    await page
      .getByRole('navigation', { name: 'Space sidebar' })
      .getByRole('button', { name: 'Add Post', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Create Post',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(boardName);
    await chooseResponseChip(dialog, 'Tasks board');

    const created = expectMutationAnswered(page, 'createCalloutOnCalloutsSet');
    await dialog.getByRole('button', { name: 'Post', exact: true }).click();
    await created();
    await expect(dialog).toBeHidden();

    // The server holds exactly one callout of that name, and it is a board.
    const set =
      must(
        await readCalloutsPlacement(
          scenario!.space.collaboration.calloutsSetId
        ),
        'readCalloutsPlacement'
      ).lookup.calloutsSet?.callouts ?? [];
    const mine = set.filter(c => c.framing.profile.displayName === boardName);
    expect(mine).toHaveLength(1);
    boardId = mine[0].id;

    const board = await readBoard(boardId);
    // The `task` marker with the ordered default columns: a plain Posts
    // callout has no such tagset (columns undefined).
    expect(board.columns).toEqual(DEFAULT_COLUMNS);
    // A board collects posts only.
    expect(board.allowedTypes).toEqual(['POST']);
    expect(board.tasks).toEqual([]);
    expect(board.counts).toEqual({ 'To Do': 0, 'In Progress': 0, Done: 0 });

    // The feed renders it as a board: every column, each empty.
    const card = boardCard(page, boardName);
    await expectBoardRendered(card, DEFAULT_COLUMNS);
    await expect(card.getByText('No tasks yet', { exact: true })).toHaveCount(
      3
    );
  });

  test('TB-2 a member adds a task through a column\'s "Add task"; the server stores it in that column, as the member, and the reloaded board shows it there', async () => {
    test.skip(!boardId, 'TB-1 did not create the board');
    const page = member!.page;
    const target = 'In Progress';
    await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
    const card = boardCard(page, boardName);
    await expectBoardRendered(card, DEFAULT_COLUMNS);

    await boardColumn(card, target)
      .getByRole('button', { name: 'Add task', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Create task',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill(taskTitle);
    const created = expectMutationAnswered(page, 'createContributionOnCallout');
    await dialog
      .getByRole('button', { name: 'Create task', exact: true })
      .click();
    await created();
    await expect(dialog).toBeHidden();

    // Server: one task, that title, in the column whose button was pressed,
    // authored by the member; the counts follow.
    const board = await readBoard(boardId);
    expect(board.tasks).toHaveLength(1);
    const task = taskNamed(board, taskTitle);
    expect(task.column).toBe(target);
    const me = must(await readMyUser(TestUser.SPACE_MEMBER), 'readMyUser').me
      .user;
    expect(task.authorId).toBe(me?.id);
    expect(board.counts).toEqual({ 'To Do': 0, 'In Progress': 1, Done: 0 });

    // Reloaded, the card sits in that column and in no other.
    await page.reload();
    await expectBoardRendered(card, DEFAULT_COLUMNS);
    await expect(taskCard(boardColumn(card, target), taskTitle)).toBeVisible();
    for (const other of DEFAULT_COLUMNS.filter(c => c !== target)) {
      await expect(
        boardColumn(card, other).getByRole('button', {
          name: taskTitle,
          exact: true,
        })
      ).toHaveCount(0);
    }
  });
});
