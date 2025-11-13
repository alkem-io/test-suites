# Domain & Business Logic Coverage Mapping

Generated: 2025-11-13
Source Schema/Logic: https://github.com/alkem-io/server (resolver/service snippets via search)
Test Suite: `server-api/src/functional-api/*`

## Objective

Provide a structured comparison between server domain/business logic (GraphQL mutation resolvers as entry points to services) and existing integration tests. For each domain:

- Logical Components: Entities, Core Services, Resolver Classes.
- Mutation/Action Categories: Create, Read, Update, Delete, Configuration, Authorization, Workflow, Transfer/Migration.
- Coverage Depth Levels:
  - FULL: CRUD + notable negative paths (auth/validation) exercised.
  - PARTIAL: Some happy-path operations (often Create/Delete/Read) tested; Update/edge/error paths missing.
  - MINIMAL: Single or very few operations touched; major mutation classes untouched.
  - NONE: No observed functional test coverage.
- Risk: HIGH (security/credential/authorization), MEDIUM (state integrity / data consistency), LOW (metadata/configuration).

Automation Alignment: Machine-readable JSON at end for tooling to enforce coverage gates.

## Summary Matrix (High-Level)

| Domain                                       | Resolver Classes (examples)                                                                                                   | Coverage                              | Primary Tested Ops                                                                           | Not Covered (Representative)                                                                                     | Risk Notes                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Platform Roles / Authorization               | PlatformRoleResolverMutations, AdminAuthorizationResolverMutations                                                            | PARTIAL                               | assignPlatformRoleToUser, removePlatformRoleFromUser, authorizationPolicyResetOnPlatform     | grantCredentialToOrganization, revokeCredentialFromOrganization, revokeCredentialFromUser, grantCredentialToUser | HIGH (credential issuance) |
| Agent / Credentials                          | AgentResolverMutations                                                                                                        | NONE                                  | (none)                                                                                       | beginVerifiedCredentialRequestInteraction, beginAlkemioUserVerifiedCredentialOfferInteraction                    | HIGH                       |
| Licensing Framework                          | LicensingFrameworkResolverMutations, LicensePlanResolverMutations                                                             | PARTIAL                               | Assign/Revoke on Space/Account, GetPlatformLicensePlans                                      | createLicensePlanOnLicensingFramework, updateLicensePlan..., deleteLicensePlan...                                | MEDIUM                     |
| Account                                      | AccountResolverMutations                                                                                                      | PARTIAL                               | GetAccountMainEntities, TransferInnovationPackToAccount                                      | Account-level settings updates, license plan removal variants                                                    | MEDIUM                     |
| Space / Subspace                             | SpaceResolverMutations, ConversionResolverMutations                                                                           | PARTIAL                               | CreateSpaceBasicData, GetSpaceData, CreateSubspace, deleteSpace, conversion ops (L1<->L0/L2) | convertSpaceL1ToSpaceL2 (if missing), space hierarchy edge cases (failure/auth)                                  | MEDIUM                     |
| Callouts Set / Callout                       | CalloutsSetResolverMutations, CalloutResolverMutations                                                                        | PARTIAL                               | CreateCalloutOnCalloutsSet, UpdateCallout, deleteCallout                                     | visibility transitions, bulk operations, state machine edges                                                     | MEDIUM                     |
| Callout Contribution                         | CalloutContributionMoveResolverMutations                                                                                      | MINIMAL                               | CreateContributionOnCallout, UpdatePost, DeletePost                                          | moveCalloutContribution, multi-type ordering, error states                                                       | LOW-MED                    |
| Callout Transfer                             | CalloutTransferResolverMutations                                                                                              | NONE                                  | (none)                                                                                       | transferCallout operations                                                                                       | MEDIUM                     |
| Post                                         | PostResolverMutations                                                                                                         | PARTIAL                               | UpdatePost, DeletePost, GetPostData                                                          | createPost via direct mutation (only through callout?), post settings updates                                    | MEDIUM                     |
| Link                                         | LinkResolverMutations                                                                                                         | NONE (indirect via contribution only) | (none direct)                                                                                | updateLink, deleteLink                                                                                           | MEDIUM                     |
| Whiteboard                                   | WhiteboardResolverMutations                                                                                                   | MINIMAL                               | DeleteWhiteboard (indirect)                                                                  | updateWhiteboard, createWhiteboard direct, collaboration concurrency cases                                       | MEDIUM                     |
| Memo                                         | MemoResolverMutations                                                                                                         | NONE                                  | (none)                                                                                       | createMemo, updateMemo, deleteMemo                                                                               | MEDIUM                     |
| Profile                                      | ProfileResolverMutations                                                                                                      | MINIMAL                               | GetSpaceAboutDetails (indirect profile usage)                                                | updateProfile, profile tagset/reference integration                                                              | MEDIUM                     |
| Reference                                    | ReferenceResolverMutations                                                                                                    | PARTIAL                               | CreateReferenceOnProfile, DeleteReference                                                    | updateReference                                                                                                  | LOW                        |
| Visual                                       | VisualResolverMutations                                                                                                       | NONE                                  | (none)                                                                                       | updateVisual, deleteVisual                                                                                       | LOW                        |
| Tagset                                       | TagsetResolverMutations                                                                                                       | NONE                                  | (none)                                                                                       | updateTagset                                                                                                     | LOW                        |
| Community / Organization                     | CommunityResolverMutations, OrganizationResolverMutations                                                                     | PARTIAL                               | Organization create/update/delete & queries (some)                                           | community membership credential issuance, organization settings granular updates                                 | MEDIUM                     |
| User                                         | UserResolverMutations                                                                                                         | PARTIAL                               | CreateUser, updateUser, deleteUser, getUserData, GetUserByNameId, UpdateUserSettings         | advanced preference mutations, negative auth paths                                                               | MEDIUM                     |
| Virtual Contributor                          | VirtualContributorResolverMutations                                                                                           | PARTIAL                               | Create/Update/Delete VC, knowledge base queries, removing roles                              | Embeddings migration, persona credential flows, advanced settings edge cases                                     | MEDIUM                     |
| AI Persona / AI Server                       | AiPersonaResolverMutations, AiServerResolverMutations                                                                         | NONE                                  | (none)                                                                                       | updateAiPersona, deleteAiPersona, migrateEmbeddings                                                              | MEDIUM                     |
| Communication / Room / Discussion            | CommunicationResolverMutations, RoomResolverMutations, DiscussionResolverMutations                                            | PARTIAL                               | messaging send/update/delete, reactions, discussions CRUD                                    | room membership mgmt, room settings updates, mentions edge cases                                                 | MEDIUM                     |
| In-App Notification                          | InAppNotificationResolverMutations                                                                                            | NONE                                  | (none)                                                                                       | notification state mutations (ack/read)                                                                          | LOW                        |
| Entitlements                                 | (Query-focused)                                                                                                               | PARTIAL                               | MyEntitlementsQuery, OrganizationEntitlementsQuery                                           | edge entitlement revocation flows                                                                                | MEDIUM                     |
| Search                                       | (Search Resolver)                                                                                                             | PARTIAL                               | AdminSearchIngestFromScratch, search                                                         | search indexing error paths, incremental ingest variants                                                         | LOW                        |
| Templates / Template Applier / Templates Set | TemplateResolverMutations, TemplateApplierResolverMutations, TemplatesSetResolverMutations, TemplatesManagerResolverMutations | PARTIAL                               | Get/Update/Create/Delete Template, CreateTemplateFromSpace, counts                           | applying templates to flows/spaces edge cases, bulk template operations                                          | LOW-MED                    |
| Calendar Event / Timeline                    | CalendarEventResolverMutations                                                                                                | NONE                                  | (none)                                                                                       | create/update/delete calendar events                                                                             | LOW                        |
| Storage / Document / Bucket                  | DocumentResolverMutations, StorageBucketResolverMutations                                                                     | MINIMAL                               | DeleteDocument                                                                               | updateDocument, bucket configuration operations                                                                  | MEDIUM                     |
| Platform Settings                            | PlatformResolverMutations                                                                                                     | MINIMAL                               | UpdateSpacePlatformSettings (indirect)                                                       | addIframeAllowedURL, removeIframeAllowedURL, platform-level setting validations                                  | LOW                        |
| Registration                                 | RegistrationResolverMutations                                                                                                 | MINIMAL                               | deleteOrganization (path)                                                                    | broader registration flows (create patterns)                                                                     | MEDIUM                     |
| Chat Guidance                                | ChatGuidanceResolverMutations                                                                                                 | NONE                                  | (none)                                                                                       | create/update guidance sessions, policy enforcement                                                              | LOW-MED                    |
| Notification Adapters (indirect)             | (via other resolvers)                                                                                                         | N/A                                   | side-effects only                                                                            | direct mutation coverage not applicable                                                                          | LOW                        |

