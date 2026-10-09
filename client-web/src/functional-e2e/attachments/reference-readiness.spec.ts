import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { AttachmentActor, AttachmentRows } from './attachments.helpers';
import {
  loadAcceptanceFixture,
  openFixtureConversation,
  referenceURL,
} from './attachments.acceptance';

for (const recover of [true, false]) {
  test(`reference resource readiness: injected initial 404 ${recover ? 'recovers' : 'exhausts its bounded budget'}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60_000);
    const fixture = await loadAcceptanceFixture();
    const actor = new AttachmentActor(fixture, fixture.users[0]);
    await actor.authenticate();
    const room = fixture.independentRooms[0];
    const name = `${fixture.runID}-${randomUUID()}-readiness.jpg`;
    const reference = await actor.uploadMedia({
      file: fixture.media.image.path,
      name,
      mimeType: fixture.media.image.mimeType,
    });
    await actor.graphql(
      'mutation ReadinessSend($input:RoomSendMessageInput!){sendMessageToRoom(messageData:$input){id}}',
      {
        input: {
          roomID: room.roomID,
          message: '',
          attachmentUpload: reference,
        },
      }
    );
    const rows = new AttachmentRows(fixture);
    const context = await actor.browserContext(browser);
    const page = context.pages()[0];
    const url = referenceURL(
      fixture,
      room.bucketID,
      reference.externalReference
    );
    const heads: number[] = [];
    let gets = 0,
      blockedResolvers = 0;
    try {
      await expect
        .poll(async () =>
          (await rows.files({ mediaIDs: [reference.externalReference] })).map(
            row => row.storageBucketId
          )
        )
        .toEqual([room.bucketID]);
      await page.route('**/graphql', async route => {
        if (/messageAttachments/.test(route.request().postData() ?? '')) {
          blockedResolvers++;
          return route.fulfill({
            status: 500,
            body: 'Blocked per-attachment resolver',
          });
        }
        return route.continue();
      });
      await page.route(url, async route => {
        if (route.request().method() === 'HEAD') {
          heads.push(Date.now());
          if (recover && heads.length === 2) return route.continue();
          return route.fulfill({ status: 404, body: '' });
        }
        gets++;
        if (recover && heads.length === 2) return route.continue();
        return route.fulfill({ status: 404, body: '' });
      });
      await openFixtureConversation(page, fixture, 0);
      if (recover) {
        const image = page.getByRole('img', {
          name: `Attached image: ${name}`,
          exact: true,
        });
        await expect
          .poll(
            () =>
              image.evaluate(
                (element: HTMLImageElement) => element.naturalWidth
              ),
            { timeout: 15_000 }
          )
          .toBeGreaterThan(0);
        expect(heads).toHaveLength(2);
        expect(gets).toBe(2);
      } else {
        await expect.poll(() => heads.length, { timeout: 22_000 }).toBe(4);
        await page.waitForTimeout(2000);
        expect(heads).toHaveLength(4);
        expect(gets).toBe(1);
      }
      expect(blockedResolvers).toBe(0);
      await testInfo.attach('injected-reference-readiness', {
        contentType: 'application/json',
        body: JSON.stringify({
          injection:
            'same public resource initial GET404 and controlled HEAD responses; not real storage lag',
          recover,
          headCount: heads.length,
          getCount: gets,
          headIntervals: heads
            .slice(1)
            .map((time, index) => time - heads[index]),
          blockedResolvers,
        }),
      });
    } finally {
      await context.close();
      await rows.close();
    }
  });
}
