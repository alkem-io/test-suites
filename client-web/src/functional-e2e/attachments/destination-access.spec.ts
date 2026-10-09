import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { loginViaCrd } from '../helpers/login.helper';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
  type AttachmentRoom,
} from './attachments.helpers';
import {
  loadAcceptanceFixture,
  referenceURL,
  uploadIdentity,
  UPLOAD_ATTACHMENT,
  type AcceptanceFixture,
  type UploadResult,
} from './attachments.acceptance';

type AccessFixture = AcceptanceFixture & {
  accessControl: {
    outsider: { actorID: string; email: string; password: string };
    groupConversationID: string;
    calloutID: string;
    ordinaryBucketID: string;
  };
};

async function accessFixture() {
  const fixture = (await loadAcceptanceFixture()) as AccessFixture;
  const access = fixture.accessControl;
  if (
    !access?.outsider?.email ||
    !access.outsider.password ||
    [
      access.outsider.actorID,
      access.groupConversationID,
      access.calloutID,
      access.ordinaryBucketID,
    ].some(id => !/^[0-9a-f-]{36}$/i.test(id))
  )
    throw new Error(
      'Access acceptance requires explicit isolated outsider/group/callout/user-bucket fixtures'
    );
  return fixture;
}

async function upload(
  actor: AttachmentActor,
  fixture: AccessFixture,
  room: AttachmentRoom,
  name: string,
  threadID?: string
) {
  const result = await actor.uploadGraphql<{
    uploadRoomMessageAttachment: UploadResult;
  }>({
    query: UPLOAD_ATTACHMENT,
    variables: {
      uploadData: { roomID: room.roomID, ...(threadID ? { threadID } : {}) },
    },
    file: fixture.media.file.path,
    name,
    mimeType: fixture.media.file.mimeType,
  });
  return result.uploadRoomMessageAttachment;
}

async function send(
  actor: AttachmentActor,
  room: AttachmentRoom,
  reference: UploadResult,
  threadID?: string
) {
  const mutation = threadID ? 'sendMessageReplyToRoom' : 'sendMessageToRoom';
  const input = threadID ? 'RoomSendMessageReplyInput' : 'RoomSendMessageInput';
  return actor.graphql<Record<string, { id: string }>>(
    `mutation AccessSend($input:${input}!) { ${mutation}(messageData:$input) { id } }`,
    {
      input: {
        roomID: room.roomID,
        message: '',
        attachmentUpload: reference,
        ...(threadID ? { threadID } : {}),
      },
    }
  );
}

async function text(
  actor: AttachmentActor,
  room: AttachmentRoom,
  message: string
) {
  return (
    await actor.graphql<{ sendMessageToRoom: { id: string } }>(
      'mutation AccessText($input:RoomSendMessageInput!){sendMessageToRoom(messageData:$input){id}}',
      { input: { roomID: room.roomID, message } }
    )
  ).sendMessageToRoom.id;
}

async function placed(rows: AttachmentRows, mediaID: string, bucketID: string) {
  await expect
    .poll(
      async () =>
        (await rows.files({ mediaIDs: [mediaID] })).map(
          row => row.storageBucketId
        ),
      { timeout: 30_000 }
    )
    .toEqual([bucketID]);
  return (await rows.files({ mediaIDs: [mediaID] }))[0];
}

