# Test plan — create a subspace (L1, then L2) through the UI (W2 journey 3)

- **Source:** `docs/qa/server-rebuild/plan.md` § W2, ranked journey 3; client-net audit row C4 (create subspace L1 / L2), **ABSENT as a write** before this suite: every subspace in every runner came from `TestScenarioFactory`.
- **Suite:** `client-web/src/functional-e2e/subspace-create/` — nightly project **"Subspace create"**, tier `extended`.
- **Status:** executed live against `test-alkem.io` on 2026-10-30, twice (the second run proves teardown); also green on the local stack.

## Overview

The Space admin creates an L1 from the Space page and an L2 from the new L1's page, by name only. Each subspace must: open at its URL with its name as the page heading, be listed by its parent, read back from the server **through its parent** (`readSubspaceByNameId`, which proves the parent edge) with the right `level`, and be closed to a non-member of the private parent.

## Personas and data

| Persona | Kind | Role |
| --- | --- | --- |
| `space.admin` | harness | seeded admin + member of the L0; creates both subspaces |
| `non.space` | harness | not a member of the private L0 — negative control |

The L0 is seeded private through the lib with a run-unique name. The two subspaces are created in the browser with run-unique names (`W2 L1 <id>`, `W2 L2 <id>`). Teardown: `teardownScenario` → `deleteSpaceTree`, which reads the L0's subspace tree (`readSpaceSubspaceTree`) and deletes leaves first. This matters: the server refuses to delete a space that still has subspaces, and the factory's own cleanup only logs that refusal — found while building this suite, when a probe leaked an L0 that way.

## Navigation

- L1: `/<L0>` → tab **Subspaces** → Space sidebar **Create Subspace** → dialog **Create new Subspace** → Name → **Create Subspace** → lands on `/<L0>/challenges/<L1 nameID>`.
- L2: the L1 page → **SubSpace sidebar** › "Subspaces" → **Create** → the same dialog → lands on `/<L0>/challenges/<L1>/opportunities/<L2 nameID>`.
- The nameID is taken from the URL the browser lands on (the client derives it from the name).

## Cases

Techniques: **UC** use-case walk, **BVA**-style level boundary (L0 → L1 → L2, the deepest level), **EP** viewer partition, **NC** negative control.

| ID | Technique | Oracle | Status |
| --- | --- | --- | --- |
| S3-1 | UC | `createSubspace` answered clean; dialog closed; h1 = name; URL under `/<L0>/challenges/`; server: parent is L0, child level `L1`, display name as typed; the parent's Subspaces grid has a card linking to exactly that URL | automated, green |
| S3-2 | UC, BVA | the same through the L1 page; URL under `/<L0>/challenges/<L1>/opportunities/`; server: parent is L1, child level `L2`; the L1 sidebar links to it | automated, green |
| S3-3 | EP, NC | per subspace — admin (positive): page heading, `READ` in `myPrivileges`, read through the parent succeeds; non-member: "We are redirecting you..." dialog, no heading, the read through the parent refused with `FORBIDDEN_POLICY` | automated, green |

## Deliberately not covered here

- Subspace templates, avatar/banner upload, tags and description in the create dialog.
- A member creating a subspace when "Create Subspaces" is allowed: the toggle's effect on the member's view is journey 4 (`space-settings-write/us3-collaboration-toggles.spec.ts`, C4-3); the create itself by a member is not walked.
- Moving or deleting a subspace through the UI.

## Known defects

None found by this suite. Finding while building it (test-side, fixed here): `TestScenarioFactory.cleanUpBaseScenario` cannot remove an L0 that has subspaces it did not create, and does not fail when it cannot — the suite does not rely on it for spaces.
