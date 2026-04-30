# Test Plan: PWA Push Notifications

**Date:** 2026-03-30
**Related PRs:**
- alkem-io/server#5884 — Server-side push infrastructure (merged 2026-03-26)
- alkem-io/client-web#9433 — Client-side push UI & service worker (merged 2026-03-26)
- alkem-io/client-web#6953 — PWA manifest improvements (merged 2024-10-01)
- alkem-io/server#5903 — Client integration requirements doc (closed, not merged)
- alkem-io/alkemio#1797 — Parent tracking issue (closed)
- alkem-io/test-suites#533 — Automated API tests (open)

Legend: :white_check_mark: = automated in PR #533, :x: = not automated (manual / E2E / future)

---

## 1. VAPID Public Key

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 1.1 | Authenticated user queries `vapidPublicKey` | Returns a non-empty Base64URL string | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 1.2 | Different authenticated users query `vapidPublicKey` | All receive the same key | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 1.3 | Unauthenticated request queries `vapidPublicKey` | Returns error (auth required) | API | :x: |

---

## 2. Push Subscription Lifecycle

### 2.1 Subscribe

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 2.1.1 | Subscribe with valid endpoint, p256dh, auth, userAgent | Returns PushSubscription with status ACTIVE, correct userAgent | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.1.2 | Subscribe with same endpoint again (upsert) | Returns same subscription ID (updated, not duplicated) | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.1.3 | Subscribe with empty endpoint | Returns validation error | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.1.4 | Subscribe with empty p256dh or auth | Returns validation error | API | :x: |
| 2.1.5 | Subscribe without userAgent (optional field) | Subscription created, userAgent is null | API | :x: |

### 2.2 Unsubscribe

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 2.2.1 | Unsubscribe an existing subscription by ID | Returns the subscription, removed from list | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.2.2 | Unsubscribe with non-existent subscription ID | Returns error | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.2.3 | User A tries to unsubscribe User B's subscription | Returns authorization error | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.2.4 | Unsubscribe the same subscription twice | Second call returns error | API | :x: |

### 2.3 List Subscriptions (myPushSubscriptions)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 2.3.1 | User with no subscriptions queries list | Returns empty array | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.3.2 | User with 2 subscriptions queries list | Returns both with id, createdDate, status, userAgent | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.3.3 | User A queries list after User B subscribes | User A does not see User B's subscriptions | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.3.4 | Query list after unsubscribing a subscription | Unsubscribed subscription no longer appears | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |

### 2.4 Max Subscriptions Cap (10)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 2.4.1 | User creates 10 subscriptions | All 10 are listed | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.4.2 | User creates 11th subscription | Oldest subscription auto-removed, list has 10 | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |
| 2.4.3 | Verify the removed subscription is the oldest by createdDate | Confirmed | API | :white_check_mark: `push-subscriptions-lifecycle.it-spec.ts` |

---

## 3. Push Notification Settings — All 28 Events

Each event must support independent `push` toggle (true/false) via `updateUserSettings` mutation. The `push` field must be persisted and returned in the response alongside `email` and `inApp`.

### 3.1 Platform Events (6)

| # | Setting Path | Description | Automated |
|---|-------------|-------------|-----------|
| 3.1.1 | `platform.forumDiscussionCreated` | New forum discussion created | :white_check_mark: |
| 3.1.2 | `platform.forumDiscussionComment` | Comment on a forum discussion | :white_check_mark: |
| 3.1.3 | `platform.admin.userProfileCreated` | New user profile created (admin) | :white_check_mark: |
| 3.1.4 | `platform.admin.userProfileRemoved` | User profile removed (admin) | :white_check_mark: |
| 3.1.5 | `platform.admin.spaceCreated` | New space created (admin) | :white_check_mark: |
| 3.1.6 | `platform.admin.userGlobalRoleChanged` | User global role changed (admin) | :white_check_mark: |

### 3.2 Organization Events (2)

