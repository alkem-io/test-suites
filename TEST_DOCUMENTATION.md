# Alkemio Test Suites Documentation

> **Generated on**: 2025-09-26  
> **Repository**: [alkem-io/test-suites](https://github.com/alkem-io/test-suites)

This document provides a comprehensive overview of all test suites and test cases in the Alkemio test-suites repository, giving you complete visibility into what is being tested across the platform.

## 📊 Summary

- **Total Describe Blocks (Test Suites)**: 457
- **Total Test Cases**: 727
- **Server API Tests**: 92 files
- **Client Web Tests**: 4 files
- **Legacy Tests**: 45 files

## 📁 Repository Structure

The test repository is organized into the following main categories:

### 1. Server API Tests (`server-api/`)
Integration and functional tests for the Alkemio GraphQL API server. These tests validate API endpoints, business logic, and data integrity.

**Test Categories:**
- **Account Management**: Transfer of innovation packs, account operations
- **Activity Logs**: Tracking user and system activities across spaces
- **Callouts**: Content publishing, post creation, callout management
- **Communications**: Community updates, forum discussions, notifications
- **Contributor Management**: User, organization, and virtual contributor management
- **Journey Management**: Spaces, subspaces, and platform navigation
- **Storage & Documents**: File uploads, document permissions, authorization
- **Templates**: Reusable content templates for spaces, posts, and whiteboards
- **Search & Pagination**: Search functionality and data pagination
- **Entitlements**: License and permission management

### 2. Client Web Tests (`client-web/`)
End-to-end tests for the Alkemio web client using Playwright. These tests validate user interactions and UI functionality.

**Test Categories:**
- **Authentication Flows**: Login, registration, verification processes
- **UI Navigation**: Tab navigation, user interface interactions

### 3. Shared Library (`lib/`)
Common utilities, helpers, and shared components used across test suites.

### 4. Legacy Tests (`testOld/`)
Older test implementations that are being phased out or migrated.

---

## 📋 Table of Contents

- [Server API Tests](#server-api-tests)
- [Client Web Tests](#client-web-tests)
- [Legacy Tests](#legacy-tests)

---

## Server API Tests

### server-api/src/functional-api

#### transfer-innovation-pack-to-account.it-spec.ts

**File**: `server-api/src/functional-api/account/transfer-innovation-pack-to-account.it-spec.ts`

**Test Suite**: Transfer innovation pack to Account

Test Cases:
- Global Admin transfer innovation pack from Organization account to User account without valid entitlements
- Support Admin transfer innovation pack from Beta Test account to User account without valid entitlements
- BetaTester FAILS to transfer innovation pack from own account to another user account
- BetaTester FAILS to transfer innovation pack from own account to another user account without valid entitlements
- Registered user FAILS to transfer innovation pack from another account to its own account

---

#### challenge-activity-logs.it-spec.ts

**File**: `server-api/src/functional-api/activity-logs/challenge-activity-logs.it-spec.ts`

**Test Suite**: Activity logs - Subspace

Test Cases:
- should return empty arrays
- should NOT return CALLOUT_PUBLISHED, when created
- should return MEMBER_JOINED, when user assigned from Admin or individually joined
- should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED ⏭️

**Test Suite**: Access to Activity logs - Subspace

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Public Subspace activity logs of Private Space

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Public Subspace activity logs of Public Space

*No test cases found in this suite.*

---

#### opportunity-activity-logs.it-spec.ts

**File**: `server-api/src/functional-api/activity-logs/opportunity-activity-logs.it-spec.ts`

**Test Suite**: Activity logs - Subsubspace

Test Cases:
- should return empty arrays
- should NOT return CALLOUT_PUBLISHED, when created
- should return MEMBER_JOINED, when user assigned from Admin
- should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED ⏭️

**Test Suite**: Access to Activity logs - Subsubspace

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Public Subsubspace activity logs of Private Space

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Public Subsubspace activity logs of Public Space

*No test cases found in this suite.*

---

#### space-activity-logs.it-spec.ts

**File**: `server-api/src/functional-api/activity-logs/space-activity-logs.it-spec.ts`

**Test Suite**: Activity logs - Space

Test Cases:
- should return only memberJoined
- should NOT return CALLOUT_PUBLISHED, when created
- should return MEMBER_JOINED, when user assigned from Admin or individually joined
- should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED ⏭️

**Test Suite**: Access to Activity logs - Space

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Private Space activity logs

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to Public Space activity logs

*No test cases found in this suite.*

---

#### callouts.it-spec.ts

**File**: `server-api/src/functional-api/callout/callouts.it-spec.ts`

**Test Suite**: Callouts - CRUD

Test Cases:
- should create callout on space coollaboration
- should update callout on space coollaboration
- should update callout visibility to Published
- should delete callout on space coollaboration
- should read only callout from specified group ⏭️

**Test Suite**: Callouts - AUTH Space

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user NO privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to update callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to delete callout

*No test cases found in this suite.*

**Test Suite**: Callouts - AUTH Subspace

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user NO privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to update callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to delete callout

*No test cases found in this suite.*

**Test Suite**: Callouts - AUTH Subsubspace

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user NO privileges to create callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to update callout

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to delete callout

*No test cases found in this suite.*

---

#### close-state-callouts.it-spec.ts

**File**: `server-api/src/functional-api/callout/lock-state/close-state-callouts.it-spec.ts`

**Test Suite**: Callouts - Close State

Test Cases:
- Close callout that has not been published
- Close callout that has been published

**Test Suite**: Callout - Close State - User Privileges Posts

*No test cases found in this suite.*

**Test Suite**: Send Comment to Post - Callout Close State 

*No test cases found in this suite.*

**Test Suite**: DDT Users sending messages to closed callout post

*No test cases found in this suite.*

**Test Suite**: Create Post - Callout Close State 

*No test cases found in this suite.*

**Test Suite**: DDT Users create post to closed callout

*No test cases found in this suite.*

**Test Suite**: Discussion Callout - Close State 

*No test cases found in this suite.*

**Test Suite**: DDT Users sending messages to closed discussion callout

*No test cases found in this suite.*

---

#### post-on-callout.it-spec.ts

**File**: `server-api/src/functional-api/callout/post/post-on-callout.it-spec.ts`

**Test Suite**: Posts - Create

Test Cases:
- HM should create post on space callout
- GA should create post on space callout without setting nameId
- NON-SM should NOT create post on space callout
- ChA should create post on subspace callout
- GA should create post on subsubspace callout

**Test Suite**: Posts - Update

Test Cases:
- HM should NOT update post created on space callout from GA
- NON-HM should NOT update post created on space callout from GA
- HA should update post created on space callout from GA
- GA should update post created on space callout from GA

**Test Suite**: Posts - Delete

Test Cases:
- HM should NOT delete post created on space callout from GA
- HM should delete post created on space callout from Himself
- HM should delete post created on space callout from EM
- NON-EM should NOT delete post created on space callout created from HM
- ChA should delete post created on subspace callout from GA
- HA should delete post created on subspace callout from ChA
- ChA should delete post created on subsubspace callout from OM
- ChM should not delete post created on subspace callout from ChA
- OM should delete own post on subsubspace callout
- GA should delete own post on subsubspace callout

**Test Suite**: Posts - Messages

*No test cases found in this suite.*

**Test Suite**: Send Message - Post created by GA on Space callout

Test Cases:
- ChA should send comment on post created on subspace callout from GA
- HM should send comment on post created on space callout from GA
- NON-HM should NOT send comment on post created on space callout from GA

**Test Suite**: Messages - GA Send/Remove flow

Test Cases:
- GA should send comment on post created on space callout from GA
- GA should remove comment on post created on space callout from GA

**Test Suite**: Delete Message - Post created by HM on Space callout

Test Cases:
- HM should NOT delete comment sent from GA
- NON-HM should NOT delete comment sent from GA
- GA should remove comment sent from GA
- HM should delete own comment

**Test Suite**: Posts - References

Test Cases:
- HM should NOT add reference to post created on space callout from GA
- NON-HM should NOT add reference to post created on space callout from GA

**Test Suite**: References - EA Create/Remove flow

Test Cases:
- HA should add reference to post created on space callout from GA
- HA should remove reference from post created EA

---

#### updates.it-spec.ts

**File**: `server-api/src/functional-api/communications/community-updates/updates.it-spec.ts`

**Test Suite**: Communities

*No test cases found in this suite.*

**Test Suite**: Community updates - read access

Test Cases:
- community updates - PRIVATE space - read access - sender / reader (member) / reader (not member)
- community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)

**Test Suite**: Community updates - create / delete

Test Cases:
- should create community update
- should delete community update

---

#### platform-discussions.it-spec.ts

**File**: `server-api/src/functional-api/communications/forum-discussions/platform-discussions.it-spec.ts`

**Test Suite**: Platform discussions - CRUD operations

Test Cases:
- Create discussion
- Delete discussion
- Update discussion

**Test Suite**: Discussion messages

Test Cases:
- Send message to discussion
- Create multiple messages in one discussion
- Delete message from discussion

**Test Suite**: Authorization - Discussion / Messages

*No test cases found in this suite.*

**Test Suite**: Discussions

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create / update platform discussions

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create / delete platform discussions

*No test cases found in this suite.*

**Test Suite**: Comments

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create / delete comments on discussion created from GA

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create / delete comments on discussion created from registered user

*No test cases found in this suite.*

---

#### reactions.it-spec.ts

**File**: `server-api/src/functional-api/communications/reactions/reactions.it-spec.ts`

**Test Suite**: Reaction - Discussion messages

Test Cases:
- React on own message
- React on other user message
- Add multiple reaction to a message
- Should fail to add same reaction twice to a message
- Remove reaction on own message
- Remove reaction added by other user on own message

---

#### reply.it-spec.ts

**File**: `server-api/src/functional-api/communications/replies/reply.it-spec.ts`

**Test Suite**: Reply - Discussion messages

Test Cases:
- Reply to own message
- Reply to message created by other user
- Should fail to delete message, when user raplied to a thread has been removed
- User replaying to other user message fail to delete the other user message
- Replies should not be deleted, when main message is removed
- Removing reply, removes reaction related to it

---

#### configuration.it-spec.ts

**File**: `server-api/src/functional-api/configuration/configuration.it-spec.ts`

**Test Suite**: Platform configuration

*No test cases found in this suite.*

**Test Suite**: Platform configuration can be loaded and defaults are OK

Test Cases:
- Full configuration defaults to be same as the one on alkemio.yml.  🎯

---

#### ai-persona-engine-types.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/ai-persona-model-card/ai-persona-engine-types.it-spec.ts`

**Test Suite**: AI Persona Engine Types Model Card

Test Cases:
- should create virtual contributors with different engine types
- should have correct engine type in each model card
- should have different model card information for different engines
- should have different monitoring data for different engines
- should have model card for registered user access

---

#### ai-persona-model-card.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/ai-persona-model-card/ai-persona-model-card.it-spec.ts`

**Test Suite**: AI Persona Model Card

Test Cases:
- should create a virtual contributor with a model card
- should have correct space usage data in model card
- should have correct AI engine data in model card
- should have correct monitoring data in model card

---

#### organization-owner.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/organization/organization-owner.it-spec.ts`

**Test Suite**: Organization Owner

Test Cases:
- should create organization owner
- should add same user as owner of 2 organization
- should remove user owner from organization
- should not remove the only owner of an organization
- should not return user credentials for removing user not owner of an Organization
- should not result in additional credential for assigning same organization owner twice

---

#### organization-settings.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/organization/organization-settings.it-spec.ts`

**Test Suite**: Organization settings

*No test cases found in this suite.*

**Test Suite**: DDT user WITH privileges to update organization settings

*No test cases found in this suite.*

**Test Suite**: DDT user WITHOUT privileges to update organization settings

*No test cases found in this suite.*

**Test Suite**: Unverified organization - domain match

Test Cases:
- don
- don
- don

**Test Suite**: Verified organization - domain match

Test Cases:
- assign new user to organization,domain setting enabled
- don
- don

---

#### organization-verification.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/organization/organization-verification.it-spec.ts`

**Test Suite**: Organization verification status

*No test cases found in this suite.*

---

#### organization.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/organization/organization.it-spec.ts`

**Test Suite**: Organization

*No test cases found in this suite.*

**Test Suite**: create

Test Cases:
- should create
- should FAIL on breaking unique nameID
- should FAIL on breaking unique displayName

**Test Suite**: update

Test Cases:
- should update
- should FAIL on breaking unique displayName

**Test Suite**: delete

Test Cases:
- should delete
- should FAIL on unknown id

---

#### create-user.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/user/create-user.it-spec.ts`

**Test Suite**: Create User

Test Cases:
- should create a user
- should throw error - same user is created twice
- should query created user
- should throw error - create user with LONG NAME
- should throw error - create user with invalid email

---

#### delete-user.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/user/delete-user.it-spec.ts`

**Test Suite**: Delete user

Test Cases:
- should delete created user
- should receive a message for deleting already deleted user
- should receive a message for deleting unexisting user
- should not get result for quering deleted user

---

#### update-user.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/user/update-user.it-spec.ts`

**Test Suite**: Update user

Test Cases:
- should update user 
- should update user 
- should update user and be available in 

---

#### knowledge-base-access.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/virtual-contributor/knowledge-base-access.it-spec.ts`

**Test Suite**: Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public

*No test cases found in this suite.*

**Test Suite**: VC knowledge privileges

*No test cases found in this suite.*

**Test Suite**: VC knowledge base calloutSet

*No test cases found in this suite.*

**Test Suite**: VC knowledge base storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Private / BoK / Private

*No test cases found in this suite.*

**Test Suite**: VC knowledge privileges

*No test cases found in this suite.*

**Test Suite**: VC knowledge base calloutSet

*No test cases found in this suite.*

**Test Suite**: VC knowledge base storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Private / BoK / Public

*No test cases found in this suite.*

**Test Suite**: VC knowledge privileges

*No test cases found in this suite.*

**Test Suite**: VC knowledge base calloutSet

*No test cases found in this suite.*

**Test Suite**: VC knowledge base storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Public / BoK / Private

*No test cases found in this suite.*

**Test Suite**: VC knowledge privileges

*No test cases found in this suite.*

**Test Suite**: VC knowledge base calloutSet

*No test cases found in this suite.*

**Test Suite**: VC knowledge base storageBucket

*No test cases found in this suite.*

---

#### vc-access.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/virtual-contributor/vc-access.it-spec.ts`

**Test Suite**: Virtual Contributor ACCESS - All Public - Visibility Public / BoK / Public

*No test cases found in this suite.*

**Test Suite**: Virtual contributor

*No test cases found in this suite.*

**Test Suite**: VC storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Private / BoK / Private

*No test cases found in this suite.*

**Test Suite**: Virtualcontributor 

*No test cases found in this suite.*

**Test Suite**: VC storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Private / BoK / Public

*No test cases found in this suite.*

**Test Suite**: Virtualcontributor 

*No test cases found in this suite.*

**Test Suite**: VC storageBucket

*No test cases found in this suite.*

**Test Suite**: Virtual Contributor Access - All Private - Visibility Public / BoK / Private

*No test cases found in this suite.*

**Test Suite**: Virtualcontributor 

*No test cases found in this suite.*

**Test Suite**: VC storageBucket

*No test cases found in this suite.*

---

#### vc.it-spec.ts

**File**: `server-api/src/functional-api/contributor-management/virtual-contributor/vc.it-spec.ts`

**Test Suite**: Virtual Contributor

Test Cases:
- should not delete user who hosts an account
- should return invitations after virtual contributor is removed
- query virtual contributor data

---

#### innovation-packs-functional-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/innovation-packs-functional-entitlements.it-spec.ts`

**Test Suite**: Functional tests - Innovation Pack

*No test cases found in this suite.*

**Test Suite**: VC Campaign user innovation pack creation

Test Cases:
- Create a innovation pack over the license limit

---

#### licenses-functional-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/licenses-functional-entitlements.it-spec.ts`

**Test Suite**: Functional tests - licenses updates

*No test cases found in this suite.*

**Test Suite**: Space licenses

Test Cases:
- Add License Plus to space

---

#### organization-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/organization-entitlements.it-spec.ts`

**Test Suite**: Get Organization Account Authorization and License privileges 

Test Cases:
- No licenses assigned
- User admin of Organization with accountLicensesPlus assigned

**Test Suite**: Account license plus cleanup

Test Cases:
- User admin of Organization with accountLicensesPlus assigned and created Space, VC and Innovation Pack

---

#### space-functional-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/space-functional-entitlements.it-spec.ts`

**Test Suite**: Functional tests - Space

*No test cases found in this suite.*

**Test Suite**: VC Campaign user space creation

Test Cases:
- Create a space over the license limit
- Create a space after third over the license limit was removed

---

#### user-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/user-entitlements.it-spec.ts`

**Test Suite**: Get User Account Authorization and License privileges 

Test Cases:
- No licenses assigned
- VC campaign licenses assigned

**Test Suite**: VC campaign Licenses cleanup

Test Cases:
- User with VC campaign licenses assigned and created Space, VC and Innovation Pack
- Beta tester licenses assigned

**Test Suite**: BetaTested Licenses cleanup

Test Cases:
- User with Beta tester licenses assigned and created Space, VC and Innovation Pack

---

#### vc-functional-entitlements.it-spec.ts

**File**: `server-api/src/functional-api/entitlements/vc-functional-entitlements.it-spec.ts`

**Test Suite**: Functional tests - VC

*No test cases found in this suite.*

**Test Suite**: VC Campaign user vc creation

Test Cases:
- Create a vc over the license limit

---

#### innovation-pack.it-spec.ts

**File**: `server-api/src/functional-api/innovation-pack/innovation-pack.it-spec.ts`

**Test Suite**: Organization

*No test cases found in this suite.*

**Test Suite**: Innovation pack library

Test Cases:
- Create

---

#### convert-L1-to-L0-basic.it-spec.ts

**File**: `server-api/src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts`

**Test Suite**: Promoting of L1 subspace

Test Cases:
- Conversion Subspace L1 to Space L0 - basic scenario

---

#### convert-L1-to-L0-with-L2-to-L1.it-spec.ts

**File**: `server-api/src/functional-api/journey/conversion/convert-L1-to-L0-with-L2-to-L1.it-spec.ts`

**Test Suite**: Promoting of L1 subspace

Test Cases:
- Conversion Subspace L1 to Space L0 together with L2 to L1

---

#### convert-L1-to-L0.it-spec.ts

**File**: `server-api/src/functional-api/journey/conversion/convert-L1-to-L0.it-spec.ts`

**Test Suite**: Promoting of L1 subspace

Test Cases:
- Conversion Subspace L1 to Space L0 with application and invitation to the subspace 🎯

---

#### convert-L2-to-L1.it-spec.ts

**File**: `server-api/src/functional-api/journey/conversion/convert-L2-to-L1.it-spec.ts`

**Test Suite**: Promoting of L2 subspace

Test Cases:
- Conversion Subspace L2 to Space L1

---

#### space-platform-settings.it-spec.ts

**File**: `server-api/src/functional-api/journey/space/space-platform-settings.it-spec.ts`

**Test Suite**: Update space platform settings

*No test cases found in this suite.*

**Test Suite**: Update space settings - functional

Test Cases:
- Update space settings

**Test Suite**: Authorization - Update space platform settings

*No test cases found in this suite.*

**Test Suite**: DDT role access to private Space

*No test cases found in this suite.*

**Test Suite**: DDT role access to public Space

*No test cases found in this suite.*

---

#### space.it-spec.ts

**File**: `server-api/src/functional-api/journey/space/space.it-spec.ts`

**Test Suite**: Space entity

Test Cases:
- should create space
- should update space nameId
- should not update space nameId
- should remove space

---

#### create-subspace.it-spec.ts

**File**: `server-api/src/functional-api/journey/subspace/create-subspace.it-spec.ts`

**Test Suite**: Create subspace

Test Cases:
- should create a successfull subspace
- should remove a subspace
- should create 2 subspaces with different names and nameIDs ⏭️

**Test Suite**: DDT invalid NameID

*No test cases found in this suite.*

---

#### flows-subspace.it-spec.ts

**File**: `server-api/src/functional-api/journey/subspace/flows-subspace.it-spec.ts`

**Test Suite**: Flows subspace

Test Cases:
- should not result unassigned users to a subspace ⏭️
- should  modify subspace name to allready existing subspace name and/or textId
- should creating 2 subspaces with same name
- should throw error - creating 2 subspaces with different name and same nameId

---

#### query-subspace-data.it-spec.ts

**File**: `server-api/src/functional-api/journey/subspace/query-subspace-data.it-spec.ts`

**Test Suite**: Query Subspace data

Test Cases:
- should query community through subspace
- should query subsubspace through subspace
- should create subsubspace and query the data
- should update a subspace

---

#### subsubspace.it-spec.ts

**File**: `server-api/src/functional-api/journey/subsubspace/subsubspace.it-spec.ts`

**Test Suite**: Opportunities

Test Cases:
- should create subsubspace and query the data
- should update subsubspace and query the data
- should remove subsubspace and query the data
- should throw an error for creating subsubspace with same name/NameId on different subspaces

**Test Suite**: DDT should not create opportunities with same nameID within the same subspace

*No test cases found in this suite.*

---

#### subsubspace_authorization.it-spec.ts

**File**: `server-api/src/functional-api/journey/subsubspace/subsubspace_authorization.it-spec.ts`

**Test Suite**: Subsubspace Admin

Test Cases:
- should create subsubspace admin
- should add same user as admin of 2 opportunities
- should be able one subsubspace admin to remove another admin from subsubspace
- should remove the only admin of an subsubspace

---

#### mention-organization.it-spec.ts

**File**: `server-api/src/functional-api/notifications/organization/mention-organization.it-spec.ts`

**Test Suite**: Notifications - Mention Organization

*No test cases found in this suite.*

**Test Suite**: Callout discussion

Test Cases:
- GA mention Organization in Space comments callout - 2 notification to Organization admins are sent 🎯
- HM mention Organization in Space comments callout - 2 notification to Organization admins are sent
- GA mention Organization in Subspace comments callout - 2 notification to Organization admins are sent
- GA mention Organization in Subsubspace comments callout - 2 notification to Organization admins are sent

**Test Suite**: Post comment

Test Cases:
- HA mention Organization in Space post - 2 notification to Organization admins are sent
- HA mention Organization in Subsubspace post (preference disabled) - 2 notification to Organization admins are sent
- OA mention HM in Subsubspace post - 1 notification to HM is sent

---

#### user-to-organization.it-spec.ts

**File**: `server-api/src/functional-api/notifications/organization/user-to-organization.it-spec.ts`

**Test Suite**: Notifications - user to organization messages

Test Cases:
- User 
- User 
- User 

---

#### forum-discussions.it-spec.ts

**File**: `server-api/src/functional-api/notifications/platform/forum-discussions.it-spec.ts`

**Test Suite**: Notifications - forum discussions

Test Cases:
- GA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications
- QA create forum discussion - GA(1), QA(1), GHA(1), HM(1) get notifications

**Test Suite**: Notifications - forum discussions comment

Test Cases:
- GA send comment to own forum discussion - GA(1) get notifications
- GA send comment to forum discussion created by QA - QA(1) get notifications
- QA send comment to own forum discussion - QA(1) get notifications
- QA send comment to forum discussion created by GA - GA(1) get notifications

**Test Suite**: Notifications - forum discussions comments reply

Test Cases:
- GA reply to own comment of own forum discussion - GA(1) get notifications
- GA reply to other comment to forum discussion created by QA - QA(1) get notifications
- QA reply to own comment of own forum discussion - QA(1) get notifications
- QA reply to other comment to forum discussion created by GA - GA(1) get notifications

**Test Suite**: Notifications - no notifications triggered

Test Cases:
- GA create forum discussion - no one get notifications
- QA create forum discussion - no one get notifications
- GA send comment to own forum discussion - no notifications
- GA reply to won comment of forum discussion created by QA - no notifications
- GA send comment to own forum discussion - no notifications
- GA reply to comment of forum discussion created by QA - no notifications

---

#### registration.it-spec.ts

**File**: `server-api/src/functional-api/notifications/platform/registration.it-spec.ts`

**Test Suite**: Notifications - User registration

Test Cases:
- User sign up - GA(1), SA(1), New User(1) get notifications
- User sign up - GA(0), New User(1) get notifications

**Test Suite**: Notifications - User removal

Test Cases:
- User removed - GA(1) get notifications

---

#### space-creation.it-spec.ts

**File**: `server-api/src/functional-api/notifications/platform/space-creation.it-spec.ts`

**Test Suite**: Notifications - Space creation

Test Cases:
- Space created - GA(1), LA(1), SA(1) get notifications
- Space created - GA(0), SA(0) - no admin notifications
- Space created - Only GA(1) gets notifications

---

#### callout-comments.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/callout-comments.it-spec.ts`

**Test Suite**: Notifications - callout comments

Test Cases:
- GA create space callout comment - HM(7) get notifications
- HA create space callout comment - HM(7) get notifications
- HA create subspace callout comment - HM(5),  get notifications
- OM create subsubspace callout comment - HM(3), get notifications
- OA create subsubspace callout comment - 0 notifications - all roles with notifications disabled

---

#### callouts.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/callouts.it-spec.ts`

**Test Suite**: Notifications - post

Test Cases:
- GA PUBLISH space callout - HM(7) get notifications
- GA PUBLISH space callout with 
- GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED space callout - HM(7) get notifications on PUBLISH event only
- HA create PUBLISHED space callout type: POST - HM(7) get notifications
- HA create PUBLISHED space callout type: WHITEBOARD - HM(7) get notifications ⏭️
- HA create PUBLISHED subspace callout type: POST - CM(5) get notifications
- HA create PUBLISHED subspace callout type: POST with 
- OA create PUBLISHED subsubspace callout type: POST - OM(4) get notifications
- OA create PUBLISHED subsubspace callout type: POST with 
- OA create PUBLISHED subsubspace callout type: POST - 0 notifications - all roles with notifications disabled

---

#### community-updates.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/community-updates.it-spec.ts`

**Test Suite**: Notifications - updates

Test Cases:
- GA create space update - GA(1), HA (1), HM(6) get notifications
- HA create space update - GA(1), HA (1), HM(6) get notifications
- CA create subspace update - GA(1), HA (1), CA(1), CM(3),  get notifications
- OA create subsubspace update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications
- OA create subsubspace update - 0 notifications - all roles with notifications disabled

---

#### post-contribution.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/post-contribution.it-spec.ts`

**Test Suite**: Notifications - post

Test Cases:
- GA create space post - GA(1), HA (2), HM(6) get notifications
- HA create space post - GA(1), HA (1), HM(6) get notifications
- HA create subspace post - GA(1), HA (1), CA(1), CM(3),  get notifications
- OM create subsubspace post - HA(2), CA(1), OA(2), OM(4), get notifications
- OA create subsubspace post - 0 notifications - all roles with notifications disabled

---

#### posts-comment.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/posts-comment.it-spec.ts`

**Test Suite**: Notifications - post comments

*No test cases found in this suite.*

**Test Suite**: GA create post on space  

Test Cases:
- GA create comment - GA(1) get notifications
- HM create comment - GA(1) get notifications

**Test Suite**: HM create post on space  

Test Cases:
- HM create comment - HM(1) get notifications
- HA create comment - HM(1) get notifications

**Test Suite**: CM create post on subspace  

Test Cases:
- CM create comment - CM(1) get notifications
- CA create comment - CM(1) get notifications

**Test Suite**: OM create post on subsubspace  

Test Cases:
- OM create comment - OM(1) get notifications
- CA create comment - OM(1) get notifications
- OA create post on subsubspace and comment - 0 notifications - all roles with notifications disabled

---

#### wb-contributions.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/collaboration/wb-contributions.it-spec.ts`

**Test Suite**: Notifications - whiteboard

Test Cases:
- GA create space whiteboard - GA(1), HA (2), HM(6) get notifications
- HA create space whiteboard - GA(1), HA (1), HM(6) get notifications
- HA create subspace whiteboard - GA(1), HA (1), CA(1), CM(3),  get notifications
- OM create subsubspace whiteboard - HA(2), CA(1), OA(2), OM(4), get notifications
- OA create subsubspace whiteboard - 0 notifications - all roles with notifications disabled

---

#### user-to-community-leads-challenge.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/communication/user-to-community-leads-challenge.it-spec.ts`

**Test Suite**: Notifications - send messages to Private Space, Public Subspace Community Leads

Test Cases:
- NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent
- Space member send message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent

**Test Suite**: Notifications - send messages to Private Space, Private Subspace Community Leads

Test Cases:
- NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent
- Subspace member send message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent

**Test Suite**: Notifications - send messages to Private Space, Public Subspace NO Community Leads

Test Cases:
- NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 0 messages sent

---

#### user-to-community-leads-hub.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/communication/user-to-community-leads-hub.it-spec.ts`

**Test Suite**: Notifications - send messages to Private space hosts

*No test cases found in this suite.*

**Test Suite**: Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)

Test Cases:
- NOT space member sends message to Space community (2 hosts) - 3 messages sent
- Space member send message to Space community (2 hosts) - 3 messages sent

**Test Suite**: Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)

Test Cases:
- NOT space member sends message to Space community (2 hosts) - 0 messages sent
- Space member send message to Space community (2 hosts) - 0 messages sent

**Test Suite**: Notifications - messages to Public space hosts

*No test cases found in this suite.*

**Test Suite**: Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)

