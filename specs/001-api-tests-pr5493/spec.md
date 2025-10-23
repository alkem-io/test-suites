# Feature Specification: Automated API Tests for Notification Cascade & Payload Enrichment (PR #5493)

**Feature Branch**: `001-api-tests-pr5493`  
**Created**: 2025-10-23  
**Status**: Draft  
**Input**: User description: "Add automated API tests covering cascade deletion and notification payload enrichment from PR #5493 (entity tracking FKs, contributorType resolution, new notification events, deletion by message ID)."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Verify Cascade Deletion of Notifications (Priority: P1)

When an entity (space, organization, user, application, invitation, callout, contribution, room) referenced in notifications is deleted, all related in-app notifications should be automatically removed; messages trigger manual deletion using tracked messageID.

**Why this priority**: Guarantees data integrity and prevents stale notifications—core reliability and user trust concern.

**Independent Test**: Delete each entity type after creating notifications referencing it and assert zero orphan notifications remain for that entity.

**Acceptance Scenarios**:

1. **Given** a notification referencing a callout, **When** the callout is deleted via API, **Then** the notification list for the receiver no longer includes that notification.
2. **Given** multiple notifications referencing the same contribution, **When** the contribution is deleted, **Then** all associated notifications are removed and unrelated notifications persist.
3. **Given** a notification referencing a messageID only (no FK), **When** the message is removed through room mutation, **Then** the notification is removed via explicit messageID deletion logic.
4. **Given** notifications referencing different entity types, **When** the space containing them is deleted, **Then** space-scoped notifications are removed while platform-level notifications for the user remain.

---

### User Story 2 - Validate Payload Enrichment & contributorType Resolution (Priority: P2)

Notifications must expose correct enriched payload fields (e.g., contributorType, contributionID normalization for post comments) and reflect new event types introduced (e.g., SPACE_COMMUNICATION_UPDATE, USER_SIGN_UP_WELCOME, USER_MENTIONED, SPACE_LEAD_COMMUNICATION_MESSAGE) with accurate nullability.

**Why this priority**: Ensures consumers (frontend / other services) can rely on consistent, explicit data contracts reducing guessing and conditional logic.

**Independent Test**: Trigger each new / modified notification type and assert returned payload fields match specification (presence, absence, types, normalized IDs).

**Acceptance Scenarios**:
1. **Given** a new contributor joins a space, **When** the notification is fetched, **Then** `contributorType` matches the actual entity (user, organization, virtual) and contributorID maps correctly.
2. **Given** a post comment event originally storing postID, **When** notification is fetched, **Then** `contributionID` reflects the parent contribution ID not the postID.
3. **Given** a communication update is published, **When** notifications are listed, **Then** the SPACE_COMMUNICATION_UPDATE payload contains a non-null `update` field.
4. **Given** a welcome signup event, **When** notifications are listed for new user, **Then** a USER_SIGN_UP_WELCOME event payload matches expected structure.
5. **Given** a user mention occurs in a room, **When** notifications are listed, **Then** a USER_MENTIONED event with relevant room/message identifiers exists.

---

### User Story 3 - Ensure Nullability Contract & Backfill Integrity (Priority: P3)

Fields marked nullable vs non-null in enriched payloads must correspond to actual behavior across events (e.g., optional comment section vs mandatory IDs). Backfilled foreign key columns must align with payload values for legacy notifications; no mismatches remain after migration.

**Why this priority**: Reduces runtime errors and inconsistent UI rendering; ensures migration produced a stable baseline for future tests.

**Independent Test**: For a sample of legacy + new notifications, compare DB entity references (queried via API) to payload fields; for each payload type assert mandatory fields are present and optional fields absent where not applicable.

