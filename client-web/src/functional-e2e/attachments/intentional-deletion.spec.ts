import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
  type AttachmentRoom,
} from './attachments.helpers';
import {
  byteHash,
  referenceURL,
  uploadIdentity,
} from './attachments.acceptance';
import {
  loadHistoryDriver,
  loadHistoryFixture,
  roomAttachment,
} from './attachments.history';

async function retainedEvent(
  actor: AttachmentActor,
  room: AttachmentRoom,
  eventID: string,
  mxc: string
) {
  const event = (await actor.matrixMessages(room.matrixRoomID)).find(
    item => item.event_id === eventID
  );
  expect(event?.content.url).toBe(mxc);
}

async function publicDelete(actor: AttachmentActor, fileID: string) {
  await actor.graphql(
    'mutation DeleteAttachment($input:DeleteDocumentInput!){deleteDocument(deleteData:$input){id}}',
    { input: { ID: fileID } }
  );
}

test('permitted callout storage deletion leaves shared messages unavailable; independent copy survives until final deletion', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const fixture = await loadHistoryFixture();
  const driver = await loadHistoryDriver(fixture);
  const [alpha, beta] = fixture.users.map(
    user => new AttachmentActor(fixture, user)
  );
  await Promise.all([alpha.authenticate(), beta.authenticate()]);
  const contexts = await Promise.all([
    alpha.browserContext(browser),
    beta.browserContext(browser),
  ]);
  const rows = new AttachmentRows(fixture);
  const [callout, post] = fixture.sharedBucketRooms;
  const dm = fixture.independentRooms[0];
  const name = `${fixture.runID}-${randomUUID()}-intentional-delete.pdf`;
  const source = await readFile(fixture.media.file.path);
  try {
    const activation = await driver.activationEvidence();
    expect(activation.sourceCompatible).toBe(true);
    expect(activation.runningProviderModuleSHA256).toBe(
      activation.providerModuleSHA256
    );
    const thumbnailMXC = await alpha.matrixUpload(
      fixture.media.image.path,
      `${name}-thumbnail.jpg`,
      fixture.media.image.mimeType
    );
    const thumbnailMediaID = thumbnailMXC.split('/').at(-1)!;
    // The existing Space bucket rejects video. Keep the permitted public-delete
    // target as PDF; use an allowed DM native video as the untouched control.
    const videoMXC = await alpha.matrixUpload(
      fixture.media.video.path,
      `${name}-native-video.mp4`,
      fixture.media.video.mimeType
    );
    const videoMediaID = videoMXC.split('/').at(-1)!;
    await alpha.matrixSend(dm, {
      msgtype: 'm.video',
      body: `${name}-native-video.mp4`,
      url: videoMXC,
      info: {
        mimetype: fixture.media.video.mimeType,
        thumbnail_url: thumbnailMXC,
        thumbnail_info: { mimetype: fixture.media.image.mimeType },
      },
    });
    await expect
      .poll(async () =>
        (await rows.files({ mediaIDs: [videoMediaID] })).map(
          row => row.storageBucketId
        )
      )
      .toEqual([dm.bucketID]);
    const untouchedMediaIDs = [
      ...fixture.history.untouchedMediaIDs,
      thumbnailMediaID,
      videoMediaID,
    ];
    const untouchedBefore = await rows.files({
      mediaIDs: untouchedMediaIDs,
      fileIDs: [fixture.history.ordinaryDraftID],
    });
    const reference = await alpha.uploadMedia({
      file: fixture.media.file.path,
      name,
      mimeType: fixture.media.file.mimeType,
    });
    const identity = await uploadIdentity(rows, reference, fixture);
    const mxc = `mxc://${identity.homeserver}/${identity.mediaID}`;
    const sent = await alpha.graphql<{ sendMessageToRoom: { id: string } }>(
      'mutation SendAttachment($input:RoomSendMessageInput!){sendMessageToRoom(messageData:$input){id}}',
      {
        input: {
          roomID: callout.roomID,
          message: '',
          attachmentUpload: reference,
        },
      }
    );
    const calloutEvent = sent.sendMessageToRoom.id;
    await expect
      .poll(async () =>
        (await rows.files({ mediaIDs: [identity.mediaID] })).map(
          row => row.storageBucketId
        )
      )
      .toEqual([callout.bucketID]);
    // Supported server text send establishes membership in the separate post room.
    await alpha.graphql(
      'mutation JoinPost($input:RoomSendMessageInput!){sendMessageToRoom(messageData:$input){id}}',
      { input: { roomID: post.roomID, message: `${name}-post-member` } }
    );
    const content = {
      msgtype: 'm.file',
      body: name,
      filename: name,
      url: mxc,
      info: {
        mimetype: fixture.media.file.mimeType,
        size: source.length,
      },
    };
    const postEvent = await alpha.matrixSend(post, content);
    const dmEvent = await alpha.matrixSend(dm, content);
    await expect
      .poll(
        async () => (await rows.files({ mediaIDs: [identity.mediaID] })).length
      )
      .toBe(2);
    const associated = await rows.files({ mediaIDs: [identity.mediaID] });
    const calloutFile = associated.find(
      row => row.storageBucketId === callout.bucketID
    )!;
    const dmFile = associated.find(row => row.storageBucketId === dm.bucketID)!;
    expect(calloutFile.id).toBe(identity.fileID);
    expect(calloutFile.externalID).toBe(dmFile.externalID);
    expect(calloutFile.authorizationId).not.toBe(dmFile.authorizationId);
    expect(
      (await rows.policyRuleNames(dmFile.id)).some(rule =>
        rule.includes('Conversation Participants Access')
      )
    ).toBe(true);
    expect(await rows.policyRuleNames(dmFile.id)).not.toContain(
      'credentialRule-documentCreatedBy'
    );
    const dmURL = referenceURL(fixture, dm.bucketID, identity.mediaID);
    const survivorBefore = await contexts[1].request.get(dmURL);
    expect(survivorBefore.status()).toBe(200);
    expect(byteHash(await survivorBefore.body())).toBe(byteHash(source));
    expect((await fetch(dmURL)).status).toBe(403);
    // This is an actual authorized public GraphQL storage delete by the Space owner.
    await publicDelete(alpha, calloutFile.id);
    for (let i = 0; i < 3; i++) {
      expect(
        (
          await contexts[0].request.get(
            referenceURL(fixture, callout.bucketID, identity.mediaID)
          )
        ).status()
      ).toBe(404);
      expect(
        (
          await contexts[0].request.get(
            referenceURL(fixture, post.bucketID, identity.mediaID)
          )
        ).status()
      ).toBe(404);
      expect(
        (await roomAttachment(alpha, dm, dmEvent))?.externalReference
      ).toBe(identity.mediaID);
    }
    await retainedEvent(alpha, callout, calloutEvent, mxc);
    await retainedEvent(alpha, post, postEvent, mxc);
    expect(await rows.files({ mediaIDs: [identity.mediaID] })).toEqual([
      dmFile,
    ]);
    expect((await contexts[1].request.get(dmURL)).status()).toBe(200);
    const survivingCache = await driver.quarantineOriginal(identity.mediaID);
    try {
      expect(await survivingCache.originalAbsent()).toBe(true);
      const native = await alpha.matrixDownload(mxc);
      expect(native.status).toBe(200);
      expect(byteHash(Buffer.from(await native.arrayBuffer()))).toBe(
        byteHash(source)
      );
      const counts = await survivingCache.providerFetches();
      expect(counts.lookups).toBe(0);
      expect(counts.contentReads).toBe(1);
    } finally {
      await survivingCache.restore();
    }
    // Conversation attachment policies deliberately grant no public DELETE.
    await expect(publicDelete(alpha, dmFile.id)).rejects.toThrow(
      'Attachment GraphQL operation failed'
    );
    await driver.deleteDocument(dmFile.id); // Bounded fixture operator, existing file-service API.
    expect(await rows.files({ mediaIDs: [identity.mediaID] })).toEqual([]);
    for (let i = 0; i < 3; i++) {
      expect((await contexts[0].request.get(dmURL)).status()).toBe(404);
      expect(
        (
          await contexts[0].request.get(
            referenceURL(fixture, callout.bucketID, identity.mediaID)
          )
        ).status()
      ).toBe(404);
    }
    await retainedEvent(alpha, dm, dmEvent, mxc);
    const missingCache = await driver.quarantineOriginal(identity.mediaID);
    let missingFetches;
    try {
      expect(await missingCache.originalAbsent()).toBe(true);
      const native = await alpha.matrixDownload(mxc);
      expect(native.status).toBe(404); // A provider 500 is a failure, not unavailable success.
      missingFetches = await missingCache.providerFetches();
      expect(missingFetches.lookups).toBe(0);
      expect(missingFetches.contentReads).toBe(1);
    } finally {
      await missingCache.restore();
    }
    expect(await rows.files({ mediaIDs: [identity.mediaID] })).toEqual([]);
    expect(
      await rows.files({
        mediaIDs: untouchedMediaIDs,
        fileIDs: [fixture.history.ordinaryDraftID],
      })
    ).toEqual(untouchedBefore);
    await testInfo.attach('intentional-deletion-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        mediaID: identity.mediaID,
        calloutFileID: calloutFile.id,
        dmFileID: dmFile.id,
        calloutDelete: 'permitted public GraphQL by Space owner',
        finalDelete:
          'public GraphQL denied; bounded fixture-operator internal file-service DELETE',
        messagesRetained: 3,
        repeatedReadsCreatedNoRows: true,
        finalNativeStatusWithoutLocalOriginal: 404,
        missingFetches,
        unrelatedStagingAndDraftUnchanged: true,
        nativeVideoMediaID: videoMediaID,
        nativeVideoThumbnailMediaID: thumbnailMediaID,
        limit:
          'No persisted event ledger; does not claim arbitrary old-event replay-proof deletion',
      }),
    });
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    await rows.close();
  }
});

