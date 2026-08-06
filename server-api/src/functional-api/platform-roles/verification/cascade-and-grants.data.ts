/**
 * MIRRORED from `server`'s `src/platform/platform-role/verification/cascade.model.ts + privilege.grants.ts (merged, T007a)`
 * (commit 3c4cacd17, workspace#027-platform-role-redesign T040b-T040d, T070a/T070b/T070m).
 * Re-synced during the corrective wave after a field-by-field diff against
 * server found this mirror's `legacyReachers` stale on several surfaces
 * (T070m corrected them in the SAME parallel wave this mirror was built in
 * — a race, not a judgement error) AND `privilege.grants.ts`'s T070m
 * additions (AUTHORIZATION_RESET/LICENSE_RESET/PLATFORM_OPERATIONS_ADMIN,
 * the bare READ grant, and the whole `TREE_SCOPED_PRIVILEGE_GRANTS`
 * mechanism) never mirrored at all — silently zeroing `reachers()` for
 * A3/A9/A11/A12/A13/A16.
 *
 * THIRD re-sync (corr-ts-27/spec-ts-19/qual-ts-24, against server c7610d6fa):
 * `LEGACY_CASCADES.globalSupportPlatformSubtree.trees` gained
 * `licensing-framework`/`license-policy` (corr-server-12 fix — the mirror had
 * dropped these when the second re-sync landed); `TREE_SCOPED_PRIVILEGE_GRANTS`
 * gained a `platform[PLATFORM_ADMIN]` entry (sec-server-9 fix — A1's two new
 * `grantCredentialToActor`/`revokeCredentialFromActor` surfaces anchor on the
 * `platform` tree and would derive an EMPTY reacher set without it); and A13's
 * three `licensing-framework` CREATE/UPDATE/DELETE grants regained
 * `GLOBAL_SUPPORT` in `legacyCredentials` (corr-server-12 fix, same drop).
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
 * documented counts (107 multiplying at stage A / 113 total entries / 21 live rows) so a
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
  // corr-server-9 fix (corr-ts-20/qual-ts-17 re-sync): `transferCallout`'s
  // TRANSFER_RESOURCE_OFFER/_ACCEPT are checked on the CalloutsSet's OWN
  // authorization (`callouts.set.service.authorization.ts`), a DIFFERENT
  // credential rule — and a different legacy reacher
  // (`global-support-manager`, not `global-support`) — than the `account`
  // tree the other four A9 transfer mutations share
  // (`account.service.authorization.ts`). The two trees cannot share one
  // flat `PRIVILEGE_GRANTS` entry for the same privilege names — split into
  // its own tree-scoped anchor.
  | 'callouts-set'
  // Per-resolver SYNTHETIC policies — fixed, in-memory, never persisted,
  // never reset. Named per resolver so a reviewer can find the constructor
  // that builds it.
  | 'credential-admin-synthetic' // admin.authorization.resolver.mutations.ts (T034a pin)
  | 'conversion-admin-synthetic' // conversion.resolver.mutations.ts (space/VC move family)
  | 'communication-admin-synthetic'; // admin.communication.resolver.mutations.ts

/**
 * The root policy's replacement rule (T036), added ALONGSIDE the legacy
 * god-mode rule (never narrowing before the replacement exists — the
 * eleventh analyze pass's ordering requirement). **Reversed at the ninth
 * `/speckit-analyze` pass** (FR-004/SC-004, spec-server-1 fix): carries full
 * `CREATE`/`READ`/`UPDATE`/`DELETE` plus `PLATFORM_CONTENT_FULL_ACCESS` — a
 * deliberate, signed-off widening that ALSO satisfies the owner branch of
 * A6/A7's `anyOf` dual-path gates (accepted as SC-004's single named
 * exception; see `a-row-surfaces.data.ts`'s A6/A7 `acceptedExtraReachers`).
 * `UPDATE_NAMEID` stays absent BY DESIGN: A17 is owned by NO global role
 * (spec row 2, FR-020), so cascading it would hand Content Full Access
 * entity renames the spec explicitly denies it.
 *
 * Reaches the seven direct root-inheritors. `GLOBAL_SUPPORT` is
 * deliberately NOT a Slice A credential here (sec-server-3/corr-server-2
 * fix): unlike `GLOBAL_ADMIN`, it never held blanket CRUD across these
 * seven trees before this feature — only the platform-SUBTREE cascade
 * (`LEGACY_CASCADES.globalSupportPlatformSubtree` below, which does not
 * reach the other six) and per-space, flag-gated privileges
 * (`allowPlatformSupportAsAdmin`). Adding it here would bypass that
 * per-space consent gate platform-wide.
 *
 * `Slice B` (T072) deletes the legacy `global-admin` CRUD+GRANT rule
 * entirely and narrows this rule's credential list to
 * `platform-content-full-access` alone — update THIS declaration in the
 * same commit as that task, so `reachability.spec.ts` (T070m) re-derives
 * against the Slice B shape rather than silently checking the Slice A one
 * forever.
 */
