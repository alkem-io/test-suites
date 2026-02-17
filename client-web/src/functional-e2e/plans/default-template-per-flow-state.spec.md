# Default Template Per Flow State - Test Plan

## Feature Overview

The "Default Template Per Flow State" feature allows Space Admins to configure a default post template for collaboration tool flow states. When configured, this template is automatically loaded when members create new posts within that flow state.

**Key Components:**

- Settings/Layout/[three dots menu] → "Set Default Post Template" option
- "Template Library" dialog for template selection
- "Currently Selected Template" section showing current selection
- Auto-loading of templates in "Add Post" dialog for members

---

## Implementation Status

| Scenario                                              | Status             | Notes                               |
| ----------------------------------------------------- | ------------------ | ----------------------------------- |
| 1.1 Verify Default Post Template Option Visibility    | ✅ Implemented     |                                     |
| 1.2 Verify Option Not Available for Non-Admin Users   | ⏳ Not Implemented |                                     |
| 2.1 Open Dialog When No Template Selected             | ✅ Implemented     |                                     |
| 2.2 Open Dialog When Template Already Selected        | ⏳ Not Implemented | Partially covered by 3.2            |
| 3.1 Add New Default Template                          | ✅ Implemented     |                                     |
| 3.2 Update Existing Default Template                  | ✅ Implemented     |                                     |
| 3.3 Cancel Template Selection                         | ⏳ Not Implemented |                                     |
| 4.1 Default Template Loaded When Creating Post        | ✅ Implemented     | Includes post creation verification |
| 4.2 No Default Template - Standard Post Creation      | ⏳ Not Implemented |                                     |
| 5.1 Default Templates NOT Preserved in Space Template | ⏳ Not Implemented |                                     |
| 6.x Subspace (L1) Scenarios                           | ⏳ Not Implemented |                                     |
| 7.x Edge Cases                                        | ⏳ Not Implemented |                                     |

---

## Test Scenarios

### 1. Admin Access to Default Post Template Option

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

#### 1.1 Verify Default Post Template Option Visibility ✅

**Status:** Implemented

**Preconditions:**

- User is logged in as Space Admin (Facilitator persona)
- Space exists with at least one collaboration tool/flow state

**Steps:**

1. Navigate to the Space
2. Navigate to Settings
3. Click on "Layout" tab
4. Wait for layout content to load
5. Locate the "Home" flow state section
6. Click the three-dots menu button on the flow state

**Expected Results:**

- Menu opens with available options
- "Set Default Post Template" menu item is visible
- Option is clickable/enabled for admin users

#### 1.2 Verify Option Not Available for Non-Admin Users ⏳

**Status:** Not Implemented

**Preconditions:**

- User is logged in as Space Member (Active Stakeholder persona)
- Space exists with collaboration tools

**Steps:**

1. Navigate to the Space
2. Attempt to access Settings/Layout section

**Expected Results:**

- Settings/Layout section is not accessible to non-admin users

---

### 2. Select Default Post Template Dialog

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

#### 2.1 Open Dialog When No Template Selected ✅

**Status:** Implemented

**Preconditions:**

- User is logged in as Space Admin
- Flow state has no default template configured

**Steps:**

1. Navigate to the Space
2. Accept cookies dialog
3. Navigate to Settings
4. Click on "Layout" tab
5. Open flow state menu and click on the default template option
6. Verify "Template Library" dialog opens
7. Close dialog using Cancel button

**Expected Results:**

- Dialog opens titled "Template Library"
- Dialog has Cancel button to close
- Dialog closes when Cancel is clicked

#### 2.2 Open Dialog When Template Already Selected ⏳

**Status:** Not Implemented (partially covered by 3.2)

**Preconditions:**

- User is logged in as Space Admin
- Flow state already has a default template configured

**Steps:**

1. Navigate to Settings/Layout
2. Click three-dots menu on the flow state with existing default template
3. Click "Set Default Post Template" option

**Expected Results:**

- Dialog opens titled "Template Library"
- Currently selected template card is visible
- Option to change/update template exists

---

### 3. Template Selection Flow

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

#### 3.1 Add New Default Template ✅

