import axios from 'axios';
import { assertLoopbackInternal } from '../config/loopback-guard';

/**
 * Read (and, for exactly one call, write) Matrix/Synapse state directly,
 * for the 061 forum-hierarchy-reconcile cases that need to observe
 * `m.space.child` edges or room-directory visibility — surfaces the
 * GraphQL API does not expose.
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
 * `setDirectoryVisibility` is the only write this client performs, used
 * solely to SEED the pre-fix "published" state in N-12b before proving the
 * sync retracts it.
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
