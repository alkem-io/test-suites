import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CollaboraDocumentType,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  collaboraFixtures,
  createCollaboraContributionCallout,
  createCollaboraFramingCallout,
  getCalloutCollaboraDocuments,
  getCollaboraEditorUrl,
  getCollaboraEditorUrlNoAuth,
  getCollaboraServiceAvailable,
  getVirtualContributorKnowledgeBaseCalloutsSet,
  importCollaboraDocument,
  replaceCollaboraDocument,
} from './collabora.request.params';
import {
  assignLicensePlanToSpace,
  getLicensePlanByName,
} from '../license/license.params.request';

/**
 * Collabora document surface — regression cover for server#6360
 * (feature 110-collabora-editor-url-latency, PR alkem-io/server#6350).
 *
 * That change moved analytics attribution off the user-facing response path
 * (typed in-process lifecycle events + a best-effort subscriber) and replaced
 * the ~8 s space-first ownership join with a leaf-first lookup starting at the
 * uniquely indexed `callout_contribution.collaboraDocumentId` /
 * `callout_framing.collaboraDocumentId`.
 *
 * What this suite CAN prove and what it cannot is documented in ./README.md.
 * In short: the analytics *records* land in Elasticsearch and are not readable
 * through the GraphQL API, so these specs verify the user-facing contract —
 * every path still works, stays fast, stays authorized, and an attribution
 * failure never reaches the caller. Record content is verified separately.
 */

const uniqueId = UniqueIDGenerator.getID();

/**
 * Regression ceiling, not the SC-001 acceptance threshold.
 *
 * SC-001 accepts on a p95 below 1 s measured on the APM `CollaboraEditorUrl`
 * transaction in production. This is a client-side round trip on a test
 * environment — it includes network and a possible cold WOPI discovery fetch
 * (cached 12 h), so a 1 s assertion here would be flaky and would not mean what
 * SC-001 means. 5 s is the spec's own all-outcomes alarm line: the regression
 * put every open at 5–8 s, and zero transactions exceeded 5 s in the 46 days
 * before it.
 */
const EDITOR_URL_BUDGET_MS = Number(
  process.env.COLLABORA_EDITOR_URL_BUDGET_MS ?? 5000
);

let baseScenario: OrganizationWithSpaceModel;

/** Level-zero space, document attached through callout framing. */
let framingDocumentId = '';
/** Level-zero space, document attached through a callout contribution. */
let contributionDocumentId = '';
/** L2 subspace (subsubspace) — must still attribute to the L0 root. */
let subsubspaceDocumentId = '';
/** Callout used as the import target. */
let importTargetCalloutId = '';
/** Document with no owning Space: a VC knowledge base is not under a Space. */
let knowledgeBaseDocumentId = '';
let knowledgeBaseSetupError = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'collabora-editor-url',
  space: {
    // Private so the "no access" assertion is deterministic — on a public
    // space a non-member can legitimately read callout content.
    settings: { privacy: { mode: SpacePrivacyMode.Private } },
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      subspace: {
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [
      {
        profileDisplayName: `collabora-kb-vc-${uniqueId}`,
        bodyOfKnowledgeType: 'ALKEMIO_KNOWLEDGE_BASE',
        knowledgeBaseProfile: {
          displayName: `collabora-kb-${uniqueId}`,
          description: 'Knowledge base hosting a Collabora document',
        },
      },
    ],
  },
};

