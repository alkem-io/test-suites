# Alkemio Memberships - Comprehensive Test Plan

**Seed:** `./client-web/src/functional-e2e/seed-memberships.spec.ts`

**GitHub Issue:** https://github.com/alkem-io/alkemio/issues/1698

## Executive Summary

This comprehensive test plan covers user, organization, and VirtualContributor membership management across the Alkemio platform.

**Scope:**

- **13 Major Test Categories** covering 80+ detailed scenarios
- **20 Critical Priority Scenarios** identified for initial implementation
- **5 Test Coverage Areas**: Core viewing, access control, membership management, multi-level visibility, and VirtualContributor memberships

**Key Test Areas:**

1. User Profile & Membership Settings (`/user/[:userNameId]/settings/membership`)
2. Organization Membership Management (`/organization/[:organizationNameId]/settings/membership`)
3. VirtualContributor Memberships (`/vc/[:vcNameId]/settings/memberships`)
4. Space/Subspace Access Control (L0, L1, L2 levels)
5. Home Dashboard Integration (`/home`)

**VirtualContributor Constraints:**

- VCs can only be added to Level 0 (L0) spaces
- Direct assignment: Only VCs from the same account as the space
- VC host manages memberships; can opt out from spaces
- Invitation workflows excluded (tested separately in invitations suite)

## Application Overview

This test plan covers membership management for Users and Organizations across the Alkemio platform. The membership system affects access control, settings visibility, and permissions across multiple areas:

- **User Profiles**: `/user/[:userNameId]`
- **Organization Profiles**: `/organization/[:organizationNameId]`
- **Home Dashboard**: `/home`
- **User Account Settings**: `/user/[:userNameId]/settings/account`
- **Organization Account Settings**: `/organization/[:organizationNameId]/settings/account`
- **User Membership Settings**: `/user/[:userNameId]/settings/membership`
- **Organization Membership Settings**: `/organization/[:organizationNameId]/settings/membership`
- **Space/Subspace Settings**: Various levels (L0, L1, L2)

### Test Data Structure

The seed creates:

- **Organization** with admin (ORGANIZATION_ADMIN) and members
- **Space (L0)** - Public
  - Admins: SPACE_ADMIN, GLOBAL_ADMIN
  - Leads: SPACE_ADMIN
  - Members: Multiple users including ORGANIZATION_ADMIN
- **Subspace (L1)** - Public
  - Admins: SUBSPACE_ADMIN
  - Leads: SUBSPACE_ADMIN, SPACE_ADMIN
  - Members: Subset of space members
- **Subsubspace (L2)** - Private
  - Admins: SUBSUBSPACE_ADMIN
  - Leads: SUBSUBSPACE_ADMIN, SUBSPACE_ADMIN
  - Members: Restricted subset

---

## Test Scenarios

### Category 1: User Profile Membership Display

#### 1.1 View Own User Profile - Public Information

**User:** SPACE_MEMBER (authenticated)

**Steps:**

1. Navigate to `/user/space.member`
2. Review profile page content
3. Verify visible sections

**Expected Results:**

- User profile page loads successfully
- Profile information is displayed (avatar, name, tagline, bio, skills)
- Social links are visible (if set)
- Public contributions are visible
- Membership information is **not** shown on public profile
- Settings tabs are **not** visible to viewing user
- URL structure: `/user/space.member`

#### 1.2 View Another User's Profile - Public View

**User:** SUBSPACE_MEMBER (authenticated)

**Steps:**

1. Navigate to `/user/space.admin`
2. Review visible information
3. Attempt to access settings

**Expected Results:**

- Public profile of SPACE_ADMIN is displayed
- Basic information visible: name, avatar, tagline, bio, location
- No "Settings" or "Membership" tabs visible
- No access to private information
- Cannot see the user's memberships or organizations
- Cannot access `/user/space.admin/settings/*` routes

#### 1.3 View Unauthenticated User Profile

**User:** Not logged in

**Steps:**

1. As unauthenticated user, navigate to `/user/space.member`
2. Review accessible information

**Expected Results:**

- Public profile information is visible
- No settings or private tabs available
- Login prompt may appear for restricted content
- Only publicly shared information is displayed

---

### Category 2: User Membership Settings

#### 2.1 Access Own Membership Settings

**User:** SPACE_MEMBER (authenticated)

**Steps:**

1. Log in as SPACE_MEMBER
2. Navigate to `/user/space.member/settings/membership`
3. Review displayed memberships

**Expected Results:**

- URL changes to `/user/space.member/settings/membership`
- "My memberships" section is visible
- Membership cards display:
  - Space: "Membership Test Space" (member role)
  - Banner image and space avatar
  - Space tagline
  - "Leave" button available
- "Pending Applications" section appears below
- Can only access own membership settings

#### 2.2 View All Membership Levels

**User:** SPACE_ADMIN (has memberships at multiple levels)

**Steps:**

1. Log in as SPACE_ADMIN
2. Navigate to `/user/space.admin/settings/membership`
3. Review all memberships

**Expected Results:**

- Displays membership in:
  - Space (L0): Admin and Lead roles
  - Subspace (L1): Member and Lead roles
  - Multiple role badges may appear on single membership card
- Memberships organized by hierarchy or alphabetically
- Each membership shows appropriate role information
- Total count matches actual memberships

#### 2.3 Leave a Space Membership

**User:** SUBSPACE_MEMBER

**Steps:**

1. Navigate to `/user/subspace.member/settings/membership`
2. Locate "Membership Test Space" membership card
3. Click "Leave" button
4. Confirm action in dialog (if prompted)
5. Verify membership is removed

**Expected Results:**

- "Leave" button is visible on membership card
- Confirmation dialog appears: "Are you sure you want to leave this space?"
- After confirming:
  - Success message appears
  - Membership card is removed from list
  - User loses access to the space
  - Cannot access space content anymore
  - Membership count decrements

#### 2.4 View Pending Applications

**User:** NON_SPACE_MEMBER (has applied to join a space)

**Steps:**

1. Navigate to `/user/non.space/settings/membership`
2. Scroll to "Pending Applications" section
3. Review pending applications

**Expected Results:**

- "Pending Applications" section is visible
- Shows applications waiting for approval
- Each application displays:
  - Space/Subspace name
  - Application date
  - "Withdraw" button
- Applications are sorted by date (newest first)

#### 2.5 Cannot Access Other User's Membership Settings

**User:** SPACE_MEMBER

**Steps:**

1. Attempt to navigate to `/user/space.admin/settings/membership`
2. Observe response

**Expected Results:**

