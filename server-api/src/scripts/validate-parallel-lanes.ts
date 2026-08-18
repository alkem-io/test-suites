/**
 * Lane guard — proves the nightly two-lane split is sound.
 *
 * Two independent proofs, both fail-closed:
 *
 * 1. Partition: `PARALLEL_MANIFEST` (src/scripts/nightly-lanes.ts) is a
 *    subset of the nightly file set with no duplicates; the serial lane is
 *    exactly its complement; the serial lane is never empty.
 *
 * 2. Soundness: no file in `PARALLEL_MANIFEST` trips any of the five hazard
 *    rule families —
 *      1. shared-mailbox access
 *      2. platform-role mutation on shared users
 *      3. shared-user settings/profile mutation
 *      4. unscoped global list/count/positional assertions
 *      5. global aggregates keyed on a shared identity, asserted by
 *         count/exclusivity/position
 *    Rules 1-3 are symbol-level and transitive: a manifest file is flagged
 *    if it — or any file reachable through its import graph — both imports
 *    and calls a hazard symbol (rule 3 additionally requires evidence the
 *    call targets a shared pool user: a `TestUser.` / `TestUserManager.users`
 *    reference in the same file). Rules 4-5 are a direct content scan of the
 *    manifest file's own source, since they describe how the *file itself*
 *    shapes its assertions, not a transitively-inherited hazard.
 *
 * New spec files are safe by construction: they can only ever land in the
 * complement (the serial lane), never in the reviewed manifest.
 *
 * Fails closed: any hazard-rule symbol whose defining export can no longer
 * be found under `lib/src` or `server-api/src` aborts the guard rather than
 * silently treating a renamed/removed hazard as absent.
 *
 * Usage: `tsx ./src/scripts/validate-parallel-lanes.ts [--emit-lanes <path>] [--root <server-api-dir>]`
 * `--root` overrides the server-api root the guard operates against — used
 * only by the fixture self-tests (validate-parallel-lanes.test.mjs) to point
 * the guard at a throwaway mini-tree instead of the real repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/scripts -> server-api (the real repo's default root; overridable via --root)
const DEFAULT_SERVER_API_ROOT = path.resolve(__dirname, '..', '..');

interface Context {
  serverApiRoot: string;
  repoRoot: string;
  serverApiSrc: string;
  libSrc: string;
  allRepoTsFiles: string[];
}

// ── Hazard rule data ────────────────────────────────────────────────────────
// Every symbol here MUST resolve to a real export under lib/src or
// server-api/src (checked by assertHazardSymbolsResolve below) — a renamed or
// deleted hazard entry point fails the guard rather than silently vanishing
// from the taxonomy.

interface HazardRule {
  id: 1 | 2 | 3;
  name: string;
  symbols: string[];
  /**
   * Extra per-file evidence required alongside "imports and calls a hazard
   * symbol" before the rule fires. Rule 3 only: settings/profile mutation is
   * hazardous when it targets a shared pool user, not a file-local one.
   */
  requiresSharedUserEvidence?: boolean;
}

const HAZARD_RULES: HazardRule[] = [
  {
    id: 1,
    name: 'shared-mailbox access',
    symbols: ['deleteMailSlurperMails', 'getMailsData', 'getMails'],
  },
  {
    id: 2,
    name: 'platform-role mutation on shared users',
    symbols: ['assignPlatformRole', 'removePlatformRole'],
  },
  {
    id: 3,
    name: 'shared-user settings/profile mutation',
    // `updateUserSettingsWithPush` is the push-notifications area's own
    // wrapper around the same `updateUserSettings` mutation (it builds the
    // GraphQL query string itself rather than calling the JS symbol) —
    // reviewed in and included here so the rule still catches it.
    symbols: ['updateUserSettings', 'updateUser', 'updateUserSettingsWithPush'],
    requiresSharedUserEvidence: true,
  },
];

const SHARED_USER_EVIDENCE_RE = /\bTestUser\.|\bTestUserManager\.users\b/;

interface ContentRule {
  id: 4 | 5;
  name: string;
  pattern: RegExp;
}

