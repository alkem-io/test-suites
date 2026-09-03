# Deferred cases

Every deferred case with its blocker, the condition that clears it, and an
owner. Move a row to *Cleared* (with date) once the blocker is gone — don't
re-derive it from scratch in a future run.

## Open

| Case | Story | Blocker | Clears when | Owner |
|---|---|---|---|---|
| System-level (API) test that a 9-state template is rejected on an L0/subspace flow | client-web#9528 / server#6418 | No `createStateOnInnovationFlow`/`deleteStateOnInnovationFlow` request-params wrappers — can't construct an exact 9-state donor | Wrappers added (small, mechanical — see `harness.md`) | test-suites maintainers |
| System-level (API) test that a sub-4-state (e.g. 2-state) template is accepted on an L0 | client-web#9528 / server#6418 | Same wrapper gap | Same | test-suites maintainers |
| Migration `InnovationFlowStateBounds1To8` backfill correctness against ACC's real `settings` row shapes (incl. legacy scalar-null coercion) | client-web#9528 / server#6418 | test-suites has no DB access (GraphQL-only surface) — not a tooling gap that can clear, a standing architectural constraint | Not expected to clear; stays a release-ops SQL check, not test-suites automation | Release verification / DBA |
| Un-skip and re-verify `transfer-callout-template-flow.it-spec.ts`'s two `test.skip` cases ("lands on a valid destination state" / "adopts the destination default state") | pre-existing, unrelated stale-state bug per the file's own header comment | Root-cause bug not identified in this run (out of scope — different story) | Someone triages the referenced stale-state bug | whoever owns callout-transfer |

## Cleared

(none yet)
