# Server API Test Inventory
Generated on 2025-11-13T11:19:31.517Z

> This document enumerates all describe blocks (suites) and test/it cases detected in `server-api` `.it-spec.ts` files.

## src/functional-api/account/transfer-innovation-pack-to-account.it-spec.ts
**Suites**
- Transfer innovation pack to Account (line 51)
**Cases**
- Transfer innovation pack to Account :: Global Admin transfer innovation pack from Organization account to User account without valid entitlements (line 55)
- Transfer innovation pack to Account :: Support Admin transfer innovation pack from Beta Test account to User account without valid entitlements (line 90)
- Transfer innovation pack to Account :: BetaTester FAILS to transfer innovation pack from own account to another user account (line 128)
- Transfer innovation pack to Account :: BetaTester FAILS to transfer innovation pack from own account to another user account without valid entitlements (line 169)
- Transfer innovation pack to Account :: Registered user FAILS to transfer innovation pack from another account to its own account (line 218)

## src/functional-api/activity-logs/challenge-activity-logs.it-spec.ts
**Suites**
- Activity logs - Subspace (line 87)
- Access to Activity logs - Subspace (line 317)
- Access to Activity logs - Subspace > DDT user privileges to Public Subspace activity logs of Private Space (line 326)
- DDT user privileges to Public Subspace activity logs of Public Space (line 377)
**Cases**
- Activity logs - Subspace :: should return empty arrays (line 91)
- Activity logs - Subspace :: should NOT return CALLOUT_PUBLISHED, when created (line 102)
- Activity logs - Subspace :: should return MEMBER_JOINED, when user assigned from Admin or individually joined (line 118)

## src/functional-api/activity-logs/opportunity-activity-logs.it-spec.ts
**Suites**
- Activity logs - Subsubspace (line 102)
- Access to Activity logs - Subsubspace (line 327)
- Access to Activity logs - Subsubspace > DDT user privileges to Public Subsubspace activity logs of Private Space (line 336)
- DDT user privileges to Public Subsubspace activity logs of Public Space (line 389)
**Cases**
- Activity logs - Subsubspace :: should return empty arrays (line 106)
- Activity logs - Subsubspace :: should NOT return CALLOUT_PUBLISHED, when created (line 118)
- Activity logs - Subsubspace :: should return MEMBER_JOINED, when user assigned from Admin (line 135)

## src/functional-api/activity-logs/space-activity-logs.it-spec.ts
**Suites**
- Activity logs - Space (line 69)
- Access to Activity logs - Space (line 308)
- Access to Activity logs - Space > DDT user privileges to Private Space activity logs (line 322)
- DDT user privileges to Public Space activity logs (line 370)
**Cases**
- Activity logs - Space :: should return only memberJoined (line 73)
- Activity logs - Space :: should NOT return CALLOUT_PUBLISHED, when created (line 85)
- Activity logs - Space :: should return MEMBER_JOINED, when user assigned from Admin or individually joined (line 103)

## src/functional-api/callout/callouts.it-spec.ts
**Suites**
- Callouts - CRUD (line 82)
- Callouts - AUTH Space (line 226)
- Callouts - AUTH Space > DDT user privileges to create callout (line 227)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user NO privileges to create callout (line 257)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout (line 277)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout (line 311)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace (line 339)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout (line 340)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user NO privileges to create callout (line 372)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout (line 397)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout (line 431)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subsubspace (line 459)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subsubspace > DDT user privileges to create callout (line 460)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subsubspace > DDT user privileges to create callout > DDT user NO privileges to create callout (line 495)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subsubspace > DDT user privileges to create callout > DDT user privileges to update callout (line 520)
- Callouts - AUTH Space > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout > Callouts - AUTH Subsubspace > DDT user privileges to create callout > DDT user privileges to update callout > DDT user privileges to delete callout (line 557)
**Cases**
- Callouts - CRUD :: should create callout on space coollaboration (line 87)
- Callouts - CRUD :: should update callout on space coollaboration (line 107)
- Callouts - CRUD :: should update callout visibility to Published (line 139)
- Callouts - CRUD :: should delete callout on space coollaboration (line 162)

## src/functional-api/callout/lock-state/close-state-callouts.it-spec.ts
**Suites**
- Callouts - Close State (line 116)
- Callout - Close State - User Privileges Posts (line 188)
- Callout - Close State - User Privileges Posts > Send Comment to Post - Callout Close State (line 250)
- Callout - Close State - User Privileges Posts > Send Comment to Post - Callout Close State > DDT Users sending messages to closed callout post (line 251)
- Create Post - Callout Close State (line 314)
- Create Post - Callout Close State > DDT Users create post to closed callout (line 315)
- Create Post - Callout Close State > DDT Users create post to closed callout > Discussion Callout - Close State (line 412)
- Create Post - Callout Close State > DDT Users create post to closed callout > Discussion Callout - Close State > DDT Users sending messages to closed discussion callout (line 413)
**Cases**
- Callouts - Close State :: Close callout that has not been published (line 120)
- Callouts - Close State :: Close callout that has been published (line 153)

## src/functional-api/callout/post/post-on-callout.it-spec.ts
**Suites**
- Posts - Create (line 99)
- Posts - Update (line 202)
- Posts - Delete (line 333)
- Posts - Messages (line 567)
- Posts - Messages > Send Message - Post created by GA on Space callout (line 568)
- Posts - Messages > Send Message - Post created by GA on Space callout > Messages - GA Send/Remove flow (line 670)
- Delete Message - Post created by HM on Space callout (line 709)
- Posts - References (line 802)
- Posts - References > References - EA Create/Remove flow (line 852)
**Cases**
- Posts - Create :: HM should create post on space callout (line 105)
- Posts - Create :: GA should create post on space callout without setting nameId (line 132)
- Posts - Create :: NON-SM should NOT create post on space callout (line 147)
- Posts - Create :: ChA should create post on subspace callout (line 162)
- Posts - Create :: GA should create post on subsubspace callout (line 182)
- Posts - Update :: HM should NOT update post created on space callout from GA (line 217)
- Posts - Update :: NON-HM should NOT update post created on space callout from GA (line 230)
- Posts - Update :: HA should update post created on space callout from GA (line 243)
- Posts - Update :: GA should update post created on space callout from GA (line 268)
- HM should update post created on space callout from HM (line 294)
- Posts - Delete :: HM should NOT delete post created on space callout from GA (line 334)
- Posts - Delete :: HM should delete post created on space callout from Himself (line 361)
- Posts - Delete :: HM should delete post created on space callout from EM (line 384)
- Posts - Delete :: NON-EM should NOT delete post created on space callout created from HM (line 405)
- Posts - Delete :: ChA should delete post created on subspace callout from GA (line 433)
- Posts - Delete :: HA should delete post created on subspace callout from ChA (line 453)
- Posts - Delete :: ChA should delete post created on subsubspace callout from OM (line 475)
- Posts - Delete :: ChM should not delete post created on subspace callout from ChA (line 496)
- Posts - Delete :: OM should delete own post on subsubspace callout (line 524)
- Posts - Delete :: GA should delete own post on subsubspace callout (line 545)
- Posts - Messages > Send Message - Post created by GA on Space callout :: ChA should send comment on post created on subspace callout from GA (line 609)
- Posts - Messages > Send Message - Post created by GA on Space callout :: HM should send comment on post created on space callout from GA (line 633)
- Posts - Messages > Send Message - Post created by GA on Space callout :: NON-HM should NOT send comment on post created on space callout from GA (line 657)
- Posts - Messages > Send Message - Post created by GA on Space callout > Messages - GA Send/Remove flow :: GA should send comment on post created on space callout from GA (line 671)
- Posts - Messages > Send Message - Post created by GA on Space callout > Messages - GA Send/Remove flow :: GA should remove comment on post created on space callout from GA (line 695)
- Delete Message - Post created by HM on Space callout :: HM should NOT delete comment sent from GA (line 737)
- Delete Message - Post created by HM on Space callout :: NON-HM should NOT delete comment sent from GA (line 751)
- Delete Message - Post created by HM on Space callout :: GA should remove comment sent from GA (line 765)
- Delete Message - Post created by HM on Space callout :: HM should delete own comment (line 778)
- Posts - References :: HM should NOT add reference to post created on space callout from GA (line 824)
- Posts - References :: NON-HM should NOT add reference to post created on space callout from GA (line 838)
- Posts - References > References - EA Create/Remove flow :: HA should add reference to post created on space callout from GA (line 853)
- Posts - References > References - EA Create/Remove flow :: HA should remove reference from post created EA (line 874)