Test Cases:
- NOT space member sends message to Space community (2 hosts) - 3 messages sent
- Space member send message to Space community (2 hosts) - 3 messages sent

**Test Suite**: Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)

Test Cases:
- NOT space member sends message to Space community (2 hosts) - 0 messages sent
- Space member send message to Space community (2 hosts) - 0 messages sent

**Test Suite**: Notifications - messages to Public space NO hosts

Test Cases:
- NOT space member sends message to Space community (0 hosts) - 0 messages sent
- Space member send message to Space community (0 hosts) - 0 messages sent

---

#### user-to-community-leads-opportunity.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/communication/user-to-community-leads-opportunity.it-spec.ts`

**Test Suite**: Notifications - send messages to Private Space, Subsubspace Community Leads

Test Cases:
- NOT space member sends message to Subsubspace community (2 User Leads, 1 Org Lead) - 3 messages sent
- Subsubspace member send message to Subsubspace community (2 User Leads, 1 Org Lead) - 3 messages sent

**Test Suite**: Notifications - send messages to Private Space, Public Subspace, Subsubspace with NO Community Leads

Test Cases:
- NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 0 messages sent

---

#### application.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/community/application.it-spec.ts`

**Test Suite**: Notifications - applications

Test Cases:
- receive notification for non space user application to space- GA, EA and Applicant
- receive notification for non space user application to subspace- GA, EA, CA and Applicant
- no notification for non space user application to space- GA, EA and Applicant

