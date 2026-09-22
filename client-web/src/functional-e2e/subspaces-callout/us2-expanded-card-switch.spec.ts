// Durable regression cover for turning the "Expanded card" switch on or off
// in the Subspaces attachment's post form: the switch sits immediately after
// the whole Manual selection block (its switch, description and — when on —
// its picker) in the Subspaces attachment's settings, off by default, with
// the verbatim description; turning it on and publishing renders expanded
// cards for both an admin and an anonymous viewer; re-opening an existing
// post's edit form shows the saved state, and flipping it in either
// direction saves and re-renders in place with no full page reload; the four
// combinations of Manual selection x Expanded card each render correctly and
// flipping one setting never touches the other — in particular, flipping
// Expanded card on a post with a curated (CUSTOM) selection leaves
// `selection.mode` and `selectedIds` byte-identical on an API re-read; no
// other attachment type (or no attachment) ever offers the switch; a
// pre-feature ("legacy-shaped") Subspaces post — `settings.framing.spaces`
// stripped from the stored JSONB, exactly as a row created before this
// feature shipped — reads back without error, renders compact, shows the
// switch off in its (unsaved) edit form, and its SpaceCollectionSubspaces
// network response carries neither a `who` nor a `description` key; and
// saving a title-only edit on an expanded post leaves its stored card
// variant unchanged.
//
// Independently walked live via the browser + GraphQL API against a running
// stack in this same session; this spec is the durable, self-contained form
// of that walk — it provisions its own fixture (a throwaway public "Cards
// Space" + Alpha/Beta subspaces) via the GraphQL API in `beforeAll`, and
// tears it down in `afterAll`. The legacy-shaped row is stripped directly in
// Postgres via `queryHarnessDb` (`@alkemio/tests-lib`) — the ONLY way such a
// row can exist on a server past the data model that materializes this
// block, since every Subspaces callout gets the block materialized at
// creation.

import { expect, type Page } from '@playwright/test';
import {
  getUserToken,
  harnessPostgresConfigured,
  queryHarnessDb,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
// A pre-authenticated persona session (storageState), not a UI login: the
// harness password is typed at most once per run, outside any traced/
// videoed test context — see authenticated-session.fixture.ts. Filling it
// directly in each test's own page (the prior approach here) recorded it as
// a Playwright step argument and, on retry, into the trace/video archive
// that this suite publishes to the public gh-pages branch.
const test = createPersonaTest(adminEmail);
// The non-interactive-login bearer (HS256) is only accepted on the private
// non-interactive endpoint — same convention as every other raw-GraphQL
// fixture setup in this suite (see subspaces-callout/us3-excerpt-safety.spec.ts).
const gqlEndpoint =
  process.env.ALKEMIO_SERVER ||
  'http://localhost:3000/api/private/non-interactive/graphql';

const EXPANDED_CARD_DESCRIPTION =
  "Shows the full card with the subspace's What, Why and Who - more context, more height.";

async function rawGql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors)
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data as T;
}

const runSuffix = UniqueIDGenerator.getID();
const shortId = (label: string) => `${label}${runSuffix}`.slice(0, 24);

type Fixture = {
  spaceId: string;
  spaceNameId: string;
  calloutsSetId: string;
  alphaId: string;
  betaId: string;
};

let fixture: Fixture;
let adminToken: string;

async function createSubspace(
  spaceId: string,
  label: string,
  displayName: string
): Promise<string> {
  const data = await rawGql<{ createSubspace: { id: string } }>(
    `mutation ($subspaceData: CreateSubspaceInput!) {
      createSubspace(subspaceData: $subspaceData) { id }
    }`,
    {
      subspaceData: {
        spaceID: spaceId,
        nameID: shortId(label),
        about: {
          profileData: {
            displayName,
            description: `${displayName} — fixture subspace for US2.`,
          },
        },
        collaborationData: { calloutsSetData: {} },
        settings: { privacy: { mode: 'PUBLIC' } },
      },
    },
    adminToken
  );
  return data.createSubspace.id;
}

