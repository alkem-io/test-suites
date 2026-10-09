import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Route } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
} from './attachments.helpers';
import {
  loadAcceptanceFixture,
  matrixEventFor,
  openFixtureConversation,
  uploadIdentity,
} from './attachments.acceptance';

type SendOperation = {
  query: string;
  variables: {
    messageData: {
      attachmentUpload: { externalReference: string; displayName: string };
      message: string;
      roomID: string;
    };
  };
};

function attachmentSend(route: Route): SendOperation | undefined {
  if (
    !route.request().headers()['content-type']?.startsWith('application/json')
  )
    return;
  try {
    const operation = route.request().postDataJSON() as SendOperation;
    if (
      operation.variables?.messageData?.attachmentUpload &&
      /\bsendMessageToRoom\b/.test(operation.query)
    )
      return operation;
  } catch {
    // Inspect only JSON metadata mutations, never multipart bytes.
  }
}

test('Matrix API concurrent forwards converge per bucket and duplicate references retain identity', async ({}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const actors = fixture.users.map(user => new AttachmentActor(fixture, user));
  await Promise.all(actors.map(actor => actor.authenticate()));
  const rows = new AttachmentRows(fixture);
  const rooms = fixture.independentRooms;
  const source = fixture.media.file;
  const size = (await readFile(source.path)).length;
  const prefix = `${fixture.runID}-${randomUUID()}`;
  const content = (mxc: string, name: string) => ({
    msgtype: 'm.file',
    body: name,
    filename: name,
    url: mxc,
    info: { mimetype: source.mimeType, size },
  });
  try {
    await rows.verifyIndependentRooms();
    const mxc = await actors[0].matrixUpload(
      source.path,
      `${prefix}.pdf`,
      source.mimeType
    );
    const mediaID = mxc.split('/').at(-1)!;
    const staged = await rows.files({ mediaIDs: [mediaID] });
    expect(staged).toHaveLength(1);
    expect(staged[0].storageBucketId).toBe(MATRIX_STAGING_BUCKET);
    const firstNames = rooms.map((_, index) => `${prefix}-first-${index}.pdf`);
    await Promise.all(
      rooms.map((room, index) =>
        actors[index].matrixSend(room, content(mxc, firstNames[index]))
      )
    );
    await expect
      .poll(
        async () =>
          (await rows.files({ mediaIDs: [mediaID] }))
            .map(row => row.storageBucketId)
            .sort(),
        { timeout: 30_000 }
      )
      .toEqual(rooms.map(room => room.bucketID).sort());
    const placed = await rows.files({ mediaIDs: [mediaID] });
    expect(new Set(placed.map(row => row.id)).size).toBe(2);
    expect(placed.filter(row => row.id === staged[0].id)).toHaveLength(1);
    for (const [index, room] of rooms.entries()) {
      const row = placed.find(
        value => value.storageBucketId === room.bucketID
      )!;
      expect(row.displayName).toBe(firstNames[index]);
      expect(row.createdBy).toBe(fixture.users[index].actorID);
      expect(row.authorizationId).not.toBeNull();
      expect(row.tagsetId).not.toBeNull();
      expect(row.externalID).toBe(staged[0].externalID);
    }
    // Real additional events reuse the reference. This is not claimed as a
    // controlled broker redelivery; the PostgreSQL barrier gate covers that race.
    const repeats = await Promise.all(
      rooms.map((room, index) =>
        actors[1 - index].matrixSend(
          room,
          content(mxc, `${prefix}-later-${index}.pdf`)
        )
      )
    );
    await Promise.all(
      rooms.map((room, index) =>
        expect
          .poll(async () =>
            (await actors[index].matrixMessages(room.matrixRoomID)).some(
              event => event.event_id === repeats[index]
            )
          )
          .toBe(true)
      )
    );
    const secondMxc = await actors[0].matrixUpload(
      source.path,
      `${prefix}-new.pdf`,
      source.mimeType
    );
    expect(secondMxc).not.toBe(mxc);
    const secondMediaID = secondMxc.split('/').at(-1)!;
    await actors[0].matrixSend(
      rooms[0],
      content(secondMxc, `${prefix}-new.pdf`)
    );
    await expect
      .poll(
        async () =>
          (await rows.files({ mediaIDs: [secondMediaID] })).map(
            row => row.storageBucketId
          ),
        { timeout: 30_000 }
      )
      .toEqual([rooms[0].bucketID]);
    // A later successfully placed event also establishes receipt processing
    // advanced after the duplicate events; assert all original row metadata.
    expect(await rows.files({ mediaIDs: [mediaID] })).toEqual(placed);
    const second = (await rows.files({ mediaIDs: [secondMediaID] }))[0];
    expect(placed.some(row => row.id === second.id)).toBe(false);
    expect(second.externalID).toBe(staged[0].externalID);
    await testInfo.attach('forward-identity-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        uploadTransport: 'authenticated Matrix API',
        mediaID,
        originalFileID: staged[0].id,
        placedFileIDs: placed.map(row => row.id),
        secondMediaID,
        secondFileID: second.id,
        sharedPhysicalBlob: true,
      }),
    });
  } finally {
    await rows.close();
  }
});

