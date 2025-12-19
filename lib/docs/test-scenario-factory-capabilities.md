# TestScenarioFactory Capabilities

## Overview

`TestScenarioFactory` is a comprehensive test data seeding utility for Alkemio platform testing. It automates the creation and cleanup of complex test scenarios with organizations, spaces, innovation packs, virtual contributors, and platform discussions.

## Core Capabilities

### 1. Organization Management

- **Create**: Automatically generates organizations with unique IDs
- **Verify**: Optional organization verification with customizable event sequences
- **License**: Auto-assigns ACCOUNT_LICENSE_PLUS plan
- **Roles**: Assigns admin and associate roles to organization users
- **Tags**: Support for custom profile tags

### 2. Space Hierarchy (up to 3 levels)

- **Root Space (L0)**: Top-level space with account ownership
- **Subspace (L1)**: Child space under root
- **Sub-subspace (L2)**: Grandchild space
- **Features per Space**:
  - Privacy modes (Public/Private)
  - Membership policies (Applications/Open/Invitations)
  - Community roles (Members, Admins, Leads)
  - Collaboration features (Post callouts, Whiteboard callouts, Tutorial callouts)
  - Custom profile (displayName, tagline)

### 3. Innovation Pack Seeding

- **Provider Organization**: Use base org or create a separate verified provider
- **Template Support**: Create multiple templates in a single pack
  - Whiteboard templates (with Excalidraw content)
  - Post templates (with default descriptions)
  - Callout templates (with framing types and response types)
  - Community Guidelines templates
  - Space templates
- **Callout Templates**: Advanced configuration for:
  - Framing types: None, Whiteboard, Memo, Link
  - Response types: Post, Whiteboard, Memo, Link
  - Allowed contributors: Members, Admins, None
  - Custom framing content (Excalidraw JSON, Markdown, URIs)
- **Visibility**: Control search visibility (Public/Account/Hidden) and store listing

### 4. Virtual Contributors

- **Host Organization**: Use base org or create a separate verified host
- **AI Persona Engines**:
  - OpenAI Assistant
  - Generic OpenAI
  - Expert
  - Community Manager
  - Guidance
  - Libra Flow
- **Body of Knowledge Types**:
  - None
  - Website
  - Alkemio Knowledge Base
  - Alkemio Space
  - Other
- **Data Access Modes**: None, Space Profile, Space Profile and Contents
- **Interaction Modes**: Discussion tagging
- **Visibility**: Control search visibility and store listing

### 5. Platform Discussions

- **Forum Auto-Discovery**: Automatically fetches platform forum ID if not provided
- **Environment Variable Support**: Falls back to `PLATFORM_DISCUSSION_FORUM_ID` env var
- **Categories**: Challenge-centric, Community Building, Help, Platform Functionalities, Releases
- **Custom User Roles**: Create discussions as any test user

## Factory Methods

### `createBaseScenario(config)`

Creates a full scenario with organization, spaces (up to 3 levels), innovation packs, VCs, and platform discussions based on configuration.

**Returns**: `OrganizationWithSpaceModel` containing all created entity IDs

### `createBaseScenarioOrganization(config)`

Creates only an organization without spaces. Useful for organization-only tests.

**Returns**: `OrganizationWithSpaceModel` (only organization populated)

### `cleanUpBaseScenario(scenario)`

Safely deletes all resources created during scenario setup in the correct dependency order:

1. Platform discussion (independent)
2. Spaces (sub-subspace → subspace → root space)
3. Virtual contributors
4. Innovation pack
5. Separate VC host organization (if created)
6. Separate Innovation Pack provider organization (if created)
7. Base organization

## Configuration Structure

```typescript
interface TestScenarioConfig {
  name: string;
  organization?: TestScenarioOrganizationConfig;
  space?: TestScenarioSpaceConfig;
  innovationPack?: TestScenarioInnovationPackConfig;
  virtualContributors?: TestScenarioVirtualContributorsConfig;
  platformDiscussion?: TestScenarioPlatformDiscussionConfig;
}
```

### Key Configuration Options

#### Organization

- Verification control (auto-verify or custom event sequences)
- Profile tags
- Community setup

#### Space (recursive for subspaces)

- Profile (displayName, tagline)
- Community (members, admins, leads from TestUser enum)
- Privacy settings
- Membership policies
- Collaboration features (callouts, whiteboards)
- Nested subspaces (up to 2 levels deep)

#### Innovation Pack

- `useBaseOrganization`: Reuse base org or create separate provider
- Pack profile and optional nameID
- Template definitions with type-specific options
- Visibility controls

#### Virtual Contributors

- `useBaseOrganization`: Reuse base org or create separate host
- VC profiles with AI persona and knowledge base configs
- Visibility controls

#### Platform Discussion

- Optional forum ID or env variable name
- Title, description, category
- User role for creation

## Usage Example

```typescript
const scenarioConfig: TestScenarioConfig = {
  name: "comprehensive-test-scenario",
  organization: {
    verification: { setVerified: true },
  },
  space: {
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
  innovationPack: {
    useBaseOrganization: true,
    templates: [
      { type: TemplateType.Whiteboard, profileDisplayName: "WB Template" },
      { type: TemplateType.Post, profileDisplayName: "Post Template" },
    ],
  },
  virtualContributors: {
    useBaseOrganization: false,
    virtualContributors: [
      {
        profileDisplayName: "Expert Assistant",
        aiPersona: { engine: "OPENAI_ASSISTANT" },
        bodyOfKnowledgeType: "ALKEMIO_KNOWLEDGE_BASE",
      },
    ],
  },
  platformDiscussion: {
    title: "Test Discussion",
  },
};

const scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
// ... run tests ...
await TestScenarioFactory.cleanUpBaseScenario(scenario);
```

## Best Practices

1. **Always call cleanup**: Use `cleanUpBaseScenario` in test teardown to avoid resource leaks
2. **Reuse base org when possible**: Set `useBaseOrganization: true` to minimize entities
3. **Use serial test mode**: Configure `test.describe.configure({ mode: 'serial' })` for proper lifecycle
4. **Access created IDs**: The returned model contains all entity IDs for use in tests
5. **Timeout appropriately**: Complex scenarios may take 60-120 seconds to create

## Return Model

The `OrganizationWithSpaceModel` returned by factory methods contains:

```typescript
{
  name: string;
  organization: OrganizationModel;
  space: SpaceModel;
  subspace: SpaceModel;
  subsubspace: SpaceModel;
  scenarioSetupSucceeded: boolean;
  innovationPack?: {
    id: string;
    nameId: string;
    templatesSetId: string;
    providerOrganizationId: string;
  };
  virtualContributors?: Array<{
    id: string;
    nameId: string;
    hostOrganizationId: string;
  }>;
  virtualContributorsHostOrganizationId?: string;
  platformForumId?: string;
  platformDiscussionId?: string;
}
```

All entity IDs are available for assertions and further test operations.
