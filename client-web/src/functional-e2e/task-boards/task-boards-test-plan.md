# Test plan — Tasks board: create a board, add a task, move and reorder tasks (W2 extras, CT-8)

> **Status:** Built 2026-11-12, 5 of 5 cases live · **Depth:** Standard (one trigger: authorization, because who may move a task is its own privilege, MOVE_TASK; the board's storage shape — a reserved tagset on the callout and one on each contribution — is a shape the rebuild replaces) · **Source:** test-suites#722 (W2 handover "Extras"); `docs/qa/server-rebuild/catalogue/README.md` row CT-8 (verdict **absent**: "zero coverage on either side")

The plan has no diff behind it. It comes from the catalogue. Product source read at client-web `develop` @ `25ded1467` and server `develop` @ `e120d25a1`. Before this work no test in either package created a Tasks board through the UI, added a task to one, or moved a task. This suite does those four writes in the browser and checks each one through the lib read-back `readTaskBoard` (new), which returns the board as the server stores it: the ordered columns, the per-column counts, every task's column and `sortOrder`, and the reader's privileges.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/task-boards/
pnpm run test:nightly --project="Task boards"          # tier extended
```
- Where branded Chrome is not installed, set `PW_BROWSER=chromium`.
- Harness personas only (`space.admin`, `space.member`, `non.space`); none is mutated. Each file seeds its own public, open L0 Space (`w2-tb-<file>-<id>`) and deletes it in `afterAll`.
- `us1` is serial (TB-2 adds to the board TB-1 creates). In `us2` the cases have no order: each task lives in its own column and each case reads its starting state.

## Model
A Tasks board is a POSTS callout carrying the reserved `task` classification tagset. That tagset's `allowedValues` are the ordered columns (default `To Do`, `In Progress`, `Done`). Each task is a post contribution whose own `task` tagset holds its column as its single tag. Its position is `sortOrder`, ascending, top first. `moveTaskToColumn` re-tags a task; the board persists a drop position through `updateContributionsSortOrder`, which on a board is authorized by MOVE_TASK, not UPDATE. MOVE_TASK is derived from CONTRIBUTE (any member) and UPDATE (callout editors).

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | An admin picks "Tasks board" but gets a plain posts callout, or a board without columns | Medium (the marker is a reserved tagset the rebuild replaces) | High (the feature is gone) | **High** | TB-1 |
| R2 | A task added from a column lands in another column (or the first), or is attributed to someone else | Medium | Medium | Medium | TB-2 |
| R3 | A task dragged to another column snaps back after reload: the move is not stored | Medium (two mutations in sequence) | High | **High** | TB-3 |
| R4 | A reorder inside a column is not stored, or is stored in another order | Medium | Medium | Medium | TB-4 |
| R5 | Someone without the right (a non-member of a public Space) can move tasks, or is offered the controls | Low–Medium (privilege rewritten in the rebuild) | High | **High** | TB-5 |
| R6 | A member is refused a move they are entitled to | Medium | Medium | Medium | TB-3, TB-4 (as member), TB-5 positive control |

## Existing coverage before this work
Searched test-suites `origin/develop` @ `ef405cc0`: `rg -n -i "task ?board|TaskColumn|moveTask|taskColumn|MOVE_TASK" client-web/src server-api/src lib/src --glob '!**/generated/**'`.
- **client-web:** none. `helpers/callout-form.helper.ts` names the "Tasks board" chip in a comment; no spec picks it.
- **server-api:** `orphan-free-deletion/callout-delete-owned-records` CD-2 creates a board through the API (`taskBoard: {}`) only to delete it, and asserts `taskColumnCounts` is non-null. No case adds, moves or reorders a task, and none touches a column mutation.
- **lib:** no task-board read or write existed. Added: `readTaskBoard(calloutId, actor)`, `moveTaskToColumn(contributionID, column, actor)` (`lib/src/scenario/functions/callout/callout.request.params.ts`). Seeding reuses `createCalloutWithData` (`taskBoard: {}`) and `createContributionOnCallout` (`taskColumn`), which already carried the fields.
- **Reused:** `callout-placement.helpers` › `phases`, `postCard`; `helpers/callout-form.helper` › `chooseResponseChip`; `helpers/space-access.helper` › `openPersonaPage`, `expectMutationAnswered`, `teardownScenario`.

## Scenario → test mapping
Techniques: **UC** use-case walk · **ST** state transition (a task's column, its position) · **EP** viewer partition (admin / member / non-member) · **NC** negative with a positive control.

| ID | Scenario | Technique | Oracle (lib read-back + page) | Automated by | Layer |
|---|---|---|---|---|---|
| TB-1 | `space.admin` creates a post with the "Tasks board" response | UC | `createCalloutOnCalloutsSet` answered; exactly one callout of that name; `readTaskBoard`: columns exactly `[To Do, In Progress, Done]`, allowed types exactly `[POST]`, no tasks, counts all 0; the card renders the three columns, each "No tasks yet" | `us1-create-board-add-task.spec.ts` › TB-1 the admin creates a post with a Tasks board response; the server stores a POST-only board with the default columns | UI + lib |
| TB-2 | `space.member` adds a task through "In Progress" › "Add task" | UC, ST | the dialog is "Create task"; `readTaskBoard`: exactly one task, that title, column `In Progress`, author = the member (`readMyUser`), counts `{0,1,0}`; after reload the card is in In Progress and in no other column | `us1-create-board-add-task.spec.ts` › TB-2 a member adds a task through a column's "Add task"; … | UI + lib |
| TB-3 | The member drags task A from To Do into the empty In Progress column | ST | `moveTaskToColumn` and `updateContributionsSortOrder` answered; A's column `In Progress`; the other tasks unmoved; counts To Do −1, In Progress 1, Done unchanged; after reload A is in In Progress, not in To Do | `us2-move-task.spec.ts` › TB-3 a member drags a task into another column; the server re-tags it and the counts follow | UI + lib |
| TB-4 | The member drags the lower of two Done tasks above the upper one | ST | the page first shows the stored order; `updateContributionsSortOrder` answered; stored Done order (by `sortOrder`) is exactly `[lower, upper]`; neither changed column; the reloaded column shows the same order | `us2-move-task.spec.ts` › TB-4 a member drags a task above another in the same column; … | UI + lib |
| TB-5 | `non.space` views the board of a public Space | EP, NC | control: the member reads MOVE_TASK + CONTRIBUTE and is offered 3 "Add task" and one draggable card per task; the non-member reads neither privilege, sees the board and a task, gets 0 "Add task" and 0 draggable cards; `moveTaskToColumn` as the non-member returns no data and exactly `FORBIDDEN_POLICY`; the task's column is unchanged | `us2-move-task.spec.ts` › TB-5 a non-member sees the board but may neither add nor drag a task, and the server refuses the move | UI + lib |

### Regression guards
- **TB-1:** the create input loses `taskBoard` (a plain posts callout: no `task` tagset), the default column list changes or loses its order, or a board accepts other response types.
- **TB-2:** the per-column add drops `taskColumn` (task lands in the first column) or the creation dialog targets another column.
- **TB-3:** `moveTaskToColumn` not stored, or `taskColumnCounts` not recomputed.
- **TB-4:** `updateContributionsSortOrder` refused on a board for a member (it is authorized by MOVE_TASK there, by UPDATE elsewhere), or stored in another order.
- **TB-5:** MOVE_TASK derived from READ, or the client offering the controls without the privilege.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Column administration: add, rename, delete (tasks reflow to the first column), reorder (`createTaskColumnOnCallout`, `updateTaskColumnOnCallout`, `deleteTaskColumnOnCallout`, `updateTaskColumnsSortOrderOnCallout`) | Out of this cut (the catalogue's four other unreached CT-8 mutations). The "Manage columns" dialog is a separate walk | follow-up walk; server-api for the reflow rule |
| A board created with custom columns (the create dialog's "Manage columns") | Out of this cut | with the column walk |
| A member cannot administer columns (UPDATE) | Needs the column walk as its positive control | with the column walk |
| Moving a task with the keyboard (dnd-kit keyboard sensor) | Manual: the sortable is a nested button of the same name as the card (finding F1) | release-verification checklist, charter E-1 |
| Opening a task from the board; the fullscreen board dialog | Rendering only, no write | — |
| A Tasks board in a subspace, or made from a template | Same component and mutations | follow-up |

**Non-functional.** *Security:* TB-5 (UI and server). *Accessibility:* findings below, manual. *Compatibility:* desktop Chrome only; the pointer drag is not walked on mobile (touch sensor, 150 ms delay).

**Charter E-1 (30 min).** Move and reorder tasks keyboard-only with a screen reader: is the column announced, is the drop announced, can a task be added to a named column?

## Findings (code read + this build, not filed)
- **F1 (a11y):** for a viewer holding MOVE_TASK each card is a dnd-kit sortable (`role=button`, `aria-roledescription="sortable"`) wrapping the card's own button of the same name, so every task is announced twice and the selectors need `.first()`.
- **F2 (a11y):** every column's "Add task" button has the same accessible name; the column is not in it. The suite scopes the button to its column (`boardColumn`), not by position.

## Rebaseline register
- Default columns `To Do`, `In Progress`, `Done` (server `TASK_BOARD_DEFAULT_COLUMNS`); reserved tagset name `task` (lowercase, as stored).
- A non-member of a public Space holds only READ on a board callout.
- The move refusal code is `FORBIDDEN_POLICY`.
- Copy: "Tasks board" (response chip), "Add task", "No tasks yet", "Create task" (dialog title and submit).

## Build notes (2026-11-12, local stack, client-web `develop` @ `25ded1467`, server `develop` @ `e120d25a1`)

**Runs.** `--project="Task boards"` (with "Community guidelines"), `PW_BROWSER` default, 2 workers: 5 passed twice in a row (7/7 with the guidelines file, 1.4 min each). No `w2-tb-*` Space or organisation left behind (checked after the runs). lib build, client-web `tsc` and ESLint (0 errors), server-api `tsc`, and the lib contract test (37 passed) are green.

**Red-proofs** (each sabotage run once, red at the intended line, file restored byte-identical):

| Case | Sabotage | Result |
|---|---|---|
| TB-1 | pick the "Posts" chip instead of "Tasks board" | red at the columns read-back: received `undefined` |
| TB-2 | press "Add task" in To Do instead of In Progress | red at the column read-back: received `To Do` (also proves `boardColumn` scopes the button to its column) |
| TB-3 | after the drag, the lib moves A back to To Do | red at A's column: received `To Do` |
| TB-4 | skip the drag | red at the stored Done order |
| TB-5 | the server negative sent as `space.member` | red: the move returned data |
| TB-5 | the page negative opened as `space.member` | red at "Add task" absent: count 3 |

During the red-proofs TB-5's positive control (`getByRole('button', { name })`) failed in strict mode for a member (F1); it uses `taskCard` (`.first()`) now, so the sabotage goes red at the intended "Add task" line.

**What this proves, and what it does not.** It proves that a Tasks board created in the UI is stored as a POST-only board with the default columns, that a task added from a column is stored in that column as its author, that a drag to another column and a reorder inside a column are both stored and survive a reload, and that a non-member is neither offered nor allowed the move. It does **not** prove anything about column administration (four of the five CT-8 mutations), boards with custom columns, or the keyboard path.