## src/functional-api/communications/community-updates/updates.it-spec.ts
**Suites**
- Communities (line 53)
- Communities > Community updates - read access (line 54)
- Community updates - create / delete (line 187)
**Cases**
- Communities > Community updates - read access :: community updates - PRIVATE space - read access - sender / reader (member) / reader (not member) (line 80)
- Communities > Community updates - read access :: community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member) (line 129)
- Community updates - create / delete :: should create community update (line 188)
- Community updates - create / delete :: should delete community update (line 217)

## src/functional-api/communications/forum-discussions/platform-discussions.it-spec.ts
**Suites**
- Platform discussions - CRUD operations (line 40)
- Discussion messages (line 104)
- Authorization - Discussion / Messages (line 181)
- Authorization - Discussion / Messages > Discussions (line 182)
- Authorization - Discussion / Messages > Discussions > DDT user privileges to create / update platform discussions (line 183)
- DDT user privileges to create / delete platform discussions (line 245)
- Comments (line 300)
- Comments > DDT user privileges to create / delete comments on discussion created from GA (line 301)
- DDT user privileges to create / delete comments on discussion created from registered user (line 386)
**Cases**
- Platform discussions - CRUD operations :: Create discussion (line 45)
- Platform discussions - CRUD operations :: Delete discussion (line 61)
- Platform discussions - CRUD operations :: Update discussion (line 80)
- Discussion messages :: Send message to discussion (line 121)
- Discussion messages :: Create multiple messages in one discussion (line 134)
- Discussion messages :: Delete message from discussion (line 160)

## src/functional-api/communications/reactions/reactions.it-spec.ts
**Suites**
- Reaction - Discussion messages (line 33)
**Cases**
- Reaction - Discussion messages :: React on own message (line 52)
- Reaction - Discussion messages :: React on other user message (line 73)
- Reaction - Discussion messages :: Add multiple reaction to a message (line 98)
- Reaction - Discussion messages :: Should fail to add same reaction twice to a message (line 134)
- Reaction - Discussion messages :: Remove reaction on own message (line 166)
- Reaction - Discussion messages :: Remove reaction added by other user on own message (line 192)

## src/functional-api/communications/replies/reply.it-spec.ts
**Suites**
- Reply - Discussion messages (line 36)
**Cases**
- Reply - Discussion messages :: Reply to own message (line 56)
- Reply - Discussion messages :: Reply to message created by other user (line 82)
- Reply - Discussion messages :: Should fail to delete message, when user raplied to a thread has been removed (line 109)
- Reply - Discussion messages :: User replaying to other user message fail to delete the other user message (line 154)
- Reply - Discussion messages :: Replies should not be deleted, when main message is removed (line 183)
- Reply - Discussion messages :: Removing reply, removes reaction related to it (line 226)

## src/functional-api/configuration/configuration.it-spec.ts
**Suites**
- Platform configuration (line 4)
- Platform configuration > Platform configuration can be loaded and defaults are OK (line 5)
**Cases**: *None found*

## src/functional-api/contributor-management/organization/organization-owner.it-spec.ts
**Suites**
- Organization Owner (line 60)
**Cases**
- Organization Owner :: should create organization owner (line 61)
- Organization Owner :: should add same user as owner of 2 organization (line 76)
- Organization Owner :: should remove user owner from organization (line 111)
- Organization Owner :: should not remove the only owner of an organization (line 138)
- Organization Owner :: should not return user credentials for removing user not owner of an Organization (line 159)
- Organization Owner :: should not result in additional credential for assigning same organization owner twice (line 173)

## src/functional-api/contributor-management/organization/organization-settings.it-spec.ts
**Suites**
- Organization settings (line 56)
- Organization settings > DDT user WITH privileges to update organization settings (line 57)
- DDT user WITHOUT privileges to update organization settings (line 87)
- Unverified organization - domain match (line 112)
- Verified organization - domain match (line 205)
**Cases**
- Verified organization - domain match :: assign new user to organization,domain setting enabled (line 221)

## src/functional-api/contributor-management/organization/organization-verification.it-spec.ts
**Suites**
- Organization verification status (line 46)
**Cases**: *None found*

## src/functional-api/contributor-management/organization/organization.it-spec.ts
**Suites**
- Organization (line 44)
- Organization > create (line 45)
- update (line 90)
- delete (line 146)
**Cases**
- Organization > create :: should create (line 46)
- Organization > create :: should FAIL on breaking unique nameID (line 72)
- Organization > create :: should FAIL on breaking unique displayName (line 81)
- update :: should update (line 102)
- update :: should FAIL on breaking unique displayName (line 134)
- delete :: should delete (line 155)
- delete :: should FAIL on unknown id (line 162)

## src/functional-api/contributor-management/user/create-user.it-spec.ts
**Suites**
- Create User (line 35)
**Cases**
- Create User :: should create a user (line 40)
- Create User :: should throw error - same user is created twice (line 55)
- Create User :: should query created user (line 73)
- Create User :: should throw error - create user with LONG NAME (line 88)
- Create User :: should throw error - create user with invalid email (line 103)

## src/functional-api/contributor-management/user/delete-user.it-spec.ts
**Suites**
- Delete user (line 43)
**Cases**
- Delete user :: should delete created user (line 44)
- Delete user :: should receive a message for deleting already deleted user (line 52)
- Delete user :: should receive a message for deleting unexisting user (line 65)
- Delete user :: should not get result for quering deleted user (line 75)

## src/functional-api/contributor-management/user/update-user.it-spec.ts
**Suites**
- Update user (line 47)
**Cases**: *None found*

## src/functional-api/contributor-management/virtual-contributor/knowledge-base-access.it-spec.ts
**Suites**
- Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public (line 172)
- Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public > VC knowledge privileges (line 181)
- VC knowledge base calloutSet (line 226)
- VC knowledge base storageBucket (line 268)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Private (line 314)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Private > VC knowledge privileges (line 326)
- VC knowledge base calloutSet (line 371)
- VC knowledge base storageBucket (line 413)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Public (line 459)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Public > VC knowledge privileges (line 471)
- VC knowledge base calloutSet (line 516)
- VC knowledge base storageBucket (line 558)
- Virtual Contributor Access - All Private - Visibility Public / BoK / Private (line 604)
- Virtual Contributor Access - All Private - Visibility Public / BoK / Private > VC knowledge privileges (line 613)
- VC knowledge base calloutSet (line 658)
- VC knowledge base storageBucket (line 700)
**Cases**: *None found*

