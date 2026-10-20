/**
 * Orphan-free deletion — group A (alkem-io/server#6614, fix alkem-io/server#6678)
 *
 * Plan: ./orphan-free-deletion-test-plan.md (rows D-1 and D-2, formerly deferred)
 *
 * #6678 makes 13 delete paths remove their own `authorization_policy` row:
 * innovation-flow state, room, user settings, community guidelines,
 * innovation flow, communication, template, template default, poll,
 * discussion, innovation pack, forum and license policy. Forum and license
 * policy are platform singletons with no API delete, so they stay unit-only.
 * The other eleven are reached here through the mutations that own them:
 *
 * - GA-1 `deleteStateOnInnovationFlow`        → flow-state policy
 * - GA-2 `deleteCallout` (POLL framing)       → poll policy
 * - GA-3 `deleteCallout` (comments + a post)  → the callout's and the post's room policies
 * - GA-4 `deleteSpace`                        → guidelines, innovation flow + states,
 *                                               communication + updates room, templates
 *                                               manager + defaults + set + a template
 * - GA-5 `deleteTemplate`                     → template (callout and guidelines kinds)
 * - GA-6 `deleteDiscussion`                   → discussion + its comments room
 * - GA-7 `deleteInnovationPack`               → pack + its templates set + a template
 * - GA-8 `deleteUser`                         → user settings, and the user's application
 *                                               (the D-2 cascade, green before #6678 too)
 *
 * Oracle: `_support/owned-records.ts`. Every case is red on a server without
 * #6678 ("policies still present after the delete") except the application
 * half of GA-8, which is a control.
 *
 * Known server quirks (reported on the story, not fixed), all "the policy is
 * unobservable over GraphQL", none "the policy leaks":
 * - `framing.poll.authorization` resolves null (the poll is loaded without
 *   its policy relation); GA-2 captures it from the `addPollOption` answer.
 * - a template callout's `framing.authorization` resolves null, while a
 *   plain callout's resolves one; not captured.
 * - `CommunityGuidelines.profile.authorization` resolves null on templates
 *   and on a space's own guidelines alike; not captured.
 */
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { CommunityMembershipPolicy } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import {
  rawRead,
  rawRequest,
} from '@functional-api/platform-roles/_support/raw-request';
import { registerUser } from '@functional-api/platform-roles/_support/users';
import {
  expectLookupGone,
  expectPoliciesGone,
  expectPoliciesPresent,
  expectRandomPolicyIsNotFound,
  ids,
  operationsAdminToken,
  type OwnedIds,
} from './_support/owned-records';

const uniqueId = UniqueIDGenerator.getID();
const tag = (s: string) => `ofd-${s}-${uniqueId}`.toLowerCase();

type Policy = { id: string; authorization: { id: string } | null };

let baseScenario: OrganizationWithSpaceModel;
let poa: string;
const adminToken = () =>
  TestUserManager.getUserModelByType(TestUser.GLOBAL_ADMIN).authToken;

/** A mutation that must simply work; the error text names the step in a red. */
const mutate = async <T>(
  step: string,
  query: string,
  variables: Record<string, unknown>,
  token = adminToken()
): Promise<T> => {
  const { data, errors } = await rawRequest<T>(token, query, variables);
  if (errors.length > 0 || data === null) {
    throw new Error(
      `${step}: ${errors.map(e => `${e.extensions?.code}: ${e.message}`).join(' | ') || 'no data'}`
    );
  }
  return data;
};

/** Spaces / packs created by a case and not yet deleted by it; swept in afterAll. */
const liveSpaces = new Set<string>();
const livePacks = new Set<string>();

const CREATE_TEMPLATE = `
  mutation($t: CreateTemplateOnTemplatesSetInput!) { createTemplate(templateData: $t) { id } }`;
// The create answer resolves nested policies partially (the callout framing's
// and the guidelines profile's come back null), so every template is captured
// through `lookup.template` after creation.
const READ_TEMPLATE = `
  query($id: UUID!) {
    lookup { template(ID: $id) {
      id
      authorization { id }
      profile { id authorization { id } }
      callout { id authorization { id } }
      communityGuidelines { id authorization { id } profile { id authorization { id } } }
    } }
  }`;
