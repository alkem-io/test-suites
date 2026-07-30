import {
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { SpaceVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  A_ROW_SURFACES,
  type ARowId,
  type SurfaceRef,
} from './verification/a-row-surfaces.data';
import type { MatrixFixtures } from './fixtures';

/**
 * workspace#027-platform-role-redesign (T007b) — one invocation helper per
 * matrix-eligible census entry (100 at Slice A: 106 declared minus A1's 4
 * `{retiredIn: 'B'}` entries, which generate no cell in either slice, minus
 * A17's 2 `{deferred: 'B'}` entries, which arrive at T022a). **One per
 * entry, not per distinct mutation** — A1's and A2's `assignPlatformRoleToUser`
 * differ only in the role payload, and that payload difference is the whole
 * reason they have different expected outcomes (D22).
 *
 * Every helper is a single API call with a well-formed input and a caller
 * argument, returning `{ok}` or the API error — never throwing. Each MUST
 * reach its surface's authorization gate: an input that fails validation
 * *before* the gate produces a green denial for the wrong reason, which is
 * the one failure mode this suite cannot detect about itself.
 *
 * **Fixture correctness is unverified against a live stack** (Phase V's
 * job; this wave's gates are lint + build only). Built to compile against
 * the real generated SDK and to plausibly reach each gate; some entries
 * (flagged inline) are best-effort placeholders pending a live run —
 * A9's three cross-L0 space moves need a real two-hierarchy space tree this
 * fixture set does not build.
 */
export type InvocationOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly errors: readonly Record<string, unknown>[];
    };

export type SurfaceInvocation = (caller: TestUser) => Promise<InvocationOutcome>;

async function invoke<T>(
  fn: (authToken: string | undefined) => GraphQLReturnType<T>,
  caller: TestUser
): Promise<InvocationOutcome> {
  const result = await graphqlErrorWrapper(fn, caller);
  if (result.error) {
    return { ok: false, errors: result.error.errors };
  }
  return { ok: true };
}

/**
 * sec-test-suites-3 (2026-07-30 fix wave): a DENY cell must fail because the
 * AUTHORIZATION gate rejected it, not because of an unrelated validation or
 * not-found error upstream of that gate — the "green denial for the wrong
 * reason" hazard this suite's own header repeatedly warns about, applied to
 * its OWN negative assertions rather than a fixture bug. The graphql wrapper
 * (`graphql.wrapper.ts`) already flattens each error's Apollo `extensions.code`
 * onto a top-level `code` field — this checks that against the two codes an
 * authorization rejection can carry: `FORBIDDEN` (the rule-engine's plain
 * `ForbiddenException`, e.g. `platform.role.assignment.rules.service.ts`) and
 * `FORBIDDEN_POLICY` (`ForbiddenAuthorizationPolicyException`, every
 * privilege-gate rejection). Mirrors `us3-grantability.forge-acceptance.spec.ts`'s
 * `extensions.code === 'FORBIDDEN'` assertion, generalised to both codes.
 *
 * **Deliberately NOT a broad `code !== undefined` (or `code === 'UNSPECIFIED'`)
 * check** — live-verification (2026-07-30) found `updateUser`'s
 * `serviceProfile` write path (A21) throws a raw, uncaught `Error` from
 * `resolveInitiatorRole` (`platform-audit-attribution/resolve.initiator.role.ts`)
 * for any non-owner caller — a genuine denial, semantically, but surfaced
 * with Apollo's generic fallback `code: 'UNSPECIFIED'` rather than a proper
 * `ForbiddenException`. Accepting `UNSPECIFIED` wholesale would silently
 * re-admit the exact "any error passes" anti-pattern this fix removes (that
 * code is also what an unrelated server crash carries — e.g. a null-pointer
 * in the notification adapter, observed on the SAME live run). Recognising
 * ONLY this specific, self-documented message prefix keeps the net narrow:
 * a genuine (if awkwardly-thrown) authorization denial is still recognised,
 * without opening the door to crashes reading as denials. This is a `server`
 * finding — `resolveInitiatorRole` should throw a `ForbiddenException`, not
 * a raw `Error` — recognised defensively here, not silently masked.
 */
const AUTHORIZATION_DENIAL_CODES: ReadonlySet<string> = new Set([
  'FORBIDDEN',
  'FORBIDDEN_POLICY',
]);

const AUTHORIZATION_DENIAL_MESSAGE_PREFIXES: readonly string[] = [
  'resolveInitiatorRole:',
];

