# Alkemio Space Entity CRUD Operations - Comprehensive Test Plan

## Application Overview

The Alkemio platform provides Space entities as the primary organizational unit for collaboration. A Space contains:

- **Profile Information**: Name, tagline, location (city/country), tags, references, visuals
- **Description Content**: What, Why, Who sections with rich markdown support
- **Settings**: Visibility (Public/Private), Membership (Open/Application/Invitation-only), Allowed Actions
- **Community Management**: Members (users/organizations), Applications, Invitations, Virtual Contributors
- **Layout Configuration**: Tab settings (Home, Community, Subspaces, Knowledge)
- **Account Information**: URL, Visibility mode, Host organization, License

### Key User Personas

| Persona           | Role               | Permissions                                    |
| ----------------- | ------------------ | ---------------------------------------------- |
| Host              | Organization admin | Create/manage Spaces from organization account |
| Facilitator       | Space admin + lead | Full CRUD operations on Space                  |
| Community Manager | Space admin        | Manage community, settings                     |
| Global Admin      | Platform admin     | Full access to all Spaces                      |
| Stakeholder       | Space member       | Read access, limited contributions             |
| New User          | No account         | Explore public Spaces only                     |

---

## Test Scenarios

### 0. CREATE Space Operations (Organization Account) - HIGH PRIORITY

**Seed:** `./client-web/src/functional-e2e/seed-minimal.spec.ts`
**Implementation:** `./organization-space-create.spec.ts`

> **Priority Note:** These tests verify the primary use case for Space creation - organizations (Hosts) creating Spaces from their organization account. This aligns with the "Host" persona (Organization admin) workflow.

#### 0.1 Create Space from Organization - Happy Path (Valid Data) ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin (`organization.admin@alkem.io`)
- Organization has not exceeded Space quota

**Steps:**

1. Navigate to Organization Account page (`/organization/{orgNameId}/settings/account`)
2. Verify "Hosted Spaces" heading is visible
3. Click the "Add" button next to Hosted Spaces
4. Verify "Create a new Space" dialog appears
5. Fill in the required fields:
   - Title: "Test Space Alpha"
   - URL: "test-space-alpha"
   - Tagline: "A collaborative space for testing"
6. Verify Create button is disabled before accepting terms
7. Check the terms and agreements checkbox
8. Verify Create button becomes enabled
9. Click Cancel to close dialog without creating

**Expected Results:**

- Organization admin can access organization's account settings
- Dialog opens with all form elements visible
- Create button disabled until terms accepted
- Create button enabled after terms accepted
- Dialog closes on Cancel

#### 0.2 Create Space from Organization - With Template Selection ⏸️

**Status:** Skipped - Requires templates to be available in the environment

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin
- Templates are available in the platform

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Click "Change Template" button
4. Select a template from the template library
5. Verify template pre-fills relevant fields (description, layout, etc.)
6. Complete remaining required fields
7. Accept terms and create Space

**Expected Results:**

- Space is created under organization account with template configuration applied
- Tab layout matches template specification
- Default content from template is populated
- Organization is shown as Space host

#### 0.3 Create Space from Organization - With Visual Assets ⏸️

**Status:** Skipped - Requires file upload testing infrastructure

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Fill in required fields (Title, URL)
4. Click "Upload" button for Page Banner
5. Upload an image (1536x256 pixels recommended)
6. Click "Upload" button for Card Banner
7. Upload an image (410x256 pixels recommended)
8. Accept terms and create Space

**Expected Results:**

- Space is created under organization account with uploaded visual assets
- Page banner displays at top of Space
- Card banner displays in Space cards on Explore Spaces page
- Organization branding applied to Space

#### 0.4 Create Space from Organization - With Tutorials Enabled ⏸️

**Status:** Skipped - Requires fix

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Fill in required fields (Title: "Tutorial Space {uniqueId}", URL: "tutor-{uniqueId}")
4. Verify "Add Tutorials to this Space" checkbox is initially unchecked
5. Check the tutorials checkbox
6. Verify checkbox is checked
7. Check terms checkbox
8. Verify Create button is enabled and click it
9. Verify success dialog appears with "🎉 Your Space is Ready!"
10. Click "Get Started" to navigate to Space page
11. Verify all tutorial headings are visible
12. Cleanup: Navigate to Settings > Account and delete the Space

