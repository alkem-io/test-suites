/**
 * Lane guard — proves the nightly two-lane split is sound.
 *
 * Two independent proofs, both fail-closed:
 *
 * 1. Partition: `PARALLEL_MANIFEST` (src/scripts/nightly-lanes.ts) is a
 *    subset of the nightly file set — NIGHTLY_INCLUDE minus the explicit,
 *    documented `NIGHTLY_EXCLUDE` list — with no duplicates; the serial
 *    lane is exactly its complement within that same excluded-out set; the
 *    serial lane is never empty. An excluded file counts as neither
 *    promoted nor serial, can never also appear in `PARALLEL_MANIFEST`, and
 *    an exclusion entry that matches no file on disk fails the guard
 *    (fail-closed staleness, same discipline as the hazard symbols below).
 *
 * 2. Soundness: no file in `PARALLEL_MANIFEST` trips any of the hazard rule
 *    families —
 *      1. shared-mailbox access
 *      2. unguarded platform-role GRANT on shared users
 *      3. shared-user settings/profile mutation
 *      4. unscoped global list/count/positional assertions
 *      5. global aggregates keyed on a shared identity, asserted by
 *         count/exclusivity/position
 *      6. platform-role REVOCATION/toggle on shared users
 *      7. assertion on a shared user's platform-role state
 *      8. assertion on a shared user's roleSet-membership state
 *      9. roleSet member/lead/admin aggregate asserted straight off a
 *         structural space conversion/move mutation's own response
 *     10. a DDT table asserting a privileged mutation SUCCEEDS for a shared
 *         pool user
 *    Rules 1, 2, 3 and 6 are symbol-level and transitive: a manifest file is
 *    flagged if it — or any file reachable through its import graph — both
 *    imports and calls a hazard symbol (rule 3 additionally requires
 *    evidence the call targets a shared pool user: a `TestUser.` /
 *    `TestUserManager.users` reference in the same file). Rule 2 is further
 *    narrowed to only the UNGUARDED occurrences of a grant call — an
 *    idempotent, already-has-it-guarded grant converges regardless of
 *    concurrent ordering and is not flagged; see the `guardWindowRe`
 *    docstring on `HazardRule` for the source-level proof this is built on.
 *    Rule 6 (revocation) has no such exemption — undoing a role is never
 *    convergent. Rules 4, 5, 7, 8, 9 and 10 are a direct content scan of the
 *    manifest file's own source, since they describe how the *file itself*
 *    shapes its assertions, not a transitively-inherited hazard. Rule 8 is
 *    rule 7's counterpart one layer up the stack: rule 7 catches a shared
 *    user's PLATFORM role state read as ground truth (`.RoleNames`), rule 8
 *    catches the same shared identity's roleSet-level MEMBER state read the
 *    same way (`isUserMemberOfRoleSet` / `getRoleSetUsersInMemberRole`),
 *    both gated on shared-user evidence in the same file. Rules 9 and 10 are
 *    a second empirically-driven pair, same discipline: rule 9 catches a
 *    roleSet's member/lead/admin USER LIST read as ground truth immediately
 *    around a `convertSpace*`/`moveSpace*` structural mutation — the
 *    space-hierarchy service performs its own remove-then-reassign cycle on
 *    that roleSet's role credentials as part of the conversion, and that
 *    cycle's completion is not guaranteed settled by the time a nested
 *    resolver field reads the aggregate back, a window that widens under
 *    concurrent host load; see the `CONTENT_RULES` id-9 docstring for the
 *    server-side evidence. Rule 10 catches the DDT idiom this whole suite
 *    uses to assert a privileged mutation's SUCCESS for a named role
 *    (`${TestUser.X} | ${'"data":{"someMutation"'}`) — the server's
 *    actor-authorization cache is keyed only by actor ID, not by
 *    (actor, resource), so it is invalidated for that ACTOR wholesale
 *    whenever ANY of that shared identity's credentials change anywhere on
 *    the platform; see the id-10 docstring for the source-level evidence
 *    and the honest limits of this pattern's coverage.
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
  id: 1 | 2 | 3 | 6;
  name: string;
  symbols: string[];
  /**
   * Extra per-file evidence required alongside "imports and calls a hazard
   * symbol" before the rule fires. Rule 3 only: settings/profile mutation is
   * hazardous when it targets a shared pool user, not a file-local one.
   */
  requiresSharedUserEvidence?: boolean;
  /**
   * When set, a call to one of this rule's symbols is a hazard ONLY IF that
   * specific call site has no occurrence of `guardWindowRe` within the
   * preceding `guardWindowChars` characters — i.e. it fires per OCCURRENCE,
   * not per file/declaration, and defaults to "hazard" (fail-closed) unless
   * local guard evidence is actually found next to THAT call.
   *
   * This encodes the convergent-setup proof for rule 2: concurrent,
   * identical, idempotent grants converge to the same end state and no
   * file's verdict depends on another file NOT having granted yet — but
   * only when the call site is actually guarded by an already-has-it check.
   * The evidence is real, not assumed: `assignPlatformRole` has exactly ONE
   * call site in the whole repo (`TestScenarioFactory.checkAndAssignRoleNameToUser`,
   * lib/src/scenario/TestScenarioFactory.ts:607), and `.RoleNames.includes(`
   * — the guard idiom below — has exactly ONE occurrence in the whole repo,
   * ~500 characters earlier in that SAME method (line 596). Every OTHER
   * `assignPlatformRole` call site in the repo (8, all in entitlements/
   * spec files and none currently promoted) has no such guard nearby and
   * stays flagged. `removePlatformRole` is deliberately a separate rule (6)
   * with no guard exemption at all: a revocation is never convergent —
   * unlike a monotonic grant, undoing a role can invalidate a concurrent
   * file's assumption regardless of how it's guarded.
   */
  guardWindowRe?: RegExp;
  guardWindowChars?: number;
}

