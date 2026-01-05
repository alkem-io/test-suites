# Alkemio Templates - Comprehensive Test Plan

**Seed:** `./client-web/src/functional-e2e/seed-public-space.spec.ts`

**GitHub Issues:**

- https://github.com/alkem-io/alkemio/issues/1738 - Templates Feature Implementation
- https://github.com/alkem-io/test-suites/issues/490 - Templates Testing Coverage

## Executive Summary

This comprehensive test plan covers template creation, management, verification, and usage across the Alkemio platform. Templates enable consistent collaboration patterns and reusable structures for spaces, reducing setup time and ensuring quality standards.

**Scope:**

- **4 Template Types** covering 60+ detailed test scenarios
- **40+ Callout Template Combinations** with different framing and response options
- **3 Coverage Areas**: Template CRUD operations, template usage/application, and template verification

**Key Test Areas:**

1. Collaboration Tool (Callout) Templates - CRUD and Usage
2. Post Templates - CRUD and Usage
3. Community Guidelines Templates - CRUD and Usage
4. Whiteboard Templates - CRUD and Usage
5. Template Library Management
6. Template Application/Usage in Spaces

**Template Types Available:**

- **Collaboration Tool (Callout) Templates** - Structured collaboration tools with various framing and response options
- **Post Templates** - Ready-to-use post structures with default content
- **Community Guidelines Templates** - Pre-configured community standards and conduct rules
- **Whiteboard Templates** - Visual collaboration canvases with predefined content

---

## Application Overview

This test plan covers template management within Alkemio Spaces. Templates are reusable structures that help space administrators quickly set up consistent collaboration tools, posts, guidelines, and whiteboards.

### Template Locations

- **Space Settings - Templates**: `/space/[:spaceNameId]/settings/templates`
- **Template Usage - Callouts**: When creating new callouts in collaboration areas
- **Template Usage - Posts**: When creating new posts in callout feeds
- **Template Usage - Whiteboards**: When creating new whiteboards

### Test Data Structure (from scenario config)

The test scenarios create:

- **Organization** with admin
- **Space (L0)** - Public
  - Admins: SPACE_ADMIN
  - Members: SPACE_MEMBER, SPACE_ADMIN
  - Tutorial callouts disabled
  - Template library initialized

### Personas to Cover

| Persona          | Role                  | Expected Access                                          |
| ---------------- | --------------------- | -------------------------------------------------------- |
| SPACE_ADMIN      | Space admin + lead    | Full CRUD on all templates in space library              |
| SPACE_MEMBER     | Space member          | Use published templates, view template library           |
| SUBSPACE_ADMIN   | Subspace admin + lead | Full CRUD on subspace templates, inherit space templates |
| NON_SPACE_MEMBER | Not a member          | No access to template library                            |
| GLOBAL_ADMIN     | Platform admin        | Full access everywhere                                   |

---

## Test Scenarios

### Category 1: Collaboration Tool (Callout) Template - Creation & Verification

Collaboration Tool Templates are the most complex template type, supporting multiple framing types and response options.

#### Framing Types

- **None** - No additional content
- **Whiteboard** - Embedded collaborative canvas
- **Memo** - Rich text content block
- **Call to Action** - Button with link

#### Response Options

- **None** - No contributions allowed
- **Links & Files** - Collection of links and file attachments
- **Posts** - Collection of text posts
- **Memos** - Collection of formatted memos
- **Whiteboards** - Collection of collaborative canvases

#### 1.1 Create Callout Template - Framing: None, Response: None, Comments: Disabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #1

**Steps:**

1. Navigate to Space settings → Templates
2. Locate "Collaboration Tool Templates" section
3. Click "Create new" button
4. Fill in template metadata:
   - Display name: "Simple Callout Template"
   - Description: Test template description
   - Tags: ["template", "test"]
5. Fill in callout details:
   - Callout title
   - Callout description
   - Callout tags
6. Select Framing: None
7. Select Response Options: None
8. Disable comments
9. Click "Create"

**Expected Results:**

- Template is created successfully
- Template appears in Collaboration Tool Templates list
- Template can be previewed
- All metadata is correctly saved
- Template is ready for use

---

#### 1.2 Create Callout Template - Framing: None, Response: None, Comments: Enabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #2

**Steps:**

1. Follow steps 1-7 from test 1.1
2. Enable comments on callout
3. Click "Create"

**Expected Results:**

- Template is created with comments enabled
- When used, resulting callout allows comments
- Comment toggle appears in template preview

---

#### 1.3 Create Callout Template - Framing: Whiteboard, Response: None, Comments: Disabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #3

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: Whiteboard
3. Add content to embedded whiteboard
4. Select Response Options: None
5. Disable comments
6. Click "Create"

**Expected Results:**

- Template is created with whiteboard framing
- Whiteboard content is saved
- Template preview shows whiteboard canvas
- When used, callout contains the whiteboard with saved content

---

#### 1.4 Create Callout Template - Framing: Whiteboard, Response: None, Comments: Enabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #4

