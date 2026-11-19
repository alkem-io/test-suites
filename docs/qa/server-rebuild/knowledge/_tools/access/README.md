# Access matrix generator

Produces `knowledge/access-matrix.md`, `knowledge/access-matrix.json` and the test half of
`knowledge/access-matrix-crosscheck.md` from the server source. Python 3.10+, standard library only.

## What is generated and what is hand-derived

| Part | File | Status |
|---|---|---|
| Privilege / credential / policy-type / role-name enums, the space, subspace and organisation role definitions, the rule-name constants, the default space settings, the server SHA | `parse_server.py` | **read from the server source** on every run |
| The authorization engine: credential-rule matching, one-hop privilege rules, cascade inheritance | `engine.py` | re-implementation of `src/core/authorization/authorization.service.ts` and `authorization.policy.service.ts#inheritParentAuthorization` |
| The policy builders per entity type (which rules each `*.service.authorization.ts` appends, their cascade flag, criteria and settings branch), the platform-roles access derivation, the role-set credential helpers, the resolver-local in-memory policies | `model.py` | **hand-transcribed** from the server; every rule carries the `file:line` it came from. This is the part that must follow the server when a builder changes |
| Actor roles, settings variants, the representative resource tree, evaluation, JSON and Markdown writers | `gen_access_matrix.py`, `write_markdown.py` | generated from the model |
| Mapping of the two decision-table suites onto cells and the comparison | `crosscheck.py` + `tests/*.json` | the capability → cell map (`CAP_MAP`) and the storage resource map (`OWNER_NODE`) are hand-written; `tests/storage.json` and `tests/platform-roles.json` were extracted by reading the specs (one entry per resolved vitest case; harness e-mail addresses scrubbed) |
| The acceptance dump (aggregate shapes and counts, no ids) | `acc-aggregates.sql`, `compact_dump.py` | run read-only over the port-forward described in `data-integrity/acc-audit-queries/README.md`; outputs stay off-repo |

## Regenerate

```bash
# 1. a fresh checkout of alkem-io/server at the commit to derive from (record its SHA)
git -C ~/repos/alkemio/agents-hq/server fetch origin develop
git -C ~/repos/alkemio/agents-hq/server worktree add --detach /tmp/server-develop origin/develop

# 2. the matrix (writes ../access-matrix.json and ../access-matrix.md; ~10 s)
cd docs/qa/server-rebuild/knowledge/_tools/access
python3 -I gen_access_matrix.py --server /tmp/server-develop --out ..

# 3. the test cross-check (writes ../access-matrix-crosscheck.json and prints the Markdown tables embedded in ../access-matrix-crosscheck.md)
python3 -I crosscheck.py --server /tmp/server-develop --tests tests --matrix ../access-matrix.json --out .. > /tmp/crosscheck-tables.md

# 4. (optional) print the modelled rules of one resource under one variant, to compare with a stored policy shape
python3 -I gen_access_matrix.py --server /tmp/server-develop --out /tmp --dump-rules 'space@L1' t-pub-pub
```

Server SHA used for the committed outputs: see `meta.serverSha` in `access-matrix.json` (`eeecf9ddb3ced6be2843d84cf1dbe9ea9c170f58`, `origin/develop` 2026-10-27, Release/79). The authorization builders are byte-identical between that commit and the `v0.170.2` tag the acceptance environment ran on 2026-10-29 (`git diff --stat v0.170.2..eeecf9ddb -- '*service.authorization.ts'` is empty).

## Acceptance dump

```bash
kubectl config use-context <acceptance-v3 context>
kubectl port-forward pod/<postgres-pod> 15433:5432 &
psql -h 127.0.0.1 -p 15433 -U synapse-db -d alkemio -w -X -A -F '|' -f acc-aggregates.sql > ~/repos/qa/acc-data-quality/w1-access/acc-aggregates.out
python3 -I compact_dump.py sections acc-aggregates.out "=== 5."          # one group per level × privacy × visibility, top shape in full, other shapes as +/− deltas
python3 -I compact_dump.py rules <section-2-lines.txt> space role-set    # rule-level shapes with repeated criteria collapsed (space-admin@idx2 = two ancestor admins)
```

Sections: 1 policies per type · 2 distinct credential rules per type · 3 privilege rules · 4 distinct full shapes and empty rule lists · 5/5b/5c space, role-set and callouts-set shapes per settings variant · 6/6b role definitions and parent-credential consistency · 7 space settings variants · 8 `platformRolesAccess` shapes · 9 other settings dimensions · 10/10b document and bucket shapes per owning profile type · 12 support flag vs stored access · 13 policies carrying retired credentials · 14 live rows carrying retired credentials · 15 policy-type lag · 16b anonymous read on direct storage buckets.

## When the server changes

- An enum, a role definition or a rule-name constant: rerun; nothing to edit.
- A builder (`*.service.authorization.ts`): edit the matching function in `model.py`, update the `file:line` evidence, rerun. `--dump-rules` against a freshly reset acceptance policy is the quickest check.
- A new resolver-local `IN_MEMORY` policy (`src/common/constants/authorization/global.policy.constants.ts`): add it to `SYNTHETIC` in `model.py`.
- A new capability row in the platform-roles suite: add its cell to `CAP_MAP` in `crosscheck.py` and regenerate `tests/platform-roles.json` from the suite.
