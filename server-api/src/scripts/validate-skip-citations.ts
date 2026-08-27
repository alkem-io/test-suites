/**
 * Skip-citation guard — proves every unconditional skip in the nightly
 * functional-api suite is accountable to a bug or issue.
 *
 * The rule: `test.skip(...)` / `it.skip(...)` / `describe.skip(...)` (and
 * their `.each` and Jest-compat `xit`/`xdescribe` forms) must carry a bug or
 * issue citation within a few lines above the skip — a `#NNNN` issue
 * number, a URL (zenhub/github/jira/...), or the word `BUG` followed by a
 * description. The check is permissive about phrasing and strict about
 * presence: the point is accountability, not a citation format. A skip with
 * no nearby citation is the last remaining way to park a test invisibly,
 * which is how coverage erodes without anyone noticing.
 *
 * Scope — what counts as an unconditional skip:
 *   - `test.skip(`, `it.skip(`, `describe.skip(`, and their `.each` variant
 *     (a template-literal-driven skip is still unconditionally skipped for
 *     every row).
 *   - `xit(` / `xdescribe(` — Jest-compat aliases for the same thing, not
 *     currently used in this suite but scanned for so a future reintroduction
 *     doesn't silently bypass the guard.
 *   - `.todo(` (`test.todo`/`it.todo`) is scanned and reported for
 *     visibility, but NOT required to carry a citation. A `.todo` declares a
 *     test that has never been written yet — a forward-looking placeholder,
 *     not a test that used to run and was disabled because something broke.
 *     The operator's rule ("skipped because of a bug") describes the second
 *     shape, not the first; requiring every `.todo` to already have a bug
 *     filed against code that doesn't exist yet would be accountability
 *     theater. If a `.todo` is later fleshed out into a real `test(...)`
 *     that still needs disabling, it becomes a `.skip` and falls under the
 *     rule at that point.
 *   - `.skipIf(...)` (and any other conditional predicate) is explicitly
 *     OUT OF SCOPE and never collected — it is deliberate, visible
 *     environment behaviour carrying its own condition as documentation
 *     (e.g. `test.skipIf(isCI)(...)`), not a test parked invisibly. Runtime
 *     `ctx.skip(...)` calls inside a test body (data-driven skip, e.g. "no
 *     eligible languages configured") are the same shape and are likewise
 *     never matched — the regex only fires on `test`/`it`/`describe`/`x*`
 *     receivers, never on a `ctx`/ad-hoc-identifier receiver.
 *   - A `test.skip(`/`describe.skip(` occurrence inside a `//`-commented-out
 *     line is dead code, not a live skip, and is ignored.
 *
 * Two fail-closed checks, both errors, both actionable:
 *
 *   1. New/undocumented skip: any live unconditional skip with no citation
 *      in its window AND no matching `UNDOCUMENTED_SKIPS` allowlist entry
 *      fails the guard, naming the file, line, and test/describe title.
 *
 *   2. Stale allowlist entry: any `UNDOCUMENTED_SKIPS` entry that no longer
 *      matches a live undocumented skip fails the guard too — the same
 *      discipline as `NIGHTLY_EXCLUDE`'s stale-entry rule in
 *      validate-parallel-lanes.ts. This is what makes the list a *closed,
 *      shrinking* ledger rather than a place things get archived forever:
 *      once a grandfathered skip is documented, deleted, or renamed, its
 *      entry must be removed in the same change, and the guard enforces
 *      that rather than trusting it to happen.
 *
 * Allowlist keying: `file + kind + title`, NOT line number. Line numbers
 * shift on every unrelated edit to a file (a new test added above, an
 * import reordered); keying on them would make the allowlist flake against
 * changes that have nothing to do with the skip it's tracking. The test
 * title (the skip call's own first string-literal argument) is stable
 * across those edits and unique enough in practice — verified by hand
 * against every grandfathered entry below, several of which share a title
 * across different files (the three activity-logs suites) and are
 * disambiguated by `file` alone. `kind` guards the (currently theoretical)
 * case where a `describe` and a `test` in the same file share a title.
 *
 * New skips are NOT allowed onto the allowlist going forward — it is
 * closed, seeded once from the pre-existing undocumented skips found when
 * this guard was introduced, and is expected to only shrink as those are
 * documented or removed. A brand-new undocumented skip must fail loudly,
 * not be waved through by adding a line here.
 *
 * The allowlist itself lives in `skip-citation-allowlist.ts`, next to this
 * file, and is loaded by dynamic import from `<root>/src/scripts/` — the
 * same split `validate-parallel-lanes.ts` uses for `nightly-lanes.ts` — so
 * a fixture tree can supply its own allowlist via `--root` without this
 * guard's own logic ever changing.
 *
 * Usage: `tsx ./src/scripts/validate-skip-citations.ts [--root <server-api-dir>]`
 * `--root` overrides the server-api root the guard operates against — used
 * only by the fixture self-tests (validate-skip-citations.test.mjs) to
 * point the guard at a throwaway mini-tree instead of the real repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UndocumentedSkipEntry } from './skip-citation-allowlist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/scripts -> server-api (the real repo's default root; overridable via --root)
const DEFAULT_SERVER_API_ROOT = path.resolve(__dirname, '..', '..');

const FUNCTIONAL_API_DIR = path.join('src', 'functional-api');

// How many lines above (and including) the skip call itself are searched
// for a citation. Generous enough to cover a multi-line explanatory comment
// block, small enough that it can't accidentally credit a citation left
// over an unrelated, earlier skip.
const CITATION_WINDOW = 6;

// A `#NNNN` issue number, a URL (zenhub/github/jira/...), or the word BUG —
// deliberately permissive about phrasing, strict only about presence. Every
// citation style already in use in this repo (see module docstring) matches
// this. `BUG` is matched case-SENSITIVELY, deliberately: it is the marker
// this repo actually writes ("BUG: [Conversation] ..."), and case-insensitive
// matching turns out to false-positive on ordinary prose — a test titled
// "...nobody filed a bug for" contains the word "bug" without citing
// anything, and very nearly slipped through this guard's own self-tests
// for exactly that reason before this was tightened.
const CITATION_RE = /#\d+|https?:\/\/\S+|\bBUG\b/;

// Unconditional skip declarations this guard holds accountable.
// Captures the receiver (test/it/describe) and whether it's the `.each`
// form — matched either as a plain call (`.each([...])(`) or, the only shape
// actually in use in this repo today, a tagged template
// (`` .each`table` ``, opening with a backtick instead of a paren; see
// search.it-spec.ts's `test.skip.each` for the real example). Deliberately
// does NOT match `.skipIf(` (conditional) or a non-test/it/describe/x*
// receiver (e.g. `ctx.skip(...)`, a runtime, data-driven skip call inside a
// test body) — see module docstring.
const SKIP_CALL_RE = /\b(test|it|describe)\.skip(\.each)?[(`]/;
const X_ALIAS_RE = /\bx(it|describe)\(/;

// `.todo(` is scanned for visibility only — never required to carry a
// citation. See module docstring for why.
const TODO_RE = /\b(?:test|it)\.todo\(/;

// ── Filesystem helpers ──────────────────────────────────────────────────────

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

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function isCommentedOut(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Best-effort title extraction: the first quoted (single/double/backtick)
 * string literal found starting from the skip call's own line, looking
 * ahead a few lines to cover a wrapped call. Good enough for a stable
 * allowlist key — it doesn't need to be a perfect JS/TS parse, just
 * reproducible for the same source.
 */
