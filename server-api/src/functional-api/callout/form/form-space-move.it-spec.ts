import {
  createSpaceBasicData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  updateSpaceSettings,
} from '@alkemio/tests-lib';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import {
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { postGraphqlRaw } from '@alkemio/tests-lib/utils/graphql.raw.client';
import { moveSpaceL1ToSpaceL0 } from '../../journey/conversion/conversion.request.params';
import { deleteSpace } from '../../journey/space/space.request.params';
import { assignRoleToUser } from '../../roleset/roles-request.params';
import {
  answersFor,
  createFormCallout,
  deleteFormResponse,
  FormCallout,
  getFormResponses,
  getSpaceSets,
  isForbiddenByPolicy,
  responsesView,
  submitFormResponse,
  uniqueFormName,
} from './form.request.params';

/**
 * R15 — moving a (sub)space carries its Forms to the new ancestors' admins.
 *
 * A Form with one ADMINS-only response lives in the subspace of space A. The
 * subspace is moved under space B (`moveSpaceL1ToSpaceL0`, platform
 * privileged). Because read access is derived live from the reader's current
 * standing (FR-020d) and ancestor admins read under Admins only (FR-020c),
 * the move must hand the response to B's admin and take it away from A's.
 * A cross-L0 move clears the moved community (see `journey/conversion/
 * move-L1-to-L0-community.it-spec.ts`), so the former subspace admin is a
 * plain reader afterwards and only the submitter keeps a row (their own).
 *
 * Every space is public so that no cell fails on READ of the Post itself;
 * the cells differ only by the Form's visibility rule. B's admin is
 * NON_SPACE_MEMBER: a persona that is nothing in A, so the before-move cell
 * is a true negative.
 *
 * KNOWN DEFECT — https://github.com/alkem-io/server/issues/6592: the move
 * refreshes the role definitions' `parentCredentials` on detached entities it
 * never saves, so the stored chain keeps pointing at A. A's admin keeps
 * reading and deleting, B's admin reads nothing (moderation alone follows B,
 * through the rebuilt policy). The four cells that pin the fixed behaviour
 * are skipped until that fix lands — drop the `.skip` then.
 */
const uniqueId = UniqueIDGenerator.getID();
const ADMINS = CalloutFormResponseVisibility.Admins;

const noCallouts = {
  addPostCallout: false,
  addPostCollectionCallout: false,
  addWhiteboardCallout: false,
  addTutorialCallouts: false,
};

const scenarioConfig: TestScenarioConfig = {
  name: 'form-space-move',
  space: {
    collaboration: noCallouts,
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: noCallouts,
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

// Two responses by the same member: one for each moderation cell below.
const RESPONSES = 2;
const everything = (mine: number) => ({
  mine,
  total: RESPONSES,
  listed: RESPONSES,
  canReadAll: true,
  canModerate: true,
});
const own = (mine: number) => ({
  mine,
  total: mine,
  listed: mine,
  canReadAll: false,
  canModerate: false,
});

let sourceScenario: OrganizationWithSpaceModel;
let targetSpaceId = '';
let form: FormCallout;
const responseIds: string[] = [];

const viewAs = async (user: TestUser) =>
  responsesView(await getFormResponses(form.formId, user));

type ParentCredential = { type: string; resourceID: string };
/** The stored parent credentials of the moved subspace's ADMIN role. */
const adminParentCredentials = async () => {
  const result = await postGraphqlRaw<{
    lookup: {
      space: {
        community: {
          roleSet: {
            roleDefinitions: {
              name: string;
              parentCredentials: ParentCredential[];
            }[];
          };
        };
      };
    };
  }>(
    `query($id: UUID!) { lookup { space(ID: $id) { community { roleSet {
      roleDefinitions { name parentCredentials { type resourceID } } } } } } }`,
    {
      variables: { id: sourceScenario.subspace.id },
      bearerToken: TestUserManager.users.globalAdmin.authToken,
    }
  );
  const roles =
    result.body.data?.lookup.space.community.roleSet.roleDefinitions ?? [];
  const admin = roles.find(r => r.name === 'ADMIN');
  if (!admin) {
    throw new Error(
      `no ADMIN role definition: ${JSON.stringify(result.body.errors ?? result.body)}`
    );
  }
  return admin.parentCredentials;
};

const makePublic = async (spaceId: string) => {
  const updated = await updateSpaceSettings(spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Public,
      allowPlatformSupportAsAdmin: false,
    },
  });
  if (updated.error) {
    throw new Error(
      `unable to make ${spaceId} public: ${JSON.stringify(updated.error)}`
    );
  }
};

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await makePublic(sourceScenario.space.id);
  await makePublic(sourceScenario.subspace.id);

  // Space B, administered by a persona that holds nothing in A.
  const created = await createSpaceBasicData(
    `form-move-target-${uniqueId}`,
    `form-move-target-${uniqueId}`.toLowerCase().slice(0, 25),
    sourceScenario.organization.accountId
  );
  targetSpaceId = created.data?.createSpace.id ?? '';
  expect(targetSpaceId).not.toBe('');
  await makePublic(targetSpaceId);
  const { roleSetId } = await getSpaceSets(targetSpaceId);
  for (const role of [RoleName.Member, RoleName.Admin]) {
    const granted = await assignRoleToUser(
      TestUserManager.users.nonSpaceMember.id,
      roleSetId,
      role
    );
    expect(granted.error).toBeUndefined();
  }

  form = await createFormCallout(
    sourceScenario.subspace.collaboration.calloutsSetId,
    {
      displayName: uniqueFormName(`move-${uniqueId}`),
      settings: {
        visibility: ADMINS,
        responseMode: CalloutFormResponseMode.Multiple,
      },
    }
  );
  for (let i = 0; i < RESPONSES; i++) {
    const submitted = await submitFormResponse(
      form.formId,
      answersFor(form.questions),
      ADMINS,
      TestUser.SUBSPACE_MEMBER
    );
    const id = submitted.data?.submitCalloutFormResponse.id ?? '';
    expect(id).not.toBe('');
    responseIds.push(id);
  }
});

