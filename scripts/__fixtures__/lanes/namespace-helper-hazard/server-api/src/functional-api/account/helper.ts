import * as hz from '../../hazard-symbols';

// The hazard call is reached only through a NAMESPACE import — the old
// `fileImportsName` explicitly excluded namespace edges (`!e.isNamespace`),
// so this helper's declaration was never taint-seeded.
export const doRiskyThing = async () => {
  await hz.assignPlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
};
