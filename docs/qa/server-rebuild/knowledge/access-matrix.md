# Access matrix — who may do what, on which resource, by which path

_Generated 2026-10-29 by `knowledge/_tools/access/gen_access_matrix.py` from `alkem-io/server` `origin/develop` @ `eeecf9ddb`. The rules are derived from the `*.service.authorization.ts` builders (transcribed in `_tools/access/model.py`, every rule with its file:line) and evaluated with a re-implementation of the server's engine; nothing here is read from stored `authorization_policy` rows. The companion `access-matrix.json` carries every cell; `access-matrix-crosscheck.md` compares this derivation with the acceptance data and the two decision-table suites._

## How to read a table

Rows are actor roles, columns are the privileges the resource type can carry, a cell is `·` (not granted) or the **path** by which the privilege is granted:

| mark | path |
|---|---|
| D | direct: a rule appended on this resource matched the actor's own credential |
| C | cascade: the matching rule was appended on an ancestor resource and inherited (`cascade: true`) |
| P | parent credential: the matched criterion is an ancestor space's credential (`parentCredentials` of the role, e.g. the L0 admin on an L1) |
| X | derived credential: `space-subspace-admin`, issued to subspace admins on the parent |
| T | type-only criterion: a platform role or a global credential (anonymous / guest / registered) |
| S | the rule exists only under a settings variant (named in the JSON path) |
| R | privilege rule: granted by mapping from another privilege the actor holds (one hop, never cascades) |
| ? | data-dependent criterion (e.g. the spaces a user is member of); modelled on one representative |

Marks combine (`CP` = inherited rule matched through a parent credential). The main table of each type shows the canonical resource under the **base variant** `pub-open` (every level public / open, no flags); the blocks after it list only the cells that change under every other variant and on every other resource of the same type. Variants that produce an identical table are listed as equivalent. Resource names carry the level (`@L0`, `@L1`, `@L2`) and the path inside the entity tree.

## Actor roles

| role | credentials held | note |
|---|---|---|
| anonymous | global-anonymous |  |
| guest | global-guest |  |
| registered | global-registered, user-self@OTHER, account-admin@OTHERACC | a signed-in user with no role on the resource (holds global-registered, user-self on itself, account-admin on its own account) |
| platform-roles-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-roles-admin |  |
| platform-content-full-access | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-content-full-access |  |
| platform-resource-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-resource-admin |  |
| platform-settings-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-settings-admin |  |
| platform-operations-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-operations-admin |  |
| platform-users-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-users-admin |  |
| platform-support | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-support |  |
| platform-license-manager | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-license-manager |  |
| platform-spaces-reader | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-spaces-reader |  |
| platform-audit-reader | global-registered, user-self@OTHER, account-admin@OTHERACC, platform-audit-reader |  |
| feature-beta-tester | global-registered, user-self@OTHER, account-admin@OTHERACC, feature-beta-tester |  |
| feature-virtual-assistant | global-registered, user-self@OTHER, account-admin@OTHERACC, feature-virtual-assistant |  |
| feature-organization-creator | global-registered, user-self@OTHER, account-admin@OTHERACC, feature-organization-creator |  |
| feature-vc-campaign | global-registered, user-self@OTHER, account-admin@OTHERACC, feature-vc-campaign |  |
| account-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, account-admin@ACC | owner/admin of the account hosting the space tree (a user host, or the owners/admins of the hosting organisation) |
| organization-owner | global-registered, user-self@OTHER, account-admin@OTHERACC, organization-owner@ORG, organization-associate@ORG, account-admin@ORGACC |  |
| organization-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, organization-admin@ORG, organization-associate@ORG, account-admin@ORGACC |  |
| organization-associate | global-registered, user-self@OTHER, account-admin@OTHERACC, organization-associate@ORG |  |
| space-member@L0 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0 |  |
| space-lead@L0 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-lead@L0 |  |
| space-admin@L0 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-admin@L0 |  |
| space-invitee@L0 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-invitee@L0 |  |
| space-member@L1 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1 |  |
| space-lead@L1 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1, space-lead@L1 |  |
| space-admin@L1 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1, space-admin@L1, space-subspace-admin@L0 |  |
| space-invitee@L1 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-invitee@L1 |  |
| space-member@L2 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1, space-member@L2 |  |
| space-lead@L2 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1, space-member@L2, space-lead@L2 |  |
| space-admin@L2 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-member@L1, space-member@L2, space-admin@L2, space-subspace-admin@L1 |  |
| space-invitee@L2 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-invitee@L2 |  |
| subspace-admin-derived@L0 | global-registered, user-self@OTHER, account-admin@OTHERACC, space-member@L0, space-subspace-admin@L0 | holds only the derived space-subspace-admin credential of L0 (what every L1 admin is given on the parent) plus L0 membership |
| creator-member@L1 | global-registered, user-self@CREATOR, account-admin@CREATORACC, space-member@L0, space-member@L1 | the user who created the content (createdBy), still an L1 member |
| creator-former-member | global-registered, user-self@CREATOR, account-admin@CREATORACC | the user who created the content, no longer a member anywhere |
| virtual-contributor-member@L1 | space-member@L0, space-member@L1 | a VC assigned member on L0 and L1; VCs hold no global-registered credential |
| vc-account-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, account-admin@VCACC | admin of the account that owns the virtual contributor |
| user-self | global-registered, user-self@U, account-admin@UACC | the user whose own user/profile/settings are the resource |
| applicant | global-registered, user-self@APPLICANT, account-admin@APPLICANTACC | the user who submitted the application |
| invited-actor-account-admin | global-registered, user-self@OTHER, account-admin@OTHERACC, account-admin@INVITEEACC | the account admin of the invited actor (a user is admin of its own account) |
| user-group-member | global-registered, user-self@OTHER, account-admin@OTHERACC, user-group-member@GROUP |  |

`L0`/`L1`/`L2` are the three levels of one space tree hosted by account `ACC`; `ORG` is an organisation (account `ORGACC`); `U` the user whose own record is the resource; `CREATOR` the user that created the content. Admins and leads also hold the member credential (entry role), subspace members also hold the parent memberships, subspace admins also hold the derived `space-subspace-admin` of the parent.

## Settings variants

| id | settings |
|---|---|
| pub-open | all three levels public / open, every flag off — `L0=public/open; L1=public/open; L2=public/open; account=organization` |
| priv-applications | all three levels private / applications, every flag off (the L0 server default) — `L0=private/applications; L1=private/applications; L2=private/applications; account=organization` |
| defaults | server defaults: L0 private / applications / subspace-admins-invite; subspaces public / open / inherit / members-create — `L0=private/applications+subadmins_invite; L1=public/open+inherit+m_callouts+m_subspaces; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| t-pub-pub | storage-suite shape: L0 public/applications; L1 public/open with inherit on, members-create off; L2 subspace defaults — `L0=public/applications; L1=public/open+inherit; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| t-pub-priv | storage-suite shape: L0 public; L1 PRIVATE/open with inherit on; L2 subspace defaults — `L0=public/applications; L1=private/open+inherit; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| t-priv-pub | storage-suite shape: L0 PRIVATE; L1 public/open with inherit on; L2 subspace defaults — `L0=private/applications; L1=public/open+inherit; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| t-priv-priv | storage-suite shape: L0 PRIVATE; L1 PRIVATE/open with inherit on; L2 subspace defaults — `L0=private/applications; L1=private/open+inherit; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| pub-open+support | pub-open with allowPlatformSupportAsAdmin on the L0 — `L0=public/open+support; L1=public/open; L2=public/open; account=organization` |
| priv-applications+support | priv-applications with allowPlatformSupportAsAdmin on the L0, user-hosted account (the A15 twin) — `L0=private/applications+support; L1=private/applications; L2=private/applications; account=user` |
| pub-open+members | pub-open with allowMembersToCreateCallouts, allowMembersToCreateSubspaces and inheritMembershipRights on every level — `L0=public/open+m_callouts+m_subspaces; L1=public/open+inherit+m_callouts+m_subspaces; L2=public/open+inherit+m_callouts+m_subspaces; account=organization` |
| pub-applications | all public with membership policy applications — `L0=public/applications; L1=public/applications; L2=public/applications; account=organization` |
| pub-invitations | all public with membership policy invitations — `L0=public/invitations; L1=public/invitations; L2=public/invitations; account=organization` |
| combined-apply | L0 private/applications; L1 public/applications with allowSubspaceAdminsToInviteMembers; L2 public/applications (the combined apply path) — `L0=private/applications+subadmins_invite; L1=public/applications+subadmins_invite; L2=public/applications; account=organization` |
| pub-open+guests | pub-open with allowGuestContributions on every level and guest access enabled on the whiteboard — `L0=public/open+guests; L1=public/open+guests; L2=public/open+guests; account=organization` |
| archived | L0 archived (public/open), subspaces public/open — `L0=public/open/archived; L1=public/open; L2=public/open; account=organization` |
| trusted-org | pub-open with ORG in the L0 trustedOrganizations — `L0=public/open+trusted_org; L1=public/open; L2=public/open; account=organization` |
| L0pub-L1pub-L2priv | L0 and L1 public/open, L2 private/applications — `L0=public/open; L1=public/open; L2=private/applications; account=organization` |
| user-hosted | pub-open on a user-hosted account (no platform-support-org-resources cascade) — `L0=public/open; L1=public/open; L2=public/open; account=user` |

## Constants the rules depend on (rebaseline candidates)

| constant | value today | source |
|---|---|---|
| space role `member` | credential `space-member`; entry role required: false; same role in parent required: false; caps: user 0..∞, organization 0..∞, virtualContributor 0..∞ | role definitions |
| space role `lead` | credential `space-lead`; entry role required: true; same role in parent required: false; caps: user 0..2, organization 0..2, virtualContributor 0..1 | role definitions |
| space role `admin` | credential `space-admin`; entry role required: true; same role in parent required: false; caps: user 0..∞, organization 0..0, virtualContributor 0..0 | role definitions |
| subspace role `member` | credential `space-member`; entry role required: false; same role in parent required: true; caps: user 0..∞, organization 0..∞, virtualContributor 0..∞ | role definitions |
| subspace role `lead` | credential `space-lead`; entry role required: true; same role in parent required: false; caps: user 0..2, organization 0..9, virtualContributor 0..1 | role definitions |
| subspace role `admin` | credential `space-admin`; entry role required: true; same role in parent required: false; caps: user 0..∞, organization 0..0, virtualContributor 0..0 | role definitions |
| organization role `associate` | credential `organization-associate`; entry role required: false; same role in parent required: false; caps: user 0..∞, organization 0..0, virtualContributor 0..0 | role definitions |
| organization role `admin` | credential `organization-admin`; entry role required: true; same role in parent required: false; caps: organization 0..0, virtualContributor 0..0 | role definitions |
| organization role `owner` | credential `organization-owner`; entry role required: true; same role in parent required: false; caps: user 1..3, organization 0..0, virtualContributor 0..0 | role definitions |
| default settings of a new L0 space | privacy.mode=private; privacy.allowPlatformSupportAsAdmin=false; membership.policy=applications; membership.allowSubspaceAdminsToInviteMembers=true; collaboration.inheritMembershipRights=false; collaboration.allowMembersToCreateSubspaces=false; collaboration.allowMembersToCreateCallouts=false; collaboration.allowGuestContributions=false | bootstrap space templates |
| default settings of a new subspace space | privacy.mode=public; privacy.allowPlatformSupportAsAdmin=false; membership.policy=open; membership.allowSubspaceAdminsToInviteMembers=false; collaboration.inheritMembershipRights=true; collaboration.allowMembersToCreateSubspaces=true; collaboration.allowMembersToCreateCallouts=true; collaboration.allowGuestContributions=false | bootstrap space templates |
| platform roles | feature-beta-tester, feature-organization-creator, feature-vc-campaign, feature-virtual-assistant, platform-audit-reader, platform-content-full-access, platform-license-manager, platform-operations-admin, platform-resource-admin, platform-roles-admin, platform-settings-admin, platform-spaces-reader, platform-support, platform-users-admin | AuthorizationCredential |
| privileges | 69 values (see `access-matrix.json#serverEnums.privileges`) | AuthorizationPrivilege |
| draft callout readers | the space admins (with parents) and the creator; no platform credential is hard-coded any more | callout.platform.read.credentials.ts |
| callout publisher change | platform-content-full-access, platform-resource-admin | callout.platform.read.credentials.ts |
| platform-admin notification recipients | roles-admin (role changed), users-admin (email change, profile created/removed), support + license-manager (space created) | platform.admin.notification.routing.ts |
| whiteboard guest privileges | read, update-content, contribute for global-guest and global-registered, only when guest contributions are on and the whiteboard toggle is set | whiteboard.guest-access.service.ts |

## Tables per resource type

### platform

Canonical resource: `platform` under `pub-open`. Resources of this type in the matrix: `platform`.

| role | access-interactive-guidance | access-virtual-assistant | authorization-reset | create | create-organization | delete | pf:audit-read | pf:content-full-access | pf:forum-manage | pf:licensing-lists-read | pf:operations-admin | pf:settings-admin | pf:support-lists-read | pf:users-admin | read | read-users | notif-admin | notif-organization-admin | notif-space-admin | notif-space-lead | set-service-profile | update |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| registered | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| platform-roles-admin | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | DT | · | · | · | DT | · |
| platform-content-full-access | DT | · | · | CT | · | CT | · | CT | · | · | · | · | · | · | CT | DT | · | · | · | · | · | CT |
| platform-resource-admin | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| platform-settings-admin | DT | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | DT | · | · | · | · | · | · |
| platform-operations-admin | DT | · | DT | · | · | · | · | · | · | · | DT | · | · | · | · | DT | · | · | · | · | · | · |
| platform-users-admin | DT | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | DT | DT | · | · | · | · | · |
| platform-support | DT | · | · | · | DT | · | · | · | DT | · | · | · | DT | · | · | DT | DT | · | · | · | · | · |
| platform-license-manager | DT | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | DT | DT | · | · | · | · | · |
| platform-spaces-reader | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| platform-audit-reader | DT | · | · | · | · | · | DT | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| feature-beta-tester | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| feature-virtual-assistant | DT | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| feature-organization-creator | DT | · | · | · | DT | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| feature-vc-campaign | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |
| organization-admin | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | DT | · | · | · | · |
| space-admin@L0 | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | DT | · | · | · |
| space-lead@L0 | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | DT | · | · |
| user-self | DT | · | · | · | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### role-set

Canonical resource: `role-set@L1` under `pub-open`. Resources of this type in the matrix: `platform/role-set`, `organization/role-set`, `role-set@L0`, `role-set@L1`, `role-set@L2`.