---

#### external-invitations.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/community/external-invitations.it-spec.ts`

**Test Suite**: Notifications - invitations

Test Cases:
- external user receive notifications
- external user receive notifications from subspace

---

#### invitations.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/community/invitations.it-spec.ts`

**Test Suite**: Notifications - invitations

Test Cases:
- non space user receive invitation for SPACE community from space admin
- non space user receive invitation for SPACE community from subspace admin
- non space user receive invitation for CHALLENGE community from subspace admin
- non space user don
- space member receive invitation for CHALLENGE community from subsubspace admin
- non space user receive invitation for OPPORTUNITY community from subsubspace admin
- non space user doesn
- non space user doesn

---

#### join-community.it-spec.ts

**File**: `server-api/src/functional-api/notifications/space/community/join-community.it-spec.ts`

**Test Suite**: Notifications - member join community

Test Cases:
- Non-space member join a Space - GA, HA and Joiner receive notifications
- Non-space member join a Subspace - GA, HA, CA and Joiner receive notifications
- Admin adds user to Space community - GA, HA and Joiner receive notifications
- no notification when Non-space member cannot join a Space - GA, EA and Joiner

---

#### mention-user.it-spec.ts

**File**: `server-api/src/functional-api/notifications/user/mention-user.it-spec.ts`