**Status:** Implemented

**Preconditions:**

- User is logged in as Space Admin
- At least one post/callout template exists in Innovation Pack
- Flow state has no default template

**Steps:**

1. Navigate to the Space settings
2. Click on "Layout" tab
3. Open flow state menu and click "Set Default Post Template"
4. Verify "Template Library" dialog opens
5. Select a template by clicking tenplate card
6. Template is selected

**Expected Results:**

- "Template Library" dialog opens showing available templates
- Template can be selected via card
- Template is displayed as selected

#### 3.2 Update Existing Default Template ✅

**Status:** Implemented

**Preconditions:**

- User is logged in as Space Admin
- Flow state has an existing default template (from test 3.1)

**Steps:**

1. Navigate to the Space settings
2. Click on "Layout" tab
3. Open flow state menu and click "Set Default Post Template"
4. Verify "Template Library" dialog opens
5. Select a different template card (e.g., "Callout (Memo Framing, Memo Responses)")
6. Click "Select" button to apply the template
7. Verify "Currently Selected Template" heading is visible
8. Verify selected template card is displayed

**Expected Results:**

- New template replaces the previous selection
- "Currently Selected Template:" heading is displayed
- Selected template card with "Contribute" button is visible
- Change is persisted

#### 3.3 Cancel Template Selection ⏳

**Status:** Not Implemented

**Preconditions:**

- User is logged in as Space Admin
- "Template Library" dialog is open

**Steps:**

1. Open "Template Library" dialog
2. Click Cancel button

**Expected Results:**

- "Template Library" dialog closes
- Previous selection (if any) remains unchanged

---

### 4. Template Auto-Loading for Members

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

#### 4.1 Default Template Loaded When Creating Post ✅

**Status:** Implemented

**Preconditions:**

- Space Admin has configured a default post template for a flow state (from tests 3.1/3.2)
- Template configured: "Callout (Memo Framing, Memo Responses)"
- User is logged in as Space Member

**Steps:**

1. Login as Space Member (new browser context)
2. Navigate to the Space
3. Accept cookies dialog
4. Click "Post" button to add a new post
5. Verify "Add Post" dialog opens
6. Verify template title is pre-filled: "Callout (Memo Framing, Memo Responses)"
7. Verify template content shows "Guidelines" section with "Please follow these guidelines"
8. Verify "Memo" button is visible in Additional Content section
9. Clear and fill a unique post title
10. Click "POST" button to create the post
11. Verify dialog closes
12. Verify the created post is visible on the page

**Expected Results:**

- "Add Post" dialog opens with template pre-loaded
- Title field contains template title
- Content area shows "Guidelines" with "Please follow these guidelines"
- "Memo" option is selected in Additional Content
- Post can be created successfully
- Created post appears on the page

#### 4.2 No Default Template - Standard Post Creation ⏳

**Status:** Not Implemented

**Preconditions:**

- Flow state has NO default template configured
- User is logged in as Space Member

**Steps:**

1. Navigate to a flow state without default template
2. Click "Post" button

**Expected Results:**

- "Add Post" dialog opens with blank/default empty state
- No template is pre-loaded
- User can manually select a template if desired

---

### 5. Space Template Preservation (Negative Test)

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

#### 5.1 Default Templates NOT Preserved in Space Template ⏳

**Status:** Not Implemented

**Preconditions:**

- Space exists with default post templates configured for flow states
- User is logged in as admin with template creation permissions

**Steps:**

1. Configure default post templates for multiple flow states in the Space
2. Verify templates are working (per scenario 4.1)
3. Convert/save the Space as a Space Template
4. Create a new Space from the saved template
5. Navigate to Settings/Layout in the new Space
6. Check default template configuration for flow states

**Expected Results:**

- New Space is created successfully from template
- Default post templates per flow state are NOT preserved
- Each flow state shows no default template selected
- Admin must reconfigure default templates in the new Space

---

### 6. Subspace (L1) Default Template Scenarios ⏳

**Status:** Not Implemented

**Seed:** `./client-web/src/functional-e2e/seed-template-default.spec.ts`