**Expected Results:**

- Tutorials checkbox toggles correctly
- Space is created successfully under organization with tutorials enabled
- All tutorial sections are visible on the Space home page
- Organization shown as Space host
- Space is deleted successfully during cleanup

#### 0.5 Create Space from Organization - Validation: Missing Required Fields (Title) ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Leave Title field empty
4. Fill in URL field only ("test-space-no-title")
5. Check terms checkbox
6. Verify Create button state
7. Close dialog

**Expected Results:**

- "Create" button remains disabled
- Title is required for Space creation

#### 0.6 Create Space from Organization - Validation: URL Length Exceeded ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Fill in Title field ("This Is A Very Long Space Title That Exceeds Limit")
4. Enter URL longer than 25 characters ("this-url-is-way-too-long-for-validation")
5. Verify character count indicator shows exceeded limit (e.g., "40/25")
6. Check terms checkbox
7. Verify Create button state
8. Close dialog

**Expected Results:**

- Character count indicator visible showing limit exceeded
- "Create" button remains disabled due to URL length validation
- URL field must be 25 characters or less

#### 0.7 Create Space from Organization - Validation: Duplicate URL ⏸️

**Status:** Skipped - Requires existing Space with known URL

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin
- A Space with the target URL already exists

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Enter a URL that already exists (e.g., "eco1")
4. Attempt to create Space

**Expected Results:**

- Error message indicating URL is already taken
- User prompted to choose a different URL

#### 0.8 Create Space from Organization - Validation: Terms Not Accepted ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Fill in Title ("Test Space") and URL ("test-space") fields correctly
4. Verify terms checkbox is unchecked
5. Verify "Create" button state
6. Close dialog

**Expected Results:**

- "Create" button remains disabled
- Cannot create Space without accepting terms

#### 0.9 Create Space from Organization - Quota Exceeded ⏸️

**Status:** Skipped - Requires organization with exhausted Space quota

**Preconditions:**

- Organization has already created maximum allowed Spaces (based on license)
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Attempt to add a new Space

**Expected Results:**

- "Add" button is disabled or shows upgrade prompt
- Message indicates quota reached
- Link to upgrade organization license is provided

#### 0.10 Create Space from Organization - Dialog Form Elements Verification ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Verify all form elements are present
4. Close dialog

**Expected Results:**

- "Change Template" button visible
- Title field (required) visible
- URL field visible
- Tagline field visible
- Tags combobox visible
- Two Upload buttons (Page Banner, Card Banner) visible
- "Add Tutorials to this Space" checkbox visible
- Terms acceptance checkbox visible
- Cancel button visible
- Create button visible
- Close (X) button visible

#### 0.11 Create Space from Organization - URL Auto-generation from Title ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open the "Create a new Space" dialog
3. Fill in Title: "My New Space"
4. Observe URL field
5. Close dialog

**Expected Results:**

- URL auto-generated from Title (lowercase, no spaces)
- URL field contains value matching pattern "mynewspace"

#### 0.12 Create Space from Organization - Cancel Closes Dialog Without Changes ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Verify "Hosted Spaces" heading is visible
3. Open Create Space dialog
4. Fill in Title field with "Cancelled Space"
5. Click Cancel button
6. Verify dialog is closed
7. Verify "Hosted Spaces" heading still visible (still on Organization Account page)

**Expected Results:**

- Dialog closes
- Still on Organization Account page
- "Hosted Spaces" heading still visible
- No Space created

#### 0.13 Create Space from Organization - Close Button Closes Dialog ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Open Create Space dialog
3. Fill in Title field with "To Be Closed"
4. Click Close (X) button
5. Verify dialog is closed

**Expected Results:**

- Dialog closes
- No Space created

#### 0.14 Create Space from Organization - Successfully Creates New Space ✅

**Status:** Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin

**Steps:**

1. Navigate to Organization Account page
2. Verify "Hosted Spaces" heading visible
3. Open Create Space dialog
4. Fill in required fields:
   - Title: "Test Space {uniqueId}" (use last 6 digits of timestamp)
   - URL: "test-{uniqueId}" (must be ≤25 characters)
   - Tagline: "E2E test space for automated testing"
