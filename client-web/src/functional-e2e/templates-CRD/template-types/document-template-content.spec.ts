// story: client-web#10423 "Documents in post templates: add a document with
// content" (server#6666 + client-web#10429, workspace#085-document-post-templates).
//
// What this file adds to the feature's own evidence:
//   - DT-1  the authoring walk (spec §5.2 US1-S1) persisted: a real multipart
//           createTemplate from the browser, with the bytes checked afterwards.
//   - DT-2/3 the APPLY flow in the browser — spec residual R-12 / human check 2:
//           "Find Template → Use template → Post" as the admin and as a member,
//           then the new posts' documents are distinct copies whose bytes equal
//           the fixture. The API suite (test-suites#674) hands the server the
//           source id directly and never exercises this client chain.
//   - DT-4  the toolbox route — spec residual R-11 / human check 4: a template
//           in an INNOVATION PACK applied from a space on a different account,
//           by an actor who is not a member of the pack's owner. API-level;
//           it is the issue's headline use case and no AC covers it.
//
// Fixtures: `doc.pdf` (the only importable fixture the spec names) for the
// authoring walk, and a minimal `.docx` under ../fixtures (the accept list is
// .docx/.xlsx/.pptx/.pdf and the issue's example is a Word contract) for the
// seeded template the apply walks copy. Bytes are compared to sha256 of the
// file on disk, never to another served response.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as nodePath from 'node:path';
import { type Browser, expect, type Locator, type Page } from '@playwright/test';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  createInnovationPack,
  deleteInnovationPack,
  getLicensePlanByName,
  getUserToken,
} from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { adminGql } from '../../contributors-callout/cards-fixture';
import { createPersonaTest, ensurePersonaState } from '../../fixtures/authenticated-session.fixture';
import { fillTemplateForm } from './forms/template-form';
import { sectionAddNewButton } from './section-helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const gqlEndpoint = process.env.ALKEMIO_SERVER || `${baseUrl}/api/private/non-interactive/graphql`;
const ADMIN = 'admin@alkem.io';
const SPACE_ADMIN = 'space.admin@alkem.io';
const SPACE_MEMBER = 'space.member@alkem.io';
const test = createPersonaTest(SPACE_ADMIN);
const uid = UniqueIDGenerator.getID();

const FIXTURES = {
  pdf: nodePath.resolve(__dirname, '../../../../../server-api/src/functional-api/storage/files-to-upload/doc.pdf'),
  docx: nodePath.resolve(__dirname, '../fixtures/document-template.docx'),
} as const;
const sha256 = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');
const fixtureHash = (p: string): string => sha256(readFileSync(p));

const NAMES = {
  pdfTemplate: `DT pdf template ${uid}`,
  docxTemplate: `DT contract template ${uid}`,
  postByAdmin: `DT post admin ${uid}`,
  postByMember: `DT post member ${uid}`,
  pack: `DT toolbox pack ${uid}`,
  packTemplate: `DT toolbox template ${uid}`,
  packPost: `DT toolbox post ${uid}`,
} as const;

const scenarioConfig: TestScenarioConfig = {
  name: 'doc-template',
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: { collaboration: { allowMembersToCreateCallouts: true } },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER] },
  },
};
let scenario: OrganizationWithSpaceModel | undefined;
let adminToken = '';
let seeded = { templateId: '', documentId: '', previewUrl: '' };
const toolbox = { packId: '', spaceId: '', spaceCalloutsSetId: '', calloutId: '' };

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
type DocFields = { id: string; documentType: string; previewUrl: string | null };

const entitle = async (spaceID: string): Promise<void> => {
  const plan = await getLicensePlanByName('SPACE_FEATURE_OFFICE_DOCUMENTS');
  const licensePlanID = plan[0]?.id;
  if (!licensePlanID) throw new Error('no SPACE_FEATURE_OFFICE_DOCUMENTS licence plan on this platform');
  await adminGql('mutation($p: AssignLicensePlanToSpace!){ assignLicensePlanToSpace(planData: $p) { id } }', {
    p: { spaceID, licensePlanID },
  });
};

