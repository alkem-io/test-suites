#!/usr/bin/env python3
"""Maps the two decision-table suites onto matrix cells and compares expectations with the derivation.

usage: python3 -I crosscheck.py --server <server> --tests <dir with storage.json + platform-roles.json> --out <dir>

Writes crosscheck-tests.json (every mapped case with its verdict) and prints the Markdown tables that
access-matrix-crosscheck.md embeds. The two JSON inputs are extracted from the suites by reading the
specs (see README); they carry one entry per resolved vitest case title.
"""
from __future__ import annotations

import argparse
import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from engine import Criterion  # noqa: E402
from gen_access_matrix import ACTORS, PLATFORM_ROLES, SCENARIOS, registered, member_chain  # noqa: E402
from model import Builder  # noqa: E402
from parse_server import read_server  # noqa: E402

# ---------------------------------------------------------------------------------------- storage --
HARNESS_PLATFORM_ROLES = ['platform-roles-admin', 'platform-operations-admin', 'platform-users-admin', 'platform-settings-admin',
                          'platform-content-full-access', 'platform-support', 'platform-resource-admin', 'platform-license-manager']


def harness_admin(family: str) -> list[Criterion]:
    """the harness admin account in the storage suite: 8 platform roles, creator of every scenario entity (space member/lead/admin on each level,
    organisation admin + associate) and uploader of every document except in the user suite."""
    creds = registered('CREATOR') + [Criterion(r) for r in HARNESS_PLATFORM_ROLES]
    if family == 'space':
        creds += member_chain(2) + [Criterion(f'space-{r}', f'L{l}') for l in (0, 1, 2) for r in ('lead', 'admin')] + [Criterion('space-subspace-admin', 'L0'), Criterion('space-subspace-admin', 'L1')]
    if family in ('space', 'organization'):
        creds += [Criterion('organization-admin', 'ORG'), Criterion('organization-associate', 'ORG'), Criterion('account-admin', 'ORGACC')]
    if family == 'user':
        creds = registered('ADMIN') + [Criterion(r) for r in HARNESS_PLATFORM_ROLES]
    return creds


TEST_USER_ACTOR = {
    'space': {'ANONYMOUS': 'anonymous', 'NON_SPACE_MEMBER': 'registered', 'SPACE_ADMIN': 'space-admin@L0', 'SPACE_MEMBER': 'space-member@L0',
              'SUBSPACE_ADMIN': 'space-admin@L1', 'SUBSPACE_MEMBER': 'space-member@L1', 'SUBSUBSPACE_ADMIN': 'space-admin@L2', 'SUBSUBSPACE_MEMBER': 'space-member@L2'},
    'organization': {'ANONYMOUS': 'anonymous', 'NON_SPACE_MEMBER': 'registered', 'ORGANIZATION_ADMIN': 'organization-owner', 'SUBSPACE_ADMIN': 'organization-admin',
                     'SPACE_MEMBER': 'organization-associate', 'SPACE_ADMIN': 'registered', 'SUBSPACE_MEMBER': 'registered', 'SUBSUBSPACE_ADMIN': 'registered', 'SUBSUBSPACE_MEMBER': 'registered'},
    'user': {'ANONYMOUS': 'anonymous', 'NON_SPACE_MEMBER': 'registered', 'QA_USER': 'user-self', 'SPACE_ADMIN': 'registered', 'SPACE_MEMBER': 'registered',
             'SUBSPACE_ADMIN': 'registered', 'SUBSPACE_MEMBER': 'registered', 'SUBSUBSPACE_ADMIN': 'registered', 'SUBSUBSPACE_MEMBER': 'registered', 'ORGANIZATION_ADMIN': 'registered'},
}
FILE_VARIANT = {
    'public-space-document-auth': 't-pub-pub', 'private-space-document-auth': 't-priv-pub',
    'public-space-public-ch-document-auth': 't-pub-pub', 'public-space-private-ch-document-auth': 't-pub-priv',
    'private-space-public-ch-document-auth': 't-priv-pub', 'private-space-private-ch-document-auth': 't-priv-priv',
    'organization-document-auth': 'pub-open', 'user-document-auth': 'pub-open',
}
OWNER_NODE = [  # (substring of the extracted resource owner, document node template, bucket node template)
    ('space about profile', 'space-about@{L}/profile/bucket/document', 'space-about@{L}/profile/bucket'),
    ('link contribution', 'callout@{L}/contribution[link]/link/profile/bucket/document', 'callout@{L}/framing/profile/bucket'),
    ('post contribution profile', 'callout@{L}/contribution[post]/post/profile/bucket/document', 'callout@{L}/contribution[post]/post/profile/bucket'),
    ('whiteboard contribution profile', 'callout@{L}/contribution[whiteboard]/whiteboard[contributors]/profile/bucket/document', 'callout@{L}/contribution[whiteboard]/whiteboard[contributors]/profile/bucket'),
    ('post-collection callout framing profile', 'callout@{L}/framing/profile/bucket/document', 'callout@{L}/framing/profile/bucket'),
    ('whiteboard-framed callout', 'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket/document', 'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket'),
    ('identical to the Whiteboard Callout block', 'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket/document', 'callout[whiteboard-framing]@{L}/framing/whiteboard/profile/bucket'),
    ('organization profile', 'organization/profile/bucket/document', 'organization/profile/bucket'),
    ('user (QA_USER) profile', 'user/profile/bucket/document', 'user/profile/bucket'),
]


