import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
  pauseAttachmentSend,
} from './attachments.helpers';
import {
  attachmentURL,
  byteHash,
  downloadThroughUI,
  imageMetadata,
  loadAcceptanceFixture,
  matrixEventFor,
  openFixtureConversation,
  uploadIdentity,
  type UploadResult,
} from './attachments.acceptance';
import {
  openElement,
  pauseElementMediaSend,
  uploadThroughElementUI,
} from './attachments.element';

async function checkSeek(page: Page, name: string, url: string) {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 20,
    downloadThroughput: 300_000,
    uploadThroughput: 300_000,
  });
  const ranges: number[] = [];
  const responseListener = (response: import('@playwright/test').Response) => {
    if (response.url() === url && response.request().headers().range)
      ranges.push(response.status());
  };
  page.on('response', responseListener);
  const video = page.getByLabel(`Attached video: ${name}`, { exact: true });
  try {
    await expect(video).toHaveAttribute('preload', 'none');
    expect(ranges, 'No eager media requests before Play').toEqual([]);
    await video.evaluate(async (element: HTMLVideoElement) => {
      await element.play();
    });
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.videoWidth)
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.currentTime)
      )
      .toBeGreaterThan(0);
    const before = await video.evaluate((element: HTMLVideoElement) => ({
      duration: element.duration,
      bufferedEnd: element.buffered.length
        ? element.buffered.end(element.buffered.length - 1)
        : 0,
      seekableEnd: element.seekable.length
        ? element.seekable.end(element.seekable.length - 1)
        : 0,
    }));
    expect(
      before.duration,
      'Fixture must be long enough for a real beyond-buffer seek'
    ).toBeGreaterThan(30);
    const target = before.duration - 10;
    expect(
      before.bufferedEnd,
      'Seek must land beyond the buffered portion'
    ).toBeLessThan(target);
    expect(before.seekableEnd).toBeCloseTo(before.duration, 0);
    await video.evaluate((element: HTMLVideoElement, time) => {
      element.currentTime = time;
    }, target);
    await expect
      .poll(
        () =>
          video.evaluate((element: HTMLVideoElement) => element.currentTime),
        { timeout: 20_000 }
      )
      .toBeGreaterThanOrEqual(target - 0.5);
    await expect
      .poll(
        () =>
          video.evaluate((element: HTMLVideoElement) => element.currentTime),
        { timeout: 10_000 }
      )
      .toBeGreaterThan(target + 1);
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    expect(ranges.every(status => status === 206)).toBe(true);
  } finally {
    page.off('response', responseListener);
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await session.detach();
  }
}