## Detailed Domain Coverage

Below each domain section lists: operations tested (grouped by category) vs missing operations.

### Platform Roles & Authorization

- Tested: assignPlatformRoleToUser, removePlatformRoleFromUser, authorizationPolicyResetOnPlatform.
- Missing: grantCredentialToOrganization, revokeCredentialFromOrganization, grantCredentialToUser, revokeCredentialFromUser.
- Coverage Depth: PARTIAL (role assignment only, credential lifecycle absent).
- Risks: Unrevoked credentials → privilege escalation; missing negative tests.

### Agent / Credential Interaction

- Tested: None.
- Missing: beginVerifiedCredentialRequestInteraction, beginAlkemioUserVerifiedCredentialOfferInteraction.
- Coverage Depth: NONE.
- Risks: HIGH – issuance flow unvalidated.

### Licensing Framework & License Plans

- Tested: AssignLicensePlanToSpace, RevokeLicensePlanFromSpace, AssignLicensePlanToAccount, RevokeLicensePlanFromAccount, GetPlatformLicensePlans, GetSpaceLicenseSubscriptions.
- Missing: createLicensePlanOnLicensingFramework, update/delete license plan, credential-based constraints validations.
- Coverage: PARTIAL (application only; framework lifecycle absent).

### Account

- Tested: GetAccountMainEntities, TransferInnovationPackToAccount.
- Missing: account settings updates, license plan listing edge cases.
- Coverage: PARTIAL.

