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

/**
 * The whiteboard a whiteboard callout frames: its id (the collaboration
 * document id), nameID and whether the Space entitles it to multi-user editing.
 * NB the scenario's `calloutWhiteboardId` is the CALLOUT id despite its name.
 */
export const readCalloutFramingWhiteboard = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutFramingWhiteboard({ calloutId }, headers),
  );

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

/** The subspace ids (plus the withheld flag) a Spaces callout shows the actor — the ids-only control of a parity check. */
export const readCalloutSubspaceIds = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadCalloutSubspaceIds({ calloutId }, headers));

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

/**
 * The callouts of a callouts set with what each one IS: its framing type, the
 * framing whiteboard / memo / link it carries, and the contribution types it
 * accepts — the read-back that tells a post from a whiteboard, a CTA or a
 * collection, which the title alone cannot.
 */
export const readCalloutsSetCalloutTypes = (
  calloutsSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutsSetCalloutTypes({ calloutsSetId }, headers),
  );

/**
 * The callouts of a callouts set as the actor sees them, each with its title
 * and its visibility (DRAFT / PUBLISHED) — the read-back that a UI publish
 * reached the server, and, read as a member, which callouts the server lets
 * that member list at all.
 */
export const readCalloutsSetCalloutVisibility = (
  calloutsSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutsSetCalloutVisibility({ calloutsSetId }, headers),
  );

/**
 * The callouts of a callouts set as the actor sees them, each with whether it
 * takes comments (`settings.framing.commentsEnabled`) and the posts
 * contributed to it with their author — the read-back of what a callout made
 * from a template carries and of who contributed to it.
 */
export const readCalloutsSetCalloutResponses = (
  calloutsSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutsSetCalloutResponses({ calloutsSetId }, headers),
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

/**
 * A memo's last SAVED content: `markdown` is the stored checkpoint the server
 * resolves through the memo's content pointer, not the live collaboration room.
 * Also the update date, the multi-user flag and what the actor may do with it.
 */
export const readMemoContent = (
  memoId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadMemoContent({ memoId }, headers));

export const readActivityLogOnCollaboration = (
  queryData: ActivityLogInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.GetActivityLogOnCollaboration({ queryData }, headers),
  );

/**
 * Where each post of a callouts set sits: its phase (FLOW_STATE tag) and
 * position (sortOrder), as the actor sees them.
 */
export const readCalloutsPlacement = (
  calloutsSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.GetCalloutsOnCalloutsSetUsingClassification({ calloutsSetId }, headers),
  );

/**
 * A post (a post-type response) as the actor sees it, including the actor's
 * privileges on it (e.g. MOVE_POST, which gates moving the response).
 */
export const readPost = (
  postId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) => sdk.GetPostData({ postId }, headers));

/**
 * Reorder posts: the given callouts get ascending `sortOrder` in the order
 * passed, renumbered from the lowest current value among them. Gated on
 * UPDATE on the callouts set. Returns each callout's id and new sortOrder.
 */
export const updateCalloutsSortOrder = (
  calloutsSetID: string,
  calloutIDs: string[],
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateCalloutsSortOrder(
      { sortOrderData: { calloutsSetID, calloutIDs } },
      headers,
    ),
  );

/**
 * Reorder the responses of one post: the given contributions get
 * `sortOrder` 1..n in the order passed. Gated on UPDATE on the callout
 * (MOVE_TASK on a Tasks board).
 */
export const updateContributionsSortOrder = (
  calloutID: string,
  contributionIDs: string[],
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateContributionsSortOrder(
      { sortOrderData: { calloutID, contributionIDs } },
      headers,
    ),
  );

/** Move a response to another post of the same callouts set. Gated on MOVE_CONTRIBUTION on the response. */
export const moveContributionToCallout = (
  contributionID: string,
  calloutID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.moveContributionToCallout(
      { moveContributionData: { contributionID, calloutID } },
      headers,
    ),
  );

/** A post's responses with their `sortOrder`, as the actor sees them. */
export const readCalloutContributionsOrder = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutContributionsOrder({ calloutId }, headers),
  );

/**
 * One response looked up by id (`lookup.contribution`, gated on READ on the
 * response itself): the actor's privileges on it and its post's url.
 */
export const readContribution = (
  contributionId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadContribution({ contributionId }, headers),
  );

/**
 * What a response's url resolves to for the actor: the resolver state
 * (Resolved / Forbidden / NotFound) and the callout, contribution and post ids
 * it reached.
 */
export const resolveContributionUrl = (
  url: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ResolveContributionUrl({ url }, headers),
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