- Access is denied with 403 Forbidden or redirected
- Error message: "You don't have permission to view this page"
- User is redirected to their own settings or home page
- Privacy of membership information is maintained

---

### Category 3: User Account Settings

#### 3.1 View Own Account Settings

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to `/user/space.admin/settings/account`
2. Review account resources

**Expected Results:**

- URL: `/user/space.admin/settings/account`
- Information message: "Here you find all your Spaces, Virtual Contributors, and other hosted resources..."
- Resource sections displayed:
  - Hosted Spaces (count: X/Y with quota)
  - Virtual Contributors (count: X/Y)
  - Template Packs (count: X/Y)
  - Custom Homepages (count: X/Y)
- Each section shows current usage vs. limit
- "Add" buttons available where user has permissions
- If admin of space, shows "Membership Test Space" in Hosted Spaces

#### 3.2 View Account with No Hosted Resources

**User:** SPACE_MEMBER

**Steps:**

1. Navigate to `/user/space.member/settings/account`
2. Review account information

**Expected Results:**

- All resource sections show "0" count
- "Add" buttons may be disabled or show upgrade prompt
- Message indicates no hosted resources
- User can still view the account page structure

#### 3.3 Cannot Access Other User's Account Settings

**User:** SUBSPACE_MEMBER

**Steps:**

1. Attempt to access `/user/space.admin/settings/account`
2. Observe access control

**Expected Results:**

- Access denied (403 Forbidden)
- Redirected to own settings or home
- Cannot view another user's hosted resources
- Privacy protection is enforced

---

### Category 4: Organization Profile Access

#### 4.1 View Organization Profile - Public

**User:** NON_SPACE_MEMBER (not org member)

**Steps:**

1. Navigate to `/organization/[:organizationNameId]`
2. Review visible information

**Expected Results:**

- Organization profile page loads
- Public information displayed:
  - Organization name and avatar
  - Legal entity name (if public)
  - Description/tagline
  - Website and domain
  - Public contact information
- No "Settings" tab visible
- Cannot see organization members list (if private)
- Cannot access organization settings

#### 4.2 View Organization Profile - Unauthenticated

**User:** Not logged in

**Steps:**

1. As unauthenticated user, navigate to `/organization/[:organizationNameId]`
2. Review accessible information

**Expected Results:**

- Organization profile page loads (org profiles are public)
- Public information displayed:
  - Organization name and avatar
  - Description/tagline
  - Bio section
  - Spaces they lead
- No "Settings" tab visible
- Sign-in option is available in UI
- Cannot access organization settings

#### 4.3 View Organization Profile - As Admin

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]`
2. Verify admin capabilities
3. Check for edit/manage options

**Expected Results:**

- Full administrative access to organization
- Can edit organization profile
- Access to all settings tabs
- Can manage members and associates
- Can update organization settings
- Organization verification options available (if applicable)

---

### Category 5: Organization Account Settings

#### 5.1 View Organization Account Settings - As Admin

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/account`
2. Review organization resources

**Expected Results:**

- URL: `/organization/[:organizationNameId]/settings/account`
- Similar structure to user account settings
- Resource sections for organization:
  - Hosted Spaces (organization-owned spaces)
  - Virtual Contributors
  - Template Packs
  - Custom Homepages
- Shows organization's resource quotas and usage
- Can manage organization-level resources

#### 5.2 Cannot Access Organization Account Settings - Non-Admin

**User:** SPACE_MEMBER (not org admin)

**Steps:**

1. Attempt to access `/organization/[:organizationNameId]/settings/account`
2. Observe access control

**Expected Results:**

- Access denied (403 Forbidden)
- Error message appears
- Redirected away from organization settings
- Only organization admins can access these settings

#### 5.3 View Organization with Hosted Spaces

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/account`
2. Check "Hosted Spaces" section
3. Verify "Membership Test Space" is listed

**Expected Results:**

- "Membership Test Space" appears in Hosted Spaces
- Shows space visibility (Public)
- Link to space is available
- Can manage or remove hosted spaces (with appropriate permissions)
- Space count is accurate

---

### Category 6: Organization Membership Settings

#### 6.1 View Organization Membership Settings - As Admin

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/membership`
2. Review membership configuration

**Expected Results:**

- URL: `/organization/[:organizationNameId]/settings/membership`
- Membership policy settings are displayed
- Can configure:
  - Allow users matching domain to join automatically
  - Membership approval settings
  - Application requirements
- List of current members/associates is shown
- Can add/remove members
- Can change member roles

#### 6.2 Manage Organization Members

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/membership`
2. Locate members list
3. Review member management options
4. Attempt to change a member's role or remove a member

**Expected Results:**

- Members list displays all associates
- Each member shows:
  - Name and avatar
  - Current role (Member, Admin)
  - Actions (change role, remove)
- Can promote members to admin
- Can demote admins to member
- Can remove members from organization
- Changes are reflected immediately
- Confirmation dialogs appear for destructive actions

#### 6.3 Organization Domain-Based Auto-Join

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/membership`
2. Enable "Allow users matching domain to join" setting
3. Verify domain is set correctly
4. Save settings

**Expected Results:**

- Toggle or checkbox to enable domain-based joining
- Domain field shows organization domain
- When enabled, users with matching email domain auto-join
- Setting is saved successfully
- Success notification appears

#### 6.4 Cannot Access Organization Membership Settings - Non-Admin

**User:** SPACE_MEMBER

**Steps:**

1. Attempt to navigate to `/organization/[:organizationNameId]/settings/membership`
2. Observe access restriction

**Expected Results:**

- Access denied (403 Forbidden)
- Cannot view organization membership settings
- Cannot manage organization members
- Redirected to appropriate page

---

### Category 7: Home Dashboard Membership Display

#### 7.1 View Home Dashboard - Authenticated User

**User:** SPACE_MEMBER

**Steps:**

1. Log in and navigate to `/home`
2. Review displayed information

**Expected Results:**

- Home dashboard loads successfully
- "My Spaces" or similar section shows user's memberships
- Displays cards for:
  - "Membership Test Space" (member)
- Each card shows:
  - Space banner and avatar
  - Space name and tagline
  - Quick access links
- Recent activity may be displayed
- Navigation to spaces is available

#### 7.2 View Home Dashboard - Multiple Memberships

**User:** SPACE_ADMIN

**Steps:**

1. Log in and navigate to `/home`
2. Review all memberships displayed

**Expected Results:**

- Shows memberships at all levels:
  - Space (L0) - with Admin badge
  - Subspace (L1) - with Lead badge
- Memberships are organized logically
- Can filter or sort memberships
- Each membership is clickable to navigate
- Admin/Lead badges are clearly visible