## src/functional-api/contributor-management/virtual-contributor/model-card/engine-types.it-spec.ts
**Suites**
- Virtual Contributor Engine Types Model Card (line 170)
**Cases**
- Virtual Contributor Engine Types Model Card :: should create virtual contributors with different engine types (line 171)
- Virtual Contributor Engine Types Model Card :: should have correct engine type in each model card (line 180)
- Virtual Contributor Engine Types Model Card :: should have different model card information for different engines (line 207)
- Virtual Contributor Engine Types Model Card :: should have different monitoring data for different engines (line 280)
- Virtual Contributor Engine Types Model Card :: should have Virtual Contributor model card for registered user access (line 305)

## src/functional-api/contributor-management/virtual-contributor/model-card/model-card.it-spec.ts
**Suites**
- Virtual Contributor Model Card (line 76)
**Cases**
- Virtual Contributor Model Card :: should create a virtual contributor with a model card (line 77)
- Virtual Contributor Model Card :: should have correct space usage data in model card (line 94)
- Virtual Contributor Model Card :: should have correct AI engine data in model card (line 139)
- Virtual Contributor Model Card :: should have correct monitoring data in Virtual Contributor model card (line 161)

## src/functional-api/contributor-management/virtual-contributor/vc-access.it-spec.ts
**Suites**
- Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public (line 166)
- Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public > Virtual contributor (line 175)
- VC storageBucket (line 214)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Private (line 257)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Private > Virtualcontributor (line 269)
- VC storageBucket (line 308)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Public (line 351)
- Virtual Contributor Access - All Private - Visibility Private / BoK / Public > Virtualcontributor (line 363)
- VC storageBucket (line 402)
- Virtual Contributor Access - All Private - Visibility Public / BoK / Private (line 445)
- Virtual Contributor Access - All Private - Visibility Public / BoK / Private > Virtualcontributor (line 454)
- VC storageBucket (line 493)
**Cases**: *None found*

## src/functional-api/contributor-management/virtual-contributor/vc.it-spec.ts
**Suites**
- Virtual Contributor (line 139)
**Cases**
- Virtual Contributor :: should not delete user who hosts an account (line 148)
- Virtual Contributor :: should return invitations after virtual contributor is removed (line 157)
- Virtual Contributor :: query virtual contributor data (line 187)

## src/functional-api/entitlements/innovation-packs-functional-entitlements.it-spec.ts
**Suites**
- Functional tests - Innovation Pack (line 49)
- Functional tests - Innovation Pack > VC Campaign user innovation pack creation (line 61)
**Cases**
- Functional tests - Innovation Pack > VC Campaign user innovation pack creation :: Create a innovation pack over the license limit (line 117)

## src/functional-api/entitlements/licenses-functional-entitlements.it-spec.ts
**Suites**
- Functional tests - licenses updates (line 65)
- Functional tests - licenses updates > Space licenses (line 66)
**Cases**
- Functional tests - licenses updates > Space licenses :: Add License Plus to space (line 67)

## src/functional-api/entitlements/organization-entitlements.it-spec.ts
**Suites**
- Get Organization Account Authorization and License privileges (line 105)
- Get Organization Account Authorization and License privileges > Account license plus cleanup (line 168)
**Cases**
- Get Organization Account Authorization and License privileges :: No licenses assigned (line 106)
- Get Organization Account Authorization and License privileges :: User admin of Organization with accountLicensesPlus assigned (line 135)
- Get Organization Account Authorization and License privileges > Account license plus cleanup :: User admin of Organization with accountLicensesPlus assigned and created Space, VC and Innovation Pack (line 175)

## src/functional-api/entitlements/space-functional-entitlements.it-spec.ts
**Suites**
- Functional tests - Space (line 54)
- Functional tests - Space > VC Campaign user space creation (line 55)
**Cases**
- Functional tests - Space > VC Campaign user space creation :: Create a space over the license limit (line 122)
- Functional tests - Space > VC Campaign user space creation :: Create a space after third over the license limit was removed (line 145)

## src/functional-api/entitlements/user-entitlements.it-spec.ts
**Suites**
- Get User Account Authorization and License privileges (line 70)
- Get User Account Authorization and License privileges > VC campaign Licenses cleanup (line 128)
- BetaTested Licenses cleanup (line 227)
**Cases**
- Get User Account Authorization and License privileges :: No licenses assigned (line 71)
- Get User Account Authorization and License privileges :: VC campaign licenses assigned (line 98)
- Get User Account Authorization and License privileges > VC campaign Licenses cleanup :: User with VC campaign licenses assigned and created Space, VC and Innovation Pack (line 138)
- Beta tester licenses assigned (line 194)
- BetaTested Licenses cleanup :: User with Beta tester licenses assigned and created Space, VC and Innovation Pack (line 237)

## src/functional-api/entitlements/vc-functional-entitlements.it-spec.ts
**Suites**
- Functional tests - VC (line 53)
- Functional tests - VC > VC Campaign user vc creation (line 71)
**Cases**
- Functional tests - VC > VC Campaign user vc creation :: Create a vc over the license limit (line 138)

## src/functional-api/innovation-pack/innovation-pack.it-spec.ts
**Suites**
- Organization (line 16)
- Organization > Innovation pack library (line 30)
**Cases**
- Organization > Innovation pack library :: Create (line 31)

## src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts
**Suites**
- Promoting of L1 subspace (line 60)
**Cases**
- Promoting of L1 subspace :: Conversion Subspace L1 to Space L0 - basic scenario (line 61)

## src/functional-api/journey/conversion/convert-L1-to-L0-with-L2-to-L1.it-spec.ts
**Suites**
- Promoting of L1 subspace (line 84)
**Cases**
- Promoting of L1 subspace :: Conversion Subspace L1 to Space L0 together with L2 to L1 (line 85)

## src/functional-api/journey/conversion/convert-L1-to-L0.it-spec.ts
**Suites**
- Promoting of L1 subspace (line 72)
**Cases**: *None found*

## src/functional-api/journey/conversion/convert-L2-to-L1.it-spec.ts
**Suites**
- Promoting of L2 subspace (line 70)
**Cases**
- Promoting of L2 subspace :: Conversion Subspace L2 to Space L1 (line 71)

## src/functional-api/journey/space/space-platform-settings.it-spec.ts
**Suites**
- Update space platform settings (line 86)
- Update space platform settings > Update space settings - functional (line 97)
- Authorization - Update space platform settings (line 135)
- Authorization - Update space platform settings > DDT role access to private Space (line 144)
- DDT role access to public Space (line 171)
**Cases**
- Update space platform settings > Update space settings - functional :: Update space settings (line 115)

## src/functional-api/journey/space/space.it-spec.ts
**Suites**
- Space entity (line 35)
**Cases**
- Space entity :: should create space (line 54)
- Space entity :: should update space nameId (line 73)
- Space entity :: should not update space nameId (line 88)
- Space entity :: should remove space (line 113)

## src/functional-api/journey/subspace/create-subspace.it-spec.ts
**Suites**
- Create subspace (line 61)
- Create subspace > DDT invalid NameID (line 151)
**Cases**
- Create subspace :: should create a successfull subspace (line 62)
- Create subspace :: should remove a subspace (line 99)

