# Deferred coverage register

Every `automate-later` case, across all plans, in one place — with the blocker
that must clear first.

**Why this exists.** An `automate-later` verdict inside one plan is invisible
debt: the plan gets approved, the case is never built, and nobody tracks the
blocker. This register makes the debt countable and gives each blocker an owner.

**Read it when designing** — if a blocker has since cleared, the case is now
`automate-now` and does not need re-deriving. **Update it** when a plan adds
deferred cases, and when one gets built.

`manual-only` cases do **not** belong here — they go to
`docs/release-verification-checklist.md`. This register is for work we intend to
automate eventually.

---

## Open

| Case | Plan | Blocker | Clears when | Owner |
|---|---|---|---|---|
| TC-10 — flow template application carries phase layout | 021 | A template predating the feature cannot be staged through the public API; proving the coercion path needs direct JSONB manipulation | Accept partial coverage (test the "template *with* values" half), or gain a fixture path | QA |
| TC-19 — scoped search vs publisher-Off | 021 | No oracle: search forces `showPublishDetails: true`, which contradicts the story's motivation. Needs a product ruling (021 Q1) | Product rules on intended behaviour | Product |
| TC-20a — no "callout" in new user-facing strings | 021 | Assertion belongs next to the locale files in `client-web`, outside this repo | Raised as a `client-web` unit test | `client-web` maintainer |
| TC-21 — backfill fidelity on real data | 021 | `test-suites` has no DB access. `server/.scripts/migrations/verify_021_backfill.sh` already implements the checks correctly and exits non-zero — **it is in neither `package.json` nor any workflow** | The script is wired into `server` CI | `server` maintainer |
| TC-22 — backfill re-run is a no-op | 021 | Same as TC-21 | Same as TC-21 | `server` maintainer |
| TC-26 — feed cost at volume | 021 | No request-count/payload harness exists. Playwright `page.route` counting is the cheapest route | A counting harness exists in `client-web` e2e | QA |
| TC-19 — ignored banner closed with the tab is still a decline | 029 | No agreed oracle. "Ignored = declined" is a React unmount effect, which does not fire on tab close/browser kill, so the case would assert current behaviour rather than the spec (029 Q1) | Product rules on FR-020a scope; if the spec stands, a `visibilitychange`/`beforeunload` write must exist to test against | Product |
| TC-20 — empty eligible set hides banner and invite control | 029 | No per-test server-config override in the e2e harness; needs the server started with `LANGUAGE_ELIGIBLE=''` | The e2e harness can request a config variant, or a second staged environment exists | QA |
| TC-21 — server and client supported-language sets agree | 029 | No cross-repo contract harness; the constant is hard-coded in two repos `test-suites` does not depend on | Better fix is a product change — serve the supported set from `Config` and have the client consume it | `server` maintainer |
| TC-22 — migration writes zero rows, is idempotent, reverses cleanly | 029 | `test-suites` has no DB access. **Leaves US4-AS5 ("no user's displayed language changed at release") with no covering test at all** | The `server` repo runs the assertion in its own CI (its `migration:validate` harness already exists) | `server` maintainer |
| TC-23 — offer copy exists for every eligible language | 029 | Same config-variant blocker as TC-20; and locale assertions belong next to the locale files, not here | Raised as a `client-web` unit test comparing `crd-language → offer.<lang>.*` against the configured eligible set | `client-web` maintainer |

## Cleared

_Move rows here when the case is built, with the plan and PR that did it._

| Case | Plan | Built in | Date |
|---|---|---|---|

---

## Blocker roll-up

Distinct blockers, so a single fix can be seen to unlock several cases:

| Blocker | Unlocks | Fix |
|---|---|---|
| **No DB access from `test-suites`** | 021 TC-21, 021 TC-22, **029 TC-22** | Wire `verify_021_backfill.sh` (and successors) into `server` CI — the assertions already exist. **Highest-value blocker on the board**: three cases across two plans, and 029 TC-22 is the *only* cover for a spec success criterion (029 US4-AS5). |
| **No per-test server-config override** | 029 TC-20, 029 TC-23 | Let the e2e harness request a config variant, or stand up a second environment with `LANGUAGE_ELIGIBLE=''` |
| No request-count harness | 021 TC-26 | Build Playwright `page.route` counting in the client-web e2e package |
| Product ruling outstanding | 021 TC-19, **029 TC-19** | Two independent decisions from Product |
| No cross-repo contract harness | 029 TC-21 | Prefer the product fix (serve the constant from `Config`) over building the harness |

> ⚠ Both plans so far have deferred a case that is the **sole** cover for a stated
> success criterion (021 TC-21/22 for backfill fidelity; 029 TC-22 for "no user's
> language changed at release"). Both trace to the same missing capability. If one
> blocker gets fixed, make it DB access.