#### 7.3 View Home Dashboard - No Memberships

**User:** NON_SPACE_MEMBER

**Steps:**

1. Log in and navigate to `/home`
2. Review home dashboard content

**Expected Results:**

- Home dashboard loads
- "My Spaces" section shows empty state
- Message: "You are not a member of any spaces yet"
- Call-to-action to "Explore Spaces" or "Join a Space"
- Can browse public spaces to join

#### 7.4 View Home Dashboard - Organization Memberships

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Log in and navigate to `/home`
2. Check for organization section

**Expected Results:**

- "My Organizations" section is displayed
- Shows organization card with:
  - Organization name and avatar
  - Role (Admin)
  - Quick access to organization settings
- Can navigate to organization profile
- Organization-related notifications may appear

---

### Category 8: Space/Subspace Settings Access Control

#### 8.1 Access Space Settings - As Space Admin

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to "Membership Test Space"
2. Access space settings
3. Review available settings sections

**Expected Results:**

- Settings option is visible in space navigation
- Can access:
  - Space profile settings
  - Community settings
  - Membership settings
  - Privacy settings
  - Collaboration settings
- All administrative options are available
- Can modify space configuration

#### 8.2 Access Space Settings - As Space Member

**User:** SPACE_MEMBER

**Steps:**

1. Navigate to "Membership Test Space"
2. Attempt to access space settings
3. Verify restrictions

**Expected Results:**

- Settings option is **not** visible or is disabled
- If URL is accessed directly, get 403 Forbidden
- Cannot modify space settings
- Cannot manage community members
- Can only view space content as member
- Appropriate permissions message if attempted

#### 8.3 Access Subspace Settings - As Subspace Admin

**User:** SUBSPACE_ADMIN

**Steps:**

1. Navigate to "Subspace for Membership Tests"
2. Access subspace settings
3. Review available options

**Expected Results:**

- Settings are accessible
- Can manage subspace-specific settings:
  - Profile and description
  - Community membership
  - Subspace privacy settings
  - Collaboration tools
- Cannot modify parent space settings
- Has admin controls within subspace scope

#### 8.4 Access Subspace Settings - As Space Admin (Parent)

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to "Subspace for Membership Tests"
2. Attempt to access subspace settings
3. Verify inherited permissions

**Expected Results:**

- As parent space admin, may have limited access to subspace
- Can view subspace as member/lead
- May have ability to manage based on platform rules
- Permissions cascade rules apply
- Full admin rights depend on subspace configuration

#### 8.5 Access Private Subsubspace - As Non-Member

**User:** SPACE_MEMBER (not subsubspace member)

**Steps:**

1. Attempt to navigate to "Subsubspace for Membership Tests"
2. Observe access control

**Expected Results:**

- Access denied to private subsubspace
- Error: "You don't have permission to view this space"
- Cannot see subsubspace content
- May see it exists but cannot access details
- Privacy settings are enforced

#### 8.6 Access Private Subsubspace - As Member

**User:** SUBSUBSPACE_MEMBER

**Steps:**

1. Navigate to "Subsubspace for Membership Tests"
2. Access subsubspace content
3. Review available actions

**Expected Results:**

- Full access to private subsubspace granted
- Can view all content and discussions
- Can participate in collaboration
- Cannot access settings (not admin)
- Member-level permissions apply

#### 8.7 Access Private Subsubspace Settings - As Subsubspace Admin

**User:** SUBSUBSPACE_ADMIN

**Steps:**

1. Navigate to "Subsubspace for Membership Tests"
2. Access settings
3. Verify admin capabilities

**Expected Results:**

- Full administrative access to subsubspace
- Can modify all subsubspace settings
- Can manage subsubspace members
- Can change privacy settings
- Can configure collaboration tools
- Has complete control within subsubspace scope

---

### Category 9: Membership Application Workflows

#### 9.1 Apply to Join Public Space

**User:** NON_SPACE_MEMBER

**Steps:**

1. Navigate to "Membership Test Space" (public)
2. Click "Apply to Join" or similar button
3. Fill in application form (if required)
4. Submit application

**Expected Results:**

- "Apply" button is visible on public space
- Application form appears (may include questions)
- Can submit application
- Application status changes to "Pending"
- Appears in user's "Pending Applications" in membership settings
- Space admins are notified of new application

#### 9.2 Withdraw Pending Application

**User:** NON_SPACE_MEMBER (with pending application)

**Steps:**

1. Navigate to `/user/non.space/settings/membership`
2. Locate pending application in "Pending Applications" section
3. Click "Withdraw" button
4. Confirm withdrawal

**Expected Results:**

- "Withdraw" button is visible on pending application
- Confirmation dialog appears
- After confirmation:
  - Application is removed from pending list
  - Application status changes to "Withdrawn"
  - Can reapply if desired
  - Space admins are notified (optional)

#### 9.3 Approve Membership Application - As Space Admin

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to space settings
2. Go to "Community" or "Applications" section
3. Review pending applications
4. Approve an application

**Expected Results:**

- List of pending applications is visible
- Each application shows:
  - Applicant name and profile
  - Application date
  - Application answers (if questions were asked)
- Can approve or decline application
- Approving adds user to space members
- Applicant receives notification
- Application moves from pending to approved

---

### Category 10: Organization Associate Management

#### 10.1 Add User as Organization Associate

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to organization profile
2. Access members/associates management
3. Click "Add Associate" or "Invite Member"
4. Search for user (e.g., SPACE_MEMBER)
5. Send invitation

**Expected Results:**

- Can search for existing platform users
- Invitation is sent to user
- User appears in "Pending Invitations"
- User receives notification of invitation
- Can assign role (Member or Admin) during invitation

#### 10.2 Accept Organization Invitation

**User:** SPACE_MEMBER (invited to organization)

**Steps:**

1. Check notifications or navigate to `/user/space.member/settings/membership`
2. Locate organization invitation
3. Accept invitation

**Expected Results:**

- Invitation appears in notifications
- Can accept or decline invitation
- After accepting:
  - User becomes organization associate
  - Organization appears in user's organizations list
  - User can access organization resources based on role
  - Success notification appears