## src/functional-api/journey/subspace/flows-subspace.it-spec.ts
**Suites**
- Flows subspace (line 50)
**Cases**
- Flows subspace :: should  modify subspace name to allready existing subspace name and/or textId (line 68)
- Flows subspace :: should creating 2 subspaces with same name (line 99)
- Flows subspace :: should throw error - creating 2 subspaces with different name and same nameId (line 115)

## src/functional-api/journey/subspace/query-subspace-data.it-spec.ts
**Suites**
- Query Subspace data (line 77)
**Cases**
- Query Subspace data :: should query community through subspace (line 78)
- Query Subspace data :: should query subsubspace through subspace (line 88)
- Query Subspace data :: should create subsubspace and query the data (line 117)
- Query Subspace data :: should update a subspace (line 150)

## src/functional-api/journey/subsubspace/subsubspace.it-spec.ts
**Suites**
- Opportunities (line 50)
- DDT should not create opportunities with same nameID within the same subspace (line 178)
**Cases**
- Opportunities :: should create subsubspace and query the data (line 55)
- Opportunities :: should update subsubspace and query the data (line 87)
- Opportunities :: should remove subsubspace and query the data (line 114)
- Opportunities :: should throw an error for creating subsubspace with same name/NameId on different subspaces (line 142)

## src/functional-api/journey/subsubspace/subsubspace_authorization.it-spec.ts
**Suites**
- Subsubspace Admin (line 84)
**Cases**
- Subsubspace Admin :: should create subsubspace admin (line 85)
- Subsubspace Admin :: should add same user as admin of 2 opportunities (line 104)
- Subsubspace Admin :: should be able one subsubspace admin to remove another admin from subsubspace (line 148)
- Subsubspace Admin :: should remove the only admin of an subsubspace (line 180)

## src/functional-api/notifications/organization/mention-organization.it-spec.ts
*No describe blocks found*
**Cases**: *None found*

## src/functional-api/notifications/organization/user-to-organization.it-spec.ts
**Suites**
- Notifications - user to organization messages (line 126)
**Cases**: *None found*

## src/functional-api/notifications/platform/forum-discussions.it-spec.ts
**Suites**
- Notifications - forum discussions (line 212)
- Notifications - forum discussions comment (line 312)
- Notifications - forum discussions comments reply (line 449)
- Notifications - no notifications triggered (line 645)
**Cases**
- Notifications - forum discussions :: GA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications (line 242)
- Notifications - forum discussions :: QA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications (line 274)
- Notifications - forum discussions comment :: GA send comment to own forum discussion - GA(1) get notifications (line 336)
- Notifications - forum discussions comment :: GA send comment to forum discussion created by QA - QA(1) get notifications (line 363)
- Notifications - forum discussions comment :: QA send comment to own forum discussion - QA(1) get notifications (line 392)
- Notifications - forum discussions comment :: QA send comment to forum discussion created by GA - GA(1) get notifications (line 421)
- Notifications - forum discussions comments reply :: GA reply to own comment of own forum discussion - GA(1) get notifications (line 479)
- Notifications - forum discussions comments reply :: GA reply to other comment to forum discussion created by QA - QA(1) get notifications (line 517)
- Notifications - forum discussions comments reply :: QA reply to own comment of own forum discussion - QA(1) get notifications (line 560)
- Notifications - forum discussions comments reply :: QA reply to other comment to forum discussion created by GA - GA(1) get notifications (line 603)
- Notifications - no notifications triggered :: GA create forum discussion - no one get notifications (line 676)
- Notifications - no notifications triggered :: QA create forum discussion - no one get notifications (line 691)
- Notifications - no notifications triggered :: GA send comment to own forum discussion - no notifications (line 708)
- Notifications - no notifications triggered :: GA reply to won comment of forum discussion created by QA - no notifications (line 727)
- Notifications - no notifications triggered :: GA send comment to own forum discussion - no notifications (line 748)
- Notifications - no notifications triggered :: GA reply to comment of forum discussion created by QA - no notifications (line 776)

## src/functional-api/notifications/platform/registration.it-spec.ts
**Suites**
- Notifications - User registration (line 117)
- Notifications - User removal (line 181)
**Cases**
- Notifications - User registration :: User sign up - GA(1), SA(1), New User(1) get notifications (line 131)
- Notifications - User registration :: User sign up - GA(0), New User(1) get notifications (line 159)
- Notifications - User removal :: User removed - GA(1) get notifications (line 200)

## src/functional-api/notifications/platform/space-creation.it-spec.ts
**Suites**
- Notifications - Space creation (line 118)
**Cases**
- Notifications - Space creation :: Space created - GA(1), LA(1), SA(1) get notifications (line 134)
- Notifications - Space creation :: Space created - GA(0), SA(0) - no admin notifications (line 164)
- Notifications - Space creation :: Space created - Only GA(1) gets notifications (line 182)
- Space deleted - GA(1) get notifications (line 238)

## src/functional-api/notifications/space/collaboration/callout-comments.it-spec.ts
**Suites**
- Notifications - callout comments (line 201)
**Cases**
- Notifications - callout comments :: GA create space callout comment - HM(7) get notifications (line 210)
- Notifications - callout comments :: HA create space callout comment - HM(7) get notifications (line 242)
- Notifications - callout comments :: HA create subspace callout comment - HM(5),  get notifications (line 274)
- Notifications - callout comments :: OM create subsubspace callout comment - HM(3), get notifications (line 313)
- Notifications - callout comments :: OA create subsubspace callout comment - 0 notifications - all roles with notifications disabled (line 349)

## src/functional-api/notifications/space/collaboration/callouts.it-spec.ts
**Suites**
- Notifications - post (line 161)
**Cases**
- Notifications - post :: GA PUBLISH space callout - HM(7) get notifications (line 189)
- Notifications - post :: GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED space callout - HM(7) get notifications on PUBLISH event only (line 280)
- Notifications - post :: HA create PUBLISHED space callout type: POST - HM(7) get notifications (line 329)
- Notifications - post :: HA create PUBLISHED subspace callout type: POST - CM(5) get notifications (line 477)
- Notifications - post :: OA create PUBLISHED subsubspace callout type: POST - OM(4) get notifications (line 569)
- Notifications - post :: OA create PUBLISHED subsubspace callout type: POST - 0 notifications - all roles with notifications disabled (line 663)

## src/functional-api/notifications/space/collaboration/community-updates.it-spec.ts
**Suites**
- Notifications - updates (line 145)
**Cases**
- Notifications - updates :: GA create space update - GA(1), HA (1), HM(6) get notifications (line 169)
- Notifications - updates :: HA create space update - GA(1), HA (1), HM(6) get notifications (line 226)
- Notifications - updates :: CA create subspace update - GA(1), HA (1), CA(1), CM(3),  get notifications (line 285)
- Notifications - updates :: OA create subsubspace update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications (line 343)
- Notifications - updates :: OA create subsubspace update - 0 notifications - all roles with notifications disabled (line 403)

## src/functional-api/notifications/space/collaboration/post-contribution.it-spec.ts
**Suites**
- Notifications - post (line 152)
**Cases**
- Notifications - post :: GA create space post - GA(1), HA (2), HM(6) get notifications (line 187)
- Notifications - post :: HA create space post - GA(1), HA (1), HM(6) get notifications (line 249)
- Notifications - post :: HA create subspace post - GA(1), HA (1), CA(1), CM(3),  get notifications (line 310)
- Notifications - post :: OM create subsubspace post - HA(2), CA(1), OA(2), OM(4), get notifications (line 367)
- Notifications - post :: OA create subsubspace post - 0 notifications - all roles with notifications disabled (line 443)

