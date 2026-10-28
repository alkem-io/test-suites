# Regenerating `_inventory.md`

The inventory is produced by letting vitest **collect** the server-api suite
(no server, no globalSetup), so `test.each` tables, template-literal names and
multi-line names come out resolved. Run from a clean checkout of the revision
you want to inventory (`node_modules` present):

```bash
cp docs/qa/server-behaviour-knowledge/_tools/vitest.list.config.ts server-api/
cp docs/qa/server-behaviour-knowledge/_tools/collect-inventory.mjs server-api/
(cd server-api && node collect-inventory.mjs /tmp/inventory-rows.json)
python3 -I docs/qa/server-behaviour-knowledge/_tools/gen-inventory.py \
  /tmp/inventory-rows.json "$(git rev-parse --short HEAD)" \
  docs/qa/server-behaviour-knowledge/_inventory.md
rm server-api/vitest.list.config.ts server-api/collect-inventory.mjs
```

`vitest.list.config.ts` stubs the `platformRoles` provided context because six
platform-roles specs read it at module load; nothing else needs an environment.
