/**
 * Fixtures for the collaboration-service specs: a private Space from the
 * standard scenario factory plus one MEMO- or WHITEBOARD-framed callout. The
 * framing document's id is the WebSocket room id — exactly what the SPA's
 * `UnifiedCollabProvider` opens.
 */
import { getGraphqlClient, TestScenarioConfig, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  CalloutFramingType,
  CalloutVisibility,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Private, so a user outside the Space has provably no access to its documents
 * (on a public Space a non-member may legitimately read callout content).
 */
export const collaborationScenario = (name: string): TestScenarioConfig => ({
  name,
  space: {
    settings: { privacy: { mode: SpacePrivacyMode.Private } },
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
  },
});

export type FramingDocument = {
  calloutId: string;
  /** The collaboration document id — the `/collab/<documentId>` room. */
  documentId: string;
};

const framingDocumentIds = async (
  calloutId: string
): Promise<{ memo?: string; whiteboard?: string }> => {
  const res = await graphqlRequestAuth(
    {
      query: 'query($id: UUID!) { lookup { callout(ID: $id) { framing { memo { id } whiteboard { id } } } } }',
      variables: { id: calloutId },
    },
    TestUser.GLOBAL_ADMIN
  );
  const framing = res.body?.data?.lookup?.callout?.framing;
  if (res.status !== 200 || res.body?.errors || !framing) {
    throw new Error(
      `could not read framing of callout ${calloutId}: HTTP ${res.status} ${JSON.stringify(res.body?.errors ?? res.text?.slice(0, 300))}`
    );
  }
  return { memo: framing.memo?.id, whiteboard: framing.whiteboard?.id };
};

/** A published MEMO-framed callout; returns the memo's collaboration document id. */
export const createMemoFraming = async (
  calloutsSetID: string,
  displayName: string
): Promise<FramingDocument> => {
  const client = getGraphqlClient();
  const created = await graphqlErrorWrapper(
    (token: string | undefined) =>
      client.CreateCalloutOnCalloutsSet(
        {
          calloutData: {
            calloutsSetID,
            framing: {
              profile: { displayName },
              type: CalloutFramingType.Memo,
              memo: { markdown: '', profile: { displayName } },
            },
            settings: { visibility: CalloutVisibility.Published },
          },
        },
        { authorization: `Bearer ${token}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
  if (!calloutId) throw new Error(`memo callout not created: ${JSON.stringify(created.error)}`);
  const { memo } = await framingDocumentIds(calloutId);
  if (!memo) throw new Error(`callout ${calloutId} has no framing memo`);
  return { calloutId, documentId: memo };
};

/** A published WHITEBOARD-framed callout; returns the whiteboard's collaboration document id. */
export const createWhiteboardFraming = async (
  calloutsSetID: string,
  displayName: string
): Promise<FramingDocument> => {
  const client = getGraphqlClient();
  const created = await graphqlErrorWrapper(
    (token: string | undefined) =>
      client.CreateCalloutOnCalloutsSet(
        {
          calloutData: {
            calloutsSetID,
            framing: {
              profile: { displayName },
              type: CalloutFramingType.Whiteboard,
              // No `content`: the server seeds an empty native (Yjs) scene. A JSON
              // scene is rejected since the 006 boundary (error 12101).
              whiteboard: { profile: { displayName } },
            },
            settings: { visibility: CalloutVisibility.Published },
          },
        },
        { authorization: `Bearer ${token}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const calloutId = created.data?.createCalloutOnCalloutsSet?.id;
  if (!calloutId) throw new Error(`whiteboard callout not created: ${JSON.stringify(created.error)}`);
  const { whiteboard } = await framingDocumentIds(calloutId);
  if (!whiteboard) throw new Error(`callout ${calloutId} has no framing whiteboard`);
  return { calloutId, documentId: whiteboard };
};

/**
 * How long an EMPTY room lives before the service releases it and the next
 * client is served from the persisted snapshot rather than memory. The service
 * default is 30 s (`RoomConfig.IdleTimeout`, collaboration-service
 * `internal/domain/service/room.go`) and the test deployment does not override
 * it (dev-orchestration `11-collaboration-service-deployment.yml`). Override
 * when a stack is configured differently.
 */
export const ROOM_IDLE_RELEASE_MS = Number(process.env.COLLAB_ROOM_IDLE_RELEASE_MS ?? 35_000);

export const settle = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