**Acceptance Scenarios**:
1. **Given** a SPACE_COLLABORATION_CALLOUT_COMMENT notification, **When** fetched, **Then** mandatory fields (calloutID, contributionID, messageID, roomID) are present and non-empty.
2. **Given** a PLATFORM_FORUM_DISCUSSION notification without a comment, **When** fetched, **Then** `comment` sub-object is absent rather than null (or present with only expected fields) per contract.
3. **Given** a legacy notification migrated with newly added FK columns, **When** FKs are inspected via notification detail query (or listing), **Then** each FK either resolves to an existing entity or the notification has been removed if entity was missing.
4. **Given** a user mention notification, **When** fetched, **Then** optional fields not relevant (e.g., applicationID) are absent.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Deleting an entity with mixed notifications (some referencing other still-valid entities): only notifications directly tied to deleted entity are removed; others persist.
- Deleting a message whose ID appears in multiple notifications (e.g., direct + reply): all matching messageID notifications are deleted.
- Rapid consecutive deletions (callout then space): no residual notifications after sequential cascade operations.
- Attempting to fetch notifications immediately during deletion transaction: eventual consistency—test should ensure final state not intermediate.
- Migrated notification referencing a now-deleted entity should have been purged; test ensures absence rather than presence with null FK.
- contributorType resolution throws for unknown type—should never occur; test asserts only allowed enum values appear.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: Test suite MUST create notifications for each new/modified event type introduced in PR #5493 and verify payload structure fields (presence/absence) match contract.
- **FR-002**: Test suite MUST verify cascade deletion of notifications when each foreign-key-tracked entity (space, organization, user, application, invitation, callout, contribution, room) is deleted.
- **FR-003**: Test suite MUST verify manual deletion of notifications by messageID when a message is removed (since messageID is not an FK) resulting in zero notifications referencing that messageID.
- **FR-004**: Test suite MUST validate contributorType resolution for space community new member notifications across user, organization, virtual contributor cases.
- **FR-005**: Test suite MUST confirm contributionID normalization for post comment notifications (postID replaced by parent contributionID) by comparing expected ID mapping.
- **FR-006**: Test suite MUST ensure nullability contracts: mandatory fields always present; optional fields omitted when not applicable across sampled notifications.
- **FR-007**: Test suite MUST verify no orphan notifications remain after entity deletions: listing notifications for affected receiver returns none referencing deleted entity IDs.
- **FR-008**: Test suite MUST sample legacy migrated notifications (if accessible via seed or fixture) to assert FK columns align with payload or notification absent if referenced entity missing.
- **FR-009**: Test suite MUST differentiate deletion scopes: deleting a space should not remove platform-level global role or signup notifications for the user.
- **FR-010**: Test suite MUST record baseline counts before deletion and assert delta equals number of notifications referencing deleted entity + messageID subset.

No further clarifications required; defaults chosen based on migration intent and PR description (no [NEEDS CLARIFICATION] markers necessary).

### Key Entities *(include if feature involves data)*

- **Notification**: Represents a user-targeted in-app event; key attributes: id, type (event), payload fields (vary by type), foreign key columns (spaceID, organizationID, userID, applicationID, invitationID, calloutID, contributionID, roomID, messageID (non-FK)), receiverID, timestamps.
- **Space**: Collaboration container; deletion cascades to notifications referencing spaceID.
- **Callout**: Collaboration callout; deletion cascades to notifications referencing calloutID.
- **Contribution**: A unit linked to callout (post contribution comment normalization); deletion cascades to notifications referencing contributionID.
- **Room/Message**: Communication channel/message; room deletion cascades; message deletion triggers manual removal via messageID.
- **Contributor (User/Organization/Virtual)**: Entity joining community; contributorType captured and stored; deletion cascades through contributor-specific FK columns.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of tested entity deletions result in removal of all associated notifications within a single test execution (no orphan notifications remain).
- **SC-002**: 100% of new event types produce payloads containing all mandatory fields and no unexpected nulls; optional fields absent where not applicable across at least one example each.
- **SC-003**: contributorType accuracy rate is 100% across user, organization, virtual contributor creation scenarios.
- **SC-004**: Post comment notification tests show 100% normalization: contributionID always equals parent contribution (never raw postID) for post comment events.
- **SC-005**: Message deletion tests remove 100% of notifications referencing deleted messageID.
- **SC-006**: Legacy migrated notifications sampled show 0 mismatched FK vs payload references or are absent if entity removed.

## Assumptions

- Legacy notifications are accessible in test environment either via seeded data or fixtures; if not, scope limited to newly generated notifications (SC-006 considered best-effort).
- Deletion operations are synchronous for notification cascade visibility by the time list API returns.
- Frontend consumer expects absence of fields rather than null for optional payload properties (mirrors PR description of nullable behavior adjustments).
- Message deletion logic is triggered by room mutation `removeMessageOnRoom` which internally calls notification deletion by messageID—test relies on this.

## Out of Scope

- Performance benchmarking of deletion operations.
- UI rendering tests—focus is API contract only.
- Cross-service notification delivery (email, push) not mentioned in PR.

## Risks

- Lack of seeded legacy data may reduce coverage for migration verification.
- Concurrent deletions could mask race conditions not covered in linear tests.

## Dependencies

- PR #5493 code changes merged into environment under test.
- GraphQL mutations/queries for creating entities (space, callout, contribution, room, message) and deleting them available.

## No Clarifications Needed

All critical scope decisions inferred from PR description: cascade deletion list, payload enrichment fields, new events; no ambiguous choices significantly impacting user value.
