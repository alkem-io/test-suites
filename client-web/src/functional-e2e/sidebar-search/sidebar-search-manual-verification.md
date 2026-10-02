# Manual verification — sidebar search widget (055) on ACC

Companion to [sidebar-search-test-plan.md](./sidebar-search-test-plan.md): the step-by-step script
for verifying the search sidebar widget on the **acceptance** environment before Release 74 ships.
Written for hands-on execution because the shared test environment has no search backend
credentials configured, so the widget cannot be exercised there by automation.

Story: client-web#10167 · workspace#055 · Release 74 (alkem-io/alkemio#2111) ·
shipped by server#6448 + client-web#10253 + #10256.

Record results per scenario (pass/fail + date + environment) in the release story or the QA
sign-off note. Scenarios marked ⛔ are release blockers when they fail.

---

## Before you start

**Environment:** `https://acc-alkem.io` running server `v0.164.0` and client-web `v0.163.0` with
migration `1788200000000-AddSearchSidebarWidget` applied (server deploys first, then the migration
Job, then the client — SV-5 is only meaningful after all three).

**Accounts and data:**
- An account that **administers** a top-level Space that **existed before the deploy** (an
  "upgraded" Space) with the four default tabs (Home, Community, Subspaces, Knowledge) and at
  least **12 posts** containing a common word (e.g. `report`) so a search returns more than one page.
- The same account will create **one brand-new** top-level Space during SV-5.
- A **second account that is not a member** of that Space, and a **private/incognito window**
  for anonymous checks.
- For SV-6 you need a **draft (unpublished) callout** in the Space carrying a unique tag, e.g.
  `secret-tag-055`, that no published callout uses.

**Reading network evidence.** Open DevTools → **Network**, filter on `graphql`, tick
**Preserve log**. Every relevant call is a POST to `/api/private/graphql`
(the web client uses that route signed in **and** signed out; ignore the `wss://…/graphql`
subscription row). Click a row → **Payload** → read `operationName`.
Only two operations matter:
- `FlowStateSearch` — one search request from the widget.
- `CalloutsSetTags` — the tag list loaded for the widget's chips.

Right-click the Network toolbar's clear button (🚫) before each scenario so counts start at zero.

---

## Verification log

### 2026-09-03 · ACC (acc-alkem.io) · QA lead, hands-on — all 15 scenarios executed