/** Pull the framing document id out of a create-callout response. */
const framingDocIdFrom = (response: {
  body?: { data?: { createCalloutOnCalloutsSet?: unknown }; errors?: unknown };
}): string => {
  const callout = response.body?.data?.createCalloutOnCalloutsSet as
    | { framing?: { collaboraDocument?: { id?: string } } }
    | undefined;
  const id = callout?.framing?.collaboraDocument?.id;
  if (!id) {
    throw new Error(
      `Collabora framing callout was not created: ${JSON.stringify(
        response.body?.errors ?? response.body
      )}`
    );
  }
  return id;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Collabora documents are gated behind the SPACE_FLAG_OFFICE_DOCUMENTS
  // entitlement; without it every create below is refused with
  // LICENSE_ENTITLEMENT_NOT_AVAILABLE. The entitlement is evaluated against the
  // level-zero space agent, so assigning the plan to the L0 space also covers
  // its L1/L2 subspaces.
  const officeDocsPlan = await getLicensePlanByName(
    'SPACE_FEATURE_OFFICE_DOCUMENTS'
  );
  const officeDocsPlanId = officeDocsPlan[0]?.id ?? '';
  if (!officeDocsPlanId) {
    throw new Error(
      'No SPACE_FEATURE_OFFICE_DOCUMENTS license plan on this platform — Collabora cannot be exercised here.'
    );
  }
  await assignLicensePlanToSpace(baseScenario.space.id, officeDocsPlanId);

  // --- L0: framing-attached document ---
  framingDocumentId = framingDocIdFrom(
    await createCollaboraFramingCallout(
      baseScenario.space.collaboration.calloutsSetId,
      `collabora-framing-l0-${uniqueId}`
    )
  );

  // --- L0: contribution-attached document (the other lookup branch) ---
  const contributionCallout = await createCollaboraContributionCallout(
    baseScenario.space.collaboration.calloutsSetId,
    `collabora-contribution-l0-${uniqueId}`
  );
  const contributions =
    contributionCallout.body?.data?.createCalloutOnCalloutsSet?.contributions;
  contributionDocumentId = contributions?.[0]?.collaboraDocument?.id ?? '';
  importTargetCalloutId =
    contributionCallout.body?.data?.createCalloutOnCalloutsSet?.id ?? '';
  if (!contributionDocumentId) {
    throw new Error(
      `Collabora contribution callout was not created: ${JSON.stringify(
        contributionCallout.body?.errors ?? contributionCallout.body
      )}`
    );
  }

  // --- L2 subspace: attribution must still resolve to the L0 root ---
  subsubspaceDocumentId = framingDocIdFrom(
    await createCollaboraFramingCallout(
      baseScenario.subsubspace.collaboration.calloutsSetId,
      `collabora-framing-l2-${uniqueId}`
    )
  );

  // --- No owning Space: a VC knowledge base callouts set (type KNOWLEDGE_BASE)
  // has no Space ancestor, so the ownership lookup must raise
  // EntityNotFoundException and the subscriber must contain it.
  // Reached through the API on purpose — client-web#10125 blocks the UI route.
  try {
    const virtualContributorId = baseScenario.virtualContributors?.[0]?.id;
    if (!virtualContributorId) {
      throw new Error(
        'scenario produced no virtual contributor (see TestScenarioFactory warnings)'
      );
    }
    const kbResponse = await getVirtualContributorKnowledgeBaseCalloutsSet(
      virtualContributorId
    );
    const calloutsSetId =
      kbResponse.body?.data?.virtualContributor?.knowledgeBase?.calloutsSet?.id;
    if (!calloutsSetId) {
      throw new Error(
        `no knowledge-base callouts set: ${JSON.stringify(
          kbResponse.body?.errors ?? kbResponse.body
        )}`
      );
    }
    knowledgeBaseDocumentId = framingDocIdFrom(
      await createCollaboraFramingCallout(
        calloutsSetId,
        `collabora-framing-kb-${uniqueId}`
      )
    );
  } catch (error) {
    // Recorded, not swallowed — the test below fails with this reason rather
    // than skipping, so a missing environment capability stays visible.
    knowledgeBaseSetupError = (error as Error).message;
  }
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('collaboraEditorUrl - resolves without waiting on analytics', () => {
  test.each`
    attachment        | documentIdRef
    ${'framing'}      | ${() => framingDocumentId}
    ${'contribution'} | ${() => contributionDocumentId}
  `(
    'returns the editor URL for a $attachment-attached document',
    async ({ documentIdRef }: { documentIdRef: () => string }) => {
      const response = await getCollaboraEditorUrl(documentIdRef());

      expect(response.errors).toBeUndefined();
      expect(response.result?.editorUrl).toEqual(expect.any(String));
      expect(response.result?.editorUrl.length).toBeGreaterThan(0);
      // 0 means "does not expire"; any other value is an absolute epoch-ms.
      expect(response.result?.accessTokenTTL).toEqual(expect.any(Number));
    }
  );

  test('returns the editor URL for a document in an L2 subspace', async () => {
    // The ownership lookup walks contribution/framing -> calloutsSet -> the
    // level-zero space. A document three levels down is the case where a
    // wrong lookup would silently attribute to the wrong space.
    const response = await getCollaboraEditorUrl(subsubspaceDocumentId);

    expect(response.errors).toBeUndefined();
    expect(response.result?.editorUrl).toEqual(expect.any(String));
  });

  test.each`
    attachment          | documentIdRef
    ${'framing'}        | ${() => framingDocumentId}
    ${'contribution'}   | ${() => contributionDocumentId}
    ${'L2 subspace'}    | ${() => subsubspaceDocumentId}
  `(
    'resolves a $attachment document well inside the regression ceiling',
    async ({ documentIdRef }: { documentIdRef: () => string }) => {
      const response = await getCollaboraEditorUrl(documentIdRef());

      expect(response.errors).toBeUndefined();
      // Surfaced so a slow-but-passing run is still visible in the report.
       
      console.log(
        `collaboraEditorUrl round trip: ${response.elapsedMs} ms (ceiling ${EDITOR_URL_BUDGET_MS} ms)`
      );
      expect(response.elapsedMs).toBeLessThan(EDITOR_URL_BUDGET_MS);
    }
  );

  test('issues an independent result per call, with no shared state', async () => {
    const [first, second] = await Promise.all([
      getCollaboraEditorUrl(framingDocumentId),
      getCollaboraEditorUrl(framingDocumentId),
    ]);

    expect(first.errors).toBeUndefined();
    expect(second.errors).toBeUndefined();
    expect(first.result?.editorUrl).toEqual(expect.any(String));
    expect(second.result?.editorUrl).toEqual(expect.any(String));
  });
});

describe('collaboraEditorUrl - a document with no owning Space', () => {
  /**
   * The acceptance case behind FR-003 and the spec's "document with no owning
   * space" edge case: the ownership lookup raises EntityNotFoundException, the
   * lifecycle subscriber catches and logs it, and the user is unaffected.
   *
   * If this returns an error, analytics failure is reaching the caller — the
   * exact coupling the feature removed.
   */
  test('opens normally even though attribution cannot resolve a Space', async () => {
    expect(knowledgeBaseSetupError).toEqual('');

    const response = await getCollaboraEditorUrl(knowledgeBaseDocumentId);

    expect(response.errors).toBeUndefined();
    expect(response.result?.editorUrl).toEqual(expect.any(String));
    expect(response.elapsedMs).toBeLessThan(EDITOR_URL_BUDGET_MS);
  });
});

describe('collaboraEditorUrl - authorization', () => {
  test('is refused without authentication', async () => {
    const response = await getCollaboraEditorUrlNoAuth(framingDocumentId);

    expect(response.result).toBeUndefined();
    expect(response.errors).toBeDefined();
  });

  test('is refused for a user with no access to the space', async () => {
    const response = await getCollaboraEditorUrl(
      framingDocumentId,
      TestUser.NON_SPACE_MEMBER
    );

    expect(response.result).toBeUndefined();
    expect(response.errors).toBeDefined();
  });

  test('is allowed for a space member', async () => {
    const response = await getCollaboraEditorUrl(
      framingDocumentId,
      TestUser.SPACE_MEMBER
    );

    expect(response.errors).toBeUndefined();
    expect(response.result?.editorUrl).toEqual(expect.any(String));
  });
});

describe('collaboraServiceAvailable - the side-effect-free control', () => {
  /**
   * Documented as issuing no token and recording no analytics. It is the
   * negative control for the analytics paths: if the reporter fires for this
   * query, something is publishing lifecycle events too eagerly.
   */
  test('answers the health check without issuing a token', async () => {
    const response = await getCollaboraServiceAvailable(framingDocumentId);

    expect(response.body?.errors).toBeUndefined();
    expect(typeof response.body?.data?.collaboraServiceAvailable).toEqual(
      'boolean'
    );
  });
});

describe('replaceCollaboraDocument - publishes only after persistence', () => {
  test('swaps the backing file and applies the new display name', async () => {
    const newName = `collabora-replaced-${uniqueId}`;

    const response = await replaceCollaboraDocument(
      collaboraFixtures.replacement,
      framingDocumentId,
      newName
    );

    const replaced = response.data?.replaceCollaboraDocument as
      | { id?: string; profile?: { displayName?: string } }
      | undefined;

    expect(response.errors).toBeUndefined();
    // Identity is preserved in place — same CollaboraDocument, new bytes.
    expect(replaced?.id).toEqual(framingDocumentId);
    expect(replaced?.profile?.displayName).toEqual(newName);
  });

  test('the document still opens after being replaced', async () => {
    const response = await getCollaboraEditorUrl(framingDocumentId);

    expect(response.errors).toBeUndefined();
    expect(response.result?.editorUrl).toEqual(expect.any(String));
  });

  test('refuses a replacement that is not an allowed OfficeDocs format', async () => {
    // Ordering guard: a refused replace must fail loudly AND leave the
    // document untouched. A record for a write that never happened would
    // inflate analytics — publication happens only after persistence succeeds.
    const response = await replaceCollaboraDocument(
      collaboraFixtures.invalid,
      contributionDocumentId,
      `should-not-apply-${uniqueId}`
    );

    expect(response.errors).toBeDefined();
    expect(response.data?.replaceCollaboraDocument).toBeFalsy();

    const after = await getCalloutCollaboraDocuments(importTargetCalloutId);
    const documentName =
      after.body?.data?.lookup?.callout?.contributions?.[0]?.collaboraDocument
        ?.profile?.displayName;
    expect(documentName).not.toEqual(`should-not-apply-${uniqueId}`);
  });
});

describe('importCollaboraDocument - attaches an uploaded file', () => {
  test('creates a contribution carrying the imported document', async () => {
    const displayName = `collabora-imported-${uniqueId}`;

    const response = await importCollaboraDocument(
      collaboraFixtures.import,
      importTargetCalloutId,
      displayName
    );

    const contribution = response.data?.importCollaboraDocument as
      | {
          id?: string;
          collaboraDocument?: {
            id?: string;
            documentType?: string;
            profile?: { displayName?: string };
          };
        }
      | undefined;

    expect(response.errors).toBeUndefined();
    expect(contribution?.id).toEqual(expect.any(String));
    expect(contribution?.collaboraDocument?.id).toEqual(expect.any(String));
    expect(contribution?.collaboraDocument?.profile?.displayName).toEqual(
      displayName
    );
    // On the upload path the type is sniffed from the file, not taken from
    // input — an .odt must land as WORDPROCESSING.
    expect(contribution?.collaboraDocument?.documentType).toEqual(
      CollaboraDocumentType.Wordprocessing
    );
  });

  test('the imported document opens through the editor URL', async () => {
    const imported = await importCollaboraDocument(
      collaboraFixtures.import,
      importTargetCalloutId,
      `collabora-imported-openable-${uniqueId}`
    );
    const documentId = (
      imported.data?.importCollaboraDocument as
        | { collaboraDocument?: { id?: string } }
        | undefined
    )?.collaboraDocument?.id;

    expect(documentId).toEqual(expect.any(String));

    const response = await getCollaboraEditorUrl(documentId as string);

    expect(response.errors).toBeUndefined();
    expect(response.result?.editorUrl).toEqual(expect.any(String));
    expect(response.elapsedMs).toBeLessThan(EDITOR_URL_BUDGET_MS);
  });

  test('derives the title from the filename when none is supplied', async () => {
    const response = await importCollaboraDocument(
      collaboraFixtures.import,
      importTargetCalloutId
    );

    const displayName = (
      response.data?.importCollaboraDocument as
        | { collaboraDocument?: { profile?: { displayName?: string } } }
        | undefined
    )?.collaboraDocument?.profile?.displayName;

    expect(response.errors).toBeUndefined();
    // Filename with the extension stripped.
    expect(displayName).toEqual('collabora-import');
  });
});
