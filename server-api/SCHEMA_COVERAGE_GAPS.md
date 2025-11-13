# GraphQL Schema Coverage Gaps

Generated: 2025-11-13
Source Repos:
- Server schema: https://github.com/alkem-io/server (resolver mutation snippets fetched via public search)
- Test suite: this repository `server-api/src/functional-api/*`

## Purpose
This document inventories GraphQL operations exercised by the existing `server-api` functional/integration tests and highlights schema mutation areas (and related resolver domains) that appear untested. It is structured to support automation: a machine-readable JSON summary (see bottom) plus recommended stub test identifiers.

## Methodology (Automatable Steps)
1. Collect tested operations by parsing `graphqlClient.<OperationName>` and raw inline `mutation` strings.
2. Normalize operation names (PascalCase or camelCase) as they appear in generated client.
3. Collect server-side mutation resolver class names and inferred mutation method names from `@Mutation` decorators.
4. Diff: `SchemaMutationNames - TestedOperationNames`.
5. Classify gaps by domain, CRUD category, and risk (High: security/auth/credential; Med: data integrity; Low: cosmetic).

## Tested Operations (Observed)
Domain buckets with operation names found in tests:
- Account: GetAccountMainEntities, TransferInnovationPackToAccount
- ActivityLog: GetActivityLogOnCollaboration
- Authorization / Platform: assignPlatformRoleToUser, removePlatformRoleFromUser, authorizationPolicyResetOnPlatform
- Callout / Contributions: CreateCalloutOnCalloutsSet, UpdateCallout, UpdateCalloutVisibility, deleteCallout, CalloutDetails, GetCalloutsOnCalloutsSetUsingClassification, CreateContributionOnCallout, UpdatePost, DeletePost, SpaceCallout, GetCalloutPosts, GetPostData, CalloutStorageConfig*, CalloutPostStorageConfig, CalloutLinkContributionStorageConfig, CalloutWhiateboardStorageConfig, WhiteboardCalloutStorageConfig, CreateCalloutOnCalloutsSet (multiple types), MoveCalloutContribution? (not observed), DeleteWhiteboard (via callout whiteboard params)
- Collection/Links: (link contribution create only via CreateContributionOnCallout; direct Link update/delete not observed)
- Communication / Messaging: SendMessageToRoom, sendMessageToUsers, SendMessageToOrganization, SendMessageToCommunityLeads, RemoveMessageOnRoom, DeleteDiscussion, CreateDiscussion, UpdateDiscussion, SendMessageReplyToRoom, AddReactionToMessageInRoom, RemoveReactionToMessageInRoom
- Context / Space About: GetSpaceAboutDetails
- Conversion: ConvertSpaceL1ToSpaceL0, ConvertSpaceL2ToSpaceL1 (tests show ConvertSpaceL1ToSpaceL2? only conversions present)
- Documents / Storage: DeleteDocument (updateDocument not observed), GetUserReferenceUri, GetOrgReferenceUri, GetOrgVisualUri, GetOrgVisualUriInnovationHub, GetProfileDocuments
- Entitlements: MyEntitlementsQuery, OrganizationEntitlementsQuery
- Innovation Hub: CreateInnovationHub, DeleteInnovationHub
- Innovation Pack: createInnovationPack, deleteInnovationPack
- Invitations / Role Applications: InviteForEntryRoleOnRoleSet, deleteInvitation, DeletePlatformInvitation, applyForEntryRole, deleteUserApplication
- License Plans: GetPlatformLicensePlans, GetSpaceLicenseSubscriptions, AssignLicensePlanToSpace, RevokeLicensePlanFromSpace, AssignLicensePlanToAccount, RevokeLicensePlanFromAccount
- Lookup: lookupProfileVisuals
- Memo (None observed directly)
- Pagination: UsersPaginated, OrganizationsPaginated
- Platform Settings: UpdateSpacePlatformSettings (used for platform?), (add/remove iframe URL not observed)
- Profile References: CreateReferenceOnProfile, DeleteReference (UpdateReference missing)
- Roles / RoleSet: GetRolesOrganization, assignRoleToUser, AssignRoleToUserExtendedData, removeRoleFromUser, RemoveRoleFromUserExtendedData, AssignRoleToOrganization, RemoveRoleFromOrganization, joinRoleSet, RoleSetUserPrivileges, RoleSetAvailableMembers, RoleSetMembersList, RoleSetUserPrivileges (space-based)
- Search: AdminSearchIngestFromScratch, search (multiple forms)
- Spaces / Subspaces: CreateSpaceBasicData, GetSpaceData, GetSpacesData, GetSubspacePage, GetSubspacesData, CreateSubspace, deleteSpace, UpdateSpaceSettings, updateSpace, updateSubspace, GetSpacesFilteredByVisibilityWithAccess, GetUserRoles, RoleSetUserPrivileges
- Templates: GetTemplateById, UpdateTemplate, deleteTemplate, CreateTemplate, UpdatePostTemplate, GetSpaceTemplatesCountByTemplateSetId, CreateTemplateFromSpace, UpdateSpaceTemplate, GetWhiteboardTemplatesCountByTemplateSetId, CreateWhiteboardTemplate, UpdateWhiteboardTemplate
- Users: CreateUser, updateUser, deleteUser, getUsersData, getUserData, GetUserByNameId, PendingMembershipsSpace, UpdateUserSettings
- Virtual Contributor: CreateVirtualContributorOnAccount, UpdateVirtualContributor, UpdateVirtualContributorSettings, DeleteVirtualContributorOnAccount, RemoveRoleFromVirtualContributor, VirtualContributor, VirtualContributorKnowledgeBase, VirtualContributorKnowledgePrivileges, VirtualContributorStorageConfig, VirtualContributorKnowledgeStorageConfig, GetAiPersonaModelCard, GetVirtualContributorWithModelCard (model card engine creation also), UpdateWhiteboardTemplate (as template, not contributor)