| role | community-assign-vc-from-account | create | delete | grant | pf:content-full-access | read | entry:apply | entry:assign | entry:invite | entry:join | update |
|---|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · | · | · | · | · |
| guest | · | · | · | · | · | CTS | · | · | · | · | · |
| registered | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-roles-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | · | · | · | · | CT |
| platform-resource-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-settings-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-operations-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-users-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-support | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-license-manager | · | · | · | · | · | CTS | · | · | · | · | · |
| platform-spaces-reader | · | · | · | · | · | CT | · | · | · | · | · |
| platform-audit-reader | · | · | · | · | · | CTS | · | · | · | · | · |
| feature-beta-tester | · | · | · | · | · | CTS | · | · | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · | · | · | · | · |
| feature-organization-creator | · | · | · | · | · | CTS | · | · | · | · | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · | · | · | · | · |
| account-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| organization-associate | · | · | · | · | · | CTS | · | · | · | · | · |
| space-member@L0 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-lead@L0 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-admin@L0 | DP | C | C | C | · | CTS | · | DP | DP | DPS | C |
| space-invitee@L0 | · | · | · | · | · | CTS | · | · | · | · | · |
| space-member@L1 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-lead@L1 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-admin@L1 | D | C | C | C | · | CTS | · | D | D | DPS | C |
| space-invitee@L1 | · | · | · | · | · | CTS | · | · | · | · | · |
| space-member@L2 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-lead@L2 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-admin@L2 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · | · | · | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| creator-member@L1 | · | · | · | · | · | CTS | · | · | · | DPS | · |
| creator-former-member | · | · | · | · | · | CTS | · | · | · | · | · |
| virtual-contributor-member@L1 | · | · | · | · | · | C | · | · | · | DPS | · |
| applicant | · | · | · | · | · | CTS | · | · | · | · | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · | · | · | · | · |
| user-group-member | · | · | · | · | · | CTS | · | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more; + roleset-entry-role-apply (direct|parent-credential|settings:membership=applications|credentialRule-subspaceParentMemberApply) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more
- **defaults**: − read for anonymous, guest
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more
- **pub-open+support**: + community-assign-vc-from-account (direct|type-only|credentialRuleTypes-roleSetEntryRoleInvite) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + roleset-entry-role-assign (direct|type-only|credentialRule-roleSetAssign) for platform-support; + roleset-entry-role-invite (direct|type-only|credentialRuleTypes-roleSetEntryRoleInvite) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 20 more; + community-assign-vc-from-account (direct|type-only|credentialRuleTypes-roleSetEntryRoleInvite) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + roleset-entry-role-assign (direct|type-only|credentialRule-roleSetAssign) for platform-support; + roleset-entry-role-invite (direct|type-only|credentialRuleTypes-roleSetEntryRoleInvite) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + roleset-entry-role-apply (direct|parent-credential|settings:membership=applications|credentialRule-subspaceParentMemberApply) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more
- **pub-applications**: + roleset-entry-role-apply (direct|parent-credential|settings:membership=applications|credentialRule-subspaceParentMemberApply) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more
- **pub-invitations**: − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more
- **combined-apply**: − read for anonymous, guest; + roleset-entry-role-apply (direct|parent-credential|settings:membership=applications|credentialRule-subspaceParentMemberApply) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + community-assign-vc-from-account (direct|derived-credential|settings:allowSubspaceAdminsToInviteMembers|credentialRuleTypes-roleSetEntryRoleInvite) for space-admin@L2; + roleset-entry-role-invite (direct|derived-credential|settings:allowSubspaceAdminsToInviteMembers|credentialRuleTypes-roleSetEntryRoleInvite) for space-admin@L2
- t-pub-pub, pub-open+members, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-priv-pub, archived: identical to defaults
- t-priv-priv: identical to t-pub-priv

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `platform/role-set` (carries also: feature-role-assign, feature-role-holders-read, platform-forum-manage, platform-role-holders-read, platform-roles-assign) (never carries: community-assign-vc-from-account, grant, roleset-entry-role-apply, roleset-entry-role-assign, roleset-entry-role-join): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; + feature-role-assign (direct|type-only|credentialRuleTypes-featureRoleAssign) for platform-roles-admin, platform-users-admin; + platform-role-holders-read (direct|type-only|credentialRuleTypes-platformRoleHoldersRead) for platform-roles-admin, platform-audit-reader; + platform-roles-assign (direct|type-only|credentialRuleTypes-platformRolesAssign) for platform-roles-admin; + feature-role-holders-read (direct|type-only|credentialRuleTypes-featureRoleHoldersRead) for platform-users-admin; + platform-forum-manage (cascade(platform)|type-only|credentialRuleTypes-platformForumManage) for platform-support; − community-assign-vc-from-account for space-admin@L0; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; − roleset-entry-role-assign for space-admin@L0; − roleset-entry-role-invite for space-admin@L0; − roleset-entry-role-join for space-admin@L0, space-lead@L0; − update for space-admin@L0
- `organization/role-set` (carries also: platform-support-org-membership, receive-notifications-admin, update-nameid) (never carries: community-assign-vc-from-account, roleset-entry-role-join): − read for anonymous, guest; + roleset-entry-role-apply (direct|type-only|credentialRuleTypes-organizationRoleSetApply) for registered, platform-roles-admin, platform-content-full-access, platform-resource-admin, platform-settings-admin and 17 more; + platform-support-org-membership (direct|type-only|credentialRuleTypes-organizationRoleSetPlatformSupportMembership) for platform-support; + roleset-entry-role-invite (direct|type-only|credentialRuleTypes-organizationRoleSetPlatformSupportInvite) for platform-support; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + roleset-entry-role-assign (direct|credentialRule-organizationAdmin) for organization-owner, organization-admin; + roleset-entry-role-invite (privilege-rule(roleset-entry-role-assign->roleset-entry-role-invite)|policyRule-communityInvite) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `role-set@L0` (never carries: roleset-entry-role-assign): + roleset-entry-role-join (direct|type-only|settings:membership=open|credentialRuleTypes-roleSetJoinGlobalRegistered) for registered, platform-roles-admin, platform-content-full-access, platform-resource-admin, platform-settings-admin and 19 more; − roleset-entry-role-assign for space-admin@L0, space-admin@L1; − community-assign-vc-from-account for space-admin@L1; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − roleset-entry-role-invite for space-admin@L1; − update for space-admin@L1; − roleset-entry-role-join for virtual-contributor-member@L1
- `role-set@L2`: − roleset-entry-role-join for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + community-assign-vc-from-account (direct|credentialRuleTypes-roleSetEntryRoleInvite) for space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + roleset-entry-role-assign (direct|credentialRule-roleSetAssign) for space-admin@L2; + roleset-entry-role-invite (direct|credentialRuleTypes-roleSetEntryRoleInvite) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### library

Canonical resource: `library` under `pub-open`. Resources of this type in the matrix: `library`.

| role | create | delete | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | DT | · |
| guest | · | · | · | · | · | · |
| registered | · | · | · | · | DT | · |
| platform-roles-admin | · | · | · | · | DT | · |
| platform-content-full-access | CT | CT | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | DT | · |
| platform-settings-admin | · | · | · | · | DT | · |
| platform-operations-admin | · | · | · | · | DT | · |
| platform-users-admin | · | · | · | · | DT | · |
| platform-support | · | · | · | CT | DT | · |
| platform-license-manager | · | · | · | · | DT | · |
| platform-spaces-reader | · | · | · | · | DT | · |
| platform-audit-reader | · | · | · | · | DT | · |
| feature-beta-tester | · | · | · | · | DT | · |
| feature-virtual-assistant | · | · | · | · | DT | · |
| feature-organization-creator | · | · | · | · | DT | · |
| feature-vc-campaign | · | · | · | · | DT | · |
| organization-admin | · | · | · | · | DT | · |
| space-admin@L0 | · | · | · | · | DT | · |
| space-lead@L0 | · | · | · | · | DT | · |
| user-self | · | · | · | · | DT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### template

Canonical resource: `platform/template` under `pub-open`. Resources of this type in the matrix: `platform/template`, `innovation-pack/template`, `template@L0`.

| role | create | delete | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · |
| guest | · | · | · | · | · | · |
| registered | · | · | · | · | · | · |
| platform-roles-admin | · | · | · | · | · | · |
| platform-content-full-access | CT | CT | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | · | · |
| platform-settings-admin | · | · | · | · | · | · |
| platform-operations-admin | · | · | · | · | · | · |
| platform-users-admin | · | · | · | · | · | · |
| platform-support | · | · | · | CT | · | · |
| platform-license-manager | · | · | · | · | · | · |
| platform-spaces-reader | · | · | · | · | · | · |
| platform-audit-reader | · | · | · | · | · | · |
| feature-beta-tester | · | · | · | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | · |
| feature-organization-creator | · | · | · | · | · | · |
| feature-vc-campaign | · | · | · | · | · | · |
| organization-admin | · | · | · | · | · | · |
| space-admin@L0 | · | · | · | · | · | · |
| space-lead@L0 | · | · | · | · | · | · |
| user-self | · | · | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `innovation-pack/template` (carries also: grant, platform-support-org-resources) (never carries: platform-forum-manage): + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 15 more; − platform-forum-manage for platform-support; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin
- `template@L0` (carries also: grant) (never carries: platform-forum-manage): + read (cascade(space@L0)|type-only|settings:privacy=public|Public spaces content is visible to all) for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 30 more; − platform-forum-manage for platform-support; + read (cascade(space@L0)|type-only|credentialRuleTypes-spaceGlobalRead) for platform-spaces-reader; + create (cascade(space@L0)|credentialRule-spaceAdmins) for space-admin@L0; + delete (cascade(space@L0)|credentialRule-spaceAdmins) for space-admin@L0; + grant (cascade(space@L0)|credentialRule-spaceAdmins) for space-admin@L0; + update (cascade(space@L0)|credentialRule-spaceAdmins) for space-admin@L0; + read (cascade(space@L0)|credentialRule-spaceMembersRead) for virtual-contributor-member@L1

### profile

