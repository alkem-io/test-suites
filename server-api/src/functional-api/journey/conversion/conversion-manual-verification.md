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

## Verification log

### 2026-09-03 · ACC (acc-alkem.io) · QA lead, hands-on

| Row | Result | Evidence |
|---|---|---|
| M-1 promotion walk | **PASS** | L1 with **3** states, renamed phases, distinct descriptions, and a non-first current phase promoted to L0: names, order, descriptions and the current phase carried over verbatim; no Home/Community/Subspaces/Knowledge defaults. Sidebars on every tab show the generic stored set — Intent ("info block"), Add Post, Search, Post Index (Apply button hidden for a member) — i.e. the L1's stored lists, not the L0 per-tab defaults. Note: an L1 offers no sidebar editor (055 ruling), so the "configure widgets on the L1" sub-step was dropped; the generic-set carry-over is the oracle. The resulting L0 has **3 phases** — below the former L0 minimum of 4 — so this walk also evidences the lowered bound (1..8) on the promotion path; M-3 covers the template path |
| M-2 R-22 template apply | **NOT EXECUTABLE VIA UI on an L0 — covered by API (NC-3)** | The client renders the *Replace innovation flow* button only for subspaces (`CrdSpaceSettingsPage.tsx`: `level !== 'L0' ? <LayoutReplaceFlowConnector …>`, present on `develop` and in the R74 client `v0.163.0`); an L0's Layout tab shows only *Add tab* and the phase list. server#6418 lifted the server-side restriction; the client did not follow — **confirmed with the implementing developer on 2026-09-03: an L0 template-apply button was never a requirement of client-web#9528** — the story is about promotion keeping the L1's flow; the server-side bound change is what makes L0 template application *possible*, not a feature that was asked for. The R-22 behaviour (wholesale replacement + callouts re-homed onto a valid phase) is proven by `apply-template-l0-wholesale-replace.it-spec.ts` (5/5 locally, PR #629). Release note: R-22 cannot happen through the product UI in R74 — only via the API — which also caps its user-facing risk. Exposing it for L0 would be a new product request, not a follow-up defect |
| M-3 lower bound | **PASS** | Executed via the template path: a Space template created from an L1 with **2** unique phases and 1 callout, then a new **L0 created from that template** — accepted with no minimum-phases error; the L0 came up with the 2 phases and the callout intact. Together with M-1 (a 3-phase L0 via promotion) both user-reachable routes to a sub-4-phase L0 are confirmed |
| M-4 upper bound | **Not reachable via UI on an L0** (same guard); the 1..8 bound is unit-proven in server (`innovation.flow.service.spec.ts`) and can be exercised on a **subspace** through the same dialog if desired | Optional: on a subspace, *Replace innovation flow* with a 9-phase template → expect rejection and an unchanged phase list (same bounds code path) |

### Automated evidence (local compose stack carrying server#6418, QA lead, 2026-09-03)

| Run | Result |
|---|---|
| Full `journey/conversion/` directory, `nightly` project, serial | **26 files passed, 203 tests passed, 1 pre-existing skip**, 11.9 min — includes the corrected `convert-L1-to-L0-basic` (20/20), the new `convert-L1-to-L0-flow-states` (4/4) and `apply-template-l0-wholesale-replace` (5/5) |
| `callout/transfer/` specs sharing the widened flow-state fragment | 38 passed, 4 pre-existing skips (implementer's run) |

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
3. Sidebar: **nothing to configure on an L1** — subspaces store a sidebar list per
   phase but never render a sidebar and hide the Layout editor (055 ruling: "store
   only"). Their phases therefore carry the stored *generic* default list
   (`intent, createPost, applicationButton, search, index`). That is the oracle:
   after promotion, every tab must show that generic set, not the L0 per-tab
   defaults. (An explicitly empty sidebar surviving promotion is covered by the
   API case NC-2.)
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
   - **Sidebar (carry-over oracle):** on every tab of the new L0 the sidebar shows
     the **generic** set — Intent, Add Post, Apply button (hidden for members),
     Search, Post Index — and **none** of the L0 per-tab defaults (no About,
     Subspace links, Events, Updates on tab 1; no Contact leads, Add user,
     Virtual contributors, Guidelines on tab 2). Any of those appearing means the
     promotion re-stamped L0 defaults. Optional cross-check: the promoted L0's
     Settings → Layout dialogs (now visible) list the same generic set for every
     phase.

### M-2 — R-22: apply a 2-state template to an L0 with callouts in phases 3 and 4

1. On ACC, use (or create) an L0 space with its default 4 phases intact
   (Home, Community, Subspaces, Knowledge — or whatever the current
   platform default names are).
2. Add one callout to phase 3 (`Subspaces`) and one callout to phase 4
   (`Knowledge`) — e.g. via "Add callout" from within each phase tab so its
   classification is unambiguous. Record each callout's exact title and
   which phase you placed it in.
3. Create (or reuse) a Space Template whose flow has exactly **2** phases, with
   names that do not match any of the target L0's phase names. Quickest route:
   in any Space create a subspace, trim its phases to two on its **Settings →
   Layout** tab, then **Save as Template** from the subspace's menu — it then
   shows under *This space* in the picker.
4. On the target L0: **Settings → Layout → "Replace innovation flow"**. In the
   *Apply new template* dialog pick the 2-phase template and choose **"Replace
   flow without adding template Posts"** (NOT "Replace with new flow", which
   deletes the existing posts and defeats the check). Confirm.
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
   Layout → "Replace innovation flow"** as in M-2 step 4.
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
   9-state template via **Settings → Layout → "Replace innovation flow"**.
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
