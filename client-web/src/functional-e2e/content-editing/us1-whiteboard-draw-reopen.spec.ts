// spec: client-web/src/functional-e2e/content-editing/content-editing-test-plan.md
// W2 journey 5 (docs/qa/server-rebuild/plan.md § W2), whiteboard: E8-1 … E8-4.
//
// `Whiteboard` has no content field in GraphQL and canvas pixels are not in the
// DOM, so the board's content is read three ways instead (plan ruling L-1):
//   - the RAW Yjs document of the live room, through the lib's Node peer (`connectWhiteboardPeer`),
//   - the collaboration service's own durability answer (`awaitDurable`: it said
//     `persisted`, i.e. the room's state is in the stores) — never the footer
//     "Saved", which only means "sent",
//   - the editor's own scene in a second browser (`editorElement`),
//   - plus the server's `updatedDate`, which moves when the service's save reaches the server.
//
//   author `space.admin` (browser, the editor) · peer P (space.admin's bearer, the oracle, E8-1 only)
//   colleague `space.member` (a second browser context) · private Space, own seed
//
// The chain is serial: draw (E8-1) → reopen as the author and as the member
// (E8-2) → the card preview (E8-3) → a cold load after the room is released
// (E8-4, `@local-stack`: it needs IDLE_RELEASE_SECONDS=0 on the collaboration service).
//
// What is a load from STORAGE: only E8-4. The peer leaves at the end of E8-1, but the room outlives its last member
// by the service's idle release (30 s by default), so in the nightly E8-2's reopens are served by the still-live room.
// With IDLE_RELEASE_SECONDS=0 (the local-stack runner) the room is released when E8-1's editor closes, and E8-2's
// reopens load from storage too.

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  connectWhiteboardPeer,
  readCollaborationRoomsActive,
  readWhiteboardState,
  TestUser,
  TestUserManager,
  WhiteboardPreviewMode,
  type RawElement,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  canvasOf,
  collectPageErrors,
  dragOnCanvas,
  editorElement,
  expectEditorAlive,
  openWhiteboardInEditor,
  pickTool,
} from '../whiteboard-collaboration/whiteboard-collaboration.helpers';
import {
  asWhiteboardSpace,
  newUid,
  seedContentSpace,
  spaceUrl,
  teardownContent,
  type SeededContent,
} from './content-editing.helpers';

const uid = newUid();
const MARKER = `WB ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let seeded: SeededContent;
let author: PersonaPage | undefined;
const peers: WhiteboardPeer[] = [];
let peer: WhiteboardPeer;

// Recorded by E8-1, read by E8-2 … E8-4.
let rectId = '';
let textId = '';
let rectRaw: RawElement | undefined;
let beforeUpdatedDate = '';
let beforeCardUri: string | undefined;
let beforePreviewUri: string | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  seeded = await seedContentSpace('whiteboard', uid, s => {
    scenario = s;
  });
  author = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
  // Admitted `write` because the Space holds the multi-user plan (the seed asserts it). Closed at the end of E8-1.
  peer = await connectWhiteboardPeer({
    whiteboardId: seeded.whiteboardId!,
    actor: TestUser.SPACE_ADMIN,
  });
  peers.push(peer);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await author?.close();
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

/** The editor's own scene must hold the element exactly as the raw document does. */
const expectSceneMatchesRaw = async (
  page: Page,
  editor: Locator,
  who: string
): Promise<void> => {
  await expect
    .poll(async () => geometry(await editorElement(editor, rectId)), {
      message: `${who}: the editor's scene holds the rectangle as stored`,
    })
    .toEqual(geometry(rectRaw));
  await expect
    .poll(async () => (await editorElement(editor, textId))?.text, {
      message: `${who}: the editor's scene holds the stored text`,
    })
    .toBe(MARKER);
  await expectEditorAlive(page, who);
};

