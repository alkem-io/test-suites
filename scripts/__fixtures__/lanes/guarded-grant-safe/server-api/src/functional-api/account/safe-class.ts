import { assignPlatformRole } from '../../hazard-symbols';

// Mirrors the REAL TestScenarioFactory.checkAndAssignRoleNameToUser shape:
// an exported class whose static method grants a platform role to a shared
// user, guarded by an already-has-it check read from the user model's own
// cached role list. This is the convergent-setup case — concurrent,
// identical, idempotent grants converge to the same end state, and no
// file's verdict depends on another file NOT having granted yet — so it
// must NOT trip rule 2.
export class SafeGrantClass {
  static async grantIfMissing(userModel) {
    const alreadyHasRole = userModel.RoleNames.includes('GLOBAL_SUPPORT');
    if (!alreadyHasRole) {
      await assignPlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
    }
  }
}
