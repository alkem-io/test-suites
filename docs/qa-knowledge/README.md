# QA knowledge base

Working memory for the `qa-test-designer` and `qa-test-implementer` agents
(defined in [agents-hq](https://github.com/alkem-io/agents-hq) under
`.claude/agents/`). The agents read these files before analysing anything and
write back afterwards, so each run is cheaper than the last.

| File | Holds |
|---|---|
| `harness.md` | How testing works here — suite layout, standing tooling gaps, `TestScenarioFactory`, roles, environment quirks, tooling gotchas |
| `coverage-map.md` | What the suites cover by area, and what was proven *absent* — dated and branch-stamped |
| `deferred.md` | Every deferred case across all features, with its blocker, clearing condition and owner |

A row tells you where to look and what to expect. It never replaces opening the
file when a verdict depends on it, and reality always beats a stale row.

## Where test plans live

**Not here.** A feature area owns its plan, inside its own directory —
`client-web/src/functional-e2e/<area>/<area>-test-plan.md`, or the `server-api`
equivalent for an API-only feature. See the "Client Web Tests" section of the
repo `CLAUDE.md`.

The designer writes that plan plus a transient **build sheet** of per-case
specifications. The build sheet is the implementer's input and is never
committed — once the tests exist, they are the specification.

## The flow

```
story + spec + merged diff
        │
        ▼   ① risk analysis
   designer  ② EXISTING COVERAGE ANALYSIS ← gate: what already covers this?
        │   ③ cases for the proven gaps only
        ▼
  <area>-test-plan.md (Status: Draft)  +  build sheet
        │
        ▼
  HUMAN REVIEW — flip the status line to Approved
        │
        ├─► implementer ──► test updates first, then new cases
        │                   then rewrites the plan's mapping to point at real specs
        │
        └─► manual rows ──► docs/release-verification-checklist.md
```

Nothing is built from a `Draft` plan. **Not everything gets automated, by
design** — the designer proposes a decision per gap with a reason, and a person
accepts or overrides it.

## Priority rubric

Priority derives from risk, never from how easy a case is to write.

| Priority | Meaning | Consequence |
|---|---|---|
| **P0** | Release-blocking | Failure stops the release |
| **P1** | Core business flow or elevated-risk change | Failure blocks unless explicitly accepted |
| **P2** | Secondary flow, contained blast radius | Failure triaged, may ship |
| **P3** | Cosmetic, rare edge, low impact | Best-effort |

## Decisions on a gap

| Decision | Criteria | Where it goes |
|---|---|---|
| **Automate now** | Deterministic, stable interface, seedable, repeatable value | Built this cycle |
| **Deferred** | Worth it but **blocked** — the blocker is named | `deferred.md` |
| **Manual** | Subjective, visual, one-off, or cost exceeds value | Release verification checklist |
| **Exploratory** | Better served by a timeboxed charter than a scripted case | Charter in the plan |

## Technique codes

`EP` equivalence partitioning · `BVA` boundary values · `DT` decision table
(role × setting × state) · `ST` state transition · `PW` pairwise · `UC` use case
· `EG` error guessing / defect-based · `CHK` checklist · `EXP` exploratory

**Levels:** `U` unit · `I` integration · `S` system · `A` acceptance
**Types:** `FUNC` · `PERF` · `SEC` · `REL` · `COMPAT` · `A11Y` · `USAB` · `REG`

## Depth calibration

Ceremony is earned. The designer sizes its own effort after the risk table:
**Light** for a one-repo change with no elevated-risk trigger, **Standard** for
one trigger or a new user-facing surface, **Deep** for a migration, an
authorization change, or a cross-repo contract. `/qa-story --depth` overrides it.

Two things never scale down: the coverage-analysis gate always runs in full, and
non-functional is always assessed — Light may answer in one line per dimension,
but "we didn't look" is never an answer.