**Steps:**

1. Follow steps from test 1.3
2. Enable comments on callout
3. Click "Create"

**Expected Results:**

- Template created with whiteboard and comments enabled
- Both features work when template is used

---

#### 1.5 Create Callout Template - Framing: Memo, Response: None, Comments: Disabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #5

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: Memo
3. Fill in rich text memo content
4. Select Response Options: None
5. Disable comments
6. Click "Create"

**Expected Results:**

- Template created with memo content
- Memo formatting is preserved
- Template preview shows memo content
- When used, callout displays formatted memo

---

#### 1.6 Create Callout Template - Framing: Memo, Response: None, Comments: Enabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #6

**Steps:**

1. Follow steps from test 1.5
2. Enable comments on callout
3. Click "Create"

**Expected Results:**

- Template created with memo and comments enabled
- Both features work correctly when used

---

#### 1.7 Create Callout Template - Framing: Call to Action, Response: None, Comments: Disabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #7

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: Call to Action
3. Fill in CTA button text
4. Fill in CTA URL
5. Select Response Options: None
6. Disable comments
7. Click "Create"

**Expected Results:**

- Template created with CTA button
- Button text and URL are saved
- Template preview shows CTA button
- When used, callout displays clickable CTA

---

#### 1.8 Create Callout Template - Framing: Call to Action, Response: None, Comments: Enabled

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #8

**Steps:**

1. Follow steps from test 1.7
2. Enable comments on callout
3. Click "Create"

**Expected Results:**

- Template created with CTA and comments
- All features work when template is applied

---

#### 1.9 Create Callout Template - Framing: None, Response: Links & Files, Comments: Disabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #9

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: None
3. Select Response Options: Links & Files
4. Enable contributions for both Admins and Members
5. Disable comments
6. Click "Create"

**Expected Results:**

- Template created with links & files collection
- Contribution settings saved correctly
- When used, both admins and members can add links/files
- Template preview shows response options

---

#### 1.9b Create Callout Template - Framing: None, Response: Links & Files, Comments: Disabled, Contrib: OFF

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Test #9b

**Steps:**

1. Follow steps from test 1.9
2. Disable contributions for both Admins and Members
3. Click "Create"

**Expected Results:**

- Template created with contributions disabled
- When used, no one can add contributions
- Read-only links & files collection

---

#### 1.9c Create Callout Template - Framing: None, Response: Links & Files, Comments: Disabled, Contrib: Admin Only

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Test #9c

**Steps:**

1. Follow steps from test 1.9
2. Enable contributions for Admins only
3. Disable contributions for Members
4. Click "Create"

**Expected Results:**

- Template created with admin-only contributions
- When used, only admins can add links/files
- Members can view but not contribute

---

#### 1.10 Create Callout Template - Framing: None, Response: Links & Files, Comments: Enabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #10

**Steps:**

1. Follow steps from test 1.9
2. Enable comments on callout
3. Click "Create"

**Expected Results:**

- Template created with links/files and comments
- All features work correctly when applied

---

#### 1.11-1.16 Callout Templates - Framing: Whiteboard/Memo/CTA, Response: Links & Files

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Tests #11-16

**Coverage:**

- Test #11: Whiteboard + Links & Files + Comments Disabled
- Test #12: Whiteboard + Links & Files + Comments Enabled
- Test #13: Memo + Links & Files + Comments Disabled
- Test #14: Memo + Links & Files + Comments Enabled
- Test #15: Call to Action + Links & Files + Comments Disabled
- Test #16: Call to Action + Links & Files + Comments Enabled

**Expected Results:**

- All combinations of framing and response options work correctly
- Multiple features can be combined in a single template
- Templates apply all settings when used

---

#### 1.17 Create Callout Template - Framing: None, Response: Posts, Comments: Disabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #17

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: None
3. Select Response Options: Posts
4. Configure post contribution settings:
   - Default post title
   - Default post description
   - Enable comments on posts
   - Admins can contribute: Yes
   - Members can contribute: Yes
5. Disable comments on main callout
6. Click "Create"

**Expected Results:**

- Template created with posts collection
- Default post settings are saved
- When used, members can create posts
- Posts collection appears in callout
- Individual posts allow comments per configuration

---

#### 1.17b-1.17f Callout Templates - Response: Posts with Various Contribution Permissions

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Tests #17b-17f

**Coverage:**

- Test #17b: Posts, Contrib OFF, Comments on Posts: ON
- Test #17c: Posts, Contrib Admin Only, Comments on Posts: ON
- Test #17d: Posts, Contrib ON, Comments on Posts: OFF
- Test #17e: Posts, Contrib OFF, Comments on Posts: OFF
- Test #17f: Posts, Contrib Admin Only, Comments on Posts: OFF

**Expected Results:**

- Contribution permissions are correctly enforced
- Comments on individual posts respect template settings
- Different combinations of permissions work as configured

---

#### 1.18 Create Callout Template - Framing: None, Response: Posts, Comments: Enabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #18

