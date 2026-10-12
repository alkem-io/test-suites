# client-web E2E conventions

The rules every Playwright suite in `client-web/` follows. They exist so that a
green run means the product works, a red run means the product (or the test)
is broken, and nothing in between. Read this before adding a spec; review
against it before approving one.

The short version: **a test owns its data, waits for conditions, asserts
outcomes the user would notice, and declares only what it runs — never how.**

---

## 1. Structure

```
client-web/
├── playwright.config.ts              # interactive runner (what `playwright test <file>` uses)
├── config/
│   ├── playwright.shared.ts          # THE config: browsers, viewport, tiers, artifacts, reporters
│   ├── playwright.config.nightly.ts  # the nightly: one `suite({...})` per feature area
│   ├── playwright.config.<suite>.ts  # runners for suites with special preconditions
│   └── global-setup.ts               # persona registration, per-run cache clearing
├── src/functional-e2e/
│   ├── fixtures/                     # `createPersonaTest`, `ensurePersonaState`
│   ├── helpers/                      # cross-area helpers (login, cookies, navigation)
│   └── <feature-area>/               # one directory per feature area
│       ├── <area>-test-plan.md       # business scenarios → specs (house format)
│       ├── <area>.helpers.ts         # API seeding, teardown, locators shared in the area
│       ├── pages/                    # page objects, when the area has more than one spec
│       └── us<N>-<slug>.spec.ts      # one user story (or one scenario group) per file
└── tests/                            # forge-verify's persisted acceptance walks (machine-written)
```

- **One feature area = one directory = one nightly project.** A new area is
  registered in `playwright.config.nightly.ts` with a single `suite({...})`
  entry naming its files and its timeout tier. Nothing else goes in the
  config — no `use`, no timeouts, no reporters.
- **A file is one user story** (or one coherent scenario group). Cases inside
  a file share its `beforeAll` fixture; files share nothing.
- **Page objects hold locators and interactions; specs hold assertions.** A
  spec that reaches for `page.locator('div')` is missing a page-object method.
- **The test plan lives beside the specs** (`<area>-test-plan.md`), in the house
  format: scenario → risk → spec file → case title. Update it in the same PR as
  the spec.

## 2. Independence — a test owns its data

- **Self-seed through the API, in `beforeAll`, with a run-unique name**
  (`UniqueIDGenerator.getID()` in every nameID and display name); **tear it
  down in `afterAll`**, children first, and let a teardown failure fail the
  hook (a leaked fixture breaks the next run — say so loudly). Record every id
  the moment it exists so a half-failed `beforeAll` can still be undone.
- **A throwaway user that must act (join, sign in) needs a Kratos identity**: register it through `registerInKratosOrFail` + `verifyInKratosOrFail` + `registerInAlkemioOrFail` (`contributors-callout/cards-fixture.ts › registerFixtureUser`), not `createUser`, which makes a record no one can sign in as — and since workspace#027 Slice B joining is the only way onto an L0 space.
- **Never mutate a shared harness persona** (`admin`, `space.admin`,
  `non.space`, …): no password change, no profile edit, no notification
  setting left flipped. A test that must change a user's state registers a
  disposable identity (`registerInKratosOrFail` + `verifyInKratosOrFail`) and
  deletes it (`deleteUser(id, GLOBAL_ADMIN, true)`). If a persona's setting
  must be changed, snapshot → change → restore in `afterAll`
  (`helpers/notification-settings.helper.ts` is the pattern).
- **Do not depend on environment state** you did not create: not "the first
  space the admin administers", not "a public space exists", not "the inbox is
  empty". Create the space; search for your own name; read mail by recipient.
- **The shared MailSlurper inbox is read, never pruned.** Use the
  recipient-scoped readers (`getRecoveryLinkFor`, `getVerificationLinkFor`,
  `settledMailsTo`); assert per-address deltas. `deleteMailSlurperMails()` is
  reserved for suites that are the only thing running — today, none.
- **Order independence inside a file**: `describe.configure({ mode: 'serial' })`
  is for files whose cases genuinely build on one another (a multi-step user
  journey). Otherwise every case must pass on its own and after any other.