def storage_crosscheck(storage: dict, enums: dict, scenarios_nodes: dict) -> tuple[list[dict], list[str]]:
    name_to_value = enums['privileges']
    rows_out, unmapped = [], []
    for f in storage['files']:
        stem = Path(f['file']).name.replace('.it-spec.ts', '')
        variant = FILE_VARIANT.get(stem)
        family = 'organization' if 'organization' in stem else 'user' if 'user-document' in stem else 'space'
        nodes = scenarios_nodes[variant]
        for t in f['tables']:
            owner = t['resource']['owner']
            level = t['resource']['level']
            kind = t['resource']['kind']
            match = next((m for m in OWNER_NODE if m[0] in owner), None)
            if not match:
                unmapped.append(f"{stem} › {t['describe']}: resource '{owner[:60]}' not in the matrix")
                continue
            node = (match[1] if kind == 'document' else match[2]).format(L=level)
            if node not in nodes:
                unmapped.append(f"{stem} › {t['describe']}: node {node} not modelled")
                continue
            policy = nodes[node]
            for r in t['rows']:
                tu = r['userRole']
                if tu == 'GLOBAL_ADMIN':
                    creds = harness_admin(family)
                    actor = 'harness-admin'
                else:
                    actor = TEST_USER_ACTOR[family].get(tu)
                    if actor is None:
                        unmapped.append(f"{stem} › {r['caseTitle']}: test user {tu} has no actor")
                        continue
                    creds = list(ACTORS[actor])
                    if family == 'user' and actor == 'user-self':
                        creds.append(Criterion('user-self', 'CREATOR'))   # QA_USER uploads its own documents
                got = set(policy.evaluate(creds))
                expected_names = r.get('privileges')
                if expected_names is None:   # `undefined`: the parent entity is unreadable, the document is not returned
                    expected = None
                    agree = 'read' not in got
                else:
                    expected = {name_to_value.get(n, n.lower()) for n in expected_names}
                    agree = expected == got
                rows_out.append({
                    'suite': 'storage', 'file': stem, 'describe': t['describe'], 'case': r['caseTitle'], 'cell': {'resource': node, 'variant': variant, 'role': actor},
                    'expected': sorted(expected) if expected is not None else None, 'derived': sorted(got), 'verdict': 'agree' if agree else 'disagree',
                    'restStatus': r.get('expectedStatus'),
                })
    return rows_out, unmapped


