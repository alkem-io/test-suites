import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
const uniqueId = UniqueIDGenerator.getID();
import {
  createInnovationPack,
  deleteInnovationPack,
} from './innovation_pack.request.params';
import {
  whiteboardTemplateValues1,
  whiteboardTemplateValues2,
  whiteboardTemplateValues3,
  whiteboardTemplateValues4,
  whiteboardTemplateValues5,
  whiteboardTemplateValues6,
} from './whiteboard-values-fixed';
import { createWhiteboardTemplate } from '@functional-api/templates/whiteboard/whiteboard-templates.request.params';
import { authorizationPolicyResetOnPlatform } from '@functional-api/platform/authorization-platform-mutation';

describe('Organization', () => {
  const organizationName = 'Organization with many whiteboardes' + uniqueId;
  const hostNameId = 'org-whiteboardes' + uniqueId;
  const packName = `Default Innovation Pack Name ${uniqueId}`;
  const packNameId = `pack-nameid-${uniqueId}`;
  let orgId = '';
  let packId = '';
  beforeAll(async () => {
    await authorizationPolicyResetOnPlatform();

    const res = await createOrganization(organizationName, hostNameId);
    orgId = res?.data?.createOrganization.id ?? '';
  });
  afterAll(async () => {
    // Both deletes are attempted independently and neither is allowed to
    // throw out of the hook — a teardown failure must not turn into a test
    // failure. But it must not be invisible either: `deleteOrganization` /
    // `deleteInnovationPack` go through `graphqlErrorWrapper`, which RESOLVES
    // with `{ error: { errors } }` rather than rejecting, so a plain
    // `.catch(() => {})` swallows nothing and reports nothing. Inspect the
    // resolved result and warn, so a leaked org/pack shows up in the run log
    // instead of quietly accumulating on the shared test stack night after
    // night — which is the whole point of this hook existing.
    const reportIfFailed = (
      what: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: { error?: { errors?: any[] } } | undefined
    ) => {
      const errors = result?.error?.errors;
      if (errors && errors.length > 0) {
        console.warn(
          `[teardown] innovation-pack.it-spec: failed to delete ${what} — leaked: ${JSON.stringify(errors)}`
        );
      }
    };

    if (packId) {
      reportIfFailed(
        `InnovationPack ${packId}`,
        await deleteInnovationPack(packId).catch(e => {
          console.warn(
            `[teardown] innovation-pack.it-spec: deleting InnovationPack ${packId} threw — leaked: ${e}`
          );
          return undefined;
        })
      );
    }
    // Guarded: an empty `orgId` means `beforeAll`'s createOrganization never
    // returned one, so there is nothing to delete and the call would only
    // spend a round trip to be told so.
    if (orgId) {
      reportIfFailed(
        `Organization ${orgId}`,
        await deleteOrganization(orgId).catch(e => {
          console.warn(
            `[teardown] innovation-pack.it-spec: deleting Organization ${orgId} threw — leaked: ${e}`
          );
          return undefined;
        })
      );
    }
  });

  describe('Innovation pack library', () => {
    test('Create', async () => {
      const packData = await createInnovationPack(
        packName,
        packNameId,
        orgId
      );
      packId = packData?.data?.createInnovationPack?.id ?? '';
      const templateSetId =
        packData?.data?.createInnovationPack?.templatesSet?.id ?? '';

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues1
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues2
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues3
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues4
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues5
      );

      await createWhiteboardTemplate(
        templateSetId,
        whiteboardTemplateValues6
      );

      expect(200).toBe(200);
    });
  });
});