test('web retry after actual server rejection reuses the completed upload', async ({
  browser,
}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const context = await actor.browserContext(browser);
  const page = context.pages()[0];
  const rows = new AttachmentRows(fixture);
  const name = `${fixture.runID}-${randomUUID()}-retry.pdf`;
  const uploadsSent: { externalReference: string; displayName: string }[] = [];
  let uploads = 0;
  let actualServerRejected = false;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/private/rest/messaging/media/upload')
      uploads++;
  });
  const handler = async (route: Route) => {
    const operation = attachmentSend(route);
    if (!operation) return route.continue();
    uploadsSent.push(operation.variables.messageData.attachmentUpload);
    if (uploadsSent.length !== 1) return route.continue();
    // The server rejects a real invalid combination before publication. Only
    // this intercepted attempt changes; the browser retains its original draft.
    operation.variables.messageData.message = 'fixture definite rejection';
    const response = await route.fetch({ postData: JSON.stringify(operation) });
    const body = await response.json();
    actualServerRejected = Array.isArray(body.errors) && body.errors.length > 0;
    await route.fulfill({ response });
  };
  await page.route('**/*graphql', handler);
  try {
    await openFixtureConversation(page, fixture, 0);
    await page.locator('input[type="file"]').setInputFiles({
      name,
      mimeType: fixture.media.file.mimeType,
      buffer: await readFile(fixture.media.file.path),
    });
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(
      page.getByText(
        'Send was not confirmed. Check the conversation before sending again.',
        { exact: true }
      )
    ).toBeVisible();
    expect(actualServerRejected).toBe(true);
    expect(uploads).toBe(1);
    expect(uploadsSent).toHaveLength(1);
    const identity = await uploadIdentity(rows, uploadsSent[0], fixture);
    const staged = await rows.files({ mediaIDs: [identity.mediaID] });
    expect(staged).toHaveLength(1);
    expect(staged[0].storageBucketId).toBe(MATRIX_STAGING_BUCKET);
    expect(
      (
        await actor.matrixMessages(fixture.independentRooms[0].matrixRoomID)
      ).filter(event => event.content.body === name)
    ).toHaveLength(0);
    await expect(
      page
        .getByRole('list', { name: 'Files to send', exact: true })
        .getByText(name, { exact: true })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const event = await matrixEventFor(
      actor,
      fixture.independentRooms[0].matrixRoomID,
      name
    );
    expect(uploadsSent).toHaveLength(2);
    expect(uploadsSent[1]).toEqual(uploadsSent[0]);
    expect(uploads).toBe(1);
    expect(event.content.url).toBe(
      `mxc://${identity.homeserver}/${identity.mediaID}`
    );
    await expect
      .poll(
        async () =>
          (await rows.files({ mediaIDs: [identity.mediaID] })).map(
            row => row.storageBucketId
          ),
        { timeout: 30_000 }
      )
      .toEqual([fixture.independentRooms[0].bucketID]);
    expect((await rows.files({ mediaIDs: [identity.mediaID] }))[0].id).toBe(
      identity.fileID
    );
    await expect(
      page.getByRole('list', { name: 'Files to send', exact: true })
    ).toHaveCount(0);
    await testInfo.attach('definite-retry-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        fileID: identity.fileID,
        mediaID: identity.mediaID,
        actualServerRejected,
        uploadRequests: uploads,
        sendAttempts: uploadsSent.length,
      }),
    });
  } finally {
    await page.unroute('**/*graphql', handler);
    await context.close();
    await rows.close();
  }
});

