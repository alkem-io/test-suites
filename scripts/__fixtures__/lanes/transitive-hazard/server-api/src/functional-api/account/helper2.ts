import { assignPlatformRole } from '../../hazard-symbols';

export const doEvenRiskierThing = async () => {
  await assignPlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
};
