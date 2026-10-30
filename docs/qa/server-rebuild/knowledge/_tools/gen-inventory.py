import json, sys, collections
rows = json.load(open(sys.argv[1]))
sha = sys.argv[2]
by_area = collections.OrderedDict()
for r in rows:
    area = r['file'].split('/')[0]
    by_area.setdefault(area, collections.OrderedDict()).setdefault(r['file'], []).append(r)
files = len({r['file'] for r in rows}); n = len(rows)
skip = sum(r['mode']=='skip' for r in rows); todo = sum(r['mode']=='todo' for r in rows)
out = []
out.append("# server-api test inventory — raw seed for the behaviour knowledge base\n")
out.append(f"_Generated 2026-10-28 from `origin/develop` @ `{sha}` by letting vitest **collect** every `server-api/src/functional-api/**/*.it-spec.ts` (`vitest.collect()` with globalSetup/setupFiles stripped, no server). Names are therefore the resolved ones: `test.each`/`describe.each` tables are expanded, template-literal names are filled in, multi-line names are whole. Titles say WHAT is asserted; the knowledge documents per area add WHY (the business rule) and drop the HOW. `[skip]` = `test.skip`/`describe.skip`, `[todo]` = `test.todo`._\n")
out.append(f"**{files} files · {n} cases · {skip} skipped · {todo} todo** (one row per distinct file+suite+name; a case that belongs to several vitest projects is listed once).\n")
for area, fmap in by_area.items():
    a_rows = [r for f in fmap.values() for r in f]
    out.append(f"\n## {area}  <sub>{len(fmap)} files · {len(a_rows)} cases · {sum(r['mode']=='skip' for r in a_rows)} skip · {sum(r['mode']=='todo' for r in a_rows)} todo</sub>\n")
    for f, frows in fmap.items():
        out.append(f"\n### `{f}`")
        last = None
        for r in frows:
            chain = ' > '.join(r['suites']) or '(file level)'
            if chain != last:
                out.append(f"- **{chain}**"); last = chain
            tag = '' if r['mode'] in ('run','only') else f" [{r['mode']}]"
            out.append(f"    - {r['name']}{tag}")
open(sys.argv[3], 'w').write('\n'.join(out) + '\n')
print(f"files={files} cases={n} skip={skip} todo={todo} areas={len(by_area)}")