test('partial web send clears confirmed items and does not automatically resend an unconfirmed event', async ({
  browser,
}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const context = await actor.browserContext(browser);
  const page = context.pages()[0];
  const prefix = `${fixture.runID}-${randomUUID()}`;
  const names = [`${prefix}-confirmed.pdf`, `${prefix}-unconfirmed.pdf`];
  const rows = new AttachmentRows(fixture);
  const identities: Awaited<ReturnType<typeof uploadIdentity>>[] = [];
  let uploads = 0;
  let sends = 0;
  let committedResponseDropped = false;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/private/rest/messaging/media/upload')
      uploads++;
  });
  const handler = async (route: Route) => {
    const operation = attachmentSend(route);
    if (!operation) return route.continue();
    identities.push(
      await uploadIdentity(
        rows,
        operation.variables.messageData.attachmentUpload,
        fixture
      )
    );
    sends++;
    if (sends !== 2) return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    committedResponseDropped =
      !!body.data?.sendMessageToRoom?.id && !body.errors;
    await route.abort('failed');
  };
  await page.route('**/*graphql', handler);
  try {
    await openFixtureConversation(page, fixture, 0);
    const buffer = await readFile(fixture.media.file.path);
    await page.locator('input[type="file"]').setInputFiles(
      names.map(name => ({
        name,
        mimeType: fixture.media.file.mimeType,
        buffer,
      }))
    );
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(
      page.getByText(
        'Send was not confirmed. Check the conversation before sending again.',
        { exact: true }
      )
    ).toBeVisible();
    expect(committedResponseDropped).toBe(true);
    const draft = page.getByRole('list', {
      name: 'Files to send',
      exact: true,
    });
    await expect(draft.getByText(names[0], { exact: true })).toHaveCount(0);
    await expect(draft.getByText(names[1], { exact: true })).toBeVisible();
    await Promise.all(
      names.map(name =>
        matrixEventFor(actor, fixture.independentRooms[0].matrixRoomID, name)
      )
    );
    // Bounded observation of automatic behavior; no second user Send action.
    await page.waitForTimeout(2000);
    expect(sends).toBe(2);
    expect(uploads).toBe(2);
    for (const name of names)
      expect(
        (
          await actor.matrixMessages(fixture.independentRooms[0].matrixRoomID)
        ).filter(event => event.content.body === name)
      ).toHaveLength(1);
    for (const identity of identities) {
      await expect
        .poll(
          async () =>
            (await rows.files({ mediaIDs: [identity.mediaID] })).map(
              row => row.storageBucketId
            ),
          { timeout: 30_000 }
        )
        .toEqual([fixture.independentRooms[0].bucketID]);
      expect((await rows.files({ mediaIDs: [identity.mediaID] }))[0].id).toBe(
        identity.fileID
      );
    }
    await testInfo.attach('partial-send-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        committedResponseDropped,
        uploadRequests: uploads,
        sendAttempts: sends,
        confirmedItemCleared: true,
        unconfirmedItemRetained: true,
        automaticResendsObserved: 0,
      }),
    });
  } finally {
    await page.unroute('**/*graphql', handler);
    await context.close();
    await rows.close();
  }
});
