# Explore Alkemio Platform - Anonymous User Flow Test Plan

## Application Overview

This test plan covers the complete exploration journey for an anonymous (non-logged-in) user on the Alkemio platform. The flow tests discovery of Spaces, community features, Forum, Template Library, and ends with the sign-up process.

**Seed File:** `./client-web/src/functional-e2e/seed-explore-welcome.spec.ts`

---

## Test Scenarios

### 1. Home Page Access (Anonymous)

**Steps:**

1. Navigate to `http://localhost:3000`
2. Wait for page to load (redirect to `/home`)

**Expected Results:**

- Page displays "Explore Spaces of Your Interest" heading
- "Explore Spaces of Your Interest" section is visible
- Public space cards are displayed
- "Sign up" link is visible in the footer/main area
- Filter buttons visible: Most Active Spaces, Energy Transition, Inclusive Society, Public Services, Innovation, Digitalization of Society
- Tools Menu button is accessible

---

### 2. Click on Public Space

**Steps:**

1. From home page, click on a public space card (e.g., `seed-explore-welcome-*`)

**Expected Results:**

- Navigates to space URL `/[space-nameId]`
- Space heading (level 1) displays space name
- Space tagline is visible
- Tab navigation is visible: Home, community, Subspaces, Knowledge
- "Sign in to apply" button is visible (user is not a member)

---

### 3. Click on Community Tab

**Steps:**

1. From space page, click on "community" tab

**Expected Results:**

- URL updates to include `?tab=2`
- Tab shows "community" as selected
- "The contributors to this Space!" description is visible
- "Who's involved" heading is displayed
- People/organizations toggle is visible
- "Please log in to see all contributing users" message appears for anonymous users
- "Sign in" and "Sign up" buttons are available

---

### 4. Click on Subspaces Tab

**Steps:**

1. Click on "Subspaces" tab

**Expected Results:**

- URL updates to include `?tab=3`
- Tab shows "Subspaces" as selected
- Description about exploring hosted Subspaces is visible
- "Read more" button is available
- Subspace list/grid is displayed (if any subspaces exist)
- Subspace cards show avatar, heading, and "in: [parent space]" link

---

### 5. Click on Knowledge Tab

**Steps:**

1. Click on "Knowledge" tab

**Expected Results:**

- URL updates to include `?tab=4`
- Tab shows "Knowledge" as selected
- Knowledge Base description is visible
- Search box is available
- "There are no posts yet." message if empty

---

### 6. Click on Explore Spaces (Tools Menu)

**Steps:**

1. Click on "Tools Menu" button in navigation
2. From dropdown, click "Explore Spaces"

**Expected Results:**

- Tools Menu shows options: Template Library, Alkemio Forum, Explore Spaces, Find contributors
- Clicking "Explore Spaces" navigates to `/spaces`
- "Explore Spaces" heading is displayed
- Description: "All activity on Alkemio happens inside Spaces..."
- Filter controls: "All Spaces", "Public Spaces" buttons
- Search combobox is available

---

### 7. Click on Public Space (from Explore Page)

**Steps:**

1. From `/spaces`, click on a public space card or use "Public Spaces" filter

**Expected Results:**

- Navigates to selected space
- Space page loads with all standard tabs
- Anonymous user sees membership prompts

---

### 9. Click on Organization

**Steps:**

1. From Contributors page or Space Community tab, locate an organization
2. Click on the organization link/card

**Expected Results:**

- Navigates to organization profile page
- Organization heading is displayed
- Organization details are visible (for public organizations)

---

### 10. Explore Forum

**Steps:**

1. Click on "Tools Menu" button
2. Click "Alkemio Forum"

**Expected Results:**

- Navigates to `/forum`
- "Welcome to the Alkemio Forum" heading is displayed
- Description: "Connect with others, ask questions, and stay updated..."
- Category filter buttons are visible (7 categories)
- "Discussions (N)" heading shows discussion count
- Search box and sort dropdown ("Newest") are available
- Discussion list is displayed (if any exist)

---

### 11. Click on Discussion

**Steps:**