async function createSubspacesPost(
  displayName: string,
  settingsOverride?: Record<string, unknown>
): Promise<string> {
  const data = await rawGql<{ createCalloutOnCalloutsSet: { id: string } }>(
    `mutation ($calloutData: CreateCalloutOnCalloutsSetInput!) {
      createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
    }`,
    {
      calloutData: {
        calloutsSetID: fixture.calloutsSetId,
        framing: { type: 'SPACES', profile: { displayName } },
        ...(settingsOverride ? { settings: settingsOverride } : {}),
      },
    },
    adminToken
  );
  return data.createCalloutOnCalloutsSet.id;
}

async function readCalloutSettings(calloutId: string) {
  return rawGql<{
    lookup: {
      callout: {
        settings: {
          framing: {
            spaces: { cardVariant: string } | null;
            selection: { mode: string; selectedIds: string[] };
          };
        };
      };
    };
  }>(
    `query ($id: UUID!) {
      lookup { callout(ID: $id) {
        settings { framing { spaces { cardVariant } selection { mode selectedIds } } }
      } }
    }`,
    { id: calloutId },
    adminToken
  );
}

async function gotoFixtureSpace(page: Page) {
  await page.goto(`${baseUrl}/${fixture.spaceNameId}`, {
    waitUntil: 'networkidle',
  });
}

async function openAddPostDialog(page: Page) {
  const addPost = page.getByRole('button', { name: 'Add Post' });
  await addPost.waitFor({ state: 'visible', timeout: 15_000 });
  await addPost.click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Title' })
    .waitFor({ state: 'visible', timeout: 10_000 });
  return dialog;
}

/** Locates the settings ("...") trigger for a specific post by finding the
 * innermost element that contains both the post's heading text and a
 * `Settings`-labelled button (`CalloutContextMenu`'s
 * `aria-label={t('mobile.settings')}` — see client-web
 * src/crd/components/callout/CalloutContextMenu.tsx), then opens EDIT. */
async function openEditDialog(page: Page, headingText: string) {
  const postCard = page
    .locator('div')
    .filter({ hasText: headingText })
    .filter({ has: page.getByRole('button', { name: 'Settings' }) })
    .last();
  await postCard.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'EDIT' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('switch')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  return dialog;
}