**Steps:**

1. Follow steps from test 1.17
2. Enable comments on main callout
3. Click "Create"

**Expected Results:**

- Template created with posts and comments enabled
- Both callout-level and post-level comments work
- All contribution settings respected

---

#### 1.19-1.24 Callout Templates - Framing: Whiteboard/Memo/CTA, Response: Posts

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Tests #19-24

**Coverage:**

- Test #19: Whiteboard + Posts + Comments Disabled
- Test #20: Whiteboard + Posts + Comments Enabled
- Test #21: Memo + Posts + Comments Disabled
- Test #22: Memo + Posts + Comments Enabled
- Test #23: Call to Action + Posts + Comments Disabled
- Test #24: Call to Action + Posts + Comments Enabled

**Expected Results:**

- All combinations work correctly
- Posts collection integrates with framing content
- Multiple features coexist properly

---

#### 1.25 Create Callout Template - Framing: None, Response: Memos, Comments: Disabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #25

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: None
3. Select Response Options: Memos
4. Configure memo contribution settings:
   - Default memo title
   - Default memo description
   - Admins can contribute: Yes
   - Members can contribute: Yes
5. Disable comments
6. Click "Create"

**Expected Results:**

- Template created with memos collection
- Default memo settings saved
- When used, members can create memos
- Memos collection appears in callout

---

#### 1.25b-1.25c Callout Templates - Response: Memos with Various Contribution Permissions

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Tests #25b-25c

**Coverage:**

- Test #25b: Memos, Contrib OFF
- Test #25c: Memos, Contrib Admin Only

**Expected Results:**

- Contribution permissions are correctly enforced
- Different permission levels work as configured

---

#### 1.26-1.32 Callout Templates - Various Framing Types, Response: Memos

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Tests #26-32

**Coverage:**

- Test #26: None + Memos + Comments Enabled
- Test #27: Whiteboard + Memos + Comments Disabled
- Test #28: Whiteboard + Memos + Comments Enabled
- Test #29: Memo + Memos + Comments Disabled
- Test #30: Memo + Memos + Comments Enabled
- Test #31: Call to Action + Memos + Comments Disabled
- Test #32: Call to Action + Memos + Comments Enabled

**Expected Results:**

- All combinations work correctly
- Memos collection integrates with all framing types
- Settings are properly applied when templates are used

---

#### 1.33 Create Callout Template - Framing: None, Response: Whiteboards, Comments: Disabled, Contrib: ON

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Test #33

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Select Framing: None
3. Select Response Options: Whiteboards
4. Configure whiteboard contribution settings:
   - Default whiteboard title
   - Default whiteboard content
   - Admins can contribute: Yes
   - Members can contribute: Yes
5. Disable comments
6. Click "Create"

**Expected Results:**

- Template created with whiteboards collection
- Default whiteboard settings saved
- When used, members can create whiteboards
- Whiteboards collection appears in callout
- Default whiteboard template applied to new contributions

---

#### 1.33b-1.33c Callout Templates - Response: Whiteboards with Various Contribution Permissions

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Tests #33b-33c

**Coverage:**

- Test #33b: Whiteboards, Contrib OFF
- Test #33c: Whiteboards, Contrib Admin Only

**Expected Results:**

- Contribution permissions correctly enforced
- Only authorized users can create whiteboards
- Permission levels work as configured

---

