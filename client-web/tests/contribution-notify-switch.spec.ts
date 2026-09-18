/**
 * Persisted P1 acceptance walk for the contribution "Notify space members"
 * switch (070-contribution-notify-switch).
 *
 * Landing target: specs/070-contribution-notify-switch/repos.yaml
 *   → forge.verification.acceptance.US1.persist_spec_to (test-suites slice).
 *
 * Authored by forge-verify (Phase V) from a green pseudo-manual acceptance
 * walk driven headless against the live stack at http://localhost:3000 (the
 * gateway; NEVER :3001 — the raw vite origin is CORS-blocked and yields false
 * failures).
 *
 * Covers User Story 1 (P1) — "Add a response or task without notifying the
 * Space":
 *   US1-AS1  the response/task creation dialog shows a "Notify space
 *            members" switch, OFF by default.
 *   US1-AS2  the choice is never remembered: reopening the dialog (even after
 *            a prior submission with the switch ON) always starts OFF again.
 *   US1-AS3  submitting with the switch OFF produces ZERO
 *            SPACE_COLLABORATION_CALLOUT_CONTRIBUTION /
 *            SPACE_ADMIN_COLLABORATION_CALLOUT_CONTRIBUTION emission — the
 *            D-OP2/R-1 pin: the admin channel is suppressed together with the
 *            member channel, not separately.
 *   US1-AS4  the suppressed contribution still appears in the callout and the
 *            space's Recent Activity feed exactly as a notified one would
 *            (FR-007 — the activity log entry is unconditional).
 *   US1-AS5  the same OFF-by-default / zero-emission / activity-present
 *            behaviour holds identically for a task added to a Tasks board.
 *
 * Emission is asserted at the RabbitMQ `alkemio-notifications` queue's
 * cumulative publish counter (EMIT-level — mirrors the `PUSH_NOTIFICATIONS_QUEUE`
 * pattern already used in `messaging-notifications/` and
 * `organization-space-invitations/us2-org-admins-notified.spec.ts`), not
 * MailSlurper: the queue counter reflects the server-side gate directly and
 * is immune to any recipient-resolution/mail-delivery environment wiring
 * (dev-stack topology, SMTP relay, etc.) that a downstream mailbox check
 * would depend on.
 *
 * Scope note on US1-AS6 (sender-off short-circuits a recipient's opt-IN):
 * not duplicated as a separate browser walk. The AS3 RabbitMQ assertion
 * already proves the stronger, causally-prior fact: with the switch OFF, the
 * gate (`sendNotification !== false`) short-circuits BEFORE
 * `NotificationAdapterSpace.spaceCollaborationCalloutContributionCreated` is
 * ever called (zero publishes to the notification queue at all) — so no
 * recipient-preference resolution (opt-in or opt-out) executes on that path,
 * for any recipient. A second interactive session to onboard and opt in a
 * distinct recipient would only re-observe the same zero-publish fact from a
 * different angle (same rationale the existing `callout-reactions.spec.ts`
 * uses to skip a second-session multi-reactor walk here).
 *
 * Self-seeding: creates its own organization + space + a PUBLISHED Post
 * response callout via @alkemio/tests-lib as the platform admin, drives the
 * dialog UI as that admin, and deletes the whole scenario in afterAll.
 *
 * Run standalone:
 *   cd client-web
 *   pnpm exec playwright test --config=config/playwright.config.nightly.ts \
 *     --project="Contribution notify switch"
 */

