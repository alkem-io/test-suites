import type { Sdk } from '@alkemio/tests-lib/core/generated/graphql';
import type { CapabilityGroupId, PlatformRole } from '../capabilities.data';

/**
 * Everything the suite knows about the run. Built ONCE in the project-level
 * globalSetup (main process) and handed to every worker through vitest's
 * `provide` / `inject` — so it must stay plain JSON.
 */
export type RunContext = {
  runId: string;
  /** One login per role per RUN — never per file, never per worker. */
  tokens: Record<PlatformRole, string>;
  userIds: Record<PlatformRole, string>;
  /** `admin@alkem.io` — used ONLY as the break-glass Platform Roles Admin. */
  bootstrapToken: string;
  fixtures: Partial<Record<CapabilityGroupId, GroupFixtures>>;
};

export type GroupFixtures = Record<string, unknown>;

/** A per-role target, so two allowed roles never race on one entity. */
export type PerRole<T = string> = Partial<Record<PlatformRole, T>>;

export type Headers = { authorization: string };

export type Invocation<F extends GroupFixtures = GroupFixtures> = {
  /**
   * Where the authorization gate sits in the response path — `['deleteSpace']`
   * for a mutation, `['platform','roleSet','usersInRole']` for a nested field.
   * Only an authorization error AT or ABOVE this path counts as "denied".
   */
  gate: readonly string[];
  /** Exactly ONE API call, with a minimal `{ id }`-style selection. */
  call: (
    sdk: Sdk,
    headers: Headers,
    fx: F,
    role: PlatformRole
  ) => Promise<{ data: unknown }>;
  /**
   * What a passing POSITIVE must observe beyond "no error" — see
   * `Capability.verifies`. Asserts with `expect`; runs only after `ok`.
   * Reads go through `reader` (Platform Content Full Access: cascaded READ,
   * valid at Slice A and B) unless the group needs a specific reader.
   */
  verify?: (args: {
    ctx: RunContext;
    fx: F;
    role: PlatformRole;
    data: unknown;
    sdk: Sdk;
    reader: Headers;
    /**
     * Who actually made the call. Usually the role user — but a spec may run an
     * invocation as someone else holding the role (grantability does, with a
     * freshly granted subject), so cleanup that must act AS the caller uses this.
     */
    caller: { token: string; id: string };
  }) => Promise<void>;
  /**
   * `reached-resolver` capabilities only: the NON-authorization error that
   * proves the gate was passed when an external dependency is absent.
   */
  acceptFailure?: RegExp;
};

export type GroupModule<F extends GroupFixtures = GroupFixtures> = {
  group: CapabilityGroupId;
  /** Runs in globalSetup, once per run. Returns plain JSON. */
  build: (ctx: Omit<RunContext, 'fixtures'>, sdk: Sdk) => Promise<F>;
  /** Best-effort; every failure is REPORTED, none is swallowed silently. */
  teardown: (
    ctx: Omit<RunContext, 'fixtures'>,
    sdk: Sdk,
    fx: F
  ) => Promise<void>;
  /** Keyed by `Capability.id`. */
  invocations: Record<string, Invocation<F>>;
};

export const bearer = (token: string): Headers => ({
  authorization: `Bearer ${token}`,
});

declare module 'vitest' {
  export interface ProvidedContext {
    platformRoles: RunContext;
  }
}