#### 1.34-1.40 Callout Templates - Various Framing Types, Response: Whiteboards

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-tests.spec.ts` - Tests #34-40

**Coverage:**

- Test #34: None + Whiteboards + Comments Enabled
- Test #35: Whiteboard + Whiteboards + Comments Disabled
- Test #36: Whiteboard + Whiteboards + Comments Enabled
- Test #37: Memo + Whiteboards + Comments Disabled
- Test #38: Memo + Whiteboards + Comments Enabled
- Test #39: Call to Action + Whiteboards + Comments Disabled
- Test #40: Call to Action + Whiteboards + Comments Enabled

**Expected Results:**

- All combinations work correctly
- Whiteboards collection integrates with all framing types
- Template-level whiteboard (framing) and whiteboard collection coexist
- All settings properly applied when templates are used

---

#### 1.41 Create Callout Template - With References

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** `callout-tests.spec.ts` - Test #41

**Steps:**

1. Follow steps 1-6 from test 1.1
2. Add callout references:
   - Reference title
   - Reference URL
3. Add multiple references
4. Select Framing: None
5. Select Response Options: None
6. Disable comments
7. Click "Create"

**Expected Results:**

- Template created with references
- References appear in template preview
- When used, callout displays all reference links
- Reference links are clickable and open correctly

---

### Category 2: Post Template - Creation & Verification

Post templates provide ready-to-use structures for creating consistent posts across the platform.

#### 2.1 Navigate to Templates Settings

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `post-template.spec.ts` - Test #1.0

**Steps:**

1. Navigate to space home page
2. Click "Settings" tab
3. Click "Templates" sub-tab

**Expected Results:**

- Templates page loads successfully
- URL contains `/settings/templates`
- All template sections visible
- "Post Templates" section appears

---

#### 2.2 Create Post Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `post-template.spec.ts` - Test #1.1

**Steps:**

1. Navigate to Templates settings page
2. Locate "Post Templates" section
3. Click "Create New" button
4. Fill in template form:
   - Display name: "Test Post Template"
   - Description: Template description
   - Tags: ["template", "post"]
   - Default content: Markdown formatted text
5. Click "Create"

**Expected Results:**

- Template creation dialog appears
- All form fields accept input
- Template is created successfully
- Template appears in Post Templates list
- Default content is preserved with formatting

---

#### 2.3 Verify Post Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `post-template.spec.ts` - Test #1.2

**Steps:**

1. After creating template, verify it appears in list
2. Click on template to view details
3. Verify all saved fields match input

**Expected Results:**

- Template appears in list with correct name
- Display name matches input
- Description matches input
- Tags are displayed correctly
- Default content preview is available
- Markdown formatting is rendered correctly

---

#### 2.4 Use Post Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `post-template.spec.ts` - Test #1.3

**Steps:**

1. Navigate to space collaboration page
2. Open a post collection callout
3. Click "Add Post" or "Post" button
4. Click "Find Template" button
5. Select created post template from list
6. Verify default content is pre-filled
7. Optionally modify content
8. Click "Post" to create

**Expected Results:**

- Template selection dialog appears
- Created template is available in list
- Selecting template pre-fills post form
- Default content appears in editor
- Markdown formatting is preserved
- User can modify pre-filled content
- Post is created with template content
- Post appears in feed with correct formatting

---

#### 2.5 Edit Post Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate created post template
3. Click edit/pencil icon
4. Modify template fields
5. Click "Save"

**Expected Results:**

- Edit dialog opens with current values
- All fields can be modified
- Changes are saved successfully
- Template list reflects updates
- Future uses of template include changes

---

#### 2.6 Delete Post Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate post template to delete
3. Click delete/trash icon
4. Confirm deletion

**Expected Results:**

- Confirmation dialog appears
- Template is removed from list
- Template no longer available for use
- Existing posts created from template are unaffected

---

### Category 3: Community Guidelines Template - Creation & Verification

Community Guidelines templates help establish consistent standards for community behavior and conduct.

#### 3.1 Navigate to Templates Settings

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `community-guidelines-template.spec.ts` - Test #1.0

**Steps:**

1. Navigate to space home page
2. Click "Settings" tab
3. Click "Templates" sub-tab

**Expected Results:**

- Templates page loads successfully
- URL contains `/settings/templates`
- "Community Guidelines Templates" section appears

---

#### 3.2 Create Community Guidelines Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `community-guidelines-template.spec.ts` - Test #1.1

**Steps:**

1. Navigate to Templates settings page
2. Locate "Community Guidelines Templates" section
3. Click "Create New" button
4. Fill in template metadata:
   - Display name: "Test Community Guidelines Template"
   - Description: Template description
   - Tags: ["template", "CG"]
5. Fill in guidelines content:
   - Guidelines display name
   - Guidelines description/content
   - Add references (optional):
     - Reference title
     - Reference URL
6. Click "Create"

**Expected Results:**

- Template creation dialog appears
- All form fields accept input
- Guidelines content field supports rich text
- Multiple references can be added
- Template is created successfully
- Template appears in Community Guidelines Templates list

---

#### 3.3 Verify Community Guidelines Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `community-guidelines-template.spec.ts` - Test #1.2

**Steps:**

1. After creating template, verify it appears in list
2. Click on template to view details
3. Verify all saved fields match input

**Expected Results:**

- Template appears in list with correct name
- All metadata matches input
- Guidelines content is preserved
- References are displayed correctly
- Content formatting is maintained

---

#### 3.4 Use Community Guidelines Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `community-guidelines-template.spec.ts` - Test #1.3

**Steps:**

1. Navigate to space settings → Community
2. Locate Community Guidelines section
3. Click "Use Template" or similar option
4. Select created community guidelines template
5. Review pre-filled guidelines
6. Optionally modify content
7. Click "Save" or "Apply"

**Expected Results:**

- Template selection dialog appears
- Created template is available
- Selecting template applies guidelines
- Guidelines content appears in space settings
- References are included
- Content can be modified before applying
- Community guidelines are active in space

---

#### 3.5 Edit Community Guidelines Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate community guidelines template
3. Click edit/pencil icon
4. Modify template fields
5. Click "Save"

**Expected Results:**

- Edit dialog opens with current values
- All fields can be modified
- Changes are saved successfully
- Template list reflects updates
- Future uses include updated content

---

#### 3.6 Delete Community Guidelines Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate template to delete
3. Click delete/trash icon
4. Confirm deletion

**Expected Results:**

- Confirmation dialog appears
- Template is removed from list
- Template no longer available for use
- Existing applied guidelines are unaffected

---

### Category 4: Whiteboard Template - Creation & Verification

Whiteboard templates provide pre-configured visual collaboration canvases with structured prompts.

#### 4.1 Navigate to Templates Settings

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `whiteboard-template.spec.ts` - Test #1.0

**Steps:**

1. Navigate to space home page
2. Click "Settings" tab
3. Click "Templates" sub-tab

**Expected Results:**

- Templates page loads successfully
- URL contains `/settings/templates`
- "Whiteboard Templates" section appears

---

#### 4.2 Create Whiteboard Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `whiteboard-template.spec.ts` - Test #1.1

**Steps:**

1. Navigate to Templates settings page
2. Locate "Whiteboard Templates" section
3. Click "Create New" button
4. Fill in template metadata:
   - Display name: "Test Whiteboard Template"
   - Description: Template description
   - Tags: ["template", "whiteboard"]
5. Add content to whiteboard canvas:
   - Draw shapes
   - Add text
   - Add sticky notes
6. Click "Create"

**Expected Results:**

- Template creation dialog appears
- Whiteboard canvas is available for editing
- Drawing tools work correctly
- Text can be added
- Template is created with canvas content
- Template appears in Whiteboard Templates list
- Canvas content is saved

---

#### 4.3 Verify Whiteboard Template

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `whiteboard-template.spec.ts` - Test #1.2

**Steps:**

1. After creating template, verify it appears in list
2. Click on template to view details
3. Verify canvas content is preserved

**Expected Results:**

- Template appears in list with correct name
- All metadata matches input
- Whiteboard preview is available
- Canvas content is preserved correctly
- All drawn elements are visible

---

#### 4.4 Use Whiteboard Template - In Callout

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `whiteboard-template.spec.ts` - Test #1.3

**Steps:**

1. Navigate to space collaboration page
2. Create new whiteboard callout or open existing
3. Click "Add Whiteboard" or similar option
4. Click "Find Template" button
5. Select created whiteboard template
6. Verify canvas content is pre-filled
7. Optionally modify content
8. Save whiteboard

**Expected Results:**

- Template selection dialog appears
- Created template is available
- Selecting template loads canvas content
- All template elements appear on canvas
- User can modify template content
- Whiteboard is created with template content

---

#### 4.5 Use Whiteboard Template - In Collection

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** To be implemented

**Steps:**

1. Navigate to callout with whiteboards collection
2. Click "Create Whiteboard" or similar
3. Click "Find Template"
4. Select whiteboard template
5. Verify canvas content is pre-filled
6. Save whiteboard to collection

**Expected Results:**

- Template can be used in whiteboard collections
- Canvas content loads correctly
- Whiteboard is added to collection
- Template elements are preserved

---

#### 4.6 Edit Whiteboard Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate whiteboard template
3. Click edit/pencil icon
4. Modify canvas content
5. Click "Save"

**Expected Results:**

- Edit dialog opens with current canvas
- Canvas can be modified
- Changes are saved successfully
- Template list reflects updates
- Future uses include updated content

---

#### 4.7 Delete Whiteboard Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings page
2. Locate template to delete
3. Click delete/trash icon
4. Confirm deletion

**Expected Results:**

- Confirmation dialog appears
- Template is removed from list
- Template no longer available for use
- Existing whiteboards created from template are unaffected

---

### Category 5: Template Library Management

#### 5.1 View All Templates in Library

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** Covered in each template type test

**Steps:**

1. Navigate to space settings → Templates
2. Scroll through all template sections

**Expected Results:**

- All template types are organized in sections:
  - Collaboration Tool Templates
  - Post Templates
  - Community Guidelines Templates
  - Whiteboard Templates
- Each section displays created templates
- Templates show key metadata (name, description)
- Visual indicators for template type

---

#### 5.2 Search/Filter Templates

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings
2. Use search/filter functionality
3. Enter template name or tag
4. Review filtered results

**Expected Results:**

- Search/filter UI is available
- Can filter by template type
- Can search by name or tag
- Results update dynamically
- Relevant templates are shown

---

#### 5.3 Template Preview

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** Covered in verify tests

**Steps:**

1. Navigate to Templates settings
2. Click on template to preview
3. Review preview content

**Expected Results:**

- Preview dialog/page opens
- All template content is visible
- Preview accurately represents how template will be used
- Can close preview and return to list

---

#### 5.4 Template Tags Organization

**User:** SPACE_ADMIN
**Priority:** P3
**Test File:** To be implemented

**Steps:**

1. Create multiple templates with various tags
2. Navigate to Templates settings
3. Verify tags are displayed
4. Use tags for organization/filtering

**Expected Results:**

- Tags are visible on template cards
- Tags help organize templates
- Can filter/search by tags
- Consistent tag display across template types

---

### Category 6: Template Usage & Application

#### 6.1 Use Callout Template from Collaboration Page

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-template.use.ts`