export function isAuthorizationDenial(
  errors: readonly Record<string, unknown>[] | undefined
): boolean {
  return (errors ?? []).some(e => {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && AUTHORIZATION_DENIAL_CODES.has(code)) {
      return true;
    }
    const message = (e as { message?: unknown }).message;
    if (
      typeof message === 'string' &&
      AUTHORIZATION_DENIAL_MESSAGE_PREFIXES.some(prefix =>
        message.startsWith(prefix)
      )
    ) {
      return true;
    }
    const extensions = (e as { extensions?: { code?: unknown } }).extensions;
    return (
      typeof extensions?.code === 'string' &&
      AUTHORIZATION_DENIAL_CODES.has(extensions.code)
    );
  });
}

/**
 * A9's three cross-hierarchy space-move mutations (`moveSpaceL1ToSpaceL0`,
 * `moveSpaceL1ToSpaceL2`, `moveSpaceL2ToSpaceL1`) all return the shared
 * `SpaceData` fragment, which also requests `Space.account` and
 * `Space.templatesManager` — fields gated behind plain Space `READ`, a
 * privilege `PLATFORM_RESOURCE_ADMIN` is deliberately NOT granted (that
 * role only gets `TRANSFER_RESOURCE_OFFER`/`TRANSFER_RESOURCE_ACCEPT`, per
 * `account.service.authorization.ts`). That produces a collateral
 * `FORBIDDEN_POLICY` on those two SUB-fields even when the move privilege
 * itself was correctly granted, entangling this row's ALLOW/DENY assertion
 * with a separate, intentionally-narrower privilege (2026-07-29
 * live-verification finding).
 *
 * The correct fix is a leaner query for these three operations, but that
 * needs regenerating the SDK against a live schema (`lib/codegen.ts`
 * introspects `localhost:3000`) — not available to this fix pass. Until
 * then, this wrapper tolerates ONLY errors on those two named fields and
 * still reports every other error (including a genuine denial of the move
 * mutation itself) as a real failure — it narrows the assertion to the
 * move-privilege gate without touching the shared, widely-used
 * `moveSpaceL1ToSpaceL0.graphql` et al. or `graphql.wrapper.ts`.
 */
const A9_COLLATERAL_READ_FIELDS = ['Space.account', 'Space.templatesManager'] as const;

async function invokeMove<T>(
  fn: (authToken: string | undefined) => GraphQLReturnType<T>,
  caller: TestUser
): Promise<InvocationOutcome> {
  const result = await graphqlErrorWrapper(fn, caller);
  if (!result.error) {
    return { ok: true };
  }
  const nonCollateral = result.error.errors.filter(e => {
    const message = typeof e.message === 'string' ? e.message : '';
    return !A9_COLLATERAL_READ_FIELDS.some(field => message.includes(field));
  });
  if (nonCollateral.length === 0) {
    return { ok: true };
  }
  return { ok: false, errors: nonCollateral };
}

const bearer = (token: string | undefined) => ({
  authorization: `Bearer ${token}`,
});

/** Absent for a normal, currently-live-at-A surface; excludes A1's
 * `{retiredIn: 'B'}` entries (no helper, per T007b) and A17's
 * `{deferred: 'B'}` entries (not live until Slice B / T022a). */
function isHelperEligibleAtStageA(surface: SurfaceRef): boolean {
  const lc = surface.lifecycle;
  if (lc && typeof lc === 'object' && 'retiredIn' in lc) return false;
  if (lc && typeof lc === 'object' && 'deferred' in lc) return false;
  return true;
}

/**
 * Builds the full `SurfaceRef -> SurfaceInvocation` map, keyed by object
 * IDENTITY against `A_ROW_SURFACES`'s own entries (robust to A1/A2 and
 * A20/A20b sharing a resolver — different `SurfaceRef` objects, same
 * `member` string). `registerRow` asserts its invocation list's length
 * against the row's helper-eligible census entries at BUILD time, so an
 * uncorrected census/helper drift fails loudly rather than silently
 * mis-pairing helpers to surfaces.
 */
