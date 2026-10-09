import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
} from './attachments.helpers';
import { loadAcceptanceFixture } from './attachments.acceptance';
import { loadHistoryDriver } from './attachments.history';

/** A real authenticated Matrix download; the private driver only quarantines the exact owned cache file. */
test('provider fetch survives relocation and then the deletion of the first association', async ({}, testInfo) => {
  const fixture = await loadAcceptanceFixture();
  const driver = await loadHistoryDriver(fixture);
  const actor = new AttachmentActor(fixture, fixture.users[0]);
  await actor.authenticate();
  const rows = new AttachmentRows(fixture);
  const [a, b] = fixture.independentRooms;
  const name = `${fixture.runID}-${randomUUID()}-cache-miss.pdf`;
  const source = await readFile(fixture.media.file.path);
  const hash = (bytes: Buffer) =>
    createHash('sha256').update(bytes).digest('hex');
  const evidence = [];
  try {
    const mxc = await actor.matrixUpload(
      fixture.media.file.path,
      name,
      'application/pdf'
    );
    const mediaID = mxc.split('/').at(-1)!;
    const staged = (await rows.files({ mediaIDs: [mediaID] }))[0];
    expect(staged.storageBucketId).toBe(MATRIX_STAGING_BUCKET);
    const content = {
      msgtype: 'm.file',
      body: name,
      filename: name,
      url: mxc,
      info: { mimetype: 'application/pdf', size: source.length },
    };
    await actor.matrixSend(a, content);
    await expect
      .poll(async () =>
        (await rows.files({ mediaIDs: [mediaID] })).map(
          row => row.storageBucketId
        )
      )
      .toEqual([a.bucketID]);
    expect((await rows.files({ mediaIDs: [mediaID] }))[0].id).toBe(staged.id);
    for (const phase of ['after-move', 'surviving-copy'] as const) {
      if (phase === 'surviving-copy') {
        await actor.matrixSend(b, content);
        await expect
          .poll(async () => (await rows.files({ mediaIDs: [mediaID] })).length)
          .toBe(2);
        await driver.deleteDocument(staged.id);
        expect(
          (await rows.files({ mediaIDs: [mediaID] })).map(
            row => row.storageBucketId
          )
        ).toEqual([b.bucketID]);
      }
      const quarantine = await driver.quarantineOriginal(mediaID);
      try {
        expect(await quarantine.originalAbsent()).toBe(true);
        const response = await actor.matrixDownload(mxc);
        expect(response.status).toBe(200);
        const bytes = Buffer.from(await response.arrayBuffer());
        expect(hash(bytes)).toBe(hash(source));
        const fetched = await quarantine.providerFetches();
        expect(fetched.lookups).toBe(0);
        expect(fetched.contentReads).toBe(1);
        evidence.push({
          phase,
          mediaID,
          bytes: bytes.length,
          sha256: hash(bytes),
          providerFetches: fetched,
        });
      } finally {
        await quarantine.restore();
      }
    }
    await testInfo.attach('forced-provider-fetch-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        downloadTransport: 'authenticated Matrix media API',
        deletionTransport: 'fixture operator via existing internal file-service DELETE after exact owned-bucket check; not end-user GraphQL',
        cacheScope: 'exact owned test original only, restored in cleanup',
        evidence,
      }),
    });
  } finally {
    await rows.close();
  }
});
