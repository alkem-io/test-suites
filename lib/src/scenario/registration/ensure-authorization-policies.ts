import axios from "axios";
import { TestUser } from "../../common/enums/test.user";
import { testConfiguration } from "../../config/test.configuration";
import { getGraphqlClient } from "../../utils/graphqlClient";
import { LogManager } from "../LogManager";
import { getUserToken } from "./get-user-token";

/**
 * Opt-in post-setup authorization reset.
 *
 * Alkemio stores a computed authorization policy on every entity. A server
 * upgrade that changes the rule set leaves the stored policies as they were
 * until `authorizationPolicyResetAll` rewrites them; until now that was a
 * manual mutation someone had to remember (the server's `dev-seed-roles`
 * service prints it as its last line). This step makes it part of global
 * setup, governed by `AUTH_POLICY_RESET_ON_SETUP`:
 *   - `off` (default): never reset — the operator owns the policies. A freshly
 *     bootstrapped env (the nightly after `cleanup-database.yml`) needs none.
 *   - `always`: reset unconditionally, e.g. right after a server upgrade.
 *   - `auto`: probe as the harness admin and reset only when a space read is
 *     denied. The probe is deliberately coarse: it runs AFTER
 *     `ensureHarnessAdminRoles`, because a bootstrap admin without the
 *     content role is denied `Space.settings` for want of the role, not of a
 *     reset (verified 2026-11-05 on a locally seeded stack — the seeded
 *     content@ account read the settings while admin@ could not).
 *
 * The reset is asynchronous on the server — the mutation publishes one message
 * per account/organization/user to the auth-reset worker and returns a task
 * id — so the step waits for that task and then for the space read to settle
 * (the platform-level reset messages carry no task id), bounded by
 * `AUTH_POLICY_RESET_TIMEOUT_MS`. A worker built from a different server
 * version than the one under test silently rewrites every policy with stale
 * rules; that is outside what the harness can detect.
 */

const HARNESS_ADMIN_EMAIL = `${TestUser.GLOBAL_ADMIN}@alkem.io`;
const POLL_INTERVAL_MS = 2_000;
const SETTLE_TIMEOUT_MS = 30_000;
const RESET_PRIVILEGE = "AUTHORIZATION_RESET";

const MANUAL_RESET_HINT =
  "run it by hand as a Platform Operations Admin, e.g. from the server clone: ./.scripts/gql-request.sh --user ops@alkem.io 'mutation { authorizationPolicyResetAll }' — or set AUTH_POLICY_RESET_ON_SETUP=off to skip this step";

// Two requests, not one: `Space.settings` is non-null, so a denied read nulls
// the whole response and would take the platform part with it. The space probe
// goes through `spaces` rather than a named space so it needs no fixture and
// works on an empty platform.
const SPACE_PROBE_QUERY =
  "query { spaces { id settings { privacy { mode } } } }";
const PLATFORM_PROBE_QUERY =
  "query { platform { authorization { myPrivileges } } }";

const TASK_QUERY =
  "query($id: UUID!) { task(id: $id) { status itemsCount itemsDone errors } }";

type GraphqlError = { message?: string; path?: Array<string | number> };

type SpaceProbe = {
  /** The admin was denied somewhere under `spaces` — policies predate its roles. */
  stale: boolean;
  detail: string;
};

const postRaw = async <T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data?: T | null; errors?: GraphqlError[] }> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      validateStatus: () => true,
    }
  );
  if (response.status !== 200 || !response.data) {
    throw new Error(
      `GraphQL probe returned HTTP ${response.status}: ${JSON.stringify(
        response.data
      ).slice(0, 300)}`
    );
  }
  return response.data;
};

const probeSpaceRead = async (token: string): Promise<SpaceProbe> => {
  const { data, errors = [] } = await postRaw<{
    spaces?: Array<{ id: string }>;
  }>(token, SPACE_PROBE_QUERY);
  const spaceErrors = errors.filter((e) => e.path?.[0] === "spaces");
  if (spaceErrors.length > 0) {
    return {
      stale: true,
      detail: spaceErrors.map((e) => e.message).join("; "),
    };
  }
  if (!data?.spaces) {
    throw new Error(
      `could not read spaces as ${HARNESS_ADMIN_EMAIL}: ${JSON.stringify(
        errors
      ).slice(0, 300)}`
    );
  }
  return { stale: false, detail: `${data.spaces.length} space(s) readable` };
};