const IDEMPOTENT_GRANT_GUARD_RE = /\.RoleNames\.includes\(/;

const HAZARD_RULES: HazardRule[] = [
  {
    id: 1,
    name: 'shared-mailbox access',
    symbols: ['deleteMailSlurperMails', 'getMailsData', 'getMails'],
  },
  {
    id: 2,
    name: 'unguarded platform-role grant on shared users',
    symbols: ['assignPlatformRole'],
    guardWindowRe: IDEMPOTENT_GRANT_GUARD_RE,
    guardWindowChars: 800,
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
  {
    id: 6,
    name: 'platform-role revocation/toggle on shared users',
    // No `guardWindowRe`: a revocation is never convergent, guarded or not
    // — undoing a role can invalidate a concurrent file's assumption no
    // matter how carefully it's gated. This is the fail-closed safety net:
    // if a future change makes any promoted file transitively reach a
    // revocation/toggle path (even through a class method, a namespace
    // import, or a dynamic `import()` — the same sound taint machinery
    // that catches rule 2/3 catches this too), the guard fails the run
    // instead of silently certifying it clean.
    symbols: ['removePlatformRole'],
  },
];

const SHARED_USER_EVIDENCE_RE = /\bTestUser\.|\bTestUserManager\.users\b/;

interface ContentRule {
  id: 4 | 5 | 7 | 8 | 9 | 10;
  name: string;
  pattern: RegExp;
  requiresSharedUserEvidence?: boolean;
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
    //
    // Case-INSENSITIVE (`i` flag) since the 2026-08-18 nightly run: the
    // repo's own wrapper around the `CommunityApplicationsInvitations`
    // GraphQL operation is named `getCommunityApplicationsInvitations` —
    // capital C — which the previous case-sensitive pattern never matched.
    // `move-L1-to-L2-auto-invite.it-spec.ts` called exactly that wrapper,
    // asserted an exact invitation count over `TestUser.SPACE_ADMIN` /
    // `SPACE_MEMBER` / `SUBSPACE_ADMIN` / `SUBSPACE_MEMBER` overlap with a
    // concurrently-mutable target community, and failed under concurrency
    // (interference, not a pre-existing defect) while passing serially —
    // see server-api/html-report/{results,serial-confirm-raw}.json from
    // that run. Verified against real repo call sites: the same wrapper is
    // also called by move-L1-to-L0-auto-invite.it-spec.ts,
    // move-L2-to-L1-auto-invite.it-spec.ts, convert-L1-to-L0.it-spec.ts,
    // convert-L1-to-L0-with-L2-to-L1.it-spec.ts and convert-L2-to-L1.it-spec.ts
    // — all now caught by the same fix rather than a one-off demotion.
    pattern: /communityApplications|communityInvitations|rolesUser\.|myMemberships|myPushSubscriptions/i,
  },
  {
    id: 7,
    name: "assertion on a shared user's platform-role state",
    // The third hazard shape the convergent-grant proof does NOT cover: a
    // file that reads a shared pool user's role membership as a correctness
    // assertion (an exact set, an absence, a count) rather than as a
    // one-way idempotent setup guard. A concurrent grant elsewhere could
    // flip such an assertion regardless of how sound rule 2's own taint
    // analysis is — this is a content scan, same family as rules 4/5, and
    // shares their limitation (see the docstring on CONTENT_RULES usage in
    // findContentViolations): it is a pattern blocklist, not a structural
    // proof that no other assertion phrasing exists.
    pattern:
      /expect\([^)]*\.RoleNames\b[^)]*\)|\.RoleNames\)\s*\.\s*(?:not\.)?(?:toContain|toHaveLength|toEqual|toBe|toContainEqual)\(/,
    requiresSharedUserEvidence: true,
  },
  {
    id: 8,
    name: "assertion on a shared user's roleSet-membership state",
    // A fourth hazard shape, added from the same 2026-08-18 nightly run:
    // `join-hierarchy-parity.it-spec.ts` asserted (both `true` and `false`)
    // whether `TestUser.NON_SPACE_MEMBER` (`TestUserManager.users.nonSpaceMember`)
    // is a MEMBER of a roleSet, via the `isUserMemberOfRoleSet` /
    // `getRoleSetUsersInMemberRole` helper shape. The roleSet id itself can
    // be file-owned and unique — that part is genuinely scoped — but the
    // SUBJECT of the boolean/list check is a shared pool identity reused by
    // dozens of concurrent files (every other hierarchy-parity sibling uses
    // the identical `TestUser.NON_SPACE_MEMBER` actor), so a concurrent
    // grant or removal targeting that same shared user elsewhere is not
    // excluded by the roleSet id being unique. Confirmed failing under
    // concurrency, passing serially — see
    // server-api/html-report/{results,serial-confirm-raw}.json. Gated on
    // shared-user evidence (same discipline as rule 7) so a file checking
    // membership of its OWN uniquely-created, non-pool contributor is not
    // flagged.
    pattern: /\bisUserMemberOfRoleSet\b|\bgetRoleSetUsersInMemberRole\b/,
    requiresSharedUserEvidence: true,
  },
  {
    id: 9,
    name: 'roleSet member/lead/admin aggregate asserted off a structural conversion/move mutation',
    // A fifth hazard shape, found diagnosing convert-L1-to-L0-basic.it-spec.ts:
    // three of its assertions ("community roleSet members/leads/admins are
    // preserved") compared the roleSet's member/lead/admin USER LISTS from
    // BEFORE the conversion against the SAME lists read off the
    // `convertSpaceL1ToSpaceL0` mutation's own response, and got back an
    // empty array where 2-5 users were expected — while a serial re-run of
    // the identical file passed outright (interference, not a product
    // defect in what the lists eventually settle to).
    //
    // Reading the server's own conversion service
    // (src/services/api/conversion/conversion.service.ts,
    // convertSpaceL1ToSpaceL0OrFail) shows why: the method reads the
    // roleSet's current ADMIN users, explicitly REMOVES each of them from
    // the ADMIN role, performs the rest of the structural move (several
    // awaited steps — nameID allocation, entity field rewrites, a `save`,
    // license-plan assignment), and only THEN re-assigns them back — a
    // real, non-instantaneous window during which this exact roleSet's own
    // role membership is incomplete. Nothing in the test file is wrong by
    // itself; the hazard is that its assertions read the mutation's
    // response (or a field resolved immediately off it) as ground truth
    // for a completion that is not guaranteed to have settled yet, and
    // that window is only wide enough to lose under concurrent host load —
    // which is exactly the failure mode observed (parallel: fails,
    // serial/idle: passes). This is a content scan, same family as rules
    // 4/5/7/8: it does not attempt to prove the mutation call and the
    // aggregate read are the same statement, only that both shapes are
    // present in a file whose scenario is built on shared pool users.
    pattern: /\.roleSet\.(memberUsers|leadUsers|adminUsers)\b/,
    requiresSharedUserEvidence: true,
  },
  {
    id: 10,
    name: 'DDT table asserting a privileged mutation succeeds for a shared pool user',
    // A sixth hazard shape, found diagnosing callouts.it-spec.ts: four
    // assertions ("who intend to update/delete callout", subspace and
    // subsubspace level) expected `TestUser.SUBSPACE_ADMIN` to successfully
    // update/delete a callout in a space where the scenario's OWN
    // beforeAll had granted that exact user the admin role — and got an
    // Authorization error back instead, while a serial re-run of the same
    // file passed outright.
    //
    // Unlike rule 9, nothing in THIS file mutates a roleSet or reads one as
    // an aggregate — the file only acts AS the shared user and checks
    // whether the action was allowed. The most plausible mechanism, from
    // the server's own actor-authorization cache
    // (src/core/actor-context/actor.context.cache.service.ts): the cached
    // ActorContext — the credential list an authorization check actually
    // reads — is keyed ONLY by actorID, not by (actorID, resource), and is
    // invalidated (deleted, forcing a full reload) by
    // ActorService.grantCredentialOrFail/revokeCredential on EVERY
    // credential change for that actor anywhere on the platform. With a
    // small pool of shared identities reused by nearly every nightly file,
    // that cache is under continuous concurrent invalidate/repopulate
    // pressure for these specific actors, which is the shape of a classic
    // delete-then-repopulate race: a repopulating read that started before
    // a concurrent grant/revoke committed can still win the write race and
    // leave the cache holding a stale, pre-grant credential snapshot until
    // the next invalidation.
    //
    // This mechanism is a property of the shared authorization cache, not
    // of anything specific to callouts — so it is NOT scoped to update/
    // delete-callout DDT tables, and this pattern is only a narrow,
    // empirically-grounded proxy for it: the literal
    // `${'"data":{"<mutation>"'}` DDT success-message idiom, matched
    // together with shared-user evidence in the same file. Every other DDT
    // table found using this exact idiom repo-wide was inspected by hand;
    // both files that use it are demoted by this rule. A privilege-success
    // assertion phrased differently (a direct `expect(res.data...)`, a
    // boolean flag, a GraphQL response shape check) is NOT caught by this
    // pattern and is a known, stated gap — see the guard's own module
    // docstring and this feature's diagnosis report for the residual-risk
    // disclosure.
    pattern: /\$\{'"data":\{/,
    requiresSharedUserEvidence: true,
  },
];

