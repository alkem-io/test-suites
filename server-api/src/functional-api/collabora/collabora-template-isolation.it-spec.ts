import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  AuthorizationPrivilege,
  CollaboraDocumentType,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { getCalloutsData } from '@functional-api/callout/callouts.request.params';
import { GetTemplateById } from '@functional-api/templates/template.request.params';
import {
  applyCollaboraTemplate,
  collaboraFixtures,
  createCollaboraCalloutTemplate,
  fetchDocumentBytesHash,
  fixtureHash,
  getCalloutCollaboraPreviewUrl,
  replaceCollaboraDocument,
} from './collabora.request.params';
import {
  assignLicensePlanToSpace,
  getLicensePlanByName,
} from '../license/license.params.request';

/**
 * Document post templates — template/post isolation (workspace#085).
 *
 * The byte-level acceptance criteria of `specs/085-document-post-templates`
 * §5.1. A browser cannot hash a file, so this suite is the isolation proof:
 * applying a document template copies the template's content into a new
 * document that owns its own backing file, and editing that copy changes
 * nothing else.
 *
 * Cases run in declaration order and depend on it — case 3 is the only content
 * write, and cases 1-2 capture the hashes it must not disturb. What this suite
 * does and does not prove is documented in ./README.md.
 */

const uniqueId = UniqueIDGenerator.getID();

/** Space A — holds the template and the posts. */
const spaceAConfig: TestScenarioConfig = {
  name: 'collabora-tpl-a',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      // Private so a non-member genuinely cannot read the template (AC6).
      privacy: { mode: SpacePrivacyMode.Private },
      // Load-bearing for AC2's member leg: without it SPACE_MEMBER has no
      // CREATE_CALLOUT and the apply fails for a reason that is not FR-003.
      collaboration: { allowMembersToCreateCallouts: true },
    },
  },
};

/**
 * Space B — a second *entitled* space whose admin holds no role in A.
 * Entitled on purpose, so AC6's refusal can only come from the source READ.
 */
const spaceBConfig: TestScenarioConfig = {
  name: 'collabora-tpl-b',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.NON_SPACE_MEMBER],
      members: [TestUser.NON_SPACE_MEMBER],
    },
  },
};

let spaceA: OrganizationWithSpaceModel;
let spaceB: OrganizationWithSpaceModel;

/** The `createTemplate` response, asserted on by case 1. */
let templateResponse: Awaited<
  ReturnType<typeof createCollaboraCalloutTemplate>
>;

// Captured by case 1 and reused by cases 2-4.
let templateId = '';
let templateDocumentId = '';
let templatePreviewUrl = '';
// Captured by case 2, asserted invariant by case 3.
let templateHash = '';
let postA1CalloutId = '';
let postA1DocumentId = '';
let postA2PreviewUrl = '';
let postA2Hash = '';

const importHash = fixtureHash(collaboraFixtures.import);
const replacementHash = fixtureHash(collaboraFixtures.replacement);

/**
 * Collabora creates are gated behind the SPACE_FLAG_OFFICE_DOCUMENTS
 * entitlement. Fails with the reason rather than skipping — a skip here is
 * indistinguishable from a pass.
 */
const entitleSpace = async (spaceId: string): Promise<void> => {
  const plan = await getLicensePlanByName('SPACE_FEATURE_OFFICE_DOCUMENTS');
  const planId = plan[0]?.id ?? '';
  if (!planId) {
    throw new Error(
      'No SPACE_FEATURE_OFFICE_DOCUMENTS license plan on this platform — document templates cannot be exercised here.'
    );
  }
  await assignLicensePlanToSpace(spaceId, planId);
};