**Test Suite**: Notifications - Mention User

*No test cases found in this suite.*

**Test Suite**: Callout discussion

Test Cases:
- GA mention HM in Space comments callout - 1 notification to HM is sent
- HM mention Non Space member in Space comments callout - 1 notification to NonHM is sent
- HM mention Non Space member and Space Admin in Space comments callout - 2 notification to NonHM and HA is sent
- Non Space member mention HM in Space comments callout - 0 notification to HM is sent
- GA mention HM in Subspace comments callout - 1 notification to HM is sent
- GA mention HM in Subsubspace comments callout - 1 notification to HM is sent

**Test Suite**: Post comment

Test Cases:
- HA mention HM in Space post - 1 notification to HM is sent
- CA mention HM in Subspace post - 1 notification to HM is sent
- OA mention HM in Subsubspace post - 1 notification to HM is sent
- OA mention HM in Subsubspace post (preference disabled) - 0 notification to HM is sent
- OA mention HM in Subsubspace post - 1 notification to HM is sent

---

#### user-to-user.it-spec.ts

**File**: `server-api/src/functional-api/notifications/user/user-to-user.it-spec.ts`

**Test Suite**: Notifications - user to user messages

Test Cases:
- User 
- User 
- User 
- User 
- User 

---

#### organization.it-spec.ts

**File**: `server-api/src/functional-api/pagination/organization.it-spec.ts`

**Test Suite**: Pagination - organization

Test Cases:
- query filtered organization and verify data

**Test Suite**: Pagination with filter

*No test cases found in this suite.*

**Test Suite**: Pagination without filter

Test Cases:
- query organization with parameter: first: 
- query organization with parameter: first: 
- query organization with parameter: first: 
- query organization with parameter: first: 
- query organization with parameter: first: 

**Test Suite**: Invalid pagination queries

*No test cases found in this suite.*

---

#### user.it-spec.ts

**File**: `server-api/src/functional-api/pagination/user.it-spec.ts`

**Test Suite**: Pagination - user

Test Cases:
- query filtered user and verify data

**Test Suite**: Pagination with filter

*No test cases found in this suite.*

**Test Suite**: Pagination without filter

Test Cases:
- query users with parameter: first: 
- query users with parameter: first: 
- query users with parameter: first: 
- query users with parameter: first: 
- query users with parameter: first: 
- query users with parameter: first: 

**Test Suite**: Invalid pagination queries

*No test cases found in this suite.*

---

#### application-lifecycle.it-spec.ts

**File**: `server-api/src/functional-api/roleset/application/application-lifecycle.it-spec.ts`

**Test Suite**: Lifecycle

*No test cases found in this suite.*

**Test Suite**: Update application entity state - positive path - REJECT

*No test cases found in this suite.*

---

#### application.it-spec.ts

**File**: `server-api/src/functional-api/roleset/application/application.it-spec.ts`

**Test Suite**: Application

Test Cases:
- should create application
- should create space application, when previous was REJECTED and ARCHIVED
- should throw error for creating the same application twice
- should remove application
- should throw error for APPROVING subspace application, when user is not space member ⏭️
- User should not be able to approve own application
- should return applications after user is removed

**Test Suite**: Application-flows

Test Cases:
- should create application on subspace
- should return correct membershipUser applications
- should return updated membershipUser applications
- should approve subspace application, when space application is APPROVED and applications are allowed
- should be able to remove subspace application, when space application is removed

---

#### invitation-contributors.it-spec.ts

**File**: `server-api/src/functional-api/roleset/invitations/invitation-contributors.it-spec.ts`

**Test Suite**: Invitations

Test Cases:
- should create invitation
- should create space invitation, when previous was REJECTED and ARCHIVED
- should remove invitation
- should throw error for quering not existing invitation ⏭️
- should throw error for creating the same invitation twice
- should return invitations after user is removed

**Test Suite**: Invitations-flows

Test Cases:
- invitee is able to ACCEPT EXTRA ROLES invitation and access space data
- invitee is able to ACCEPT invitation and access space data
- invitee is able to REJECT and ARCHIVE invitation: no access to space data
- should throw error, when sending invitation to a member
- should fail to send invitation, when user has active application
- User with received invitation, cannot apply to the community

