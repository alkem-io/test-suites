import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext } from '@playwright/test';
import { Pool } from 'pg';
import { AttachmentActor, AttachmentRows, MATRIX_STAGING_BUCKET } from './attachments.helpers';
import { loadAcceptanceFixture, type AcceptanceFixture } from './attachments.acceptance';

type PublicFixture = AcceptanceFixture & {
  synapsePostgresURL: string;
  adapterMaxFileBytes: number;
  unsupportedRoomID: string;
};
async function fixture() {
  const value = await loadAcceptanceFixture() as PublicFixture;
  const url = new URL(value.synapsePostgresURL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/synapse' ||
      value.adapterMaxFileBytes !== 50 * 1024 * 1024 || !/^[0-9a-f-]{36}$/.test(value.unsupportedRoomID))
    throw new Error('Public upload acceptance needs explicit own Synapse DB, active cap and unsupported room');
  return value;
}
async function browserUpload(context: BrowserContext, f: PublicFixture, options: {
  name: string; bytes?: number[]; size?: number; forgedActor?: string; guest?: boolean;
}) {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(f.baseURL);
  return page.evaluate(async ({ baseURL, options }) => {
    const url = new URL('/api/private/rest/messaging/media/upload', baseURL);
    url.searchParams.set('filename', options.name);
    if (options.guest) url.searchParams.set('guestName', 'Isolated fixture guest');
    const bytes = options.bytes ? new Uint8Array(options.bytes) : new Uint8Array(options.size ?? 0);
    const body = new File([bytes], options.name, { type: 'application/pdf' });
    const response = await fetch(url, { method: 'POST', credentials: 'include',
      headers: { 'Content-Type': body.type, ...(options.forgedActor ? { 'X-Alkemio-Actor-Id': options.forgedActor } : {}) }, body });
    return { status: response.status, body: await response.json() as { mediaId?: string; contentUri?: string; error?: string } };
  }, { baseURL: f.baseURL, options });
}

test('real gateway denies anonymous and guest spoofing and overwrites an authenticated forged actor', async ({ browser }, testInfo) => {
  const f = await fixture();
  const alpha = new AttachmentActor(f, f.users[0]);
  await alpha.authenticate();
  const context = await alpha.browserContext(browser);
  const anonymous = await browser.newContext();
  const rows = new AttachmentRows(f);
  const db = new Pool({ connectionString: f.synapsePostgresURL, options: '-c default_transaction_read_only=on -c statement_timeout=5000' });
  const bytes = [...await readFile(f.media.file.path)];
  try {
    const rejectedNames: string[] = [];
    for (const guest of [false, true]) {
      const name = `${f.runID}-${randomUUID()}-denied.pdf`;
      rejectedNames.push(name);
      const result = await browserUpload(anonymous, f, { name, bytes, guest, forgedActor: f.users[1].actorID });
      expect(result.status).toBe(401);
      expect(result.body.error).toBe('invalid_actor');
    }
    expect((await db.query('SELECT media_id FROM local_media_repository WHERE upload_name=ANY($1::text[])', [rejectedNames])).rows).toEqual([]);
    const result = await browserUpload(context, f, { name: `${f.runID}-${randomUUID()}-forged.pdf`, bytes, forgedActor: f.users[1].actorID });
    expect(result.status).toBe(201);
    const owner = await db.query('SELECT user_id FROM local_media_repository WHERE media_id=$1', [result.body.mediaId]);
    expect(owner.rows.map(row => row.user_id)).toEqual([f.users[0].matrixUserID]);
    expect((await rows.files({ mediaIDs: [result.body.mediaId!] })).map(row => row.storageBucketId)).toEqual([MATRIX_STAGING_BUCKET]);
    await testInfo.attach('gateway-actor-proof', { contentType: 'application/json', body: JSON.stringify({ anonymousForgedDenied: true, namedGuestForgedDenied: true, authenticatedForgedActorOverwritten: true, actualSynapseUploader: f.users[0].matrixUserID }) });
  } finally { await Promise.all([context.close(), anonymous.close(), rows.close(), db.end()]); }
});

test('public browser raw File honors zero length and existing global adapter cap', async ({ browser }) => {
  const f = await fixture();
  const actor = new AttachmentActor(f, f.users[0]);
  await actor.authenticate();
  const context = await actor.browserContext(browser);
  const rows = new AttachmentRows(f);
  const db = new Pool({ connectionString: f.synapsePostgresURL, options: '-c default_transaction_read_only=on -c statement_timeout=5000' });
  try {
    const empty = await browserUpload(context, f, { name: `${f.runID}-${randomUUID()}-zero.pdf`, size: 0 });
    expect(empty.status).toBe(201);
    expect(Number((await rows.files({ mediaIDs: [empty.body.mediaId!] }))[0].size)).toBe(0);
    const name = `${f.runID}-${randomUUID()}-too-large.pdf`;
    const oversized = await browserUpload(context, f, { name, size: f.adapterMaxFileBytes + 1 });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error).toBe('media_too_large');
    expect((await db.query('SELECT media_id FROM local_media_repository WHERE upload_name=$1', [name])).rows).toEqual([]);
  } finally { await Promise.all([context.close(), rows.close(), db.end()]); }
});

test('room-neutral upload completes before unsupported destination send is rejected', async ({}, testInfo) => {
  const f = await fixture();
  const actor = new AttachmentActor(f, f.users[0]);
  await actor.authenticate();
  const rows = new AttachmentRows(f);
  try {
    const reference = await actor.uploadMedia({ file: f.media.file.path, name: `${f.runID}-${randomUUID()}-unsupported-room.pdf`, mimeType: f.media.file.mimeType });
    const before = await rows.files({ mediaIDs: [reference.externalReference] });
    expect(before.map(row => row.storageBucketId)).toEqual([MATRIX_STAGING_BUCKET]);
    await expect(actor.graphql('mutation Unsupported($input:RoomSendMessageInput!){sendMessageToRoom(messageData:$input){id}}', { input: { roomID: f.unsupportedRoomID, message: '', attachmentUpload: reference } })).rejects.toThrow('Attachment GraphQL operation failed');
    expect(await rows.files({ mediaIDs: [reference.externalReference] })).toEqual(before);
    await testInfo.attach('room-neutral-boundary', { contentType: 'application/json', body: JSON.stringify({ uploadRoute: '/api/private/rest/messaging/media/upload', uploadHasNoRoomContext: true, unsupportedDestinationRejectedAfterUpload: true, stagedReference: reference.externalReference }) });
  } finally { await rows.close(); }
});
