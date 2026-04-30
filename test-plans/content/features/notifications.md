---
feature: Notifications — email
slug: notifications
---

<!--
  Covers server-api/src/functional-api/notifications/.
  Email notifications are triggered by domain events (message posted, user
  invited, community joined, application lifecycle, etc.). Assertions use
  MailSlurper to verify that the correct recipients receive the expected
  email template.
-->

## TC-0600 — Posting a callout comment notifies the author and subscribers

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. User A creates a callout; user B posts a comment on it.
2. Observe the mail server for incoming notifications.

### Expected

- User A (callout author) receives a "new comment on your callout" email within 30 seconds.
- Any users subscribed to the callout's discussion receive the same notification.
- User B (the commenter) does NOT receive a self-notification.

## TC-0601 — Community updates trigger notifications to community members

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a community manager, publish a "Community update" message.
2. Check email delivery for each member across roles (member, lead, admin).

### Expected

- All community members receive the update email.
- The template body contains the posted message and a link to the community.

## TC-0602 — User registration, removal, and Space creation each trigger their dedicated email

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Register a new user (expect welcome email).
2. Delete a user (expect removal-confirmation email where configured).
3. Create a new Space (expect Space-creation email to the host).

### Expected

- Each event triggers exactly one email per recipient; templates include the correct entity links and display names.

## TC-0603 — Invitations, applications, and join-community events notify the right parties

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. A manager invites user A (expect invite email to A).
2. User B submits an application (expect pending-application email to the managers).
3. User C joins a community through auto-invite (expect joined-community emails to C and to leads).

### Expected

- Each path produces the expected set of emails with correct CTA links and no duplicate notifications.

## TC-0604 — Forum discussions: new post, new comment, reply — each triggers the correct audience

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Post a new discussion (expect email to forum subscribers).
2. Comment on an existing discussion (expect email to the discussion author).
3. Reply to a comment (expect email to the comment author; also to the post author if distinct).

### Expected

- Notification routing matches the spec per event type; no one receives a self-notification.

## TC-0605 — User-to-user and user-to-organization messages produce exactly one email per recipient

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. User A sends a direct message to user B.
2. User A sends a direct message to organization O (with multiple admins).

### Expected

- B receives one email; A receives none.
- Each organization admin receives one email (no duplicates per recipient).

## TC-0606 — Mentions of a user in a message trigger a mention notification

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. In a discussion, post a message mentioning `@user-B`.
2. Observe the mail server.

### Expected

- User B receives a mention email with the message context.
- No mention email is sent to the author even if they mention themselves.

## TC-0607 — Messages to community leads route correctly across Space/Subspace/Subsubspace

```yaml
priority: P3
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Send a "message community leads" from each of the 9 lead-routing variants described in the specs (Private vs Public × Space/Subspace/Subsubspace × Has / No leads).
2. Observe delivered emails per case.

### Expected

- Each variant delivers to the correct lead set defined by the routing policy.
- When the nominal lead set is empty, the message falls back to the documented upstream lead (e.g. parent space's leads) or returns a clear error.