/** `createTemplate(file:)` over the GraphQL multipart spec, as the bearer of `token`. */
const createDocumentTemplate = async (
  token: string,
  templatesSetID: string,
  name: string,
  filePath: string,
  mime: string
): Promise<{ id: string; doc: DocFields }> => {
  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query: `mutation($file: Upload, $t: CreateTemplateOnTemplatesSetInput!){ createTemplate(file: $file, templateData: $t) {
        id callout { framing { collaboraDocument { id documentType previewUrl } } } } }`,
      variables: {
        file: null,
        t: {
          templatesSetID,
          type: 'CALLOUT',
          profileData: { displayName: name },
          calloutData: { framing: { profile: { displayName: name }, type: 'COLLABORA_DOCUMENT', collaboraDocument: {} } },
        },
      },
    })
  );
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([readFileSync(filePath)], { type: mime }), nodePath.basename(filePath));
  const res = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'apollo-require-preflight': 'true', 'x-apollo-operation-name': 'true' },
    body: form,
  });
  const body = await res.json();
  if (body.errors || !body.data?.createTemplate) throw new Error(`createTemplate(file): ${JSON.stringify(body.errors ?? body)}`);
  return { id: body.data.createTemplate.id, doc: body.data.createTemplate.callout.framing.collaboraDocument };
};

/** sha256 of the bytes behind a Collabora previewUrl, read through the storage REST endpoint. */
const bytesHash = async (previewUrl: string | null, token: string): Promise<string> => {
  const fileID = previewUrl?.match(/\/api\/private\/wopi\/files\/([^/]+)\/preview$/)?.[1];
  if (!fileID) throw new Error(`not a Collabora preview URL: ${previewUrl}`);
  const res = await fetch(`${baseUrl}/api/private/rest/storage/document/${decodeURIComponent(fileID)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`document fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('document fetch returned no bytes');
  return sha256(buf);
};

const templateDocByName = async (templatesSetID: string, name: string): Promise<DocFields> => {
  const data = await adminGql<{
    lookup: { templatesSet: { templates: { profile: { displayName: string }; callout: { framing: { collaboraDocument: DocFields | null } } | null }[] } };
  }>(
    'query($id: UUID!){ lookup { templatesSet(ID: $id) { templates { profile { displayName } callout { framing { collaboraDocument { id documentType previewUrl } } } } } } }',
    { id: templatesSetID }
  );
  const t = data.lookup.templatesSet.templates.find(x => x.profile.displayName === name);
  if (!t?.callout?.framing.collaboraDocument) throw new Error(`template "${name}" has no document`);
  return t.callout.framing.collaboraDocument;
};

const calloutDocByName = async (calloutsSetID: string, name: string): Promise<DocFields> => {
  const data = await adminGql<{
    lookup: { calloutsSet: { callouts: { framing: { profile: { displayName: string }; collaboraDocument: DocFields | null } }[] } };
  }>(
    'query($id: UUID!){ lookup { calloutsSet(ID: $id) { callouts { framing { profile { displayName } collaboraDocument { id documentType previewUrl } } } } } }',
    { id: calloutsSetID }
  );
  const c = data.lookup.calloutsSet.callouts.find(x => x.framing.profile.displayName === name);
  if (!c?.framing.collaboraDocument) throw new Error(`callout "${name}" has no document`);
  return c.framing.collaboraDocument;
};

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
const viewAs = async (browser: Browser, email: string, walk: (page: Page) => Promise<void>): Promise<void> => {
  const context = await browser.newContext({ storageState: await ensurePersonaState(browser, email), locale: 'en-US' });
  try {
    await walk(await context.newPage());
  } finally {
    await context.close();
  }
};

/** Selects an "Add to post" framing chip, through the "More to add" menu when it is not in the row. */
const selectFraming = async (page: Page, dialog: Locator, name: string): Promise<void> => {
  const group = dialog.getByRole('radiogroup', { name: 'Add to post' });
  await expect(group).toBeVisible();
  const radio = group.getByRole('radio', { name, exact: true });
  if ((await radio.count()) === 0) {
    await dialog.getByRole('button', { name: 'More to add' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  } else {
    await radio.click();
  }
  await expect(radio).toHaveAttribute('aria-checked', 'true');
};

/** "Add Post" → "Find Template" → "Use template" on `templateName`, returning the Create Post dialog. */
const applyTemplateFromFeed = async (page: Page, templateName: string): Promise<Locator> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
  await page.getByRole('button', { name: 'Add Post' }).first().click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Create Post' }) }).last();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Find Template' }).click();
  const picker = page.getByRole('dialog', { name: 'Use a template' });
  await expect(picker).toBeVisible();
  const item = picker.getByRole('listitem').filter({ hasText: templateName });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Use template', exact: true }).click();
  await expect(picker).not.toBeVisible();
  return dialog;
};

