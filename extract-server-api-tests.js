#!/usr/bin/env node
/*
  Extract all test suites (describe blocks) and test cases (it/test) from server-api project.
  Outputs markdown inventory to server-api-test-inventory.md
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, 'server-api');
const OUTPUT = path.resolve(__dirname, 'server-api-test-inventory.md');

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.it-spec\.ts$/.test(e.name)) acc.push(full);
  }
  return acc;
}

function extract(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const suites = []; // { name, line, parentIndex }
  const cases = []; // { name, line, suitePath }
  const stack = []; // indexes of suites forming breadcrumb

  const describeRegex = /(^|\s)describe\(\s*['"`]([^'"`]+)['"`]\s*,/;
  const testRegex = /(^|\s)(it|test)\(\s*['"`]([^'"`]+)['"`]\s*,/;

  // crude balance tracking for popping describes
  const openBraces = [];

  for (let i = 0; i < content.length; i++) {
    const line = content[i];
    if (/^\s*\/\//.test(line)) continue; // skip commented lines
    const dMatch = line.match(describeRegex);
    if (dMatch) {
      const name = dMatch[2].trim();
      suites.push({ name, line: i + 1, parentIndex: stack.length ? stack[stack.length - 1] : null });
      stack.push(suites.length - 1);
      // track brace depth from this line
      openBraces.push({ index: suites.length - 1, depth: braceDepth(line) });
      continue;
    }
    const tMatch = line.match(testRegex);
    if (tMatch) {
      const name = tMatch[3].trim();
      const suitePath = stack.map(idx => suites[idx].name);
      cases.push({ name, line: i + 1, suitePath });
    }
    // update brace depths and pop when block likely ends
    if (openBraces.length) {
      const depthChange = netBraceDelta(line);
      for (const o of openBraces) o.depth += depthChange;
      // pop finished describes (depth back to zero)
      let popped = false;
      while (openBraces.length && openBraces[openBraces.length - 1].depth <= 0) {
        openBraces.pop();
        stack.pop();
        popped = true;
      }
      if (popped) continue;
    }
  }
  return { suites, cases };
}

function braceDepth(line) {
  return (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
}
function netBraceDelta(line) { return braceDepth(line); }

function buildMarkdown(results) {
  const lines = [];
  lines.push('# Server API Test Inventory');
  lines.push('Generated on ' + new Date().toISOString());
  lines.push('');
  lines.push('> This document enumerates all describe blocks (suites) and test/it cases detected in `server-api` `.it-spec.ts` files.');
  lines.push('');
  for (const r of results) {
    const rel = path.relative(ROOT, r.file);
    lines.push('## ' + rel);
    if (!r.data.suites.length) {
      lines.push('*No describe blocks found*');
    } else {
      lines.push('**Suites**');
      for (const s of r.data.suites) {
        const breadcrumb = buildBreadcrumb(r.data.suites, s);
        lines.push('- ' + breadcrumb + ` (line ${s.line})`);
      }
    }
    if (!r.data.cases.length) {
      lines.push('**Cases**: *None found*');
    } else {
      lines.push('**Cases**');
      for (const c of r.data.cases) {
        const suitePrefix = c.suitePath.length ? c.suitePath.join(' > ') + ' :: ' : '';
        lines.push('- ' + suitePrefix + c.name + ` (line ${c.line})`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildBreadcrumb(allSuites, suite) {
  const chain = [];
  let current = suite;
  while (current) {
    chain.push(current.name);
    current = current.parentIndex != null ? allSuites[current.parentIndex] : null;
  }
  return chain.reverse().join(' > ');
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('server-api directory not found at', ROOT);
    process.exit(1);
  }
  const files = walk(ROOT).sort();
  const results = files.map(f => ({ file: f, data: extract(f) }));
  const md = buildMarkdown(results);
  fs.writeFileSync(OUTPUT, md, 'utf8');
  console.log('Inventory written to', OUTPUT);
  console.log('Files processed:', files.length);
}

main();
