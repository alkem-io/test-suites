import { createVitest } from 'vitest/node';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const v = await createVitest('test', { config: path.join(root, 'vitest.list.config.ts'), root, watch: false });
const { testModules } = await v.collect();
const rows = [];
const seen = new Set();
for (const m of testModules) {
  const file = path.relative(path.join(root, 'src/functional-api'), m.moduleId);
  for (const t of m.children.allTests()) {
    const chain = [];
    let p = t.parent;
    while (p && p.type === 'suite') { chain.unshift(p.name); p = p.parent; }
    const key = file + '\u0000' + chain.join(' > ') + '\u0000' + t.name;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ file, suites: chain, name: t.name, mode: (t.options && t.options.mode) || t.mode, line: t.location?.line ?? null });
  }
}
writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
console.log(`files=${new Set(rows.map(r => r.file)).size} cases=${rows.length} skip=${rows.filter(r => r.mode === 'skip').length} todo=${rows.filter(r => r.mode === 'todo').length}`);
await v.close();