| # | Setting Path | Description | Automated |
|---|-------------|-------------|-----------|
| 3.2.1 | `organization.adminMessageReceived` | Org admin receives a message | :white_check_mark: |
| 3.2.2 | `organization.adminMentioned` | Org admin is mentioned | :white_check_mark: |

### 3.3 Space Events (14)

| # | Setting Path | Description | Automated |
|---|-------------|-------------|-----------|
| 3.3.1 | `space.admin.communityApplicationReceived` | Membership application received (admin) | :white_check_mark: |
| 3.3.2 | `space.admin.communityNewMember` | New member joined (admin) | :white_check_mark: |
| 3.3.3 | `space.admin.communicationMessageReceived` | Message received (admin) | :white_check_mark: |
| 3.3.4 | `space.admin.collaborationCalloutContributionCreated` | Callout contribution (admin) | :white_check_mark: |
| 3.3.5 | `space.communicationUpdates` | Space communication updates | :white_check_mark: |
| 3.3.6 | `space.collaborationCalloutContributionCreated` | Callout contribution created | :white_check_mark: |
| 3.3.7 | `space.collaborationCalloutPostContributionComment` | Comment on callout post | :white_check_mark: |
| 3.3.8 | `space.collaborationCalloutComment` | Comment on callout | :white_check_mark: |
| 3.3.9 | `space.collaborationCalloutPublished` | Callout published | :white_check_mark: |
| 3.3.10 | `space.communityCalendarEvents` | Calendar event updates | :white_check_mark: |
| 3.3.11 | `space.collaborationPollVoteCastOnOwnPoll` | Vote cast on your poll | :white_check_mark: |
| 3.3.12 | `space.collaborationPollVoteCastOnPollIVotedOn` | Vote on a poll you voted on | :white_check_mark: |
| 3.3.13 | `space.collaborationPollModifiedOnPollIVotedOn` | Poll you voted on modified | :white_check_mark: |
| 3.3.14 | `space.collaborationPollVoteAffectedByOptionChange` | Your vote affected by option change | :white_check_mark: |

### 3.4 User Events (5)

| # | Setting Path | Description | Automated |
|---|-------------|-------------|-----------|
| 3.4.1 | `user.mentioned` | User is mentioned | :white_check_mark: |
| 3.4.2 | `user.commentReply` | Reply to user's comment | :white_check_mark: |
| 3.4.3 | `user.messageReceived` | Direct message received | :white_check_mark: |
| 3.4.4 | `user.membership.spaceCommunityInvitationReceived` | Space invitation received | :white_check_mark: |
| 3.4.5 | `user.membership.spaceCommunityJoined` | Joined a space community | :white_check_mark: |

### 3.5 Virtual Contributor Events (1)

| # | Setting Path | Description | Automated |
|---|-------------|-------------|-----------|
| 3.5.1 | `virtualContributor.adminSpaceCommunityInvitation` | VC invited to a space | :white_check_mark: |

### 3.6 Verification Per Event — Set `push: true`, Read Back