**Test Suite**: Invitations - Authorization

*No test cases found in this suite.*

**Test Suite**: DDT rights to change invitation state

*No test cases found in this suite.*

**Test Suite**: DDT users with rights to create invitation

*No test cases found in this suite.*

**Test Suite**: DDT users with NO rights to create invitation

*No test cases found in this suite.*

---

#### invitation-external.it-spec.ts

**File**: `server-api/src/functional-api/roleset/invitations/invitation-external.it-spec.ts`

**Test Suite**: Invitations

Test Cases:
- should create external invitation
- should fail to create second external invitation from same community to same user
- should create second external invitation from same community to same user, after the first is deleted
- should create second external invitation from different community to same user

---

#### organization-edge.it-spec.ts

**File**: `server-api/src/functional-api/roleset/organization/organization-edge.it-spec.ts`

**Test Suite**: Assign / Remove organization to community

*No test cases found in this suite.*

**Test Suite**: Assign organizations

*No test cases found in this suite.*

**Test Suite**: Assign same organization as member to same community

Test Cases:
- Error is thrown for Space
- Error is thrown for Subspace
- Error is thrown for Subsubspace

**Test Suite**: Assign different organization as member to same community

Test Cases:
- Successfully assigned to Space
- Successfully assigned to Subspace
- Successfully assigned to Subsubspace

**Test Suite**: Assign same organization as lead to same community

Test Cases:
- Error is thrown for Space
- Error is thrown for Subspace
- Error is thrown for Subsubspace

**Test Suite**: Assign different organizations as lead to same community

Test Cases:
- Error is thrown for Space ⏭️
- Two organizations assinged to Subspace
- Two organizations assinged to Subsubspace

---

#### organization.it-spec.ts

**File**: `server-api/src/functional-api/roleset/organization/organization.it-spec.ts`

**Test Suite**: Assign / Remove organization to community

*No test cases found in this suite.*

**Test Suite**: Assign organization

Test Cases:
- Assign organization as member to space
- Assign organization as member to subspace
- Assign organization as member to subsubspace
- Assign organization as lead to space
- Assign organization as lead to subspace
- Assign organization as lead to subsubspace

**Test Suite**: Remove organization

Test Cases:
- Remove organization as member from subsubspace
- Remove organization as member from subspace
- Remove organization as member from space
- Remove organization as lead from subsubspace
- Remove organization as lead from subspace
- Remove organization as lead from space

---

#### organization2.it-spec.ts

**File**: `server-api/src/functional-api/roleset/organization/organization2.it-spec.ts`

**Test Suite**: Organization role

Test Cases:
- Organization role - assignment to 1 Organization, Space, Subspace, Subsubspace

---

#### user-edge.it-spec.ts

**File**: `server-api/src/functional-api/roleset/user/user-edge.it-spec.ts`

**Test Suite**: Assign / Remove users to community

*No test cases found in this suite.*

**Test Suite**: Assign users

*No test cases found in this suite.*

**Test Suite**: Assign same user as member to same community

Test Cases:
- Does not have any effect in Space
- Does not have any effect in Subspace
- Does not have any effect in Subsubspace

**Test Suite**: Assign different users as member to same community

Test Cases:
- Successfully assigned to Space
- Successfully assigned to Subspace
- Successfully assigned to Subsubspace

**Test Suite**: Assign same user as lead to same community

Test Cases:
- Does not have any effect in Space
- Does not have any effect in Subspace
- Does not have any effect in Subsubspace

---

#### user-edge2.it-spec.ts

**File**: `server-api/src/functional-api/roleset/user/user-edge2.it-spec.ts`

**Test Suite**: Assign / Remove leads to community

*No test cases found in this suite.*

**Test Suite**: Assign different users as lead to same community

Test Cases:
- Should assign second user as Space lead
- Should throw error for assigning third user as Space lead
- Should assign second user as Subspace lead
- Should throw error for assigning third user as Subspace lead
- Should assign second user as Subsubspace lead
- Should throw error for assigning third user as Subspace lead

---

#### user.authorization.it-spec.ts

**File**: `server-api/src/functional-api/roleset/user/user.authorization.it-spec.ts`

**Test Suite**: Verify ROLESET_ENTRY_ROLE_ASSIGN privilege

*No test cases found in this suite.*

**Test Suite**: DDT role privilege to assign member to space

*No test cases found in this suite.*

**Test Suite**: DDT role privilege to assign member to subspace

*No test cases found in this suite.*

**Test Suite**: DDT role privilege to assign member to subsubspace

*No test cases found in this suite.*

---

#### user.it-spec.ts

**File**: `server-api/src/functional-api/roleset/user/user.it-spec.ts`

**Test Suite**: Assign / Remove users to community

*No test cases found in this suite.*

**Test Suite**: Assign users

Test Cases:
- Assign user as member to space
- Assign user as member to subspace
- Assign user as member to subsubspace
- Assign user as lead to space
- Assign user as lead to subspace
- Assign user as lead to subsubspace

**Test Suite**: Remove users

Test Cases:
- Remove user as lead from subsubspace
- Remove user as lead from subspace
- Remove user as lead from space
- Remove user as member from subsubspace
- Remove user as member from subspace
- Remove user as member from space

**Test Suite**: Available users

*No test cases found in this suite.*

**Test Suite**: Space available users

Test Cases:
- Available members
- Available leads

**Test Suite**: Subspace available users

Test Cases:
- Available members
- Available leads

**Test Suite**: Subsubspace available users

Test Cases:
- Available members
- Available leads

---

#### user2.it-spec.ts

**File**: `server-api/src/functional-api/roleset/user/user2.it-spec.ts`

**Test Suite**: User roles

Test Cases:
- user role - assignment to 1 Organization, Space, Subspace, Subsubspace

**Test Suite**: Extended scenario

Test Cases:
- user role - assignment to 2 Organizations, Spaces, Subspaces, Opportunities

---

#### search.it-spec.ts

**File**: `server-api/src/functional-api/search/search.it-spec.ts`

**Test Suite**: Search

*No test cases found in this suite.*

**Test Suite**: Search types

Test Cases:
- should search CONTRIBUTOR data
- should search JOURNEY data
- should search CONTRIBUTION data
- should search with all filters applied
- should search by full user name
- should search with common word filter applied
- should search with location filter applied for all entities
- should search without filters ⏭️
- should search term users only

**Test Suite**: Search negative scenarios

Test Cases:
- should throw limit error for too many terms
- should throw error for empty string search ⏭️
- should not return any results for invalid term

**Test Suite**: Search filtered Space Data

Test Cases:
- should search JOURNEY data filtered space ⏭️
- should search JOURNEY data filtered empty space

**Test Suite**: Search Archived Space Data

Test Cases:
- GA get results for archived spaces

**Test Suite**: Search Public Space Private Subspace Data

*No test cases found in this suite.*

**Test Suite**: Search Private Space Private Subspace Data

*No test cases found in this suite.*

---

#### organization-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/organization-document-auth.it-spec.ts`

**Test Suite**: Organization - documents

*No test cases found in this suite.*

**Test Suite**: Access to Organization Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Organization Profile reference document

*No test cases found in this suite.*

**Test Suite**: Access to Organization storage bucket

*No test cases found in this suite.*

---

#### private-space-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/private-space-document-auth.it-spec.ts`

**Test Suite**: Private Space - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### private-space-private-ch-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/private-space-private-ch-document-auth.it-spec.ts`

**Test Suite**: Private Space - Private Subspace - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### private-space-public-ch-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/private-space-public-ch-document-auth.it-spec.ts`

**Test Suite**: Private Space - Public Subspace - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### public-space-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/public-space-document-auth.it-spec.ts`

**Test Suite**: Public Space - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### public-space-private-ch-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/public-space-private-ch-document-auth.it-spec.ts`

**Test Suite**: Public Space - Private Subspace - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### public-space-public-ch-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/public-space-public-ch-document-auth.it-spec.ts`

**Test Suite**: Public Space - Public Subspace - visual on profile

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to Space Profile reference

*No test cases found in this suite.*

**Test Suite**: Access to Space About (space storage)

*No test cases found in this suite.*

**Test Suite**: Access to Link collections

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Post Card reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Whitaboards Whiteboard visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout reference documents

*No test cases found in this suite.*

**Test Suite**: Access to Call for Posts Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to Whiteboard Callout visual(banner) documents

*No test cases found in this suite.*

**Test Suite**: Access to WhiteboardRt Callout visual(banner) documents

*No test cases found in this suite.*

---

#### user-document-auth.it-spec.ts

**File**: `server-api/src/functional-api/storage/auth/user-document-auth.it-spec.ts`

**Test Suite**: User - documents

*No test cases found in this suite.*

**Test Suite**: Access to User Profile visual

*No test cases found in this suite.*

**Test Suite**: Access to User Profile reference document

*No test cases found in this suite.*

**Test Suite**: Access to User storage bucket

*No test cases found in this suite.*

---

#### uploads.it-spec.ts

**File**: `server-api/src/functional-api/storage/uploads.it-spec.ts`