test('group leave revokes Alkemio reads and a completed-upload send; rejoining permits the same completed reference', async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const fixture = await accessFixture();
  const [alpha, beta] = fixture.users.map(
    user => new AttachmentActor(fixture, user)
  );
  await Promise.all([alpha.authenticate(), beta.authenticate()]);
  const rows = new AttachmentRows(fixture);
  const contexts = await Promise.all([
    alpha.browserContext(browser),
    beta.browserContext(browser),
    browser.newContext(),
  ]);
  await loginViaCrd(
    await contexts[2].newPage(),
    fixture.accessControl.outsider.email,
    fixture.accessControl.outsider.password,
    fixture.baseURL
  );
  const room = fixture.independentRooms[1];
  const name = `${fixture.runID}-${randomUUID()}-membership.pdf`;
  let left = false;
  const members = async () =>
    (
      await alpha.graphql<{
        lookup: { conversation: { members: { id: string }[] } };
      }>(
        'query AccessMembers($id:UUID!){lookup{conversation(ID:$id){members{id}}}}',
        { id: fixture.accessControl.groupConversationID }
      )
    ).lookup.conversation.members.map(member => member.id);
  const restore = async () => {
    await alpha.graphql(
      'mutation RestoreMember($input:AssignConversationMemberInput!){assignConversationMember(memberData:$input)}',
      {
        input: {
          conversationID: fixture.accessControl.groupConversationID,
          memberID: fixture.users[1].actorID,
        },
      }
    );
    await expect
      .poll(members, { timeout: 30_000 })
      .toContain(fixture.users[1].actorID);
    left = false;
  };
  try {
    const first = await upload(alpha, fixture, room, name);
    await send(alpha, room, first);
    const identity = await uploadIdentity(rows, first, fixture);
    await placed(rows, identity.mediaID, room.bucketID);
    const rules = await rows.policyRuleNames(identity.fileID);
    expect(
      rules.some(name => name.includes('Conversation Participants Access'))
    ).toBe(true);
    expect(rules).not.toContain('credentialRule-documentCreatedBy');
    const url = referenceURL(fixture, room.bucketID, identity.mediaID);
    expect((await contexts[0].request.get(url)).status()).toBe(200);
    expect((await contexts[1].request.get(url)).status()).toBe(200);
    expect((await contexts[2].request.get(url)).status()).toBe(403);
    expect((await fetch(url)).status).toBe(403);
    const pending = await upload(beta, fixture, room, `${name}-pending.pdf`);
    const pendingIdentity = await uploadIdentity(rows, pending, fixture);
    expect(
      (await rows.files({ mediaIDs: [pendingIdentity.mediaID] }))[0]
        .storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    const removedAt = Date.now();
    await beta.matrixLeave(room);
    left = true;
    await expect
      .poll(members, { timeout: 30_000 })
      .not.toContain(fixture.users[1].actorID);
    await expect(send(beta, room, pending)).rejects.toThrow(
      'Attachment GraphQL operation failed'
    );
    await expect(
      upload(beta, fixture, room, `${name}-denied.pdf`).then(() => undefined)
    ).rejects.toThrow('Attachment upload GraphQL failed');
    expect(
      (await rows.files({ mediaIDs: [pendingIdentity.mediaID] }))[0]
        .storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    const statuses: { elapsedMs: number; status: number }[] = [];
    await expect
      .poll(
        async () => {
          const status = (await contexts[1].request.get(url)).status();
          statuses.push({ elapsedMs: Date.now() - removedAt, status });
          return status;
        },
        { timeout: 80_000, intervals: [1000] }
      )
      .toBe(403);
    expect((await contexts[0].request.get(url)).status()).toBe(200);
    const restoredAt = Date.now();
    await restore();
    await send(beta, room, pending);
    expect(
      (await placed(rows, pendingIdentity.mediaID, room.bucketID)).id
    ).toBe(pendingIdentity.fileID);
    await expect
      .poll(async () => (await contexts[1].request.get(url)).status(), {
        timeout: 80_000,
        intervals: [1000],
      })
      .toBe(200);
    await testInfo.attach('membership-cache-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        fileID: identity.fileID,
        pendingFileID: pendingIdentity.fileID,
        removedAt: new Date(removedAt).toISOString(),
        restoredAt: new Date(restoredAt).toISOString(),
        readStatusesAfterLeave: statuses,
        restoredReadAt: new Date().toISOString(),
        leaveTransport:
          'authenticated Matrix self-leave API, reflected by Alkemio membership event',
        currentSendDeniedAfterLeave: true,
        sameReferencePermittedAfterRejoin: true,
      }),
    });
  } finally {
    if (left) await restore();
    await Promise.all(contexts.map(context => context.close()));
    await rows.close();
  }
});

