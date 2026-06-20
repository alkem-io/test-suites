/**
 * GraphQL fixtures for the unified collaboration service-level e2e
 * (epic 003-unify-collab-yjs).
 *
 * A freshly-seeded DB has no spaces, so each spec creates its own fixture as
 * global admin:
 *
 *   createSpace (on the admin's account)
 *     → space.collaboration.calloutsSet.id
 *   createCalloutOnCalloutsSet (framing.type = MEMO | WHITEBOARD)
 *     → callout.framing.memo.id        (memo collaboration-document UUID)
 *     → callout.framing.whiteboard.id  (whiteboard collaboration-document UUID)
 *
 * That UUID is exactly the `<documentId>` the prod `UnifiedCollabProvider` uses
 * to open `ws://localhost:3000/collab/<documentId>?type=<memo|whiteboard>` — so
 * the service-level WS clients open the identical room a real browser would.
 */
import { gql } from './collab-auth';

export interface CollabFixture {
  spaceNameId: string;
  calloutNameId: string;
  /** The collaboration-document UUID — the WS room id. */
  documentId: string;
}

let cachedAccountId: string | undefined;

async function adminAccountId(cookie: string): Promise<string> {
  if (cachedAccountId) return cachedAccountId;
  const data = await gql<{ me: { user: { account: { id: string } } } }>(
    cookie,
    'query { me { user { account { id } } } }'
  );
  if (!data.me?.user) {
    throw new Error(
      'me.user resolved to null — the OIDC/BFF cookie did not authenticate as admin'
    );
  }
  cachedAccountId = data.me.user.account.id;
  return cachedAccountId;
}

async function createSpaceWithCalloutsSet(
  cookie: string,
  label: string
): Promise<{ spaceNameId: string; calloutsSetID: string }> {
  const accountID = await adminAccountId(cookie);
  const sfx = Date.now();
  const nameID = `${label}-${sfx}`.slice(0, 25);

  const space = await gql<{
    createSpace: {
      nameID: string;
      collaboration: { calloutsSet: { id: string } };
    };
  }>(
    cookie,
    `mutation CreateSpace($spaceData: CreateSpaceOnAccountInput!) {
      createSpace(spaceData: $spaceData) {
        nameID
        collaboration { calloutsSet { id } }
      }
    }`,
    {
      spaceData: {
        accountID,
        nameID,
        about: { profileData: { displayName: `${label} ${sfx}` } },
        collaborationData: { addTutorialCallouts: false, calloutsSetData: {} },
      },
    }
  );

  return {
    spaceNameId: space.createSpace.nameID,
    calloutsSetID: space.createSpace.collaboration.calloutsSet.id,
  };
}

/** Creates a Space + a single MEMO-framed callout; returns the memo room id. */
export async function createMemoFixture(cookie: string): Promise<CollabFixture> {
  const { spaceNameId, calloutsSetID } = await createSpaceWithCalloutsSet(
    cookie,
    'memo-e2e'
  );
  const sfx = Date.now();

  const callout = await gql<{
    createCalloutOnCalloutsSet: {
      nameID: string;
      framing: { memo: { id: string } };
    };
  }>(
    cookie,
    `mutation CreateCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
      createCalloutOnCalloutsSet(calloutData: $calloutData) {
        nameID
        framing { type memo { id } }
      }
    }`,
    {
      calloutData: {
        calloutsSetID,
        framing: {
          profile: { displayName: `Memo Callout ${sfx}` },
          type: 'MEMO',
          memo: { profile: { displayName: `E2E Memo ${sfx}` }, markdown: '' },
        },
      },
    }
  );

  return {
    spaceNameId,
    calloutNameId: callout.createCalloutOnCalloutsSet.nameID,
    documentId: callout.createCalloutOnCalloutsSet.framing.memo.id,
  };
}

/** Creates a Space + a single WHITEBOARD-framed callout; returns the whiteboard room id. */
export async function createWhiteboardFixture(
  cookie: string
): Promise<CollabFixture> {
  const { spaceNameId, calloutsSetID } = await createSpaceWithCalloutsSet(
    cookie,
    'wb-e2e'
  );
  const sfx = Date.now();

  const callout = await gql<{
    createCalloutOnCalloutsSet: {
      nameID: string;
      framing: { whiteboard: { id: string } };
    };
  }>(
    cookie,
    `mutation CreateCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
      createCalloutOnCalloutsSet(calloutData: $calloutData) {
        nameID
        framing { type whiteboard { id } }
      }
    }`,
    {
      calloutData: {
        calloutsSetID,
        framing: {
          profile: { displayName: `Whiteboard Callout ${sfx}` },
          type: 'WHITEBOARD',
          whiteboard: {
            profile: { displayName: `E2E Whiteboard ${sfx}` },
            content: '{"elements":[],"appState":{},"files":{}}',
          },
        },
      },
    }
  );

  return {
    spaceNameId,
    calloutNameId: callout.createCalloutOnCalloutsSet.nameID,
    documentId: callout.createCalloutOnCalloutsSet.framing.whiteboard.id,
  };
}
