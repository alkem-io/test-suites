import { expect } from 'vitest';
import { TemplateType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import { rawRead } from '../raw-request';
import type { GroupModule, Headers, PerRole } from '../types';
import {
  createCallout,
  createHubAsLegacyAdmin,
  createOwnedOrganization,
  createPack,
  createSpace,
  organizationAdminOf,
  removeOwnedOrganization,
} from './organization-content';

/**
 * A7 — edit an organization-owned innovation pack / hub and the templates in it.
 *   Platform Support (owner) and Platform Content Full Access (SC-004 exception).
 *
 * One pack + hub + template set PER ALLOWED ROLE, plus a third that only
 * negatives aim at. Every target lives in an ORGANIZATION's account: Support's
 * privilege does not exist on a user-hosted account.
 */
type Targets = {
  packId: string;
  templatesSetId: string;
  hubId: string;
  postTemplateId: string;
  deletableTemplateId: string;
  spaceTemplateId: string;
  /** The callout INSIDE a callout template — `updateCallout` lets Support
   * through for a template callout only, never for a space callout. */
  templateCalloutId: string;
};

type A7 = {
  runId: string;
  organizationId: string;
  /** Small, PUBLIC (both template-from-space gates also need READ on it). */
  sourceSpaceId: string;
  /** Added to the source space AFTER the space templates were cut from it. */
  sourceMarker: string;
  /** Source of `createTemplateFromContentSpace`; read-only, shared. */
  contentSpaceId: string;
  perRole: PerRole<Targets>;
  deny: Targets;
};

const ALLOWED = allowedRoles(
  CAPABILITIES.find(c => c.id === 'A7.updateInnovationPack')!
);

const targetsOf = (fx: A7, role: PlatformRole): Targets =>
  fx.perRole[role] ?? fx.deny;

const valueOf = (fx: A7, role: PlatformRole): string =>
  `a7 ${role} ${fx.runId}`;

const newProfile = (fx: A7, role: PlatformRole, kind: string) => ({
  displayName: `a7 ${kind} ${role.slice(-6)} ${fx.runId}`,
});

const TEMPLATE =
  'mutation($data: CreateTemplateOnTemplatesSetInput!) { createTemplate(templateData: $data) { id callout { id } } }';
const TEMPLATE_FROM_SPACE =
  'mutation($data: CreateTemplateFromSpaceOnTemplatesSetInput!) { createTemplateFromSpace(templateData: $data) { id contentSpace { id } } }';

const LISTED =
  'query($id: UUID!) { lookup { innovationPack(ID: $id) { templatesSet { templates { id } } } } }';
const listedTemplates = async (
  reader: Headers,
  packId: string
): Promise<string[]> =>
  (
    await rawRead<{
      lookup: {
        innovationPack: { templatesSet: { templates: { id: string }[] } };
      };
    }>(tokenOf(reader), LISTED, { id: packId })
  ).lookup.innovationPack.templatesSet.templates.map(t => t.id);

const tokenOf = (headers: Headers): string =>
  headers.authorization.replace(/^Bearer /, '');

const createdId = (data: unknown, field: string): string =>
  (data as Record<string, { id: string }>)[field].id;

export const A7_GROUP: GroupModule<A7> = {
  group: 'A7',

  build: async ctx => {
    const admin = (await organizationAdminOf()).token;
    const { organizationId, accountId } = await createOwnedOrganization(
      ctx,
      'a7'
    );

    const source = await createSpace(accountId, `pr-a7-src-${ctx.runId}`);
    await rawRead(
      admin,
      'mutation($data: UpdateSpaceSettingsInput!) { updateSpaceSettings(settingsData: $data) { id } }',
      {
        data: {
          spaceID: source.spaceId,
          settings: { privacy: { mode: 'PUBLIC' } },
        },
      }
    );

    const targets = async (
      tag: string
    ): Promise<{ own: Targets; contentSpaceId: string }> => {
      const name = `pr-a7-${tag}-${ctx.runId}`;
      const pack = await createPack(accountId, name);
      const template = async (type: TemplateType, extra: object) =>
        (
          await rawRead<{
            createTemplate: { id: string; callout: { id: string } | null };
          }>(admin, TEMPLATE, {
            data: {
              templatesSetID: pack.templatesSetId,
              type,
              profileData: { displayName: `${name} ${type}` },
              ...extra,
            },
          })
        ).createTemplate;

      const post = { postDefaultDescription: 'as built' };
      const callout = await template(TemplateType.Callout, {
        calloutData: {
          framing: { profile: { displayName: `${name} callout` } },
        },
      });
      if (!callout.callout) {
        throw new Error(`A7: the ${tag} callout template has no callout`);
      }
      const fromSpace = (
        await rawRead<{
          createTemplateFromSpace: { id: string; contentSpace: { id: string } };
        }>(admin, TEMPLATE_FROM_SPACE, {
          data: {
            templatesSetID: pack.templatesSetId,
            spaceID: source.spaceId,
            profileData: { displayName: `${name} SPACE` },
          },
        })
      ).createTemplateFromSpace;

      return {
        own: {
          ...pack,
          hubId: await createHubAsLegacyAdmin(ctx, accountId, name),
          postTemplateId: (await template(TemplateType.Post, post)).id,
          deletableTemplateId: (await template(TemplateType.Post, post)).id,
          spaceTemplateId: fromSpace.id,
          templateCalloutId: callout.callout.id,
        },
        contentSpaceId: fromSpace.contentSpace.id,
      };
    };

    const perRole: PerRole<Targets> = {};
    for (const role of ALLOWED) {
      perRole[role] = (await targets(role.slice(-6))).own;
    }
    const { own: deny, contentSpaceId } = await targets('deny');

    // Only now: every space template above was cut WITHOUT this callout, so
    // finding it in one afterwards is the effect of `updateTemplateFromSpace`.
    const sourceMarker = `a7 source marker ${ctx.runId}`;
    await createCallout(source.calloutsSetId, sourceMarker);

    return {
      runId: ctx.runId,
      organizationId,
      sourceSpaceId: source.spaceId,
      sourceMarker,
      contentSpaceId,
      perRole,
      deny,
    };
  },

  // Deleting a pack takes its templates with it — including every template the
  // create-positives added.
  teardown: async (ctx, _sdk, fx) => {
    const all = [fx.deny, ...Object.values(fx.perRole)];
    await removeOwnedOrganization(ctx, fx.organizationId, {
      packs: all.map(t => t.packId),
      hubs: all.map(t => t.hubId),
      spaces: [fx.sourceSpaceId],
    });
  },

  invocations: {
    'A7.updateInnovationPack': {
      gate: ['updateInnovationPack'],
      call: (sdk, headers, fx, role) =>
        sdk.updateInnovationPack(
          {
            innovationPackData: {
              ID: targetsOf(fx, role).packId,
              profileData: { displayName: valueOf(fx, role) },
            },
          },
          headers
        ),
      verify: async ({ fx, role, reader }) => {
        const { lookup } = await rawRead<{
          lookup: { innovationPack: { profile: { displayName: string } } };
        }>(
          tokenOf(reader),
          'query($id: UUID!) { lookup { innovationPack(ID: $id) { profile { displayName } } } }',
          { id: targetsOf(fx, role).packId }
        );
        expect(lookup.innovationPack.profile.displayName).toBe(
          valueOf(fx, role)
        );
      },
    },
    'A7.updateInnovationHub': {
      gate: ['updateInnovationHub'],
      call: (sdk, headers, fx, role) =>
        sdk.updateInnovationHub(
          {
            updateData: {
              ID: targetsOf(fx, role).hubId,
              profileData: { displayName: valueOf(fx, role) },
            },
          },
          headers
        ),
      verify: async ({ fx, role, reader }) => {
        const { platform } = await rawRead<{
          platform: { innovationHub: { profile: { displayName: string } } };
        }>(
          tokenOf(reader),
          'query($id: UUID!) { platform { innovationHub(id: $id) { profile { displayName } } } }',
          { id: targetsOf(fx, role).hubId }
        );
        expect(platform.innovationHub.profile.displayName).toBe(
          valueOf(fx, role)
        );
      },
    },
    'A7.createTemplate': {
      gate: ['createTemplate'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesCreateTemplate(
          {
            templateData: {
              templatesSetID: targetsOf(fx, role).templatesSetId,
              type: TemplateType.Post,
              profileData: newProfile(fx, role, 'post'),
              postDefaultDescription: 'created by the role',
            },
          },
          headers
        ),
      verify: async ({ fx, role, data, reader }) =>
        expect(
          await listedTemplates(reader, targetsOf(fx, role).packId)
        ).toContain(createdId(data, 'createTemplate')),
    },
    'A7.createTemplateFromSpace': {
      gate: ['createTemplateFromSpace'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesCreateTemplateFromSpace(
          {
            templateData: {
              templatesSetID: targetsOf(fx, role).templatesSetId,
              spaceID: fx.sourceSpaceId,
              profileData: newProfile(fx, role, 'from space'),
            },
          },
          headers
        ),
      verify: async ({ fx, role, data, reader }) =>
        expect(
          await listedTemplates(reader, targetsOf(fx, role).packId)
        ).toContain(createdId(data, 'createTemplateFromSpace')),
    },
    'A7.createTemplateFromContentSpace': {
      gate: ['createTemplateFromContentSpace'],
      call: (sdk, headers, fx, role) =>
        sdk.createTemplateFromContentSpace(
          {
            templateData: {
              templatesSetID: targetsOf(fx, role).templatesSetId,
              contentSpaceID: fx.contentSpaceId,
              profileData: newProfile(fx, role, 'from content'),
            },
          },
          headers
        ),
      verify: async ({ fx, role, data, reader }) =>
        expect(
          await listedTemplates(reader, targetsOf(fx, role).packId)
        ).toContain(createdId(data, 'createTemplateFromContentSpace')),
    },
    'A7.updateTemplate': {
      gate: ['updateTemplate'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesUpdateTemplate(
          {
            updateData: {
              ID: targetsOf(fx, role).postTemplateId,
              postDefaultDescription: valueOf(fx, role),
            },
          },
          headers
        ),
      verify: async ({ fx, role, reader }) => {
        const { lookup } = await rawRead<{
          lookup: { template: { postDefaultDescription: string } };
        }>(
          tokenOf(reader),
          'query($id: UUID!) { lookup { template(ID: $id) { postDefaultDescription } } }',
          { id: targetsOf(fx, role).postTemplateId }
        );
        expect(lookup.template.postDefaultDescription).toBe(valueOf(fx, role));
      },
    },
    'A7.updateTemplateFromSpace': {
      gate: ['updateTemplateFromSpace'],
      call: (sdk, headers, fx, role) =>
        sdk.updateTemplateFromSpace(
          {
            updateData: {
              templateID: targetsOf(fx, role).spaceTemplateId,
              spaceID: fx.sourceSpaceId,
            },
          },
          headers
        ),
      verify: async ({ fx, role, reader }) => {
        const { lookup } = await rawRead<{
          lookup: {
            template: {
              contentSpace: {
                collaboration: {
                  calloutsSet: {
                    callouts: {
                      framing: { profile: { displayName: string } };
                    }[];
                  };
                };
              };
            };
          };
        }>(
          tokenOf(reader),
          'query($id: UUID!) { lookup { template(ID: $id) { contentSpace { collaboration { calloutsSet { callouts { framing { profile { displayName } } } } } } } } }',
          { id: targetsOf(fx, role).spaceTemplateId }
        );
        expect(
          lookup.template.contentSpace.collaboration.calloutsSet.callouts.map(
            c => c.framing.profile.displayName
          )
        ).toContain(fx.sourceMarker);
      },
    },
    'A7.deleteTemplate': {
      gate: ['deleteTemplate'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteTemplate(
          { templateId: targetsOf(fx, role).deletableTemplateId },
          headers
        ),
      verify: async ({ fx, role, reader }) =>
        expect(
          await listedTemplates(reader, targetsOf(fx, role).packId)
        ).not.toContain(targetsOf(fx, role).deletableTemplateId),
    },
    'A7.updateCallout': {
      gate: ['updateCallout'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesUpdateCallout(
          {
            calloutData: {
              ID: targetsOf(fx, role).templateCalloutId,
              framing: { profile: { displayName: valueOf(fx, role) } },
            },
          },
          headers
        ),
      verify: async ({ fx, role, reader }) => {
        const { lookup } = await rawRead<{
          lookup: {
            callout: { framing: { profile: { displayName: string } } };
          };
        }>(
          tokenOf(reader),
          'query($id: UUID!) { lookup { callout(ID: $id) { framing { profile { displayName } } } } }',
          { id: targetsOf(fx, role).templateCalloutId }
        );
        expect(lookup.callout.framing.profile.displayName).toBe(
          valueOf(fx, role)
        );
      },
    },
  },
};