| # | Event | Set push=true, verify response | Automated |
|---|-------|-------------------------------|-----------|
| 3.6.1 | `platform.forumDiscussionCreated` | `push` is `true` in response | :white_check_mark: |
| 3.6.2 | `platform.forumDiscussionComment` | `push` is `true` in response | :white_check_mark: |
| 3.6.3 | `platform.admin.userProfileCreated` | `push` is `true` in response | :white_check_mark: |
| 3.6.4 | `platform.admin.userProfileRemoved` | `push` is `true` in response | :white_check_mark: |
| 3.6.5 | `platform.admin.spaceCreated` | `push` is `true` in response | :white_check_mark: |
| 3.6.6 | `platform.admin.userGlobalRoleChanged` | `push` is `true` in response | :white_check_mark: |
| 3.6.7 | `organization.adminMessageReceived` | `push` is `true` in response | :white_check_mark: |
| 3.6.8 | `organization.adminMentioned` | `push` is `true` in response | :white_check_mark: |
| 3.6.9 | `space.admin.communityApplicationReceived` | `push` is `true` in response | :white_check_mark: |
| 3.6.10 | `space.admin.communityNewMember` | `push` is `true` in response | :white_check_mark: |
| 3.6.11 | `space.admin.communicationMessageReceived` | `push` is `true` in response | :white_check_mark: |
| 3.6.12 | `space.admin.collaborationCalloutContributionCreated` | `push` is `true` in response | :white_check_mark: |
| 3.6.13 | `space.communicationUpdates` | `push` is `true` in response | :white_check_mark: |
| 3.6.14 | `space.collaborationCalloutContributionCreated` | `push` is `true` in response | :white_check_mark: |
| 3.6.15 | `space.collaborationCalloutPostContributionComment` | `push` is `true` in response | :white_check_mark: |
| 3.6.16 | `space.collaborationCalloutComment` | `push` is `true` in response | :white_check_mark: |
| 3.6.17 | `space.collaborationCalloutPublished` | `push` is `true` in response | :white_check_mark: |
| 3.6.18 | `space.communityCalendarEvents` | `push` is `true` in response | :white_check_mark: |
| 3.6.19 | `space.collaborationPollVoteCastOnOwnPoll` | `push` is `true` in response | :white_check_mark: |
| 3.6.20 | `space.collaborationPollVoteCastOnPollIVotedOn` | `push` is `true` in response | :white_check_mark: |
| 3.6.21 | `space.collaborationPollModifiedOnPollIVotedOn` | `push` is `true` in response | :white_check_mark: |
| 3.6.22 | `space.collaborationPollVoteAffectedByOptionChange` | `push` is `true` in response | :white_check_mark: |
| 3.6.23 | `user.mentioned` | `push` is `true` in response | :white_check_mark: |
| 3.6.24 | `user.commentReply` | `push` is `true` in response | :white_check_mark: |
| 3.6.25 | `user.messageReceived` | `push` is `true` in response | :white_check_mark: |
| 3.6.26 | `user.membership.spaceCommunityInvitationReceived` | `push` is `true` in response | :white_check_mark: |
| 3.6.27 | `user.membership.spaceCommunityJoined` | `push` is `true` in response | :white_check_mark: |
| 3.6.28 | `virtualContributor.adminSpaceCommunityInvitation` | `push` is `true` in response | :white_check_mark: |

### 3.7 Verification Per Event — Set `push: false`, Read Back

| # | Event | Set push=false, verify response | Automated |
|---|-------|--------------------------------|-----------|
| 3.7.1 | `platform.forumDiscussionCreated` | `push` is `false` in response | :x: |
| 3.7.2 | `platform.forumDiscussionComment` | `push` is `false` in response | :x: |
| 3.7.3 | `platform.admin.userProfileCreated` | `push` is `false` in response | :x: |
| 3.7.4 | `platform.admin.userProfileRemoved` | `push` is `false` in response | :x: |
| 3.7.5 | `platform.admin.spaceCreated` | `push` is `false` in response | :x: |
| 3.7.6 | `platform.admin.userGlobalRoleChanged` | `push` is `false` in response | :x: |
| 3.7.7 | `organization.adminMessageReceived` | `push` is `false` in response | :x: |
| 3.7.8 | `organization.adminMentioned` | `push` is `false` in response | :x: |
| 3.7.9 | `space.admin.communityApplicationReceived` | `push` is `false` in response | :x: |
| 3.7.10 | `space.admin.communityNewMember` | `push` is `false` in response | :x: |
| 3.7.11 | `space.admin.communicationMessageReceived` | `push` is `false` in response | :x: |
| 3.7.12 | `space.admin.collaborationCalloutContributionCreated` | `push` is `false` in response | :x: |
| 3.7.13 | `space.communicationUpdates` | `push` is `false` in response | :x: |
| 3.7.14 | `space.collaborationCalloutContributionCreated` | `push` is `false` in response | :x: |
| 3.7.15 | `space.collaborationCalloutPostContributionComment` | `push` is `false` in response | :x: |
| 3.7.16 | `space.collaborationCalloutComment` | `push` is `false` in response | :x: |
| 3.7.17 | `space.collaborationCalloutPublished` | `push` is `false` in response | :x: |
| 3.7.18 | `space.communityCalendarEvents` | `push` is `false` in response | :x: |
| 3.7.19 | `space.collaborationPollVoteCastOnOwnPoll` | `push` is `false` in response | :x: |
| 3.7.20 | `space.collaborationPollVoteCastOnPollIVotedOn` | `push` is `false` in response | :x: |
| 3.7.21 | `space.collaborationPollModifiedOnPollIVotedOn` | `push` is `false` in response | :x: |
| 3.7.22 | `space.collaborationPollVoteAffectedByOptionChange` | `push` is `false` in response | :x: |
| 3.7.23 | `user.mentioned` | `push` is `false` in response | :x: |
| 3.7.24 | `user.commentReply` | `push` is `false` in response | :x: |
| 3.7.25 | `user.messageReceived` | `push` is `false` in response | :x: |
| 3.7.26 | `user.membership.spaceCommunityInvitationReceived` | `push` is `false` in response | :x: |
| 3.7.27 | `user.membership.spaceCommunityJoined` | `push` is `false` in response | :x: |
| 3.7.28 | `virtualContributor.adminSpaceCommunityInvitation` | `push` is `false` in response | :x: |