**Test Suite**: Upload document

*No test cases found in this suite.*

**Test Suite**: DDT upload all file types

Test Cases:
- DDT upload all file types
- upload same file twice
- delete pdf file
- read uploaded file
- fail to read file after document deletion
- read uploaded file after related reference is removed
- read uploaded file ⏭️
- fail to read file after document deletion ⏭️
- read uploaded file after related reference is removed ⏭️
- upload file bigger than 15 MB
- fail to upload .sql file
- file is available after releted reference is deleted

**Test Suite**: Upload visual tests

Test Cases:
- upload visual
- upload same visual twice
- should not upload unsupported file type
- read uploaded visual
- read uploaded visual ⏭️

**Test Suite**: Upload visual to innovation space

Test Cases:
- upload visual

---

#### aspect-comments.it-spec.ts

**File**: `server-api/src/functional-api/subscriptions/aspect-comments.it-spec.ts`

**Test Suite**: Post comments subscription

*No test cases found in this suite.*

**Test Suite**: Space comments subscription 

Test Cases:
- receives message after new comment is created - 3 sender / 3 receivers

**Test Suite**: Subspace comments subscription 

Test Cases:
- receives message after new comment is created - 3 sender / 3 receivers

**Test Suite**: Subsubspace comments subscription 

Test Cases:
- receives message after new comment is created - 3 sender / 3 receivers

---

#### create-subspace.it-spec.ts

**File**: `server-api/src/functional-api/subscriptions/create-subspace.it-spec.ts`

**Test Suite**: Create subspace subscription

Test Cases:
- receive newly created subspaces

---

#### create-subsubspace.it-spec.ts

**File**: `server-api/src/functional-api/subscriptions/create-subsubspace.it-spec.ts`

**Test Suite**: Create subsubspace subscription

Test Cases:
- receive newly created opportunities

---

#### post-templates.it-spec.ts

**File**: `server-api/src/functional-api/templates/post/post-templates.it-spec.ts`

**Test Suite**: Post templates - CRUD

Test Cases:
- Create Post template
- Update Post template
- Delete Post template

**Test Suite**: Post templates - Utilization in posts

*No test cases found in this suite.*

**Test Suite**: Create post on all entities with newly created postTemplate

Test Cases:
- Create Post on Space
- Create Post on Subspace
- Create Post on Subsubspace

**Test Suite**: Update Post template already utilized by an post

Test Cases:
- Create post with existing post template, and update template defaultDescription, doesnt change the post description
- Update post to use the new post template type

**Test Suite**: Remove Post template already utilized by an post

Test Cases:
- Create post with existing post template, and remove the post template, doesnt change the post

**Test Suite**: Post templates - CRUD Authorization

*No test cases found in this suite.*

**Test Suite**: Post templates - Create

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create space post template - positive

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to create space post template - negative

*No test cases found in this suite.*

**Test Suite**: Post templates - Update

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to update space post template - positive

*No test cases found in this suite.*

**Test Suite**: Post templates - Remove

*No test cases found in this suite.*

**Test Suite**: DDT user privileges to remove space post template - positive

*No test cases found in this suite.*

**Test Suite**: Post templates - Negative Scenarios

Test Cases:
- Delete non existent Post template

---

#### space-templates.it-spec.ts

**File**: `server-api/src/functional-api/templates/space/space-templates.it-spec.ts`

**Test Suite**: Subspace templates - CRUD

Test Cases:
- Create subspace template
- Delete subspace template
- Update subspace template

---

#### whiteboard-templates.it-spec.ts

**File**: `server-api/src/functional-api/templates/whiteboard/whiteboard-templates.it-spec.ts`

**Test Suite**: WHITEBOARD templates - CRUD

Test Cases:
- Create Whiteboard template
- Delete Whiteboard template

---

## Client Web Tests

### client-web/src/functional-e2e

#### authentication-flows.spec.ts

**File**: `client-web/src/functional-e2e/authentication/authentication-flows.spec.ts`

*No test suites found in this file.*

#### experiment.spec.ts

**File**: `client-web/src/functional-e2e/authentication/experiment.spec.ts`

*No test suites found in this file.*

#### test.spec.ts

**File**: `client-web/src/functional-e2e/authentication/test.spec.ts`

**Test Suite**: Tabs Navigation Tests

Test Cases:
- should select Home tab
- should select Community tab
- should select Subspaces tab
- should select Knowledge tab
- should select Settings tab

---

### client-web/tests-examples/demo-todo-app.spec.ts

#### demo-todo-app.spec.ts

**File**: `client-web/tests-examples/demo-todo-app.spec.ts`

**Test Suite**: New Todo

Test Cases:
- should allow me to add todo items
- should clear text input field when an item is added
- should append new items to the bottom of the list

**Test Suite**: Mark all as completed

Test Cases:
- should allow me to mark all items as completed
- should allow me to clear the complete state of all items
- complete all checkbox should update state when items are completed / cleared

**Test Suite**: Item

Test Cases:
- should allow me to mark items as complete
- should allow me to un-mark items as complete
- should allow me to edit an item

**Test Suite**: Editing

Test Cases:
- should hide other controls when editing
- should save edits on blur
- should trim entered text
- should remove the item if an empty text string was entered
- should cancel edits on escape

**Test Suite**: Counter

Test Cases:
- should display the current number of todo items

**Test Suite**: Clear completed button

Test Cases:
- should display the correct text
- should remove completed items when clicked
- should be hidden when there are no items that are completed

**Test Suite**: Persistence

Test Cases:
- should persist its data

**Test Suite**: Routing

Test Cases:
- should allow me to display active items
- should respect the back button
- should allow me to display completed items
- should allow me to display all items
- should highlight the currently applied filter

---

## Legacy Tests

### testOld/funcational-api-old/conversions

#### conversion.it-spec.ts

**File**: `testOld/funcational-api-old/conversions/conversion.it-spec.ts`

*No test suites found in this file.*

### testOld/non-functional/auth

#### challenge-admin-simple-auth-test.it-spec.ts

**File**: `testOld/non-functional/auth/challenge-admin-simple-auth-test.it-spec.ts`

**Test Suite**: Challenge Admin - authorization test suite

*No test cases found in this suite.*

---

#### hub-admin-simple-auth-test.it-spec.ts

**File**: `testOld/non-functional/auth/hub-admin-simple-auth-test.it-spec.ts`

**Test Suite**: Space Admin - authorization test suite

*No test cases found in this suite.*

---

#### private-challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/entity-based/private-hub/private-challenge.it-spec.ts`

**Test Suite**: Private Challenge of Private space

*No test cases found in this suite.*

**Test Suite**: DDT role access to private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to collaboration of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to Community of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to Community / Communication of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to context of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to preferences of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to opportunities of private challenge

Test Cases:
- Non space member access to private challenge of public space

---

#### private-challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/entity-based/public-hub/private-challenge.it-spec.ts`

**Test Suite**: Private Challenge of Public space

*No test cases found in this suite.*

**Test Suite**: DDT role access to private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to collaboration of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to Community of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to Community / Communication of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to context of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to preferences of private challenge

*No test cases found in this suite.*

**Test Suite**: DDT role access to opportunities of private challenge

Test Cases:
- Non space member access to private challenge of public space

---

#### challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/challenge.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalAdmin privileges to Challenge

**Test Suite**: Community

Test Cases:
- GlobalAdmin privileges to Challenge / Community
- GlobalAdmin privileges to Challenge / Community / Application
- GlobalAdmin privileges to Challenge / Community / Communication
- GlobalAdmin privileges to Challenge / Community / Communication / Discussion ⏭️
- GlobalAdmin privileges to Challenge / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalAdmin privileges to Challenge / Collaboration
- GlobalAdmin privileges to Challenge / Collaboration / Callout
- GlobalAdmin privileges to Challenge / Collaboration / Callout / Post
- GlobalAdmin privileges to Challenge / Collaboration / Callout / Whiteboard ⏭️
- GlobalAdmin privileges to Challenge / Collaboration / Callout / Comments ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalAdmin privileges to Challenge / Preferences

---

#### grant-revoke.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/grant-revoke.it-spec.ts`

**Test Suite**: Grant / Revoke GA

Test Cases:
- Grant user GlobalAdmin privileges
- Revoke user GlobalAdmin privileges

**Test Suite**: Grant / Revoke GCA

Test Cases:
- Grant user GlobalCommunityAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

**Test Suite**: Grant / Revoke GHA

Test Cases:
- Grant user GlobalSpaceAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

---

#### hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/hub.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalAdmin privileges to Space

**Test Suite**: Community

Test Cases:
- GlobalAdmin privileges to Space / Community
- GlobalAdmin privileges to Space / Community / Application
- GlobalAdmin privileges to Space / Community / Communication
- GlobalAdmin privileges to Space / Community / Communication / Discussion ⏭️
- GlobalAdmin privileges to Space / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalAdmin privileges to Space / Collaboration
- GlobalAdmin privileges to Space / Collaboration / Relations ⏭️
- GlobalAdmin privileges to Space / Collaboration / Callout
- GlobalAdmin privileges to Space / Collaboration / Callout / Post
- GlobalAdmin privileges to Space / Collaboration / Callout / Whiteboard ⏭️
- GlobalAdmin privileges to Space / Collaboration / Callout / Comments ⏭️