interface Exemption {
  file: string;
  ruleId: 4 | 5 | 7 | 8;
  justification: string;
}

// Reviewed, in-code waivers for content-rule matches that are actually safe.
// Each entry is a deliberate, justified exception — not a blanket suppression.
//
// The `user2.it-spec.ts` / rule 5 exemption that used to live here is
// REMOVED, not narrowed: the 2026-08-18 nightly run empirically disproved
// its justification ("rolesUser reads here are always narrowed
// with .find(...)/array-scoped lookups... never a raw count/exclusivity/
// position assertion") — the file failed under concurrency on exactly a
// `rolesUser`-sourced assertion
// (`expect(scenarioSpace?.subspaces).toEqual(expect.arrayContaining(...))`,
// sourced from `TestUserManager.users.nonSpaceMember`'s global `rolesUser`
// aggregate) and passed serially. See
// server-api/html-report/{results,serial-confirm-raw}.json. No replacement
// exemption is warranted — the file now correctly trips rule 5 unexempted.
const EXEMPTIONS: Exemption[] = [];

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

/** One name brought into scope by an import/re-export/dynamic-import edge. */
interface NamedBinding {
  /** The name as exported by the source module (pre-alias). */
  original: string;
  /** The identifier this file actually binds it to — what call sites use. */
  local: string;
}

