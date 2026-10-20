/**
 * Orphan-free deletion - spaces (alkem-io/server#6614, fix alkem-io/server#6637)
 *
 * Plan: ./orphan-free-deletion-test-plan.md
 *
 * A Space carries TWO profiles. `Space.profile` is the Space actor's own
 * profile (ProfileType.SPACE); `Space.about.profile` (SPACE_ABOUT) is what the
 * UI shows. Only the actor profile and its storage bucket leaked before
 * #6637: `removeSpaceAbout` already deleted the about profile. Every oracle
 * here is therefore captured from `space.profile`; the about profile is only
 * a control. An oracle built on `about.profile` would be green on a server
 * without the fix and prove nothing.
 *
 * - SD-1: Space delete removes the actor profile, its storage bucket and their
 *   policies.
 * - SD-2: the same with a document in that bucket (the risk-bearing class,
 *   which now routes through file-service on the delete path). The delete must
 *   still succeed, and the document's policy and file must be gone.
 *
 * Not asserted here: community guidelines, innovation flow, innovation-flow
 * state, room / communication, template and template-default policies on the
 * Space path. They leaked until server#6678 and are now pinned by GA-4 in
 * `group-a-delete-owned-records.it-spec.ts`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAuthDocument,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import { rawRead } from '@functional-api/platform-roles/_support/raw-request';
import { uploadFileOnStorageBucket } from '@functional-api/storage/upload.params';
import {
  expectLookupGone,
  expectRandomIdIsNotFound,
  expectPoliciesGone,
  expectPoliciesPresent,
  ids,
  operationsAdminToken,
} from './_support/owned-records';

const here = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(here, '../storage/files-to-upload', 'doc.pdf');
const isCI = !!process.env.CI;
const uniqueId = UniqueIDGenerator.getID();

const READ_SPACE = `
  query($id: UUID!) {
    lookup {
      space(ID: $id) {
        id
        profile { id type authorization { id } storageBucket { id authorization { id } } }
        about { profile { id authorization { id } storageBucket { id authorization { id } } } }
      }
    }
  }`;

const READ_BUCKET_DOCUMENTS = `
  query($id: UUID!) {
    lookup { storageBucket(ID: $id) { documents { id authorization { id } } } }
  }`;

type Owned = { id: string; authorization: { id: string } | null };
type SpaceRead = {
  lookup: {
    space: {
      id: string;
      profile: {
        id: string;
        type: string;
        authorization: { id: string } | null;
        storageBucket: Owned | null;
      };
      about: {
        profile: {
          id: string;
          authorization: { id: string } | null;
          storageBucket: Owned | null;
        };
      };
    };
  };
};
type BucketDocuments = {
  lookup: { storageBucket: { documents: Owned[] } };
};

let baseScenario: OrganizationWithSpaceModel;
let poa: string;
const adminToken = () =>
  TestUserManager.getUserModelByType(TestUser.GLOBAL_ADMIN).authToken;

/** Spaces created by a case and not yet deleted by it; swept in afterAll. */
const liveSpaces = new Set<string>();

const createDedicatedSpace = async (name: string): Promise<string> => {
  const res = await createSpaceAndGetData(
    name,
    name,
    baseScenario.organization.accountId
  );
  const spaceId = res.data?.lookup?.space?.id ?? '';
  expect(spaceId, `space '${name}' was created`).not.toBe('');
  liveSpaces.add(spaceId);
  return spaceId;
};

/** Captures the actor profile (the fix) and the about profile (a control). */
const captureSpace = async (spaceId: string) => {
  const { lookup } = await rawRead<SpaceRead>(adminToken(), READ_SPACE, {
    id: spaceId,
  });
  const { profile, about } = lookup.space;
  // The right profile was captured: the actor profile, not the about profile.
  expect(profile, 'Space.profile is readable by GLOBAL_ADMIN').not.toBeNull();
  expect(profile.type).toBe('SPACE');
  expect(profile.id).not.toBe(about.profile.id);
  return {
    profileId: profile.id,
    bucketId: profile.storageBucket?.id ?? '',
    actor: ids({
      'space actor profile policy': profile.authorization?.id,
      'space actor profile storage-bucket policy':
        profile.storageBucket?.authorization?.id,
    }),
    about: ids({
      'space about profile policy': about.profile.authorization?.id,
      'space about profile storage-bucket policy':
        about.profile.storageBucket?.authorization?.id,
    }),
  };
};

