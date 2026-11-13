import { TestUser } from "../../../common/enums/test.user";
import type { ConversationCreationType } from "../../../core/generated/alkemio-schema";
import { GraphqlActor, resolveActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

/**
 * Storage read-backs (W2 journey 11): what the server stored for a file a
 * user uploaded through the UI, and the bytes it serves for it.
 */

/**
 * A callout's stored files as the actor sees them: the framing profile's
 * references, the documents in the framing profile's storage bucket (with the
 * bucket's policy), and the media gallery's visuals. The gallery's own bucket
 * is not selected: `MediaGallery.storageBucket` has no resolver and always
 * answers null, so a visual's document is read with `readStoredDocument`.
 */
export const readCalloutStoredFiles = (
  calloutId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadCalloutStoredFiles({ calloutId }, headers),
  );

/**
 * A conversation's messages with their attachments and the documents of the
 * conversation's attachment bucket, as the actor sees them. The bucket is
 * READ-gated to the conversation's members.
 */
export const readConversationStoredFiles = (
  conversationId: string,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadConversationStoredFiles({ conversationId }, headers),
  );

/** One stored document by id, as the actor sees it (null when it does not exist or is not visible). */
export const readStoredDocument = (
  documentId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadStoredDocument({ documentId }, headers),
  );

/**
 * The document id inside a stored-file URL the server handed out
 * (`…/api/private/rest/storage/document/<id>`). Throws on any other URL, so a
 * read-back never silently looks up the wrong thing.
 */
export const storedDocumentIdOf = (url: string): string => {
  const match = /\/rest\/storage\/document\/([0-9a-f-]{36})$/i.exec(
    new URL(url).pathname,
  );
  if (!match) throw new Error(`not a stored-document URL: ${url}`);
  return match[1];
};

/**
 * Start a conversation as the actor with the given members (the actor is
 * added by the server). `displayName` names a GROUP; a DIRECT conversation
 * ignores it. Only a GROUP can be cleaned up afterwards (`leaveConversation`).
 */
export const createConversation = (
  memberIDs: string[],
  type: ConversationCreationType,
  actor: GraphqlActor,
  displayName?: string,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.CreateConversation(
      { conversationData: { memberIDs, type, displayName } },
      headers,
    ),
  );

/**
 * The actor leaves a GROUP conversation. When the last member has left, the
 * server deletes it; nobody, not even the platform admin, holds DELETE on a
 * conversation, so this is how a walk cleans one up. A DIRECT conversation
 * cannot be left (BAD_USER_INPUT) and so cannot be cleaned up at all.
 */
export const leaveConversation = (
  conversationId: string,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.LeaveConversation(
      { leaveData: { conversationID: conversationId } },
      headers,
    ),
  );

export type StoredFileResponse = {
  /** HTTP status of the download. */
  status: number;
  /** The Content-Type the server served, without parameters ('' when absent). */
  contentType: string;
  /** The body; empty on a refusal. */
  bytes: Buffer;
};

/**
 * Downloads a stored file by the URL the server gave for it (a document's
 * `url`, a reference's `uri`, a visual's `uri`) as the actor, and returns the
 * status, the served MIME type and the bytes. RAW: a refusal is returned, not
 * thrown, so a spec can assert both the positive and the denied download.
 * Redirects are not followed: a stored file is served directly or not at all.
 */
export const downloadStoredFile = async (
  url: string,
  actor: GraphqlActor,
): Promise<StoredFileResponse> => {
  const response = await fetch(url, {
    headers: resolveActor(actor).headers,
    redirect: "manual",
  });
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType, bytes };
};