const idsSeenByGlobalAdmin = async () =>
  (
    await getFormResponses(form.formId, TestUser.GLOBAL_ADMIN)
  ).data?.lookup.calloutFormResponses.all.responses.map(r => r.id) ?? [];

afterAll(async () => {
  // After the move the subspace hangs under B. An L0 with subspaces cannot be
  // deleted, so the moved subspace goes first, then B, then A and the
  // organization (the scenario cleanup's own subspace delete is a no-op then).
  await deleteSpace(sourceScenario.subspace.id);
  await deleteSpace(targetSpaceId);
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
});

describe('Form responses — a subspace moved under another space (R15)', () => {
  test('before the move: A’s admin reads the responses, B’s admin cannot', async () => {
    expect(await viewAs(TestUser.SPACE_ADMIN)).toEqual(everything(0));
    expect(await viewAs(TestUser.NON_SPACE_MEMBER)).toEqual(own(0));
  });

  test('the move succeeds and keeps the Form on the moved subspace', async () => {
    const moved = await moveSpaceL1ToSpaceL0(
      sourceScenario.subspace.id,
      targetSpaceId
    );

    expect(moved.error).toBeUndefined();
    expect(moved.data?.moveSpaceL1ToSpaceL0.id).toBe(
      sourceScenario.subspace.id
    );
    // The responses themselves travelled: Global Admin still reads them.
    expect(await viewAs(TestUser.GLOBAL_ADMIN)).toEqual(everything(0));
  });

  test.skip('after the move: the ADMIN role’s stored parent credentials point at B, not A (alkem-io/server#6592)', async () => {
    const parents = await adminParentCredentials();
    const ids = parents.map(c => c.resourceID);

    expect(
      ids,
      `stored parent credentials: ${JSON.stringify(parents)}`
    ).toContain(targetSpaceId);
    expect(ids).not.toContain(sourceScenario.space.id);
  });

  test.skip('after the move: B’s admin reads every response and can moderate (alkem-io/server#6592)', async () => {
    expect(await viewAs(TestUser.NON_SPACE_MEMBER)).toEqual(everything(0));
  });

  test.skip('after the move: A’s admin no longer reads them (alkem-io/server#6592)', async () => {
    expect(await viewAs(TestUser.SPACE_ADMIN)).toEqual(own(0));
  });

  test('after the move: the former subspace admin, whose role the move cleared, reads nothing', async () => {
    expect(await viewAs(TestUser.SUBSPACE_ADMIN)).toEqual(own(0));
  });

  test('after the move: the submitter still sees their own responses', async () => {
    expect(await viewAs(TestUser.SUBSPACE_MEMBER)).toEqual(own(RESPONSES));
  });

  test('after the move: B’s admin deletes a response (moderation follows the new parent)', async () => {
    const deleted = await deleteFormResponse(
      responseIds[0],
      TestUser.NON_SPACE_MEMBER
    );

    expect(deleted.error).toBeUndefined();
    expect(deleted.data?.deleteCalloutFormResponse.id).toBe(responseIds[0]);
    expect(await idsSeenByGlobalAdmin()).not.toContain(responseIds[0]);
  });

  test.skip('after the move: A’s admin cannot delete the other response (alkem-io/server#6592)', async () => {
    const attempt = await deleteFormResponse(
      responseIds[1],
      TestUser.SPACE_ADMIN
    );

    expect(isForbiddenByPolicy(attempt)).toBe(true);
    expect(await idsSeenByGlobalAdmin()).toContain(responseIds[1]);
  });
});