/** A delete that throws on `error`, so teardown can never swallow a failure. */
const deleteSpaceOrThrow = async (spaceId: string) => {
  const res = await deleteSpace(spaceId);
  if (res.error) {
    throw new Error(
      `deleteSpace(${spaceId}) failed: ${JSON.stringify(res.error.errors)}`
    );
  }
  liveSpaces.delete(spaceId);
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'orphan-free-space-delete',
    space: {},
  });
  poa = await operationsAdminToken();
  await expectRandomIdIsNotFound(
    poa,
    'authorizationPolicy',
    'profile',
    'storageBucket',
    'document'
  );
});

// A failed Space delete (plan Risk 3) must not skip the remaining spaces or
// the base scenario: collect, clean up, then throw once.
afterAll(async () => {
  const failures: string[] = [];
  for (const spaceId of [...liveSpaces]) {
    try {
      await deleteSpaceOrThrow(spaceId);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  if (failures.length > 0) {
    throw new Error(`teardown left entities behind:\n${failures.join('\n')}`);
  }
});

describe('Orphan-free deletion - spaces (server#6614)', () => {
  test('SD-1 - deleting a space deletes its actor profile and storage bucket', async () => {
    const spaceId = await createDedicatedSpace(`ofd-space-${uniqueId}`);
    const captured = await captureSpace(spaceId);
    expect(captured.bucketId).not.toBe('');

    await expectPoliciesPresent(poa, {
      ...captured.actor,
      ...captured.about,
    });

    const deleted = await deleteSpace(spaceId);
    expect(deleted.error).toBeUndefined();
    liveSpaces.delete(spaceId);
    await expectLookupGone(adminToken(), 'space', spaceId);

    // Separate calls: without the fix the actor profile survives and the
    // about profile is gone, and the red must say which.
    await expectPoliciesGone(
      poa,
      captured.actor,
      'space ACTOR profile (#6637)'
    );
    await expectPoliciesGone(
      poa,
      captured.about,
      'space about profile (already deleted before #6637; a control)'
    );
    await expectLookupGone(poa, 'profile', captured.profileId);
    await expectLookupGone(poa, 'storageBucket', captured.bucketId);
  });

  test('SD-2 - deleting a space whose bucket holds a document succeeds and removes the document policy and file', async () => {
    const spaceId = await createDedicatedSpace(`ofd-space-doc-${uniqueId}`);
    const captured = await captureSpace(spaceId);
    expect(captured.bucketId).not.toBe('');

    const upload = await uploadFileOnStorageBucket(
      pdfPath,
      captured.bucketId,
      TestUser.GLOBAL_ADMIN
    );
    // If the Space-level bucket refuses a global-admin upload (e.g.
    // FORBIDDEN_POLICY) this is a harness finding about who may write it. Do
    // not weaken the case: stop and report.
    expect(
      upload.errors,
      'GLOBAL_ADMIN uploads a document into the Space-level storage bucket'
    ).toBeUndefined();

    const { lookup } = await rawRead<BucketDocuments>(
      adminToken(),
      READ_BUCKET_DOCUMENTS,
      { id: captured.bucketId }
    );
    expect(lookup.storageBucket.documents).toHaveLength(1);
    const document = lookup.storageBucket.documents[0];
    const documentOwned = ids({
      'space bucket document policy': document.authorization?.id,
    });

    await expectPoliciesPresent(poa, {
      ...captured.actor,
      ...documentOwned,
    });
    if (!isCI) {
      // File-content reads are skipped on CI by house precedent
      // (storage/uploads.it-spec.ts); the policy assertions run everywhere.
      const before = await getAuthDocument(document.id, TestUser.GLOBAL_ADMIN);
      expect(before.status).toEqual(200);
    }

    // Risk 3: a bucket that holds a document must not block the delete.
    const deleted = await deleteSpace(spaceId);
    expect(deleted.error).toBeUndefined();
    liveSpaces.delete(spaceId);
    await expectLookupGone(adminToken(), 'space', spaceId);

    await expectPoliciesGone(
      poa,
      captured.actor,
      'space ACTOR profile (#6637)'
    );
    // A red here with the actor policies green points at the document delete
    // path (document.service.ts: authorization policy removed after
    // file-service returns, in a log-and-continue rollback), which the issue
    // lists as "not traced".
    await expectPoliciesGone(
      poa,
      documentOwned,
      'document in the Space bucket (file-service delete path)'
    );
    await expectLookupGone(poa, 'document', document.id);
    await expectLookupGone(poa, 'storageBucket', captured.bucketId);
    if (!isCI) {
      const after = await getAuthDocument(document.id, TestUser.GLOBAL_ADMIN);
      expect(after.status).toEqual(404);
    }
  });
});
