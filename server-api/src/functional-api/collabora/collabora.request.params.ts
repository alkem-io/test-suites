import { TestUser, TestUserManager, testConfiguration } from '@alkemio/tests-lib';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  CollaboraDocumentType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  graphqlRequest,
  graphqlRequestAuth,
} from '@alkemio/tests-lib/utils/graphql.request';
import { readFileSync, PathLike } from 'fs';
import nodePath from 'path';

/**
 * Raw GraphQL operations for the Collabora document surface.
 *
 * These use `graphqlRequestAuth` rather than the generated client because the
 * lib's committed codegen output has no operation documents for
 * `collaboraEditorUrl`, `replaceCollaboraDocument` or `importCollaboraDocument`
 * — only the schema types. Keeping the operations here means the whole surface
 * is expressed in one file; when the lib codegen next emits these operations
 * they can move to the generated client without touching the specs.
 *
 * `importCollaboraDocument` and `replaceCollaboraDocument` take `Upload!`, so
 * they go through the GraphQL multipart request spec rather than a JSON body.
 */

export type EditorUrlResult = {
  editorUrl: string;
  accessTokenTTL: number;
};

/** A `collaboraEditorUrl` call plus the wall-clock time the server took. */
export type TimedEditorUrl = {
  /** Populated on success; undefined when the query errored. */
  result?: EditorUrlResult;
  /** GraphQL errors, when the query was refused. */
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
  /** Round-trip milliseconds, measured client-side around the request. */
  elapsedMs: number;
  status: number;
};

const EDITOR_URL_QUERY = `query CollaboraEditorUrl($collaboraDocumentID: UUID!) {
  collaboraEditorUrl(collaboraDocumentID: $collaboraDocumentID) {
    editorUrl
    accessTokenTTL
  }
}`;

/**
 * Resolve the editor URL, measuring how long the server took.
 *
 * The elapsed time is a round trip, not the APM `CollaboraEditorUrl`
 * transaction — it includes network and Kratos-free auth overhead. It is a
 * coarse guard against the ~8 s regression class (server#6360), NOT the
 * measurement SC-001 is accepted on. See ./README.md.
 */
export const getCollaboraEditorUrl = async (
  collaboraDocumentID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<TimedEditorUrl> => {
  const startedAt = Date.now();
  const response = await graphqlRequestAuth(
    {
      operationName: 'CollaboraEditorUrl',
      query: EDITOR_URL_QUERY,
      variables: { collaboraDocumentID },
    },
    userRole
  );
  const elapsedMs = Date.now() - startedAt;

  return {
    result: response.body?.data?.collaboraEditorUrl ?? undefined,
    errors: response.body?.errors,
    elapsedMs,
    status: response.status,
  };
};

/** The same query with no Authorization header at all. */
export const getCollaboraEditorUrlNoAuth = async (
  collaboraDocumentID: string
): Promise<TimedEditorUrl> => {
  const startedAt = Date.now();
  const response = await graphqlRequest({
    operationName: 'CollaboraEditorUrl',
    query: EDITOR_URL_QUERY,
    variables: { collaboraDocumentID },
  });
  const elapsedMs = Date.now() - startedAt;

  return {
    result: response.body?.data?.collaboraEditorUrl ?? undefined,
    errors: response.body?.errors,
    elapsedMs,
    status: response.status,
  };
};

/**
 * The side-effect-free health check. Documented as issuing no token and
 * recording no analytics — used here as the negative control for the
 * analytics paths.
 */
export const getCollaboraServiceAvailable = async (
  collaboraDocumentID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'CollaboraServiceAvailable',
      query: `query CollaboraServiceAvailable($collaboraDocumentID: UUID!) {
        collaboraServiceAvailable(collaboraDocumentID: $collaboraDocumentID)
      }`,
      variables: { collaboraDocumentID },
    },
    userRole
  );

/**
 * Create a callout whose *framing* is a blank Collabora document.
 *
 * Blank-create requires both `displayName` and `documentType` on
 * `framing.collaboraDocument`; the type is only sniffed on the upload path.
 */
export const createCollaboraFramingCallout = async (
  calloutsSetID: string,
  displayName: string,
  documentType: CollaboraDocumentType = CollaboraDocumentType.Wordprocessing,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'CreateCollaboraFramingCallout',
      query: `mutation CreateCollaboraFramingCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) {
          id
          framing {
            id
            type
            collaboraDocument { id documentType profile { id displayName } }
          }
        }
      }`,
      variables: {
        calloutData: {
          calloutsSetID,
          framing: {
            profile: { displayName, description: 'Collabora framing callout' },
            type: CalloutFramingType.CollaboraDocument,
            collaboraDocument: { displayName, documentType },
          },
          settings: { visibility: CalloutVisibility.Published },
        },
      },
    },
    userRole
  );

/**
 * Create a callout that carries a blank Collabora document as a *contribution*.
 *
 * This is the other half of the attachment invariant: a CollaboraDocument is
 * reachable either through `callout_framing` or through `callout_contribution`,
 * never both — and the two are separate branches of the leaf-first ownership
 * lookup (contribution = 2 statements, framing fallback = at most 3).
 */