const canResetPlatform = async (token: string): Promise<boolean> => {
  const { data, errors = [] } = await postRaw<{
    platform?: { authorization?: { myPrivileges?: string[] } };
  }>(token, PLATFORM_PROBE_QUERY);
  if (!data?.platform) {
    throw new Error(
      `could not read the platform as ${HARNESS_ADMIN_EMAIL}: ${JSON.stringify(
        errors
      ).slice(0, 300)}`
    );
  }
  return (data.platform.authorization?.myPrivileges ?? []).includes(
    RESET_PRIVILEGE
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForTask = async (
  token: string,
  taskId: string,
  timeoutMs: number
): Promise<void> => {
  const logger = LogManager.getLogger();
  const deadline = Date.now() + timeoutMs;
  let polls = 0;
  while (Date.now() < deadline) {
    const { data, errors } = await postRaw<{
      task?: {
        status: string;
        itemsCount?: number | null;
        itemsDone?: number | null;
        errors?: string[] | null;
      };
    }>(token, TASK_QUERY, { id: taskId });
    const task = data?.task;
    if (!task) {
      throw new Error(
        `authorization reset task ${taskId} is not readable: ${JSON.stringify(
          errors
        ).slice(0, 300)}`
      );
    }
    if (task.status === "ERRORED") {
      throw new Error(
        `authorization reset task ${taskId} errored: ${(task.errors ?? []).join(
          "; "
        )}`
      );
    }
    if (task.status !== "IN_PROGRESS") return;
    if (polls++ % 10 === 0) {
      logger.info?.(
        `[auth-reset] task ${taskId} in progress — ${task.itemsDone ?? "?"}/${
          task.itemsCount ?? "?"
        } items`
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `authorization reset task ${taskId} still IN_PROGRESS after ${timeoutMs} ms — is the auth-reset worker running?`
  );
};

export const ensureAuthorizationPolicies = async (): Promise<void> => {
  const logger = LogManager.getLogger();
  const { mode, timeoutMs } = testConfiguration.authorizationReset;
  if (mode === "off") {
    logger.info?.("[auth-reset] AUTH_POLICY_RESET_ON_SETUP=off — skipped");
    return;
  }

  const adminToken = await getUserToken(HARNESS_ADMIN_EMAIL);
  const before = await probeSpaceRead(adminToken);

  if (mode === "auto" && !before.stale) {
    logger.info?.(
      `[auth-reset] policies current (${before.detail}) — no reset needed`
    );
    return;
  }
  if (!(await canResetPlatform(adminToken))) {
    throw new Error(
      `ENV PREREQUISITE FAILED: authorization policies are stale (${before.detail}) and ` +
        `${HARNESS_ADMIN_EMAIL} lacks ${RESET_PRIVILEGE} on the platform, so the harness cannot reset them — ${MANUAL_RESET_HINT}.`
    );
  }

  logger.info?.(
    mode === "always"
      ? "[auth-reset] AUTH_POLICY_RESET_ON_SETUP=always — resetting all authorization policies"
      : `[auth-reset] stale policies detected (${before.detail}) — resetting all authorization policies`
  );
  const started = Date.now();
  const result = await getGraphqlClient().authorizationPolicyResetAll(
    {},
    { authorization: `Bearer ${adminToken}` }
  );
  const taskId = result.data?.authorizationPolicyResetAll;
  if (result.errors?.length || !taskId) {
    throw new Error(
      `authorizationPolicyResetAll failed: ${JSON.stringify(
        result.errors ?? result.data
      ).slice(0, 300)} — ${MANUAL_RESET_HINT}`
    );
  }
  await waitForTask(adminToken, taskId, timeoutMs);

  // The platform-level resets are emitted outside the task; give them a
  // bounded window to land before declaring the env ready.
  const settleDeadline = Date.now() + SETTLE_TIMEOUT_MS;
  let after = await probeSpaceRead(adminToken);
  while (after.stale && Date.now() < settleDeadline) {
    await sleep(POLL_INTERVAL_MS);
    after = await probeSpaceRead(adminToken);
  }
  if (after.stale) {
    throw new Error(
      `ENV PREREQUISITE FAILED: authorization reset task ${taskId} completed but ${HARNESS_ADMIN_EMAIL} is still denied (${after.detail}). ` +
        "Check that the auth-reset worker image matches the server under test."
    );
  }
  logger.info?.(
    `[auth-reset] done in ${Math.round((Date.now() - started) / 1000)} s — ${
      after.detail
    }`
  );
};
