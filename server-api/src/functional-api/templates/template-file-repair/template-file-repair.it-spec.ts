/**
 * server#6596 / server#6656 — `adminRepairTemplateFiles`: the privilege gate
 * (TF-1) and the dry-run report (TF-2). Plan: ../templates-test-plan.md.
 *
 * Only ever a DRY RUN, and only ever on the one template this file seeds
 * (`templateIDs` is never omitted: that scans the whole shared environment).
 * The real run (copy / re-home) is deliberately out of scope.
 *
 * The caller that may run it is a Platform Operations Admin. `GLOBAL_ADMIN`
 * does not hold that role on develop (it is refused), so the allowed caller is
 * the seeded single-role user from `seedPlatformRoleUsers()`.
 */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  seedPlatformRoleUsers,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  deleteDocument,
  getProfileDocuments,
  uploadFileOnStorageBucket,
} from '@functional-api/storage/upload.params';
import {
  createPostTemplate,
  updatePostTemplate,
} from '../post/post-template.request.params';
import { deleteTemplate, GetTemplateById } from '../template.request.params';
import { adminRepairTemplateFiles } from './template-file-repair.request.params';

const uniqueId = UniqueIDGenerator.getID();
const templateName = `File repair fixture ${uniqueId}`;

let baseScenario: OrganizationWithSpaceModel;
let poaToken: string;
let aboutBucketId: string;
let docId: string;
let templateId: string;
let templateProfileId: string;
let missingId: string;
let seededDescription: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'template-file-repair',
    space: { community: { admins: [TestUser.SPACE_ADMIN] } },
  });

  // First sign-ins of fresh role users can be slow; the call is idempotent.
  const users = await seedPlatformRoleUsers();
  poaToken = users.tokens.PLATFORM_OPERATIONS_ADMIN;

  // A file in the space "about" bucket: readable by everyone (even anonymous),
  // so the owner check yields `ownerCanRead: true` deterministically.
  const bucket = await getProfileDocuments(
    baseScenario.space.about.profile.id,
    TestUser.GLOBAL_ADMIN
  );
  aboutBucketId = bucket.data?.lookup?.profile?.storageBucket?.id ?? '';
  expect(aboutBucketId, 'space about storage bucket').not.toBe('');

  const upload = await uploadFileOnStorageBucket(
    path.join(__dirname, '../../storage/auth/files-to-upload/image.png'),
    aboutBucketId
  );
  docId = upload.data?.uploadFileOnStorageBucket?.id ?? '';
  const docUrl: string = upload.data?.uploadFileOnStorageBucket?.url ?? '';
  expect(docId, `upload response: ${JSON.stringify(upload)}`).not.toBe('');
  expect(docUrl).toContain(docId);

  const created = await createPostTemplate(
    baseScenario.space.templateSetId,
    'Default post template description',
    templateName
  );
  templateId = created.data?.createTemplate?.id ?? '';
  expect(templateId, 'created template id').not.toBe('');

  // A reference to a file no one has: same host and path shape, unknown id.
  missingId = randomUUID();
  const missingUrl = docUrl.replace(docId, missingId);
  // The URLs go ONLY in the profile description (a separate slot from
  // `postDefaultDescription`, which would double the reference count).
  seededDescription = `${templateName} ![foreign](${docUrl}) ![gone](${missingUrl})`;
  await updatePostTemplate(
    templateId,
    templateName,
    seededDescription,
    'plain default'
  );

  // Positive control that the seed really is foreign: the server must have
  // written the description verbatim and not re-homed the file on update.
  const readBack = await GetTemplateById(templateId);
  const profile = readBack.data?.lookup?.template?.profile;
  if (profile?.description !== seededDescription) {
    throw new Error(
      'fixture void: the server re-homed the description on update, so the template holds no foreign reference. ' +
        `expected ${seededDescription} got ${profile?.description}`
    );
  }
  templateProfileId = profile.id;
}, 360_000);

