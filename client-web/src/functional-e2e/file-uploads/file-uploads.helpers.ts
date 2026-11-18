import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  CommunityMembershipPolicy,
  createCalloutWithData,
  downloadStoredFile,
  MimeType,
  readCalloutStoredFiles,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  type GraphqlActor,
  type StoredFileResponse,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';

/**
 * Shared steps for W2 journey 11 (docs/qa/server-rebuild/plan.md § W2 row 11):
 * a file uploaded through the UI is read back from storage. The oracle is
 * always the same three-part read-back:
 *   1. the server holds a document for it (lib `readCalloutStoredFiles` /
 *      `readConversationStoredFiles`) with the expected MIME type and size;
 *   2. the URL the server hands out serves exactly the uploaded bytes with
 *      that MIME type (lib `downloadStoredFile`);
 *   3. somebody without access to the container is refused that URL.
 */

/**
 * A file the walk uploads: run-unique bytes, so a stale or deduplicated file
 * cannot pass. `mimeType` is what the browser declares and what a download
 * must be served as; `stored` is the server's record of it (the `MimeType`
 * enum on a Document), when the file is meant to be accepted.
 */
export type UploadPayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
  stored?: MimeType;
};

/**
 * A minimal, well-formed one-page PDF whose text carries `marker`. The xref
 * offsets are computed, so a PDF reader opens it; the marker makes the bytes
 * unique to the run.
 */