| Scenario | Result | Evidence |
|---|---|---|
| SV-1 keystroke burst (R-17 gate) | **PASS** | Five fast keystrokes → at most 2 `FlowStateSearch`; label quotes the term searched |
| SV-2 count convergence (R-17 gate) | **PASS** | `N+` while paging, exact `N` equal to the rendered cards after the last page |
| SV-3 literal terms (R-17 gate) | **PASS** | `{{matches}}`, `<b>bold</b>`, `{{count}}` rendered verbatim; no substitution, no dialog |
| SV-4 search on every tab, KB content row gone, one field per page | **PASS** | |
| SV-5 sidebar positions (R-16) | **PASS** | Search directly after the last create button on every tab as rendered for a member (Apply button hidden); stored order on Knowledge `…, applicationButton, search, index` confirmed |
| SV-6 draft callout's tag hidden from anonymous / non-member (R-12) | **PASS** | Tag absent from the chips and from the `CalloutsSetTags` response for both viewers |
| SV-7 tag-query load (R-12) | **PASS** | L0 Space, 8 tabs: 7 × `CalloutsSetTags`, one per tab load, **194–251 ms**, responses 190–394 B; no loops. ACC data is smaller than production — the post-deploy 24 h p95 watch on the release checklist still stands |
| SV-8 emptied sidebar (R-13) | **PASS** | No search anywhere on the emptied tab, zero search/tag requests while removed, re-adding Search restores it |
| SV-9 clear / chips | **PASS — UX suggestion** | Text + chip filter together; the X clears both (US1-AS4). A chip left selected after removing the text folded behind `+13` and was only visible on opening it — raised as [client-web#10267](https://github.com/alkem-io/client-web/issues/10267) |
| SV-10 12-word sentence + 10 tags | **PASS** | No term-limit error; one joined term plus the tags |
| SV-11 no cross-Space leak | **PASS** | Positive control in B found; A returns 0 |
| SV-12 new tab gets Search by default | **PASS** | |
| SV-13 mobile drawer / desktop state | **PASS** | |
| SV-14 live region / focus | **PASS** | Known pre-existing closed-drawer focus issue, non-blocking |
| SV-15 whiteboards | **FAIL — pre-existing regression, not 055** | Text drawn inside a whiteboard is not returned on any search surface since server#6193 (`v0.163.0`, Release 73, already in production): the ingest dropped the Excalidraw text path when the scene moved to a Yjs snapshot; memos kept a searchable derivation, whiteboards did not. Raised as [server#6457](https://github.com/alkem-io/server/issues/6457). Title/description/tag matches still fold into the callout correctly |

No other findings. The R-17 hard gate (SV-1..SV-3) is discharged; SV-5 and SV-7 are the named
Release 74 checklist items and are pasted there.

---

## Scenario list

| # | Scenario | Priority | Severity if it fails | Release risk | Blocker |
|---|---|---|---|---|---|
| SV-1 | Keystroke burst yields 1–2 search requests, not one per key | **High** | Critical (backend flood on anonymous traffic) | R-17 | ⛔ |
| SV-2 | Match count converges after scrolling to the last page | **High** | High (paging deadlock, count never settles) | R-17 | ⛔ |
| SV-3 | Markup-shaped terms render literally | **High** | High (label corruption / injection-shaped copy) | R-17 | ⛔ |
| SV-4 | Search field on every tab; the Knowledge Base content row is gone; only one field per page | **High** | High (a tab with no search, or two fields) | R1 / AC1 / AC3 | ⛔ |
| SV-5 | Search sits at the ruled position on tabs 1–4, on an upgraded Space **and** a fresh one | **High** | Medium (rule implemented twice; only execution-based evidence there is) | R-16 | ⛔ if the two Spaces differ |
| SV-6 | Anonymous and non-member viewers never see a draft callout's tag | **High** | High (authorization leak through the tag list) | R-12 / FR-017 | ⛔ |
| SV-7 | Exactly one tag request per tab load when signed out, durations recorded; none on a subspace | **High** | Medium (platform-wide load on day one) | R-12 | escalate if > 1 s |
| SV-8 | An emptied sidebar has no search anywhere; re-adding the widget restores it; zero search/tag requests while removed | Medium | Medium (capability loss with no in-product hint; it is ruled intentional) | R-13 / TC-10 | — |
| SV-9 | Clear (X) restores the browse feed; tag chips filter; text + tag combine | Medium | Medium (core interaction) | AC1 | — |
| SV-10 | A 12-word query with 10 tags searches without a term-limit error | Medium | Medium (the widget's real request shape) | AC2 | — |
| SV-11 | A search in Space A never returns Space B's post (positive control in B) | Medium | High (cross-Space leak) | R7 | ⛔ |
| SV-12 | A newly added tab gets Search by default | Medium | Medium | R1 / R2 | — |
| SV-13 | Mobile drawer and desktop sidebar share one search state | Medium | Low | MAN-5 | — |
| SV-14 | Live-region announcement and keyboard focus | Low | Low (known pre-existing focus defect) | MAN-5 | — |
| SV-15 | Whiteboards are found by **title, description, or tag** and fold into their callout; drawing **content** is out of scope by design | Medium | Medium if title/tag search fails; drawing text is not a defect | AC2 | ⛔ only for title/tag |

---

## SV-1 — Keystroke burst → at most 2 search requests (⛔, R-17)

**Where:** the upgraded Space, **Home** tab, signed in.

1. Clear the Network log.
2. Click into the sidebar search field (placeholder **Search posts...**).
3. Type `clima` as **five fast keystrokes**, less than 300 ms apart (just type the word at normal
   speed without pausing), then stop typing.
4. Wait two seconds.

**Expect:**
- **1 or 2** `FlowStateSearch` POSTs in the log. Two is correct only when the first page came
  back short (the one allowed "confirmation" request). Three or more is the uncapped-confirmation
  regression → ⛔.
- Never five (one per keystroke): that means the debounce is gone → ⛔.
- The gray summary label under the field quotes the term actually searched: **`"clima"`**, not
  `clim` or `climate`.

**Evidence to record:** number of `FlowStateSearch` rows; the label text.

---

## SV-2 — Count converges after the last page (⛔, R-17)

**Where:** same tab.

1. Clear the field with its **X**.
2. Type a term that matches **more than 10 posts** (e.g. `report`). Wait for results.
3. Read the label: it should say **`N+ items related to "report"`** (a plus sign, meaning more
   pages exist).
4. Scroll the result list to the very bottom, and keep scrolling until no more cards load.
5. Count the result cards on screen.

**Expect:**
- The label settles to an **exact** `N items related to "report"` with no plus sign.
- `N` equals the number of cards you counted.
- A label still reading `N+` with no more cards loading is the paging deadlock → ⛔.
- The count must not inflate when a callout has several matching contributions (results are
  folded per callout); if `N` is larger than the card count, note it → ⛔.

---

## SV-3 — Markup-shaped terms render literally (⛔, R-17)

**Where:** same tab.

1. Clear the field. Type exactly: `{{matches}}`
2. Read the label.
3. Clear the field. Type exactly: `<b>bold</b>`
4. Read the label. Watch for any JavaScript dialog.
5. Clear the field. Type exactly: `{{count}}`
6. Read the label.

**Expect:**
- `0 items related to "{{matches}}"` — the braces shown verbatim. A **number** where you typed
  the braces is the re-interpolation defect → ⛔.
- `<b>bold</b>` appears as literal text: **no bold rendering, no dialog** → otherwise ⛔.
- `{{count}}` shown verbatim as well (this is the interpolation key the live copy actually uses,
  so a regression would hit it first).

---

## SV-4 — Search on every tab; Knowledge Base content row gone; one field per page (⛔)

**Where:** the upgraded Space, signed in as a member.

1. Open **Home**. Confirm the sidebar shows a search field with placeholder **Search posts...**.
2. Repeat on **Community**, **Subspaces**, **Knowledge**.
3. On **Knowledge**, look at the **content area** (the column with the posts). There must be
   **no** search field or tag filter there anymore.
4. On each tab, press `Ctrl+F` (browser find) for `Search posts` and confirm it finds exactly
   **one** match.
5. On any tab, type `report`, wait for results, then click the label's **X**.

**Expect:**
- A search field in the sidebar on all four tabs.
- No in-content search row on Knowledge (AC3).
- Exactly one search field per page. Two means the old row came back or the widget mounted
  twice → ⛔.
- After the X: the field is empty, the label is gone, and the normal browse feed (the posts as
  they were before searching) is back.

---

## SV-5 — Sidebar positions, upgraded Space vs fresh Space (⛔ if they differ, R-16)

The placement rule exists twice: in TypeScript for new Spaces and in migration SQL for existing
ones. Nothing in CI binds them. This scenario is the only execution-based check.

**Part A — the upgraded Space.** Walk tabs 1–4 and read the sidebar widgets **top to bottom**.

| Tab | Expect Search to sit… | Stored index (from 0) |
|---|---|---|
| 1 Home | immediately **after** `Add Post` | 3 |
| 2 Community | immediately **after** `Add Post` | 2 |
| 3 Subspaces | immediately after the last of `Create Subspace` and `Add Post` | 3 |
| 4 Knowledge | immediately **before** `Post Index`; stored after the **Apply** button | 3 |

Stored lists (read from a fresh Space on the same server build):

```
tab 1  intent, about, createPost, search, applicationButton, subspaceLinks, events, updates
tab 2  intent, createPost, search, applicationButton, contactLeads, addUser, virtualContributors, guidelines
tab 3  intent, createSubspace, createPost, search, applicationButton
tab 4  intent, createPost, applicationButton, search, index
```

**Read the visual order with care.** Widgets render only when they apply to the viewer: the
**Apply** button (`applicationButton`) is hidden for members and admins, so as a member you will see
Search *directly after Add Post on every tab, including Knowledge* — that is correct. To verify the
**stored** order (the thing R-16 is about) use either:
- Space Settings → **Layout** → the phase's Layout dialog, which lists every widget regardless of
  rendering. Expect **Search** listed exactly where the table above puts it — on Knowledge, after
  *Application button* and before *Post Index*; or
- view the Knowledge tab as a **non-member** (or signed out on a public Space): with the Apply
  button rendered, Search must appear **after** it, not between Add Post and Apply.

**Part B — a fresh Space.** As the same account, create a **brand-new** top-level Space from the
platform default template. Repeat the walk on its four tabs.

**Expect:** the four positions are **identical** between Part A and Part B. Any difference is
R-16 realised → ⛔. Record both walks in the release story: this row is a named checklist item.

---

## SV-6 — Draft callout's tag is invisible to anonymous and non-member viewers (⛔, R-12)

**Setup (as the Space admin):** create a callout on Home, give it the tag `secret-tag-055`,
and leave it **unpublished (draft)**. Confirm no published callout uses that tag.

1. Signed in as admin, on Home: confirm `secret-tag-055` **is** offered among the sidebar's tag
   chips (the admin can read the draft).
2. Open a **private window, signed out**, and open the same Space's Home tab.
3. Look at the tag chips.
4. In the Network log, open the `CalloutsSetTags` response (Response tab) and search the JSON
   for `secret-tag-055`.
5. Sign in as the **non-member** account and repeat steps 3–4.

**Expect:**
- The chip is present for the admin, **absent** for anonymous and for the non-member.
- The string does **not** appear in the `CalloutsSetTags` response for either of them, not only
  hidden in the UI. Its presence in the response is an authorization leak → ⛔.

Clean-up: delete the draft callout afterwards.

---

## SV-7 — Tag query load, signed out (R-12; escalate if slow)

**Where:** private window, signed out.

1. Clear the Network log. Open the Space's **Home** tab.
2. Count the `CalloutsSetTags` rows and note the **Time** column of each.
3. Repeat for **Community**, **Subspaces**, **Knowledge**, clearing the log before each.
4. Open one **subspace** page and check the log.

**Expect:**
- **Exactly one** `CalloutsSetTags` per tab load. Zero means the widget did not mount; more than
  one means the query is re-issued (re-render loop) → escalate.
- **None** on the subspace page (the widget is dormant there).
- Record the four durations in the release story. Anything above **1 s** on ACC is worth raising
  before the production deploy: the query has no size limit, `maxRows={2}` limits only what is
  drawn, and from this release it runs on every tab for every visitor.

---

## SV-8 — Emptied sidebar: no search anywhere; re-add restores it; zero requests while removed (R-13, TC-10)

**Where:** Space Settings → **Layout**, as admin.

1. Open the Layout dialog of one phase (pick **Community**) and **remove every widget**,
   including Search. Save.
2. Open the Community tab as a member. Clear the Network log first.
3. Look for any search field: sidebar **and** content area.
4. Check the log for `FlowStateSearch` and `CalloutsSetTags`.
5. Back in Settings → Layout, re-add **Search** to Community (any position). Save.
6. Reopen the Community tab; type `report`.

**Expect:**
- Step 3: no sidebar column and **no search field anywhere** on that tab. This is ruled,
  intentional behaviour; it is a capability loss the admin caused, so note whether the Layout
  dialog gives any hint that search lives here now (it currently does not; not a blocker, worth
  a line in the release notes).
- Step 4: **zero** `FlowStateSearch` and **zero** `CalloutsSetTags` — removing the widget is the
  load-control lever, and it must actually stop the queries.
- Step 6: search works again. Restore the tab's original layout afterwards.

---

## SV-9 — Clear, tag chips, and combined filters (AC1)

**Where:** Home, signed in.

1. Type `report`; wait for results. Click a **tag chip** that some of those posts carry.
2. Read the label and the results.
3. Click the same chip again to deselect it.
4. Re-select the chip, then delete the typed text with **Backspace** (not the X).
5. Click the label's **X** while the chip is still selected.

**Expect:**
- With text + chip: the label mentions **both** the term and the tag (e.g. `N items related to
  "report" tagged …`), results shrink to posts matching both.
- Deselecting the chip widens the results again; the term stays.
- Step 4: the chip stays selected and the results reflect the chip alone. **UX note:** the chip
  row is ordered by frequency and folds beyond two rows into `+N`; a selected chip low in that
  order can disappear behind `+N` while still filtering (only the label names it).
- Step 5: the X clears the text **and deselects every chip** in one click (spec US1-AS4); the
  browse feed is back and the label is gone.
- Each change issues **one** `FlowStateSearch` (check the log): no request storm on chip clicks.

---

## SV-10 — A long query with ten tags does not trip the term limit (AC2)

The widget sends the typed sentence as **one** search term plus one term per selected tag; the
server rejects more than 10 terms. Ten tags plus the sentence must therefore still be accepted.

**Setup:** a Space with at least 10 distinct tags in use (add tags to a few posts if needed).

1. On Home, select **10 tag chips**.
2. Type a 12-word sentence, e.g. `the quarterly report on climate policy outcomes for the northern region team`.
3. Read the label and the results.

**Expect:**
- Results (or a clean `0 items …` label). **No error state** and no "too many terms" message.
- In the `FlowStateSearch` payload, the `terms` array holds the sentence as **one** entry plus
  the tags.

---

## SV-11 — No cross-Space leak, with a positive control (⛔, R7)

**Setup:** two top-level Spaces, A and B, both administered by you. In **B** create a post whose
title contains a unique word, e.g. `zebrafish055`.

1. In Space **B**, Home, search `zebrafish055`. → the post is found (**positive control**: proves
   the term is indexed and searchable).
2. In Space **A**, Home, search `zebrafish055`.

**Expect:**
- Step 1: `1 items related to "zebrafish055"` (or similar) with B's post shown.
- Step 2: `0 items related to "zebrafish055"`. B's post appearing in A is a cross-Space leak → ⛔.
- Skip the conclusion if step 1 fails: then the index is stale, not the filter (re-run after the
  search index has caught up).

---

## SV-12 — A newly added tab gets Search by default (R1 / R2)

**Where:** Space Settings → the innovation-flow / phases editor, as admin.

1. Add a new phase (tab) to the Space. Save.
2. Open the new tab.

**Expect:**
- The sidebar shows the generic default set, with **Search** present, after the Intent/Add Post
  entries and before the Post Index. Stored order: `intent, createPost, applicationButton, search, index`.
- Search works on the new tab (type a term, results appear).

Remove the phase afterwards if the Space is shared.

---

## SV-13 — Mobile drawer and desktop share one search state (MAN-5)

1. Narrow the browser below the desktop breakpoint (or use DevTools device mode).
2. Open the sidebar drawer, type `climate`, close the drawer.
3. Look at the main area. Reopen the drawer.
4. Widen the window back to desktop.

**Expect:**
- Results for `climate` show in the main area with the drawer closed.
- On reopening, the field still reads `climate` and the label is present.
- After widening, the desktop sidebar shows the same term and label: both copies share one state.

---

## SV-14 — Live region and keyboard focus (Low)

1. At desktop width, with a screen reader or the browser's accessibility inspector, focus the
   search field, type a term, and wait for the count.
2. Below the breakpoint, with the drawer **closed**, press `Tab` repeatedly.

**Expect:**
- The summary strip is an `<output aria-live="polite">`; the sentence is **announced** when the
  count changes.
- Known pre-existing defect, **not a blocker**: with the drawer closed, its search input can
  still receive keyboard focus (a 040 issue, deliberately not fixed in 055). Record it, do not
  fail the release on it.

---

## SV-15 — Whiteboard search: profile fields find it, drawing content does not (AC2)

Whiteboards are currently indexed by their **profile only** — name, description, tags. Until
server#6193 (`v0.163.0`, Release 73) the Excalidraw scene's text elements were indexed too; that
PR moved the scene to a Yjs snapshot and dropped the text path (memos kept a searchable markdown
derivation). So text drawn inside a whiteboard is **not found today on any search surface**, global
or sidebar — a pre-existing regression, not a 055 behaviour. A whiteboard matched by its title,
description, or tag is found, and appears as its **containing callout** (results are folded per
callout).

**Setup (as admin):** a callout whose framing or contribution is a whiteboard titled
`Orbit map 055`, with the tag `orbit055` and a description containing `heliocentric`. Draw the word
`quasar055` **inside** the whiteboard. Allow the search index to catch up (the ingest runs on a
schedule; wait a few minutes, or ask for an admin re-ingest if nothing new is found).

1. In the sidebar, search `Orbit` → **expect** the callout holding the whiteboard among the results.
2. Search `heliocentric` → **expect** the same callout (description is indexed).
3. Select the `orbit055` tag chip → **expect** the same callout (tags are indexed).
4. Search `quasar055` → **expect `0 items`** today. Record it against the whiteboard-text
   regression (server#6193), not against 055.

**Blocker only** if steps 1–3 fail while a post with the same words is found (then whiteboard
results are not being folded into their callout, or the widget drops non-post result types).

---

## Sign-off summary

Record per scenario: **PASS / FAIL / BLOCKED** · date · environment · evidence (request counts,
durations, label text, screenshot for SV-5 and SV-6). The release cannot ship with a FAIL on any
⛔ row. SV-5 and SV-7 results are named items on the Release 74 checklist and should be pasted
there verbatim.
