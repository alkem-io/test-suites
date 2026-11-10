# Test plan — move a post to another phase, reorder posts, move a response (W2 journey 6)

> **Status:** Draft · **Depth:** Deep (authorization/visibility + the client-web ↔ server contract the rebuild replaces; classification-by-name is a likely redesign), capped at the journey: 7 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2 row 6; client-net audit rows E2, E6, E7 (also C7) and § 4 item 22

There is no diff. The basis is the plan, the audit, and product source read at client-web `origin/develop` @ `907103f5f` and server `origin/develop` @ `51eb90878`. In the CRD client a callout is a **Post** and a contribution is a **response**. Before this suite **no test at any level** changed a post's phase, reordered posts, or moved a response through the browser. `updateCalloutsSortOrder` has no caller in test-suites at all. The suite pins three server answers that the UI shows directly: a post's phase (its `FLOW_STATE` tag), its position (`sortOrder`), and the post a response belongs to. Each case checks what the user sees, does one read-back through a named `@alkemio/tests-lib` function, and checks a member's fresh view.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/callout-placement/
pnpm run test:nightly --project="Callout placement"     # registered, tier extended
pnpm -C ../server-api exec vitest run --project contract # LA-1/LA-2 shape cases (still in client-web)
```
- No env beyond the standard nightly. Each file seeds its own PUBLIC + OPEN L0 Space. `space.admin` and `space.member` join through the factory, so `KRATOS_ADMIN_URL` is needed as for journeys 1–4.
- Files are independent, and so are the cases inside a file. Each case reads the current phase names and order at its start, and never assumes an earlier case ran.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A post moved to another phase stays put, lands in no tab, or lands in the wrong one | Medium | High | **High** | FS-1 |
| R2 | Renaming a phase leaves its posts tagged with the old name, so they show in no tab (the legacy design joins posts to phases by display name) | Medium (rebuild) | High | **High** | FS-2 |
| R3 | A reorder is shown but not stored, or members see a different order | Medium | Medium | Medium | RO-1 |
| R4 | Reordering one tab disturbs the order or phase of posts in other tabs, or is refused because the client sends only that tab's ids | Medium (rebuild) | Medium | Medium | RO-2 |
| R5 | A plain member is offered, or allowed, the reorder actions | Medium (one SQL authorization verdict) | High | **High** | RO-3 |
| R6 | A moved response is lost, duplicated, or left in the source post | Medium | High | **High** | MC-1 |
| R7 | The author, or any non-admin, can move responses, or an admin cannot | Medium | Medium | Medium | MC-1 (admin), MC-2 |
| R8 | A Layout save that fails half-way leaves the phase and order inconsistent (sequential, non-atomic writes) | Low | Medium | Low | EXP-2 |

Elevated-risk triggers present: [x] authorization/visibility · [x] cross-repo contract (client-web ↔ server, the rebuild) · [ ] migration · [ ] breaking contract · [ ] infra/config · [ ] data-destructive (a wrong move only hides a response) · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `afbefaf2`. The commands are in `docs/qa-knowledge/coverage-map.md` › Callout placement. Every row below comes from a file that was opened.
- **A post's phase.**
  - `callout/transfer/transfer-callout-flow-state` and `-changed-flow` cover phase adoption on a **cross-space** transfer. That is full, and different from J6.
  - No spec changes the phase of an existing post (`updateCallout` with a classification), and none renames a phase that already holds posts: `-changed-flow` renames before the callout exists.
  - `default-template-per-flow-state` (#703) covers a phase's default template. It is not touched here.
  - `sidebar-widgets` S-07…S-13 cover reordering the **phase columns**, not posts.
- **Post order.** None at any level (0 hits for `updateCalloutsSortOrder` / "Move to Top" outside generated code). Server unit tests: `callouts.set.service.spec › updateCalloutsSortOrder`.
- **Moving a response.**
  - server-api `platform-roles` A9 `moveContributionToCallout` covers the effect plus gate negatives for platform roles. It runs on the manual runner, not nightly, as the resource admin, and API only.
  - Server unit tests (`callout.contribution.move.service.spec`) cover the same-set rule, the type rules and task boards.
  - No UI walk exists, and no case covers the space admin or the author.
- **Reuse.** 6 of 16 scenarios needed no new test: cross-space transfer state, phase-column order, active phase (API), default template per phase, the A9 resource-admin move, and the server-unit move rules. 3 are not automated (see gaps). 7 are covered by 7 new cases. **0 existing tests need updating.** These were confirmed unaffected: `default-template-per-flow-state`, `sidebar-widgets/subspace-us1-customize` and `-us6-flow-changes`, `callouts/0.4` and `0.7`, `public-space/non-member-tab-navigation`, and the platform-roles A9 group.

## Personas and data
`space.admin` (admin and member) acts; `space.member` is the viewer and the author of the responses. Each file gets one L0 Space (`w2-j6-<area>-<uid>`) with posts seeded through `createCalloutWithData`, each tagged into the first or the last visible phase. Phase names are read at run time, never hard-coded. Responses are seeded by `space.member` through `createContributionOnCallout`. Teardown is `teardownScenario` in a file-level `afterAll`. No persona is mutated.

## Scenario → test mapping
Techniques: **ST** state transition · **BVA** list position (first/last) · **DT** role × capability · **EP** viewer partition · **EG** error guess · **UC** use-case walk.

| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| FS-1 | Admin, Settings › Layout: Post actions › Move to › last phase, then Save changes | ST, EP | Row under the target column after reload. `readCalloutsPlacement`: the tag equals the target, and the post sorts after the destination's existing post. The member's target tab shows both in that order; the source tab shows the control post and not the moved one | `us1-post-flow-state.spec.ts` › FS-1 — admin moves a post to the last phase in Settings › Layout, and the member sees it there | UI + lib |
| FS-2 | Admin renames the last phase (Edit Details) | ST, EG | The seeded post's tag equals the new name. The member's tab with the new name lists it, and no tab carries the old name | `us1-post-flow-state.spec.ts` › FS-2 — renaming the last phase keeps its posts in it | UI + lib |
| RO-1 | Admin, post card › Settings › Move to Top on the lowest of three | BVA, EP | Boundary first: the tab's last post (found by stored order; a template post can be it) offers Move Up but not Move Down / Move to Bottom. Feed order updates in place and after reload. `sortOrder` strictly ascending in the new order. Member sees the same order | `us2-reorder-posts.spec.ts` › RO-1 — Move to Top on the lowest of three posts, stored and seen by the member | UI + lib |
| RO-2 | Admin › Move Down on the highest of three | BVA, EG | The read-back shows it is the tab's first post, and its menu offers Move Down but not Move to Top / Move Up. Adjacent swap in feed and read-back. A post in another phase keeps its exact `sortOrder` and tag. Member sees the swap | `us2-reorder-posts.spec.ts` › RO-2 — Move Down on the top post swaps it with the next and leaves other phases untouched | UI + lib |
| RO-3 | Member opens the same card menu | DT | Share is shown (positive control). No Move to Top/Up/Down/Bottom, Edit or Delete, read after the browser's `CalloutsSetAuthorization` answered | `us2-reorder-posts.spec.ts` › RO-3 — a member is not offered reorder, edit or delete on a post | UI |
| MC-1 | Admin edits the member's response, Post location › target post (in another phase), Save | UC, ST, EP | Target list offers both post-collecting posts, not the link-collection one. "Response moved successfully.". `readCalloutContributions`: gone from the source (the sibling stays), present in the target with the same id. The member sees it under the target with their name | `us3-move-response.spec.ts` › MC-1 — admin moves the member's response to a post in another phase | UI + lib |
| MC-2 | The author edits their own response | DT | `readPost` as the author: UPDATE held (positive control), MOVE_POST not. The Edit Post title is pre-filled (positive control). There is no "Post location" | `us3-move-response.spec.ts` › MC-2 — the author is not offered the move on their own response | UI |
| — | Cross-space transfer keeps or adopts the phase | — | — | `callout/transfer/transfer-callout-flow-state.it-spec.ts` | covered (API) |
| — | Phase column order, Layout | — | — | `sidebar-widgets/subspace-us1-customize.spec.ts` S-07…S-13 | covered |
| — | Platform resource admin moves a response | — | — | `platform-roles` › `A9.moveContributionToCallout` | covered (API, manual runner) |

DT matrix: admin shows the Move items (RO-1/2) and the Post location (MC-1); the member, who is also the author, sees neither (RO-3, MC-2).

### Regression guards
- **FS-1:** `updateCallout` ignores the classification, or stores a tag that matches no phase, so the post vanishes from every tab. A sort update dropped when it arrives together with a phase change shows as the wrong position.
- **FS-2:** pins the user outcome: after a phase rename the posts are still listed under the new name. The client also retags each post after the rename, so FS-2 does not isolate the server's own retag (`tagsetService.updateTagsetsSelectedValue`): it goes red only if both stop.
- **RO-2:** `updateCalloutsSortOrder` gets only the active tab's ids. A server that renumbers the whole set, or rejects a partial list, turns this red.
- **RO-3 / MC-2:** `UPDATE` on the callouts set, or `MOVE_POST`, granted to members or authors.
- **MC-1:** move is copy+keep, delete+create (new id, author lost), or a no-op.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Reorder by dragging rows inside a Layout column | **Manual/none.** Same `updateCalloutsSortOrder` contract as RO-1, through dnd-kit (harness: US2-AS3 flake) | client unit tests (`countLayoutChanges`, `layoutMapper`) |
| Sort responses inside a post (Sort contributions dialog) | **Out of J6** (E6 is posts). Drag-only dialog, `updateContributionsSortOrder` untested at any level | follow-up case, P3 |
| Move a whiteboard / link / memo response | **No UI.** Only the post response dialog has Post location; the server supports all types | ruling R-5 |
| Member calls `updateCalloutsSortOrder` / `moveContributionToCallout` / `updateCallout` (phase) directly | Pure API negatives do not belong in Playwright (audit § 2.8) | server-api `callout/`; W1 callout behaviour doc |
| Cross-set or wrong-type move refused | Unreachable from the UI (the list is same-set and POST-only) | server unit tests; W1 |
| Moved response keeps the **source** post's authorization (no policy reset in the move path) | Unproven premise; needs a draft target to observe | EXP-1, below |
| Partial Layout save | Needs fault injection | EXP-2, below |

**Charters.** *EXP-1 (30 min):* move a response into a **draft** post, then, as a member, open the response's old and new URLs. *EXP-2 (30 min):* throttle the network and kill the tab mid-save in Layout with a phase move plus a reorder; check what members see.

**Non-functional.**
- *Performance:* a phase rename retags every post twice (the client cascade plus the server cascade), one request per post. Not measured, and no case. Flag it for a phase with more than 50 posts.
- *Security:* RO-3 and MC-2 cover the UI gates; the API negatives belong to server-api (gap row).
- *Reliability:* Layout writes are sequential and non-atomic (EXP-2).
- *Accessibility:* the **Post location select has no accessible name** (the `<Label>` is not linked), and the Layout row menu is invisible until hovered or focused. Both are recorded in R-6.
- *Compatibility:* desktop 1920×1080 only. The Layout phase columns wrap on narrow screens.

## Open rulings for the lead (Comoque1)
| # | Question | Provisional default |
|---|---|---|
| R-1 | A post moved with Layout › Move to lands **last** in the destination phase. Is that intended? | yes; FS-1 asserts it; rebaseline item |
| R-2 | Is "posts follow a renamed phase" (FS-2) part of journey 6, or C7? | in J6, P1 |
| R-3 | Is moving a response admin-only, with the author unable to move their own? | yes; MC-2 asserts it |
| R-4 | Is the partial-list reorder (only the active tab's ids, renumbered from the subset's minimum) the contract the rebuild must keep? | yes; RO-2 pins it |
| R-5 | Is the missing move UI for non-post responses a product gap or intended? | intended for now; no case |
| R-6 | Should the unlabelled Post location select be filed as a client-web a11y defect? | file it (minor); the locator does not depend on it |
| R-7 | The client gates on `MOVE_POST` (post) and the server checks `MOVE_CONTRIBUTION` (contribution). Is that one capability for the rebuild? | treat as one; rebaseline item |

**Rebaseline register:**
- Menu and UI labels: Move to Top / Move Up / Move Down / Move to Bottom, Post actions › Move to, Edit Details, and the toast "Response moved successfully."
- Model semantics: the phase is the `FLOW_STATE` tag equal to the state's display name; ascending `sortOrder`; new posts are created at the top (min − 1).
- Privileges: `MOVE_POST` / `MOVE_CONTRIBUTION`.

**What this proves, and what it does not.** When green, the suite proves this on the deployed stack:
- an admin's browser can put a post in another phase, rename that phase, reorder posts, and move a response to another post;
- the server stores each of those changes;
- a member's fresh session sees each one;
- a member, including a response's author, is not offered the reorder or the move.

It does **not** prove:
- that the server refuses those writes when a member calls them directly (server-api);
- drag-and-drop reordering, or response sorting;
- what happens to a moved response's access rules.


## Build notes (2026-11-09)

Built on the operator's go-ahead with every ruling at its provisional default (R-1…R-7). The plan status is unchanged: a human sets it.

**Files.** `callout-placement.helpers.ts`, `us1-post-flow-state.spec.ts` (FS-1, FS-2), `us2-reorder-posts.spec.ts` (RO-1, RO-2, RO-3), `us3-move-response.spec.ts` (MC-1, MC-2). Lib: `readCalloutsPlacement` (LA-1), `TagsetReservedName` (LA-2) and `readPost` (LA-3, added by the QA challenge), with the contract entries in `lib-contract.it-spec.ts`. Registered as the nightly project `Callout placement`, tier `extended`.

**Deviations from the build sheet.**
- `expectMutationAnswered` appends the `(` itself, so the specs pass `updateCallout`, `updateCalloutsSortOrder`, `updateInnovationFlowState` and `moveContributionToCallout` without it. The sheet's `'updateCallout('` waits for a request that never matches and times out. `updateCallout` + `(` still does not match `updateCalloutsSortOrder(`.
- The Layout save sends `UpdateCalloutFlowState` (field `updateCallout`) then one `UpdateCalloutsSortOrder` per column whose list changed, as the sheet said.
- FS-2 opens the dialog through `Column actions` › `Edit Details`, not the pencil. A column holds two buttons named `Edit Details` (the title pencil and the description pencil), so the pencil is ambiguous.
- `postCard` matches the heading with `page.getByRole`, not `calloutHeading`: a `has` filter is resolved inside each card, and `calloutHeading` is rooted in the feed region.
- The contract shape case also asserts that the seeded post is in the placement list, so the list cannot be empty and pass.
- Local runs used `PW_BROWSER=chromium` (no branded Chrome on the machine) against the local `develop` stack. test-alkem.io (nightly config): 7/7 in two runs on 2026-11-09 and again in two runs on 2026-11-10 after the review fixes, with no Space, organisation or user left behind.

**Red-proof (each oracle made to fail once, then restored).**

| Case | Mutation | Failed at |
|---|---|---|
| FS-1 | read-back expects the moved post in the first phase | the placement poll (`toEqual`, phase of P) |
| FS-2 | read-back expects the old phase name | the placement poll (`toBe`: expected the old name, received the new one) |
| RO-1 | in-place assertion expects the unchanged order | `seededHeadings` `toHaveText` (the feed had already reordered in place) |
| RO-2 | K's `sortOrder` expected to move by one | `toBe` on K's `sortOrder` (-3 vs -4) |
| RO-3 | run as the admin | `Move to Top` `toHaveCount(0)` (received 1) |
| MC-1 | read target for a fresh id | `toEqual` on the target's contributions |
| MC-2 | open the dialog as the admin | `Post location` `toHaveCount(0)` (received 1) |

**Product observations.**
- RO-1: the feed reorders in place, before any reload, so the possible client defect (reorder only after reload) did not reproduce.
- No product defect was found.

## QA challenge (2026-11-10)

Challenged on the local stack (server `51eb90878`, client-web `907103f5f`, chromium, headless). Every original oracle went red under an independent sabotage. Two findings were fixed test-side. No assertion was loosened.

- **MC-2's absence check could pass too early.** "Post location" renders only when the author holds `MOVE_POST` **and** a second query, the sibling posts, has answered. That query runs after the `PostSettings` query that fills the title, so the pre-filled title does not prove the section has had its chance to render. Opened as the admin, the "Post location" `toHaveCount(0)` passed. Only the combobox check, a few milliseconds later, went red. Fix: `readPost` (LA-3) reads the author's privileges on the response's post first. UPDATE must be held (positive control) and MOVE_POST must not. The page checks stay as the user-visible half.
- **BVA was labelled but not implemented.** RO-1 and RO-2 never asserted a list boundary. RO-2 now checks, through the read-back, that its post is the tab's first, and asserts Move to Top / Move Up absent next to Move Down. RO-1 finds the tab's last post by stored order (on a default L0 it is the template post "Welcome") and asserts Move Up shown, Move Down / Move to Bottom absent.
- Red-proof of the new oracles: the read-back as the admin fails `not.toContain('MOVE_POST')`. The "last post" taken as the lowest seeded post fails on `Move Down`. The "first post" menu read on the second post fails on `Move to Top`.
- Minor findings, also fixed: MC-1's target read-back compares the whole list, so a duplicated response goes red. RO-3 no longer waits for two animation frames; the `CalloutsSetAuthorization` response and the Share control already prove the menu has rendered. The LA-1 negative control asserts its two conditions separately, with the error in the failure message, and rejects a transport failure. The FS-2 regression guard no longer claims to isolate the server's retag. The coverage-map row for innovation-flow transitions keeps its *Where* and *Established* cells.