interface ImportEdge {
  /** Named/default bindings this edge brings in (empty for namespace edges). */
  named: NamedBinding[];
  /** True for `import * as ns from '...'` / `export * from '...'` / a
   * dynamic `const ns = await import(...)` — treated as importing every
   * name the target module exports. */
  isNamespace: boolean;
  /** The local identifier bound to the namespace object — set only when
   * `isNamespace` AND the edge actually binds a local name (a bare
   * `export * from` re-export has none). Call sites reach members through
   * this identifier: `nsLocal.someExport(...)`. */
  namespaceLocal?: string;
  specifier: string;
}

/**
 * Regex-based import/re-export/dynamic-import parser. Deliberately not a
 * full TS parser — this codebase's import style (named/default/namespace
 * static imports, `export *`/`export {...} from` re-exports, and
 * `await import(...)` with destructured or namespace-style bindings) is
 * simple and consistent enough that a dependency-free regex pass is
 * sufficient.
 */
function parseImportEdges(source: string): ImportEdge[] {
  const edges: ImportEdge[] = [];

  // Anchored to line start (`^` + `m` flag): un-anchored, a comment
  // mentioning the word "import" ahead of a real import statement would get
  // captured INTO the clause (the non-greedy body has to extend past it to
  // reach the next `from`), silently losing the real edge — a false
  // negative in exactly the direction this guard must not have.
  const namedOrDefaultRe =
    /^[ \t]*import\s+(?:type\s+)?([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = namedOrDefaultRe.exec(source))) {
    const clause = m[1].trim();
    const specifier = m[2];
    edges.push(...parseClause(clause, specifier));
  }

  const exportFromRe =
    /^[ \t]*export\s+(?:type\s+)?(\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gm;
  while ((m = exportFromRe.exec(source))) {
    const clause = m[1].trim();
    const specifier = m[2];
    if (clause === '*') {
      edges.push({ named: [], isNamespace: true, specifier });
    } else {
      edges.push(...parseClause(clause, specifier));
    }
  }

  edges.push(...parseDynamicImportEdges(source));

  return edges;
}

function parseClause(clause: string, specifier: string): ImportEdge[] {
  const nsMatch = clause.match(/^\*\s+as\s+(\w+)$/);
  if (nsMatch) {
    return [{ named: [], isNamespace: true, namespaceLocal: nsMatch[1], specifier }];
  }

  const named: NamedBinding[] = [];
  const braceMatch = clause.match(/\{([^}]*)\}/);
  if (braceMatch) {
    for (const part of braceMatch[1].split(',')) {
      const trimmed = part.replace(/^type\s+/, '').trim();
      if (!trimmed) continue;
      // `Original as Local` — both matter now: `original` is what hazard
      // symbols/declarations are keyed by (the exported name), `local` is
      // what actually appears at call sites in THIS file's source.
      const pieces = trimmed.split(/\s+as\s+/);
      const original = pieces[0].trim();
      const local = (pieces[1] ?? pieces[0]).trim();
      if (original && local) named.push({ original, local });
    }
  }
  // A leading default-import identifier before `, {...}` or alone —
  // `import Foo from '...'` / `import Foo, { bar } from '...'`. Bound under
  // the synthetic original name `default`.
  if (!clause.startsWith('{') && !clause.startsWith('*')) {
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)/);
    if (defaultMatch) named.push({ original: 'default', local: defaultMatch[1] });
  }

  return [{ named, isNamespace: false, specifier }];
}