## Inferred Schema Mutation Areas Likely NOT Covered
(From server resolver classes & enums; operations absent from tested list.)
- Authorization Credentials: grantCredentialToOrganization, revokeCredentialFromOrganization, grantCredentialToUser?, revokeCredentialFromUser (credential-level, not simple role assignment). Risk: High
- Agent Credential Interactions: beginVerifiedCredentialRequestInteraction, beginAlkemioUserVerifiedCredentialOfferInteraction. Risk: High
- Licensing Framework (beyond direct space/account assign/revoke): createLicensePlanOnLicensingFramework, update/remove license plan mutations. Risk: Medium
- Community Guidelines: updateCommunityGuidelines, removeCommunityGuidelinesContent. Risk: Medium
- Profile: updateProfile (direct profile mutation rather than space/account wrappers). Risk: Medium
- Tagset: updateTagset. Risk: Low-Med (taxonomy impacts search relevance)
- Visual: updateVisual / deleteVisual (not observed). Risk: Low
- Reference: updateReference (creation & delete tested). Risk: Low
- Link: updateLink, deleteLink (only indirect via contribution). Risk: Medium (data integrity of link entity)
- Document: updateDocument (delete tested). Risk: Medium
- Memo: create/update/delete memo contributions & memo content resolvers. Risk: Medium (collaboration data)
- Whiteboard: updateWhiteboard, move operations (only template and delete via callout context observed). Risk: Medium
- CalloutContribution Move: moveCalloutContribution (resolver exists). Risk: Low-Med (ordering logic)
- Callout Transfer: operations in callout.transfer.resolver.mutations (transfer contribution/callout between sets/spaces). Risk: Medium
- Innovation Hub: updateInnovationHub (create/delete tested). Risk: Low
- Innovation Pack: updateInnovationPack (create/delete tested). Risk: Low
- AiPersona: deleteAiPersona, updateAiPersona. Risk: Medium (AI config correctness)
- Platform Settings: addIframeAllowedURL, removeIframeAllowedURL. Risk: Low
- Room / Communication advanced mutations: (room membership, room configuration, mentions) not clearly surfaced. Risk: Medium
- TagsetTemplate interactions (if exposed via mutations). Risk: Low
- AuthorizationPolicy resets beyond platform (entity-level resets on other domains). Risk: Medium
- Conversion additional variants: convertSpaceL1ToSpaceL2 (if not covered), convertSpaceL2ToSpaceL1 (if not covered both directions). Risk: Low (already partial coverage)
- ProfileDocuments: update/delete document references (beyond listing). Risk: Low