## src/functional-api/notifications/space/collaboration/posts-comment.it-spec.ts
**Suites**
- Notifications - post comments (line 185)
- Notifications - post comments > GA create post on space (line 216)
- HM create post on space (line 274)
- CM create post on subspace (line 333)
- OM create post on subsubspace (line 392)
**Cases**
- Notifications - post comments > GA create post on space :: GA create comment - GA(1) get notifications (line 234)
- Notifications - post comments > GA create post on space :: HM create comment - GA(1) get notifications (line 248)
- HM create post on space :: HM create comment - HM(1) get notifications (line 292)
- HM create post on space :: HA create comment - HM(1) get notifications (line 307)
- CM create post on subspace :: CM create comment - CM(1) get notifications (line 351)
- CM create post on subspace :: CA create comment - CM(1) get notifications (line 366)
- OM create post on subsubspace :: OM create comment - OM(1) get notifications (line 410)
- OM create post on subsubspace :: CA create comment - OM(1) get notifications (line 425)
- OA create post on subsubspace and comment - 0 notifications - all roles with notifications disabled (line 451)

## src/functional-api/notifications/space/collaboration/wb-contributions.it-spec.ts
**Suites**
- Notifications - whiteboard (line 248)
**Cases**
- Notifications - whiteboard :: GA create space whiteboard - GA(1), HA (2), HM(6) get notifications (line 269)
- Notifications - whiteboard :: HA create space whiteboard - GA(1), HA (1), HM(6) get notifications (line 337)
- Notifications - whiteboard :: HA create subspace whiteboard - GA(1), HA (1), CA(1), CM(3),  get notifications (line 403)
- Notifications - whiteboard :: OM create subsubspace whiteboard - HA(2), CA(1), OA(2), OM(4), get notifications (line 480)
- Notifications - whiteboard :: OA create subsubspace whiteboard - 0 notifications - all roles with notifications disabled (line 560)

## src/functional-api/notifications/space/communication/user-to-community-leads-challenge.it-spec.ts
**Suites**
- Notifications - send messages to Private Space, Public Subspace Community Leads (line 154)
- Notifications - send messages to Private Space, Private Subspace Community Leads (line 218)
- Notifications - send messages to Private Space, Public Subspace NO Community Leads (line 290)
**Cases**
- Notifications - send messages to Private Space, Public Subspace Community Leads :: NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 159)
- Notifications - send messages to Private Space, Public Subspace Community Leads :: Space member send message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 186)
- Notifications - send messages to Private Space, Private Subspace Community Leads :: NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 231)
- Notifications - send messages to Private Space, Private Subspace Community Leads :: Subspace member send message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 258)
- Notifications - send messages to Private Space, Public Subspace NO Community Leads :: NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 0 messages sent (line 321)

## src/functional-api/notifications/space/communication/user-to-community-leads-hub.it-spec.ts
**Suites**
- Notifications - send messages to Private space hosts (line 160)
- Notifications - send messages to Private space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) (line 161)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) (line 238)
- Notifications - messages to Public space hosts (line 278)
- Notifications - messages to Public space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) (line 286)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) (line 358)
- Notifications - messages to Public space NO hosts (line 399)
**Cases**
- Notifications - send messages to Private space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) :: NOT space member sends message to Space community (2 hosts) - 2 messages sent (line 175)
- Notifications - send messages to Private space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) :: Space member send message to Space community (2 hosts) - 2 messages sent (line 206)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) :: NOT space member sends message to Space community (2 hosts) - 0 messages sent (line 247)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) :: Space member send message to Space community (2 hosts) - 0 messages sent (line 262)
- Notifications - messages to Public space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) :: NOT space member sends message to Space community (2 hosts) - 2 messages sent (line 295)
- Notifications - messages to Public space hosts > Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled) :: Space member send message to Space community (2 hosts) - 2 messages sent (line 326)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) :: NOT space member sends message to Space community (2 hosts) - 0 messages sent (line 367)
- Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled) :: Space member send message to Space community (2 hosts) - 0 messages sent (line 382)
- Notifications - messages to Public space NO hosts :: NOT space member sends message to Space community (0 hosts) - 0 messages sent (line 423)
- Notifications - messages to Public space NO hosts :: Space member send message to Space community (0 hosts) - 0 messages sent (line 438)

## src/functional-api/notifications/space/communication/user-to-community-leads-opportunity.it-spec.ts
**Suites**
- Notifications - send messages to Private Space, Subsubspace Community Leads (line 162)
- Notifications - send messages to Private Space, Public Subspace, Subsubspace with NO Community Leads (line 226)
**Cases**
- Notifications - send messages to Private Space, Subsubspace Community Leads :: NOT space member sends message to Subsubspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 167)
- Notifications - send messages to Private Space, Subsubspace Community Leads :: Subsubspace member send message to Subsubspace community (2 User Leads, 1 Org Lead) - 2 messages sent (line 194)
- Notifications - send messages to Private Space, Public Subspace, Subsubspace with NO Community Leads :: NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 0 messages sent (line 251)

## src/functional-api/notifications/space/community/application.it-spec.ts
**Suites**
- Notifications - applications (line 169)
**Cases**
- Notifications - applications :: receive notification for non space user application to space- GA, EA (line 193)
- Notifications - applications :: receive notification for non space user application to subspace- GA, CA (line 217)
- Notifications - applications :: no notification for non space user application to space- GA, EA and Applicant (line 253)

## src/functional-api/notifications/space/community/external-invitations.it-spec.ts
**Suites**
- Notifications - invitations (line 184)
**Cases**
- Notifications - invitations :: external user receive notifications (line 210)
- Notifications - invitations :: external user receive notifications from subspace (line 237)

## src/functional-api/notifications/space/community/invitations.it-spec.ts
**Suites**
- Notifications - invitations (line 187)
**Cases**
- Notifications - invitations :: non space user receive invitation for SPACE community from space admin (line 215)
- Notifications - invitations :: non space user receive invitation for SPACE community from subspace admin (line 238)
- Notifications - invitations :: non space user receive invitation for CHALLENGE community from subspace admin (line 261)
- Notifications - invitations :: space member receive invitation for CHALLENGE community from subsubspace admin (line 321)
- Notifications - invitations :: non space user receive invitation for OPPORTUNITY community from subsubspace admin (line 356)

## src/functional-api/notifications/space/community/join-community.it-spec.ts
**Suites**
- Notifications - member join community (line 185)
**Cases**
- Notifications - member join community :: Non-space member join a Space - GA, HA and Joiner receive notifications (line 202)
- Notifications - member join community :: Non-space member join a Subspace - GA, HA, CA and Joiner receive notifications (line 231)
- Notifications - member join community :: Admin adds user to Space community - GA, HA and Joiner receive notifications (line 260)
- Notifications - member join community :: no notification when Non-space member cannot join a Space - GA, EA and Joiner (line 294)