/**
 * `const { a, b: c } = await import('spec')` and
 * `const ns = await import('spec')` (namespace-object binding). The `await`
 * is optional in the regex — a top-level-await-free `import('spec').then(...)`
 * chain without a binding is not covered (rare in this codebase's synchronous
 * test-file style, and it carries no name into scope for us to taint anyway).
 */
function parseDynamicImportEdges(source: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const dynamicRe =
    /(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = dynamicRe.exec(source))) {
    const binding = m[1].trim();
    const specifier = m[2];
    if (binding.startsWith('{')) {
      edges.push({
        named: parseDestructurePattern(binding.slice(1, -1)),
        isNamespace: false,
        specifier,
      });
    } else {
      edges.push({ named: [], isNamespace: true, namespaceLocal: binding, specifier });
    }
  }
  return edges;
}

/** `{ a, b: c, d = defaultVal }` destructuring — key is the ORIGINAL export
 * name (the object property), value after `:` is the local binding. */
function parseDestructurePattern(inner: string): NamedBinding[] {
  const bindings: NamedBinding[] = [];
  for (const part of splitTopLevel(inner)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      const key = trimmed.split('=')[0].trim();
      if (key) bindings.push({ original: key, local: key });
    } else {
      const original = trimmed.slice(0, colonIdx).trim();
      const local = trimmed.slice(colonIdx + 1).split('=')[0].trim();
      if (original && local) bindings.push({ original, local });
    }
  }
  return bindings;
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