## 3. Waiting — for conditions, never for time

- **No `page.waitForTimeout`, no `delay()`.** ESLint fails the build on both.
  Wait for the thing you need: `await expect(locator).toBeVisible()`,
  `expect.poll(() => api())`, `expect(async () => {...}).toPass()`,
  `locator.waitFor()`, `page.waitForURL()`, `page.waitForResponse()`.
- **No `networkidle`.** Authenticated Alkemio pages keep subscriptions and
  polls open; they never go idle. Wait for the element the test needs.
- **A NEGATIVE assertion needs a settle window derived from a product
  constant** ("no email within the digest's max delay", "no second row within
  the resend cooldown"). That is the one legitimate sleep. Mark it:
  `// eslint-disable-next-line no-restricted-syntax -- <which constant, why>`
  and prefer the helper that already encodes it (`digestWindow()`,
  `assertNoMailTo()`, `expectNoNewIds()`).
- **Wait for an authenticated signal after sign-in**, not for a URL: the user
  menu in the banner (`expectAuthenticatedDashboard`), or the dialog/heading
  the flow lands on. A URL changes one React Router tick before the page is
  usable.
- **Dialogs:** wait for the dialog by role and name, act, then wait for it to
  be hidden before asserting on the page behind it.

## 4. Assertions — meaningful and falsifiable

- **Assert the outcome the user cares about, from two angles when the UI
  alone can lie:** the row on screen AND the record read back over GraphQL
  (`rawGql` as the acting user); the sent email AND its exact subject; the
  disabled button AND the explanatory text beside it.
- **Exact over fuzzy.** `getByRole('button', { name: 'Save', exact: true })`,
  `toHaveText(exact)`, `toHaveCount(1)`. A `.first()` or a regex is a decision
  that something else also matches — write down why.
- **A negative needs a positive control in the same test**: "no Delete action
  for a member" is only meaningful next to "Edit is shown for that member", or
  the whole page might simply have failed to render.
- **Never assert on implementation accidents**: CSS classes, DOM depth,
  `data-radix-*` wrappers, order of network calls. Accessible role + name,
  visible text, URL, and API state are the contract.
- **`expect.soft` only for observations** that must not stop the walk and are
  flagged as product findings in the plan. Everything else is hard.
- **Skips carry a reason and an issue link.** A known product defect is
  `test.skip('<expected behaviour> (alkem-io/<repo>#NNN)', …)` with a comment
  saying what happens today and "drop the skip when fixed" — never
  `test.fails`, never a silently green vacuous assertion.

## 5. Locators

Priority: `getByRole` (with `name`) → `getByLabel` / `getByPlaceholder` →
`getByText` (exact) → `getByTestId` → CSS as a last resort, scoped to a
role-located ancestor. Known traps, all documented in the code they affect:

- CRD dialogs' corner close button has no accessible name: dismiss with
  `page.keyboard.press('Escape')` and wait for the dialog to be hidden.
- "About this Space" renders twice on a space page; scope to the navigation.
- Radix menus leave the page `aria-hidden` for a tick after closing; wait for
  the menu to be hidden before a role-based `toHaveCount(0)`.
- Tag chips render a hidden measuring copy; filter `{ visible: true }`.

## 6. Timeouts — pick a tier, do not set numbers

Every suite declares one tier in the nightly config; budgets are for the
slowest environment we run against, not a laptop:

| tier       | test     | expect  | use it for                                                     |
|------------|----------|---------|----------------------------------------------------------------|
| `standard` | 60 s     | 10 s    | one page, a few actions, assertions on the result              |
| `extended` | 120 s    | 15 s    | multi-step walks, several dialogs, uploads, two contexts       |
| `long`     | 180 s    | 20 s    | walks that wait for the platform: mail, digests, subscriptions |

Inside a spec, `test.setTimeout()` is for a `beforeAll` that seeds a large
fixture, and for nothing else. A case that needs more than its tier is two
cases, or belongs in a longer tier.

## 7. Secrets and published artifacts

The nightly report is published to a **public** gh-pages site.

- Passwords go through `fillSecret()` (ESLint blocks `fill(password)`).
- Traces and videos are kept only on failure/retry and stripped before
  publishing (`scripts/publish-report.sh`). A walk that must never record a
  session cookie sets `capture: 'off'` on its suite.
- No real email addresses, tokens, or environment IDs in test titles,
  annotations or error messages.

## 8. Browsers and configurations

All runners share `config/playwright.shared.ts`:

| variable           | values                                                              | default   |
|--------------------|---------------------------------------------------------------------|-----------|
| `PW_BROWSER`       | `chrome` `chromium` `firefox` `webkit` `msedge` `mobile-chrome` `mobile-safari` | `chrome`  |
| `PW_VIEWPORT`      | `<w>x<h>` (desktop presets only)                                    | `1920x1080` |
| `PW_WORKERS`       | integer                                                             | `1`       |
| `PW_RETRIES`       | integer                                                             | `0` local, `2` CI |
| `UI_HEADLESS`      | `false` to watch                                                    | headless  |
| `ALKEMIO_BASE_URL` | the app under test                                                  | `http://localhost:3000` |

A cross-browser run is the same config with another `PW_BROWSER`; project
names do not change, so reports stay comparable. Browser-specific behaviour
is handled in the spec with `test.skip(browserName === 'webkit', 'reason')`,
never by forking the config. Mobile presets keep their device viewport; a
suite that is desktop-only says so with `test.skip(isMobile, …)`.

### Local-stack runner

A case that needs what the shared test cluster cannot offer — loopback
Postgres/Redis, the RabbitMQ management API, a server env override such as a
seconds-scale resend cooldown — is tagged `{ tag: '@local-stack' }`. The nightly
excludes the tag outright (`grepInvert`), so a skip in the nightly report always
means a tracked defect; `pnpm run test:local-stack`
(`config/playwright.config.local-stack.ts`) runs exactly those cases against a
local stack. The case keeps its own precondition guard, which on that runner
reads as "the stack is not set up for this", never as a flake.

### Suite parallelism

The nightly runs files one at a time. A suite may be run with `PW_WORKERS > 1`
only when **every** file in the run: self-seeds and tears down; never mutates a
shared persona; reads mail by recipient; and never prunes the inbox. The
Authentication, Applications and Templates suites do not qualify yet. When they
do, raise the worker count in CI and leave the config alone.

## 9. Local runs

```bash
# from client-web/ — the .env files live in the main clone, never copy them
set -a; . ../../test-suites/client-web/.env; set +a
export AUTH_TEST_HARNESS_PASSWORD="$(grep '^AUTH_TEST_HARNESS_PASSWORD=' ../../test-suites/server-api/.env | cut -d= -f2-)"
export UI_HEADLESS=true KRATOS_ADMIN_URL=http://localhost:32818   # host port of alkemio_dev_kratos:4434, see `docker ps`

pnpm exec playwright test src/functional-e2e/callouts/0.5callout-creation.spec.ts
pnpm run test:nightly --project=Callouts
PW_BROWSER=firefox pnpm run test:nightly --project="Public Space"
```

`KRATOS_ADMIN_URL` (bare base URL, no `/admin`) lets `assignRoleToUser` give an
API-created user an identity so it can JOIN a space (workspace#027 Slice B:
no actor can assign MEMBER on an L0 space directly). Without it, every
self-seeded walk that adds members fails at setup.

## 10. Definition of done for a spec PR

- [ ] Registered in the nightly config as part of its area's `suite({...})`.
- [ ] Self-seeding and self-cleaning; passes alone and after any other file.
- [ ] Zero fixed waits, zero `networkidle`; `pnpm run lint` is clean.
- [ ] Every assertion would go red on the regression it guards (reviewer: name the regression for each).
- [ ] No shared persona mutated; no inbox pruned.
- [ ] Test plan updated beside the spec.
- [ ] Ran green locally against the current `develop` server + client, headless.