### 3.8 Verification Per Event — Trigger Event, Verify Push Delivery

| # | Event | Trigger with push=true + active subscription | Automated |
|---|-------|----------------------------------------------|-----------|
| 3.8.1 | `platform.forumDiscussionCreated` | Push notification delivered to device | :x: |
| 3.8.2 | `platform.forumDiscussionComment` | Push notification delivered to device | :x: |
| 3.8.3 | `platform.admin.userProfileCreated` | Push notification delivered to device | :x: |
| 3.8.4 | `platform.admin.userProfileRemoved` | Push notification delivered to device | :x: |
| 3.8.5 | `platform.admin.spaceCreated` | Push notification delivered to device | :x: |
| 3.8.6 | `platform.admin.userGlobalRoleChanged` | Push notification delivered to device | :x: |
| 3.8.7 | `organization.adminMessageReceived` | Push notification delivered to device | :x: |
| 3.8.8 | `organization.adminMentioned` | Push notification delivered to device | :x: |
| 3.8.9 | `space.admin.communityApplicationReceived` | Push notification delivered to device | :x: |
| 3.8.10 | `space.admin.communityNewMember` | Push notification delivered to device | :x: |
| 3.8.11 | `space.admin.communicationMessageReceived` | Push notification delivered to device | :x: |
| 3.8.12 | `space.admin.collaborationCalloutContributionCreated` | Push notification delivered to device | :x: |
| 3.8.13 | `space.communicationUpdates` | Push notification delivered to device | :x: |
| 3.8.14 | `space.collaborationCalloutContributionCreated` | Push notification delivered to device | :x: |
| 3.8.15 | `space.collaborationCalloutPostContributionComment` | Push notification delivered to device | :x: |
| 3.8.16 | `space.collaborationCalloutComment` | Push notification delivered to device | :x: |
| 3.8.17 | `space.collaborationCalloutPublished` | Push notification delivered to device | :x: |
| 3.8.18 | `space.communityCalendarEvents` | Push notification delivered to device | :x: |
| 3.8.19 | `space.collaborationPollVoteCastOnOwnPoll` | Push notification delivered to device | :x: |
| 3.8.20 | `space.collaborationPollVoteCastOnPollIVotedOn` | Push notification delivered to device | :x: |
| 3.8.21 | `space.collaborationPollModifiedOnPollIVotedOn` | Push notification delivered to device | :x: |
| 3.8.22 | `space.collaborationPollVoteAffectedByOptionChange` | Push notification delivered to device | :x: |
| 3.8.23 | `user.mentioned` | Push notification delivered to device | :x: |
| 3.8.24 | `user.commentReply` | Push notification delivered to device | :x: |
| 3.8.25 | `user.messageReceived` | Push notification delivered to device | :x: |
| 3.8.26 | `user.membership.spaceCommunityInvitationReceived` | Push notification delivered to device | :x: |
| 3.8.27 | `user.membership.spaceCommunityJoined` | Push notification delivered to device | :x: |
| 3.8.28 | `virtualContributor.adminSpaceCommunityInvitation` | Push notification delivered to device | :x: |