test.describe.serial('Document post templates — content travels into each post (client-web#10423)', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await entitle(scenario.space.id);
    adminToken = await getUserToken(ADMIN);
    const t = await createDocumentTemplate(
      adminToken,
      scenario.space.templateSetId,
      NAMES.docxTemplate,
      FIXTURES.docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    seeded = { templateId: t.id, documentId: t.doc.id, previewUrl: t.doc.previewUrl ?? '' };
    // Preconditions the walks rest on: the seeded template carries the .docx bytes.
    expect(t.doc.documentType).toBe('WORDPROCESSING');
    expect(await bytesHash(t.doc.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.docx));
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    const failures: string[] = [];
    const step = async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (e) {
        failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    if (toolbox.spaceId)
      await step('toolbox space', () =>
        adminGql('mutation($d: DeleteSpaceInput!){ deleteSpace(deleteData: $d) { id } }', { d: { ID: toolbox.spaceId } })
      );
    if (toolbox.packId) await step('pack', async () => deleteInnovationPack(toolbox.packId));
    if (scenario) await step('scenario', () => TestScenarioFactory.cleanUpBaseScenario(scenario!));
    if (failures.length) throw new Error(`teardown left entities behind:\n${failures.join('\n')}`);
  });

  test('DT-1 — US1-S1: a document template is created in the browser from an uploaded doc.pdf; the saved template carries those bytes', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.goto(`${baseUrl}/${scenario!.space.nameId}/settings/templates`);
    await page.getByRole('button', { name: /^Collaboration tools/ }).waitFor({ state: 'visible', timeout: 30_000 });
    const addNew = sectionAddNewButton(page, /^Collaboration tools/);
    const createNew = page.getByRole('menuitem', { name: 'Create new' });
    const dialog = page.getByRole('dialog', { name: 'Create collaboration-tool template' });
    await expect(async () => {
      if (!(await createNew.isVisible().catch(() => false))) await addNew.click({ timeout: 2000 });
      await createNew.click({ timeout: 2000 });
      await expect(dialog).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });

    await fillTemplateForm(dialog, {
      displayName: NAMES.pdfTemplate,
      description: 'Contract template for every initiative (QA, client-web#10423).',
      tags: ['toolbox'],
    });
    await dialog.getByRole('textbox', { name: 'Title' }).fill(`${NAMES.pdfTemplate} post`);
    await selectFraming(page, dialog, 'Document');

    // The upload zone: a real file goes in, the staged name shows, with a remove control.
    await dialog.locator('input[type="file"]').setInputFiles(FIXTURES.pdf);
    await expect(dialog.getByText('doc.pdf', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Remove file', exact: true })).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0);

    const save = dialog.getByRole('button', { name: 'Save', exact: true });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(NAMES.pdfTemplate, { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // AC1 through the browser's own multipart: type derived from the file, bytes equal the fixture.
    const doc = await templateDocByName(scenario!.space.templateSetId, NAMES.pdfTemplate);
    expect(doc.documentType).toBe('PDF');
    expect(await bytesHash(doc.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.pdf));
  });

  test('DT-2 — R-12 / human check 2: the admin creates a post from the .docx template through Find Template; the post gets its own copy with the template\'s bytes', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const dialog = await applyTemplateFromFeed(page, NAMES.docxTemplate);
    // The template's callout title is prefilled and the Document framing is the one checked.
    await expect(dialog.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(NAMES.docxTemplate);
    await expect(dialog.getByRole('radio', { name: 'Document', exact: true })).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill(NAMES.postByAdmin);
    await dialog.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });

    const feed = page.getByRole('region', { name: 'Space content feed' });
    const heading = feed.getByRole('heading', { name: NAMES.postByAdmin, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    // A word-processing document post offers its editor.
    await expect(heading.locator('xpath=ancestor::*[2]').getByRole('button', { name: 'Open Document' }).first()).toBeVisible({
      timeout: 15_000,
    });

    const doc = await calloutDocByName(scenario!.space.collaboration.calloutsSetId, NAMES.postByAdmin);
    expect(doc.id).not.toBe(seeded.documentId);
    expect(doc.documentType).toBe('WORDPROCESSING');
    expect(await bytesHash(doc.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.docx));
    // The template itself is untouched by the apply.
    expect(await bytesHash(seeded.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.docx));
  });

  test('DT-3 — AC2 in the browser: a plain member applies the same template; three distinct documents, all the fixture\'s bytes', async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    await viewAs(browser, SPACE_MEMBER, async page => {
      const dialog = await applyTemplateFromFeed(page, NAMES.docxTemplate);
      await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill(NAMES.postByMember);
      await dialog.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(dialog).not.toBeVisible({ timeout: 30_000 });
      const heading = page.getByRole('region', { name: 'Space content feed' }).getByRole('heading', { name: NAMES.postByMember, exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    });
    const byAdmin = await calloutDocByName(scenario!.space.collaboration.calloutsSetId, NAMES.postByAdmin);
    const byMember = await calloutDocByName(scenario!.space.collaboration.calloutsSetId, NAMES.postByMember);
    expect(new Set([seeded.documentId, byAdmin.id, byMember.id]).size).toBe(3);
    expect(await bytesHash(byMember.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.docx));
  });

  test('DT-4 — R-11 / human check 4, the toolbox route: a template in an innovation pack is applied from a space on another account by a non-member of the pack\'s owner', async () => {
    test.setTimeout(180_000);
    const orgAccountId = scenario!.organization.accountId;
    const pack = await createInnovationPack(orgAccountId, NAMES.pack, `dtpack${uid}`.toLowerCase().slice(0, 24));
    if (pack.error || !pack.data?.createInnovationPack?.id) throw new Error(`create pack: ${JSON.stringify(pack.error)}`);
    toolbox.packId = pack.data.createInnovationPack.id;
    const packSet = (
      await adminGql<{ lookup: { innovationPack: { templatesSet: { id: string } } } }>(
        'query($id: UUID!){ lookup { innovationPack(ID: $id) { templatesSet { id } } } }',
        { id: toolbox.packId }
      )
    ).lookup.innovationPack.templatesSet.id;
    const packTemplate = await createDocumentTemplate(
      adminToken,
      packSet,
      NAMES.packTemplate,
      FIXTURES.docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    // A space on the SPACE_ADMIN user's own account: a different account, and
    // that user holds no role in the pack's organisation.
    const foreignAccountId = TestUserManager.users.spaceAdmin.accountId;
    expect(foreignAccountId).not.toBe(orgAccountId);
    // Select only the id: the new space's policies land a beat after the create,
    // and reading `collaboration` back inside the same mutation is refused.
    const created = await graphqlRequestAuth(
      {
        query: 'mutation($d: CreateSpaceOnAccountInput!){ createSpace(spaceData: $d) { id } }',
        variables: {
          d: {
            accountID: foreignAccountId,
            nameID: `dttool${uid}`.toLowerCase().slice(0, 24),
            about: { profileData: { displayName: `DT toolbox space ${uid}` } },
            collaborationData: { calloutsSetData: {}, addTutorialCallouts: false },
          },
        },
      },
      TestUser.SPACE_ADMIN
    );
    const space = created.body?.data?.createSpace;
    if (!space) throw new Error(`create toolbox space: ${JSON.stringify(created.body?.errors)}`);
    toolbox.spaceId = space.id;
    toolbox.spaceCalloutsSetId = (
      await adminGql<{ lookup: { space: { collaboration: { calloutsSet: { id: string } } } } }>(
        'query($id: UUID!){ lookup { space(ID: $id) { collaboration { calloutsSet { id } } } } }',
        { id: toolbox.spaceId }
      )
    ).lookup.space.collaboration.calloutsSet.id;
    await entitle(toolbox.spaceId);

    // Apply the PACK template there as that user (the client sends exactly this on "Use template → Post").
    const applied = await graphqlRequestAuth(
      {
        query:
          'mutation($c: CreateCalloutOnCalloutsSetInput!){ createCalloutOnCalloutsSet(calloutData: $c) { id framing { collaboraDocument { id documentType previewUrl } } } }',
        variables: {
          c: {
            calloutsSetID: toolbox.spaceCalloutsSetId,
            framing: {
              profile: { displayName: NAMES.packPost },
              type: 'COLLABORA_DOCUMENT',
              collaboraDocument: { sourceCollaboraDocumentID: packTemplate.doc.id },
            },
          },
        },
      },
      TestUser.SPACE_ADMIN
    );
    expect(applied.body?.errors, 'the toolbox apply must not be refused').toBeUndefined();
    const doc: DocFields | undefined = applied.body?.data?.createCalloutOnCalloutsSet?.framing?.collaboraDocument;
    expect(doc?.id).toBeTruthy();
    expect(doc!.id).not.toBe(packTemplate.doc.id);
    expect(await bytesHash(doc!.previewUrl, adminToken)).toBe(fixtureHash(FIXTURES.docx));
  });
});
