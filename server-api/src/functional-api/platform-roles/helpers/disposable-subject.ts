import { getUserToken, UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';

/**
 * workspace#027-platform-role-redesign — a throwaway subject that can READ AS
 * ITSELF.
 *
 * Neither existing option works for group B:
 *
 *  * `fixtures.rolesProbeUserId` is made with a bare `createUser()` — an
 *    Alkemio row with no Kratos identity and therefore no auth token. It can
 *    be the TARGET of a grant but never the CALLER, which is why every
 *    existing grant assertion reads the GRANTER's holder list instead of the
 *    subject's own `myRoles`.
 *  * `TestUser.NON_SPACE_MEMBER` can authenticate, but it is shared by 68+
 *    spec files, several of which assert it is DENIED things. Granting a
 *    platform role onto it reds unrelated suites for the duration.
 *
 * So: mint a real, verified, disposable identity per test. The registration
 * call is the exact one `fixtures.ts` makes for its `emailChangeTargetUserId`
 * (fixtures.ts:579) — `registerVerifiedUser`, not `createUser`.
 */

export type DisposableSubject = {
  id: string;
  email: string;
  token: string;
};

export const createDisposableSubject = async (
  prefix: string
): Promise<DisposableSubject> => {
  const runId = UniqueIDGenerator.getID();
  const email = `${prefix}-${runId}@alkem.io`;

  // First/last name are alphanumeric only: Kratos rejects the punctuation a
  // prefix may carry, and the failure surfaces as a registration flow error
  // rather than anything about names.
  const id = await registerVerifiedUser(
    email,
    `dispsubj${runId}`,
    `target${runId}`
  );
  const token = await getUserToken(email);

  return { id, email, token };
};

/**
 * Best-effort teardown. Swallowed deliberately: a subject that could not be
 * deleted is a leaked row on a dev stack, whereas a throwing `afterAll` masks
 * the assertion failure that is the actual result of the run.
 */
export const destroyDisposableSubject = async (id: string): Promise<void> => {
  try {
    // `deleteUser`'s default actor is TestUser.GLOBAL_ADMIN.
    await deleteUser(id);
  } catch {
    // intentionally ignored — see above.
  }
};