const CONTENT_RULES: ContentRule[] = [
  {
    id: 4,
    name: 'unscoped global list/count/positional assertions',
    pattern: /usersPaginated|organizationsPaginated|adminSearchIngestFromScratch/,
  },
  {
    id: 5,
    name: 'global aggregate keyed on a shared identity, asserted by count/exclusivity/position',
    // `myPushSubscriptions` reads/asserts a shared pool user's (GLOBAL_ADMIN)
    // own subscription collection by exact count/emptiness — the same
    // shared-identity-aggregate shape as `communityApplications` et al.
    pattern: /communityApplications|communityInvitations|rolesUser\.|myMemberships|myPushSubscriptions/,
  },
];

interface Exemption {
  file: string;
  ruleId: 4 | 5;
  justification: string;
}

// Reviewed, in-code waivers for content-rule matches that are actually safe.
// Each entry is a deliberate, justified exception — not a blanket suppression.
const EXEMPTIONS: Exemption[] = [
  {
    file: 'src/functional-api/roleset/user/user2.it-spec.ts',
    ruleId: 5,
    justification:
      'rolesUser reads here are always narrowed with .find(...)/array-scoped ' +
      "lookups keyed on this file's own uniquely-generated space nameIDs — " +
      'never a raw count/exclusivity/position assertion over the shared ' +
      "identity's whole aggregate.",
  },
];

// ── Small filesystem / parsing helpers ──────────────────────────────────────

function walkDir(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  const out: string[] = [];
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

/** Nightly-glob base dirs: strip the trailing `/**\/*.it-spec.ts` segment. */
function globToBaseDir(glob: string): string {
  return glob.replace(/\/\*\*\/\*\.it-spec\.ts$/, '');
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function buildContext(serverApiRoot: string): Context {
  const repoRoot = path.resolve(serverApiRoot, '..');
  const serverApiSrc = path.join(serverApiRoot, 'src');
  const libSrc = path.join(repoRoot, 'lib', 'src');
  const allRepoTsFiles = [...walkDir(serverApiSrc), ...walkDir(libSrc)]
    .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    // Exclude stray/legacy duplicate files that aren't part of the real
    // module graph (nothing imports a path containing a space).
    .filter(f => !path.basename(f).includes(' '));
  return { serverApiRoot, repoRoot, serverApiSrc, libSrc, allRepoTsFiles };
}

/** Nightly files as server-api-relative posix paths, e.g. `src/functional-api/account/x.it-spec.ts`. */
function enumerateNightlyFiles(ctx: Context, nightlyInclude: readonly string[]): string[] {
  const files: string[] = [];
  for (const glob of nightlyInclude) {
    const baseDir = path.join(ctx.serverApiRoot, globToBaseDir(glob));
    for (const abs of walkDir(baseDir)) {
      if (abs.endsWith('.it-spec.ts')) {
        files.push(toPosix(path.relative(ctx.serverApiRoot, abs)));
      }
    }
  }
  return files;
}

function readFileSafe(absPath: string): string | undefined {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch {
    return undefined;
  }
}

interface ImportEdge {
  /** The imported names as written at the import site (pre-alias). */
  names: string[];
  /** True for `import * as ns from '...'` — treated as importing every name. */
  isNamespace: boolean;
  specifier: string;
}

/**
 * Regex-based import/re-export parser. Deliberately not a full TS parser —
 * this codebase's import style (named/default/namespace imports, `export *
 * from`/`export {...} from` re-exports) is simple and consistent enough that
 * a dependency-free regex pass is sufficient.
 */
function parseImportEdges(source: string): ImportEdge[] {
  const edges: ImportEdge[] = [];

  const namedOrDefaultRe =
    /import\s+(?:type\s+)?([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = namedOrDefaultRe.exec(source))) {
    const clause = m[1].trim();
    const specifier = m[2];
    edges.push(...parseClause(clause, specifier));
  }

  const exportFromRe =
    /export\s+(?:type\s+)?(\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = exportFromRe.exec(source))) {
    const clause = m[1].trim();
    const specifier = m[2];
    if (clause === '*') {
      edges.push({ names: [], isNamespace: true, specifier });
    } else {
      edges.push(...parseClause(clause, specifier));
    }
  }

  return edges;
}

function parseClause(clause: string, specifier: string): ImportEdge[] {
  const nsMatch = clause.match(/^\*\s+as\s+\w+$/);
  if (nsMatch) {
    return [{ names: [], isNamespace: true, specifier }];
  }

  const names: string[] = [];
  const braceMatch = clause.match(/\{([^}]*)\}/);
  if (braceMatch) {
    for (const part of braceMatch[1].split(',')) {
      const trimmed = part.replace(/^type\s+/, '').trim();
      if (!trimmed) continue;
      // `Original as Local` — the ORIGINAL (exported) name is what we key
      // hazard-symbol matching on, not the local alias.
      const original = trimmed.split(/\s+as\s+/)[0].trim();
      if (original) names.push(original);
    }
  }
  // A leading default-import identifier before `, {...}` or alone. Default
  // imports are never how this codebase's request-param helpers are consumed
  // (everything is named-exported), so we don't need to resolve what the
  // default name maps to for hazard purposes — skip it.

  return [{ names, isNamespace: false, specifier }];
}

