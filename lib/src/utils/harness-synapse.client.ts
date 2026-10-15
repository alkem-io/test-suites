import axios from 'axios';
import { assertLoopbackInternal } from '../config/loopback-guard';

/**
 * Read (and, for exactly two calls, write) Matrix/Synapse state directly,
 * for the 061 forum-hierarchy-reconcile cases that need to observe
 * `m.space.child` edges or room-directory visibility, and the server#6329
 * conversation member-removal cases that need to observe room membership and
 * history — surfaces the GraphQL API does not expose.
 *
 * Two authorization tiers on the local Synapse (probed 2026-09-29):
 * - Alias resolution and directory-visibility reads are UNAUTHENTICATED.
 * - Room state reads (and any write) need the dev appservice token, which
 *   can act as the adapter bot on every Alkemio room (H-7). It is supplied
 *   ONLY via `HARNESS_SYNAPSE_AS_TOKEN`, placed by the operator's own secret
 *   handling — this module never reads it from anywhere else (no server
 *   checkout, no config file), never logs it, and refuses a non-loopback
 *   `HARNESS_SYNAPSE_URL`.
 *
 * Writes this client performs (there are exactly two):
 * - `setDirectoryVisibility` seeds the pre-fix "published" state in N-12b
 *   before proving the sync retracts it.
 * - `sendTextAs` puts one `m.room.message` text event into a throwaway
 *   conversation room, as a test persona's appservice ghost (identity
 *   assertion via `?user_id=`). It exists so M-2 (server#6329) can exercise
 *   the same Synapse event-auth membership check a removed member's browser
 *   session hits, without driving SSO. It never sends as the adapter bot.
 *
 * The member-removal reads (`roomMembersAs`, `roomMessagesAs`) assert the
 * appservice identity of a PERSONA (`?user_id=@<actorId>:alkemio.matrix.host`)
 * rather than the bot: the bot leaves conversation rooms once members join,
 * so a state read as the bot returns stale state.
 */

const getSynapseUrl = (): string => {
  const url = process.env.HARNESS_SYNAPSE_URL ?? 'http://localhost:8008';
  assertLoopbackInternal('Harness Synapse (HARNESS_SYNAPSE_URL)', { url });
  return url;
};

export const getSynapseAsToken = (): string | undefined =>
  process.env.HARNESS_SYNAPSE_AS_TOKEN;

/** Resolves a room alias (e.g. `#<uuid>:alkemio.matrix.host`) to a room id.
 * Unauthenticated. Returns `undefined` on a 404 (no such alias). */
