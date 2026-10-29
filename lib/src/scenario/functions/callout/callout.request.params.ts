import { TestUser } from "../../../common/enums/test.user";
import type {
  ActivityLogInput,
  ActorType,
  CreateCalloutOnCalloutsSetInput,
  CreateContributionOnCalloutInput,
  SubmitCalloutFormResponseInput,
  UpdateCalloutEntityInput,
  UpdateCalloutFormInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor, graphqlEndpointUrl, resolveActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import type { RawGraphqlResponse } from "../../../utils/graphql.raw.client";

/** Create a callout from a full input; returns the framing ids/urls (form questions, document) a spec reads next. */
export const createCalloutWithData = (
  calloutData: CreateCalloutOnCalloutsSetInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.CreateCalloutWithData({ calloutData }, headers));

/** Update a callout (framing, settings …); returns the id only. */
export const updateCalloutData = (
  calloutData: UpdateCalloutEntityInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UpdateCalloutData({ calloutData }, headers));

export const deleteCallout = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.deleteCallout({ calloutId }, headers));

/** Add a contribution (post, memo, …) to a callout; returns the post/memo ids a spec reads next. */
export const createContributionOnCallout = (
  contributionData: CreateContributionOnCalloutInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.CreateContributionWithData({ contributionData }, headers),
  );

export const submitCalloutFormResponse = (
  responseData: SubmitCalloutFormResponseInput,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.submitCalloutFormResponse({ responseData }, headers),
  );

export const updateCalloutForm = (
  formData: UpdateCalloutFormInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.updateCalloutForm({ formData }, headers));

export const deleteCalloutFormResponse = (
  responseId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.deleteCalloutFormResponse({ deleteData: { responseID: responseId } }, headers),
  );

/** A callout's framing: type, profile url/name, form (title, settings, questions, options) and document. */
export const readCalloutFraming = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadCalloutFraming({ calloutId }, headers));

/** A callout's framing settings: the selection mode/ids and the spaces card variant. */
export const readCalloutFramingSettings = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutFramingSettings({ calloutId }, headers),
  );

/** The subspaces a Spaces callout shows the actor, and whether some are withheld. */
export const readCalloutSubspaces = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadCalloutSubspaces({ calloutId }, headers));

/** A callout's activity counter, contributions (posts) and per-type counts. */
export const readCalloutContributions = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutContributions({ calloutId }, headers),
  );

/** The contributor cards a Contributors callout resolves for one actor type. */
export const readCalloutFramingContributors = (
  calloutId: string,
  type: ActorType,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutFramingContributors({ calloutId, type }, headers),
  );

/** The callouts of a callouts set with framing type/name/url, form questions and document. */
export const readCalloutsSetCallouts = (
  calloutsSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutsSetCallouts({ calloutsSetId }, headers),
  );

/** The responses of a form as the actor sees them: own, all (when allowed) and the moderation flags. */
export const readCalloutFormResponses = (
  formID: string,
  actor: GraphqlActor,
  first?: number,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutFormResponses({ formID, first }, headers),
  );

/** A memo's signatures and the documents in its storage bucket. */
export const readMemoDocuments = (
  memoId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadMemoDocuments({ memoId }, headers));

export const readActivityLogOnCollaboration = (
  queryData: ActivityLogInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.GetActivityLogOnCollaboration({ queryData }, headers),
  );

// ---------------------------------------------------------------------------
// Multipart (Upload scalar) operations. The generated SDK posts JSON only, so
// the two documents that carry a file go through the GraphQL multipart
// request spec by hand; the document text still lives here, in the lib.
// ---------------------------------------------------------------------------

export type UploadFile = {
  bytes: Uint8Array | Buffer;
  fileName: string;
  mimeType: string;
};

export const postGraphqlMultipartAs = async <TData>(
  actor: GraphqlActor,
  query: string,
  variables: Record<string, unknown>,
  fileVariablePath: string,
  file: UploadFile,
): Promise<RawGraphqlResponse<TData>> => {
  const resolved = resolveActor(actor);
  const form = new FormData();
  form.append("operations", JSON.stringify({ query, variables }));
  form.append("map", JSON.stringify({ "0": [fileVariablePath] }));
  form.append(
    "0",
    new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }),
    file.fileName,
  );
  const response = await fetch(graphqlEndpointUrl(resolved.endpoint), {
    method: "POST",
    headers: {
      ...resolved.headers,
      "apollo-require-preflight": "true",
      "x-apollo-operation-name": "true",
    },
    body: form,
  });
  const raw = await response.text();
  let body: RawGraphqlResponse<TData>["body"];
  try {
    body = JSON.parse(raw);
  } catch {
    body = {};
  }
  return { status: response.status, body, raw };
};

/** Upload one file into a storage bucket (a memo's, a profile's …); returns the document id + url. */
export const uploadFileOnStorageBucket = (
  storageBucketId: string,
  file: UploadFile,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  postGraphqlMultipartAs<{ uploadFileOnStorageBucket: { id: string; url: string } }>(
    actor,
    `mutation UploadFileOnStorageBucket($file: Upload!, $uploadData: StorageBucketUploadFileInput!) {
      uploadFileOnStorageBucket(file: $file, uploadData: $uploadData) { id url }
    }`,
    { file: null, uploadData: { storageBucketId } },
    "variables.file",
    file,
  );