### Space / Subspace / Conversion

- Tested: CreateSpaceBasicData, GetSpaceData, GetSpacesData, CreateSubspace, deleteSpace, UpdateSpaceSettings, updateSpace, updateSubspace, GetSpacesFilteredByVisibilityWithAccess, conversion L1→L0/L2? (partial).
- Missing: all conversion direction permutations & failure conditions (e.g. invalid hierarchy), auth negative paths, mass role removal validation.
- Coverage: PARTIAL.

### Callouts & Callouts Set

- Tested: CreateCalloutOnCalloutsSet, UpdateCallout, UpdateCalloutVisibility, deleteCallout, CalloutDetails, GetCalloutsOnCalloutsSetUsingClassification.
- Missing: state transitions (draft → published → archived), bulk create, classification updates negative paths.
- Coverage: PARTIAL.

### Callout Contribution / Post / Link / Whiteboard / Memo

- Posts tested via UpdatePost, DeletePost; link/whiteboard/memo independent mutations missing.
- Missing: moveCalloutContribution, updateWhiteboard, memo CRUD, link update/delete.
- Coverage: MIXED (Posts partial, others minimal/none).

### Profile / Reference / Visual / Tagset

- Tested: CreateReferenceOnProfile, DeleteReference.
- Missing: updateReference, updateProfile, updateVisual/deleteVisual, updateTagset.
- Coverage: MINIMAL (only reference create/delete).

### Community / Organization / User / Virtual Contributor

- Tested: user CRUD, organization basic operations (implied), virtual contributor lifecycle & knowledge queries.
- Missing: membership edge cases, credential issuance, persona updates, embeddings migration.
- Coverage: PARTIAL.

### AI Persona / AI Server

- Tested: None.
- Missing: updateAiPersona, deleteAiPersona, migrateEmbeddings.
- Coverage: NONE.

### Communication / Room / Discussion / Reactions / Replies

- Tested: message send/remove, discussions CRUD, reactions add/remove, replies.
- Missing: room membership management, room settings updates, mention resolution, subscription event negative paths.
- Coverage: PARTIAL.