1. If discussions exist, click on a discussion item

**Expected Results:**

- Discussion details page loads
- Discussion title and content are visible
- Comments/replies section is displayed
- Anonymous users may have limited interaction

---

### 12. Explore Library

**Steps:**

1. Click on "Tools Menu" button
2. Click "Template Library"

**Expected Results:**

- Navigates to `/innovation-library`
- "Alkemio's Template Library" heading is displayed
- "Get your (Sub)Space running with these ready-to-use tools" description
- "Learn more" link to documentation
- "Template Packs" section with search and expand button
- "Browse through all available materials" section
- Template type filters: Collaboration Tool Template, Community Guidelines Template, Post Template, Space Template, Whiteboard Template

---

### 13. Click on Template Pack

**Steps:**

1. From Template Library, locate a template pack card
2. Click on the template pack

**Expected Results:**

- Template pack details are displayed
- Pack name, description, and templates are visible
- Templates within the pack are listed

---

### 14. Click on Collaboration Tool Template

**Steps:**

1. Click "Collaboration Tool Template" filter button
2. Browse filtered results showing Callout templates

**Expected Results:**

- Filter becomes active (highlighted)
- Only Callout-type templates are displayed
- Template cards show collaboration tool details

---

### 15. Click on Sign Up

**Steps:**

1. Navigate to sign-up by clicking "Sign up" link (from home or footer)
2. Or navigate directly to `/sign_up`

**Expected Results:**

- Navigates to `/sign_up`
- "Explore Spaces of Your Interest" message
- "Sign up" heading (level 1)
- "Have an account? Sign in" link
- Terms of Use and Privacy Policy acceptance checkbox
- Form fields (disabled until terms accepted): E-Mail, First Name, Last Name
- "Next" button (disabled until terms accepted)
- Social sign-up options: Github, LinkedIn, Microsoft (disabled until terms accepted)

---

## UI Elements Reference

### Navigation

- **Tools Menu button**: `button[name="Tools Menu"]`
- **My Dashboard link**: `link[name="My Dashboard"]`
- **Search button**: `button[name="Search"]`

### Home Page

- **Space cards**: `link[name^="Card banner:"]`
- **Sign up link**: `link[name="Sign up"]`
- **Filter buttons**: `button[name="Most Active Spaces"]`, etc.

### Space Page

- **Tabs**: `tab[name="Home"]`, `tab[name="community"]`, `tab[name="Subspaces"]`, `tab[name="Knowledge"]`
- **Sign in to apply**: `button[name="Sign in to apply"]`

### Tools Menu Items

- **Template Library**: `menuitem[name="Template Library"]`
- **Alkemio Forum**: `menuitem[name="Alkemio Forum"]`
- **Explore Spaces**: `menuitem[name="Explore Spaces"]`
- **Find contributors**: `menuitem[name="Find contributors"]`

### Contributors Page

- **Users section**: `heading[name="Users"]`
- **Organizations section**: `heading[name="Organizations"]`
- **Virtual Contributors section**: `heading[name="Virtual Contributors"]`

### Forum Page

- **Discussions heading**: `heading[name^="Discussions"]`
- **Sort dropdown**: `combobox[name="Discussions sort order"]`

### Template Library

- **Template type filters**: `button[name="Collaboration Tool Template"]`, etc.
- **Expand Window**: `button[name="Expand Window"]`

### Sign Up Page

- **Terms checkbox**: `checkbox[name="I accept the Terms of Use and Privacy Policy."]`
- **Email field**: `textbox[name="E-Mail"]`
- **First Name field**: `textbox[name="First Name"]`
- **Last Name field**: `textbox[name="Last Name"]`
- **Next button**: `button[name="Next"]`

---

## Notes

- All tests assume anonymous (non-logged-in) user
- Base URL: `http://localhost:3000` (configurable via `ALKEMIO_BASE_URL` env var)
- Some features require login - anonymous users see appropriate prompts
- Space names are dynamically generated (e.g., `seed-explore-welcome-{uniqueId}`)
- Loading states should be handled with appropriate waits