export const createCollaboraContributionCallout = async (
  calloutsSetID: string,
  displayName: string,
  documentType: CollaboraDocumentType = CollaboraDocumentType.Wordprocessing,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'CreateCollaboraContributionCallout',
      query: `mutation CreateCollaboraContributionCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) {
          id
          contributions {
            id
            collaboraDocument { id documentType profile { id displayName } }
          }
        }
      }`,
      variables: {
        calloutData: {
          calloutsSetID,
          framing: {
            profile: {
              displayName,
              description: 'Collabora contribution callout',
            },
            type: CalloutFramingType.None,
          },
          settings: {
            visibility: CalloutVisibility.Published,
            contribution: {
              enabled: true,
              allowedTypes: [CalloutContributionType.CollaboraDocument],
              canAddContributions: CalloutAllowedActors.Members,
            },
          },
          contributions: [
            {
              type: CalloutContributionType.CollaboraDocument,
              collaboraDocument: { displayName, documentType },
            },
          ],
        },
      },
    },
    userRole
  );

/** Read back both attachment paths for a callout. */
export const getCalloutCollaboraDocuments = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'CalloutCollaboraDocuments',
      query: `query CalloutCollaboraDocuments($calloutID: UUID!) {
        lookup {
          callout(ID: $calloutID) {
            id
            framing { id collaboraDocument { id profile { id displayName } } }
            contributions { id collaboraDocument { id profile { id displayName } } }
          }
        }
      }`,
      variables: { calloutID },
    },
    userRole
  );

/** The callouts set of a Virtual Contributor's knowledge base (type KNOWLEDGE_BASE). */
export const getVirtualContributorKnowledgeBaseCalloutsSet = async (
  virtualContributorID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'VcKnowledgeBaseCalloutsSet',
      query: `query VcKnowledgeBaseCalloutsSet($id: UUID!) {
        virtualContributor(ID: $id) {
          id
          knowledgeBase { id calloutsSet { id type } }
        }
      }`,
      variables: { id: virtualContributorID },
    },
    userRole
  );

// --- multipart uploads ---
// Mirrors server-api/src/functional-api/storage/upload.params.ts. Kept local
// because the Collabora mutations use different argument names (`uploadData`
// for import, `replaceData` for replace) and OfficeDocs MIME types that the
// storage helper's lookup table does not carry.

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

interface GraphqlUploadResponse {
  data?: Record<string, unknown> | null;
  errors?: GraphQLError[];
}

const OFFICE_MIME_TYPES: Record<string, string> = {
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.odg': 'application/vnd.oasis.opendocument.graphics',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

const officeMimeType = (filePath: string): string =>
  OFFICE_MIME_TYPES[nodePath.extname(filePath).toLowerCase()] ||
  'application/octet-stream';

const graphqlUpload = async (
  mutation: string,
  variables: Record<string, unknown>,
  filePath: PathLike,
  userRole: TestUser
): Promise<GraphqlUploadResponse> => {
  const endpoint = testConfiguration.endPoints.graphql.private;
  const authToken = TestUserManager.getUserModelByType(userRole).authToken;

  const filePathStr = filePath.toString();
  const fileBuffer = readFileSync(filePathStr);
  const fileName = nodePath.basename(filePathStr);

  const formData = new FormData();
  formData.append(
    'operations',
    JSON.stringify({ query: mutation, variables: { ...variables, file: null } })
  );
  formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
  formData.append(
    '0',
    new Blob([fileBuffer], { type: officeMimeType(filePathStr) }),
    fileName
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'apollo-require-preflight': 'true',
      'x-apollo-operation-name': 'true',
    },
    body: formData,
  });

  return response.json() as Promise<GraphqlUploadResponse>;
};

/** `importCollaboraDocument` — attaches an uploaded file as a new contribution. */
export const importCollaboraDocument = async (
  path: PathLike,
  calloutID: string,
  displayName?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const uploadData: Record<string, unknown> = { calloutID };
  // Absent and null are different inputs; omit entirely to exercise the
  // "derive the title from the filename" path.
  if (displayName !== undefined) uploadData.displayName = displayName;

  return graphqlUpload(
    `mutation ImportCollaboraDocument($file: Upload!, $uploadData: ImportCollaboraDocumentInput!) {
      importCollaboraDocument(file: $file, uploadData: $uploadData) {
        id
        collaboraDocument { id documentType profile { id displayName } }
      }
    }`,
    { uploadData },
    path,
    userRole
  );
};

/** `replaceCollaboraDocument` — swaps the backing file, preserving identity. */
export const replaceCollaboraDocument = async (
  path: PathLike,
  collaboraDocumentID: string,
  displayName?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const replaceData: Record<string, unknown> = { ID: collaboraDocumentID };
  if (displayName !== undefined) replaceData.displayName = displayName;

  return graphqlUpload(
    `mutation ReplaceCollaboraDocument($file: Upload!, $replaceData: ReplaceCollaboraDocumentInput!) {
      replaceCollaboraDocument(file: $file, replaceData: $replaceData) {
        id
        documentType
        profile { id displayName }
      }
    }`,
    { replaceData },
    path,
    userRole
  );
};

/** Fixture paths, resolved relative to this file. */
export const collaboraFixtures = {
  import: nodePath.join(__dirname, 'files-to-upload', 'collabora-import.odt'),
  replacement: nodePath.join(
    __dirname,
    'files-to-upload',
    'collabora-replacement.odt'
  ),
  /** A non-OfficeDocs file, for the refused-replace ordering check. */
  invalid: nodePath.join(
    __dirname,
    '..',
    'storage',
    'files-to-upload',
    'image.png'
  ),
};
