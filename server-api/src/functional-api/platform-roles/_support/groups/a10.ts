import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { VirtualContributorWellKnown } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { rawRead } from '../raw-request';
import type { Sdk } from '@alkemio/tests-lib/core/generated/graphql';
import type { GroupModule, RunContext } from '../types';

/**
 * A10 — platform settings & configuration. Owner: Platform Settings Admin.
 *
 * Every write uses a per-RUN unique value, so a positive can prove its own
 * effect on the singleton settings object without caring what else is in it,
 * and a re-run never collides with a previous run's leftovers.
 */
type A10 = {
  iframeUrl: string;
  blacklistEmail: string;
  /** Snapshot, so the singleton mapping is put back exactly as found. */
  chatGuidanceVcId: string | null;
  /** What the positive maps CHAT_GUIDANCE to for an instant; the server does not resolve it. */
  probeVcId: string;
};

const SETTINGS =
  'query { platform { settings { integration { iframeAllowedUrls notificationEmailBlacklist } } } }';
const WELL_KNOWN =
  'query { platform { wellKnownVirtualContributors { mappings { wellKnown virtualContributorID } } } }';

type SettingsRead = {
  platform: {
    settings: {
      integration: {
        iframeAllowedUrls: string[];
        notificationEmailBlacklist: string[];
      };
    };
  };
};
type WellKnownRead = {
  platform: {
    wellKnownVirtualContributors: {
      mappings: { wellKnown: string; virtualContributorID: string }[];
    };
  };
};

const integration = async (token: string) =>
  (await rawRead<SettingsRead>(token, SETTINGS)).platform.settings.integration;

const chatGuidance = async (token: string): Promise<string | null> =>
  (
    await rawRead<WellKnownRead>(token, WELL_KNOWN)
  ).platform.wellKnownVirtualContributors.mappings.find(
    m => m.wellKnown === VirtualContributorWellKnown.ChatGuidance
  )?.virtualContributorID ?? null;

const readerToken = (ctx: RunContext | Omit<RunContext, 'fixtures'>): string =>
  ctx.tokens.PLATFORM_SETTINGS_ADMIN;

export const A10_GROUP: GroupModule<A10> = {
  group: 'A10',

  build: async ctx => ({
    iframeUrl: `https://platform-roles-${ctx.runId}.example.org`,
    blacklistEmail: `platform-roles-${ctx.runId}@example.org`,
    chatGuidanceVcId: await chatGuidance(readerToken(ctx)),
    probeVcId: randomUUID(),
  }),

  // The add/remove positives are paired and leave nothing behind when they pass;
  // this only matters when one of them failed half-way.
  teardown: async (ctx, sdk, fx) => {
    const headers = { authorization: `Bearer ${readerToken(ctx)}` };
    const current = await integration(readerToken(ctx));
    if (current.iframeAllowedUrls.includes(fx.iframeUrl)) {
      await sdk.removeIframeAllowedURL(
        { whitelistedURL: fx.iframeUrl },
        headers
      );
    }
    if (current.notificationEmailBlacklist.includes(fx.blacklistEmail)) {
      await sdk.removeNotificationEmailFromBlacklist(
        { input: { email: fx.blacklistEmail } },
        headers
      );
    }
    if ((await chatGuidance(readerToken(ctx))) !== fx.chatGuidanceVcId) {
      await restoreChatGuidance(sdk, readerToken(ctx), fx);
    }
  },

  invocations: {
    'A10.updatePlatformSettings': {
      gate: ['updatePlatformSettings'],
      // An empty patch still passes through the gate and the merge; the value
      // read back must be unchanged — the effect of "update nothing".
      call: (sdk, headers) =>
        sdk.updatePlatformSettings({ settingsData: {} }, headers),
      verify: async ({ ctx, data }) => {
        const returned = (
          data as {
            updatePlatformSettings: {
              integration: { iframeAllowedUrls: string[] };
            };
          }
        ).updatePlatformSettings.integration.iframeAllowedUrls;
        expect(returned).toEqual(
          (await integration(readerToken(ctx))).iframeAllowedUrls
        );
      },
    },
    'A10.addIframeAllowedURL': {
      gate: ['addIframeAllowedURL'],
      call: (sdk, headers, fx) =>
        sdk.addIframeAllowedURL({ whitelistedURL: fx.iframeUrl }, headers),
      verify: async ({ ctx, fx }) =>
        expect(
          (await integration(readerToken(ctx))).iframeAllowedUrls
        ).toContain(fx.iframeUrl),
    },
    'A10.removeIframeAllowedURL': {
      gate: ['removeIframeAllowedURL'],
      call: (sdk, headers, fx) =>
        sdk.removeIframeAllowedURL({ whitelistedURL: fx.iframeUrl }, headers),
      verify: async ({ ctx, fx }) =>
        expect(
          (await integration(readerToken(ctx))).iframeAllowedUrls
        ).not.toContain(fx.iframeUrl),
    },
    'A10.addNotificationEmailToBlacklist': {
      gate: ['addNotificationEmailToBlacklist'],
      call: (sdk, headers, fx) =>
        sdk.addNotificationEmailToBlacklist(
          { input: { email: fx.blacklistEmail } },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (await integration(readerToken(ctx))).notificationEmailBlacklist
        ).toContain(fx.blacklistEmail),
    },
    'A10.removeNotificationEmailFromBlacklist': {
      gate: ['removeNotificationEmailFromBlacklist'],
      call: (sdk, headers, fx) =>
        sdk.removeNotificationEmailFromBlacklist(
          { input: { email: fx.blacklistEmail } },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (await integration(readerToken(ctx))).notificationEmailBlacklist
        ).not.toContain(fx.blacklistEmail),
    },
    'A10.setPlatformWellKnownVirtualContributor': {
      gate: ['setPlatformWellKnownVirtualContributor'],
      call: (sdk, headers, fx) =>
        sdk.setPlatformWellKnownVirtualContributor(
          {
            mappingData: {
              wellKnown: VirtualContributorWellKnown.ChatGuidance,
              virtualContributorID: fx.probeVcId,
            },
          },
          headers
        ),
      // Restored right here, not at teardown: the mapping is platform-wide, so
      // it must point away from the real guidance VC for as short as possible.
      verify: async ({ ctx, fx, sdk }) => {
        const observed = await chatGuidance(readerToken(ctx));
        await restoreChatGuidance(sdk, readerToken(ctx), fx);
        expect(observed).toBe(fx.probeVcId);
        expect(await chatGuidance(readerToken(ctx))).toBe(fx.chatGuidanceVcId);
      },
    },
  },
};

/** There is no "unset": a mapping that did not exist before cannot be put back. */
const restoreChatGuidance = async (sdk: Sdk, token: string, fx: A10) => {
  if (fx.chatGuidanceVcId === null) {
    throw new Error(
      `A10: CHAT_GUIDANCE had no mapping before the run and now points at ${fx.probeVcId} — the API offers no way to remove it`
    );
  }
  await sdk.setPlatformWellKnownVirtualContributor(
    {
      mappingData: {
        wellKnown: VirtualContributorWellKnown.ChatGuidance,
        virtualContributorID: fx.chatGuidanceVcId,
      },
    },
    { authorization: `Bearer ${token}` }
  );
};