beforeAll(async () => {
  spaceA = await TestScenarioFactory.createBaseScenario(spaceAConfig);
  spaceB = await TestScenarioFactory.createBaseScenario(spaceBConfig);

  await entitleSpace(spaceA.space.id);
  await entitleSpace(spaceB.space.id);

  templateResponse = await createCollaboraCalloutTemplate(
    collaboraFixtures.import,
    spaceA.space.templateSetId,
    `collabora-template-${uniqueId}`
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(spaceA);
  await TestScenarioFactory.cleanUpBaseScenario(spaceB);
});

describe('document post templates - template and post content are independent', () => {
  test('AC1: the template carries the uploaded content', async () => {
    const template = templateResponse.data?.createTemplate as
      | {
          id?: string;
          callout?: {
            framing?: {
              collaboraDocument?: {
                id?: string;
                documentType?: string;
                previewUrl?: string;
              };
            };
          };
        }
      | undefined;
    const document = template?.callout?.framing?.collaboraDocument;

    expect(templateResponse.errors).toBeUndefined();
    expect(template?.id).toEqual(expect.any(String));
    expect(document?.id).toEqual(expect.any(String));
    // No documentType was supplied: the .odt must be derived from the file.
    expect(document?.documentType).toEqual(
      CollaboraDocumentType.Wordprocessing
    );
    expect(document?.previewUrl).toEqual(expect.any(String));

    templateId = template?.id as string;
    templateDocumentId = document?.id as string;
    templatePreviewUrl = document?.previewUrl as string;

    await expect(
      fetchDocumentBytesHash(templatePreviewUrl, TestUser.GLOBAL_ADMIN)
    ).resolves.toEqual(importHash);
  });

  test('AC2: two posts from one template have three distinct files, all with the fixture content', async () => {
    // Precondition first, so a refusal below is attributable to the source
    // READ (FR-003) and to nothing else.
    const memberView = await getCalloutsData(
      spaceA.space.collaboration.calloutsSetId,
      undefined,
      TestUser.SPACE_MEMBER
    );
    const memberPrivileges =
      memberView.data?.lookup.calloutsSet?.authorization?.myPrivileges ?? [];
    expect(memberPrivileges).toContain(AuthorizationPrivilege.CreateCallout);

    const a1 = await applyCollaboraTemplate(
      spaceA.space.collaboration.calloutsSetId,
      templateDocumentId,
      `collabora-post-a1-${uniqueId}`,
      TestUser.SPACE_ADMIN
    );
    const a2 = await applyCollaboraTemplate(
      spaceA.space.collaboration.calloutsSetId,
      templateDocumentId,
      `collabora-post-a2-${uniqueId}`,
      TestUser.SPACE_MEMBER
    );

    expect(a1.body?.errors).toBeUndefined();
    expect(a2.body?.errors).toBeUndefined();

    const a1Callout = a1.body?.data?.createCalloutOnCalloutsSet;
    const a2Callout = a2.body?.data?.createCalloutOnCalloutsSet;
    const a1PreviewUrl = a1Callout?.framing?.collaboraDocument?.previewUrl;
    const a2PreviewUrl = a2Callout?.framing?.collaboraDocument?.previewUrl;

    expect(a1PreviewUrl).toEqual(expect.any(String));
    expect(a2PreviewUrl).toEqual(expect.any(String));

    // Three independent backing files: the copy owns its own bytes.
    expect(
      new Set([templatePreviewUrl, a1PreviewUrl, a2PreviewUrl]).size
    ).toEqual(3);

    templateHash = await fetchDocumentBytesHash(
      templatePreviewUrl,
      TestUser.GLOBAL_ADMIN
    );
    const a1Hash = await fetchDocumentBytesHash(
      a1PreviewUrl as string,
      TestUser.GLOBAL_ADMIN
    );
    postA2Hash = await fetchDocumentBytesHash(
      a2PreviewUrl as string,
      TestUser.GLOBAL_ADMIN
    );

    expect(templateHash).toEqual(importHash);
    expect(a1Hash).toEqual(importHash);
    expect(postA2Hash).toEqual(importHash);

    postA1CalloutId = a1Callout?.id as string;
    postA1DocumentId = a1Callout?.framing?.collaboraDocument?.id as string;
    postA2PreviewUrl = a2PreviewUrl as string;
  });

  test('AC3: editing one post changes only that post', async () => {
    const replaced = await replaceCollaboraDocument(
      collaboraFixtures.replacement,
      postA1DocumentId,
      undefined,
      TestUser.SPACE_ADMIN
    );
    expect(replaced.errors).toBeUndefined();

    // A replace stages a new backing Document and deletes the old row, so A1's
    // previewUrl has changed; the captured one now points at a deleted file.
    const reread = await getCalloutCollaboraPreviewUrl(
      postA1CalloutId,
      TestUser.SPACE_ADMIN
    );
    const a1PreviewUrlAfter =
      reread.body?.data?.lookup?.callout?.framing?.collaboraDocument
        ?.previewUrl;
    expect(a1PreviewUrlAfter).toEqual(expect.any(String));

    await expect(
      fetchDocumentBytesHash(a1PreviewUrlAfter as string, TestUser.GLOBAL_ADMIN)
    ).resolves.toEqual(replacementHash);

    // The template and A2 were not written, so their captured previewUrls are
    // still valid — and their bytes must be exactly what case 2 recorded.
    await expect(
      fetchDocumentBytesHash(templatePreviewUrl, TestUser.GLOBAL_ADMIN)
    ).resolves.toEqual(templateHash);
    await expect(
      fetchDocumentBytesHash(postA2PreviewUrl, TestUser.GLOBAL_ADMIN)
    ).resolves.toEqual(postA2Hash);
  });

  test('AC6: a foreign source is refused, and nothing is persisted', async () => {
    // Precondition: B's admin cannot read A's template at all.
    const foreignRead = await GetTemplateById(
      templateId,
      TestUser.NON_SPACE_MEMBER
    );
    const readableTemplate = foreignRead.data?.lookup.template;
    if (readableTemplate) {
      throw new Error(
        `precondition failed: B's admin can read A's template ${templateId} — AC6 would prove nothing`
      );
    }

    const beforeRead = await getCalloutsData(
      spaceB.space.collaboration.calloutsSetId,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );
    const idsBefore = (beforeRead.data?.lookup.calloutsSet?.callouts ?? []).map(
      callout => callout.id
    );

    const attemptedName = `collabora-post-b-${uniqueId}`;
    const refused = await applyCollaboraTemplate(
      spaceB.space.collaboration.calloutsSetId,
      templateDocumentId,
      attemptedName,
      TestUser.NON_SPACE_MEMBER
    );

    const messages = (refused.body?.errors ?? [])
      .map((error: { message: string }) => error.message)
      .join(' | ');
    expect(refused.body?.data?.createCalloutOnCalloutsSet).toBeFalsy();
    // The refusal names the source document, not the destination and not the
    // licence: B is entitled and its admin holds CREATE_CALLOUT on B.
    expect(messages).toContain(templateDocumentId);
    expect(messages).not.toContain('LICENSE_ENTITLEMENT_NOT_AVAILABLE');
    expect(messages).not.toContain(spaceB.space.collaboration.calloutsSetId);

    const afterRead = await getCalloutsData(
      spaceB.space.collaboration.calloutsSetId,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );
    const calloutsAfter = afterRead.data?.lookup.calloutsSet?.callouts ?? [];

    // An id-set comparison, not toHaveLength(0): B is a fresh space, so zero
    // is already true before the attempt and would pass either way.
    expect(calloutsAfter.map(callout => callout.id).sort()).toEqual(
      [...idsBefore].sort()
    );
    expect(
      calloutsAfter.some(
        callout => callout.framing.profile.displayName === attemptedName
      )
    ).toBe(false);

    // Positive control in the same case: a reader that silently returns []
    // cannot make the assertion above vacuous.
    const controlRead = await getCalloutsData(
      spaceA.space.collaboration.calloutsSetId,
      undefined,
      TestUser.SPACE_ADMIN
    );
    expect(
      (controlRead.data?.lookup.calloutsSet?.callouts ?? []).length
    ).toBeGreaterThan(0);
  });
});