afterAll(async () => {
  // Surfaced, not swallowed: residue poisons the next run.
  if (templateId) await deleteTemplate(templateId);
  if (docId) await deleteDocument(docId);
  if (baseScenario) await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('TF-1 — non-operations callers are refused', () => {
  test.each([
    ['a', 'anonymous', { anonymous: true }],
    [
      'b',
      'registered user with no platform role',
      { user: TestUser.NON_SPACE_MEMBER },
    ],
    ['c', "admin of the template's own space", { user: TestUser.SPACE_ADMIN }],
  ] as const)(
    'TF-1 row %s — %s cannot run the repair',
    async (_row, _label, caller) => {
      const { data, error } = await adminRepairTemplateFiles(
        { dryRun: true, templateIDs: [templateId] },
        caller
      );

      expect(error?.extensions?.code).toBe('FORBIDDEN_POLICY');
      expect(error?.message).toContain(
        "unable to grant 'platform-operations-admin' privilege: adminRepairTemplateFiles"
      );
      expect(data?.adminRepairTemplateFiles ?? null).toBeNull();
    }
  );

  test('TF-1 ctl — Platform Operations Admin is allowed (positive control)', async () => {
    const { data, error } = await adminRepairTemplateFiles(
      { dryRun: true, templateIDs: [templateId] },
      { token: poaToken }
    );

    expect(error).toBeUndefined();
    expect(data?.adminRepairTemplateFiles.dryRun).toBe(true);
    expect(data?.adminRepairTemplateFiles.templatesScanned).toBe(1);
  });
});

describe('TF-2 — dry run reports the documented shape and changes nothing', () => {
  let run1: NonNullable<
    Awaited<ReturnType<typeof adminRepairTemplateFiles>>['data']
  >['adminRepairTemplateFiles'];
  let run2: typeof run1;
  let descriptionAfter: string | undefined;

  beforeAll(async () => {
    const first = await adminRepairTemplateFiles(
      { dryRun: true, templateIDs: [templateId] },
      { token: poaToken }
    );
    expect(first.error, JSON.stringify(first.error)).toBeUndefined();
    run1 = first.data!.adminRepairTemplateFiles;

    // `dryRun` omitted: the input's default (true) must apply.
    const second = await adminRepairTemplateFiles(
      { templateIDs: [templateId] },
      { token: poaToken }
    );
    expect(second.error, JSON.stringify(second.error)).toBeUndefined();
    run2 = second.data!.adminRepairTemplateFiles;

    const after = await GetTemplateById(templateId);
    descriptionAfter = after.data?.lookup?.template?.profile?.description;
  });

  test('TF-2 — counts: one template scanned, one with foreign files, nothing copied', () => {
    expect(run1.dryRun).toBe(true);
    expect(run1.templatesScanned).toBe(1);
    expect(run1.templatesWithForeignFiles).toBe(1);
    expect(run1.copiedReferences).toBe(0);
  });

  test('TF-2 — the foreign reference is reported with its documented fields, not copied', () => {
    expect(
      run1.references.map(r => ({ ...r, fileID: r.fileID.toLowerCase() }))
    ).toEqual([
      {
        templateID: templateId,
        templateName,
        location: 'profileDescription',
        entityID: templateProfileId,
        fileID: docId.toLowerCase(),
        storageBucketID: aboutBucketId,
        ownerCanRead: true,
        copied: false,
      },
    ]);
  });

  test('TF-2 — the dead reference is reported as a missing file', () => {
    expect(
      run1.missingFiles.map(r => ({ ...r, fileID: r.fileID.toLowerCase() }))
    ).toEqual([
      {
        templateID: templateId,
        templateName,
        location: 'profileDescription',
        entityID: templateProfileId,
        fileID: missingId.toLowerCase(),
      },
    ]);
    expect(run1.failed).toEqual([]);
  });

  test('TF-2 — omitting dryRun is a dry run and reports exactly what run 1 did', () => {
    expect(run2.dryRun).toBe(true);
    expect(run2.copiedReferences).toBe(0);
    expect(run2).toEqual(run1);
  });

  test('TF-2 — the template text is byte-for-byte unchanged (independent read-back)', () => {
    expect(descriptionAfter).toBe(seededDescription);
  });
});