/**
 * Occurrence-aware hazard-call check: when `rule` carries a
 * `guardWindowRe`, a call site only counts as a hazard if THAT SPECIFIC
 * occurrence has no guard evidence within the preceding `guardWindowChars`
 * characters — an unguarded occurrence anywhere still trips the rule (the
 * whole point is per-occurrence, fail-closed unless proven safe), but an
 * all-occurrences-guarded declaration does not. When `rule.guardWindowRe` is
 * unset this degrades to the plain "any call at all" check every other rule
 * still uses.
 */
function hasQualifyingHazardCall(
  text: string,
  localName: string,
  rule: HazardRule
): boolean {
  const callRe = new RegExp(`\\b${localName}\\s*\\(`, 'g');
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(text))) {
    if (rule.guardWindowRe) {
      const windowStart = Math.max(0, m.index - (rule.guardWindowChars ?? 800));
      if (rule.guardWindowRe.test(text.slice(windowStart, m.index))) continue;
    }
    return true;
  }
  return false;
}

/**
 * Fail-closed replacement for the old `fileImportsName`: decides whether
 * `file`'s own import edges bring `symbol` into scope — for a named/default
 * edge that's a straightforward original-name match; for a NAMESPACE edge
 * (`import * as ns` / `export * from` / `const ns = await import(...)`) it
 * resolves whether the target module transitively exports `symbol` at all
 * (rather than refusing to look, which is what let namespace-imported
 * hazard calls like `hz.assignPlatformRole(...)` go undetected). Returns
 * true only if the resolved binding's call form is actually present in
 * `text` (per `hasQualifyingHazardCall`, so a rule with a `guardWindowRe`
 * is honored regardless of which import shape carried the symbol in): the
 * LOCAL name for named/default edges (so an aliased import,
 * `import { assignPlatformRole as apr }`, is matched on `apr(`, not the
 * unused original name), or the qualified `nsLocal.symbol(` / bare
 * `symbol(` form for namespace edges (both patterns match the same regex,
 * since `\b` also anchors after a `.`).
 */
function fileHasHazardCall(
  ctx: Context,
  fromAbsFile: string,
  text: string,
  edges: ImportEdge[],
  rule: HazardRule,
  symbol: string
): boolean {
  for (const edge of edges) {
    if (!edge.isNamespace) {
      const binding = edge.named.find(n => n.original === symbol);
      if (binding && hasQualifyingHazardCall(text, binding.local, rule)) return true;
    } else {
      const resolved = resolveNameToDefiningFile(ctx, symbol, fromAbsFile, edge.specifier);
      if (resolved && hasQualifyingHazardCall(text, symbol, rule)) return true;
    }
  }
  return false;
}