5. Accept terms checkbox
6. Click Create button
7. Wait for create dialog to close
8. Verify redirect to new Space page (URL contains spaceUrl)
9. Verify "Your Space is Ready!" success dialog appears
10. Click "GET STARTED" button to dismiss success dialog
11. Verify success dialog is hidden
12. Verify Space title heading is visible
13. Verify Organization is shown as Space host ("Led by" section)
14. **Cleanup:** Navigate to Settings tab, then Account tab
15. Click "Delete this Space" text (exact match)
16. Verify delete confirmation dialog appears
17. Check confirmation checkbox ("Please check this box if you are certain...")
18. Click "Yes, delete" button
19. Verify redirect to home/spaces page

**Expected Results:**

- Space created successfully under organization account
- Success dialog with "Your Space is Ready!" message appears
- Redirected to new Space page
- Space displays correct title
- Organization displayed as Space host
- Cleanup: Space deleted successfully

**Implementation Notes:**

- Organization admin (`organization.admin@alkem.io`) must be assigned to the organization
- Navigate to `/organization/{orgNameId}/settings/account` to access Hosted Spaces
- Organization's `nameId` is obtained from `baseScenario.organization.nameId`
- "Delete this Space" is a clickable text element, not a button
- Delete confirmation requires checking a checkbox before "Yes, delete" button is enabled
- URL must be ≤25 characters to pass validation

#### 0.15 Create Space from Organization - Verify Organization as Host ⏸️

**Status:** Not Implemented

**Preconditions:**

- Organization exists with valid account and license
- User is logged in as Organization Admin
- Space was created from organization account

**Steps:**

1. Navigate to Organization Account page
2. Create a new Space from organization account
3. Navigate to the newly created Space
4. Verify organization is displayed as Space host
5. Navigate to Explore Spaces page
6. Find the created Space card
7. Verify "Led by" shows organization name
8. Cleanup: Delete the Space

**Expected Results:**

- Space shows organization as host, not individual user
- Organization avatar/name visible in Space header
- "Led by" on Space card shows organization

---

### 1. CREATE Space Operations (User Account)

**Seed:** `./client-web/src/functional-e2e/seed-minimal.spec.ts`
**Implementation:** `./space-create.spec.ts`

> **Note:** These tests cover Space creation from a user's personal account. For the primary organization-based workflow, see Section 0 above.

#### 1.1 Create Space - Happy Path (Valid Data) ✅

**Status:** Implemented

**Preconditions:**

- User is logged in with account permissions to create Spaces
- User has not exceeded their Space quota (e.g., 0/3 Hosted Spaces)

**Steps:**

1. Navigate to My Account (`/user/{username}/settings/account`)
2. Verify "Hosted Spaces" heading is visible
3. Click the "Add" button next to Hosted Spaces
4. Verify "Create a new Space" dialog appears
5. Fill in the required fields:
   - Title: "Test Space Alpha"
   - URL: "test-space-alpha"
   - Tagline: "A collaborative space for testing"
6. Verify Create button is disabled before accepting terms
7. Check the terms and agreements checkbox
8. Verify Create button becomes enabled
9. Click Cancel to close dialog without creating

**Expected Results:**

- Dialog opens with all form elements visible
- Create button disabled until terms accepted
- Create button enabled after terms accepted
- Dialog closes on Cancel

#### 1.2 Create Space - With Template Selection ⏸️

**Status:** Skipped - Requires templates to be available in the environment

**Steps:**

1. Open the "Create a new Space" dialog
2. Click "Change Template" button
3. Select a template from the template library
4. Verify template pre-fills relevant fields (description, layout, etc.)
5. Complete remaining required fields
6. Accept terms and create Space

**Expected Results:**

- Space is created with template configuration applied
- Tab layout matches template specification
- Default content from template is populated

**Notes:**

- Template Library dialog opens but shows "No Templates in the Space library"
- Test requires platform templates to be configured first

#### 1.3 Create Space - With Visual Assets ⏸️

**Status:** Skipped - Requires file upload testing infrastructure

**Steps:**

1. Open the "Create a new Space" dialog
2. Fill in required fields (Title, URL)
3. Click "Upload" button for Page Banner
4. Upload an image (1536x256 pixels recommended)
5. Click "Upload" button for Card Banner
6. Upload an image (410x256 pixels recommended)
7. Accept terms and create Space

