# Manual verification — Administration section per platform role (workspace#027)

> **Purpose:** walk the `/admin` area as each of the 14 roles and confirm every role sees **exactly** what it should — and nothing else. Complements the API suite (`server-api/src/functional-api/platform-roles/`), which proves the server side; this list is about what the **UI offers**.
> **Basis:** client `feat/027-platform-role-redesign` @ `78bc65e84` (`adminSectionAccess.ts`, `CrdAdminGlobalRolesPage.tsx`) + spec §Target global role model. Expectations marked 🔎 were observed on screen during test runs; the rest are derived from the client's access map and still need a human eye.
> **Time:** ~60–75 min for the full pass; Part A alone (~25 min) is the minimum useful run.

## Status after the manual pass of 2026-09-21 and the automated pass of 2026-09-25

Client `78bc65e84`, server `ec4e4aef2`, local stack, single-role users. Legend: ☑ done, as expected · ✘ done, **failed** (defect recorded in Part E) · ◐ partly covered — what is still open is stated in the row · ☐ not covered yet.

**Automation tags — read these before spending manual time:** 🤖UI = the Playwright suite checks this in the browser, skip it · 🤖API = the API suite proves the SERVER side (permission, rule, effect), so by hand only the *UI offer* is left: is the control shown / hidden / does it fail gracefully · 👤 = nothing automated, manual only. A 🤖 tag followed by *(red)* or *(expected failure)* means the automated test already records the defect.

| Part | Status | What is left |
|---|---|---|
| **A** — sections per role | ☑ all 13 rows walked, navigation as expected | By-URL check seen once (E19); four open questions below are for product |
| **B** — Authorization section | ☑ 2026-09-25: the two manual-only items done (organisation add/remove on a Feature role, by Claude in the browser; legacy section as `admin@alkem.io`, by the user); everything else is 🤖UI | Nothing |
| **C** — can / cannot per role | ☑ every row covered 2026-09-25 — 2 rows ✘ (C4, C9), 1 row ✘ new (C6 delete leaves the list stale), the rest pass; 8 new UI specs automate what was checked | C11's offer needs a client built with `VITE_APP_ASSISTANT_ENABLED` (dev) |
| **D** — immediacy | ☑ the two user checks (2026-09-23) | The organisation-standing check, blocked by E18 |
| **E** — known issues | 24 of 29 closed or reproduced; E25–E29 new on 2026-09-25 (E25 visibility save swallowed, E26 stale users list, E27 nobody verifies organisations, E28 forum ignores forum-manage, E29 conversion has no success message) | E4 (UI half), E6 (decision), E23 (dev check) |

Posted: server findings on alkem-io/server#6322, client findings on alkem-io/client-web#10102 (one evolving comment each).

## What is already automated (run `pnpm run test:platform-roles` in `client-web/`, ~2 min)

| Part | Automated by | Left for a human |
|---|---|---|
| **A** — sections per role | `admin-sections-per-role.spec.ts` (28 tests, all 14 roles: exact tabs, landing section, every other section by URL) | The four open questions under Part A |
| **B** — Authorization page | `authorization-page-per-viewer.spec.ts` (15 tests: Roles Admin, Users Admin, Audit Reader; add/remove; self-assignment, Spaces-Reader-to-human and Audit-Reader-exclusion refusals; URL fallback) + `authz-admin-guard/platform-global-roles.spec.ts` (legacy viewer) | Organization add/remove on a Feature role; the two-person rule; B4 |
| **C** — can / cannot | `space-support-flag.spec.ts` (4), `space-visibility-per-role.spec.ts` (3), `users-admin-actions.spec.ts` (3), `feature-roles-offers.spec.ts` (4), `forum-discussion-controls.spec.ts` (2), `space-conversion-as-resource-admin.spec.ts` (1) — all on disposable fixtures | C11's offer where the assistant flag is on |
| **D** — immediacy | — (server side: API scenarios I1, O1, O2) | The reload-only browser check |
| **E** — known issues | E1, E9, E10 are recorded as *expected failures* in the specs above, and E15, E16 in `resource-transfers-as-resource-admin.spec.ts` (2 tests, disposable fixtures): they turn red the moment the defect is fixed | Reproduce and triage the rest |

So a manual pass can **skip Parts A and B** unless you want eyes on them, and spend its time on C, D and E.

## Before you start

