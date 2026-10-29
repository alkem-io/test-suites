"""Renders access-matrix.md from the evaluated matrix. One table per policy type (the canonical
representative node under the base variant), followed by the deltas every other variant and
every other node of that type introduces."""
from __future__ import annotations

import collections
import datetime as dt

MARKS = [('direct', 'D'), ('cascade', 'C'), ('parent-credential', 'P'), ('derived-credential', 'X'), ('type-only', 'T'), ('data-dependent', '?'),
         ('settings', 'S'), ('privilege-rule', 'R')]
BASE_VARIANT = 'pub-open'


def mark(path: str) -> str:
    return ''.join(m for key, m in MARKS if key in path)


def short(priv: str) -> str:
    return priv.replace('roleset-entry-role-', 'entry:').replace('receive-notifications', 'notif').replace('platform-', 'pf:').replace('transfer-resource-', 'transfer:')


def canonical_for(nodes: list[str]) -> str:
    l1 = [n for n in nodes if '@L1' in n]
    return l1[0] if l1 else nodes[0]


def table(node: str, variant: str, results: dict, privs: dict) -> list[str]:
    tbl = results[node][variant]
    cols = privs[node]
    lines = ['| role | ' + ' | '.join(short(p) for p in cols) + ' |', '|---|' + '---|' * len(cols)]
    for actor, granted in tbl.items():
        cells = [mark(granted[p]['path']) if p in granted else '·' for p in cols]
        lines.append(f'| {actor} | ' + ' | '.join(cells) + ' |')
    return lines


def delta(base: dict, other: dict, privs: list[str]) -> list[str]:
    """Cells that differ, grouped as '+ priv (path|rule): roles' / '− priv: roles'."""
    groups: dict[tuple, list[str]] = collections.OrderedDict()
    for actor in other:
        b = base.get(actor, {})
        o = other[actor]
        for p in privs:
            if p in o and p not in b:
                groups.setdefault(('+', p, f'{o[p]["path"]}|{o[p]["rule"]}'), []).append(actor)
            elif p in b and p not in o:
                groups.setdefault(('−', p, ''), []).append(actor)
    out = []
    for (sign, p, path), actors in groups.items():
        who = ', '.join(actors) if len(actors) <= 6 else f'{", ".join(actors[:5])} and {len(actors) - 5} more'
        out.append(f'{sign} {p}' + (f' ({path})' if path else '') + f' for {who}')
    return out


