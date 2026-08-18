import * as hz from '../../hazard-symbols';

// Revocation reached through a NAMESPACE import, one hop away from the
// manifest file. Must be REJECTED — rule 6 has no guard exemption.
export const doRiskyThing = async () => {
  await hz.removePlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
};