> ⚠️ **Do not verify any individual role with `admin@alkem.io`.** On a 027 stack that account holds FIVE roles at once — the legacy Global Admin plus Platform Roles Admin, Users Admin, Operations Admin and Settings Admin (the server's bootstrap seeds them) — so it sees nearly every section whatever you are trying to test. Use the single-role users below, or a user you grant exactly one role. To check who you are in any window: `query { me { user { email } } platform { roleSet { myRoles } } }` — a clean single-role user returns exactly `[<the role>, "REGISTERED"]`.

- [x] ❗ **The auth-reset WORKER must be built from the same code as the server.** "Reset all" (`authorizationPolicyResetAll`, also the Authorization-policies admin action) is executed by a separate worker image; if that image predates 027 it rewrites the policy of every existing organisation, account, space and user with pre-027 rules — after which the new roles hold nothing on existing entities (symptom: Content Full Access "cannot edit" organisations/packs/hubs it can see; a *newly created* one still works). Locally: `docker compose -p alkemio-serverdev -f quickstart-services.yml --env-file .env.docker build auth-reset-worker` in the server repo, then run reset-all once. Happened on 2026-09-21 with a worker image from 2026-08-10 (server 0.160.0). *(Done 2026-09-21: worker rebuilt at 0.166.0, reset-all re-run, Content Full Access verified to hold CRUD again.)*
- [x] Stack runs the 027 **server and client**. Quick check: log in as `admin@alkem.io`, open `/admin/authorization` — the role tabs include "Platform Roles Admin" and "Feature VC Campaign".
- [x] The 14 single-role users exist and hold exactly one role each. Easiest way: run the API suite once (`cd server-api && pnpm run test:platform-roles`) — its setup registers and seeds them, and refuses to continue if any holds something extra.
- [ ] All test users share the usual test-harness password. Use a **private window per role** (sessions are sticky).
- [ ] Have one **private** space and one organization with an innovation pack available (any fixture will do).

| Role | Login |
|---|---|
| Platform Roles Admin | `platform.rolesadmin@alkem.io` |
| Platform Content Full Access | `platform.contentfullaccess@alkem.io` |
| Platform Resource Admin | `platform.resourceadmin@alkem.io` |
| Platform Settings Admin | `platform.settingsadmin@alkem.io` |
| Platform Operations Admin | `platform.opsadmin@alkem.io` |
| Platform Users Admin | `platform.usersadmin@alkem.io` |
| Platform Support | `platform.support@alkem.io` |
| Platform License Manager | `platform.licensemanager@alkem.io` |
| Platform Spaces Reader | `platform.spacesreader@alkem.io` *(service account — see C5)* |
| Platform Audit Reader | `platform.auditreader@alkem.io` |
| Feature Beta Tester | `feature.betatester@alkem.io` |
| Feature Virtual Assistant | `feature.virtualassistant@alkem.io` |
| Feature Organization Creator | `feature.orgcreator@alkem.io` |
| Feature VC Campaign | `feature.vccampaign@alkem.io` |

The ten admin sections: **Spaces · Users · Organisations · Innovation packs · Innovation hubs · Virtual contributors · Authorization · Authorization policies · Transfer · Licensing**.

---

## Part A — Which sections each role sees

For every row: log in → open `/admin`. Two separate checks:

1. **Navigation — expected to PASS:** the tabs show exactly the listed sections, and `/admin` lands on the first of them (or on **"Access Restricted"** 🔎 for a role with none).
2. **By URL — a KNOWN DEFECT today (E9):** typing another section's URL (e.g. `/admin/users`) *should* end on "Access Restricted", but for any role that has at least one section of its own the page **renders** instead — usually empty, because the server refuses the data. Note what you see; do not log it as a new bug. The one to look at closely is **Platform License Manager on `/admin/users`**, where the list is populated.

| # | Role | Navigation must show exactly | Not in the navigation (by URL → see note 2 / E9) | ✔ |
|---|---|---|---|---|
| A1 | Platform Roles Admin | Authorization | Spaces, Users, Transfer, Licensing | ☑ *(first looked at with `admin@alkem.io` by mistake — hence the warning above; fine with a single-role user)* |
| A2 | Platform Content Full Access | Spaces, Organisations, Innovation packs, Innovation hubs, Virtual contributors | Users, **Authorization**, Transfer, Licensing | ☑ |
| A3 | Platform Resource Admin | Transfer | Spaces, Users, Authorization | ☑ |
| A4 | Platform Users Admin | Users, Authorization | Spaces, Transfer, Licensing | ☑ *(stale page after a user switch → E19)* |
| A5 | Platform Support | Organisations, Innovation packs, Innovation hubs | **Spaces**, Users, Authorization, Transfer | ☑ *(open question on Spaces below)* |
| A6 | Platform License Manager | Licensing | Spaces, Users, Authorization, Transfer | ☑ *(Spaces / Organisations / Users seen are the three lists INSIDE Licensing, as designed)* |
| A7 | Platform Audit Reader | Authorization *(read-only — Part B)* | everything else | ☑ *(open question on the missing audit view below)* |
| A8 | Platform Settings Admin | **nothing** — `/admin` → "Access Restricted" | all ten | ☑ |
| A9 | Platform Operations Admin | **nothing** — `/admin` → "Access Restricted" | all ten | ☑ |
| A10 | Platform Spaces Reader | nothing | all ten | ☑ |
| A11 | each of the 4 Feature roles | nothing | all ten | ☑ |
| A12 | a plain registered user (`non.space@alkem.io`) | nothing; no "Administration" entry in the platform menu | all ten | ☑ |
| A13 | `admin@alkem.io` (legacy Global Admin, Slice A) | all ten, incl. **Authorization policies** | — | ☑ |

**Questions to answer while here** *(all four are product questions — none can be closed by a tester)*
- [ ] A8/A9: Settings Admin and Operations Admin have **no admin UI at all** — every action they own is API-only today. Is that intended for release? (Spec user stories read as if an operator does these in the product.)
- [ ] "Authorization policies" is reachable only through the legacy platform-admin privilege — at Slice B nobody will see it. Intended?
- [ ] A5: Platform Support sees **no Spaces tab**, by design — its space rights exist only where a space enables the support flag, and the platform-wide list (private spaces included) belongs to Spaces Reader / Content Full Access; the server grants Support a list read on Organisations, Innovation packs and Innovation hubs only. But the role then has **no way to find the spaces that opted in to support** — it needs the URL from the customer. Should there be a list filtered to support-enabled spaces? Needs a server query first; none returns that set for this role today. (Raised in the manual pass, 2026-09-21.)
- [ ] A7: Platform Audit Reader has **no audit screen**. Its only UI is the read-only Authorization tab (holder lists). The platform audit trail is reachable only through the MCP tool `analyze_audit_log`, and the two email-change audit queries have a dialog ("Email change history") that lives on the **Users** list — a section this role does not have, while Users Admin is offered the button and refused by the server (E17). Is an audit reader without an audit view acceptable for release? At minimum the history dialog is offered to the wrong role. (Raised in the manual pass, 2026-09-21.)

---

## Part B — The Authorization section (role assignment)

### B1 — as Platform Roles Admin
> Manual pass 2026-09-21: ◐ users were granted roles from this page (Platform Support, Feature Organization Creator and others), and the Audit Reader exclusion was hit — through GraphiQL, not the page (`ruleId: audit-reader-exclusion`, as specified). Nothing below was walked item by item; the automated suite covers all of it except the organisation editor and the two-person rule.
- [ ] 🤖UI Role tabs: **all 14** target roles. Exactly one tab is highlighted; the URL carries its name (`/admin/authorization/roles/<ROLE>`).
- [ ] 🤖UI ⚠️ Type a nonsense role in the URL (`…/roles/NOPE`). The page falls back to the **first tab = Platform Roles Admin**. Confirm the highlighted tab and the heading make that obvious *before* any Add button is pressed. *(This fallback is how an outdated automated test would have granted Roles Admin to a test user.)*
- [ ] 🤖UI ◐ *(add seen working; reload / remove not reported)* Pick **Platform Support** → "Add members" → search a user → **Add** → the user appears under "Current members" 🔎; reload → still there; **Remove** → confirm dialog "Remove <name>?" 🔎 → gone after reload.
- [x] ☑ 2026-09-25 (add persists across reload; remove confirm is "Remove organisation"; both search boxes say "Search users…" → E2 confirmed) · 🤖UI for the editor being there · 👤 for adding and removing — Pick a **Feature** role → the page additionally shows an **Organisations** editor ("Current organisations") 🔎. Add an organization, reload, remove it.
- [ ] 🤖UI Pick a **Platform** role → there is **no** Organisations editor (a Platform role can never be held by an organization).
- [ ] 🤖UI **Self-assignment:** try to add *yourself* to any role → refused, with a message about self-assignment being blocked; you do not appear under "Current members".
- [ ] 🤖UI **Spaces Reader to a human:** add an ordinary user to Platform Spaces Reader → refused ("may only be granted to a service account").
- [ ] 🤖UI for the first direction · 🤖API (R4) for the reverse and the Feature-role case — ◐ *(one direction, via the API: Audit Reader + Settings Admin refused; not yet seen in the page)* **Audit Reader exclusion:** add a user who already holds a Platform role to Platform Audit Reader → refused ("mutually exclusive"); and the reverse (give an Audit Reader another Platform role) → refused. Giving an Audit Reader a **Feature** role → allowed.
- [ ] 🤖API (R6) · 👤 in the page — **Two-person rule:** as a *second* Roles Admin, grant the first one a role → works.
- [ ] 👤 After each refusal: no "denied" toast left hanging, the list is unchanged, and the page is still usable.

### B2 — as Platform Users Admin
- [ ] 🤖UI Role tabs: **only the 4 Feature roles**. No Platform role tab exists; `…/roles/PLATFORM_SUPPORT` by URL does **not** open an editable Platform Support page (falls back to a Feature tab).
- [ ] 🤖UI for the user · 👤 for the organisation — Add and remove a user on a Feature role → works. Add/remove an organization → works.

### B3 — as Platform Audit Reader (read-only)
- [ ] 🤖UI *(the 14-tabs part is an expected failure: E10)* All 14 tabs, the notice **"You can view this role's holders but not add or remove them."** 🔎, "Current members" lists, **no "Add members"**, no Add buttons 🔎.
- [ ] 🤖UI *(as GLOBAL_SUPPORT: expected failure E1; as Audit Reader the automated check finds NO Remove button and passes)* ❗ **Known defect to confirm:** scroll to **"Legacy roles (revoke only)"**. For a read-only viewer this section still renders **enabled "Remove" buttons** 🔎 (seen as GLOBAL_SUPPORT on Global Admin / Global Support / Global Community Reader holders). Check whether Audit Reader gets them too. Do **not** confirm the dialog on a real holder; if you must test the click, use a throwaway holder — expected: the server refuses.

### B4 — Legacy roles (Slice A only)
- [x] ☑ 2026-09-23 · 👤 As `admin@alkem.io`: the "Legacy roles (revoke only)" section lists current holders of the old global roles with **Remove** only — there is no way to *add* anyone to a legacy role.

---

## Part C — One "can" and one "cannot" per role, in the UI

| # | Role | Can (do it) | Cannot (confirm it is not offered, or is refused) | Status · **Automated?** |
|---|---|---|---|---|
| C1 | Content Full Access | Open a **private** space you are not a member of; edit and delete a callout in it | Open `/admin/authorization`; change the space's visibility; rename (nameID) an entity | ☑ *can* (callout edit + delete, space settings) · ✘ *cannot*: visibility change refused by the server but the UI shows **nothing** (E25, 🤖UI expected failure); features/nameID/New organisation offered and refused (E13, E14) |
| C2 | Platform Support | Organisations → open an org → edit its innovation pack; create/edit/delete a template inside; create and delete an organization | **Delete the pack or hub itself**; move it to another account; open a private space that has *not* enabled "allow platform support as admin" | ☑ *can* (create + delete an organisation, edit a pack, add templates) · ☑ *cannot* (no Delete on packs/hubs of others' organisations; Toggle verification refused → E12/E27) · visuals/references E21, hub gear E20, org Edit E22 |
| C3 | Platform Support | In a space **with** the support flag on: you have admin controls | Same space with the flag **off**: no admin controls | ☑ 2026-09-25 flag OFF → no Settings link, settings URL bounces to About; flag ON → full settings; OFF again → gone (🤖UI `space-support-flag.spec.ts`) |
| C4 | Resource Admin | Transfer → move a space / pack / hub / VC to another account; promote/demote a subspace | Anything in Spaces, Users, Authorization. ❗ **Known finding:** Resource Admin can *read* private spaces (server grants it; requirements say only Spaces Reader may). Confirm what it can open | ✘ transfers (E15, E16) · ☑ promote L1→L0 works (🤖UI `space-conversion-as-resource-admin.spec.ts`; no success message → E29) · ☑ private space: readable (E6), settings → Access Restricted (🤖UI) |
| C5 | Spaces Reader | *(service account — no UI; API only)* | Log in as it in the browser: no admin area; confirm it cannot edit anything in a private space it can read | ☑ nothing left: 🤖API both halves, 🤖UI no admin area |
| C6 | Users Admin | Users → change a user's login email; delete a user; view a user's MCP API keys and revoke one | Grant a Platform role (B2); see the audit trail | ☑ change login email (reason + approver required) works · ✘ delete works on the server but the **list stays stale until reload** (E26, 🤖UI expected failure) · MCP keys: API-only by design, no admin UI · history/license icons offered and refused (E17) |
| C7 | License Manager | Licensing → assign and revoke a plan on an account and on a space; change a space's visibility | Define or edit a license **plan** (that is Settings Admin); anything outside Licensing | ☑ visibility change from Licensing persists (🤖UI) · ☑ Licensing offers usage only: three lists, no plan definitions, no Wingback (E8 closed for this section) · assign/revoke ☑ by the user |
| C8 | Roles Admin | Everything in Part B1 | Edit any content; open Spaces/Users; read the audit trail | ☑ (Part B + 🤖API R1–R6, G1) |
| C9 | Feature Organization Creator | The "create organization" entry is offered and works | Delete an organization | ✘ no button for a user with no organisation (E18) · 🤖API proves the privilege |
| C10 | Feature VC Campaign | The dashboard shows the **Virtual Contributor offer** | No admin area | ☑ 2026-09-25 campaign banner on the dashboard, only for this role (🤖UI `feature-roles-offers.spec.ts`) |
| C11 | Feature Virtual Assistant | The virtual assistant is available | No admin area | ◐ server grants access (🤖UI asserts `virtualAssistantAccess`); the button is ALSO gated on the client build flag `VITE_APP_ASSISTANT_ENABLED`, off locally → check the offer once on dev |
| C12 | Feature Beta Tester | Trial entitlement visible on the account (can create the extra space it entitles) | Create an organization (moved to Organization Creator) | ☑ 2026-09-25 trial allowances on the account (spaces 0/3, VCs 0/3), no campaign banner, no create-organisation (🤖UI) |
| C13 | Settings Admin | *(no UI — API only)* `createLicensePlan` in GraphiQL | — | ☑ createLicensePlan works (user, GraphiQL) · the negative found E24 (🤖API red) |

---

## Part D — Effect is immediate (no re-login)

> 2026-09-23: ☑ the two user checks pass by hand (grant → reload → section there; revoke → reload → Access Restricted at once). The organisation-standing check waits on E18.
> Manual pass 2026-09-21: ☐ not covered. Roles were granted and then used in another window, but never with the reload-only, no-re-login discipline this part needs. The API suite proves immediacy on the server side (rule scenarios I1, O1, O2); the UI half is still open.

- [x] ☑ 2026-09-23 · 🤖API (I1: grant works and revoke denies on the very next request) · 👤 in the browser — Two windows: Roles Admin, and a plain user on `/admin` ("Access Restricted"). Grant the plain user **Platform Support** → in the *other* window just **reload**: the Organisations section is there. No logout, no waiting.
- [x] ☑ 2026-09-23 · 🤖API (I1) · 👤 in the browser — Revoke it → reload → back to "Access Restricted" **immediately** (must not linger for a minute — that would be the 60-second cache).
- [ ] 🤖API (O1, O2) · 👤 in the browser, and blocked there today by E18 — Organization standing: an org holds Feature Organization Creator; its **admin** gets the create-organization entry; demote that user to associate → reload → the entry is gone. An **associate** never had it.

---

## Part E — Known issues to confirm or close (found by the automated suites)

| # | Where | What was seen | Automated? — ✔ reproduced / ☐ not yet |
|---|---|---|---|
| E1 | Authorization → "Legacy roles (revoke only)" | Read-only viewers still get enabled **Remove** buttons (B3) | 🤖UI *(expected failure, as GLOBAL_SUPPORT)* — ☐ |
| E2 | Authorization → a Feature role | The **organization** search box is labelled "Search users…" (same label/placeholder as the user search above it) 🔎 | ✔ reproduced 2026-09-25: both boxes carry the "Search users…" placeholder |
| E3 | Innovation hubs | **Nobody** holding only target roles can *create* a hub (server grants it only to legacy global roles). Is "create hub" offered to Support / Content Full Access / License Manager, and what happens on submit? | ✔ closed 2026-09-25: no create-hub control on Administration → Innovation hubs for Support or Content Full Access (Content Full Access gets Delete, correctly). Hub creation lives on an account's own settings page |
| E4 | Licensing → edit a license plan | The server's `updateLicensePlan` **saves nothing** (reports success). If the UI lets Settings Admin / legacy admin edit a plan: change a value, reload — is it still the old value? | 🤖API *(red)* · 👤 only if a UI for editing plans exists — ☐ in the UI *(the API test is red for it; posted on the server PR)* |
| E5 | Forum | Authors can no longer **edit or delete their own discussion** (gated solely on forum-manage). As a plain user: create a discussion, try to edit it | ✔ reproduced 2026-09-25: the author holds READ + CONTRIBUTE only on their own discussion; no edit/delete offered (correct for those privileges). Server decision. 🤖UI `forum-discussion-controls.spec.ts` |
| E6 | Private spaces as Resource Admin | Can read them (C4) — spec conflict awaiting a decision | 🤖API *(red)* — ☐ by hand *(the API test is red for it)* |
| E7 | Organizations created by Platform Support | Support becomes that org's admin, so on *those* orgs it **can** delete the pack/hub (C2 "cannot" only holds for orgs it did not create) | ✔ consistent with C2: Support saw no Delete on packs/hubs of an organisation created by the admin |
| E9 | **Any** admin section, typed by URL | ❗ The shell filters the navigation but does **not guard the routes**: a role with at least one section can open any other section's URL and the page renders 🔎. Usually empty ("Showing 0 of 0" — the server refuses the data, and the UI shows no "restricted" notice), but **Platform License Manager on `/admin/users` gets every user listed with Edit / Email change history / Manage license plans / Delete controls**, and sees Spaces and Organisations populated too. Roles with *no* section are bounced to "Access Restricted" correctly | 🤖UI *(expected failure for every role that has a section)* — ✔ reproduced as the stale-page variant (E19); typing a foreign URL was not tried by hand — automated |
| E10 | Authorization as Platform Audit Reader | Only the **10 Platform** role tabs are offered 🔎; the requirements give Audit Reader the holder lists of **all 14**, and the server serves them — the client keys the Feature tabs on a privilege Audit Reader does not hold | 🤖UI *(expected failure)* — ☐ |
| E11 | Users, as Platform Users Admin | Every row offers **"Email change history"** 🔎 — but reading the email-change audit entries was deliberately withdrawn from Users Admin (only Audit Reader may). Click it: what happens? | ✔ = E17 |
| E12 | Organisations, as Platform Support | Rows offer **"Manage license plans"**, **"Toggle verification"** and **"Delete"** 🔎. Which of these can Support actually use? (License plans belong to License Manager) | ✔ reproduced 2026-09-25: Toggle verification → `FORBIDDEN_POLICY`, **no message shown**; Manage license plans is disabled (the account is unreadable to Support, so the button has no account id — right result, accidental reason); Delete is Support's to use. Verification itself → E27 |
| E13 | Organisations, as Platform Content Full Access | **"New organisation" is offered, and creating fails** 🔎 (manual, 2026-09-21). Server is right — creating organisations belongs to Platform Support and Feature Organization Creator — the UI should not offer it to this role | 👤 *(🤖API proves the refusal)* — ✔ reproduced by hand, 2026-09-21 |
| E14 | Spaces, as Platform Content Full Access | **"Manage license plans" is offered and enabled** 🔎, and the space settings expose features and the **nameID**; none of these can be changed by this role (license usage = License Manager; renames belong to the entity's own admin, FR-020). Server is right; the UI offers controls the role cannot use. Editing the space settings themselves works, as it should | 👤 *(🤖API proves the refusals)* — ✔ reproduced by hand, 2026-09-21 |
| E15 | Conversions & Transfers → transfer a space to another account, as Platform Resource Admin | **Clicking Transfer sends no request and shows nothing** 🔎 (manual, 2026-09-21; reproduced in the browser, now automated as an expected failure in `resource-transfers-as-resource-admin.spec.ts`). Two defects stacked: (server) `Organization.account` / `User.account` resolve **null, silently**, for this role — they are gated on organisation `UPDATE` / `READ_USER_PII`, and commit `ec4e4aef2` opened them only to `ACCOUNT_LICENSE_MANAGE` holders; Resource Admin holds `TRANSFER_RESOURCE_ACCEPT` on that account but is not covered, so the target account id is unreadable. (client) `useTransferSpace.handleTransfer` does `if (!space?.id \|\| !accountOwner?.accountId) return;` — a silent no-op instead of an error. The mutation itself works for this role when given the account id (the API suite proves it) — so the role CAN transfer, just not through the UI. | 🤖UI *(expected failure)* — ✔ reproduced by hand, 2026-09-21; posted on both PRs |
| E16 | Conversions & Transfers → transfer an Innovation Hub / Innovation Pack / Virtual Contributor, as Platform Resource Admin | **The target picker always says "No matching accounts."** 🔎 (manual, 2026-09-21; automated as an expected failure in the same spec, with a control run as the global admin that finds the target). Client defect: these three cards search for the target through `platformAdmin.users` / `platformAdmin.organizations`, and the server refuses both to this role with `FORBIDDEN_POLICY` — correctly, Resource Admin may not list users or organisations. So none of the three transfers can be started from the UI, although the role owns all of them and the mutations work through the API. Fix: pick the target by URL like the space card does (and fix E15's server half so the account id is readable) | 🤖UI *(expected failure)* — ✔ reproduced by hand, 2026-09-21; posted on client PR |
| E17 | Users, as Platform Users Admin | **Every row offers "Email change history" and "Manage license plans"** 🔎 (manual, 2026-09-21; confirmed in `CrdAdminUsersPage.tsx`: both buttons are rendered with no privilege check, only "Change email" is gated). Neither belongs to this role: the email-change audit entries are Platform Audit Reader's, license plans are Platform License Manager's. Server refuses both; the UI should not offer them | 👤 *(🤖API proves the refusals)* — ✔ reproduced by hand, 2026-09-21; posted |
| E18 | User settings → Organisations, as Feature Organization Creator | **No "Create organisation" button** 🔎 (manual, 2026-09-21; reproduced in a browser). The server is right: the user holds `CREATE_ORGANIZATION` on the platform. Client defect in `UserOrganizationsTabView.tsx`: when the user belongs to **no** organisation the view returns the empty-state caption *before* it renders the controls row that holds the button. So exactly the users this role is meant for — no organisation yet — never see it. Older than 027 (on develop since 2026-05), but 027 is what makes it matter. Works once the user is an associate of any organisation | 👤 *(🤖API proves the privilege is granted)* — a good candidate to automate next — ✔ reproduced by hand, 2026-09-21; posted |
| E19 | Any admin section left open while switching user | Variant of E9 (manual, 2026-09-21): a page left open from a previous session renders for the next user although their navigation does not list it, e.g. Conversions & Transfers for Platform Users Admin. Server refuses the lookups ("Access denied…") | 👤 *(same root cause as E9, which is 🤖UI)* — ✔ reproduced by hand, 2026-09-21; posted |
| E20 | Innovation Hub page, as Platform Support | **No settings gear on the hub's home page** 🔎 (manual, 2026-09-21). Inconsistent client gating: `mapInnovationHubToHomeData` shows the gear on `UPDATE` only, while `useHubAccessGuard` lets `PLATFORM_SUPPORT_ORG_RESOURCES` into `/hub/<nameID>/settings`. Support can edit a hub (server + API suite agree) but is never offered the way in; typing the settings URL works. The Innovation Pack page gets this right (`canEditInnovationPack`) | 👤 — ✔ reproduced by hand, 2026-09-21; posted |
| E21 | Innovation Pack (and hub) settings, as Platform Support | **Text fields and templates save; uploading a visual or adding a reference is refused** 🔎 (manual, 2026-09-21). Server: `PLATFORM_SUPPORT_ORG_RESOURCES` is honoured only by the pack / hub / template / callout mutations. The shared profile mutations still demand `UPDATE` (`uploadImageOnVisual`, `updateVisual`), `CREATE` (`createReferenceOnProfile`, `createTagsetOnProfile`) or `FILE_UPLOAD` on the storage bucket, none of which the role holds. Editing the pack and adding templates IS expected (A7). Whether visuals and references are part of "editing a pack" is a requirements question; today the UI offers them and the server refuses | 👤 — ✔ reproduced by hand, 2026-09-21; posted on both PRs |
| E22 | Administration → Organisations, as Platform Support | **Edit is offered for every organisation; saving fails with "unable to grant 'update'"** 🔎 (manual, 2026-09-21). Server is right: Support owns the organisation lifecycle (create, delete), not updates — it can update only organisations it administers itself. Client: the row pencil in `CrdAdminOrganizationsPage.tsx` has no privilege check (same pattern as E17); the organisation's own page gates its gear on `UPDATE` correctly | 👤 *(🤖API proves the refusal)* — ✔ reproduced by hand, 2026-09-21; posted |
| E23 | Innovation Hub home → "Browse all Spaces on Alkemio" | Goes to `http://localhost/spaces` (port dropped) on a local stack. Not role-related: the link is built from the server's configured `locations.domain`, which is a bare `localhost` locally. Correct on deployed environments where the domain is the real host; check once on dev | 👤 — ✔ reproduced locally; still to check on a deployed environment |
| E24 | API only — `createLicensePlan`, as Platform Content Full Access | ❗ **Permission hole: Content Full Access can create a license plan.** Found 2026-09-21 by the API test added after the manual Settings Admin check. The five censused license-definition mutations check a dedicated policy so that the root CRUD cascade does not admit this role; `createLicensePlan` is missing from the server census and still checks the inherited licensing-framework policy. Nothing to see in the UI (no screen) | 🤖API *(red)* — ✔ reproduced twice by the API suite; kept red; posted at the top of the server PR comment |
| E25 | Administration → Spaces → space settings dialog → Visibility, as Platform Content Full Access | **The visibility change is accepted with no error** (manual, 2026-09-23). The server refuses `updateSpacePlatformSettings` to this role (🤖API negative, proven) — only License Manager may change visibility (A14). The dialog's save handler is `void updateSpaceSettings(...).then(close)` with no error branch, so a refusal is swallowed silently: nothing is shown and, on reload, the old value should still be there. **To confirm:** reload the list after the change — if the NEW value persists it is a server defect instead | ✔ confirmed 2026-09-25 (server refuses, value unchanged, dialog stays open, nothing shown). 🤖UI expected failure in `space-visibility-per-role.spec.ts` |
| E26 | Administration → Users → Delete, as Platform Users Admin | **The deleted user stays in the list until the page is reloaded** (2026-09-25, timed: still listed after 12 s, no query re-issued). `useAdminGlobalUserList` evicts the cache field `usersPaginated` after the delete, but the list reads `platformAdmin.users`. Delete itself works | 🤖UI *(expected failure, `users-admin-actions.spec.ts`)* — ✔ reproduced |
| E27 | Organisation verification ("Toggle verification"), any new role | **No new role can verify an organisation** (2026-09-25, all 14 probed: `verification.authorization.myPrivileges` is empty for every one). The verification policy grants UPDATE only to the legacy global roles and the organisation's own account admin. At Slice B nobody at platform level can verify. Server gap, not in the census; the UI offers the toggle to Support and Content Full Access and both are refused silently | 👤 found by API probe — server + product question |
| E28 | Forum discussion page, as Platform Support | **No edit / delete offered although the role holds `PLATFORM_FORUM_MANAGE` on every discussion** (2026-09-25; the API suite proves update + delete work). The page shows Support the reader's controls only ("Add reaction") | 🤖UI *(expected failure, `forum-discussion-controls.spec.ts`)* — ✔ reproduced |
| E29 | Conversions & Transfers → Convert Space, as Platform Resource Admin | Promote L1 → L0 works, but **completes with no success message**: the card resets, no toast, nothing says the irreversible conversion happened (2026-09-25). Minor | 👤 — ✔ seen |
| E8 | Licensing → Wingback | Any Wingback action still offered? FR-021 says the integration is removed | ◐ closed for Licensing (no Wingback control, 🤖UI); the account/plan pages not checked |

---

## Sign-off

| Part | Result | Notes |
|---|---|---|
| A — sections per role | ☑ pass ☐ fail | 2026-09-21. Navigation correct for all 13 rows; four product questions open |
| B — authorization section | ☑ pass ☐ fail | 2026-09-25; two-person rule 🤖API only |
| C — can / cannot per role | ☐ pass ☑ fail | 2026-09-25: C4, C6, C9 fail (E15, E16, E26, E18); C1 cannot-half fails (E25); all other rows pass |
| D — immediacy | ☑ pass ☐ fail | 2026-09-23; organisation-standing check blocked by E18 |
| E — known issues triaged | ☑ done | 2026-09-25; open: E4 UI half, E6 decision, E23 on dev, E8 outside Licensing |

Tester: the user (manual, 2026-09-21/23) + Claude (browser automation, 2026-09-25)  Date: 2026-09-25  Client SHA: `78bc65e84`  Server SHA: `ec4e4aef2`