### 3.9 Verification Per Event — Trigger Event with push=false, Verify No Delivery

| # | Event | Trigger with push=false | Automated |
|---|-------|------------------------|-----------|
| 3.9.1 | `platform.forumDiscussionCreated` | No push notification delivered | :x: |
| 3.9.2 | `platform.forumDiscussionComment` | No push notification delivered | :x: |
| 3.9.3 | `platform.admin.userProfileCreated` | No push notification delivered | :x: |
| 3.9.4 | `platform.admin.userProfileRemoved` | No push notification delivered | :x: |
| 3.9.5 | `platform.admin.spaceCreated` | No push notification delivered | :x: |
| 3.9.6 | `platform.admin.userGlobalRoleChanged` | No push notification delivered | :x: |
| 3.9.7 | `organization.adminMessageReceived` | No push notification delivered | :x: |
| 3.9.8 | `organization.adminMentioned` | No push notification delivered | :x: |
| 3.9.9 | `space.admin.communityApplicationReceived` | No push notification delivered | :x: |
| 3.9.10 | `space.admin.communityNewMember` | No push notification delivered | :x: |
| 3.9.11 | `space.admin.communicationMessageReceived` | No push notification delivered | :x: |
| 3.9.12 | `space.admin.collaborationCalloutContributionCreated` | No push notification delivered | :x: |
| 3.9.13 | `space.communicationUpdates` | No push notification delivered | :x: |
| 3.9.14 | `space.collaborationCalloutContributionCreated` | No push notification delivered | :x: |
| 3.9.15 | `space.collaborationCalloutPostContributionComment` | No push notification delivered | :x: |
| 3.9.16 | `space.collaborationCalloutComment` | No push notification delivered | :x: |
| 3.9.17 | `space.collaborationCalloutPublished` | No push notification delivered | :x: |
| 3.9.18 | `space.communityCalendarEvents` | No push notification delivered | :x: |
| 3.9.19 | `space.collaborationPollVoteCastOnOwnPoll` | No push notification delivered | :x: |
| 3.9.20 | `space.collaborationPollVoteCastOnPollIVotedOn` | No push notification delivered | :x: |
| 3.9.21 | `space.collaborationPollModifiedOnPollIVotedOn` | No push notification delivered | :x: |
| 3.9.22 | `space.collaborationPollVoteAffectedByOptionChange` | No push notification delivered | :x: |
| 3.9.23 | `user.mentioned` | No push notification delivered | :x: |
| 3.9.24 | `user.commentReply` | No push notification delivered | :x: |
| 3.9.25 | `user.messageReceived` | No push notification delivered | :x: |
| 3.9.26 | `user.membership.spaceCommunityInvitationReceived` | No push notification delivered | :x: |
| 3.9.27 | `user.membership.spaceCommunityJoined` | No push notification delivered | :x: |
| 3.9.28 | `virtualContributor.adminSpaceCommunityInvitation` | No push notification delivered | :x: |

---

## 4. Push Channel Independence

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 4.1 | Enable push only (email: false, inApp: false, push: true) | Only push notifications sent | API | :white_check_mark: `push-notifications-settings.it-spec.ts` |
| 4.2 | Disable push only (email: true, inApp: true, push: false) | Email and inApp sent, no push | API | :white_check_mark: `push-notifications-settings.it-spec.ts` |
| 4.3 | Enable all three channels | All three channels active | API | :white_check_mark: `push-notifications-settings.it-spec.ts` |
| 4.4 | Disable all three channels | No notifications sent on any channel | API | :x: |