## src/functional-api/notifications/user/mention-user.it-spec.ts
**Suites**
- Notifications - Mention User (line 158)
- Notifications - Mention User > Callout discussion (line 163)
- Post comment (line 320)
**Cases**
- Notifications - Mention User > Callout discussion :: GA mention HM in Space comments callout - 1 notification to HM is sent (line 164)
- Notifications - Mention User > Callout discussion :: HM mention Non Space member in Space comments callout - 1 notification to NonHM is sent (line 189)
- Notifications - Mention User > Callout discussion :: HM mention Non Space member and Space Admin in Space comments callout - 2 notification to NonHM and HA is sent (line 215)
- Notifications - Mention User > Callout discussion :: Non Space member mention HM in Space comments callout - 0 notification to HM is sent (line 248)
- Notifications - Mention User > Callout discussion :: GA mention HM in Subspace comments callout - 1 notification to HM is sent (line 266)
- Notifications - Mention User > Callout discussion :: GA mention HM in Subsubspace comments callout - 1 notification to HM is sent (line 292)
- Post comment :: HA mention HM in Space post - 1 notification to HM is sent (line 358)
- Post comment :: CA mention HM in Subspace post - 1 notification to HM is sent (line 384)
- Post comment :: OA mention HM in Subsubspace post - 1 notification to HM is sent (line 412)
- Post comment :: OA mention HM in Subsubspace post (preference disabled) - 0 notification to HM is sent (line 441)
- OA mention HM in Subsubspace post - 1 notification to HM is sent (line 476)

## src/functional-api/notifications/user/user-to-user.it-spec.ts
**Suites**
- Notifications - user to user messages (line 93)
**Cases**: *None found*

## src/functional-api/pagination/organization.it-spec.ts
**Suites**
- Pagination - organization (line 70)
- Pagination - organization > Pagination with filter (line 86)
- Pagination without filter (line 128)
- Invalid pagination queries (line 278)
**Cases**
- Pagination - organization :: query filtered organization and verify data (line 71)

## src/functional-api/pagination/user.it-spec.ts
**Suites**
- Pagination - user (line 6)
- Pagination - user > Pagination with filter (line 22)
- Pagination without filter (line 63)
- Invalid pagination queries (line 235)
**Cases**
- Pagination - user :: query filtered user and verify data (line 7)

## src/functional-api/roleset/application/application-lifecycle.it-spec.ts
**Suites**
- Lifecycle (line 40)
- Lifecycle > Update application entity state - positive path - REJECT (line 41)
**Cases**: *None found*

## src/functional-api/roleset/application/application.it-spec.ts
**Suites**
- Application (line 64)
- Application-flows (line 299)
**Cases**
- Application :: should create application (line 78)
- Application :: should create space application, when previous was REJECTED and ARCHIVED (line 108)
- Application :: should throw error for creating the same application twice (line 154)
- Application :: should remove application (line 174)
- Application :: User should not be able to approve own application (line 240)
- Application :: should return applications after user is removed (line 266)
- Application-flows :: should create application on subspace (line 323)
- Application-flows :: should return correct membershipUser applications (line 343)
- Application-flows :: should return updated membershipUser applications (line 377)
- Application-flows :: should approve subspace application, when space application is APPROVED and applications are allowed (line 413)
- Application-flows :: should be able to remove subspace application, when space application is removed (line 474)

## src/functional-api/roleset/invitations/invitation-contributors.it-spec.ts
**Suites**
- Invitations (line 81)
- Invitations-flows (line 310)
- Invitations - Authorization (line 555)
- Invitations - Authorization > DDT rights to change invitation state (line 572)
- DDT users with rights to create invitation (line 642)
- DDT users with NO rights to create invitation (line 675)
**Cases**
- Invitations :: should create invitation (line 93)
- Invitations :: should create space invitation, when previous was REJECTED and ARCHIVED (line 120)
- Invitations :: should remove invitation (line 178)
- Invitations :: should throw error for creating the same invitation twice (line 238)
- Invitations :: should return invitations after user is removed (line 276)
- Invitations-flows :: invitee is able to ACCEPT EXTRA ROLES invitation and access space data (line 321)
- Invitations-flows :: invitee is able to ACCEPT invitation and access space data (line 370)
- Invitations-flows :: invitee is able to REJECT and ARCHIVE invitation: no access to space data (line 412)
- Invitations-flows :: should throw error, when sending invitation to a member (line 453)
- Invitations-flows :: should fail to send invitation, when user has active application (line 483)
- Invitations-flows :: User with received invitation, cannot apply to the community (line 512)

## src/functional-api/roleset/invitations/invitation-external.it-spec.ts
**Suites**
- Invitations (line 69)
**Cases**
- Invitations :: should create external invitation (line 76)
- Invitations :: should fail to create second external invitation from same community to same user (line 117)
- Invitations :: should create second external invitation from same community to same user, after the first is deleted (line 174)
- Invitations :: should create second external invitation from different community to same user (line 234)

## src/functional-api/roleset/organization/organization-edge.it-spec.ts
**Suites**
- Assign / Remove organization to community (line 45)
- Assign / Remove organization to community > Assign organizations (line 46)
- Assign / Remove organization to community > Assign organizations > Assign same organization as member to same community (line 117)
- Assign different organization as member to same community (line 194)
- Assign same organization as lead to same community (line 269)
- Assign different organizations as lead to same community (line 344)
**Cases**
- Assign / Remove organization to community > Assign organizations > Assign same organization as member to same community :: Error is thrown for Space (line 118)
- Assign / Remove organization to community > Assign organizations > Assign same organization as member to same community :: Error is thrown for Subspace (line 143)
- Assign / Remove organization to community > Assign organizations > Assign same organization as member to same community :: Error is thrown for Subsubspace (line 168)
- Assign different organization as member to same community :: Successfully assigned to Space (line 195)
- Assign different organization as member to same community :: Successfully assigned to Subspace (line 219)
- Assign different organization as member to same community :: Successfully assigned to Subsubspace (line 243)
- Assign same organization as lead to same community :: Error is thrown for Space (line 270)
- Assign same organization as lead to same community :: Error is thrown for Subspace (line 294)
- Assign same organization as lead to same community :: Error is thrown for Subsubspace (line 318)
- Assign different organizations as lead to same community :: Two organizations assinged to Subspace (line 408)
- Assign different organizations as lead to same community :: Two organizations assinged to Subsubspace (line 424)

## src/functional-api/roleset/organization/organization.it-spec.ts
**Suites**
- Assign / Remove organization to community (line 31)
- Assign / Remove organization to community > Assign organization (line 32)
- Remove organization (line 210)
**Cases**
- Assign / Remove organization to community > Assign organization :: Assign organization as member to space (line 68)
- Assign / Remove organization to community > Assign organization :: Assign organization as member to subspace (line 91)
- Assign / Remove organization to community > Assign organization :: Assign organization as member to subsubspace (line 114)
- Assign / Remove organization to community > Assign organization :: Assign organization as lead to space (line 138)
- Assign / Remove organization to community > Assign organization :: Assign organization as lead to subspace (line 162)
- Assign / Remove organization to community > Assign organization :: Assign organization as lead to subsubspace (line 185)
- Remove organization :: Remove organization as member from subsubspace (line 246)
- Remove organization :: Remove organization as member from subspace (line 262)
- Remove organization :: Remove organization as member from space (line 278)
- Remove organization :: Remove organization as lead from subsubspace (line 295)
- Remove organization :: Remove organization as lead from subspace (line 311)
- Remove organization :: Remove organization as lead from space (line 327)

## src/functional-api/roleset/organization/organization2.it-spec.ts
**Suites**
- Organization role (line 69)
**Cases**
- Organization role :: Organization role - assignment to 1 Organization, Space, Subspace, Subsubspace (line 70)