# ------------------------------------------------------------------------------- platform roles --
# capability id (or prefix) -> (resource node, any-of privileges, variant). None = not an authorization-policy cell.
CAP_MAP: dict[str, tuple | None] = {
    'A1.assignPlatformRoleToUser': ('platform/role-set', ['platform-roles-assign'], 'pub-open'),
    'A1.removePlatformRoleFromUser': ('platform/role-set', ['platform-roles-assign'], 'pub-open'),
    'A1.grantCredentialToActor': None, 'A1.revokeCredentialFromActor': None,   # pinned to a retired credential in the resolver (T034a): no policy cell
    'A2.': ('platform/role-set', ['feature-role-assign'], 'pub-open'),
    'A3.authorizationPolicyResetOnPlatform': ('platform', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPolicyResetAll': ('platform', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPlatformRolesAccessReset': ('platform', ['authorization-reset'], 'pub-open'),
    'A3.aiServerAuthorizationPolicyReset': ('ai-server', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPolicyResetOnUser': ('user', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPolicyResetOnOrganization': ('organization', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPolicyResetToGlobalAdminsAccess': ('organization', ['authorization-reset'], 'pub-open'),
    'A3.authorizationPolicyResetOnAccount': ('account', ['authorization-reset'], 'pub-open'),
    'A3.licenseResetOnAccount': ('account', ['license-reset'], 'pub-open'),
    'A3.resetLicenseOnAccounts': ('licensing', ['license-reset'], 'pub-open'),
    'A4.': ('synthetic/admin-user-email-change', ['platform-users-admin'], 'pub-open'),
    'A5.deleteUser': ('synthetic/registration-delete-user', ['platform-users-admin'], 'pub-open'),
    'A5.adminIdentityDeleteKratosIdentity': ('synthetic/admin-identity-delete-kratos', ['platform-users-admin'], 'pub-open'),
    'A5.adminUserAccountDelete': ('synthetic/admin-user-account-delete', ['platform-users-admin'], 'pub-open'),
    'A5.': ('platform', ['platform-users-admin'], 'pub-open'),
    'A6.createOrganization': ('platform', ['create-organization'], 'pub-open'),
    'A6.deleteOrganization': ('organization', ['delete', 'delete-organization'], 'pub-open'),
    'A7.updateInnovationPack': ('innovation-pack', ['update', 'platform-support-org-resources'], 'pub-open'),
    'A7.updateInnovationHub': ('innovation-hub', ['update', 'platform-support-org-resources'], 'pub-open'),
    'A7.createTemplate': ('innovation-pack/template', ['create', 'platform-support-org-resources'], 'pub-open'),
    'A7.updateTemplate': ('innovation-pack/template', ['update', 'platform-support-org-resources'], 'pub-open'),
    'A7.deleteTemplate': ('innovation-pack/template', ['delete', 'platform-support-org-resources'], 'pub-open'),
    'A7.updateCallout': ('innovation-pack/template/callout', ['update', 'platform-support-org-resources'], 'pub-open'),
    'A8.deleteCallout': ('callout@L0', ['delete'], 'priv-applications'),
    'A8.deleteContribution': ('callout@L0/contribution[post]', ['delete'], 'priv-applications'),
    'A8.deleteSpace': ('space@L0', ['delete'], 'priv-applications'),
    'A8.deleteInnovationPack': ('innovation-pack', ['delete'], 'pub-open'),
    'A8.deleteInnovationHub': ('innovation-hub', ['delete'], 'pub-open'),
    'A8.updateCalloutPublishInfo': ('callout@L0', ['update-callout-publisher'], 'pub-open'),
    'A9.moveSpace': ('synthetic/conversion-global-admins', ['transfer-resource-offer'], 'pub-open'), 'A9.convertSpace': ('synthetic/conversion-global-admins', ['transfer-resource-offer'], 'pub-open'),
    'A9.convertVirtualContributorToUseKnowledgeBase': ('synthetic/conversion-global-admins', ['transfer-resource-offer'], 'pub-open'),
    'A9.moveContributionToCallout': ('callout@L0/contribution[post]', ['move-contribution'], 'pub-open'),
    'A9.transferCallout': ('callouts-set@L0', ['transfer-resource-offer'], 'pub-open'),
    'A9.transfer': ('account', ['transfer-resource-offer'], 'pub-open'),
    'A10.setPlatformWellKnownVirtualContributor': ('synthetic/platform-well-known-vc-set', ['platform-settings-admin'], 'pub-open'),
    'A10.': ('platform', ['platform-settings-admin'], 'pub-open'),
    'A11.updateAssistantActorCapabilities': ('virtual-assistant', ['platform-operations-admin'], 'pub-open'),
    'A11.adminCommunication': ('synthetic/admin-communication-grant', ['platform-operations-admin', 'grant'], 'pub-open'),
    'A11.': ('platform', ['platform-operations-admin'], 'pub-open'),
    'A12.updateBaselineLicensePlanOnAccount': ('account', ['account-license-manage'], 'pub-open'),
    'A12.': ('licensing', ['grant'], 'pub-open'),
    'A13.': ('synthetic/license-definition-admin', ['create', 'update', 'delete'], 'pub-open'),
    'A14.': ('space@L0', ['account-license-manage'], 'user-hosted'),
    'A15.getAccessPrivilegesForPlatformSupport': ('role-set@L0', ['grant'], 'priv-applications+support'),
    'A15.updateDiscussion': ('discussion[authenticated]', ['platform-forum-manage'], 'pub-open'),
    'A15.deleteDiscussion': ('discussion[authenticated]', ['platform-forum-manage'], 'pub-open'),
    'A15.adminForumRemoveDiscussionCategory': ('forum', ['platform-forum-manage'], 'pub-open'),
    'A16.': ('callouts-set@L0', ['read'], 'priv-applications'),
    'A17.updateActorNameID': ('user', ['update-nameid'], 'pub-open'),
    'A17.updateSpace.nameID': ('space@L0', ['update-nameid'], 'user-hosted'),
    'A19.': ('platform', ['platform-audit-read'], 'pub-open'),
    'A20b.': ('platform/role-set', ['feature-role-holders-read', 'platform-role-holders-read'], 'pub-open'),
    'A20.': ('platform/role-set', ['platform-role-holders-read'], 'pub-open'),
    'A21.': ('platform', ['set-service-profile'], 'pub-open'),
    'A22.assignRoleToOrganization': ('role-set@L0', ['roleset-entry-role-assign-organization'], 'user-hosted'),
    'A22.assignRoleToUser#': ('organization/role-set', ['roleset-entry-role-assign'], 'pub-open'),
    'A22.': ('role-set@L0', ['roleset-entry-role-assign'], 'user-hosted'),
    'A23.inviteForEntryRoleOnRoleSet': ('organization/role-set', ['roleset-entry-role-invite'], 'pub-open'),
    'A23.resendPlatformInvitation': ('organization/role-set', ['platform-support-org-membership'], 'pub-open'),
    'A23.assignRoleToUser': ('organization/role-set', ['grant', 'platform-support-org-membership'], 'pub-open'),
    'A23.removeRoleFromUser': ('organization/role-set', ['grant', 'platform-support-org-membership'], 'pub-open'),
    'A23.eventOnApplication#reject': ('organization/application', ['update', 'platform-support-org-membership'], 'pub-open'),
    'A23.eventOnApplication': ('organization/application', ['grant', 'platform-support-org-membership'], 'pub-open'),
    'A23.deleteInvitation': ('organization/invitation', ['delete', 'platform-support-org-membership'], 'pub-open'),
    'A23.deletePlatformInvitation': ('organization/role-set', ['delete', 'platform-support-org-membership'], 'pub-open'),
    'A23.applications': ('organization/role-set', ['grant', 'platform-support-org-membership'], 'pub-open'),
}


def cap_mapping(cap_id: str):
    for key in sorted(CAP_MAP, key=len, reverse=True):   # longest prefix wins
        if cap_id.startswith(key):
            return key, CAP_MAP[key]
    return None, None


def platform_roles_crosscheck(pr: dict, scenarios_nodes: dict) -> tuple[list[dict], list[dict]]:
    out, unmapped = [], []
    for c in pr['capabilities']:
        key, m = cap_mapping(c['id'])
        n_cases = len(c['caseTitles'].get('positive', [])) + len(c['caseTitles'].get('negative', []))
        if m is None:
            unmapped.append({'id': c['id'], 'cases': n_cases, 'why': 'resolver-side check pinned to a retired credential' if c['id'].startswith('A1.grant') or c['id'].startswith('A1.revoke')
                             else 'no mapping'})
            continue
        node, privs, variant = m
        policy = scenarios_nodes[variant][node]
        derived_allowed = sorted(r for r in PLATFORM_ROLES if any(p in policy.evaluate(ACTORS[r]) for p in privs))
        expected_allowed = sorted(set(r.lower().replace('_', '-') for r in c['owners'] + c['acceptedExtra']))
        verdict = 'no-cases' if n_cases == 0 else 'agree' if derived_allowed == expected_allowed else 'disagree'
        out.append({'suite': 'platform-roles', 'id': c['id'], 'group': c['group'], 'cases': n_cases, 'cell': {'resource': node, 'variant': variant, 'privileges': privs},
                    'expectedAllowed': expected_allowed, 'derivedAllowed': derived_allowed, 'verdict': verdict,
                    'positive': c['positive']['status'], 'negative': c['negative']['status']})
    return out, unmapped


def coverage(storage_rows, pr_rows, scenarios_nodes, results_json: dict) -> dict:
    """Which (resource, role, privilege) cells of the matrix any mapped test touches."""
    touched = set()
    for r in storage_rows:
        for p in (r['expected'] or []) + r['derived']:
            touched.add((r['cell']['resource'], r['cell']['role'], p))
    for r in pr_rows:
        for role in PLATFORM_ROLES:
            for p in r['cell']['privileges']:
                touched.add((r['cell']['resource'], role, p))
    cells: dict[str, set] = collections.defaultdict(set)
    for row in results_json['rows']:
        res, role = row['resourceType'], row['role']
        for p in results_json['relevantPrivileges'][res]:
            cells[row['policyType']].add((res, role, p))
    by_type = {t: {'cells': len(c), 'touchedByTests': len(c & touched), 'untouched': len(c - touched)} for t, c in sorted(cells.items())}
    totals = {'cells': sum(v['cells'] for v in by_type.values()), 'touchedByTests': sum(v['touchedByTests'] for v in by_type.values())}
    totals['untouched'] = totals['cells'] - totals['touchedByTests']
    return {'byPolicyType': by_type, 'totals': totals, 'note': 'a cell is one (resource, role, privilege) over all variants; touched = a mapped test asserts it under at least one variant'}


def md_table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '---|' * len(headers)]
    for r in rows:
        out.append('| ' + ' | '.join(str(x).replace('|', '\\|') for x in r) + ' |')
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--server', required=True)
    ap.add_argument('--tests', required=True)
    ap.add_argument('--matrix', required=True, help='access-matrix.json (for the coverage counts)')
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    server = read_server(Path(args.server))
    storage = json.loads((Path(args.tests) / 'storage.json').read_text())
    pr = json.loads((Path(args.tests) / 'platform-roles.json').read_text())
    matrix = json.loads(Path(args.matrix).read_text())
    scenarios_nodes = {sc.id: Builder(sc).build() for sc in SCENARIOS}
    s_rows, s_unmapped = storage_crosscheck(storage, server['enums'], scenarios_nodes)
    p_rows, p_unmapped = platform_roles_crosscheck(pr, scenarios_nodes)
    cov = coverage(s_rows, p_rows, scenarios_nodes, matrix)
    scen_cases = sum(len(s.get('caseTitles', [])) for s in pr['scenarios'])
    other = pr['reconciliation'].get('other', 0)
    summary = {
        'storage': {'cases': len(s_rows), 'agree': sum(r['verdict'] == 'agree' for r in s_rows), 'disagree': sum(r['verdict'] == 'disagree' for r in s_rows), 'unmapped': s_unmapped},
        'platformRoles': {'capabilityRows': len(p_rows), 'cases': sum(r['cases'] for r in p_rows), 'agree': sum(r['verdict'] == 'agree' for r in p_rows),
                          'disagree': sum(r['verdict'] == 'disagree' for r in p_rows), 'unmappedCapabilities': p_unmapped,
                          'unmappedCases': sum(u['cases'] for u in p_unmapped), 'scenarioCases': scen_cases, 'coverageGuardCases': other},
        'coverage': cov,
    }
    Path(args.out, 'access-matrix-crosscheck.json').write_text(json.dumps({'summary': summary, 'storage': s_rows, 'platformRoles': p_rows}, indent=1) + '\n')
    print(json.dumps(summary, indent=1))
    print('\n## storage disagreements')
    print(md_table(['file', 'describe', 'test user → role', 'cell', 'test expects', 'derivation'],
                   [(r['file'], r['describe'], r['case'].split('"')[1] + ' → ' + r['cell']['role'], f"`{r['cell']['resource']}` @ {r['cell']['variant']}",
                     ', '.join(r['expected']) if r['expected'] is not None else 'unreachable (undefined)', ', '.join(r['derived'])) for r in s_rows if r['verdict'] == 'disagree']))
    print('\n## platform-roles rows')
    print(md_table(['capability', 'cases', 'cell', 'test: allowed roles', 'derivation: allowed roles', 'verdict'],
                   [(r['id'], r['cases'], f"`{r['cell']['resource']}` · {'/'.join(r['cell']['privileges'])} @ {r['cell']['variant']}", ', '.join(r['expectedAllowed']) or '—',
                     ', '.join(r['derivedAllowed']) or '—', r['verdict']) for r in p_rows]))


if __name__ == '__main__':
    main()
