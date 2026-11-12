// spec: client-web/src/functional-e2e/file-uploads/file-uploads-test-plan.md
// W2 journey 11 (docs/qa/server-rebuild/plan.md § W2 row 11), audit row N3:
// MG-1 the space admin adds an image to a media-gallery post, and storage
// serves exactly that image to members only; MG-2 a file that is not an image
// is refused and the gallery stays as it was.

import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  CalloutFramingType,
  createPngFixture,
  MimeType,
  readStoredDocument,
  storedDocumentIdOf,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  calloutFiles,
  expectDownloadRefused,
  expectServesImage,
  openCalloutDialog,
  pickFile,
  seedCallout,
  seedUploadSpace,
  expectUploadAccepted,
  uploadAnswered,
  type UploadPayload,
} from './file-uploads.helpers';

/**
 * One private Space, two media-gallery posts, each case uses its own:
 *   MG-1 "J11 gallery <uid>"   gets one PNG
 *   MG-2 "J11 refused <uid>"   is offered a text file, then a PNG (control)
 * actor `space.admin` (Space admin) · outsider `non.space` (read-only use)
 */
const uid = UniqueIDGenerator.getID();
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
const galleries = {
  accepted: { title: `J11 gallery ${uid}`, id: '', url: '' },
  refused: { title: `J11 refused ${uid}`, id: '', url: '' },
};

/**
 * A striped PNG (lib fixture) whose pixel size is derived from the run id, so
 * the image served back can be told apart from another run's. The bytes
 * themselves are canonicalised by file-service, so the size is the identity
 * that survives.
 */
const runSeed = [...uid].reduce((sum, c) => sum + c.charCodeAt(0), 0);
const pngPayload = (name: string, variant: 'a' | 'b'): UploadPayload => ({
  name,
  mimeType: 'image/png',
  buffer: fs.readFileSync(
    createPngFixture({
      width: 40 + (runSeed % 97),
      height: 30 + (runSeed % 53),
      variant,
    })
  ),
  stored: MimeType.Png,
});

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await seedUploadSpace('gallery', uid);
  const set = scenario.space.collaboration.calloutsSetId;
  for (const gallery of Object.values(galleries)) {
    Object.assign(
      gallery,
      await seedCallout(set, gallery.title, CalloutFramingType.MediaGallery)
    );
  }
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await admin?.close();
  } finally {
    await teardownScenario(scenario);
    scenario = undefined;
  }
});

test('MG-1 — the space admin adds an image to a media gallery; storage serves exactly that image to members only', async () => {
  const page = admin!.page;
  const gallery = galleries.accepted;
  const payload = pngPayload(`j11-photo-${uid}.png`, 'a');
  const altText = `j11-photo-${uid}`;

  const before = await calloutFiles(gallery.id);
  expect(before.mediaGallery?.id, 'the post carries a media gallery').toEqual(
    expect.any(String)
  );
  expect(before.mediaGallery?.visuals, 'the gallery starts empty').toEqual([]);

  const dialog = await openCalloutDialog(page, gallery.url, gallery.title);
  const added = expectMutationAnswered(page, 'addVisualToMediaGallery');
  const uploaded = uploadAnswered(page);
  await pickFile(
    page,
    dialog.getByRole('button', { name: /Add images/ }),
    payload
  );
  await added();
  await expectUploadAccepted(uploaded);
  // The gallery shows the new image, named by the file's base name.
  await expect(
    dialog.getByRole('img', { name: altText, exact: true }).first()
  ).toBeVisible();

  // Read-back 1: one visual on the gallery, and its stored document.
  const after = await calloutFiles(gallery.id);
  const visuals = after.mediaGallery?.visuals ?? [];
  expect(
    visuals.map(v => v.alternativeText),
    'exactly the one image, with the alt text the client sent'
  ).toEqual([altText]);
  const imageUrl = visuals[0].uri;
  const stored = must(
    await readStoredDocument(storedDocumentIdOf(imageUrl)),
    'readStoredDocument(image)'
  ).lookup.document;
  expect(
    stored && {
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
      temporaryLocation: stored.temporaryLocation,
    },
    'the stored document behind the image, in its end location'
  ).toEqual({
    url: imageUrl,
    mimeType: payload.stored,
    size: expect.any(Number),
    temporaryLocation: false,
  });

  // Read-back 2: the image URL serves the uploaded image to a member.
  await expectServesImage(
    imageUrl,
    payload,
    stored!.size,
    TestUser.SPACE_ADMIN
  );
  // Read-back 3: a signed-in user outside the private Space is refused it.
  await expectDownloadRefused(imageUrl, payload, TestUser.NON_SPACE_MEMBER);
});

test('MG-2 — a file that is not an image is refused, and the gallery stays as it was', async () => {
  const page = admin!.page;
  const gallery = galleries.refused;
  const notAnImage: UploadPayload = {
    name: `j11-notes-${uid}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from(`J11 MG-2 ${uid}`),
  };
  const control = pngPayload(`j11-control-${uid}.png`, 'b');

  const dialog = await openCalloutDialog(page, gallery.url, gallery.title);
  const addImages = dialog.getByRole('button', { name: /Add images/ });
  await pickFile(page, addImages, notAnImage);
  // The client refuses before anything is sent: the warning names the reason.
  await expect(
    page.getByText('Unsupported file type', { exact: true })
  ).toBeVisible();
  const afterRefusal = await calloutFiles(gallery.id);
  expect(afterRefusal.mediaGallery?.visuals, 'no visual was added').toEqual([]);

  // Positive control on the same gallery: an image goes through.
  const uploaded = uploadAnswered(page);
  await pickFile(page, addImages, control);
  await expectUploadAccepted(uploaded);
  const afterControl = await calloutFiles(gallery.id);
  expect(
    afterControl.mediaGallery?.visuals.map(v => v.alternativeText)
  ).toEqual([`j11-control-${uid}`]);
});