#### 10.3 Remove Organization Associate

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/membership`
2. Locate an associate in members list
3. Click "Remove" or similar action
4. Confirm removal

**Expected Results:**

- "Remove" option available for each member
- Confirmation dialog: "Remove [User] from organization?"
- After confirming:
  - User is removed from organization
  - User loses organization association
  - Organization disappears from user's organizations list
  - User is notified of removal

---

### Category 11: Cross-Level Membership Visibility

#### 11.1 View User Profile Showing Multiple Membership Levels

**User:** SPACE_ADMIN (viewing own profile externally)

**Steps:**

1. From another account or unauthenticated, navigate to `/user/space.admin`
2. Review what membership information is publicly visible

**Expected Results:**

- Public profile does not expose detailed membership list
- May show general activity or contributions
- Specific spaces/memberships are not listed publicly (privacy)
- Only bio, skills, and public information visible

#### 11.2 View Organization Members List

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to organization profile
2. Access members/associates section
3. Review members list and their roles

**Expected Results:**

- Full list of organization associates
- Shows each member's:
  - Name and avatar
  - Role in organization (Admin, Member)
  - Associated since date
- Can filter or search members
- Links to member profiles work correctly

#### 11.3 View Space Community Members

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to "Membership Test Space"
2. Access "Community" or "Members" section
3. Review members list

**Expected Results:**

- List of all space members
- Shows:
  - Members (SPACE_MEMBER, ORGANIZATION_ADMIN, etc.)
  - Admins (SPACE_ADMIN, GLOBAL_ADMIN)
  - Leads (SPACE_ADMIN)
- Each member shows their role(s)
- Can filter by role type
- Links to member profiles available

---

### Category 12: VirtualContributor Membership Management

#### 12.1 View VirtualContributor Profile

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:vcNameId]`
2. Review VC profile information
3. Check for settings access

**Expected Results:**

- VC profile page loads successfully
- Displays VC information:
  - Name and avatar
  - Description/tagline
  - Body of Knowledge information
  - AI Persona details (if applicable)
- As host, "Settings" option is visible
- Can access VC configuration
- Non-hosts see limited public profile only

#### 12.2 Access VC Membership Settings - As Host

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:vcNameId]/settings/memberships`
2. Review VC memberships list

**Expected Results:**

- URL: `/vc/[:vcNameId]/settings/memberships`
- "VC Memberships" section is displayed
- Shows list of spaces where VC is a member
- Each membership card displays:
  - Space name and avatar
  - Space tagline
  - "Opt Out" button
- Only shows Level 0 (L0) spaces (no subspaces)
- Membership count is accurate

#### 12.3 VC Added to Space Community - Direct Assignment

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to "Membership Test Space" settings
2. Access "Community" or "Members" section
3. Click "Add VirtualContributor" or similar action
4. Select VC from organization account (same account as space)
5. Assign VC to space community
6. Confirm addition

**Expected Results:**

- Can search/select VCs from same account
- Only VCs under the space's account are available
- VC is added as community member
- VC appears in space members list with "Virtual Contributor" badge
- VC can only be added to L0 space (not subspaces)
- Success notification appears
- VC host is notified of membership (optional)

#### 12.4 View VC in Space Community Members List

**User:** SPACE_MEMBER

**Steps:**

1. Navigate to "Membership Test Space"
2. Access "Community" or "Members" section
3. Locate the VC in members list

**Expected Results:**

- VC appears in community members list
- Clearly labeled as "Virtual Contributor"
- Shows VC avatar and name
- Distinguishable from regular users
- Link to VC profile works
- May show "AI" or "Bot" indicator

#### 12.5 VC Opt Out from Space Membership - As Host

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:vcNameId]/settings/memberships`
2. Locate "Membership Test Space" in memberships list
3. Click "Opt Out" button
4. Confirm action in dialog

**Expected Results:**

- "Opt Out" button is visible on membership card
- Confirmation dialog: "Opt out [VC Name] from [Space Name]?"
- After confirming:
  - Success message appears
  - Membership card is removed from list
  - VC is removed from space community
  - VC loses access to space
  - Space admins may be notified

#### 12.6 Cannot Access VC Membership Settings - Non-Host

**User:** SPACE_ADMIN (not VC host)

**Steps:**

1. Attempt to navigate to `/vc/[:vcNameId]/settings/memberships`
2. Observe access control

**Expected Results:**

- Access denied (403 Forbidden)
- Error: "Only the host can manage this Virtual Contributor"
- Cannot view or modify VC memberships
- Redirected to appropriate page
- Only VC host has management access

#### 12.7 VC Cannot Be Added to Subspace (L1)

**User:** SUBSPACE_ADMIN

**Steps:**

1. Navigate to "Subspace for Membership Tests" settings
2. Access "Community" section
3. Attempt to add VirtualContributor

**Expected Results:**

- "Add VirtualContributor" option is not available OR
- If attempted, error message: "Virtual Contributors can only be added to Level 0 spaces"
- VCs cannot be added to subspaces
- Only L0 spaces support VC membership
- This restriction is enforced at UI and API level

#### 12.8 VC Cannot Be Added to Subsubspace (L2)

**User:** SUBSUBSPACE_ADMIN

**Steps:**

1. Navigate to "Subsubspace for Membership Tests" settings
2. Access "Community" section
3. Verify no VC addition option

**Expected Results:**

- No "Add VirtualContributor" option available
- VCs cannot be added to L2 spaces
- Only L0 spaces support VC membership
- UI doesn't present the option at all

#### 12.9 Remove VC from Space - By Space Admin

**User:** SPACE_ADMIN

**Steps:**

1. Navigate to "Membership Test Space" settings
2. Access "Community" members list
3. Locate the VC in members
4. Click "Remove" or similar action
5. Confirm removal

**Expected Results:**

- Can remove VC from space community
- Confirmation dialog appears
- After confirming:
  - VC is removed from members list
  - VC disappears from community
  - VC host sees membership removed in VC settings
  - Success notification appears
- Space admin can remove VCs even without being the host

#### 12.10 Account VC - Profile Not Accessible to Non-Host

**User:** SPACE_ADMIN (not VC host)

**Steps:**

1. Navigate to `/vc/[:accountVcNameId]` (Account visibility VC)
2. Attempt to view VC profile
3. Observe access restrictions

**Expected Results:**

- Access denied or very limited profile view
- Cannot see VC details (description, Body of Knowledge)
- Error message: "This Virtual Contributor is not publicly accessible"
- Only host can view full Account VC profile
- Profile settings indicate "Account" visibility
- Non-hosts see minimal or no information

#### 12.11 Hidden VC - Cannot Be Added to Any Space

**User:** SPACE_ADMIN (VC host)

**Steps:**

1. Create or have a Hidden VC in organization
2. Navigate to "Membership Test Space" settings
3. Access "Community" section
4. Attempt to add the Hidden VC

**Expected Results:**

