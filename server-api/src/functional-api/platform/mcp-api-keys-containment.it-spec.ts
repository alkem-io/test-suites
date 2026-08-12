/**
 * @forge-acceptance
 *
 * Durable regression coverage for workspace#038-mcp-api-key-management, User
 * Story 3 — "Contain a leaked key" (P1).
 *
 * A leaked MCP API key must not be usable to escalate: it cannot mint further
 * keys, cannot list or revoke keys through any surface, and the legacy REST
 * lifecycle routes it used to reach are gone. A platform administrator must
 * be able to see and revoke a named user's keys (never a system-actor key),
 * and an ordinary user must not be able to reach another user's keys.
 *
 * Source of truth: specs/038-mcp-api-key-management/spec.md US3, AS1..AS7.
 *
 * This spec talks to the raw GraphQL/REST surface with `graphqlRequestAuth`
 * (TestUser-bearer) and axios (MCP-key bearer) rather than the generated SDK,
 * because the committed codegen output predates this feature's schema
 * additions (`mintMcpApiKey`, `revokeMcpApiKey`, `platformAdmin.mcpApiKeys`,
 * `adminRevokeMcpApiKey`) — see the `language.request.params.ts` precedent
 * for the same pattern.
 */
import axios from 'axios';
import { TestUser, testConfiguration } from '@alkemio/tests-lib';
import { TestUserManager } from '@alkemio/tests-lib/scenario/TestUserManager';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

type McpApiKeyMintResponse = {
  body: {
    data?: {
      mintMcpApiKey?: {
        apiKey: string;
        key: { id: string; name: string; status: string };
      };
    };
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  };
};

const MINT_MUTATION = `
  mutation MintMcpApiKey($mintData: MintMcpApiKeyInput!) {
    mintMcpApiKey(mintData: $mintData) {
      apiKey
      key { id name status }
    }
  }
`;

const REVOKE_MUTATION = `
  mutation RevokeMcpApiKey($revokeData: RevokeMcpApiKeyInput!) {
    revokeMcpApiKey(revokeData: $revokeData) { id status }
  }
`;

const ME_LIST_QUERY = `
  query MeMcpApiKeys {
    me { mcpApiKeys { id name status lastUsedAt } }
  }
`;

const ADMIN_LIST_QUERY = `
  query PlatformAdminMcpApiKeys($userID: UUID!) {
    platformAdmin { mcpApiKeys(userID: $userID) { id name status operations createdDate expiresAt lastUsedAt lastUsedFromIp } }
  }
`;

const ADMIN_REVOKE_MUTATION = `
  mutation AdminRevokeMcpApiKey($revokeData: AdminRevokeMcpApiKeyInput!) {
    adminRevokeMcpApiKey(revokeData: $revokeData) { id status }
  }
`;

/** Mint a key as a given TestUser and return both the plaintext and its id. */
const mintKeyAs = async (
  userRole: TestUser,
  name: string
): Promise<{ apiKey: string; keyId: string }> => {
  const response = (await graphqlRequestAuth(
    {
      operationName: 'MintMcpApiKey',
      query: MINT_MUTATION,
      variables: { mintData: { name, operations: ['READ'] } },
    },
    userRole
  )) as McpApiKeyMintResponse;

  const result = response.body.data?.mintMcpApiKey;
  if (!result) {
    throw new Error(
      `Failed to mint MCP API key as ${userRole}: ${JSON.stringify(response.body.errors)}`
    );
  }
  return { apiKey: result.apiKey, keyId: result.key.id };
};