**Steps:**

1. Navigate to space collaboration page
2. Click "Add Callout" or "Post" button
3. In the creation dialog, click "Find Template"
4. Browse available callout templates
5. Select a template
6. Review pre-filled content
7. Optionally customize
8. Click "Post" or "Create"

**Expected Results:**

- Template selection dialog appears
- All available callout templates are listed
- Selecting template pre-fills the form:
  - Callout title
  - Callout description
  - Callout tags
  - Framing content (whiteboard/memo/CTA)
  - Response options settings
  - Comments settings
  - References
- User can modify any pre-filled content
- Callout is created with template configuration
- Callout appears in collaboration feed
- All template features work correctly

---

#### 6.2 Verify Callout Created from Template - Framing

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-template.use.ts`

**Steps:**

1. Create callout using template with framing content
2. Verify framing content appears correctly

**For Whiteboard Framing:**

- Whiteboard canvas is present
- Canvas contains template content
- Whiteboard is interactive

**For Memo Framing:**

- Memo content is visible
- Formatting is preserved
- Content matches template

**For Call to Action Framing:**

- CTA button is visible
- Button text matches template
- Button link works correctly
- Clicking opens target URL

**Expected Results:**

- Framing content from template is applied correctly
- All framing types work as expected
- Content is editable after creation

---

#### 6.3 Verify Callout Created from Template - Response Options

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** `callout-template.use.contributions.ts`

**Steps:**

1. Create callout using template with response options
2. Verify response options work correctly

**For Links & Files Collection:**

- Collection is present and functional
- Contribution permissions match template
- Admins/Members can contribute as configured

**For Posts Collection:**

- Posts collection is present
- Default post title/description available
- Contribution permissions enforced
- Comments on posts match template setting

**For Memos Collection:**

- Memos collection is present
- Default memo settings applied
- Contribution permissions enforced

**For Whiteboards Collection:**

- Whiteboards collection is present
- Default whiteboard template available
- Contribution permissions enforced

**Expected Results:**

- Response options from template are configured correctly
- Contribution permissions work as specified
- Default values are applied
- Collection features are fully functional

---

#### 6.4 Verify Callout Created from Template - Comments

**User:** SPACE_ADMIN, SPACE_MEMBER
**Priority:** P1 - Critical
**Test File:** Covered in usage tests

**Steps:**

1. Create callout from template with comments enabled
2. As SPACE_MEMBER, navigate to callout
3. Add a comment
4. Verify comment appears

**For Comments Disabled:**

- Comment input is not visible
- No comment section present

**For Comments Enabled:**

- Comment input is visible
- Members can add comments
- Comments appear in feed
- Comment interactions work

**Expected Results:**

- Comment settings from template are applied
- Enabled/disabled state matches template
- Comments functionality works correctly

---

#### 6.5 Use Template Multiple Times

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Use same template to create multiple callouts/posts/whiteboards
2. Verify each usage creates independent instance
3. Modify one instance
4. Verify other instances are unaffected

**Expected Results:**

- Template can be used multiple times
- Each usage creates independent instance
- Changes to one instance don't affect others
- Template remains unchanged in library
- All instances have template configuration

---

#### 6.6 Customize Template Content on Use

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** Covered in usage tests

**Steps:**

1. Select template during creation
2. Modify pre-filled content:
   - Change titles
   - Edit descriptions
   - Adjust settings
3. Create with modified content

**Expected Results:**

- All pre-filled fields are editable
- User can customize before creating
- Customizations are applied to created item
- Template library remains unchanged
- Original template still available for future use

---

### Category 7: Template Inheritance & Scope

#### 7.1 Space Templates Available in Subspaces

**User:** SUBSPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. As SPACE_ADMIN, create templates in space
2. Navigate to subspace
3. As SUBSPACE_ADMIN, access template library
4. Verify space templates are available

**Expected Results:**

- Space-level templates are inherited by subspaces
- Subspace admins can use space templates
- Templates work correctly in subspace context
- Clear indication of template source (space vs subspace)

---

#### 7.2 Subspace Templates Not Available in Parent Space

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. As SUBSPACE_ADMIN, create templates in subspace
2. As SPACE_ADMIN, access space template library
3. Verify subspace templates are not visible

**Expected Results:**

- Subspace templates are scoped to subspace
- Not visible in parent space template library
- Template isolation is enforced

---

#### 7.3 Template Inheritance Hierarchy

**User:** GLOBAL_ADMIN
**Priority:** P3
**Test File:** To be implemented

**Steps:**

1. Create templates at multiple levels:
   - Organization level (if supported)
   - Space level
   - Subspace level
2. Verify inheritance cascade
3. Check template availability at each level

**Expected Results:**

- Clear inheritance hierarchy
- Templates cascade down appropriately
- No upward inheritance
- Each level can access own + parent templates

---

### Category 8: Template Permissions & Access Control

#### 8.1 Space Admin Can Create Templates

**User:** SPACE_ADMIN
**Priority:** P1 - Critical
**Test File:** Covered in all template creation tests

**Steps:**

1. Log in as SPACE_ADMIN
2. Navigate to space settings → Templates
3. Verify "Create New" buttons are available
4. Create template successfully

**Expected Results:**

- Space admins have full access to template management
- Can create all template types
- Can edit and delete templates
- Template settings page is accessible

---

#### 8.2 Space Member Cannot Create Templates

**User:** SPACE_MEMBER
**Priority:** P1 - Critical
**Test File:** To be implemented

**Steps:**

1. Log in as SPACE_MEMBER
2. Navigate to space settings
3. Verify Templates tab is not accessible OR
4. Navigate to Templates and verify no edit controls

**Expected Results:**

- Space members cannot access template management
- OR can view templates but cannot create/edit/delete
- Template creation buttons are hidden
- Edit/delete actions are disabled
- Read-only access to template library

---

#### 8.3 Space Member Can Use Templates

**User:** SPACE_MEMBER
**Priority:** P1 - Critical
**Test File:** To be implemented

**Steps:**

1. As SPACE_ADMIN, create templates
2. Log in as SPACE_MEMBER
3. Navigate to collaboration page
4. Create callout/post using template
5. Verify template is applied

**Expected Results:**

- Space members can use templates when creating content
- Template selection dialog is accessible
- All templates available for use
- Templates apply correctly
- Members cannot modify template library

---

#### 8.4 Non-Member Cannot Access Templates

**User:** NON_SPACE_MEMBER
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Log in as user not in space
2. Attempt to access space (if public)
3. Verify templates are not accessible

**Expected Results:**

- Non-members cannot access template library
- Cannot use templates even if space is public
- Template-related UI is hidden
- Read-only viewing only (no creation)

---

### Category 9: Template Migration & Export

#### 9.1 Export Templates - No such functional implementation

**User:** SPACE_ADMIN
**Priority:** P3
**Test File:** To be implemented

**Pre-requisite:** Export functionality available

**Steps:**

1. Navigate to Templates settings
2. Select template(s) to export
3. Click export button
4. Download template file(s)

**Expected Results:**

- Templates can be exported
- Export includes all template configuration
- Export format is documented
- Exported templates can be re-imported

---

#### 9.2 Import Templates

**User:** SPACE_ADMIN
**Priority:** P3
**Test File:** To be implemented

**Pre-requisite:** Import functionality available

**Steps:**

1. Navigate to Templates settings
2. Click import button
3. Select template file(s)
4. Confirm import
5. Verify templates appear in library

**Expected Results:**

- Templates can be imported
- Import validates template structure
- Invalid templates show errors
- Valid templates added to library
- Imported templates work correctly

---

#### 9.3 Duplicate/Copy Template

**User:** SPACE_ADMIN
**Priority:** P2
**Test File:** To be implemented

**Steps:**

1. Navigate to Templates settings
2. Select template to duplicate
3. Click duplicate/copy button
4. Optionally rename
5. Verify copy appears in library

**Expected Results:**

- Templates can be duplicated
- Copy has same configuration as original
- Copy can be independently edited
- Original remains unchanged
- Clear naming to distinguish copies

---

### Category 10: Template Testing Matrix

#### 10.1 Callout Template Combinations Coverage

**Reference:** `callout-tests.spec.ts` tests 1-40

**Matrix Dimensions:**

- **Framing Types:** None, Whiteboard, Memo, Call to Action (4)
- **Response Options:** None, Links & Files, Posts, Memos, Whiteboards (5)
- **Comments:** Enabled, Disabled (2)
- **Contribution Permissions:** Various combinations (6 variants)

**Total Combinations Tested:** 40+ test cases

**Coverage Status:**

- ✅ All framing + response combinations (40 tests)
- ✅ Various contribution permission levels (6 variants)
- ✅ Comments on callout enabled/disabled
- ✅ Comments on contributions enabled/disabled (for posts)
- ✅ Admin-only vs member contributions
- ✅ Template with references

**Expected Results:**

- All combinations work correctly
- No conflicts between features
- Settings are properly isolated
- Templates apply all configurations
- Verification passes for all combinations

---

## Test Data Requirements

### Callout Template Data

```typescript
{
  // Template metadata
  displayName: string
  description: string
  tags: string[]

  // Callout base
  calloutTitle: string
  calloutDescription: string
  calloutTags: string[]
  calloutReferences: { title: string, url: string }[]

  // Framing
  framing: {
    type: 'none' | 'whiteboard' | 'memo' | 'callToAction'
    // Type-specific fields
  }

  // Response options
  commentsEnabled: boolean
  responseOptions: {
    type: 'none' | 'linksFiles' | 'posts' | 'memos' | 'whiteboards'
    // Type-specific fields
  }
}
```

### Post Template Data

```typescript
{
  displayName: string
  description: string
  tags: string[]
  defaultContent: string // Markdown
}
```

### Community Guidelines Template Data

```typescript
{
  displayName: string
  description: string
  tags: string[]
  guidelines: {
    displayName: string
    description: string
    references: { title: string, url: string }[]
  }
}
```

### Whiteboard Template Data

```typescript
{
  displayName: string
  description: string
  tags: string[]
  textInWhiteboard: string
  // Canvas drawing data
}
```

---

## Known Issues & Limitations

### Current Limitations

1. **Template Scope:**
   - Templates are space-scoped
   - No organization-level templates (yet)
   - No platform-level templates

2. **Template Versioning:**
   - No version control for templates
   - Changes to template don't affect existing instances
   - No template history

3. **Template Sharing:**
   - No cross-space template sharing
   - No template marketplace
   - Manual export/import required

4. **Search & Discovery:**
   - Limited template search capabilities
   - No template recommendations
   - No usage analytics

### To Be Implemented

From issue #490:

- [ ] Template editing functionality tests
- [ ] Template deletion with confirmation tests
- [ ] Template permission enforcement tests
- [ ] Template inheritance tests (space → subspace)
- [ ] Template export/import tests
- [ ] Template search/filter tests
- [ ] Template usage analytics tests

From issue #1738:

- [ ] Organization-level templates
- [ ] Template marketplace
- [ ] Template recommendations
- [ ] Template versioning
- [ ] Template collaboration features

---

## Test Execution Strategy

### Test Phases

**Phase 1: Core Template CRUD (P1)**

- Create templates of all types
- Verify template content
- Use templates to create content
- Verify applied templates work correctly

**Phase 2: Template Features (P1)**

- All framing types
- All response option types
- Comments enabled/disabled
- Contribution permissions

**Phase 3: Template Management (P2)**

- Edit templates
- Delete templates
- Duplicate templates
- Search/filter templates

**Phase 4: Permissions & Access (P2)**

- Role-based access control
- Template inheritance
- Cross-space scope
- Member vs admin access

**Phase 5: Advanced Features (P3)**

- Template export/import
- Template analytics
- Template recommendations
- Template versioning

### Test Environment

- **Platform:** Playwright E2E tests
- **Seed:** Custom scenario with space + templates
- **Users:** SPACE_ADMIN, SPACE_MEMBER, SUBSPACE_ADMIN
- **Browser:** Chromium (primary), Firefox, WebKit (optional)
- **Cleanup:** Configurable via `cleanupAfterTests` flag

### Success Criteria

- ✅ All P1 tests pass
- ✅ Template creation for all types works
- ✅ Template usage applies all settings correctly
- ✅ Template combinations (40+ tests) pass
- ✅ Template verification matches expectations
- ✅ No regression in existing callout/post functionality

---

## Appendix: Test Files Structure

```
client-web/src/functional-e2e/templates/
├── template-types/
│   ├── callout-tests.spec.ts          # 40+ callout template tests
│   ├── post-template.spec.ts           # Post template tests
│   ├── community-guidelines-template.spec.ts  # CG template tests
│   ├── whiteboard-template.spec.ts     # Whiteboard template tests
│   ├── forms/
│   │   ├── template-form.ts            # Base template form
│   │   ├── template-form.models.ts     # Common models
│   │   ├── post-template-form.ts
│   │   ├── community-guidelines-template-form.ts
│   │   ├── whiteboard-template-form.ts
│   │   └── callout/
│   │       ├── callout-template-form.ts
│   │       ├── callout-template-form.models.ts
│   │       ├── callout-template-framing.ts
│   │       └── collection/
│   │           ├── links-files.ts
│   │           ├── posts.ts
│   │           ├── memos.ts
│   │           ├── whiteboards.ts
│   │           └── none.ts
│   ├── usage/
│   │   ├── callout-template.use.ts     # Main usage verification
│   │   └── contributions/
│   │       ├── callout-template.use.contributions.ts
│   │       ├── callout-template.use.links.ts
│   │       ├── callout-template.use.posts.ts
│   │       ├── callout-template.use.memos.ts
│   │       └── callout-template.use.whiteboards.ts
│   └── verify/
│       ├── template-verify.ts           # Base verification
│       ├── callout-template-verify.ts
│       ├── post-template-verify.ts
│       ├── community-guidelines-template-verify.ts
│       └── whiteboard-template-verify.ts
```

---

## Related Documentation

- **Callouts Test Plan:** [callouts-test-plan.md](callouts-test-plan.md)
- **Templates Architecture:** GitHub Issue #1738
- **Testing Requirements:** GitHub Issue #490
- **Scenario Factory Documentation:** [test-scenario-factory-capabilities.md](../../../lib/docs/test-scenario-factory-capabilities.md)

---

## Revision History

| Version | Date       | Author         | Changes                    |
| ------- | ---------- | -------------- | -------------------------- |
| 1.0     | 2026-01-05 | GitHub Copilot | Initial test plan creation |

---

**Test Plan Status:** ✅ 40+ Callout Template Tests Implemented, Post/CG/Whiteboard Templates Implemented

**Next Steps:**

1. Complete template editing tests
2. Implement template deletion tests
3. Add permission enforcement tests
4. Add template inheritance tests
5. Implement template export/import tests