**Expected Results:**

- Space is created with uploaded visual assets
- Page banner displays at top of Space
- Card banner displays in Space cards on Explore Spaces page

**Notes:**

- Requires test image files and file upload handling

#### 1.4 Create Space - With Tutorials Enabled ⏸️

**Status:** Skipped - Requires fix

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Fill in required fields (Title: "Tutorial Space {uniqueId}", URL: "tutor-{uniqueId}")
4. Verify "Add Tutorials to this Space" checkbox is initially unchecked
5. Check the tutorials checkbox
6. Verify checkbox is checked
7. Check terms checkbox
8. Verify Create button is enabled and click it
9. Verify success dialog appears with "🎉 Your Space is Ready!"
10. Click "Get Started" to navigate to Space page
11. Verify all tutorial headings are visible:
    - "👋 Welcome to your space!"
    - "📚 The Knowledge Base"
    - "↪️ Subspaces"
    - "🤝 Set up your Community"
    - "⚙️ Set it up your way!"
    - "🧩 Collaboration tools"
    - "🧹 Cleaning up"
12. Cleanup: Navigate to Settings > Account and delete the Space

**Expected Results:**

- Tutorials checkbox toggles correctly
- Space is created successfully with tutorials enabled
- All 7 tutorial sections are visible on the Space home page
- Space is deleted successfully during cleanup

#### 1.5 Create Space - Validation: Missing Required Fields (Title) ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Leave Title field empty
4. Fill in URL field only ("test-space-no-title")
5. Check terms checkbox
6. Verify Create button state
7. Close dialog

**Expected Results:**

- "Create" button remains disabled
- Title is required for Space creation

#### 1.6 Create Space - Validation: URL Length Exceeded ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Fill in Title field ("This Is A Very Long Space Title That Exceeds Limit")
4. Enter URL longer than 25 characters ("this-url-is-way-too-long-for-validation")
5. Verify character count indicator shows exceeded limit (e.g., "40/25")
6. Check terms checkbox
7. Verify Create button state
8. Close dialog

**Expected Results:**

- Character count indicator visible showing limit exceeded
- "Create" button remains disabled due to URL length validation
- URL field must be 25 characters or less

#### 1.7 Create Space - Validation: Duplicate URL ⏸️

**Status:** Skipped - Requires existing Space with known URL

**Steps:**

1. Open the "Create a new Space" dialog
2. Enter a URL that already exists (e.g., "eco1")
3. Attempt to create Space

**Expected Results:**

- Error message indicating URL is already taken
- User prompted to choose a different URL

**Notes:**

- Test requires a pre-existing Space with a known URL to test against

#### 1.8 Create Space - Validation: Terms Not Accepted ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Fill in Title ("Test Space") and URL ("test-space") fields correctly
4. Verify terms checkbox is unchecked
5. Verify "Create" button state
6. Close dialog

**Expected Results:**

- "Create" button remains disabled
- Cannot create Space without accepting terms

#### 1.9 Create Space - Quota Exceeded ⏸️

**Status:** Skipped - Requires user with exhausted Space quota

**Preconditions:**

- User has already created maximum allowed Spaces (e.g., 3/3)

**Steps:**

1. Navigate to My Account
2. Attempt to add a new Space

**Expected Results:**

- "Add" button is disabled or shows upgrade prompt
- Message indicates quota reached
- Link to upgrade license is provided

**Notes:**

- Test requires a user account that has reached their Space quota limit (3/3)

#### 1.10 Create Space - Dialog Form Elements Verification ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Verify all form elements are present
4. Close dialog

**Expected Results:**

- "Change Template" button visible
- Title field (required) visible
- URL field visible
- Tagline field visible
- Tags combobox visible
- Two Upload buttons (Page Banner, Card Banner) visible
- "Add Tutorials to this Space" checkbox visible
- Terms acceptance checkbox visible
- Cancel button visible
- Create button visible
- Close (X) button visible

#### 1.11 Create Space - URL Auto-generation from Title ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open the "Create a new Space" dialog
3. Fill in Title: "My New Space"
4. Observe URL field
5. Close dialog

**Expected Results:**

- URL auto-generated from Title (lowercase, no spaces)
- URL field contains value matching pattern "mynewspace"