## Risk Classification Criteria
- High: Security / authorization / credential issuance & revocation.
- Medium: Direct content/data mutations affecting collaboration integrity.
- Low: Supporting metadata or aesthetic / ancillary configuration.

## Recommended Automated Test Stubs
Format: `domain.operation.test.ts` with scenario matrix (Success, AuthZ Failure, Validation Failure).

| Domain | Operation | Stub Filename | Priority |
|--------|-----------|---------------|----------|
| authorization-credential | grantCredentialToOrganization | authorization-credential.grantCredentialToOrganization.it-spec.ts | P0 |
| authorization-credential | revokeCredentialFromOrganization | authorization-credential.revokeCredentialFromOrganization.it-spec.ts | P0 |
| agent | beginVerifiedCredentialRequestInteraction | agent.beginVerifiedCredentialRequestInteraction.it-spec.ts | P0 |
| agent | beginAlkemioUserVerifiedCredentialOfferInteraction | agent.beginAlkemioUserVerifiedCredentialOfferInteraction.it-spec.ts | P0 |
| licensing-framework | createLicensePlanOnLicensingFramework | licensing-framework.createLicensePlan.it-spec.ts | P1 |
| licensing-framework | updateLicensePlanOnLicensingFramework | licensing-framework.updateLicensePlan.it-spec.ts | P2 |
| community-guidelines | updateCommunityGuidelines | community-guidelines.update.it-spec.ts | P1 |
| community-guidelines | removeCommunityGuidelinesContent | community-guidelines.removeContent.it-spec.ts | P1 |
| profile | updateProfile | profile.update.it-spec.ts | P1 |
| tagset | updateTagset | tagset.update.it-spec.ts | P3 |
| visual | updateVisual | visual.update.it-spec.ts | P3 |
| visual | deleteVisual | visual.delete.it-spec.ts | P3 |
| reference | updateReference | reference.update.it-spec.ts | P3 |
| link | updateLink | link.update.it-spec.ts | P2 |
| link | deleteLink | link.delete.it-spec.ts | P2 |
| document | updateDocument | document.update.it-spec.ts | P2 |
| memo | createMemo | memo.create.it-spec.ts | P2 |
| memo | updateMemo | memo.update.it-spec.ts | P2 |
| memo | deleteMemo | memo.delete.it-spec.ts | P2 |
| whiteboard | updateWhiteboard | whiteboard.update.it-spec.ts | P2 |
| callout-contribution | moveCalloutContribution | callout-contribution.move.it-spec.ts | P3 |
| callout-transfer | transferCallout | callout-transfer.transfer.it-spec.ts | P2 |
| innovation-hub | updateInnovationHub | innovation-hub.update.it-spec.ts | P3 |
| innovation-pack | updateInnovationPack | innovation-pack.update.it-spec.ts | P3 |
| ai-persona | updateAiPersona | ai-persona.update.it-spec.ts | P2 |
| ai-persona | deleteAiPersona | ai-persona.delete.it-spec.ts | P2 |
| platform | addIframeAllowedURL | platform.addIframeAllowedURL.it-spec.ts | P3 |
| platform | removeIframeAllowedURL | platform.removeIframeAllowedURL.it-spec.ts | P3 |
| room | updateRoomSettings? | room.updateSettings.it-spec.ts | P2 |
| room | addRoomMember? | room.addMember.it-spec.ts | P2 |

