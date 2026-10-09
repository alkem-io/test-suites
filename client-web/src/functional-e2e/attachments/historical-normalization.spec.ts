import { randomUUID } from 'node:crypto';
import { referenceURL } from './attachments.acceptance';
import { expect, test, type BrowserContext } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  MATRIX_STAGING_BUCKET,
} from './attachments.helpers';
import {
  loadHistoryDriver,
  loadHistoryFixture,
  roomAttachment,
} from './attachments.history';

test.describe.configure({ mode: 'serial' });

test('explicitly reviewed historical references normalize while exclusions remain unavailable', async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const fixture = await loadHistoryFixture();
  const driver = await loadHistoryDriver(fixture);
  const alpha = new AttachmentActor(fixture, fixture.users[0]);
  const rows = new AttachmentRows(fixture);
  let context: BrowserContext | undefined;
  const [a, b] = fixture.independentRooms;
  const history = fixture.history;
  const mediaIDs = [
    history.web.mediaID,
    history.repeatedWeb.mediaID,
    history.excluded.mediaID,
    history.element.mediaID,
    ...history.untouchedMediaIDs,
  ];
  try {
    await rows.verifyIndependentRooms();
    const before = await rows.files({
      mediaIDs,
      fileIDs: [
        history.web.originalFileID,
        history.excluded.originalFileID,
        history.ordinaryDraftID,
      ],
    });
    expect(history.web.originalFileID).toBe(history.repeatedWeb.originalFileID);
    expect(history.web.mediaID).not.toBe(history.repeatedWeb.mediaID);
    for (const item of [history.web, history.repeatedWeb, history.excluded]) {
      expect(
        before.find(row => row.id === item.stagingFileID)?.storageBucketId
      ).toBe(MATRIX_STAGING_BUCKET);
      expect(
        before.some(
          row =>
            row.externalReference === item.mediaID &&
            row.storageBucketId === a.bucketID
        )
      ).toBe(false);
    }
    const untouchedBefore = before.filter(
      row =>
        history.untouchedMediaIDs.includes(row.externalReference ?? '') ||
        row.id === history.ordinaryDraftID
    );
    const plainD = before.find(row => row.id === history.web.originalFileID)!;
    const elementC = before.find(
      row => row.id === history.element.originalFileID
    )!;
    expect(elementC.storageBucketId).toBe(a.bucketID);
    expect(
      before.find(row => row.id === history.element.stagingFileID)
        ?.storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    // These forwards were made by the genuine old writer before it was drained.
    // No new receipt may silently normalize a historical tuple during the migration window.
    expect(
      before.some(
        row =>
          row.externalReference === history.web.mediaID &&
          row.storageBucketId === b.bucketID
      )
    ).toBe(true);
    await driver.deleteDocument(history.excluded.originalFileID);
    const partial = await driver.exportInventory(
      [b.roomID],
      `partial-${randomUUID()}`
    );
    const partialBefore = await rows.files({ mediaIDs });
    const partialPlan = await driver.dryRun(
      partial,
      `partial-plan-${randomUUID()}`
    );
    expect(partialPlan.counts.eligible).toBe(0);
    expect(partialPlan.counts.skipped).toBeGreaterThan(0);
    expect(await rows.files({ mediaIDs })).toEqual(partialBefore);
    const allRooms = await driver.supportedRooms();
    expect(allRooms).toEqual(
      expect.arrayContaining([
        a.roomID,
        b.roomID,
        ...fixture.sharedBucketRooms.map(room => room.roomID),
      ])
    );
    const complete = await driver.exportInventory(
      allRooms,
      `complete-${randomUUID()}`
    );
    const beforeDry = await rows.files({ mediaIDs });
    const plan = await driver.dryRun(complete, `plan-${randomUUID()}`);
    expect(plan.ok).toBe(true);
    expect(plan.counts.eligible).toBeGreaterThan(0);
    expect(await rows.files({ mediaIDs })).toEqual(beforeDry);
    const approved = await driver.approveTargets(
      plan.path,
      [
        { bucketId: a.bucketID, mediaId: history.web.mediaID },
        { bucketId: a.bucketID, mediaId: history.repeatedWeb.mediaID },
      ],
      `reviewed-${randomUUID()}`
    );
    const result = await driver.apply(approved, `apply-${randomUUID()}`);
    expect(result.ok).toBe(true);
    expect(result.counts.failed).toBe(0);
    await driver.activateReader();
    await alpha.authenticate();
    context = await alpha.browserContext(browser);
    const after = await rows.files({
      mediaIDs,
      fileIDs: [plainD.id, history.ordinaryDraftID],
    });
    expect(after.find(row => row.id === plainD.id)).toEqual(plainD);
    expect(after.find(row => row.id === elementC.id)).toEqual(elementC);
    expect(
      after.filter(
        row =>
          history.untouchedMediaIDs.includes(row.externalReference ?? '') ||
          row.id === history.ordinaryDraftID
      )
    ).toEqual(untouchedBefore);
    for (const item of [history.web, history.repeatedWeb, history.element]) {
      expect(
        after.some(
          row =>
            row.id === item.stagingFileID &&
            row.storageBucketId === MATRIX_STAGING_BUCKET
        )
      ).toBe(false);
      const canonical = after.find(
        row =>
          row.externalReference === item.mediaID &&
          row.storageBucketId === a.bucketID
      );
      expect(canonical).toBeDefined();
      expect(
        (await roomAttachment(alpha, a, item.eventID))?.externalReference
      ).toBe(item.mediaID);
      expect(
        (
          await context.request.get(
            referenceURL(fixture, a.bucketID, item.mediaID)
          )
        ).status()
      ).toBe(200);
    }
    expect(
      after.find(row => row.id === history.excluded.stagingFileID)
        ?.storageBucketId
    ).toBe(MATRIX_STAGING_BUCKET);
    expect((await context.request.get(history.web.originalURL)).status()).toBe(
      200
    );
    expect(
      (
        await context.request.get(
          referenceURL(fixture, a.bucketID, history.excluded.mediaID)
        )
      ).status()
    ).toBe(404);
    const repeat = await driver.dryRun(complete, `repeat-plan-${randomUUID()}`);
    const repeated = await driver.apply(
      repeat.path,
      `repeat-apply-${randomUUID()}`
    );
    expect(repeated.ok).toBe(true);
    expect(
      repeated.counts.copied +
        repeated.counts.moved +
        repeated.counts.redundantStageRemoved
    ).toBe(0);
    expect(
      await rows.files({
        mediaIDs,
        fileIDs: [plainD.id, history.ordinaryDraftID],
      })
    ).toEqual(after);
    await testInfo.attach('historical-normalization-evidence', {
      contentType: 'application/json',
      body: JSON.stringify({
        baselineRevision: history.baselineRevision,
        forwardTransport:
          'pre-change authenticated Matrix API, before writer drain',
        exclusionSetup:
          'fixture operator via existing internal file-service DELETE after exact owned-bucket check; no policy mutation',
        partial: partialPlan.counts,
        applied: result.counts,
        repeated: repeated.counts,
        ordinaryDUnchanged: true,
        excludedTupleLeftUnavailable: true,
      }),
    });
  } finally {
    await context?.close();
    await rows.close();
  }
});
