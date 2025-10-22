## GitHub Copilot Project Context: Specification-Driven Development (Spec Kit)

This repository follows Specification-Driven Development using GitHub's Spec Kit. Spec-driven development is a collaborative workflow where a detailed written specification is created, reviewed, and approved by product, design, and engineering to serve as the single source of truth before implementation begins.
Copilot MUST align assistance with the specification workflow and constitutional governance defined under `.specify/`.

### Core Artifacts (Authoritative Sources)

Location: `.specify/` in the repository root. Key files:

- `memory/constitution.md` – MANDATORY Governing principles (quality gates, Definition of Done, performance, accessibility, governance).
- `templates/plan-template.md` – Implementation plan structure & gate logic.
- `templates/spec-template.md` – Feature specification structure & validation rules.
- `templates/checklist-template.md` – Generate quality checklists & validate requirement completeness, clarity, and consistency.
- `templates/tasks-template.md` – Task breakdown structure & generation rules.
- `templates/agent-file-template.md` – Pattern for maintaining this agent instructions file.

Treat future `memory/*.md` additions as long-lived organizational knowledge.

### Expected Feature Documentation Layout

Features live under `specs/NNN-sample-feature/` (replace with numbered slug; create `specs/` if absent):

```
specs/NNN-sample-feature/
    spec.md
    plan.md
    research.md
    data-model.md
    quickstart.md
    contracts/
    tasks.md
```

### Canonical Workflow

1. `/constitution` (done) → `constitution.md`
2. `/specify` → `spec.md` (WHAT & WHY only)
3. `/clarify` (resolve `[NEEDS CLARIFICATION]` markers)
4. `/plan` → `plan.md` + Phase 0/1 docs (except `tasks.md`)
5. `/checklist` → generate quality checklists to validate requirements completeness, clarity, and consistency
6. `/tasks` → `tasks.md`
7. `/analyze` → cross-artifact consistency
8. `/implement` → execute tasks (respect `[P]` parallel markers)

### Ad-hoc requests

You can help the user with requests outside the canonical workflow, but it is ESSENTIAL that the above principles are adhered to, so any new features or changes are documented in the appropriate specification files and follow the established workflow, before changing the code. Ensure that conde chnages and learnings from the conversation on the current feature are brought back into the specs where relevant. Bug fixes, debugging, non-product related requests, etc. are acceptable, as long as they are not in conflict with the specification-driven development process.

### Tooling Guidance

- Prefer interacting with the MCP server tools whenever they can accomplish the task; fall back to direct terminal commands only when no MCP capability exists or it is insufficient for the request.

### Git

- Commits must be signed.

### Workflow Enforcement (Spec Kit Scaffolding Addendum)

The following rules tighten adherence to the Spec Kit phase flow. They focus ONLY on scaffolding mechanics (lifecycle, traceability, transitions) and intentionally exclude broader governance (performance, security, etc.) which remains in `memory/constitution.md`.

#### Artifact Status & Metadata Block

Every primary artifact (`spec.md`, `plan.md`, `tasks.md`, `analysis.md`, `data-model.md`, `quickstart.md`, `contracts/*`) MUST begin with a metadata header (front-matter or top block):

```
Status: DRAFT | REVIEW | APPROVED | IMPLEMENTING | SHIPPED | DEPRECATED
Spec-ID: SPEC-###            # immutable identifier for the feature folder
Spec-Version: 1.0            # increment when scope changes (new/removed requirements)
Last-Updated: YYYY-MM-DD
Owner: role/email
```

Status transitions:

- DRAFT → REVIEW (initial WHAT/WHY complete, requirements enumerated)
- REVIEW → APPROVED (all clarifications resolved, stakeholders sign-off)
- APPROVED → IMPLEMENTING (plan + tasks validated, checklist passed)
- IMPLEMENTING → SHIPPED (all requirements implemented & verified)
- Any → DEPRECATED (feature sunset; create rationale note)

#### Requirement IDs & Traceability

All functional/non-functional requirements in `spec.md` MUST be numbered sequentially:

```
R-001: <requirement text>
R-002: <requirement text>
```

Rules:

