/**
 * MIRRORED from `server`'s `src/platform/platform-role/verification/cascade.model.ts + privilege.grants.ts (merged, T007a)`
 * (commit c0a5ab135, workspace#027-platform-role-redesign T040b-T040d).
 *
 * T007a (research D24/D26/D27): this repo holds no independent notion of who
 * owns what — a gap found here is a `server` finding to report, never a local
 * edit to close. `AuthorizationCredential` / `AuthorizationPrivilege` are
 * imported from the codegen'd public schema (both are `registerEnumType`'d
 * server-side, so they are already part of the GraphQL contract) rather than
 * hand-copied, so the two vocabularies cannot independently drift — this is
 * the FR-011-guarded canonical crossing research D27 requires, not a local
 * cast. Member VALUES differ from the server's internal credential/privilege
 * strings (the generated enum's value is the GraphQL enum label, e.g.
 * `AuthorizationCredential.GlobalSpacesReader = "GLOBAL_SPACES_READER"`, not
 * the server's `'global-spaces-read'`) — irrelevant here, since this model
 * only needs internal self-consistent identity for set membership, never a
 * wire-level credential string.
 *
 * Mirror everything else structurally (same ids, same order, same
 * commentary) so a diff against the server file stays a one-line check —
 * `mirror-integrity.it-spec.ts` in this directory guards the census's own
 * documented counts (93 multiplying at stage A / 99 total entries / 21 live rows) so a
 * stale local edit fails loudly even without cross-repo file access at test
 * time (this repo's worktree never reads another repo's tree at runtime).
 */
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

// ============================================================
// Section 1/2 — MIRRORED from server's cascade.model.ts
// ============================================================

/**
 * 027-platform-role-redesign (T040c) — every authorization tree a census
 * surface (`a.row.surfaces.ts`) can be anchored on. Not exhaustive of the
 * whole codebase's authorization trees — only the ones this feature's 21
 * live A-rows actually anchor on, plus `root` for the cascade declaration
 * itself.
 *
 * The seven canonical trees below (`platform` … `virtual-assistant`) are
 * research C3's "seven trees inheriting the root policy" — verified by
 * grepping every call site of
 * `PlatformAuthorizationPolicyService.inheritRootAuthorizationPolicy()`:
 * `platform`, `user`, `organization`, `account`, `space`,
 * `virtual-contributor`, `virtual-assistant`. `forum` / `library` /
 * `templates-manager` / `role-set` / `storage` / `messaging` hang off
 * `platform` itself (research C2) — they inherit the root cascade
 * TRANSITIVELY through `platform`, and are also where the (Slice-A-only)
 * `global-support` platform-subtree cascade lands directly.
 *
 * The remaining entries are trees this feature's census anchors surfaces on
 * that are NOT part of either cascade — most are per-resolver SYNTHETIC
 * policies (a fixed, in-memory `IAuthorizationPolicy` built once in a
 * resolver's constructor from a hardcoded credential list, never persisted,
 * never touched by `authorizationPolicyReset*` — the same shape T034a uses
 * for the FR-022 pin). Declaring them here keeps every census `tree` value
 * meaningful without pretending they participate in the two named cascades.
 */
export type TreeId =
  // The root policy prototype itself — merged into (not a member of) the
  // seven trees below via `inheritRootAuthorizationPolicy()`. Used as the
  // `anchor` for privileges declared directly on the root rule
  // (`PLATFORM_CONTENT_FULL_ACCESS`).
  | 'root'
  // The seven direct root-inheritors (research C3).
  | 'platform'
  | 'user'
  | 'organization'
  | 'account'
  | 'space'
  | 'virtual-contributor'
  | 'virtual-assistant'
  // Hang off `platform` (research C2) — reached by the root cascade only
  // transitively through it, and reached by the `global-support`
  // platform-subtree cascade directly.
  | 'forum'
  | 'library'
  | 'templates-manager'
  | 'role-set'
  | 'storage'
  | 'messaging'
  // Anchored elsewhere in the domain, outside both cascades.
  | 'licensing-framework'
  | 'license-policy'
  | 'ai-server'
  // Per-resolver SYNTHETIC policies — fixed, in-memory, never persisted,
  // never reset. Named per resolver so a reviewer can find the constructor
  // that builds it.
  | 'credential-admin-synthetic' // admin.authorization.resolver.mutations.ts (T034a pin)
  | 'conversion-admin-synthetic' // conversion.resolver.mutations.ts (space/VC move family)
  | 'communication-admin-synthetic'; // admin.communication.resolver.mutations.ts