export function buildSurfaceInvocations(
  fx: MatrixFixtures
): ReadonlyMap<SurfaceRef, SurfaceInvocation> {
  const map = new Map<SurfaceRef, SurfaceInvocation>();
  const client = () => getGraphqlClient();

  function registerRow(row: ARowId, invocations: readonly SurfaceInvocation[]): void {
    const eligible = A_ROW_SURFACES[row].filter(isHelperEligibleAtStageA);
    if (eligible.length !== invocations.length) {
      throw new Error(
        `surface-invocations: row ${row} declares ${eligible.length} helper-eligible census ` +
          `entries but ${invocations.length} invocations were registered here — the mirror ` +
          '(T007a) or this file (T007b) is stale.'
      );
    }
    eligible.forEach((surface, i) => map.set(surface, invocations[i]));
  }

  // ===== A1 — assign/revoke a PLATFORM role (4 helper-eligible; the 4
  // FR-022 credential mutations are `{retiredIn: 'B'}`, no helper) =====
  registerRow('A1', [
    caller =>
      invoke(
        token =>
          client().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.PlatformOperationsAdmin,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removePlatformRoleFromUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.PlatformOperationsAdmin,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // --- Legacy-role branch pin (spec-ts-8) — the SAME two resolver
    // mutations, invoked with a LEGACY (non-rule-engine-governed) role
    // payload so the call actually reaches `legacyGlobalAdminPolicy`
    // (`{credential: GA}`) rather than the rule engine. `RoleName.GlobalAdmin`
    // is not in `RULE_ENGINE_GOVERNED_ROLES`
    // (`platform.role.assignment.rules.service.ts`), so this always lands on
    // the pinned branch. None of the 13 single-role fixtures hold the literal
    // `GLOBAL_ADMIN` credential, so every cell here is a denial in both
    // slices (declared reach = `{GA}` at stage A, `{}` at stage B) and the
    // call never actually mutates `fx.targetUserId` — safe to reuse the
    // shared fixture.
    caller =>
      invoke(
        token =>
          client().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.GlobalAdmin,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removePlatformRoleFromUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.GlobalAdmin,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A2 — assign/revoke a FEATURE role (4) =====
  registerRow('A2', [
    caller =>
      invoke(
        token =>
          client().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.FeatureBetaTester,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removePlatformRoleFromUser(
            {
              roleData: {
                actorID: fx.targetUserId,
                role: RoleName.FeatureBetaTester,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().assignPlatformRoleToOrganization(
            {
              roleData: {
                actorID: fx.secondOrganizationId,
                role: RoleName.FeatureOrganizationCreator,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removePlatformRoleFromOrganization(
            {
              roleData: {
                actorID: fx.secondOrganizationId,
                role: RoleName.FeatureOrganizationCreator,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A3 — authorization / license-entitlement reset (10) =====
  registerRow('A3', [
    caller =>
      invoke(
        token => client().authorizationPolicyResetOnPlatform({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token => client().aiServerAuthorizationPolicyReset({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().authorizationPolicyResetOnUser(
            { authorizationResetData: { userID: fx.targetUserId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().authorizationPolicyResetOnOrganization(
            {
              authorizationResetData: {
                organizationID: fx.organizationId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().authorizationPolicyResetOnAccount(
            {
              authorizationResetData: {
                accountID: fx.organizationAccountId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().licenseResetOnAccount(
            { resetData: { accountID: fx.organizationAccountId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(token => client().authorizationPolicyResetAll({}, bearer(token)), caller),
    caller =>
      invoke(
        token => client().authorizationPlatformRolesAccessReset({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().authorizationPolicyResetToGlobalAdminsAccess(
            { authorizationID: fx.spaceId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(token => client().resetLicenseOnAccounts({}, bearer(token)), caller),
  ]);

  // ===== A4 — change login email (2) =====
  registerRow('A4', [
    // `fx.emailChangeTargetUserId` — a disposable target, NEVER
    // `fx.targetUserId` (the shared `NON_SPACE_MEMBER` fixture 67 other test
    // files depend on). An ALLOW caller here really rewrites the login
    // email; doing that to the shared fixture broke every later file
    // authenticating as it (sec-test-suites-2, 2026-07-29 corrective wave).
    caller =>
      invoke(
        token =>
          client().adminUserEmailChange(
            {
              adminUserEmailChangeData: {
                userID: fx.emailChangeTargetUserId,
                newEmail: `matrix-changed-${Date.now()}@alkem.io`,
                reason: 'platform-roles matrix invocation (T007b)',
                approver: {
                  name: 'Matrix Fixture Approver',
                  role: 'Organization Administrator',
                },
              },
            },
            bearer(token)
          ),
        caller
      ),
    // --- Legacy-admin pin (spec-ts-8) — the SAME `deleteUser` mutation A5
    // exercises for real (against `fx.deletableUserId`), but here declared
    // as A4's `{credential: GA}` pin: its derived reach is `{GA}` at stage A,
    // `{}` at stage B, and none of the 13 single-role fixtures hold the
    // literal `GLOBAL_ADMIN` credential — so every cell is a denial and the
    // real lookup-then-deny never mutates its target. Reuses the shared
    // `fx.targetUserId` (a real, existing user, so the call reaches the
    // authorization gate rather than failing lookup first) — safe because it
    // is never actually deleted here.
    caller =>
      invoke(
        token =>
          client().deleteUser({ deleteData: { ID: fx.targetUserId } }, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminUserEmailChangeDriftResolve(
            {
              adminUserEmailChangeDriftResolveData: {
                userID: fx.emailChangeTargetUserId,
                canonicalEmail: fx.emailChangeTargetUserEmail,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A5 — delete user; reset identity/account (3) =====
  registerRow('A5', [
    // `deleteUser` is the D5 dual path (owner-self-delete vs. PLATFORM_USERS_ADMIN)
    // — invoked here against `fx.deletableUserId`, a disposable single-use
    // target, NEVER `fx.targetUserId`. That shared "generic target user" is
    // the object of A1/A2/A21's mutations too, so an ALLOWED caller
    // actually deleting it would take every one of those cells (and
    // `audit-coverage.it-spec.ts`) down with it for the rest of the run —
    // the 2026-07-29 live-verification finding.
    caller =>
      invoke(
        token =>
          client().deleteUser({ deleteData: { ID: fx.deletableUserId } }, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminIdentityDeleteKratosIdentity(
            { kratosIdentityId: fx.kratosIdentityIdPlaceholder },
            bearer(token)
          ),
        caller
      ),
    // `fx.accountDeleteTargetUserId` — a disposable target, NEVER
    // `fx.targetUserId`: this call deletes the target's Kratos identity
    // outright (sec-test-suites-2).
    caller =>
      invoke(
        token =>
          client().adminUserAccountDelete(
            { userID: fx.accountDeleteTargetUserId },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A6 — create / delete an organization (2) =====
  registerRow('A6', [
    // Every ALLOW caller in this matrix (both `platform-support` and
    // `feature-organization-creator`, per A6's per-surface intent split)
    // invokes this SAME helper against a run-fixed literal displayName —
    // a second run against the same persistent environment collided with
    // the org left over from the first (2026-07-29 live-verification
    // finding). Suffix with a fresh id per CALL, not per fixture build, so
    // repeated invocations within one run never collide with each other
    // either.
    caller =>
      invoke(
        token => {
          const uniqueSuffix = UniqueIDGenerator.getID();
          return client().CreateOrganization(
            {
              organizationData: {
                nameID: `matrix-a6-${uniqueSuffix}`,
                profileData: { displayName: `matrix A6 org ${uniqueSuffix}` },
              },
            },
            bearer(token)
          );
        },
        caller
      ),
    // corr-ts-12: `fx.a6DeletableOrganizationId`, NEVER `fx.secondOrganizationId`
    // — that organization's account hosts `fx.a9TargetSpaceL0Id`, so the
    // server's account-has-resources guard (`organization.service.ts`)
    // always rejects deleting it, and if that guard were ever relaxed the
    // delete would take A9's own transfer/move targets down with it.
    caller =>
      invoke(
        token =>
          client().deleteOrganization(
            { deleteData: { ID: fx.a6DeletableOrganizationId } },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A7 — edit an org-owned pack/hub + CRUD its templates (8) =====
  registerRow('A7', [
    caller =>
      invoke(
        token =>
          client().updateInnovationPack(
            {
              innovationPackData: {
                ID: fx.innovationPackId,
                listedInStore: true,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().updateInnovationHub(
            { updateData: { ID: fx.innovationHubId, listedInStore: true } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().CreateTemplate(
            {
              templatesSetId: fx.templatesSetId,
              profileData: { displayName: `matrix-a7-template-${Date.now()}` },
              type: 'POST' as never,
              postDefaultDescription: 'matrix A7 template',
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().CreateTemplateFromSpace(
            {
              spaceId: fx.spaceId,
              templatesSetId: fx.templatesSetId,
              profileData: { displayName: `matrix-a7-space-tpl-${Date.now()}` },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().createTemplateFromContentSpace(
            {
              templateData: {
                contentSpaceID: fx.spaceId,
                templatesSetID: fx.templatesSetId,
                profileData: { displayName: `matrix-a7-content-tpl-${Date.now()}` },
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().UpdateTemplate(
            {
              profile: { displayName: 'matrix A7 template updated' },
              templateId: fx.templateId,
              postDefaultDescription: 'matrix A7 template updated body',
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().updateTemplateFromSpace(
            {
              updateData: { templateID: fx.templateId, spaceID: fx.spaceId },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().deleteTemplate({ templateId: fx.templateId }, bearer(token)),
        caller
      ),
  ]);

  // ===== A8 — delete callout/contribution/space; delete an org-owned
  // innovation pack or hub; set publisher (6) =====
  // Every destructive helper below targets its OWN disposable fixture —
  // never `secondCalloutId`/`contributionId`/`spaceId`/`innovationPackId`/
  // `innovationHubId`, all of which A7/A9/A12/A13 still need intact after
  // this row runs (corr-ts-1, 2026-07-29 corrective wave: A8's real
  // deletions used to destroy exactly those shared fixtures).
  registerRow('A8', [
    caller =>
      invoke(
        token =>
          client().deleteCallout(
            { calloutId: fx.a8DeletableCalloutId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().deleteContribution(
            { deleteData: { ID: fx.a8DeletableContributionId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().deleteSpace(
            { deleteData: { ID: fx.a8DeletableSpaceId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().deleteInnovationPack(
            { innovationPackId: fx.a8DeletableInnovationPackId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().DeleteInnovationHub(
            { input: { ID: fx.a8DeletableInnovationHubId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().updateCalloutPublishInfo(
            { calloutData: { calloutID: fx.calloutId } },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A9 — move space / hub / pack / VC / callout (13) =====
  // `moveSpaceL1ToSpaceL0` now uses a real two-level tree (`fx.subspaceId`,
  // an actual L1 under `fx.spaceId`) and a genuinely different L0
  // (`fx.a9TargetSpaceL0Id`) — passing the same L0 space for both source
  // and target failed `ValidationException: Only L1 spaces can be moved
  // cross-L0` before authorization was ever exercised (2026-07-29
  // live-verification finding). The other two cross-L0 moves below remain
  // best-effort placeholders pending Phase V's own two-hierarchy fixtures
  // (T007b, this file's header) — a known limitation, not an
  // authorization-model claim.
  registerRow('A9', [
    caller =>
      invokeMove(
        token =>
          client().MoveSpaceL1ToSpaceL0(
            {
              moveData: {
                spaceL1ID: fx.subspaceId,
                targetSpaceL0ID: fx.a9TargetSpaceL0Id,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // corr-ts-18: genuine level-correct source/target pairs, the way
    // `moveSpaceL1ToSpaceL0` above does — `fx.spaceId` for both source and
    // target failed the mutation's own level-check (`Only L1 spaces can be
    // moved…`) before authorization was ever exercised. `a9SecondSubspaceId`
    // (a real L1) moves under `a9L1MoveTargetId` (a different, genuine L1).
    caller =>
      invokeMove(
        token =>
          client().MoveSpaceL1ToSpaceL2(
            {
              moveData: {
                spaceL1ID: fx.a9SecondSubspaceId,
                targetSpaceL1ID: fx.a9L1MoveTargetId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // `a9L2Id` (a real L2, created under `a9SecondSubspaceId`) is promoted
    // to L1 under `a9L1MoveTargetId`.
    caller =>
      invokeMove(
        token =>
          client().MoveSpaceL2ToSpaceL1(
            {
              moveData: {
                spaceL2ID: fx.a9L2Id,
                targetSpaceL1ID: fx.a9L1MoveTargetId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // spec-server-10 fix (corr-ts-20/qual-ts-17 re-sync): the three
    // promote/demote conversions ride the SAME resolver-local synthetic
    // policy as the three cross-L0 moves above — `invokeMove` tolerates the
    // same A9_COLLATERAL_READ_FIELDS plain-READ denial these share via the
    // `SpaceData`-shaped fragment... except these three use a MINIMAL,
    // hand-added selection (no `Space.account`/`Space.templatesManager`), so
    // `invoke` (not `invokeMove`) is correct and sufficient here.
    caller =>
      invoke(
        token =>
          client().ConvertSpaceL1ToSpaceL0(
            { convertData: { spaceL1ID: fx.a9ConvertL1ToL0SourceId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().ConvertSpaceL2ToSpaceL1(
            { convertData: { spaceL2ID: fx.a9ConvertL2ToL1SourceId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().ConvertSpaceL1ToSpaceL2(
            {
              convertData: {
                spaceL1ID: fx.a9ConvertL1ToL2SourceId,
                parentSpaceL1ID: fx.a9ConvertL1ToL2ParentId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // Best-effort placeholder (T007b's own header convention): reuses the
    // shared `virtualContributorId`, built with `bodyOfKnowledgeType: 'NONE'`
    // — this reaches the AUTHORIZATION gate (checked before the domain
    // lookup, `conversion.resolver.mutations.ts`) correctly for every DENY
    // cell, but the ALLOW cell's actual conversion may fail downstream if
    // the VC is not genuinely Space-based. A dedicated space-backed VC
    // fixture is the correct fix, deferred pending Phase V's live run.
    caller =>
      invoke(
        token =>
          client().convertVirtualContributorToUseKnowledgeBase(
            {
              conversionData: { virtualContributorID: fx.virtualContributorId },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().moveContributionToCallout(
            {
              moveContributionData: {
                contributionID: fx.contributionId,
                calloutID: fx.secondCalloutId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    // corr-ts-22 fix: `targetCalloutsSetID` must be a CalloutsSet id — the
    // pre-fix code passed `fx.spaceCollaborationId` (a Collaboration id),
    // which fails `getCalloutsSetOrFail` before either authorization gate
    // runs. `a9TransferCalloutTargetCalloutsSetId` is a genuinely different,
    // real CalloutsSet.
    caller =>
      invoke(
        token =>
          client().transferCallout(
            {
              transferData: {
                calloutID: fx.calloutId,
                targetCalloutsSetID: fx.a9TransferCalloutTargetCalloutsSetId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().transferInnovationHubToAccount(
            {
              transferData: {
                innovationHubID: fx.innovationHubId,
                targetAccountID: fx.secondOrganizationAccountId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().TransferSpaceToAccount(
            {
              transferData: {
                spaceID: fx.spaceId,
                targetAccountID: fx.secondOrganizationAccountId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().TransferInnovationPackToAccount(
            {
              transferData: {
                innovationPackID: fx.innovationPackId,
                targetAccountID: fx.secondOrganizationAccountId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().TransferVirtualContributorToAccount(
            {
              transferData: {
                virtualContributorID: fx.virtualContributorId,
                targetAccountID: fx.secondOrganizationAccountId,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A10 — platform settings / config (6) =====
  registerRow('A10', [
    caller =>
      invoke(
        token =>
          client().updatePlatformSettings(
            { settingsData: {} },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().addIframeAllowedURL(
            { whitelistedURL: 'https://matrix-fixture.example.org' },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removeIframeAllowedURL(
            { whitelistedURL: 'https://matrix-fixture.example.org' },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().addNotificationEmailToBlacklist(
            { input: { email: 'matrix-fixture@example.org' } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().removeNotificationEmailFromBlacklist(
            { input: { email: 'matrix-fixture@example.org' } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().setPlatformWellKnownVirtualContributor(
            {
              mappingData: {
                virtualContributorID: fx.virtualContributorId,
                wellKnown: 'COMMUNITY_MANAGER' as never,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A11 — operational machinery (13) =====
  registerRow('A11', [
    caller => invoke(token => client().cleanupCollections({}, bearer(token)), caller),
    caller =>
      invoke(
        token =>
          client().updateAssistantActorCapabilities(
            {
              grantData: {
                virtualAssistantID: fx.virtualAssistantId,
                enabledCapabilities: [],
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token => client().adminInAppNotificationsPrune({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminUpdateContributorAvatars(
            { profileID: fx.base.organization.profile.id },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(token => client().adminUpdateGeoLocationData({}, bearer(token)), caller),
    caller =>
      invoke(
        token => client().AdminSearchIngestFromScratch({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token => client().adminUploadFilesFromContentToStorageBucket({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(token => client().refreshAllBodiesOfKnowledge({}, bearer(token)), caller),
    caller =>
      invoke(
        token =>
          client().adminCommunicationEnsureAccessToCommunications(
            { communicationData: { communityID: fx.communityId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminCommunicationRemoveOrphanedRoom(
            { orphanedRoomData: { roomID: fx.roomIdPlaceholder } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminCommunicationUpdateRoomState(
            {
              roomStateData: {
                roomID: fx.roomIdPlaceholder,
                isPublic: false,
                isWorldVisible: false,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token => client().adminCommunicationMigrateOrphanedConversations({}, bearer(token)),
        caller
      ),
    caller =>
      invoke(
        token => client().adminCommunicationSyncSpaceHierarchy({}, bearer(token)),
        caller
      ),
  ]);

  // ===== A12 — assign/revoke license plans (6) =====
  registerRow('A12', [
    caller =>
      invoke(
        token =>
          client().createWingbackAccount(
            { accountID: fx.organizationAccountId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().AssignLicensePlanToAccount(
            {
              licensePlanId: fx.licensePlanId,
              accountId: fx.organizationAccountId,
              // corr-ts-13: MUST be the LicensingFramework id, not a
              // LicensePlan id — the server resolves this before the
              // authorization gate (`getLicensingOrFail`), so a plan id
              // here throws EntityNotFound ahead of the gate on every cell.
              licensingId: fx.licensingFrameworkId,
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().AssignLicensePlanToSpace(
            {
              planData: {
                spaceID: fx.spaceId,
                licensePlanID: fx.licensePlanId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().RevokeLicensePlanFromAccount(
            {
              accountId: fx.organizationAccountId,
              licensePlanId: fx.licensePlanId,
              // corr-ts-13: the framework id, not the plan id — see the
              // AssignLicensePlanToAccount helper above.
              licensingId: fx.licensingFrameworkId,
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().RevokeLicensePlanFromSpace(
            {
              planData: {
                spaceID: fx.spaceId,
                licensePlanID: fx.licensePlanId,
                // corr-ts-13: the framework id, not the plan id — see the
                // AssignLicensePlanToAccount helper above.
                licensingID: fx.licensingFrameworkId,
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().updateBaselineLicensePlanOnAccount(
            { updateData: { accountID: fx.organizationAccountId } },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A13 — define license plans + entitlement mappings (5) =====
  // `DeleteLicensePlan`/`UpdateLicensePlan` target the DISPOSABLE plan this
  // fixture set created, never `fx.licensePlanId` — a real, platform-seeded
  // plan A12's assign/revoke helpers (and every OTHER test in this repo) also
  // read (corr-ts-7, 2026-07-29 corrective wave).
  registerRow('A13', [
    caller =>
      invoke(
        token =>
          client().DeleteLicensePlan(
            { LicensePlan: { ID: fx.a13DeletableLicensePlanId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().UpdateLicensePlan(
            { LicensePlan: { ID: fx.a13UpdatableLicensePlanId } },
            bearer(token)
          ),
        caller
      ),
    // corr-ts-23 fix: `ID` must be a LicensePolicy CREDENTIAL RULE id, never
    // `fx.licensePlanId` (a LicensePlan id — a different entity entirely).
    // The resolver's gate passes for the ALLOW caller, then
    // `credentialRules.findIndex` throws `EntityNotFoundException` for any
    // id outside the license policy's own rule list, permanently failing
    // the ALLOW cell regardless of authorization correctness.
    caller =>
      invoke(
        token =>
          client().adminLicensePolicyDeleteCredentialRule(
            { deleteData: { ID: fx.a13DeletableCredentialRuleId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminLicensePolicyUpdateCredentialRule(
            {
              updateData: {
                ID: fx.a13UpdatableCredentialRuleId,
                credentialType: 'FEATURE_BETA_TESTER' as never,
                grantedEntitlements: [],
              },
            },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().adminLicensePolicyCreateCredentialRule(
            {
              createData: {
                name: `matrix-a13-rule-${Date.now()}`,
                credentialType: 'FEATURE_BETA_TESTER' as never,
                grantedEntitlements: [],
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A14 — change space visibility (1) =====
  registerRow('A14', [
    // corr-ts-21 fix: the shared `UpdateSpacePlatformSettings` document
    // always sends `nameID`, which triggers the resolver's SECOND, legacy-
    // credential-only rename gate (`legacySpaceNameIdRenamePolicy`, GA/GS
    // only) ahead of the A14 (`ACCOUNT_LICENSE_MANAGE`) gate under test —
    // `platform-license-manager`'s correct ALLOW was rejected there instead.
    // `UpdateSpaceVisibilityPlatformSettings` omits `nameID` from
    // `updateData` entirely, so the call reaches ONLY the A14 gate.
    caller =>
      invoke(
        token =>
          client().UpdateSpaceVisibilityPlatformSettings(
            {
              spaceId: fx.spaceId,
              visibility: SpaceVisibility.Active,
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A15 — in-space support; manage the forum (3) =====
  registerRow('A15', [
    // The `condition`-gated in-space-support read — probed against
    // `fx.a15ConditionSpaceId`, a PRIVATE space with
    // `settings.privacy.allowPlatformSupportAsAdmin` explicitly set
    // (corr-ts-4, 2026-07-30 fix wave). Previously shared `fx.spaceId` AND
    // the same `spaceReadProbe` query with A16 below — `lookup.space` is
    // gated on READ_ABOUT, which `platform-content-full-access` also
    // reaches via the plain READ->READ_ABOUT mapping regardless of this
    // condition, so the two rows could not be told apart.
    caller =>
      invoke(
        token =>
          client().spaceReadProbe(
            { spaceId: fx.a15ConditionSpaceId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().UpdateDiscussion(
            { updateData: { ID: fx.discussionId } },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().DeleteDiscussion(
            { deleteData: { ID: fx.discussionId } },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A16 — read across spaces (1) =====
  // Probed via `spaceCollaborationReadProbe` (selects `collaboration.id`,
  // gated on plain `READ` — `space.resolver.fields.ts`) against
  // `fx.a16PrivateSpaceId`, a PRIVATE space with no condition set
  // (corr-ts-4). `lookup.space` itself is gated on READ_ABOUT, a STRICTLY
  // WEAKER precondition that `platform-spaces-reader`'s A15 condition (and
  // any READ holder, via the READ->READ_ABOUT mapping) also satisfies — so
  // probing only `lookup.space { id }` could not distinguish "reaches
  // READ_ABOUT" from "reaches READ", which is what THIS row's gate actually
  // requires.
  registerRow('A16', [
    caller =>
      invoke(
        token =>
          client().spaceCollaborationReadProbe(
            { spaceId: fx.a16PrivateSpaceId },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A17 — deferred to Slice B (T022a); 0 helper-eligible entries here =====
  registerRow('A17', []);

  // ===== A19 — read the audit trail (3) =====
  registerRow('A19', [
    // The MCP tool has no GraphQL SDK surface — invoked via the same
    // authenticated GraphQL endpoint is not applicable; this repo drives
    // GraphQL, not the MCP transport, so the tool-call gate itself is
    // exercised through its GraphQL-reachable twin query below where
    // possible. Marked here as a known Phase-V-only surface: MCP tool
    // invocation needs a dedicated client this suite does not yet have.
    async () => ({ ok: false, errors: [{ message: 'MCP client not wired in test-suites (Phase V)' }] }),
    caller =>
      invoke(
        token =>
          client().latestUserEmailChangeAuditEntry(
            { userID: fx.targetUserId },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().userEmailChangeAuditEntries(
            { userID: fx.targetUserId },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A20 — read Platform … holder lists (4) =====
  registerRow('A20', [
    caller =>
      invoke(
        token =>
          client().platformRoleSetUsersInRole(
            { role: RoleName.PlatformRolesAdmin },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetUsersInRoles(
            { roles: [RoleName.PlatformRolesAdmin] },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetOrganizationsInRole(
            { role: RoleName.PlatformSupport },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetOrganizationsInRoles(
            { roles: [RoleName.PlatformSupport] },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A20b — read Feature … holder lists — same 4 resolvers, feature
  // payload (4) =====
  registerRow('A20b', [
    caller =>
      invoke(
        token =>
          client().platformRoleSetUsersInRole(
            { role: RoleName.FeatureBetaTester },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetUsersInRoles(
            { roles: [RoleName.FeatureBetaTester] },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetOrganizationsInRole(
            { role: RoleName.FeatureOrganizationCreator },
            bearer(token)
          ),
        caller
      ),
    caller =>
      invoke(
        token =>
          client().platformRoleSetOrganizationsInRoles(
            { roles: [RoleName.FeatureOrganizationCreator] },
            bearer(token)
          ),
        caller
      ),
  ]);

  // ===== A21 — set/clear user.serviceProfile (1) =====
  // `fx.rolesProbeUserId` — a disposable, per-file-fresh target, NEVER
  // `fx.targetUserId` (corr-ts-8/sec-test-suites-2, 2026-07-30 fix wave):
  // the ALLOW cell here really sets `serviceProfile: true`, and doing that
  // to the shared `NON_SPACE_MEMBER` fixture would silently flip
  // `assignment-rules.it-spec.ts`'s rule-3 denial assertion (which relies
  // on that identity NOT being a service account) for every later run.
  registerRow('A21', [
    caller =>
      invoke(
        token =>
          // `updateUserServiceProfile` — see fixtures.ts / grant-single-
          // role-fixtures.ts for why this is not the heavy `updateUser`:
          // its full `UserData` fragment echoes the target's private
          // `settings`, gated on a privilege the caller need not hold to
          // perform (and here, to have this row's OWN gate exercise)
          // just the serviceProfile write.
          client().updateUserServiceProfile(
            {
              userData: {
                ID: fx.rolesProbeUserId,
                serviceProfile: true,
              },
            },
            bearer(token)
          ),
        caller
      ),
  ]);

  return map;
}

export { TestUserManager };