#### 1.12 Create Space - Cancel Closes Dialog Without Changes ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Verify "Hosted Spaces" heading is visible
3. Open Create Space dialog
4. Fill in Title field with "Cancelled Space"
5. Click Cancel button
6. Verify dialog is closed
7. Verify "Hosted Spaces" heading still visible (still on My Account page)

**Expected Results:**

- Dialog closes
- Still on My Account page
- "Hosted Spaces" heading still visible
- No Space created

#### 1.13 Create Space - Close Button Closes Dialog ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Open Create Space dialog
3. Fill in Title field with "To Be Closed"
4. Click Close (X) button
5. Verify dialog is closed

**Expected Results:**

- Dialog closes
- No Space created

#### 1.14 Create Space - Successfully Creates New Space ✅

**Status:** Implemented

**Steps:**

1. Navigate to My Account
2. Verify "Hosted Spaces" heading visible
3. Open Create Space dialog
4. Fill in required fields:
   - Title: "Test Space {uniqueId}" (use last 6 digits of timestamp)
   - URL: "test-{uniqueId}" (must be ≤25 characters)
   - Tagline: "E2E test space for automated testing"
5. Accept terms checkbox
6. Click Create button
7. Wait for create dialog to close
8. Verify redirect to new Space page (URL contains spaceUrl)
9. Verify "Your Space is Ready!" success dialog appears
10. Click "GET STARTED" button to dismiss success dialog
11. Verify success dialog is hidden
12. Verify Space title heading is visible
13. **Cleanup:** Navigate to Settings tab, then Account tab
14. Click "Delete this Space" text (exact match)
15. Verify delete confirmation dialog appears
16. Check confirmation checkbox ("Please check this box if you are certain...")
17. Click "Yes, delete" button
18. Verify redirect to home/spaces page

**Expected Results:**

- Space created successfully
- Success dialog with "Your Space is Ready!" message appears
- Redirected to new Space page
- Space displays correct title
- Cleanup: Space deleted successfully

**Implementation Notes:**

- "Delete this Space" is a clickable text element, not a button (use `getByText('Delete this Space', { exact: true })`)
- Delete confirmation requires checking a checkbox before "Yes, delete" button is enabled
- URL must be ≤25 characters to pass validation

---

### 2. READ Space Operations

**Seed:** `./client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 2.1 View Space List - Explore Spaces Page

**Steps:**

1. Navigate to Explore Spaces page (`/spaces`)
2. Verify page displays all accessible Spaces

**Expected Results:**

- Space cards display with:
  - Card banner image
  - Avatar
  - Space name as heading
  - Visibility icon (if applicable)
  - Tagline/description
  - "Led by:" section with host organization/user
- Filter options available (All Spaces, Member Spaces, Public Spaces)
- Search functionality available

#### 2.2 Filter Spaces by Category

**Steps:**

1. Navigate to Explore Spaces page
2. Click "All Spaces" button (default)
3. Click "Member Spaces" button
4. Click "Public Spaces" button

**Expected Results:**

- Each filter shows appropriate subset of Spaces
- Count updates based on filter selection
- UI clearly indicates active filter

#### 2.3 Search Spaces

**Steps:**

1. Navigate to Explore Spaces page
2. Enter search term in "Search…" combobox
3. Press Enter or wait for auto-search

**Expected Results:**

- Results filter to match search term
- Search matches against Space name, tagline, or tags
- No results message if no matches found

#### 2.4 View Space Home Page - Authenticated User

**Preconditions:**

- User is logged in

**Steps:**

1. Click on a Space card from Explore Spaces
2. Wait for Space to load

**Expected Results:**

- Banner displays at top with Space visual
- Space title and tagline visible
- Tab navigation available: Home, Community, Subspaces, Knowledge, Activity, Share, Settings (if admin)
- Home tab content displays:
  - About section with description
  - Hierarchy navigation
  - Events section
  - Post button (if allowed)
- "Powered by Alkemio" link visible

#### 2.5 View Space Home Page - Anonymous User (Public Space)

**Preconditions:**

- User is not logged in
- Space visibility is set to "Public"

**Steps:**

1. Navigate directly to Space URL (`/{space-nameId}`)

**Expected Results:**

- Space content is visible
- "Apply to our community" prompt is shown
- Limited functionality without login
- Option to login/signup presented

#### 2.6 View Space Home Page - Anonymous User (Private Space)

**Preconditions:**

- User is not logged in
- Space visibility is set to "Private"

**Steps:**

1. Navigate directly to Space URL

**Expected Results:**

- Space profile information visible (name, tagline, context)
- Space content (callouts, posts) hidden
- Message indicating content is members-only
- Prompt to apply/login

#### 2.7 View Space Tabs Navigation

**Steps:**

1. Navigate to a Space as logged-in member
2. Click "Community" tab
3. Click "Subspaces" tab
4. Click "Knowledge" tab
5. Click "Activity" tab
6. Click "Share" tab

**Expected Results:**

- Each tab loads corresponding content:
  - Community: Member list, community guidelines
  - Subspaces: List of child Subspaces with cards
  - Knowledge: Knowledge base documents and materials
  - Activity: Timeline of Space activity
  - Share: Sharing options and links

#### 2.8 View Space About Section

**Steps:**

1. Navigate to Space Home tab
2. Click "About this Space" button

**Expected Results:**

- Modal/panel opens showing full Space description
- What, Why, Who sections displayed
- Host organization information shown
- Reference links visible

---

### 3. UPDATE Space Operations

**Seed:** `./client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 3.1 Update Space Profile - About Tab