## src/functional-api/roleset/user/user-edge.it-spec.ts
**Suites**
- Assign / Remove users to community (line 53)
- Assign / Remove users to community > Assign users (line 54)
- Assign / Remove users to community > Assign users > Assign same user as member to same community (line 130)
- Assign different users as member to same community (line 204)
- Assign same user as lead to same community (line 278)
**Cases**
- Assign / Remove users to community > Assign users > Assign same user as member to same community :: Does not have any effect in Space (line 131)
- Assign / Remove users to community > Assign users > Assign same user as member to same community :: Does not have any effect in Subspace (line 155)
- Assign / Remove users to community > Assign users > Assign same user as member to same community :: Does not have any effect in Subsubspace (line 179)
- Assign different users as member to same community :: Successfully assigned to Space (line 205)
- Assign different users as member to same community :: Successfully assigned to Subspace (line 229)
- Assign different users as member to same community :: Successfully assigned to Subsubspace (line 253)
- Assign same user as lead to same community :: Does not have any effect in Space (line 279)
- Assign same user as lead to same community :: Does not have any effect in Subspace (line 303)
- Assign same user as lead to same community :: Does not have any effect in Subsubspace (line 327)

## src/functional-api/roleset/user/user-edge2.it-spec.ts
**Suites**
- Assign / Remove leads to community (line 55)
- Assign / Remove leads to community > Assign different users as lead to same community (line 56)
**Cases**
- Assign / Remove leads to community > Assign different users as lead to same community :: Should assign second user as Space lead (line 77)
- Assign / Remove leads to community > Assign different users as lead to same community :: Should throw error for assigning third user as Space lead (line 104)
- Assign / Remove leads to community > Assign different users as lead to same community :: Should assign second user as Subspace lead (line 131)
- Assign / Remove leads to community > Assign different users as lead to same community :: Should throw error for assigning third user as Subspace lead (line 158)
- Assign / Remove leads to community > Assign different users as lead to same community :: Should assign second user as Subsubspace lead (line 185)
- Assign / Remove leads to community > Assign different users as lead to same community :: Should throw error for assigning third user as Subspace lead (line 212)

## src/functional-api/roleset/user/user.authorization.it-spec.ts
**Suites**
- Verify ROLESET_ENTRY_ROLE_ASSIGN privilege (line 88)
- Verify ROLESET_ENTRY_ROLE_ASSIGN privilege > DDT role privilege to assign member to space (line 89)
- DDT role privilege to assign member to subspace (line 121)
- DDT role privilege to assign member to subsubspace (line 149)
**Cases**: *None found*

## src/functional-api/roleset/user/user.it-spec.ts
**Suites**
- Assign / Remove users to community (line 57)
- Assign / Remove users to community > Assign users (line 58)
- Remove users (line 237)
- Available users (line 417)
- Available users > Space available users (line 418)
- Subspace available users (line 475)
- Subsubspace available users (line 539)
**Cases**
- Assign / Remove users to community > Assign users :: Assign user as member to space (line 96)
- Assign / Remove users to community > Assign users :: Assign user as member to subspace (line 119)
- Assign / Remove users to community > Assign users :: Assign user as member to subsubspace (line 142)
- Assign / Remove users to community > Assign users :: Assign user as lead to space (line 166)
- Assign / Remove users to community > Assign users :: Assign user as lead to subspace (line 189)
- Assign / Remove users to community > Assign users :: Assign user as lead to subsubspace (line 212)
- Remove users :: Remove user as lead from subsubspace (line 275)
- Remove users :: Remove user as lead from subspace (line 298)
- Remove users :: Remove user as lead from space (line 321)
- Remove users :: Remove user as member from subsubspace (line 345)
- Remove users :: Remove user as member from subspace (line 368)
- Remove users :: Remove user as member from space (line 391)
- Available users > Space available users :: Available members (line 419)
- Available users > Space available users :: Available leads (line 447)
- Subspace available users :: Available members (line 483)
- Subspace available users :: Available leads (line 511)
- Subsubspace available users :: Available members (line 553)
- Subsubspace available users :: Available leads (line 581)

## src/functional-api/roleset/user/user2.it-spec.ts
**Suites**
- User roles (line 98)
- User roles > Extended scenario (line 141)
**Cases**
- User roles :: user role - assignment to 1 Organization, Space, Subspace, Subsubspace (line 99)
- User roles > Extended scenario :: user role - assignment to 2 Organizations, Spaces, Subspaces, Opportunities (line 318)

## src/functional-api/search/search.it-spec.ts
**Suites**
- Search (line 193)
- Search > Search types (line 194)
- Search negative scenarios (line 557)
- Search filtered Space Data (line 594)
- Search Archived Space Data (line 657)
- Search Public Space Private Subspace Data (line 767)
- Search Private Space Private Subspace Data (line 804)
**Cases**
- Search > Search types :: should search CONTRIBUTOR data (line 195)
- Search > Search types :: should search JOURNEY data (line 223)
- Search > Search types :: should search CONTRIBUTION data (line 268)
- should search with all filters applied (line 343)
- should search by full user name (line 371)
- should search with common word filter applied (line 399)
- should search with location filter applied for all entities (line 455)
- should search term users only (line 528)
- Search negative scenarios :: should throw limit error for too many terms (line 558)
- Search negative scenarios :: should not return any results for invalid term (line 583)
- Search filtered Space Data :: should search JOURNEY data filtered empty space (line 642)
- Search Archived Space Data :: GA get results for archived spaces (line 711)

## src/functional-api/storage/auth/organization-document-auth.it-spec.ts
**Suites**
- Organization - documents (line 60)
- Organization - documents > Access to Organization Profile visual (line 61)
- Access to Organization Profile reference document (line 128)
- Access to Organization storage bucket (line 196)
**Cases**: *None found*

## src/functional-api/storage/auth/private-space-document-auth.it-spec.ts
**Suites**
- Private Space - visual on profile (line 91)
- Private Space - visual on profile > Access to Space Profile visual (line 92)
- Access to Space Profile reference (line 157)
- Access to Space About (space storage) (line 225)
- Access to Link collections (line 297)
- Access to Call for Posts Post Card visual(banner) documents (line 371)
- Access to Call for Posts Post Card reference documents (line 449)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 528)
- Access to Call for Posts Callout reference documents (line 624)
- Access to Call for Posts Callout visual(banner) documents (line 699)
- Access to Whiteboard Callout visual(banner) documents (line 772)
- Access to WhiteboardRt Callout visual(banner) documents (line 846)
**Cases**: *None found*

## src/functional-api/storage/auth/private-space-private-ch-document-auth.it-spec.ts
**Suites**
- Private Space - Private Subspace - visual on profile (line 123)
- Private Space - Private Subspace - visual on profile > Access to Space Profile visual (line 124)
- Access to Space Profile reference (line 195)
- Access to Space About (space storage) (line 268)
- Access to Link collections (line 345)
- Access to Call for Posts Post Card visual(banner) documents (line 422)
- Access to Call for Posts Post Card reference documents (line 504)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 587)
- Access to Call for Posts Callout reference documents (line 681)
- Access to Call for Posts Callout visual(banner) documents (line 760)
- Access to Whiteboard Callout visual(banner) documents (line 837)
- Access to WhiteboardRt Callout visual(banner) documents (line 915)
**Cases**: *None found*

## src/functional-api/storage/auth/private-space-public-ch-document-auth.it-spec.ts
**Suites**
- Private Space - Public Subspace - visual on profile (line 122)
- Private Space - Public Subspace - visual on profile > Access to Space Profile visual (line 123)
- Access to Space Profile reference (line 195)
- Access to Space About (space storage) (line 268)
- Access to Link collections (line 345)
- Access to Call for Posts Post Card visual(banner) documents (line 422)
- Access to Call for Posts Post Card reference documents (line 504)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 587)
- Access to Call for Posts Callout reference documents (line 681)
- Access to Call for Posts Callout visual(banner) documents (line 760)
- Access to Whiteboard Callout visual(banner) documents (line 837)
- Access to WhiteboardRt Callout visual(banner) documents (line 915)
**Cases**: *None found*