for (const origin of ['web', 'element'] as const) {
  for (const mediaKind of ['image', 'video', 'file', 'originalWebp'] as const) {
    const kind = mediaKind === 'originalWebp' ? 'image' : mediaKind;
    test(`${origin === 'element' ? 'Element UI' : 'web'} ${mediaKind}: staged identity moves once and downloads survive reload`, async ({
      browser,
    }, testInfo) => {
      const fixture = await loadAcceptanceFixture(); // Missing setup is a failure, never a skip.
      const room = fixture.independentRooms[0];
      const source = fixture.media[mediaKind];
      const sourceBytes = await readFile(source.path);
      const name = `${fixture.runID}-${randomUUID()}-résumé.${source.extension}`;
      const actors = fixture.users.map(
        user => new AttachmentActor(fixture, user)
      );
      await test.step('authenticate both fixture actors', () =>
        Promise.all(actors.map(actor => actor.authenticate())));
      const rows = new AttachmentRows(fixture);
      const contexts = await test.step('login both real web viewers', () =>
        Promise.all(actors.map(actor => actor.browserContext(browser))));
      const pages = contexts.map(context => context.pages()[0]);
      let multipartRequests = 0;
      const countUpload = (request: import('@playwright/test').Request) => {
        if (
          request.headers()['content-type']?.startsWith('multipart/form-data')
        )
          multipartRequests++;
      };
      pages[0].on('request', countUpload);
      let pause: Awaited<ReturnType<typeof pauseAttachmentSend>> | undefined;
      let element: Awaited<ReturnType<typeof openElement>> | undefined;
      let elementPause:
        | Awaited<ReturnType<typeof pauseElementMediaSend>>
        | undefined;
      const forbidden: string[] = [];
      const reads = (request: import('@playwright/test').Request) => {
        if (
          request.headers()['content-type']?.startsWith('application/json') &&
          /messageAttachments|content-matches/.test(request.postData() ?? '')
        )
          forbidden.push('per-attachment resolver');
      };
      pages.forEach(page => page.on('request', reads));
      try {
        await rows.verifyIndependentRooms();
        await rows.verifySharedSpaceRooms();
        await test.step('open both conversation viewers', () =>
          Promise.all(
            pages.map((page, viewer) =>
              openFixtureConversation(page, fixture, viewer as 0 | 1)
            )
          ));
        const before = await rows.files({ bucketIDs: [room.bucketID] });
        let fileID: string;
        let mediaID: string;
        let mxc: string;
        let completedUploads = 0;
        if (origin === 'web') {
          pause = await pauseAttachmentSend(pages[0]);
          // Response observation never reads/buffers the multipart request body.
          const upload = pages[0].waitForResponse(async response => {
            if (
              !response.url().endsWith('/graphql') ||
              response.request().method() !== 'POST'
            )
              return false;
            try {
              const data = await response.json();
              if (data.data?.uploadRoomMessageAttachment) {
                completedUploads++;
                return true;
              }
            } catch {
              /* A non-JSON response is not completed upload evidence. */
            }
            return false;
          });
          await pages[0].locator('input[type="file"]').setInputFiles({
            name,
            mimeType: source.mimeType,
            buffer: sourceBytes,
          });
          await expect(
            pages[0]
              .getByRole('list', { name: 'Files to send', exact: true })
              .getByText(name, { exact: true })
          ).toBeVisible();
          expect(
            (await rows.files({ bucketIDs: [room.bucketID] })).map(
              row => row.id
            )
          ).toEqual(before.map(row => row.id));
          expect(completedUploads).toBe(0);
          expect(multipartRequests).toBe(0);
          await pages[0]
            .getByRole('button', { name: 'Send', exact: true })
            .click();
          const body = (await test.step('complete real web upload', async () =>
            (await upload).json())) as {
            data: { uploadRoomMessageAttachment: UploadResult };
          };
          const identity = await uploadIdentity(
            rows,
            body.data.uploadRoomMessageAttachment,
            fixture
          );
          ({ fileID, mediaID } = identity);
          mxc = `mxc://${identity.homeserver}/${mediaID}`;
          await pause.wait();
          expect(completedUploads).toBe(1);
          expect(multipartRequests).toBe(1);
        } else {
          element = await openElement(fixture);
          elementPause = await pauseElementMediaSend(element.page);
          mxc = await uploadThroughElementUI(element.page, {
            name,
            mimeType: source.mimeType,
            buffer: sourceBytes,
          });
          await elementPause.wait();
          mediaID = mxc.split('/').at(-1)!;
          const staged = await rows.files({ mediaIDs: [mediaID] });
          expect(staged).toHaveLength(1);
          fileID = staged[0].id;
        }
        const staged = await rows.files({ mediaIDs: [mediaID] });
        expect(staged).toHaveLength(1);
        expect(staged[0].id).toBe(fileID);
        expect(staged[0].storageBucketId).toBe(MATRIX_STAGING_BUCKET);
        expect(staged[0].authorizationId).toBeNull();
        expect(
          (await rows.files({ bucketIDs: [room.bucketID] })).map(row => row.id)
        ).toEqual(before.map(row => row.id));
        expect(
          (await actors[0].matrixMessages(room.matrixRoomID)).filter(
            event => event.content.url === mxc
          )
        ).toHaveLength(0);
        if (origin === 'web') pause!.release();
        else elementPause!.release();
        const event = await matrixEventFor(actors[0], room.matrixRoomID, name);
        if (origin === 'web') expect(multipartRequests).toBe(1);
        expect(event.content.url).toBe(mxc); // A second Synapse upload cannot hide behind UI success.
        expect(event.content['io.alkemio.document_id']).toBeUndefined();
        await expect
          .poll(
            async () =>
              (await rows.files({ mediaIDs: [mediaID] })).map(
                row => row.storageBucketId
              ),
            { timeout: 30_000 }
          )
          .toEqual([room.bucketID]);
        const placed = (await rows.files({ mediaIDs: [mediaID] }))[0];
        expect(placed.id).toBe(fileID);
        expect(placed.authorizationId).not.toBeNull();
        expect(placed.tagsetId).not.toBeNull();
        expect(placed.createdBy).toBe(
          fixture.users[origin === 'web' ? 0 : 1].actorID
        );
        expect(placed.temporaryLocation).toBe(false);
        expect(placed.displayName).toBe(name);
        if (origin === 'web') {
          // The browser sends only the media reference and name; metadata comes
          // from the stored original, with no conversion or document-ID hint.
          expect(event.content.info).toMatchObject({
            mimetype: placed.mimeType,
            size: Number(placed.size),
          });
          if (kind === 'image') {
            expect(placed.contentMetadata?.imageWidth).toBeGreaterThan(0);
            expect(placed.contentMetadata?.imageHeight).toBeGreaterThan(0);
            expect(event.content.info).toMatchObject({
              w: placed.contentMetadata!.imageWidth,
              h: placed.contentMetadata!.imageHeight,
            });
          }
        }
        const after = await rows.files({ bucketIDs: [room.bucketID] });
        expect(
          after
            .filter(row => !before.some(old => old.id === row.id))
            .map(row => row.id)
        ).toEqual([fileID]);
        const receiver: 0 | 1 = origin === 'web' ? 1 : 0;
        const page = pages[receiver];
        const url = await attachmentURL(page, name);
        expect(new URL(url).searchParams.get('bucketId')).toBe(room.bucketID);
        expect(new URL(url).searchParams.get('ref')).toBe(mediaID);
        expect(url).not.toContain(fileID);
        const fileIDRequests: string[] = [];
        const inspectReads = (request: import('@playwright/test').Request) => {
          if (request.url().includes(fileID))
            fileIDRequests.push(request.method());
        };
        page.on('request', inspectReads);
        if (kind === 'image') {
          const image = page.getByRole('img', {
            name: `Attached image: ${name}`,
            exact: true,
          });
          await expect
            .poll(() =>
              image.evaluate((node: HTMLImageElement) => node.naturalWidth)
            )
            .toBeGreaterThan(0);
        }
        if (kind === 'video') await checkSeek(page, name, url);
        const downloadFile = testInfo.outputPath(
          `download.${source.extension}`
        );
        const downloaded = await downloadThroughUI(page, name, downloadFile);
        const matrixResponse = await actors[receiver].matrixDownload(mxc);
        expect(matrixResponse.status).toBe(200);
        const matrixBytes = Buffer.from(await matrixResponse.arrayBuffer());
        expect(byteHash(downloaded)).toBe(byteHash(matrixBytes));
        expect(byteHash(downloaded)).toBe(byteHash(sourceBytes));
        if (kind === 'image') {
          const originalMetadata = await imageMetadata(source.path);
          expect(
            Object.keys(originalMetadata).length,
            'Input must carry actual source metadata'
          ).toBeGreaterThan(0);
          expect(await imageMetadata(downloadFile)).toEqual(originalMetadata);
        }
        const range = await page
          .context()
          .request.get(url, { headers: { Range: 'bytes=0-99' } });
        expect(range.status()).toBe(206);
        expect(range.headers()['content-range']).toBe(
          `bytes 0-99/${downloaded.length}`
        );
        expect(await range.body()).toEqual(downloaded.subarray(0, 100));
        const invalid = await page.context().request.get(url, {
          headers: { Range: `bytes=${downloaded.length}-` },
        });
        expect(invalid.status()).toBe(416);
        expect(invalid.headers()['content-range']).toBe(
          `bytes */${downloaded.length}`
        );
        const head = await page.context().request.head(url);
        expect(head.status()).toBe(200);
        expect(head.headers()['content-length']).toBe(
          String(sourceBytes.length)
        );
        expect((await head.body()).length).toBe(0);
        const etag = head.headers().etag;
        expect(etag).toBeTruthy();
        expect(
          (
            await page.context().request.get(url, {
              headers: { 'If-None-Match': etag },
            })
          ).status()
        ).toBe(304);
        for (const headers of [
          {},
          { Range: 'bytes=0-99' },
          { 'If-None-Match': etag },
        ] as Record<string, string>[]) {
          const anonymous = await fetch(url, { headers });
          expect(anonymous.status).toBe(403);
        }
        expect((await fetch(url, { method: 'HEAD' })).status).toBe(403);
        const wrongBucket = new URL(url);
        wrongBucket.searchParams.set(
          'bucketId',
          fixture.independentRooms[1].bucketID
        );
        expect(
          (await page.context().request.get(wrongBucket.href)).status()
        ).toBe(404);
        await page.reload();
        await openFixtureConversation(page, fixture, receiver);
        expect(await attachmentURL(page, name)).toBe(url);
        expect(forbidden).toEqual([]);
        expect(fileIDRequests).toEqual([]);
        page.off('request', inspectReads);
        await testInfo.attach('attachment-evidence', {
          contentType: 'application/json',
          body: JSON.stringify({
            origin,
            uploadTransport:
              origin === 'web' ? 'Alkemio browser UI' : 'Element browser UI',
            kind: mediaKind,
            fileID,
            mediaID,
            size: downloaded.length,
            storedMimeType: placed.mimeType,
            storedImageDimensions: placed.contentMetadata,
            emittedMediaInfo: event.content.info,
            sha256: byteHash(downloaded),
            sameStagedAndPlacedID: true,
            newDestinationRows: 1,
            rangeStatus: 206,
          }),
        });
      } finally {
        pages[0].off('request', countUpload);
        await pause?.close();
        await elementPause?.close();
        await element?.disconnect();
        pages.forEach(page => page.off('request', reads));
        await Promise.all(contexts.map(context => context.close()));
        await rows.close();
      }
    });
  }
}