import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  TestScenarioFactory,
  createCalloutOnCalloutsSet,
  delay,
  getQueueStats,
} from '@alkemio/tests-lib';
import {
  CalloutAllowedActors,
  CalloutVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
// `createCalloutOnCalloutsSet`'s `allowedTypes` param is typed against the
// `@alkemio/client-lib` generated enum (baseFunctions.ts's own import), a
// numeric enum that TS treats nominally — NOT the structurally-compatible
// string enums (`CalloutAllowedActors`/`CalloutVisibility` above) reused
// from `@alkemio/tests-lib`'s local schema. Import from the same source
// `createCalloutOnCalloutsSet` expects so the literal type-checks.
import { CalloutContributionType } from '@alkemio/client-lib/dist/generated/graphql';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { loginViaCrd } from '../src/functional-e2e/helpers/login.helper';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@alkem.io';

/** The single queue every contribution-notification event funnels through
 * (server `NotificationsQueue.NOTIFICATIONS` — `alkemio-notifications`). Its
 * cumulative `message_stats.publish` counter is the emit-level ground truth
 * for "did a notification event fire", independent of recipient resolution
 * or mail delivery. */
const NOTIFICATIONS_QUEUE = 'alkemio-notifications';

/** Grace window for a NEGATIVE assertion: long enough for the fire-and-forget
 * adapter call (if it were wrongly invoked) to reach RabbitMQ, short enough
 * to keep the suite fast. The suppression gate is synchronous in the
 * resolver, so a real emission would show up within one HTTP round trip. */
const NO_EMISSION_GRACE_MS = 4_000;

test.describe.configure({ mode: 'serial' });

test.describe(
  'Contribution notify switch — US1 P1 acceptance walk',
  { tag: ['@forge-acceptance', '@contribution-notify-switch'] },
  () => {
    let scenario: OrganizationWithSpaceModel;
    let spaceNameId: string;
    let responseCalloutDisplayName: string;
    let taskBoardDisplayName: string;

    let authContext: BrowserContext;
    let authPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);

      // Seed: org + space, then a PUBLISHED Post-response callout on the
      // space's calloutsSet (members may add Post-type responses).
      scenario = await TestScenarioFactory.createBaseScenario({
        name: `notify-switch-p1-${Date.now()}`,
        space: { collaboration: { addTutorialCallouts: false } },
      });
      spaceNameId = scenario.space.nameId;

      responseCalloutDisplayName = `Notify switch P1 callout ${Date.now()}`;
      const created = await createCalloutOnCalloutsSet(
        scenario.space.collaboration.calloutsSetId,
        {
          framing: { profile: { displayName: responseCalloutDisplayName } },
          settings: {
            framing: { commentsEnabled: true },
            contribution: {
              allowedTypes: [CalloutContributionType.Post],
              canAddContributions: CalloutAllowedActors.Members,
              enabled: true,
              commentsEnabled: true,
            },
            visibility: CalloutVisibility.Published,
          },
        }
      );
      const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
      expect(
        calloutId,
        'seed: published Post response callout should be created'
      ).toBeTruthy();

      taskBoardDisplayName = `US1 AS5 Tasks Board ${Date.now()}`;

      // Drive the UI as the admin (space member → holds CONTRIBUTE → may
      // respond and may create callouts). Sign in once for the whole file.
      authContext = await browser.newContext();
      authPage = await authContext.newPage();
      await loginViaCrd(authPage, ADMIN_EMAIL);
    });

    test.afterAll(async () => {
      await authContext?.close().catch(() => undefined);
      if (scenario) {
        await TestScenarioFactory.cleanUpBaseScenario(scenario);
      }
    });

    // ── locators ─────────────────────────────────────────────────────────

    /** The response-callout card in the space feed, scoped by its heading +
     * per-callout "Add Post" (mirrors callout-reactions.spec.ts's pattern). */
    function responseCalloutCard(page: Page): Locator {
      return page
        .locator('div')
        .filter({
          has: page.getByRole('heading', { name: responseCalloutDisplayName }),
        })
        .filter({ has: page.getByRole('button', { name: 'Add Post' }) })
        .last();
    }

    /** The Tasks-board callout card, scoped by its heading + a "To Do" column. */
    function taskBoardCard(page: Page): Locator {
      return page
        .locator('div')
        .filter({
          has: page.getByRole('heading', { name: taskBoardDisplayName }),
        })
        .filter({ has: page.getByText('To Do', { exact: true }) })
        .last();
    }

    /** The response-creation dialog (CrdPostContributionDialog): carries the
     * notify switch but — unlike the callout-creation dialog — no "Responses"
     * radiogroup (that only appears when creating a brand-new callout). */
    function responseDialog(page: Page): Locator {
      return page
        .getByRole('dialog')
        .filter({
          has: page.getByRole('switch', { name: 'Notify space members' }),
        })
        .filter({ hasNot: page.getByRole('radiogroup', { name: 'Responses' }) })
        .filter({ hasNot: page.getByRole('heading', { name: 'Create task' }) });
    }

    /** The task-creation dialog on a Tasks board. */
    function taskCreateDialog(page: Page): Locator {
      return page
        .getByRole('dialog')
        .filter({ has: page.getByRole('heading', { name: 'Create task' }) });
    }

    /** The new-callout creation dialog (CalloutFormConnector, create mode):
     * identified by its "Responses" radiogroup, which offers the "Tasks
     * board" response-type chip. */
    function calloutCreateDialog(page: Page): Locator {
      return page
        .getByRole('dialog')
        .filter({ has: page.getByRole('radiogroup', { name: 'Responses' }) });
    }

    async function loadSpacePage(page: Page): Promise<void> {
      await page.goto(`${BASE_URL}/${spaceNameId}`);
      await expect(
        page.getByRole('heading', { name: responseCalloutDisplayName })
      ).toBeVisible({ timeout: 30_000 });
    }

    async function openRecentActivity(page: Page): Promise<Locator> {
      await page.getByRole('button', { name: 'Activity' }).click();
      const dialog = page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: 'Recent Activity' }),
      });
      await expect(dialog).toBeVisible();
      return dialog;
    }

    // ── US1-AS1 / US1-AS2 ────────────────────────────────────────────────

    test('US1-AS1: the response dialog shows "Notify space members" OFF by default', async () => {
      await loadSpacePage(authPage);
      await responseCalloutCard(authPage)
        .getByRole('button', { name: 'Add Post' })
        .click();

      const dialog = responseDialog(authPage);
      await expect(dialog).toBeVisible();
      const notifySwitch = dialog.getByRole('switch', {
        name: 'Notify space members',
      });
      await expect(notifySwitch).toBeVisible();
      await expect(notifySwitch).toHaveAttribute('aria-checked', 'false');

      await dialog.getByRole('button', { name: 'Cancel' }).click();
    });

    test('US1-AS2: the switch is never remembered — OFF again even after a prior ON submission', async () => {
      await loadSpacePage(authPage);

      // First submission: explicitly turn the switch ON.
      await responseCalloutCard(authPage)
        .getByRole('button', { name: 'Add Post' })
        .click();
      let dialog = responseDialog(authPage);
      await dialog
        .getByRole('textbox', { name: 'Title' })
        .fill('AS2 setup response (switch ON)');
      await dialog
        .getByRole('switch', { name: 'Notify space members' })
        .click();
      await expect(
        dialog.getByRole('switch', { name: 'Notify space members' })
      ).toHaveAttribute('aria-checked', 'true');
      await dialog.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(dialog).toBeHidden();

      // Reopen on the same callout: the switch must start OFF again — the
      // choice is per-action, never persisted (FR-002).
      await responseCalloutCard(authPage)
        .getByRole('button', { name: 'Add Post' })
        .click();
      dialog = responseDialog(authPage);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('switch', { name: 'Notify space members' })
      ).toHaveAttribute('aria-checked', 'false');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
    });

    // ── US1-AS3 / US1-AS4 ────────────────────────────────────────────────

    test('US1-AS3/AS4: switch OFF emits zero notification events, and the response appears in the callout + activity feed', async () => {
      const baseline = (await getQueueStats(NOTIFICATIONS_QUEUE))
        .publishedTotal;

      const title = `AS3 zero-notify response ${Date.now()}`;
      await loadSpacePage(authPage);
      await responseCalloutCard(authPage)
        .getByRole('button', { name: 'Add Post' })
        .click();
      const dialog = responseDialog(authPage);
      await dialog.getByRole('textbox', { name: 'Title' }).fill(title);
      // Switch is left untouched — OFF by default (US1-AS1).
      await expect(
        dialog.getByRole('switch', { name: 'Notify space members' })
      ).toHaveAttribute('aria-checked', 'false');
      await dialog.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(dialog).toBeHidden();

      // AS3 + the D-OP2/R-1 pin: NEITHER the space-member NOR the
      // space-admin contribution notification is emitted — one flag
      // suppresses both channels together (no member-only variant).
      await delay(NO_EMISSION_GRACE_MS);
      const after = (await getQueueStats(NOTIFICATIONS_QUEUE)).publishedTotal;
      expect(
        after,
        'switch OFF must emit zero notification events on the shared queue'
      ).toBe(baseline);

      // AS4 (FR-007): the contribution is fully created and visible in the
      // callout regardless — activity is unconditional.
      await loadSpacePage(authPage);
      await expect(
        responseCalloutCard(authPage).getByText(title)
      ).toBeVisible();

      // ...and in the space's Recent Activity feed, exactly like a notified one.
      const activity = await openRecentActivity(authPage);
      await expect(activity.getByText(title)).toBeVisible();
      await activity.getByRole('button', { name: 'Close' }).click();
    });

    // ── US1-AS5 ──────────────────────────────────────────────────────────

    test('US1-AS5: a Tasks board task with the switch OFF holds AS1–AS4 identically', async () => {
      // Create the Tasks board callout itself (switch left OFF — irrelevant
      // to this scenario, which is about the TASK's notify switch).
      await loadSpacePage(authPage);
      await authPage
        .getByRole('navigation', { name: 'Space sidebar' })
        .getByRole('button', { name: 'Add Post' })
        .click();
      let dialog = calloutCreateDialog(authPage);
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole('textbox', { name: 'Title' })
        .fill(taskBoardDisplayName);
      await dialog.getByRole('radio', { name: 'Tasks board' }).click();
      await dialog.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(dialog).toBeHidden();

      await loadSpacePage(authPage);
      const board = taskBoardCard(authPage);
      await expect(board).toBeVisible();

      const baseline = (await getQueueStats(NOTIFICATIONS_QUEUE))
        .publishedTotal;

      const taskTitle = `AS5 zero-notify task ${Date.now()}`;
      await board.getByRole('button', { name: 'Add task' }).first().click(); // "To Do" column
      const taskDialog = taskCreateDialog(authPage);
      await expect(taskDialog).toBeVisible();
      await taskDialog.getByRole('textbox', { name: 'Title' }).fill(taskTitle);
      await taskDialog
        .getByRole('textbox', { name: 'Write your Post...' })
        .fill('AS5 acceptance-walk task body.');
      // Switch is left untouched — OFF by default, same as a response (AS1).
      await expect(
        taskDialog.getByRole('switch', { name: 'Notify space members' })
      ).toHaveAttribute('aria-checked', 'false');
      await taskDialog.getByRole('button', { name: 'Create task' }).click();
      await expect(taskDialog).toBeHidden();

      // AS3/AS4 hold identically for the task: zero notification events…
      await delay(NO_EMISSION_GRACE_MS);
      const after = (await getQueueStats(NOTIFICATIONS_QUEUE)).publishedTotal;
      expect(
        after,
        'a task created with the switch OFF must emit zero notification events'
      ).toBe(baseline);

      // …and the task is fully visible on the board and in the activity feed.
      await loadSpacePage(authPage);
      await expect(taskBoardCard(authPage).getByText(taskTitle)).toBeVisible();
      const activity = await openRecentActivity(authPage);
      await expect(activity.getByText(taskTitle)).toBeVisible();
      await activity.getByRole('button', { name: 'Close' }).click();
    });
  }
);