test('known completed media can be forwarded by authorized actors across rooms and reply contexts', async ({}, testInfo) => {
  const fixture = await accessFixture();
  const [alpha, beta] = fixture.users.map(
    user => new AttachmentActor(fixture, user)
  );
  await Promise.all([alpha.authenticate(), beta.authenticate()]);
  const rows = new AttachmentRows(fixture);
  const [room, otherRoom] = fixture.independentRooms;
  try {
    const parent = await text(
      alpha,
      room,
      `${fixture.runID}-${randomUUID()}-reply-root`
    );
    const otherParent = await text(
      alpha,
      room,
      `${fixture.runID}-${randomUUID()}-other-root`
    );
    const result = await upload(
      alpha,
      fixture,
      room,
      `${fixture.runID}-${randomUUID()}-forward.pdf`,
      parent
    );
    const identity = await uploadIdentity(rows, result, fixture);
    await expect(
      send(alpha, room, { ...result, externalReference: randomUUID() })
    ).rejects.toThrow('Attachment GraphQL operation failed');
    expect(
      (await rows.files({ mediaIDs: [identity.mediaID] }))[0].storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    // A completed reference is not bound to its uploader or original thread.
    await send(beta, room, result, otherParent);
    expect((await placed(rows, identity.mediaID, room.bucketID)).id).toBe(
      identity.fileID
    );
    await send(alpha, room, result);
    await send(alpha, otherRoom, result);
    await expect
      .poll(async () =>
        (await rows.files({ mediaIDs: [identity.mediaID] }))
          .map(row => row.storageBucketId)
          .sort()
      )
      .toEqual([room.bucketID, otherRoom.bucketID].sort());
    const events = (await alpha.matrixMessages(room.matrixRoomID)).filter(
      event =>
        event.content.url === `mxc://${identity.homeserver}/${identity.mediaID}`
    );
    expect(events).toHaveLength(2);
    expect(
      events.some(
        event =>
          (event.content['m.relates_to'] as { event_id?: string })?.event_id ===
          otherParent
      )
    ).toBe(true);
    await testInfo.attach('completed-reference-forwarding-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        fileID: identity.fileID,
        missingReferenceDenied: true,
        authorizedDifferentActor: true,
        differentReply: true,
        topLevel: true,
        differentDestination: true,
        targetRows: 2,
      }),
    });
  } finally {
    await rows.close();
  }
});

