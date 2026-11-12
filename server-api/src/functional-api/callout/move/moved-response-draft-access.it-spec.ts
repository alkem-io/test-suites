/**
 * EXP-1 (W2 journey 6, callout-placement-test-plan.md › Charters): does a
 * response moved into a DRAFT post keep the SOURCE post's authorization?
 *
 * Premise, read at server develop e120d25a1:
 * - A draft post's policy strips READ from its parent and grants it back only
 *   to admins, support and the post's creator
 *   (callout.service.authorization.ts › getParentAuthorizationPolicyForCalloutVisibility);
 *   its responses inherit that policy when it is computed.
 * - The move path re-parents the response and saves it, with no policy reset
 *   (callout.contribution.move.service.ts › moveContributionToCallout).
 * - `lookup.contribution` and `lookup.post` check READ on the response's and
 *   the post's OWN policy (lookup.resolver.fields.ts › contribution / post).
 *   The url resolver first checks READ on the post that holds the response
 *   (url.resolver.service.ts), so the url route is guarded by the new parent.
 *
 * Producer: a plain member who had the response's id (or post id) while it was
 * published — it is in every response list and activity entry they could read.
 *
 * Finding (2026-11-12, local stack, server develop e120d25a1): the premise
 * holds. After the move the member still holds READ + CONTRIBUTE on the
 * response and on its post and reads both by id (EXP1-3, EXP1-4: skipped on
 * test-suites#724 until the defect is fixed). The url routes are guarded
 * (EXP1-1, EXP1-2) and the visibility path does reset the policy (EXP1-C), so
 * those run live as regression guards.
 *
 * Data: one L0 Space. The global admin creates the posts (so the draft's
 * creator grant does not reach a persona), `space.admin` writes the responses
 * and moves them, and `space.member` is the plain-member reader who is not the
 * author.
 */
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  createContributionOnCallout,
  moveContributionToCallout,
  readCalloutContributions,
  readContribution,
  readPost,
  resolveContributionUrl,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  updateCalloutVisibility,
} from '@alkemio/tests-lib';
import {
  UrlResolverResultState,
  UrlType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();
let baseScenario: OrganizationWithSpaceModel | undefined;
let calloutsSetId = '';

const scenarioConfig: TestScenarioConfig = {
  name: `moved-response-draft-${uniqueId}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
  },
};

const seedPost = async (
  name: string,
  visibility: CalloutVisibility
): Promise<string> => {
  const res = await createCalloutWithData({
    calloutsSetID: calloutsSetId,
    framing: {
      profile: { displayName: `${name} ${uniqueId}`, description: 'EXP-1' },
      type: CalloutFramingType.None,
    },
    settings: {
      visibility,
      contribution: {
        enabled: true,
        allowedTypes: [CalloutContributionType.Post],
        canAddContributions: CalloutAllowedActors.Members,
        commentsEnabled: true,
      },
      framing: { commentsEnabled: true },
    },
  });
  const id = res.data?.createCalloutOnCalloutsSet.id;
  if (!id) throw new Error(`seed post ${name}: ${JSON.stringify(res.error)}`);
  return id;
};

/** A post response written by the Space admin; returns the response and its post id. */
const seedResponse = async (
  calloutID: string,
  name: string
): Promise<{ contributionId: string; postId: string }> => {
  const res = await createContributionOnCallout(
    {
      calloutID,
      type: CalloutContributionType.Post,
      sendNotification: false,
      post: {
        profileData: { displayName: `${name} ${uniqueId}`, description: 'r' },
      },
    },
    TestUser.SPACE_ADMIN
  );
  const created = res.data?.createContributionOnCallout;
  if (!created?.post?.id)
    throw new Error(`seed response ${name}: ${JSON.stringify(res.error)}`);
  return { contributionId: created.id, postId: created.post.id };
};

/** The response's post url, read as the global admin. */
const urlOf = async (contributionId: string): Promise<string> => {
  const res = await readContribution(contributionId);
  const url = res.data?.lookup.contribution?.post?.profile.url;
  if (!url)
    throw new Error(`url of ${contributionId}: ${JSON.stringify(res.error)}`);
  return url;
};

const errorCodes = (res: {
  error?: { errors: Array<Record<string, unknown>> };
}) => (res.error?.errors ?? []).map(e => e.code);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
});

afterAll(async () => {
  if (baseScenario) await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('EXP-1 a response moved into a draft post', () => {
  let source = '';
  let draft = '';
  let moved = { contributionId: '', postId: '' };
  let oldUrl = '';
  let newUrl = '';

  beforeAll(async () => {
    source = await seedPost('EXP1-source', CalloutVisibility.Published);
    draft = await seedPost('EXP1-draft', CalloutVisibility.Draft);
    moved = await seedResponse(source, 'EXP1-moved');
    oldUrl = await urlOf(moved.contributionId);

    // Precondition: the member reads the response while its post is published.
    const before = await readContribution(
      moved.contributionId,
      TestUser.SPACE_MEMBER
    );
    expect(before.error).toBeUndefined();
    expect(before.data?.lookup.contribution?.id).toBe(moved.contributionId);
    // Precondition: the member cannot read the draft post itself.
    expect(
      errorCodes(await readCalloutContributions(draft, TestUser.SPACE_MEMBER))
    ).toEqual(['FORBIDDEN_POLICY']);

    const res = await moveContributionToCallout(
      moved.contributionId,
      draft,
      TestUser.SPACE_ADMIN
    );
    expect(res.error).toBeUndefined();
    newUrl = await urlOf(moved.contributionId);
  });

  test('EXP1-0 the move happened: the response is in the draft post and not in the source', async () => {
    const inDraft = await readCalloutContributions(draft);
    expect(inDraft.data?.lookup.callout?.contributions.map(c => c.id)).toEqual([
      moved.contributionId,
    ]);
    const inSource = await readCalloutContributions(source);
    expect(
      inSource.data?.lookup.callout?.contributions.map(c => c.id)
    ).not.toContain(moved.contributionId);
    expect(newUrl).not.toBe(oldUrl);
  });

  test('EXP1-1 the new url is refused to the member (the draft post guards the route)', async () => {
    const res = await resolveContributionUrl(newUrl, TestUser.SPACE_MEMBER);
    expect(res.error).toBeUndefined();
    expect(res.data?.urlResolver.state).toBe(UrlResolverResultState.Forbidden);
    expect(
      res.data?.urlResolver.space?.collaboration.calloutsSet.contributionId
    ).toBeFalsy();
  });

  test('EXP1-2 the old url no longer reaches the response for the member', async () => {
    const res = await resolveContributionUrl(oldUrl, TestUser.SPACE_MEMBER);
    expect(res.error).toBeUndefined();
    const set = res.data?.urlResolver.space?.collaboration.calloutsSet;
    expect(set?.calloutId).toBe(source);
    expect(set?.contributionId).toBeFalsy();
    expect(set?.postId).toBeFalsy();
    expect(res.data?.urlResolver.type).not.toBe(UrlType.ContributionPost);
  });

  // skip until bug is fixed: a response moved into a draft post keeps the
  // source post's authorization (no policy reset in the move path), so a plain
  // member still holds READ + CONTRIBUTE on it and reads it by id. Reproduced
  // 2026-11-12 on the local stack (server develop e120d25a1). Unfiled; tracked
  // for the QA lead in https://github.com/alkem-io/test-suites/issues/724
  test.skip('EXP1-3 the member cannot look the moved response up by its id', async () => {
    const res = await readContribution(
      moved.contributionId,
      TestUser.SPACE_MEMBER
    );
    expect(errorCodes(res)).toEqual(['FORBIDDEN_POLICY']);
    expect(res.data?.lookup.contribution).toBeFalsy();
  });

  // skip until bug is fixed: a response moved into a draft post keeps the
  // source post's authorization (no policy reset in the move path), so a plain
  // member still holds READ + CONTRIBUTE on it and reads it by id. Reproduced
  // 2026-11-12 on the local stack (server develop e120d25a1). Unfiled; tracked
  // for the QA lead in https://github.com/alkem-io/test-suites/issues/724
  test.skip("EXP1-4 the member cannot look the moved response's post up by its id", async () => {
    const res = await readPost(moved.postId, TestUser.SPACE_MEMBER);
    expect(errorCodes(res)).toContain('FORBIDDEN_POLICY');
    expect(res.data?.lookup.post).toBeFalsy();
  });
});

describe('EXP-1 control: a published post set to draft hides its responses', () => {
  let post = '';
  let response = { contributionId: '', postId: '' };

  beforeAll(async () => {
    post = await seedPost('EXP1-control', CalloutVisibility.Published);
    response = await seedResponse(post, 'EXP1-control');
    const before = await readContribution(
      response.contributionId,
      TestUser.SPACE_MEMBER
    );
    expect(before.error).toBeUndefined();
    await updateCalloutVisibility(post, CalloutVisibility.Draft);
  });

  test('EXP1-C the member is refused the response and its post by id once the post is a draft', async () => {
    expect(
      errorCodes(
        await readContribution(response.contributionId, TestUser.SPACE_MEMBER)
      )
    ).toEqual(['FORBIDDEN_POLICY']);
    expect(
      errorCodes(await readPost(response.postId, TestUser.SPACE_MEMBER))
    ).toContain('FORBIDDEN_POLICY');
  });
});
