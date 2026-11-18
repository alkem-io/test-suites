// spec: client-web/src/functional-e2e/whiteboard-guest-share/whiteboard-guest-share-test-plan.md
// W2 journey 5b (follow-up of journey 5, ruling L-6): a whiteboard shared with guests through the public route.
//
//   admin `space.admin` (browser: Space settings, the share dialog) · peer P (space.admin's bearer: the raw-document
//   and presence oracle) · anonymous guest (a fresh context with no session) · `non.space` (signed in, not a member)
//   · `space.member` (signed-in member, sees the guest's drawing) · PRIVATE Space, own seed (journey 5's)
//
// Serial chain: the gate closed (G-1) → opened, link taken from the share dialog (G-2) → an anonymous guest draws
// (G-3) → a signed-in user on the public route is shown anonymised (G-4) → the Space setting is turned off again and
// the same link refuses (G-5).
//
// The Space is PRIVATE, so neither the guest nor `non.space` can read the board through anything but the board's
// guest rule: every "can read" below is the share, not the Space's visibility.

import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  connectWhiteboardPeer,
  readMyUser,
  TestUser,
  TestUserManager,
  type RawElement,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import { serverSettings } from '../space-settings-write/space-settings-write.helpers';
import {
  canvasOf,
  dragOnCanvas,
  editorElement,
  editorOf,
  expectEditorAlive,
  openWhiteboardInEditor,
  pickTool,
} from '../whiteboard-collaboration/whiteboard-collaboration.helpers';
import {
  asWhiteboardSpace,
  newUid,
  seedContentSpace,
  teardownContent,
  type SeededContent,
} from '../content-editing/content-editing.helpers';
import {
  anonymizedName,
  enableBoardGuestAccess,
  guestAccessAs,
  guestSwitch,
  guestUrlOf,
  joinDialog,
  notFoundState,
  refusalState,
  openAnonymousPage,
  openShareDialog,
  AES_POLICY_CACHE_TTL_MS,
  expectGuestEditorReady,
  joinAsGuest,
  setGuestContributions,
  storedGuestName,
} from './whiteboard-guest-share.helpers';

const uid = newUid();
const GUEST_NAME = `Guest ${uid}`;
const MARKER = `GUEST ${uid}`;
/**
 * A refusal by the board's policy: exactly one error, `FORBIDDEN_POLICY` (server `lookup.whiteboard` →
 * `grantAccessOrFail(READ)`; contract LB-2). A transport failure, `ENTITY_NOT_FOUND` or an internal error is not it.
 */
const FORBIDDEN_POLICY_REFUSAL = {
  refused: true,
  errors: [expect.stringMatching(/^FORBIDDEN_POLICY: /)],
};

let scenario: OrganizationWithSpaceModel | undefined;
let seeded: SeededContent;
let admin: PersonaPage | undefined;
let guest: { page: Page; close: () => Promise<void> } | undefined;
const peers: WhiteboardPeer[] = [];
let peer: WhiteboardPeer;

// Recorded by G-2 / G-3, read later in the chain.
let guestLink = '';
let rectId = '';
let textId = '';
let rectRaw: RawElement | undefined;

const space = () => ({
  id: seeded.scenario.space.id,
  nameId: seeded.scenario.space.nameId,
});
const whiteboardId = () => seeded.whiteboardId!;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  seeded = await seedContentSpace('whiteboard', uid, s => {
    scenario = s;
  });
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
  // The oracle: the raw document and the names the other sessions present themselves under.
  peer = await connectWhiteboardPeer({
    whiteboardId: whiteboardId(),
    actor: TestUser.SPACE_ADMIN,
  });
  peers.push(peer);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await guest?.close();
  await admin?.close();
  await teardownContent(scenario, peers);
  scenario = undefined;
});

const geometry = (el: Record<string, unknown> | undefined) => ({
  type: el?.type,
  isDeleted: el?.isDeleted,
  x: el?.x,
  y: el?.y,
  width: el?.width,
  height: el?.height,
});