(Question-mark operations require schema confirmation; placeholders retained for automation tooling to validate before generation.)

## Suggested Automation JSON
```json
{
  "generatedAt": "2025-11-13",
  "testedOperations": [
    "GetAccountMainEntities","TransferInnovationPackToAccount","GetActivityLogOnCollaboration","assignPlatformRoleToUser","removePlatformRoleFromUser","authorizationPolicyResetOnPlatform","CreateCalloutOnCalloutsSet","UpdateCallout","UpdateCalloutVisibility","deleteCallout","CalloutDetails","GetCalloutsOnCalloutsSetUsingClassification","CreateContributionOnCallout","UpdatePost","DeletePost","SpaceCallout","GetCalloutPosts","GetPostData","CalloutStorageConfig","CalloutPostStorageConfig","CalloutLinkContributionStorageConfig","CalloutWhiateboardStorageConfig","WhiteboardCalloutStorageConfig","SendMessageToRoom","sendMessageToUsers","SendMessageToOrganization","SendMessageToCommunityLeads","RemoveMessageOnRoom","DeleteDiscussion","CreateDiscussion","UpdateDiscussion","SendMessageReplyToRoom","AddReactionToMessageInRoom","RemoveReactionToMessageInRoom","GetSpaceAboutDetails","ConvertSpaceL1ToSpaceL0","ConvertSpaceL2ToSpaceL1","DeleteDocument","GetUserReferenceUri","GetOrgReferenceUri","GetOrgVisualUri","GetOrgVisualUriInnovationHub","GetProfileDocuments","MyEntitlementsQuery","OrganizationEntitlementsQuery","CreateInnovationHub","DeleteInnovationHub","createInnovationPack","deleteInnovationPack","InviteForEntryRoleOnRoleSet","deleteInvitation","DeletePlatformInvitation","applyForEntryRole","deleteUserApplication","GetPlatformLicensePlans","GetSpaceLicenseSubscriptions","AssignLicensePlanToSpace","RevokeLicensePlanFromSpace","AssignLicensePlanToAccount","RevokeLicensePlanFromAccount","lookupProfileVisuals","UsersPaginated","OrganizationsPaginated","CreateReferenceOnProfile","DeleteReference","GetRolesOrganization","assignRoleToUser","AssignRoleToUserExtendedData","removeRoleFromUser","RemoveRoleFromUserExtendedData","AssignRoleToOrganization","RemoveRoleFromOrganization","joinRoleSet","RoleSetUserPrivileges","RoleSetAvailableMembers","RoleSetMembersList","CreateSpaceBasicData","GetSpaceData","GetSpacesData","GetSubspacePage","GetSubspacesData","CreateSubspace","deleteSpace","UpdateSpaceSettings","updateSpace","updateSubspace","GetSpacesFilteredByVisibilityWithAccess","GetUserRoles","GetTemplateById","UpdateTemplate","deleteTemplate","CreateTemplate","UpdatePostTemplate","GetSpaceTemplatesCountByTemplateSetId","CreateTemplateFromSpace","UpdateSpaceTemplate","GetWhiteboardTemplatesCountByTemplateSetId","CreateWhiteboardTemplate","UpdateWhiteboardTemplate","CreateUser","updateUser","deleteUser","getUsersData","getUserData","GetUserByNameId","PendingMembershipsSpace","UpdateUserSettings","CreateVirtualContributorOnAccount","UpdateVirtualContributor","UpdateVirtualContributorSettings","DeleteVirtualContributorOnAccount","RemoveRoleFromVirtualContributor","VirtualContributor","VirtualContributorKnowledgeBase","VirtualContributorKnowledgePrivileges","VirtualContributorStorageConfig","VirtualContributorKnowledgeStorageConfig","GetAiPersonaModelCard","GetVirtualContributorWithModelCard"
  ],
  "uncoveredMutations": [
    {"name":"grantCredentialToOrganization","domain":"authorization","risk":"HIGH"},
    {"name":"revokeCredentialFromOrganization","domain":"authorization","risk":"HIGH"},
    {"name":"beginVerifiedCredentialRequestInteraction","domain":"agent","risk":"HIGH"},
    {"name":"beginAlkemioUserVerifiedCredentialOfferInteraction","domain":"agent","risk":"HIGH"},
    {"name":"createLicensePlanOnLicensingFramework","domain":"licensing","risk":"MEDIUM"},
    {"name":"updateLicensePlanOnLicensingFramework","domain":"licensing","risk":"MEDIUM"},
    {"name":"updateCommunityGuidelines","domain":"community-guidelines","risk":"MEDIUM"},
    {"name":"removeCommunityGuidelinesContent","domain":"community-guidelines","risk":"MEDIUM"},
    {"name":"updateProfile","domain":"profile","risk":"MEDIUM"},
    {"name":"updateTagset","domain":"tagset","risk":"LOW"},
    {"name":"updateVisual","domain":"visual","risk":"LOW"},
    {"name":"deleteVisual","domain":"visual","risk":"LOW"},
    {"name":"updateReference","domain":"reference","risk":"LOW"},
    {"name":"updateLink","domain":"link","risk":"MEDIUM"},
    {"name":"deleteLink","domain":"link","risk":"MEDIUM"},
    {"name":"updateDocument","domain":"document","risk":"MEDIUM"},
    {"name":"createMemo","domain":"memo","risk":"MEDIUM"},
    {"name":"updateMemo","domain":"memo","risk":"MEDIUM"},
    {"name":"deleteMemo","domain":"memo","risk":"MEDIUM"},
    {"name":"updateWhiteboard","domain":"whiteboard","risk":"MEDIUM"},
    {"name":"moveCalloutContribution","domain":"callout-contribution","risk":"LOW"},
    {"name":"transferCallout","domain":"callout-transfer","risk":"MEDIUM"},
    {"name":"updateInnovationHub","domain":"innovation-hub","risk":"LOW"},
    {"name":"updateInnovationPack","domain":"innovation-pack","risk":"LOW"},
    {"name":"updateAiPersona","domain":"ai-persona","risk":"MEDIUM"},
    {"name":"deleteAiPersona","domain":"ai-persona","risk":"MEDIUM"},
    {"name":"addIframeAllowedURL","domain":"platform","risk":"LOW"},
    {"name":"removeIframeAllowedURL","domain":"platform","risk":"LOW"},
    {"name":"updateRoomSettings","domain":"room","risk":"MEDIUM"},
    {"name":"addRoomMember","domain":"room","risk":"MEDIUM"}
  ],
  "recommendations": {
    "prioritization": {
      "P0": ["grantCredentialToOrganization","revokeCredentialFromOrganization","beginVerifiedCredentialRequestInteraction","beginAlkemioUserVerifiedCredentialOfferInteraction"],
      "P1": ["updateCommunityGuidelines","removeCommunityGuidelinesContent","updateProfile"],
      "P2": ["updateDocument","updateLink","deleteLink","createMemo","updateMemo","deleteMemo","updateWhiteboard","transferCallout","updateAiPersona","deleteAiPersona"],
      "P3": ["updateTagset","updateVisual","deleteVisual","updateReference","moveCalloutContribution","updateInnovationHub","updateInnovationPack","addIframeAllowedURL","removeIframeAllowedURL","updateRoomSettings","addRoomMember","createLicensePlanOnLicensingFramework","updateLicensePlanOnLicensingFramework"]
    }
  }
}
```

## Next Automation Actions
1. Build generator to assert existence of each uncovered mutation in schema (skip placeholders where absent).
2. Auto-create test stub files using the recommended filenames & import existing auth utilities.
3. Integrate into CI: fail build if new schema mutation appears without corresponding test stub.

## Caveats
- Resolver extraction was sample-based; a full schema introspection should validate all names before generating stubs.
- Some operations may be alias methods behind generated client names (ensure mapping before test creation).
- Subscription operations were out of scope; consider separate coverage audit.

---
End of report.
