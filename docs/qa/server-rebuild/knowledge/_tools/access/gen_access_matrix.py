#!/usr/bin/env python3
"""Generates access-matrix.json and access-matrix.md.

usage: python3 -I gen_access_matrix.py --server <server checkout> --out <knowledge dir>

The actors, the settings variants and the resource tree are defined here; the policy builders are
in model.py (hand-transcribed from the server) and the evaluation engine in engine.py.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from engine import Criterion, Policy  # noqa: E402
from model import Builder, Scenario, SpaceSettings  # noqa: E402
from parse_server import read_server  # noqa: E402

# ----------------------------------------------------------------------------------------------
# actors: role -> credentials held (Criterion(type, resourceID)); the member(Space) => member(parent)
# invariant and the entry-role requirement (admin/lead => member) are applied as the server does.
# ----------------------------------------------------------------------------------------------
PLATFORM_ROLES = ['platform-roles-admin', 'platform-content-full-access', 'platform-resource-admin', 'platform-settings-admin',
                  'platform-operations-admin', 'platform-users-admin', 'platform-support', 'platform-license-manager',
                  'platform-spaces-reader', 'platform-audit-reader', 'feature-beta-tester', 'feature-virtual-assistant',
                  'feature-organization-creator', 'feature-vc-campaign']


def registered(user: str = 'OTHER') -> list[Criterion]:
    return [Criterion('global-registered'), Criterion('user-self', user), Criterion('account-admin', f'{user}ACC')]


def member_chain(level: int) -> list[Criterion]:
    return [Criterion('space-member', f'L{l}') for l in range(level + 1)]


ACTORS: dict[str, list[Criterion]] = collections.OrderedDict()
ACTORS['anonymous'] = [Criterion('global-anonymous')]
ACTORS['guest'] = [Criterion('global-guest')]
ACTORS['registered'] = registered()
for r in PLATFORM_ROLES:
    ACTORS[r] = registered() + [Criterion(r)]
ACTORS['account-admin'] = registered() + [Criterion('account-admin', 'ACC')]
ACTORS['organization-owner'] = registered() + [Criterion('organization-owner', 'ORG'), Criterion('organization-associate', 'ORG'), Criterion('account-admin', 'ORGACC')]
ACTORS['organization-admin'] = registered() + [Criterion('organization-admin', 'ORG'), Criterion('organization-associate', 'ORG'), Criterion('account-admin', 'ORGACC')]
ACTORS['organization-associate'] = registered() + [Criterion('organization-associate', 'ORG')]
for level in (0, 1, 2):
    ACTORS[f'space-member@L{level}'] = registered() + member_chain(level)
    ACTORS[f'space-lead@L{level}'] = registered() + member_chain(level) + [Criterion('space-lead', f'L{level}')]
    derived = [Criterion('space-subspace-admin', f'L{level - 1}')] if level > 0 else []
    ACTORS[f'space-admin@L{level}'] = registered() + member_chain(level) + [Criterion('space-admin', f'L{level}')] + derived
    ACTORS[f'space-invitee@L{level}'] = registered() + [Criterion('space-invitee', f'L{level}')]
ACTORS['subspace-admin-derived@L0'] = registered() + member_chain(0) + [Criterion('space-subspace-admin', 'L0')]
ACTORS['creator-member@L1'] = registered('CREATOR') + member_chain(1)
ACTORS['creator-former-member'] = registered('CREATOR')
ACTORS['virtual-contributor-member@L1'] = member_chain(1)
ACTORS['vc-account-admin'] = registered() + [Criterion('account-admin', 'VCACC')]
ACTORS['user-self'] = registered('U')
ACTORS['applicant'] = registered('APPLICANT')
ACTORS['invited-actor-account-admin'] = registered() + [Criterion('account-admin', 'INVITEEACC')]
ACTORS['user-group-member'] = registered() + [Criterion('user-group-member', 'GROUP')]

ACTOR_NOTES = {
    'registered': 'a signed-in user with no role on the resource (holds global-registered, user-self on itself, account-admin on its own account)',
    'account-admin': 'owner/admin of the account hosting the space tree (a user host, or the owners/admins of the hosting organisation)',
    'subspace-admin-derived@L0': 'holds only the derived space-subspace-admin credential of L0 (what every L1 admin is given on the parent) plus L0 membership',
    'creator-member@L1': 'the user who created the content (createdBy), still an L1 member',
    'creator-former-member': 'the user who created the content, no longer a member anywhere',
    'virtual-contributor-member@L1': 'a VC assigned member on L0 and L1; VCs hold no global-registered credential',
    'vc-account-admin': 'admin of the account that owns the virtual contributor',
    'user-self': 'the user whose own user/profile/settings are the resource',
    'applicant': 'the user who submitted the application',
    'invited-actor-account-admin': 'the account admin of the invited actor (a user is admin of its own account)',
}

# ----------------------------------------------------------------------------------------------
# settings variants
# ----------------------------------------------------------------------------------------------
def S(**kw) -> SpaceSettings:
    return SpaceSettings(**kw)


SUB_DEFAULT = dict(privacy='public', membership='open', inherit=True, m_callouts=True, m_subspaces=True)   # server subspace template defaults


SCENARIOS = [
    Scenario('pub-open', 'all three levels public / open, every flag off', {0: S(), 1: S(), 2: S()}),
    Scenario('priv-applications', 'all three levels private / applications, every flag off (the L0 server default)',
             {0: S(privacy='private', membership='applications'), 1: S(privacy='private', membership='applications'), 2: S(privacy='private', membership='applications')}),
    Scenario('defaults', 'server defaults: L0 private / applications / subspace-admins-invite; subspaces public / open / inherit / members-create',
             {0: S(privacy='private', membership='applications', subadmins_invite=True), 1: S(**SUB_DEFAULT), 2: S(**SUB_DEFAULT)}),
    Scenario('t-pub-pub', 'storage-suite shape: L0 public/applications; L1 public/open with inherit on, members-create off; L2 subspace defaults',
             {0: S(membership='applications'), 1: S(privacy='public', membership='open', inherit=True), 2: S(**SUB_DEFAULT)}),
    Scenario('t-pub-priv', 'storage-suite shape: L0 public; L1 PRIVATE/open with inherit on; L2 subspace defaults',
             {0: S(membership='applications'), 1: S(privacy='private', membership='open', inherit=True), 2: S(**SUB_DEFAULT)}),
    Scenario('t-priv-pub', 'storage-suite shape: L0 PRIVATE; L1 public/open with inherit on; L2 subspace defaults',
             {0: S(privacy='private', membership='applications'), 1: S(privacy='public', membership='open', inherit=True), 2: S(**SUB_DEFAULT)}),
    Scenario('t-priv-priv', 'storage-suite shape: L0 PRIVATE; L1 PRIVATE/open with inherit on; L2 subspace defaults',
             {0: S(privacy='private', membership='applications'), 1: S(privacy='private', membership='open', inherit=True), 2: S(**SUB_DEFAULT)}),
    Scenario('pub-open+support', 'pub-open with allowPlatformSupportAsAdmin on the L0', {0: S(support=True), 1: S(), 2: S()}),
    Scenario('priv-applications+support', 'priv-applications with allowPlatformSupportAsAdmin on the L0, user-hosted account (the A15 twin)',
             {0: S(privacy='private', membership='applications', support=True), 1: S(privacy='private', membership='applications'), 2: S(privacy='private', membership='applications')}, account_type='user'),
    Scenario('pub-open+members', 'pub-open with allowMembersToCreateCallouts, allowMembersToCreateSubspaces and inheritMembershipRights on every level',
             {0: S(m_callouts=True, m_subspaces=True), 1: S(inherit=True, m_callouts=True, m_subspaces=True), 2: S(inherit=True, m_callouts=True, m_subspaces=True)}),
    Scenario('pub-applications', 'all public with membership policy applications', {0: S(membership='applications'), 1: S(membership='applications'), 2: S(membership='applications')}),
    Scenario('pub-invitations', 'all public with membership policy invitations', {0: S(membership='invitations'), 1: S(membership='invitations'), 2: S(membership='invitations')}),
    Scenario('combined-apply', 'L0 private/applications; L1 public/applications with allowSubspaceAdminsToInviteMembers; L2 public/applications (the combined apply path)',
             {0: S(privacy='private', membership='applications', subadmins_invite=True), 1: S(membership='applications', subadmins_invite=True), 2: S(membership='applications')}),
    Scenario('pub-open+guests', 'pub-open with allowGuestContributions on every level and guest access enabled on the whiteboard',
             {0: S(guests=True), 1: S(guests=True), 2: S(guests=True)}, whiteboard_guest_access=True),
    Scenario('archived', 'L0 archived (public/open), subspaces public/open', {0: S(visibility='archived'), 1: S(), 2: S()}),
    Scenario('trusted-org', 'pub-open with ORG in the L0 trustedOrganizations', {0: S(trusted_org=True), 1: S(), 2: S()}),
    Scenario('L0pub-L1pub-L2priv', 'L0 and L1 public/open, L2 private/applications', {0: S(), 1: S(), 2: S(privacy='private', membership='applications')}),
    Scenario('user-hosted', 'pub-open on a user-hosted account (no platform-support-org-resources cascade)', {0: S(), 1: S(), 2: S()}, account_type='user'),
]

# ----------------------------------------------------------------------------------------------
# representative resources (the model builds ~680 nodes per scenario; the matrix reports these)
# ----------------------------------------------------------------------------------------------
PLATFORM_NODES = ['platform', 'platform/role-set', 'library', 'platform/template', 'platform/template/profile', 'forum', 'discussion[public]',
                  'discussion[authenticated]', 'discussion[public]/comments', 'platform/storage-aggregator/bucket', 'platform/storage-aggregator/bucket/document',
                  'licensing', 'license-policy', 'messaging', 'conversation', 'conversation/room', 'conversation/storage-aggregator/bucket/document', 'virtual-assistant', 'ai-server']
SYNTHETIC_NODES = ['synthetic/admin-communication-grant', 'synthetic/registration-delete-user', 'synthetic/conversion-global-admins', 'synthetic/admin-identity-delete-kratos',
                   'synthetic/admin-user-account-delete', 'synthetic/admin-user-email-change', 'synthetic/platform-well-known-vc-set', 'synthetic/license-definition-admin']
ACCOUNT_NODES = ['account', 'account/profile', 'account/storage-aggregator/bucket', 'account/storage-aggregator/bucket/document', 'innovation-pack', 'innovation-pack/profile',
                 'innovation-pack/profile/bucket', 'innovation-pack/template', 'innovation-pack/template/profile', 'innovation-pack/template/callout', 'innovation-hub', 'innovation-hub/profile']
VC_NODES = [f'virtual-contributor[{v}]{s}' for v in ('public', 'public,kb-visible', 'account', 'hidden') for s in ('', '/profile', '/knowledge-base', '/knowledge-base/callout', '/knowledge-base/profile')]
USER_NODES = ['user', 'user/profile', 'user/profile/bucket', 'user/profile/bucket/document', 'user/settings', 'user/storage-aggregator/bucket/document']
ORG_NODES = ['organization', 'organization/profile', 'organization/profile/bucket', 'organization/profile/bucket/document', 'organization/role-set', 'organization/application',
             'organization/invitation', 'organization/verification', 'organization/user-group', 'organization/storage-aggregator/bucket/document']
SPACE_NODE_TEMPLATES = [
    'space@{L}', 'community@{L}', 'communication@{L}/updates', 'role-set@{L}', 'application@{L}', 'invitation@{L}', 'user-group@{L}',
    'storage-aggregator@{L}/bucket', 'storage-aggregator@{L}/bucket/document', 'collaboration@{L}', 'callouts-set@{L}',
    'callout@{L}', 'callout[draft]@{L}', 'callout[form]@{L}', 'callout[task-board]@{L}', 'callout[whiteboard-framing]@{L}/framing/whiteboard',
    'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket', 'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket/document',
    'callout@{L}/framing/profile', 'callout@{L}/framing/profile/bucket', 'callout@{L}/framing/profile/bucket/document', 'callout@{L}/comments',
    'callout@{L}/contribution[post]', 'callout@{L}/contribution[post]/post', 'callout@{L}/contribution[post]/post/comments', 'callout@{L}/contribution[post]/post/profile',
    'callout@{L}/contribution[post]/post/profile/bucket', 'callout@{L}/contribution[post]/post/profile/bucket/document',
    'callout@{L}/contribution[whiteboard]/whiteboard[contributors]', 'callout@{L}/contribution[whiteboard]/whiteboard[admins]', 'callout@{L}/contribution[whiteboard]/whiteboard[owner]',
    'callout@{L}/contribution[whiteboard]/whiteboard[contributors]/profile/bucket', 'callout@{L}/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document',
    'callout@{L}/contribution[link]/link', 'callout@{L}/contribution[link]/link/profile/bucket', 'callout@{L}/contribution[link]/link/profile/bucket/document',
    'callout@{L}/contribution[memo]/memo[contributors]', 'callout@{L}/contribution[memo]/memo[admins]', 'callout@{L}/contribution[memo]/memo[owner]',
    'callout@{L}/contribution[collabora-document]/collabora-document',
    'calendar-event@{L}', 'calendar-event@{L}/comments', 'innovation-flow@{L}', 'license@{L}',
    'space-about@{L}', 'space-about@{L}/profile', 'space-about@{L}/profile/visual', 'space-about@{L}/profile/bucket', 'space-about@{L}/profile/bucket/document',
    'community-guidelines@{L}', 'space-profile@{L}', 'space-profile@{L}/bucket', 'space-profile@{L}/bucket/document',
]
L0_ONLY = ['templates-set@L0', 'template@L0', 'template@L0/profile']
SPACE_NODES = [t.format(L=f'L{l}') for l in (0, 1, 2) for t in SPACE_NODE_TEMPLATES] + L0_ONLY
REPRESENTATIVE = PLATFORM_NODES + SYNTHETIC_NODES + ACCOUNT_NODES + VC_NODES + USER_NODES + ORG_NODES + SPACE_NODES

PLATFORM_ACTORS = ['anonymous', 'guest', 'registered'] + PLATFORM_ROLES
FAMILY_ACTORS = {
    'platform': PLATFORM_ACTORS + ['organization-admin', 'space-admin@L0', 'space-lead@L0', 'user-self'],
    'synthetic': PLATFORM_ACTORS,
    'account': PLATFORM_ACTORS + ['account-admin', 'organization-owner', 'organization-admin', 'organization-associate', 'creator-former-member'],
    'vc': PLATFORM_ACTORS + ['vc-account-admin', 'space-member@L0', 'space-member@L1', 'creator-former-member'],
    'user': PLATFORM_ACTORS + ['user-self', 'space-admin@L0', 'organization-admin', 'organization-associate', 'creator-former-member'],
    'organization': PLATFORM_ACTORS + ['organization-owner', 'organization-admin', 'organization-associate', 'applicant', 'invited-actor-account-admin', 'user-group-member', 'creator-former-member'],
    'space': PLATFORM_ACTORS + ['account-admin', 'organization-associate'] + [f'space-{r}@L{l}' for l in (0, 1, 2) for r in ('member', 'lead', 'admin', 'invitee')]
             + ['subspace-admin-derived@L0', 'creator-member@L1', 'creator-former-member', 'virtual-contributor-member@L1', 'applicant', 'invited-actor-account-admin', 'user-group-member'],
}


def family_of(node: str) -> str:
    if node in PLATFORM_NODES:
        return 'platform'
    if node in SYNTHETIC_NODES:
        return 'synthetic'
    if node in ACCOUNT_NODES:
        return 'account'
    if node.startswith('virtual-contributor'):
        return 'vc'
    if node.startswith('user'):
        return 'user'
    if node.startswith('organization'):
        return 'organization'
    return 'space'


# ----------------------------------------------------------------------------------------------
# evaluation
# ----------------------------------------------------------------------------------------------
def relevant_privileges(policies: list[Policy]) -> list[str]:
    privs: set[str] = set()
    for p in policies:
        for r in p.credential_rules:
            privs.update(r.privileges)
        for r in p.privilege_rules:
            privs.update(r.granted)
    return sorted(privs)


def evaluate_all() -> tuple[dict, dict]:
    """Returns ({resource: {scenario: {actor: {priv: {path, evidence}}}}}, {resource: [privileges]})."""
    out: dict[str, dict[str, dict[str, dict]]] = collections.OrderedDict()
    per_resource_policies: dict[str, list[Policy]] = collections.defaultdict(list)
    types: dict[str, str] = {}
    for sc in SCENARIOS:
        nodes = Builder(sc).build()
        missing = [n for n in REPRESENTATIVE if n not in nodes]
        if missing:
            raise SystemExit(f'representative nodes missing from the model: {missing}')
        for name in REPRESENTATIVE:
            policy = nodes[name]
            types[name] = policy.type
            per_resource_policies[name].append(policy)
            actors = FAMILY_ACTORS[family_of(name)]
            out.setdefault(name, collections.OrderedDict())[sc.id] = {actor: policy.evaluate(ACTORS[actor]) for actor in actors}
    privs = {name: relevant_privileges(pols) for name, pols in per_resource_policies.items()}
    return out, privs, types


def dedupe_variants(results: dict, privs: dict) -> dict[str, dict[str, str]]:
    """Per resource: scenario -> the first scenario with an identical outcome table."""
    eq: dict[str, dict[str, str]] = {}
    for resource, by_scenario in results.items():
        seen: dict[str, str] = {}
        eq[resource] = {}
        for sc_id, table in by_scenario.items():
            key = json.dumps({a: sorted(g) for a, g in table.items()}, sort_keys=True)
            if key in seen:
                eq[resource][sc_id] = seen[key]
            else:
                seen[key] = sc_id
                eq[resource][sc_id] = sc_id
    return eq


# ----------------------------------------------------------------------------------------------
# outputs
# ----------------------------------------------------------------------------------------------
def write_json(path: Path, server: dict, results: dict, privs: dict, eq: dict, types: dict) -> dict:
    rows = []
    evidence: dict[str, set[str]] = collections.defaultdict(set)
    for resource, by_scenario in results.items():
        for sc_id, table in by_scenario.items():
            if eq[resource][sc_id] != sc_id:
                continue
            for actor, granted in table.items():
                cell = {}
                for priv in privs[resource]:
                    g = granted.get(priv)
                    if g:
                        cell[priv] = f"{g['path']}|{g['rule']}"
                        evidence[g['rule']].add(g['evidence'])
                rows.append({
                    'resourceType': resource, 'policyType': types[resource], 'settingsVariant': sc_id, 'role': actor,
                    'granted': cell,
                })
    doc = {
        'meta': {
            'generatedAt': dt.date.today().isoformat(),
            'serverSha': server['sha'],
            'generator': 'docs/qa/server-rebuild/knowledge/_tools/access/gen_access_matrix.py',
            'rowShape': 'one row per resourceType x settingsVariant x role: granted = {privilege: "<path>|<rule name>"}; every privilege in relevantPrivileges[resourceType] that is absent from granted is denied. Expand to {resourceType, settingsVariant, role, privilege, granted, path, evidence} by iterating granted (evidence = evidence[rule name]) and denied. Rows exist only for the variants whose outcome table differs; equivalentVariants maps every variant to its row-bearing twin. Roles are scoped per resource family (see rolesPerFamily).',
            'pathVocabulary': 'direct | cascade(<origin resource>) | parent-credential | derived-credential | type-only | data-dependent | settings:<flag> | privilege-rule(<source>-><granted>)',
            'counts': {'resourceTypes': len(results), 'roles': len(ACTORS), 'variants': len(SCENARIOS), 'rows': len(rows)},
        },
        'evidence': {rule: sorted(v) for rule, v in sorted(evidence.items())},
        'rolesPerFamily': FAMILY_ACTORS,
        'roles': {a: {'credentials': [f'{c.type}' + (f'@{c.resource}' if c.resource else '') for c in creds], 'note': ACTOR_NOTES.get(a, '')} for a, creds in ACTORS.items()},
        'variants': {sc.id: {'description': sc.description, 'settings': sc.describe()} for sc in SCENARIOS},
        'relevantPrivileges': privs,
        'equivalentVariants': eq,
        'serverEnums': {k: sorted(v.values()) for k, v in server['enums'].items()},
        'roleDefinitions': server['roleDefinitions'],
        'defaultSettings': server['defaultSettings'],
        'rows': rows,
    }
    path.write_text(json.dumps(doc, indent=0, ensure_ascii=False) + '\n')
    return doc['meta']['counts']


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--server', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--stats-only', action='store_true')
    ap.add_argument('--dump-rules', nargs=2, metavar=('NODE', 'VARIANT'), help='print the modelled rules of one resource under one variant and exit')
    args = ap.parse_args()
    if args.dump_rules:
        node, variant = args.dump_rules
        sc = next(s for s in SCENARIOS if s.id == variant)
        policy = Builder(sc).build()[node]
        for r in sorted(policy.credential_rules, key=lambda r: r.name):
            crit = ','.join(sorted(c.type + (f'@{c.resource}' if c.resource else '') for c in r.criteria))
            print(f"{r.name} | cascade={str(r.cascade).lower()} | {','.join(sorted(r.privileges))} | {crit}  [{r.evidence}; origin {r.origin}]")
        for r in policy.privilege_rules:
            print(f"  privilege-rule {r.source} -> {','.join(r.granted)} ({r.name}) [{r.evidence}]")
        return
    server = read_server(Path(args.server))
    results, privs, types = evaluate_all()
    eq = dedupe_variants(results, privs)
    out = Path(args.out)
    counts = write_json(out / 'access-matrix.json', server, results, privs, eq, types)
    print(json.dumps(counts))
    distinct = sum(len(set(m.values())) for m in eq.values())
    print(f'distinct (resource, variant) tables: {distinct}')
    if not args.stats_only:
        from write_markdown import write_markdown
        write_markdown(out / 'access-matrix.md', server, results, privs, eq, types, SCENARIOS, ACTORS, ACTOR_NOTES)


if __name__ == '__main__':
    main()