> **Note:** On L1 (Subspace) level, flow states are configured via the "Manage Flow" button which opens a dialog, unlike L0 spaces which use Settings/Layout.

#### 6.1 Admin Access to Default Post Template in Subspace ⏳

**Preconditions:**

- User is logged in as Subspace Admin (Project Lead persona)
- L0 Space exists with at least one L1 Subspace
- Subspace has at least one collaboration tool/flow state

**Steps:**

1. Navigate to the Subspace
2. Click the "Manage Flow" button (flow icon near the flow state tabs)
3. Wait for "Manage Flow" dialog to open
4. Locate a flow state card (e.g., Explore, Define, Brainstorm, Validate)
5. Click the three-dots menu (⋮) on the flow state card

**Expected Results:**

- "Manage Flow" dialog opens showing all flow states
- Menu opens with available options
- "Default post template" option is visible in the menu
- Option is clickable/enabled for subspace admin users

#### 6.2 Configure Default Template in Subspace Independent of Parent Space

**Preconditions:**

- User is logged in as Subspace Admin
- L0 Space has a default template configured for a flow state
- L1 Subspace exists under the L0 Space

**Steps:**

1. Navigate to L1 Subspace
2. Click "Manage Flow" button to open the dialog
3. Click three-dots menu on a flow state card (e.g., "Explore")
4. Click "Default post template" option
5. Select a DIFFERENT template than the parent space
6. Confirm selection

**Expected Results:**

- Subspace can have its own default template configuration
- Subspace default template is independent of parent space setting
- Selection is saved successfully for the subspace

#### 6.3 Subspace Default Template Does NOT Inherit from Parent Space

**Preconditions:**

- L0 Space has default template "Template A" configured for a flow state
- L1 Subspace has NO default template configured for equivalent flow state
- User is logged in as Subspace Member

**Steps:**

1. Navigate to the L1 Subspace
2. Navigate to the flow state (e.g., click "Explore" tab)
3. Click "+ POST" button
4. Observe the "Add Post" dialog

**Expected Results:**

- "Add Post" dialog opens with blank/default empty state
- Parent space's default template is NOT automatically inherited
- Subspace must have its own explicit default template configuration

#### 6.4 Subspace Member Creates Post with Subspace Default Template

**Preconditions:**

- L1 Subspace Admin has configured a default post template for a flow state
- User is logged in as Subspace Member

**Steps:**

1. Navigate to the L1 Subspace
2. Click on the flow state tab with default template configured (e.g., "Explore")
3. Click "+ POST" button
4. Observe the "Add Post" dialog

**Expected Results:**

- "Add Post" dialog opens
- Subspace's default template content/structure is pre-loaded
- Template fields are editable by the user
- User can proceed to create post with template content

#### 6.5 Different Default Templates for Same Flow State in Parent and Subspace

**Preconditions:**

- L0 Space has default template "Template A" for "Explore" flow state
- L1 Subspace has default template "Template B" for "Explore" flow state
- User is a member of both spaces

**Steps:**

1. Navigate to L0 Space, "Explore" flow state
2. Click "Add Post" and observe loaded template
3. Navigate to L1 Subspace, "Explore" flow state
4. Click "+ POST" and observe loaded template

**Expected Results:**

- L0 Space loads "Template A" in Add Post dialog
- L1 Subspace loads "Template B" in Add Post dialog
- Each space level maintains its own independent template configuration

#### 6.6 Subspace Admin Cannot Access Parent Space Template Settings

**Preconditions:**

- User is logged in as Subspace Admin (but NOT L0 Space Admin)
- L0 Space exists with L1 Subspace

**Steps:**

1. Navigate to L0 Space
2. Attempt to access L0 Space Settings/Layout

**Expected Results:**

- L0 Space Settings/Layout is not accessible to subspace-only admin
- User can only configure templates in spaces where they have admin rights

#### 6.7 Manage Flow Dialog Shows Current Default Template Status

**Preconditions:**

- User is logged in as Subspace Admin
- Some flow states have default templates, others do not

**Steps:**

1. Navigate to L1 Subspace
2. Click "Manage Flow" button
3. Observe each flow state card in the dialog

