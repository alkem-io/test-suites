import { expect, test } from '@playwright/test';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  addReaction,
  avatarComposite,
  createConversation,
  expectMessageReceived,
  expectVisuallyHidden,
  gutterAvatar,
  gutterRow,
  conversationRow,
  ensureConversationList,
  messageColumn,
  openChatPanel,
  openConversation,
  reactionPills,
  registerAndSignInAll,
  settledAvatarComposite,
  sendMessage,
  srOnlyAuthorName,
  teardownAccounts,
  uploadProfileAvatar,
  visibleAuthorName,
  type TestPerson,
} from './chat-avatars.helpers';

/**
 * workspace#033-chat-avatars — User Story 1 (P1)
 *
 * "Identify who sent each message in a group chat": in a group conversation
 * every message from another participant shows that participant's avatar and
 * name on the FIRST message of a consecutive-sender run; continuations are
 * indented, avatar/name-free, but keep the sender exposed to assistive
 * technology. The viewer's own messages are untouched.
 *
 * Covers spec.md US1 AS1–AS8 scenario-for-scenario. Self-contained: registers
 * three fresh users through the real sign-up + email-verification flow and
 * builds the group through the chat UI itself — no API seeding. Every user is
 * deleted again in afterAll.
 *
 * Each scenario establishes its OWN run state (see `breakRun` below) rather
 * than inheriting the thread from the scenario before it, so `--grep`, shards,
 * retries and single-test debugging all behave.
 */

test.describe.configure({ mode: 'serial' });

/** Same rule as `initials.ts`: first letter of the first two words, uppercased. */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => [...word][0]?.toUpperCase() ?? '')
    .join('');