**Test Suite**: Templates

Test Cases:
- GlobalAdmin privileges to Space / Templates
- GlobalAdmin privileges to Space / Templates / Post
- GlobalAdmin privileges to Space / Templates / Lifecycle
- GlobalAdmin privileges to Space / Templates / Whiteboard ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalAdmin privileges to Space / Preferences

---

#### opportunity.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/opportunity.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalAdmin privileges to Opportunity

**Test Suite**: Community

Test Cases:
- GlobalAdmin privileges to Opportunity / Community
- GlobalAdmin privileges to Opportunity / Community / Communication
- GlobalAdmin privileges to Opportunity / Community / Communication / Discussion ⏭️
- GlobalAdmin privileges to Opportunity / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalAdmin privileges to Opportunity / Collaboration
- GlobalAdmin privileges to Opportunity / Collaboration / Relations
- GlobalAdmin privileges to Opportunity / Collaboration / Callout
- GlobalAdmin privileges to Opportunity / Collaboration / Callout / Post
- GlobalAdmin privileges to Opportunity / Collaboration / Callout / Whiteboard ⏭️
- GlobalAdmin privileges to Opportunity / Collaboration / Callout / Comments ⏭️

---

#### organization.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/organization.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalAdmin privileges to Organization
- GlobalAdmin privileges to Organization / Verification
- GlobalAdmin privileges to Organization / Profile
- GlobalAdmin privileges to Organization / Profile / References
- GlobalAdmin privileges to Organization / Profile / Tagsets
- GlobalAdmin privileges to Organization / Preferences

---

#### user.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-admin/user.it-spec.ts`

**Test Suite**: myPrivileges User

Test Cases:
- GlobalAdmin privileges to other User
- GlobalAdmin privileges to other User / Profile
- GlobalAdmin privileges to other User / References
- GlobalAdmin privileges to other User / Tagsets
- RegisteredUser privileges to my User / Preferences

---

#### challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/challenge.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalCommunityAdmin privileges to Space

**Test Suite**: Community

Test Cases:
- GlobalCommunityAdmin privileges to Challenge / Community
- GlobalCommunityAdmin privileges to Challenge / Community / Application
- GlobalCommunityAdmin privileges to Challenge / Community / Communication
- GlobalCommunityAdmin privileges to Challenge / Community / Communication / Discussion ⏭️
- GlobalCommunityAdmin privileges to Challenge / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalCommunityAdmin privileges to Challenge / Collaboration
- GlobalCommunityAdmin privileges to Challenge / Collaboration / Relations ⏭️
- GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout
- GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Post
- GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Whiteboard ⏭️
- GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Comments ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalCommunityAdmin privileges to Challenge / Preferences

---

#### grant-revoke.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/grant-revoke.it-spec.ts`

**Test Suite**: Grant / Revoke GA

Test Cases:
- Grant user GlobalAdmin privileges
- Revoke user GlobalAdmin privileges

**Test Suite**: Grant / Revoke GCA

Test Cases:
- Grant user GlobalCommunityAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

**Test Suite**: Grant / Revoke GHA

Test Cases:
- Grant user GlobalSpaceAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

---

#### hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/hub.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalCommunityAdmin privileges to Space

**Test Suite**: Community

Test Cases:
- GlobalCommunityAdmin privileges to Space / Community
- GlobalCommunityAdmin privileges to Space / Community / Application
- GlobalCommunityAdmin privileges to Space / Community / Communication
- GlobalCommunityAdmin privileges to Space / Community / Communication / Discussion ⏭️
- GlobalCommunityAdmin privileges to Space / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalCommunityAdmin privileges to Space / Collaboration
- GlobalCommunityAdmin privileges to Space / Collaboration / Relations ⏭️
- GlobalCommunityAdmin privileges to Space / Collaboration / Callout
- GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Post
- GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Whiteboard ⏭️
- GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Comments ⏭️

**Test Suite**: Templates

Test Cases:
- GlobalCommunityAdmin privileges to Space / Templates
- GlobalCommunityAdmin privileges to Space / Templates / Post
- GlobalCommunityAdmin privileges to Space / Templates / Lifecycle
- GlobalCommunityAdmin privileges to Space / Templates / Whiteboard ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalCommunityAdmin privileges to Space / Preferences

---

#### opportunity.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/opportunity.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalCommunityAdmin privileges to Opportunity

**Test Suite**: Community

Test Cases:
- GlobalCommunityAdmin privileges to Opportunity / Community
- GlobalCommunityAdmin privileges to Opportunity / Community / Communication
- GlobalCommunityAdmin privileges to Opportunity / Community / Communication / Discussion ⏭️
- GlobalCommunityAdmin privileges to Opportunity / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalCommunityAdmin privileges to Opportunity / Collaboration
- GlobalCommunityAdmin privileges to Opportunity / Collaboration / Relations
- GlobalCommunityAdmin privileges to Opportunity / Collaboration / Callout
- GlobalCommunityAdmin privileges to Opportunity / Collaboration / Callout / Post
- GlobalCommunityAdmin privileges to Opportunity / Collaboration / Callout / Whiteboard ⏭️
- GlobalCommunityAdmin privileges to Opportunity / Collaboration / Callout / Comments ⏭️

---

#### organization.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/organization.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalCommunityAdmin privileges to Organization
- GlobalCommunityAdmin privileges to Organization / Verification
- GlobalCommunityAdmin privileges to Organization / Profile
- GlobalCommunityAdmin privileges to Organization / Profile / References
- GlobalCommunityAdmin privileges to Organization / Profile / Tagsets
- GlobalCommunityAdmin privileges to Organization / Preferences

---

#### user.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-community-admin/user.it-spec.ts`

**Test Suite**: myPrivileges User

Test Cases:
- GlobalCommunityAdmin privileges to other User
- GlobalCommunityAdmin privileges to other User / Profile
- GlobalCommunityAdmin privileges to other User / References
- GlobalCommunityAdmin privileges to other User / Tagsets
- RegisteredUser privileges to my User / Preferences

---

#### challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/challenge.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalSpaceAdmin privileges to Challenge

**Test Suite**: Community

Test Cases:
- GlobalSpaceAdmin privileges to Challenge / Community
- GlobalSpaceAdmin privileges to Challenge / Community / Application
- GlobalSpaceAdmin privileges to Challenge / Community / Communication
- GlobalSpaceAdmin privileges to Challenge / Community / Communication / Discussion ⏭️
- GlobalSpaceAdmin privileges to Challenge / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalSpaceAdmin privileges to Challenge / Collaboration
- GlobalSpaceAdmin privileges to Challenge / Collaboration / Relations ⏭️
- GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout
- GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Post
- GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Whiteboard ⏭️
- GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Comments ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalSpaceAdmin privileges to Challenge / Preferences

---

#### grant-revoke.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/grant-revoke.it-spec.ts`

**Test Suite**: Grant / Revoke GA

Test Cases:
- Grant user GlobalAdmin privileges
- Revoke user GlobalAdmin privileges

**Test Suite**: Grant / Revoke GCA

Test Cases:
- Grant user GlobalCommunityAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

**Test Suite**: Grant / Revoke GHA

Test Cases:
- Grant user GlobalSpaceAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

---

#### hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/hub.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalSpaceAdmin privileges to Space

**Test Suite**: Community

Test Cases:
- GlobalSpaceAdmin privileges to Space / Community
- GlobalSpaceAdmin privileges to Space / Community / Application
- GlobalSpaceAdmin privileges to Space / Community / Communication
- GlobalSpaceAdmin privileges to Space / Community / Communication / Discussion ⏭️
- GlobalSpaceAdmin privileges to Space / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalSpaceAdmin privileges to Space / Collaboration
- GlobalSpaceAdmin privileges to Space / Collaboration / Relations ⏭️
- GlobalSpaceAdmin privileges to Space / Collaboration / Callout
- GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Post
- GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Whiteboard ⏭️
- GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Comments ⏭️

**Test Suite**: Templates

Test Cases:
- GlobalSpaceAdmin privileges to Space / Templates
- GlobalSpaceAdmin privileges to Space / Templates / Post
- GlobalSpaceAdmin privileges to Space / Templates / Lifecycle
- GlobalSpaceAdmin privileges to Space / Templates / Whiteboard ⏭️

**Test Suite**: Preferences

Test Cases:
- GlobalSpaceAdmin privileges to Space / Preferences

---

#### opportunity.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/opportunity.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalSpaceAdmin privileges to Opportunity

**Test Suite**: Community

Test Cases:
- GlobalSpaceAdmin privileges to Opportunity / Community
- GlobalSpaceAdmin privileges to Opportunity / Community / Communication
- GlobalSpaceAdmin privileges to Opportunity / Community / Communication / Discussion ⏭️
- GlobalSpaceAdmin privileges to Opportunity / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- GlobalSpaceAdmin privileges to Opportunity / Collaboration
- GlobalSpaceAdmin privileges to Opportunity / Collaboration / Relations
- GlobalSpaceAdmin privileges to Opportunity / Collaboration / Callout
- GlobalSpaceAdmin privileges to Opportunity / Collaboration / Callout / Post
- GlobalSpaceAdmin privileges to Opportunity / Collaboration / Callout / Whiteboard ⏭️
- GlobalSpaceAdmin privileges to Opportunity / Collaboration / Callout / Comments ⏭️