function extractTitle(lines: string[], startIdx: number): string {
  const end = Math.min(lines.length, startIdx + 5);
  for (let i = startIdx; i < end; i++) {
    const m = lines[i].match(/(['"`])((?:(?!\1).)*)\1/);
    if (m) return m[2].trim();
  }
  return '(untitled)';
}

// ── Skip scanning ────────────────────────────────────────────────────────

interface SkipSite {
  file: string; // server-api-relative posix path
  line: number; // 1-based
  kind: string;
  title: string;
  documented: boolean;
}

interface ScanResult {
  skipSites: SkipSite[];
  todoCount: number;
}

function scanFile(absFile: string, serverApiRoot: string): ScanResult {
  const relFile = toPosix(path.relative(serverApiRoot, absFile));
  const text = fs.readFileSync(absFile, 'utf8');
  const lines = text.split('\n');
  const skipSites: SkipSite[] = [];
  let todoCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentedOut(line)) continue;

    if (TODO_RE.test(line)) {
      todoCount++;
      continue;
    }

    const m = SKIP_CALL_RE.exec(line);
    const xm = m ? null : X_ALIAS_RE.exec(line);
    if (!m && !xm) continue;

    const kind = m ? `${m[1]}.skip${m[2] ? '.each' : ''}` : `x${xm![1]}`;
    const windowStart = Math.max(0, i - (CITATION_WINDOW - 1));
    const windowText = lines.slice(windowStart, i + 1).join('\n');
    const documented = CITATION_RE.test(windowText);
    const title = extractTitle(lines, i);

    skipSites.push({ file: relFile, line: i + 1, kind, title, documented });
  }

  return { skipSites, todoCount };
}

// ── Audit ────────────────────────────────────────────────────────────────

interface AuditResult {
  ok: boolean;
  errors: string[];
  totalSkips: number;
  documentedCount: number;
  grandfatheredCount: number;
  todoCount: number;
}

function allowlistKey(entry: { file: string; kind: string; title: string }): string {
  return `${entry.file} ${entry.kind} ${entry.title}`;
}

function runAudit(
  serverApiRoot: string,
  undocumentedSkips: readonly UndocumentedSkipEntry[]
): AuditResult {
  const errors: string[] = [];
  const functionalApiRoot = path.join(serverApiRoot, FUNCTIONAL_API_DIR);
  const files = walkDir(functionalApiRoot).filter(f => f.endsWith('.it-spec.ts'));

  const allSkipSites: SkipSite[] = [];
  let todoCount = 0;
  for (const f of files) {
    const { skipSites, todoCount: fileTodoCount } = scanFile(f, serverApiRoot);
    allSkipSites.push(...skipSites);
    todoCount += fileTodoCount;
  }

  const undocumentedSites = allSkipSites.filter(s => !s.documented);

  // Duplicate allowlist entries are a guard bug, not a repo fact — catch
  // them the same way NIGHTLY_EXCLUDE catches duplicates.
  const seenKeys = new Set<string>();
  for (const entry of undocumentedSkips) {
    const key = allowlistKey(entry);
    if (seenKeys.has(key)) {
      errors.push(
        `UNDOCUMENTED_SKIPS: duplicate entry for "${entry.file}" ${entry.kind} "${entry.title}"`
      );
    }
    seenKeys.add(key);
  }

  const matchedAllowlistKeys = new Set<string>();
  for (const site of undocumentedSites) {
    const key = allowlistKey(site);
    if (seenKeys.has(key)) {
      matchedAllowlistKeys.add(key);
      continue;
    }
    errors.push(
      `${site.file}:${site.line} — ${site.kind}("${site.title}") has no bug/issue citation ` +
        `within ${CITATION_WINDOW} lines above it. ` +
        'Add a comment citing the bug (a "#NNNN" issue number, a zenhub/github/jira URL, or ' +
        '"BUG: <description>") directly above the skip, or remove the skip if it no longer ' +
        'applies. New skips cannot be added to the UNDOCUMENTED_SKIPS allowlist — that list is ' +
        'closed to pre-existing entries only.'
    );
  }

  // Fail-closed staleness: an allowlist entry that no longer matches any
  // live undocumented skip (documented, deleted, or renamed) must be
  // removed from UNDOCUMENTED_SKIPS in the same change.
  for (const entry of undocumentedSkips) {
    const key = allowlistKey(entry);
    if (!matchedAllowlistKeys.has(key)) {
      errors.push(
        `UNDOCUMENTED_SKIPS: entry for "${entry.file}" ${entry.kind} "${entry.title}" ` +
          `(recorded ${entry.recordedOn}) no longer matches any undocumented skip in the tree — ` +
          'the test was documented, deleted, or renamed. Remove this entry.'
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    totalSkips: allSkipSites.length,
    documentedCount: allSkipSites.length - undocumentedSites.length,
    grandfatheredCount: matchedAllowlistKeys.size,
    todoCount,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────

/**
 * `--root` must fail closed. Its only caller is the fixture self-test suite,
 * which points the guard at a synthetic tree; if the flag is passed without a
 * value (or misspelled so `indexOf` lands on the last argument), an
 * unvalidated `argv[rootIdx + 1]` is `undefined` and `main()` silently falls
 * back to `DEFAULT_SERVER_API_ROOT`. The self-test would then audit the REAL
 * repository tree, pass for reasons that have nothing to do with its fixture,
 * and report OK — a guard's self-test proving the wrong thing is worse than
 * one that does not run. Reject the missing value instead.
 */
function parseArgs(argv: string[]): { root?: string } {
  const out: { root?: string } = {};
  const rootIdx = argv.indexOf('--root');
  if (rootIdx !== -1) {
    const value = argv[rootIdx + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(
        '--root requires a directory path (got none). Refusing to fall back to the ' +
          'default server-api root: that would audit the real tree while the caller ' +
          'believes it is auditing the one it named.'
      );
    }
    out.root = value;
  }
  return out;
}

async function main(): Promise<void> {
  const { root } = parseArgs(process.argv.slice(2));
  const serverApiRoot = root ? path.resolve(process.cwd(), root) : DEFAULT_SERVER_API_ROOT;

  const allowlistModuleUrl = pathToFileURL(
    path.join(serverApiRoot, 'src', 'scripts', 'skip-citation-allowlist.ts')
  ).href;
  const allowlistModule = (await import(allowlistModuleUrl)) as {
    UNDOCUMENTED_SKIPS: readonly UndocumentedSkipEntry[];
  };

  const audit = runAudit(serverApiRoot, allowlistModule.UNDOCUMENTED_SKIPS);

  console.log('[skips:validate] skip-citation audit');
  console.log(`  unconditional skips:  ${audit.totalSkips}`);
  console.log(`  documented:           ${audit.documentedCount}`);
  console.log(`  grandfathered:        ${audit.grandfatheredCount}`);
  console.log(`  .todo (not checked):  ${audit.todoCount}`);

  if (!audit.ok) {
    console.error('\n[skips:validate] FAILED:');
    for (const e of audit.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('\n[skips:validate] OK — every unconditional skip is cited or grandfathered.');
}

main().catch(err => {
  console.error('[skips:validate] guard crashed:', err);
  process.exit(1);
});
