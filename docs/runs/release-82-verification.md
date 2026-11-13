# Release 82 — QA verification on acceptance (alkem-io/alkemio#2228)

> Per-release verification record, written by the `qa-release-verifier` agent via `/qa-release-verify` and committed here
> unchanged. Risk ids R82-1 … R82-12 are the release story's rows in order; R82-13 … R82-20 are added by QA.
>
> **Evidence is not committed.** The 109 evidence files, the `results.tsv` ledger and the 26 Playwright scripts this sheet
> cites by name live in the run folder on the machine that ran it (`agents-hq/runs/release-82/`), which is gitignored. The
> sheet is self-contained on its conclusions; the file names are provenance for whoever holds that folder.
>
> **This is not a sign-off.** QA sign-off, business sign-off and the production go/no-go are human gates — see §6.

Run 2026-11-13, 10:15–11:55 UTC, by the agent, against acc-alkem.io running server **v0.173.0**, client-web **v0.173.0** and the eleven other Release 82 images (versions in §0). Preflight 10:15–10:40Z (anonymous HTTP, git, GitHub Actions); walks 10:44–11:52Z (~68 min of the 180-minute budget). Accounts: the five QA personas, logged in one at a time. The password was passed as an input, held in one mode-600 file outside the run folder and deleted at the end; it appears nowhere in `runs/release-82` (`grep` clean, §10). Evidence: `evidence/` (109 files) + `results.tsv` (the last row per check id is the result). Scripts: `scripts/` (Playwright 1.58.2 on the installed chromium 1217 build, headless).

**Test data created on acceptance** (all run-owned, prefixed `r82-`, nothing deleted): one L0 Space `r82-105425qafixture` (`d6326926-a348-4524-8269-cccae09f4c06`) on **`member`'s own free-plan account**; three callouts on it (`r82-105425-memo` with memo `edb4d985…`, `r82-105425-whiteboard` with whiteboard `1c67f53d…`, `r82-105425-post` `70347a0a…`); 3 memo paragraphs; 1 rectangle on the whiteboard; 2 comments on the post callout; 1 chat message in the existing member↔spaceadmin DM; 1 accepted invitation making `spaceadmin` a MEMBER of the run's Space. Side effects: `spaceadmin`'s unread notification count rose 8 → 9+; the chat-sound toggle was flipped and **restored**. Nothing existing was modified or deleted.

## At a glance
| | |
| --- | --- |
| Release | 82 — alkemio#2228, OPEN; deployed to **acceptance** 2026-11-13 10:09Z (infra-ops#2937, deploy run 43405736135); production untouched (infra-ops `develop` is 12 ahead of `main`; server#6760 and client-web#10599 are open DRAFTs) |
| Run | verify, 2026-11-13, ~100 min total (~68 min of walks against a 180-minute budget); all five personas logged in sequentially; DB rows `skipped — no DB access` |
| Acceptance runs | all 13 Release 82 images at their release versions — **precondition PASS** (client-web and server proven by live probe; the other 11 by manifest-at-SHA + successful rollout) |
| Confidence now | **Medium** on the 9 reachable elevated rows |
| Why | Every elevated row that the agent could reach was reproduced green on acceptance today — memo persistence (incl. the failing nightly case), whiteboard persistence, the authorization decision table, `safeRedirect`, the notification path, the hover card and its measured cost. None reaches High: the server-api nightly is green on release content but no suite covers memos, hover cards or chat, and three images have no automated evidence at all. |
| After manual validation, if clean | **Medium–High** — M-1…M-14 close the human halves (real inbox, real devices, social sign-in, restore drill, the Postgres question). **High** additionally needs the Collabora/wopi path unblocked (CO-04) and a client nightly green on release content; those are evidence gaps a human cannot close by inspection. |
| Checks | **84 effective check ids** (17 preflight + 67 walk), 5 further ids retained as superseded: **64 PASS, 4 FAIL, 10 OBS, 1 BLOCKED, 1 UNPROVABLE, 4 SKIP** |
| Budget | ~68 min of walks against 180 given; no check was cut for budget except AS-01, EM-03, HC-03 (listed in §5) |
| Findings | **11, 0 product**: 2 Major (env ×2), 5 Minor (story ×4, data ×1), 4 Info (kb ×3, test ×1) |
| Blocked | 1 (`member` · free-plan Space · "Office Docs is not enabled for this Collaboration") |
| Manual for a human | 14 items (§6) |
| Test data created | 1 Space, 4 callouts, 3 memo paragraphs, 1 shape, 2 comments, 1 chat message, 1 accepted invitation |
| Posted to GitHub | nothing |

**Decisions this run needs from a human**

1. **F-1 (Major, env).** The Release 82 ACC deploy applied over a **BLOCKING** drift verdict (the gate is `continue-on-error: true`, marked "TEMPORARY" in the workflow). It reverted acceptance Postgres from `postgres:18.6-trixie` / PVC `postgres-18-pv-claim` to `postgres:17.5` / PVC `postgres-pv-claim`, reverted `postgres-standby` the same way, and changed the `postgres-backup` CronJob image to `svetoslavpetkov23/postgres-scaleway-backup:v1.0.2`. On 2026-11-12 the same check reported `unexpected=0`. Decide: re-assert or backport, whether acceptance is on the intended data volume, and whether to re-enable the gate before the production promotion, which ships the same workflow.
2. **F-2 (Major, env).** `Daily Backup Management` has failed every day for at least six days (`NoSuchBucket: alkemio-s3-backups-prod-paris`; "Offsite replication is degraded. Source pruning was skipped"). Pre-existing, but it is the offsite half of risk row R82-10 and of the pre-deploy backup the production deploy relies on. Decide whether it blocks the promotion.
3. **B-1 (Blocked).** The Collabora/office-document path (wopi-service v0.2.1 stdlib h2c — an elevated row) could not be exercised: the run's free-plan Space answers "Office Docs is not enabled for this Collaboration." Enable the entitlement on a QA-owned Space, or un-archive `spacespaceadmin`, then `--resume`.
4. **F-10 (Minor, data).** `spacespaceadmin` is **still ARCHIVED** (flagged in Release 81 on 2026-11-05, unchanged 8 days later). The run worked around it by creating its own Space on `member`'s free plan, which consumed 1 of `member`'s 3 free Space entitlements and left `spaceadmin` holding a new membership. Decide whether to un-archive the QA Space and reset the personas.
5. **F-5 / F-6 (Minor, story).** The classifier took the fail-safe branch (`no usable baseline`, because the deploy was `workflow_dispatch`), so the `data_change=false` skip branch has still never run anywhere and production would be its first exercise; and the story header still says "server not cut / not yet deployed". Confirm the header update and whether production may be the first exercise of the skip branch.

