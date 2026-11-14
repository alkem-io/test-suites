import {
  expect,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  AuthorizationPrivilege,
  readWhiteboardGuestAccess,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import {
  baseUrl,
  expectMutationAnswered,
} from '../helpers/space-access.helper';
import {
  openSettingsTab,
  saveSettings,
  serverSettings,
  settingSwitch,
} from '../space-settings-write/space-settings-write.helpers';
import { editorOf } from '../whiteboard-collaboration/whiteboard-collaboration.helpers';

/**
 * Whiteboard guest share (W2 journey 5b): the Space's "Guest Contributions"
 * setting, the share dialog's guest toggle and link, and the public route
 * `/public/whiteboard/:whiteboardId` as an anonymous guest and as a signed-in
 * user. The board itself, its editor and the raw-document oracle are journey 5's
 * (`content-editing/`, `whiteboard-collaboration/`).
 *
 * How the product gates it (server `whiteboard.guest-access.service.ts`,
 * `whiteboard.service.authorization.ts`, client `useWhiteboardGuestAccess`,
 * `CrdPublicWhiteboardPage`):
 *   - the Space setting `collaboration.allowGuestContributions` grants Space admins (and the board's creator)
 *     PUBLIC_SHARE on the board; only then does the share dialog render its guest section;
 *   - the share dialog's switch adds the board's `public-access` rule (GLOBAL_GUEST and GLOBAL_REGISTERED get READ,
 *     UPDATE_CONTENT, CONTRIBUTE), and only then shows the link;
 *   - turning the Space setting off resets the Space's authorization, which drops that rule.
 */

export const GUEST_PATH = '/public/whiteboard';

export const guestUrlOf = (whiteboardId: string): string =>
  `${baseUrl}${GUEST_PATH}/${whiteboardId}`;

/** A browser context with no session at all: no cookies, no storage. */
export const openAnonymousPage = async (
  browser: Browser
): Promise<{ page: Page; close: () => Promise<void> }> => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    locale: 'en-US',
  });
  const page = await context.newPage();
  return { page, close: () => context.close() };
};

/** The board as `actor` may see it, unwrapped to the facts the gate turns on. Never throws: a refusal is `refused`. */
export const guestAccessAs = async (
  whiteboardId: string,
  actor: GraphqlActor,
  guestName?: string
): Promise<
  | {
      refused: false;
      guestContributionsAllowed: boolean;
      canPublicShare: boolean;
      canUpdateContent: boolean;
    }
  | { refused: true; errors: string[] }
> => {
  const result = await readWhiteboardGuestAccess(
    whiteboardId,
    actor,
    guestName
  );
  const whiteboard = result.data?.lookup.whiteboard;
  if (!whiteboard) {
    return {
      refused: true,
      errors: (result.error?.errors ?? []).map(e => `${e.code}: ${e.message}`),
    };
  }
  const privileges = whiteboard.authorization?.myPrivileges ?? [];
  return {
    refused: false,
    guestContributionsAllowed: whiteboard.guestContributionsAllowed,
    canPublicShare: privileges.includes(AuthorizationPrivilege.PublicShare),
    canUpdateContent: privileges.includes(AuthorizationPrivilege.UpdateContent),
  };
};

/**
 * Flip the Space's "Guest Contributions" switch to `on` in Settings › Settings and save; the save is checked three
 * ways (the browser's `updateSpaceSettings` answered without errors, the server reads the new value, the switch shows
 * it after a reload).
 */
export const setGuestContributions = async (
  page: Page,
  space: { id: string; nameId: string },
  on: boolean
) => {
  await openSettingsTab(page, space.nameId);
  const toggle = settingSwitch(page, 'Guest Contributions');
  await expect(
    toggle,
    'the switch starts from the other value'
  ).toHaveAttribute('aria-checked', String(!on));
  await toggle.click();
  await saveSettings(page);
  expect(
    (await serverSettings(space.id)).collaboration.allowGuestContributions,
    'server setting'
  ).toBe(on);
  await page.reload();
  await expect(settingSwitch(page, 'Guest Contributions')).toHaveAttribute(
    'aria-checked',
    String(on)
  );
};

/**
 * Open the editor's share dialog. Its own "Share URL" field is the positive control that the dialog rendered before
 * anything is asserted absent from it.
 */