def write_markdown(path, server, results, privs, eq, node_types, scenarios, actors, actor_notes) -> None:
    types = collections.OrderedDict()
    for node in results:
        types.setdefault(node_types[node], []).append(node)
    L = []
    L.append('# Access matrix — who may do what, on which resource, by which path')
    L.append('')
    L.append(f"_Generated {dt.date.today().isoformat()} by `knowledge/_tools/access/gen_access_matrix.py` from `alkem-io/server` `origin/develop` @ `{server['sha'][:9]}`. "
             "The rules are derived from the `*.service.authorization.ts` builders (transcribed in `_tools/access/model.py`, every rule with its file:line) and evaluated with a re-implementation of the server's engine; "
             "nothing here is read from stored `authorization_policy` rows. The companion `access-matrix.json` carries every cell; `access-matrix-crosscheck.md` compares this derivation with the acceptance data and the two decision-table suites._")
    L.append('')
    L.append('## How to read a table')
    L.append('')
    L.append('Rows are actor roles, columns are the privileges the resource type can carry, a cell is `·` (not granted) or the **path** by which the privilege is granted:')
    L.append('')
    L.append('| mark | path |')
    L.append('|---|---|')
    L.append('| D | direct: a rule appended on this resource matched the actor\'s own credential |')
    L.append('| C | cascade: the matching rule was appended on an ancestor resource and inherited (`cascade: true`) |')
    L.append('| P | parent credential: the matched criterion is an ancestor space\'s credential (`parentCredentials` of the role, e.g. the L0 admin on an L1) |')
    L.append('| X | derived credential: `space-subspace-admin`, issued to subspace admins on the parent |')
    L.append('| T | type-only criterion: a platform role or a global credential (anonymous / guest / registered) |')
    L.append('| S | the rule exists only under a settings variant (named in the JSON path) |')
    L.append('| R | privilege rule: granted by mapping from another privilege the actor holds (one hop, never cascades) |')
    L.append('| ? | data-dependent criterion (e.g. the spaces a user is member of); modelled on one representative |')
    L.append('')
    L.append('Marks combine (`CP` = inherited rule matched through a parent credential). The main table of each type shows the canonical resource under the **base variant** '
             f'`{BASE_VARIANT}` (every level public / open, no flags); the blocks after it list only the cells that change under every other variant and on every other resource of the same type. '
             'Variants that produce an identical table are listed as equivalent. Resource names carry the level (`@L0`, `@L1`, `@L2`) and the path inside the entity tree.')
    L.append('')
    L.append('## Actor roles')
    L.append('')
    L.append('| role | credentials held | note |')
    L.append('|---|---|---|')
    for a, creds in actors.items():
        L.append(f"| {a} | {', '.join(c.type + (f'@{c.resource}' if c.resource else '') for c in creds)} | {actor_notes.get(a, '')} |")
    L.append('')
    L.append('`L0`/`L1`/`L2` are the three levels of one space tree hosted by account `ACC`; `ORG` is an organisation (account `ORGACC`); `U` the user whose own record is the resource; '
             '`CREATOR` the user that created the content. Admins and leads also hold the member credential (entry role), subspace members also hold the parent memberships, subspace admins also hold the derived `space-subspace-admin` of the parent.')
    L.append('')
    L.append('## Settings variants')
    L.append('')
    L.append('| id | settings |')
    L.append('|---|---|')
    for sc in scenarios:
        L.append(f'| {sc.id} | {sc.description} — `{sc.describe()}` |')
    L.append('')
    L.append('## Constants the rules depend on (rebaseline candidates)')
    L.append('')
    L.append('| constant | value today | source |')
    L.append('|---|---|---|')
    for group, roles in server['roleDefinitions'].items():
        for r in roles:
            pol = ', '.join(f"{k} {v['min']}..{v['max'] if v['max'] >= 0 else '∞'}" for k, v in r['policies'].items())
            L.append(f"| {group} role `{r['name']}` | credential `{r['credential']}`; entry role required: {str(r['requiresEntryRole']).lower()}; same role in parent required: {str(r['requiresSameRoleInParentRoleSet']).lower()}; caps: {pol} | role definitions |")
    for lvl, d in server['defaultSettings'].items():
        L.append(f"| default settings of a new {lvl} space | " + '; '.join(f'{k}={v}' for k, v in d.items()) + ' | bootstrap space templates |')
    L.append("| platform roles | " + ', '.join(sorted(v for v in server['enums']['credentials'].values() if v.startswith(('platform-', 'feature-')))) + ' | AuthorizationCredential |')
    L.append(f"| privileges | {len(server['enums']['privileges'])} values (see `access-matrix.json#serverEnums.privileges`) | AuthorizationPrivilege |")
    L.append('| draft callout readers | the space admins (with parents) and the creator; no platform credential is hard-coded any more | callout.platform.read.credentials.ts |')
    L.append('| callout publisher change | platform-content-full-access, platform-resource-admin | callout.platform.read.credentials.ts |')
    L.append('| platform-admin notification recipients | roles-admin (role changed), users-admin (email change, profile created/removed), support + license-manager (space created) | platform.admin.notification.routing.ts |')
    L.append('| whiteboard guest privileges | read, update-content, contribute for global-guest and global-registered, only when guest contributions are on and the whiteboard toggle is set | whiteboard.guest-access.service.ts |')
    L.append('')
    # ---- tables per type
    L.append('## Tables per resource type')
    L.append('')
    for type_, nodes in types.items():
        canon = canonical_for(nodes)
        L.append(f'### {type_}')
        L.append('')
        L.append(f'Canonical resource: `{canon}` under `{BASE_VARIANT}`. Resources of this type in the matrix: ' + ', '.join(f'`{n}`' for n in nodes) + '.')
        L.append('')
        L += table(canon, BASE_VARIANT, results, privs)
        L.append('')
        # variants
        base = results[canon][BASE_VARIANT]
        seen_variant = {}
        lines = []
        for sc in scenarios:
            if sc.id == BASE_VARIANT:
                continue
            rep = eq[canon][sc.id]
            if rep == BASE_VARIANT or eq[canon][BASE_VARIANT] == rep:
                seen_variant.setdefault('(same as base)', []).append(sc.id)
                continue
            if rep != sc.id:
                seen_variant.setdefault(rep, []).append(sc.id)
                continue
            d = delta(base, results[canon][sc.id], privs[canon])
            if d:
                lines.append(f'- **{sc.id}**: ' + '; '.join(d))
        if lines or seen_variant:
            L.append('**Variant deltas** (against the base table of the canonical resource):')
            L.append('')
            L += lines
            for rep, ids in seen_variant.items():
                L.append(f'- {", ".join(ids)}: identical to {rep if rep != "(same as base)" else BASE_VARIANT}')
            L.append('')
        # other nodes
        other_lines = []
        for n in nodes:
            if n == canon:
                continue
            if privs[n] != privs[canon]:
                extra = [p for p in privs[n] if p not in privs[canon]]
                fewer = [p for p in privs[canon] if p not in privs[n]]
            else:
                extra, fewer = [], []
            d = delta(base, results[n][BASE_VARIANT], sorted(set(privs[n]) | set(privs[canon])))
            if d or extra or fewer:
                note = ''
                if extra:
                    note += f' (carries also: {", ".join(extra)})'
                if fewer:
                    note += f' (never carries: {", ".join(fewer)})'
                other_lines.append(f'- `{n}`{note}: ' + ('; '.join(d) if d else 'same cells'))
            else:
                other_lines.append(f'- `{n}`: same cells as the canonical resource')
        if other_lines:
            L.append('**Other resources of this type** (deltas against the canonical table under the base variant; their own variant deltas are in the JSON):')
            L.append('')
            L += other_lines
            L.append('')
    # ---- where this lands
    L.append('## Where this lands in the new core (from the rebuild briefing)')
    L.append('')
    L.append('The new core stores no policy rows: one SQL verdict is computed from the credential rows and the space tree. Every row of this matrix is therefore an assertion on that verdict, not on a stored shape. What changes:')
    L.append('')
    L.append('- **Cascade becomes tree walk.** A `C` cell is a grant on an ancestor; the verdict must find the ancestor and apply the same role mapping. The `cascade: false` rules (notification privileges, entry-role apply/join/invite/assign, rename, license settings, transfer offer/accept, the private-space `read-about`) must NOT be reachable from descendants.')
    L.append('- **Parent credentials disappear.** A `P` cell (the L0 admin administering L1 and L2) must come from the tree walk, never from a stored copy of ancestor credentials — the register\'s A1 escalation (admin roles carrying an ancestor *member* credential) must have no translation.')
    L.append('- **Derived credentials disappear.** The `X` cells (`space-subspace-admin` inviting on the parent, when `allowSubspaceAdminsToInviteMembers` is set) must be computed from "is admin of a child space".')
    L.append('- **Privilege rules become verdict logic.** `R` cells (contribute→create-post, update→file-upload, contribute→update-content under `contentUpdatePolicy=contributors`, read→read-about…) are one-hop mappings evaluated on the resource itself; they never propagate.')
    L.append('- **Settings variants are inputs to the verdict.** Every `S` cell names the setting that switches it; the W5 re-point must run each variant.')
    L.append('- **Creator rights are per-row facts.** `createdBy` grants (callout, contribution, post delete, whiteboard/memo content, document, calendar event, link delete) are evaluated from the row\'s creator column.')
    L.append('- **Platform roles are credentials scoped by target type**, with exactly the per-family privileges in the `platform` and `platform/role-set` tables; `platform-content-full-access` is the only credential whose CRUD cascades from the root.')
    L.append('')
    path.write_text('\n'.join(L) + '\n')
