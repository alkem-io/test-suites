# Release Verification Checklist (QA-cover)

> **Purpose.** A standalone, team-runnable verification pass to execute **before every
> release** — designed so the team can cover release verification when the QA lead is
> unavailable (e.g. on vacation). It is **gap-focused**: it leans on the automated
> `test-suites` for everything they already cover, and directs human effort at the
> flows automation does **not** cover or covers only thinly.
>
> **Scope of each run:**
>
> 1. **Main business cases** — always verified, every release (the four core areas below).
> 2. **New features** in this release — added per-release from the release scope.
> 3. **High-impact / high-risk changes** — added per-release from the risk profile.
>
> **Roles to exercise.** Every main flow is checked as **both** a _regular platform
> user_ (a plain space member) **and** a _space admin_. Some steps additionally need a
> second user (for multi-contributor / invitation flows) — flagged inline as 👥.

---

## How to use this document

1. **Copy** this file to a per-release working copy (e.g. paste into the `Release NN`
   story, or copy to `test-suites/docs/runs/release-NN-verification.md`). Do **not** edit this
   template in place while running — keep it clean for the next release.
2. Fill in the **This release** header (release number, repos + versions, links).
3. **Pre-flight** — run the automated suites (§1) and record pass/fail. Green automation
   is what lets the manual pass stay focused on gaps.