Canonical resource: `callout@L1/framing/profile` under `pub-open`. Resources of this type in the matrix: `platform/template/profile`, `account/profile`, `innovation-pack/profile`, `innovation-pack/template/profile`, `innovation-hub/profile`, `virtual-contributor[public]/profile`, `virtual-contributor[public]/knowledge-base/profile`, `virtual-contributor[public,kb-visible]/profile`, `virtual-contributor[public,kb-visible]/knowledge-base/profile`, `virtual-contributor[account]/profile`, `virtual-contributor[account]/knowledge-base/profile`, `virtual-contributor[hidden]/profile`, `virtual-contributor[hidden]/knowledge-base/profile`, `user/profile`, `organization/profile`, `callout@L0/framing/profile`, `callout@L0/contribution[post]/post/profile`, `space-about@L0/profile`, `space-profile@L0`, `callout@L1/framing/profile`, `callout@L1/contribution[post]/post/profile`, `space-about@L1/profile`, `space-profile@L1`, `callout@L2/framing/profile`, `callout@L2/contribution[post]/post/profile`, `space-about@L2/profile`, `space-profile@L2`, `template@L0/profile`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | CTS | · |
| space-member@L1 | C | · | · | · | · | CTS | · |
| space-lead@L1 | C | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | CTS | · |
| space-member@L2 | C | · | · | · | · | CTS | · |
| space-lead@L2 | C | · | · | · | · | CTS | · |
| space-admin@L2 | C | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · |
| creator-member@L1 | C | C | C | · | · | CTS | C |
| creator-former-member | · | C | C | · | · | CTS | C |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · |
| applicant | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `platform/template/profile` (carries also: file-upload, platform-forum-manage) (never carries: contribute, grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; + platform-forum-manage (cascade(platform)|type-only|credentialRuleTypes-platformForumManage) for platform-support; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; − update for space-admin@L0
- `account/profile` (carries also: platform-support-org-resources) (never carries: contribute, grant): − read for guest; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `innovation-pack/profile` (carries also: file-upload, platform-support-org-resources) (never carries: contribute): − read for guest; + create (privilege-rule(platform-support-org-resources->create)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + file-upload (privilege-rule(platform-support-org-resources->file-upload)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + update (privilege-rule(platform-support-org-resources->update)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `innovation-pack/template/profile` (carries also: file-upload, platform-support-org-resources) (never carries: contribute): − read for guest; + create (privilege-rule(platform-support-org-resources->create)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + file-upload (privilege-rule(platform-support-org-resources->file-upload)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + update (privilege-rule(platform-support-org-resources->update)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `innovation-hub/profile` (carries also: file-upload, platform-support-org-resources) (never carries: contribute): − read for guest; + create (privilege-rule(platform-support-org-resources->create)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + file-upload (privilege-rule(platform-support-org-resources->file-upload)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + update (privilege-rule(platform-support-org-resources->update)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[public]/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[public]/knowledge-base/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[public,kb-visible]/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[public,kb-visible]/knowledge-base/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[account]/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[account]/knowledge-base/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 12 more; + contribute (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[hidden]/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for guest; + contribute (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `virtual-contributor[hidden]/knowledge-base/profile` (carries also: receive-notifications, update-nameid) (never carries: grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 14 more; + contribute (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + delete (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `user/profile` (carries also: read-user-pii, read-user-settings, update-nameid) (never carries: contribute, grant): − read for guest; + read-user-pii (cascade(user)|type-only|credentialRule-userReadPii) for platform-users-admin; + read-user-settings (cascade(user)|type-only|credentialRule-userRead) for platform-users-admin; + create (cascade(user)|credentialRule-userSelfAdmin) for user-self; + delete (cascade(user)|credentialRule-userSelfAdmin) for user-self; + read (cascade(user)|type-only|credentialRuleTypes-userReadGlobalRegistered) for user-self, organization-admin; + read-user-pii (cascade(user)|credentialRule-userReadPii) for user-self; + update (cascade(user)|credentialRule-userSelfAdmin) for user-self; + update-nameid (cascade(user)|credentialRule-userSelfAdmin) for user-self; − create for space-admin@L0, creator-former-member; − delete for space-admin@L0, creator-former-member; − grant for space-admin@L0; + read-user-pii (cascade(user)|data-dependent|credentialRule-userReadPii) for space-admin@L0, organization-admin; − update for space-admin@L0, creator-former-member
- `organization/profile` (carries also: receive-notifications-admin, update-nameid) (never carries: contribute): − read for guest; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; − create for creator-former-member; − delete for creator-former-member; − update for creator-former-member
- `callout@L0/framing/profile`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[post]/post/profile`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-about@L0/profile` (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; − create for space-admin@L1, creator-member@L1, creator-former-member; − delete for space-admin@L1, creator-member@L1, creator-former-member; − grant for space-admin@L1; − update for space-admin@L1, creator-member@L1, creator-former-member
- `space-profile@L0` (carries also: file-upload) (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; − create for space-admin@L1, creator-member@L1, creator-former-member; − delete for space-admin@L1, creator-member@L1, creator-former-member; − grant for space-admin@L1; − update for space-admin@L1, creator-member@L1, creator-former-member
- `callout@L1/contribution[post]/post/profile`: same cells as the canonical resource
- `space-about@L1/profile` (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `space-profile@L1` (carries also: file-upload) (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `callout@L2/framing/profile`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[post]/post/profile`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `space-about@L2/profile` (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `space-profile@L2` (carries also: file-upload) (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `template@L0/profile` (carries also: file-upload) (never carries: contribute): − contribute for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; − create for space-admin@L1, creator-member@L1, creator-former-member; − delete for space-admin@L1, creator-member@L1, creator-former-member; − grant for space-admin@L1; − update for space-admin@L1, creator-member@L1, creator-former-member

### forum

Canonical resource: `forum` under `pub-open`. Resources of this type in the matrix: `forum`.

| role | contribute | create | create-discussion | delete | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | DT | · |
| guest | · | · | · | · | · | · | · | · |
| registered | DT | · | DT | · | · | · | DT | · |
| platform-roles-admin | DT | · | DT | · | · | · | DT | · |
| platform-content-full-access | DT | CT | DT | CT | CT | · | CT | CT |
| platform-resource-admin | DT | · | DT | · | · | · | DT | · |
| platform-settings-admin | DT | · | DT | · | · | · | DT | · |
| platform-operations-admin | DT | · | DT | · | · | · | DT | · |
| platform-users-admin | DT | · | DT | · | · | · | DT | · |
| platform-support | DT | · | DT | · | · | CT | DT | · |
| platform-license-manager | DT | · | DT | · | · | · | DT | · |
| platform-spaces-reader | DT | · | DT | · | · | · | DT | · |
| platform-audit-reader | DT | · | DT | · | · | · | DT | · |
| feature-beta-tester | DT | · | DT | · | · | · | DT | · |
| feature-virtual-assistant | DT | · | DT | · | · | · | DT | · |
| feature-organization-creator | DT | · | DT | · | · | · | DT | · |
| feature-vc-campaign | DT | · | DT | · | · | · | DT | · |
| organization-admin | DT | · | DT | · | · | · | DT | · |
| space-admin@L0 | DT | · | DT | · | · | · | DT | · |
| space-lead@L0 | DT | · | DT | · | · | · | DT | · |
| user-self | DT | · | DT | · | · | · | DT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### discussion

Canonical resource: `discussion[public]` under `pub-open`. Resources of this type in the matrix: `discussion[public]`, `discussion[authenticated]`.

| role | contribute | create | create-discussion | delete | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CT | · |
| guest | · | · | · | · | · | · | · | · |
| registered | CT | · | CT | · | · | · | CT | · |
| platform-roles-admin | CT | · | CT | · | · | · | CT | · |
| platform-content-full-access | CT | CT | CT | CT | CT | · | CT | CT |
| platform-resource-admin | CT | · | CT | · | · | · | CT | · |
| platform-settings-admin | CT | · | CT | · | · | · | CT | · |
| platform-operations-admin | CT | · | CT | · | · | · | CT | · |
| platform-users-admin | CT | · | CT | · | · | · | CT | · |
| platform-support | CT | · | CT | · | · | CT | CT | DT |
| platform-license-manager | CT | · | CT | · | · | · | CT | · |
| platform-spaces-reader | CT | · | CT | · | · | · | CT | · |
| platform-audit-reader | CT | · | CT | · | · | · | CT | · |
| feature-beta-tester | CT | · | CT | · | · | · | CT | · |
| feature-virtual-assistant | CT | · | CT | · | · | · | CT | · |
| feature-organization-creator | CT | · | CT | · | · | · | CT | · |
| feature-vc-campaign | CT | · | CT | · | · | · | CT | · |
| organization-admin | CT | · | CT | · | · | · | CT | · |
| space-admin@L0 | CT | · | CT | · | · | · | CT | · |
| space-lead@L0 | CT | · | CT | · | · | · | CT | · |
| user-self | CT | · | CT | · | · | · | CT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `discussion[authenticated]`: same cells as the canonical resource

### room

Canonical resource: `communication@L1/updates` under `pub-open`. Resources of this type in the matrix: `discussion[public]/comments`, `conversation/room`, `communication@L0/updates`, `callout@L0/comments`, `callout@L0/contribution[post]/post/comments`, `calendar-event@L0/comments`, `communication@L1/updates`, `callout@L1/comments`, `callout@L1/contribution[post]/post/comments`, `calendar-event@L1/comments`, `communication@L2/updates`, `callout@L2/comments`, `callout@L2/contribution[post]/post/comments`, `calendar-event@L2/comments`.

| role | create | create-message | create-message-reaction | create-message-reply | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | · | · | CTS | · |
| platform-content-full-access | CT | R | R | R | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | · | · | CTS | · |
| space-admin@L0 | C | R | R | R | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | · | · | · | CTS | · |
| space-admin@L1 | C | R | R | R | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | · | · | · | C | · |
| applicant | · | · | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for platform-support; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for platform-support; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for platform-support; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for platform-support; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `discussion[public]/comments` (carries also: contribute, create-discussion, platform-forum-manage) (never carries: grant): − read for guest; + contribute (cascade(forum)|type-only|credentialRuleTypes-forumContribute) for registered, platform-roles-admin, platform-content-full-access, platform-resource-admin, platform-settings-admin and 14 more; + create-discussion (cascade(forum)|type-only|credentialRuleTypes-forumRead) for registered, platform-roles-admin, platform-content-full-access, platform-resource-admin, platform-settings-admin and 14 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for registered, platform-roles-admin, platform-resource-admin, platform-settings-admin, platform-operations-admin and 12 more; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for registered, platform-roles-admin, platform-resource-admin, platform-settings-admin, platform-operations-admin and 12 more; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for registered, platform-roles-admin, platform-resource-admin, platform-settings-admin, platform-operations-admin and 12 more; + platform-forum-manage (cascade(platform)|type-only|credentialRuleTypes-platformForumManage) for platform-support; + read (cascade(forum)|type-only|credentialRuleTypes-forumRead) for organization-admin, user-self; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; − update for space-admin@L0
- `conversation/room` (carries also: contribute) (never carries: create, delete, grant, platform-content-full-access, update): − read for anonymous, guest, registered, platform-roles-admin, platform-content-full-access and 14 more; − create for platform-content-full-access, space-admin@L0; − create-message for platform-content-full-access, space-admin@L0; − create-message-reaction for platform-content-full-access, space-admin@L0; − create-message-reply for platform-content-full-access, space-admin@L0; − delete for platform-content-full-access, space-admin@L0; − platform-content-full-access for platform-content-full-access; − update for platform-content-full-access, space-admin@L0; − grant for space-admin@L0; + contribute (cascade(conversation)|Communication Conversation Participants Access (Membership-based)) for user-self; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for user-self; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for user-self; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for user-self; + read (cascade(conversation)|Communication Conversation Participants Access (Membership-based)) for user-self
- `communication@L0/updates`: − create for space-admin@L1; − create-message for space-admin@L1; − create-message-reaction for space-admin@L1; − create-message-reply for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/comments` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L0/contribution[post]/post/comments` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `calendar-event@L0/comments` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L1/comments` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L1/contribution[post]/post/comments` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `calendar-event@L1/comments` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2 and 2 more; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2 and 2 more; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2 and 2 more
- `communication@L2/updates`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for space-admin@L2; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for space-admin@L2; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/comments` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L2/contribution[post]/post/comments` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for space-admin@L2, creator-member@L1, creator-former-member; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `calendar-event@L2/comments` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create-message (privilege-rule(contribute->create-message)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reaction (privilege-rule(contribute->create-message-reaction)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create-message-reply (privilege-rule(contribute->create-message-reply)|policyRule-roomContribute) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create-message (privilege-rule(create->create-message)|policyRule-roomAdminsCreate) for space-admin@L2; + create-message-reaction (privilege-rule(create->create-message-reaction)|policyRule-roomAdminsCreate) for space-admin@L2; + create-message-reply (privilege-rule(create->create-message-reply)|policyRule-roomAdminsCreate) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### storage-bucket

Canonical resource: `storage-aggregator@L1/bucket` under `pub-open`. Resources of this type in the matrix: `platform/storage-aggregator/bucket`, `account/storage-aggregator/bucket`, `innovation-pack/profile/bucket`, `user/profile/bucket`, `organization/profile/bucket`, `storage-aggregator@L0/bucket`, `callout[whiteboard-framing]@L0/framing/whiteboard/profile/bucket`, `callout@L0/framing/profile/bucket`, `callout@L0/contribution[post]/post/profile/bucket`, `callout@L0/contribution[whiteboard]/whiteboard[contributors]/profile/bucket`, `callout@L0/contribution[link]/link/profile/bucket`, `space-about@L0/profile/bucket`, `space-profile@L0/bucket`, `storage-aggregator@L1/bucket`, `callout[whiteboard-framing]@L1/framing/whiteboard/profile/bucket`, `callout@L1/framing/profile/bucket`, `callout@L1/contribution[post]/post/profile/bucket`, `callout@L1/contribution[whiteboard]/whiteboard[contributors]/profile/bucket`, `callout@L1/contribution[link]/link/profile/bucket`, `space-about@L1/profile/bucket`, `space-profile@L1/bucket`, `storage-aggregator@L2/bucket`, `callout[whiteboard-framing]@L2/framing/whiteboard/profile/bucket`, `callout@L2/framing/profile/bucket`, `callout@L2/contribution[post]/post/profile/bucket`, `callout@L2/contribution[whiteboard]/whiteboard[contributors]/profile/bucket`, `callout@L2/contribution[link]/link/profile/bucket`, `space-about@L2/profile/bucket`, `space-profile@L2/bucket`.

| role | create | delete | file-delete | file-upload | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | R | R | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | R | R | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | R | R | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | · | · | C | · |
| applicant | · | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for platform-support; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for guest; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for platform-support; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- defaults, t-pub-priv, t-priv-pub, t-priv-priv, combined-apply, archived: identical to priv-applications
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `platform/storage-aggregator/bucket` (carries also: platform-forum-manage) (never carries: grant): − read for guest; + file-upload (cascade(platform/storage)|type-only|credentialRuleTypes-platformFileUploadAnyUser) for registered, platform-roles-admin, platform-resource-admin, platform-settings-admin, platform-operations-admin and 12 more; + platform-forum-manage (cascade(platform)|type-only|credentialRuleTypes-platformForumManage) for platform-support; + read (cascade(platform/storage)|type-only|credentialRuleTypes-platformFileUploadAnyUser) for organization-admin, user-self; − create for space-admin@L0; − delete for space-admin@L0; − file-delete for space-admin@L0; − grant for space-admin@L0; − update for space-admin@L0
- `account/storage-aggregator/bucket` (carries also: platform-support-org-resources) (never carries: grant): − read for guest; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for account-admin; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin
- `innovation-pack/profile/bucket` (carries also: platform-support-org-resources): − read for guest; + create (privilege-rule(platform-support-org-resources->create)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + file-upload (privilege-rule(platform-support-org-resources->file-upload)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + update (privilege-rule(platform-support-org-resources->update)|policyRule-platformSupportOrgResourcesProfileEdit) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for account-admin; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin
- `user/profile/bucket` (carries also: read-user-pii, read-user-settings, update-nameid) (never carries: grant): − read for guest; + read-user-pii (cascade(user)|type-only|credentialRule-userReadPii) for platform-users-admin; + read-user-settings (cascade(user)|type-only|credentialRule-userRead) for platform-users-admin; + create (cascade(user)|credentialRule-userSelfAdmin) for user-self; + delete (cascade(user)|credentialRule-userSelfAdmin) for user-self; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for user-self; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for user-self; + read (cascade(user)|type-only|credentialRuleTypes-userReadGlobalRegistered) for user-self, organization-admin; + read-user-pii (cascade(user)|credentialRule-userReadPii) for user-self; + update (cascade(user)|credentialRule-userSelfAdmin) for user-self; + update-nameid (cascade(user)|credentialRule-userSelfAdmin) for user-self; − create for space-admin@L0; − delete for space-admin@L0; − file-delete for space-admin@L0; − file-upload for space-admin@L0; − grant for space-admin@L0; + read-user-pii (cascade(user)|data-dependent|credentialRule-userReadPii) for space-admin@L0, organization-admin; − update for space-admin@L0
- `organization/profile/bucket` (carries also: receive-notifications-admin, update-nameid): − read for guest; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for organization-owner, organization-admin; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `storage-aggregator@L0/bucket`: − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − file-upload for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[whiteboard-framing]@L0/framing/whiteboard/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout[whiteboard-framing]@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout[whiteboard-framing]@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout[whiteboard-framing]@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout[whiteboard-framing]@L0/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout[whiteboard-framing]@L0/framing/whiteboard)|whiteboard-created-by) for creator-former-member
- `callout@L0/framing/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L0/contribution[post]/post/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L0/contribution[whiteboard]/whiteboard[contributors]/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout@L0/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout@L0/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-former-member
- `callout@L0/contribution[link]/link/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 4 more; − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + create (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L0)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `space-about@L0/profile/bucket`: − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − file-upload for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-profile@L0/bucket`: − create for space-admin@L1; − delete for space-admin@L1; − file-delete for space-admin@L1; − file-upload for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[whiteboard-framing]@L1/framing/whiteboard/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout[whiteboard-framing]@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout[whiteboard-framing]@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout[whiteboard-framing]@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout[whiteboard-framing]@L1/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout[whiteboard-framing]@L1/framing/whiteboard)|whiteboard-created-by) for creator-former-member
- `callout@L1/framing/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L1/contribution[post]/post/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L1/contribution[whiteboard]/whiteboard[contributors]/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout@L1/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout@L1/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-former-member
- `callout@L1/contribution[link]/link/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1; + create (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for creator-member@L1, creator-former-member; + update (cascade(callout@L1)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `space-about@L1/profile/bucket`: same cells as the canonical resource
- `space-profile@L1/bucket`: same cells as the canonical resource
- `storage-aggregator@L2/bucket`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout[whiteboard-framing]@L2/framing/whiteboard/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2, creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2, creator-member@L1, creator-former-member; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + contribute (cascade(callout[whiteboard-framing]@L2/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + create (cascade(callout[whiteboard-framing]@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout[whiteboard-framing]@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout[whiteboard-framing]@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout[whiteboard-framing]@L2/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member
- `callout@L2/framing/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2, creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2, creator-member@L1, creator-former-member; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L2/contribution[post]/post/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2, creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2, creator-member@L1, creator-former-member; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `callout@L2/contribution[whiteboard]/whiteboard[contributors]/profile/bucket` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2, creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2, creator-member@L1, creator-former-member; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + contribute (cascade(callout@L2/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update-content (cascade(callout@L2/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member
- `callout@L2/contribution[link]/link/profile/bucket` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + file-upload (privilege-rule(contribute->file-upload)|policyRule-storageBucketContributorFileUpload) for space-member@L2, space-lead@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2, creator-member@L1, creator-former-member; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2, creator-member@L1, creator-former-member; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + delete (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member; + update (cascade(callout@L2)|credentialRule-calloutCreatedBy) for creator-member@L1, creator-former-member
- `space-about@L2/profile/bucket`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `space-profile@L2/bucket`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + file-delete (privilege-rule(delete->file-delete)|policyRule-platformDelete) for space-admin@L2; + file-upload (privilege-rule(update->file-upload)|policyRule-storageBucketUpdaterFileUpload) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### document

Canonical resource: `storage-aggregator@L1/bucket/document` under `pub-open`. Resources of this type in the matrix: `platform/storage-aggregator/bucket/document`, `conversation/storage-aggregator/bucket/document`, `account/storage-aggregator/bucket/document`, `user/profile/bucket/document`, `user/storage-aggregator/bucket/document`, `organization/profile/bucket/document`, `organization/storage-aggregator/bucket/document`, `storage-aggregator@L0/bucket/document`, `callout[whiteboard-framing]@L0/framing/whiteboard/profile/bucket/document`, `callout@L0/framing/profile/bucket/document`, `callout@L0/contribution[post]/post/profile/bucket/document`, `callout@L0/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document`, `callout@L0/contribution[link]/link/profile/bucket/document`, `space-about@L0/profile/bucket/document`, `space-profile@L0/bucket/document`, `storage-aggregator@L1/bucket/document`, `callout[whiteboard-framing]@L1/framing/whiteboard/profile/bucket/document`, `callout@L1/framing/profile/bucket/document`, `callout@L1/contribution[post]/post/profile/bucket/document`, `callout@L1/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document`, `callout@L1/contribution[link]/link/profile/bucket/document`, `space-about@L1/profile/bucket/document`, `space-profile@L1/bucket/document`, `storage-aggregator@L2/bucket/document`, `callout[whiteboard-framing]@L2/framing/whiteboard/profile/bucket/document`, `callout@L2/framing/profile/bucket/document`, `callout@L2/contribution[post]/post/profile/bucket/document`, `callout@L2/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document`, `callout@L2/contribution[link]/link/profile/bucket/document`, `space-about@L2/profile/bucket/document`, `space-profile@L2/bucket/document`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | D | D | · | · | CTS | D |
| creator-former-member | D | D | · | · | CTS | D |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for guest; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- defaults, t-pub-priv, t-priv-pub, t-priv-priv, combined-apply, archived: identical to priv-applications
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `platform/storage-aggregator/bucket/document` (carries also: file-upload, platform-forum-manage) (never carries: grant): − read for guest; + file-upload (cascade(platform/storage)|type-only|credentialRuleTypes-platformFileUploadAnyUser) for registered, platform-roles-admin, platform-content-full-access, platform-resource-admin, platform-settings-admin and 14 more; + platform-forum-manage (cascade(platform)|type-only|credentialRuleTypes-platformForumManage) for platform-support; + read (cascade(platform/storage)|type-only|credentialRuleTypes-platformFileUploadAnyUser) for organization-admin, user-self; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; − update for space-admin@L0
- `conversation/storage-aggregator/bucket/document` (carries also: contribute) (never carries: create, delete, grant, platform-content-full-access, update): − read for anonymous, guest, registered, platform-roles-admin, platform-content-full-access and 14 more; − create for platform-content-full-access, space-admin@L0; − delete for platform-content-full-access, space-admin@L0; − platform-content-full-access for platform-content-full-access; − update for platform-content-full-access, space-admin@L0; − grant for space-admin@L0; + contribute (cascade(conversation)|Communication Conversation Participants Access (Membership-based)) for user-self; + read (cascade(conversation)|Communication Conversation Participants Access (Membership-based)) for user-self
- `account/storage-aggregator/bucket/document` (carries also: platform-support-org-resources) (never carries: grant): − read for guest; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin
- `user/profile/bucket/document` (carries also: read-user-pii, read-user-settings, update-nameid) (never carries: grant): − read for guest; + read-user-pii (cascade(user)|type-only|credentialRule-userReadPii) for platform-users-admin; + read-user-settings (cascade(user)|type-only|credentialRule-userRead) for platform-users-admin; + create (cascade(user)|credentialRule-userSelfAdmin) for user-self; + delete (cascade(user)|credentialRule-userSelfAdmin) for user-self; + read (cascade(user)|type-only|credentialRuleTypes-userReadGlobalRegistered) for user-self, organization-admin; + read-user-pii (cascade(user)|credentialRule-userReadPii) for user-self; + update (cascade(user)|credentialRule-userSelfAdmin) for user-self; + update-nameid (cascade(user)|credentialRule-userSelfAdmin) for user-self; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; + read-user-pii (cascade(user)|data-dependent|credentialRule-userReadPii) for space-admin@L0, organization-admin; − update for space-admin@L0
- `user/storage-aggregator/bucket/document` (carries also: read-user-pii, read-user-settings, update-nameid) (never carries: grant): − read for guest; + read-user-pii (cascade(user)|type-only|credentialRule-userReadPii) for platform-users-admin; + read-user-settings (cascade(user)|type-only|credentialRule-userRead) for platform-users-admin; + create (cascade(user)|credentialRule-userSelfAdmin) for user-self; + delete (cascade(user)|credentialRule-userSelfAdmin) for user-self; + read (cascade(user)|type-only|credentialRuleTypes-userReadGlobalRegistered) for user-self, organization-admin; + read-user-pii (cascade(user)|credentialRule-userReadPii) for user-self; + update (cascade(user)|credentialRule-userSelfAdmin) for user-self; + update-nameid (cascade(user)|credentialRule-userSelfAdmin) for user-self; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; + read-user-pii (cascade(user)|data-dependent|credentialRule-userReadPii) for space-admin@L0, organization-admin; − update for space-admin@L0
- `organization/profile/bucket/document` (carries also: receive-notifications-admin, update-nameid): − read for guest; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `organization/storage-aggregator/bucket/document` (carries also: receive-notifications-admin, update-nameid): − read for guest; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `storage-aggregator@L0/bucket/document`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[whiteboard-framing]@L0/framing/whiteboard/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + update-content (cascade(callout[whiteboard-framing]@L0/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout[whiteboard-framing]@L0/framing/whiteboard)|whiteboard-created-by) for creator-former-member
- `callout@L0/framing/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[post]/post/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; + update-content (cascade(callout@L0/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout@L0/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-former-member
- `callout@L0/contribution[link]/link/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-about@L0/profile/bucket/document`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-profile@L0/bucket/document` (carries also: file-upload): − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[whiteboard-framing]@L1/framing/whiteboard/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + update-content (cascade(callout[whiteboard-framing]@L1/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout[whiteboard-framing]@L1/framing/whiteboard)|whiteboard-created-by) for creator-former-member
- `callout@L1/framing/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more
- `callout@L1/contribution[post]/post/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more
- `callout@L1/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more; + update-content (cascade(callout@L1/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + contribute (cascade(callout@L1/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-former-member
- `callout@L1/contribution[link]/link/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L1)|credentialRule-collaborationContributors) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more
- `space-about@L1/profile/bucket/document`: same cells as the canonical resource
- `space-profile@L1/bucket/document` (carries also: file-upload): same cells
- `storage-aggregator@L2/bucket/document`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout[whiteboard-framing]@L2/framing/whiteboard/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + contribute (cascade(callout[whiteboard-framing]@L2/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member; + update-content (cascade(callout[whiteboard-framing]@L2/framing/whiteboard)|whiteboard-created-by) for creator-member@L1, creator-former-member
- `callout@L2/framing/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[post]/post/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document` (carries also: contribute, public-share, update-content): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + contribute (cascade(callout@L2/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member; + update-content (cascade(callout@L2/contribution[whiteboard]/whiteboard[contributors])|whiteboard-created-by) for creator-member@L1, creator-former-member
- `callout@L2/contribution[link]/link/profile/bucket/document` (carries also: contribute): + contribute (cascade(collaboration@L2)|credentialRule-collaborationContributors) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `space-about@L2/profile/bucket/document`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `space-profile@L2/bucket/document` (carries also: file-upload): + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### licensing

Canonical resource: `licensing` under `pub-open`. Resources of this type in the matrix: `licensing`.

| role | create | delete | grant | license-reset | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | · | DT | · |
| platform-roles-admin | · | · | · | · | · | · | DT | · |
| platform-content-full-access | CT | CT | · | · | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | · | · | DT | · |
| platform-settings-admin | DT | DT | · | · | · | · | DT | DT |
| platform-operations-admin | · | · | · | DT | · | · | DT | · |
| platform-users-admin | · | · | · | · | · | · | DT | · |
| platform-support | · | · | · | · | · | CT | DT | · |
| platform-license-manager | · | · | DT | · | · | · | DT | · |
| platform-spaces-reader | · | · | · | · | · | · | DT | · |
| platform-audit-reader | · | · | · | · | · | · | DT | · |
| feature-beta-tester | · | · | · | · | · | · | DT | · |
| feature-virtual-assistant | · | · | · | · | · | · | DT | · |
| feature-organization-creator | · | · | · | · | · | · | DT | · |
| feature-vc-campaign | · | · | · | · | · | · | DT | · |
| organization-admin | · | · | · | · | · | · | DT | · |
| space-admin@L0 | · | · | · | · | · | · | DT | · |
| space-lead@L0 | · | · | · | · | · | · | DT | · |
| user-self | · | · | · | · | · | · | DT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### license-policy

Canonical resource: `license-policy` under `pub-open`. Resources of this type in the matrix: `license-policy`.

| role | create | delete | grant | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | CT | · |
| platform-roles-admin | · | · | · | · | · | CT | · |
| platform-content-full-access | CT | CT | · | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | · | CT | · |
| platform-settings-admin | CT | CT | · | · | · | CT | CT |
| platform-operations-admin | · | · | · | · | · | CT | · |
| platform-users-admin | · | · | · | · | · | CT | · |
| platform-support | · | · | · | · | CT | CT | · |
| platform-license-manager | · | · | CT | · | · | CT | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CT | · |
| feature-beta-tester | · | · | · | · | · | CT | · |
| feature-virtual-assistant | · | · | · | · | · | CT | · |
| feature-organization-creator | · | · | · | · | · | CT | · |
| feature-vc-campaign | · | · | · | · | · | CT | · |
| organization-admin | · | · | · | · | · | CT | · |
| space-admin@L0 | · | · | · | · | · | CT | · |
| space-lead@L0 | · | · | · | · | · | CT | · |
| user-self | · | · | · | · | · | CT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### communication-messaging

Canonical resource: `messaging` under `pub-open`. Resources of this type in the matrix: `messaging`.

| role | create | delete | pf:content-full-access | pf:forum-manage | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · |
| guest | · | · | · | · | · | · |
| registered | DT | · | · | · | · | · |
| platform-roles-admin | DT | · | · | · | · | · |
| platform-content-full-access | CT | CT | CT | · | CT | CT |
| platform-resource-admin | DT | · | · | · | · | · |
| platform-settings-admin | DT | · | · | · | · | · |
| platform-operations-admin | DT | · | · | · | · | · |
| platform-users-admin | DT | · | · | · | · | · |
| platform-support | DT | · | · | CT | · | · |
| platform-license-manager | DT | · | · | · | · | · |
| platform-spaces-reader | DT | · | · | · | · | · |
| platform-audit-reader | DT | · | · | · | · | · |
| feature-beta-tester | DT | · | · | · | · | · |
| feature-virtual-assistant | DT | · | · | · | · | · |
| feature-organization-creator | DT | · | · | · | · | · |
| feature-vc-campaign | DT | · | · | · | · | · |
| organization-admin | DT | · | · | · | · | · |
| space-admin@L0 | DT | · | · | · | · | · |
| space-lead@L0 | DT | · | · | · | · | · |
| user-self | DT | · | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### communication-conversation

Canonical resource: `conversation` under `pub-open`. Resources of this type in the matrix: `conversation`.

| role | contribute | read |
|---|---|---|
| anonymous | · | · |
| guest | · | · |
| registered | · | · |
| platform-roles-admin | · | · |
| platform-content-full-access | · | · |
| platform-resource-admin | · | · |
| platform-settings-admin | · | · |
| platform-operations-admin | · | · |
| platform-users-admin | · | · |
| platform-support | · | · |
| platform-license-manager | · | · |
| platform-spaces-reader | · | · |
| platform-audit-reader | · | · |
| feature-beta-tester | · | · |
| feature-virtual-assistant | · | · |
| feature-organization-creator | · | · |
| feature-vc-campaign | · | · |
| organization-admin | · | · |
| space-admin@L0 | · | · |
| space-lead@L0 | · | · |
| user-self | D | D |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### virtual-assistant

Canonical resource: `virtual-assistant` under `pub-open`. Resources of this type in the matrix: `virtual-assistant`.

| role | create | delete | pf:content-full-access | pf:operations-admin | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · |
| guest | · | · | · | · | · | · |
| registered | · | · | · | · | DT | · |
| platform-roles-admin | · | · | · | · | DT | · |
| platform-content-full-access | CT | CT | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | DT | · |
| platform-settings-admin | · | · | · | · | DT | · |
| platform-operations-admin | DT | DT | · | DT | DT | DT |
| platform-users-admin | · | · | · | · | DT | · |
| platform-support | · | · | · | · | DT | · |
| platform-license-manager | · | · | · | · | DT | · |
| platform-spaces-reader | · | · | · | · | DT | · |
| platform-audit-reader | · | · | · | · | DT | · |
| feature-beta-tester | · | · | · | · | DT | · |
| feature-virtual-assistant | · | · | · | · | DT | · |
| feature-organization-creator | · | · | · | · | DT | · |
| feature-vc-campaign | · | · | · | · | DT | · |
| organization-admin | · | · | · | · | DT | · |
| space-admin@L0 | · | · | · | · | DT | · |
| space-lead@L0 | · | · | · | · | DT | · |
| user-self | · | · | · | · | DT | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### ai-server

Canonical resource: `ai-server` under `pub-open`. Resources of this type in the matrix: `ai-server`.

| role | authorization-reset | create | delete | read | update |
|---|---|---|---|---|---|
| anonymous | · | · | · | · | · |
| guest | · | · | · | · | · |
| registered | · | · | · | · | · |
| platform-roles-admin | · | · | · | · | · |
| platform-content-full-access | · | DT | DT | DT | DT |
| platform-resource-admin | · | · | · | · | · |
| platform-settings-admin | · | · | · | · | · |
| platform-operations-admin | DT | DT | · | · | · |
| platform-users-admin | · | · | · | · | · |
| platform-support | · | · | · | · | · |
| platform-license-manager | · | · | · | · | · |
| platform-spaces-reader | · | · | · | · | · |
| platform-audit-reader | · | · | · | · | · |
| feature-beta-tester | · | · | · | · | · |
| feature-virtual-assistant | · | · | · | · | · |
| feature-organization-creator | · | · | · | · | · |
| feature-vc-campaign | · | · | · | · | · |
| organization-admin | · | · | · | · | · |
| space-admin@L0 | · | · | · | · | · |
| space-lead@L0 | · | · | · | · | · |
| user-self | · | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### in-memory

Canonical resource: `synthetic/admin-communication-grant` under `pub-open`. Resources of this type in the matrix: `synthetic/admin-communication-grant`, `synthetic/registration-delete-user`, `synthetic/conversion-global-admins`, `synthetic/admin-identity-delete-kratos`, `synthetic/admin-user-account-delete`, `synthetic/admin-user-email-change`, `synthetic/platform-well-known-vc-set`, `synthetic/license-definition-admin`.

| role | grant | pf:operations-admin |
|---|---|---|
| anonymous | · | · |
| guest | · | · |
| registered | · | · |
| platform-roles-admin | · | · |
| platform-content-full-access | · | · |
| platform-resource-admin | · | · |
| platform-settings-admin | · | · |
| platform-operations-admin | DT | DT |
| platform-users-admin | · | · |
| platform-support | · | · |
| platform-license-manager | · | · |
| platform-spaces-reader | · | · |
| platform-audit-reader | · | · |
| feature-beta-tester | · | · |
| feature-virtual-assistant | · | · |
| feature-organization-creator | · | · |
| feature-vc-campaign | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `synthetic/registration-delete-user` (carries also: platform-users-admin) (never carries: grant, platform-operations-admin): − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin; + platform-users-admin (direct|type-only|registration-delete-user) for platform-users-admin
- `synthetic/conversion-global-admins` (carries also: transfer-resource-offer) (never carries: grant, platform-operations-admin): + transfer-resource-offer (direct|type-only|conversion-global-admins) for platform-resource-admin; − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin
- `synthetic/admin-identity-delete-kratos` (carries also: platform-users-admin) (never carries: grant, platform-operations-admin): − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin; + platform-users-admin (direct|type-only|admin-identity-delete-kratos) for platform-users-admin
- `synthetic/admin-user-account-delete` (carries also: platform-users-admin) (never carries: grant, platform-operations-admin): − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin; + platform-users-admin (direct|type-only|admin-user-account-delete) for platform-users-admin
- `synthetic/admin-user-email-change` (carries also: platform-users-admin) (never carries: grant, platform-operations-admin): − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin; + platform-users-admin (direct|type-only|admin-user-email-change) for platform-users-admin
- `synthetic/platform-well-known-vc-set` (carries also: platform-settings-admin) (never carries: grant, platform-operations-admin): + platform-settings-admin (direct|type-only|platform-well-known-vc-set) for platform-settings-admin; − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin
- `synthetic/license-definition-admin` (carries also: create, delete, read, update) (never carries: grant, platform-operations-admin): + create (direct|type-only|license-definition-admin) for platform-settings-admin; + delete (direct|type-only|license-definition-admin) for platform-settings-admin; + read (direct|type-only|license-definition-admin) for platform-settings-admin; + update (direct|type-only|license-definition-admin) for platform-settings-admin; − grant for platform-operations-admin; − platform-operations-admin for platform-operations-admin

### account

Canonical resource: `account` under `pub-open`. Resources of this type in the matrix: `account`.

| role | account-license-manage | authorization-reset | create | create-innovation-hub | create-innovation-pack | create-space | create-virtual-contributor | delete | license-reset | pf:content-full-access | pf:support-org-resources | read | transfer:accept | transfer:offer | update |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| guest | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| platform-roles-admin | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| platform-content-full-access | · | · | CT | DT | DT | DT | DT | CT | · | CT | · | CT | · | · | CT |
| platform-resource-admin | · | · | · | · | · | · | · | · | · | · | · | DT | DT | DT | · |
| platform-settings-admin | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| platform-operations-admin | · | DT | · | · | · | · | · | · | DT | · | · | DT | · | · | · |
| platform-users-admin | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| platform-support | · | · | · | · | · | · | · | · | · | · | DTS | DT | · | · | · |
| platform-license-manager | DT | · | · | DT | · | · | · | · | · | · | · | DT | · | · | · |
| platform-spaces-reader | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| platform-audit-reader | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| feature-beta-tester | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| feature-organization-creator | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| feature-vc-campaign | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| account-admin | · | · | D | · | D | D | D | D | · | · | · | DT | D | D | D |
| organization-owner | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| organization-admin | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| organization-associate | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |
| creator-former-member | · | · | · | · | · | · | · | · | · | · | · | DT | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications+support**: − platform-support-org-resources for platform-support
- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv: identical to pub-open
- user-hosted: identical to priv-applications+support

### innovation-pack

Canonical resource: `innovation-pack` under `pub-open`. Resources of this type in the matrix: `innovation-pack`.

| role | create | delete | grant | pf:content-full-access | pf:support-org-resources | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CT | · |
| guest | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | CT | · |
| platform-roles-admin | · | · | · | · | · | CT | · |
| platform-content-full-access | CT | CT | · | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | · | CT | · |
| platform-settings-admin | · | · | · | · | · | CT | · |
| platform-operations-admin | · | · | · | · | · | CT | · |
| platform-users-admin | · | · | · | · | · | CT | · |
| platform-support | · | · | · | · | CTS | CT | · |
| platform-license-manager | · | · | · | · | · | CT | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CT | · |
| feature-beta-tester | · | · | · | · | · | CT | · |
| feature-virtual-assistant | · | · | · | · | · | CT | · |
| feature-organization-creator | · | · | · | · | · | CT | · |
| feature-vc-campaign | · | · | · | · | · | CT | · |
| account-admin | C | C | C | · | · | CT | C |
| organization-owner | · | · | · | · | · | CT | · |
| organization-admin | · | · | · | · | · | CT | · |
| organization-associate | · | · | · | · | · | CT | · |
| creator-former-member | · | · | · | · | · | CT | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications+support**: − platform-support-org-resources for platform-support
- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv: identical to pub-open
- user-hosted: identical to priv-applications+support

### callout

Canonical resource: `callout@L1` under `pub-open`. Resources of this type in the matrix: `innovation-pack/template/callout`, `virtual-contributor[public]/knowledge-base/callout`, `virtual-contributor[public,kb-visible]/knowledge-base/callout`, `virtual-contributor[account]/knowledge-base/callout`, `virtual-contributor[hidden]/knowledge-base/callout`, `callout@L0`, `callout[draft]@L0`, `callout[form]@L0`, `callout[task-board]@L0`, `callout@L1`, `callout[draft]@L1`, `callout[form]@L1`, `callout[task-board]@L1`, `callout@L2`, `callout[draft]@L2`, `callout[form]@L2`, `callout[task-board]@L2`.

| role | contribute | create | create-post | create-whiteboard | delete | grant | pf:content-full-access | read | update | update-callout-publisher |
|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | · | · | · | CTS | · | · |
| platform-content-full-access | R | CT | R | R | CT | · | CT | CT | CT | DT |
| platform-resource-admin | · | · | · | · | · | · | · | CTS | · | DT |
| platform-settings-admin | · | · | · | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | · | · | · | CTS | · | · |
| space-admin@L0 | R | C | R | R | C | C | · | CTS | C | · |
| space-invitee@L0 | · | · | · | · | · | · | · | CTS | · | · |
| space-member@L1 | C | · | R | R | · | · | · | CTS | · | · |
| space-lead@L1 | C | · | R | R | · | · | · | CTS | · | · |
| space-admin@L1 | C | C | R | R | C | C | · | CTS | C | · |
| space-invitee@L1 | · | · | · | · | · | · | · | CTS | · | · |
| space-member@L2 | C | · | R | R | · | · | · | CTS | · | · |
| space-lead@L2 | C | · | R | R | · | · | · | CTS | · | · |
| space-admin@L2 | C | · | R | R | · | · | · | CTS | · | · |
| space-invitee@L2 | · | · | · | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | · | CTS | · | · |
| creator-member@L1 | C | D | R | R | D | · | · | CTS | D | · |
| creator-former-member | R | D | R | R | D | · | · | CTS | D | · |
| virtual-contributor-member@L1 | C | · | R | R | · | · | · | C | · | · |
| applicant | · | · | · | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | · | · | · | CTS | · | · |
| user-group-member | · | · | · | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-whiteboard (privilege-rule(contribute->create-whiteboard)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-whiteboard (privilege-rule(contribute->create-whiteboard)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-whiteboard (privilege-rule(contribute->create-whiteboard)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for platform-support; + create-whiteboard (privilege-rule(create->create-whiteboard)|policyRule-calloutCreate) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for platform-support; + create-whiteboard (privilege-rule(create->create-whiteboard)|policyRule-calloutCreate) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `innovation-pack/template/callout` (carries also: platform-support-org-resources): − read for guest; + platform-support-org-resources (cascade(account)|type-only|settings:account.type=organization|credentialRuleTypes-platformSupportOrgResources) for platform-support; + contribute (privilege-rule(create->contribute)|policyRule-calloutCreate) for account-admin; + create (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for account-admin; + create-whiteboard (privilege-rule(create->create-whiteboard)|policyRule-calloutCreate) for account-admin; + delete (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + grant (cascade(account[child-entities])|credentialRuleTypes-accountChildEntities) for account-admin; + update (cascade(account)|credentialRuleTypes-accountManage) for account-admin; + read (cascade(account)|type-only|Anonymous agent granted 'read' anonymous registered access) for organization-owner, organization-admin
- `virtual-contributor[public]/knowledge-base/callout` (carries also: receive-notifications, update-nameid) (never carries: create-whiteboard, grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; − create-whiteboard for platform-content-full-access, space-member@L1, creator-former-member; + contribute (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for vc-account-admin; + delete (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create-post for space-member@L1
- `virtual-contributor[public,kb-visible]/knowledge-base/callout` (carries also: receive-notifications, update-nameid) (never carries: create-whiteboard, grant): − read for guest; − create-whiteboard for platform-content-full-access, space-member@L1, creator-former-member; + contribute (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for vc-account-admin; + delete (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[public,kb-visible])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create-post for space-member@L1
- `virtual-contributor[account]/knowledge-base/callout` (carries also: receive-notifications, update-nameid) (never carries: create-whiteboard, grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; − create-whiteboard for platform-content-full-access, space-member@L1, creator-former-member; + contribute (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for vc-account-admin; + delete (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[account])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create-post for space-member@L1
- `virtual-contributor[hidden]/knowledge-base/callout` (carries also: receive-notifications, update-nameid) (never carries: create-whiteboard, grant): − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; − create-whiteboard for platform-content-full-access, space-member@L1, creator-former-member; + contribute (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + create (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + create-post (privilege-rule(create->create-post)|policyRule-calloutCreate) for vc-account-admin; + delete (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + read (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + receive-notifications (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; + update-nameid (cascade(virtual-contributor[hidden])|credentialRule-accountAdminManage) for vc-account-admin; − contribute for space-member@L1; − create-post for space-member@L1
- `callout@L0`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-whiteboard (privilege-rule(contribute->create-whiteboard)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[draft]@L0` (never carries: create-whiteboard): − read for anonymous, guest, registered, platform-roles-admin, platform-content-full-access and 30 more; − contribute for platform-content-full-access, creator-former-member; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[form]@L0` (never carries: create-post, create-whiteboard): − contribute for platform-content-full-access, creator-former-member; − create-post for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; − create for space-admin@L1, creator-member@L1, creator-former-member; − delete for space-admin@L1, creator-member@L1, creator-former-member; − grant for space-admin@L1; − update for space-admin@L1, creator-member@L1, creator-former-member
- `callout[task-board]@L0` (carries also: move-task) (never carries: create-whiteboard): − contribute for platform-content-full-access, creator-former-member; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + move-task (privilege-rule(update->move-task)|policyRule-calloutTaskMoveAdmin) for platform-content-full-access, creator-former-member; + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + create-post (privilege-rule(contribute->create-post)|policyRule-calloutContribute) for space-member@L0, space-lead@L0, subspace-admin-derived@L0; + move-task (privilege-rule(contribute->move-task)|policyRule-calloutTaskMove) for space-member@L0, space-lead@L0, space-admin@L0, space-member@L1, space-lead@L1 and 7 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout[draft]@L1` (never carries: create-whiteboard): − read for anonymous, guest, registered, platform-roles-admin, platform-content-full-access and 29 more; − contribute for platform-content-full-access, space-admin@L0, creator-former-member; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more
- `callout[form]@L1` (never carries: create-post, create-whiteboard): − contribute for platform-content-full-access, space-admin@L0, creator-former-member; − create-post for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `callout[task-board]@L1` (carries also: move-task) (never carries: create-whiteboard): − contribute for platform-content-full-access, space-admin@L0, creator-former-member; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + move-task (privilege-rule(update->move-task)|policyRule-calloutTaskMoveAdmin) for platform-content-full-access, space-admin@L0, creator-former-member; + move-task (privilege-rule(contribute->move-task)|policyRule-calloutTaskMove) for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 3 more
- `callout@L2`: − contribute for space-member@L1, space-lead@L1, virtual-contributor-member@L1; − create-post for space-member@L1, space-lead@L1, virtual-contributor-member@L1; − create-whiteboard for space-member@L1, space-lead@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout[draft]@L2` (never carries: create-whiteboard): − read for anonymous, guest, registered, platform-roles-admin, platform-content-full-access and 28 more; − contribute for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 3 more; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; − create-post for space-member@L1, space-lead@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout[form]@L2` (never carries: create-post, create-whiteboard): − contribute for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 3 more; − create-post for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; − create for creator-member@L1, creator-former-member; − delete for creator-member@L1, creator-former-member; − update for creator-member@L1, creator-former-member
- `callout[task-board]@L2` (carries also: move-task) (never carries: create-whiteboard): − contribute for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 3 more; − create-whiteboard for platform-content-full-access, space-admin@L0, space-member@L1, space-lead@L1, space-admin@L1 and 6 more; + move-task (privilege-rule(update->move-task)|policyRule-calloutTaskMoveAdmin) for platform-content-full-access, space-admin@L0, space-admin@L1, creator-member@L1, creator-former-member; − create-post for space-member@L1, space-lead@L1, virtual-contributor-member@L1; + move-task (privilege-rule(contribute->move-task)|policyRule-calloutTaskMove) for space-member@L2, space-lead@L2, space-admin@L2; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### innovation-hub

Canonical resource: `innovation-hub` under `pub-open`. Resources of this type in the matrix: `innovation-hub`.

| role | create | delete | grant | pf:content-full-access | pf:support-org-resources | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CT | · |
| guest | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | CT | · |
| platform-roles-admin | · | · | · | · | · | CT | · |
| platform-content-full-access | CT | CT | · | CT | · | CT | CT |
| platform-resource-admin | · | · | · | · | · | CT | · |
| platform-settings-admin | · | · | · | · | · | CT | · |
| platform-operations-admin | · | · | · | · | · | CT | · |
| platform-users-admin | · | · | · | · | · | CT | · |
| platform-support | · | · | · | · | CTS | CT | · |
| platform-license-manager | · | · | · | · | · | CT | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CT | · |
| feature-beta-tester | · | · | · | · | · | CT | · |
| feature-virtual-assistant | · | · | · | · | · | CT | · |
| feature-organization-creator | · | · | · | · | · | CT | · |
| feature-vc-campaign | · | · | · | · | · | CT | · |
| account-admin | C | C | C | · | · | CT | C |
| organization-owner | · | · | · | · | · | CT | · |
| organization-admin | · | · | · | · | · | CT | · |
| organization-associate | · | · | · | · | · | CT | · |
| creator-former-member | · | · | · | · | · | CT | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications+support**: − platform-support-org-resources for platform-support
- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv: identical to pub-open
- user-hosted: identical to priv-applications+support

### virtual-contributor

Canonical resource: `virtual-contributor[public]` under `pub-open`. Resources of this type in the matrix: `virtual-contributor[public]`, `virtual-contributor[public,kb-visible]`, `virtual-contributor[account]`, `virtual-contributor[hidden]`.

| role | contribute | create | delete | pf:content-full-access | pf:operations-admin | read | read-about | notif | update | update-nameid |
|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | DTS | R | · | · | · |
| guest | · | · | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | DTS | R | · | · | · |
| platform-roles-admin | · | · | · | · | · | DTS | R | · | · | · |
| platform-content-full-access | · | CT | CT | CT | · | CT | R | · | CT | · |
| platform-resource-admin | · | · | · | · | · | DTS | R | · | · | · |
| platform-settings-admin | · | · | · | · | · | DTS | R | · | · | · |
| platform-operations-admin | · | · | · | · | DT | DTS | R | · | · | · |
| platform-users-admin | · | · | · | · | · | DTS | R | · | · | · |
| platform-support | · | · | · | · | · | DTS | R | · | · | · |
| platform-license-manager | · | · | · | · | · | DTS | R | · | · | · |
| platform-spaces-reader | · | · | · | · | · | DTS | R | · | · | · |
| platform-audit-reader | · | · | · | · | · | DTS | R | · | · | · |
| feature-beta-tester | · | · | · | · | · | DTS | R | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | DTS | R | · | · | · |
| feature-organization-creator | · | · | · | · | · | DTS | R | · | · | · |
| feature-vc-campaign | · | · | · | · | · | DTS | R | · | · | · |
| vc-account-admin | D | D | D | · | · | D | R | D | D | D |
| space-member@L0 | · | · | · | · | · | DTS | R | · | · | · |
| space-member@L1 | · | · | · | · | · | DTS | R | · | · | · |
| creator-former-member | · | · | · | · | · | DTS | R | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `virtual-contributor[public,kb-visible]`: same cells as the canonical resource
- `virtual-contributor[account]`: − read for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 11 more; − read-about for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 11 more
- `virtual-contributor[hidden]`: − read for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 13 more; − read-about for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 13 more

### knowledge-base

Canonical resource: `virtual-contributor[public]/knowledge-base` under `pub-open`. Resources of this type in the matrix: `virtual-contributor[public]/knowledge-base`, `virtual-contributor[public,kb-visible]/knowledge-base`, `virtual-contributor[account]/knowledge-base`, `virtual-contributor[hidden]/knowledge-base`.

| role | contribute | create | delete | pf:content-full-access | read | read-about | notif | update | update-nameid |
|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | DTS | · | · | · |
| guest | · | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | DTS | · | · | · |
| platform-roles-admin | · | · | · | · | · | DTS | · | · | · |
| platform-content-full-access | · | CT | CT | CT | CT | DTS | · | CT | · |
| platform-resource-admin | · | · | · | · | · | DTS | · | · | · |
| platform-settings-admin | · | · | · | · | · | DTS | · | · | · |
| platform-operations-admin | · | · | · | · | · | DTS | · | · | · |
| platform-users-admin | · | · | · | · | · | DTS | · | · | · |
| platform-support | · | · | · | · | · | DTS | · | · | · |
| platform-license-manager | · | · | · | · | · | DTS | · | · | · |
| platform-spaces-reader | · | · | · | · | · | DTS | · | · | · |
| platform-audit-reader | · | · | · | · | · | DTS | · | · | · |
| feature-beta-tester | · | · | · | · | · | DTS | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | DTS | · | · | · |
| feature-organization-creator | · | · | · | · | · | DTS | · | · | · |
| feature-vc-campaign | · | · | · | · | · | DTS | · | · | · |
| vc-account-admin | C | C | C | · | C | DTS | C | C | C |
| space-member@L0 | · | · | · | · | · | DTS | · | · | · |
| space-member@L1 | · | · | · | · | · | DTS | · | · | · |
| creator-former-member | · | · | · | · | · | DTS | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `virtual-contributor[public,kb-visible]/knowledge-base`: + read (direct|type-only|settings:knowledgeBaseContentVisible|KnowledgeBase contents visible) for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 13 more
- `virtual-contributor[account]/knowledge-base`: − read-about for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 11 more
- `virtual-contributor[hidden]/knowledge-base`: − read-about for anonymous, registered, platform-roles-admin, platform-resource-admin, platform-settings-admin and 13 more

### user

Canonical resource: `user` under `pub-open`. Resources of this type in the matrix: `user`.

| role | authorization-reset | create | delete | pf:content-full-access | pf:users-admin | read | read-user-pii | read-user-settings | update | update-nameid |
|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | DT | · | · | · | · |
| platform-roles-admin | · | · | · | · | · | DT | · | · | · | · |
| platform-content-full-access | · | CT | CT | CT | · | CT | · | SR | CT | · |
| platform-resource-admin | · | · | · | · | · | DT | · | · | · | · |
| platform-settings-admin | · | · | · | · | · | DT | · | · | · | · |
| platform-operations-admin | DT | · | · | · | · | DT | · | · | · | · |
| platform-users-admin | · | · | · | · | DT | DT | DT | DT | · | · |
| platform-support | · | · | · | · | · | DT | · | · | · | · |
| platform-license-manager | · | · | · | · | · | DT | · | · | · | · |
| platform-spaces-reader | · | · | · | · | · | DT | · | · | · | · |
| platform-audit-reader | · | · | · | · | · | DT | · | · | · | · |
| feature-beta-tester | · | · | · | · | · | DT | · | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | DT | · | · | · | · |
| feature-organization-creator | · | · | · | · | · | DT | · | · | · | · |
| feature-vc-campaign | · | · | · | · | · | DT | · | · | · | · |
| user-self | · | D | D | · | · | DT | D | SR | D | D |
| space-admin@L0 | · | · | · | · | · | DT | D? | · | · | · |
| organization-admin | · | · | · | · | · | DT | D? | · | · | · |
| organization-associate | · | · | · | · | · | DT | · | · | · | · |
| creator-former-member | · | · | · | · | · | DT | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### user-settings

Canonical resource: `user/settings` under `pub-open`. Resources of this type in the matrix: `user/settings`.

| role | create | delete | pf:content-full-access | read | read-user-pii | read-user-settings | update | update-nameid |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · | · |
| registered | · | · | · | CT | · | · | · | · |
| platform-roles-admin | · | · | · | CT | · | · | · | · |
| platform-content-full-access | CT | CT | CT | CT | · | · | CT | · |
| platform-resource-admin | · | · | · | CT | · | · | · | · |
| platform-settings-admin | · | · | · | CT | · | · | · | · |
| platform-operations-admin | · | · | · | CT | · | · | · | · |
| platform-users-admin | · | · | · | CT | CT | CT | · | · |
| platform-support | · | · | · | CT | · | · | · | · |
| platform-license-manager | · | · | · | CT | · | · | · | · |
| platform-spaces-reader | · | · | · | CT | · | · | · | · |
| platform-audit-reader | · | · | · | CT | · | · | · | · |
| feature-beta-tester | · | · | · | CT | · | · | · | · |
| feature-virtual-assistant | · | · | · | CT | · | · | · | · |
| feature-organization-creator | · | · | · | CT | · | · | · | · |
| feature-vc-campaign | · | · | · | CT | · | · | · | · |
| user-self | C | C | · | CT | C | · | C | C |
| space-admin@L0 | · | · | · | CT | C? | · | · | · |
| organization-admin | · | · | · | CT | C? | · | · | · |
| organization-associate | · | · | · | CT | · | · | · | · |
| creator-former-member | · | · | · | CT | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### organization

Canonical resource: `organization` under `pub-open`. Resources of this type in the matrix: `organization`.

| role | authorization-reset | create | delete | delete-organization | grant | pf:content-full-access | read | notif-admin | update | update-nameid |
|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | · | · | · | · |
| guest | · | · | · | · | · | · | · | · | · | · |
| registered | · | · | · | · | · | · | DT | · | · | · |
| platform-roles-admin | · | · | · | · | · | · | DT | · | · | · |
| platform-content-full-access | · | CT | CT | · | · | CT | CT | · | CT | · |
| platform-resource-admin | · | · | · | · | · | · | DT | · | · | · |
| platform-settings-admin | · | · | · | · | · | · | DT | · | · | · |
| platform-operations-admin | DT | · | · | · | · | · | DT | · | · | · |
| platform-users-admin | · | · | · | · | · | · | DT | · | · | · |
| platform-support | · | · | · | DT | · | · | DT | · | · | · |
| platform-license-manager | · | · | · | · | · | · | DT | · | · | · |
| platform-spaces-reader | · | · | · | · | · | · | DT | · | · | · |
| platform-audit-reader | · | · | · | · | · | · | DT | · | · | · |
| feature-beta-tester | · | · | · | · | · | · | DT | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | DT | · | · | · |
| feature-organization-creator | · | · | · | · | · | · | DT | · | · | · |
| feature-vc-campaign | · | · | · | · | · | · | DT | · | · | · |
| organization-owner | · | D | D | · | D | · | DT | D | D | D |
| organization-admin | · | D | D | · | D | · | DT | D | D | D |
| organization-associate | · | · | · | · | · | · | DT | · | · | · |
| applicant | · | · | · | · | · | · | DT | · | · | · |
| invited-actor-account-admin | · | · | · | · | · | · | DT | · | · | · |
| user-group-member | · | · | · | · | · | · | DT | · | · | · |
| creator-former-member | · | · | · | · | · | · | DT | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### application

Canonical resource: `application@L1` under `pub-open`. Resources of this type in the matrix: `organization/application`, `application@L0`, `application@L1`, `application@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | D | · | · | CTS | D |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `organization/application` (carries also: platform-support-org-membership, receive-notifications-admin, update-nameid): − read for anonymous, guest; + platform-support-org-membership (cascade(organization/role-set)|type-only|credentialRuleTypes-organizationRoleSetPlatformSupportMembership) for platform-support; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `application@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `application@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### invitation

Canonical resource: `invitation@L1` under `pub-open`. Resources of this type in the matrix: `organization/invitation`, `invitation@L0`, `invitation@L1`, `invitation@L2`.

| role | create | delete | grant | pf:content-full-access | read | entry:invite-accept | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | CTS | · | · |
| platform-content-full-access | CT | CT | · | CT | CT | · | CT |
| platform-resource-admin | · | · | · | · | CTS | · | · |
| platform-settings-admin | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | CTS | · | · |
| space-admin@L0 | C | C | C | · | CTS | · | C |
| space-invitee@L0 | · | · | · | · | CTS | · | · |
| space-member@L1 | · | · | · | · | CTS | · | · |
| space-lead@L1 | · | · | · | · | CTS | · | · |
| space-admin@L1 | C | C | C | · | CTS | · | C |
| space-invitee@L1 | · | · | · | · | CTS | · | · |
| space-member@L2 | · | · | · | · | CTS | · | · |
| space-lead@L2 | · | · | · | · | CTS | · | · |
| space-admin@L2 | · | · | · | · | CTS | · | · |
| space-invitee@L2 | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · | · |
| creator-member@L1 | · | · | · | · | CTS | · | · |
| creator-former-member | · | · | · | · | CTS | · | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · | · |
| applicant | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | CTS | D | D |
| user-group-member | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `organization/invitation` (carries also: platform-support-org-membership, receive-notifications-admin, update-nameid): − read for anonymous, guest; + platform-support-org-membership (cascade(organization/role-set)|type-only|credentialRuleTypes-organizationRoleSetPlatformSupportMembership) for platform-support; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, organization-admin; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `invitation@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `invitation@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### organization-verification

Canonical resource: `organization/verification` under `pub-open`. Resources of this type in the matrix: `organization/verification`.

| role | grant | read | update |
|---|---|---|---|
| anonymous | · | · | · |
| guest | · | · | · |
| registered | · | · | · |
| platform-roles-admin | · | · | · |
| platform-content-full-access | · | · | · |
| platform-resource-admin | · | · | · |
| platform-settings-admin | · | · | · |
| platform-operations-admin | · | · | · |
| platform-users-admin | · | · | · |
| platform-support | DT | DT | DT |
| platform-license-manager | · | · | · |
| platform-spaces-reader | · | · | · |
| platform-audit-reader | · | · | · |
| feature-beta-tester | · | · | · |
| feature-virtual-assistant | · | · | · |
| feature-organization-creator | · | · | · |
| feature-vc-campaign | · | · | · |
| organization-owner | · | D | D |
| organization-admin | · | D | D |
| organization-associate | · | · | · |
| applicant | · | · | · |
| invited-actor-account-admin | · | · | · |
| user-group-member | · | · | · |
| creator-former-member | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- priv-applications, defaults, t-pub-pub, t-pub-priv, t-priv-pub, t-priv-priv, pub-open+support, priv-applications+support, pub-open+members, pub-applications, pub-invitations, combined-apply, pub-open+guests, archived, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

### user-group

Canonical resource: `user-group@L1` under `pub-open`. Resources of this type in the matrix: `organization/user-group`, `user-group@L0`, `user-group@L1`, `user-group@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| user-self | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| organization-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 14 more
- **defaults**: − read for anonymous, guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 13 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `organization/user-group` (carries also: receive-notifications-admin, update-nameid): − read for anonymous, guest; + create (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + delete (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + grant (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + read (cascade(organization)|type-only|credentialRule-organizationRead) for organization-owner, applicant, invited-actor-account-admin, user-group-member; + receive-notifications-admin (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin; + update-nameid (cascade(organization)|credentialRule-organizationAdmin) for organization-owner, organization-admin
- `user-group@L0`: same cells as the canonical resource
- `user-group@L2`: same cells as the canonical resource

### space

Canonical resource: `space@L1` under `pub-open`. Resources of this type in the matrix: `space@L0`, `space@L1`, `space@L2`.

| role | account-license-manage | create | create-subspace | delete | grant | pf:content-full-access | read | read-about | read-license | notif | notif-admin | update | update-nameid |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| guest | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| registered | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-content-full-access | · | CT | R | CT | · | CT | CT | R | R | · | · | CT | · |
| platform-resource-admin | · | · | · | · | · | · | CTS | DT | R | · | · | · | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-users-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-support | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-license-manager | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | R | R | · | · | · | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| account-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| organization-associate | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| space-member@L0 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| space-admin@L0 | · | C | R | C | C | · | CTS | R | R | · | DP | C | DP |
| space-invitee@L0 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| space-member@L1 | · | · | · | · | · | · | CTS | R | R | D | · | · | · |
| space-lead@L1 | · | · | · | · | · | · | CTS | R | R | D | D | · | · |
| space-admin@L1 | · | D | R | D | D | · | CTS | R | R | D | D | D | D |
| space-invitee@L1 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| space-member@L2 | · | · | · | · | · | · | CTS | R | R | D | · | · | · |
| space-lead@L2 | · | · | · | · | · | · | CTS | R | R | D | · | · | · |
| space-admin@L2 | · | · | · | · | · | · | CTS | R | R | D | · | · | · |
| space-invitee@L2 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| creator-member@L1 | · | · | · | · | · | · | CTS | R | R | D | · | · | · |
| creator-former-member | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| virtual-contributor-member@L1 | · | · | · | · | · | · | C | R | R | D | · | · | · |
| applicant | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | R | R | · | · | · | · |
| user-group-member | · | · | · | · | · | · | CTS | R | R | · | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more; − read-about for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; − read-license for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more; + account-license-manage (direct|type-only|credentialRuleTypes-spacePlatformSettings) for platform-license-manager
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; − read-about for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; − read-license for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; + create-subspace (direct|parent-credential|settings:allowMembersToCreateSubspaces|credentialRule-memberCreateSubspace) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more; − read-license for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 21 more; + account-license-manage (direct|type-only|credentialRuleTypes-spacePlatformSettings) for platform-license-manager
- **t-priv-pub**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; − read-about for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more; − read-license for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + create-subspace (privilege-rule(create->create-subspace)|policyRule-spaceCreateSubspace) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + receive-notifications-admin (direct|type-only|Space Admin receive notifications) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 20 more; − read-about for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 16 more; − read-license for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 20 more; + create (direct|type-only|credentialRule-spaceAdmins) for platform-support; + create-subspace (privilege-rule(create->create-subspace)|policyRule-spaceCreateSubspace) for platform-support; + delete (direct|type-only|credentialRule-spaceAdmins) for platform-support; + grant (direct|type-only|credentialRule-spaceAdmins) for platform-support; + receive-notifications-admin (direct|type-only|Space Admin receive notifications) for platform-support; + update (direct|type-only|credentialRule-spaceAdmins) for platform-support; + account-license-manage (direct|type-only|credentialRuleTypes-spacePlatformSettings) for platform-license-manager
- **pub-open+members**: + create-subspace (direct|parent-credential|settings:allowMembersToCreateSubspaces|credentialRule-memberCreateSubspace) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more
- t-pub-pub, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-priv-priv: identical to priv-applications
- combined-apply, archived: identical to t-priv-pub

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `space@L0`: + account-license-manage (direct|type-only|credentialRuleTypes-spacePlatformSettings) for platform-license-manager; + receive-notifications (direct|Space members receive notifications) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + receive-notifications-admin (direct|Space Admin receive notifications) for space-lead@L0; − receive-notifications-admin for space-lead@L1, space-admin@L1; − create for space-admin@L1; − create-subspace for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; − update-nameid for space-admin@L1
- `space@L2`: − receive-notifications for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; − receive-notifications-admin for space-lead@L1; + receive-notifications-admin (direct|Space Admin receive notifications) for space-lead@L2, space-admin@L2; + create (direct|credentialRule-spaceAdmins) for space-admin@L2; + create-subspace (privilege-rule(create->create-subspace)|policyRule-spaceCreateSubspace) for space-admin@L2; + delete (direct|credentialRule-spaceAdmins) for space-admin@L2; + grant (direct|credentialRule-spaceAdmins) for space-admin@L2; + update (direct|credentialRule-spaceAdmins) for space-admin@L2; + update-nameid (direct|credentialRule-spaceAdminUpdateNameID) for space-admin@L2

### community

Canonical resource: `community@L1` under `pub-open`. Resources of this type in the matrix: `community@L0`, `community@L1`, `community@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `community@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `community@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### collaboration

Canonical resource: `collaboration@L1` under `pub-open`. Resources of this type in the matrix: `collaboration@L0`, `collaboration@L1`, `collaboration@L2`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | CTS | · |
| space-member@L1 | D | · | · | · | · | CTS | · |
| space-lead@L1 | D | · | · | · | · | CTS | · |
| space-admin@L1 | D | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | CTS | · |
| space-member@L2 | D | · | · | · | · | CTS | · |
| space-lead@L2 | D | · | · | · | · | CTS | · |
| space-admin@L2 | D | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · |
| creator-member@L1 | D | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | D | · | · | · | · | C | · |
| applicant | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more; + contribute (direct|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (direct|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more; + contribute (direct|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (direct|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (direct|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `collaboration@L0`: + contribute (direct|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `collaboration@L2`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### callouts-set

Canonical resource: `callouts-set@L1` under `pub-open`. Resources of this type in the matrix: `callouts-set@L0`, `callouts-set@L1`, `callouts-set@L2`.

| role | contribute | create | create-callout | delete | grant | pf:content-full-access | read | transfer:accept | transfer:offer | update |
|---|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | · | · | · |
| guest | · | · | · | · | · | · | CTS | · | · | · |
| registered | · | · | · | · | · | · | CTS | · | · | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | · | · | · |
| platform-content-full-access | · | CT | R | CT | · | CT | CT | · | · | CT |
| platform-resource-admin | · | · | · | · | · | · | CTS | DT | DT | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | · | · | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | · | · | · |
| platform-users-admin | · | · | · | · | · | · | CTS | · | · | · |
| platform-support | · | · | · | · | · | · | CTS | · | · | · |
| platform-license-manager | · | · | · | · | · | · | CTS | · | · | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | · | · | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | · | · | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | · | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | · | · | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | · | · | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | · | · | · |
| account-admin | · | · | · | · | · | · | CTS | · | · | · |
| organization-associate | · | · | · | · | · | · | CTS | · | · | · |
| space-member@L0 | · | · | · | · | · | · | CTS | · | · | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | · | · | · |
| space-admin@L0 | · | C | R | C | C | · | CTS | · | · | C |
| space-invitee@L0 | · | · | · | · | · | · | CTS | · | · | · |
| space-member@L1 | C | · | · | · | · | · | CTS | · | · | · |
| space-lead@L1 | C | · | · | · | · | · | CTS | · | · | · |
| space-admin@L1 | C | C | R | C | C | · | CTS | · | · | C |
| space-invitee@L1 | · | · | · | · | · | · | CTS | · | · | · |
| space-member@L2 | C | · | · | · | · | · | CTS | · | · | · |
| space-lead@L2 | C | · | · | · | · | · | CTS | · | · | · |
| space-admin@L2 | C | · | · | · | · | · | CTS | · | · | · |
| space-invitee@L2 | · | · | · | · | · | · | CTS | · | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | · | · | · |
| creator-member@L1 | C | · | · | · | · | · | CTS | · | · | · |
| creator-former-member | · | · | · | · | · | · | CTS | · | · | · |
| virtual-contributor-member@L1 | C | · | · | · | · | · | C | · | · | · |
| applicant | · | · | · | · | · | · | CTS | · | · | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | · | · | · |
| user-group-member | · | · | · | · | · | · | CTS | · | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + create-callout (privilege-rule(contribute->create-callout)|settings:allowMembersToCreateCallouts|policyRule-calloutContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-priv-pub**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + create-callout (privilege-rule(create->create-callout)|policyRule-collaborationCreate) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + create-callout (privilege-rule(create->create-callout)|policyRule-collaborationCreate) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **pub-open+members**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + create-callout (privilege-rule(contribute->create-callout)|settings:allowMembersToCreateCallouts|policyRule-calloutContribute) for space-member@L0, space-lead@L0, space-member@L1, space-lead@L1, space-member@L2 and 5 more
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more
- t-priv-priv: identical to t-pub-priv
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callouts-set@L0`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − create-callout for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callouts-set@L2`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + create-callout (privilege-rule(create->create-callout)|policyRule-collaborationCreate) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### whiteboard

Canonical resource: `callout[whiteboard-framing]@L1/framing/whiteboard` under `pub-open`. Resources of this type in the matrix: `callout[whiteboard-framing]@L0/framing/whiteboard`, `callout@L0/contribution[whiteboard]/whiteboard[contributors]`, `callout@L0/contribution[whiteboard]/whiteboard[admins]`, `callout@L0/contribution[whiteboard]/whiteboard[owner]`, `callout[whiteboard-framing]@L1/framing/whiteboard`, `callout@L1/contribution[whiteboard]/whiteboard[contributors]`, `callout@L1/contribution[whiteboard]/whiteboard[admins]`, `callout@L1/contribution[whiteboard]/whiteboard[owner]`, `callout[whiteboard-framing]@L2/framing/whiteboard`, `callout@L2/contribution[whiteboard]/whiteboard[contributors]`, `callout@L2/contribution[whiteboard]/whiteboard[admins]`, `callout@L2/contribution[whiteboard]/whiteboard[owner]`.

| role | contribute | create | delete | grant | pf:content-full-access | public-share | read | update | update-content |
|---|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | · | · |
| platform-content-full-access | · | CT | CT | · | CT | · | CT | CT | · |
| platform-resource-admin | · | · | · | · | · | · | CTS | · | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | · | · |
| space-admin@L0 | · | C | C | C | · | · | CTS | C | · |
| space-invitee@L0 | · | · | · | · | · | · | CTS | · | · |
| space-member@L1 | C | · | · | · | · | · | CTS | · | SR |
| space-lead@L1 | C | · | · | · | · | · | CTS | · | SR |
| space-admin@L1 | C | C | C | C | · | · | CTS | C | SR |
| space-invitee@L1 | · | · | · | · | · | · | CTS | · | · |
| space-member@L2 | C | · | · | · | · | · | CTS | · | SR |
| space-lead@L2 | C | · | · | · | · | · | CTS | · | SR |
| space-admin@L2 | C | · | · | · | · | · | CTS | · | SR |
| space-invitee@L2 | · | · | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | · | · |
| creator-member@L1 | C | C | C | · | · | · | CTS | C | D |
| creator-former-member | D | C | C | · | · | · | CTS | C | D |
| virtual-contributor-member@L1 | C | · | · | · | · | · | C | · | SR |
| applicant | · | · | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | · | · |
| user-group-member | · | · | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- **pub-open+guests**: + contribute (direct|type-only|settings:allowGuestContributions+whiteboard.guestAccess|public-access) for guest, registered, platform-roles-admin, platform-content-full-access, platform-resource-admin and 23 more; + update-content (direct|type-only|settings:allowGuestContributions+whiteboard.guestAccess|public-access) for guest, registered, platform-roles-admin, platform-content-full-access, platform-resource-admin and 23 more; + public-share (direct|parent-credential|settings:allowGuestContributions|space-admin-public-share) for space-admin@L0; + public-share (direct|settings:allowGuestContributions|space-admin-public-share) for space-admin@L1; + public-share (direct|settings:allowGuestContributions|whiteboard-owner-public-share) for creator-member@L1, creator-former-member
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout[whiteboard-framing]@L0/framing/whiteboard`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[whiteboard]/whiteboard[contributors]`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-whiteboardContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[whiteboard]/whiteboard[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-whiteboardContentUpdate) for platform-content-full-access, space-admin@L0; + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[whiteboard]/whiteboard[owner]`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L1/contribution[whiteboard]/whiteboard[contributors]`: same cells as the canonical resource
- `callout@L1/contribution[whiteboard]/whiteboard[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-whiteboardContentUpdate) for platform-content-full-access, space-admin@L0; − update-content for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1
- `callout@L1/contribution[whiteboard]/whiteboard[owner]`: − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more
- `callout[whiteboard-framing]@L2/framing/whiteboard`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[whiteboard]/whiteboard[contributors]`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[whiteboard]/whiteboard[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-whiteboardContentUpdate) for platform-content-full-access, space-admin@L0; − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[whiteboard]/whiteboard[owner]`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### callout-contribution

Canonical resource: `callout@L1/contribution[post]` under `pub-open`. Resources of this type in the matrix: `callout@L0/contribution[post]`, `callout@L1/contribution[post]`, `callout@L2/contribution[post]`.

| role | contribute | create | delete | grant | move-contribution | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | DT | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | DP | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | · | CTS | · |
| space-member@L1 | C | · | · | · | · | · | CTS | · |
| space-lead@L1 | C | · | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | C | D | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | · | CTS | · |
| space-member@L2 | C | · | · | · | · | · | CTS | · |
| space-lead@L2 | C | · | · | · | · | · | CTS | · |
| space-admin@L2 | C | · | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | · |
| creator-member@L1 | C | C | C | · | · | · | CTS | C |
| creator-former-member | · | C | C | · | · | · | CTS | C |
| virtual-contributor-member@L1 | C | · | · | · | · | · | C | · |
| applicant | · | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + move-contribution (direct|type-only|credentialRule-contributionAdminsMove) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + move-contribution (direct|type-only|credentialRule-contributionAdminsMove) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout@L0/contribution[post]`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − move-contribution for space-admin@L1; − update for space-admin@L1
- `callout@L2/contribution[post]`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + move-contribution (direct|credentialRule-contributionAdminsMove) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### post

Canonical resource: `callout@L1/contribution[post]/post` under `pub-open`. Resources of this type in the matrix: `callout@L0/contribution[post]/post`, `callout@L1/contribution[post]/post`, `callout@L2/contribution[post]/post`.

| role | contribute | create | delete | grant | move-post | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | DT | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | DP | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | · | CTS | · |
| space-member@L1 | C | · | · | · | · | · | CTS | · |
| space-lead@L1 | C | · | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | C | D | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | · | CTS | · |
| space-member@L2 | C | · | · | · | · | · | CTS | · |
| space-lead@L2 | C | · | · | · | · | · | CTS | · |
| space-admin@L2 | C | · | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | · | CTS | · |
| creator-member@L1 | C | C | C | · | · | · | CTS | C |
| creator-former-member | · | C | C | · | · | · | CTS | C |
| virtual-contributor-member@L1 | C | · | · | · | · | · | C | · |
| applicant | · | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + move-post (direct|type-only|credentialRule-postAdminsMove) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + move-post (direct|type-only|credentialRule-postAdminsMove) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout@L0/contribution[post]/post`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − move-post for space-admin@L1; − update for space-admin@L1
- `callout@L2/contribution[post]/post`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + move-post (direct|credentialRule-postAdminsMove) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### link

Canonical resource: `callout@L1/contribution[link]/link` under `pub-open`. Resources of this type in the matrix: `callout@L0/contribution[link]/link`, `callout@L1/contribution[link]/link`, `callout@L2/contribution[link]/link`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | CTS | · |
| space-member@L1 | C | · | · | · | · | CTS | · |
| space-lead@L1 | C | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | CTS | · |
| space-member@L2 | C | · | · | · | · | CTS | · |
| space-lead@L2 | C | · | · | · | · | CTS | · |
| space-admin@L2 | C | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · |
| creator-member@L1 | C | C | C | · | · | CTS | C |
| creator-former-member | · | C | C | · | · | CTS | C |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · |
| applicant | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout@L0/contribution[link]/link`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L2/contribution[link]/link`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### memo

Canonical resource: `callout@L1/contribution[memo]/memo[contributors]` under `pub-open`. Resources of this type in the matrix: `callout@L0/contribution[memo]/memo[contributors]`, `callout@L0/contribution[memo]/memo[admins]`, `callout@L0/contribution[memo]/memo[owner]`, `callout@L1/contribution[memo]/memo[contributors]`, `callout@L1/contribution[memo]/memo[admins]`, `callout@L1/contribution[memo]/memo[owner]`, `callout@L2/contribution[memo]/memo[contributors]`, `callout@L2/contribution[memo]/memo[admins]`, `callout@L2/contribution[memo]/memo[owner]`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update | update-content |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | · | CTS | · | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT | · |
| platform-resource-admin | · | · | · | · | · | CTS | · | · |
| platform-settings-admin | · | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | · | CTS | · | · |
| space-admin@L0 | · | C | C | C | · | CTS | C | · |
| space-invitee@L0 | · | · | · | · | · | CTS | · | · |
| space-member@L1 | C | · | · | · | · | CTS | · | SR |
| space-lead@L1 | C | · | · | · | · | CTS | · | SR |
| space-admin@L1 | C | C | C | C | · | CTS | C | SR |
| space-invitee@L1 | · | · | · | · | · | CTS | · | · |
| space-member@L2 | C | · | · | · | · | CTS | · | SR |
| space-lead@L2 | C | · | · | · | · | CTS | · | SR |
| space-admin@L2 | C | · | · | · | · | CTS | · | SR |
| space-invitee@L2 | · | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · | · |
| creator-member@L1 | C | C | C | · | · | CTS | C | D |
| creator-former-member | D | C | C | · | · | CTS | C | D |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · | SR |
| applicant | · | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · | · |
| user-group-member | · | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout@L0/contribution[memo]/memo[contributors]`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|settings:contentUpdatePolicy=contributors|policyRule-memoContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[memo]/memo[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-memoContentUpdate) for platform-content-full-access, space-admin@L0; + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L0/contribution[memo]/memo[owner]`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L1/contribution[memo]/memo[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-memoContentUpdate) for platform-content-full-access, space-admin@L0; − update-content for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, space-admin@L2, virtual-contributor-member@L1
- `callout@L1/contribution[memo]/memo[owner]`: − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more
- `callout@L2/contribution[memo]/memo[contributors]`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[memo]/memo[admins]`: + update-content (privilege-rule(update->update-content)|settings:contentUpdatePolicy=admins|policyRule-memoContentUpdate) for platform-content-full-access, space-admin@L0; − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-member@L2, space-lead@L2, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2
- `callout@L2/contribution[memo]/memo[owner]`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, space-member@L2, space-lead@L2 and 2 more; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### collabora-document

Canonical resource: `callout@L1/contribution[collabora-document]/collabora-document` under `pub-open`. Resources of this type in the matrix: `callout@L0/contribution[collabora-document]/collabora-document`, `callout@L1/contribution[collabora-document]/collabora-document`, `callout@L2/contribution[collabora-document]/collabora-document`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update | update-content |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | · | CTS | · | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT | · |
| platform-resource-admin | · | · | · | · | · | CTS | · | · |
| platform-settings-admin | · | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | · | CTS | · | · |
| space-admin@L0 | · | C | C | C | · | CTS | C | · |
| space-invitee@L0 | · | · | · | · | · | CTS | · | · |
| space-member@L1 | C | · | · | · | · | CTS | · | R |
| space-lead@L1 | C | · | · | · | · | CTS | · | R |
| space-admin@L1 | C | C | C | C | · | CTS | C | R |
| space-invitee@L1 | · | · | · | · | · | CTS | · | · |
| space-member@L2 | C | · | · | · | · | CTS | · | R |
| space-lead@L2 | C | · | · | · | · | CTS | · | R |
| space-admin@L2 | C | · | · | · | · | CTS | · | R |
| space-invitee@L2 | · | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · | · |
| creator-member@L1 | C | C | C | · | · | CTS | C | R |
| creator-former-member | · | C | C | · | · | CTS | C | · |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · | R |
| applicant | · | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · | · |
| user-group-member | · | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `callout@L0/contribution[collabora-document]/collabora-document`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; + update-content (privilege-rule(contribute->update-content)|policyRule-collaboraDocumentContentUpdate) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `callout@L2/contribution[collabora-document]/collabora-document`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; − update-content for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### calendar-event

Canonical resource: `calendar-event@L1` under `pub-open`. Resources of this type in the matrix: `calendar-event@L0`, `calendar-event@L1`, `calendar-event@L2`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · |
| guest | · | · | · | · | · | CTS | · |
| registered | · | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | · | CTS | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | · | CTS | · |
| space-admin@L0 | · | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | · | CTS | · |
| space-member@L1 | C | · | · | · | · | CTS | · |
| space-lead@L1 | C | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | · | CTS | · |
| space-member@L2 | C | · | · | · | · | CTS | · |
| space-lead@L2 | C | · | · | · | · | CTS | · |
| space-admin@L2 | C | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · |
| creator-member@L1 | C | D | D | · | · | CTS | D |
| creator-former-member | · | D | D | · | · | CTS | D |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · |
| applicant | · | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 20 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 17 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `calendar-event@L0`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `calendar-event@L2`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### innovation-flow

Canonical resource: `innovation-flow@L1` under `pub-open`. Resources of this type in the matrix: `innovation-flow@L0`, `innovation-flow@L1`, `innovation-flow@L2`.

| role | contribute | create | delete | grant | pf:content-full-access | read | update | update-innovation-flow |
|---|---|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | · | CTS | · | · |
| guest | · | · | · | · | · | CTS | · | · |
| registered | · | · | · | · | · | CTS | · | · |
| platform-roles-admin | · | · | · | · | · | CTS | · | · |
| platform-content-full-access | · | CT | CT | · | CT | CT | CT | R |
| platform-resource-admin | · | · | · | · | · | CTS | · | · |
| platform-settings-admin | · | · | · | · | · | CTS | · | · |
| platform-operations-admin | · | · | · | · | · | CTS | · | · |
| platform-users-admin | · | · | · | · | · | CTS | · | · |
| platform-support | · | · | · | · | · | CTS | · | · |
| platform-license-manager | · | · | · | · | · | CTS | · | · |
| platform-spaces-reader | · | · | · | · | · | CT | · | · |
| platform-audit-reader | · | · | · | · | · | CTS | · | · |
| feature-beta-tester | · | · | · | · | · | CTS | · | · |
| feature-virtual-assistant | · | · | · | · | · | CTS | · | · |
| feature-organization-creator | · | · | · | · | · | CTS | · | · |
| feature-vc-campaign | · | · | · | · | · | CTS | · | · |
| account-admin | · | · | · | · | · | CTS | · | · |
| organization-associate | · | · | · | · | · | CTS | · | · |
| space-member@L0 | · | · | · | · | · | CTS | · | · |
| space-lead@L0 | · | · | · | · | · | CTS | · | · |
| space-admin@L0 | · | C | C | C | · | CTS | C | R |
| space-invitee@L0 | · | · | · | · | · | CTS | · | · |
| space-member@L1 | C | · | · | · | · | CTS | · | · |
| space-lead@L1 | C | · | · | · | · | CTS | · | · |
| space-admin@L1 | C | C | C | C | · | CTS | C | R |
| space-invitee@L1 | · | · | · | · | · | CTS | · | · |
| space-member@L2 | C | · | · | · | · | CTS | · | · |
| space-lead@L2 | C | · | · | · | · | CTS | · | · |
| space-admin@L2 | C | · | · | · | · | CTS | · | · |
| space-invitee@L2 | · | · | · | · | · | CTS | · | · |
| subspace-admin-derived@L0 | · | · | · | · | · | CTS | · | · |
| creator-member@L1 | C | · | · | · | · | CTS | · | · |
| creator-former-member | · | · | · | · | · | CTS | · | · |
| virtual-contributor-member@L1 | C | · | · | · | · | C | · | · |
| applicant | · | · | · | · | · | CTS | · | · |
| invited-actor-account-admin | · | · | · | · | · | CTS | · | · |
| user-group-member | · | · | · | · | · | CTS | · | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-pub**: + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **t-pub-priv**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more; + contribute (cascade(collaboration@L1)|parent-credential|settings:inheritMembershipRights|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0
- **pub-open+support**: + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update-innovation-flow (privilege-rule(create->update-innovation-flow)|privilegeRuleTypes-innovationFlowUpdate) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + contribute (cascade(collaboration@L1)|type-only|credentialRule-collaborationContributors) for platform-support; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update-innovation-flow (privilege-rule(create->update-innovation-flow)|privilegeRuleTypes-innovationFlowUpdate) for platform-support
- **combined-apply**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more
- t-priv-pub: identical to defaults
- t-priv-priv: identical to t-pub-priv
- pub-open+members: identical to t-pub-pub
- pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- archived: identical to combined-apply

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `innovation-flow@L0`: + contribute (cascade(collaboration@L0)|credentialRule-collaborationContributors) for space-member@L0, space-lead@L0, space-admin@L0, subspace-admin-derived@L0; − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1; − update-innovation-flow for space-admin@L1
- `innovation-flow@L2`: − contribute for space-member@L1, space-lead@L1, space-admin@L1, creator-member@L1, virtual-contributor-member@L1; + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update-innovation-flow (privilege-rule(create->update-innovation-flow)|privilegeRuleTypes-innovationFlowUpdate) for space-admin@L2

### license

Canonical resource: `license@L1` under `pub-open`. Resources of this type in the matrix: `license@L0`, `license@L1`, `license@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 22 more
- **defaults**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 21 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- t-pub-pub, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open
- t-pub-priv, t-priv-priv: identical to priv-applications
- t-priv-pub, combined-apply, archived: identical to defaults

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `license@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `license@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### space-about

Canonical resource: `space-about@L1` under `pub-open`. Resources of this type in the matrix: `space-about@L0`, `space-about@L1`, `space-about@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 16 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- defaults, t-priv-pub, t-priv-priv, combined-apply, archived: identical to priv-applications
- t-pub-pub, t-pub-priv, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `space-about@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-about@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### visual

Canonical resource: `space-about@L1/profile/visual` under `pub-open`. Resources of this type in the matrix: `space-about@L0/profile/visual`, `space-about@L1/profile/visual`, `space-about@L2/profile/visual`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 17 more
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-settings-admin and 16 more; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- defaults, t-priv-pub, t-priv-priv, combined-apply, archived: identical to priv-applications
- t-pub-pub, t-pub-priv, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `space-about@L0/profile/visual`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `space-about@L2/profile/visual`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### community-guidelines

Canonical resource: `community-guidelines@L1` under `pub-open`. Resources of this type in the matrix: `community-guidelines@L0`, `community-guidelines@L1`, `community-guidelines@L2`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | C | C | C | · | CTS | C |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for guest
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for guest; + create (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L1)|type-only|credentialRule-spaceAdmins) for platform-support
- defaults, t-priv-pub, t-priv-priv, combined-apply, archived: identical to priv-applications
- t-pub-pub, t-pub-priv, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):

- `community-guidelines@L0`: − create for space-admin@L1; − delete for space-admin@L1; − grant for space-admin@L1; − update for space-admin@L1
- `community-guidelines@L2`: + create (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + delete (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + grant (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2; + update (cascade(space@L2)|credentialRule-spaceAdmins) for space-admin@L2

### templates-set

Canonical resource: `templates-set@L0` under `pub-open`. Resources of this type in the matrix: `templates-set@L0`.

| role | create | delete | grant | pf:content-full-access | read | update |
|---|---|---|---|---|---|---|
| anonymous | · | · | · | · | CTS | · |
| guest | · | · | · | · | CTS | · |
| registered | · | · | · | · | CTS | · |
| platform-roles-admin | · | · | · | · | CTS | · |
| platform-content-full-access | CT | CT | · | CT | CT | CT |
| platform-resource-admin | · | · | · | · | CTS | · |
| platform-settings-admin | · | · | · | · | CTS | · |
| platform-operations-admin | · | · | · | · | CTS | · |
| platform-users-admin | · | · | · | · | CTS | · |
| platform-support | · | · | · | · | CTS | · |
| platform-license-manager | · | · | · | · | CTS | · |
| platform-spaces-reader | · | · | · | · | CT | · |
| platform-audit-reader | · | · | · | · | CTS | · |
| feature-beta-tester | · | · | · | · | CTS | · |
| feature-virtual-assistant | · | · | · | · | CTS | · |
| feature-organization-creator | · | · | · | · | CTS | · |
| feature-vc-campaign | · | · | · | · | CTS | · |
| account-admin | · | · | · | · | CTS | · |
| organization-associate | · | · | · | · | CTS | · |
| space-member@L0 | · | · | · | · | CTS | · |
| space-lead@L0 | · | · | · | · | CTS | · |
| space-admin@L0 | C | C | C | · | CTS | C |
| space-invitee@L0 | · | · | · | · | CTS | · |
| space-member@L1 | · | · | · | · | CTS | · |
| space-lead@L1 | · | · | · | · | CTS | · |
| space-admin@L1 | · | · | · | · | CTS | · |
| space-invitee@L1 | · | · | · | · | CTS | · |
| space-member@L2 | · | · | · | · | CTS | · |
| space-lead@L2 | · | · | · | · | CTS | · |
| space-admin@L2 | · | · | · | · | CTS | · |
| space-invitee@L2 | · | · | · | · | CTS | · |
| subspace-admin-derived@L0 | · | · | · | · | CTS | · |
| creator-member@L1 | · | · | · | · | CTS | · |
| creator-former-member | · | · | · | · | CTS | · |
| virtual-contributor-member@L1 | · | · | · | · | C | · |
| applicant | · | · | · | · | CTS | · |
| invited-actor-account-admin | · | · | · | · | CTS | · |
| user-group-member | · | · | · | · | CTS | · |

**Variant deltas** (against the base table of the canonical resource):

- **priv-applications**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 19 more
- **pub-open+support**: + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **priv-applications+support**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 18 more; + create (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + delete (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + grant (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support; + update (cascade(space@L0)|type-only|credentialRule-spaceAdmins) for platform-support
- **archived**: − read for anonymous, guest, registered, platform-roles-admin, platform-resource-admin and 31 more; − create for space-admin@L0; − delete for space-admin@L0; − grant for space-admin@L0; − update for space-admin@L0
- defaults, t-priv-pub, t-priv-priv, combined-apply: identical to priv-applications
- t-pub-pub, t-pub-priv, pub-open+members, pub-applications, pub-invitations, pub-open+guests, trusted-org, L0pub-L1pub-L2priv, user-hosted: identical to pub-open

## Where this lands in the new core (from the rebuild briefing)

The new core stores no policy rows: one SQL verdict is computed from the credential rows and the space tree. Every row of this matrix is therefore an assertion on that verdict, not on a stored shape. What changes:

- **Cascade becomes tree walk.** A `C` cell is a grant on an ancestor; the verdict must find the ancestor and apply the same role mapping. The `cascade: false` rules (notification privileges, entry-role apply/join/invite/assign, rename, license settings, transfer offer/accept, the private-space `read-about`) must NOT be reachable from descendants.
- **Parent credentials disappear.** A `P` cell (the L0 admin administering L1 and L2) must come from the tree walk, never from a stored copy of ancestor credentials — the register's A1 escalation (admin roles carrying an ancestor *member* credential) must have no translation.
- **Derived credentials disappear.** The `X` cells (`space-subspace-admin` inviting on the parent, when `allowSubspaceAdminsToInviteMembers` is set) must be computed from "is admin of a child space".
- **Privilege rules become verdict logic.** `R` cells (contribute→create-post, update→file-upload, contribute→update-content under `contentUpdatePolicy=contributors`, read→read-about…) are one-hop mappings evaluated on the resource itself; they never propagate.
- **Settings variants are inputs to the verdict.** Every `S` cell names the setting that switches it; the W5 re-point must run each variant.
- **Creator rights are per-row facts.** `createdBy` grants (callout, contribution, post delete, whiteboard/memo content, document, calendar event, link delete) are evaluated from the row's creator column.
- **Platform roles are credentials scoped by target type**, with exactly the per-family privileges in the `platform` and `platform/role-set` tables; `platform-content-full-access` is the only credential whose CRUD cascades from the root.

