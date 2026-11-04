/**
 * Decodes a JWT's payload WITHOUT verifying its signature. Only ever used to
 * read claims off a token the harness itself just minted (via
 * `getUserToken`) — never to trust a token presented by anything else.
 *
 * Purpose: the non-interactive-login token's `sub` claim IS the Kratos
 * identity id (`server/src/core/auth/non-interactive-login/non-interactive-login.service.ts`
 * — `.setSubject(identity.id)`), which `mintBffSession` needs and which
 * nothing else in the harness exposes without a Kratos admin-API round trip.
 */
export const decodeJwtPayloadUnsafe = (
  token: string
): Record<string, unknown> => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('decodeJwtPayloadUnsafe: not a JWT (expected 3 dot-separated parts)');
  }
  const json = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
};