**Preconditions:**

- User is Space admin

**Steps:**

1. Navigate to Space Settings (`/{space}/settings/about`)
2. Modify "Name" field to "Updated Space Name"
3. Modify "Tagline" field
4. Select a Country from dropdown
5. Enter a City
6. Add Tags via the Tags combobox
7. Click "Save" button

**Expected Results:**

- Success notification appears
- Changes are persisted
- Space header updates to show new name
- Changes visible on Explore Spaces page

#### 3.2 Update Space Profile - Description Fields

**Steps:**

1. Navigate to Space Settings > About tab
2. Scroll to Description section
3. Edit "What" field using rich markdown editor
4. Edit "Why" field
5. Edit "Who" field
6. Click "Save" button

**Expected Results:**

- Markdown formatting preserved
- All description fields updated
- Changes visible in "About this Space" panel

#### 3.3 Update Space Visual Assets

**Steps:**

1. Navigate to Space Settings > About tab
2. Scroll to Visuals section
3. Click "Edit" button for Page banner
4. Upload new image
5. Click "Edit" button for Card banner
6. Upload new image

**Expected Results:**

- New images display immediately
- Changes propagate to Space header and cards
- Old images replaced

#### 3.4 Update Space References

**Steps:**

1. Navigate to Space Settings > About tab
2. Click "Add Reference" button
3. Enter reference title and URL
4. Save changes

**Expected Results:**

- New reference appears in About section
- Link is clickable and navigates correctly

#### 3.5 Update Space Visibility Settings

**Preconditions:**

- User is Space admin

**Steps:**

1. Navigate to Space Settings > Settings tab (`/{space}/settings/settings`)
2. Locate "Visibility" section
3. Click "Public" radio button (if currently Private)
4. Observe confirmation prompt

**Expected Results:**

- Visibility setting updates
- Public Spaces visible to all users
- Private Spaces content restricted to members

#### 3.6 Update Space Membership Settings

**Steps:**

1. Navigate to Space Settings > Settings tab
2. Locate "Membership" section
3. Select "No Application required" option

**Expected Results:**

- Membership type changes
- New users can directly join without application
- Settings persist after page refresh

#### 3.7 Update Space Membership - Application Required

**Steps:**

1. Navigate to Space Settings > Settings tab
2. Select "Application required" option
3. Expand "Application Form" section
4. Customize application questions
5. Save changes

**Expected Results:**

- Application form available for new members
- Custom questions appear in application flow

#### 3.8 Update Space Membership - Invitation Only

**Steps:**

1. Select "Invitation only" option
2. Navigate to Community settings
3. Click "Invite" button
4. Select users to invite

**Expected Results:**

- No public join button visible
- Only invited users can become members

#### 3.9 Update Space - Trusted Applicants Setting

**Steps:**

1. Navigate to Space Settings > Settings tab
2. Check "Host organization" checkbox under Trusted applicants

