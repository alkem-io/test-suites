import {
  createSpaceBasicData,
  createTemplateOnTemplatesSet,
  createVirtualContributor,
  deleteVirtualContributor,
  getGraphqlClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  AiPersonaEngine,
  CalloutFramingType,
  CalloutVisibility,
  CreateCalloutInput,
  TemplateType,
  VirtualContributorBodyOfKnowledgeType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { TemplateType as ClientTemplateType } from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  createCalloutOnCalloutsSet,
  deleteCallout,
  transferCallout,
  updateCallout,
} from '../callouts.request.params';
import { deleteSpace } from '../../journey/space/space.request.params';
import { createTemplateFromSpace } from '../../templates/space/space-template.request.params';
import { deleteTemplate } from '../../templates/template.request.params';
import {
  createFormCallout,
  createFormCalloutRaw,
  defaultFormQuestions,
  errorCode,
  FormCallout,
  getFormDefinition,
  getSpaceSets,
  isDenied,
  uniqueFormName,
} from './form.request.params';

/**
 * A FORM framing exists only when it is created through
 * `createCalloutOnCalloutsSet` by a space admin. Every other path that builds
 * framings (knowledge bases, templates, subspace creation, conversions,
 * transfers) must refuse it. Each negative below is paired with a positive
 * control that runs the SAME carrier with a NONE-framing callout and succeeds,
 * so a refusal means "FORM was rejected", never "the carrier is broken".
 */

const uniqueId = UniqueIDGenerator.getID();

const noCallouts = {
  addPostCallout: false,
  addPostCollectionCallout: false,
  addWhiteboardCallout: false,
  addTutorialCallouts: false,
};