/**
 * Every top-level `export const NAME = ...`, `export (async )function NAME`,
 * and `export (default )class NAME` declaration, with its source span as
 * `body`. Class bodies are captured too (previously only const/function
 * were recognized here, so an exported class's methods — e.g.
 * `TestScenarioFactory`'s static factory methods — were never taint-seeded
 * even though a direct-declaration regex elsewhere already resolved calls
 * INTO a class by name). A `default` export is recorded under the synthetic
 * name `default`, matching the synthetic `original` used for default import
 * bindings in `parseClause`.
 */
function extractExportedDeclarations(
  text: string
): { name: string; body: string }[] {
  const declRe =
    /export\s+(?:default\s+)?(?:async\s+)?(?:const|function|class)\s+(\w+)?/g;
  const matches: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(text))) {
    const isDefault = /^export\s+default\b/.test(m[0]);
    const name = isDefault ? 'default' : m[1];
    if (!name) continue;
    matches.push({ name, index: m.index });
  }
  return matches.map((match, i) => ({
    name: match.name,
    body: text.slice(
      match.index,
      i + 1 < matches.length ? matches[i + 1].index : text.length
    ),
  }));
}

/**
 * Bare `identifier(` call sites, PLUS the qualifier of any member-expression
 * call `identifier.member(` — cheap over-approximations; only acted on when
 * the name is also an imported/bound binding. The qualifier form is what
 * lets propagation see through a static-factory call shape like
 * `TestScenarioFactory.createBaseScenario(...)`: the bare-call pass alone
 * only ever captures the method name (`createBaseScenario`), which is never
 * itself an imported binding — the CLASS name is.
 */
function extractCalledNames(text: string): string[] {
  const names = new Set<string>();
  const bareCallRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = bareCallRe.exec(text))) names.add(m[1]);

  const qualifiedCallRe = /\b([A-Za-z_$][\w$]*)\.[A-Za-z_$][\w$]*\s*\(/g;
  while ((m = qualifiedCallRe.exec(text))) names.add(m[1]);

  return [...names];
}

/**
 * Resolves where `name` is actually exported from, starting at `specifier`
 * as seen from `fromAbsFile` — following `export * from` / `export {name}
 * from` re-export chains (e.g. through the `@alkemio/tests-lib` barrel),
 * dynamic-import edges, and namespace edges, until a file that directly
 * declares/exports `name` is found.
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

  if (name === 'default') {
    if (/export\s+default\b/.test(text)) return resolvedFile;
  } else {
    const directDeclRe = new RegExp(
      `export\\s+(?:async\\s+)?(?:const|function|class)\\s+${name}\\b`
    );
    const directListRe = new RegExp(
      `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}(?!\\s*from)`
    );
    if (directDeclRe.test(text) || directListRe.test(text)) return resolvedFile;
  }

  for (const edge of parseImportEdges(text)) {
    if (edge.isNamespace || edge.named.some(n => n.original === name)) {
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
 * Resolves a call-site name (as it literally appears in source — a bare call
 * or the qualifier of a member call) back to the ORIGINAL exported name and
 * defining file, via the calling file's own import edges. Needed because
 * declarations are keyed by their original exported name (what
 * `extractExportedDeclarations` records), while a call site may use an
 * aliased local name (`import { Foo as Bar }` → `Bar.method(...)`).
 */
function resolveCalledBinding(
  ctx: Context,
  fromAbsFile: string,
  edges: ImportEdge[],
  called: string
): { original: string; file: string } | undefined {
  for (const edge of edges) {
    if (edge.isNamespace) continue;
    const binding = edge.named.find(n => n.local === called);
    if (!binding) continue;
    const resolvedFile = resolveNameToDefiningFile(
      ctx,
      binding.original,
      fromAbsFile,
      edge.specifier
    );
    if (resolvedFile) return { original: binding.original, file: resolvedFile };
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
          if (!fileHasHazardCall(ctx, file, decl.body, data.edges, rule, symbol)) continue;
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
          const binding = resolveCalledBinding(ctx, file, data.edges, called);
          if (!binding) continue;
          const resolvedFile = binding.file;
          const targetHits = taint.get(resolvedFile)?.get(binding.original);
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
      if (!fileHasHazardCall(ctx, startAbsPath, text, edges, rule, symbol)) continue;
      if (rule.requiresSharedUserEvidence && !SHARED_USER_EVIDENCE_RE.test(text)) {
        continue;
      }
      record(rule.id, rule.name, symbol, []);
    }
  }

  for (const called of extractCalledNames(text)) {
    const binding = resolveCalledBinding(ctx, startAbsPath, edges, called);
    if (!binding) continue;
    const resolvedFile = binding.file;
    const hits = helperTaint.get(resolvedFile)?.get(binding.original);
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
    if (rule.requiresSharedUserEvidence && !SHARED_USER_EVIDENCE_RE.test(text)) {
      continue;
    }
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
  excludedCount: number;
}