**Expected Results:**

- Members of host organization can join directly
- Setting persists correctly

#### 3.10 Update Space Allowed Actions

**Steps:**

1. Navigate to Space Settings > Settings tab
2. Toggle various allowed actions:
   - Space invitations
   - Create posts
   - Video Call
   - Guest Contributions
   - Create Subspaces
   - Subspace events
   - Alkemio Support

**Expected Results:**

- Each toggle updates corresponding permission
- Features enabled/disabled according to settings

#### 3.11 Update Space Layout - Tab Settings

**Steps:**

1. Navigate to Space Settings > Layout tab
2. Edit tab descriptions
3. Reorder tabs (if supported)
4. Toggle tab visibility

**Expected Results:**

- Tab configuration updates
- Changes reflect in Space tab navigation

#### 3.12 Update Space Community - Add Member User

**Steps:**

1. Navigate to Space Settings > Community tab
2. Click "Add" button under "Member Users"
3. Search for a user
4. Select user and confirm

**Expected Results:**

- User appears in Member Users grid
- User gains access to Space
- Member count updates

#### 3.13 Update Space Community - Add Member Organization

**Steps:**

1. Navigate to Space Settings > Community tab
2. Click "Add" button under "Member Organizations"
3. Search for an organization
4. Select organization and confirm

**Expected Results:**

- Organization appears in Member Organizations grid
- Organization members gain access (based on settings)

#### 3.14 Update Space Community - Change Member Role

**Steps:**

1. Navigate to Space Settings > Community tab
2. Locate a member in the grid
3. Click "Edit" button
4. Change role from "member" to "lead" (or vice versa)

**Expected Results:**

- Member role updates
- Permissions adjust according to new role

#### 3.15 Update Space Community - Remove Member

**Steps:**

1. Navigate to Space Settings > Community tab
2. Locate a member
3. Click remove/delete action

**Expected Results:**

- Confirmation dialog appears
- Member removed from Space
- Member loses access to Space

#### 3.16 Update Space - Accept Pending Application

**Preconditions:**

- Space has pending membership applications

**Steps:**

1. Navigate to Space Settings > Community tab
2. Locate pending application in grid
3. Click accept action

**Expected Results:**

- Application status changes to accepted
- User becomes Space member
- Applicant receives notification

#### 3.17 Update Space - Reject Pending Application

**Steps:**

1. Locate pending application
2. Click reject action

**Expected Results:**

- Application removed from pending list
- Applicant notified of rejection

#### 3.18 Update Space - Community Guidelines

**Steps:**

1. Navigate to Space Settings > Community tab
2. Expand "Community guidelines" section
3. Edit Title and Introduction
4. Save changes

**Expected Results:**

- Guidelines updated
- Visible to members when accessing Space

#### 3.19 Update Space - Subspaces Configuration

**Steps:**

1. Navigate to Space Settings > Subspaces tab
2. Configure default Subspace settings
3. Save changes

**Expected Results:**

- New Subspaces inherit configured defaults

#### 3.20 Update Space - Templates

**Steps:**

1. Navigate to Space Settings > Templates tab
2. View and modify available templates

**Expected Results:**

- Template changes available for new Subspaces

#### 3.21 Update Space - Storage Settings

**Steps:**

1. Navigate to Space Settings > Storage tab
2. View storage usage
3. Manage uploaded files

**Expected Results:**

- Storage quota displayed
- Ability to delete files to free space

---

### 4. DELETE Space Operations

