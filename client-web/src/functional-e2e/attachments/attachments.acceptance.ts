import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { expect, type Page } from '@playwright/test';
import {
  AttachmentActor,
  AttachmentRows,
  type AttachmentFixture,
  loadAttachmentFixture,
} from './attachments.helpers';

export const UPLOAD_ATTACHMENT = `mutation HarnessUpload($uploadData: RoomMessageAttachmentUploadInput!, $file: Upload!) {
  uploadRoomMessageAttachment(uploadData: $uploadData, file: $file) {
    externalReference displayName
  }
}`;
export type UploadResult = {
  externalReference: string;
  displayName: string;
};
export type MediaFixture = {
  path: string;
  mimeType: string;
  extension: string;
};
export type AcceptanceFixture = AttachmentFixture & {
  elementCDPURL: string;
  elementBaseURL: string;
  conversationButtonNames: [string, string];
  media: {
    image: MediaFixture;
    video: MediaFixture;
    file: MediaFixture;
    originalWebp: MediaFixture;
  };
};

export async function loadAcceptanceFixture(): Promise<AcceptanceFixture> {
  const fixture = (await loadAttachmentFixture()) as AcceptanceFixture;
  if (
    fixture.conversationButtonNames?.length !== 2 ||
    fixture.conversationButtonNames.some(name => !name)
  )
    throw new Error(
      'Acceptance fixture requires both viewer conversation names'
    );
  for (const kind of ['image', 'video', 'file', 'originalWebp'] as const) {
    const media = fixture.media?.[kind];
    if (
      !media?.path?.startsWith('/') ||
      !media.mimeType ||
      !/^[a-z0-9]+$/.test(media.extension)
    )
      throw new Error(
        'Acceptance requires absolute image/video/file fixture paths and MIME types'
      );
    const source = await stat(media.path);
    if (
      !source.isFile() ||
      source.size < 100 ||
      source.size > fixture.maxFileBytes
    )
      throw new Error(
        'Media fixture is empty or exceeds the actual stack limit'
      );
  }
  return fixture;
}

/** Reads actual stored identity; the upload result carries no encoded metadata. */
export async function uploadIdentity(
  rows: AttachmentRows,
  upload: UploadResult,
  fixture: AttachmentFixture
): Promise<{
  fileID: string;
  mediaID: string;
  homeserver: string;
  size: number;
}> {
  if (!upload.externalReference || !upload.displayName)
    throw new Error('Upload did not return a completed Matrix reference');
  const found = await rows.files({ mediaIDs: [upload.externalReference] });
  if (found.length !== 1 || !found[0].externalReference)
    throw new Error('Completed upload has no exact stored Matrix reference');
  return {
    fileID: found[0].id,
    mediaID: found[0].externalReference,
    homeserver: fixture.users[0].matrixUserID.split(':').slice(1).join(':'),
    size: Number(found[0].size),
  };
}

export async function openFixtureConversation(
  page: Page,
  fixture: AcceptanceFixture,
  viewer: 0 | 1
) {
  await page.goto(`${fixture.baseURL}/home`);
  await page.getByRole('button', { name: 'Open chat', exact: true }).click();
  const participant = fixture.conversationButtonNames[viewer].replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
  await page
    .getByRole('dialog', { name: 'Chat', exact: true })
    .getByRole('list')
    .getByRole('button', {
      name: new RegExp(`^${participant}(?:\\s|$)`),
    })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Add a comment...', exact: true })
  ).toBeVisible();
}

export function attachmentDownload(page: Page, name: string) {
  // The attachment list excludes profile avatars and unrelated timeline images.
  return page
    .getByRole('list', { name: 'Attachments', exact: true })
    .getByRole('link', { name: `Download ${name}`, exact: true });
}

export async function attachmentURL(page: Page, name: string): Promise<string> {
  const download = attachmentDownload(page, name);
  await expect(download).toHaveCount(1);
  const url = await download.getAttribute('href');
  if (!url || new URL(url, page.url()).origin !== new URL(page.url()).origin)
    throw new Error(
      'Attachment did not resolve to the same-origin authorized reference route'
    );
  const parsed = new URL(url, page.url());
  if (
    parsed.pathname !== '/api/private/rest/storage/file/by-reference' ||
    !parsed.searchParams.get('bucketId') ||
    !parsed.searchParams.get('ref')
  )
    throw new Error(
      'Matrix attachment must use the direct bucket/reference URL'
    );
  return parsed.href;
}

export async function matrixEventFor(
  actor: AttachmentActor,
  roomID: string,
  name: string
) {
  let events: { event_id: string; content: Record<string, unknown> }[] = [];
  await expect
    .poll(
      async () => {
        events = (await actor.matrixMessages(roomID)).filter(
          event =>
            event.content.filename === name || event.content.body === name
        );
        return events.length;
      },
      {
        timeout: 30_000,
        message: 'Exactly one real Matrix media event should be published',
      }
    )
    .toBe(1);
  return events[0];
}

export async function imageMetadata(
  file: string
): Promise<Record<string, unknown>> {
  try {
    const { stdout } = await promisify(execFile)(
      'exiftool',
      ['-j', '-EXIF:all', '-GPS:all', '-IPTC:all', '-XMP:all', file],
      { maxBuffer: 256 * 1024, timeout: 10_000 }
    );
    const [metadata] = JSON.parse(stdout);
    delete metadata.SourceFile;
    return metadata;
  } catch {
    throw new Error(
      'Original-image metadata evidence requires working exiftool and a readable fixture'
    );
  }
}

export const byteHash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

export async function downloadThroughUI(
  page: Page,
  name: string,
  destination: string
) {
  const link = attachmentDownload(page, name);
  await link.focus();
  const downloaded = page.waitForEvent('download');
  await link.press('Enter');
  const item = await downloaded;
  expect(item.suggestedFilename()).toBe(name);
  await item.saveAs(destination);
  return readFile(destination);
}

export function referenceURL(
  fixture: AttachmentFixture,
  bucketID: string,
  mediaID: string
): string {
  const url = new URL(
    '/api/private/rest/storage/file/by-reference',
    fixture.baseURL
  );
  url.searchParams.set('bucketId', bucketID);
  url.searchParams.set('ref', mediaID);
  return url.href;
}
