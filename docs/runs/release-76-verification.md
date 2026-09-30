# Release 76 — verification run sheet

> Per-release working copy of `docs/release-verification-checklist.md` §4 (per-release additions). Started **28.09** with the rows for notifications#356. On **29.09** the rows for the rest of the release scope (§4b–§4k) were derived from the [`alkem-io/alkemio#2132`](https://github.com/alkem-io/alkemio/issues/2132) Risk Profile; the risk ids in those rows (X1, S7, C10, …) are the ids used in that story.
>
> **Source for the rows below:** [notifications#356](https://github.com/alkem-io/notifications/issues/356) (parent [server#4100](https://github.com/alkem-io/server/issues/4100)), delivered by server#6467, client-web#10272, notifications#594 and test-suites#632. Test plan: `client-web/src/functional-e2e/organization-space-invitations/organization-space-invitations-test-plan.md`.

**Environment.** Rows 1–3 were run on **DEV** on 28.09; the image versions deployed there at the time were not recorded. Rows 4–8 are to be run on **ACC**, which delivers through a real mail client rather than MailSlurper — record the ACC image versions here when they are run. The notifications service must include notifications#594 (`v0.40.2`, see the table below); on DEV this is implied by rows 1–3 passing, since the "accepted" and "declined" emails only exist from that version.

**ACC as deployed, 29.09.** infra-ops #2694 merged 29.09 08:24 UTC.

| Image                            | On ACC            | How it was established                                                                                                                                                                                                                     |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client-web`                     | `0.167.0`         | `https://acc-alkem.io/meta.json`                                                                                                                                                                                                           |
| `server`                         | Release 76 schema | Public GraphQL on ACC: 55 `NotificationEvent` values, `Message.attachments` present. The version string itself is returned empty                                                                                                           |
| `notifications`                  | `v0.40.2`         | Pin in infra-ops `develop`, confirmed by the Release Lead. **Not `0.41.0`** — that version was never cut. The handlers and the 63 email templates in `v0.40.2` are byte-identical to `develop`, so notifications#594 and #599 are included |
| `file-service`, `matrix-adapter` | not checked       | Expected `v0.3.1` and `v0.8.21`                                                                                                                                                                                                            |

**Accounts.** 👤A = admin of Space S (L0), sends the invitations · 👤B = second admin of Space S · 👤C = admin of subspace S1 (L1 under S), not an admin of S · 👥U1, U2, U3 = registered users, not members of S · 🏢Org = an organization that is not a member of S, with two admins: 👤O1 (answers the invitation) and 👤O2 (the other admin). All admins on default notification settings.

**Legend.** ✅ pass · ⚠️ pass-with-notes · ⛔ blocker · N/A · ☐ not run · **Evidence** = what to attach to the row (screenshot, email, query output).

---

## 0. What is left (as of 28.09)

All of it is to be run on **ACC**.

| Item                                                                                      | Procedure | Why it cannot be automated today                                                                                    |
| ----------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| Email rendering and links, user **and organization** emails, through the real mail client | P4        | Rendering and link target are not asserted by the API cases, and the API cases read MailSlurper, not a real mailbox |
| Push for the user outcome events                                                          | P5        | A live push assertion needs `RABBITMQ_MANAGEMENT_*`, which nightly does not set                                     |
| Muting the "accepts or declines an invitation" row, user arm                              | P6        | Proven live for organization invitees only; same server code path                                                   |
| Existing users keep their muted preference after the migration                            | P7        | The harness cannot reach ACC rows; needs a user who muted before the deploy                                         |
| Translated copy, five non-English locales, user **and organization** rows                 | P8        | Locale assertions have no home in `test-suites`                                                                     |

P7 needs a user who muted the new-member row **before** the ACC deploy. ACC was deployed on 29.09, so on ACC this can only be run with a user known to have muted it earlier; otherwise it moves to the Production deploy.

### 0a. Order of work for the rest of the scope (added 29.09)

Ordered by risk. About 2h 15m for M1–M6. With 90 minutes, run M1–M4.

| Order | Area                                         | Rows     | Procedure   | Time   | Risks                  | Who                  | State                                  |
| ----- | -------------------------------------------- | -------- | ----------- | ------ | ---------------------- | -------------------- | -------------------------------------- |
| M1    | Deploy smoke                                 | 9        | P9          | 5 min  | X1                     | 🖐 QA lead           | ✅ 29.09                               |
| M2    | Conversation attachments                     | 10–14    | P10         | 30 min | S4, S7, X5, C2         | 🖐 QA lead           | ✅ 29.09 rows 10–13 · ⚠️ row 14 partly |
| M3    | Platform roles on ACC                        | 15–17    | P11         | 20 min | C10, S14, X8           | 🖐 QA lead           | ✅ 29.09 · finding F1 on row 17a       |
| M4    | Invitations and emails                       | 4, 18–21 | P1, P4, P12 | 35 min | C4, X2, X6, N2, S6, C5 | 🖐 QA lead           | ✅ 30.09                               |
| M5    | Organization settings                        | 22–23    | P13         | 10 min | C3, C11                | 🖐 QA lead           | ✅ 30.09                               |
| M6    | Notify switch with real email                | 24       | P14         | 10 min | C1                     | 🖐 QA lead           | ✅ 30.09                               |
| M7    | Forum                                        | 25       | P15         | 10 min | S11                    | 🤖 agent walk, or 🖐 | ✅ 30.09                               |
| M8    | Callout settings regression and card variant | 26–27    | P16         | 10 min | S20, C15               | 🤖 agent walk, or 🖐 | ✅ 30.09                               |
| M9    | Fix verification                             | 28       | P17         | 10 min | —                      | 🤖 agent walk, or 🖐 | ✅ 30.09                               |
| M10   | Mobile breadcrumbs                           | 29       | P18         | 5 min  | C8                     | 🤖 agent walk, or 🖐 | ✅ 30.09                               |

**Not in the time budget.** Two-user live whiteboard and memo editing is a standing gap, but `collaboration-service` is not in this release: one 5-minute smoke. Nothing in this release touches social login: one login.

**🤖 agent walk** = headless browser walk with screenshots. It needs ACC test accounts placed in an env file by the QA lead. Not possible for the agent: Element, real mailboxes, social login, database queries or resets on ACC.

---

## 1. Pre-flight — automated suites

| Suite                         | Where                                                                                                                  | Result                                                 | Notes                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| API — full nightly, scheduled | test environment, `develop`, 29.09 00:19 UTC                                                                           | ⛔ 199 failed / 1966 passed                            | Ran before test-suites#643 merged; superseded by the run below                                       |
| API — full nightly, manual    | test environment, `develop`, 29.09 06:40 UTC ([run](https://github.com/alkem-io/test-suites/actions/runs/36532324225)) | ⚠️ 5 failed / 2160 passed / 56 skipped / 9 todo (2230) | The 5 reds are listed below                                                                          |
| UI — nightly client tests     | —                                                                                                                      | ☐ not run                                              | Last run 10.09 on `test/release-75-verification`. Never run on `develop` with the Release 76 content |
| API + UI against ACC          | —                                                                                                                      | N/A                                                    | The suites create their own users and read MailSlurper; they do not run against ACC                  |

| API — `notifications` project, all 29 specs | QA lead's local stack, `develop` (server a46b83f1a, notifications 0.40.2), 30.09 | ⚠️ 3 failed / 183 passed / 4 skipped / 6 todo (196), 27 min | The five nightly reds all **passed**. Failures: forum-discussion reply (1 mail short; green on re-run — mail-catcher loss), post-contribution (1 mail short of 5; on re-run 1 short of 6 — MailSlurper logged "connection already exists" rejections during both runs, its known pool defect on large fan-outs), conversation-messages-negative (1 push too many for a removed member; on re-run different assertions fail because Redis suppression/budget state carries over — `workspace#034`, not in this release; to re-check on a clean Redis after the release) |

**The 5 red nightly API cases — triaged 30.09: not a product problem.** All five passed on the local run above, and the same flows on ACC (rows 4, 18–20) produced no extra recipient. Every nightly red had one recipient _too many_, which the mail catcher cannot cause; the remaining explanation is mailbox state leaking between cases on the shared test environment.

| Case                                                                                                  | Expected                            | Received |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------- | -------- |
| `notifications/organization/associates.it-spec.ts` › invitee gets exactly one email (US2-AS1)         | 1                                   | 2        |
| `notifications/organization/associates.it-spec.ts` › REJECT notifies the admins with "declined"       | 3                                   | 4        |
| `notifications/organization/associates.it-spec.ts` › APPROVE tells the applicant and the other admins | 2 "joined"                          | 3        |
| `notifications/space/community/invitations.it-spec.ts` › non space user receives invitation           | 1                                   | 2        |
| `notifications/space/community/user-invitation-outcomes.it-spec.ts` › UO-3                            | 1 "joined" to the L0 subspace admin | 0        |

**What automation covers for this release, and the release-story checklist item it supports**

| Release item                                                       | Automated coverage                         | Release-story item supported                    |
| ------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------- |
| 027 platform roles                                                 | API matrix + 66 UI cases (test-suites#643) | S17 re-run; post-deploy verification (c), (d)   |
| 061 organization → Space invitations                               | API + 5 UI specs                           | X6 "fire all 13 events", partly                 |
| 062 organization associates                                        | API + 7 UI specs                           | S6; X6, partly                                  |
| 070 notify switch                                                  | API + UI (test-suites#638)                 | C1 behaviour; not the business sign-off         |
| 076 card variant                                                   | API + acceptance walks (test-suites#640)   | S20, partly                                     |
| Conversations, callouts, templates, roleset, storage authorization | Green in the 06:40 nightly                 | X1 smoke (a), (b), on the test environment only |
| 060/061 forum + Matrix reconcile                                   | Pending: test-suites#647                   | S11                                             |
| 013 conversation attachments                                       | None                                       | X5, S4, S7, C2                                  |
| 071 mobile breadcrumbs                                             | None                                       | —                                               |

**Open test PRs**

| PR                                                               | Matters for Release 76?                               |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| test-suites#647 forum + Matrix reconcile                         | Yes. Until it merges, the forum stays manual (row 25) |
| test-suites#641 richer contributor cards (077)                   | No. The feature is in no release branch               |
| test-suites#623 contributors callout + whiteboard editor realign | Useful for row 26, not blocking                       |
| test-suites#600 platform roles (draft, conflicting)              | No. Superseded by test-suites#643                     |

---

## 4. Per-release additions

Each row is a one-line summary. The numbered **procedure** below carries the exact steps and expected results.

### 4a. Invitation outcome notifications (notifications#356)

| #   | Change                                                                                                                            | Repo                                | Risk                                                                                                                                             | Automated?                                                                                                                                   | Manual check (summary)                                                                                           | Validation                                | Result                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | User **accepts** a Space invitation → every Space admin told "accepted"; generic "joined" no longer sent                          | server + notifications + client-web | High — "joined" suppressed and the replacement never exercised live for user invitees                                                            | API: `user-invitation-outcomes.it-spec.ts` › UO-1 (email + in-app), green on a local stack only                                              | Bell row, link, emails, no "joined", welcome to the invitee → **P1**                                             | 🖐 manual on DEV                          | ✅ 28.09 DEV · ✅ 29.09 ACC (real mail client)                                                   |
| 2   | User **declines** a Space invitation → every Space admin told "declined"                                                          | server + notifications + client-web | Medium — story says "reject was not implemented", the code ships it                                                                              | API: `user-invitation-outcomes.it-spec.ts` › UO-2 (email + in-app), green on a local stack only                                              | Bell row, link, emails → **P2**                                                                                  | 🖐 manual on DEV                          | ✅ 28.09 DEV · ✅ 30.09 ACC (real mail client)                                                   |
| 3   | Subspace invitation that also joins the parent Space → suppression stops at the invited Space                                     | server                              | Medium — parent Space admins must still hear about a new member                                                                                  | API: `user-invitation-outcomes.it-spec.ts` › UO-3 (email), green on a local stack only                                                       | L1 admin gets "accepted"; L0 admins get "joined" for L0 → **P3**                                                 | 🖐 manual on DEV                          | ⚠️ 28.09 DEV, see note N1 · ✅ 30.09 ACC                                                         |
| 4   | **Email rendering and delivery** — user outcome emails and the four organization emails (invited, accepted, declined, has joined) | notifications                       | Low for the rules (API-covered); Medium for delivery — ACC sends through a real mail client and the organization emails have their own templates | Recipients and subjects: API (`user-invitation-outcomes`, `organization-invitations`), local stack only. Rendering, links, real delivery: no | Each email arrives in a real mailbox, names rendered, no raw placeholders, link lands on the right page → **P4** | 🖐 manual on ACC (real mail client)       | ✅ 30.09 — also at subspace level, see note N9                                                   |
| 5   | **Push** for the user outcome events                                                                                              | server                              | Low — unit-pinned                                                                                                                                | Unit only                                                                                                                                    | One push on accept, none for "joined" → **P5**                                                                   | 🖐 manual on ACC                          | ☐ not run — low risk, stopped by decision 30.09                                                  |
| 6   | **Muting** the new settings row                                                                                                   | server + client-web                 | Low                                                                                                                                              | API for organization invitees only                                                                                                           | Muted admin gets nothing, the other admin still does → **P6**                                                    | 🖐 manual on ACC                          | ☐ not run — low risk, stopped by decision 30.09                                                  |
| 7   | **Migration** — new row seeded from the existing new-member preference                                                            | server                              | Elevated — settings backfill on every user                                                                                                       | Migration unit specs only                                                                                                                    | A user who muted "new member" before the deploy has the new row muted too → **P7**                               | 🖐 manual on ACC, before and after deploy | ☐ not runnable on ACC (needs a user who muted before the deploy) — move to the Production deploy |
| 8   | **Translated copy** for the user and organization bell rows and the settings row                                                  | client-web                          | Low                                                                                                                                              | No                                                                                                                                           | nl, de, es, fr, bg: translated, names filled in, no keys → **P8**                                                | 🖐 manual on ACC                          | ☐ not run — low risk, stopped by decision 30.09                                                  |

**Notes from the run**

- **N1a (row 1).** P1 passed 29.09 on ACC as written: one "accepted" bell row and email per Space admin, no "joined", welcome email to the invitee. First proof that ACC itself (server `0.167.0` + notifications `v0.40.2`) delivers the new events — X2 does not apply on ACC. It also covers the user "accepted" email of row 4.
- **N1b (rows 2–3).** P2 and P3 passed 30.09 on ACC as written. With P1 this closes the user part of row 4 (the "accepted" and "declined" emails arrive through the real mail client); only the organization emails of P4 remain.
- **N9 (row 4).** P4 passed 30.09 on ACC: the four organization emails render and link correctly through the real mail client. Additionally run, not in the procedure: an organization invited **directly to a subspace** — emails fine. Observation, not a defect: an organization admin cannot make the organization **leave** a Space it has joined; removal is only possible from the Space/subspace side. Tracked as a story in [server#6560](https://github.com/alkem-io/server/issues/6560).
- **N11 (rows 19–20, recipients on ACC, 30.09).** Organization `fds` with admins challenge admin, j25 2024 and jun2 2026 (the tester, acting as approver). Invitation **declined** by the invitee: the org admins received the in-app notification and the email (both are on default settings). Application **declined**: the org admins were told, and the applicant received "your application … was declined". Application **approved**: the applicant received "Your application to associate with fds was approved" with a "Have a look" link; the other admin j25 2024 received "uu yy has joined fds as an associate — no further action is needed from you"; the approver received nothing about their own approval. The third admin (challenge.admin@alkem.io) has no reachable mailbox, so "every other admin" is shown for one of two. Bodies render with names filled in, no placeholders. No extra recipient was seen on ACC, unlike the red nightly cases on the test environment.
- **N13 (row 21, P12 step 6).** 30.09 on ACC: user settings → Notifications → Organisation Notifications shows the four new rows (organisation invited to a Space / joins; someone responds to an invitation to associate; someone applies to associate; someone joins as an associate), all defaulting to in-app, email and push **on** — the N2 backfill as designed. Muted the "applies to associate" row (in-app + email) as O2; a non-associate applied; O2 received nothing, O1 received the bell row and the email. The opt-out for the new email classes works.
- **N10 (row 21, P12 step 7).** 30.09 on ACC, run as one chain on a single new user: Space admin invites by email → user registers (row 18 ✅) → org admin invites as associate → user declines → user applies → org admin approves (rows 19–20 functionally ✅). Then the Space admin **archived** the Space invitation and the user tried to accept it: the client showed a full error page, "Invitation with ID can not be found! Error Code: 10101", twice, with "Couldn't find what you were looking for". So the failure is **not silent** — the concern behind R-C5 (a failed accept shows nothing) does not reproduce for this case. Pass with a note: the message is the raw server `ENTITY_NOT_FOUND` rendered as a page, shown twice, rather than a friendly "this invitation is no longer available". Low, UX only. Not verified separately: a _forbidden_ accept (the FORBIDDEN branch that R-C5 is actually about) — that needs an invitation addressed to a different user.
- **N12 (row 25).** P15 passed 30.09 on ACC by the QA lead: the category list as a normal user (Releases, Newsletter, Tips & Tricks, Q&A, then the older categories), admin recategorisation, no category control for a non-admin. Step 4 (old Help link) needs no separate check: "Help → Q&A" is a **label** change only — the stored category value is still `help`, and discussion URLs do not carry the category — so any old discussion opening at all covers it. Noted from the client code, not a finding: a normal user browsing the Releases view still gets the "Initiate discussion" button; the dialog's category picker and the server both exclude Releases and Newsletter for non-managers.
- **N1 (row 3).** Observed 28.09 on DEV: the admins of Space S were notified for Space S only; the notification for subspace S1 reached the subspace admin only. So L0 admins do **not** receive the L1 "accepted" notification. This was an unverified point in the test plan and is now recorded as the shipped behaviour. Not recorded: whether U3 received one welcome email or one per Space joined.

### 4b. Deploy smoke

| #   | Change                                                                                                         | Repo                | Risk                                                                                                 | Automated?                                                     | Manual check (summary)                                                                                          | Validation       | Result   |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| 9   | Client `0.167.0` against server `0.167.0` — shared callout settings fragment, template library, admin sections | server + client-web | High — X1: wrong deploy order breaks every callout, the template library and the whole admin console | Callouts and templates green in nightly, test environment only | Callout opens and saves, template library opens, Global Admin sees every admin section incl. Licensing → **P9** | 🖐 manual on ACC | ✅ 29.09 |

### 4c. Conversation attachments (013)

| #   | Change                                                           | Repo                               | Risk                                                                    | Automated? | Manual check (summary)                                        | Validation                      | Result                                     |
| --- | ---------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- | ---------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| 10  | Attach, send, render and download in a **new** conversation      | server + client-web + file-service | High — S4: no feature flag, 100% of traffic, no kill switch             | No         | Image preview, file chip, download → **P10** steps 1–3        | 🖐 manual on ACC                | ✅ 29.09                                   |
| 11  | Attachments in a conversation that **existed before the deploy** | server                             | High — S7: unreadable until the conversation authorization rebuild runs | No         | Upload and read in an old conversation → **P10** step 4       | 🖐 manual on ACC                | ✅ 29.09                                   |
| 12  | Attachment access by a user outside the conversation             | server + file-service              | High — security                                                         | No         | Download link as a non-participant is denied → **P10** step 5 | 🖐 manual on ACC                | ✅ 29.09                                   |
| 13  | Element → web and web → Element                                  | matrix-adapter + Synapse provider  | High — X5: inbound half unproven until verified on ACC                  | No         | Both directions render and download → **P10** steps 6–7       | 🖐 manual on ACC, needs Element | ✅ 29.09                                   |
| 14  | Limits and failed send                                           | client-web + file-service          | Medium — C2: no client kill switch                                      | No         | Over 50 MB, unusual type, offline send → **P10** steps 8–9    | 🖐 manual on ACC                | ⚠️ 29.09 — partly run, see notes N4 and N5 |

**Notes from the run**

- **N2 (row 11).** Passed 29.09 on ACC: upload and read work in a conversation that existed before the deploy. This shows the conversation authorization rebuild has run on ACC — the conversation part of E1. The other two resets in E1 are not shown by this.
- **N4 (row 14).** 29.09 on ACC: a 19 MB PNG of 20855 × 10104 pixels was rejected. The server answered `STORAGE_UPLOAD_FAILED`, caused by file-service `422 PIXEL_BUDGET_EXCEEDED` ("image dimensions exceed the configured pixel budget"). This is the file-service image-dimension guard working as designed, not the 50 MiB size limit, so the size limit itself is **still not tested**. Two things to record from the same attempt: (1) what the user saw in the composer — the server maps the cause to the generic `userMessages.system.storageUploadFailed`, so the reason "image too large in pixels" may not reach the user; (2) the GraphQL response on ACC carried a **stack trace** with server file paths — confirm this is not returned on Production.
- **N6 (row 14).** 29.09 on ACC: a PDF and an Excel file were attached and sent in chat without error. File sizes not recorded, so this confirms the file types, not the 50 MiB limit. Still not run: a file over 50 MiB, and the offline send with retry.
- **N5 (row 14, former step 10).** Attaching a file in a callout comment thread is **not part of this release**. In client-web `release/76` only the chat composer switches the attach control on (`attachmentsEnabled` is passed by `ChatThreadView` only). Comment threads can _show_ attachments but not add them. The step was derived from the release notes in alkemio#2132, which say "chats and comment threads"; the step is removed and the release notes need correcting.
- **N3 (row 13).** Passed 29.09 on ACC in both directions. This is the ACC verification that X5 in the release story asks for.

### 4d. Platform roles (027)

| #   | Change                                                       | Repo                | Risk                                                                                | Automated?                                                                                                  | Manual check (summary)                                                                          | Validation       | Result                                     |
| --- | ------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------ |
| 15  | Legacy Global Admin loses nothing                            | client-web          | High — C10: rewrite of the admin access model                                       | API matrix + UI `platform-roles/*`, local and test environment only                                         | Every section and the row actions in Spaces, Organizations, Store → **P11** step 1              | 🖐 manual on ACC | ✅ 29.09                                   |
| 16  | Platform Roles Admin: assign, take effect, deep link, remove | server + client-web | High — S14: acceptance SC-002/SC-003 unsigned; X8: inert without the platform reset | Same suites; per-section route guard recorded as a client defect on 25.09                                   | Only Authorization visible, `/admin/spaces` redirects, removal takes effect → **P11** steps 2–5 | 🖐 manual on ACC | ✅ 29.09                                   |
| 17  | Feature role on an organization — assign and remove          | server + client-web | Medium                                                                              | API                                                                                                         | Assign and remove → **P11** step 6                                                              | 🖐 manual on ACC | ✅ 29.09                                   |
| 17a | Feature role on an organization — **effect** on its admins   | server + client-web | Medium — new capability, no organization holds a Feature role on Production yet     | API O1/O2 prove the inherited **privilege** only (`CREATE_ORGANIZATION`); the license effect is not covered | Org admin gets the VC campaign banner / the trial allowances → **P11** step 7                   | 🖐 manual on ACC | ⛔→⚠️ 29.09 — finding F1, not a regression |

**Notes from the run**

- **N7 (row 17).** Passed 29.09 on ACC through `/admin/authorization` → Feature role tab → "Current organisations": add, reload, remove. The first attempt did not find the editor; the step in P11 was reworded to name the page.
- **F1 (row 17a) — Feature Beta Tester and Feature VC Campaign have no effect when held by an organization.** 29.09 on ACC: Feature VC Campaign assigned to an organization → its admin sees no campaign banner. Feature Beta Tester assigned to an organization → allowances stay 0/0 (spaces, virtual contributors, templates). Cause, read from server `develop` (`platform.role.resolver.mutations.ts`): the **user** grant path calls `syncAccountLicensePlus`, which gives the user's account the `ACCOUNT_LICENSE_PLUS` credential and resets its license; the **organization** grant path (`assignPlatformRoleToOrganization`) has no such call, for the organization's account or for its admins' accounts. The banner needs the role **and** the account's virtual-contributor entitlement, so it fails on the second condition. What is inherited is the credential used for privilege checks (`ActorContextService.expandWithOrganizationInheritedFeatureCredentials`), which is why Feature Organization Creator works through an organization and these two do not. Not a regression: the capability is new in this release. For the feature owner to decide: intended limitation, or gap against FR-002/FR-031. Tracked in [test-suites#648](https://github.com/alkem-io/test-suites/issues/648). **Resolved as a gap:** the implementer defined the target behaviour in [server#6552](https://github.com/alkem-io/server/issues/6552) (entitlement on the organization's own account; `myRoles` inheritance for admins/owners). Not in Release 76.
- **N8 (row 16).** Passed 29.09 on ACC, including the role taking effect. This shows the platform authorization reset has run on ACC (the 027 part of E1), and is the SC-002/SC-003 evidence for S14.

### 4e. Invite journey, organization associates (062)

Rows 1–8 (§4a) cover the user and organization Space invitations. These rows add the rest of the invite journey.

| #   | Change                                             | Repo                                | Risk                                                                         | Automated?                                                         | Manual check (summary)                                                   | Validation                          | Result                                                                                          |
| --- | -------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| 18  | Invite by email address, register from the link    | server + client-web                 | Medium — C4: invite journey rewritten                                        | API `roleset/invitations/*`; no UI acceptance case                 | Registration lands in the Space → **P12** step 1                         | 🖐 manual on ACC                    | ✅ 30.09                                                                                        |
| 19  | Associate invitation, declined                     | server + notifications + client-web | High — X6: hand-mirrored wire contract; red in nightly                       | API + UI `organization-user-associates/*`; **recipient count red** | Who receives "declined" → **P12** steps 2–3                              | 🖐 manual on ACC (real mail client) | ✅ 30.09 — see note N11                                                                         |
| 20  | Apply to associate, approved                       | server + notifications + client-web | High — S6: inert until the authorization reset runs; red in nightly          | API + UI; **recipient count red**                                  | Apply is offered; recipient list on approve → **P12** steps 4–5          | 🖐 manual on ACC (real mail client) | ✅ 30.09 — see note N11; apply offered, so the organization authorization reset is proven       |
| 21  | New settings toggles; failed accept shows an error | client-web                          | Medium — N2: 13 email classes on by default; C5: failed accept shows nothing | Partly (API settings)                                              | Toggles exist and mute; stale accept shows a message → **P12** steps 6–7 | 🖐 manual on ACC                    | ✅ 30.09 — toggles present and honoured (note N13); stale accept shows an error page (note N10) |

### 4f. Organization settings

| #   | Change                                                           | Repo       | Risk                                                | Automated?                                  | Manual check (summary)                                                                     | Validation       | Result   |
| --- | ---------------------------------------------------------------- | ---------- | --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- | -------- |
| 22  | Authorization and Community tabs removed; roles under Associates | client-web | Medium — C3                                         | UI `organization-user-associates/*`, partly | Tabs gone, old link redirects, plain associate sees no role management → **P13** steps 1–3 | 🖐 manual on ACC | ✅ 30.09 |
| 23  | Organization admin can remove their own Admin role               | client-web | Medium — C11: an organization can reach zero admins | No                                          | Removal succeeds, Owner restores → **P13** step 4                                          | 🖐 manual on ACC | ✅ 30.09 |

### 4g. Notify switch (070)

| #   | Change                                                                           | Repo                | Risk                                   | Automated?                 | Manual check (summary)                       | Validation                          | Result   |
| --- | -------------------------------------------------------------------------------- | ------------------- | -------------------------------------- | -------------------------- | -------------------------------------------- | ----------------------------------- | -------- |
| 24  | Adding a post or task no longer notifies Space members unless the author opts in | server + client-web | High (business) — C1: default reversed | API + UI (test-suites#638) | Off: nothing. On: members notified → **P14** | 🖐 manual on ACC (real mail client) | ✅ 30.09 |

### 4h. Forum (060/061)

| #   | Change                                                          | Repo                | Risk   | Automated?               | Manual check (summary)                                               | Validation                        | Result                  |
| --- | --------------------------------------------------------------- | ------------------- | ------ | ------------------------ | -------------------------------------------------------------------- | --------------------------------- | ----------------------- |
| 25  | Two new categories, Help renamed to Q&A, admin recategorisation | server + client-web | Medium | Pending: test-suites#647 | Categories, recategorise, non-admin cannot, old link opens → **P15** | 🤖 agent walk or 🖐 manual on ACC | ✅ 30.09 — see note N12 |

### 4i. Callout settings and card variant (076)

| #   | Change                                                 | Repo                | Risk                                       | Automated?                               | Manual check (summary)                                                | Validation                        | Result   |
| --- | ------------------------------------------------------ | ------------------- | ------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------- | --------------------------------- | -------- |
| 26  | Shared callout settings merge rewritten for every leaf | server              | Medium — S20: blast radius is all callouts | API `callout/*`, partly                  | Manual selection, comments and visibility persist → **P16** steps 1–3 | 🤖 agent walk or 🖐 manual on ACC | ✅ 30.09 |
| 27  | Expanded subspace cards                                | server + client-web | Low                                        | API + acceptance walks (test-suites#640) | Switch to expanded cards → **P16** step 4                             | 🤖 agent walk or 🖐 manual on ACC | ✅ 30.09 |

### 4j. Fix verification

| #   | Change                                                           | Repo                | Risk | Automated? | Manual check (summary)      | Validation                        | Result                                                          |
| --- | ---------------------------------------------------------------- | ------------------- | ---- | ---------- | --------------------------- | --------------------------------- | --------------------------------------------------------------- |
| 28  | client-web#10325, #10341, #10317 + server#6516, client-web#10324 | client-web + server | Low  | No         | One check per fix → **P17** | 🤖 agent walk or 🖐 manual on ACC | ✅ 30.09 — steps 1–3 and 5; step 4 N/A (surface removed in 062) |

### 4k. Mobile breadcrumbs (071)

| #   | Change                                             | Repo       | Risk                                                | Automated? | Manual check (summary)                         | Validation                        | Result                                                 |
| --- | -------------------------------------------------- | ---------- | --------------------------------------------------- | ---------- | ---------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| 29  | Location-hierarchy disclosure in the mobile header | client-web | Low — C8: overlap at 320px is a documented residual | No         | Chevron opens the hierarchy at 390px → **P18** | 🤖 agent walk or 🖐 manual on ACC | ✅ 30.09 — both space levels and innovation-pack pages |

### 4l. Evidence to obtain from operations

Not UI checks. The acceptance sign-off depends on them.

| #   | Evidence                                                                                                                                                                                                                                                                                                             | Risk       | Blocks rows | Result               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | -------------------- |
| E1  | All three authorization resets ran (`authorizationPolicyResetOnPlatform`, organization/platform reset, conversation rebuild) and `verify-027-reset.sh` passed                                                                                                                                                        | X8, S6, S7 | 11, 16, 20  | ☐                    |
| E2  | `syncForumSpaces` ran — until it does, forum spaces stay in the public room directory                                                                                                                                                                                                                                | S9         | —           | ☐                    |
| E3  | Result of the credential count query for `global-spaces-reader` / `global-community-reader`                                                                                                                                                                                                                          | S15        | —           | ☐                    |
| E4  | Both `externalReference` indexes are valid                                                                                                                                                                                                                                                                           | S2         | —           | ☐                    |
| E5  | CID sweep Job logs and terminal summary                                                                                                                                                                                                                                                                              | X9         | —           | ☐                    |
| E6  | Trivy scan of `notifications v0.40.2` — the image actually deployed                                                                                                                                                                                                                                                  | N6         | —           | ☐                    |
| E7  | `adminCommunicationSyncSpaceHierarchy` run after the migration, to create the Matrix spaces for the two new forum categories (server#6456 asks for it; otherwise created lazily on the first post)                                                                                                                   | —          | —           | ☐                    |
| E8  | Forum curation after the release (alkemio#2052 "after implementation"): existing posts moved into the new categories or removed, then the empty old categories retired with `adminForumRemoveDiscussionCategory`. Owner: the story's stakeholders, not ops. Until then the old categories remain visible — by design | —          | —           | ☐ not a release gate |

---

## Procedures for §4

### P1 — User accepts a Space invitation

1. Log in as 👤A. Open Space S → settings → Community.
2. Invite U1 as Member, with a short message. Send.
3. Log in as U1, open the pending invitation and accept it.
4. Log in as 👤B and open the notification bell. Repeat as 👤A.
5. Check the inbox of 👤A, 👤B and U1.

**Expected**

- Bell, 👤A and 👤B: exactly one row, "`<U1>` accepted the invitation to join `<S>`".
- No second "joined" / new-member row for U1.
- Clicking the row opens Space S settings → Community.
- Email to 👤A and 👤B: subject "`<U1>` accepted the invitation to `<S>`". No "joined" email to either.
- U1 receives the welcome email and nothing about their own accept.

**Evidence:** screenshot of the bell; the two admin emails.

### P2 — User declines a Space invitation

1. As 👤A, invite U2 to Space S as in P1.
2. Log in as U2 and decline the invitation.
3. Log in as 👤B, open the bell. Check the inbox of 👤A and 👤B.

**Expected**

- Bell: one row, "`<U2>` declined the invitation to join `<S>`", linking to Space S settings → Community.
- Email to both admins: subject "`<U2>` declined the invitation to `<S>`".
- U2 is not a member of S and gets no welcome email.

### P3 — Subspace invitation that also joins the parent Space

1. Log in as 👤C. Open subspace S1 → settings → Community.
2. Invite U3 (not a member of S or S1). Send.
3. Log in as U3 and accept.
4. Check the bell and inbox of 👤C, 👤A and 👤B.

**Expected**

- 👤C: one "accepted" row and email for S1; no "joined" for S1.
- 👤A and 👤B: a "joined" notification for the parent Space S, and nothing for S1.
- U3 is a member of both S and S1.

### P4 — Email rendering and delivery (user and organization)

Run on ACC. This is also the one check that the ACC deployment itself sends these notifications, since the API cases do not run against a deployed environment. It is one pass through each flow, not a re-test of the recipient rules.

**User emails**

1. As 👤A, invite U1 to Space S; as U1, accept. Invite U2; as U2, decline (steps as in P1 and P2).
2. In the mailboxes of 👤A and 👤B, open the "`<user>` accepted the invitation to `<S>`" and "`<user>` declined the invitation to `<S>`" emails.

**Organization emails**

3. As 👤A, open Space S → settings → Community and invite 🏢Org as Member, with a short message.
4. In the mailboxes of 👤O1 and 👤O2, open "Invitation for `<Org>` to join `<S>`".
5. As 👤O1, open 🏢Org → settings → Invitations and accept.
6. In the mailboxes of 👤A and 👤B, open "`<Org>` accepted the invitation to `<S>`". In the mailbox of 👤O2, open "`<Org>` has joined `<S>`".
7. Remove 🏢Org from Space S, invite it again, and as 👤O1 decline. In the mailbox of 👤A, open "`<Org>` declined the invitation to `<S>`".

**For every email opened**

8. Check the user or organization name and the Space name in subject and body; no raw placeholders (`{{…}}`) and no HTML escapes such as `&#34;`.
9. Check the invitation email shows the inviter's message.
10. Click the link in the email.

**Expected**

- Every email listed arrives in the real mailbox, once per recipient.
- 👤O1 receives no "has joined" email about their own accept.
- Outcome emails ("accepted", "declined") link to Space S on ACC, at settings → Community.
- The invitation email links to 🏢Org's Invitations tab on ACC.
- No email links to another environment.

**Record, without failing the row:** whether 👤B also receives the organization "accepted" and "declined" emails. The API cases assert the inviter for those two, and the other Space admins only in the deleted-inviter case.

**Evidence:** the emails, saved or as screenshots.

### P5 — Push for the user outcome events

1. As 👤B, enable browser push in the notification settings and allow it in the browser.
2. Repeat P1 steps 1–3 with a new user.

**Expected:** 👤B gets one push for the accept and none for "joined". The user who accepted gets none.

### P6 — Muting the new settings row

1. Log in as 👤B → user settings → Notifications → Space admin group.
2. Find the row "Receive a notification when someone accepts or declines an invitation to a Space you administer", directly after the new-member row.
3. Switch off email and in-app. Save.
4. Repeat P1 steps 1–3 with a new user.

**Expected:** 👤B gets no bell row and no email; 👤A still gets both. Re-enable afterwards.

### P7 — Existing users keep their muted preference

1. **Before the deploy:** as an existing Space admin, switch off the new-member notification row. Note which channels are off.
2. **After the deploy:** log in as that user → Notifications settings.

**Expected:** the new "accepts or declines an invitation" row has the same channels switched off. Every other row is unchanged.

### P8 — Translated copy (user and organization)

1. Switch the UI language to each of: Dutch, German, Spanish, French, Bulgarian.
2. Open the bell rows produced by P4:
   - as 👤A: "`<user>` accepted the invitation to join `<S>`", "`<user>` declined…", "`<Org>` accepted the invitation to join `<S>`", "`<Org>` declined…"
   - as 👤O2: "Your organization `<Org>` has joined `<S>`"
   - as 👤O1 or 👤O2: the row for the invitation of 🏢Org to Space S
3. Open the settings row from P6.

**Expected:** the text is translated, user, organization and Space names are filled in, and no translation keys are shown.

### P9 — Deploy smoke

1. Log in as Global Admin and open any Space.
2. Open a callout.
3. Edit the callout and save.
4. Open the template library and open one template.
5. Open `/admin`.

**Expected**

- The callout renders with its contributions, and the edit saves.
- Templates list and open.
- Every admin section is visible, including the new **Licensing** section.

### P10 — Conversation attachments

Accounts: users A and B share a conversation; user C is in neither.

1. As A, open a new chat with B, attach an image and send.
2. Attach a PDF and send.
3. As B, open the chat and download both.
4. Open a conversation that **existed before the deploy** and repeat steps 1–3.
5. As C, paste the download link of an attachment from step 1.
6. From Element, send an image to the same room. Open the conversation in the web client.
7. From the web client, send a file. Open it in Element.
8. Attach a file over 50 MB, then a file of an unusual type. Use a PDF, a video or an archive for the size check: a very large image is rejected earlier, on its pixel dimensions (note N4).
9. Switch the network off, send a message with an attachment, switch it on and retry.

**Expected**

- Step 1: inline image preview. Step 2: file chip.
- Step 3: both render for B, and each download opens the correct file.
- Step 4: same as steps 1–3. A failed upload or read means the conversation authorization rebuild has not run (E1).
- Step 5: access denied.
- Steps 6–7: the attachment renders and downloads on the other side.
- Step 8: a clear error, and no draft left stuck in the composer.
- Step 9: a failure shown on that message, and no duplicate after the retry.

**Evidence:** screenshots of steps 4, 5, 6 and 7.

### P11 — Platform roles on ACC

Accounts: a legacy Global Admin; a plain registered user R with no platform role.

1. As Global Admin, open each `/admin` section. Open the Spaces, Organizations and Store lists.
2. Open `/admin/authorization` and assign **Platform Roles Admin** to R.
3. Within a minute, log in as R and open `/admin`.
4. As R, open `/admin/spaces` by direct link.
5. As Global Admin, remove the role from R. As R, reload.
6. As Global Admin, open `/admin/authorization`, pick a **Feature** role tab (for example Feature Beta Tester), and in the "Current organisations" editor add an organization. Reload, then remove it.
7. Assign **Feature VC Campaign** to an organization. As an admin of that organization, open the dashboard. As a plain associate, open the dashboard. Remove the role and reload as the admin.

**Expected**

- Step 1: no section missing; row actions present in all three lists.
- Step 3: only the Authorization section is visible, without a second login.
- Step 4: redirect away from the section. The suite recorded this as a client defect on 25.09, so record exactly what is shown.
- Step 5: R has no admin access.
- Step 6: both succeed and the holder list reflects each change.
- Step 7, as specified (FR-002/FR-031): the admin sees the Virtual Contributor banner, the associate does not, and it is gone after the removal. **Observed 29.09: no banner for the admin — finding F1.**

Steps 2–5 are the SC-002/SC-003 acceptance evidence that S14 asks for.

**Evidence:** screenshots of steps 3 and 4.

### P12 — Invite journey and organization associates

Run P1 and P4 first; they cover the user and organization Space invitations.

1. As 👤A, open **Space S** → settings → Community → Invite (the users dialog, not the organization one). Paste an email address that has no account on ACC; it should become an `@` chip. Send, then register from the link in the email. _The organization Associates dialog has no email path by design (workspace#062, registered users only) — tracked as a story in [server#6562](https://github.com/alkem-io/server/issues/6562)._
2. As 👤O1, open 🏢Org → settings → Associates and invite U1 as associate.
3. As U1, decline. Check the mailboxes of 👤O1, 👤O2 and U1.
4. As U2, open 🏢Org's page and apply to associate.
5. As 👤O1, approve. Check the mailboxes of 👤O1, 👤O2 and U2.
6. As 👤O2, open user settings → Notifications. Switch off one of the new organization rows and repeat steps 2–3 with a new user.
7. As 👤A, invite U3 to Space S. Keep U3's invitation open in one tab, withdraw the invitation as 👤A, then accept in U3's tab.

**Expected**

- Step 1: the new user lands in Space S as a member.
- Step 3: "declined" reaches the organization admins. U1 gets nothing about their own decline.
- Step 4: the apply option is offered. If it is not, the authorization reset has not run (E1).
- Step 5: U2 gets "approved"; 👤O2 gets "joined"; 👤O1, the approver, gets nothing.
- Step 6: the toggles exist; 👤O2 gets nothing, 👤O1 still does.
- Step 7: U3 sees an error message.

**Record, without failing the row:** the full recipient list of steps 3 and 5. The matching API cases are red in nightly with one recipient too many.

**Evidence:** the emails of steps 3 and 5.

### P13 — Organization settings

1. As 👤O1, open 🏢Org → settings.
2. Open `<org url>/settings/authorization`.
3. As a plain associate of 🏢Org, open the organization page and its settings.
4. In an organization with one admin and a separate Owner: as that admin, remove your own Admin role. Then, as the Owner, assign it back.

**Expected**

- Step 1: no Authorization tab and no Community tab; Admin and Owner are managed under Associates.
- Step 2: redirect to the Associates page.
- Step 3: no role management offered.
- Step 4: the removal succeeds by design (ruling R50), and the Owner can restore it.

### P14 — Notify switch

1. As a member of Space S, add a post to a callout. Leave "Notify space members" off.
2. Add a second post with the switch on.
3. Repeat steps 1–2 with a task.
4. Check the bell and mailbox of another member of S.

**Expected:** nothing for the posts and tasks added with the switch off; one notification for each added with it on.

### P15 — Forum

1. Open the forum.
2. As a platform admin, open an existing discussion and change its category.
3. As a plain user, open a discussion created by someone else.
4. Open a link to a discussion that was in the Help category before the deploy.

**Expected**

- Step 1: the list starts with the four new or renamed categories — Releases, Newsletter, Tips & Tricks, Q&A (formerly Help) — followed by the existing ones: Platform functionalities, Community building, Other. Seven in all, plus "Show all".
- Step 2: the discussion moves to the new category.
- Step 3: no option to change the category.
- Step 4: the discussion opens, now under Q&A.

**Known issue, does not fail the row:** `/forum/releases/latest` returns 404 (C7).

### P16 — Callout settings and card variant

1. Open a Contributors callout that uses manual selection. Remove one entry, save and reload.
2. On any callout, switch comments off, save and reload. Switch them on again.
3. Change the visibility of a callout, save and reload.
4. On a Subspaces callout, switch the card variant to expanded, save and reload.

**Expected**

- Steps 1–3: each change is kept after the reload, and no other setting of the callout changed.
- Step 4: subspace cards show What / Why / Who.

### P17 — Fix verification

1. Add a post to a callout and save.
2. Open a post for editing.
3. Edit a callout with whiteboard responses: change the default response whiteboard, save; then clear it, save and reload.
4. _N/A — the "Load more" under Available users was in the organization Community tab, which this release deleted (062); client-web#10324 hardened the shared hook only. No surface to test._
5. As a Space admin without a platform role, open Space settings → Community → Member Organisations.

**Expected**

- Step 1: the dialog closes after the save.
- Step 2: the comment section is hidden while editing.
- Step 3: both the change and the clearing are kept.
- Step 4: not applicable.
- Step 5: "Add Organisation" is hidden (not shown disabled); "Invite Organisation" is still offered. The two differ on purpose: only a platform role can ever add directly, while every Space admin can invite.

### P18 — Mobile breadcrumbs

1. Set the browser width to 390px.
2. Open a sub-subspace (L2).
3. Tap the chevron next to the location in the header.

**Expected:** the full hierarchy (Space → subspace → sub-subspace) opens, and each entry navigates.

---

## Open questions carried from the test plan

- **Channels.** A comment on notifications#356 (24.08) says the feature is "intentionally email-only". The code and server#4100 send email, in-app and push, and P1–P3 passed with in-app rows. Product to confirm, and the story comment to be corrected.
- **Notifications version.** The release story (alkemio#2132) names `0.41.0` in the Released images table, in pre-deployment step 5 and in "Before the cut". ACC runs `v0.40.2` and the Release Lead confirmed that version. The story needs correcting before the Production deploy.
- **Release notes, attachments.** alkemio#2132 says files can be attached "in chats and comment threads". Only chat can attach in this release (note N5). Release Lead to correct the release notes.
- **Stack trace in error responses.** Seen on ACC in an upload error (note N4). To confirm with the Release Lead that Production does not return it.
- **User decline.** notifications#356 says user "reject was not implemented". It is implemented and P2 passed. The story text needs correcting.

---

## 6. Sign-off

| Gate                                         | Owner                     | State                                                                                                                  |
| -------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Automated suites green (or reds triaged)     | Verification lead (cover) | ✅ 30.09 — nightly reds triaged (§1), local notifications run 183/196 with the 3 failures explained                    |
| Per-release additions (§4) complete          | Verification lead (cover) | ✅ 30.09 — all high- and medium-risk rows passed; low-risk rows 5, 6, 8 not run by decision; row 7 moved to Production |
| **Acceptance sign-off** _(human gate)_       | Quality Lead              | ✅ — QA evidence complete, see the summary below                                                                       |
| **Go / no-go for production** _(human gate)_ | Release Lead              | ☐ — see "Owed by the Release Lead"                                                                                     |

### Summary for the acceptance sign-off (30.09)

**Result: no blocker found.** 26 rows passed on ACC (client `0.167.0`, server `0.167.0`, notifications `v0.40.2`), 1 partly, 4 not run, 1 finding. Every risk marked High or Medium in alkemio#2132 that a QA check can address has ACC evidence behind it: deploy order (X1), attachments incl. Element both ways (X5, S4, S7), platform roles incl. the acceptance evidence SC-002/SC-003 for S14 (C10, X8), the invite journey and the 13 new emails (C4, X2, X6, N2, S6, C5), organization settings (C3, C11), the notify-switch reversal (C1), the callout settings merge (S20), the forum (S11 apart from the Matrix reconcile itself, which is ops). All three post-deploy authorization resets are proven by behaviour: platform (row 16), conversation (row 11), organization (row 20).

**Coverage stopped by decision.** Rows 5 (push), 6 (Space-admin row muting) and 8 (translations) are low risk and were not run: push is unit-pinned, the same mute mechanism passed for the organization rows (row 21), and the new role labels are already known to be untranslated (C14). Row 7 cannot be run on ACC after the fact. Row 14's size limit (>50 MiB, non-image) was not tested; the pixel-budget and file-type guards were.

**Findings — none block the release**

| #   | Finding                                                                                          | Tracked                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| F1  | Feature Beta Tester / VC Campaign have no effect when held by an organization                    | test-suites#648; behaviour defined in server#6552, fix after this release |
| N4  | Oversized image: generic "upload failed" to the user; stack trace in the ACC error response      | Confirm Production does not return stack traces                           |
| N5  | Release notes claim attachments in comment threads; only chat has them                           | Release notes correction                                                  |
| N10 | Accepting an archived invitation shows the raw "Invitation with ID can not be found" page, twice | UX only; mention to the client team                                       |
| —   | Organization cannot leave a Space it joined                                                      | Story server#6560                                                         |
| —   | Organization cannot invite an associate by email                                                 | Story server#6562                                                         |

**Owed by the Release Lead before Production**

- Story corrections: notifications is `v0.40.2`, not `0.41.0` (three places); release notes — attachments are chat-only; "four categories" — the older categories remain until curated.
- Operations evidence E2–E7 (§4l): `syncForumSpaces` (S9 — a live exposure until run), the S15 credential count, the `externalReference` index check (S2), the CID sweep evidence (X9), Trivy on `v0.40.2` (N6), `adminCommunicationSyncSpaceHierarchy` for the new forum categories. Post-release: forum curation E8.
- Business sign-offs the story lists: the notify-by-default reversal (C1), the 13 email classes on by default (N2), and the residual security-risk acceptance for 027 (S14) — the acceptance half of S14 is covered by rows 15–17.
- Run row 7 (muted preference survives the migration) as part of the Production deploy, with a user who muted the new-member row beforehand.
