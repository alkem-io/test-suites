import { getUserToken, postGraphqlRaw } from '@alkemio/tests-lib';

/**
 * Revokes every ACTIVE MCP API key of `email` whose name starts with one of
 * `prefixes` — the keys a spec minted through the UI. The server allows at
 * most 10 usable keys per user (`MCP_API_KEY_MAX_USABLE_PER_USER`), so a spec
 * that mints and never revokes blocks itself on the second run. Call from
 * `afterAll`; failures are collected and thrown together.
 */
export async function revokeMintedMcpKeys(email: string, prefixes: string[]): Promise<void> {
  const bearerToken = await getUserToken(email);
  const list = await postGraphqlRaw<{ me: { mcpApiKeys: { id: string; name: string; status: string }[] } }>(
    '{ me { mcpApiKeys { id name status } } }',
    { bearerToken }
  );
  if (list.body.errors) throw new Error(`mcpApiKeys read failed: ${JSON.stringify(list.body.errors)}`);
  const mine = (list.body.data?.me.mcpApiKeys ?? []).filter(
    k => k.status === 'ACTIVE' && prefixes.some(p => k.name.startsWith(p))
  );
  const failures: string[] = [];
  for (const key of mine) {
    const res = await postGraphqlRaw(
      'mutation($id: UUID!) { revokeMcpApiKey(revokeData: { keyID: $id }) { id status } }',
      { bearerToken, variables: { id: key.id } }
    );
    if (res.body.errors) failures.push(`${key.name}: ${JSON.stringify(res.body.errors)}`);
  }
  if (failures.length > 0) {
    throw new Error(`could not revoke ${failures.length} minted MCP key(s):\n  ${failures.join('\n  ')}`);
  }
}
