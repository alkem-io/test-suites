import { getUserToken, readMyMcpApiKeys, revokeMyMcpApiKey } from '@alkemio/tests-lib';

type McpKey = { id: string; name: string; status: string };

const listMcpKeys = async (email: string): Promise<McpKey[]> => {
  const bearerToken = await getUserToken(email);
  const list = await readMyMcpApiKeys({ bearerToken });
  if (list.error) throw new Error(`mcpApiKeys read failed: ${JSON.stringify(list.error.errors)}`);
  return list.data?.me.mcpApiKeys ?? [];
};

/**
 * The ids of every MCP API key `email` holds right now. Take it in
 * `beforeAll`; `revokeMintedMcpKeys` then leaves these alone, so a key the
 * persona already had (or one another run is using) is never revoked by a
 * spec that did not mint it.
 */
export async function listMcpKeyIds(email: string): Promise<Set<string>> {
  return new Set((await listMcpKeys(email)).map(k => k.id));
}

/**
 * Revokes every ACTIVE MCP API key of `email` that did not exist in
 * `preexisting` and whose name starts with one of `prefixes` — the keys a
 * spec minted through the UI. The server allows at most 10 usable keys per
 * user (`MCP_API_KEY_MAX_USABLE_PER_USER`), so a spec that mints and never
 * revokes blocks itself on the second run. Call from `afterAll`; failures are
 * collected and thrown together.
 */
export async function revokeMintedMcpKeys(
  email: string,
  prefixes: string[],
  preexisting: ReadonlySet<string>
): Promise<void> {
  const bearerToken = await getUserToken(email);
  const mine = (await listMcpKeys(email)).filter(
    k => k.status === 'ACTIVE' && !preexisting.has(k.id) && prefixes.some(p => k.name.startsWith(p))
  );
  const failures: string[] = [];
  for (const key of mine) {
    const res = await revokeMyMcpApiKey(key.id, { bearerToken });
    if (res.error) failures.push(`${key.name}: ${JSON.stringify(res.error.errors)}`);
  }
  if (failures.length > 0) {
    throw new Error(`could not revoke ${failures.length} minted MCP key(s):\n  ${failures.join('\n  ')}`);
  }
}
