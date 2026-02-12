## Scope

- Server PR 5711 (Specs 019 & 020): identity/auth consolidation + conversation architecture refactor; new `authenticationID` linkage to Kratos, `adminBackfillAuthenticationIDs` migration helper, unified `ConversationsSet` with `ConversationMembership`, Matrix adapter refresh, legacy `accountUpn`/`vc_interaction` removal.
- Client PR 9107: removes client usage of legacy conversation type and generated GraphQL types now align to new schema (`conversationsSet`, `messaging`, admin backfill mutation, dropped `accountUpn`, simplified `VcInteraction`).

## Change Impact

- Identity/auth
  - New `authenticationID` column on users; legacy `accountUpn` removed. New REST `/rest/internal/identity/resolve` and GraphQL admin mutation `adminBackfillAuthenticationIDs` to populate IDs.
  - SessionSyncModule removed; Kratos identity resolution now flows through IdentityResolveService and UserAuthenticationLink module.
- Conversation/messaging
  - Conversations now belong to a single platform-owned `ConversationsSet`; membership managed via `ConversationMembership` pivot (replaces direct `userID/virtualContributorID`).
  - Communication adapter rewritten against `@alkem-io/matrix-adapter-go-lib`; new message inbox/events/resolvers; legacy `vc_interaction` table removed with data migrated into room thread metadata.
  - GraphQL additions: `createConversation` (platform scope), `conversationsSet` field on `Conversation`/`Platform`, new `Messaging` type; removals: `wellKnownVirtualContributor` on `Conversation`, `accountUpn` on `User`.
- Infra & configs
  - Synapse/Matrix configs updated (new `matrix-adapter.yaml`, room control module). Traefik and quickstart YAMLs adjusted. Reference schema updated; pnpm lock churn.
- Client web
  - Generated Apollo helpers/schema updated to match new fields/mutations. `NewMessageDialog` now uses the new conversation shape (no legacy `type`). Removed generated hooks tied to `conversation.type`.

## Risks / Dependencies

- Backfill correctness: missing/duplicate `authenticationID` values block login/authorization. Requires Kratos identity data to be present and unique.
- Conversation membership gaps could orphan existing threads; Matrix room sync must preserve history and permissions.
- Client cache invalidation: changes to key specifiers (`Conversation`, `Platform`, `VirtualContributor`, `VcInteraction`) require Apollo cache reset after deploy.
- Infra drift: Synapse/Traefik config changes must be applied in the same rollout as the server build; otherwise adapter initialization fails.

## Test Plan

### Backend/API

- Run targeted Jest suites in server repo (at least):
  - `pnpm test --config config/jest.config.communication.mjs`
  - `pnpm test --config config/jest.config.account.mjs`
  - `pnpm test --config config/jest.config.integration.mjs`
- GraphQL contract checks
  - Ensure schema includes new types/fields and removed legacy ones via `npm run codegen` in client-web; confirm no breaking fragments.
  - Exercise admin backfill:

```graphql
mutation BackfillAuthIDs {
  adminBackfillAuthenticationIDs(batchSize: 500) {
    processed
    updated
    skipped
    retriedBatches
  }
}
```

    - Create conversation on platform scope:

```graphql
mutation CreateConversationOnPlatform($input: ConversationCreateInput!) {
  createConversation(input: $input) {
    id
    conversationsSet {
      id
    }
    messaging {
      id
    }
    authorization {
      status
    }
  }
}
```

    - Verify conversation membership exposure:

```graphql
query PlatformConversations {
  platform {
    id
    conversationsSet {
      id
      conversations {
        id
        authorization {
          status
        }
      }
    }
  }
}
```

- REST identity resolution smoke

```bash
curl -X POST $SERVER/rest/internal/identity/resolve \
	-H "Content-Type: application/json" \
	-d '{"identityID": "<kratos-id>"}'
```

Expect resolved agent id/type when authenticationID is populated.

### Client Web

- Rebuild client with updated schema: `pnpm codegen && pnpm lint && pnpm test --filter messaging` (adjust filter to your setup).
- Manual UI smoke (web):
  - Start new DM / message via `NewMessageDialog`; confirm conversation is created and messages send/receive without referencing legacy conversation type.
  - Switch between spaces/threads to verify cache updates and no console GraphQL errors for dropped fields (`accountUpn`, `Conversation.type`).
  - Reactions/replies still function after adapter change (check matrix room events).