### In-App Notification

- Tested: None.
- Missing: mark-as-read, bulk acknowledgement.
- Coverage: NONE.

### Entitlements

- Tested: MyEntitlementsQuery, OrganizationEntitlementsQuery.
- Missing: entitlements revocation, assignment mutations (if exposed), quota edge cases.
- Coverage: PARTIAL (queries only).

### Search

- Tested: AdminSearchIngestFromScratch, search variants.
- Missing: incremental ingest, error recovery, authorization filtering tests.
- Coverage: PARTIAL.

### Templates System (Template / Applier / Manager / Set)

- Tested: create/delete/update template, counts, create from space, update space template, whiteboard template operations.
- Missing: apply template to flow/state transitions, default template management negative cases.
- Coverage: PARTIAL.

### Calendar Events / Timeline

- Tested: None.
- Missing: create/update/delete calendar events.
- Coverage: NONE.

### Storage / Document / Bucket

- Tested: DeleteDocument only; reference URI fetches.
- Missing: updateDocument, bucket mutations (add/remove items, policy changes).
- Coverage: MINIMAL.

### Platform Settings

- Tested: UpdateSpacePlatformSettings (indirect usage).
- Missing: addIframeAllowedURL, removeIframeAllowedURL, broader platform settings mutation set.
- Coverage: MINIMAL.

### Registration

- Tested: deleteOrganization (via registration flow snippet).
- Missing: initial registration create flows, multi-step validation.
- Coverage: MINIMAL.

### Chat Guidance

- Tested: None.
- Missing: guidance session lifecycle operations.
- Coverage: NONE.

## Patterns of Missing Depth

1. Update & Delete operations often missing when Create covered (Link, Visual, Memo, CalendarEvent).
2. Credential/authorization credential flows entirely absent (Agent, AdminAuthorization extended credentials).
3. Negative/edge path testing sparse (authorization failures, validation errors, quota boundaries).
4. Cross-entity transfer/move operations (callout transfer, contribution move) missing → ordering/state integrity risk.
5. Advanced configuration (platform iframe URLs, tagset updates, visual updates) untested → potential silent regressions.

## Recommended Coverage Expansion Strategy

Order by risk & architectural impact:

1. Authorization & Credential Flows (HIGH): add tests ensuring issuance/revocation requires proper privilege; assert failure for unauthorized users; validate side-effects (role/credential presence).
2. Agent Credential Interactions: simulate request/offer flows; verify resulting credential payload shape.
3. Update Paths for existing partially covered domains (Document, Link, Whiteboard, Profile, Reference).
4. Lifecycle Integrity: add tests for move/transfer operations (callout contribution ordering; callout transfer between sets/spaces) verifying invariants.
5. AI Persona & Embeddings Migration: ensure migrations require correct privilege and produce expected success boolean.
6. Community Guidelines & Tagset / Visual: update + removal test; regression guard for taxonomy affecting search.
7. Calendar Events & Memo: CRUD testing with concurrency (memo multi-user flag).
8. Platform Settings: iframe whitelist add/remove with validation of domain format.
9. Room membership & settings updates: ensure restricted to authorized roles; test mention service integration minimal path.
10. Licensing Framework lifecycle (create/update license plan), including authorization & validation failure scenarios.

## Test Depth Targets per Domain

| Domain                    | Target New Tests                          | Depth Goals                                                    |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Authorization Credentials | 4 (grant/revoke org/user success/failure) | Success + AuthZ fail + invalid input                           |
| Agent                     | 4                                         | Credential request/offer success + invalid type + unauthorized |
| Licensing Framework       | 3                                         | Create/update/delete + duplicate prevention                    |
| Link                      | 3                                         | Create (direct), Update, Delete (with auth & invalid URL)      |
| Document                  | 2                                         | Update (field changes), Delete negative path                   |
| Whiteboard                | 3                                         | Create + Update + Delete (already partial)                     |
| Memo                      | 3                                         | Create + Update content + Delete                               |
| Profile                   | 2                                         | Update direct + auth failure                                   |
| Visual                    | 2                                         | Update + Delete                                                |
| Tagset                    | 2                                         | Update + invalid values rejection                              |
| Community Guidelines      | 2                                         | Update + remove content edge case                              |
| Callout Contribution Move | 2                                         | Move ordering preservation + invalid target                    |
| Callout Transfer          | 2                                         | Transfer success + cross-space failure                         |
| AI Persona                | 3                                         | Update + Delete + unauthorized attempt                         |
| Platform Settings         | 2                                         | Add/remove iframe URL + invalid URL format                     |
| Room Membership           | 3                                         | Add member + remove member + unauthorized add                  |
| Calendar Event            | 3                                         | Create + Update + Delete                                       |
| Chat Guidance             | 2                                         | Create guidance session + unauthorized access                  |

