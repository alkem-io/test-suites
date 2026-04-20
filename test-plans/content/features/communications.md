---
feature: Communications — conversations, messaging, discussions
slug: communications
---

<!--
  Covers GraphQL API tests under server-api/src/functional-api/communications/.
  Scope: conversations (direct + group), message delivery & subscriptions,
  platform-wide discussions and replies, reactions on messages.
  Upstream: alkem-io/server Communications module.
-->

## TC-0100 — A user can create a direct conversation with another user

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
links:
  stories: [alkem-io/product#1442]
```

### Steps

1. Sign in as Space Member A.
2. Call `createConversation` targeting Space Member B with `conversationType: DIRECT`.
3. Query the created conversation via `getMeConversations` as both users.

### Expected

- The mutation returns a conversation with exactly the two participants attached.
- Both users see the conversation in their `getMeConversations` list.
- The backing Matrix room is created and both users have membership.

## TC-0101 — A user can update a conversation's metadata

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a conversation owned by user A, call `updateConversation` with a new display name and description.
2. Query the conversation as both participants.

### Expected

- The updated fields are returned on the mutation response.
- Both participants see the new values on subsequent queries.

## TC-0102 — A user can leave a conversation

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a group conversation with 3 members, member C calls `leaveConversation`.
2. The remaining members query the conversation's member list.

### Expected

- Member C no longer appears in the member list.
- Member C can no longer receive messages in that conversation.
- Remaining members are not affected.

## TC-0103 — A conversation owner can remove another member

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a group conversation where user A is the owner and user B is a member, A calls `removeConversationMember(conversationId, userB)`.
2. B queries their conversation list.

### Expected

- B is no longer a member of the conversation.
- A non-owner attempting the same removal receives an authorization error.

## TC-0104 — Users can send and receive messages in a conversation

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. In a direct conversation between A and B, A calls `sendMessageToRoom(...)`.
2. B polls the message list for the conversation.

### Expected

- B's message list contains A's message within 2 seconds (Matrix eventual consistency).
- The message's `sender` field equals A's user ID.

## TC-0105 — A user can subscribe to conversation events and receive live message updates

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. B opens a WebSocket subscription to `conversationEvents(conversationId)`.
2. A sends a new message in that conversation.

### Expected

- B receives an event within 2 seconds containing the new message's ID and sender.
- Unsubscribing stops further events from arriving.

## TC-0106 — A user can delete a conversation they own

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a conversation owned by A with one other member B, A calls `deleteConversation`.
2. Both users query their conversation lists.

### Expected

- The conversation no longer appears in either user's list.
- A non-owner attempting to delete receives an authorization error.

## TC-0107 — Platform-wide discussions support CRUD operations with proper authorization

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a Global Admin, create a new platform discussion.
2. As a regular stakeholder, post a message and a reply.
3. As the author of a message, edit it. As another user, attempt to edit it.

### Expected

- CRUD operations succeed for authorized users.
- Authorization errors surface for unauthorized edits.

## TC-0108 — Users can react to discussion messages with emoji

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. On an existing discussion message, user A adds a reaction.
2. User B adds the same reaction. User A adds a second, different reaction.
3. User A removes their first reaction.

### Expected

- The message's reaction list reflects each change within 2 seconds.
- Adding the same reaction twice by the same user is idempotent.
