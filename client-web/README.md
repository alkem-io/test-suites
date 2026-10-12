# client-web — Playwright E2E suites

End-to-end coverage of the Alkemio web client, driven through the real UI
against a running stack (local, or the shared test cluster on the nightly).

**Read [`docs/e2e-conventions.md`](docs/e2e-conventions.md) before writing or
reviewing a spec.** It is the contract every suite here follows: structure,
independence, waiting, assertions, locators, timeout tiers, secrets, browser
configuration and the definition of done.

## Layout

| Path | What |
|---|---|
| `config/playwright.shared.ts` | The one config: browser presets (`PW_BROWSER`), viewport, timeout tiers, reporters, artifact policy |
| `config/playwright.config.nightly.ts` | The nightly: one `suite({...})` per feature area |
| `config/playwright.config.<suite>.ts` | Runners for suites with a special precondition (own sign-in setup, a feature stack) |
| `config/playwright.config.local-stack.ts` | The `@local-stack` cases the nightly excludes (loopback DB, queue counters, server env overrides) |
| `playwright.config.ts` | Interactive runner for `playwright test <file>` while developing |
| `src/functional-e2e/<area>/` | One directory per feature area: specs, helpers, page objects, `<area>-test-plan.md` |
| `src/functional-e2e/fixtures/` | `createPersonaTest` / `ensurePersonaState` — one sign-in per persona per run |
| `src/functional-e2e/helpers/` | Cross-area helpers (login, cookie consent, callout form, navigation) |
| `tests/` | Acceptance walks persisted by forge-verify (machine-written; registered in the nightly like any suite) |

## Running

```bash
# once: browsers
pnpm exec playwright install --with-deps chromium chrome

# environment — the .env files live in the main clone; source, never copy
set -a; . ../client-web/.env; set +a
export AUTH_TEST_HARNESS_PASSWORD="$(grep '^AUTH_TEST_HARNESS_PASSWORD=' ../server-api/.env | cut -d= -f2-)"
export UI_HEADLESS=true
export KRATOS_ADMIN_URL=http://localhost:32818   # the host port mapped to alkemio_dev_kratos:4434 (`docker ps`); bare base URL, no /admin

pnpm exec playwright test src/functional-e2e/callouts/0.5callout-creation.spec.ts   # one file
pnpm run test:nightly --project=Callouts                                            # one nightly suite
pnpm run test:nightly                                                               # everything
pnpm run test:local-stack                                                           # the @local-stack cases only
PW_BROWSER=firefox pnpm run test:nightly --project="Public Space"                   # another browser
```

| variable | values | default |
|---|---|---|
| `PW_BROWSER` | `chrome` `chromium` `firefox` `webkit` `msedge` `mobile-chrome` `mobile-safari` | `chrome` |
| `PW_VIEWPORT` | `<w>x<h>` (desktop presets) | `1920x1080` |
| `PW_WORKERS` | integer | `1` |
| `PW_RETRIES` | integer | `0` locally, `2` on CI |
| `UI_HEADLESS` | `false` to watch | headless |

`KRATOS_ADMIN_URL` (optional): since workspace#027 Slice B no actor can assign
MEMBER on an L0 space directly, so the harness signs the user in and JOINs.
Suites register their throwaway users with a real identity (see
`contributors-callout/cards-fixture.ts › registerFixtureUser`), which needs no
admin API; the variable only matters for a `createUser`-made record, which the
lib can then provision an identity for.

## Adding a suite

1. Create `src/functional-e2e/<area>/` with the specs, a `<area>.helpers.ts`
   and a `<area>-test-plan.md` in the house format.
2. Register it in `config/playwright.config.nightly.ts` with one
   `suite({ name, testMatch, tier })` entry. No timeouts, no `use`, no browser.
3. Run it green locally against the current `develop` server + client, then
   `pnpm run lint`.
4. Tick the definition of done in `docs/e2e-conventions.md` § 10.