## Machine-Readable Coverage JSON

```json
{
  "generatedAt": "2025-11-13",
  "domains": [
    {
      "name": "platform-authorization",
      "coverage": "PARTIAL",
      "tested": [
        "assignPlatformRoleToUser",
        "removePlatformRoleFromUser",
        "authorizationPolicyResetOnPlatform"
      ],
      "missing": [
        "grantCredentialToOrganization",
        "revokeCredentialFromOrganization",
        "grantCredentialToUser",
        "revokeCredentialFromUser"
      ],
      "risk": "HIGH"
    },
    {
      "name": "agent",
      "coverage": "NONE",
      "tested": [],
      "missing": [
        "beginVerifiedCredentialRequestInteraction",
        "beginAlkemioUserVerifiedCredentialOfferInteraction"
      ],
      "risk": "HIGH"
    },
    {
      "name": "licensing-framework",
      "coverage": "PARTIAL",
      "tested": [
        "AssignLicensePlanToSpace",
        "RevokeLicensePlanFromSpace",
        "AssignLicensePlanToAccount",
        "RevokeLicensePlanFromAccount",
        "GetPlatformLicensePlans",
        "GetSpaceLicenseSubscriptions"
      ],
      "missing": [
        "createLicensePlanOnLicensingFramework",
        "updateLicensePlanOnLicensingFramework",
        "deleteLicensePlan"
      ],
      "risk": "MEDIUM"
    },
    {
      "name": "account",
      "coverage": "PARTIAL",
      "tested": ["GetAccountMainEntities", "TransferInnovationPackToAccount"],
      "missing": ["updateAccountSettings", "revokeInnovationPackFromAccount"],
      "risk": "MEDIUM"
    },
    {
      "name": "space",
      "coverage": "PARTIAL",
      "tested": [
        "CreateSpaceBasicData",
        "GetSpaceData",
        "GetSpacesData",
        "CreateSubspace",
        "deleteSpace",
        "UpdateSpaceSettings",
        "updateSpace",
        "updateSubspace",
        "GetSpacesFilteredByVisibilityWithAccess"
      ],
      "missing": ["convertSpaceL1ToSpaceL2", "conversionFailureCases"],
      "risk": "MEDIUM"
    },
    {
      "name": "callout",
      "coverage": "PARTIAL",
      "tested": [
        "CreateCalloutOnCalloutsSet",
        "UpdateCallout",
        "UpdateCalloutVisibility",
        "deleteCallout",
        "CalloutDetails",
        "GetCalloutsOnCalloutsSetUsingClassification"
      ],
      "missing": ["archiveCallout", "publishCallout", "bulkUpdateCallouts"],
      "risk": "MEDIUM"
    },
    {
      "name": "callout-contribution",
      "coverage": "MINIMAL",
      "tested": ["CreateContributionOnCallout", "UpdatePost", "DeletePost"],
      "missing": [
        "moveCalloutContribution",
        "reorderContributions",
        "createLinkContributionDirect"
      ],
      "risk": "LOW"
    },
    {
      "name": "callout-transfer",
      "coverage": "NONE",
      "tested": [],
      "missing": ["transferCallout"],
      "risk": "MEDIUM"
    },
    {
      "name": "post",
      "coverage": "PARTIAL",
      "tested": ["UpdatePost", "DeletePost", "GetPostData"],
      "missing": ["createPostDirect", "updatePostVisibility"],
      "risk": "MEDIUM"
    },
    {
      "name": "link",
      "coverage": "NONE",
      "tested": [],
      "missing": ["updateLink", "deleteLink", "createLinkDirect"],
      "risk": "MEDIUM"
    },
    {
      "name": "whiteboard",
      "coverage": "MINIMAL",
      "tested": ["DeleteWhiteboard"],
      "missing": ["createWhiteboardDirect", "updateWhiteboard"],
      "risk": "MEDIUM"
    },
    {
      "name": "memo",
      "coverage": "NONE",
      "tested": [],
      "missing": ["createMemo", "updateMemo", "deleteMemo"],
      "risk": "MEDIUM"
    },
    {
      "name": "profile",
      "coverage": "MINIMAL",
      "tested": ["GetSpaceAboutDetails"],
      "missing": ["updateProfile", "updateProfileTags"],
      "risk": "MEDIUM"
    },
    {
      "name": "reference",
      "coverage": "PARTIAL",
      "tested": ["CreateReferenceOnProfile", "DeleteReference"],
      "missing": ["updateReference"],
      "risk": "LOW"
    },
    {
      "name": "visual",
      "coverage": "NONE",
      "tested": [],
      "missing": ["updateVisual", "deleteVisual"],
      "risk": "LOW"
    },
    {
      "name": "tagset",
      "coverage": "NONE",
      "tested": [],
      "missing": ["updateTagset"],
      "risk": "LOW"
    },
    {
      "name": "community-organization",
      "coverage": "PARTIAL",
      "tested": ["deleteOrganization"],
      "missing": [
        "updateOrganizationSettings",
        "organizationVerificationFlows"
      ],
      "risk": "MEDIUM"
    },
    {
      "name": "user",
      "coverage": "PARTIAL",
      "tested": [
        "CreateUser",
        "updateUser",
        "deleteUser",
        "getUserData",
        "getUsersData",
        "GetUserByNameId",
        "UpdateUserSettings"
      ],
      "missing": ["updateUserPreferences", "userAuthFailureCases"],
      "risk": "MEDIUM"
    },
    {
      "name": "virtual-contributor",
      "coverage": "PARTIAL",
      "tested": [
        "CreateVirtualContributorOnAccount",
        "UpdateVirtualContributor",
        "UpdateVirtualContributorSettings",
        "DeleteVirtualContributorOnAccount",
        "RemoveRoleFromVirtualContributor",
        "VirtualContributor",
        "VirtualContributorKnowledgeBase",
        "VirtualContributorKnowledgePrivileges",
        "VirtualContributorStorageConfig",
        "VirtualContributorKnowledgeStorageConfig"
      ],
      "missing": ["migrateEmbeddings", "personaModelUpdates"],
      "risk": "MEDIUM"
    },
    {
      "name": "ai-persona",
      "coverage": "NONE",
      "tested": [],
      "missing": ["updateAiPersona", "deleteAiPersona"],
      "risk": "MEDIUM"
    },
    {
      "name": "communication-discussion-reactions",
      "coverage": "PARTIAL",
      "tested": [
        "SendMessageToRoom",
        "sendMessageToUsers",
        "SendMessageToOrganization",
        "SendMessageToCommunityLeads",
        "RemoveMessageOnRoom",
        "DeleteDiscussion",
        "CreateDiscussion",
        "UpdateDiscussion",
        "SendMessageReplyToRoom",
        "AddReactionToMessageInRoom",
        "RemoveReactionToMessageInRoom"
      ],
      "missing": [
        "updateRoomSettings",
        "addRoomMember",
        "removeRoomMember",
        "roomMentionsEdgeCases"
      ],
      "risk": "MEDIUM"
    },
    {
      "name": "in-app-notification",
      "coverage": "NONE",
      "tested": [],
      "missing": ["markNotificationRead", "bulkAcknowledge"],
      "risk": "LOW"
    },
    {
      "name": "entitlements",
      "coverage": "PARTIAL",
      "tested": ["MyEntitlementsQuery", "OrganizationEntitlementsQuery"],
      "missing": ["revokeEntitlement", "assignEntitlement"],
      "risk": "MEDIUM"
    },
    {
      "name": "search",
      "coverage": "PARTIAL",
      "tested": ["AdminSearchIngestFromScratch", "search"],
      "missing": ["incrementalIngest", "searchAuthFiltering"],
      "risk": "LOW"
    },
    {
      "name": "templates",
      "coverage": "PARTIAL",
      "tested": [
        "GetTemplateById",
        "UpdateTemplate",
        "deleteTemplate",
        "CreateTemplate",
        "UpdatePostTemplate",
        "GetSpaceTemplatesCountByTemplateSetId",
        "CreateTemplateFromSpace",
        "UpdateSpaceTemplate",
        "GetWhiteboardTemplatesCountByTemplateSetId",
        "CreateWhiteboardTemplate",
        "UpdateWhiteboardTemplate"
      ],
      "missing": ["applyTemplate", "bulkTemplateOperations"],
      "risk": "LOW"
    },
    {
      "name": "calendar-event",
      "coverage": "NONE",
      "tested": [],
      "missing": [
        "createCalendarEvent",
        "updateCalendarEvent",
        "deleteCalendarEvent"
      ],
      "risk": "LOW"
    },
    {
      "name": "document",
      "coverage": "MINIMAL",
      "tested": ["DeleteDocument"],
      "missing": ["updateDocument"],
      "risk": "MEDIUM"
    },
    {
      "name": "storage-bucket",
      "coverage": "NONE",
      "tested": [],
      "missing": ["createBucket", "updateBucket", "deleteBucket"],
      "risk": "LOW"
    },
    {
      "name": "platform-settings",
      "coverage": "MINIMAL",
      "tested": ["UpdateSpacePlatformSettings"],
      "missing": ["addIframeAllowedURL", "removeIframeAllowedURL"],
      "risk": "LOW"
    },
    {
      "name": "registration",
      "coverage": "MINIMAL",
      "tested": ["deleteOrganization"],
      "missing": ["registerOrganization", "multiStepRegistrationValidation"],
      "risk": "MEDIUM"
    },
    {
      "name": "chat-guidance",
      "coverage": "NONE",
      "tested": [],
      "missing": ["createGuidanceSession", "updateGuidanceSession"],
      "risk": "LOW"
    }
  ],
  "priorities": {
    "P0": [
      "grantCredentialToOrganization",
      "revokeCredentialFromOrganization",
      "beginVerifiedCredentialRequestInteraction",
      "beginAlkemioUserVerifiedCredentialOfferInteraction"
    ],
    "P1": [
      "createLicensePlanOnLicensingFramework",
      "updateLicensePlanOnLicensingFramework",
      "updateProfile",
      "updateCommunityGuidelines",
      "removeCommunityGuidelinesContent"
    ],
    "P2": [
      "updateDocument",
      "updateLink",
      "deleteLink",
      "createMemo",
      "updateMemo",
      "deleteMemo",
      "updateWhiteboard",
      "transferCallout",
      "updateAiPersona",
      "deleteAiPersona",
      "moveCalloutContribution",
      "updateRoomSettings",
      "addRoomMember"
    ],
    "P3": [
      "updateTagset",
      "updateVisual",
      "deleteVisual",
      "updateReference",
      "updateInnovationHub",
      "updateInnovationPack",
      "addIframeAllowedURL",
      "removeIframeAllowedURL",
      "createCalendarEvent",
      "updateCalendarEvent",
      "deleteCalendarEvent",
      "createGuidanceSession",
      "updateGuidanceSession"
    ]
  }
}
```

## Next Steps for Automation

1. Build introspection to confirm each missing mutation exists before generating stubs.
2. Generate skeleton test files with standardized sections: Setup, Positive, Negative Auth, Validation, Side-Effects.
3. Add coverage badge logic: domain coverage classification computed on CI; fail on downgrade (e.g., PARTIAL → MINIMAL).
4. Enforce P0 domain coverage before release; warn (non-block) for P2/P3 deficits.

## Caveats

- Server search was resolver-class oriented; some domain logic may exist in services without explicit mutations (internal processes). These considered out-of-scope for mutation coverage.
- Some operations might be accessible only via composite mutations or template applier flows; mapping should be refined after schema introspection.
- Query coverage (read paths) only partly analyzed; focus remained on business logic mutations.

---

End of report.
