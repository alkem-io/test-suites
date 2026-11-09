import { TestUser } from "../../../common/enums/test.user";
import {
  CalloutFramingType,
  CalloutVisibility,
} from "../../../core/generated/alkemio-schema";
import type { GraphqlActor } from "../../../utils/graphql.actor";
import { createCalloutWithData } from "./callout.request.params";

export type MemoFramedCallout = {
  calloutId: string;
  memoId: string;
  /** The callout's deep link; opening it shows the callout dialog. */
  calloutUrl: string;
};

/**
 * A published callout that FRAMES a memo seeded with `markdown`. The memo's own
 * title differs from the callout's name on purpose: the callout dialog and the
 * memo dialog are both named after their profile and must stay distinguishable.
 * Throws on any failure: it is set-up.
 */
export const createMemoFramedCallout = async (
  calloutsSetId: string,
  data: { displayName: string; memoTitle: string; markdown: string },
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
): Promise<MemoFramedCallout> => {
  const created = await createCalloutWithData(
    {
      calloutsSetID: calloutsSetId,
      framing: {
        profile: {
          displayName: data.displayName,
          description: "Memo framing callout",
        },
        type: CalloutFramingType.Memo,
        memo: {
          markdown: data.markdown,
          profile: { displayName: data.memoTitle },
        },
      },
      settings: { visibility: CalloutVisibility.Published },
    },
    actor,
  );
  const callout = created.data?.createCalloutOnCalloutsSet;
  const memoId = callout?.framing.memo?.id;
  const calloutUrl = callout?.framing.profile.url;
  if (!callout?.id || !memoId || !calloutUrl) {
    throw new Error(
      `create memo callout failed: ${JSON.stringify(created.error?.errors ?? "no memo in the response")}`,
    );
  }
  return { calloutId: callout.id, memoId, calloutUrl };
};