/** POST a GraphQL request authenticated ONLY by an MCP key bearer. */
const graphqlWithMcpKeyBearer = async (
  query: string,
  variables: Record<string, unknown>,
  mcpKey: string
) => {
  return axios.post(
    testConfiguration.endPoints.graphql.private,
    { query, variables },
    {
      headers: {
        Authorization: `Bearer ${mcpKey}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );
};

/** Confirm an MCP key is genuinely live by using it for its real purpose. */
const mcpKeyAuthenticates = async (mcpKey: string): Promise<boolean> => {
  const restEndpoint = `${testConfiguration.endPoints.server.replace(/\/$/, '')}/rest/mcp`;
  const response = await axios.post(
    restEndpoint,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'containment-it-spec', version: '1' },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${mcpKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      validateStatus: () => true,
    }
  );
  return response.status === 200 && !!response.headers['mcp-session-id'];
};

describe('MCP API key containment (US3, workspace#038-mcp-api-key-management)', () => {
  let leakedKey: string;
  let leakedKeyId: string;
  let ownerId: string;

  beforeAll(async () => {
    ownerId = TestUserManager.users.nonSpaceMember.id;
    const minted = await mintKeyAs(
      TestUser.NON_SPACE_MEMBER,
      'containment-it-spec-probe-key'
    );
    leakedKey = minted.apiKey;
    leakedKeyId = minted.keyId;

    // Sanity: the key must actually authenticate before we can call refusing
    // it on GraphQL a meaningful containment proof rather than a dead key.
    const live = await mcpKeyAuthenticates(leakedKey);
    if (!live) {
      throw new Error(
        'Fixture MCP key did not authenticate against /rest/mcp — cannot prove containment against a dead key'
      );
    }
  });

  afterAll(async () => {
    // Best-effort cleanup via the owning user's own credentials; ignore
    // failure if a scenario already revoked it.
    await graphqlRequestAuth(
      {
        operationName: 'RevokeMcpApiKey',
        query: REVOKE_MUTATION,
        variables: { revokeData: { keyID: leakedKeyId } },
      },
      TestUser.NON_SPACE_MEMBER
    );
  });

  test('US3-AS1: a caller authenticated only by an MCP key cannot mint another key', async () => {
    const response = await graphqlWithMcpKeyBearer(
      MINT_MUTATION,
      { mintData: { name: 'chained-key', operations: ['READ'] } },
      leakedKey
    );

    expect(response.status).toBe(401);
    expect(response.data?.data).toBeFalsy();
    expect(response.data?.errors?.[0]?.extensions?.code).toBe(
      'UNAUTHENTICATED'
    );
  });

  test('US3-AS2: a caller authenticated only by an MCP key cannot list or revoke keys', async () => {
    const listResponse = await graphqlWithMcpKeyBearer(
      ME_LIST_QUERY,
      {},
      leakedKey
    );
    expect(listResponse.status).toBe(401);
    expect(listResponse.data?.data).toBeFalsy();
    expect(listResponse.data?.errors?.[0]?.extensions?.code).toBe(
      'UNAUTHENTICATED'
    );

    const revokeResponse = await graphqlWithMcpKeyBearer(
      REVOKE_MUTATION,
      { revokeData: { keyID: leakedKeyId } },
      leakedKey
    );
    expect(revokeResponse.status).toBe(401);
    expect(revokeResponse.data?.data).toBeFalsy();
    expect(revokeResponse.data?.errors?.[0]?.extensions?.code).toBe(
      'UNAUTHENTICATED'
    );

    // The key must still be active — the refused revoke attempt above must
    // not have had any side effect.
    const ownerList = await graphqlRequestAuth(
      {
        operationName: 'MeMcpApiKeys',
        query: ME_LIST_QUERY,
        variables: {},
      },
      TestUser.NON_SPACE_MEMBER
    );
    const ownKey = ownerList.body.data.me.mcpApiKeys.find(
      (k: { id: string }) => k.id === leakedKeyId
    );
    expect(ownKey?.status).toBe('ACTIVE');
  });

  test('US3-AS3: the legacy /rest/mcp/api-keys routes return 404 on POST, GET and DELETE', async () => {
    const legacyEndpoint = `${testConfiguration.endPoints.server.replace(/\/$/, '')}/rest/mcp/api-keys`;

    for (const method of ['post', 'get', 'delete'] as const) {
      const response = await axios.request({
        method,
        url: legacyEndpoint,
        validateStatus: () => true,
      });
      expect(
        response.status,
        `${method.toUpperCase()} ${legacyEndpoint} should be 404`
      ).toBe(404);
    }
  });

  test('US3-AS4: a platform administrator lists a named user\'s keys with the same metadata, never a key value', async () => {
    const response = await graphqlRequestAuth(
      {
        operationName: 'PlatformAdminMcpApiKeys',
        query: ADMIN_LIST_QUERY,
        variables: { userID: ownerId },
      },
      TestUser.GLOBAL_ADMIN
    );

    expect(response.body.errors).toBeUndefined();
    const keys = response.body.data.platformAdmin.mcpApiKeys;
    const found = keys.find((k: { id: string }) => k.id === leakedKeyId);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      id: leakedKeyId,
      name: 'containment-it-spec-probe-key',
      status: 'ACTIVE',
    });
    // Never a key value or a hash — the allowlisted projection carries no
    // such field at all.
    expect(found).not.toHaveProperty('apiKey');
    expect(found).not.toHaveProperty('keyHash');
  });

  test('US3-AS5: a platform administrator revokes a key and the record shows an administrator acted', async () => {
    const revokeResponse = await graphqlRequestAuth(
      {
        operationName: 'AdminRevokeMcpApiKey',
        query: ADMIN_REVOKE_MUTATION,
        variables: { revokeData: { userID: ownerId, keyID: leakedKeyId } },
      },
      TestUser.GLOBAL_ADMIN
    );

    expect(revokeResponse.body.errors).toBeUndefined();
    expect(revokeResponse.body.data.adminRevokeMcpApiKey).toMatchObject({
      id: leakedKeyId,
      status: 'REVOKED',
    });

    // The key stops authenticating immediately.
    const stillLive = await mcpKeyAuthenticates(leakedKey);
    expect(stillLive).toBe(false);

    // The owner's own list reflects the change, with history intact.
    const ownerList = await graphqlRequestAuth(
      {
        operationName: 'MeMcpApiKeys',
        query: ME_LIST_QUERY,
        variables: {},
      },
      TestUser.NON_SPACE_MEMBER
    );
    const ownKey = ownerList.body.data.me.mcpApiKeys.find(
      (k: { id: string }) => k.id === leakedKeyId
    );
    expect(ownKey?.status).toBe('REVOKED');
  });

  test('US3-AS6: a platform administrator cannot list or revoke keys through a non-user (system-actor) userID', async () => {
    // A random UUID that is not any user's id models an actor-bound
    // (system-actor) subject: the admin surface's `userId IS NOT NULL`
    // predicate on `mcp_api_key.userId` makes such a subject structurally
    // unreachable regardless of whether a row happens to exist for it.
    const nonUserSubject = '00000000-0000-4000-8000-000000000000';

    const listResponse = await graphqlRequestAuth(
      {
        operationName: 'PlatformAdminMcpApiKeys',
        query: ADMIN_LIST_QUERY,
        variables: { userID: nonUserSubject },
      },
      TestUser.GLOBAL_ADMIN
    );
    expect(listResponse.body.errors).toBeUndefined();
    expect(listResponse.body.data.platformAdmin.mcpApiKeys).toEqual([]);

    const revokeResponse = await graphqlRequestAuth(
      {
        operationName: 'AdminRevokeMcpApiKey',
        query: ADMIN_REVOKE_MUTATION,
        variables: {
          revokeData: {
            userID: nonUserSubject,
            keyID: '00000000-0000-4000-8000-000000000001',
          },
        },
      },
      TestUser.GLOBAL_ADMIN
    );
    expect(revokeResponse.body.data?.adminRevokeMcpApiKey).toBeFalsy();
    expect(revokeResponse.body.errors?.[0]?.extensions?.code).toBe(
      'ENTITY_NOT_FOUND'
    );
  });

  test("US3-AS7: an ordinary user cannot list or revoke another user's keys", async () => {
    const target = await mintKeyAs(
      TestUser.GLOBAL_ADMIN,
      'containment-it-spec-as7-target-key'
    );

    try {
      const adminUserId = TestUserManager.users.globalAdmin.id;
      const listResponse = await graphqlRequestAuth(
        {
          operationName: 'PlatformAdminMcpApiKeys',
          query: ADMIN_LIST_QUERY,
          variables: { userID: adminUserId },
        },
        TestUser.NON_SPACE_MEMBER
      );
      expect(listResponse.body.data?.platformAdmin).toBeFalsy();
      expect(listResponse.body.errors?.[0]?.extensions?.code).toBe(
        'FORBIDDEN_POLICY'
      );

      const revokeResponse = await graphqlRequestAuth(
        {
          operationName: 'RevokeMcpApiKey',
          query: REVOKE_MUTATION,
          variables: { revokeData: { keyID: target.keyId } },
        },
        TestUser.NON_SPACE_MEMBER
      );
      expect(revokeResponse.body.data?.revokeMcpApiKey).toBeFalsy();
      expect(revokeResponse.body.errors?.[0]?.extensions?.code).toBe(
        'ENTITY_NOT_FOUND'
      );

      // The target key must remain untouched by the refused attempt.
      const targetOwnerList = await graphqlRequestAuth(
        {
          operationName: 'MeMcpApiKeys',
          query: ME_LIST_QUERY,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );
      const stillActive = targetOwnerList.body.data.me.mcpApiKeys.find(
        (k: { id: string }) => k.id === target.keyId
      );
      expect(stillActive?.status).toBe('ACTIVE');
    } finally {
      await graphqlRequestAuth(
        {
          operationName: 'RevokeMcpApiKey',
          query: REVOKE_MUTATION,
          variables: { revokeData: { keyID: target.keyId } },
        },
        TestUser.GLOBAL_ADMIN
      );
    }
  });
});
