import { TestUser } from "../../../common/enums/test.user";
import {
  CalloutFramingType,
  CalloutVisibility,
} from "../../../core/generated/alkemio-schema";
import type { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import { getLicensePlanByName } from "../../baseFunctions";
import { assignLicensePlanToSpace } from "../space/space.request.params";
import {
  createCalloutWithData,
  readCalloutFramingWhiteboard,
} from "./callout.request.params";

const fail = (what: string, errors: unknown): never => {
  throw new Error(`${what} failed: ${JSON.stringify(errors)}`);
};

/**
 * A callout that FRAMES a whiteboard (framing type WHITEBOARD with an empty
 * whiteboard), plus the whiteboard id — the collaboration document id. The
 * scenario factory's `addWhiteboardCallout` creates a callout with NO framed
 * whiteboard, and its `calloutWhiteboardId` is the callout id.
 * Throws on any failure: it is set-up.
 */
export const createWhiteboardFramedCallout = async (
  calloutsSetId: string,
  displayName: string,
  nameID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<{ calloutId: string; whiteboardId: string }> => {
  const created = await createCalloutWithData(
    {
      calloutsSetID: calloutsSetId,
      nameID,
      framing: {
        profile: { displayName, description: "Whiteboard framing callout" },
        type: CalloutFramingType.Whiteboard,
        whiteboard: { profile: { displayName: "whiteboard" } },
      },
      settings: { visibility: CalloutVisibility.Published },
    },
    actor
  );
  const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
  if (!calloutId)
    return fail("create whiteboard callout", created.error?.errors);
  const read = await readCalloutFramingWhiteboard(calloutId, actor);
  const whiteboardId = read.data?.lookup.callout?.framing.whiteboard?.id;
  if (!whiteboardId)
    return fail("read the callout's whiteboard", read.error?.errors);
  return { calloutId, whiteboardId: whiteboardId as string };
};

/**
 * Entitle a Space for multi-user whiteboard editing and read the flag back.
 * Without the plan every connection after the first is admitted read-only
 * (`multi-user-not-allowed`). Throws if the platform has no such plan.
 */
export const entitleSpaceForWhiteboardMultiUser = async (
  spaceId: string,
  calloutId: string
): Promise<void> => {
  const plan = await getLicensePlanByName(
    "SPACE_FEATURE_WHITEBOARD_MULTI_USER"
  );
  const licensePlanID = plan[0]?.id;
  if (!licensePlanID) {
    throw new Error(
      "no SPACE_FEATURE_WHITEBOARD_MULTI_USER licence plan on this platform"
    );
  }
  const assigned = await assignLicensePlanToSpace(spaceId, licensePlanID);
  if (assigned.error || !assigned.data) {
    return fail(
      "assign the multi-user whiteboard plan",
      assigned.error?.errors
    );
  }
  const read = await readCalloutFramingWhiteboard(calloutId);
  if (read.data?.lookup.callout?.framing.whiteboard?.isMultiUser !== true) {
    throw new Error(
      "whiteboard.isMultiUser is not true after the licence plan was assigned"
    );
  }
};

/**
 * A whiteboard's server-side facts: `updatedDate` (moves on every persisted
 * save), whether the Space entitles it to multi-user editing, its preview mode
 * and the CARD visual's `uri` (the client uploads a fresh preview into it when
 * the editor closes in AUTO mode). `Whiteboard` has no content field: the
 * board's content is read by the peer (`connectWhiteboardPeer`), not here.
 */
export const readWhiteboardState = (
  whiteboardId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadWhiteboardState({ whiteboardId }, headers),
  );