/**
 * The root policy's replacement rule (T036), added ALONGSIDE the legacy
 * god-mode rule (never narrowing before the replacement exists — the
 * eleventh analyze pass's ordering requirement). Deliberately carries ONLY
 * `READ` and `PLATFORM_CONTENT_FULL_ACCESS` — `CREATE`/`UPDATE`/`DELETE`
 * and `UPDATE_NAMEID` are absent BY DESIGN (privilege-map.md §"The root rule
 * is..."): cascading them would satisfy the owner branch of every
 * `anyOf` dual-path gate (A6, A7, A8) and hand Content Full Access
 * capabilities spec.md row 2 denies it.
 *
 * Reaches the seven direct root-inheritors. `Slice B` (T072) deletes the
 * legacy `global-admin` CRUD+GRANT rule entirely and narrows this rule's
 * credential list to `platform-content-full-access` alone — update THIS
 * declaration in the same commit as that task, so `reachability.spec.ts`
 * (T070m, not built this wave) re-derives against the Slice B shape rather
 * than silently checking the Slice A one forever.
 */
export const ROOT_CASCADE: {
  readonly privileges: readonly AuthorizationPrivilege[];
  readonly trees: readonly TreeId[];
  /** Credentials reaching the cascade in EACH slice — both are declared
   * here (rather than only in `privilege.grants.ts`) because the root rule
   * is a single credential rule whose CREDENTIAL LIST changes shape between
   * slices (Slice A: content-full-access ∪ the two legacy CRUD holders;
   * Slice B: content-full-access alone, T072). */
  readonly credentialsBySlice: {
    readonly A: readonly AuthorizationCredential[];
    readonly B: readonly AuthorizationCredential[];
  };
} = {
  privileges: [
    AuthorizationPrivilege.Read,
    AuthorizationPrivilege.PlatformContentFullAccess,
  ],
  trees: [
    'platform',
    'user',
    'organization',
    'account',
    'space',
    'virtual-contributor',
    'virtual-assistant',
  ],
  credentialsBySlice: {
    A: [
      AuthorizationCredential.PlatformContentFullAccess,
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
    B: [AuthorizationCredential.PlatformContentFullAccess],
  },
};

/**
 * The two legacy cascades that exist ONLY in Slice A — both deleted at
 * Slice B (T072 for the root's CRUD+GRANT half, T073 for the platform
 * subtree), which is why there is no `credentialsBySlice` field here: at
 * Slice B, neither credential reaches anything through EITHER cascade (the
 * rows are dropped outright at T076/T077, not merely narrowed).
 */
export const LEGACY_CASCADES: {
  /** `global-admin`'s root CRUD+GRANT god-mode rule
   * (`platform.authorization.policy.service.ts`, deleted at T072). */
  readonly globalAdminRootCrud: {
    readonly credential: AuthorizationCredential;
    readonly privileges: readonly AuthorizationPrivilege[];
    readonly trees: readonly TreeId[];
  };
  /** `global-support`'s platform-SUBTREE CRUD cascade
   * (`platform.service.authorization.ts`'s `globalSupportPlatformAdmin`
   * rule, deleted at T073). Reaches `platform` itself and everything that
   * hangs off it (research C2) — NOT the other six root-inheritors (user /
   * organization / account / space / virtual-contributor /
   * virtual-assistant), which `global-support` reaches only via the ROOT
   * cascade above, not this one. */
  readonly globalSupportPlatformSubtree: {
    readonly credential: AuthorizationCredential;
    readonly privileges: readonly AuthorizationPrivilege[];
    readonly trees: readonly TreeId[];
  };
} = {
  globalAdminRootCrud: {
    credential: AuthorizationCredential.GlobalAdmin,
    privileges: [
      AuthorizationPrivilege.Create,
      AuthorizationPrivilege.Read,
      AuthorizationPrivilege.Update,
      AuthorizationPrivilege.Delete,
      AuthorizationPrivilege.Grant,
    ],
    trees: [
      'platform',
      'user',
      'organization',
      'account',
      'space',
      'virtual-contributor',
      'virtual-assistant',
    ],
  },
  globalSupportPlatformSubtree: {
    credential: AuthorizationCredential.GlobalSupport,
    privileges: [
      AuthorizationPrivilege.Create,
      AuthorizationPrivilege.Read,
      AuthorizationPrivilege.Update,
      AuthorizationPrivilege.Delete,
    ],
    trees: [
      'platform',
      'forum',
      'library',
      'templates-manager',
      'role-set',
      'storage',
      'messaging',
    ],
  },
};


// ============================================================
// Section 2/2 — MIRRORED from server's privilege.grants.ts
// ============================================================

/**
 * 027-platform-role-redesign (T040c) — the privileges whose GRANT SET this
 * feature's re-anchoring tasks (T034-T040a) write, mirrored as data. This is
 * a DECLARATION of the mechanism, deliberately separate from the code that
 * installs it — the per-policy grant-set specs (T070f, not built this wave)
 * are what prove the declaration matches the credential rules actually
 * written; this file is not itself that proof.
 *
 * `ManagedPrivilege` is a DELIBERATELY HAND-MAINTAINED closed union — unlike
 * `SCANNED_PRIVILEGES` in `surface.drift.spec.ts` (T052a), which MUST be
 * derived from the census, this one is the mirror of a fixed set of
 * authoring tasks (T034-T040a) and has no runtime source to derive it from.
 *
 * It MUST include `GRANT_GLOBAL_ADMINS` even though it is not one of D4's
 * eleven NEW privileges (`authorization.privilege.ts`) — T034 widens its
 * grant set to include `platform-roles-admin`, it gates all six A1 surfaces
 * (the two `*PlatformRole*` mutations plus the four FR-022 credential
 * mutations pinned away from it by T034a), and a union restricted to "this
 * feature's new privileges" is exactly the mistake that left it out of
 * every closed inventory for twelve analyze passes (fifteenth pass, closing
 * C1). Do NOT narrow this back to `D4Privilege | 'GRANT_GLOBAL_ADMINS'` —
 * that is the same hand-appended-union defect at smaller scale.
 *
 * `MOVE_POST` is deliberately ABSENT: `post.service.authorization.ts` grants
 * it to `platform-resource-admin`, but no resolver mutation currently checks
 * it (`post.dto.move.ts` exists with no mutation wired to it) — it is a
 * granted-but-unreachable privilege, not a gate site, so it has no census
 * surface (T040b's A9 resolution) and nothing here to mirror. `UPDATE_NAMEID`
 * is deliberately absent for the SLICE reason T070f documents: Slice A adds
 * only its enum value; its rule and surface arrive at T078 (Slice B).
 */
export type ManagedPrivilege =
  | AuthorizationPrivilege.GrantGlobalAdmins
  | AuthorizationPrivilege.FeatureRoleAssign
  | AuthorizationPrivilege.PlatformRoleHoldersRead
  | AuthorizationPrivilege.FeatureRoleHoldersRead
  | AuthorizationPrivilege.PlatformContentFullAccess
  | AuthorizationPrivilege.PlatformUsersAdmin
  | AuthorizationPrivilege.PlatformSupportOrgResources
  | AuthorizationPrivilege.PlatformForumManage
  | AuthorizationPrivilege.DeleteOrganization
  | AuthorizationPrivilege.PlatformAuditRead
  | AuthorizationPrivilege.SetServiceProfile
  | AuthorizationPrivilege.PlatformSettingsAdmin
  | AuthorizationPrivilege.TransferResourceOffer
  | AuthorizationPrivilege.TransferResourceAccept
  | AuthorizationPrivilege.MoveContribution
  | AuthorizationPrivilege.UpdateCalloutPublisher
  | AuthorizationPrivilege.AccountLicenseManage
  | AuthorizationPrivilege.CreateOrganization
  | AuthorizationPrivilege.AccessVirtualAssistant;

export interface PrivilegeGrant {
  /** Documentation metadata — the authorization tree the credential rule
   * granting this privilege is declared on. NOT consumed by `reachers()`
   * for matching (an explicit grant reaches its surface regardless of the
   * surface's own tree; only CASCADES are tree-scoped) — it exists so a
   * reviewer can find the credential rule without grepping. */
  readonly anchor: TreeId;
  /** Slice B — and Slice A's non-legacy component: the privilege's owning
   * role(s) alone, per `contracts/privilege-map.md`. */
  readonly owningCredentials: readonly AuthorizationCredential[];
  /** Slice A ONLY, additively: legacy credentials that reach the action
   * TODAY, dropped at Slice B (T076/T077). Empty where the privilege is
   * wholly new (no legacy predecessor) — e.g. `FEATURE_ROLE_ASSIGN`. */
  readonly legacyCredentials: readonly AuthorizationCredential[];
}

export const PRIVILEGE_GRANTS: Record<ManagedPrivilege, PrivilegeGrant> = {
  // --- A1 (T034) — GRANT_GLOBAL_ADMINS is pre-existing, re-scoped, not new.
  [AuthorizationPrivilege.GrantGlobalAdmins]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PlatformRolesAdmin],
    legacyCredentials: [AuthorizationCredential.GlobalAdmin],
  },
  // --- A2 (T034) — wholly new privilege, no legacy predecessor.
  [AuthorizationPrivilege.FeatureRoleAssign]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PlatformUsersAdmin,
      AuthorizationCredential.PlatformRolesAdmin,
    ],
    legacyCredentials: [],
  },
  // --- A20 (T034). Legacy reach is via the broad grants FR-007 removes —
  // today's plain READ on the platform role-set, held by every legacy
  // `global-*` credential through the root god-mode rule.
  [AuthorizationPrivilege.PlatformRoleHoldersRead]: {
    anchor: 'role-set',
    owningCredentials: [
      AuthorizationCredential.PlatformRolesAdmin,
      AuthorizationCredential.PlatformAuditReader,
    ],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A20b (T034). NOT granted to Roles Admin / Audit Reader here — they
  // reach the Feature holder lists through PLATFORM_ROLE_HOLDERS_READ by
  // subsumption (research D9), asserted via the gate's `anyOf`, not here.
  [AuthorizationPrivilege.FeatureRoleHoldersRead]: {
    anchor: 'role-set',
    owningCredentials: [AuthorizationCredential.PlatformUsersAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A7/A8's platform-side branch, and the root rule's own replacement
  // grant (T036). `global-support` reaches this too in Slice A, but NOT via
  // this credential rule — via its OWN platform-subtree cascade
  // (`cascade.model.ts`'s `globalSupportPlatformSubtree`), which does not
  // reach the other six root-inheritors. The root rule's own credential
  // list additionally carries `global-admin`/`global-support` directly
  // (`cascade.model.ts`'s `ROOT_CASCADE.credentialsBySlice.A`) — declared
  // there, not duplicated here, since this privilege's reachability is
  // ENTIRELY cascade-carried (no separate non-root grant exists for it).
  [AuthorizationPrivilege.PlatformContentFullAccess]: {
    anchor: 'root',
    owningCredentials: [AuthorizationCredential.PlatformContentFullAccess],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  // --- A4/A5 (T035, T061/T062). Grant set is the UNION of A4's legacy
  // reachers (today's PLATFORM_ADMIN: GA/GS/GLM) and A5's (today's
  // PLATFORM_SETTINGS_ADMIN: adds GLOBAL_PLATFORM_MANAGER).
  [AuthorizationPrivilege.PlatformUsersAdmin]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformUsersAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
      AuthorizationCredential.GlobalPlatformManager,
    ],
  },
  // --- A7 (T037). Wholly new capability (research C2) — the only
  // PLATFORM-side path to it today is the root god-mode grant, which T036
  // does not extend to CREATE/UPDATE/DELETE, so there is no legacy reacher.
  [AuthorizationPrivilege.PlatformSupportOrgResources]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PlatformSupport],
    legacyCredentials: [],
  },
  // --- A15 forum (T035). Mirrors the reach of the `global-support`
  // platform-subtree cascade it replaces (research D4/D6).
  [AuthorizationPrivilege.PlatformForumManage]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformSupport],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  // --- A6 delete half (T039).
  [AuthorizationPrivilege.DeleteOrganization]: {
    anchor: 'organization',
    owningCredentials: [AuthorizationCredential.PlatformSupport],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  // --- A19 (T035). Read-only, held by no other role.
  [AuthorizationPrivilege.PlatformAuditRead]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformAuditReader],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A21 (T035).
  [AuthorizationPrivilege.SetServiceProfile]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformRolesAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A10 (T035/T045) + A13 definition half (T040) share this privilege
  // at two different anchors (`platform` for A10, `licensing-framework` for
  // A13) with slightly different legacy compositions (the licensing-
  // framework rule additionally carries GLOBAL_PLATFORM_MANAGER and omits a
  // direct GLOBAL_ADMIN entry — GLOBAL_ADMIN reaches it there via the root
  // cascade's CRUD instead). `anchor` names the primary (A10) declaration;
  // the licensing-framework rule is `licensing.framework.service.
  // authorization.ts`'s `licensings` credential rule.
  [AuthorizationPrivilege.PlatformSettingsAdmin]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformSettingsAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalPlatformManager,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A9 (T037).
  [AuthorizationPrivilege.TransferResourceOffer]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  [AuthorizationPrivilege.TransferResourceAccept]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  // --- A9 (T038). `callout.contribution.service.authorization.ts` grants
  // it to `platform-resource-admin` directly PLUS whatever credentials the
  // space's own `platformRolesAccess` array carries with UPDATE — the
  // legacy reach is therefore INDIRECT (propagated per-space), not a flat
  // global credential list. `global-admin` is declared here as the
  // practical legacy reacher (it is a member of every space's
  // `platformRolesAccess` today) — a simplification `reachability.spec.ts`
  // (T070m, not built this wave) should re-verify against the live
  // propagation code before relying on it.
  [AuthorizationPrivilege.MoveContribution]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
    legacyCredentials: [AuthorizationCredential.GlobalAdmin],
  },
  // --- A8 publisher surface (T038).
  [AuthorizationPrivilege.UpdateCalloutPublisher]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PlatformContentFullAccess],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
    ],
  },
  // --- A12 usage half (T037/T046).
  [AuthorizationPrivilege.AccountLicenseManage]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PlatformLicenseManager],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  // --- A6 create half (T035). `feature-organization-creator` is an
  // OWNING credential too (spec §Target role model row — both surfaces'
  // create half), kept out of `deleteOrganization`'s reach entirely (its
  // own separate privilege, `DELETE_ORGANIZATION`, above).
  [AuthorizationPrivilege.CreateOrganization]: {
    anchor: 'platform',
    owningCredentials: [
      AuthorizationCredential.PlatformSupport,
      AuthorizationCredential.FeatureOrganizationCreator,
    ],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.BetaTester,
    ],
  },
  // --- No A-row of its own (not one of A1-A21) — included for
  // completeness since T035 re-anchors it additively alongside
  // `ACCESS_VIRTUAL_ASSISTANT`'s pre-existing grant. Not consumed by any
  // census surface this wave.
  [AuthorizationPrivilege.AccessVirtualAssistant]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.FeatureVirtualAssistant],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.AssistantAccess,
    ],
  },
};

/** Slice A: owning ∪ legacy. Slice B: owning alone (T076/T077 drop the
 * legacy credentials from every remaining grant set). The executable form
 * of the additive-grant rule stated throughout `contracts/privilege-map.md`. */
export function grantedCredentials(
  privilege: ManagedPrivilege,
  slice: 'A' | 'B'
): readonly AuthorizationCredential[] {
  const grant = PRIVILEGE_GRANTS[privilege];
  return slice === 'B'
    ? grant.owningCredentials
    : [...grant.owningCredentials, ...grant.legacyCredentials];
}

/** True for any `AuthorizationPrivilege` this file mirrors a grant set for —
 * the type guard `reachability.ts` uses to know whether `PRIVILEGE_GRANTS`
 * has an answer for a given `{requires}`/`{anyOf}` component. */
export function isManagedPrivilege(
  privilege: AuthorizationPrivilege
): privilege is ManagedPrivilege {
  // [test-suites mirror deviation, T007a] server's `Object.hasOwn` (ES2022)
  // has an identical, older-lib-safe equivalent here — this repo's
  // tsconfig lib target predates ES2022. Behaviourally identical.
  return Object.prototype.hasOwnProperty.call(PRIVILEGE_GRANTS, privilege);
}
