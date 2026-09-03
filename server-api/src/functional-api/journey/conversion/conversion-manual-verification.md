# Manual verification — L1→L0 promotion keeps the flow (client-web#9528) on ACC

Companion to [conversion-test-plan.md](./conversion-test-plan.md): the step-by-step script for the
four rows the plan routes to manual verification (M-1..M-4). Automation covers the API-level
carry-over (U-1/U-2, NC-1..NC-3); these rows cover what only the UI or a real template can show.

Story: client-web#9528 · fix server#6418 · Release 74 (alkem-io/alkemio#2111). Environment:
**https://acc-alkem.io**, server `v0.164.0` with migration `1787788800000-InnovationFlowStateBounds1To8`
applied. M-2 is the Release 74 checklist row *"Apply a 2-state template to an L0 Space with callouts in
phases 3 and 4 — confirm where they land"* (R-22, product-approved 02.09).

Record results per row (PASS/FAIL + date + evidence) in the release story or the QA sign-off note.
UI labels below follow the story/PR wording; expect minor label drift.

| # | Scenario | Priority | Severity if it fails | Blocker |
|---|---|---|---|---|
| M-1 | Promotion carries the L1's phases verbatim: names, descriptions, order, current phase, sidebar; no platform defaults appear | **High** | High (the original bug) | ⛔ |
| M-2 | Applying a 2-state template to an L0 replaces all phases; callouts in phases 3 and 4 are re-homed, not lost (R-22) | **High** | High (callout loss) if a callout disappears; the phase replacement itself is approved behaviour | ⛔ on loss |
| M-3 | A 2-state template is accepted on an L0 (minimum dropped 4 → 1) | Medium | Medium | — |
| M-4 | A 9-state template is rejected atomically; the phase list is unchanged | Medium | Medium | — |

---

### M-1 — Promotion walk: custom phases, non-first current state, sidebar config

1. On ACC, open (or create) an L0 space you can freely modify, and inside
   it an L1 subspace.
2. In the L1 subspace, open **Settings → Flow** (the innovation-flow /
   phases editor). Rename at least 3 phases to clearly artificial names not
   used anywhere else on the platform, e.g. `QA-Phase-Alpha`,
   `QA-Phase-Beta`, `QA-Phase-Gamma`, each with a distinct description text
   (e.g. `qa-desc-alpha`, `qa-desc-beta`, `qa-desc-gamma`). Record the exact
   names, descriptions, and their left-to-right order as shown in the editor.
3. For `QA-Phase-Beta`, open its sidebar/layout configuration and
   deliberately select 1-2 sidebar widgets that are NOT the platform
   defaults (e.g. Events + Guidelines). For `QA-Phase-Gamma`, deliberately
   clear its sidebar to none. Record which widgets you set for each.
4. Set the space's **current phase** to `QA-Phase-Beta` (not the first
   phase) — via whatever UI lets you select the active phase (the phase
   tabs at the top of the subspace, or the flow editor's "set as current"
   action). Record which phase shows as highlighted/active before you
   proceed.
5. Promote the subspace: find the "..." / actions menu on the subspace card
   or its settings, choose **Convert to Space** (or the equivalent
   promote-to-L0 action). Confirm the conversion.
6. On the resulting L0 space, open its phases view (top-level tabs or
   Settings → Flow).
7. **Record and compare against step 2-4:**
   - The phase names/order shown are exactly `QA-Phase-Alpha`,
     `QA-Phase-Beta`, `QA-Phase-Gamma` (plus any other phases you had) in
     the same left-to-right order — record PASS/FAIL and a screenshot if
     any name/order differs.
   - **None** of the platform defaults (`Home`, `Community`, `Subspaces`,
     `Knowledge`) appear anywhere in the new space's phase list — record
     PASS/FAIL explicitly; this is the exact symptom of the original bug.
   - The descriptions match what you set in step 2 — open each phase and
     compare the description text verbatim.
   - The **currently active phase** on the new L0 space is `QA-Phase-Beta`
     — record which phase is shown as active/highlighted.
   - `QA-Phase-Beta`'s sidebar still shows exactly the widgets you set in
     step 3 (not the platform default sidebar for a new phase).
   - `QA-Phase-Gamma`'s sidebar is still empty — no widget has been added
     to it automatically.

### M-2 — R-22: apply a 2-state template to an L0 with callouts in phases 3 and 4

1. On ACC, use (or create) an L0 space with its default 4 phases intact
   (Home, Community, Subspaces, Knowledge — or whatever the current
   platform default names are).
2. Add one callout to phase 3 (`Subspaces`) and one callout to phase 4
   (`Knowledge`) — e.g. via "Add callout" from within each phase tab so its
   classification is unambiguous. Record each callout's exact title and
   which phase you placed it in.
3. Create (or reuse) a Space Template whose flow has exactly **2** states,
   with names that do not match any of the target L0's 4 phase names —
   e.g. via **Settings → Templates → Create from this space** on a
   different, 2-phase space, or by trimming an existing template to 2
   states in the template editor.
4. On the target L0 space, go to **Settings → Layout / Templates → Apply
   template** and apply the 2-state template you built in step 3. Confirm
   the apply.
5. **Record:**
   - The L0's phase list now shows exactly the 2 template phase names —
     none of Home/Community/Subspaces/Knowledge remain (record PASS/FAIL —
     this is the R-22 behaviour change; previously the first 4 would have
     been kept).
   - Locate both callouts from step 2 (search or scroll each of the 2 new
     phases). Record **which of the 2 new phases each callout landed on**
     — this is the "where do they land" oracle the release checklist asks
     for; there is no expected "correct" phase beyond "some valid phase of
     the new flow" — record the actual observed phase per callout as the
     evidence artifact for the release story.
   - Neither callout is missing/deleted — both must still be visible and
     openable somewhere in the space.

### M-3 — Sub-4-state L0: create/apply a 2-state template and confirm it's accepted

1. On ACC, start creating a brand-new L0 space (Settings → New Space, or
   the platform's "create space" flow) and choose the 2-state template
   built in M-2 step 3 (or build a fresh one) as its starting template, if
   the creation flow offers a template choice; otherwise create the space
   normally then immediately apply that 2-state template via **Settings →
   Layout → Apply template** as in M-2 step 4.
2. **Record:** the operation completes without a validation error (no "must
   satisfy the required minimum" or similar rejection dialog) — this is the
   headline bound-removal behaviour (L0 minimum dropped from 4 to 1). Note
   the exact resulting phase count and names.

### M-4 — Upper bound: a 9-state template is rejected atomically

1. Build (or find) a Space Template with **9** flow states — extend an
   existing template in the template editor by adding phases one at a time
   until it has 9, or build a 9-phase donor space and snapshot it via
   **Settings → Templates → Create from this space**.
2. On any L0 space (reuse the one from M-2/M-3), attempt to apply that
   9-state template via **Settings → Layout → Apply template**.
3. **Record:**
   - The apply is **rejected** — a validation error is shown (referencing a
     maximum, e.g. "exceeds the maximum" or similar) and the operation does
     not partially complete.
   - Re-open the space's phase list afterward and confirm it is **unchanged
     from before the attempt** — no partial replacement occurred (the
     rejection must be atomic, not leave the flow in a mixed state).

---


---

## Sign-off summary

Record per row: **PASS / FAIL** · date · environment · evidence (screenshots of the phase list before
and after for M-1 and M-2; the observed landing phase per callout for M-2 is the release-story
artifact). M-1 failing in any of its sub-checks is the original defect and blocks the release; a
callout missing after M-2 is a data-loss blocker.