### Regression focuses

- Notifications and forum discussions (uses conversation/room pipeline) continue to deliver events.
- Virtual contributor messaging still routes replies (check `wellKnownVirtualContributor` removal impact).
- User profile page loads without `accountUpn`; authentication flows (login, token refresh) unaffected.

## Migration & Data Validation

Run after deploying migrations and before enabling traffic. Replace table/column names with real schema identifiers if they differ.

### Identity backfill checks

```sql
-- How many users still lack authentication IDs (camelCase column from TypeORM)
SELECT COUNT(*) AS missing_authentication_id
FROM public."user"
WHERE "authenticationID" IS NULL;

-- Detect duplicated authentication IDs (should be zero after backfill)
SELECT "authenticationID", COUNT(*) AS cnt
FROM public."user"
WHERE "authenticationID" IS NOT NULL
GROUP BY "authenticationID"
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- Spot check mapping between user and Kratos identity
SELECT id, "authenticationID", email, "createdDate", "updatedDate"
FROM public."user"
WHERE "authenticationID" IS NOT NULL
ORDER BY "updatedDate" DESC
LIMIT 20;

-- Count users with valid authenticationID vs. null (overall statistics)
SELECT
  SUM(CASE WHEN "authenticationID" IS NOT NULL THEN 1 ELSE 0 END) AS with_auth_id,
  SUM(CASE WHEN "authenticationID" IS NULL THEN 1 ELSE 0 END) AS without_auth_id,
  COUNT(*) AS total_users
FROM public."user";
```

### Conversation architecture checks

```sql
-- Ensure platform-owned Messaging set (formerly ConversationsSet) exists
SELECT id, "ownerType", "ownerId"
FROM public."messaging"
WHERE "ownerType" = 'PLATFORM';

-- Every conversation should have membership rows (joined via ConversationMembership)
SELECT c.id, COUNT(m.id) AS member_count, MAX(c."createdDate") AS created
FROM public."conversation" c
LEFT JOIN public."conversation_membership" m ON m."conversationId" = c.id
GROUP BY c.id
ORDER BY member_count ASC
LIMIT 15;

-- Conversations without any members (potential orphan data)
SELECT c.id, c."createdDate", c."roomId"
FROM public."conversation" c
LEFT JOIN public."conversation_membership" m ON m."conversationId" = c.id
WHERE m.id IS NULL;

-- Verify old vc_interaction data was migrated (table should be empty or removed)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'vc_interaction'
    )
    THEN (SELECT COUNT(*) FROM public."vc_interaction")
    ELSE 0
  END AS vc_interaction_count;
```

### Adapter/room sanity

```sql
-- Rooms without linked conversations after migration (should be zero)
SELECT r.id, r."createdDate"
FROM public."room" r
LEFT JOIN public."conversation" c ON c."roomId" = r.id
WHERE c.id IS NULL;

-- Messages per room to detect orphaned threads and room health
SELECT r.id, COUNT(m.id) AS message_count, MAX(m."createdDate") AS latest_message
FROM public."room" r
LEFT JOIN public."message" m ON m."roomId" = r.id
GROUP BY r.id
ORDER BY message_count DESC;

-- Verify thread metadata exists for threaded messages (post-migration vcInteractionsByThread)
SELECT
  COUNT(DISTINCT "threadID") AS unique_threads,
  SUM(CASE WHEN "threadID" IS NOT NULL THEN 1 ELSE 0 END) AS threaded_messages,
  COUNT(*) AS total_messages
FROM public."message";
```

### Admin backfill dry-run (GraphQL)

Run the backfill mutation with a small batch first; confirm `processed` == `updated` and `retriedBatches` is empty. After success, rerun the SQL null-count query to confirm zero missing IDs.

## Rollout / Monitoring

- Deploy order: migrations → server → Synapse/Traefik configs → client web build. Clear Apollo caches on client deploy.
- Monitor Matrix adapter logs for auth errors and room control module warnings; monitor GraphQL error rate on `createConversation` and admin backfill endpoints.
- Rollback plan: if adapter fails, switch traffic back to previous server build and restore Synapse config snapshot; keep DB migration backups to revert authentication/conversation changes if needed.
