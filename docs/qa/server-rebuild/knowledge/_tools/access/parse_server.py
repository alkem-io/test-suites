"""Reads the parts of the server source the matrix is derived from mechanically:
the privilege / credential / policy-type enums, the role definitions, the rule-name constants,
and the SHA of the checkout. Nothing here is hand-typed; if the server changes these files the
regeneration picks the change up."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ENUM_FILES = {
    'privileges': 'src/common/enums/authorization.privilege.ts',
    'credentials': 'src/common/enums/authorization.credential.ts',
    'policyTypes': 'src/common/enums/authorization.policy.type.ts',
    'roleNames': 'src/common/enums/role.name.ts',
}
ROLE_DEFINITION_FILES = {
    'space': 'src/domain/space/space.defaults/definitions/space.community.roles.ts',
    'subspace': 'src/domain/space/space.defaults/definitions/subspace.community.roles.ts',
    'organization': 'src/domain/community/organization/definitions/organization.role.definitions.ts',
}
CONSTANT_FILES = [
    'src/common/constants/authorization/credential.rule.constants.ts',
    'src/common/constants/authorization/credential.rule.types.constants.ts',
    'src/common/constants/authorization/policy.rule.constants.ts',
]
DEFAULT_SETTINGS_FILES = {
    'L0': 'src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts',
    'subspace': 'src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.subspace.ts',
}

ENUM_MEMBER = re.compile(r"^\s*([A-Z0-9_]+)\s*=\s*'([^']+)'", re.M)


def parse_enum(text: str) -> dict[str, str]:
    return {m.group(1): m.group(2) for m in ENUM_MEMBER.finditer(text)}


def parse_constants(text: str) -> dict[str, str]:
    out = {}
    for m in re.finditer(r"export const ([A-Z0-9_]+)\s*=\s*\n?\s*'([^']+)'", text):
        out[m.group(1)] = m.group(2)
    return out


def parse_role_definitions(text: str, credentials: dict[str, str]) -> list[dict]:
    roles = []
    for block in re.split(r"\n\s*\{\s*\n\s*name:", text)[1:]:
        name = re.search(r"RoleName\.([A-Z_]+)", block).group(1).lower()
        cred = re.search(r"type: AuthorizationCredential\.([A-Z_]+)", block).group(1)
        entry = re.search(r"requiresEntryRole: (true|false)", block).group(1) == 'true'
        same = re.search(r"requiresSameRoleInParentRoleSet: (true|false)", block).group(1) == 'true'
        pol = re.findall(r"(userPolicyData|organizationPolicyData|virtualContributorPolicyData): \{\s*minimum: (-?\d+),\s*maximum: (-?\d+)", block)
        roles.append({
            'name': name,
            'credential': credentials[cred],
            'requiresEntryRole': entry,
            'requiresSameRoleInParentRoleSet': same,
            'policies': {k.replace('PolicyData', ''): {'min': int(a), 'max': int(b)} for k, a, b in pol},
        })
    return roles


def parse_default_settings(text: str) -> dict:
    idx = text.rfind('privacy: {')
    block = text[idx:] if idx >= 0 else text
    get = lambda key: (re.search(rf"{key}: ([A-Za-z.]+|true|false)", block) or [None, None])[1]
    return {
        'privacy.mode': (get('mode') or '').split('.')[-1].lower(),
        'privacy.allowPlatformSupportAsAdmin': get('allowPlatformSupportAsAdmin'),
        'membership.policy': (get('policy') or '').split('.')[-1].lower(),
        'membership.allowSubspaceAdminsToInviteMembers': get('allowSubspaceAdminsToInviteMembers'),
        'collaboration.inheritMembershipRights': get('inheritMembershipRights'),
        'collaboration.allowMembersToCreateSubspaces': get('allowMembersToCreateSubspaces'),
        'collaboration.allowMembersToCreateCallouts': get('allowMembersToCreateCallouts'),
        'collaboration.allowGuestContributions': get('allowGuestContributions'),
    }


def read_server(server: Path) -> dict:
    sha = subprocess.run(['git', '-C', str(server), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    enums = {k: parse_enum((server / v).read_text()) for k, v in ENUM_FILES.items()}
    constants: dict[str, str] = {}
    for f in CONSTANT_FILES:
        constants.update(parse_constants((server / f).read_text()))
    roles = {k: parse_role_definitions((server / v).read_text(), enums['credentials']) for k, v in ROLE_DEFINITION_FILES.items()}
    defaults = {k: parse_default_settings((server / v).read_text()) for k, v in DEFAULT_SETTINGS_FILES.items()}
    return {'sha': sha, 'enums': enums, 'constants': constants, 'roleDefinitions': roles, 'defaultSettings': defaults}


if __name__ == '__main__':
    import json, sys
    print(json.dumps(read_server(Path(sys.argv[1])), indent=1)[:4000])