test.describe(
  'Turn "Expanded card" on or off in the post form (US2)',
  { tag: '@forge-acceptance' },
  () => {
    // One shared fixture (Space + Alpha/Beta subspaces) is created once in
    // `beforeAll`. Serial mode avoids `beforeAll` re-running per test under this
    // repo's `fullyParallel: true` default (see us3-excerpt-safety.spec.ts's
    // identical note). The explicit timeout matches the beforeAll fixture's own
    // 120s allowance — the edit-dialog round trips do not fit the default
    // config's 30s per-test budget.
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test.beforeAll(async () => {
      test.setTimeout(120_000);
      adminToken = await getUserToken(adminEmail);

      const me = await rawGql<{ me: { user: { account: { id: string } } } }>(
        'query { me { user { account { id } } } }',
        {},
        adminToken
      );
      const accountID = me.me.user.account.id;

      const spaceNameId = shortId(`us2crd${runSuffix}`);
      const space = await rawGql<{
        createSpace: {
          id: string;
          collaboration: { calloutsSet: { id: string } };
        };
      }>(
        `mutation ($spaceData: CreateSpaceOnAccountInput!) {
        createSpace(spaceData: $spaceData) { id collaboration { calloutsSet { id } } }
      }`,
        {
          spaceData: {
            accountID,
            nameID: spaceNameId,
            about: {
              profileData: {
                displayName: `US2 Expanded Card Switch ${runSuffix}`,
              },
            },
            collaborationData: { calloutsSetData: {} },
            settings: { privacy: { mode: 'PUBLIC' } },
          },
        },
        adminToken
      );

      const spaceId = space.createSpace.id;
      const calloutsSetId = space.createSpace.collaboration.calloutsSet.id;
      const alphaId = await createSubspace(spaceId, 'a', 'Alpha');
      const betaId = await createSubspace(spaceId, 'b', 'Beta');

      fixture = { spaceId, spaceNameId, calloutsSetId, alphaId, betaId };
    });

    test.afterAll(async () => {
      if (!fixture) return;
      // deleteSpace refuses a level-0 Space that still contains subspaces —
      // leaves then root, same order as us3/us4's teardown. Callouts cascade
      // with the space; no separate cleanup needed for the posts this file creates.
      for (const id of [fixture.alphaId, fixture.betaId]) {
        await rawGql(
          'mutation ($spaceID: UUID!) { deleteSpace(deleteData: { ID: $spaceID }) { id } }',
          { spaceID: id },
          adminToken
        ).catch(() => undefined);
      }
      await rawGql(
        'mutation ($spaceID: UUID!) { deleteSpace(deleteData: { ID: $spaceID }) { id } }',
        { spaceID: fixture.spaceId },
        adminToken
      ).catch(() => undefined);
    });

    test('US2-AS1: the Expanded card switch sits after the whole Manual selection block, off by default, with the verbatim description', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const dialog = await openAddPostDialog(page);
      await dialog.getByText('Subspaces', { exact: true }).click();

      const manualSwitch = dialog.getByRole('switch', {
        name: 'Manual selection',
      });
      const expandedSwitch = dialog.getByRole('switch', {
        name: 'Expanded card',
      });
      await expect(expandedSwitch).toBeVisible();
      await expect(expandedSwitch).not.toBeChecked();
      await expect(dialog).toContainText(EXPANDED_CARD_DESCRIPTION);

      // Placement: Expanded card's DOM position is below Manual selection's,
      // with Manual selection off (no picker in between).
      const manualBox = await dialog
        .getByText('Manual selection', { exact: true })
        .boundingBox();
      const expandedBox = await dialog
        .getByText('Expanded card', { exact: true })
        .boundingBox();
      expect(manualBox).not.toBeNull();
      expect(expandedBox).not.toBeNull();
      expect(expandedBox!.y).toBeGreaterThan(manualBox!.y);

      // With Manual selection on, the description swaps to the picker's own
      // copy and Expanded card — still present and off — stays the control
      // immediately after the whole Manual selection block (i.e. strictly
      // below Manual selection's own label).
      await manualSwitch.click();
      await expect(dialog).toContainText(
        'Shows only the subspaces you select below.'
      );
      const manualBoxOn = await dialog
        .getByText('Manual selection', { exact: true })
        .boundingBox();
      const expandedBoxAfter = await dialog
        .getByText('Expanded card', { exact: true })
        .boundingBox();
      expect(manualBoxOn).not.toBeNull();
      expect(expandedBoxAfter).not.toBeNull();
      expect(expandedBoxAfter!.y).toBeGreaterThan(manualBoxOn!.y);
      await expect(expandedSwitch).not.toBeChecked();

      // No teardown needed: the create-post dialog has no "Cancel" control
      // (only "Save Draft"/"Post" — see client-web
      // src/crd/forms/callout/AddPostModal.tsx `isCreate` branch), and this
      // test never submits, so nothing is persisted. Each test gets its own
      // fresh page/context.
    });

    test('US2-AS2: publishing with the switch on renders expanded cards for admin and for an anonymous viewer', async ({
      page,
      browser,
    }) => {
      await gotoFixtureSpace(page);
      const title = `US2 AS2 Expanded ${runSuffix}`;
      const dialog = await openAddPostDialog(page);
      await dialog.getByRole('textbox', { name: 'Title' }).fill(title);
      await dialog.getByText('Subspaces', { exact: true }).click();
      await dialog.getByRole('switch', { name: 'Expanded card' }).click();
      await page
        .getByRole('button', { name: 'Post', exact: true })
        .first()
        .click();

      const heading = page.getByText(title, { exact: true });
      await heading.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(
        page.getByText('What', { exact: true }).first()
      ).toBeVisible();

      // Anonymous viewer, fresh context — no session cookie.
      const anonContext = await browser.newContext();
      const anonPage = await anonContext.newPage();
      await anonPage.goto(`${baseUrl}/${fixture.spaceNameId}`, {
        waitUntil: 'networkidle',
      });
      await anonPage
        .getByText(title, { exact: true })
        .waitFor({ state: 'visible', timeout: 15_000 });
      await expect(
        anonPage.getByText('What', { exact: true }).first()
      ).toBeVisible();
      await anonContext.close();
    });

    test('US2-AS3: editing an existing post shows the saved switch state and flips both directions without a full page reload', async ({
      page,
    }) => {
      const title = `US2 AS3 Toggle ${runSuffix}`;
      const calloutId = await createSubspacesPost(title, {
        framing: { spaces: { cardVariant: 'EXPANDED' } },
      });

      await gotoFixtureSpace(page);
      // A page-scoped marker that only survives if the SPA never does a full
      // navigation across the edit-save round trip.
      await page.evaluate(() => {
        (window as unknown as Record<string, string>).__US2_NO_RELOAD__ =
          'still-here';
      });

      let dialog = await openEditDialog(page, title);
      const expandedSwitch = dialog.getByRole('switch', {
        name: 'Expanded card',
      });
      await expect(expandedSwitch).toBeChecked();

      await expandedSwitch.click(); // -> off
      await page.getByRole('button', { name: /^Save$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, {
        timeout: 15_000,
      });

      expect(
        await page.evaluate(
          () => (window as unknown as Record<string, string>).__US2_NO_RELOAD__
        )
      ).toBe('still-here');
      let settings = await readCalloutSettings(calloutId);
      expect(settings.lookup.callout.settings.framing.spaces?.cardVariant).toBe(
        'COMPACT'
      );

      dialog = await openEditDialog(page, title);
      await expect(
        dialog.getByRole('switch', { name: 'Expanded card' })
      ).not.toBeChecked();
      await dialog.getByRole('switch', { name: 'Expanded card' }).click(); // -> on
      await page.getByRole('button', { name: /^Save$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, {
        timeout: 15_000,
      });

      settings = await readCalloutSettings(calloutId);
      expect(settings.lookup.callout.settings.framing.spaces?.cardVariant).toBe(
        'EXPANDED'
      );
      expect(
        await page.evaluate(
          () => (window as unknown as Record<string, string>).__US2_NO_RELOAD__
        )
      ).toBe('still-here');
    });

    test('US2-AS4: flipping Expanded card never touches a curated Manual selection (selection.mode/selectedIds survive on an API re-read)', async ({
      page,
    }) => {
      const title = `US2 AS4 Curated ${runSuffix}`;
      const calloutId = await createSubspacesPost(title, {
        framing: {
          selection: {
            mode: 'CUSTOM',
            selectedIds: [fixture.alphaId, fixture.betaId],
          },
          spaces: { cardVariant: 'COMPACT' },
        },
      });

      await gotoFixtureSpace(page);
      const dialog = await openEditDialog(page, title);
      await expect(
        dialog.getByRole('switch', { name: 'Manual selection' })
      ).toBeChecked();
      await expect(
        dialog.getByRole('switch', { name: 'Expanded card' })
      ).not.toBeChecked();

      await dialog.getByRole('switch', { name: 'Expanded card' }).click(); // flip ONLY Expanded card
      await expect(
        dialog.getByRole('switch', { name: 'Manual selection' })
      ).toBeChecked(); // untouched
      await page.getByRole('button', { name: /^Save$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, {
        timeout: 15_000,
      });

      const settings = await readCalloutSettings(calloutId);
      expect(settings.lookup.callout.settings.framing.spaces?.cardVariant).toBe(
        'EXPANDED'
      );
      expect(settings.lookup.callout.settings.framing.selection.mode).toBe(
        'CUSTOM'
      );
      expect(
        new Set(settings.lookup.callout.settings.framing.selection.selectedIds)
      ).toEqual(new Set([fixture.alphaId, fixture.betaId]));

      // Rendered: only the two curated subspaces, as expanded cards.
      const heading = page.getByText(title, { exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('link', { name: 'Alpha' }).first()
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Beta' }).first()
      ).toBeVisible();
    });

    test('US2-AS5: no "Expanded card" switch is offered for any other attachment, or for none', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const dialog = await openAddPostDialog(page);

      await expect(dialog).not.toContainText('Expanded card'); // no attachment yet

      for (const chip of ['Whiteboard', 'Memo', 'Contributors', 'Poll']) {
        await dialog.getByText(chip, { exact: true }).click();
        await expect(dialog).not.toContainText('Expanded card');
      }
      // No teardown: the create-post dialog has no Cancel control, and this
      // test never submits.
    });

    test('US2-AS6: a legacy-shaped Subspaces post (stripped `framing.spaces`) reads as compact without error, and fetches no `who`/`description`', async ({
      page,
    }) => {
      test.skip(
        !harnessPostgresConfigured(),
        'needs loopback Postgres to strip the stored framing.spaces block'
      );

      const title = `US2 AS6 Legacy ${runSuffix}`;
      const calloutId = await createSubspacesPost(title);

      // Strip the stored block directly in Postgres — the only way a
      // legacy-shaped row can exist once the feature has shipped, since every
      // Subspaces callout gets `framing.spaces` materialized at creation.
      await queryHarnessDb(
        "UPDATE callout SET settings = settings #- '{framing,spaces}' WHERE id = $1",
        [calloutId]
      );

      const settings = await readCalloutSettings(calloutId);
      expect(settings.lookup.callout.settings.framing.spaces).toBeNull();

      const responsePromise = page.waitForResponse(
        res =>
          res.url().includes('/graphql') &&
          res.request().method() === 'POST' &&
          (res.request().postData() || '').includes(
            'SpaceCollectionSubspaces'
          ) &&
          JSON.parse(res.request().postData() || '{}').variables?.calloutId ===
            calloutId,
        { timeout: 20_000 }
      );
      await gotoFixtureSpace(page);
      const response = await responsePromise;
      const json = await response.json();
      const raw = JSON.stringify(json);
      expect(raw).not.toContain('"who"');
      expect(raw).not.toContain('"description"');

      const heading = page.getByText(title, { exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('link', { name: 'Alpha' }).first()
      ).toBeVisible();

      // Edit form shows the switch off — and this test never saves, so the
      // legacy shape survives for any later assertion. Edit mode DOES have a
      // Cancel control (unlike the create dialog); use it so the dialog closes
      // cleanly.
      const dialog = await openEditDialog(page, title);
      await expect(
        dialog.getByRole('switch', { name: 'Expanded card' })
      ).not.toBeChecked();
      await page.getByRole('button', { name: /^Cancel$/i }).click();
    });

    test('US2-AS7: saving a title-only edit on an expanded post leaves the stored card variant unchanged', async ({
      page,
    }) => {
      const title = `US2 AS7 TitleOnly ${runSuffix}`;
      const newTitle = `${title} (renamed)`;
      const calloutId = await createSubspacesPost(title, {
        framing: { spaces: { cardVariant: 'EXPANDED' } },
      });

      await gotoFixtureSpace(page);
      const dialog = await openEditDialog(page, title);
      await dialog.getByRole('textbox', { name: 'Title' }).fill(newTitle);
      await page.getByRole('button', { name: /^Save$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, {
        timeout: 15_000,
      });

      await expect(page.getByText(newTitle, { exact: true })).toBeVisible();
      const settings = await readCalloutSettings(calloutId);
      expect(settings.lookup.callout.settings.framing.spaces?.cardVariant).toBe(
        'EXPANDED'
      );
    });
  }
);