test('callout comments policy is rechecked after upload and callout/post events share the existing bucket', async ({}, testInfo) => {
  const fixture = await accessFixture();
  const [alpha, beta] = fixture.users.map(
    user => new AttachmentActor(fixture, user)
  );
  await Promise.all([alpha.authenticate(), beta.authenticate()]);
  const rows = new AttachmentRows(fixture);
  const [callout, post] = fixture.sharedBucketRooms;
  const setComments = (enabled: boolean) =>
    alpha.graphql(
      'mutation Comments($input:UpdateCalloutEntityInput!){updateCallout(calloutData:$input){id}}',
      {
        input: {
          ID: fixture.accessControl.calloutID,
          settings: { framing: { commentsEnabled: enabled } },
        },
      }
    );
  let disabled = false;
  try {
    await rows.verifySharedSpaceRooms();
    // Membership permits comments, but this existing Space bucket does not
    // grant FILE_UPLOAD to an ordinary member. Preserve that boundary.
    await expect(
      upload(beta, fixture, callout, 'member-denied.pdf').then(() => undefined)
    ).rejects.toThrow('Attachment upload GraphQL failed');
    const result = await upload(
      alpha,
      fixture,
      callout,
      `${fixture.runID}-${randomUUID()}-callout.pdf`
    );
    const identity = await uploadIdentity(rows, result, fixture);
    await setComments(false);
    disabled = true;
    await expect(send(alpha, callout, result)).rejects.toThrow(
      'Attachment GraphQL operation failed'
    );
    await expect(
      upload(alpha, fixture, callout, 'disabled-callout.pdf').then(
        () => undefined
      )
    ).rejects.toThrow('Attachment upload GraphQL failed');
    expect(
      (await rows.files({ mediaIDs: [identity.mediaID] }))[0].storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    await setComments(true);
    disabled = false;
    await send(alpha, callout, result);
    expect((await placed(rows, identity.mediaID, callout.bucketID)).id).toBe(
      identity.fileID
    );
    // Supported document deletion intentionally invalidates this exact reference;
    // other rows sharing bytes or an earlier Matrix cache cannot resurrect it.
    await alpha.graphql(
      'mutation RemoveAttachment($input:DeleteDocumentInput!){deleteDocument(deleteData:$input){id}}',
      { input: { ID: identity.fileID } }
    );
    expect(await rows.files({ fileIDs: [identity.fileID] })).toEqual([]);
    await expect(send(alpha, callout, result)).rejects.toThrow(
      'Attachment GraphQL operation failed'
    );
    // Supported server sends establish the actor's membership in these rooms;
    // there is deliberately no invented callout attachment picker.
    await text(beta, post, `${fixture.runID}-${randomUUID()}-post-member`);
    await text(
      beta,
      callout,
      `${fixture.runID}-${randomUUID()}-callout-member`
    );
    const name = `${fixture.runID}-${randomUUID()}-shared.pdf`;
    const mxc = await beta.matrixUpload(
      fixture.media.file.path,
      name,
      fixture.media.file.mimeType
    );
    const mediaID = mxc.split('/').at(-1)!;
    const content = (filename: string) => ({
      msgtype: 'm.file',
      body: filename,
      filename,
      url: mxc,
      info: { mimetype: fixture.media.file.mimeType, size: identity.size },
    });
    await beta.matrixSend(post, content(name));
    const first = await placed(rows, mediaID, post.bucketID);
    await beta.matrixSend(callout, content(`${name}-forward`));
    await expect
      .poll(
        async () =>
          (await beta.matrixMessages(callout.matrixRoomID)).filter(
            event => event.content.url === mxc
          ).length
      )
      .toBe(1);
    expect(await rows.files({ mediaIDs: [mediaID] })).toEqual([first]);
    expect(first.createdBy).toBe(fixture.users[1].actorID);
    await testInfo.attach('shared-bucket-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        calloutRoomID: callout.roomID,
        postRoomID: post.roomID,
        sharedBucketID: callout.bucketID,
        firstFileID: identity.fileID,
        deletedExactFileRejected: true,
        nativeFileID: first.id,
        nativeUploadTransport: 'authenticated Matrix API',
        disabledCommentsDeniedSend: true,
        ordinarySpaceMemberUploadDenied: true,
        webUploadActor: 'authorized Space owner',
      }),
    });
  } finally {
    if (disabled) await setComments(true);
    await rows.close();
  }
});

