/**
 * Persisted P1 acceptance walk for callout-reaction NOTIFICATIONS (041).
 *
 * Landing target declared in the execution contract:
 *   specs/041-callout-reaction-notifications/repos.yaml
 *     → forge.verification.acceptance.US1.persist_spec_to
 *   (test-suites/client-web/tests/callout-reaction-notifications.spec.ts)
 *
 * Authored by forge-verify (Phase V) from a green pseudo-manual acceptance walk
 * driven headless against the live stack at http://localhost:3000 (the gateway;
 * NEVER :3001 — the raw vite origin is CORS-blocked and yields false failures).
 *
 * WHAT THIS PROVES (the client-rendering surface — the one thing the gql-live
 * track cannot assert). The data layer (emit / suppress / settings gate) is
 * already covered by verify-gql-live.md and the server/notifications repo specs.
 * This walk asserts that the CRD in-app notification centre renders and links
 * the reaction event correctly for the recipient:
 *
 *   US1-AS1  A genuine reaction by another member surfaces to the publisher B
 *            as EXACTLY ONE in-app row whose copy names the reactor (bold) and
 *            shows the reacted emoji as a GLYPH (❤️), not the wire slug ("heart")
 *            — FR-015 / FR-017.
 *   US1-AS6  Clicking that row navigates B to the target callout — FR-016.
 *   US1-AS4  B reacting to B's OWN callout produces NO self-notification row
 *            (negative; self-suppression rendered as absence).
 *   US1-AS2  A swapping to a different emoji produces NO additional row for B
 *            (negative; a swap is not a new genuine reaction). The pre-existing
 *            row's copy is unchanged — the notification is an immutable event
 *            record, not a live mirror of the current reaction.
 *
 * CROSS-PERSONA SHAPE. A reaction notification requires a reactor distinct from
 * the recipient (self-reactions are suppressed — AS4). Rather than run a second
 * interactive browser login, the walk seeds a second verified space member (A)
 * and performs A's reactions through the API as A's own bearer token — a genuine
 * end-user action producing the real event — while driving the BROWSER as the
 * recipient B to assert the rendered notification. The reactions are real; only
 * the actor's click is issued over GraphQL instead of a second mouse.
 *
 * Self-seeding: creates its own org + space + PUBLISHED post callout and a fresh
 * member A via @alkemio/tests-lib, and tears the scenario down in afterAll, so it
 * runs in isolation or alongside the other nightly projects without shared state.
 *
 * Authentication: signs in the recipient B (platform admin) once in beforeAll via
 * the CRD login helper and retains the authenticated BrowserContext for the whole
 * file, so B's session cookies are present for every assertion.
 *
 * Run standalone:
 *   cd client-web
 *   pnpm exec playwright test --config=config/playwright.config.nightly.ts \
 *     --project="Callout reaction notifications"
 *   # (wired as a project in config/playwright.config.nightly.ts with its own
 *   #  testDir — testMatch alone cannot reach outside src/functional-e2e/.)
 */

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  TestScenarioFactory,
  createCalloutOnCalloutsSet,
  assignRoleToUser,
  registerInKratosOrFail,
  verifyInKratosOrFail,
  registerInAlkemioOrFail,
  getUserToken,
  getGraphqlClient,
  UniqueIDGenerator,
  delay,
} from '@alkemio/tests-lib';
import {
  CalloutVisibility,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { loginViaCrd } from '../src/functional-e2e/helpers/login.helper';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@alkem.io';

/**
 * slug → glyph, mirroring client-web src/crd/components/reactions/reactionEmoji.ts.
 * The wire carries the slug (FR-017); the client owns the glyph. Asserting the
 * glyph (and the ABSENCE of the raw slug) is the load-bearing rendering check.
 */
const GLYPH = {
  heart: '❤️',
  'hugging-face': '🤗',
  'clapping-hands': '👏',
  'light-bulb': '💡',
  bullseye: '🎯',
  'check-mark': '✅',
  rocket: '🚀',
} as const;

/**
 * Registers + verifies a fresh user (Kratos), then ensures the Alkemio user
 * exists and returns its id — the same three steps the library's internal
 * `registerVerifiedUser` performs, composed here from the package's
 * index-exported registration helpers so no non-exported symbol is imported.
 */
async function registerVerifiedMember(
  email: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const { verificationFlowId } = await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email, verificationFlowId);
  return registerInAlkemioOrFail(firstName, lastName, email);
}