- Hidden VC does not appear in VC selection list
- Cannot be searched or found when adding to community
- Hidden VCs are excluded from community assignment
- Only host can see Hidden VC exists
- Error or message: "No VirtualContributors available" (if no other VCs exist)
- Hidden status prevents any community membership

#### 12.12 Hidden VC - Profile Only Accessible to Host

**User:** SPACE_MEMBER (not VC host)

**Steps:**

1. Attempt to navigate to `/vc/[:hiddenVcNameId]` (Hidden visibility VC)
2. Observe access control

**Expected Results:**

- Access completely denied (403 Forbidden or 404 Not Found)
- Error: "Virtual Contributor not found" or "Access denied"
- Hidden VCs are invisible to non-hosts
- Cannot discover or access Hidden VC profile
- Only host can view and manage Hidden VCs
- Profile is completely private to host

#### 12.13 Hidden VC - Host Can View and Manage

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:hiddenVcNameId]`
2. Access VC settings
3. Verify management capabilities

**Expected Results:**

- Full access to Hidden VC profile as host
- Can view all VC details and settings
- Can modify VC configuration
- Visibility setting shows "Hidden"
- Cannot add to any community (option disabled/unavailable)
- Can change visibility to Account or Public if desired
- Membership settings show no memberships (and cannot have any)

#### 12.14 Public VC - View Profile as Non-Host (Authenticated)

**User:** SPACE_MEMBER (not VC host, authenticated)

**Steps:**

1. Navigate to `/vc/[:publicVcNameId]` (Public visibility VC)
2. Review accessible profile information
3. Check for interaction options

**Expected Results:**

- Public VC profile is fully accessible
- Can view VC information:
  - Name, avatar, description
  - Body of Knowledge details
  - AI Persona information
  - Public activity/contributions
- Profile indicates "Public" visibility
- Cannot access VC settings (not host)
- May see "Invite to Community" option
- Can see which spaces VC is member of (if public spaces)

#### 12.15 Public VC - Listed in Store and Available for Invite

**User:** SPACE_ADMIN (different account, not VC host)

**Steps:**

1. Navigate to "Membership Test Space" settings
2. Access "Community" section
3. Click "Add VirtualContributor" or "Invite VC"
4. Search for Public VC (listedInStore: true)
5. Send invitation to VC

**Expected Results:**

- Public VC with `listedInStore: true` appears in search/browse
- Can find VC in store/directory
- Can select Public VC from different account
- "Invite" option is available (not direct add)
- Can send invitation to VC
- Invitation goes to VC host for approval
- Cannot directly add cross-account Public VC (must invite)
- Success message: "Invitation sent to Virtual Contributor host"

#### 12.16 Public VC - Not Listed in Store, Not Available for Invite

**User:** SPACE_ADMIN (different account, not VC host)

**Steps:**

1. Navigate to "Membership Test Space" settings
2. Access "Community" section
3. Attempt to search for Public VC (listedInStore: false)
4. Try to invite the VC

**Expected Results:**

- Public VC with `listedInStore: false` does NOT appear in store/directory
- Cannot find VC through search in community invite flow
- VC is public (profile accessible) but not listed for invitations
- Can still access VC profile directly via URL
- Cannot invite VC that's not listed in store
- Only same-account VCs or listed Public VCs can be invited

#### 12.17 Public VC - Accept Invitation from Different Account

**User:** ORGANIZATION_ADMIN (VC host of Public VC)

**Steps:**

1. Receive invitation for Public VC to join a space from different account
2. Navigate to notifications or VC invitations section
3. Review invitation details
4. Accept invitation on behalf of VC

**Expected Results:**

- Invitation notification appears for VC host
- Shows which space is inviting the VC
- Can review space details before accepting
- Can accept or decline invitation
- After accepting:
  - VC becomes member of the inviting space
  - VC appears in `/vc/[:vcNameId]/settings/memberships`
  - VC can be removed by space admin or opted out by host
  - Cross-account membership is established

#### 12.18 Account VC - Cannot Invite from Different Account

**User:** SPACE_ADMIN (different account, not VC host)

**Steps:**

1. Navigate to space settings in different account
2. Attempt to find/invite Account visibility VC
3. Search in VC directory/store

**Expected Results:**

- Account VCs do not appear in search for different accounts
- Cannot discover Account VCs from other accounts
- Account VCs are restricted to same-account operations only
- Only Public VCs (listed in store) are discoverable cross-account
- Message may indicate: "No VirtualContributors available for invitation"

#### 12.19 Change VC Visibility - Account to Public

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:vcNameId]/settings`
2. Locate visibility settings
3. Change from "Account" to "Public"
4. Enable or disable "Listed in Store"
5. Save changes

**Expected Results:**

- Visibility setting is available in VC settings
- Can change between: Account, Hidden, Public
- "Listed in Store" toggle appears when Public is selected
- After changing to Public:
  - VC profile becomes accessible to all authenticated users
  - If listed in store, VC becomes available for invitations
  - Existing same-account memberships remain
  - Can now receive invitations from other accounts
- Success notification confirms visibility change

