/**
 * Fail-closed guard for the harness's direct-infrastructure primitives —
 * the Redis session store, Postgres, and the BFF session fabricator
 * (`scenario/registration/mint-bff-session.ts`). Unlike the GraphQL/REST
 * endpoints `validateEndpointSchemes` governs (`create-config-using-envvars.ts`),
 * these bypass every application-level authorization check by design: writing
 * directly to the session store or minting a session is equivalent to a
 * universal, unaudited impersonation capability if pointed at anything other
 * than a local/CI compose stack whose `SESSION_SIGNING_KEY` the harness also
 * happens to know. They must therefore REFUSE to operate against a
 * non-loopback target rather than merely warn.
 *
 * The single opt-in escape hatch is `HARNESS_ALLOW_NON_LOOPBACK_INTERNALS=true`,
 * logged loudly every time it is exercised so an override can never happen
 * silently.
 */
export const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

const ALLOW_NON_LOOPBACK_ENV = 'HARNESS_ALLOW_NON_LOOPBACK_INTERNALS';

const isLoopbackHost = (host: string): boolean =>
  LOOPBACK_HOSTS.has(host.replace(/^\[|\]$/g, '').toLowerCase());

const isLoopbackUrl = (url: string): boolean => {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false; // unparseable — not this guard's concern
  }
};

/**
 * Throws unless `target` resolves to loopback. Pass `{ host }` for a bare
 * Redis/Postgres hostname, or `{ url }` for a full endpoint like
 * `ALKEMIO_BASE_URL`.
 */
export const assertLoopbackInternal = (
  label: string,
  target: { host: string } | { url: string }
): void => {
  const resolved = 'host' in target ? target.host : target.url;
  const ok =
    'host' in target ? isLoopbackHost(target.host) : isLoopbackUrl(target.url);
  if (ok) return;

  if (process.env[ALLOW_NON_LOOPBACK_ENV] === 'true') {
    console.warn(
      `[test-suites harness] ${ALLOW_NON_LOOPBACK_ENV}=true — allowing ${label} ` +
        `against non-loopback target '${resolved}'. This is a universal-` +
        'impersonation-capable primitive; only ever point it at a stack you ' +
        'control end to end.'
    );
    return;
  }

  throw new Error(
    `${label} refused: '${resolved}' is not loopback. The harness's direct-` +
      'infrastructure primitives (Redis session store, Postgres, BFF session ' +
      'fabrication) are confined to a local/CI compose stack by default — set ' +
      `${ALLOW_NON_LOOPBACK_ENV}=true to override deliberately.`
  );
};