**Seed:** `./client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 4.1 Delete Space - Happy Path

**Preconditions:**

- User is Space admin or host
- Space exists with content

**Steps:**

1. Navigate to Space Settings > Account tab (`/{space}/settings/account`)
2. Scroll to "Danger Zone" section
3. Click "Delete this Space" button
4. Read confirmation warning
5. Confirm deletion (may require typing Space name)

**Expected Results:**

- Confirmation dialog warns about irreversible action
- Space is deleted upon confirmation
- User redirected to home/spaces page
- Space no longer appears in Explore Spaces
- All Subspaces and content deleted

#### 4.2 Delete Space - Cancel Operation

**Steps:**

1. Navigate to Space Settings > Account tab
2. Click "Delete this Space" button
3. Click "Cancel" in confirmation dialog

**Expected Results:**

- Dialog closes
- Space remains intact
- No changes made

#### 4.3 Delete Space - Insufficient Permissions

**Preconditions:**

- User is Space member but not admin

**Steps:**

1. Navigate to Space Settings (if accessible)
2. Attempt to access Account tab

**Expected Results:**

- Account/Delete options not visible or inaccessible
- Error message if attempting to access via URL

#### 4.4 Delete Space - With Active Subspaces

**Preconditions:**

- Space has one or more active Subspaces

**Steps:**

1. Navigate to Space Account tab
2. Initiate delete operation

**Expected Results:**

- Warning indicates Subspaces will also be deleted
- All child Subspaces removed upon confirmation

#### 4.5 Delete Space - With Active Members

**Preconditions:**

- Space has community members

**Steps:**

1. Initiate delete operation

**Expected Results:**

- Warning about member notification/removal
- Members lose access upon deletion
- Members may receive notification

---

## Edge Cases & Error Scenarios

### E1. Session Timeout During Create

**Steps:**

1. Open Create Space dialog
2. Wait for session to expire (or manually invalidate)
3. Attempt to submit form

**Expected Results:**

- Error message about session
- Redirect to login
- Form data not lost if possible

### E2. Network Error During Update

**Steps:**

1. Begin editing Space settings
2. Simulate network disconnect
3. Click Save

**Expected Results:**

- Error notification appears
- Changes not lost
- Retry option available

### E3. Concurrent Edit Conflict

**Preconditions:**

- Two admins editing same Space simultaneously

**Steps:**

1. User A opens Space settings
2. User B opens same Space settings
3. Both make changes
4. User A saves
5. User B attempts to save

**Expected Results:**

- Conflict detection or last-write-wins behavior
- User notified if changes overwritten

### E4. Large File Upload for Visuals

**Steps:**

1. Attempt to upload very large image (>10MB)

**Expected Results:**

- Error message about file size limit
- Upload rejected gracefully

### E5. Invalid Image Format

**Steps:**

1. Attempt to upload non-image file as banner

**Expected Results:**

- Error message about invalid format
- Only accepted formats: PNG, JPEG, etc.

---

## Authorization & Permission Scenarios

### P1. Anonymous User Attempts Create

**Steps:**

1. Navigate directly to create Space URL

**Expected Results:**

- Redirect to login
- Access denied message

### P2. Member Attempts Admin Actions

**Steps:**

1. Login as regular member
2. Navigate to Space settings URL directly

**Expected Results:**

- Settings tab not visible or redirects
- Appropriate access denied handling

### P3. Global Admin Override

**Steps:**

1. Login as Global Admin
2. Access any Space settings

**Expected Results:**

- Full access to all CRUD operations
- Can modify any Space

---

## Data Validation Scenarios

### V1. Maximum Length Fields

**Steps:**

1. Enter maximum allowed characters in Title (255 chars)
2. Enter maximum characters in Tagline
3. Save

**Expected Results:**

- Fields accept max length
- No truncation occurs
- Data saved correctly

### V2. Special Characters in Fields

**Steps:**

1. Enter special characters: &, <, >, ", '
2. Enter Unicode characters: 日本語, Ελληνικά
3. Save and view

**Expected Results:**

- Special characters properly escaped/encoded
- Display correctly without XSS vulnerability

### V3. Empty Optional Fields

**Steps:**

1. Create Space with only required fields
2. Leave all optional fields empty

**Expected Results:**

- Space created successfully
- Empty fields display appropriate defaults or placeholders

---

## Performance Scenarios

### PF1. Large Member List

**Preconditions:**

- Space with 100+ members

**Steps:**

1. Navigate to Community settings
2. Scroll through member list
3. Use search filter

**Expected Results:**

- Pagination works correctly
- Search returns results quickly
- UI remains responsive

### PF2. Multiple Tags

**Steps:**

1. Add 20+ tags to Space
2. Save and view

**Expected Results:**

- All tags saved
- Tags display correctly (possibly with overflow handling)

---

## Success Criteria

- All test scenarios pass with expected results
- No data corruption during CRUD operations
- Proper error handling for all edge cases
- Authorization properly enforced
- UI feedback clear for all actions
- Form validation prevents invalid data submission
