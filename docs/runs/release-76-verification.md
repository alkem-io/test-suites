# Release 76 — verification run sheet

> Per-release working copy of `docs/release-verification-checklist.md` §4 (per-release additions). Started **28.09** with the rows for notifications#356; rows for the rest of the release scope are still to be derived from the `alkem-io/alkemio#2132` Risk Profile.
>
> **Source for the rows below:** [notifications#356](https://github.com/alkem-io/notifications/issues/356) (parent [server#4100](https://github.com/alkem-io/server/issues/4100)), delivered by server#6467, client-web#10272, notifications#594 and test-suites#632. Test plan: `client-web/src/functional-e2e/organization-space-invitations/organization-space-invitations-test-plan.md`.

**Environment.** Rows 1–3 were run on **DEV** on 28.09; the image versions deployed there at the time were not recorded. Rows 4–8 are to be run on **ACC**, which delivers through a real mail client rather than MailSlurper — record the ACC image versions here when they are run. The notifications service must include notifications#594 (`0.41.0` or later); on DEV this is implied by rows 1–3 passing, since the "accepted" and "declined" emails only exist from that version.

**Accounts.** 👤A = admin of Space S (L0), sends the invitations · 👤B = second admin of Space S · 👤C = admin of subspace S1 (L1 under S), not an admin of S · 👥U1, U2, U3 = registered users, not members of S · 🏢Org = an organization that is not a member of S, with two admins: 👤O1 (answers the invitation) and 👤O2 (the other admin). All admins on default notification settings.

**Legend.** ✅ pass · ⚠️ pass-with-notes · ⛔ blocker · N/A · ☐ not run · **Evidence** = what to attach to the row (screenshot, email, query output).

---

## 0. What is left (as of 28.09)

All of it is to be run on **ACC**.

| Item | Procedure | Why it cannot be automated today |
|------|-----------|----------------------------------|
| Email rendering and links, user **and organization** emails, through the real mail client | P4 | Rendering and link target are not asserted by the API cases, and the API cases read MailSlurper, not a real mailbox |
| Push for the user outcome events | P5 | A live push assertion needs `RABBITMQ_MANAGEMENT_*`, which nightly does not set |
| Muting the "accepts or declines an invitation" row, user arm | P6 | Proven live for organization invitees only; same server code path |
| Existing users keep their muted preference after the migration | P7 | The harness cannot reach ACC rows; needs a user who muted before the deploy |
| Translated copy, five non-English locales, user **and organization** rows | P8 | Locale assertions have no home in `test-suites` |

---

## 4. Per-release additions

Each row is a one-line summary. The numbered **procedure** below carries the exact steps and expected results.

### 4a. Invitation outcome notifications (notifications#356)

| #  | Change | Repo | Risk | Automated? | Manual check (summary) | Validation | Result |
|----|--------|------|------|------------|------------------------|------------|--------|
| 1  | User **accepts** a Space invitation → every Space admin told "accepted"; generic "joined" no longer sent | server + notifications + client-web | High — "joined" suppressed and the replacement never exercised live for user invitees | API: `user-invitation-outcomes.it-spec.ts` › UO-1 (email + in-app), green on a local stack only | Bell row, link, emails, no "joined", welcome to the invitee → **P1** | 🖐 manual on DEV | ✅ 28.09 |
| 2  | User **declines** a Space invitation → every Space admin told "declined" | server + notifications + client-web | Medium — story says "reject was not implemented", the code ships it | API: `user-invitation-outcomes.it-spec.ts` › UO-2 (email + in-app), green on a local stack only | Bell row, link, emails → **P2** | 🖐 manual on DEV | ✅ 28.09 |
| 3  | Subspace invitation that also joins the parent Space → suppression stops at the invited Space | server | Medium — parent Space admins must still hear about a new member | API: `user-invitation-outcomes.it-spec.ts` › UO-3 (email), green on a local stack only | L1 admin gets "accepted"; L0 admins get "joined" for L0 → **P3** | 🖐 manual on DEV | ⚠️ 28.09 — pass, see note N1 |
| 4  | **Email rendering and delivery** — user outcome emails and the four organization emails (invited, accepted, declined, has joined) | notifications | Low for the rules (API-covered); Medium for delivery — ACC sends through a real mail client and the organization emails have their own templates | Recipients and subjects: API (`user-invitation-outcomes`, `organization-invitations`), local stack only. Rendering, links, real delivery: no | Each email arrives in a real mailbox, names rendered, no raw placeholders, link lands on the right page → **P4** | 🖐 manual on ACC (real mail client) | ☐ |
| 5  | **Push** for the user outcome events | server | Low — unit-pinned | Unit only | One push on accept, none for "joined" → **P5** | 🖐 manual on ACC | ☐ |
| 6  | **Muting** the new settings row | server + client-web | Low | API for organization invitees only | Muted admin gets nothing, the other admin still does → **P6** | 🖐 manual on ACC | ☐ |
| 7  | **Migration** — new row seeded from the existing new-member preference | server | Elevated — settings backfill on every user | Migration unit specs only | A user who muted "new member" before the deploy has the new row muted too → **P7** | 🖐 manual on ACC, before and after deploy | ☐ |
| 8  | **Translated copy** for the user and organization bell rows and the settings row | client-web | Low | No | nl, de, es, fr, bg: translated, names filled in, no keys → **P8** | 🖐 manual on ACC | ☐ |

**Notes from the run**

- **N1 (row 3).** Observed 28.09 on DEV: the admins of Space S were notified for Space S only; the notification for subspace S1 reached the subspace admin only. So L0 admins do **not** receive the L1 "accepted" notification. This was an unverified point in the test plan and is now recorded as the shipped behaviour. Not recorded: whether U3 received one welcome email or one per Space joined.

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

---

## Open questions carried from the test plan

- **Channels.** A comment on notifications#356 (24.08) says the feature is "intentionally email-only". The code and server#4100 send email, in-app and push, and P1–P3 passed with in-app rows. Product to confirm, and the story comment to be corrected.
- **User decline.** notifications#356 says user "reject was not implemented". It is implemented and P2 passed. The story text needs correcting.

---

## 6. Sign-off

| Gate                                         | Owner                     | State |
| -------------------------------------------- | ------------------------- | ----- |
| Automated suites green (or reds triaged)     | Verification lead (cover) | ☐     |
| Per-release additions (§4) complete          | Verification lead (cover) | ☐     |
| **Acceptance sign-off** _(human gate)_       | Quality Lead              | ☐     |
| **Go / no-go for production** _(human gate)_ | Release Lead              | ☐     |
