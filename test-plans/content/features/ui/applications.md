---
feature: Client web — applications (join requests) for Spaces and Subspaces
slug: ui-applications
---

<!--
  Covers client-web/src/functional-e2e/applications/
  (space-applications-level-0.spec.ts, space-applications-level-1.spec.ts).
-->

## TC-2000 — User can submit an application to join a Level-0 Space

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a non-member, open a public Space that accepts applications.
2. Click "Apply to join", fill in the application message, submit.

### Expected

- Submission confirms via toast; the application appears in the user's pending list.

## TC-2001 — Space admin views pending applications for Level-0 Space

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as Space admin; open the community / applications management view.

### Expected

- All pending applications are listed with applicant, date, and message.

## TC-2002 — Space admin can reject, archive, approve, and directly-approve applications

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. On a pending application, click Reject. Confirm.
2. Archive an application and confirm it is removed from active list.
3. Approve an application through the detail view.
4. From the Data Grid, approve an application directly.

### Expected

- Each terminal action updates the application state and emits the documented notification.
- Approved applicants become members; rejected applicants are notified per policy.

## TC-2003 — Viewing and rejecting an application from the detail view works and matches the grid flow

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open an application's detail; click View → Reject.
2. Confirm the application moves to the rejected state.

### Expected

- Same outcome whether initiated from detail view or from grid quick-action.

## TC-2010 — Private Level-1 Subspace card visible to non-members with apply affordance

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a member of the parent Space but non-member of a private subspace, view the subspace card.

### Expected

- Card displays the "Apply" CTA without exposing private content.

## TC-2011 — Application submission flow for Level-1 Subspace matches Level-0

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Submit an application to a Level-1 subspace; observe the applicant-side confirmation and the admin-side listing.

### Expected

- Same UX as TC-2000 / TC-2001; subspace admin scope applies.

## TC-2012 — Subspace admin can reject, archive, approve, and direct-approve subspace applications

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Same four actions as TC-2002, scoped to a Level-1 subspace.

### Expected

- Matches the Level-0 flow; roles and notifications scope to the subspace.