test('deleting a normalized old-web association does not fall back to retained original D or another bucket', async ({
  browser,
}, testInfo) => {
  const fixture = await loadHistoryFixture();
  const driver = await loadHistoryDriver(fixture);
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const context = await actor.browserContext(browser);
  const rows = new AttachmentRows(fixture);
  const [a, b] = fixture.independentRooms;
  const legacy = fixture.history.web;
  try {
    const before = await rows.files({
      mediaIDs: [legacy.mediaID],
      fileIDs: [legacy.originalFileID],
    });
    const original = before.find(row => row.id === legacy.originalFileID)!;
    const canonical = before.find(
      row =>
        row.externalReference === legacy.mediaID &&
        row.storageBucketId === a.bucketID
    )!;
    const other = before.find(
      row =>
        row.externalReference === legacy.mediaID &&
        row.storageBucketId === b.bucketID
    )!;
    expect(original.externalReference).toBeNull();
    expect(canonical).toBeDefined();
    expect(other).toBeDefined();
    expect(
      before.some(row => row.storageBucketId === MATRIX_STAGING_BUCKET)
    ).toBe(false);
    expect(
      (await roomAttachment(actor, a, legacy.eventID))?.externalReference
    ).toBe(legacy.mediaID);
    await expect(publicDelete(actor, canonical.id)).rejects.toThrow(
      'Attachment GraphQL operation failed'
    );
    await driver.deleteDocument(canonical.id);
    for (let i = 0; i < 3; i++)
      expect(
        (
          await context.request.get(
            referenceURL(fixture, a.bucketID, legacy.mediaID)
          )
        ).status()
      ).toBe(404);
    const after = await rows.files({
      mediaIDs: [legacy.mediaID],
      fileIDs: [legacy.originalFileID],
    });
    expect(after).toEqual(before.filter(row => row.id !== canonical.id));
    expect((await context.request.get(legacy.originalURL)).status()).toBe(200);
    await retainedEvent(actor, a, legacy.eventID, legacy.mxc);
    const response = await actor.matrixDownload(legacy.mxc);
    expect(response.status).toBe(200); // Surviving reference remains valid; not a forced miss here.
    await testInfo.attach('normalized-deletion-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        mediaID: legacy.mediaID,
        removedCanonicalID: canonical.id,
        originalDID: original.id,
        survivingBucketFileID: other.id,
        originalDURLStillReadable: true,
        messageStillPresent: true,
        repeatedReadsCreatedNoRows: true,
        deletionTransport:
          'public GraphQL denied; fixture operator uses existing internal file-service DELETE',
      }),
    });
  } finally {
    await context.close();
    await rows.close();
  }
});