test.describe('W2 journey 5 — a whiteboard is drawn on, then reopened', () => {
  test('E8-1 the author draws a rectangle and a text and closes; the board is stored (raw doc holds both, the service answers persisted, updatedDate moved)', async () => {
    const page = author!.page;
    const pageErrors = collectPageErrors(page);

    // Preconditions (positive controls): the peer reads THIS board and it starts empty; preview mode is AUTO.
    expect(
      peer.liveElements(),
      'the board starts empty at the peer'
    ).toHaveLength(0);
    const before = must(
      await readWhiteboardState(seeded.whiteboardId!),
      'readWhiteboardState (before)'
    ).lookup.whiteboard!;
    expect(
      before.previewSettings.mode,
      'preview mode is AUTO (E8-3 relies on it)'
    ).toBe(WhiteboardPreviewMode.Auto);
    beforeUpdatedDate = String(before.updatedDate);
    beforeCardUri = before.profile.visual?.uri;
    beforePreviewUri = before.profile.preview?.uri;

    const editor = await openWhiteboardInEditor(
      page,
      asWhiteboardSpace(seeded)
    );
    // Draw at x >= 400: the style panel covers about the left 250 px.
    await pickTool(editor, /^Rectangle —/);
    await dragOnCanvas(page, editor, { x: 450, y: 150 }, { x: 650, y: 260 });
    await pickTool(editor, /^Text —/);
    await canvasOf(editor).click({ position: { x: 500, y: 400 } });
    await page.keyboard.type(MARKER);
    await page.keyboard.press('Escape'); // commits the text element

    // The oracle of record: the RAW document as the live room holds it — exactly those two live elements. It is the
    // room's state, not storage: the durability answer below is what says the room's state is stored.
    // The text element enters the doc on the first keystroke and its value keeps
    // syncing while later keystrokes are in flight, so wait for the whole marker,
    // not just the element count (a remote env read "WB 34d" for "WB 34d3f").
    // A server that drops trailing characters times out here, red.
    const live = await peer.waitFor(() => {
      const elements = peer.liveElements();
      const textSynced = elements.some(
        el => el.type === 'text' && String(el.text) === MARKER
      );
      return elements.length === 2 && textSynced && elements;
    }, 'the rectangle and the whole marker text to reach the raw document');
    const rects = live.filter(el => el.type === 'rectangle');
    const texts = live.filter(el => el.type === 'text');
    expect(rects, 'exactly one rectangle').toHaveLength(1);
    expect(texts, 'exactly one text').toHaveLength(1);
    expect(
      Number(rects[0].width) > 0 && Number(rects[0].height) > 0,
      'the rectangle has an area'
    ).toBe(true);
    expect(String(texts[0].text), 'the text is the marker').toBe(MARKER);
    rectId = rects[0].id;
    textId = texts[0].id;
    rectRaw = peer.rawElement(rectId);

    // Durable: the service itself says the room's state (both elements, which the peer saw) is stored.
    await peer.awaitDurable();
    // The oracle peer leaves now, so it does not keep the room live for E8-2 … E8-4.
    await peer.close();
    peers.splice(peers.indexOf(peer), 1);
    // Secondary: the server's whiteboard row was updated after the edit, i.e. the service's save reached the server's
    // metadata write. It says nothing about the content; the content's durability is the `persisted` answer above.
    await expect
      .poll(
        async () =>
          Date.parse(
            String(
              must(
                await readWhiteboardState(seeded.whiteboardId!),
                'readWhiteboardState'
              ).lookup.whiteboard!.updatedDate
            )
          ),
        { message: "the server's whiteboard row was updated after the edit" }
      )
      .toBeGreaterThan(Date.parse(beforeUpdatedDate));

    // Close the editor (the client uploads the AUTO preview on close).
    await editor.getByRole('button', { name: 'Close whiteboard' }).click();
    await expect(editor).toBeHidden();
    expect(pageErrors, 'no page error while drawing and closing').toEqual([]);
  });

  test('E8-2 the author reloads and reopens, and the member opens it in a fresh context: each editor shows the elements the raw document held', async ({
    browser,
  }) => {
    // Fresh sessions after every earlier one closed. In the nightly the room is still live (idle release 30 s), so this
    // pins the reopen path, not a load from storage (E8-4); see the file header.
    const page = author!.page;
    await page.reload();
    const editor = await openWhiteboardInEditor(
      page,
      asWhiteboardSpace(seeded)
    );
    await expectSceneMatchesRaw(page, editor, 'the author after a reload');
    // History is per session: a disabled Undo proves a FRESH editor session, not the tab's cached scene.
    await expect(editor.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await editor.getByRole('button', { name: 'Close whiteboard' }).click();
    await expect(editor).toBeHidden();

    const member = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      const memberEditor = await openWhiteboardInEditor(
        member.page,
        asWhiteboardSpace(seeded)
      );
      await expectSceneMatchesRaw(
        member.page,
        memberEditor,
        'the member in a fresh context'
      );
      await memberEditor
        .getByRole('button', { name: 'Close whiteboard' })
        .click();
      await expect(memberEditor).toBeHidden();
    } finally {
      await member.close();
    }
  });

  test("E8-3 the board's visuals were re-uploaded after the edit, and the callout card on the Space page shows the server's current preview", async () => {
    const page = author!.page;
    const lastSegment = (uri: string | null | undefined): string =>
      String(uri ?? '')
        .split('/')
        .pop() ?? '';
    const visuals = async () => {
      const profile = must(
        await readWhiteboardState(seeded.whiteboardId!),
        'readWhiteboardState'
      ).lookup.whiteboard!.profile;
      return {
        card: profile.visual?.uri ?? '',
        preview: profile.preview?.uri ?? '',
      };
    };

    // Guards: the visual upload path silently dropping the previews. The client uploads TWO visuals on every close (CARD
    // and WHITEBOARD_PREVIEW), so both uris moved from their pre-edit values once any close since E8-1 uploaded. These
    // are the client's own export: whether the image depicts the drawing is NOT checked.
    await expect
      .poll(async () => (await visuals()).card, {
        message: 'the CARD visual uri changed after the edit',
      })
      .not.toBe(beforeCardUri ?? '');
    await expect
      .poll(async () => (await visuals()).preview, {
        message: 'the WHITEBOARD_PREVIEW visual uri changed after the edit',
      })
      .not.toBe(beforePreviewUri ?? '');

    await page.goto(spaceUrl(seeded));
    // The Space seeds one callout, so the feed holds one whiteboard card: its image is the "Whiteboard" img.
    const image = page
      .getByRole('region', { name: 'Space content feed' })
      .getByRole('button', { name: 'Whiteboard Open Whiteboard' })
      .getByRole('img', { name: 'Whiteboard', exact: true });
    // The client re-uploads the previews on every close (E8-2 closed twice more), so compare the card with the server's
    // CURRENT preview on each poll, never with a value read earlier. The feed shows the WHITEBOARD_PREVIEW visual.
    await expect
      .poll(
        async () => {
          const shown = lastSegment(await image.getAttribute('src'));
          const { preview } = await visuals();
          return shown === lastSegment(preview)
            ? 'the card shows the stored preview'
            : `card ${shown} is not the stored preview ${lastSegment(preview)}`;
        },
        { message: 'the card image is the stored WHITEBOARD_PREVIEW visual' }
      )
      .toBe('the card shows the stored preview');
  });

  test(
    'E8-4 the board survives a room release: a fresh peer reads both elements from storage',
    { tag: '@local-stack' },
    async () => {
      // Without release-at-0 the room outlives its last member by the service's default (30 s), the fresh peer would be
      // served from memory, and a green here would prove nothing about storage.
      const metricsUrl = process.env.COLLAB_METRICS_URL;
      if (process.env.COLLAB_IDLE_RELEASE_SECONDS !== '0' || !metricsUrl) {
        throw new Error(
          'stack not set up for E8-4: set IDLE_RELEASE_SECONDS=0 on the collaboration-service, and COLLAB_IDLE_RELEASE_SECONDS=0 plus COLLAB_METRICS_URL (its /metrics, e.g. http://localhost:4006/metrics) here'
        );
      }
      const roomsActive = () => readCollaborationRoomsActive(metricsUrl);
      // Barrier: release is asynchronous (the room flushes, then tears down), so a peer that connects before it would
      // join the warm room and read memory. Every member of this board's room has left (E8-1's peer, E8-2's editors),
      // and the gauge is SERVICE-WIDE, so the barrier is "no room is live": it also requires an idle stack (this
      // runner, one worker, nobody else editing on the collaboration-service).
      await expect
        .poll(roomsActive, {
          message:
            "no room is live: this board's room is released (its final flush done)",
        })
        .toBe(0);

      const cold = await connectWhiteboardPeer({
        whiteboardId: seeded.whiteboardId!,
        actor: TestUser.SPACE_MEMBER,
        requireWrite: false,
      });
      peers.push(cold);
      // Positive control: the gauge counts this board's room, so the 0 above was a release, not a gauge that never counts.
      await expect
        .poll(roomsActive, {
          message: "the fresh peer's room is the one live room",
        })
        .toBe(1);
      const text = await cold.waitFor(
        () => cold.rawElement(textId),
        'the text element to load from storage'
      );
      expect(String(text.text), 'the stored text').toBe(MARKER);
      expect(geometry(cold.rawElement(rectId)), 'the stored rectangle').toEqual(
        geometry(rectRaw)
      );
      expect(
        cold.liveElements(),
        'exactly the two stored elements'
      ).toHaveLength(2);
    }
  );
});