// ── Module resolution (aliases per package, relative paths, extension probing) ──

function serverApiAliases(ctx: Context): Record<string, string> {
  return {
    '@generated/': path.join(ctx.serverApiSrc, 'core', 'generated') + '/',
    '@utils/': path.join(ctx.serverApiSrc, 'utils') + '/',
    '@common/': path.join(ctx.serverApiSrc, 'common') + '/',
    '@functional-api/': path.join(ctx.serverApiSrc, 'functional-api') + '/',
    '@src/': ctx.serverApiSrc + '/',
  };
}

function libAliases(ctx: Context): Record<string, string> {
  return {
    '@src/': ctx.libSrc + '/',
    '@common/': path.join(ctx.libSrc, 'common') + '/',
  };
}

function candidateFiles(basePathNoExt: string): string[] {
  return [
    basePathNoExt,
    `${basePathNoExt}.ts`,
    `${basePathNoExt}.tsx`,
    path.join(basePathNoExt, 'index.ts'),
    path.join(basePathNoExt, 'index.tsx'),
  ];
}

function resolveExisting(basePathNoExt: string): string | undefined {
  for (const candidate of candidateFiles(basePathNoExt)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return undefined;
}

/** Resolves an import specifier from `fromAbsPath` to an absolute file path, or undefined if external/unresolvable. */
function resolveSpecifier(
  ctx: Context,
  fromAbsPath: string,
  specifier: string
): string | undefined {
  if (specifier.startsWith('.')) {
    return resolveExisting(
      path.resolve(path.dirname(fromAbsPath), specifier)
    );
  }

  if (specifier === '@alkemio/tests-lib') {
    return resolveExisting(path.join(ctx.libSrc, 'index'));
  }
  if (specifier.startsWith('@alkemio/tests-lib/')) {
    return resolveExisting(
      path.join(ctx.libSrc, specifier.slice('@alkemio/tests-lib/'.length))
    );
  }

  const inLib = fromAbsPath.startsWith(ctx.libSrc + path.sep);
  const aliases = inLib ? libAliases(ctx) : serverApiAliases(ctx);
  for (const [prefix, target] of Object.entries(aliases)) {
    if (specifier.startsWith(prefix)) {
      return resolveExisting(target + specifier.slice(prefix.length));
    }
  }

  // Bare specifier not matching any known alias — external package (vitest,
  // axios, node builtins, ...). Not part of the repo's hazard graph.
  return undefined;
}

// ── Hazard symbol resolution (fail-closed staleness check) ─────────────────

function symbolExportExists(ctx: Context, symbol: string): boolean {
  const exportConstRe = new RegExp(
    `export\\s+(?:const|function|async function|class)\\s+${symbol}\\b`
  );
  const exportListRe = new RegExp(`export\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}`);
  return ctx.allRepoTsFiles.some(f => {
    const text = readFileSafe(f);
    if (!text) return false;
    return exportConstRe.test(text) || exportListRe.test(text);
  });
}

function assertHazardSymbolsResolve(ctx: Context): string[] {
  const stale: string[] = [];
  for (const rule of HAZARD_RULES) {
    for (const symbol of rule.symbols) {
      if (!symbolExportExists(ctx, symbol)) {
        stale.push(`rule ${rule.id} (${rule.name}): "${symbol}"`);
      }
    }
  }
  return stale;
}

// ── Transitive hazard taint — name-scoped, not file-reachability ───────────
//
// A naive "BFS over every import edge, flag if anything reachable is a
// hazard user" is unsound in this codebase: `@alkemio/tests-lib` resolves to
// one barrel (`lib/src/index.ts`) that `export *`s ~30 unrelated modules, so
// virtually every nightly file transitively "reaches" every lib helper —
// including ones it never actually calls. Flagging on reachability alone
// would make nearly every manifest file a false positive.
//
// Instead, taint is tracked per EXPORTED DECLARATION (file + name), and only
// propagates along a real call+import edge: helper H is tainted for rule R
// if H's own body calls (and imports) a hazard symbol, or calls (and
// imports) another declaration that is itself tainted for rule R. A test
// file is flagged only if it itself directly calls+imports a hazard symbol,
// or calls+imports a helper declaration proven tainted this way — i.e. the
// two-hop chain the guard must catch is real name-level taint, not
// mere file adjacency.

interface HazardViolation {
  file: string;
  ruleId: number;
  ruleName: string;
  symbol: string;
  /** Hop path from the manifest file down to the file making the direct hazard call. */
  path: string[];
}

interface Tainted {
  ruleId: number;
  ruleName: string;
  symbol: string;
  /** Files from (but excluding) the tainted declaration's own file down to the direct-call site. */
  chain: string[];
}

function fileCallsHazardSymbol(text: string, symbol: string): boolean {
  return new RegExp(`\\b${symbol}\\s*\\(`).test(text);
}

/** Named (non-namespace) import of `symbol`, by its ORIGINAL exported name. */
function fileImportsName(edges: ImportEdge[], symbol: string): boolean {
  return edges.some(e => !e.isNamespace && e.names.includes(symbol));
}

/** Every top-level `export const NAME = ...` / `export (async )function NAME` declaration, with its source span as `body`. */
function extractExportedDeclarations(
  text: string
): { name: string; body: string }[] {
  const declRe = /export\s+(?:async\s+)?(?:const|function)\s+(\w+)/g;
  const matches: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(text))) {
    matches.push({ name: m[1], index: m.index });
  }
  return matches.map((match, i) => ({
    name: match.name,
    body: text.slice(
      match.index,
      i + 1 < matches.length ? matches[i + 1].index : text.length
    ),
  }));
}