export const pdfPayload = (name: string, marker: string): UploadPayload => {
  const stream = `BT /F1 12 Tf 20 100 Td (${marker}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(body, 'latin1'),
    stored: MimeType.Pdf,
  };
};

/**
 * A file type no Alkemio bucket accepts: a Windows executable header with a
 * run-unique tail. Its declared type is the one browsers give `.exe`.
 */
export const executablePayload = (
  name: string,
  marker: string
): UploadPayload => ({
  name,
  mimeType: 'application/x-msdownload',
  buffer: Buffer.concat([
    Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1'),
    Buffer.from(marker),
  ]),
});

/**
 * A PRIVATE, invitation-only L0 Space with `space.admin` as its admin and
 * `space.member` as a plain member, nothing seeded in it. The uploader is
 * served its own document by the document's creator rule (server
 * `document.service.authorization.ts`), so only a member who did not upload
 * proves the Space's member access reaches the file.
 */
export const seedUploadSpace = (
  area: string,
  uid: string
): Promise<OrganizationWithSpaceModel> =>
  TestScenarioFactory.createBaseScenario({
    name: `w2-j11-${area}-${uid}`,
    space: {
      collaboration: {},
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Invitations },
      },
    },
  });

/** Creates a published callout with the given framing; returns its id and URL. */
export const seedCallout = async (
  calloutsSetID: string,
  displayName: string,
  type: CalloutFramingType
): Promise<{ id: string; url: string }> => {
  const created = must(
    await createCalloutWithData({
      calloutsSetID,
      framing: { profile: { displayName, description: 'W2 journey 11' }, type },
      settings: {
        visibility: CalloutVisibility.Published,
        contribution: {
          enabled: false,
          allowedTypes: [CalloutContributionType.Post],
          canAddContributions: CalloutAllowedActors.Members,
          commentsEnabled: false,
        },
        framing: { commentsEnabled: false },
      },
    }),
    `createCalloutWithData(${displayName})`
  ).createCalloutOnCalloutsSet;
  return { id: created.id, url: created.framing.profile.url };
};

export type CalloutStoredFiles = NonNullable<
  NonNullable<
    NonNullable<
      Awaited<ReturnType<typeof readCalloutStoredFiles>>['data']
    >['lookup']['callout']
  >['framing']
>;

/** The callout's framing with its references, bucket documents and gallery, as `actor` sees it. */
export const calloutFiles = async (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<CalloutStoredFiles> => {
  const framing = must(
    await readCalloutStoredFiles(calloutId, actor),
    `readCalloutStoredFiles(${calloutId})`
  ).lookup.callout?.framing;
  if (!framing)
    throw new Error(`callout ${calloutId} has no framing for this actor`);
  return framing;
};

/**
 * The positive half of every storage read-back: the URL serves the uploaded
 * bytes, unchanged, with the uploaded MIME type.
 */
export const expectServesExactly = async (
  url: string,
  payload: UploadPayload,
  actor: GraphqlActor
): Promise<void> => {
  const served: StoredFileResponse = await downloadStoredFile(url, actor);
  expect(served.status, `download of ${payload.name}`).toBe(200);
  expect(served.contentType, `served MIME type of ${payload.name}`).toBe(
    payload.mimeType
  );
  expect(served.bytes.length, `served size of ${payload.name}`).toBe(
    payload.buffer.length
  );
  expect(
    served.bytes.equals(payload.buffer),
    `served bytes of ${payload.name} equal the upload`
  ).toBe(true);
};

/**
 * The negative half: `actor` (no access to the container) is refused the URL
 * with the authorization denial, and is not handed the bytes in a
 * "successful" error page either. file-service answers 403 "insufficient
 * privileges" on both the document route and the by-reference route
 * (`public_handler.go › serveAuthorizedDocument`). A 401 (no actor identity),
 * 404 (no such document) or 400 (bad by-reference query) is a refusal for the
 * wrong reason, so the status is exact.
 */
export const expectDownloadRefused = async (
  url: string,
  payload: UploadPayload,
  actor: GraphqlActor
): Promise<void> => {
  const refused = await downloadStoredFile(url, actor);
  expect(
    refused.status,
    `download of ${payload.name} by an outsider is the authorization denial`
  ).toBe(403);
  expect(
    refused.bytes.includes(payload.buffer),
    'the refusal carries none of the file'
  ).toBe(false);
};

/** Opens the callout's own page (the detail dialog) as the signed-in persona. */
export const openCalloutDialog = async (
  page: Page,
  url: string,
  title: string
): Promise<Locator> => {
  await page.goto(url);
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { level: 1, name: title, exact: true }),
  });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
};

/**
 * Picks `payload` through the file chooser that `trigger` opens. The input
 * behind every upload affordance here is hidden, so the chooser is the
 * user-facing path; the `accept` filter is the browser's, not the product's,
 * and a chooser ignores it — the product's own checks still run.
 */
export const pickFile = async (
  page: Page,
  trigger: Locator,
  payload: UploadPayload
): Promise<void> => {
  const chooser = page.waitForEvent('filechooser');
  await trigger.click();
  await (await chooser).setFiles(payload);
};

/**
 * Starts waiting for the browser's next file upload and returns its answer.
 * Create it BEFORE the pick. A GraphQL file upload is the only multipart
 * request these pages send (the Upload scalar travels by the multipart
 * request spec, whose body a text match on the operation cannot see), so the
 * content type identifies it.
 */
export const uploadAnswered = (page: Page): Promise<Response> =>
  page.waitForResponse(
    response =>
      response.url().includes('graphql') &&
      (response.request().headers()['content-type'] ?? '').startsWith(
        'multipart/form-data'
      ),
    { timeout: 60_000 }
  );

/** The upload's answer carried no GraphQL errors (an HTTP 200 alone does not say so). */
export const expectUploadAccepted = async (
  answer: Promise<Response>
): Promise<void> => {
  const response = await answer;
  expect(response.ok(), 'upload HTTP status').toBe(true);
  const body = (await response.json()) as { errors?: unknown[] };
  expect(body.errors, 'upload GraphQL errors').toBeUndefined();
};

/** Width and height from a PNG's IHDR chunk; throws on anything that is not a PNG. */
export const pngDimensions = (
  bytes: Buffer
): { width: number; height: number } => {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(signature) ||
    bytes.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error('not a PNG');
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

/**
 * The positive read-back for an IMAGE. file-service canonicalises image bytes
 * on upload (EXIF rotation, metadata strip: server visual.service), so the
 * served bytes are not the uploaded ones by design. What must survive: the
 * URL serves a PNG with the uploaded pixel dimensions, as image/png, and
 * exactly as many bytes as the stored document records.
 */
export const expectServesImage = async (
  url: string,
  payload: UploadPayload,
  storedSize: number,
  actor: GraphqlActor
): Promise<void> => {
  const served = await downloadStoredFile(url, actor);
  expect(served.status, `download of ${payload.name}`).toBe(200);
  expect(served.contentType, `served MIME type of ${payload.name}`).toBe(
    payload.mimeType
  );
  expect(
    served.bytes.length,
    'served size equals the stored document size'
  ).toBe(storedSize);
  expect(pngDimensions(served.bytes), 'served pixel dimensions').toEqual(
    pngDimensions(payload.buffer)
  );
};