type TemplateRead = Policy & {
  profile: Policy;
  callout: Policy | null;
  communityGuidelines: (Policy & { profile: Policy }) | null;
};

const createTemplate = async (
  step: string,
  templateData: Record<string, unknown>
): Promise<TemplateRead> => {
  const { createTemplate: created } = await mutate<{ createTemplate: { id: string } }>(
    step,
    CREATE_TEMPLATE,
    { t: templateData }
  );
  const { lookup } = await rawRead<{ lookup: { template: TemplateRead } }>(
    adminToken(),
    READ_TEMPLATE,
    { id: created.id }
  );
  return lookup.template;
};

const createCalloutTemplate = (templatesSetID: string, name: string) =>
  createTemplate('createTemplate CALLOUT', {
    templatesSetID,
    type: 'CALLOUT',
    profileData: { displayName: name },
    calloutData: { framing: { profile: { displayName: name } } },
  });

const createGuidelinesTemplate = (templatesSetID: string, name: string) =>
  createTemplate('createTemplate COMMUNITY_GUIDELINES', {
    templatesSetID,
    type: 'COMMUNITY_GUIDELINES',
    profileData: { displayName: name },
    communityGuidelinesData: {
      profile: { displayName: name, description: 'Be kind.' },
    },
  });

const calloutTemplatePolicies = (prefix: string, t: TemplateRead): OwnedIds =>
  ids({
    [`${prefix} template policy`]: t.authorization?.id,
    [`${prefix} template profile policy`]: t.profile.authorization?.id,
    [`${prefix} template callout policy`]: t.callout?.authorization?.id,
  });

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'orphan-free-group-a',
    space: {
      settings: {
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
    },
  });
  poa = await operationsAdminToken();
  await expectRandomPolicyIsNotFound(poa);
});

