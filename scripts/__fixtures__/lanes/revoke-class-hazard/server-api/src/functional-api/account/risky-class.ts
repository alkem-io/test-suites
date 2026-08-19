import { removePlatformRole } from '../../hazard-symbols';

// Mirrors the class-hazard (A) shape, but with a REVOCATION instead of a
// grant — and even with an "already has it" style guard nearby, rule 6
// carries no guard exemption, so this must still be REJECTED.
export class RiskyRevokeClass {
  static async revokeIfPresent(userModel) {
    const alreadyHasRole = userModel.RoleNames.includes('GLOBAL_SUPPORT');
    if (alreadyHasRole) {
      await removePlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
    }
  }
}
