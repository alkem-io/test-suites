# Release 75 — tracker

Server `0.165.0` · client-web `0.164.0` · ACC on `release/75` since 09.09 evening · story alkem-io/alkemio#2117.
Details for every line: `release-75-verification.md` (procedure ids P#, R-#).
Tick here. ⛔ = blocker.

> **Released to PROD 11.09 (morning).** ACC verification passed; migrations applied without incident. Remaining rows below are post-release record-keeping.

## Manual on ACC — QA lead

| # | Check | Details | Status |
|---|-------|---------|--------|
| M1 | Space Community: **Invite** a member as space admin (role changes are automated) | P1 step 6 | ✅ 10.09 |
| M2 | Org Authorization **as an Owner**: add/remove an admin and an owner | P3 | ✅ 10.09 |
| M3 | Platform admin license-plan screen shows **Memo Signing**, existing flags intact | P14 step 1 | ✅ 10.09 — plan visible; the Sign action appears only for a Cleverbase-linked identity (by design). **Signing end-to-end: ✅ 11.09** — gates A1–A6, happy path as platform admin / space member / space admin, signed PDFs validated with the EU DSS validator, delete signed memo, foreign edits on own memo. ⚠️ findings in the signed PDF, all new-feature scope, none blocking: [server#6498](https://github.com/alkem-io/server/issues/6498) bullets in table cells dropped · [#6499](https://github.com/alkem-io/server/issues/6499) emoji missing · [#6500](https://github.com/alkem-io/server/issues/6500) line breaks in bullets collapsed · [#6501](https://github.com/alkem-io/server/issues/6501) wide images cut off · [#6492](https://github.com/alkem-io/server/issues/6492) memo with a missing image file cannot be signed (pre-existing data, repair needs a decision) · product decision [client-web#10294](https://github.com/alkem-io/client-web/issues/10294) independent verification path (→ D6). Decline ✅ (back on the memo with a cancelled message); foreign attempt id ✅ (public space: memo + signed copies visible anonymously, nothing else; private space: nothing via direct link). Plan revoke after signing ✅. Open: expiry sweep only (operator, O2; `release-75-memo-signing-tests.md` C3) |
| M4 | Overlays (dialog, sheet, dropdown, select) in **Chrome, Safari, Firefox**, scrolling + short page | P7 | ✅ 11.09 Chrome/Firefox and the other Safari overlays clean → [client-web#10284](https://github.com/alkem-io/client-web/issues/10284) is scoped to the **chat sheet**, not global CSS · Safari-only, cosmetic, not blocking |
| M5 | Loading states on Slow 3G: dashboard, subspace, callout, short page, feed with a slow card | P8 | ☐ |
| M6 | Open/edit/save the three memo kinds after the paired deploy; two users editing at once | P12, R-S4 | ✅ 10.09 |
| M7 | Whiteboard: draw, save, live sync on ACC. (Template creation now automated: `templates-CRD/whiteboard-template` 4/4 green; callout-template whiteboard framing creates fine but has **no preview image** → client-web#10283, pre-existing since 0.163.0) | R-C4 | ✅ 10.09 — live sync between two users and persistence after reload as expected |
| M8 | **Every social/SSO provider** login; a pre-deploy session survives | P17 | ✅ 10.09 |
| M9 | Session revocation: login as throwaway → delete as admin → old session gets 401 / no user data | P17 step 5 | ✅ 09.09 (steps 5–6) · ✅ 10.09 step 7 (reload home → not signed in as the deleted user) |
| M10 | Two content-signing REST routes: unauthenticated → 401/403/404, never 500 | P18 | ✅ 10.09 — snapshot `401`; complete `302 → /login?returnUrl=/api/public/rest/content-signing/complete…` (filter deliberately rewrites to the public prefix) |
| M11 | Space shell walk as member and admin (tabs, sidebar search, subspaces, leads, protected route) | R-C2 | ✅ 10.09 — finding: post dialog refreshes when switching cards in a multi-card Call-for-posts callout, **Firefox + Chrome, also on prod 0.163.0** → pre-existing, [client-web#10288](https://github.com/alkem-io/client-web/issues/10288), not R75 |
| M12 | Markdown expand/collapse; contributor-settings role view | R-C5, R-C6 | ✅ 10.09 |

## Operator / cluster — before PROD

| # | Check | Details | Status |
|---|-------|---------|--------|
| O1 | Migration window: long-writer check on `file`/`memo`, `lock_timeout = 3s`, **three** migrations applied, `signing_attempt` empty, backfill count matches | P11, `release-75-migration-queries.sql` | ☐ migration list/count, `signing_attempt` · ✅ 10.09 backfill on ACC: 1936 space + 2390 collaboration licenses all carry the flag; 5+5 enabled rows = two L0 grants ("This & that", "orgLicense-is this premium") inherited by their subspaces |
| O2 | Whiteboard sweep: one clean hourly tick (no `42703`), expired-draft count on ACC + PROD, back-dated positive, callout-to-Draft negative | P9 | ☐ |
| O3 | Pod Ready, no trust-gateway errors; `trust-gateway` **present + Ready on ACC** after the 10.09 e2e deploy, absent on PROD until promotion | P15 | ☐ |
| O4 | Rollback digests present; runbook says redeploy **both** images together | P10, P12 | ☐ |
| O5 | Post-deploy: APM error rate + p95 for 30 min | P10 | ☐ |

## Decisions to record

| # | Decision | Status |
|---|----------|--------|
| D1 | Product accepts reader-visible memo signatures; release notes name it (R-14) | ☐ |
| D2 | Release lead acknowledges server#6468 merged against its own "do not merge" (R-2); business approval | ☐ |
| D3 | `trust-gateway` added to `repos.yaml` before infra-ops#2649 merges | ☐ |
| D4 | Story #2117 corrected: three migrations; #6478 #6482 #10278 #10280 in scope; R-1 mitigated | ☐ |
| D5 | `virtual-contributor` SSRF tag cut / deferred again; `collaboration-service` second deferral | ☐ |
| D6 | Signed-copy verification: keep the in-app Verify for R75 and treat client-web#10294 (independent verification path) as a follow-up; memo → PDF fidelity bugs #6498–#6501 patch-level; #6492 data repair authorised or deferred | ☐ |

## Done (automation, 09.09, local stack on `release/75`)

- API: roleset, entitlements, storage, templates, callouts, journey — green (1 533 tests); + new `memo-signing-entitlement` (8).
- Playwright: 238 green under load; every red attributed; 11 drifted assertions repaired; legacy `templates/` removed.
- New `authz-admin-guard/` (22): admin role surfaces ×4, fail-closed/denied paths, memo Sign gate.
- PR: alkem-io/test-suites#633 (3 commits; CodeRabbit round 1: 6 comments, all fixed in `bc1f9e49`, re-review requested 11.09) · bugs filed: client-web#10279 (fixed by #10280), client-web#10281, client-web#10283 (whiteboard framing preview, pre-existing), client-web#10284 (Safari scroll-through, **R75**), client-web#10288 (post dialog refresh, pre-existing); #10282 filed in error and closed.

## Sign-off

| Gate | Owner | State |
|------|-------|-------|
| M1–M12 done, no open ⛔ | QA lead | ✅ (M5 skipped as low impact) |
| O1–O5 done | Operator | ☐ |
| D1–D6 recorded | Release lead | ☐ |
| **QA acceptance sign-off** | Quality Lead | ✅ 11.09 |
| **Go / no-go PROD** | Release Lead | ✅ go — deployed 11.09 |