---

## 5. Database & Migration

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 5.1 | Fresh deploy — `push_subscription` table exists | Table created with correct columns and indexes | Manual/DB | :x: |
| 5.2 | Upgrade — existing users retain email/inApp settings | No data loss, `push` defaults to existing `inApp` value | Manual/DB | :x: |
| 5.3 | `IDX_push_subscription_userId_status` index exists | Confirmed via DB inspection | Manual/DB | :x: |
| 5.4 | `IDX_push_subscription_endpoint` unique index exists | Confirmed via DB inspection | Manual/DB | :x: |
| 5.5 | Delete user — cascade deletes their push subscriptions | All subscriptions removed | API | :x: |

---

## 6. Rate Limiting (Redis)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 6.1 | Trigger <=10 push events per minute for a user | All delivered | API/Manual | :x: |
| 6.2 | Trigger >10 push events per minute for a user | Excess silently dropped, no errors | API/Manual | :x: |
| 6.3 | Wait 1 minute after throttle, trigger again | Delivery resumes normally | API/Manual | :x: |

---

## 7. RabbitMQ Fix Verification

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 7.1 | Trigger 20 push notifications sequentially | All 20 delivered (no silent drops) | Manual | :x: |
| 7.2 | Verify no competing consumer on `alkemio-push-notifications` queue | Single `@RabbitSubscribe` handler only | Manual/Config | :x: |
| 7.3 | Push delivery failure (invalid endpoint) | Message not redelivered infinitely (no CPU saturation) | Manual | :x: |

---

## 8. GraphQL API Regression

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 8.1 | Existing notification queries without `push` field | Still work, no breaking change | API | :x: (covered implicitly by existing notification tests in CI) |
| 8.2 | Existing `updateUserSettings` without `push` field | Still work, `push` keeps previous value | API | :x: |
| 8.3 | Query user settings — response includes `push` on all 28 channels | Confirmed | API | :white_check_mark: `push-notifications-settings.it-spec.ts` |

---

## 9. Login Backoff Protection (bundled in server#5884)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 9.1 | Rapid failed login attempts (>threshold) | Rate limiting via kratos-hooks kicks in | Manual | :x: |
| 9.2 | Successful login after cooldown | Login succeeds | Manual | :x: |

---

## 10. Client-Web — Service Worker (E2E / Manual)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 10.1 | `push` event received while app backgrounded | OS notification displayed with title, body, icon | E2E | :x: |
| 10.2 | Click push notification | App opens/focuses, navigates to correct entity URL | E2E | :x: |
| 10.3 | `pushsubscriptionchange` event fires (key rotation) | Re-subscribes with new keys, notifies client | Manual | :x: |
| 10.4 | Malformed push payload received | Silently ignored, no crash | Manual | :x: |

---

## 11. Client-Web — Notification Settings UI (E2E / Manual)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 11.1 | Navigate to Settings > Notifications | "Push Notifications" master toggle visible | E2E | :x: |
| 11.2 | Toggle master push ON, grant browser permission | Per-category "Push" column appears (triple-toggle) | E2E | :x: |
| 11.3 | Toggle individual category push switches on/off | Server settings update, UI reflects change | E2E | :x: |
| 11.4 | Toggle master push OFF | Push column disabled, subscription removed from server | E2E | :x: |
| 11.5 | Deny browser notification permission | Graceful message shown, no errors | E2E | :x: |
| 11.6 | Re-enable after denying permission | Message guides user to browser settings | E2E | :x: |

---

## 12. Client-Web — Device Management (E2E / Manual)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 12.1 | View device list in notification settings | Shows active subscriptions with browser/OS info | E2E | :x: |
| 12.2 | Current device highlighted in list | Confirmed | E2E | :x: |
| 12.3 | Remove a device from the list | Confirmation dialog shown, subscription removed on confirm | E2E | :x: |

---