function runAudit(
  ctx: Context,
  nightlyInclude: readonly string[],
  parallelManifest: readonly string[],
  nightlyExclude: readonly string[]
): AuditResult {
  const errors: string[] = [];

  const staleSymbols = assertHazardSymbolsResolve(ctx);
  for (const s of staleSymbols) {
    errors.push(`stale hazard symbol — ${s} no longer resolves to an export`);
  }

  // `rawNightlyFiles` is the full glob match — before NIGHTLY_EXCLUDE is
  // folded out. `NIGHTLY_EXCLUDE` entries are validated against this raw set
  // (existence + nightly-glob membership), fail-closed: an entry that
  // matches no file on disk (renamed/deleted) fails the guard rather than
  // silently becoming a no-op.
  const rawNightlyFiles = enumerateNightlyFiles(ctx, nightlyInclude);
  const rawNightlySet = new Set(rawNightlyFiles);

  const excludeSeen = new Set<string>();
  for (const entry of nightlyExclude) {
    if (excludeSeen.has(entry)) {
      errors.push(`NIGHTLY_EXCLUDE: duplicate entry "${entry}"`);
    }
    excludeSeen.add(entry);
    if (!fs.existsSync(path.join(ctx.serverApiRoot, entry))) {
      errors.push(`NIGHTLY_EXCLUDE: "${entry}" does not exist on disk`);
    }
    if (!rawNightlySet.has(entry)) {
      errors.push(
        `NIGHTLY_EXCLUDE: "${entry}" does not match any nightly glob`
      );
    }
  }

  // The partition the two lanes must exactly cover is (NIGHTLY_INCLUDE minus
  // NIGHTLY_EXCLUDE) — an excluded file is removed from consideration here,
  // before either lane is derived, so it can end up in neither.
  const excludeSet = new Set(nightlyExclude);
  const nightlyFiles = rawNightlyFiles.filter(f => !excludeSet.has(f));
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
    if (excludeSet.has(entry)) {
      errors.push(
        `PARALLEL_MANIFEST: "${entry}" is also present in NIGHTLY_EXCLUDE — a file cannot be both promoted and excluded`
      );
    } else if (!nightlySet.has(entry)) {
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
    excludedCount: rawNightlyFiles.length - nightlyFiles.length,
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
  const lanesModule = (await import(lanesModuleUrl)) as {
    NIGHTLY_INCLUDE: readonly string[];
    PARALLEL_MANIFEST: readonly string[];
    // Optional so pre-existing fixture trees that predate the exclusion
    // mechanism (no `NIGHTLY_EXCLUDE` export at all) keep working unchanged
    // — absent is treated as "no exclusions", not a guard crash.
    NIGHTLY_EXCLUDE?: readonly string[];
  };
  const { NIGHTLY_INCLUDE, PARALLEL_MANIFEST } = lanesModule;
  const NIGHTLY_EXCLUDE = lanesModule.NIGHTLY_EXCLUDE ?? [];

  const audit = runAudit(ctx, NIGHTLY_INCLUDE, PARALLEL_MANIFEST, NIGHTLY_EXCLUDE);

  console.log('[lanes:validate] nightly lane audit');
  console.log(`  nightly total:  ${audit.nightlyCount}`);
  console.log(`  parallel lane:  ${audit.parallelCount}`);
  console.log(`  serial lane:    ${audit.serialFiles.length}`);
  console.log(`  excluded:       ${audit.excludedCount}`);
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
