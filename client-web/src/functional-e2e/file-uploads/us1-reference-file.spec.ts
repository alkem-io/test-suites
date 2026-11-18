// spec: client-web/src/functional-e2e/file-uploads/file-uploads-test-plan.md
// W2 journey 11 (docs/qa/server-rebuild/plan.md § W2 row 11), audit row N2:
// RF-1 the space admin attaches a file to a post as a reference, and storage
// serves exactly that file to members only; RF-2 a file type the bucket does
// not accept is refused and nothing is stored.

import { test, expect, type Page } from '@playwright/test';
import {
  CalloutFramingType,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  calloutFiles,
  executablePayload,
  expectDownloadRefused,
  expectServesExactly,
  openCalloutDialog,
  pdfPayload,
  pickFile,
  seedCallout,
  seedUploadSpace,
  expectUploadAccepted,
  uploadAnswered,
  type UploadPayload,
} from './file-uploads.helpers';

/**
 * One private Space, two posts (framing NONE), each case edits its own post:
 *   RF-1 "J11 reference <uid>"   gets a PDF reference
 *   RF-2 "J11 rejected <uid>"    is offered an executable
 * actor `space.admin` (Space admin) · member `space.member` (downloads only)
 * · outsider `non.space` (read-only use)
 */
const uid = UniqueIDGenerator.getID();
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
const posts = {
  reference: { title: `J11 reference ${uid}`, id: '', url: '' },
  rejected: { title: `J11 rejected ${uid}`, id: '', url: '' },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  scenario = await seedUploadSpace('ref', uid);
  const set = scenario.space.collaboration.calloutsSetId;
  for (const post of Object.values(posts)) {
    Object.assign(
      post,
      await seedCallout(set, post.title, CalloutFramingType.None)
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

/** Opens the post's Edit Post dialog and its first, empty reference row. */
const openNewReferenceRow = async (
  page: Page,
  post: { url: string; title: string }
) => {
  const callout = await openCalloutDialog(page, post.url, post.title);
  await callout.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  await expect(
    dialog.getByRole('textbox', { name: 'Title', exact: true })
  ).toHaveValue(post.title);
  await dialog.getByRole('button', { name: 'More options' }).click();
  await expect(
    dialog.getByText('No references yet.', { exact: true })
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Add another reference', exact: true })
    .click();
  return dialog;
};

test('RF-1 — the space admin attaches a PDF to a post as a reference; storage serves exactly that file to members only', async () => {
  const page = admin!.page;
  const post = posts.reference;
  const payload: UploadPayload = pdfPayload(
    `j11-brief-${uid}.pdf`,
    `J11 RF-1 ${uid}`
  );
  const referenceName = `j11-brief-${uid}`;

  const before = await calloutFiles(post.id);
  expect(
    before.profile.references,
    'the post starts without references'
  ).toEqual([]);
  expect(
    before.profile.storageBucket?.documents,
    'the post bucket starts empty'
  ).toEqual([]);

  const dialog = await openNewReferenceRow(page, post);
  const uploaded = uploadAnswered(page);
  await pickFile(
    page,
    dialog.getByRole('button', { name: 'Attach file', exact: true }),
    payload
  );
  await expectUploadAccepted(uploaded);
  await expect(
    page.getByText('File uploaded successfully', { exact: true })
  ).toBeVisible();
  // The row is filled from the upload: the URL the server returned, the name from the file.
  const urlField = dialog.getByRole('textbox', { name: 'URL', exact: true });
  await expect(urlField).toHaveValue(
    /\/api\/private\/rest\/storage\/document\/[0-9a-f-]{36}$/
  );
  await expect(
    dialog.getByPlaceholder('Reference title', { exact: true })
  ).toHaveValue(referenceName);
  const servedUrl = await urlField.inputValue();

  const saved = expectMutationAnswered(page, 'updateCallout');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await saved();
  await expect(dialog).toBeHidden();

  // Read-back 1: the reference and the one stored document behind it.
  const after = await calloutFiles(post.id);
  expect(
    (after.profile.references ?? []).map(r => ({ name: r.name, uri: r.uri })),
    'the stored reference'
  ).toEqual([{ name: referenceName, uri: servedUrl }]);
  const documents = after.profile.storageBucket?.documents ?? [];
  expect(
    documents.map(d => ({
      url: d.url,
      displayName: d.displayName,
      mimeType: d.mimeType,
      size: d.size,
      temporaryLocation: d.temporaryLocation,
    })),
    'exactly one document, in its end location, behind the reference'
  ).toEqual([
    {
      url: servedUrl,
      displayName: payload.name,
      mimeType: payload.stored,
      size: payload.buffer.length,
      temporaryLocation: false,
    },
  ]);

  // Read-back 2: the URL serves the uploaded bytes to the uploader and to a
  // plain member who did not upload it (the uploader alone is served by the
  // document's creator rule, whatever the Space grants).
  await expectServesExactly(servedUrl, payload, TestUser.SPACE_ADMIN);
  await expectServesExactly(servedUrl, payload, TestUser.SPACE_MEMBER);
  // Read-back 3: a signed-in user outside the private Space is refused it.
  await expectDownloadRefused(servedUrl, payload, TestUser.NON_SPACE_MEMBER);

  // The member's fresh page shows the reference, pointing at the stored file.
  await page.reload();
  const callout = await openCalloutDialog(page, post.url, post.title);
  await expect(
    callout.getByRole('link', { name: referenceName })
  ).toHaveAttribute('href', servedUrl);
});

test('RF-2 — a file type the bucket does not accept is refused, and nothing is stored', async () => {
  const page = admin!.page;
  const post = posts.rejected;
  const payload = executablePayload(`j11-tool-${uid}.exe`, `J11 RF-2 ${uid}`);
  const control = pdfPayload(
    `j11-control-${uid}.pdf`,
    `J11 RF-2 control ${uid}`
  );

  const before = await calloutFiles(post.id);
  expect(
    before.profile.storageBucket?.allowedMimeTypes,
    'the bucket policy the refusal comes from'
  ).not.toContain(payload.mimeType);
  expect(before.profile.storageBucket?.documents).toEqual([]);

  const dialog = await openNewReferenceRow(page, post);
  const attach = dialog.getByRole('button', {
    name: 'Attach file',
    exact: true,
  });
  const urlField = dialog.getByRole('textbox', { name: 'URL', exact: true });

  const refusedUpload = uploadAnswered(page);
  await pickFile(page, attach, payload);
  const refusal = (await (await refusedUpload).json()) as {
    errors?: unknown[];
    data?: unknown;
  };
  expect(
    refusal.errors?.length ?? 0,
    'the server refuses the upload'
  ).toBeGreaterThan(0);
  await expect(
    page.getByText('Error occurred while uploading the file', { exact: true })
  ).toBeVisible();
  await expect(urlField).toHaveValue('');
  // The refusal is the product's answer: nothing reached the bucket.
  expect(
    (await calloutFiles(post.id)).profile.storageBucket?.documents
  ).toEqual([]);

  // Positive control on the same row: an accepted type uploads and fills the URL.
  const acceptedUpload = uploadAnswered(page);
  await pickFile(page, attach, control);
  await expectUploadAccepted(acceptedUpload);
  await expect(urlField).toHaveValue(
    /\/api\/private\/rest\/storage\/document\//
  );

  // Leave without saving: the dialog asks first, because the row is an unsaved change.
  await page.keyboard.press('Escape');
  const discard = page.getByRole('alertdialog', {
    name: 'Discard your changes?',
  });
  await expect(discard).toBeVisible();
  await discard
    .getByRole('button', { name: 'Yes, close', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const stored =
    (await calloutFiles(post.id)).profile.storageBucket?.documents ?? [];
  expect(
    stored.map(d => d.displayName),
    'only the accepted control file was stored'
  ).toEqual([control.name]);
});