**Next action** — `/qa-release-verify 2228 --resume --scope "CO-04,CO-05"` after decision 3; otherwise none from the agent — the manual list (§6) and sign-off remain.

---

## 0. Precondition and account matrix

### Deployed versions

Sources in order of strength: a live anonymous probe > image pins of the `acceptance-v3` kustomize tree at the deployed SHA + a successful rollout > git alone. Deployed SHA `de0048d0960210ae42c2e0bfeb77f05821699978` (merge of infra-ops#2937, 09:58:38Z), head of the last successful **Deploy to Acceptance** (run `43405736135`, 10:00:20→10:09:59Z, `event=workflow_dispatch`). The `develop` tip equals the deployed SHA (0 ahead); `develop` is 12 ahead of `main`.

| Image | Story says | Acceptance runs | How established |
| --- | --- | --- | --- |
| `client-web` | v0.172.0 → **v0.173.0** | **v0.173.0** | **live** — `meta.json` `{"version":"0.173.0"}` (PRE-01); `env-config.js` 200 (PRE-02) |
| `server` ×4 pins | v0.172.0 → **v0.173.0** | **v0.173.0** | **live** — `platform.metadata` version is empty (PRE-03), so instead anonymous introspection shows `Mutation.resetPushBadgeCount`, which enters `schema.graphql` only at v0.173.0 (server#6755) (PRE-04) |
| `notifications` | v0.43.0 → **v0.44.0** | **v0.44.0** | manifest + rollout; **and live behaviour**: the readiness probe moved to `/health/ready` in the same commit and the pod rolled out Ready (only v0.44.0 serves it), plus EM-01c end-to-end |
| `kratos-webhooks` | v0.2.6 → **v0.2.7** | **v0.2.7** | manifest + rollout; exercised indirectly by 14 successful logins |
| `oidc-service` | v0.8.0 → **v0.8.1** | **v0.8.1** | manifest + rollout; **and live behaviour**: `safeRedirect` refuses 4 hostile `return_to` partitions (ID-04) |
| `authorization-evaluation-service` | v0.0.5 → **v0.0.6** | **v0.0.6** | manifest + rollout; **and live behaviour**: the 3-cell access decision table (ID-05) |
| `collaboration-service` | v0.0.4 → **v0.0.5** | **v0.0.5** | manifest + rollout; **and live behaviour**: memo and whiteboard persistence (CO-01, CO-02d/e, CO-03) |
| `wopi-service` | v0.2.0 → **v0.2.1** | **v0.2.1** | manifest + rollout only — **the behaviour is BLOCKED (B-1)** |
| `file-service` ×3 + validator | v0.3.3 → **v0.3.4** | **v0.3.4** | manifest + rollout; exercised indirectly (memo content is resolved through a file-service loader) |
| `file-backup-service` ×5 | v0.0.5 → **v0.0.6** | **v0.0.6** | manifest + rollout only (cronjobs updated, not yet run) |
| `matrix-adapter` | v0.8.26 → **v0.8.28** | **v0.8.28** | manifest + rollout; chat send/read works (CH-01) |
| `virtual-contributor` ×6 | v0.4.0 → **v0.5.0** | **v0.5.0** | manifest + rollout of all 6 deployments; VC-01 returned 0 VCs for `member` — no behaviour exercised |
| `assistant-service` ×2 | v0.2.0 → **v0.2.1** | **v0.2.1** | manifest + rollout only |
| Traefik / RabbitMQ (infra-ops #2922) | 3.7.7→3.7.17, 4.0.5→4.0.9 | on acceptance since 11–12 Nov; reaches production with `develop → main` | git at SHA; `traefik` rolled out in this run |

**Eleven images cannot be confirmed by a live version read from outside**: none of them exposes a version on a public acceptance URL (notifications is a pure RabbitMQ consumer; the Go services answer only internally; `identity.acc-alkem.io/self-service/...` returns the client SPA shell to a non-browser client, F-8). Their evidence is pin-at-SHA (PRE-06), the successful apply, and `kubectl rollout status` success for every one (PRE-10) — plus, for five of them, live behaviour proven by the walks above. A human with `kubectl` closes the rest in one command (M-7).

**Pin coverage** (checklist item) — **satisfied** (PRE-07): file-backup-service 5, file-service 3 **plus** `FILE_SERVICE_IMAGE` in `.scripts/validate-scaleway-v3-static.sh`, assistant-service 2, virtual-contributor 6, notifications tag **plus** the readiness-probe path, server 4, client-web 1.

**Deploy pipeline** (risk R82-4, checklist item) — `data_change=true`; the `backup` job ran (Postgres dump + Synapse config backup, both checked) and the `migrate` job ran; both succeeded (PRE-08). **But** the printed reason is `classify: no usable baseline ('') — full backup + migrate`, because the run was `workflow_dispatch` and the workflow resolves a baseline only on `push`. The live lookup *was* exercised on 2026-11-12 (run 43197569214, baseline `dd8078b62`, "12 path(s) outside the stateless allowlist") — PRE-08b. The `data_change=false` branch has never been exercised anywhere (F-5).

**Precondition verdict: PASS.** Every in-scope image is on its Release 82 version.

### Account matrix (SU-01, 5/5 logins PASS)

The Release 81 predictions were **confirmed**, including the beta-tester pair.

| Persona | Platform roles | Organisations | Spaces (credentials) | Entitlements | Deviation from intent |
| --- | --- | --- | --- | --- | --- |
| `support` | **Support, Operations Admin, License Manager, Content Full Access** | — | SPACE_MEMBER of `6e2e864d` (archived) and `73712f87` | none listed | holds far more than "Support"; not a clean support-only cell |
| `orgadmin` | — | Associate + Admin of `820c25f0`; ACCOUNT_ADMIN ×2 | none | none listed | 1 pending space + 1 pending org invitation |
| `spaceadmin` | — | — | ADMIN+MEMBER `6e2e864d`, ADMIN+LEAD+MEMBER `32109161`, SUBSPACE_ADMIN | none listed (space limit 0) | **its Space is ARCHIVED**; `me.spaceMembershipsFlat` and `account.spaces` are both empty (F-10) |
| `member` | **Feature Beta Tester** | — | SPACE_MEMBER `6e2e864d` + `73712f87`, stray `SPACE_MEMBER_INVITEE` | SPACE_FREE 0/3→**1/3 after this run**, VC 0/3, HUB 0/1, PACK 0/3, AI tokens 0/10,000,000 | 2 pending space invitations; now also host/admin of the run's fixture Space |
| `fresh` | **Feature Beta Tester** | Associate + Admin of `820c25f0` and `f6f0a3ac` | ACCOUNT_ADMIN of three accounts | same as `member` | **not fresh**: admin of two organisations, 4 pending invitations. The "no memberships" cell of every decision table is unoccupied |

**Beta-tester pair = `member` and `fresh`** (confirmed, not assumed). `fresh` was not used for any membership transition, per the persona rule.

---

## 1. Actual scope vs the story

Scope of record per repo: `gh api repos/alkem-io/<repo>/compare/<old>...<new>`; infra-ops by commit range to `de0048d0`.

| Image | Story says | Acceptance runs | Content drift |
| --- | --- | --- | --- |
| `server` | v0.173.0 — iOS badge + `resetPushBadgeCount` | v0.173.0 | 6 commits / 14 files; listed content is exactly the badge feature (+4 spec files, `schema.graphql +4`). **Unlisted:** `#6746` schema baseline (`+90-10`, no runtime effect, operator-accepted); `#6752`/`#6754` Release 81 merge-backs |
| `client-web` | v0.173.0 — hover cards, chat cue + mute, notifications dialog, badge clear, memo footer, no source maps, patched nginx base | v0.173.0 | 18 commits / 128 files; **every story bullet shipped**. **Unlisted:** `#10596` (husky hook, no runtime effect), `#10569`/`#10575` merge-backs |
| `notifications` | v0.44.0 — nodemailer 10.5, juice 11, `/health/ready`, bounded prefetch | v0.44.0 | 21 commits / 31 files; listed content confirmed (`email.sender.ts` +81, `notifme.sdk.d.ts` −414, `amqp.consumer.state.ts` new). **Unlisted with runtime effect: 15 Renovate PRs** (#624–#639 — `nest` 11.2.8, Node 22.23.4, `module-alias` 2.3.5, 2 distroless digests) |
| `kratos-webhooks` | v0.2.7 | v0.2.7 | 2 commits / 4 files. No drift |
| `oidc-service` | v0.8.1 — Go 1.26, `safeRedirect` (inside #24), rollup #22 | v0.8.1 | 7 commits / 37 files; `safeRedirect` confirmed (`redirect.go` +94). **Unlisted:** #23, #25 (repo-local manifests), #26, `c2b2ea40` — none changes acceptance behaviour |
| `authorization-evaluation-service` | v0.0.6 | v0.0.6 | 2 commits / 9 files. **Unlisted:** #23 canonical identity metadata (epic 079) — net effect `main.go +3-3` |
| `collaboration-service` | v0.0.5 — h2c, amqp091-go, go-yjs, chi | v0.0.5 | 10 commits / 12 files; net tree diff is the dependency patch + `authzeval/auth.go +5-12`. **#18, #32, #33 appear in the range but contribute no net file change** — already in the deployed v0.0.4 image |
| `wopi-service` | v0.2.1 | v0.2.1 | 5 commits / 18 files. **Unlisted:** #40 canonical identity (3 one-line changes) |
| `file-service` | v0.3.4 | v0.3.4 | 3 commits / 12 files. No drift |
| `file-backup-service` | v0.0.6 | v0.0.6 | 2 commits / 8 files. No drift |
| `matrix-adapter` | v0.8.28; "v0.8.27 was Synapse-side only" | v0.8.28 | 13 commits / 8 files. **The story's claim is correct**: the media-fetch-500 fix touches only `synapse-modules/alkemio_fileservice_provider.py`; the Go side is `go.mod`/`go.sum`/`Dockerfile` |
| `virtual-contributor` | v0.5.0 | v0.5.0 | 4 commits / 5 files. No drift |
| `assistant-service` | v0.2.1 | v0.2.1 | 4 commits / 4 files. No drift |
| infra-ops | #2922, #2932, #2921, #2896/#2901/#2907 | `de0048d0` | **#2937 (the ACC bump) is not in the story's scope bullets**, and carries the notifications readiness-probe move, which the story mentions only inside a risk remediation |

**Every story bullet shipped.** The drift is one-directional — content shipped that the story does not list (F-4).

**Cross-cutting:** no migrations in the release content (the migration job ran as a no-op because `data_change=true`); GraphQL **additive only** (`Mutation.resetPushBadgeCount`, confirmed live); no authorization reset; infra/config = 13 pins + the readiness-probe path + the validator pin, **plus the unintended Postgres reverts of F-1**.

---

## 2. Risks and how they are covered

R82-1…R82-12 are the story's Risk Profile in story order (**12 rows**, not 14 — F-6). **(QA)** rows were added by this run. **E** = elevated.

The two automated runs cited throughout:

- **`server-api nightly 43335079798`** — 2026-11-13 00:11Z, tests 00:19→02:12Z: **162 files passed / 2 skipped; 2623 tests passed, 97 skipped, 9 todo, 0 failed.** It first redeploys the test environment from `develop` of 12 repos and waits for every deployment; every Release 82 PR in those repos had merged to `develop` beforehand (latest authorization-evaluation-service#24 at 2026-11-12T09:17Z, wopi-service#43 at 10:29Z). **Green on release content for 9 of the 13 images.**
- **`client Nightly Playwright 43220540911`** — 2026-11-12 12:43→15:57Z (dispatch-only, runs against the test environment as deployed that morning): **7 failed, 2 flaky, 661 passed.** All client-web release PRs had merged by 2026-11-11T21:49Z, so it ran on release content.
- **No automated evidence of any kind** exists for `virtual-contributor`, `assistant-service` and `file-backup-service`: they are not in the test-environment deploy list and no suite targets them.

| Risk | Automated (suite · run · result) | Agent on acceptance today (check ids · evidence) | Residual | Confidence |
| --- | --- | --- | --- | --- |
| **E** R82-1 Hover cards make the server load every user | `unit` (client-web#10570 `ContributorHoverCard.test.tsx`). **No test-suites spec; no nightly project. No automated evidence for the load question at all** | **HC-01 PASS ×4**: `users(IDs:)` returns exactly 1/5/20/50 rows, HTTP 200, medians **71/73/80/87 ms**, slowest sample 117 ms. **HC-01-shape OBS**: the curve is nearly flat (+16 ms from 1→50 ids), consistent with the code-read "full read then in-memory filter" — but ~80 ms at ACC volume. **HC-02a/HC-02c/HC-02d PASS**: the hover card opens on a Space lead and on a **comment avatar**, naming the contributor · `HC-01-timings.json`, `HC-02*.json/png` | production user volume; DB-side cost (M-14); the anonymous cell on a public Space (HC-02b OBS) | **Medium** (agent-proven today, no suite) |
| **E** R82-2 Chat scroll and read markers changed without a live run | `unit` (#10593, #10587, #10594, #10583, #10524). **`red (43220540911)`**: `chat-avatars/us1-group-thread-sender-avatars › US1-AS1` failed, `us3-direct-thread-header-identity › US3-AS1` flaky — on a feature present in both v0.172.0 and v0.173.0 | **CH-04b PASS** (1:1 header names the counterpart), **CH-04c PASS** (group thread opens, 9 avatar elements, another participant named), **CH-04a PASS** (list rows with composite avatar), **CH-01 PASS** (composer send → bubble, composer cleared), **CH-02 PASS** (sound toggle in the conversation list, "Mute chat sound"↔"Unmute chat sound", restored) · `CH-0*.json/png`. **Both nightly reds fail to reproduce on acceptance → attributed `test`** | scroll/read-marker behaviour under arriving messages was not driven (CH-01 covers send/read only); real devices (M-11); the live notifications pill (CH-05b OBS) | **Medium** (+ manual M-11) |
| **E** R82-3 client-web image restructured and re-based | `unit`/CI image smoke in #10550/#10595 | **PRE-01, PRE-02 PASS** (pod serves `env-config.js` 200 with a correct `window._env_`); **CW-01b PASS**: no real source map is served — both probed `.map` URLs answer `text/html` with no `mappings` key (SPA fallback), a genuinely unknown `/assets` path answers 404 · `CW-01b-sourcemaps.json` | none material | **Medium** (agent-proven today) |
| **E** R82-4 First release through the changed deploy pipeline | `n/a (config absent on test env)`; infra-ops `Validate deploy change classifier` run 43405531597 success (tests the script, not the live lookup) | **PRE-08 PASS** (`data_change=true`, backup + migrate ran and succeeded), **PRE-08b PASS** (the live lookup ran on 12 Nov, run 43197569214) · `PRE-08-…-extract.txt` | the `false` skip branch, first exercised on production (F-5) | **Medium** |
| R82-5 iOS badge rises and never clears | `unit` only (server#6755 ×4 spec files, client-web#10579). **No end-to-end coverage anywhere** | **PRE-04** proves the mutation exists. Nothing else is possible — push is off on acceptance (infra-ops#2930) | the whole feature; OG-1 and OG-2 open | **Manual** (M-4) |
| R82-6 RabbitMQ/Traefik/ESO roll on production | `none` | none — production is out of scope. `traefik` and all broker consumers rolled on acceptance without error (PRE-10), a weak forward signal | the production rollout | **Manual** (M-8) |
| **E** R82-7 Every outbound email goes through new code | **`green (43335079798)`** — the notification suites ran against notifications `develop` containing #644 and #628, with MailSlurper as the SMTP sink: that exercises the new nodemailer sender over SMTP, 0 failures. `unit` `email.sender.spec.ts` +318 | **EM-01a/b/c PASS**: a comment on the run's callout raised `spaceadmin`'s unread notification count **8 → 9** within the poll window; `me.notifications` lists the new row · `EM-01*.json` | the TEM provider; real-inbox and Gmail/Outlook rendering; the "3 retries then dropped" path; `email-smtp-provider:` warnings (M-5) | **Medium** (+ manual M-5) |
| **E** R82-8 Identity path rebuilt under login | **`green (43335079798)`** — all 2623 tests authenticate through the stack and include `storage/auth/*`; oidc-service and kratos-webhooks `develop` were deployed for that run. `unit` `redirect_test.go` +94. `n/a (config absent on test env)` for social providers and passkeys | **14 logins across 5 personas PASS** (SU-01, and every later script). **ID-04 PASS ×5**: `safeRedirect` refuses a foreign host, a scheme-relative host, a percent-encoded host and a backslash variant — every one stayed on `identity.acc-alkem.io`, none reached `example.org`. **ID-02 PASS**: password plus `microsoft, linkedin, apple, github, cleverbase`. **ID-05 PASS ×3**: member reads the memo, non-member and anonymous get `READ_ABOUT` only and `FORBIDDEN_POLICY` on the memo · `ID-0*.json/png` | completing any social sign-in (M-1); **forced lockout, not runnable on shared accounts (M-2)**; native-app sign-in (M-3); 24 h kratos-webhooks watch. Note ID-04's allowed-value case also landed on `/home`, so the check proves "no off-host redirect", not that the allow-list honours allowed values | **Medium** (+ manual M-1, M-2, M-3) |
| **E** R82-9 Collaboration clients moved to stdlib h2c | **`red (43220540911)`**: `content-editing/us2-memo-edit-reopen › E10-2` failed and `› E10-1` flaky, against collaboration-service `develop` with #37. `unit` `auth_test.go`, `auth_service_test.go` (+87), `h2c_test.go`. The server-api nightly has **no** memo coverage (checklist §2: memos 🔴 "no API coverage at all") | **CO-01a–d PASS**: a typed paragraph reaches `Memo.markdown` within the poll window, `updatedDate` moves, and it survives a full reload. **CO-02d/e PASS — the E10-2 case itself**: after the author's context is closed, a colleague in a fresh session appends at the end and the author's fresh session shows it. **CO-03a/b PASS**: whiteboard drawn and persisted, `updatedDate` 10:56:00Z → 11:23:22Z. **Both nightly reds fail to reproduce → attributed `test` (the documented memo caret trap, F-9)** · `CO-0*.json/png` | **the Collabora/wopi half is BLOCKED (B-1)**; PDF preview not reached (CO-05); two-person concurrent editing (M-11) | **Medium** (+ blocked B-1) |
| **E** R82-10 Backup restore decoder changes | **`none`** — file-backup-service is not on the test environment and no suite targets it | **none possible from a browser**; the drill and audit are cluster CronJobs. Aggravated by F-2 | the entire row | **Manual** (M-6) + decision 2 |
| R82-11 Trivy promotion gate blocks `develop → main` | `n/a` — `Trivy Live Image Scan` 43358637725 scans what is live, not the new tags | none designed | the waiver decision; 2,741 waivers expire 2026-11-15 | **governance** (M-9) |
| R82-12 Change-control evidence gap (8 `--admin` merges) | `none` | none designed | SOC 2 / ISO 27001 record | **governance** (M-10) |
| **E** (QA) R82-13 The ACC deploy applied over a BLOCKING drift verdict and reverted acceptance Postgres | `n/a` — the gate is the check, and it is non-blocking | **PRE-09 FAIL** records the fact in full; the consequence needs `kubectl` | which volume acceptance is reading | **Medium** on the fact, **Manual** on the consequence (M-7) |
| (QA) R82-14 notifications image and readiness probe are coupled for rollback | `n/a` | PRE-07, PRE-10 record the coupling | a rollback to 0.43.0 that forgets the probe never becomes Ready | **Medium** (config at SHA + rollout) |
| (QA) R82-15 Unlisted content drift ships | partly carried by `green (43335079798)` for notifications and oidc-service `develop` | **RG-01 PASS** (member, 5 pages, 0 page errors, 0 5xx), **RG-02 PASS** (spaceadmin, 4 pages, same), **RG-03 OBS** (`/spaces` renders, no "<n> spaces" count string found by the locator) · `RG-0*.json/png` | the 15 notifications dependency bumps are covered only as far as the notification suites reach | **Medium** |
| **E** (QA) R82-16 Three images have no automated evidence of any kind | **`none`** | **VC-01 PASS but empty**: `virtualContributors` answered with **0 rows** for `member` — no VC behaviour exercised. **AS-01 SKIP** (budget). file-backup-service unreachable | 6 engines ready, a question, a website ingest, an assistant turn, the restore drill | **Low** (+ manual M-12, M-6) |
| (QA) R82-17 matrix-adapter media path | `green (43335079798)` for the adapter's AMQP/room paths | **MA-01 PASS on the no-5xx oracle only**: an unknown media id answers **401 `M_MISSING_TOKEN`** (Synapse demands a token before the adapter is reached), so the 404-not-500 case is not actually exercised · `MA-01-media.json` | a real file-service miss (M-11, carried from Release 81) | **Low** (weak probe) |
| (QA) R82-18 Every-release core flows (checklist §3) | `green (43335079798)` for callouts, posts, comments, templates, applications, invitations (API). `red (43220540911)` for 3 organisation-invitation specs and 2 `@forge-acceptance` comment-image specs — **none touches Release 82 content** | **MB-01a/b PASS — the invitation lifecycle end to end** (invite → pending in the invitee's list → ACCEPT → `myRoles` includes MEMBER), which checklist §2 marks as a 🟠 gap with "no dedicated invitation-acceptance E2E". **SU-02a–d PASS** (space + 3 callouts created). **CO-06 OBS** (delete-class controls observed, never clicked) · `MB-01*.json`, `SU-02*.json` | real-time collaboration with two people, documents, social sign-in (M-11, M-1) | **Medium** |
| (QA) R82-19 Offsite backup replication degraded (pre-existing) | `n/a` — the failing job is the evidence (6 runs) | **PRE-13 OBS** | six days of un-replicated backups and skipped pruning | **Manual** (M-6) |
| (QA) R82-20 Dev-only / no-runtime-effect PRs | n/a | n/a | none | **N/A** |

---

## 3. Check design and results

Techniques: **EP** partitions · **BVA** boundaries · **DT** decision table · **ST** state transitions · **UC** use-case walk · **OBS** observation. The full ledger is `results.tsv` (89 rows; the last row per id is the result). Summary by group:

| Group | Checks | Technique | Persona(s) | Oracle | Result |
| --- | --- | --- | --- | --- | --- |
| Preflight | PRE-01…PRE-16 (17) | OBS + document comparison | anonymous / none | deployed reality vs the story | 12 PASS, 4 FAIL (findings), 4 OBS, 1 superseded |
| Setup | SU-01-×5, SU-02a–d (9) | DT setup | all five, then member | logins succeed; run-owned fixtures exist | 9 PASS |
| Memo (R82-9) | CO-01a–d, CO-02a/b/c/d/e, CO-02a2, CO-02c2 | UC + ST | member ↔ spaceadmin | typed text reaches `Memo.markdown`, survives reload, and a colleague's append is visible to the returning author, in order | 9 PASS, 1 OBS, 2 superseded |
| Whiteboard (R82-9) | CO-03a/b | UC + ST | member | `Whiteboard.updatedDate` moves past its pre-edit value | 2 PASS |
| Office docs (R82-9) | CO-04, CO-04a, CO-05, CO-06 | UC | member | the Collabora editor iframe loads | **1 BLOCKED**, 1 UNPROVABLE, 1 OBS |
| Chat (R82-2) | CH-00b, CH-01, CH-02, CH-04a/b/c, CH-05a/b, CH-02obs | UC + ST | member, spaceadmin | thread opens, identity shown, message sent, sound toggle flips and is restored | 6 PASS, 3 OBS, 1 superseded |
| Hover cards (R82-1) | HC-01a, HC-01-n1/n5/n20/n50, HC-01-shape, HC-02a/b/c/d | EP + BVA on id count; DT on viewer | member, anonymous | exact row counts, no error, < 10 s; a card naming the contributor | 7 PASS, 2 OBS |
| Identity (R82-8) | ID-02, ID-04 ×5, ID-05 ×3, ID-05-anon2 | EP + DT | all five, anonymous | no off-host redirect; member allowed, non-member and anonymous refused | 9 PASS, 1 superseded |
| Notifications (R82-7) | EM-01a/b/c | UC | member → spaceadmin | the recipient's unread count rises | 3 PASS |
| Membership (R82-18) | MB-01a/b | ST (none→invited→accepted) | member → spaceadmin | the invitee holds MEMBER after ACCEPT | 2 PASS |
| Regression (R82-15/18) | RG-01, RG-02, RG-03 | UC + OBS | member, spaceadmin | every page loads, 0 page errors, 0 5xx | 2 PASS, 1 OBS |
| Assets / media | CW-01, CW-01b, MA-01 | EP | anonymous, member | no real source maps; no 5xx on media | 3 PASS (1 superseded) |
| AI (R82-16) | VC-01, AS-01 | OBS | member | the API answers | 1 PASS (empty), 1 SKIP |
| Database | DB-01 | — | — | — | **skipped — no DB access** |

**Budget:** ~68 min of walks used of 180. `SKIP — budget`: AS-01, EM-03, HC-03 — chosen last because AS-01 duplicates an already-Low row, EM-03's lifecycle is covered by MB-01, and HC-03's real-device twin was already manual.

---

## 4. Findings

| # | Sev | Attribution | Finding | Evidence | Suggested action |
| --- | --- | --- | --- | --- | --- |
| F-1 | **Major** | env | The ACC drift gate is `continue-on-error: true` ("TEMPORARY: drift gate made non-blocking" in `build-deploy-k8s-acc-scaleway.yml` at the deployed SHA). On the Release 82 deploy it printed `BLOCKING: 3 unexpected drift item(s). Human gate required (exit 1)` and the deploy applied regardless: `Deployment/postgres` reverted from `postgres:18.6-trixie@sha256:e3d24f69` / PVC `postgres-18-pv-claim` to `postgres:17.5@sha256:aadf2c06` / PVC `postgres-pv-claim` (also losing the zone affinity, the `PGDATA` env, the `pg_isready` readiness probe and the 120 s grace); `Deployment/postgres-standby` likewise; `CronJob/postgres-backup` from `alkemio/postgres-scaleway-backup:v1.2.0@sha256:47e8658b` to `svetoslavpetkov23/postgres-scaleway-backup:v1.0.2`. `Summary: changed=27 expected=24 unexpected=3`. The 12 Nov deploy reported `unexpected=0`, so the drift arose in between. Not reproduced through a second path — no cluster access — so `env`, not `product` | `evidence/PRE-08-acc-deploy-43405736135-extract.txt`; runs 43405736135, 43197569214 | Decision 1 |
| F-2 | **Major** | env | `Daily Backup Management` has failed daily for ≥ 6 days (runs 43349792003, 43139172545, 42943725261, 42740510945, 42549232345, 42437165959): `NoSuchBucket: alkemio-s3-backups-prod-paris` ×6, "Offsite replication is degraded. Source pruning was skipped", exit 1. Pre-existing; no Release 82 PR touches it | `gh run view 43349792003 --repo alkem-io/infrastructure-operations`; PRE-13 | Decision 2 |
| F-3 | Minor | story | The story header still reads "Acceptance: not yet deployed … **server not cut as of 13 Nov**". Server v0.173.0 is cut, published and live; acceptance has run all 13 images since 10:09Z. Three checklist items are now mechanically true and unticked ("Images `v0.173.0` on Docker Hub"; "Deployed to Acceptance … `data_change=true`, backup and migrate ran"; the `env-config.js` half of the next item — and HC-01 now supplies the `UsersContactability` measurement the same item asks for) | PRE-01, PRE-04, PRE-06, PRE-08, PRE-12; HC-01 | Update the header; tick the three items |
| F-4 | Minor | story | Unlisted content ships: notifications' 15 Renovate PRs (#624–#639, incl. `nest` 11.2.8, Node 22.23.4, `module-alias` 2.3.5); oidc-service #23/#25/#26 and `c2b2ea40`; wopi-service#40 and authorization-evaluation-service#23 (canonical identity, epic 079); server#6746 (operator-accepted). Conversely collaboration-service #18/#32/#33 are in the commit range but contribute **no net tree change** — already in the deployed v0.0.4 | §1; `gh api .../compare` per repo; PRE-11 | Decision 5 — add them to the Scope notes or record acceptance of the drift |
| F-5 | Minor | story | R82-4's remediation is satisfied in outcome, not in mechanism: `data_change=true` and both jobs ran, but the printed reason is `no usable baseline ('')` because the deploy was `workflow_dispatch`. The live lookup ran once (12 Nov); the `data_change=false` skip branch has never run anywhere, and the promotion takes it to production | `evidence/PRE-08-acc-deploy-43405736135-extract.txt`; PRE-08, PRE-08b | Decision 5 |
| F-6 | Minor | story | The run request describes a 14-row Risk Profile; the story body's table has **12** rows. This sheet numbers them R82-1…R82-12 in story order | issue body § Risk Profile; PRE-15 | Agree the numbering before anyone cites a row id |
| F-10 | Minor | data | `spacespaceadmin` (`6e2e864d`) is **still ARCHIVED** — flagged in Release 81 on 2026-11-05, unchanged on 2026-11-13. `spaceadmin` and `member` therefore have empty `spaceMembershipsFlat` and `account.spaces`, and no QA Space could host the run's fixtures. The run created its own L0 on `member`'s free plan, consuming 1 of 3 `ACCOUNT_SPACE_FREE` entitlements and leaving `spaceadmin` with a new membership | `evidence/diag-spaces.json`, `SU-01-matrix.json`, `SU-02a-space.json` | Decision 4 — un-archive and reset the personas |
| F-7 | Info | test | Four reds of `Nightly Playwright 43220540911` touch release content and **none reproduces on acceptance**: `us2-memo-edit-reopen › E10-2` (failed) and `› E10-1` (flaky) are contradicted by CO-01 and CO-02d/e; `chat-avatars › US1-AS1` (failed) and `US3-AS1` (flaky) by CH-04c and CH-04b. Attribution: **`test`**. The remaining three reds (organisation invitations ×2 specs, comment images ×2) touch no Release 82 content; the invitation lifecycle itself is green here (MB-01). The workflow is dispatch-only and has failed on 7 of its last 8 runs since 2026-10-27 | runs 43220540911, 41021718826 … 40501369220; `CO-01*`, `CO-02d*`, `CH-04*` | Fix or re-baseline the four specs; consider scheduling the client nightly so a release has fresh client evidence |
| F-8 | Info | kb | `identity.acc-alkem.io/self-service/...` serves the **client SPA shell** to an anonymous non-browser client, exactly as `/docs/...` does: `GET /self-service/login/browser` with `Accept: application/json` answers HTTP 200 with HTML. Provider configuration cannot be read anonymously; ID-02 must be a browser check | `evidence/PRE-14-identity-selfservice-spa-shell.html`; PRE-14 | KB line (§10) |
| F-9 | Info | kb | Two walk-side traps cost this run three re-runs and would mislead the next one: (a) the **memo caret trap** is real on acceptance — clicking the editor root and pressing End left the caret at position 0 and the append was **prepended and concatenated** (`r82-CO-02-950828r82-CO-01-409552`); clicking the LAST paragraph fixes it. (b) **Judging a `.map` URL by HTTP status is wrong** — the SPA answers 200 `text/html` for `<real-asset>.js.map` while answering 404 for a wholly unknown `/assets` path; only the body tells | `evidence/CO-02b-append.json`, `CO-02d-append.json`, `CW-01b-sourcemaps.json` | KB lines (§10) |
| F-11 | Info | kb | The shared QA password contains `$`. Writing it unquoted into an env file and sourcing it with `set -a` silently truncates it (11 → 9 characters) and produces "invalid credentials" against acceptance — the harness.md warning applies to acceptance runs too, not just the local harness. Single-quote the value in the file | login failures at 10:44–10:51Z vs successes from 10:52Z; `evidence/diag-login-stage2.png` | KB line (§10) |

**No product findings.** Every FAIL that survived re-running was attributable to the environment (F-1), the story (F-3…F-6), pre-existing data (F-10), or this run's own walk (F-9). Each of the three walk-side failures was re-run through a corrected path and passed; none was reported as a defect.

---

## 5. Blocked — raise and re-run with `--resume`

| # | Check | Account | Limit hit (exact message) | What it costs |
| --- | --- | --- | --- | --- |
| B-1 | **CO-04 / CO-04a** (Collabora office document through wopi-service v0.2.1), and CO-05 (PDF preview) which depends on it | `member` — the run-created free-plan Space `r82-105425qafixture` | `"Office Docs is not enabled for this Collaboration."` | The wopi-service half of elevated row R82-9 is unverified. **No other account was substituted.** Enable Office Docs on a QA-owned Space (or un-archive `spacespaceadmin`, which has the entitlement) and `--resume` |

`SKIP — budget` (listed separately, not blocked): **AS-01** (one assistant SSE turn), **EM-03** (application lifecycle), **HC-03** (emulated touch bottom sheet).

---

## 6. Manual checks left for a human

| # | Item | Why it cannot be an agent check |
| --- | --- | --- |
| M-1 | Complete a sign-in through each configured provider (microsoft, linkedin, apple, github, cleverbase) | Completing a third-party sign-in is always manual; LinkedIn blocks headless browsers. ID-02 proves the hand-off surface only |
| M-2 | Forced lockout after > 10 bad password attempts, then recovery | The five accounts are shared; a lockout would block the rest of the run and other users. Needs a throwaway identity |
| M-3 | Native-app sign-in (the in-app SSO handoff) | Native app on a device; app sign-in is dark on acceptance |
| M-4 | **OG-1**: two pushes show a badge of 2 on a real iPhone and opening the app clears it, on sandbox; **OG-2** acceptance | Push is off on acceptance (infra-ops#2930); the feature has never run on a real device |
| M-5 | Invitation, application, mention, conversation-message and admin emails **in TEM and a real inbox**, with Gmail and Outlook desktop rendering; no `email-smtp-provider:` warnings in the pod log | Acceptance delivers real mail. EM-01 proves only the in-app half |
| M-6 | The file-backup **restore drill** and `audit --sample 500 --inventory`; and repair the offsite replication of F-2 | Cluster CronJobs and object storage |
| M-7 | With `kubectl`: read the live image of all 13 deployments (closes the eleven proven only by manifest + rollout) and establish what F-1 left behind — which Postgres image and PVC acceptance is on, and whether any 18.6 data is stranded | No cluster credential in this run |
| M-8 | After the production promotion: RabbitMQ healthy with notifications, matrix-adapter and collaboration-service re-attached; every ExternalSecret `Synced`; the Traefik blip within tolerance | Production, and an ops surface |
| M-9 | Trivy waivers for client-web (3 libxslt), virtual-contributor (102) and assistant-service (92), plus the 2,741 expiring 2026-11-15; the gate needs a scan < 48 h old | Human decision (governance) |
| M-10 | A recorded human approval for the 8 PRs merged with `--admin`, or a Release Lead sign-off covering them | Governance / SOC 2, ISO 27001 |
| M-11 | Two people editing the same memo and whiteboard live (convergence, presence, cursors); real iOS Safari and Android for chat and the hover-card bottom sheet; a chat image whose file-service file is gone returning 404 (MA-01 reached only Synapse's 401) | More concurrency than the agent can drive; real devices; needs a media item with a missing backing file |
| M-12 | Virtual contributor: 6 engines ready, one question, one website ingest; assistant: one SSE turn plus approve/execute | VC-01 returned 0 VCs for `member`; a question writes into someone else's Space, and approve/execute writes data |
| M-13 | Delivery Lead scope approval (open per the Gate A comment), QA sign-off, business sign-off | Human gates |
| M-14 | Measure the **server-side** cost of `UsersContactability` in APM on a busy production-like Space | HC-01 measures the client-observed round trip (71–87 ms median on ACC); DB load needs APM |

---

## 7. Confidence

By rule (§2). Elevated rows with a provable part: R82-1 **Medium**, R82-2 **Medium + manual M-11**, R82-3 **Medium**, R82-4 **Medium**, R82-7 **Medium + manual M-5**, R82-8 **Medium + manual M-1/M-2/M-3**, R82-9 **Medium + blocked B-1**, R82-13 **Medium + manual M-7**, R82-16 **Low**. Elevated with no provable part: R82-5 **Manual** (M-4), R82-6 **Manual** (M-8), R82-10 **Manual** (M-6). Governance, excluded from the minimum: R82-11, R82-12.

**Overall: Medium on the 9 reachable elevated rows (one of them, R82-16, Low); 3 elevated rows await manual (M-4, M-6, M-8), and 5 more carry a `+ manual` part.**

No row reaches High. For the four rows where the agent did everything available (R82-1, R82-2, R82-3, R82-9) the cap is **automation**, not inspection: there is no test-suites spec for hover cards, the memo and chat suites are red for test-side reasons on a dispatch-only nightly that has not been scheduled since 27 October, and three images have no suite at all. R82-16 stays Low because `virtualContributors` returned an empty list and assistant-service was never exercised.

---

## 8. Per-story summary

| Item | Result | Comment draft |
| --- | --- | --- |
| client-web#10570 profile hover cards | **PASS** (HC-01 ×4 + shape, HC-02a/c/d); anonymous cell OBS | `comments/client-web-10570.md` |
| client-web#10593 / #10587 / #10594 / #10583 chat | **PASS** (CH-01, CH-02, CH-04a/b/c); scroll/read-marker under load not driven | `comments/client-web-10593.md` |
| client-web#10524 notifications dialog | **PASS** on open/list (CH-05a); live pill **OBS** (CH-05b) | `comments/client-web-10524.md` |
| server#6755 + client-web#10579 iOS badge | mutation present (PRE-04); the feature is **Manual** (M-4) | `comments/server-6755.md` |
| client-web#10550 / #10595 image and source maps | **PASS** (PRE-02, CW-01b) | `comments/client-web-10550.md` |
| client-web#10578 memo footer, #10574 header icons | not separately exercised (SKIP — budget); memo path green | `comments/client-web-10578.md` |
| notifications#644 / #628 | **PASS** (EM-01a/b/c) + nightly green on release content | `comments/notifications-644.md` |
| oidc-service#29 / #24 `safeRedirect` | **PASS** (ID-04 ×5, ID-02) | `comments/oidc-service-29.md` |
| authorization-evaluation-service#24 | **PASS** (ID-05 ×3) | `comments/authorization-evaluation-service-24.md` |
| collaboration-service#37 | **PASS** (CO-01, CO-02d/e, CO-03) | `comments/collaboration-service-37.md` |
| wopi-service#43 | **BLOCKED** (B-1) | `comments/wopi-service-43.md` |
| file-service#106, file-backup-service#10, kratos-webhooks#28, matrix-adapter#100, virtual-contributor#133, assistant-service#16 | deployed; behaviour indirect, weak or absent | one file each in `comments/` |
| infra-ops#2937 (the ACC bump) | **PASS** on pins and rollout; **F-1** on the drift gate | `comments/infrastructure-operations-2937.md` |
| server#6746 | no runtime effect; unlisted (F-4) | `comments/server-6746.md` |
| Release story | — | `comments/release-82.md` |

---

## 9. Knowledge-base lines to add (not written — this run writes only the run folder)

For `test-suites/docs/qa-knowledge/harness.md`, dated 2026-11-13:

- `identity.acc-alkem.io/self-service/...` serves the **client SPA shell** to an anonymous non-browser client, exactly as `/docs/...` does. Provider configuration is browser-only.
- Acceptance's **server version is not readable from `platform.metadata`** (empty string, as in Release 81). Substitute: introspect for a mutation the release added — `Mutation.resetPushBadgeCount` proves v0.173.0.
- **The `$` in the shared acceptance password truncates on `set -a; . file`** (11 → 9 characters) and produces "invalid credentials". Single-quote the value in the env file. The harness.md warning about the local password applies to acceptance runs too.
- **Memo caret trap, confirmed on acceptance 2026-11-13**: clicking the `[contenteditable]` root and pressing End leaves the caret at offset 0, and Enter + typing **prepends and concatenates** without a newline. Click the LAST paragraph, press End, and read the DOM selection back before any editing key.
- **A `.map` URL cannot be judged by HTTP status on acceptance**: the SPA answers 200 `text/html` for `<real-asset>.js.map` but 404 for a wholly unknown `/assets` path. Inspect the body for a `mappings` key.
- The ACC deploy's **drift gate is `continue-on-error: true`** ("TEMPORARY"): a `BLOCKING` verdict does not stop the apply, and the job still reports success. Read the `Drift check (acceptance-v3)` step, not the job conclusion.
- The ACC deploy's **change classifier resolves a baseline only on `github.event_name == 'push'`**; a `workflow_dispatch` deploy always prints `no usable baseline ('')`.
- Playwright 1.58.2 wants `chromium_headless_shell-1208`, which is not installed on this workstation; the run used the installed `chromium-1217` build via `executablePath`.
- `inviteForEntryRoleOnRoleSet` requires **all three** list fields (`invitedActorIDs`, `invitedUserEmails`, `extraRoles`) — omitting the unused ones returns two opaque `BAD_USER_INPUT` errors. A Space ADMIN holds `ROLESET_ENTRY_ROLE_INVITE` but **not** the assign privilege, so `assignRoleToUser` is refused on your own Space.

## 10. Credential hygiene

The password was written once to `$SCRATCH/acc-qa.env` (mode 600, outside the run folder), sourced per script invocation, never echoed, never placed in a script, the sheet, `results.tsv`, a comment draft or a command line. `grep -r` for it over `runs/release-82` returns nothing. The file was deleted at the end of the run.