export const resolveAlias = async (
  alias: string
): Promise<string | undefined> => {
  const response = await axios.get(
    `${getSynapseUrl()}/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`,
    { validateStatus: () => true }
  );
  if (response.status === 404) return undefined;
  if (response.status !== 200) {
    throw new Error(
      `resolveAlias(${alias}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
  return response.data.room_id as string;
};

/** Per-room directory listing visibility. Unauthenticated. */
export const directoryVisibility = async (
  roomId: string
): Promise<'public' | 'private'> => {
  const response = await axios.get(
    `${getSynapseUrl()}/_matrix/client/v3/directory/list/room/${encodeURIComponent(roomId)}`,
    { validateStatus: () => true }
  );
  if (response.status !== 200) {
    throw new Error(
      `directoryVisibility(${roomId}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
  return response.data.visibility as 'public' | 'private';
};

/**
 * Whether `childRoomId` is currently a live `m.space.child` of `spaceRoomId`
 * — `'present'` when the state event exists with a non-empty `via`, else
 * `'absent'` (including a 404, which also means absent). Needs the dev
 * appservice token (H-7).
 */
export const childEdge = async (
  spaceRoomId: string,
  childRoomId: string
): Promise<'present' | 'absent'> => {
  const token = getSynapseAsToken();
  if (!token) {
    throw new Error(
      'childEdge: HARNESS_SYNAPSE_AS_TOKEN is not set — this call needs the dev appservice token.'
    );
  }
  const response = await axios.get(
    `${getSynapseUrl()}/_matrix/client/v3/rooms/${encodeURIComponent(spaceRoomId)}/state/m.space.child/${encodeURIComponent(childRoomId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );
  if (response.status === 404) return 'absent';
  if (response.status !== 200) {
    throw new Error(
      `childEdge(${spaceRoomId}, ${childRoomId}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
  const via = response.data?.via;
  return Array.isArray(via) && via.length > 0 ? 'present' : 'absent';
};

/**
 * The one write this client performs — seeds/reverts a room's public-
 * directory listing. Needs the dev appservice token (H-7).
 */
export const setDirectoryVisibility = async (
  roomId: string,
  visibility: 'public' | 'private'
): Promise<void> => {
  const token = getSynapseAsToken();
  if (!token) {
    throw new Error(
      'setDirectoryVisibility: HARNESS_SYNAPSE_AS_TOKEN is not set — this call needs the dev appservice token.'
    );
  }
  const response = await axios.put(
    `${getSynapseUrl()}/_matrix/client/v3/directory/list/room/${encodeURIComponent(roomId)}`,
    { visibility },
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );
  if (response.status !== 200) {
    throw new Error(
      `setDirectoryVisibility(${roomId}, ${visibility}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
};

const MATRIX_SERVER_NAME = 'alkemio.matrix.host';

/** Matrix user id of an Alkemio actor (adapter `idmapper.UserID`: the actor
 * id is the localpart). */
export const mxid = (actorId: string): string =>
  `@${actorId}:${MATRIX_SERVER_NAME}`;

/** Matrix room alias of an Alkemio room id. Resolve with `resolveAlias`. */
export const roomAlias = (alkemioRoomId: string): string =>
  `#${alkemioRoomId}:${MATRIX_SERVER_NAME}`;

const requireToken = (caller: string): string => {
  const token = getSynapseAsToken();
  if (!token) {
    throw new Error(
      `${caller}: HARNESS_SYNAPSE_AS_TOKEN is not set — this call needs the dev appservice token.`
    );
  }
  return token;
};

export type RoomMember = {
  /** The member's mxid (`m.room.member` state key). */
  stateKey: string;
  membership: string;
  /** Who sent the membership event — the member itself for a self-leave. */
  sender: string;
};

/**
 * `m.room.member` state of a room as seen by `asMxid` (appservice identity
 * assertion). Needs the dev appservice token. Throws on a non-200.
 */
export const roomMembersAs = async (
  roomId: string,
  asMxid: string
): Promise<RoomMember[]> => {
  const token = requireToken('roomMembersAs');
  const response = await axios.get(
    `${getSynapseUrl()}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/members`,
    {
      params: { user_id: asMxid },
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );
  if (response.status !== 200) {
    throw new Error(
      `roomMembersAs(${roomId}, ${asMxid}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
  const chunk = (response.data?.chunk ?? []) as Array<{
    state_key: string;
    sender: string;
    content?: { membership?: string };
  }>;
  return chunk.map(event => ({
    stateKey: event.state_key,
    membership: event.content?.membership ?? '',
    sender: event.sender,
  }));
};

/**
 * The most recent `m.room.message` bodies (newest first, up to 100) visible to
 * `asMxid`. Does NOT throw on a 4xx — the status is an assertion surface (a
 * departed member may be refused with 403). Needs the dev appservice token.
 */
export const roomMessagesAs = async (
  roomId: string,
  asMxid: string
): Promise<{ status: number; bodies: string[] }> => {
  const token = requireToken('roomMessagesAs');
  const response = await axios.get(
    `${getSynapseUrl()}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages`,
    {
      params: { dir: 'b', limit: 100, user_id: asMxid },
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );
  if (response.status >= 500) {
    throw new Error(
      `roomMessagesAs(${roomId}, ${asMxid}): unexpected Synapse status ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
  const chunk = (response.data?.chunk ?? []) as Array<{
    type: string;
    content?: { body?: string };
  }>;
  return {
    status: response.status,
    bodies: chunk
      .filter(event => event.type === 'm.room.message')
      .map(event => event.content?.body ?? ''),
  };
};

/**
 * The second write this client performs — one `m.text` event into `roomId`
 * as `asMxid` (appservice identity assertion). Never throws on a 4xx: the
 * status and `errcode` are the assertion surface. Needs the dev appservice
 * token.
 */
export const sendTextAs = async (
  roomId: string,
  asMxid: string,
  body: string
): Promise<{ status: number; errcode?: string }> => {
  const token = requireToken('sendTextAs');
  const txnId = `harness-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await axios.put(
    `${getSynapseUrl()}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    { msgtype: 'm.text', body },
    {
      params: { user_id: asMxid },
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true,
    }
  );
  return {
    status: response.status,
    errcode: response.data?.errcode as string | undefined,
  };
};
