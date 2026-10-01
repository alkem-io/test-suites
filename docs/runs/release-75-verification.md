# Release 75 — verification run sheet

> Per-release working copy of `docs/release-verification-checklist.md` §4 (per-release additions) plus a regression-scope section derived from the changed code. Re-derived **09.09** after memo signing (#2025) entered both `release/75` branches.
>
> **Source:** `alkem-io/alkemio#2117` Risk Profile (R-1 … R-15, revision 12:13 UTC) **plus** what landed on `release/75` after that revision: server #6478 #6482, client-web #10278 #10280 (re-merged 12:19/12:20).
>
> **Release as cut:** server `0.164.0 → 0.165.0` · client-web `0.163.0 → 0.164.0` · **Business + QA sign-off required.**
>
> **What inverted since the morning draft:** three server migrations (story still says one) · additive GraphQL/codegen changes · a hard server↔client pair (client `0.164.0` cannot open memos against server `0.164.0`). `trust-gateway` is deliberately **not** deployed, so signing is inert end to end; the Sign action is hidden by default behind the `SPACE_FLAG_MEMO_SIGNING` entitlement.

**Environment for every step:** ACC — **updated to `release/75` on 09.09 (evening)**, paired images (server `0.165.0` + client `0.164.0`). Database steps run as an operator with `psql -d alkemio` — the instance's default database is `synapse`, where nothing below exists.

**Accounts.** 👤A = space admin (not a global admin) · 👤O = org admin · 👤P = platform admin · 👤S = `GLOBAL_SUPPORT` · 👤C = space member with CONTRIBUTE · 👤M = plain space member · 👥 = a second, throwaway account.

**Legend.** ✅ pass · ⚠️ pass-with-notes · ⛔ blocker · N/A · **Evidence** = what to attach to the row (screenshot, query output, log line).

---

## 0. What is left (as of 09.09 evening)

Everything below is **not** covered by the local automated run. Tick here first; the numbered procedures carry the steps.

### A. Manual on ACC before QA sign-off (a person, a browser)

| Item | Procedure | Why it cannot be automated today |
|------|-----------|----------------------------------|
| Space Community **add member / invite** path only (role changes are now automated) | P1 step 6 | invite flow is a different feature |
| Org Authorization **as an Owner**, and the `GLOBAL_SUPPORT` Admin-tab probe with an existing associate | P3 | scenario grants Admin only; support could not add the associate (gated) |
| Overlays (dialog, sheet, dropdown, select) in **Chrome, Safari, Firefox** on a scrolling and a short page | P7 | layout, no assertion exists; Safari has no local equivalent |
| Loading states on Slow 3G: dashboard, subspace, callout, short page, feed with a slow card | P8 | no assertion exists |
| Open, edit, save all three memo kinds after the **paired** deploy | P12 | memo has zero automation |
| Platform-admin **license plan screen** shows Memo Signing and existing flags intact | P14 step 1 | UI of the admin plan list not automated (inheritance + identity gate are) |
| Delete memo / callout / subspace / **account** with documents — no "retained by a signing attempt" error | P16 | `test:storage` covers auth + upload only |
| **Every social/SSO provider** login on ACC; pre-deploy session survives | P17 step 2–3 | harness cannot drive social providers |
| Two content-signing REST routes: unauthenticated and entitlement-less probes | P18 | route paths to be read from `rest.endpoint.ts` |
| Full memo lifecycle incl. two users editing at once | R-S4 | no automation |
| Whiteboard: draw, save, live sync; **create a whiteboard template and a whiteboard-framed callout template** — dialog closes, saved once, no orphan draft | R-C4 (+ §7 CRD reds) | the two CRD template specs are red in isolation and unexplained |
| Space shell walk (tabs, sidebar search, subspaces, leads, protected route) as member and admin | R-C2 | only incidental coverage |
| Markdown expand/collapse; contributor-settings role view | R-C5, R-C6 | no automation |

### B. Operator / cluster (needs DB, kubectl, APM, registry)

| Item | Procedure |
|------|-----------|
| Whiteboard sweep: one clean hourly tick in server logs; expired-draft count on ACC and PROD; back-dated positive case; callout-to-Draft negative case | P9 |
| Migration window: long-writer check on `file`/`memo`, `lock_timeout = 3s`, three migrations applied (120 total), `signing_attempt` empty, backfill count matches | P11 |
| Pod Ready with no trust-gateway errors; `trust-gateway` absent on ACC and PROD; Sign-click failure copy **only if** a Cleverbase-linked identity exists | P15 |
| APM error rate + p95 for 30 min; rollback digests present; runbook says redeploy **both** images together | P10, P12 step 4 |
| Session revocation: after logout an old-session request is refused (the local BFF answers differently — confirm on ACC) | P17 note |

### C. Decisions to record (no test step)

| Item | Row |
|------|-----|
| Product accepts reader-visible signatures; release notes name it | 19 |
| Release lead acknowledges server#6468 merged against its own "do not merge" with 0 approvals; business approval; `trust-gateway` in `repos.yaml` before infra-ops#2649; story #2117 corrected (three migrations, #6478 #6482 #10278 #10280 in scope, R-1 mitigated) | 20 |
| `virtual-contributor` SSRF tag; `collaboration-service` second deferral | 21 |

### D. Test-suites housekeeping (not release-blocking)

| Item | State |
|------|-------|
| `contributors-callout` 1.3/1.4 — scenario now seeds a member VC | **fixed**, 10/10 green, on `test/release-75-verification` (uncommitted) |
| `applications` 1.0 — Apply button is back on the L0 dashboard sidebar | **fixed**, green, same branch |
| Legacy `templates/` folder (4 specs, 31 files) | **deleted** on the branch |
| `non-member-subspace-navigation` 5.4 — stale accessible names | **fixed**, file green |
| `ts7-platform-smoke` AS1 + AS4 — cold readiness, stale copy | **fixed**, file green |
| `session-revocation` ×2 — cleared-context vs stale-cookie replay | **fixed**, both files green (11/11) |
| `support-navigation`, `mcp-api-keys-*` — need docs site / MCP route not present locally | env notes only |
| `us3-messaging-settings-rows` | **5/5 green** once the harness gets the server's `MESSAGING_DIGEST_*` windows |

### E. Done locally against `release/75` (09.09)

- **PR:** all of the above (new coverage, spec repairs, harness additions, legacy templates removal) is on [alkem-io/test-suites#633](https://github.com/alkem-io/test-suites/pull/633), branch `test/release-75-verification`, one commit `8cda18dd`.

- **New automation (evening):** API `entitlements/memo-signing-entitlement.it-spec.ts` 8/8; Playwright `authz-admin-guard/` 22/22 across five files (space Community ×7, org tabs ×7, platform roles ×3, fault paths ×3, memo Sign gate ×2), registered as nightly project **Authz admin guard**; plan at `authz-admin-guard/authz-admin-guard-test-plan.md` (Draft).

- API: roleset, entitlements, storage, templates, callouts, journey — **all green** (1 533 tests, 23 skipped).
- Playwright: 238 green under load; every red rerun alone and attributed (§7). Two CRD whiteboard-template reds remain unexplained → item A "R-C4".

---

## 4. Per-release additions

Each row is a one-line summary. The numbered **procedure** with the same number below carries the exact steps, expected results, and the evidence to capture.

### 4a. Permission gating, loading rework, whiteboard sweep, TypeORM (carried from the morning draft)

| #  | Change | Repo | Risk | Automated? | Manual check (summary) | Validation | Result |
|----|--------|------|------|------------|------------------------|------------|--------|
| 1  | Permission gating — Space **Community** tab (Lead, Admin, Remove, Add member) | client-web | R-11 · #10279 filed today; fix #10280 on branch covers **Lead** only | API roleset matrix only; no UI | As a plain space admin, all three controls work → **P1** | 🤖 **automated 09.09** (`authz-admin-guard/space-community-role-changes` 7/7 green: space admin Lead/Admin/Remove persist; GLOBAL_SUPPORT honoured; member boundary) · 🖐 add-member/invite only | ☐ |
| 2  | Permission gating — Org **Associates** tab | client-web | R-6 token mismatch | API only; no UI | Org admin works; `GLOBAL_SUPPORT` probe → **P2** | 🤖 **automated** (`org-associates-authorization`: org admin add/remove; GLOBAL_SUPPORT probe → gated off with tooltip, **confirmed correct via API** (server refuses too), see §7c) | ☐ |
| 3  | Permission gating — Org **Authorization** tab | client-web | R-6 · R-11 | API only; no UI | Org admin works; owner-level gated; `GLOBAL_SUPPORT` probe → **P3** | 🤖 **automated** (org admin add/remove Admin; Owner gated for non-owner; GLOBAL_SUPPORT Admin probe inconclusive — no associate candidate) | ☐ |
| 4  | Permission gating — Platform **Global Roles** (`GRANT_GLOBAL_ADMINS`) | client-web | Defect fixed by #9537 | Unit only | Platform admin works; `GLOBAL_SUPPORT` sees disabled controls → **P4** | 🤖 **automated** (`platform-global-roles` 3/3: admin add/remove on GLOBAL_COMMUNITY_READER; GLOBAL_SUPPORT never offered an enabled control) | ☐ |
| 5  | Fail-closed `unverifiable` path | client-web | R-11 — admin lockout question | No | Force a privileges miss; message shown; reload clears → **P5** | 🤖 **automated** (`unverifiable-and-denied` 5.1 fail-closed → no admin surface; 5.2 tooltip on denied derivation) | ☐ |
| 6  | Denied-change toast | client-web | R-6 mitigation | No | Provoke a server refusal; toast, no ghost change → **P6** | 🤖 **automated** (`unverifiable-and-denied` 6.1 FORBIDDEN → toast, nothing applied) | ☐ |
| 7  | App-wide `scrollbar-gutter` + `react-remove-scroll-bar` override | client-web | R-7 · behind every Radix overlay · no coverage | No | Overlay smoke in 3 browsers → **P7** | 🖐 manual, 3 browsers | ☐ |
| 8  | Loading-state rework | client-web | Deliberate perceived change (#10043) | Incidental only | Slow-network reloads; short page; feed with a slow card → **P8** | 🖐 manual, slow network | ☐ |
| 9  | Whiteboard-draft sweep activated | server | R-8 irreversible deletes · no live-Postgres test | Server unit only | Log check, count query, one positive + one negative case → **P9** | 🏗 operator (DB + logs) · 🖐 positive/negative cases | ☐ |
| 10 | TypeORM → `@alkemio/typeorm@0.3.13-cti.1` | server | R-9 · R-10 rollback is image-only, and now paired with the client | API nightly | Pre-flight green; APM 30 min; digests recorded → **P10** | 🤖 all 6 API projects green · 🏗 APM + registry | ☐ |

### 4b. Memo signing (#2025)

| #  | Change | Repo | Risk | Automated? | Manual check (summary) | Validation | Result |
|----|--------|------|------|------------|------------------------|------------|--------|
| 11 | **Three migrations** — new `signing_attempt` table with FKs onto `memo` and `file`; entitlement add; entitlement backfill of existing licenses | server | R-4 no `lock_timeout`; story still says "exactly one" | Migration unit specs only | Pre-check long writers; run with lock timeout; verify all three applied and backfill complete → **P11** | 🏗 operator on ACC | ☐ |
| 12 | **Server ↔ client hard pair** — `signatures` added to the shared memo query | server + client-web | R-3 high impact | No | Open all three memo kinds after the paired deploy; rollback runbook updated → **P12** | 🖐 manual on ACC after paired deploy | ☐ |
| 13 | **Sign action hidden by default** (entitlement + identity gate, server-enforced) | server + client-web | Mitigates R-1; not in the story | Server unit only | No Sign action for anyone; API refuses on entitlement → **P13** | 🤖 **automated** — UI `memo-sign-action-gate` 13.1 + API `entitlements/memo-signing-entitlement` (refused on entitlement for admin + member, L0 + L1) | ☐ |
| 14 | **Entitlement admin surface + subspace inheritance** | server | New entitlement/credential types; backfill correctness | No | Enable on one test space; inheritance; identity gate still hides; disable → **P14** | 🤖 **automated** — API: grant enables L0 + subspace inherits, refusal moves to identity gate, revoke closes; UI 14.1: Sign still hidden without a Cleverbase method · 🖐 license-plan admin screen look | ☐ |
| 15 | **Signing inert without `trust-gateway`** | server + infra-ops | R-1 clean failure · R-5 event-loop stall · R-2 live journey unverified | No | Boot health; gateway absent; exact failure copy if a Cleverbase identity exists → **P15** | 🏗 cluster checks · 🖐 step 3 if identity exists | ☐ |
| 16 | **Storage-bucket delete guard** (incl. account deletion) | server | R-12 | `test:storage` covers auth/upload only | Delete memo, callout, subspace, account → no guard error → **P16** | 🖐 manual | ☐ |
| 17 | **Identity code touched** (Kratos service ×2, actor context gains `authenticationID`) | server | R-13 · on the login path for every provider | Email/password only | All providers, session survival, optional cache flush → **P17** | 🤖 email/password login green in isolation · 🖐 social providers | ☐ |
| 18 | **New REST surface** (content-signing controller, 2 routes) | server | Not in the story's risk table | No | Unauthenticated probes never 500; not exposed beyond `/rest` → **P18** | 🖐 manual on ACC | ☐ |
| 19 | `Memo.signatures` reader-visible | server | R-14 product decision | n/a | Record decision; release-notes line → **P19** | 📝 decision | ☐ |
| 20 | Governance gates | process | R-2 · R-15 · closed iteration | n/a | Record acknowledgements → **P20** | 📝 decisions | ☐ |

### 4c. Inventory decisions

| #  | Item | Repo | Why | Record | Validation | Result |
|----|------|------|-----|--------|------------|--------|
| 21 | `virtual-contributor` SSRF fix #125 in no tagged release (three releases open); `collaboration-service` #18 deferred once | virtual-contributor, collaboration-service | story *Not in this release* | ☐ VC tag cut / ☐ deferred again · ☐ collab-service cut / ☐ deferred a **second** time | 📝 decision | ☐ |

---

## Procedures for §4

### P1 — Space Community tab as a plain space admin
**Why.** #9537 gated the Community tab on a token space admins do not hold (#10279). #10280 restores the **Lead** toggle; the Admin toggle and Remove were reported in the same bug and are not named in the fix.
1. Log in as 👤A. Open the space → Settings → Community.
2. Click a 👥 member to open the member dialog.
3. Toggle **Lead** on → Save. Reload. Expect: member shows Lead.
4. Toggle **Admin** on → Save. Reload. Expect: member shows Admin.
5. Turn both off → Save. Then **Remove** the member. Reload. Expect: member gone.
6. **Add member**: add 👥 back via the add dialog. Expect: control enabled, member listed.
7. Log in as 👤M. Open the same dialog. Expect: Lead/Admin/Remove disabled, tooltip explains why.
**⛔ if** step 4 or 5 shows a disabled control for 👤A — reopen #10279.
**Evidence.** Screenshot of the dialog for 👤A with all controls enabled; screenshot for 👤M.

### P2 — Org Associates tab
1. 👤O: Organization → Settings → Associates. Assign a 👥 user as associate; reload; remove; reload. Expect both persist.
2. 👤S: same tab. Record whether Assign/Remove are **enabled**.
3. If enabled, attempt an assign. Expect either success **or** the toast "The change was not saved." If the toast appears → R-6 hit; note surface + role in the row.
**Evidence.** Two screenshots (👤O, 👤S) and the outcome of step 3.

### P3 — Org Authorization tab
1. 👤O: Organization → Settings → Authorization. Assign a 👥 user as org admin; reload; remove; reload.
2. As an org **admin who is not owner**: owner-level controls disabled with tooltip; admin-level enabled.
3. 👤S: repeat P2 step 2–3 here.
**Evidence.** As P2.

### P4 — Platform Global Roles
1. 👤P: Platform admin → Authorization → Global roles. Assign a 👥 user a global role; reload; remove; reload.
2. 👤S: page loads; controls **disabled** with tooltip (before #9537 they were wrongly enabled).
**Evidence.** Screenshot per account.

### P5 — Fail-closed `unverifiable` path
1. 👤A, any of the four surfaces. DevTools → Network → throttle to **Slow 3G**, reload the page.
2. Open the member/role dialog before the page has fully settled. Expect either the normal controls or, transiently, "Permissions could not be verified." with controls disabled.
3. Remove throttling, reload normally. Expect: controls enabled.
**⛔ if** "Permissions could not be verified." persists on a healthy reload for 👤A.
**Evidence.** Screenshot of the message if seen; note whether reload cleared it.

### P6 — Denied-change toast
1. Two sessions: 👤A in session 1 opens the member dialog for 👥. In session 2, 👤P removes 👤A's admin role.
2. Session 1: change Lead → Save. Expect toast "The change was not saved."; the dialog does not show the change as applied; reload shows no change.
**Evidence.** Screenshot of the toast.

### P7 — Overlay layout under the global CSS change
For each of **Chrome, Safari, Firefox**, on (a) a page that scrolls (space dashboard with many callouts) and (b) a page that does not (a short settings tab):
1. Open a **Dialog** (edit a callout), a **Sheet** (chat), a **DropdownMenu** (user avatar menu), a **Select** (any settings form).
2. Expect on open and close: no horizontal shift of the page, no double scrollbar gutter, page scroll locked while the overlay is open, content behind not shifted.
**Evidence.** One screenshot per browser showing an open dialog on the scrolling page.

### P8 — Loading states
1. Slow 3G. Hard-reload: space dashboard, a subspace, a callout page, and a **short** page (sparse settings tab). Expect: a single indicator, no visible "Loading" word (screen readers still get it), no content jump when content lands. A tall empty area on the short page is **intended**, record as ⚠️ not ⛔.
2. Callout with many contributions: watch the header count; if it changes after load, record it (cosmetic, R-11 in the old table).
3. Space callout feed on Slow 3G: one slow card shows its skeleton while sibling cards render.
**Evidence.** Screen recording or two screenshots (during / after load) of the dashboard.

### P9 — Whiteboard-draft sweep
**Why.** The hourly sweep had never run; from this release it deletes for real. Only rows with a non-NULL expiry marker are candidates; published whiteboards have NULL.
1. After deploy, wait for the next full hour. Server logs: filter `WHITEBOARDS`; expect no Postgres `42703`, no `distinctAlias`.
2. `SELECT count(*) FROM public.whiteboard WHERE "draftExpiresAt" <= now();` → tens or **0**. 0 is a pass (nothing to mass-delete) but leaves the delete path unexercised → step 3.
3. **Positive.** As 👤A, start creating a whiteboard callout from a template but do **not** finish (this materialises a draft). Find it: `SELECT id, "draftExpiresAt" FROM public.whiteboard WHERE "draftExpiresAt" > now() ORDER BY "createdDate" DESC LIMIT 3;`. Back-date it: `UPDATE public.whiteboard SET "draftExpiresAt" = now() - interval '1 minute' WHERE id = '<id>';`. After the next tick: row gone, one deletion logged, no error.
4. **Negative.** Create a whiteboard callout with two whiteboard contributions, publish all, then set the callout to **Draft** visibility. `SELECT id, "draftExpiresAt" FROM public.whiteboard WHERE "profileId" IN (SELECT id FROM public.profile WHERE "displayName" IN ('<names>'));` → all NULL. After the next tick the whiteboards still open.
5. **Pre-PROD:** repeat step 2 against PROD; expect tens, not thousands.
**Evidence.** Log excerpt from step 1, query outputs from 2–4.

### P10 — TypeORM package swap
1. Pre-flight §1 API nightly green on the release candidate.
2. Post-deploy: APM query-error rate and p95 flat for 30 minutes.
3. Pre-PROD: `alkemio/server:v0.164.0` at `sha256:e1d4360f…cda0e0` and `alkemio/client-web:v0.163.0` at `sha256:861fedca…ceafbe8` still in the registry. The rollback runbook says **redeploy both images together**; never `git revert` + rebuild (the old ref no longer installs).
**Evidence.** APM screenshot; registry check output.

### P11 — Migration window (three migrations)
**Why.** `CreateSigningAttempt` adds foreign keys onto `memo` and `file`. The DDL is milliseconds but queues behind any long transaction on those tables, and while queued it blocks all writers. The two entitlement migrations touch existing license rows.
1. **Before `migrate`:** `SELECT pid, now() - xact_start AS age, left(query, 80) FROM pg_stat_activity WHERE state <> 'idle' AND xact_start < now() - interval '30s';` Expect none touching `file`/`memo`. If any, wait or retry off-peak.
2. Run the migration job with `SET lock_timeout = '3s'`. If it fails fast on lock timeout, that is the guard working: retry, do not remove the timeout.
3. **After:** `SELECT name FROM migrations_typeorm ORDER BY timestamp DESC LIMIT 3;` → `BackfillMemoSigningEntitlement`, `AddMemoSigningEntitlement`, `CreateSigningAttempt`. Total count is **120** (117 + 3): `SELECT count(*) FROM migrations_typeorm;`. Table is `migrations_typeorm`, not `migrations`. Full query set: `docs/runs/release-75-migration-queries.sql`. Anything else applied is drift.
4. `SELECT count(*) FROM public.signing_attempt;` → 0.
5. Backfill: `SELECT enabled, "limit", count(*) FROM license_entitlement WHERE type = 'space-flag-memo-signing' GROUP BY 1,2;` (types are stored lower-kebab) → one row, `enabled=f`, `limit=0`, count equal to `SELECT count(*) FROM license_entitlement WHERE type = 'space-flag-save-as-template';` (one per space + collaboration license). Verified locally 09.09: 40/40. **ACC 10.09:** space 1931 disabled + 5 enabled = 1936 licenses; collaboration 2385 + 5 = 2390 — every license has one row. The enabled rows are not from the migration: they come from the license reset after the plan was granted to two L0 spaces, and subspaces inherit because `SpaceLicenseService.applyLicensePolicy` evaluates descendants against the root space's credentials. Spot-check one pre-existing space in the platform admin UI as well.
**⛔ if** any pre-existing space lacks the entitlement, or the migrate log shows more than these three.
**Evidence.** Outputs of steps 1, 3, 4; screenshot of step 5.

### P12 — Server ↔ client pair
1. Confirm the infra-ops ACC bump PR moves **both** images in one PR.
2. After deploy, 👤C: open a memo used as **callout framing**; a memo **contribution**; a memo created **from a template**. Each opens, accepts an edit, saves, reopens with the edit.
3. 👤A: same three.
4. Write into the rollback runbook: server `0.165.0` and client `0.164.0` roll back **together**, using the digests from P10.
**Evidence.** Screenshot of one opened memo per kind; runbook link.

### P13 — Sign action hidden by default
1. 👤C in a space with the entitlement **off** (every space after the backfill): open a memo. Expect: **no** Sign action in the memo dialog, its menus, or its footer.
2. 👤A: same.
3. API, as 👤A, GraphQL playground: run `prepareMemoSigning` for that memo (input shape in `schema.graphql`, #6468). Expect a refusal naming the **entitlement**; not a trust-gateway error, not a 500.
4. Still reachable: memo read, download, `Memo.signatures` returns `[]`, `verifyMemoSignature` answers without a server error.
**Evidence.** Screenshot of the memo dialog; raw response of step 3.

### P14 — Entitlement admin surface + inheritance
1. 👤P: open the license-plan / space feature admin. Expect a **Memo Signing** feature, free, limit 1, alongside the existing flags; the existing flags unchanged.
2. Enable Memo Signing on **one** test L0 space. Query the space and one of its subspaces: entitlement `enabled=true` on both (collaboration inheritance). Query a different space: still off.
3. 👤C in that test space, **no** Cleverbase login method: open a memo → still **no** Sign action (identity gate).
4. Disable it on the test space. P13 step 1 holds again.
5. Leave the entitlement **off** everywhere before sign-off.
**Evidence.** Screenshots of steps 1–2; note that step 5 was done.

### P15 — Signing inert without `trust-gateway`
1. Server pod Ready after deploy; boot logs free of trust-gateway connection errors (the client is lazy; nothing should be logged at all).
2. `kubectl get deploy trust-gateway -n <alkemio ns>` on ACC → not found. Same on PROD after promotion.
3. **Only if** a test identity with a linked Cleverbase login exists on ACC: enable the entitlement on the test space, open a memo as that identity, click Sign. Expect within a second: **"The exact memo copy could not be prepared."** (or "The signing session could not be started. Prepare a fresh copy and try again."), no lingering spinner, the browser **never** navigates to `tsa.invalid`, `kubectl get pod` shows no restart.
4. If no such identity exists: mark N/A and write "live signing journey unverified on ACC (R-2)" in the row.
**Evidence.** Pod status; log excerpt; screenshot of step 3 or the N/A note.

### P16 — Storage-bucket delete guard
**Why.** Every bucket deletion now first checks that none of its documents is held by a signing attempt. There are zero attempts on day one, so any refusal here is a false positive.
1. 👥 throwaway user: create a memo with an uploaded image, a post with an image, and a whiteboard in a test subspace.
2. Delete the memo. Delete a callout containing memos. Delete the subspace.
3. Run **account deletion** for the 👥 user.
4. Expect all four to succeed; server logs contain **no** "Storage contains a document retained by a signing attempt".
**Evidence.** Log search result (empty); note each deletion succeeded.

### P17 — Identity code on the login path
1. Email/password: login, logout, login. Password recovery once.
2. **Each social/SSO provider configured on ACC** (§3.1 — required this release, not optional): login; a second login lands on the same account.
3. A session opened **before** the deploy still works after it (no forced logout).
4. Optional post-deploy: flush the actor-context Redis namespace, then log in once more.
5. **Session revocation on account deletion** (from the local reproduction, §7). Two browser profiles: **A** = throwaway user, **B** = global admin.
   1. **A**: register `qa+revoke-<date>@<your domain>` on ACC, verify the email, log in, land on `/home`.
   2. **A**: open a new tab on `https://<acc host>/api/auth/oidc/id-token-hint` → **200**, JSON containing `id_token`. Keep this tab.
   3. **A**: on the `/home` tab open DevTools → Console and run
      `await (await fetch('/api/private/graphql',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({query:'{ me { id user { id email } } }'})})).text()`
      (the `await` form prints the body directly; a bare `fetch(...).then(console.log)` only echoes a Promise and logs the body on a separate line) → `{"data":{"me":{"id":"me-<uuid>","user":{"id":"<uuid>","email":"qa+revoke-…"}}}}`. Keep the tab open, do not log out.
   4. **B**: as a global admin delete the throwaway (Platform admin → Users → delete, or the `deleteUser(deleteData:{ID:"<user id>"})` mutation in the GraphQL playground). Note the time.
   5. **A**: reload the `id-token-hint` tab → **401** (body is either `{"error":"unauthenticated"}` or the standard error envelope; the status is what matters).
   6. **A**: re-run the console snippet from step 3 → **no user data**: either an HTTP 401 error, or `{"data":{"me":{"id":"me-","user":null}}}`. ⛔ if the throwaway's email or id comes back.
   7. **A**: reload `/home` → not signed in as the deleted user (login page or anonymous home). ⛔ if the deleted user's dashboard renders.
**Evidence.** Provider list with ✅ per provider; the two console outputs from steps 3 and 6.
   **Result 09.09 on ACC (`release/75`):** step 5 ✅ `401 {"error":"unauthenticated"}`; step 6 ✅ HTTP 401, GraphQL `UNAUTHENTICATED`, `error_code: account_deleted`, `data: null` — no user data. Step 7 not yet recorded.

### P18 — New REST surface
The two routes (`content.signing.controller.ts`, prefix `rest/content-signing` under the private REST path `/api/private/rest`):
- `GET /api/private/rest/content-signing/<attemptId>/snapshot` — sends the PDF; `401` when there is no session.
- `GET /api/private/rest/content-signing/complete` — the Cleverbase return leg; without a session it throws `UnauthenticatedHttpException`, which the route's filter turns into a `302` redirect to `/login?returnUrl=…`.
1. Unauthenticated, from any shell:
   ```
   curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://acc-alkem.io/api/private/rest/content-signing/00000000-0000-0000-0000-000000000000/snapshot
   curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://acc-alkem.io/api/private/rest/content-signing/complete?state=x&code=y'
   ```
   Expect `401` for the first; `302` with a `/login?returnUrl=…` redirect (or `401`) for the second. **Never `500`**, never a stack trace in the body (`curl -sS -i … | head -20`).
2. Authenticated as 👤C without the entitlement: copy the `alkemio_session` cookie from DevTools and repeat with `-b 'alkemio_session=…'`; expect `404`/`403`/`400`-class refusals, not `500`.
3. Confirm the ACC ingress exposes nothing new beyond the existing `/api/private/rest` prefix.
**Evidence.** The two status lines from step 1.

### P19 — Reader-visible signatures (decision)
No test step. Record: ☐ product accepts that any memo reader can see signed copies and the signer / ☐ rejects → block. Confirm the release notes name it.

### P20 — Governance (decision)
Record: ☐ release lead acknowledges server#6468 merged against its own "do not merge" with 0 approvals (R-2) · ☐ business approval · ☐ `trust-gateway` added to `repos.yaml` before infra-ops#2649 merges · ☐ story #2117 corrected: three migrations; #6478 #6482 #10278 #10280 in scope; R-1 mitigated.

---

## 5. Regression scope

What existing behaviour the changed code sits under. Everything not listed is untouched by this release and gets only the standard §3 smoke pass. Effort goes to the rows whose **automated net** is *none*.

### 5a. Server

| Area | Why it is in scope | Automated net | Manual regression | Validation (local run 09.09) |
|------|--------------------|---------------|-------------------|------------------------------|
| Every database query | TypeORM package swapped under all of TypeORM (#6472) | API nightly, all projects | **R-S1** | 🤖 green — roleset 165, storage 918, templates 27, callouts 136, journey 265, entitlements 22 |
| Every authenticated request | Actor-context population now also loads the user's `authenticationID` (#6468) | Implicit in every API suite | **R-S2** | 🤖 login/logout/re-login spec green in isolation · 🖐 social providers |
| Space / subspace / template-based space creation; license evaluation | Default entitlement list gains a memo-signing flag in three creation paths and in the L0 license evaluator (#6478) | `test:entitlements`, `test:templates` — **see expected reds below** | **R-S3** | 🤖 journey + entitlements + templates green · 🖐 R-S3 step 2–4 |
| Memo read, edit, delete | `Memo` type gains `signatures`; delete clears signing attempts first (#6468) | **None** — memo has no API coverage | **R-S4** | 🖐 manual — no automation |
| Storage-bucket deletion (memo, callout, subspace, space, account) | New guard on both bucket-delete paths (#6468) | `test:storage` (auth + upload only) | P16 | 🖐 manual (P16) |
| File-service adapter | Snapshot creation refactored into a generic internal-document method (#6468) | `test:storage` uploads | **R-S5** | 🤖 storage uploads green · 🖐 visuals + download/replace |
| Whiteboard drafts and canonical whiteboard delete | Sweep activated (#6437) | **None** | P9 | 🏗 + 🖐 (P9) |
| Login / session resolution | Kratos service changed twice (#6468, #6482) | Email/password only | P17 | 🤖 email/password green · 🖐 providers · ⚠️ see session-revocation note in §7 |
### 5b. Client-web

| Area | Why it is in scope | Automated net | Manual regression | Validation (local run 09.09) |
|------|--------------------|---------------|-------------------|------------------------------|
| Every page with a loading state | Three loading components consolidated, **45 importers** (#10264) | `callouts`, `memberships`, `applications` Playwright pass through them | **R-C1** | 🤖 memberships/applications green in isolation · 🖐 slow-network + short page |
| Space shell, header, sidebar, tab pages, protected routes | Layout files changed under the loading rework (#10264) | Same suites, incidentally | **R-C2** | 🤖 partial (public-space, memberships green) · 🖐 R-C2 |
| Callout feed and contributions | Per-card Suspense, contributions preview rewrite, data mapper, reactions connector, lazy items (#10264) | `callouts/0.1–0.9`, `contributors-callout` | **R-C3** | 🤖 callouts 0.1–0.9 green · 🖐 feed with slow card, >10 contributions |
| Every Radix overlay | Global CSS rule (#10264) | **None** | P7 | 🖐 manual |
| Whiteboard editor; public whiteboard page | Excalidraw wrapper/binding and public page touched (#10264) | `non-member-whiteboard-access`, `whiteboard-template` | **R-C4** | ⚠️ 2 CRD whiteboard-template specs red in isolation — **needs eyes** (§7) · 🖐 R-C4 |
| Markdown rendering | `ExpandableMarkdown` rewritten, 2 importers (#10264) | **None** | **R-C5** | 🖐 manual |
| Four admin role surfaces | Gating + lead-role fix (#9537, #10280) | API roleset matrix only | P1–P6 | 🤖 server side green · 🖐 UI (P1–P6) |
| Contributor settings role view | `RoleAssignmentView` changed, 3 importers (#9537) | **None** | **R-C6** | 🖐 manual |
| Memo dialog | Signing dialog and eligibility gate wired in (#10273, #10278) | **None** | P13 + **R-S4** | 🖐 manual |
### Regression procedures

**R-S1 — Database layer.** Pre-flight §1: full API nightly on the release candidate. Post-deploy 30 min APM: query-error rate, p95, and the Postgres connection count from pgbouncer unchanged. No manual steps beyond that; the behaviour change was disproven by file-hash comparison (R-1 of the morning story).

**R-S2 — Actor context.** Covered by P17 steps 1–3 plus: as 👤M, a normal browsing session (dashboard, a space, a callout, a profile) shows nothing new in server logs at error level; response times for `me` and `platform` queries in APM unchanged.

**R-S3 — Creation paths and licenses.**
1. 👤P: create a new L0 space; create a subspace; create a space **from a template**. All succeed.
2. Query `license { entitlements { type enabled limit } }` on each: the pre-existing flags (`SAVE_AS_TEMPLATE`, `VIRTUAL_CONTRIBUTOR_ACCESS`, `WHITEBOARD_MULTI_USER`) carry their previous values; memo-signing present, off.
3. On a space whose plan grants whiteboard multi-user: open a whiteboard with 👥 in a second session; both cursors visible (the L0 evaluator was edited next to this flag).
4. Platform admin license plans page renders; toggling an **existing** flag on the test space still works.

**R-S4 — Memo lifecycle.** For a callout-framing memo, a memo contribution, and a memo from a template: create, open, type (headings, list), reload → persists; 👥 edits the same memo concurrently → converges; rename; delete. Then P13 for the absence of Sign. This is the checklist's 🔴 memo row, run in full this release.

**R-S5 — File-service adapter.** Upload an image into a post and into a memo; set a space banner and a user avatar; download a document from a callout; replace and delete it. All render and resolve; file-service logs free of errors from the server's adapter.

**R-C1 — Loading states everywhere.** P8, plus normal-network first loads of: home dashboard, explore, a user profile, an organization profile, platform admin. No blank screen longer than the indicator, no double indicator, no layout jump at content arrival.

**R-C2 — Space shell.** As 👤M and as 👤A: space dashboard → each tab (Community, Subspaces, Knowledge, Settings where allowed) → a subspace → back; sidebar search finds a callout; subspaces section lists them; leads block shows the leads; header breadcrumbs and avatar menu work; a protected route (Settings) redirects 👤M and admits 👤A.

**R-C3 — Callout feed.** `callouts/*` Playwright green, then: a callout with >10 contributions paginates and the header count matches; react to a post; open the task-board dialog; the space "collection" callout lists correctly; lazy items load on scroll.

**R-C4 — Whiteboards.** Open an existing whiteboard, draw, save, reload → persists; 👥 sees the change live; the **public** whiteboard page opens anonymously (`non-member-whiteboard-access` green).

**R-C5 — Markdown.** Wherever `ExpandableMarkdown` is used (long callout / post descriptions): expand, collapse, links clickable, images render, no clipped text.

**R-C6 — Contributor settings role view.** User settings → roles/memberships and organization settings → roles: the view renders the current roles and the available actions behave as before for 👤M, 👤O, 👤P.

### Expected suite reds (triage before treating a suite as a signal)

- **`test:entitlements`.** Predicted red because the fixtures enumerate three `SPACE_FLAG_*` types and do not know memo signing. **Ran green locally against `release/75` (6 files, 22 tests, 09.09)** — the specs compare account-level entitlements, not the space flag list, so the memo-signing flag is invisible to them. No fixture change needed; the space-flag list itself is only checked by procedure R-S3 step 2.
- Everything else red is unexpected → triage as a product finding first.

---

## 7. Local run — 09.09, both repos on `release/75` heads

**Setup.** Fresh worktree of test-suites `develop` (e8fabb20); harness users self-registered into the fresh local Kratos; server the local `server` clone @ `3380895cc` and client the local `client-web` clone @ `2062b784d`, both exactly `release/75`. API projects and the Playwright suite ran **concurrently** against the single-replica dev server; every Playwright red was then rerun alone with one worker against an idle server.

**Local-run note (messaging suites).** `lib/src/utils/messaging-digest-windows.ts` derives every sleep and per-test timeout from `MESSAGING_DIGEST_*` env vars and falls back to the **production** windows (e.g. `EMAIL_DIRECT_MAX_DELAY_SECONDS=1800`). The test-suites `.env` files do not carry these; export the same nine values the local server was started with (from `server/.env`) before running `messaging-notifications/*`, otherwise the suites wait tens of minutes for windows the server closed in seconds.

### 7a. API (`server-api`, vitest) — all green

| Project | Result | Covers |
|---------|--------|--------|
| roleset | 165 passed, 3 skipped | privilege matrix incl. `SPACE_ADMIN` / `GLOBAL_SUPPORT_ADMIN` (server side of rows 1–6), applications, invitations |
| entitlements | 22 passed | account entitlements; **does not** inspect the space-flag list (R-S3 step 2 stays manual) |
| storage | 918 passed | document auth matrix + uploads (file-service adapter, R-S5) |
| templates | 27 passed | template CRUD (R-S3) |
| callouts | 136 passed, 11 skipped | callout lifecycle (R-C3 server side) |
| journey | 265 passed, 9 skipped | space/subspace creation, conversion, moves (R-S3) |

### 7b. Playwright (`client-web`, headless Chrome, default config = every spec)

Full run under load: **238 passed, 27 failed, 28 skipped, 157 did not run** (the 157 are serial-mode siblings of a failed test — 26 spec files run serially). Isolated rerun of the 27: **8 passed, 19 failed**.

**Passed in isolation → load flakes, not findings (8):** applications 2.5 and L1 2.1, `authentication-login` logout/re-login, both memberships dashboard/profile specs, messaging US1/US2 setup, TS7 readiness (the readiness endpoint returned 503 once under load; 200 with Redis + JWKS ok afterwards — note against the story's "probes commented out" remark, R-5).

**Still red in isolation (19), attributed:**

| Spec(s) | Attribution | Action |
|---------|-------------|--------|
| `support-navigation` ×2 | **env** — documentation site not running locally (spec's own header note) | none |
| `contributors-callout` 1.3 | **test drift** — the spec (July, #549) expects all three type tabs; since feature 025 (client #10048, 20.07, in prod at `0.163.0`) `ContributorCollection` renders a tab **only for types with a non-zero count** and the fresh scenario has zero VCs. Not an R75 change | **Fixed 09.09** on branch `test/release-75-verification`: scenario now hosts one VC on the base org and makes it a space MEMBER via a new `assignRoleToVirtualContributor` harness wrapper; 1.4 asserts the member VC card instead of the empty state. **10/10 green locally.** |
| `non-member-subspace-navigation` 5.4 | **test drift** — the spec used accessible names that never matched the CRD header ("Start video call", "Recent activity"); the real names are the link **"Video Call"** and the button **"Activity"**, unchanged since the April space-page rework and identical in `0.163.0`. The video-call link **does** render for a non-member. | **Fixed 09.09** on the branch: assertions use the real names; file green locally |
| `us3-messaging-settings-rows` AS3 | **load flake + harness env gap.** AS3 failed under concurrent load in the register-and-verify helper. Isolated reruns then looked "stuck": the harness derives every sleep from `MESSAGING_DIGEST_*` env vars and, without them, assumes the **production** windows (email-direct max delay 1800 s) while the local server runs with seconds-long windows. | **Closed 09.09**: run with the server's nine `MESSAGING_DIGEST_*` values exported into the harness env → **5/5 green in 1.6 min**. Local-run note added to §7. |
| `mcp-api-keys-*` ×4 | **env** — local Traefik does not route `/rest/mcp` (spec's own note); reveal input times out | none |
| `session-revocation` ×2 | **spec assumption, product correct** (confirmed on ACC `release/75` and locally). The first request a revoked session makes gets 401 (`account_deleted`) and the interceptor clears the cookie on that response; later requests from the same context are cookie-less and anonymous. The specs replayed the cleared context, not a stale cookie. | **Fixed 09.09**: new `captureSessionCookie` + `*WithCookie` probes replay the **stale cookie explicitly**; G2/R1/R2 now assert the real property (stale cookie → 401, never anonymous 200) and pass; blast-radius asserts the first probe strictly and the second as "not the victim". **Both files fully green locally (11/11).** |
| `templates/` legacy ×4 | **test drift** — expected copy that no longer exists; the folder was not in the nightly config, `templates-CRD/` replaced it | **Deleted 09.09** on `test/release-75-verification` (31 files, nothing imported them; typecheck clean; plan appendix repointed to `templates-CRD/`) |
| `applications` 1.0 "Apply NOT shown on public L0 dashboard" | **test drift** — the expectation dates from PR #10000 (July); the sidebar Apply widget for non-members was added by client #10194 on 26.08 and is in `v0.163.0` (prod) already, so not an R75 change | **Fixed 09.09** on `test/release-75-verification`: 1.0 now asserts one enabled Apply button for a non-member on a public L0 dashboard (sidebar widget, client #10194). Green locally. Not a release finding |
| `ts7-platform-smoke` US2-AS4 / US2-AS1 | **test drift / cold readiness** — AS4 asserted copy that does not exist in the CRD dashboard; AS1 hits a 503 on the very first readiness request after idle (500 ms per-dependency budget, 2 s cache). | **Fixed 09.09**: AS4 asserts the "Explore all Spaces" button; AS1 warms the endpoint (≤5 retries) before asserting. **File green locally (4/4).** |
| **`templates-CRD/whiteboard-template` 1.1 and `templates-CRD/callout-tests` 3** | **Resolved 09.09 (late).** Test side: since the live-authoring rework (client-web#10205/#10213, in 0.163.0) the editor autosaves and has no Save button — the helpers were clicking the "Save status" popover trigger and leaving the editor open; the template dialog is retitled *Edit* once drawing starts. Fixed in the shared helpers (`closeWhiteboardEditor`: wait for "Saved", then "Close whiteboard"); `whiteboard-template` 4/4 green. Product side: a callout template with a whiteboard framing gets **no preview image** (placeholder shown, also after reload) while a standalone whiteboard template does → **client-web#10283**, pre-existing since 0.163.0, not R75; the framing-preview assertion is kept and marked `test.fail` with the issue. Two further drift repairs in the same suite: the contribution-defaults dialog materialises its default whiteboard asynchronously (wait for the labelled Edit), and an existing default whiteboard is no longer redrawn in place — the usage walk now asserts "Clear default" + "Choose a template…" instead of an Edit button. `callout-tests` whiteboard cases: 18/18 (8 as expected failures on #10283). Original text follows. **needs eyes — release-relevant.** 1.1: after creating a whiteboard template the dialog is titled *Edit whiteboard template*, the spec expects *Create whiteboard template*; the Save button exists under the other title. 3: after creating a callout template with whiteboard framing, a *Whiteboard draft* dialog with the drawing canvas stays open. Both sit on the whiteboard-draft materialisation path (#6437) and the Excalidraw wrapper touched by #10264. | **Manual, before sign-off:** create a whiteboard template and a whiteboard-framed callout template on ACC; confirm the dialog closes, the template is saved once, and no orphan draft is left (check P9 step 3 query for a new draft row) |

**Net for the release rows:** nothing in today's run contradicts the release; the two CRD whiteboard-template reds are the only unexplained items and are now a named manual check under R-C4 and row 9.

### 7c. New automation written during the run (09.09 evening) — all green locally

| Suite | Cases | What it pins |
|-------|-------|--------------|
| API `entitlements/memo-signing-entitlement.it-spec.ts` | 8 | entitlement present+disabled on new space and subspace; `prepareMemoSigning` refused on the entitlement (admin, member; L0, L1); plan grant → L0 enabled, subspace inherits; refusal moves to "Link a Cleverbase identity"; revoke closes the gate. Harness fix: `revokeLicensePlanFromSpace` document selected `Space.actor`, which the server cannot resolve → every revoke looked failed |
| `authz-admin-guard/space-community-role-changes` | 7 | rows 1, 2 (space surface): space admin Lead/Admin/Remove persist, no denied toast; GLOBAL_SUPPORT enabled and honoured; plain member has no admin surface |
| `authz-admin-guard/org-associates-authorization` | 7 | rows 2, 3: org admin add/remove Associate and Admin persist; Owner gated for a non-owner admin. **GLOBAL_SUPPORT probe: Associates control gated off with the permission tooltip** — the R-2 mismatch in the *deny* direction (client requires `ROLESET_ENTRY_ROLE_ASSIGN`, server would accept `GRANT`); Admin probe inconclusive (no associate candidate because the add was gated) |
| `authz-admin-guard/platform-global-roles` | 3 | row 4: global admin add/remove on `GLOBAL_COMMUNITY_READER`; GLOBAL_SUPPORT never offered an enabled control |
| `authz-admin-guard/unverifiable-and-denied` | 3 | rows 5, 6: missing `myPrivileges` → no members listed, no Actions (fail-closed all the way, since READ is gone too); READ-only privileges → controls disabled with the tooltip; FORBIDDEN on `AssignRoleToUser` → toast, nothing applied |
| `authz-admin-guard/memo-sign-action-gate` | 2 | rows 13, 14: no Sign action with the entitlement off; still none with it on (identity gate) |

**Finding, corrected (10.09):** `GLOBAL_SUPPORT` cannot add an organization associate through the UI — and, verified via the API, **the server refuses it as well** (`GLOBAL_SUPPORT` holds no `GRANT` on organization role sets; only `CREATE/READ/UPDATE/DELETE` on the organization plus `ROLESET_ENTRY_ROLE_ASSIGN`, which the server never consults for organizations). After #10280 the client gate is therefore correct. client-web#10282 was filed on the wrong premise and is closed; what remains is a policy question for product, not a defect.

### 7d. Nightly on Test (branch run 34400225017, 09.09 20:18Z, at `8cda18dd`) — 5 reds, all attributed

| Spec | On Test | Attribution | Action |
|------|---------|-------------|--------|
| `authz-admin-guard/unverifiable-and-denied` 5.1 (flaky), 5.2 | route handler raced a reload: "Route is already handled" → the fault never applied, so 5.2 saw full privileges | **harness race** | `rewriteResponse()` swallows the aborted-request error; file 6/6 ×2 locally |
| `templates-CRD` whiteboard-template 1.1, callout-tests 3 | the templates fix was not yet pushed (waiting for the signing key) | **pending commit** | commit + push the staged templates-CRD changes |
| `tests/callout-reactions` US1-AS1 | "Add reaction" not found inside `locator('div').filter({has: heading}).last()` — the Release 75 feed rework (#10264) adds Suspense wrappers between heading and action row; then the picker opens on **click** (never hover), options are named by **label** ("Hugging face"), the who-reacted list lives in a **dialog**, and its rows carry a relative time ("5 seconds ago") | **locator drift, 4 items, one of them R75-induced** | fixed; project 3/3 locally |
| `tests/callout-reaction-notifications` US1-AS1 | 0 in-app rows within 30 s | **Test-env timing** — passes locally in 17 s with the server's digest windows; Test runs production-length windows | none on the test side; note for the env owners |

### 7d′. Nightly on Test, later branch runs (10.09 06:02Z 34443505330 and 10:17Z 34465255549, both at `3951bf72`)

06:02Z: 32 reds across unrelated areas (user-profile, timeline, chat-avatars, language-offer, account-deletion, every templates-CRD 1.0 "Navigate to templates settings") — the Test environment was not healthy during that run; not attributable to the branch. 10:17Z: 6 reds.

| Spec | On Test | Attribution | Action |
|------|---------|-------------|--------|
| `authz-admin-guard/unverifiable-and-denied` 5.2 (3/3 attempts, Lead checkbox **enabled**) | The fault was injected into `RoleSetAuthorization` only. The Community tab also fetches `CommunityApplicationsInvitations`, which selects the same `roleSet { id authorization { myPrivileges } }`; Apollo merges both into `RoleSet:<id>`, so whichever response lands last wins. Locally the rewritten one wins; on Test the untouched one does. Not the product: the gate itself is correct on both | **harness — cache-merge race** (the 09.09 "already handled" fix addressed a different, earlier symptom) | `injectRoleSetAuthorizationFault()` now rewrites this role set's authorization in **every** GraphQL response; 5.2 also checks the tooltip on Admin and Remove (CodeRabbit) |
| `applications/space-applications-level-1` 2.3, 2.4 · `default-template` 1.1 | scenario setup: `Cannot query field "descriptionDisplayMode" on type "InnovationFlowStateSettings"` | **Test server behind the schema** — the field has been in `schema.graphql` since #6256 (July); the Test server answering at 10:17Z predates it (mid-deploy or rollback) | none on the test side |
| `templates-CRD/callout-tests` 42 (Poll) | stalls at Cancel in `verifyPollSettings` | **pre-existing, untouched path** (noted 09.09) | backlog |
| `tests/callout-reaction-notifications` US1-AS1 | 0 in-app rows within 30 s | **Test-env digest timing** (as 7d) | none |

### 7e. Manual findings on ACC (10.09)

| Row | Finding | Where |
|-----|---------|-------|
| M11 / R-C3 | In a Call-for-posts callout with several cards, opening a different card makes the post dialog refresh instead of switching in place. **Firefox and Chrome, and present in production `0.163.0`** → pre-existing, **not a Release 75 regression**; the #10264 Suspense boundary is not the cause. Filed for the backlog. | [client-web#10288](https://github.com/alkem-io/client-web/issues/10288) |
| M4 / P7 / R-7 | **Safari:** scrolling inside the chat sheet also scrolls the page behind — the body scroll lock behind Radix overlays does not hold. Functional, not cosmetic, so R-7's *Low* no longer stands for Safari. Suspect: the #10264 `index.css` block (`scrollbar-gutter: stable` on `html` + `body[data-scroll-locked] { margin-right: 0 !important }`) or the chat panel's own scroll container. Revert candidate: that 12-line CSS block. | [client-web#10284](https://github.com/alkem-io/client-web/issues/10284) |

---

## 6. Sign-off

| Gate | Owner | State |
|------|-------|-------|
| Automated suites green, or reds triaged (only the entitlement fixture delta accepted) | Verification lead | ☐ |
| §3 manual gap flows complete, no open ⛔ (memo row R-S4 run in full) | Verification lead | ☐ |
| §4 rows 1–21 complete | Verification lead | ☐ |
| §5 regression procedures complete | Verification lead | ☐ |
| **Business approval** (R-1, R-2, R-14 decisions recorded) | Release Lead | ☐ |
| **QA acceptance sign-off** | Quality Lead | ☐ |
| **Go / no-go for production** | Release Lead | ☐ |