const scenarioConfig: TestScenarioConfig = {
  name: 'form-placement-guards',
  space: {
    collaboration: noCallouts,
    settings: { collaboration: { allowMembersToCreateCallouts: true } },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    subspace: { collaboration: noCallouts },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const vcIds: string[] = [];
const templateIds: string[] = [];
const spaceIds: string[] = [];

const spaceSetId = () => baseScenario.space.collaboration.calloutsSetId;
const subspaceSetId = () => baseScenario.subspace.collaboration.calloutsSetId;

const formCalloutData = (displayName: string): CreateCalloutInput => ({
  framing: {
    type: CalloutFramingType.Form,
    profile: { displayName, description: 'Form callout framing' },
    form: { questions: defaultFormQuestions() },
  },
  settings: {
    visibility: CalloutVisibility.Published,
    contribution: { enabled: false },
    framing: { commentsEnabled: false },
  },
});

const noneCalloutData = (displayName: string): CreateCalloutInput => ({
  framing: {
    type: CalloutFramingType.None,
    profile: { displayName, description: 'Plain callout' },
  },
  settings: {
    visibility: CalloutVisibility.Published,
    contribution: { enabled: false },
    framing: { commentsEnabled: false },
  },
});

const framingTypesOf = async (calloutsSetId: string) => {
  const client = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.calloutsSetFramingTypes(
        { calloutsSetId },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const callouts = result.data?.lookup.calloutsSet?.callouts;
  if (!callouts) {
    throw new Error(
      `unable to read callouts of ${calloutsSetId}: ${JSON.stringify(
        result.error?.errors ?? result
      )}`
    );
  }
  return callouts;
};

const createKnowledgeBaseVirtualContributor = async (
  calloutsData: CreateCalloutInput[],
  tag: string
) => {
  const client = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.CreateVirtualContributorOnAccount(
        {
          virtualContributorData: {
            accountID: baseScenario.organization.accountId,
            profileData: { displayName: `form-vc-${tag}-${uniqueId}` },
            aiPersona: { engine: AiPersonaEngine.Expert },
            bodyOfKnowledgeType:
              VirtualContributorBodyOfKnowledgeType.AlkemioKnowledgeBase,
            knowledgeBaseData: {
              profile: { displayName: `form-kb-${tag}-${uniqueId}` },
              calloutsSetData: { calloutsData },
            },
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const id = result.data?.createVirtualContributor.id;
  if (id) {
    vcIds.push(id);
  }
  return result;
};

const createSubspaceWithCallouts = async (
  calloutsData: CreateCalloutInput[],
  tag: string
) => {
  const client = getGraphqlClient();
  const displayName = `form-sub-${tag}-${uniqueId}`;
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.CreateSubspace(
        {
          subspaceData: {
            nameID: `form-sub-${tag}-${uniqueId}`.toLowerCase().slice(0, 25),
            spaceID: baseScenario.space.id,
            about: { profileData: { displayName, tagline: 'placement' } },
            collaborationData: { calloutsSetData: { calloutsData } },
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const id = result.data?.createSubspace.id;
  if (id) {
    spaceIds.push(id);
  }
  return result;
};

const createCalloutTemplate = async (
  calloutData: CreateCalloutInput,
  tag: string
) => {
  const client = getGraphqlClient();
  const result = await graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.CreateTemplate(
        {
          templatesSetId: baseScenario.space.templateSetId,
          type: TemplateType.Callout,
          profileData: { displayName: `form-tpl-${tag}-${uniqueId}` },
          calloutData,
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const id = result.data?.createTemplate.id;
  if (id) {
    templateIds.push(id);
  }
  return result;
};

const convertToKnowledgeBase = (virtualContributorID: string) => {
  const client = getGraphqlClient();
  return graphqlErrorWrapper(
    (authToken: string | undefined) =>
      client.convertVirtualContributorToUseKnowledgeBase(
        { conversionData: { virtualContributorID } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  for (const id of vcIds) {
    await deleteVirtualContributor(id);
  }
  for (const id of templateIds) {
    await deleteTemplate(id);
  }
  for (const id of spaceIds) {
    await deleteSpace(id);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Form placement — who can create a FORM callout', () => {
  test('a member with create-callouts on cannot create a FORM callout', async () => {
    const result = await createFormCalloutRaw(
      spaceSetId(),
      { displayName: uniqueFormName(`member-${uniqueId}`) },
      TestUser.SPACE_MEMBER
    );

    expect(isDenied(result)).toBe(true);
    expect(result.data).toBeUndefined();
  });

  test('positive control: the same member creates a NONE-framing callout', async () => {
    const result = await createCalloutOnCalloutsSet(
      spaceSetId(),
      {
        framing: {
          profile: { displayName: `plain-member-${uniqueId}` },
          type: CalloutFramingType.None,
        },
      },
      TestUser.SPACE_MEMBER
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.createCalloutOnCalloutsSet.id).toBeDefined();
  });

  test('a space admin creates a FORM callout whose question ids are UUIDs', async () => {
    const form = await createFormCallout(
      spaceSetId(),
      { displayName: uniqueFormName(`admin-${uniqueId}`) },
      TestUser.SPACE_ADMIN
    );

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(form.questions).toHaveLength(defaultFormQuestions().length);
    for (const question of form.questions) {
      expect(question.id).toMatch(uuid);
      for (const option of question.options ?? []) {
        expect(option.id).toMatch(uuid);
      }
    }
  });
});

describe('Form placement — the framing kind is fixed', () => {
  let form: FormCallout;
  let plainCalloutId: string;

  beforeAll(async () => {
    form = await createFormCallout(subspaceSetId(), {
      displayName: uniqueFormName(`fixed-${uniqueId}`),
    });
    const plain = await createCalloutOnCalloutsSet(subspaceSetId(), {
      framing: {
        profile: { displayName: `plain-fixed-${uniqueId}` },
        type: CalloutFramingType.None,
      },
    });
    plainCalloutId = plain.data?.createCalloutOnCalloutsSet.id ?? '';
    expect(plainCalloutId).not.toBe('');
  });

  test('a NONE callout cannot become a FORM', async () => {
    const result = await updateCallout(plainCalloutId, TestUser.GLOBAL_ADMIN, {
      framing: { type: CalloutFramingType.Form },
    });

    expect(errorCode(result)).toBe('FORM_FRAMING_FIXED_KIND');
  });

  test('a FORM callout cannot become a NONE callout', async () => {
    const result = await updateCallout(form.calloutId, TestUser.GLOBAL_ADMIN, {
      framing: { type: CalloutFramingType.None },
    });

    expect(errorCode(result)).toBe('FORM_FRAMING_FIXED_KIND');
    const definition = await getFormDefinition(form.calloutId);
    expect(definition.data?.lookup.callout?.framing.type).toBe(
      CalloutFramingType.Form
    );
  });

  test('positive control: the profile of a FORM callout can still be updated', async () => {
    const renamed = `renamed-form-${uniqueId}`;

    const result = await updateCallout(form.calloutId, TestUser.GLOBAL_ADMIN, {
      framing: { profile: { displayName: renamed } },
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.updateCallout.framing.profile.displayName).toBe(
      renamed
    );
    expect(result.data?.updateCallout.framing.type).toBe(
      CalloutFramingType.Form
    );
  });
});

describe('Form placement — carriers that build framings refuse a FORM', () => {
  test('a virtual contributor knowledge base cannot be seeded with a FORM callout', async () => {
    const result = await createKnowledgeBaseVirtualContributor(
      [formCalloutData(`kb-form-${uniqueId}`)],
      'form'
    );

    expect(errorCode(result)).toBe('FORM_FRAMING_NOT_ALLOWED');
    expect(result.data?.createVirtualContributor).toBeUndefined();
  });

  test('positive control: the same knowledge base is created with a NONE callout', async () => {
    const result = await createKnowledgeBaseVirtualContributor(
      [noneCalloutData(`kb-none-${uniqueId}`)],
      'none'
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.createVirtualContributor.id).toBeDefined();
  });

  test('a callout template cannot carry a FORM callout', async () => {
    const result = await createCalloutTemplate(
      formCalloutData(`tpl-form-${uniqueId}`),
      'form'
    );

    expect(errorCode(result)).toBe('FORM_FRAMING_NOT_ALLOWED');
    expect(result.data?.createTemplate).toBeUndefined();
  });

  test('positive control: a NONE callout template is created', async () => {
    const created = await createTemplateOnTemplatesSet(
      baseScenario.space.templateSetId,
      {
        type: ClientTemplateType.Callout,
        profileDisplayName: `tpl-none-${uniqueId}`,
        calloutFramingType: 'NONE',
      }
    );

    expect(created.error).toBeUndefined();
    const id = created.data?.createTemplate.id;
    expect(id).toBeDefined();
    if (id) {
      templateIds.push(id);
    }
  });

  test('a subspace cannot be created with a FORM callout in its request', async () => {
    const result = await createSubspaceWithCallouts(
      [formCalloutData(`sub-form-${uniqueId}`)],
      'form'
    );

    expect(errorCode(result)).toBe('FORM_FRAMING_NOT_ALLOWED');
    expect(result.data?.createSubspace).toBeUndefined();
  });

  test('positive control: a subspace is created with a NONE callout in its request', async () => {
    const result = await createSubspaceWithCallouts(
      [noneCalloutData(`sub-none-${uniqueId}`)],
      'none'
    );

    expect(result.error).toBeUndefined();
    expect(result.data?.createSubspace.id).toBeDefined();
  });
});

describe('Form placement — moving callouts', () => {
  let form: FormCallout;
  let plainCalloutId: string;

  beforeAll(async () => {
    form = await createFormCallout(subspaceSetId(), {
      displayName: uniqueFormName(`transfer-${uniqueId}`),
    });
    const plain = await createCalloutOnCalloutsSet(subspaceSetId(), {
      framing: {
        profile: { displayName: `plain-transfer-${uniqueId}` },
        type: CalloutFramingType.None,
      },
    });
    plainCalloutId = plain.data?.createCalloutOnCalloutsSet.id ?? '';
    expect(plainCalloutId).not.toBe('');
  });

  test('a FORM callout cannot be transferred and stays where it was', async () => {
    const result = await transferCallout(form.calloutId, spaceSetId());

    expect(errorCode(result)).toBe('FORM_TRANSFER_NOT_ALLOWED');
    const source = await framingTypesOf(subspaceSetId());
    const target = await framingTypesOf(spaceSetId());
    expect(source.map(callout => callout.id)).toContain(form.calloutId);
    expect(target.map(callout => callout.id)).not.toContain(form.calloutId);
  });

  test('positive control: a NONE callout moves between the same two sets', async () => {
    const result = await transferCallout(plainCalloutId, spaceSetId());

    expect(result.error).toBeUndefined();
    const target = await framingTypesOf(spaceSetId());
    expect(target.map(callout => callout.id)).toContain(plainCalloutId);
  });
});

describe('Form placement — spaces holding a FORM callout', () => {
  let holdingSpaceId = '';
  let holdingSetId = '';
  let plainDisplayName = '';
  let formCalloutId = '';

  beforeAll(async () => {
    const created = await createSpaceBasicData(
      `form-holder-${uniqueId}`,
      `form-holder-${uniqueId}`.toLowerCase().slice(0, 25),
      baseScenario.organization.accountId
    );
    holdingSpaceId = created.data?.createSpace.id ?? '';
    expect(holdingSpaceId).not.toBe('');
    spaceIds.push(holdingSpaceId);
    holdingSetId = (await getSpaceSets(holdingSpaceId)).calloutsSetId;

    plainDisplayName = `plain-holder-${uniqueId}`;
    const plain = await createCalloutOnCalloutsSet(holdingSetId, {
      framing: {
        profile: { displayName: plainDisplayName },
        type: CalloutFramingType.None,
      },
    });
    expect(plain.error).toBeUndefined();
    formCalloutId = (
      await createFormCallout(holdingSetId, {
        displayName: uniqueFormName(`holder-${uniqueId}`),
      })
    ).calloutId;
  });

  test('a template made from the space leaves the FORM callout out', async () => {
    const created = await createTemplateFromSpace(
      holdingSpaceId,
      baseScenario.space.templateSetId,
      `form-space-tpl-${uniqueId}`
    );
    expect(created.error).toBeUndefined();
    const templateId = created.data?.createTemplateFromSpace.id ?? '';
    expect(templateId).not.toBe('');
    templateIds.push(templateId);

    const client = getGraphqlClient();
    const content = await graphqlErrorWrapper(
      (authToken: string | undefined) =>
        client.templateContentSpaceCallouts(
          { templateId },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    const callouts =
      content.data?.lookup.template?.contentSpace?.collaboration.calloutsSet
        .callouts ?? [];

    // Positive control: the plain callout made it into the template ...
    expect(
      callouts.map(callout => callout.framing.profile.displayName)
    ).toContain(plainDisplayName);
    // ... and the FORM did not.
    expect(callouts.map(callout => callout.framing.type)).not.toContain(
      CalloutFramingType.Form
    );
  });

  test('a virtual contributor cannot be converted to a knowledge base while the space holds a FORM, and the space is left untouched', async () => {
    const vc = await createVirtualContributor(
      baseScenario.organization.accountId,
      {
        profileDisplayName: `form-conv-${uniqueId}`,
        aiPersona: { engine: 'EXPERT' },
        bodyOfKnowledgeType: 'ALKEMIO_SPACE',
        bodyOfKnowledgeID: holdingSpaceId,
      }
    );
    const vcId = vc.data?.createVirtualContributor.id ?? '';
    expect(vcId).not.toBe('');
    vcIds.push(vcId);
    const before = (await framingTypesOf(holdingSetId)).map(
      callout => callout.id
    );
    expect(before).toContain(formCalloutId);

    const rejected = await convertToKnowledgeBase(vcId);

    expect(errorCode(rejected)).toBe('FORM_TRANSFER_NOT_ALLOWED');
    const after = (await framingTypesOf(holdingSetId)).map(
      callout => callout.id
    );
    expect(after).toEqual(before);

    // Positive control: the same VC and space convert once the FORM is gone.
    const removed = await deleteCallout(formCalloutId);
    expect(removed.error).toBeUndefined();
    const converted = await convertToKnowledgeBase(vcId);
    expect(converted.error).toBeUndefined();
    const moved = await framingTypesOf(
      converted.data?.convertVirtualContributorToUseKnowledgeBase.knowledgeBase
        ?.calloutsSet.id ?? ''
    );
    expect(moved.map(callout => callout.framing.profile.displayName)).toContain(
      plainDisplayName
    );
  });
});
