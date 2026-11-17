// spec: client-web/src/functional-e2e/file-uploads/file-uploads-test-plan.md
// W2 journey 11 (docs/qa/server-rebuild/plan.md § W2 row 11), audit row N4:
// MA-1 a user sends a PDF in a conversation, the other member gets it,
// and storage serves exactly that file to the conversation's members only;
// MA-2 a file type the conversation does not accept is refused in the
// composer and nothing is uploaded.
//
// @local-stack: chat goes browser → Matrix, and the shared test cluster's
// homeserver is not reachable from the browser (alkem-io/infrastructure-
// provisioning#51), so the nightly leaves these out and
// config/playwright.config.local-stack.ts runs them. On a stack whose
// homeserver does not answer, each case skips with the probe's reason.

import { test, expect, type Page } from '@playwright/test';
import {
  ConversationCreationType,
  createConversation,
  leaveConversation,
  getUserToken,
  MimeType,
  readConversationStoredFiles,
  readMyConversations,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import {
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  chatPanel,
  matrixSendPath,
  openChatPanel,
  openConversation,
} from '../chat-avatars/chat-avatars.helpers';
import {
  deleteDisposableUser,
  registerDisposableUser,
  type DisposableUser,
} from '../contributors-crud/contributors-crud.helpers';
import {
  executablePayload,
  expectDownloadRefused,
  expectServesExactly,
  pdfPayload,
  pickFile,
} from './file-uploads.helpers';

/**
 * Two disposable users and one two-member GROUP conversation between them,
 * created by the sender over the API (starting a chat is not what this
 * journey tests). A GROUP, not a DIRECT one: a DIRECT conversation can be
 * neither left nor deleted by anyone, so it would outlive the run.
 *   sender "Crud j11s<uid>" sends · recipient "Crud j11r<uid>" receives
 *   outsider `non.space` (read-only use: a download it must be refused)
 */
const uid = UniqueIDGenerator.getID();
const groupName = `J11 files ${uid}`;
let sender: DisposableUser | undefined;
let recipient: DisposableUser | undefined;
let senderPage: PersonaPage | undefined;
let recipientPage: PersonaPage | undefined;
let conversationId = '';
let senderActor: GraphqlActor;
let recipientActor: GraphqlActor;

test.describe('Message attachments', { tag: '@local-stack' }, () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    // No scenario is seeded here, so the persona map the lib's admin calls use is loaded by hand.
    await TestUserManager.populateUserModelMap();
    sender = await registerDisposableUser(`j11s${uid}`);
    recipient = await registerDisposableUser(`j11r${uid}`);
    senderActor = { bearerToken: await getUserToken(sender.email) };
    recipientActor = { bearerToken: await getUserToken(recipient.email) };
    conversationId = must(
      await createConversation(
        [recipient.id],
        ConversationCreationType.Group,
        senderActor,
        groupName
      ),
      'createConversation(sender + recipient)'
    ).createConversation.id;
    senderPage = await openPersonaPage(browser, sender.email);
    recipientPage = await openPersonaPage(browser, recipient.email);
  });

  // File level, so it also runs when a failure retires the worker mid-file.
  test.afterAll(async () => {
    try {
      await senderPage?.close();
      await recipientPage?.close();
      if (conversationId) {
        // Nobody holds DELETE on a conversation: it is deleted when its last member leaves.
        must(
          await leaveConversation(conversationId, senderActor),
          'sender leaves the conversation'
        );
        must(
          await leaveConversation(conversationId, recipientActor),
          'recipient leaves the conversation'
        );
        await expect
          .poll(
            async () =>
              (
                must(
                  await readMyConversations(senderActor),
                  'readMyConversations'
                ).me.conversations.conversations ?? []
              ).some(c => c.id === conversationId),
            { message: 'the conversation is gone', timeout: 30_000 }
          )
          .toBe(false);
        conversationId = '';
      }
    } finally {
      try {
        await deleteDisposableUser(sender);
      } finally {
        await deleteDisposableUser(recipient);
      }
    }
  });

  /** The conversation's open thread, or a skip when the browser cannot reach Matrix. */
  const openThread = async (page: Page): Promise<void> => {
    const path = await matrixSendPath(page);
    test.skip(!path.reachable, path.reachable ? '' : path.reason);
    await openChatPanel(page);
    await openConversation(page, [groupName]);
  };

  const storedFiles = async () => {
    const conversation = must(
      await readConversationStoredFiles(conversationId, recipientActor),
      'readConversationStoredFiles'
    ).lookup.conversation;
    if (!conversation)
      throw new Error('the recipient cannot read the conversation');
    return conversation;
  };

  test('MA-1 — a PDF sent in a conversation reaches the other member, and storage serves exactly that file to members only', async () => {
    const page = senderPage!.page;
    const payload = pdfPayload(`j11-minutes-${uid}.pdf`, `J11 MA-1 ${uid}`);
    await openThread(page);

    const before = await storedFiles();
    expect(
      before.storageBucket?.allowedMimeTypes,
      'the conversation accepts PDFs'
    ).toContain(payload.mimeType);
    expect(
      before.storageBucket?.documents,
      'the conversation bucket starts empty'
    ).toEqual([]);

    const panel = chatPanel(page);
    await pickFile(
      page,
      panel.getByRole('button', { name: 'Attach files', exact: true }),
      payload
    );
    const staged = panel.getByRole('list', { name: 'Files to send' });
    await expect(staged).toContainText(payload.name);
    const uploaded = page.waitForResponse(r =>
      r.url().includes('/api/private/rest/messaging/media/upload')
    );
    await panel.getByRole('button', { name: 'Send', exact: true }).click();
    expect((await uploaded).ok(), 'media upload HTTP status').toBe(true);
    await expect(staged).toBeHidden();

    // Read-back 1: the server placed the file in the conversation's bucket
    // (asynchronously, when the message event comes back from Matrix) and the
    // message carries it.
    await expect
      .poll(
        async () => (await storedFiles()).storageBucket?.documents.length ?? 0,
        {
          message: 'one document in the conversation bucket',
          timeout: 30_000,
        }
      )
      .toBe(1);
    const after = await storedFiles();
    const document = after.storageBucket!.documents[0];
    expect(
      {
        displayName: document.displayName,
        mimeType: document.mimeType,
        size: document.size,
        temporaryLocation: document.temporaryLocation,
      },
      'the stored attachment'
    ).toEqual({
      displayName: payload.name,
      mimeType: MimeType.Pdf,
      size: payload.buffer.length,
      temporaryLocation: false,
    });
    expect(
      after.room.messages
        .flatMap(m => m.attachments)
        .map(a => ({
          name: a.displayName,
          mimeType: a.mimeType,
          size: a.size,
        })),
      'the message carries the attachment'
    ).toEqual([
      {
        name: payload.name,
        mimeType: payload.mimeType,
        size: payload.buffer.length,
      },
    ]);

    // Read-back 2: the other member downloads exactly the sent bytes.
    await expectServesExactly(document.url, payload, recipientActor);
    // Read-back 3: a signed-in user outside the conversation is refused.
    await expectDownloadRefused(
      document.url,
      payload,
      TestUser.NON_SPACE_MEMBER
    );

    // The recipient's thread offers the file, linked to the stored document.
    // A fresh load, so the thread is read from the server and not from a
    // client cache that only ever saw the conversation empty.
    const other = recipientPage!.page;
    await other.reload();
    await openThread(other);
    // Same budget as chat-avatars' expectMessageReceived: the thread loads through Matrix.
    const download = chatPanel(other).getByRole('link', {
      name: `Download ${payload.name}`,
      exact: true,
    });
    await expect(download).toBeVisible({ timeout: 30_000 });
    // The link resolves the file through the conversation's bucket by its
    // message reference, not by document id: what matters is that it serves
    // the recipient the sent bytes, from this conversation's bucket.
    const href = (await download.getAttribute('href')) ?? '';
    expect(
      new URL(href).searchParams.get('bucketId'),
      'the link reads the conversation bucket'
    ).toBe(after.storageBucket!.id);
    await expectServesExactly(href, payload, recipientActor);
    await expectDownloadRefused(href, payload, TestUser.NON_SPACE_MEMBER);
  });

  test('MA-2 — a file type the conversation does not accept is refused in the composer, and nothing is uploaded', async () => {
    const page = senderPage!.page;
    const refused = executablePayload(
      `j11-setup-${uid}.exe`,
      `J11 MA-2 ${uid}`
    );
    const control = pdfPayload(
      `j11-control-${uid}.pdf`,
      `J11 MA-2 control ${uid}`
    );
    await openThread(page);
    const documentsBefore =
      (await storedFiles()).storageBucket?.documents.length ?? 0;

    const uploads: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/messaging/media/upload'))
        uploads.push(request.url());
    });

    const panel = chatPanel(page);
    const attach = panel.getByRole('button', {
      name: 'Attach files',
      exact: true,
    });
    await pickFile(page, attach, refused);
    await expect(
      panel.getByText(`${refused.name} has an unsupported file type.`, {
        exact: true,
      })
    ).toBeVisible();
    await expect(
      panel.getByRole('list', { name: 'Files to send' })
    ).toHaveCount(0);

    // Positive control: an accepted file is staged by the same button…
    await pickFile(page, attach, control);
    const staged = panel.getByRole('list', { name: 'Files to send' });
    await expect(staged).toContainText(control.name);
    // …and removed again without sending: selection alone uploads nothing.
    await staged
      .getByRole('button', { name: `Remove ${control.name}`, exact: true })
      .click();
    await expect(staged).toHaveCount(0);

    expect(uploads, 'no file left the browser').toEqual([]);
    expect(
      (await storedFiles()).storageBucket?.documents.length ?? 0,
      'nothing was stored'
    ).toBe(documentsBefore);
  });
});
