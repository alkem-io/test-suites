# Harness facts

Durable truths about testing Alkemio that every plan would otherwise rediscover.
**Read before designing; append when you learn something that will be true next
time too.** Anything specific to one feature belongs in that plan, not here.

Each entry states when it was last confirmed. Treat anything older than a few
months as needing a re-check before you rely on it.

---

## Where tests live

| Level | Location | Framework |
|---|---|---|
| API / integration | `server-api/src/functional-api/<area>/*.it-spec.ts` | Vitest |
| System / E2E | `client-web/src/functional-e2e/<area>/*.spec.ts` | Playwright (Chrome branded) |
| Shared helpers, scenarios, GraphQL docs | `lib/src/` | — |
| Load / stress | `load-testing/` | Socket.IO rig — see gaps below |
| **Unit / component** | **Not here.** The owning repo's own suite. | — |

`testOld/` is deprecated — never add to it.

## Standing tooling gaps

These block whole categories of case. Cite them; do not rediscover them.

| Gap | Consequence | Confirmed |
|---|---|---|
| **No DB access from `test-suites`** | Data-level migration assertions cannot live here. They belong in the owning repo's CI. | 2026-07 |
| **No axe / `@axe-core/playwright`** | No automated accessibility assertions exist to extend. A11y cases are `manual-only` until this lands. | 2026-07 |
| **No request-count / payload harness** | Cannot assert round-trip counts or N+1. `load-testing/` is a Socket.IO whiteboard stress rig, not an HTTP harness. Playwright `page.route` counting is the cheapest route if built. | 2026-07 |
| **No cross-browser / viewport matrix** | Chrome branded channel only. Compatibility cases are exploratory or manual. | 2026-07 |
| **i18n locale assertions** | Belong next to the locale files in `client-web`, outside this repo's remit. | 2026-07 |
| **No per-test server-config override** | The e2e and API suites run against a fixed server config. Anything needing a config variant (kill-switches, widened feature sets, non-default `LANGUAGE_*`) cannot be staged per test — it needs a second environment or a `skipIf`-gated variant run. | 2026-07 |
| **No cross-repo contract harness** | Constants duplicated across `server` and `client-web` (e.g. the supported-language list) cannot be compared from here. The durable fix is a product change — serve the value from `Config` — not a test. | 2026-07 |

## Test data and roles

- **`TestScenarioFactory`** (`lib/src/scenario/`) is the standard way to seed
  orgs → spaces → subspaces. Look for an existing scenario before extending it.
- Roles available in both suites: `GLOBAL_ADMIN`, `SPACE_ADMIN`, `SPACE_MEMBER`,
  `NON_SPACE_MEMBER`, plus a **genuinely anonymous** actor (no session cookie).
  Patterns for all five already exist — copy them.
- **Anonymous API request**: call `graphqlErrorWrapper(callback)` with **no role
  argument** — `authToken` stays undefined and the header is omitted. Do not send
  `Bearer undefined`. Pattern: `graphql-guard/graphql-guard-public-private-access.it-spec.ts`.
- **A brand-new user can be registered mid-test**, from `server-api` as well as from
  Playwright: `registerTestUser` / `registerInKratosOrFail` + `verifyInKratosOrFail`,
  then `registerInAlkemioOrFail(first, last, email)` to trigger Alkemio account
  creation, then `getUserToken(email)` — all exported from `@alkemio/tests-lib`
  (`lib/src/scenario/registration/`). **This is the only way to reach the server's
  real registration path**; the standing test users are created once in global setup
  and their state cannot be assumed pristine. Use a `UniqueIDGenerator` email —
  `registerTestUser` swallows Kratos 4000007 and silently no-ops on a re-used
  address. Kratos rejects parallel registration flows, so such files run serially.
- **Browser language** is set with `test.use({ locale })` or
  `browser.newContext({ locale })`, which drives both `navigator.languages` and
  `Accept-Language`. `client-web/playwright.config.ts` sets **no** `locale`, so the
  suite default is `en-US`.
- Default L0 flow phases: `Home / community / Subspaces / Knowledge`. Default L1
  first phase: `Explore`. Several existing e2e specs depend on these names.

## Environment quirks

- Server API tests need the **non-interactive login** endpoint; the harness
  password comes from env, not from a fixture.
- `server-api` scenario files must run **serially** — no parallel workers across
  files. Per-test timeout overrides the global one.
- CI runs client-web with 1 worker and 2 retries; local runs parallel with none.

## Tooling gotchas

- **`gh pr diff` has no `--name-only`** in the installed version. Use
  `gh pr view <n> --repo <r> --json files -q '.files[].path'`.
- **Sibling clones under `agents-hq/` are frequently stale** — often on a
  leftover feature branch or behind `develop`. Always run
  `git -C <repo> branch --show-current && git -C <repo> log --oneline -3`
  before treating working-tree content as current. To read merged feature code
  reliably use `gh pr diff`, or `git show <merge-sha>:<path>` after a fetch.
  *(This produced a wrong conclusion once — the file on disk predated the merge.)*
- Record the branch/SHA any coverage analysis was performed against. A "0 hits"
  result is only true of the tree you searched.
- **`rg -rn 'pattern'` silently means `--replace n`.** `-r` takes an argument, so
  `-rn`, `-rln`, `-rls` etc. rewrite every match to `n`/`ln`/`ls` in the output.
  This corrupts results without erroring — a mutation named `InviteFor…` printed as
  `mutation n(`, the word "kratos" printed as "ln". Use `rg -n`, `rg -ln`
  (`--files-with-matches` is `-l`), never a flag cluster starting `-r`.
- **`test.only` in an `.it-spec.ts` file suppresses every sibling test in it.**
  There is at least one in the tree (`configuration/configuration.it-spec.ts`). Check
  before adding a test to an existing file, or it will never run and still look green.
- **A forge run's "persisted" specs survive only if committed.** `forge-run.md` may
  record durable regression specs written into a worktree and flagged *uncommitted*.
  Worktrees get cleaned up, and the files go with them — confirmed for 029 (root
  cause: routine worktree cleanup; nothing in either clone, any branch, any stash,
  any dangling object, or the reflog). **Never treat a ledger's "persisted specs"
  line as evidence.** Check `git log --all -- <path>`; if it is empty, the specs do
  not exist and the acceptance coverage they claim is unverified.
- **A widened GraphQL fragment is often the real prerequisite.** In both 021 and 029,
  the blocker to writing an API case was not the test but the shared `lib` document:
  the field simply was not selected. Check `lib/src/scenario/graphql/` before
  estimating effort.