## src/functional-api/storage/auth/public-space-document-auth.it-spec.ts
**Suites**
- Public Space - visual on profile (line 93)
- Public Space - visual on profile > Access to Space Profile visual (line 94)
- Access to Space Profile reference (line 160)
- Access to Space About (space storage) (line 228)
- Access to Link collections (line 300)
- Access to Call for Posts Post Card visual(banner) documents (line 374)
- Access to Call for Posts Post Card reference documents (line 452)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 531)
- Access to Call for Posts Callout reference documents (line 621)
- Access to Call for Posts Callout visual(banner) documents (line 696)
- Access to Whiteboard Callout visual(banner) documents (line 769)
- Access to WhiteboardRt Callout visual(banner) documents (line 843)
**Cases**: *None found*

## src/functional-api/storage/auth/public-space-private-ch-document-auth.it-spec.ts
**Suites**
- Public Space - Private Subspace - visual on profile (line 133)
- Public Space - Private Subspace - visual on profile > Access to Space Profile visual (line 134)
- Access to Space Profile reference (line 208)
- Access to Space About (space storage) (line 282)
- Access to Link collections (line 360)
- Access to Call for Posts Post Card visual(banner) documents (line 438)
- Access to Call for Posts Post Card reference documents (line 521)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 605)
- Access to Call for Posts Callout reference documents (line 700)
- Access to Call for Posts Callout visual(banner) documents (line 780)
- Access to Whiteboard Callout visual(banner) documents (line 857)
- Access to WhiteboardRt Callout visual(banner) documents (line 936)
**Cases**: *None found*

## src/functional-api/storage/auth/public-space-public-ch-document-auth.it-spec.ts
**Suites**
- Public Space - Public Subspace - visual on profile (line 122)
- Public Space - Public Subspace - visual on profile > Access to Space Profile visual (line 123)
- Access to Space Profile reference (line 195)
- Access to Space About (space storage) (line 267)
- Access to Link collections (line 343)
- Access to Call for Posts Post Card visual(banner) documents (line 420)
- Access to Call for Posts Post Card reference documents (line 502)
- Access to Call for Whitaboards Whiteboard visual(banner) documents (line 585)
- Access to Call for Posts Callout reference documents (line 679)
- Access to Call for Posts Callout visual(banner) documents (line 758)
- Access to Whiteboard Callout visual(banner) documents (line 835)
- Access to WhiteboardRt Callout visual(banner) documents (line 913)
**Cases**: *None found*

## src/functional-api/storage/auth/user-document-auth.it-spec.ts
**Suites**
- User - documents (line 36)
- User - documents > Access to User Profile visual (line 37)
- Access to User Profile reference document (line 104)
- Access to User storage bucket (line 172)
**Cases**: *None found*

## src/functional-api/storage/uploads.it-spec.ts
**Suites**
- Upload document (line 89)
- Upload document > DDT upload all file types (line 101)
- Upload visual tests (line 335)
- Upload visual to innovation space (line 426)
**Cases**
- DDT upload all file types (line 137)
- upload same file twice (line 149)
- delete pdf file (line 169)
- read uploaded file (line 186)
- fail to read file after document deletion (line 202)
- read uploaded file after related reference is removed (line 218)
- upload file bigger than 15 MB (line 291)
- fail to upload .sql file (line 307)
- file is available after releted reference is deleted (line 319)
- Upload visual tests :: upload visual (line 349)
- Upload visual tests :: upload same visual twice (line 360)
- Upload visual tests :: should not upload unsupported file type (line 376)
- Upload visual tests :: read uploaded visual (line 392)
- Upload visual to innovation space :: upload visual (line 456)

## src/functional-api/subscriptions/aspect-comments.it-spec.ts
**Suites**
- Post comments subscription (line 138)
- Post comments subscription > Space comments subscription (line 139)
- Subspace comments subscription (line 219)
- Subsubspace comments subscription (line 299)
**Cases**
- Post comments subscription > Space comments subscription :: receives message after new comment is created - 3 sender / 3 receivers (line 172)
- Subspace comments subscription :: receives message after new comment is created - 3 sender / 3 receivers (line 251)
- Subsubspace comments subscription :: receives message after new comment is created - 3 sender / 3 receivers (line 332)

## src/functional-api/subscriptions/create-subspace.it-spec.ts
**Suites**
- Create subspace subscription (line 59)
**Cases**
- Create subspace subscription :: receive newly created subspaces (line 87)

## src/functional-api/subscriptions/create-subsubspace.it-spec.ts
**Suites**
- Create subsubspace subscription (line 63)
**Cases**
- Create subsubspace subscription :: receive newly created opportunities (line 91)

## src/functional-api/templates/post/post-templates.it-spec.ts
**Suites**
- Post templates - CRUD (line 85)
- Post templates - Utilization in posts (line 174)
- Post templates - Utilization in posts > Create post on all entities with newly created postTemplate (line 186)
- Update Post template already utilized by an post (line 251)
- Remove Post template already utilized by an post (line 311)
- Post templates - CRUD Authorization (line 347)
- Post templates - CRUD Authorization > Post templates - Create (line 359)
- Post templates - CRUD Authorization > Post templates - Create > DDT user privileges to create space post template - positive (line 360)
- DDT user privileges to create space post template - negative (line 386)
- Post templates - Update (line 413)
- Post templates - Update > DDT user privileges to update space post template - positive (line 423)
- Post templates - Remove (line 474)
- Post templates - Remove > DDT user privileges to remove space post template - positive (line 475)
- Post templates - Negative Scenarios (line 525)
**Cases**
- Post templates - CRUD :: Create Post template (line 90)
- Post templates - CRUD :: Update Post template (line 121)
- Post templates - CRUD :: Delete Post template (line 152)
- Post templates - Utilization in posts > Create post on all entities with newly created postTemplate :: Create Post on Space (line 193)
- Post templates - Utilization in posts > Create post on all entities with newly created postTemplate :: Create Post on Subspace (line 218)
- Post templates - Utilization in posts > Create post on all entities with newly created postTemplate :: Create Post on Subsubspace (line 234)
- Update Post template already utilized by an post :: Create post with existing post template, and update template defaultDescription, doesnt change the post description (line 266)
- Update Post template already utilized by an post :: Update post to use the new post template type (line 288)
- Remove Post template already utilized by an post :: Create post with existing post template, and remove the post template, doesnt change the post (line 328)
- Post templates - Negative Scenarios :: Delete non existent Post template (line 530)

## src/functional-api/templates/space/space-templates.it-spec.ts
**Suites**
- Subspace templates - CRUD (line 65)
**Cases**
- Subspace templates - CRUD :: Create subspace template (line 70)
- Subspace templates - CRUD :: Delete subspace template (line 104)
- Subspace templates - CRUD :: Update subspace template (line 128)

## src/functional-api/templates/whiteboard/whiteboard-templates.it-spec.ts
**Suites**
- WHITEBOARD templates - CRUD (line 49)
**Cases**
- WHITEBOARD templates - CRUD :: Create Whiteboard template (line 53)
- WHITEBOARD templates - CRUD :: Delete Whiteboard template (line 81)