afterAll(async () => {
  for (const packId of [...livePacks]) {
    await mutate(
      'sweep innovation pack',
      'mutation($d: DeleteInnovationPackInput!) { deleteInnovationPack(deleteData: $d) { id } }',
      { d: { ID: packId } }
    );
  }
  for (const spaceId of [...liveSpaces]) {
    const res = await deleteSpace(spaceId);
    if (res.error) {
      throw new Error(
        `deleteSpace(${spaceId}) failed: ${JSON.stringify(res.error.errors)}`
      );
    }
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Orphan-free deletion - group A policies (server#6614, #6678)', () => {
  test('GA-1 - deleting an innovation-flow state deletes its policy', async () => {
    const { lookup } = await rawRead<{
      lookup: { space: { collaboration: { innovationFlow: { id: string } } } };
    }>(
      adminToken(),
      'query($id: UUID!) { lookup { space(ID: $id) { collaboration { innovationFlow { id } } } } }',
      { id: baseScenario.space.id }
    );
    const innovationFlowID = lookup.space.collaboration.innovationFlow.id;

    const { createStateOnInnovationFlow: state } = await mutate<{
      createStateOnInnovationFlow: Policy;
    }>(
      'createStateOnInnovationFlow',
      'mutation($s: CreateStateOnInnovationFlowInput!) { createStateOnInnovationFlow(stateData: $s) { id authorization { id } } }',
      { s: { innovationFlowID, displayName: tag('state') } }
    );
    const owned = ids({ 'innovation-flow state policy': state.authorization?.id });
    await expectPoliciesPresent(poa, owned);

    await mutate(
      'deleteStateOnInnovationFlow',
      'mutation($s: DeleteStateOnInnovationFlowInput!) { deleteStateOnInnovationFlow(stateData: $s) { id } }',
      { s: { ID: state.id, innovationFlowID } }
    );

    await expectPoliciesGone(poa, owned, 'innovation-flow state');
  });

  test('GA-2 - deleting a POLL callout deletes the poll policy', async () => {
    const { createCalloutOnCalloutsSet: callout } = await mutate<{
      createCalloutOnCalloutsSet: {
        id: string;
        framing: { poll: { id: string; authorization: { id: string } | null } | null };
      };
    }>(
      'createCalloutOnCalloutsSet POLL',
      `mutation($c: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $c) {
          id framing { poll { id authorization { id } } }
        }
      }`,
      {
        c: {
          calloutsSetID: baseScenario.space.collaboration.calloutsSetId,
          framing: {
            profile: { displayName: tag('poll') },
            type: 'POLL',
            poll: { title: 'Pick one', options: ['A', 'B'] },
          },
        },
      }
    );
    const pollID = callout.framing.poll?.id ?? '';
    expect(pollID, 'the callout carries a poll').not.toBe('');

    // Server quirk: the poll's policy is unreachable through the framing
    // (always null). `addPollOption` loads the poll whole and answers it.
    const { addPollOption: poll } = await mutate<{ addPollOption: Policy }>(
      'addPollOption',
      'mutation($o: AddPollOptionInput!) { addPollOption(optionData: $o) { id authorization { id } } }',
      { o: { pollID, text: 'C' } }
    );
    expect(poll.id).toBe(pollID);
    const owned = ids({ 'poll policy': poll.authorization?.id });
    await expectPoliciesPresent(poa, owned);

    await mutate(
      'deleteCallout',
      'mutation($d: DeleteCalloutInput!) { deleteCallout(deleteData: $d) { id } }',
      { d: { ID: callout.id } }
    );

    await expectPoliciesGone(poa, owned, 'poll of a deleted callout');
    await expectLookupGone(adminToken(), 'callout', callout.id);
  });

  test('GA-3 - deleting a callout deletes its comments room policy and the room policy of its post contribution', async () => {
    const { createCalloutOnCalloutsSet: callout } = await mutate<{
      createCalloutOnCalloutsSet: { id: string; comments: Policy | null };
    }>(
      'createCalloutOnCalloutsSet with comments',
      `mutation($c: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $c) { id comments { id authorization { id } } }
      }`,
      {
        c: {
          calloutsSetID: baseScenario.space.collaboration.calloutsSetId,
          framing: { profile: { displayName: tag('rooms') } },
          settings: {
            framing: { commentsEnabled: true },
            contribution: {
              enabled: true,
              allowedTypes: ['POST'],
              canAddContributions: 'MEMBERS',
              commentsEnabled: true,
            },
          },
        },
      }
    );
    const { createContributionOnCallout: contribution } = await mutate<{
      createContributionOnCallout: {
        id: string;
        authorization: { id: string } | null;
        post: { id: string; comments: Policy } | null;
      };
    }>(
      'createContributionOnCallout POST',
      `mutation($c: CreateContributionOnCalloutInput!) {
        createContributionOnCallout(contributionData: $c) {
          id authorization { id } post { id comments { id authorization { id } } }
        }
      }`,
      {
        c: {
          calloutID: callout.id,
          type: 'POST',
          post: { profileData: { displayName: tag('post') } },
        },
      }
    );
    const owned = ids({
      'callout comments room policy': callout.comments?.authorization?.id,
      'post contribution policy': contribution.authorization?.id,
      'post comments room policy': contribution.post?.comments.authorization?.id,
    });
    await expectPoliciesPresent(poa, owned);

    await mutate(
      'deleteCallout',
      'mutation($d: DeleteCalloutInput!) { deleteCallout(deleteData: $d) { id } }',
      { d: { ID: callout.id } }
    );

    await expectPoliciesGone(poa, owned, 'rooms of a deleted callout');
    await expectLookupGone(poa, 'room', callout.comments?.id ?? '');
  });

  test('GA-4 - deleting a space deletes the policies of its guidelines, innovation flow and states, communication and updates room, templates manager, defaults, set and templates', async () => {
    const name = tag('space');
    const created = await createSpaceAndGetData(
      name,
      name,
      baseScenario.organization.accountId
    );
    const spaceId = created.data?.lookup?.space?.id ?? '';
    expect(spaceId, 'dedicated space created').not.toBe('');
    liveSpaces.add(spaceId);

    const { lookup } = await rawRead<{
      lookup: {
        space: {
          about: { guidelines: Policy };
          community: { communication: Policy & { updates: Policy } };
          collaboration: {
            innovationFlow: Policy & { states: (Policy & { displayName: string })[] };
          };
          templatesManager: Policy & {
            templateDefaults: (Policy & { type: string })[];
            templatesSet: Policy;
          };
        };
      };
    }>(
      adminToken(),
      `query($id: UUID!) {
        lookup { space(ID: $id) {
          about { guidelines { id authorization { id } } }
          community { communication { id authorization { id } updates { id authorization { id } } } }
          collaboration { innovationFlow { id authorization { id } states { id displayName authorization { id } } } }
          templatesManager { id authorization { id } templateDefaults { id type authorization { id } } templatesSet { id authorization { id } } }
        } }
      }`,
      { id: spaceId }
    );
    const space = lookup.space;
    expect(space.collaboration.innovationFlow.states.length, 'the flow has states').toBeGreaterThanOrEqual(1);
    expect(space.templatesManager.templateDefaults.length, 'the manager has defaults').toBeGreaterThanOrEqual(1);
    const template = await createCalloutTemplate(space.templatesManager.templatesSet.id, tag('tpl-in-space'));

    const captured: Record<string, string | null | undefined> = {
      'community guidelines policy': space.about.guidelines.authorization?.id,
      'communication policy': space.community.communication.authorization?.id,
      'updates room policy': space.community.communication.updates.authorization?.id,
      'innovation flow policy': space.collaboration.innovationFlow.authorization?.id,
      'templates manager policy': space.templatesManager.authorization?.id,
      'templates set policy': space.templatesManager.templatesSet.authorization?.id,
    };
    for (const s of space.collaboration.innovationFlow.states) {
      captured[`flow state '${s.displayName}' policy`] = s.authorization?.id;
    }
    for (const d of space.templatesManager.templateDefaults) {
      captured[`template default '${d.type}' policy`] = d.authorization?.id;
    }
    const owned = { ...ids(captured), ...calloutTemplatePolicies('space', template) };
    await expectPoliciesPresent(poa, owned);

    const deleted = await deleteSpace(spaceId);
    expect(deleted.error).toBeUndefined();
    liveSpaces.delete(spaceId);
    await expectLookupGone(adminToken(), 'space', spaceId);

    await expectPoliciesGone(poa, owned, 'group-A children of a deleted space');
    await expectLookupGone(poa, 'template', template.id);
    await expectLookupGone(poa, 'room', space.community.communication.updates.id);
  });

  test('GA-5 - deleting a template deletes its policy, its profile policy and its content policies (callout and community-guidelines kinds)', async () => {
    const setId = baseScenario.space.templateSetId;
    const callout = await createCalloutTemplate(setId, tag('tpl-callout'));
    const guidelines = await createGuidelinesTemplate(setId, tag('tpl-guidelines'));
    const owned: OwnedIds = {
      ...calloutTemplatePolicies('callout', callout),
      ...ids({
        'guidelines template policy': guidelines.authorization?.id,
        'guidelines template profile policy': guidelines.profile.authorization?.id,
        'guidelines template guidelines policy': guidelines.communityGuidelines?.authorization?.id,
        // Not captured: `CommunityGuidelines.profile.authorization` resolves
        // null everywhere (template and a space's own guidelines alike), so
        // the profile's policy is unobservable here. Reported on the story.
      }),
    };
    await expectPoliciesPresent(poa, owned);

    for (const id of [callout.id, guidelines.id]) {
      await mutate(
        'deleteTemplate',
        'mutation($d: DeleteTemplateInput!) { deleteTemplate(deleteData: $d) { id } }',
        { d: { ID: id } }
      );
    }

    await expectPoliciesGone(poa, owned, 'deleted templates');
    await expectLookupGone(poa, 'template', callout.id);
    await expectLookupGone(poa, 'template', guidelines.id);
  });

  test('GA-6 - deleting a forum discussion deletes its policy and its comments room policy', async () => {
    const { platform } = await rawRead<{ platform: { forum: { id: string } } }>(
      adminToken(),
      'query { platform { forum { id } } }'
    );
    const { createDiscussion: discussion } = await mutate<{
      createDiscussion: Policy & { profile: Policy; comments: Policy };
    }>(
      'createDiscussion',
      `mutation($d: ForumCreateDiscussionInput!) {
        createDiscussion(createData: $d) {
          id authorization { id } profile { id authorization { id } } comments { id authorization { id } }
        }
      }`,
      {
        d: {
          forumID: platform.forum.id,
          category: 'HELP',
          profile: { displayName: tag('discussion') },
        },
      }
    );
    const owned = ids({
      'discussion policy': discussion.authorization?.id,
      'discussion profile policy': discussion.profile.authorization?.id,
      'discussion comments room policy': discussion.comments.authorization?.id,
    });
    await expectPoliciesPresent(poa, owned);

    await mutate(
      'deleteDiscussion',
      'mutation($d: DeleteDiscussionInput!) { deleteDiscussion(deleteData: $d) { id } }',
      { d: { ID: discussion.id } }
    );

    await expectPoliciesGone(poa, owned, 'deleted discussion');
    await expectLookupGone(poa, 'room', discussion.comments.id);
  });

  test('GA-7 - deleting an innovation pack deletes its policy, its templates set policy and the policies of a template in it', async () => {
    const name = tag('pack');
    const { createInnovationPack: pack } = await mutate<{
      createInnovationPack: Policy & { profile: Policy; templatesSet: Policy };
    }>(
      'createInnovationPack',
      `mutation($p: CreateInnovationPackOnAccountInput!) {
        createInnovationPack(innovationPackData: $p) {
          id authorization { id } profile { id authorization { id } } templatesSet { id authorization { id } }
        }
      }`,
      {
        p: {
          accountID: baseScenario.organization.accountId,
          nameID: name.slice(0, 25),
          profileData: { displayName: name },
        },
      }
    );
    livePacks.add(pack.id);
    const template = await createCalloutTemplate(pack.templatesSet.id, tag('tpl-in-pack'));
    const owned: OwnedIds = {
      ...ids({
        'innovation pack policy': pack.authorization?.id,
        'innovation pack profile policy': pack.profile.authorization?.id,
        'innovation pack templates set policy': pack.templatesSet.authorization?.id,
      }),
      ...calloutTemplatePolicies('pack', template),
    };
    await expectPoliciesPresent(poa, owned);

    await mutate(
      'deleteInnovationPack',
      'mutation($d: DeleteInnovationPackInput!) { deleteInnovationPack(deleteData: $d) { id } }',
      { d: { ID: pack.id } }
    );
    livePacks.delete(pack.id);

    await expectPoliciesGone(poa, owned, 'deleted innovation pack');
    await expectLookupGone(poa, 'template', template.id);
  });

  test('GA-8 - deleting a user deletes its settings policy, and its pending application with its policy (control)', async () => {
    const user = await registerUser(`ofdga${uniqueId}`.toLowerCase());
    const { me } = await rawRead<{
      me: { user: { id: string; settings: Policy } };
    }>(user.token, 'query { me { user { id settings { id authorization { id } } } } }');
    expect(me.user.id).toBe(user.id);

    const { applyForEntryRoleOnRoleSet: application } = await mutate<{
      applyForEntryRoleOnRoleSet: Policy;
    }>(
      'applyForEntryRoleOnRoleSet',
      'mutation($a: ApplyForEntryRoleOnRoleSetInput!) { applyForEntryRoleOnRoleSet(applicationData: $a) { id authorization { id } } }',
      { a: { roleSetID: baseScenario.space.community.roleSetId, questions: [] } },
      user.token
    );
    const settings = ids({ 'user settings policy': me.user.settings.authorization?.id });
    const app = ids({ 'application policy': application.authorization?.id });
    await expectPoliciesPresent(poa, { ...settings, ...app });

    await mutate(
      'deleteUser',
      'mutation($d: DeleteUserInput!) { deleteUser(deleteData: $d) { id } }',
      { d: { ID: user.id, deleteIdentity: true } }
    );

    await expectPoliciesGone(poa, settings, 'settings of a deleted user (#6678)');
    await expectPoliciesGone(poa, app, 'application of a deleted user (cascade since #3122; a control)');
    await expectLookupGone(adminToken(), 'user', user.id);
  });
});