export const openShareDialog = async (page: Page): Promise<Locator> => {
  const editor = await editorOf(page);
  await editor.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share', exact: true });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('textbox', { name: 'Share URL', exact: true })
  ).toBeVisible();
  return dialog;
};

/** The guest toggle in the share dialog (its name comes from the "Guest access" label it is described by). */
export const guestSwitch = (dialog: Locator): Locator =>
  dialog.getByRole('switch');

/** The guest link field, rendered only while the board is shared with guests. */
export const guestLinkField = (dialog: Locator): Locator =>
  dialog.getByRole('textbox', { name: 'Guest Access URL', exact: true });

/** Turn the board's guest access on from the share dialog and return the link the dialog offers. */
export const enableBoardGuestAccess = async (
  page: Page,
  dialog: Locator
): Promise<string> => {
  const toggle = guestSwitch(dialog);
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(
    guestLinkField(dialog),
    'no link before the board is shared'
  ).toHaveCount(0);
  const answered = expectMutationAnswered(page, 'updateWhiteboardGuestAccess');
  await toggle.click();
  await answered();
  await expect(guestSwitch(dialog)).toHaveAttribute('aria-checked', 'true');
  const field = guestLinkField(dialog);
  await expect(field).toBeVisible();
  return field.inputValue();
};

/**
 * authorization-evaluation-service's policy cache TTL (its start-up log: "Policy cache initialized ... ttl 60"; no
 * environment configures the invalidation subject, so an entry lives its whole TTL). The collaboration service asks it
 * whether an actor may join a room, so a change to a board's policy reaches the room only after this long (KD-2).
 */
export const AES_POLICY_CACHE_TTL_MS = 60_000;

/** Open `url` with no name in the session, give `name` to the name prompt, and join. */
export const joinAsGuest = async (
  page: Page,
  url: string,
  name: string
): Promise<void> => {
  await page.goto(url);
  const prompt = joinDialog(page);
  await expect(
    prompt,
    'an anonymous visitor is asked for a name'
  ).toBeVisible();
  await prompt
    .getByRole('textbox', { name: 'Guest display name', exact: true })
    .fill(name);
  await prompt
    .getByRole('button', { name: 'Join as Guest', exact: true })
    .click();
  await expect(prompt).toBeHidden();
};

/**
 * The public route's editor is mounted and editable: the toolbar exists only once the room admitted the session (a
 * refused session keeps a blank canvas with "Unavailable" in the footer).
 */
export const expectGuestEditorReady = async (
  page: Page,
  timeout?: number
): Promise<void> => {
  const editor = page
    .getByRole('dialog')
    .filter({ has: page.getByText('Drawing canvas') })
    .last();
  await expect(editor).toBeVisible({ timeout });
  await expect(editor.getByTitle(/^Rectangle —/)).toBeVisible({ timeout });
};

/** The public route's name prompt (`JoinWhiteboardDialog`). */
export const joinDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Join Whiteboard', exact: true });

/**
 * The public route's refusal: its full-page error state (`WhiteboardErrorState`, an h1) in place of the editor.
 * The product means it to read "Whiteboard Not Found" for a board that is not shared (spec 005 FR-013, FR-013a,
 * US "error messages" AC2), and that wording is pinned by its own case; today an authorization refusal reads
 * "Something Went Wrong" (see the plan's KD-1). Either heading is a refusal: no board content is served.
 */
export const refusalState = (page: Page): Locator =>
  page.getByRole('heading', {
    level: 1,
    name: /^(Whiteboard Not Found|Something Went Wrong)$/,
  });

/** The wording the product intends for a board that is not shared with guests. */
export const notFoundState = (page: Page): Locator =>
  page.getByRole('heading', {
    level: 1,
    name: 'Whiteboard Not Found',
    exact: true,
  });

/** The guest name the public route keeps for the session (`alkemio_guest_name`, read by the editor and the header link). */
export const storedGuestName = (page: Page): Promise<string | null> =>
  page.evaluate(() => globalThis.sessionStorage.getItem('alkemio_guest_name'));

/**
 * client-web's `anonymizeGuestName`, for the expected value: the first word of the first name, a space, and the
 * upper-cased initial of the last name, with everything outside letters, digits, space, `_` and `-` stripped.
 */
export const anonymizedName = (firstName: string, lastName: string): string => {
  const clean = (s: string) =>
    s
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  return `${clean(firstName).split(' ')[0]} ${clean(lastName).charAt(0).toUpperCase()}`;
};