#### 12.20 Change VC Visibility - Public to Hidden

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/vc/[:publicVcNameId]/settings`
2. Change visibility from "Public" to "Hidden"
3. Confirm change
4. Observe impact on memberships

**Expected Results:**

- Can change Public VC to Hidden
- After changing to Hidden:
  - VC profile becomes inaccessible to non-hosts
  - VC cannot be added to any community
  - Only host can see and manage the VC
- Success notification confirms visibility change
- **Note:** Additional behaviors (automatic membership removal, warnings) are TBD

#### 12.21 VC Memberships Visible in Organization Account Settings

**User:** ORGANIZATION_ADMIN

**Steps:**

1. Navigate to `/organization/[:organizationNameId]/settings/account`
2. Check "Virtual Contributors" section
3. Click on the VC
4. Navigate to VC memberships

**Expected Results:**

- VCs owned by organization are listed
- Can navigate to VC profile from organization settings
- VC count is accurate
- Quick access to VC memberships management
- Shows which spaces each VC is member of (summary view)

#### 12.22 VC Shows in Home Dashboard - For VC Host

**User:** ORGANIZATION_ADMIN (VC host)

**Steps:**

1. Navigate to `/home`
2. Check for VirtualContributors section

**Expected Results:**

- "My Virtual Contributors" section appears (if VCs exist)
- Shows VCs owned by user's organizations
- Shows all VCs regardless of visibility (Account, Hidden, Public)
- Each VC card displays:
  - VC avatar
  - VC name
  - Link to VC profile
- All other VC information (visibility, memberships, settings) accessible in VC's settings
- Can quickly access VC management from home

---

### Category 13: Permissions and Authorization Edge Cases

#### 13.1 Global Admin Access to Any Membership Settings

**User:** GLOBAL_ADMIN

**Steps:**

1. Navigate to `/user/space.member/settings/membership`
2. Verify access level
3. Navigate to `/organization/[:organizationNameId]/settings/membership`
4. Verify access level

**Expected Results:**

- Global admin can access any user's settings (platform administration)
- Can view and modify organization settings
- Has override permissions for administrative purposes
- Can manage memberships across the platform
- Audit logs may track global admin actions

#### 13.2 Attempt Privilege Escalation - Member to Admin

**User:** SPACE_MEMBER

**Steps:**

1. Attempt to directly access admin endpoints or settings
2. Try URL manipulation to access restricted areas
3. Observe security controls

**Expected Results:**

- All privilege escalation attempts are blocked
- 403 Forbidden for unauthorized access
- Cannot modify own role or permissions
- Cannot access admin-only features
- Security is enforced at both UI and API levels

#### 13.3 Removed Member Cannot Access Previous Space

**User:** SUBSPACE_MEMBER (after being removed from subspace)

**Steps:**

1. Get removed from "Subspace for Membership Tests" by admin
2. Attempt to navigate to subspace
3. Attempt to access subspace content

**Expected Results:**

- After removal, cannot access subspace anymore
- Attempting to access shows: "You don't have permission"
- Subspace disappears from user's memberships list
- Cannot view subspace content or discussions
- Membership removal is immediate and effective

#### 13.4 Expired or Invalid Session Access

**User:** Any authenticated user with expired session

**Steps:**

1. Log in and access membership settings
2. Wait for session to expire or manually invalidate token
3. Attempt to navigate or perform actions

**Expected Results:**

- Expired session redirects to login
- No data is accessible with invalid session
- Login prompt appears
- After re-authentication, can access content again
- No security bypass through stale sessions

---

## Critical Scenarios for Implementation (P1 Priority)

Based on the comprehensive test plan above, the following scenarios are **P1 priority** and should be implemented first.

**Legend:** ✅ Implemented | ⏸️ Skipped (blocked) | ❌ Not implemented

### **User Profile & Membership Settings (8 scenarios)**

| #   | Scenario                                                 | Status | Test File                                                                           |
| --- | -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| 1   | **1.1** - View Own User Profile - Public Information     | ✅     | `view-own-user-profile-public-information.spec.ts`                                  |
| 2   | **1.2** - View Another User's Profile - Public View      | ✅     | `view-another-user-profile-public-view.spec.ts`                                     |
| 3   | **1.3** - View Unauthenticated User Profile              | ✅     | `view-unauthenticated-user-profile.spec.ts`                                         |
| 4   | **2.1** - Access Own Membership Settings                 | ✅     | `access-own-membership-settings.spec.ts`                                            |
| 5   | **2.2** - View All Membership Levels                     | ❌     | -                                                                                   |
| 6   | **2.5** - Cannot Access Other User's Membership Settings | ⏸️     | `cannot-access-other-user-membership-settings.spec.ts` (blocked: client/server bug) |
| 7   | **3.1** - View Own Account Settings                      | ⏸️     | `view-own-account-settings.spec.ts` (blocked: user should be a host)                |
| 8   | **3.3** - Cannot Access Other User's Account Settings    | ⏸️     | `cannot-access-other-user-account-settings.spec.ts` (blocked: client/server bug)    |

### **Organization Management (7 scenarios)**

| #   | Scenario                                                          | Status | Test File                                                                 |
| --- | ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| 9   | **4.1** - View Organization Profile - Public                      | ✅     | `view-organization-profile-public.spec.ts`                                |
| 10  | **4.2** - View Organization Profile - Unauthenticated             | ✅     | `view-organization-profile-public.spec.ts` (combined with 4.1)            |
| 11  | **4.3** - View Organization Profile - As Admin                    | ✅     | `view-organization-profile-as-admin.spec.ts`                              |
| 12  | **5.1** - View Organization Account Settings - As Admin           | ✅     | `view-organization-account-settings-as-admin.spec.ts`                     |
| 13  | **5.2** - Cannot Access Organization Account Settings - Non-Admin | ✅     | `cannot-access-organization-account-settings-non-admin.spec.ts`           |
| 14  | **5.3** - View Organization with Hosted Spaces                    | ✅     | `view-organization-account-settings-as-admin.spec.ts` (combined with 5.1) |
| 15  | **6.2** - Manage Organization Members                             | ❌     | -                                                                         |
| 16  | **10.1** - Add User as Organization Associate                     | ❌     | -                                                                         |

### **Space/Subspace Access Control (6 scenarios)**

| #   | Scenario                                                     | Status | Test File                                            |
| --- | ------------------------------------------------------------ | ------ | ---------------------------------------------------- |
| 17  | **8.1** - Access Space Settings - As Space Admin             | ✅     | `access-space-settings-as-space-admin.spec.ts`       |
| 18  | **8.2** - Access Space Settings - As Space Member            | ✅     | `access-space-settings-as-space-member.spec.ts`      |
| 19  | **8.3** - Access Subspace Settings - As Subspace Admin       | ✅     | `access-subspace-settings-as-subspace-admin.spec.ts` |
| 20  | **8.4** - Access Subspace Settings - As Space Admin (Parent) | ✅     | `access-subspace-settings-as-space-admin.spec.ts`    |
| 21  | **8.5** - Access Private Subsubspace - As Non-Member         | ✅     | `access-private-subsubspace-as-non-member.spec.ts`   |
| 22  | **11.3** - View Space Community Members                      | ❌     | -                                                    |

### **VirtualContributor Memberships (10 scenarios)**

| #   | Scenario                                                         | Status | Test File |
| --- | ---------------------------------------------------------------- | ------ | --------- |
| 23  | **12.1** - View VirtualContributor Profile                       | ❌     | -         |
| 24  | **12.2** - Access VC Membership Settings - As Host               | ❌     | -         |
| 25  | **12.3** - VC Added to Space Community - Direct Assignment       | ❌     | -         |
| 26  | **12.4** - View VC in Space Community Members List               | ❌     | -         |
| 27  | **12.6** - Cannot Access VC Membership Settings - Non-Host       | ❌     | -         |
| 28  | **12.9** - Remove VC from Space - By Space Admin                 | ❌     | -         |
| 29  | **12.13** - Hidden VC - Host Can View and Manage                 | ❌     | -         |
| 30  | **12.15** - Public VC - Listed in Store and Available for Invite | ❌     | -         |
| 31  | **12.17** - Public VC - Accept Invitation from Different Account | ❌     | -         |
| 32  | **12.19** - Change VC Visibility - Account to Public             | ❌     | -         |

### **Security & Permissions (4 scenarios)**

| #   | Scenario                                                  | Status | Test File                                           |
| --- | --------------------------------------------------------- | ------ | --------------------------------------------------- |
| 33  | **13.1** - Global Admin Access to Any Membership Settings | ❌     | -                                                   |
| 34  | **13.2** - Attempt Privilege Escalation - Member to Admin | ❌     | -                                                   |
| 35  | **13.3** - Removed Member Cannot Access Previous Space    | ✅     | removed-member-cannot-access-previous-space.spec.ts |
| 36  | **13.4** - Expired or Invalid Session Access              | ❌     | -                                                   |

### **P1 Implementation Summary**

| Category                           | Total  | ✅ Implemented | ⏸️ Skipped | ❌ Not Implemented |
| ---------------------------------- | ------ | -------------- | ---------- | ------------------ |
| User Profile & Membership Settings | 8      | 4              | 3          | 1                  |
| Organization Management            | 7      | 6              | 0          | 1                  |
| Space/Subspace Access Control      | 6      | 6              | 0          | 0                  |
| VirtualContributor Memberships     | 10     | 0              | 0          | 10                 |
| Security & Permissions             | 4      | 1              | 0          | 3                  |
| **Total P1 Scenarios**             | **35** | **17**         | **3**      | **15**             |

### **Additional Implemented Tests (Beyond P1)**

| Scenario                                              | Test File                                                     | Notes                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **8.6** - Access Private Subsubspace - As Member (P2) | `access-private-subsubspace-as-member.spec.ts`                | Verifies member access to private subsubspace                  |
| **7.1** - View Home Dashboard - Authenticated User    | `view-home-dashboard-authenticated-user.spec.ts`              | Category 7 marked as "skip (to be redesigned)" but test exists |
| **7.2** - View Home Dashboard - Multiple Memberships  | `view-home-dashboard-multiple-memberships.spec.ts`            | Category 7 marked as "skip (to be redesigned)" but test exists |
| Access Private Subspace in Private Space - Non-Member | `access-private-subspace-in-private-space-non-member.spec.ts` | Additional edge case test                                      |

---

## Testing Notes

- **Authentication Required**: Most scenarios require authenticated users from the seed
- **Test Data Isolation**: Each test should verify the specific user's access level
- **Cleanup**: Tests involving adding/removing memberships should clean up state
- **Cross-Browser**: Test on Chrome, Firefox, Safari, Edge
- **Responsive**: Verify on mobile, tablet, and desktop viewports
- **Performance**: Monitor page load times for membership lists with many items

## Out of Scope for Initial Implementation

- Email notification verification (covered in separate notification tests)
- Advanced filtering and search within membership lists
- Bulk membership operations
- Integration with external identity providers
- Detailed audit logging verification
- Migration scenarios for existing memberships

---

## Summary of All Test Scenarios

**Legend:** ✅ Implemented | ⏸️ Skipped (blocked) | ❌ Not implemented

### Category 1: User Profile Membership Display (3 scenarios)

1. **1.1** - View Own User Profile - Public Information - P1 ✅ `view-own-user-profile-public-information.spec.ts`
2. **1.2** - View Another User's Profile - Public View - P1 ✅ `view-another-user-profile-public-view.spec.ts`
3. **1.3** - View Unauthenticated User Profile - P1 ✅ `view-unauthenticated-user-profile.spec.ts`

### Category 2: User Membership Settings (5 scenarios)

4. **2.1** - Access Own Membership Settings - P1 ✅ `access-own-membership-settings.spec.ts`
5. **2.2** - View All Membership Levels - P1 ❌
6. **2.3** - Leave a Space Membership - P2 ✅ `access-own-membership-settings.spec.ts` (combined with 2.1)
7. **2.4** - View Pending Applications - P3 ❌
8. **2.5** - Cannot Access Other User's Membership Settings - P1 ⏸️ `cannot-access-other-user-membership-settings.spec.ts`

### Category 3: User Account Settings (3 scenarios)

9. **3.1** - View Own Account Settings - P1 ⏸️ `view-own-account-settings.spec.ts`
10. **3.2** - View Account with No Hosted Resources - P2 ❌
11. **3.3** - Cannot Access Other User's Account Settings - P1 ⏸️ `cannot-access-other-user-account-settings.spec.ts`

### Category 4: Organization Profile Access (3 scenarios)

12. **4.1** - View Organization Profile - Public - P1 ✅ `view-organization-profile-public.spec.ts`
13. **4.2** - View Organization Profile - Unauthenticated - P1 ✅ `view-organization-profile-public.spec.ts` (combined with 4.1)
14. **4.3** - View Organization Profile - As Admin - P1 ✅ `view-organization-profile-as-admin.spec.ts`

### Category 5: Organization Account Settings (3 scenarios)

15. **5.1** - View Organization Account Settings - As Admin - P1 ✅ `view-organization-account-settings-as-admin.spec.ts`
16. **5.2** - Cannot Access Organization Account Settings - Non-Admin - P3 ✅ `cannot-access-organization-account-settings-non-admin.spec.ts`
17. **5.3** - View Organization with Hosted Spaces - P1 ✅ `view-organization-account-settings-as-admin.spec.ts` (combined with 5.1)

### Category 6: Organization Membership Settings (4 scenarios)

18. **6.1** - View Organization Membership Settings - As Admin - P3 ❌
19. **6.2** - Manage Organization Members - P1 ❌
20. **6.3** - Organization Domain-Based Auto-Join - P4 ❌
21. **6.4** - Cannot Access Organization Membership Settings - Non-Admin - N/A (no such settings)

### Category 7: Home Dashboard Membership Display (4 scenarios) - skip (to be redesigned)

22. **7.1** - View Home Dashboard - Authenticated User ✅ `view-home-dashboard-authenticated-user.spec.ts`
23. **7.2** - View Home Dashboard - Multiple Memberships ✅ `view-home-dashboard-multiple-memberships.spec.ts`
24. **7.3** - View Home Dashboard - No Memberships ❌
25. **7.4** - View Home Dashboard - Organization Memberships ❌

### Category 8: Space/Subspace Settings Access Control (7 scenarios)

26. **8.1** - Access Space Settings - As Space Admin - P1 ✅ `access-space-settings-as-space-admin.spec.ts`
27. **8.2** - Access Space Settings - As Space Member - P1 ✅ `access-space-settings-as-space-member.spec.ts`
28. **8.3** - Access Subspace Settings - As Subspace Admin - P1 ✅ `access-subspace-settings-as-subspace-admin.spec.ts`
29. **8.4** - Access Subspace Settings - As Space Admin (Parent) - P1 ✅ `access-subspace-settings-as-space-admin.spec.ts`
30. **8.5** - Access Private Subsubspace - As Non-Member - P1 ✅ `access-private-subsubspace-as-non-member.spec.ts`
31. **8.6** - Access Private Subsubspace - As Member - P2 ✅ `access-private-subsubspace-as-member.spec.ts`
32. **8.7** - Access Private Subsubspace Settings - As Subsubspace Admin - P3 ❌

### Category 8 (Additional): Private Space Scenarios

- Access Private Subspace in Private Space - As Non-Member ✅ `access-private-subspace-in-private-space-non-member.spec.ts`
- Access Private Subspace in Private Space - Unauthenticated ✅ `access-private-subspace-in-private-space-non-member.spec.ts` (second test)

### Category 9: Membership Application Workflows (3 scenarios)

33. **9.1** - Apply to Join Public Space - covered in another suite
34. **9.2** - Withdraw Pending Application - N/A (not implemented feature)
35. **9.3** - Approve Membership Application - As Space Admin - covered in another suite

### Category 10: Organization Associate Management (3 scenarios)

36. **10.1** - Add User as Organization Associate - P1 ❌
37. **10.2** - Accept Organization Invitation - N/A (not implemented on client as feature)
38. **10.3** - Remove Organization Associate - P3 ❌

### Category 11: Cross-Level Membership Visibility (3 scenarios)

39. **11.1** - View User Profile Showing Multiple Membership Levels - P2 ❌
40. **11.2** - View Organization Members List - P2 ❌
41. **11.3** - View Space Community Members - P1 ❌

### Category 12: VirtualContributor Membership Management (22 scenarios)

42. **12.1** - View VirtualContributor Profile - P1 ❌
43. **12.2** - Access VC Membership Settings - As Host - P1 ❌
44. **12.3** - VC Added to Space Community - Direct Assignment - P1 ❌
45. **12.4** - View VC in Space Community Members List - P1 ❌
46. **12.5** - VC Opt Out from Space Membership - As Host - TBD ❌
47. **12.6** - Cannot Access VC Membership Settings - Non-Host - P1 ❌
48. **12.7** - VC Cannot Be Added to Subspace (L1) - P3 ❌
49. **12.8** - VC Cannot Be Added to Subsubspace (L2) - P3 ❌
50. **12.9** - Remove VC from Space - By Space Admin - P1 ❌
51. **12.10** - Account VC - Profile Not Accessible to Non-Host - TBD ❌
52. **12.11** - Hidden VC - Cannot Be Added to Any Space - P3 ❌
53. **12.12** - Hidden VC - Profile Only Accessible to Host - P3 ❌
54. **12.13** - Hidden VC - Host Can View and Manage - P1 ❌
55. **12.14** - Public VC - View Profile as Non-Host (Authenticated) - P2 ❌
56. **12.15** - Public VC - Listed in Store and Available for Invite - P1 ❌
57. **12.16** - Public VC - Not Listed in Store, Not Available for Invite - P3 ❌
58. **12.17** - Public VC - Accept Invitation from Different Account - P1 ❌
59. **12.18** - Account VC - Cannot Invite from Different Account - P3 ❌
60. **12.19** - Change VC Visibility - Account to Public - P1 ❌
61. **12.20** - Change VC Visibility - Public to Hidden - P3 ❌
62. **12.21** - VC Memberships Visible in Organization Account Settings - P2 ❌
63. **12.22** - VC Shows in Home Dashboard - For VC Host - P3 ❌

### Category 13: Permissions and Authorization Edge Cases (4 scenarios)

64. **13.1** - Global Admin Access to Any Membership Settings - P1 ❌
65. **13.2** - Attempt Privilege Escalation - Member to Admin - P1 ❌
66. **13.3** - Removed Member Cannot Access Previous Space - P1 ✅
67. **13.4** - Expired or Invalid Session Access - P1 ❌

---

## Implementation Statistics

| Category                                     | Total  | ✅ Implemented | ⏸️ Skipped | ❌ Not Implemented | N/A   |
| -------------------------------------------- | ------ | -------------- | ---------- | ------------------ | ----- |
| 1. User Profile Membership Display           | 3      | 3              | 0          | 0                  | 0     |
| 2. User Membership Settings                  | 5      | 2              | 1          | 2                  | 0     |
| 3. User Account Settings                     | 3      | 0              | 2          | 1                  | 0     |
| 4. Organization Profile Access               | 3      | 3              | 0          | 0                  | 0     |
| 5. Organization Account Settings             | 3      | 3              | 0          | 0                  | 0     |
| 6. Organization Membership Settings          | 4      | 0              | 0          | 3                  | 1     |
| 7. Home Dashboard Membership Display         | 4      | 2              | 0          | 2                  | 0     |
| 8. Space/Subspace Settings Access Control    | 7 + 2  | 8              | 0          | 1                  | 0     |
| 9. Membership Application Workflows          | 3      | 0              | 0          | 0                  | 3     |
| 10. Organization Associate Management        | 3      | 0              | 0          | 2                  | 1     |
| 11. Cross-Level Membership Visibility        | 3      | 0              | 0          | 3                  | 0     |
| 12. VirtualContributor Membership Management | 22     | 0              | 0          | 22                 | 0     |
| 13. Permissions and Authorization Edge Cases | 4      | 0              | 0          | 4                  | 0     |
| **Total**                                    | **69** | **21**         | **3**      | **40**             | **5** |

**Test Files Location:** `client-web/src/functional-e2e/memberships/`

**Total Test Files:** 21

---

**Total Test Scenarios: 67** (+ 2 additional private space scenarios)

- **Category 1**: 3 scenarios (3 implemented)
- **Category 2**: 5 scenarios (2 implemented, 1 skipped)
- **Category 3**: 3 scenarios (0 implemented, 2 skipped)
- **Category 4**: 3 scenarios (3 implemented)
- **Category 5**: 3 scenarios (3 implemented)
- **Category 6**: 4 scenarios (0 implemented)
- **Category 7**: 4 scenarios (2 implemented)
- **Category 8**: 7 scenarios + 2 additional (8 implemented)
- **Category 9**: 3 scenarios (covered elsewhere / N/A)
- **Category 10**: 3 scenarios (0 implemented)
- **Category 11**: 3 scenarios (0 implemented)
- **Category 12**: 22 scenarios (0 implemented)
- **Category 13**: 4 scenarios (0 implemented)