---

#### organization.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/organization.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- GlobalSpaceAdmin privileges to Organization
- GlobalSpaceAdmin privileges to Organization / Verification
- GlobalSpaceAdmin privileges to Organization / Profile
- GlobalSpaceAdmin privileges to Organization / Profile / References
- GlobalSpaceAdmin privileges to Organization / Profile / Tagsets
- GlobalSpaceAdmin privileges to Organization / Preferences

---

#### user.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/global-hub-admin/user.it-spec.ts`

**Test Suite**: myPrivileges User

Test Cases:
- GlobalSpaceAdmin privileges to other User
- GlobalSpaceAdmin privileges to other User / Profile
- GlobalSpaceAdmin privileges to other User / References
- GlobalSpaceAdmin privileges to other User / Tagsets
- RegisteredUser privileges to my User / Preferences

---

#### challenge-private-hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/challenge-private-hub.it-spec.ts`

**Test Suite**: myPrivileges - Challenge of Private Space

Test Cases:
- RegisteredUser privileges to Challenge

---

#### challenge.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/challenge.it-spec.ts`

**Test Suite**: myPrivileges - Challenge of Public Space

Test Cases:
- RegisteredUser privileges to Challenge

**Test Suite**: Community

Test Cases:
- RegisteredUser privileges to Challenge / Community
- RegisteredUser privileges to Challenge / Community / Application
- RegisteredUser privileges to Challenge / Community / Communication
- RegisteredUser privileges to Challenge / Community / Communication / Discussion ⏭️
- RegisteredUser privileges to Challenge / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- RegisteredUser privileges to Challenge / Collaboration
- RegisteredUser privileges to Challenge / Collaboration / Relations ⏭️
- RegisteredUser privileges to Challenge / Collaboration / Callout
- RegisteredUser privileges to Challenge / Collaboration / Callout / Post
- RegisteredUser privileges to Challenge / Collaboration / Callout / Whiteboard ⏭️
- RegisteredUser privileges to Challenge / Collaboration / Callout / Comments ⏭️

**Test Suite**: Preferences

Test Cases:
- RegisteredUser privileges to Challenge / Preferences

---

#### grant-revoke.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/grant-revoke.it-spec.ts`

**Test Suite**: Grant / Revoke GA

Test Cases:
- Grant user GlobalAdmin privileges
- Revoke user GlobalAdmin privileges

**Test Suite**: Grant / Revoke GCA

Test Cases:
- Grant user GlobalCommunityAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

**Test Suite**: Grant / Revoke GHA

Test Cases:
- Grant user GlobalSpaceAdmin privileges
- Revoke user GlobalCommunityAdmin privileges

---

#### hub-private.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/hub-private.it-spec.ts`

**Test Suite**: myPrivileges - Private Space

Test Cases:
- RegisteredUser privileges to Space

**Test Suite**: Community

Test Cases:
- RegisteredUser privileges to Space / Community
- RegisteredUser privileges to Space / Community / Application
- RegisteredUser privileges to Space / Community / Communication

**Test Suite**: Collaboration

Test Cases:
- RegisteredUser privileges to Space / Collaboration

**Test Suite**: Templates

Test Cases:
- RegisteredUser privileges to Space / Templates

**Test Suite**: Preferences

Test Cases:
- RegisteredUser privileges to Space / Preferences

---

#### hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/hub.it-spec.ts`

**Test Suite**: myPrivileges - Public Space

Test Cases:
- RegisteredUser privileges to Space

**Test Suite**: Community

Test Cases:
- RegisteredUser privileges to Space / Community
- RegisteredUser privileges to Space / Community / Application
- RegisteredUser privileges to Space / Community / Communication
- RegisteredUser privileges to Space / Community / Communication / Discussion ⏭️
- RegisteredUser privileges to Space / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- RegisteredUser privileges to Space / Collaboration
- RegisteredUser privileges to Space / Collaboration / Relations ⏭️
- RegisteredUser privileges to Space / Collaboration / Callout
- RegisteredUser privileges to Space / Collaboration / Callout / Post
- RegisteredUser privileges to Space / Collaboration / Callout / Whiteboard ⏭️
- RegisteredUser privileges to Space / Collaboration / Callout / Comments ⏭️

**Test Suite**: Templates

Test Cases:
- RegisteredUser privileges to Space / Templates
- RegisteredUser privileges to Space / Templates / Post
- RegisteredUser privileges to Space / Templates / Lifecycle
- RegisteredUser privileges to Space / Templates / Whiteboard ⏭️

**Test Suite**: Preferences

Test Cases:
- RegisteredUser privileges to Space / Preferences

---

#### opportunity-private-hub.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/opportunity-private-hub.it-spec.ts`

**Test Suite**: myPrivileges - Opportunity of Public Space

Test Cases:
- RegisteredUser privileges to Opportunity

---

#### opportunity.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/opportunity.it-spec.ts`

**Test Suite**: myPrivileges - Opportunity of Public Space

Test Cases:
- RegisteredUser privileges to Opportunity

**Test Suite**: Community

Test Cases:
- RegisteredUser privileges to Opportunity / Community
- RegisteredUser privileges to Opportunity / Community / Communication
- RegisteredUser privileges to Opportunity / Community / Communication / Discussion ⏭️
- RegisteredUser privileges to Opportunity / Community / Communication / Updates

**Test Suite**: Collaboration

Test Cases:
- RegisteredUser privileges to Opportunity / Collaboration
- RegisteredUser privileges to Opportunity / Collaboration / Relations
- RegisteredUser privileges to Opportunity / Collaboration / Callout
- RegisteredUser privileges to Opportunity / Collaboration / Callout / Post
- RegisteredUser privileges to Opportunity / Collaboration / Callout / Whiteboard ⏭️
- RegisteredUser privileges to Opportunity / Collaboration / Callout / Comments ⏭️

---

#### organization.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/organization.it-spec.ts`

**Test Suite**: myPrivileges

Test Cases:
- RegisteredUser privileges to Organization
- RegisteredUser privileges to Organization / Verification
- RegisteredUser privileges to Organization / Profile
- RegisteredUser privileges to Organization / Profile / References
- RegisteredUser privileges to Organization / Profile / Tagsets
- RegisteredUser privileges to Organization / Preferences

---

#### user-other.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/user-other.it-spec.ts`

**Test Suite**: myPrivileges User

Test Cases:
- RegisteredUser privileges to other User
- RegisteredUser privileges to other User / Profile
- RegisteredUser privileges to other User / References
- RegisteredUser privileges to other User / Tagsets
- RegisteredUser privileges to my User / Preferences

---

#### user-self.it-spec.ts

**File**: `testOld/non-functional/auth/my-privileges/global-roles/registered-user/user-self.it-spec.ts`

**Test Suite**: myPrivileges User

Test Cases:
- RegisteredUser privileges to my User
- RegisteredUser privileges to my User / Profile
- RegisteredUser privileges to my User / References
- RegisteredUser privileges to my User / Preferences

---

### testOld/non-functional/orphaned-data

#### before-all.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/challenge/before-all.it-spec.ts`

**Test Suite**: Space

Test Cases:
- test

---

#### challenge-delete.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/challenge/challenge-delete.it-spec.ts`

**Test Suite**: Full Challenge Deletion

Test Cases:
- should delete all challenge related data

---

#### before-all.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/hub/before-all.it-spec.ts`

**Test Suite**: Space

Test Cases:
- test

---

#### cleanup.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/hub/cleanup.it-spec.ts`

**Test Suite**: Organization

Test Cases:
- test

---

#### hub-delete.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/hub/hub-delete.it-spec.ts`

**Test Suite**: Full Space Deletion

Test Cases:
- should delete all space related data

---

#### before-all.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/opportunity/before-all.it-spec.ts`

**Test Suite**: Space

Test Cases:
- test

---

#### opportunity-delete.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/opportunity/opportunity-delete.it-spec.ts`

**Test Suite**: Full Opportunity Deletion

Test Cases:
- should delete all opportunity related data

---

#### organization-delete.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/organization/organization-delete.it-spec.ts`

**Test Suite**: Full Organization Deletion

Test Cases:
- should delete all organization related data

---

#### query.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/query.it-spec.ts`

**Test Suite**: Organization

Test Cases:
- test

---

#### before-all.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/user/before-all.it-spec.ts`

**Test Suite**: User

Test Cases:
- test

---

#### cleanup.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/user/cleanup.it-spec.ts`

**Test Suite**: User

Test Cases:
- test

---

#### user-delete.it-spec.ts

**File**: `testOld/non-functional/orphaned-data/user/user-delete.it-spec.ts`

**Test Suite**: Full User Deletion

Test Cases:
- should delete all user related data

---


---

## 🔄 Regenerating This Documentation

To regenerate this documentation with the latest test information:

```bash
node generate-test-documentation.js
```

This will scan all test files and create an updated version of this document.

---

*Documentation generated by the Alkemio Test Documentation Generator*