test.describe('W2 journey 5b — a whiteboard shared with guests', () => {
  test('G-1 with Guest Contributions off, the share dialog offers no guest link and the public route refuses an anonymous guest', async ({
    browser,
  }) => {
    // Preconditions: the Space starts with the setting off, and the admin's read is a real read of this board.
    expect(
      (await serverSettings(space().id)).collaboration.allowGuestContributions,
      'setting starts off'
    ).toBe(false);
    expect(
      await guestAccessAs(whiteboardId(), TestUser.SPACE_ADMIN),
      'the admin reads the board'
    ).toEqual({
      refused: false,
      guestContributionsAllowed: false,
      canPublicShare: false, // the gate: no PUBLIC_SHARE while the Space disallows guests
      canUpdateContent: true, // positive control: the read carries the admin's privileges
    });

    // UI: the share dialog rendered (its own Share URL is the positive control) and holds no guest toggle.
    const page = admin!.page;
    await openWhiteboardInEditor(page, asWhiteboardSpace(seeded));
    const dialog = await openShareDialog(page);
    await expect(
      guestSwitch(dialog),
      'no guest toggle in the share dialog'
    ).toHaveCount(0);
    await expect(dialog.getByText('Guest access', { exact: true })).toHaveCount(
      0
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // The public route, typed by hand: an anonymous guest is prompted for a name, then refused.
    const anonymous = await openAnonymousPage(browser);
    try {
      await joinAsGuest(anonymous.page, guestUrlOf(whiteboardId()), GUEST_NAME);
      await expect(
        refusalState(anonymous.page),
        'the public route refuses'
      ).toBeVisible();
      await expect(
        anonymous.page.getByText('Drawing canvas'),
        'no editor'
      ).toHaveCount(0);
    } finally {
      await anonymous.close();
    }
    // Server angle on the same refusal: a guest's read of the board is refused.
    const asGuest = await guestAccessAs(
      whiteboardId(),
      { anonymous: 'private' },
      GUEST_NAME
    );
    expect(
      asGuest.refused,
      `a guest reads the board: ${JSON.stringify(asGuest)}`
    ).toBe(true);
    // The refusal is the authorization denial (`lookup.whiteboard` → `grantAccessOrFail` READ), not any failure.
    expect(asGuest, 'the guest is refused by the board policy').toEqual(
      FORBIDDEN_POLICY_REFUSAL
    );
  });

  // KD-1: a board that is not shared is refused by the server as FORBIDDEN_POLICY ("Authorization: unable to grant
  // 'read' privilege ..."); the public page matches only "404 / not found / 403 / forbidden / not available" in the
  // error message, so it shows the generic "Something Went Wrong" with "Try Again" instead of the intended
  // "Whiteboard Not Found" (spec 005 FR-013, edge case "guest access is now disabled"). Drop the skip when fixed.
  test.skip('G-1a the public route\'s refusal of a board that is not shared reads "Whiteboard Not Found" (test-suites#724)', async ({
    browser,
  }) => {
    const anonymous = await openAnonymousPage(browser);
    try {
      await joinAsGuest(anonymous.page, guestUrlOf(whiteboardId()), GUEST_NAME);
      await expect(notFoundState(anonymous.page)).toBeVisible();
    } finally {
      await anonymous.close();
    }
  });

  test('G-2 the admin turns Guest Contributions on and shares the board from its share dialog; the dialog offers the guest link', async () => {
    const page = admin!.page;
    await setGuestContributions(page, space(), true);
    // The gate opened: the admin now holds PUBLIC_SHARE; the board itself is not shared yet.
    expect(await guestAccessAs(whiteboardId(), TestUser.SPACE_ADMIN)).toEqual({
      refused: false,
      guestContributionsAllowed: false,
      canPublicShare: true,
      canUpdateContent: true,
    });

    await openWhiteboardInEditor(page, asWhiteboardSpace(seeded));
    const dialog = await openShareDialog(page);
    guestLink = await enableBoardGuestAccess(page, dialog);
    expect(guestLink, 'the link the dialog offers').toBe(
      guestUrlOf(whiteboardId())
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await (await editorOf(page))
      .getByRole('button', { name: 'Close whiteboard' })
      .click();

    // Stored: the board's guest rule is in place, and a guest's read now succeeds (G-1's refusal, inverted).
    expect(
      await guestAccessAs(whiteboardId(), TestUser.SPACE_ADMIN)
    ).toMatchObject({
      refused: false,
      guestContributionsAllowed: true,
    });
    expect(
      await guestAccessAs(whiteboardId(), { anonymous: 'private' }, GUEST_NAME)
    ).toMatchObject({
      refused: false,
      guestContributionsAllowed: true,
    });
    // 057 US2-AS1: the share admits NAMED guests only. The same anonymous read without a guest name holds neither
    // GLOBAL_GUEST nor GLOBAL_REGISTERED, so the shared board still refuses it (the named read above is the control).
    const unnamed = await guestAccessAs(whiteboardId(), {
      anonymous: 'private',
    });
    expect(
      unnamed,
      `an anonymous visitor with no guest name reads the shared board: ${JSON.stringify(unnamed)}`
    ).toEqual(FORBIDDEN_POLICY_REFUSAL);
  });

  // KD-2: the collaboration service authorises the room join through authorization-evaluation-service, which caches
  // each authorization policy for 60 s and is never told it changed. Sharing the board needs its editor open, which
  // puts the board's (not yet shared) policy in that cache, so a guest who follows the link within the next minute is
  // refused by the room: the editor stays blank with "Unavailable" and does not retry. Drop the skip when fixed.
  test.skip('G-3a a guest who follows the link right after it is shared is admitted to the board at once (test-suites#724)', async ({
    browser,
  }) => {
    const anonymous = await openAnonymousPage(browser);
    try {
      await joinAsGuest(anonymous.page, guestLink, `${GUEST_NAME}a`);
      await expectGuestEditorReady(anonymous.page);
      await peer.waitFor(
        () => peer.remoteUsernames().includes(`${GUEST_NAME}a`),
        'the guest to be admitted to the room'
      );
    } finally {
      await anonymous.close();
    }
  });

  test('G-3 an anonymous guest opens the link, is asked for a name, and joins the board under that name', async ({
    browser,
  }) => {
    guest = await openAnonymousPage(browser);
    const page = guest.page;
    await joinAsGuest(page, guestLink, GUEST_NAME);
    expect(
      await storedGuestName(page),
      'the session keeps the entered name'
    ).toBe(GUEST_NAME);
    // Admission waits out KD-2 (G-3a): the room refuses the guest until authorization-evaluation-service's cached copy
    // of the board's policy (taken while it was being shared) expires, and the client never retries by itself, so the
    // guest reloads until the room admits them. The budget is that cache's TTL, a product constant (rebaseline
    // register), not a guess; once KD-2 is fixed the first attempt passes and this loop runs once.
    await expect(async () => {
      await page.reload();
      await expectGuestEditorReady(page, 5_000);
      // Presence: the room shows the guest under the name entered (what the other collaborators see).
      await peer.waitFor(
        () => peer.remoteUsernames().includes(GUEST_NAME),
        `the guest in the room as "${GUEST_NAME}"`,
        {
          timeoutMs: 5_000,
        }
      );
    }).toPass({ timeout: AES_POLICY_CACHE_TTL_MS + 20_000 });
    await expect(
      joinDialog(page),
      'the name is not asked again in this session'
    ).toHaveCount(0);
  });

  test("G-4 the guest draws: the drawing is in the stored document, a member sees it in a fresh session, and a second guest's edit reaches the first guest", async ({
    browser,
  }) => {
    const page = guest!.page;
    const editor = await editorOf(page);
    await pickTool(editor, /^Rectangle —/);
    await dragOnCanvas(page, editor, { x: 450, y: 150 }, { x: 650, y: 260 });
    await pickTool(editor, /^Text —/);
    await canvasOf(editor).click({ position: { x: 500, y: 400 } });
    await page.keyboard.type(MARKER);
    await page.keyboard.press('Escape'); // commits the text element

    // Oracle of record: the RAW document holds exactly the guest's two elements, and the service says it is stored.
    const live = await peer.waitFor(() => {
      const elements = peer.liveElements();
      return (
        elements.length === 2 &&
        elements.some(el => el.type === 'text' && String(el.text) === MARKER) &&
        elements
      );
    }, "the guest's rectangle and the whole marker text to reach the raw document");
    const rect = live.find(el => el.type === 'rectangle');
    const text = live.find(el => el.type === 'text');
    expect(rect, 'a rectangle').toBeDefined();
    expect(
      Number(rect!.width) > 0 && Number(rect!.height) > 0,
      'the rectangle has an area'
    ).toBe(true);
    rectId = rect!.id;
    textId = text!.id;
    rectRaw = peer.rawElement(rectId);
    await peer.awaitDurable();

    // A signed-in member, in a fresh context, gets the guest's drawing in their own editor.
    const member = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      const memberEditor = await openWhiteboardInEditor(
        member.page,
        asWhiteboardSpace(seeded)
      );
      await expect
        .poll(async () => geometry(await editorElement(memberEditor, rectId)), {
          message: "the member's scene holds the guest's rectangle as stored",
        })
        .toEqual(geometry(rectRaw));
      await expect
        .poll(async () => (await editorElement(memberEditor, textId))?.text, {
          message: "the member's scene holds the guest's text",
        })
        .toBe(MARKER);
      await expectEditorAlive(member.page, 'the member');
    } finally {
      await member.close();
    }

    // The same admission at the wire: a guest with no session is let into the shared board's room with write access
    // (positive control for G-7's refusal).
    const wireGuest = await connectWhiteboardPeer({
      whiteboardId: whiteboardId(),
      actor: { anonymous: 'private' },
      guestName: `${GUEST_NAME} wire`,
    });
    peers.push(wireGuest);
    expect(wireGuest.access, 'a guest is admitted to write').toBe('write');
    expect(
      wireGuest.rawElement(textId)?.text,
      'and reads the stored board'
    ).toBe(MARKER);

    // 057 US1-AS3: two named guests on one board (the browser guest and this wire guest) both stay connected and
    // receive each other's edits. The wire guest moves the browser guest's rectangle; the browser guest's own
    // editor applies the move.
    expect(
      geometry(wireGuest.rawElement(rectId)),
      "the wire guest holds the browser guest's rectangle"
    ).toEqual(geometry(rectRaw));
    const movedX = Number(rectRaw!.x) + 120;
    await wireGuest.write(elements => {
      elements.get(rectId)?.set('x', movedX);
    });
    await expect
      .poll(async () => (await editorElement(editor, rectId))?.x, {
        message: "the browser guest's editor applies the other guest's move",
      })
      .toBe(movedX);
    await expectEditorAlive(page, 'the browser guest');
    expect(wireGuest.socketState, 'the wire guest is still connected').toBe(
      'open'
    );
    await wireGuest.close();
    peers.splice(peers.indexOf(wireGuest), 1);

    // 057 US2-AS1 at the room: the same anonymous connect WITHOUT a guest name is not let in, seconds after the
    // named one was (the positive control above).
    const unnamed = await connectWhiteboardPeer({
      whiteboardId: whiteboardId(),
      actor: { anonymous: 'private' },
      requireWrite: false,
      connectTimeoutMs: 10_000,
    }).then(
      admitted => {
        peers.push(admitted);
        return `admitted with ${admitted.access} access`;
      },
      (error: Error) => `refused (${error.message})`
    );
    expect(
      unnamed,
      'an anonymous connect with no guest name is refused the shared room'
    ).toMatch(/^refused/);
    expect(
      unnamed,
      'refused by the room, not by a gateway failure'
    ).not.toMatch(/HTTP 5\d\d/);
  });

  /**
   * The signed-in non-member opens the guest link and joins; resolves with the name their session presents to the
   * room (the one session the peer did not see before). Runs as G-5 and as the skipped G-5a.
   */
  const joinSignedInAndReadPresentedName = async (browser: Browser) => {
    const me = must(
      await readMyUser(TestUser.NON_SPACE_MEMBER),
      'readMyUser(non.space)'
    ).me.user!;
    const fullName = String(me.profile?.displayName);
    const expected = anonymizedName(me.firstName, me.lastName);
    expect(expected, 'the anonymised form differs from the full name').not.toBe(
      fullName
    );
    // The Space is private: this user's only way to the board is the share (GLOBAL_REGISTERED in the guest rule).
    expect(
      await guestAccessAs(whiteboardId(), TestUser.NON_SPACE_MEMBER)
    ).toMatchObject({
      refused: false,
      canUpdateContent: true,
    });
    // The open guest page (G-3) is already in the room; the new session is the one name that was not there before.
    const before = peer.remoteUsernames();
    expect(before, 'the guest from G-3 is in the room').toContain(GUEST_NAME);

    const nonMember = await openPersonaPage(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
    const page = nonMember.page;
    await page.goto(guestLink);
    await expectGuestEditorReady(page);
    await expect(
      joinDialog(page),
      'a signed-in user is not asked for a name'
    ).toHaveCount(0);
    const presented = await peer.waitFor(() => {
      const now = peer.remoteUsernames();
      if (now.length !== before.length + 1) return undefined;
      const added = [...now];
      for (const name of before) added.splice(added.indexOf(name), 1);
      return added[0];
    }, 'the signed-in session to join the room');
    return { nonMember, page, presented, fullName, expected, me };
  };

  test('G-5 a signed-in non-member on the public route is not asked for a name, joins through the share, and is never shown by their full name', async ({
    browser,
  }) => {
    const { nonMember, presented, fullName, me } =
      await joinSignedInAndReadPresentedName(browser);
    try {
      expect(presented, 'the full name is not presented to the room').not.toBe(
        fullName
      );
      expect(presented, 'nor the last name').not.toContain(me.lastName);
    } finally {
      await nonMember.close();
    }
  });

  // KD-3: the public route derives the anonymised name only when `document.cookie` contains `ory_kratos_session=`
  // (`useGuestSession`), but that cookie is httpOnly, so the derivation never runs: nothing is stored under
  // `alkemio_guest_name` and the signed-in user is presented as the generic "Guest" (observed: "Guest" for non.space,
  // expected "non S"). The full name does not leak (G-5). Drop the skip when fixed.
  test.skip('G-5a a signed-in user on the public route is shown by their anonymised name ("First L") (test-suites#724)', async ({
    browser,
  }) => {
    const { nonMember, page, presented, expected } =
      await joinSignedInAndReadPresentedName(browser);
    try {
      expect(await storedGuestName(page), 'the derived guest name').toBe(
        expected
      );
      expect(presented, 'the name the room shows').toBe(expected);
    } finally {
      await nonMember.close();
    }
  });

  test('G-6 the admin turns Guest Contributions off again: the same guest link now refuses, and the share dialog offers no guest link', async () => {
    const page = admin!.page;
    await setGuestContributions(page, space(), false);
    // The Space's authorization reset dropped the board's guest rule and the admin's PUBLIC_SHARE.
    expect(await guestAccessAs(whiteboardId(), TestUser.SPACE_ADMIN)).toEqual({
      refused: false,
      guestContributionsAllowed: false,
      canPublicShare: false,
      canUpdateContent: true,
    });
    const asGuest = await guestAccessAs(
      whiteboardId(),
      { anonymous: 'private' },
      GUEST_NAME
    );
    expect(
      asGuest.refused,
      `a guest reads the board: ${JSON.stringify(asGuest)}`
    ).toBe(true);
    expect(asGuest, 'the revoked guest is refused by the board policy').toEqual(
      FORBIDDEN_POLICY_REFUSAL
    );

    // The guest's own session, same link: refused, not read-only (no editor at all).
    const guestPage = guest!.page;
    await guestPage.goto(guestLink);
    await expect(
      refusalState(guestPage),
      'the guest link refuses'
    ).toBeVisible();
    await expect(
      guestPage.getByText('Drawing canvas'),
      'no editor, not even read-only'
    ).toHaveCount(0);

    await openWhiteboardInEditor(page, asWhiteboardSpace(seeded));
    const dialog = await openShareDialog(page);
    await expect(
      guestSwitch(dialog),
      'no guest toggle after revocation'
    ).toHaveCount(0);
  });

  // KD-2, the security side: the room asks authorization-evaluation-service, whose cached copy of the board's policy
  // (60 s, never invalidated) still holds the guest rule, so for up to a minute after the revocation a guest with no
  // session is admitted to the room WITH WRITE ACCESS (observed: `access: "write"`), although the server and the page
  // already refuse (G-6). Drop the skip when fixed.
  test.skip('G-7 right after revocation the collaboration service refuses a guest too (test-suites#724)', async () => {
    // Positive control: before the revocation the same connection was admitted to write (end of G-4).
    const outcome = await connectWhiteboardPeer({
      whiteboardId: whiteboardId(),
      actor: { anonymous: 'private' },
      guestName: `${GUEST_NAME} revoked`,
      requireWrite: false,
    }).then(
      admitted => {
        peers.push(admitted);
        return `admitted with ${admitted.access} access`;
      },
      (error: Error) => `refused (${error.message})`
    );
    expect(outcome, 'a guest is refused the room after revocation').toMatch(
      /^refused/
    );
  });
});