test.describe('US1 — group thread sender avatars', { tag: ['@chat-avatars'] }, () => {
  let viewer: TestPerson, bella: TestPerson, charlie: TestPerson;
  let bellaAvatarSrc: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(600000);
    const uid = UniqueIDGenerator.getID();

    // All three drive the UI, so all three need a session — created concurrently.
    [viewer, bella, charlie] = await registerAndSignInAll(browser, [
      { email: `chatavatars1-viewer-${uid}@alkem.io`, firstName: `Viewer${uid}`, lastName: 'Reader' },
      { email: `chatavatars1-bella-${uid}@alkem.io`, firstName: `Bella${uid}`, lastName: 'Sender' },
      { email: `chatavatars1-charlie-${uid}@alkem.io`, firstName: `Charlie${uid}`, lastName: 'NoAvatar' },
    ]);

    // Bella uploads a profile picture; Charlie keeps the one the platform
    // assigns every new account (AS1 vs AS5).
    bellaAvatarSrc = await uploadProfileAvatar(bella);

    await openChatPanel(viewer.page);
    await createConversation(viewer.page, [bella.displayName, charlie.displayName]);

    // Both senders open the thread now and keep it open for the whole file, so
    // every later send exercises the live room rather than a fresh page load.
    for (const person of [bella, charlie]) {
      await openChatPanel(person.page);
      await openConversation(person.page, [uid]);
    }
  });

  test.afterAll(async () => {
    await teardownAccounts();
  });

  /**
   * Closes whatever run is currently open so the next incoming message is
   * guaranteed to be a run head.
   *
   * An own message always breaks a run (`computeMessageRunFlags`: a previous
   * message with `isOwn` makes the next one first-of-run), which makes this the
   * cheapest reliable reset. Without it every scenario would depend on the
   * message the PREVIOUS scenario happened to leave at the bottom of the
   * thread — so skipping or filtering one test would fail the next for an
   * unrelated reason.
   */
  async function breakRun(label: string): Promise<void> {
    await sendMessage(viewer.page, `reset before ${label}`);
  }

  /** Sends `texts` from `sender` and waits for each to reach the viewer. */
  async function sendAndReceive(sender: TestPerson, texts: string[]): Promise<void> {
    for (const text of texts) {
      await sendMessage(sender.page, text);
      await expectMessageReceived(viewer.page, text);
    }
  }

  test('US1-AS1: a single message from another participant shows their avatar and name', async () => {
    await breakRun('AS1');
    await sendAndReceive(bella, ['AS1 a single hello']);

    await expect(visibleAuthorName(messageColumn(viewer.page, 'AS1 a single hello'))).toHaveText(bella.displayName);

    const avatar = gutterAvatar(gutterRow(viewer.page, 'AS1 a single hello'));
    await expect(avatar).toHaveCount(1);
    // ...and it is Bella's OWN picture — the exact image she uploaded in setup,
    // not merely "some avatar rendered here".
    await expect(avatar.locator('[data-slot="avatar-image"]')).toHaveAttribute('src', bellaAvatarSrc, {
      timeout: 20000,
    });
  });

  test('US1-AS2: consecutive messages from one sender carry exactly one avatar and one name', async () => {
    await breakRun('AS2');
    const head = 'AS2 head of the run';
    const continuations = ['AS2 second in the run', 'AS2 third in the run', 'AS2 fourth in the run'];
    await sendAndReceive(bella, [head, ...continuations]);

    // The run head carries exactly one avatar and one name...
    await expect(visibleAuthorName(messageColumn(viewer.page, head))).toHaveCount(1);
    await expect(gutterAvatar(gutterRow(viewer.page, head))).toHaveCount(1);

    // ...and no continuation repeats either (SC-002: exactly one per run, any N).
    for (const text of continuations) {
      await expect(visibleAuthorName(messageColumn(viewer.page, text))).toHaveCount(0);
      await expect(gutterAvatar(gutterRow(viewer.page, text))).toHaveCount(0);
    }
  });

  test('US1-AS3: alternating senders each restart a run', async () => {
    await breakRun('AS3');
    await sendAndReceive(charlie, ['AS3 charlie takes over']);
    await sendAndReceive(bella, ['AS3 bella takes it back']);

    const charlieColumn = messageColumn(viewer.page, 'AS3 charlie takes over');
    await expect(visibleAuthorName(charlieColumn)).toHaveText(charlie.displayName);
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS3 charlie takes over'))).toHaveCount(1);

    const bellaColumn = messageColumn(viewer.page, 'AS3 bella takes it back');
    await expect(visibleAuthorName(bellaColumn)).toHaveText(bella.displayName);
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS3 bella takes it back'))).toHaveCount(1);
  });

  test("US1-AS4: the viewer's own messages are unchanged — no avatar, no name, no gutter", async () => {
    await sendMessage(viewer.page, 'AS4 my own message');

    const column = messageColumn(viewer.page, 'AS4 my own message');
    await expect(column).toHaveClass(/items-end/); // still right-aligned
    await expect(visibleAuthorName(column)).toHaveCount(0);
    // Not even screen-reader attribution: own messages are outside the feature.
    await expect(srOnlyAuthorName(column)).toHaveCount(0);
    await expect(gutterRow(viewer.page, 'AS4 my own message')).toHaveCount(0);
  });

  /**
   * NOTE on the pure initials fallback: this environment assigns every new
   * account a generated avatar at registration, and the UI offers no way to
   * remove a profile picture — so `avatarUrl === undefined`, the condition that
   * makes `AvatarFallback` render, is not reachable through the product.
   * That DOM branch is covered by the client-web unit tests
   * (`ChatMessageBubble.test.tsx`, `ConversationAvatar.test.tsx`). What IS
   * reachable end to end — and what FR-009 actually asserts — is that a sender
   * who never uploaded a picture gets the SAME treatment in the message gutter
   * as in the conversation identity. That is what this walk checks.
   */
  test('US1-AS5: a sender who never uploaded a picture gets the same treatment as in the list', async () => {
    await breakRun('AS5');
    await sendAndReceive(charlie, ['AS5 charlie never uploaded']);

    const gutter = gutterAvatar(gutterRow(viewer.page, 'AS5 charlie never uploaded'));
    await expect(gutter).toHaveCount(1);
    const charlieAvatar = await avatarComposite(gutter);
    // Exactly one avatar cell — an image or an initials tile, never an empty gutter.
    expect(charlieAvatar.imgSrcs.length + charlieAvatar.fallbackTexts.length).toBe(1);

    // The scenario names the CONVERSATION LIST, so compare against the list row
    // itself — not the thread header. The two are equal by construction, but
    // that equality is US2-AS1's claim to prove, not this scenario's to assume.
    await ensureConversationList(viewer.page);
    const listRow = conversationRow(viewer.page, [bella.displayName, charlie.displayName]);
    await expect(listRow).toHaveCount(1, { timeout: 20000 });
    const listComposite = await settledAvatarComposite(listRow);

    if (charlieAvatar.imgSrcs.length === 1) {
      // The list row renders the same avatar for this member...
      expect(listComposite.imgSrcs).toContain(charlieAvatar.imgSrcs[0]);
      // ...and it is Charlie's own, not Bella's uploaded picture.
      expect(charlieAvatar.imgSrcs[0]).not.toBe(bellaAvatarSrc);
    } else {
      expect(charlieAvatar.fallbackTexts).toEqual([initialsOf(charlie.displayName)]);
      expect(listComposite.fallbackTexts).toContain(charlieAvatar.fallbackTexts[0]);
    }

    // Leave the thread open for the scenarios that follow.
    await openConversation(viewer.page, [bella.displayName, charlie.displayName]);
  });

  test('US1-AS6: a run continuation still exposes the sender to assistive technology', async () => {
    await breakRun('AS6');
    // Charlie opens a run, then continues it — the second message is the one
    // under test, and this scenario creates both itself.
    await sendAndReceive(charlie, ['AS6 charlie opens the run', 'AS6 charlie carries on']);

    const column = messageColumn(viewer.page, 'AS6 charlie carries on');
    // Visually omitted...
    await expect(visibleAuthorName(column)).toHaveCount(0);
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS6 charlie carries on'))).toHaveCount(0);
    // ...but still announced (FR-008).
    const srOnly = srOnlyAuthorName(column);
    await expect(srOnly).toHaveText(charlie.displayName);
    await expectVisuallyHidden(srOnly);
  });

  test('US1-AS7: a reaction stays attached to its own bubble inside an indented run', async () => {
    await breakRun('AS7');
    await sendAndReceive(charlie, ['AS7 charlie opens the run', 'AS7 charlie carries on']);

    // React on the CONTINUATION bubble — the one with no avatar or name of its own.
    const column = messageColumn(viewer.page, 'AS7 charlie carries on');
    const runHead = messageColumn(viewer.page, 'AS7 charlie opens the run');
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS7 charlie carries on'))).toHaveCount(0);
    await expect(reactionPills(column)).toHaveCount(0);

    await addReaction(viewer.page, column);

    await expect(reactionPills(column)).toHaveCount(1, { timeout: 20000 });
    // The pill belongs to this bubble alone — the run head above it is untouched.
    await expect(reactionPills(runHead)).toHaveCount(0);
    // The timestamp stays inside the same column too (FR-012).
    await expect(column.locator('span.text-caption').last()).toBeVisible();
  });

  test('US1-AS8: a live message joins the open run; a different sender starts a new one', async () => {
    await breakRun('AS8');
    // No reload or navigation on the viewer from here on — every assertion below
    // waits only on the room subscription pushing into the already-open thread.
    await sendAndReceive(charlie, ['AS8 charlie opens the run']);
    await expect(visibleAuthorName(messageColumn(viewer.page, 'AS8 charlie opens the run'))).toHaveText(
      charlie.displayName
    );

    await sendAndReceive(charlie, ['AS8 charlie joins the run']);
    const joining = messageColumn(viewer.page, 'AS8 charlie joins the run');
    await expect(visibleAuthorName(joining)).toHaveCount(0);
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS8 charlie joins the run'))).toHaveCount(0);
    await expect(srOnlyAuthorName(joining)).toHaveText(charlie.displayName);

    await sendAndReceive(bella, ['AS8 bella starts a new run']);
    const restarting = messageColumn(viewer.page, 'AS8 bella starts a new run');
    await expect(visibleAuthorName(restarting)).toHaveText(bella.displayName);
    await expect(gutterAvatar(gutterRow(viewer.page, 'AS8 bella starts a new run'))).toHaveCount(1);
  });
});