## 13. Client-Web — Subscription Lifecycle (E2E / Manual)

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 13.1 | Log out | Push subscription cleaned from server AND browser | E2E | :x: |
| 13.2 | Close app, reopen (return to app) | Subscription silently validated/restored | E2E | :x: |
| 13.3 | Server mutation fails during subscribe | Browser subscription also rolled back | Manual | :x: |
| 13.4 | Browser permission revoked externally | Server subscription cleaned up via `permissions.query` listener | Manual | :x: |

---

## 14. Platform-Specific Behavior (Manual)

| # | Test Case | Platform | Expected Result | Automated |
|---|-----------|----------|-----------------|-----------|
| 14.1 | Push delivery and click-through | Chrome (Desktop) | Works | :x: |
| 14.2 | Push delivery and click-through | Firefox (Desktop) | Works | :x: |
| 14.3 | Push delivery and click-through | Edge (Desktop) | Works | :x: |
| 14.4 | Push delivery and click-through | Chrome (Android) | Works | :x: |
| 14.5 | PWA installed to Home Screen | Android | Push notifications work | :x: |
| 14.6 | Safari 16.4+ in standalone PWA mode | iOS | Push notifications work | :x: |
| 14.7 | Safari without Home Screen install | iOS | "Add to Home Screen" prompt shown, no push available | :x: |
| 14.8 | Private/incognito browsing mode | Any | Push feature gracefully hidden or disabled | :x: |
| 14.9 | Browser without PushManager support | Any | Push toggle hidden in UI | :x: |

---

## 15. Backward Compatibility

| # | Test Case | Expected Result | Type | Automated |
|---|-----------|-----------------|------|-----------|
| 15.1 | Existing users (pre-migration) have correct `push` defaults | `push` matches previous `inApp` value for all 28 events | DB | :x: |
| 15.2 | API consumers omitting `push` in settings update | Request succeeds, `push` unchanged | API | :x: |
| 15.3 | Client-web older version without push UI | No errors, email/inApp continue to work | Manual | :x: |

---

## Summary

| Category | Total Tests | :white_check_mark: Automated | :x: Not Automated |
|----------|-------------|------------------------------|---------------------|
| 1. VAPID Public Key | 3 | 2 | 1 |
| 2. Subscription Lifecycle | 16 | 13 | 3 |
| 3.1-3.5 Settings toggle (28 events) | 28 | 28 | 0 |
| 3.6 Set push=true, read back (28 events) | 28 | 28 | 0 |
| 3.7 Set push=false, read back (28 events) | 28 | 0 | 28 |
| 3.8 Trigger event, verify push delivery (28 events) | 28 | 0 | 28 |
| 3.9 Trigger event with push=false, no delivery (28 events) | 28 | 0 | 28 |
| 4. Channel Independence | 4 | 3 | 1 |
| 5. Database & Migration | 5 | 0 | 5 |
| 6. Rate Limiting | 3 | 0 | 3 |
| 7. RabbitMQ Fix | 3 | 0 | 3 |
| 8. GraphQL Regression | 3 | 1 | 2 |
| 9. Login Backoff | 2 | 0 | 2 |
| 10. Service Worker | 4 | 0 | 4 |
| 11. Settings UI | 6 | 0 | 6 |
| 12. Device Management | 3 | 0 | 3 |
| 13. Subscription Lifecycle (client) | 4 | 0 | 4 |
| 14. Platform-Specific | 9 | 0 | 9 |
| 15. Backward Compatibility | 3 | 0 | 3 |
| **TOTAL** | **210** | **75** | **135** |

**Automated tests run via:**
```bash
pnpm --filter @alkemio/test-suite-server-api run test:push-notifications
```

**Test files in PR #533:**
- `push-notifications-settings.it-spec.ts` — 31 tests (settings for all 28 events + channel independence)
- `push-subscriptions-lifecycle.it-spec.ts` — 16 tests (VAPID key, subscribe, unsubscribe, list, max cap, fields)
- `push-notifications.request.params.ts` — shared helpers and inline GraphQL fragments