/** React to a callout as a specific user (their own bearer) — a genuine action. */
async function reactAs(token: string, calloutID: string, emoji: string) {
  const res = await getGraphqlClient().AddReactionToCallout(
    { reactionData: { calloutID, emoji } },
    { authorization: `Bearer ${token}` }
  );
  const id = res.data?.addReactionToCallout?.id;
  expect(id, `react (${emoji}) should succeed`).toBeTruthy();
  return id;
}

test.describe.configure({ mode: 'serial' });

test.describe(
  'Callout reaction notifications — US1 P1 acceptance walk',
  { tag: ['@callout-reaction-notifications'] },
  () => {
    let scenario: OrganizationWithSpaceModel;
    let calloutId: string;
    let calloutDisplayName: string;

    // Reactor A — a fresh space member, distinct from the recipient B.
    let reactorEmail: string;
    let reactorDisplayName: string;
    let reactorToken: string;
    let reactorId: string;

    // Recipient B — the platform admin; drives the browser.
    let adminToken: string;
    let adminDisplayName: string;

    // Authenticated browser context for B, reused across every serial test.
    let authContext: BrowserContext;
    let authPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);

      // Seed: org + space, then a PUBLISHED post callout on the space's calloutsSet,
      // owned by the admin B (the publisher → the reaction recipient, FR-005).
      // The `space` key must be present: the factory creates no space (and
      // leaves calloutsSetId/roleSetId empty) for a name-only config.
      scenario = await TestScenarioFactory.createBaseScenario({
        name: `reaction-notif-p1-${Date.now()}`,
        space: { collaboration: { addTutorialCallouts: false } },
      });

      calloutDisplayName = `Reaction-notif P1 post ${Date.now()}`;
      const created = await createCalloutOnCalloutsSet(
        scenario.space.collaboration.calloutsSetId,
        {
          framing: { profile: { displayName: calloutDisplayName } },
          settings: {
            framing: { commentsEnabled: true },
            contribution: { enabled: false },
            visibility: CalloutVisibility.Published,
          },
        }
      );
      calloutId = created.data?.createCalloutOnCalloutsSet?.id as string;
      expect(calloutId, 'seed: published post callout should be created').toBeTruthy();

      // Register a fresh verified user A and make them a MEMBER of the space so
      // they hold CONTRIBUTE and may react (FR-009). A must differ from B, since
      // a self-reaction is suppressed (AS4).
      const uid = UniqueIDGenerator.getID();
      reactorEmail = `reaction-notif-a-${uid}@alkem.io`;
      const firstName = `Reactor${uid}`;
      const lastName = 'A';
      reactorDisplayName = `${firstName} ${lastName}`;
      reactorId = await registerVerifiedMember(reactorEmail, firstName, lastName);
      expect(reactorId, 'seed: reactor A should register').toBeTruthy();

      await assignRoleToUser(
        reactorId,
        scenario.space.community.roleSetId,
        RoleName.Member
      );

      reactorToken = await getUserToken(reactorEmail);
      adminToken = await getUserToken(ADMIN_EMAIL);

      // Capture the recipient's own display name so the self-notification
      // defence (AS4) can scope to a row attributed to the admin, rather than
      // counting every reaction row (the shared admin persona accumulates rows
      // from other suites/runs). Mirrors how TestUserManager resolves it via me.
      const meClient = getGraphqlClient() as unknown as {
        getMyUserInfo: (
          v: Record<string, never>,
          h: { authorization: string }
        ) => Promise<{
          data?: { me?: { user?: { profile?: { displayName?: string } } } };
        }>;
      };
      const adminInfo = await meClient.getMyUserInfo(
        {},
        { authorization: `Bearer ${adminToken}` }
      );
      adminDisplayName = adminInfo?.data?.me?.user?.profile?.displayName ?? '';
      expect(
        adminDisplayName,
        'seed: admin display name should resolve'
      ).toBeTruthy();

      // Sign the recipient B into the browser once; retain the context so every
      // page inherits the session cookies for the in-app notification centre.
      authContext = await browser.newContext();
      authPage = await authContext.newPage();
      await loginViaCrd(authPage, ADMIN_EMAIL);
    });

    test.afterAll(async () => {
      await authContext?.close().catch(() => undefined);

      // Remove reactor A — Kratos identity AND Alkemio user — before scenario
      // cleanup. The library `deleteUser` helper is not index-exported and
      // defaults to deleteIdentity:false, so issue the mutation directly with
      // deleteIdentity:true (mirrors the chat-avatars teardown). Caught so
      // scenario cleanup still runs if the delete fails.
      if (reactorId) {
        const sdk = getGraphqlClient() as unknown as {
          deleteUser: (
            v: { deleteData: { ID: string; deleteIdentity: boolean } },
            h: { authorization: string }
          ) => Promise<unknown>;
        };
        await sdk
          .deleteUser(
            { deleteData: { ID: reactorId, deleteIdentity: true } },
            { authorization: `Bearer ${adminToken}` }
          )
          .catch(() => undefined);
      }

      if (scenario) {
        await TestScenarioFactory.cleanUpBaseScenario(scenario);
      }
    });

    // ── locators (map 1:1 onto the CRD notification centre) ──────────────────
    //   NotificationsBell   → header button, accessible name "Notifications".
    //   NotificationsPanel  → dialog with heading "Notifications".
    //   NotificationItem    → a button per row; its accessible name is the
    //     rendered subject text, e.g. "«Reactor» reacted to your Post with ❤️",
    //     with the reactor name in a <strong>.

    function bell(page: Page) {
      return page.getByRole('button', { name: 'Notifications' });
    }

    function panel(page: Page) {
      return page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: 'Notifications' }),
      });
    }

    /** All reaction rows addressed to B for THIS walk's reactor, by copy. */
    function reactionRows(page: Page) {
      return panel(page).getByRole('button', {
        name: new RegExp(`${reactorDisplayName} reacted to your Post with`),
      });
    }

    async function openBell(page: Page) {
      await page.goto(`${BASE_URL}/home`);
      await bell(page).click();
      await expect(panel(page)).toBeVisible();
    }

    async function closeBellIfOpen(page: Page) {
      const close = panel(page).getByRole('button', { name: 'Close' });
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    }

    /**
     * Polls the in-app centre until the recipient shows exactly `expected`
     * reaction rows for this reactor. The panel refetches on open, so we
     * re-open across attempts rather than trusting a single snapshot.
     *
     * POSITIVE wait only: `expect.poll` resolves as soon as one sample matches,
     * so it cannot hold a negative bound — a row that appears AFTER the first
     * matching sample would be missed. For negative assertions use
     * `assertReactionRowCountStable`, which requires EVERY sample across a fixed
     * window to match.
     */
    async function waitForReactionRowCount(page: Page, expected: number) {
      await expect
        .poll(
          async () => {
            await openBell(page);
            const n = await reactionRows(page).count();
            await closeBellIfOpen(page);
            return n;
          },
          { timeout: 30_000, intervals: [1_000, 2_000, 3_000] }
        )
        .toBe(expected);
    }

    /**
     * Holds a NEGATIVE bound: re-reads the reaction-row count several times
     * across a fixed window and fails if ANY sample deviates from `expected`.
     * Unlike `expect.poll` (which resolves on the first matching sample), this
     * catches a row that materialises late — a self-notification or a duplicate
     * that lands after the initial settle.
     */
    async function assertReactionRowCountStable(page: Page, expected: number) {
      const samples = 4;
      for (let i = 0; i < samples; i++) {
        await openBell(page);
        const n = await reactionRows(page).count();
        await closeBellIfOpen(page);
        expect(
          n,
          `reaction-row count must stay ${expected} across the settle window`
        ).toBe(expected);
        if (i < samples - 1) {
          await delay(2_000);
        }
      }
    }

    test('US1-AS1: a member reaction surfaces as exactly one row naming the reactor with the emoji GLYPH', async () => {
      // A genuinely reacts to B's published callout with ❤️.
      await reactAs(reactorToken, calloutId, 'heart');

      // B's centre shows exactly one row for this reactor.
      await waitForReactionRowCount(authPage, 1);

      // Inspect that row: reactor named in bold, emoji rendered as the ❤️ glyph
      // and NOT as the raw slug "heart".
      await openBell(authPage);
      const row = reactionRows(authPage).first();
      await expect(row).toBeVisible();
      await expect(row).toHaveAccessibleName(
        new RegExp(`^${reactorDisplayName} reacted to your Post with ${GLYPH.heart}$`)
      );
      await expect(row.locator('strong')).toHaveText(reactorDisplayName); // bold reactor
      await expect(row).toContainText(GLYPH.heart); // glyph rendered
      await expect(row).not.toContainText('heart'); // never the wire slug
      await closeBellIfOpen(authPage);
    });

    test('US1-AS6: clicking the reaction row navigates B to the target callout (deep link)', async () => {
      await openBell(authPage);
      const row = reactionRows(authPage).first();
      await expect(row).toBeVisible();

      await row.click();

      // The client routes to the callout (FR-016). The reaction notification's
      // destination is the callout's own URL: /{space}/collaboration/{callout}.
      await expect(authPage).toHaveURL(
        new RegExp(`/${scenario.space.nameId}/collaboration/`)
      );
      // And the destination renders the callout we reacted to. The click-through
      // opens the callout dialog over the collaboration page, so the title
      // renders twice (page h1 + dialog h2) — assert the first, not a unique hit.
      await expect(
        authPage.getByRole('heading', { name: calloutDisplayName }).first()
      ).toBeVisible({ timeout: 30_000 });
    });

    test("US1-AS4: B reacting to B's OWN callout produces no self-notification row", async () => {
      // Establish the current row count for this reactor (1 from AS1).
      const before = 1;

      // B reacts to B's own callout — allowed, but must not notify B.
      await reactAs(adminToken, calloutId, 'clapping-hands');

      // Give any (erroneous) self-notification the full settle window to appear,
      // then assert the reactor-row count is unchanged across a fixed window: no
      // self-row was added, and none appears late.
      await delay(3_000);
      await assertReactionRowCountStable(authPage, before);

      // Defence: no row is attributed to the admin's OWN self-reaction. Scope to
      // the admin's display name and assert ABSENCE — the shared admin persona
      // accumulates reaction rows from other suites, so an absolute total would
      // be flaky.
      await openBell(authPage);
      await expect(
        panel(authPage).getByRole('button', {
          name: new RegExp(`^${adminDisplayName} reacted to your Post with`),
        })
      ).toHaveCount(0);
      await closeBellIfOpen(authPage);
    });

    test('US1-AS2: A swapping to a different emoji adds no new row (swap is not a new reaction)', async () => {
      // Snapshot the existing row's copy — it must not change on a swap.
      await openBell(authPage);
      const rowBefore = reactionRows(authPage).first();
      await expect(rowBefore).toHaveAccessibleName(
        new RegExp(`reacted to your Post with ${GLYPH.heart}$`)
      );
      await closeBellIfOpen(authPage);

      // A swaps ❤️ → 🚀 (still one reaction, just a different emoji).
      await reactAs(reactorToken, calloutId, 'rocket');

      // No additional row for B; the count stays at 1 across the settle window.
      await delay(3_000);
      await assertReactionRowCountStable(authPage, 1);

      // The surviving row is the ORIGINAL event: still ❤️, an immutable record
      // rather than a live mirror of A's now-🚀 reaction.
      await openBell(authPage);
      await expect(reactionRows(authPage).first()).toHaveAccessibleName(
        new RegExp(`reacted to your Post with ${GLYPH.heart}$`)
      );
      await expect(reactionRows(authPage).first()).not.toContainText(GLYPH.rocket);
      await closeBellIfOpen(authPage);
    });
  }
);
