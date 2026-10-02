import axios from 'axios';
import { test } from 'vitest';
import { testConfiguration } from '@alkemio/tests-lib';
import type { GqlError } from './outcome';
import type { Headers } from './types';

/**
 * THE one MCP client of this suite: just enough MCP (Streamable HTTP, JSON
 * responses) to call one tool on the server's `/rest/mcp` endpoint —
 * initialize → tools/call → close the session.
 *
 * Why the suite needs MCP at all: the tool `analyze_audit_log` is the ONLY API
 * surface that returns role-assignment audit records (the two GraphQL audit
 * fields are email-change only), and it is the third surface of capability A19.
 * Reading it here is what keeps the suite off the database.
 *
 * The endpoint accepts the same bearer token as GraphQL, so no MCP API key is
 * minted and none can leak. It only exists when the server runs with
 * `MCP_ENABLED=true` (default false → HTTP 503; on in dev, test, acceptance and
 * production), so tests that need it are declared with `mcpTest`.
 *
 * Three layers, one protocol implementation:
 *   callTool       raw: `{ isError, text }`, exactly what the tool answered
 *   callMcpTool    for `classify()`: a refusal is re-thrown in the SDK's error
 *                  shape so a capability row is judged like any other
 *   recordsFor /   the audit reads the rule scenarios assert on
 *   countFor
 */

/** `endPoints.rest` is `/api/private/rest`, which has no `/mcp` (404) — the MCP controller hangs off the server root. */
const endpoint = (): string =>
  `${testConfiguration.endPoints.server.replace(/\/$/, '')}/rest/mcp`;

/**
 * Detected, not configured: a server with MCP switched off answers 503 on the
 * endpoint, anything else means the controller is there. `PLATFORM_ROLES_MCP=1`
 * / `=0` overrides the probe (e.g. to make a missing endpoint FAIL in a pipeline
 * that must have it).
 */
const detectMcp = async (): Promise<boolean> => {
  if (process.env.PLATFORM_ROLES_MCP === '1') return true;
  if (process.env.PLATFORM_ROLES_MCP === '0') return false;
  try {
    const { status } = await axios.post(
      endpoint(),
      {},
      { validateStatus: () => true, timeout: 5_000 }
    );
    return status !== 503 && status !== 404;
  } catch {
    return false;
  }
};

export const MCP_AVAILABLE = await detectMcp();

/** A visible `todo` unless the server under test has MCP switched on. */
export const mcpTest = (name: string, fn: () => Promise<void>): void => {
  if (MCP_AVAILABLE) test(name, fn);
  else
    test.todo(
      `${name} — the server under test has MCP switched off (needs MCP_ENABLED=true)`
    );
};

export type ToolResult = { isError: boolean; text: string };

type RpcToolResult = {
  result?: { isError?: boolean; content?: { type: string; text: string }[] };
  error?: { code: number; message: string };
};

const post = async (
  authorization: string,
  body: Record<string, unknown>,
  sessionId?: string
) => {
  const response = await axios.post<RpcToolResult>(
    endpoint(),
    { jsonrpc: '2.0', ...body },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        authorization,
        ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
      },
      validateStatus: () => true,
    }
  );
  // A disabled MCP server answers 503 here — a transport problem, not a verdict.
  if (response.status >= 300) {
    throw new Error(
      `MCP ${String(body.method)}: HTTP ${response.status} ${JSON.stringify(response.data).slice(0, 200)}`
    );
  }
  return response;
};

/** One tool call in its own short-lived session. `authorization`: `Bearer <token>`. */
export const callTool = async (
  authorization: string,
  tool: string,
  args: Record<string, unknown>
): Promise<ToolResult> => {
  const initialized = await post(authorization, {
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'platform-roles-tests', version: '1' },
    },
  });
  const sessionId = initialized.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) throw new Error('MCP initialize returned no mcp-session-id');

  try {
    await post(
      authorization,
      { method: 'notifications/initialized' },
      sessionId
    );
    const { data } = await post(
      authorization,
      {
        id: 2,
        method: 'tools/call',
        params: { name: tool, arguments: args },
      },
      sessionId
    );
    if (data.error) return { isError: true, text: data.error.message };
    const text = data.result?.content?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error(
        `MCP tools/call ${tool}: no text content in ${JSON.stringify(data).slice(0, 200)}`
      );
    }
    return { isError: data.result?.isError === true, text };
  } finally {
    // The server keeps a session per initialize until it is closed.
    await axios.delete(endpoint(), {
      headers: { authorization, 'mcp-session-id': sessionId },
      validateStatus: () => true,
    });
  }
};

/**
 * MCP reports a refusal as a tool RESULT, not a GraphQL error. To be judged by
 * the same `classify()` as every other capability, it is re-thrown in the SDK's
 * error shape, located at the tool name:
 *   "Access denied: …"   → MCP_ACCESS_DENIED (the tool's own refusal)
 *   any other tool error → MCP_TOOL_ERROR
 */
export const MCP_ACCESS_DENIED = 'MCP_ACCESS_DENIED';
const ACCESS_DENIED = /^Access denied:/;

export const callMcpTool = async <T = unknown>(
  { authorization }: Headers,
  tool: string,
  args: Record<string, unknown>
): Promise<{ data: T }> => {
  const { isError, text } = await callTool(authorization, tool, args);
  if (isError) {
    const code = ACCESS_DENIED.test(text)
      ? MCP_ACCESS_DENIED
      : 'MCP_TOOL_ERROR';
    throw {
      response: {
        errors: [
          { message: text, path: [tool], extensions: { code } },
        ] as GqlError[],
      },
    };
  }
  return { data: JSON.parse(text) as T };
};

// ===== audit records ==========================================================

export const AUDIT_TOOL = 'analyze_audit_log';

export type AuditRecord = {
  id: string;
  createdDate: string;
  category: string;
  outcome: string;
  initiatorRole: string;
  initiatorUserId: string | null;
  failureReason: string | null;
  correlationId: string | null;
  isAnomaly: boolean;
  details?: Record<string, unknown>;
};

type UserHistory = { total: number; entries: AuditRecord[] };

/** One `analyze_audit_log` call, as whoever holds `token`. */
export const callAuditTool = (
  token: string,
  args: Record<string, unknown>
): Promise<ToolResult> => callTool(`Bearer ${token}`, AUDIT_TOOL, args);

const userHistory = async (
  token: string,
  subjectUserId: string
): Promise<UserHistory> => {
  const { isError, text } = await callAuditTool(token, {
    action: 'user_history',
    subjectUserId,
    limit: 200,
    includeDetails: true,
  });
  if (isError) throw new Error(`${AUDIT_TOOL} refused: ${text}`);
  return JSON.parse(text) as UserHistory;
};

/** Every record whose SUBJECT is this user, newest first (the tool's only filter). */
export const recordsFor = async (
  token: string,
  subjectUserId: string
): Promise<AuditRecord[]> => (await userHistory(token, subjectUserId)).entries;

/** For before/after assertions — never "the newest row". */
export const countFor = async (
  token: string,
  subjectUserId: string
): Promise<number> => (await userHistory(token, subjectUserId)).total;