test('Synapse accepts disallowed media but Alkemio import leaves it staged and unavailable', async ({}, testInfo) => {
  const fixture = await accessFixture();
  const actor = new AttachmentActor(fixture, fixture.users[1]);
  await actor.authenticate();
  const rows = new AttachmentRows(fixture);
  const room = fixture.independentRooms[0];
  const name = `${fixture.runID}-${randomUUID()}-unsupported.txt`;
  const file = testInfo.outputPath(name);
  await writeFile(file, 'Isolated fixture plain text attachment.\n'.repeat(10));
  try {
    await expect(
      actor
        .uploadGraphql({
          query: UPLOAD_ATTACHMENT,
          variables: { uploadData: { roomID: room.roomID } },
          file,
          name,
          mimeType: 'text/plain',
        })
        .then(() => undefined)
    ).rejects.toThrow('Attachment upload GraphQL failed');
    const mxc = await actor.matrixUpload(file, name, 'text/plain');
    const mediaID = mxc.split('/').at(-1)!;
    const eventID = await actor.matrixSend(room, {
      msgtype: 'm.file',
      body: name,
      filename: name,
      url: mxc,
      info: { mimetype: 'text/plain', size: (await readFile(file)).length },
    });
    await expect
      .poll(
        async () => {
          const result = await actor.graphql<{
            lookup: {
              room: {
                messages: {
                  id: string;
                  attachments: {
                    externalReference: string;
                    displayName: string;
                  }[];
                }[];
              };
            };
          }>(
            'query ImportResult($id:UUID!){lookup{room(ID:$id){messages{id attachments{externalReference displayName}}}}}',
            { id: room.roomID }
          );
          return result.lookup.room.messages.find(
            message => message.id === eventID
          )?.attachments;
        },
        { timeout: 30_000 }
      )
      .toEqual([{ externalReference: mediaID, displayName: name }]);
    // The message metadata is independent of placement; the scoped resource is absent.
    expect(
      (await fetch(referenceURL(fixture, room.bucketID, mediaID))).status
    ).toBe(404);
    const staged = await rows.files({ mediaIDs: [mediaID] });
    expect(staged).toHaveLength(1);
    expect(staged[0].storageBucketId).toBe(MATRIX_STAGING_BUCKET);
    expect(staged[0].authorizationId).toBeNull();
    expect((await actor.matrixDownload(mxc)).status).toBe(200);
    await testInfo.attach('native-policy-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        uploadTransport: 'authenticated Matrix API',
        mediaID,
        eventID,
        synapseAccepted: true,
        alkemioImportRejected: true,
        alkemioURL: null,
      }),
    });
  } finally {
    await rows.close();
  }
});

test('ordinary user-bucket upload and authorized document metadata editing remain supported', async ({
  browser,
}, testInfo) => {
  const fixture = await accessFixture();
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const context = await actor.browserContext(browser);
  try {
    const result = await actor.uploadGraphql<{
      uploadFileOnStorageBucket: { id: string; url: string };
    }>({
      query:
        'mutation Ordinary($uploadData:StorageBucketUploadFileInput!,$file:Upload!){uploadFileOnStorageBucket(uploadData:$uploadData,file:$file){id url}}',
      variables: {
        uploadData: {
          storageBucketId: fixture.accessControl.ordinaryBucketID,
          temporaryLocation: true,
        },
      },
      file: fixture.media.file.path,
      name: `${fixture.runID}-${randomUUID()}-ordinary.pdf`,
      mimeType: fixture.media.file.mimeType,
    });
    const document = result.uploadFileOnStorageBucket;
    const before = (
      await actor.graphql<{
        lookup: {
          document: {
            id: string;
            temporaryLocation: boolean;
            tagset: { id: string; tags: string[] };
          };
        };
      }>(
        'query OrdinaryDoc($id:UUID!){lookup{document(ID:$id){id temporaryLocation tagset{id tags}}}}',
        { id: document.id }
      )
    ).lookup.document;
    expect(before.temporaryLocation).toBe(true);
    const tags = [`fixture-${randomUUID()}`];
    const updated = await actor.graphql<{
      updateDocument: { id: string; tagset: { tags: string[] } };
    }>(
      'mutation EditOrdinary($input:UpdateDocumentInput!){updateDocument(documentData:$input){id tagset{tags}}}',
      { input: { ID: document.id, tagset: { ID: before.tagset.id, tags } } }
    );
    expect(updated.updateDocument.id).toBe(document.id);
    expect(updated.updateDocument.tagset.tags).toEqual(tags);
    const response = await context.request.get(document.url);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(
      await readFile(fixture.media.file.path)
    );
    await testInfo.attach('ordinary-upload-edit-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        fileID: document.id,
        ordinaryBucketID: fixture.accessControl.ordinaryBucketID,
        temporaryLocationRetained: true,
        authorizedTagsetEdit: true,
        exactBytes: true,
        scope:
          'Existing GraphQL ordinary upload and metadata edit; not a WOPI binary-edit UI test',
      }),
    });
  } finally {
    await context.close();
  }
});