**Expected Results:**

- Flow states with default templates show visual indicator or template name
- Flow states without default templates show no indicator
- Three-dots menu is accessible on each flow state card

#### 6.8 Create Subspace from Template - Default Templates Not Preserved

**Preconditions:**

- L1 Subspace exists with default post templates configured
- User has permissions to create subspace templates

**Steps:**

1. Configure default post templates in an existing L1 Subspace via "Manage Flow" dialog
2. Save/convert the Subspace as a Subspace Template
3. Create a new Subspace from the saved template
4. Navigate to new Subspace and click "Manage Flow"
5. Check default template configuration for each flow state

**Expected Results:**

- New Subspace is created successfully from template
- Default post templates are NOT preserved in the new subspace
- Admin must reconfigure default templates via "Manage Flow" dialog

---

### 7. Edge Cases ⏳

**Status:** Not Implemented

#### 7.1 Delete Template That Is Set as Default ⏳

**Preconditions:**

- A template is set as default for a flow state
- User has permissions to delete templates

**Steps:**

1. Set a template as default for a flow state
2. Navigate to template management
3. Delete the template that was set as default
4. Return to Settings/Layout
5. Check the flow state's default template setting

**Expected Results:**

- System handles gracefully (no errors)
- Default template shows as "None" or "Template not found"
- Admin can select a new default template

#### 7.2 Multiple Flow States with Same Default Template

**Preconditions:**

- Space has multiple flow states
- At least one post template exists

**Steps:**

1. Set the same template as default for Flow State A
2. Set the same template as default for Flow State B
3. Verify both configurations

**Expected Results:**

- Same template can be used as default for multiple flow states
- Each flow state independently tracks its default template
- Changes to one don't affect the other

#### 7.3 Same Template as Default in Parent Space and Subspace

**Preconditions:**

- L0 Space and L1 Subspace exist
- At least one post template exists

**Steps:**

1. Set "Template A" as default for a flow state in L0 Space
2. Set the same "Template A" as default for equivalent flow state in L1 Subspace
3. Verify both configurations work independently

**Expected Results:**

- Both spaces can use the same template as their default
- Configurations are independent
- Deleting template affects both spaces

#### 7.4 Nested Subspace (L2) Default Template Configuration

**Preconditions:**

- L0 Space has L1 Subspace
- L1 Subspace has L2 Subspace (if supported)
- User is admin of L2 Subspace

**Steps:**

1. Navigate to L2 Subspace Settings/Layout
2. Configure default template for a flow state
3. Create a post as a member

**Expected Results:**

- L2 Subspace supports independent default template configuration
- Template is loaded when member creates post in L2 Subspace
- No inheritance from L0 or L1 default templates

---

## Test Data Requirements

| Data Type            | Description                        | Source                        |
| -------------------- | ---------------------------------- | ----------------------------- |
| Space Admin User     | User with L0 space admin perms     | TestUser.SPACE_ADMIN          |
| Subspace Admin User  | User with L1 subspace admin perms  | TestUser.SUBSPACE_ADMIN       |
| Space Member User    | User with member permissions       | TestUser.SPACE_MEMBER         |
| Subspace Member User | User with L1 subspace member perms | TestUser.SUBSPACE_MEMBER      |
| Innovation Pack      | Pack with post/callout templates   | scenarioConfig.innovationPack |
| Post Templates       | Various callout templates          | Seeded via Innovation Pack    |
| L0 Space             | Parent space                       | scenarioConfig.space          |
| L1 Subspace          | Child subspace under L0            | scenarioConfig.subspace       |

---

## Personas Involved

| Persona            | Role in Tests                                     |
| ------------------ | ------------------------------------------------- |
| Facilitator        | Primary admin configuring default templates (L0)  |
| Project Lead       | Subspace admin configuring default templates (L1) |
| Active Stakeholder | Member creating posts with default template       |
| Space Member       | Member verifying template auto-load in L0         |
| Subspace Member    | Member verifying template auto-load in L1         |

---

## Out of Scope

- Performance testing of template loading
- Template content validation (covered by template tests)
- API-level testing (covered in server-api tests)
