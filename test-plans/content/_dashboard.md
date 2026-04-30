# QA test plans — Obsidian dashboard

> This note is Obsidian-only. The filename starts with `_` so the CLI's glob
> skips it. Delete freely if you don't use it.
>
> The Dataview queries below will **only render once the Dataview community
> plugin is installed and enabled**. Settings → Community plugins → Browse →
> search "Dataview" → Install → Enable. Takes ~10 seconds.

---

## Feature libraries — count + slug

```dataview
TABLE WITHOUT ID
  file.link AS "File",
  feature AS "Feature",
  slug AS "Slug"
FROM "features"
SORT file.path ASC
```

## Release plans in the vault

```dataview
TABLE WITHOUT ID
  file.link AS "Release",
  release AS "ID",
  target_date AS "Target date",
  description AS "Description"
FROM "releases"
SORT release DESC
```

## Every case across every feature (parsed from `## TC-` headings)

```dataviewjs
const cases = [];
for (const p of dv.pages('"features"')) {
  const raw = await dv.io.load(p.file.path);
  if (!raw) continue;
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^## (TC-\d+)\s+—\s+(.+)$/.exec(lines[i]);
    if (!m) continue;
    // Peek a few lines ahead for the fenced yaml block
    let priority = '—', state = '—', automation = '—';
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const pm = /^priority:\s*(\S+)/.exec(lines[j]);
      const sm = /^state:\s*(\S+)/.exec(lines[j]);
      const am = /^automation:\s*(\S+)/.exec(lines[j]);
      if (pm) priority = pm[1];
      if (sm) state = sm[1];
      if (am) automation = am[1];
      if (lines[j].startsWith('## ')) break;
    }
    cases.push([m[1], m[2], p.feature || p.file.name, priority, state, automation]);
  }
}
dv.table(
  ["ID", "Title", "Feature", "Priority", "State", "Automation"],
  cases.sort((a, b) => a[0].localeCompare(b[0]))
);
dv.paragraph(`**Total:** ${cases.length} case(s) across ${dv.pages('"features"').length} feature libraries`);
```

## R31 in-scope cases (parsed inline)

```dataviewjs
const r31 = dv.pages('"releases"').where(p => p.release === 'R31').first();
if (!r31) {
  dv.paragraph("No R31 release plan found.");
} else {
  const raw = await dv.io.load(r31.file.path);
  const inScopeMatch = /##\s+In-scope cases([\s\S]*?)(?=^##\s|$)/m.exec(raw);
  const ids = [];
  if (inScopeMatch) {
    for (const m of inScopeMatch[1].matchAll(/^[-*+]\s+(TC-\d+)/gm)) ids.push(m[1]);
  }
  const outcomes = [];
  const outcomesMatch = /##\s+Outcomes([\s\S]*)$/m.exec(raw);
  if (outcomesMatch) {
    for (const m of outcomesMatch[1].matchAll(/^###\s+(TC-\d+)\s+—\s+(\w+)/gm)) {
      outcomes.push([m[1], m[2]]);
    }
  }
  const recorded = new Map(outcomes);
  dv.table(
    ["ID", "Status"],
    ids.map(id => [id, recorded.get(id) ?? 'not-run'])
  );
  dv.paragraph(`**Totals:** ${ids.length} in scope · ${outcomes.filter(o => o[1]==='passed').length} passed · ${outcomes.filter(o => o[1]==='failed').length} failed · ${outcomes.filter(o => o[1]==='blocked').length} blocked`);
}
```
