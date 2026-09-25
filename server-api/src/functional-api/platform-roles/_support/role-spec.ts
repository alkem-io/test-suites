import { expect, inject, test } from 'vitest';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { capabilitiesFor } from '../capabilities.data';
import type { Capability, PlatformRole } from '../capabilities.data';
import { invocationFor } from './groups';
import { classify, describeOutcome } from './outcome';
import type { Outcome } from './outcome';
import { bearer } from './types';
import type { GroupFixtures, Invocation, RunContext } from './types';

/**
 * The two assertions every `roles/<role>.it-spec.ts` is made of:
 *
 *   expectRefused(role, capability)   the call is DENIED at the authorization gate
 *   expectAllowed(role, capability)   the call succeeds AND what it must visibly
 *                                     change is read back (`Capability.verifies`)
 *
 * Each registers exactly one test, named after the capability id. A capability
 * that should run but has no invocation yet registers a `todo` instead —
 * unfinished work stays visible in the report rather than vanishing.
 */

type Half = 'positive' | 'negative';

/**
 * Which rows this project runs. `exclusive` rows belong to the on-demand
 * project and `not-automated` ones to nobody — except `environment` rows, which
 * run as soon as their group registers an invocation (today: the MCP tool, once
 * the endpoint is detected).
 */
const runsHere = (c: Capability, half: Half): boolean =>
  c[half].status === 'planned' ||
  c[half].status === 'automated' ||
  (c[half].belongs === 'environment' && invocationFor(c.id) !== undefined);

/** A role's view of the capability table, limited to what this project runs. */
export const runnableFor = (
  role: PlatformRole
): { can: Capability[]; cannot: Capability[] } => {
  const { can, cannot } = capabilitiesFor(role);
  return {
    can: can.filter(c => runsHere(c, 'positive')),
    cannot: cannot.filter(c => runsHere(c, 'negative')),
  };
};

type Call = {
  ctx: RunContext;
  fx: GroupFixtures;
  invocation: Invocation;
  outcome: Outcome;
};

/** ONE API call as the role's own single-role user, judged by `classify`. */
const callAs = async (
  role: PlatformRole,
  capability: Capability
): Promise<Call> => {
  const found = invocationFor(capability.id);
  if (!found) throw new Error(`no invocation for ${capability.id}`);
  const ctx = inject('platformRoles');
  const fx = ctx.fixtures[found.group.group] as GroupFixtures;
  const outcome = await classify(found.invocation.gate, () =>
    found.invocation.call(
      getGraphqlClient(),
      bearer(ctx.tokens[role]),
      fx,
      role
    )
  );
  return { ctx, fx, invocation: found.invocation, outcome };
};

const register = (capability: Capability, body: () => Promise<void>): void => {
  if (invocationFor(capability.id)) test(capability.id, body);
  else test.todo(capability.id);
};

/** NEGATIVE — refused at the gate. Changes no state, so it is safe anywhere. */
export const expectRefused = (
  role: PlatformRole,
  capability: Capability
): void =>
  register(capability, async () => {
    const { outcome } = await callAs(role, capability);
    expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
  });

/** POSITIVE — allowed, and the declared effect is observed. */
export const expectAllowed = (
  role: PlatformRole,
  capability: Capability
): void =>
  register(capability, async () => {
    const { ctx, fx, invocation, outcome } = await callAs(role, capability);

    // An external dependency is absent on test stacks: the oracle is a specific
    // NON-authorization error, which proves the gate was passed.
    if (
      capability.verifies?.kind === 'reached-resolver' &&
      outcome.kind === 'failed'
    ) {
      expect(
        invocation.acceptFailure,
        `${capability.id} is declared reached-resolver but defines no acceptFailure`
      ).toBeDefined();
      expect(outcome.reason).toMatch(invocation.acceptFailure as RegExp);
      return;
    }

    expect(outcome.kind, describeOutcome(outcome)).toBe('ok');
    if (outcome.kind === 'ok' && invocation.verify) {
      await invocation.verify({
        ctx,
        fx,
        role,
        data: outcome.data,
        sdk: getGraphqlClient(),
        reader: bearer(ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS),
        caller: { token: ctx.tokens[role], id: ctx.userIds[role] },
      });
    }
  });
