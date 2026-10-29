"""Transcription of the server's `*.service.authorization.ts` policy builders into the engine.

HAND-DERIVED. Every rule names the server file and line it was copied from (`origin/develop`
@ the SHA recorded in access-matrix.json). When the server changes one of those builders, this
file has to follow; `parse_server.py` only covers the enums, role definitions and constants.

Conventions: entity ids are synthetic ('L0', 'L1', 'L2' spaces, 'ACC' the hosting account, 'ORG'
an organisation with account 'ORGACC', 'U' a user, 'CREATOR' the user that created the content,
'INVITEE' an invited actor, 'VCACC' the account of a virtual contributor). A criterion with
resource '' is type-only, exactly like the server's `createCredentialRuleUsingTypesOnly`.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from engine import Criterion, Policy

SPACE = 'src/domain/space/space/space.service.authorization.ts'
SPACE_PRA = 'src/domain/space/space/space.service.platform.roles.access.ts'
ROOT = 'src/platform/authorization/platform.authorization.policy.service.ts'
PLATFORM = 'src/platform/platform/platform.service.authorization.ts'
COMMUNITY = 'src/domain/community/community/community.service.authorization.ts'
ROLESET = 'src/domain/access/role-set/role.set.service.authorization.ts'
ACCOUNT = 'src/domain/space/account/account.service.authorization.ts'
COLLAB = 'src/domain/collaboration/collaboration/collaboration.service.authorization.ts'
CSET = 'src/domain/collaboration/callouts-set/callouts.set.service.authorization.ts'
CALLOUT = 'src/domain/collaboration/callout/callout.service.authorization.ts'
CONTRIB = 'src/domain/collaboration/callout-contribution/callout.contribution.service.authorization.ts'
POST = 'src/domain/collaboration/post/post.service.authorization.ts'
WB = 'src/domain/common/whiteboard/whiteboard.service.authorization.ts'
WBG = 'src/domain/common/whiteboard/whiteboard.guest-access.service.ts'
MEMO = 'src/domain/common/memo/memo.service.authorization.ts'
LINK = 'src/domain/collaboration/link/link.service.authorization.ts'
COLLABORA = 'src/domain/collaboration/collabora-document/collabora.document.service.authorization.ts'
MEDIA = 'src/domain/common/media-gallery/media.gallery.service.authorization.ts'
SAGG = 'src/domain/storage/storage-aggregator/storage.aggregator.service.authorization.ts'
BUCKET = 'src/domain/storage/storage-bucket/storage.bucket.service.authorization.ts'
DOC = 'src/domain/storage/document/document.service.authorization.ts'
PROFILE = 'src/domain/common/profile/profile.service.authorization.ts'
VISUAL = 'src/domain/common/visual/visual.service.authorization.ts'
SUPPORT_RULE = 'src/domain/common/profile/platform.support.org.resources.profile.rule.ts'
USER = 'src/domain/community/user/user.service.authorization.ts'
ORG = 'src/domain/community/organization/organization.service.authorization.ts'
ORGVER = 'src/domain/community/organization-verification/organization.verification.service.authorization.ts'
VC = 'src/domain/community/virtual-contributor/virtual.contributor.service.authorization.ts'
KB = 'src/domain/common/knowledge-base/knowledge.base.service.authorization.ts'
UGROUP = 'src/domain/community/user-group/user-group.service.authorization.ts'
TMGR = 'src/domain/template/templates-manager/templates.manager.service.authorization.ts'
TSET = 'src/domain/template/templates-set/templates.set.service.authorization.ts'
TEMPLATE = 'src/domain/template/template/template.service.authorization.ts'
FLOW = 'src/domain/collaboration/innovation-flow/innovation.flow.service.authorization.ts'
TIMELINE = 'src/domain/timeline/timeline/timeline.service.authorization.ts'
CALENDAR = 'src/domain/timeline/calendar/calendar.service.authorization.ts'
EVENT = 'src/domain/timeline/event/event.service.authorization.ts'
COMM = 'src/domain/communication/communication/communication.service.authorization.ts'
ROOM = 'src/domain/communication/room/room.service.authorization.ts'
CONV = 'src/domain/communication/conversation/conversation.service.authorization.ts'
MSG = 'src/domain/communication/messaging/messaging.service.authorization.ts'
ABOUT = 'src/domain/space/space.about/space.about.service.authorization.ts'
GUIDE = 'src/domain/community/community-guidelines/community.guidelines.service.authorization.ts'
APPL = 'src/domain/access/application/application.service.authorization.ts'
INVIT = 'src/domain/access/invitation/invitation.service.authorization.ts'
FORUM = 'src/platform/forum/forum.service.authorization.ts'
DISC = 'src/platform/forum-discussion/discussion.service.authorization.ts'
LIB = 'src/library/library/library.service.authorization.ts'
PACK = 'src/library/innovation-pack/innovation.pack.service.authorization.ts'
HUB = 'src/domain/innovation-hub/innovation.hub.service.authorization.ts'
LICFW = 'src/platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization.ts'
VA = 'src/domain/community/virtual-assistant/virtual.assistant.service.authorization.ts'
MOVER = 'src/domain/access/platform-roles-access/platform.resource.admin.mover.read.rule.ts'
AISERVER = 'src/services/ai-server/ai-server/ai.server.service.authorization.ts'
# resolver-local IN_MEMORY policies (global.policy.constants.ts): the gate is a hard-coded policy, not the entity's tree
SYNTHETIC = {
    'synthetic/admin-communication-grant': ('src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts:54', ['platform-operations-admin', 'grant'], ['platform-operations-admin']),
    'synthetic/registration-delete-user': ('src/services/api/registration/registration.resolver.mutations.ts:63', ['platform-users-admin'], ['platform-users-admin']),
    'synthetic/conversion-global-admins': ('src/services/api/conversion/conversion.resolver.mutations.ts:73', ['transfer-resource-offer'], ['platform-resource-admin']),
    'synthetic/admin-identity-delete-kratos': ('src/platform-admin/core/identity/admin.identity.resolver.mutations.ts:37', ['platform-users-admin'], ['platform-users-admin']),
    'synthetic/admin-user-account-delete': ('src/platform-admin/domain/user/admin.users.resolver.mutations.ts:42', ['platform-users-admin'], ['platform-users-admin']),
    'synthetic/admin-user-email-change': ('src/platform-admin/domain/user/email-change/admin.user.email.change.resolver.mutations.ts:41', ['platform-users-admin'], ['platform-users-admin']),
    'synthetic/platform-well-known-vc-set': ('src/platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.resolver.mutations.ts:41', ['platform-settings-admin'], ['platform-settings-admin']),
    'synthetic/license-definition-admin': ('src/common/constants/authorization/license.definition.policy.ts:43', ['create', 'read', 'update', 'delete'], ['platform-settings-admin']),
}

CRUD = ('create', 'read', 'update', 'delete')
CRUDG = CRUD + ('grant',)
PLATFORM_ROLE_TYPES = {  # RoleName -> AuthorizationCredential (identical strings, platform.roles.access.service.ts ROLE_CREDENTIAL_MAP)
    'anonymous': 'global-anonymous', 'guest': 'global-guest', 'registered': 'global-registered',
    'platform-license-manager': 'platform-license-manager', 'platform-spaces-reader': 'platform-spaces-reader',
    'platform-resource-admin': 'platform-resource-admin', 'platform-support': 'platform-support',
}


# ----------------------------------------------------------------------------------------------
# scenario
# ----------------------------------------------------------------------------------------------
@dataclass
class SpaceSettings:
    privacy: str = 'public'            # public | private
    membership: str = 'open'           # open | applications | invitations
    support: bool = False              # privacy.allowPlatformSupportAsAdmin
    subadmins_invite: bool = False     # membership.allowSubspaceAdminsToInviteMembers
    trusted_org: bool = False          # membership.trustedOrganizations contains ORG
    inherit: bool = False              # collaboration.inheritMembershipRights
    m_callouts: bool = False           # collaboration.allowMembersToCreateCallouts
    m_subspaces: bool = False          # collaboration.allowMembersToCreateSubspaces
    guests: bool = False               # collaboration.allowGuestContributions
    visibility: str = 'active'         # active | demo | inactive | archived

    def describe(self) -> str:
        flags = [n for n in ('support', 'subadmins_invite', 'trusted_org', 'inherit', 'm_callouts', 'm_subspaces', 'guests') if getattr(self, n)]
        return f"{self.privacy}/{self.membership}" + (f"/{self.visibility}" if self.visibility != 'active' else '') + (('+' + '+'.join(flags)) if flags else '')


@dataclass
class Scenario:
    id: str
    description: str
    levels: dict[int, SpaceSettings]
    account_type: str = 'organization'   # organization | user
    whiteboard_guest_access: bool = False  # the per-whiteboard toggle (guest contributions must also be on)

    def describe(self) -> str:
        return '; '.join(f"L{l}={s.describe()}" for l, s in sorted(self.levels.items())) + f"; account={self.account_type}"


# ----------------------------------------------------------------------------------------------
# role-set credential helpers (role.set.service.ts getCredentialsForRole / ...WithParents /
# getDirectParentCredentialForRole; parentCredentials are the ancestors' same-role credentials
# in direct-parent-first order, as setParentRoleSetAndCredentials writes them, lines 2062-2089)
# ----------------------------------------------------------------------------------------------
def space_id(level: int) -> str:
    return f'L{level}'


def cred(role: str, level: int, via: str = 'own') -> Criterion:
    return Criterion(f'space-{role}', space_id(level), via)


def creds_for_role(level: int, role: str) -> list[Criterion]:
    return [cred(role, level)]


def creds_for_role_with_parents(level: int, role: str) -> list[Criterion]:
    return [cred(role, level)] + [cred(role, l, 'parent') for l in range(level - 1, -1, -1)]


def direct_parent_cred(level: int, role: str) -> Criterion | None:
    return cred(role, level - 1, 'parent') if level > 0 else None


def account_admin(account: str = 'ACC', via: str = 'own') -> Criterion:
    return Criterion('account-admin', account, via)


# ----------------------------------------------------------------------------------------------
# platformRolesAccess per space (space.service.platform.roles.access.ts createPlatformRolesAccess)
# ----------------------------------------------------------------------------------------------
def platform_roles_access(level: int, s: SpaceSettings, parent: dict[str, list[str]] | None) -> dict[str, list[str]]:
    archived = s.visibility == 'archived'
    public = s.privacy == 'public'

    def viewer(role: str, extra_public: list[str]) -> list[str]:
        if archived:
            return []
        if level == 0:
            return ['read-about'] + (['read'] + extra_public if public else [])
        if 'read' in (parent or {}).get(role, []):
            return ['read-about'] + (['read'] + extra_public if public else [])
        return []

    support: list[str] = []
    if level == 0:
        if s.support:
            support = list(CRUDG) + (['public-share'] if s.guests else [])
    elif 'update' in (parent or {}).get('platform-support', []):
        support = list(CRUDG)
    return {
        'anonymous': viewer('anonymous', []),                       # SPACE_PRA:170-200
        'guest': viewer('guest', ['read-users']),                    # SPACE_PRA:202-236
        'registered': viewer('registered', []),                     # SPACE_PRA:238-268
        'platform-license-manager': ['read-license', 'read-about'] if level == 0 else [],  # SPACE_PRA:156-168
        'platform-spaces-reader': ['read'],                          # SPACE_PRA:85
        'platform-resource-admin': ['read', 'read-about'],           # SPACE_PRA:106-111
        'platform-support': support,                                 # SPACE_PRA:120-154
    }


def roles_with_access(access: dict[str, list[str]], allowed: list[str]) -> list[Criterion]:
    """PlatformRolesAccessService.getCredentialsForRolesWithAccess: type-only criteria."""
    return [Criterion(PLATFORM_ROLE_TYPES[r], '', 'type-only') for r, privs in access.items() if any(p in allowed for p in privs)]


# ----------------------------------------------------------------------------------------------
# root + platform
# ----------------------------------------------------------------------------------------------
def root_policy() -> Policy:
    """PlatformAuthorizationPolicyService.createRootCredentialRules — the only root rule after Slice B."""
    p = Policy('root', 'platform')
    p.add_types('credentialRuleTypes-platformContentFullAccess', CRUD + ('platform-content-full-access',),
                ['platform-content-full-access'], f'{ROOT}:111')
    return p


def inherit_root(policy: Policy) -> Policy:
    return policy.inherit(root_policy())


class Builder:
    """Builds every policy of one scenario. `nodes` maps resource id -> Policy."""

    def __init__(self, scenario: Scenario):
        self.s = scenario
        self.nodes: dict[str, Policy] = {}
        self.access: dict[int, dict[str, list[str]]] = {}
        self.visibility_criteria: dict[int, list[Criterion]] = {}

    def node(self, name: str, type_: str) -> Policy:
        p = Policy(name, type_)
        self.nodes[name] = p
        return p

    # ---------------------------------------------------------------- shared children ---------
    def profile(self, name: str, parent: Policy, extra_rules=(), threaded_privilege_rules=(), with_bucket=True, bucket_doc_creator=True) -> Policy:
        """ProfileAuthorizationService: profile, visual, reference, storage bucket (+ document)."""
        prof = self.node(name, 'profile').inherit(parent)
        for r in extra_rules:
            prof.credential_rules.append(r)
        for pr in threaded_privilege_rules:
            prof.privilege_rules.append(pr(prof.entity))
        vis = self.node(f'{name}/visual', 'visual').inherit(prof)
        vis.add_privilege_rule('policyRule-visualUpdate', 'contribute', ['update'], f'{VISUAL}:33')
        for pr in threaded_privilege_rules:
            vis.privilege_rules.append(pr(vis.entity))
        ref = self.node(f'{name}/reference', 'reference').inherit(prof)
        for pr in threaded_privilege_rules:
            ref.privilege_rules.append(pr(ref.entity))
        if with_bucket:
            self.bucket(f'{name}/bucket', prof, threaded_privilege_rules, creator_rule=bucket_doc_creator)
        return prof

    def bucket(self, name: str, parent: Policy, threaded_privilege_rules=(), creator_rule=True) -> Policy:
        b = self.node(name, 'storage-bucket').inherit(parent)
        b.add_privilege_rule('policyRule-storageBucketUpdaterFileUpload', 'update', ['file-upload'], f'{BUCKET}:100')
        b.add_privilege_rule('policyRule-storageBucketContributorFileUpload', 'contribute', ['file-upload'], f'{BUCKET}:107')
        b.add_privilege_rule('policyRule-platformDelete', 'delete', ['file-delete'], f'{BUCKET}:114')
        for pr in threaded_privilege_rules:
            b.privilege_rules.append(pr(b.entity))
        d = self.node(f'{name}/document', 'document').inherit(b)
        if creator_rule:  # DocumentAuthorizationService.appendCredentialRules — not for conversation buckets
            d.add('credentialRule-documentCreatedBy', CRUD, [Criterion('user-self', 'CREATOR')], f'{DOC}:89')
        return b

    def room(self, name: str, parent: Policy, contributors_create: bool, reply_react: bool = True) -> Policy:
        r = self.node(name, 'room').inherit(parent)
        r.add_privilege_rule('policyRule-roomAdminsCreate', 'create', ['create-message', 'create-message-reply', 'create-message-reaction'], f'{ROOM}:84')
        if contributors_create:
            r.add_privilege_rule('policyRule-roomContribute', 'contribute', ['create-message'], f'{ROOM}:44')
        if reply_react:
            r.add_privilege_rule('policyRule-roomContribute', 'contribute', ['create-message-reply', 'create-message-reaction'], f'{ROOM}:63')
        return r

    @staticmethod
    def support_org_resources_rule(entity: str):
        from engine import PrivilegeRule
        return PrivilegeRule('policyRule-platformSupportOrgResourcesProfileEdit', 'platform-support-org-resources',
                             ('update', 'create', 'file-upload'), f'{SUPPORT_RULE}:30', entity)

    # ---------------------------------------------------------------- platform tree ------------
    def build_platform(self) -> None:
        plat = self.node('platform', 'platform')
        inherit_root(plat)
        e = PLATFORM
        plat.add_types('credentialRuleTypes-platformPlatformOperationsAdmin', ['platform-operations-admin'], ['platform-operations-admin'], f'{e}:279', cascade=False)
        plat.add_types('credentialRuleTypes-platformPlatformAdmins', ['platform-settings-admin'], ['platform-settings-admin'], f'{e}:302', cascade=False)
        plat.add_types('credentialRuleTypes-platformAuditRead', ['platform-audit-read'], ['platform-audit-reader'], f'{e}:314', cascade=False)
        plat.add_types('credentialRuleTypes-setServiceProfile', ['set-service-profile'], ['platform-roles-admin'], f'{e}:325', cascade=False)
        plat.add_types('credentialRuleTypes-platformUsersAdmin', ['platform-users-admin'], ['platform-users-admin'], f'{e}:346', cascade=False)
        plat.add_types('credentialRuleTypes-platformForumManage', ['platform-forum-manage'], ['platform-support'], f'{e}:361', cascade=True)
        plat.add_types('credentialRuleTypes-platformSupportListsRead', ['platform-support-lists-read'], ['platform-support'], f'{e}:380', cascade=False)
        plat.add_types('credentialRuleTypes-platformLicensingListsRead', ['platform-licensing-lists-read'], ['platform-license-manager'], f'{e}:401', cascade=False)
        plat.add_types('credentialRuleTypes-platformPlatformAuthReset', ['authorization-reset'], ['platform-operations-admin'], f'{e}:428', cascade=False)
        plat.add_types(' Receive notifications platform admin', ['receive-notifications-admin'],
                       ['platform-roles-admin', 'platform-users-admin', 'platform-support', 'platform-license-manager'], f'{e}:442', cascade=False)
        plat.add_types('Receive notifications organization admin', ['receive-notifications-organization-admin'], ['organization-admin'], f'{e}:456', cascade=False)
        plat.add_types('Receive notifications space admin', ['receive-notifications-space-admin'], ['space-admin'], f'{e}:466', cascade=False)
        plat.add_types('Receive notifications space lead', ['receive-notifications-space-lead'], ['space-lead'], f'{e}:476', cascade=False)
        plat.add_types('credentialRuleTypes-platformReadRegistered', ['read-users'], ['global-registered'], f'{e}:486', cascade=False)
        plat.add_types('credentialRuleTypes-platformCreateOrganization', ['create-organization'], ['platform-support', 'feature-organization-creator'], f'{e}:499', cascade=False)
        plat.add_types('credentialRuleTypes-platformAccessGuidance', ['access-interactive-guidance'], ['global-registered'], f'{e}:225', cascade=False)
        plat.add_types('credentialRuleTypes-platformAccessVirtualAssistant', ['access-virtual-assistant'], ['feature-virtual-assistant'], f'{e}:245', cascade=False)

        lib = self.node('library', 'library').inherit(plat)
        lib.anonymous_registered_read(f'{LIB}:26')

        tm = self.node('platform/templates-manager', 'templates-manager').inherit(plat)
        tset = self.node('platform/templates-set', 'templates-set').inherit(plat)   # TMGR:69 passes the platform policy, not the manager's
        tpl = self.node('platform/template', 'template').inherit(tset)
        self.profile('platform/template/profile', tpl, threaded_privilege_rules=[self.support_org_resources_rule])

        rs = self.node('platform/role-set', 'role-set').inherit(plat)
        rs.add_types('credentialRuleTypes-platformRolesAssign', ['platform-roles-assign'], ['platform-roles-admin'], f'{e}:533', cascade=False)
        rs.add_types('credentialRuleTypes-featureRoleAssign', ['feature-role-assign'], ['platform-users-admin', 'platform-roles-admin'], f'{e}:545', cascade=False)
        rs.add_types('credentialRuleTypes-platformRoleHoldersRead', ['platform-role-holders-read'], ['platform-roles-admin', 'platform-audit-reader'], f'{e}:562', cascade=False)
        rs.add_types('credentialRuleTypes-featureRoleHoldersRead', ['feature-role-holders-read'], ['platform-users-admin'], f'{e}:581', cascade=False)
        rs.add_privilege_rule('policyRule-communityInvite', 'roleset-entry-role-assign', ['roleset-entry-role-invite'], f'{ROLESET}:289')

        forum = self.node('forum', 'forum').inherit(plat)
        # FORUM:56-70: the `createRule.cascade = true` on line 70 targets createRule (a copy-paste slip), so BOTH rules cascade.
        forum.add_types('credentialRuleTypes-forumRead', ['create-discussion'], ['global-registered'], f'{FORUM}:56', cascade=True)
        forum.add_types('credentialRuleTypes-forumContribute', ['contribute'], ['global-registered'], f'{FORUM}:65', cascade=True)
        forum.add_types('credentialRuleTypes-forumRead', ['read'], ['global-anonymous', 'global-registered'], f'{FORUM}:74', cascade=True)
        forum.add_privilege_rule('policyRule-forumCreate', 'create', ['create-discussion'], f'{FORUM}:105')
        for privacy in ('public', 'authenticated'):
            disc = self.node(f'discussion[{privacy}]', 'discussion').inherit(forum)
            disc.add_types('credentialRuleTypes-updateForumDiscussion', ['update', 'platform-forum-manage'], ['platform-support'], f'{DISC}:122', cascade=False)
            clone = disc.clone()
            if privacy == 'public':
                disc.anonymous_registered_read(f'{DISC}:71')
            self.profile(f'discussion[{privacy}]/profile', disc)
            self.room(f'discussion[{privacy}]/comments', clone, contributors_create=True)

        storage = plat.clone('platform/storage')
        storage.add_types('credentialRuleTypes-platformFileUploadAnyUser', ['file-upload', 'read'], ['global-registered'], f'{e}:201', cascade=True)
        storage.anonymous_registered_read(f'{e}:140')
        agg = self.node('platform/storage-aggregator', 'storage-aggregator').inherit(storage)
        agg.anonymous_registered_read(f'{SAGG}:52')
        self.bucket('platform/storage-aggregator/bucket', agg)

        lic = self.node('licensing', 'licensing').inherit(plat)
        lic.registered_access(f'{LICFW}:66')
        lic.add_types('credentialRule-licenseManager', CRUD, ['platform-settings-admin'], f'{LICFW}:116', cascade=True)
        lic.add_types('credentialRule-licensePlanUsage', ['grant'], ['platform-license-manager'], f'{LICFW}:136', cascade=True)
        lic.add_types('credentialRule-licenseReset', ['license-reset'], ['platform-operations-admin'], f'{LICFW}:149', cascade=False)
        self.node('license-policy', 'license-policy').inherit(lic)

        msg = self.node('messaging', 'communication-messaging').inherit(plat)
        msg.add_types('credentialRuleTypes-messagingCreateConversation', ['create'], ['global-registered'], f'{MSG}:46', cascade=False)
        conv = self.node('conversation', 'communication-conversation')  # CONV:85 reset: NO inheritance from messaging
        conv.add('Communication Conversation Participants Access (Membership-based)', ['read', 'contribute'],
                 [Criterion('user-self', 'U'), Criterion('user-self', 'CREATOR')], f'{CONV}:151', cascade=True)
        self.room('conversation/room', conv, contributors_create=True)
        cagg = self.node('conversation/storage-aggregator', 'storage-aggregator').inherit(conv)   # CONV:121 — no anonymous read here
        self.bucket('conversation/storage-aggregator/bucket', cagg, creator_rule=False)

        ai = self.node('ai-server', 'ai-server')   # AISERVER:17 reset, no root inheritance
        ai.add_types('credentialRuleTypes-aiServerGlobalAdmins', CRUD, ['platform-content-full-access'], f'{AISERVER}:79', cascade=True)
        ai.add_types('credentialRuleTypes-aiServerAuthReset', ['authorization-reset'], ['platform-operations-admin'], f'{AISERVER}:98', cascade=False)
        ai.add_types('credentialRuleTypes-aiServerPersonaCreate', ['create'], ['platform-operations-admin'], f'{AISERVER}:112', cascade=False)
        for name, (evidence, privs, creds) in SYNTHETIC.items():
            self.node(name, 'in-memory').add_types(name.split('/')[1], privs, creds, evidence, cascade=False)

        va = self.node('virtual-assistant', 'virtual-assistant')
        inherit_root(va)
        va.add_types('credentialRuleTypes-virtualAssistantManage', CRUD + ('platform-operations-admin',), ['platform-operations-admin'], f'{VA}:53')
        va.add_types('credentialRuleTypes-virtualAssistantRead', ['read'], ['global-registered'], f'{VA}:70')

    # ---------------------------------------------------------------- account tree -------------
    def build_account(self) -> None:
        acc = self.node('account', 'account')
        inherit_root(acc)                                               # ACCOUNT:105 (the read rule appended on :100 is wiped by this reset)
        e = ACCOUNT
        acc.anonymous_registered_read(f'{e}:309')
        acc.add_types('credentialRuleTypes-accountManageGlobalRoles', ['create-space', 'create-innovation-hub', 'create-innovation-pack', 'create-virtual-contributor'],
                      ['platform-content-full-access'], f'{e}:325', cascade=False)
        acc.add_types('credentialRuleTypes-accountCreateInnovationHubPlatformLicenseManager', ['create-innovation-hub'], ['platform-license-manager'], f'{e}:348', cascade=False)
        acc.add_types('credentialRuleTypes-accountAuthReset', ['authorization-reset', 'license-reset'], ['platform-operations-admin'], f'{e}:361', cascade=False)
        acc.add_types('credentialRuleTypes-spaceGlobalRead', ['read'], ['platform-spaces-reader'], f'{e}:379', cascade=True)
        acc.add_types('credentialRuleTypes-accountPlatformResourceAdminRead', ['read'], ['platform-resource-admin'], f'{e}:396', cascade=False)
        acc.add('credentialRuleTypes-accountResourcesManage', ['transfer-resource-offer'],
                [Criterion('platform-resource-admin', '', 'type-only'), account_admin()], f'{e}:407', cascade=False)
        acc.add('credentialRuleTypes-accountResourceTransferAccept', ['transfer-resource-accept'],
                [Criterion('platform-resource-admin', '', 'type-only'), account_admin()], f'{e}:417', cascade=False)
        acc.add_types('credentialRuleTypes-accountLicenseManage', ['account-license-manage'], ['platform-license-manager'], f'{e}:428', cascade=False)
        if self.s.account_type == 'organization':
            acc.add_types('credentialRuleTypes-platformSupportOrgResources', ['platform-support-org-resources'], ['platform-support'], f'{e}:455',
                          cascade=True, condition='account.type=organization')
        acc.add('credentialRuleTypes-accountManage', CRUD, [account_admin()], f'{e}:466', cascade=True)
        acc.add('credentialRuleTypes-platformCreateSpace', ['create-space'], [account_admin()], f'{e}:479', cascade=False)
        acc.add('credentialRuleTypes-platformCreateVC', ['create-virtual-contributor'], [account_admin()], f'{e}:487', cascade=False)
        acc.add('credentialRuleTypes-platformCreateInnovationPack', ['create-innovation-pack'], [account_admin()], f'{e}:496', cascade=False)

        self.node('account/license', 'license').inherit(acc)
        agg = self.node('account/storage-aggregator', 'storage-aggregator').inherit(acc)
        agg.anonymous_registered_read(f'{SAGG}:52')
        self.bucket('account/storage-aggregator/bucket', agg)
        self.profile('account/profile', acc)

        child = acc.clone('account[child-entities]')   # getClonedAccountAuthExtendedForChildEntities
        child.add('credentialRuleTypes-accountChildEntities', CRUDG, [account_admin()], f'{e}:523', cascade=True)

        pack = self.node('innovation-pack', 'innovation-pack').inherit(child)
        self.profile('innovation-pack/profile', pack, threaded_privilege_rules=[self.support_org_resources_rule])
        tset = self.node('innovation-pack/templates-set', 'templates-set').inherit(pack)
        tpl = self.node('innovation-pack/template', 'template').inherit(tset)
        self.profile('innovation-pack/template/profile', tpl, threaded_privilege_rules=[self.support_org_resources_rule])
        # a callout template inside the pack: callout auth with platformRolesAccess.roles = [] and no role set
        self.callout('innovation-pack/template/callout', tpl, level=None, draft=False, framing='post', allowed=('post', 'link', 'whiteboard'))

        hubparent = child.clone('innovation-hub[parent]')
        hubparent.anonymous_registered_read(f'{HUB}:49')
        hub = self.node('innovation-hub', 'innovation-hub').inherit(hubparent)
        self.profile('innovation-hub/profile', hub, threaded_privilege_rules=[self.support_org_resources_rule])

    # ---------------------------------------------------------------- virtual contributor ------
    def build_virtual_contributor(self, visibility: str, kb_visible: bool) -> None:
        name = f'virtual-contributor[{visibility}{",kb-visible" if kb_visible else ""}]'
        vc = self.node(name, 'virtual-contributor')
        inherit_root(vc)
        vc.add_types('credentialRuleTypes-virtualContributorPlatformSettings', ['platform-operations-admin'], ['platform-operations-admin'], f'{VC}:206', cascade=False)
        vc.add('credentialRule-accountAdminManage', CRUD + ('contribute', 'receive-notifications', 'update-nameid'), [account_admin('VCACC')], f'{VC}:220', cascade=True)
        base = vc.clone()
        if visibility == 'public':
            crit = [Criterion('global-anonymous', '', 'type-only'), Criterion('global-registered', '', 'type-only')]
        elif visibility == 'account':
            crit = [Criterion('space-member', 'L0', 'data-dependent')]     # one criterion per space of the account
        else:
            crit = []
        if crit:
            vc.add('credentialRuleTypes-vcGlobalCommunityRead', ['read'], crit, f'{VC}:91', cascade=True, condition=f'searchVisibility={visibility}')
        vc.add_privilege_rule('policyRule-readAbout', 'read', ['read-about'], f'{VC}:100')
        prof_parent = vc.clone()
        prof_parent.anonymous_registered_read(f'{VC}:116')
        self.profile(f'{name}/profile', prof_parent)
        kb = self.node(f'{name}/knowledge-base', 'knowledge-base').inherit(base)
        if crit:
            if kb_visible:
                kb.add('KnowledgeBase contents visible', ['read'], crit, f'{KB}:57', cascade=True, condition='knowledgeBaseContentVisible')
            else:
                kb.add('KnowledgeBase contents not visible', ['read-about'], crit, f'{KB}:65', cascade=False, condition='knowledgeBaseContentVisible=false')
        cset = self.node(f'{name}/knowledge-base/callouts-set', 'callouts-set').inherit(kb)
        cset.add_privilege_rule('policyRule-collaborationCreate', 'create', ['create-callout'], f'{CSET}:120')
        self.callout(f'{name}/knowledge-base/callout', kb, level=None, draft=False, framing='post', allowed=('post', 'link'))
        extra = [] if not crit else [vc_rule for vc_rule in [None]]
        kb_profile_rules = []
        if crit:
            from engine import CredentialRule
            kb_profile_rules.append(CredentialRule('KnowledgeBase About visible', ('read',), tuple(crit), True, f'{KB}:90', f'{name}/knowledge-base/profile'))
        self.profile(f'{name}/knowledge-base/profile', kb, extra_rules=kb_profile_rules)
        kb.add_privilege_rule('policyRule-readAbout', 'read', ['read-about'], f'{KB}:109')

    # ---------------------------------------------------------------- user ----------------------
    def build_user(self) -> None:
        u = self.node('user', 'user')
        inherit_root(u)
        u.add_types('credentialRuleTypes-userAuthorizationReset', ['authorization-reset'], ['platform-operations-admin'], f'{USER}:182', cascade=False)
        u.add_types('credentialRuleTypes-platformUsersAdmin', ['platform-users-admin'], ['platform-users-admin'], f'{USER}:202', cascade=False)
        u.add_types('credentialRuleTypes-userReadGlobalRegistered', ['read'], ['global-registered'], f'{USER}:211', cascade=True)
        u.add('credentialRule-userSelfAdmin', CRUD + ('update-nameid',), [Criterion('user-self', 'U')], f'{USER}:247', cascade=True)
        u.add_types('credentialRule-userRead', ['read', 'read-user-settings'], ['platform-users-admin'], f'{USER}:267', cascade=True)
        # PII readers: self, Users Admin, the admins of every space the user is a member of, the admins of every organisation the user is an associate of
        u.add('credentialRule-userReadPii', ['read-user-pii'],
              [Criterion('user-self', 'U'), Criterion('platform-users-admin', '', 'type-only'),
               Criterion('space-admin', 'L0', 'data-dependent'), Criterion('organization-admin', 'ORG', 'data-dependent')], f'{USER}:317', cascade=True)
        u.add_privilege_rule('privilegeRule-readUserSettings', 'update', ['read-user-settings'], f'{USER}:338')
        pp = u.clone()
        pp.anonymous_registered_read(f'{USER}:121')
        self.profile('user/profile', pp)
        self.node('user/settings', 'user-settings').inherit(u)
        agg = self.node('user/storage-aggregator', 'storage-aggregator').inherit(u)
        agg.anonymous_registered_read(f'{SAGG}:52')
        self.bucket('user/storage-aggregator/bucket', agg)

    # ---------------------------------------------------------------- organization -------------
    def build_organization(self) -> None:
        o = self.node('organization', 'organization')
        inherit_root(o)
        admins = [Criterion('organization-admin', 'ORG'), Criterion('organization-owner', 'ORG')]
        o.add_types('credentialRuleTypes-organizationAuthorizationReset', ['authorization-reset'], ['platform-operations-admin'], f'{ORG}:181', cascade=False)
        o.add('credentialRule-organizationRead', ['read'],
              [Criterion('organization-associate', 'ORG')] + admins + [Criterion('global-registered', '', 'type-only')], f'{ORG}:204', cascade=True)
        o.add('credentialRule-organizationAdmin', ('grant', 'create', 'update', 'delete', 'receive-notifications-admin', 'update-nameid'), admins, f'{ORG}:229', cascade=True)
        o.add_types('credentialRuleTypes-deleteOrganization', ['delete-organization'], ['platform-support'], f'{ORG}:257', cascade=False)
        pp = o.clone()
        pp.anonymous_registered_read(f'{ORG}:114')
        self.profile('organization/profile', pp)
        agg = self.node('organization/storage-aggregator', 'storage-aggregator').inherit(o)
        agg.anonymous_registered_read(f'{SAGG}:52')
        self.bucket('organization/storage-aggregator/bucket', agg)
        rs = self.node('organization/role-set', 'role-set').inherit(o)
        rs.add('credentialRule-organizationAdmin', ['roleset-entry-role-assign'], admins, f'{ORG}:287', cascade=False)
        rs.add_types('credentialRuleTypes-organizationRoleSetApply', ['roleset-entry-role-apply'], ['global-registered'], f'{ORG}:303', cascade=False)
        rs.add_types('credentialRuleTypes-organizationRoleSetPlatformSupportMembership', ['platform-support-org-membership'], ['platform-support'], f'{ORG}:316', cascade=True)
        rs.add_types('credentialRuleTypes-organizationRoleSetPlatformSupportInvite', ['roleset-entry-role-invite'], ['platform-support'], f'{ORG}:329', cascade=False)
        rs.add_privilege_rule('policyRule-communityInvite', 'roleset-entry-role-assign', ['roleset-entry-role-invite'], f'{ROLESET}:289')
        self.application('organization/application', rs)
        self.invitation('organization/invitation', rs)
        self.node('organization/role-set/platform-invitation', 'platform-invitation').inherit(rs)
        ver = self.node('organization/verification', 'organization-verification')   # ORGVER: reset, no inheritance
        ver.add_types('credentialRuleTypes-organizationVerificationPlatformSupport', ['read', 'update', 'grant'], ['platform-support'], f'{ORGVER}:66', cascade=False)
        ver.add('credentialRule-organizationVerificationAdmin', ['read', 'update'], [account_admin('ORGACC')], f'{ORGVER}:78', cascade=True)
        g = self.node('organization/user-group', 'user-group').inherit(o)
        g.add('credentialRule-userGroupRead', ['read'], [Criterion('user-group-member', 'GROUP')], f'{UGROUP}:69')

    def application(self, name: str, rs: Policy) -> Policy:
        a = self.node(name, 'application').inherit(rs)
        a.add('credentialRule-roleSetApplication', ['read', 'update', 'delete'], [Criterion('user-self', 'APPLICANT')], f'{APPL}:43', cascade=True)
        return a

    def invitation(self, name: str, rs: Policy) -> Policy:
        i = self.node(name, 'invitation').inherit(rs)
        i.add('credentialRule-roleSetInvitation', ['read', 'update', 'roleset-entry-role-invite-accept'], [account_admin('INVITEEACC')], f'{INVIT}:102', cascade=True)
        return i

    # ---------------------------------------------------------------- space tree ---------------
    def visibility_criteria_for(self, level: int) -> list[Criterion]:
        """getCredentialsWithVisibilityOfSpace (SPACE:300-346)."""
        crit = roles_with_access(self.access[level], ['read-about'])
        if level == 0:
            crit.append(account_admin())
        elif level == 1:
            crit += [cred('member', 0, 'parent')]
        else:
            parent_public = self.s.levels[1].privacy == 'public'
            crit += [cred('member', 1, 'parent')] + ([cred('member', 0, 'parent')] if parent_public else [])
        crit.append(Criterion('space-invitee', space_id(level)))
        # + account admins of actors with open invitations (data-dependent, roleSetService.getAccountAdminCredentialsForOpenInvitations) — omitted
        return crit

    def build_space(self, level: int, parent_policy: Policy | None) -> Policy:
        s = self.s.levels[level]
        sp = space_id(level)
        self.access[level] = platform_roles_access(level, s, self.access.get(level - 1))
        access = self.access[level]
        vis = self.visibility_criteria_for(level)
        self.visibility_criteria[level] = vis
        private = s.privacy == 'private'
        space = self.node(f'space@{sp}', 'space')

        if level == 0 or private:
            self.reset_to_private_l0(space, level, access)
        else:
            space.inherit(parent_policy)

        membership_allowed = s.visibility != 'archived'
        if membership_allowed:
            self.extend_local(space, level, s, access, vis)
        space.add_privilege_rule('policyRule-readAbout', 'read', ['read-about', 'read-license'], f'{SPACE}:208')
        space.add_privilege_rule('policyRule-spaceCreateSubspace', 'create', ['create-subspace'], f'{SPACE}:219')

        self.build_space_children(space, level, s, access, vis, membership_allowed)
        return space

    def reset_to_private_l0(self, space: Policy, level: int, access: dict) -> None:
        inherit_root(space)                                                                     # SPACE:860
        space.add_types('credentialRuleTypes-spacePlatformSettings', ['account-license-manage'], ['platform-license-manager'], f'{SPACE}:875', cascade=False)
        space.add('credentialRuleTypes-spacePlatformSettings', ['read-about'], roles_with_access(access, ['read-about']), f'{SPACE}:891', cascade=False)
        if access['platform-spaces-reader']:
            space.add_types('credentialRuleTypes-spaceGlobalRead', access['platform-spaces-reader'], ['platform-spaces-reader'], f'{SPACE}:922', cascade=True)
        if access['platform-resource-admin']:
            space.add_types('credentialRuleTypes-spacePlatformResourceAdminRead', access['platform-resource-admin'], ['platform-resource-admin'], f'{SPACE}:951', cascade=False)
        if level == 0:
            space.add('Read access to License for global roles', ['read-license'], roles_with_access(access, ['read-license']), f'{SPACE}:970', cascade=False)
            space.add('Read about and license access to License for account admins', ['read-license', 'read-about'], [account_admin()], f'{SPACE}:982', cascade=False)

    def extend_local(self, space: Policy, level: int, s: SpaceSettings, access: dict, vis: list[Criterion]) -> None:
        sp = space_id(level)
        if s.privacy == 'public':
            crit = [c for c in vis if c.type != 'platform-resource-admin']
            space.add('Public spaces content is visible to all', ['read'], crit, f'{SPACE}:622', cascade=True, condition='privacy=public')
            if level > 0 and access['platform-resource-admin']:
                space.add_types('credentialRuleTypes-spacePlatformResourceAdminRead', access['platform-resource-admin'], ['platform-resource-admin'], f'{SPACE}:645', cascade=False)
        else:
            space.add('Private spaces content is only visible to members', ['read-about'], vis, f'{SPACE}:657', cascade=False, condition='privacy=private')
        if level > 0:
            space.add('credentialRule-SpaceAdminDeleteSubspace', ['delete'], [cred('admin', level - 1, 'parent')], f'{SPACE}:678', cascade=False)
        members = creds_for_role(level, 'member')
        space.add('credentialRule-spaceMembersRead', ['read'], members, f'{SPACE}:693', cascade=True)
        roleset_admins = creds_for_role_with_parents(level, 'admin')
        admins = roleset_admins + roles_with_access(access, ['update'])
        space.add('credentialRule-spaceAdmins', CRUDG, admins, f'{SPACE}:717', cascade=True)
        space.add('credentialRule-spaceAdminUpdateNameID', ['update-nameid'], roleset_admins, f'{SPACE}:747', cascade=False)
        space.add('Space members receive notifications', ['receive-notifications'], members, f'{SPACE}:760', cascade=False)
        space.add('Space Admin receive notifications', ['receive-notifications-admin'], creds_for_role(level, 'lead') + admins, f'{SPACE}:775', cascade=False)
        if s.m_subspaces:
            space.add('credentialRule-memberCreateSubspace', ['create-subspace'], self.actor_criteria(level, s), f'{SPACE}:788', cascade=False,
                      condition='allowMembersToCreateSubspaces')

    def actor_criteria(self, level: int, s: SpaceSettings) -> list[Criterion]:
        """getActorCriteria (SPACE:830-850): members, plus the direct parent's members when inheritMembershipRights && public."""
        crit = creds_for_role(level, 'member')
        if s.inherit and s.privacy == 'public' and level > 0:
            crit.append(direct_parent_cred(level, 'member'))
        return crit

    def contributor_criteria(self, level: int, s: SpaceSettings, access: dict) -> list[Criterion]:
        """CollaborationAuthorizationService.getContributorCredentials (COLLAB:180-208)."""
        crit = creds_for_role_with_parents(level, 'member') if s.inherit else creds_for_role(level, 'member')
        return crit + roles_with_access(access, ['update'])

    def build_space_children(self, space: Policy, level: int, s: SpaceSettings, access: dict, vis: list[Criterion], membership_allowed: bool) -> None:
        sp = space_id(level)
        # --- community / role set / communication -------------------------------------------
        comm = self.node(f'community@{sp}', 'community').inherit(space)
        if s.privacy == 'public':
            comm.add_types('credentialRuleTypes-communityReadGlobalRegistered', ['read'], ['global-registered'], f'{COMMUNITY}:148', cascade=True, condition='privacy=public')
        communication = self.node(f'communication@{sp}', 'communication').inherit(comm)
        self.room(f'communication@{sp}/updates', communication, contributors_create=False)   # COMM:56: no CREATE_MESSAGE for contributors on updates
        g = self.node(f'user-group@{sp}', 'user-group').inherit(comm)
        g.add('credentialRule-userGroupRead', ['read'], [Criterion('user-group-member', 'GROUP')], f'{UGROUP}:69')
        rs = self.node(f'role-set@{sp}', 'role-set').inherit(comm)
        self.role_set_rules(rs, level, s, access, membership_allowed)
        rs.add_privilege_rule('policyRule-communityInvite', 'roleset-entry-role-assign', ['roleset-entry-role-invite'], f'{ROLESET}:289')
        rs.add_privilege_rule('policyRule-communityAddVirtualContributor', 'grant', ['community-assign-vc-from-account'], f'{COMMUNITY}:448')
        self.application(f'application@{sp}', rs)
        self.invitation(f'invitation@{sp}', rs)
        self.node(f'role-set@{sp}/license', 'license').inherit(rs)
        # --- storage aggregator (direct storage) ---------------------------------------------
        agg = self.node(f'storage-aggregator@{sp}', 'storage-aggregator').inherit(space)
        agg.anonymous_registered_read(f'{SAGG}:52')
        self.bucket(f'storage-aggregator@{sp}/bucket', agg)
        # --- collaboration -----------------------------------------------------------------
        collab = self.node(f'collaboration@{sp}', 'collaboration').inherit(space)
        admins = creds_for_role(level, 'admin') + roles_with_access(access, ['update'])
        collab.add('credentialRule-collaborationContributors', ['update'], admins, f'{COLLAB}:245', cascade=True)
        contributors = self.contributor_criteria(level, s, access)
        collab.add('credentialRule-collaborationContributors', ['contribute'], contributors, f'{COLLAB}:283', cascade=True,
                   condition='inheritMembershipRights' if s.inherit else '')
        cset = self.node(f'callouts-set@{sp}', 'callouts-set').inherit(collab)
        cset.add_privilege_rule('policyRule-collaborationCreate', 'create', ['create-callout'], f'{CSET}:120')
        if s.m_callouts:
            cset.add_privilege_rule('policyRule-calloutContribute', 'contribute', ['create-callout'], f'{CSET}:130', condition='allowMembersToCreateCallouts')
        cset.add_types('credentialRule-calloutsSetTransferOffer', ['transfer-resource-offer'], ['platform-resource-admin'], f'{CSET}:94', cascade=False)
        cset.add_types('credentialRule-calloutsSetTransferAccept', ['transfer-resource-accept'], ['platform-resource-admin'], f'{CSET}:103', cascade=False)
        # callouts inherit from the COLLABORATION policy (CSET:69 passes parentAuthorization through), not from the callouts set
        self.callout(f'callout@{sp}', collab, level=level, draft=False, framing='post', allowed=('post', 'whiteboard', 'link', 'memo', 'collabora_document'))
        self.callout(f'callout[draft]@{sp}', collab, level=level, draft=True, framing='post', allowed=('post',))
        self.callout(f'callout[form]@{sp}', collab, level=level, draft=False, framing='form', allowed=())
        self.callout(f'callout[task-board]@{sp}', collab, level=level, draft=False, framing='post', allowed=('post',), task_board=True)
        self.callout(f'callout[whiteboard-framing]@{sp}', collab, level=level, draft=False, framing='whiteboard', allowed=())
        self.node(f'collaboration@{sp}/license', 'license').inherit(collab)
        timeline_parent = collab.clone()
        timeline_parent.add('credentialRule-collaborationContributors', ['contribute'], contributors, f'{COLLAB}:283', cascade=True)
        timeline = self.node(f'timeline@{sp}', 'timeline').inherit(timeline_parent)
        cal = self.node(f'calendar@{sp}', 'calendar').inherit(timeline)
        ev = self.node(f'calendar-event@{sp}', 'calendar-event').inherit(cal)
        ev_clone = ev.clone()
        ev.add('credentialRule-calendarEventCreatedBy', CRUD, [Criterion('user-self', 'CREATOR')], f'{EVENT}:101', cascade=True)
        self.room(f'calendar-event@{sp}/comments', ev_clone, contributors_create=True)
        self.profile(f'calendar-event@{sp}/profile', ev)
        flow = self.node(f'innovation-flow@{sp}', 'innovation-flow').inherit(collab)
        flow.add_privilege_rule('privilegeRuleTypes-innovationFlowUpdate', 'create', ['update-innovation-flow'], f'{FLOW}:57')
        self.profile(f'innovation-flow@{sp}/profile', flow)
        self.node(f'innovation-flow@{sp}/state', 'innovation-flow-state').inherit(flow)
        # --- license, templates (L0), about, profile ------------------------------------------
        self.node(f'license@{sp}', 'license').inherit(space)
        if level == 0:
            self.node(f'templates-manager@{sp}', 'templates-manager').inherit(space)
            self.node(f'template-default@{sp}', 'template-default').inherit(space)
            tset = self.node(f'templates-set@{sp}', 'templates-set').inherit(space)
            tpl = self.node(f'template@{sp}', 'template').inherit(tset)
            self.profile(f'template@{sp}/profile', tpl, threaded_privilege_rules=[self.support_org_resources_rule])
        about = self.node(f'space-about@{sp}', 'space-about').inherit(space)
        about.add('Read access to About', ['read'], vis, f'{SPACE}:558', cascade=True)
        self.profile(f'space-about@{sp}/profile', about)
        guide = self.node(f'community-guidelines@{sp}', 'community-guidelines').inherit(about)
        guide.anonymous_registered_read(f'{GUIDE}:32')
        self.profile(f'community-guidelines@{sp}/profile', guide)
        from engine import CredentialRule
        upload_rules = []
        if membership_allowed and s.m_callouts:
            upload_rules.append(CredentialRule('credentialRule-spaceStorageMemberFileUpload', ('file-upload',), tuple(self.actor_criteria(level, s)), True,
                                               f'{SPACE}:820', f'space-profile@{sp}', 'allowMembersToCreateCallouts'))
        self.profile(f'space-profile@{sp}', space, extra_rules=upload_rules)

    def role_set_rules(self, rs: Policy, level: int, s: SpaceSettings, access: dict, membership_allowed: bool) -> None:
        """CommunityAuthorizationService.createAdditionalRoleSetCredentialRules + extendAuthorizationPolicySubspace / ...Space."""
        sp = space_id(level)
        invite = creds_for_role_with_parents(level, 'admin') + roles_with_access(access, ['grant'])
        if s.subadmins_invite:
            invite.append(Criterion('space-subspace-admin', sp, 'derived'))
        rs.add('credentialRuleTypes-roleSetEntryRoleInvite', ['roleset-entry-role-invite', 'community-assign-vc-from-account'], invite, f'{COMMUNITY}:207', cascade=False,
               condition='allowSubspaceAdminsToInviteMembers' if s.subadmins_invite else '')
        if 'read' in access['platform-resource-admin']:
            rs.add_types('credentialRuleTypes-roleSetPlatformResourceAdminRead', ['read'], ['platform-resource-admin'], f'{MOVER}:41', cascade=False)
        if level == 0:
            if membership_allowed:
                if s.membership == 'applications':
                    rs.add_types('credentialRuleTypes-roleSetApplyGlobalRegistered', ['roleset-entry-role-apply'], ['global-registered'], f'{COMMUNITY}:403', cascade=False, condition='membership=applications')
                elif s.membership == 'open':
                    rs.add_types('credentialRuleTypes-roleSetJoinGlobalRegistered', ['roleset-entry-role-join'], ['global-registered'], f'{COMMUNITY}:414', cascade=False, condition='membership=open')
                if s.trusted_org:
                    rs.add('credentialRule-spaceHostAssociatesJoin', ['roleset-entry-role-join'], [Criterion('organization-associate', 'ORG')], f'{COMMUNITY}:430', cascade=False, condition='trustedOrganizations')
        else:
            parent_member = direct_parent_cred(level, 'member')
            eligible = self.combined_eligibility(level)
            if s.membership == 'applications':
                rs.add('credentialRule-subspaceParentMemberApply', ['roleset-entry-role-apply'], [parent_member], f'{COMMUNITY}:276', cascade=False, condition='membership=applications')
                if eligible == 'globalRegistered':
                    rs.add_types('credentialRule-subspaceNonMemberApply', ['roleset-entry-role-apply'], ['global-registered'], f'{COMMUNITY}:301', cascade=False, condition='membership=applications+combined')
                elif eligible is not None:
                    rs.add('credentialRule-subspaceAncestorMemberApply', ['roleset-entry-role-apply'], [eligible], f'{COMMUNITY}:310', cascade=False, condition='membership=applications+combined')
            elif s.membership == 'open':
                rs.add('credentialRule-subspaceParentMemberJoin', ['roleset-entry-role-join'], [parent_member], f'{COMMUNITY}:322', cascade=False, condition='membership=open')
                if eligible == 'globalRegistered':
                    rs.add_types('credentialRule-subspaceNonMemberJoin', ['roleset-entry-role-join'], ['global-registered'], f'{COMMUNITY}:347', cascade=False, condition='membership=open+combined')
                elif eligible is not None:
                    rs.add('credentialRule-subspaceAncestorMemberJoin', ['roleset-entry-role-join'], [eligible], f'{COMMUNITY}:356', cascade=False, condition='membership=open+combined')
            assign = creds_for_role_with_parents(level, 'admin') + roles_with_access(access, ['grant'])
            rs.add('credentialRule-roleSetAssign', ['roleset-entry-role-assign'], assign, f'{COMMUNITY}:382', cascade=False)

    def combined_eligibility(self, level: int):
        """RoleSetService.getCombinedApplicationEligibleCriteria (role.set.service.ts:2757-2805)."""
        ancestors = list(range(0, level))  # root .. parent
        deepest_private = -1
        for i, l in enumerate(ancestors):
            if self.s.levels[l].privacy != 'public':
                deepest_private = i
        for i in range(deepest_private + 1, len(ancestors)):
            if not self.s.levels[ancestors[i]].subadmins_invite:
                return None
        if deepest_private == -1:
            return 'globalRegistered'
        if deepest_private == len(ancestors) - 1:
            return None
        return cred('member', ancestors[deepest_private], 'parent')

    # ---------------------------------------------------------------- callout family ----------
    def callout(self, name: str, parent: Policy, level: int | None, draft: bool, framing: str, allowed: tuple, task_board: bool = False) -> Policy:
        s = self.s.levels[level] if level is not None else None
        access = self.access[level] if level is not None else {}
        if draft:   # getParentAuthorizationPolicyForCalloutVisibility (CALLOUT:195-271)
            from engine import CredentialRule
            adjusted = parent.clone()
            adjusted.credential_rules = [
                CredentialRule(r.name, tuple(p for p in r.privileges if p != 'read'), r.criteria, r.cascade, r.evidence, r.origin, r.condition)
                for r in adjusted.credential_rules if tuple(p for p in r.privileges if p != 'read')]
            readers = (creds_for_role_with_parents(level, 'admin') if level is not None else []) + [Criterion('user-self', 'CREATOR')]
            adjusted.credential_rules.append(CredentialRule('Callout read access for draft callouts', ('read',), tuple(readers), True, f'{CALLOUT}:263', name, 'visibility=draft'))
            parent = adjusted
        c = self.node(name, 'callout').inherit(parent)
        privs = []
        if 'link' in allowed or 'collabora_document' in allowed:
            privs.append('contribute')
        if 'post' in allowed:
            privs.append('create-post')
        if 'whiteboard' in allowed:
            privs.append('create-whiteboard')
        for p in privs:   # CALLOUT:336/343 — note: MEMO contributions get no privilege of their own (CALLOUT:383-398)
            c.add_privilege_rule('policyRule-calloutCreate', 'create', [p], f'{CALLOUT}:336')
            c.add_privilege_rule('policyRule-calloutContribute', 'contribute', [p], f'{CALLOUT}:343')
        if task_board:
            c.add_privilege_rule('policyRule-calloutTaskMove', 'contribute', ['move-task'], f'{CALLOUT}:368')
            c.add_privilege_rule('policyRule-calloutTaskMoveAdmin', 'update', ['move-task'], f'{CALLOUT}:373')
        if framing != 'form':
            c.add('credentialRule-calloutCreatedBy', CRUD, [Criterion('user-self', 'CREATOR')], f'{CALLOUT}:292', cascade=True)
        c.add_types('credentialRuleTypes-calloutUpdatePublisherGlobalAdmins', ['update-callout-publisher'], ['platform-content-full-access', 'platform-resource-admin'], f'{CALLOUT}:313', cascade=False)
        # contributions
        if level is not None and not draft and framing == 'post' and not task_board:
            for kind in ('post', 'whiteboard', 'link', 'memo', 'collabora-document'):
                self.contribution(f'{name}/contribution[{kind}]', c, level, kind)
        # framing
        fr = self.node(f'{name}/framing', 'callout-framing').inherit(c)
        self.profile(f'{name}/framing/profile', fr)
        if framing == 'whiteboard':
            self.whiteboard(f'{name}/framing/whiteboard', fr, level, policy='contributors')
        self.room(f'{name}/comments', c, contributors_create=True)
        self.node(f'{name}/classification', 'classification').inherit(c)
        return c

    def contribution(self, name: str, callout: Policy, level: int, kind: str) -> Policy:
        s = self.s.levels[level]
        access = self.access[level]
        ct = self.node(name, 'callout-contribution').inherit(callout)
        creator = Criterion('user-self', 'CREATOR')
        ct.add('credentialRule-contributionCreatedBy', ['create', 'read', 'update'], [creator], f'{CONTRIB}:243', cascade=True)
        ct.add('credentialRule-contributionCreatedByDelete', ['delete'], [creator], f'{CONTRIB}:260', cascade=False)
        movers = [Criterion('platform-resource-admin', '', 'type-only')] + creds_for_role_with_parents(level, 'admin') + roles_with_access(access, ['update'])
        ct.add('credentialRule-contributionAdminsMove', ['move-contribution'], movers, f'{CONTRIB}:303', cascade=False)
        if kind == 'post':
            post = self.node(f'{name}/post', 'post').inherit(ct)
            self.room(f'{name}/post/comments', post, contributors_create=True)   # POST:55-70, inherited before the creator rules
            post.add('credentialRule-postCreatedBy', ['delete'], [creator], f'{POST}:108', cascade=True)
            post.add('credentialRule-postAdminsMove', ['move-post'], roles_with_access(access, ['update']) + [Criterion('platform-resource-admin', '', 'type-only')] + creds_for_role_with_parents(level, 'admin'),
                     f'{POST}:145', cascade=False)
            self.profile(f'{name}/post/profile', post)
        elif kind == 'whiteboard':
            for policy in ('contributors', 'admins', 'owner'):
                self.whiteboard(f'{name}/whiteboard[{policy}]', ct, level, policy)
        elif kind == 'link':
            link = self.node(f'{name}/link', 'link').inherit(ct)
            link.add('credentialRule-linkCreatedBy', ['delete'], [creator], f'{LINK}:66', cascade=True)
            self.profile(f'{name}/link/profile', link)
        elif kind == 'memo':
            for policy in ('contributors', 'admins', 'owner'):
                memo = self.node(f'{name}/memo[{policy}]', 'memo').inherit(ct)
                memo.add('credentialRule-memoCreatedBy', ['update-content', 'contribute', 'delete'], [creator], f'{MEMO}:92', cascade=True)
                if policy == 'admins':
                    memo.add_privilege_rule('policyRule-memoContentUpdate', 'update', ['update-content'], f'{MEMO}:126', condition='contentUpdatePolicy=admins')
                elif policy == 'contributors':
                    memo.add_privilege_rule('policyRule-memoContentUpdate', 'contribute', ['update-content'], f'{MEMO}:136', condition='contentUpdatePolicy=contributors')
                self.profile(f'{name}/memo[{policy}]/profile', memo)
        elif kind == 'collabora-document':
            cd = self.node(f'{name}/collabora-document', 'collabora-document').inherit(ct)
            cd.add('credentialRule-collaboraDocumentCreatedBy', CRUD, [creator], f'{COLLABORA}:125', cascade=True)
            cd.add_privilege_rule('policyRule-collaboraDocumentContentUpdate', 'contribute', ['update-content'], f'{COLLABORA}:155')
            self.profile(f'{name}/collabora-document/profile', cd)
        return ct

    def whiteboard(self, name: str, parent: Policy, level: int | None, policy: str) -> Policy:
        s = self.s.levels[level] if level is not None else None
        wb = self.node(name, 'whiteboard').inherit(parent)
        creator = Criterion('user-self', 'CREATOR')
        wb.add('whiteboard-created-by', ['update-content', 'contribute', 'delete'], [creator], f'{WB}:132', cascade=True)
        if s is not None and s.guests:
            wb.add('whiteboard-owner-public-share', ['public-share'], [creator], f'{WB}:190', cascade=True, condition='allowGuestContributions')
            wb.add('space-admin-public-share', ['public-share'], creds_for_role_with_parents(level, 'admin'), f'{WB}:225', cascade=True, condition='allowGuestContributions')
            if self.s.whiteboard_guest_access:
                wb.add_types('public-access', ['read', 'update-content', 'contribute'], ['global-guest', 'global-registered'], f'{WBG}:31', cascade=True,
                             condition='allowGuestContributions+whiteboard.guestAccess')
        if policy == 'admins':
            wb.add_privilege_rule('policyRule-whiteboardContentUpdate', 'update', ['update-content'], f'{WB}:314', condition='contentUpdatePolicy=admins')
        elif policy == 'contributors':
            wb.add_privilege_rule('policyRule-whiteboardContentUpdate', 'contribute', ['update-content'], f'{WB}:324', condition='contentUpdatePolicy=contributors')
        if s is not None and s.guests:
            wb.add_privilege_rule('policyRule-whiteboardGrantPublicShare', 'grant', ['public-share'], f'{WB}:338', condition='allowGuestContributions')
        self.profile(f'{name}/profile', wb)
        return wb

    # ---------------------------------------------------------------- driver ------------------
    def build(self) -> dict[str, Policy]:
        self.build_platform()
        self.build_account()
        self.build_user()
        self.build_organization()
        for vis_, kbv in (('public', False), ('public', True), ('account', False), ('hidden', False)):
            self.build_virtual_contributor(vis_, kbv)
        parent = None
        for level in sorted(self.s.levels):
            parent = self.build_space(level, parent)
        return self.nodes