- IDs are never renumbered after APPROVED; deprecated ones are marked R-00X (DEPRECATED).
- Each R-### must appear in: `plan.md` (planning reference), `tasks.md` (implementation linkage), and (if applicable) `analysis.md` drift matrix.
- No orphan requirements: each R-### maps to at least one task; no orphan tasks: each task references at least one R-###

#### Phase Exit Criteria

To advance phases, enforce minimal exit gates:

- `/specify` exit: All core WHAT statements converted into numbered `R-###`; out-of-scope section filled; assumptions captured.
- `/clarify` exit: Zero `[NEEDS CLARIFICATION]` markers remain. Each former marker either (a) became an `R-###`, or (b) was explicitly dropped with a rationale note.
- `/plan` exit: Each `R-###` referenced at least once; risk/complexity annotated; high-risk items flagged for research if needed.
- `/checklist` exit: Generated checklist asserts: no ambiguous wording, no orphan requirements, all acceptance criteria present where applicable.
- `/tasks` exit: 100% requirement coverage; dependencies expressed; parallelizable tasks marked `[P]`; critical path identifiable.
- `/analyze` exit: Drift report clean (no mismatch between spec, plan, tasks); contract references exist for external interfaces.
- `/implement` exit (to SHIPPED): All tasks complete; all R-### verified; quickstart scenario passes.

#### Mandatory Artifact Activation Rules

Artifacts become REQUIRED based on triggers:

- `research.md`: At least one requirement tagged high risk, novel integration, or performance uncertainty.
- `data-model.md`: Any persistence/schema/change or new entity introduction.
- `contracts/`: External API/interface/event to be consumed outside immediate module; version when first stabilized.
- `quickstart.md`: BEFORE entering IMPLEMENTING; must describe minimal runnable path & reference a test.

#### Task Metadata Schema (`tasks.md`)

Each task line or block MUST include at minimum:

```
T-### | R: R-001,R-002 | Type: build|test|refactor|research | Effort: S|M|L | Flags: [P] [BLOCKED?] | Depends: T-00X,T-00Y
```

Conventions:

- `[P]` indicates safe parallel execution (no shared mutable design dependency).
- `Type` clarifies intent for later analytics.
- `Effort` is a relative sizing (S ≤0.5d, M ≤1d, L >1d).
- A task with unresolved dependency cannot be marked `[P]`.

#### Analyze Phase Deliverable (`analysis.md`)

If drift or mismatch detected, create `analysis.md` containing:

```
Unmapped Requirements: R-### (reason)
Unreferenced Tasks: T-### (candidate removal or merge)
Contract Coverage: list of external interfaces & contract file paths
Scope Changes Since Version <prev>
```

Advance to IMPLEMENTING only if `Unmapped Requirements` = 0 and `Unreferenced Tasks` = 0.

#### Contracts Activation & Versioning

When an API/event/interface first stabilizes, create `contracts/<domain>-v1.md` with:

```
Contract-Version: 1.0
Linked-Requirements: R-002,R-005
Change-Policy: backward-compatible until major version bump
```

Increment `Contract-Version` only when breaking changes introduced; update referencing tasks.

#### Quickstart Content Minimum

`quickstart.md` must include:

1. Title & feature summary
2. Preconditions (environment, seed data)
3. Minimal end-to-end scenario steps
4. Reference to automated test (e.g., path `tests/<spec-id>/quickstart.spec.ts`)
5. Expected observable outcomes

#### Clarification Resolution Workflow

Use marker: `[NEEDS CLARIFICATION: <short label>]` during `/clarify`.

- Resolution outcomes:
- Converted: Replace marker with R-###
- Dropped → Replace marker with `~~[DROPPED: <reason>]~~` and list under a "Dropped Clarifications" section.

#### Deprecation Path

To deprecate a spec:

1. Set `Status: DEPRECATED` in metadata block.
2. Add `Deprecation-Rationale:` and migration notes.
3. Archive or remove tasks not executed; mark remaining tasks as canceled.
4. If contracts affected, add a deprecation note in each contract file.

#### Validation Aids (Optional but Recommended)

Agents SHOULD (when possible) auto-check:

- All artifacts contain a metadata block.
- Each `R-###` found in spec also appears in plan & tasks.
- Each R-### found in spec also appears in plan & tasks.
- No task missing `R:` mapping.
- Phase advancement only after exit criteria satisfied.

If a validation fails, halt and insert a reminder rather than guessing missing content.