export const ROOT_CASCADE: {
  readonly privileges: readonly AuthorizationPrivilege[];
  readonly trees: readonly TreeId[];
  /** Credentials reaching the cascade in EACH slice — both are declared
   * here (rather than only in `privilege.grants.ts`) because the root rule
   * is a single credential rule whose CREDENTIAL LIST changes shape between
   * slices (Slice A: content-full-access ∪ global-admin;
   * Slice B: content-full-access alone, T072). */
  readonly credentialsBySlice: {
    readonly A: readonly AuthorizationCredential[];
    readonly B: readonly AuthorizationCredential[];
  };
} = {
  privileges: [
    AuthorizationPrivilege.Create,
    AuthorizationPrivilege.Read,
    AuthorizationPrivilege.Update,
    AuthorizationPrivilege.Delete,
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
  // `licensing-framework` / `license-policy` added (corr-ts-27/spec-ts-19
  // re-sync, corr-server-12 fix): `platform.service.authorization.ts` passes
  // `platform.authorization` as the PARENT of `licensing.authorization`
  // (`inheritParentAuthorization(licensing.authorization,
  // platform.authorization)`), so this cascade DOES reach the licensing
  // tree too — the model previously under-reported it.
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
      'licensing-framework',
      'license-policy',
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
  // TRANSFER_RESOURCE_OFFER/_ACCEPT are DELIBERATELY ABSENT here
  // (corr-server-9 fix, corr-ts-20/qual-ts-17 re-sync): two independent
  // credential rules — `account` (account.service.authorization.ts) and
  // `callouts-set` (callouts.set.service.authorization.ts) — grant these
  // two privileges with DIFFERENT legacy reacher sets (`global-support` vs
  // `global-support-manager`). A flat, tree-independent entry here would
  // apply ONE of those sets to every surface using either privilege
  // regardless of tree — exactly the mistake that let `transferCallout`'s
  // wrong legacy reacher go undetected. Declared per-tree instead, in
  // `TREE_SCOPED_PRIVILEGE_GRANTS` below (`account` and `callouts-set`).
  | AuthorizationPrivilege.MoveContribution
  | AuthorizationPrivilege.UpdateCalloutPublisher
  | AuthorizationPrivilege.AccountLicenseManage
  | AuthorizationPrivilege.CreateOrganization
  | AuthorizationPrivilege.AccessVirtualAssistant
  // --- T070m additions (reachability.spec.ts) — three purpose-built
  // privileges 032 authored (not this feature), but which gate A3/A11's
  // census rows and therefore need a mirror here too, exactly the same
  // "re-scoped/pre-existing but still censused" argument that keeps
  // GRANT_GLOBAL_ADMINS in this union. Slice A does not touch their grant
  // set at all (research: A3/A11 comments); Slice B's owning-alone half is
  // therefore identical to today's `platform-operations-admin` cell, and
  // `owningCredentials` below is what Slice B still reads.
  | AuthorizationPrivilege.AuthorizationReset
  | AuthorizationPrivilege.LicenseReset
  | AuthorizationPrivilege.PlatformOperationsAdmin
  // --- A16's cross-space read (T038). `READ` is normally EXCLUDED as a
  // baseline CRUD verb (like CREATE/UPDATE/DELETE/GRANT below), but A16 is
  // the ONE census row whose gate is a bare `{requires: READ}` naming a
  // rule THIS feature authored (platform-spaces-reader's replacement for
  // the void `global-spaces-reader`) — unlike CREATE/UPDATE/DELETE, no
  // OTHER census `requires`/`anyOf` gate names bare READ, so adding it here
  // cannot leak into an unrelated row the way CREATE/UPDATE/DELETE would.
  | AuthorizationPrivilege.Read;

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
  // grant (T036, reversed at the ninth analyze pass — FR-004/SC-004,
  // spec-server-1 fix). `global-support` deliberately does NOT reach this
  // privilege (sec-server-3/corr-server-2 fix): its reach is (a) its OWN
  // platform-subtree cascade (`cascade-and-grants.data.ts`'s
  // `globalSupportPlatformSubtree`, which does not reach the other six
  // root-inheritors), and (b) per-space, flag-gated privileges — never a
  // blanket grant of THIS privilege. The root rule's own credential list
  // additionally carries `global-admin` directly
  // (`ROOT_CASCADE.credentialsBySlice.A`) — declared there, not duplicated
  // here, since this privilege's reachability is ENTIRELY cascade-carried
  // (no separate non-root grant exists for it).
  [AuthorizationPrivilege.PlatformContentFullAccess]: {
    anchor: 'root',
    owningCredentials: [AuthorizationCredential.PlatformContentFullAccess],
    legacyCredentials: [AuthorizationCredential.GlobalAdmin],
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

  // --- A3/A11 (032, pre-existing) — see the `ManagedPrivilege` doc comment
  // above for why these three are mirrored here despite predating this
  // feature. All three share ONE grant set (research C3): the census's own
  // legacyReachers array is identical across every A3/A11 surface
  // regardless of which of these three literal privileges it checks.
  [AuthorizationPrivilege.AuthorizationReset]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformOperationsAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  [AuthorizationPrivilege.LicenseReset]: {
    anchor: 'account',
    owningCredentials: [AuthorizationCredential.PlatformOperationsAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },
  [AuthorizationPrivilege.PlatformOperationsAdmin]: {
    anchor: 'platform',
    owningCredentials: [AuthorizationCredential.PlatformOperationsAdmin],
    legacyCredentials: [
      AuthorizationCredential.GlobalAdmin,
      AuthorizationCredential.GlobalSupport,
      AuthorizationCredential.GlobalLicenseManager,
    ],
  },

  // --- A16 (T038) — the one bare-READ exception; see the `ManagedPrivilege`
  // doc comment above.
  [AuthorizationPrivilege.Read]: {
    anchor: 'space',
    owningCredentials: [AuthorizationCredential.PlatformSpacesReader],
    legacyCredentials: [AuthorizationCredential.GlobalSpacesReader],
  },
};

/**
 * 027-platform-role-redesign (T070m) — TREE-SCOPED privilege grants, for the
 * three census rows whose literal gate is a baseline CRUD verb (or the
 * legacy `PLATFORM_ADMIN` catch-all) reused far too promiscuously elsewhere
 * in the codebase to add to `ManagedPrivilege` globally (research: A9's
 * cross-L0 moves and A13's own doc comment call these out as "the
 * documented exceptions where the enforced call site's own privilege is a
 * bare CRUD verb rather than this feature's dedicated one"). Adding
 * `CREATE`/`UPDATE`/`DELETE`/`GRANT` globally would make EVERY OTHER
 * `requires`/`anyOf` gate naming them (A6, A7, A8) derive these rows' owners
 * as reachers too — the tree scope is what keeps the derivation precise.
 *
 * `reachers()` consults this ONLY for the surface's own declared `tree`,
 * on top of (never instead of) the global `ManagedPrivilege` check.
 */
export const TREE_SCOPED_PRIVILEGE_GRANTS: {
  readonly [K in TreeId]?: {
    readonly [P in AuthorizationPrivilege]?: PrivilegeGrant;
  };
} = {
  // sec-server-9 fix (corr-ts-27/spec-ts-19 re-sync): `grantCredentialToActor`/
  // `revokeCredentialFromActor` (actor.resolver.mutations.ts, A1) check bare
  // `PLATFORM_ADMIN` on the PLATFORM tree's own authorization — the SAME
  // literal privilege A9's conversion-admin-synthetic resolvers check, but on
  // a DIFFERENT, UNCHANGED credential rule (`platformAdmin` in `platform.
  // service.authorization.ts`): `{global-admin, global-support,
  // global-license-manager}`, cascade:false, no owning role. Scoped to the
  // `platform` tree (not the global `ManagedPrivilege` union) for the same
  // reason A9's PLATFORM_ADMIN grant is tree-scoped — PLATFORM_ADMIN is
  // reused far too promiscuously elsewhere in the codebase (~24 files) to
  // manage as a flat, tree-independent entry.
  platform: {
    [AuthorizationPrivilege.PlatformAdmin]: {
      anchor: 'platform',
      owningCredentials: [],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupport,
        AuthorizationCredential.GlobalLicenseManager,
      ],
    },
  },
  'licensing-framework': {
    // A12 — assign/revoke license plans (admin.licensing.resolver.mutations.ts).
    [AuthorizationPrivilege.Grant]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PlatformLicenseManager],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalLicenseManager,
        AuthorizationCredential.GlobalPlatformManager,
      ],
    },
    // A13 — license-plan / license-policy CRUD, re-anchored (in intent,
    // not in literal gate) onto `platform-settings-admin` (T040).
    // GLOBAL_ADMIN added to each (corr-server-7/corr-server-10 fix,
    // corr-ts-20/qual-ts-17 re-sync); GLOBAL_SUPPORT added (corr-server-12
    // fix, corr-ts-27/spec-ts-19 re-sync — previously dropped here): the
    // five A13 resolvers now check a resolver-local synthetic policy
    // (`GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN`) that grants bare
    // CREATE/UPDATE/DELETE to exactly {platform-settings-admin,
    // global-admin, global-support, global-license-manager,
    // global-platform-manager} — NOT the entity's own (root-cascade-
    // inheriting) authorization, so `platform-content-full-access` no
    // longer reaches these surfaces.
    [AuthorizationPrivilege.Create]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PlatformSettingsAdmin],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupport,
        AuthorizationCredential.GlobalLicenseManager,
        AuthorizationCredential.GlobalPlatformManager,
      ],
    },
    [AuthorizationPrivilege.Update]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PlatformSettingsAdmin],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupport,
        AuthorizationCredential.GlobalLicenseManager,
        AuthorizationCredential.GlobalPlatformManager,
      ],
    },
    [AuthorizationPrivilege.Delete]: {
      anchor: 'licensing-framework',
      owningCredentials: [AuthorizationCredential.PlatformSettingsAdmin],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupport,
        AuthorizationCredential.GlobalLicenseManager,
        AuthorizationCredential.GlobalPlatformManager,
      ],
    },
  },
  'conversion-admin-synthetic': {
    // A9's three cross-L0 moves — the resolver-local synthetic policy
    // (`conversion.resolver.mutations.ts`) checked against the LEGACY
    // `PLATFORM_ADMIN` privilege, not the platform-wide grant set of the
    // same name (they are unrelated despite the shared literal).
    [AuthorizationPrivilege.PlatformAdmin]: {
      anchor: 'conversion-admin-synthetic',
      owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
      legacyCredentials: [AuthorizationCredential.GlobalAdmin],
    },
  },
  // A9 — the four account-tree resource transfers
  // (account.resolver.mutations.ts: transferSpaceToAccount,
  // transferInnovationHubToAccount, transferInnovationPackToAccount,
  // transferVirtualContributorToAccount), gated on the account's own
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule (account.service.authorization.ts).
  // Split out of the flat `PRIVILEGE_GRANTS` (corr-server-9 fix) because
  // `callouts-set` grants the SAME two privileges to a different legacy
  // reacher below.
  account: {
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
  },
  // A9 — `transferCallout`'s OWN authorization tree
  // (callouts.set.service.authorization.ts), whose
  // TRANSFER_RESOURCE_OFFER/_ACCEPT rule grants
  // [GLOBAL_ADMIN, GLOBAL_SUPPORT_MANAGER, PLATFORM_RESOURCE_ADMIN] — NOT
  // GLOBAL_SUPPORT (corr-server-9 fix: GLOBAL_SUPPORT_MANAGER is the ONLY
  // legacy credential that reaches this surface; the account-tree grants
  // above that DO include GLOBAL_SUPPORT are cascade:false and never reach
  // the callouts-set).
  'callouts-set': {
    [AuthorizationPrivilege.TransferResourceOffer]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupportManager,
      ],
    },
    [AuthorizationPrivilege.TransferResourceAccept]: {
      anchor: 'callouts-set',
      owningCredentials: [AuthorizationCredential.PlatformResourceAdmin],
      legacyCredentials: [
        AuthorizationCredential.GlobalAdmin,
        AuthorizationCredential.GlobalSupportManager,
      ],
    },
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