4. **Derive the per-release additions** (§4) from the release scope + risk profile.
   The `release-risk-scoper` output (or the `Release NN` story's Risk Profile table) is
   the input here — every _elevated-risk_ item and every _new feature_ becomes a manual check.
5. Work through the **manual gap flows** (§3). Tick each box, add notes/screenshots for
   anything unexpected. A ⛔ finding blocks release until triaged.
6. **Sign off** (§5). Human gates (acceptance sign-off, go/no-go) stay human.

**Legend:** ✅ pass · ⚠️ pass-with-notes · ⛔ blocker · N/A not-in-this-release ·
👥 needs a second account · 🔴/🟠/🟢 gap level (see §2).

---

## This release

| Field                     | Value                                         |
| ------------------------- | --------------------------------------------- |
| Release                   | `Release NN`                                  |
| Release story             | _link to `alkem-io/alkemio` issue_            |
| Repos + versions          | `server 0.x → 0.y`, `client-web 0.x → 0.y`, … |
| Environment verified on   | _acceptance URL_                              |
| Verification lead (cover) | _name_                                        |
| Date                      | _YYYY-MM-DD_                                  |

---

## 1. Pre-flight — run automated suites first

Run these against the release candidate and record the result. **Anything red here is
triaged before manual verification starts** — a red suite changes what you hand-verify.

| Suite                                    | Command                                                                 | Result | Notes / report link                      |
| ---------------------------------------- | ----------------------------------------------------------------------- | ------ | ---------------------------------------- |
| API — full nightly                       | `pnpm --filter @alkemio/test-suite-server-api run test:nightly`         | ☐      | HTML report in `server-api/html-report/` |
| API — roleset (application + invitation) | `… run test:roleset`                                                    | ☐      |                                          |
| API — callouts                           | `… run test:callouts`                                                   | ☐      |                                          |
| API — templates                          | `… run test:templates`                                                  | ☐      |                                          |
| API — storage (document auth/upload)     | `… run test:storage`                                                    | ☐      |                                          |
| UI — E2E (Playwright, Chrome)            | `pnpm --filter @alkemio/test-suite-client-web run test:auth-playwright` | ☐      |                                          |

> If a suite is flaky/blocked in cover mode, note it and treat the flows it _would_ have
> covered as **manual** for this release (bump them up a gap tier in §3).

---

## 2. Coverage & gap map (why the manual flows below are what they are)

This is the honest picture of what the automated suites cover for each core area, so the
team knows **where residual risk is not covered by automation**. Manual effort in §3 is
allocated inversely to this coverage.

| Core area                                                          | Automated — API (`server-api`)                                                                                     | Automated — UI (`client-web`)                                                                                    | **Gap → manual focus**                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Authentication — email/password + registration**                 | 🟢 (test-harness auth underpins all suites)                                                                        | 🟢 `authentication/*` (login, registration, password-recovery, restricted-access, cookie-consent)                | 🟢 Low — smoke-confirm only                                                                                          |
| **Authentication — social / SSO (LinkedIn, GitHub, Microsoft, …)** | 🔴 **None**                                                                                                        | 🔴 **None** (only a note in `AUTHENTICATION_TEST_PLAN.md` that GitHub exists on the test env; no test drives it) | 🔴 **High — register + log in via each configured social provider manually.**                                        |
| **Membership — application**                                       | 🟢 `roleset/application/*` (join + lifecycle)                                                                      | 🟢 `applications/space-applications-level-0/1`                                                                   | 🟢 Low — smoke-confirm only                                                                                          |
| **Membership — invitation**                                        | 🟢 `roleset/invitations/*` (contributors, external, subspace-admin)                                                | 🔴 **No dedicated invitation-acceptance E2E**                                                                    | 🟠 **Medium — verify invite→email→accept in the UI as a user**                                                       |
| **Documents (upload / access)**                                    | 🟠 `storage/auth/*` (authorization matrix) + `storage/uploads` only; `integration/documents/` project is **empty** | 🔴 Seed-only; no doc-lifecycle E2E                                                                               | 🟠 **Medium — verify upload, view, download, replace, delete + reference links in the UI**                           |
| **Callout contribution — create post**                             | 🟢 `callout/post/post-on-callout` (+ notification tests)                                                           | 🟢 `callouts/0.4callout-contributions`                                                                           | 🟢 Low — smoke-confirm only                                                                                          |
| **Callout contribution — send message / comment**                  | 🟢 `communications/{replies,reactions,comments}`                                                                   | 🟢 `callouts/0.3callout-comments`                                                                                | 🟢 Low — smoke-confirm only                                                                                          |
| **Callout contribution — create whiteboard (real-time)**           | 🔴 Only template CRUD + static request params (empty Excalidraw payloads)                                          | 🟠 Whiteboard appears as callout framing (single-user); `non-member-whiteboard-access`                           | 🔴 **High — no concurrent-edit / live-sync / presence coverage. Verify two users editing the same whiteboard live.** |
| **Callout contribution — create memo (real-time)**                 | 🔴 **None**                                                                                                        | 🟠 Single-user create/edit/delete helper only (`…/contributions/…use.memos`)                                     | 🔴 **High — verify multi-user memo editing + persistence; no API safety net.**                                       |
| **Templates**                                                      | 🟢 `templates/{post,space,whiteboard}`                                                                             | 🟢 `templates` + `templates-CRD` (callout, whiteboard, post, community-guidelines)                               | 🟢 Low — smoke-confirm only                                                                                          |
| **Callouts (create/edit/lifecycle)**                               | 🟢 `callout/*`                                                                                                     | 🟢 `callouts/0.1–0.9`                                                                                            | 🟢 Low — smoke-confirm only                                                                                          |

> **Reading this table:** 🟢 areas have strong automation — a human just confirms the
> suite is green and does one quick smoke path. 🟠/🔴 areas are where a human must
> actually drive the flow, because automation would not catch a regression there.
> The **biggest automation gaps** — always the most manual attention — are:
> **(a) real-time collaboration** (whiteboard + memo contributions: concurrent edit,
> live-sync, presence), inherently hard to automate and currently unautomated; and
> **(b) social / SSO authentication** (LinkedIn, GitHub, Microsoft, …), which the suites
> cannot exercise because they rely on the email/password test harness.

---

## 3. Manual verification — main business flows (every release)

Ordered by gap level: do the 🔴 high-gap flows first (most risk, least automation). Each
flow is run as **regular user** and **space admin** unless stated. 👥 = second account needed.

### 3.1 🔴 Authentication — social / SSO login & registration _(no coverage at all)_

- [ ] **Register a new account** via each configured social provider (LinkedIn, GitHub,
      Microsoft, …) → account is created and lands on the dashboard. ☐
- [ ] **Log out and log back in** via the same social provider → same account, no duplicate. ☐
- [ ] A social-registered user can then **apply/accept an invite** and use a space normally. ☐
- [ ] Email/password **registration + login + password-recovery** still work (covered by
      `authentication/*` — confirm green in §1, plus one smoke). ☐
- [ ] Provider list on the login/registration screen matches what's configured for the env. ☐

### 3.2 🔴 Callout contribution — Whiteboards (real-time) _(no automation safety net)_

- [ ] 👥 Two users open the **same whiteboard** on a callout at the same time; edits from
      one appear live for the other (shapes, text, move/delete). ☐
- [ ] Presence/cursors of the other collaborator are visible. ☐
- [ ] Refresh the page → whiteboard content **persists** (saved, not lost). ☐
- [ ] As **space admin**: create a "call for whiteboards" callout; a **regular user**
      contributes a whiteboard; admin can view it. ☐
- [ ] Permission boundary: a **non-member** cannot edit (matches `non-member-whiteboard-access`). ☐
- [ ] Whiteboard created **from a template** renders with the template content. ☐

### 3.3 🔴 Callout contribution — Memos (real-time) _(no API coverage at all)_

- [ ] 👥 Two users edit the **same memo** concurrently; changes converge, no content loss. ☐
- [ ] Create a memo on a memo-framed callout; add rich content (headings, lists); reload → persists. ☐
- [ ] Edit memo title mid-flow; the memo remains editable and saves. ☐
- [ ] As **regular user**: create a memo contribution; as **space admin**: view it. ☐
- [ ] Delete permission is correctly gated (regular user vs admin). ☐

### 3.4 🟢 Callout contribution — Posts & messages _(automation strong — confirm + smoke)_

- [ ] Automated `callout/post` + `communications/{replies,reactions,comments}` (API) and
      `callouts/0.3callout-comments` + `0.4callout-contributions` (UI) are green (§1). ☐
- [ ] Smoke: as a **regular user**, **create a post** on a callout; it appears for the **space admin**. ☐
- [ ] Smoke: **send a message / comment** in a callout; a reply + reaction from a second user shows. 👥 ☐

### 3.5 🟠 Membership — Invitation _(API covered, UI not)_

- [ ] 👥 **Space admin** invites a user by email/handle; the invitee receives the invite
      (check the notification/email). ☐
- [ ] Invitee **accepts** in the UI → becomes a member; appears in the member list. ☐
- [ ] Invite an **external** (not-yet-registered) email → invite survives through registration. ☐
- [ ] Subspace-admin invitation path (invite to a subspace) works. ☐
- [ ] **Decline / expiry** path behaves correctly. ☐

### 3.6 🟠 Membership — Application _(automation strong — confirm + one smoke)_

- [ ] Automated `roleset/application` + `applications/*` E2E are green (§1). ☐
- [ ] Smoke: a **regular user** applies to a space; **space admin** approves; user gains access. ☐

### 3.7 🟠 Documents _(only auth/upload automated)_

- [ ] As **regular user** and **space admin**: **upload** a document to a callout/space. ☐
- [ ] **View** and **download** it; content is intact. ☐
- [ ] **Replace** / **delete** a document; storage + references update. ☐
- [ ] Document **reference links** resolve; broken/removed docs handled gracefully. ☐
- [ ] Authorization: private-space / private-channel document not visible to a non-member
      (spot-check — full matrix is in `storage/auth/*`). ☐

### 3.8 🟢 Callouts (create / edit / lifecycle) _(automation strong — confirm + one smoke)_

- [ ] Automated `callout/*` + `callouts/0.1–0.9` are green (§1). ☐
- [ ] Smoke: **space admin** creates a callout; **regular user** contributes; edit + delete work. ☐

### 3.9 🟢 Templates _(automation strong — confirm + one smoke)_

- [ ] Automated `templates` + `templates-CRD` are green (§1). ☐
- [ ] Smoke: create a callout/whiteboard/post **from a template**; content matches the template. ☐

---

## 4. Per-release additions — new features & high-impact changes

> Derived from **this release's scope + risk profile**. Pull elevated-risk items from the
> `Release NN` story's Risk Profile table (or the `release-risk-scoper` output). Treat DB
> migrations, breaking GraphQL/schema changes, auth-touching diffs, and infra/manifest
> changes as **always manual-verify**, even if a suite is green.

| #   | New feature / high-impact change | Repo(s)                | Why it's here (scope / risk)      | Automated? | Manual check                           | Result |
| --- | -------------------------------- | ---------------------- | --------------------------------- | ---------- | -------------------------------------- | ------ |
| 1   | _e.g. U2U messaging_             | `server`, `client-web` | New feature (`006-u2u-messaging`) | partial    | send/receive as 2 users, notifications | ☐      |
| 2   | _e.g. DB migration X_            | `server`               | Elevated risk — schema change     | no         | verify data intact post-migrate on ACC | ☐      |
| …   |                                  |                        |                                   |            |                                        |        |

---

## 5. Sign-off

| Gate                                         | Owner                     | State |
| -------------------------------------------- | ------------------------- | ----- |
| Automated suites green (or reds triaged)     | Verification lead (cover) | ☐     |
| Manual gap flows (§3) complete, no open ⛔   | Verification lead (cover) | ☐     |
| Per-release additions (§4) complete          | Verification lead (cover) | ☐     |
| **Acceptance sign-off** _(human gate)_       | Quality Lead              | ☐     |
| **Go / no-go for production** _(human gate)_ | Release Lead              | ☐     |

**Blockers / open issues found this run:**

- _list ⛔ / ⚠️ findings with links_

---

### Maintenance note

Keep the **Coverage & gap map (§2)** honest: when `test-suites` adds automation for a
gap area (e.g. an invitation-acceptance E2E, `integration/documents/` tests, or any
real-time whiteboard/memo collaboration test), downgrade that row's gap level and move
its manual steps in §3 to a smoke-confirm. Re-audit the map at least once per major release.
