/**
 * The collaboration service's own count of live in-memory rooms, read from its
 * Prometheus `/metrics` (`collaboration_rooms_active`, an unlabelled gauge in
 * `v0.0.3`). The count is SERVICE-WIDE, not per room: a caller that reads it as
 * "this room is live / released" must also require an idle service (no other
 * room open), and say so.
 */

// Prometheus may print a gauge as `3`, `3.0` or `3e+00`; all read as the same count.
const ROOMS_ACTIVE =
  /^collaboration_rooms_active (\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/m;

/** The `collaboration_rooms_active` value of a `/metrics` exposition; throws when the gauge is absent. */
export const collaborationRoomsActiveOf = (exposition: string): number => {
  const value = ROOMS_ACTIVE.exec(exposition)?.[1];
  if (value === undefined) {
    throw new Error(
      "collaboration metrics carry no collaboration_rooms_active"
    );
  }
  return Number(value);
};

/**
 * Read `collaboration_rooms_active` from the service's `/metrics` URL
 * (e.g. `http://localhost:4006/metrics` on the local stack). A non-2xx answer
 * throws, so a failed read is never a count.
 */
export const readCollaborationRoomsActive = async (
  metricsUrl: string
): Promise<number> => {
  const response = await fetch(metricsUrl);
  if (!response.ok) {
    throw new Error(`collaboration metrics ${metricsUrl}: ${response.status}`);
  }
  return collaborationRoomsActiveOf(await response.text());
};