/** Bare `identifier(` call sites — cheap over-approximation; only acted on when the name is also an imported binding. */
function extractCalledNames(text: string): string[] {
  const names = new Set<string>();
  const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(text))) names.add(m[1]);
  return [...names];
}

/**
 * Resolves where `name` is actually exported from, starting at `specifier`
 * as seen from `fromAbsFile` — following `export * from` / `export {name}
 * from` re-export chains (e.g. through the `@alkemio/tests-lib` barrel)
 * until a file that directly declares/exports `name` is found.
 */
function resolveNameToDefiningFile(
  ctx: Context,
  name: string,
  fromAbsFile: string,
  specifier: string,
  visited: Set<string> = new Set()
): string | undefined {
  const resolvedFile = resolveSpecifier(ctx, fromAbsFile, specifier);
  if (!resolvedFile || visited.has(resolvedFile)) return undefined;
  visited.add(resolvedFile);
  const text = readFileSafe(resolvedFile);
  if (!text) return undefined;

  const directDeclRe = new RegExp(
    `export\\s+(?:async\\s+)?(?:const|function|class)\\s+${name}\\b`
  );
  const directListRe = new RegExp(
    `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}(?!\\s*from)`
  );
  if (directDeclRe.test(text) || directListRe.test(text)) return resolvedFile;

  for (const edge of parseImportEdges(text)) {
    if (edge.isNamespace || edge.names.includes(name)) {
      const found = resolveNameToDefiningFile(
        ctx,
        name,
        resolvedFile,
        edge.specifier,
        visited
      );
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Fixed-point taint pass over every non-test declaration in the repo:
 * root taint (direct call+import of a hazard symbol) seeds the map, then
 * calls to other tainted, imported declarations propagate it outward.
 * Bounded to a handful of passes — this codebase's helper chains are shallow
 * (the fixture proof is a two-hop chain; production helpers are 1-2 hops).
 */
function computeHelperTaint(
  ctx: Context
): Map<string, Map<string, Tainted[]>> {
  const taint = new Map<string, Map<string, Tainted[]>>();
  const relOf = (f: string) => toPosix(path.relative(ctx.serverApiRoot, f));

  const helperFiles = ctx.allRepoTsFiles.filter(f => !f.endsWith('.it-spec.ts'));
  const fileData = new Map<
    string,
    { edges: ImportEdge[]; decls: { name: string; body: string }[] }
  >();
  for (const f of helperFiles) {
    const text = readFileSafe(f);
    if (!text) continue;
    fileData.set(f, {
      edges: parseImportEdges(text),
      decls: extractExportedDeclarations(text),
    });
  }

  // Seed: declarations that directly call+import a hazard symbol.
  for (const [file, data] of fileData) {
    for (const decl of data.decls) {
      const hits: Tainted[] = [];
      for (const rule of HAZARD_RULES) {
        for (const symbol of rule.symbols) {
          if (!fileCallsHazardSymbol(decl.body, symbol)) continue;
          if (!fileImportsName(data.edges, symbol)) continue;
          if (
            rule.requiresSharedUserEvidence &&
            !SHARED_USER_EVIDENCE_RE.test(decl.body)
          ) {
            continue;
          }
          hits.push({ ruleId: rule.id, ruleName: rule.name, symbol, chain: [] });
        }
      }
      if (hits.length > 0) {
        if (!taint.has(file)) taint.set(file, new Map());
        taint.get(file)!.set(decl.name, hits);
      }
    }
  }

  // Propagate through call+import edges to a fixed point (bounded passes).
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const [file, data] of fileData) {
      for (const decl of data.decls) {
        const calledNames = extractCalledNames(decl.body);
        for (const called of calledNames) {
          const edge = data.edges.find(
            e => !e.isNamespace && e.names.includes(called)
          );
          if (!edge) continue;
          const resolvedFile = resolveNameToDefiningFile(
            ctx,
            called,
            file,
            edge.specifier
          );
          if (!resolvedFile) continue;
          const targetHits = taint.get(resolvedFile)?.get(called);
          if (!targetHits || targetHits.length === 0) continue;

          if (!taint.has(file)) taint.set(file, new Map());
          const existing = taint.get(file)!.get(decl.name) ?? [];
          for (const hit of targetHits) {
            const already = existing.some(
              e => e.ruleId === hit.ruleId && e.symbol === hit.symbol
            );
            if (already) continue;
            existing.push({
              ruleId: hit.ruleId,
              ruleName: hit.ruleName,
              symbol: hit.symbol,
              chain: [relOf(resolvedFile), ...hit.chain],
            });
            changed = true;
          }
          taint.get(file)!.set(decl.name, existing);
        }
      }
    }
    if (!changed) break;
  }

  return taint;
}

/**
 * Checks one manifest (test) file for hazard violations: direct root taint
 * in the file itself, plus transitive taint reached by calling an imported,
 * tainted helper declaration (per `computeHelperTaint`).
 */
function findHazardViolations(
  ctx: Context,
  startAbsPath: string,
  helperTaint: Map<string, Map<string, Tainted[]>>
): HazardViolation[] {
  const text = readFileSafe(startAbsPath);
  if (!text) return [];
  const edges = parseImportEdges(text);
  const relStart = toPosix(path.relative(ctx.serverApiRoot, startAbsPath));
  const violations: HazardViolation[] = [];
  const seenKeys = new Set<string>();

  const record = (
    ruleId: number,
    ruleName: string,
    symbol: string,
    chain: string[]
  ) => {
    const key = `${ruleId}:${symbol}:${chain.join('>')}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    violations.push({
      file: relStart,
      ruleId,
      ruleName,
      symbol,
      path: [relStart, ...chain],
    });
  };

  for (const rule of HAZARD_RULES) {
    for (const symbol of rule.symbols) {
      if (!fileCallsHazardSymbol(text, symbol)) continue;
      if (!fileImportsName(edges, symbol)) continue;
      if (rule.requiresSharedUserEvidence && !SHARED_USER_EVIDENCE_RE.test(text)) {
        continue;
      }
      record(rule.id, rule.name, symbol, []);
    }
  }

  for (const called of extractCalledNames(text)) {
    const edge = edges.find(e => !e.isNamespace && e.names.includes(called));
    if (!edge) continue;
    const resolvedFile = resolveNameToDefiningFile(
      ctx,
      called,
      startAbsPath,
      edge.specifier
    );
    if (!resolvedFile) continue;
    const hits = helperTaint.get(resolvedFile)?.get(called);
    if (!hits) continue;
    for (const hit of hits) {
      record(hit.ruleId, hit.ruleName, hit.symbol, [
        toPosix(path.relative(ctx.serverApiRoot, resolvedFile)),
        ...hit.chain,
      ]);
    }
  }

  return violations;
}

// ── Content-rule (4/5) scan — the manifest file's own source only ──────────

function findContentViolations(
  relFile: string,
  text: string
): { rule: ContentRule; exempted: boolean }[] {
  const found: { rule: ContentRule; exempted: boolean }[] = [];
  for (const rule of CONTENT_RULES) {
    if (!rule.pattern.test(text)) continue;
    const exempted = EXEMPTIONS.some(
      e => e.file === relFile && e.ruleId === rule.id
    );
    found.push({ rule, exempted });
  }
  return found;
}

// ── retry:0 source-level check on the two lane project blocks ──────────────

/** Splits text at top-level commas — a small bracket/string-aware tokenizer. */
function splitTopLevel(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let inString: string | null = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inString) {
      current += ch;
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      current += ch;
      continue;
    }
    if ('{[('.includes(ch)) {
      depth++;
      current += ch;
      continue;
    }
    if ('}])'.includes(ch)) {
      depth--;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function assertNoNonzeroRetryInLaneProjects(ctx: Context): string[] {
  const configPath = path.join(ctx.serverApiRoot, 'vitest.config.ts');
  const text = readFileSafe(configPath);
  if (!text) return [`could not read ${configPath}`];

  const projectsStart = text.indexOf('projects: [');
  if (projectsStart === -1) return ['vitest.config.ts: no `projects:` array found'];
  const arrayStart = text.indexOf('[', projectsStart);
  // Find the matching closing bracket for the projects array.
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return ['vitest.config.ts: unterminated `projects:` array'];

  const inner = text.slice(arrayStart + 1, arrayEnd);
  const items = splitTopLevel(inner);
  const problems: string[] = [];
  for (const laneName of ['nightly-parallel', 'nightly-serial']) {
    const item = items.find(i => i.includes(`name: '${laneName}'`));
    if (!item) {
      problems.push(`vitest.config.ts: project "${laneName}" not found`);
      continue;
    }
    const retryMatch = item.match(/retry\s*:\s*(-?\d+)/);
    if (retryMatch && Number(retryMatch[1]) !== 0) {
      problems.push(
        `vitest.config.ts: project "${laneName}" configures retry: ${retryMatch[1]} (must stay 0)`
      );
    }
  }
  return problems;
}

// ── Main ─────────────────────────────────────────────────────────────────

interface AuditResult {
  ok: boolean;
  errors: string[];
  nightlyCount: number;
  parallelCount: number;
  serialFiles: string[];
}

function runAudit(
  ctx: Context,
  nightlyInclude: readonly string[],
  parallelManifest: readonly string[]
): AuditResult {
  const errors: string[] = [];

  const staleSymbols = assertHazardSymbolsResolve(ctx);
  for (const s of staleSymbols) {
    errors.push(`stale hazard symbol — ${s} no longer resolves to an export`);
  }

  const nightlyFiles = enumerateNightlyFiles(ctx, nightlyInclude);
  const nightlySet = new Set(nightlyFiles);

  const manifestSeen = new Set<string>();
  for (const entry of parallelManifest) {
    if (manifestSeen.has(entry)) {
      errors.push(`PARALLEL_MANIFEST: duplicate entry "${entry}"`);
    }
    manifestSeen.add(entry);
    if (!fs.existsSync(path.join(ctx.serverApiRoot, entry))) {
      errors.push(`PARALLEL_MANIFEST: "${entry}" does not exist on disk`);
    }
    if (!nightlySet.has(entry)) {
      errors.push(
        `PARALLEL_MANIFEST: "${entry}" does not match any nightly glob`
      );
    }
  }

  const manifestSet = new Set(parallelManifest);
  const serialFiles = nightlyFiles.filter(f => !manifestSet.has(f)).sort();

  if (nightlyFiles.length !== manifestSet.size + serialFiles.length) {
    errors.push(
      `partition mismatch: nightly=${nightlyFiles.length} parallel=${manifestSet.size} serial=${serialFiles.length}`
    );
  }
  if (serialFiles.length === 0) {
    errors.push('serial lane is empty — the serial lane must never be empty');
  }

  errors.push(...assertNoNonzeroRetryInLaneProjects(ctx));

  // Hazard soundness — only manifest (promoted) files are checked; the
  // complement is safe by construction (default-serial).
  const helperTaint = computeHelperTaint(ctx);
  for (const relEntry of parallelManifest) {
    if (!nightlySet.has(relEntry)) continue; // already reported above
    const absEntry = path.join(ctx.serverApiRoot, relEntry);
    const text = readFileSafe(absEntry);
    if (!text) continue;

    for (const violation of findHazardViolations(ctx, absEntry, helperTaint)) {
      errors.push(
        `PARALLEL_MANIFEST: "${relEntry}" trips rule ${violation.ruleId} ` +
          `(${violation.ruleName}) via "${violation.symbol}" — hop path: ` +
          violation.path.join(' -> ')
      );
    }

    for (const { rule, exempted } of findContentViolations(relEntry, text)) {
      if (exempted) continue;
      errors.push(
        `PARALLEL_MANIFEST: "${relEntry}" trips rule ${rule.id} (${rule.name})`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    nightlyCount: nightlyFiles.length,
    parallelCount: manifestSet.size,
    serialFiles,
  };
}

function parseArgs(argv: string[]): { emitLanes?: string; root?: string } {
  const out: { emitLanes?: string; root?: string } = {};
  const emitIdx = argv.indexOf('--emit-lanes');
  if (emitIdx !== -1) out.emitLanes = argv[emitIdx + 1];
  const rootIdx = argv.indexOf('--root');
  if (rootIdx !== -1) out.root = argv[rootIdx + 1];
  return out;
}

async function main() {
  const { emitLanes, root } = parseArgs(process.argv.slice(2));
  const serverApiRoot = root
    ? path.resolve(process.cwd(), root)
    : DEFAULT_SERVER_API_ROOT;
  const ctx = buildContext(serverApiRoot);

  const lanesModuleUrl = pathToFileURL(
    path.join(serverApiRoot, 'src', 'scripts', 'nightly-lanes.ts')
  ).href;
  const { NIGHTLY_INCLUDE, PARALLEL_MANIFEST } = (await import(
    lanesModuleUrl
  )) as {
    NIGHTLY_INCLUDE: readonly string[];
    PARALLEL_MANIFEST: readonly string[];
  };

  const audit = runAudit(ctx, NIGHTLY_INCLUDE, PARALLEL_MANIFEST);

  console.log('[lanes:validate] nightly lane audit');
  console.log(`  nightly total:  ${audit.nightlyCount}`);
  console.log(`  parallel lane:  ${audit.parallelCount}`);
  console.log(`  serial lane:    ${audit.serialFiles.length}`);
  console.log('  derived serial files:');
  for (const f of audit.serialFiles) console.log(`    - ${f}`);

  if (emitLanes) {
    const outPath = path.resolve(process.cwd(), emitLanes);
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        { parallel: [...PARALLEL_MANIFEST].sort(), serial: audit.serialFiles },
        null,
        2
      ) + '\n'
    );
    console.log(`  lanes.json written to ${outPath}`);
  }

  if (!audit.ok) {
    console.error('\n[lanes:validate] FAILED:');
    for (const e of audit.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('\n[lanes:validate] OK — partition proven, no hazard-rule violations.');
}

main().catch(err => {
  console.error('[lanes:validate] guard crashed:', err);
  process.exit(1);
});
