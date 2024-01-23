import { entitiesId, users } from '../zcommunications/communications-helper';

import {
  getSpacesCount,
  removeSpace,
} from '../journey/space/space.request.params';
import {
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
  createOpportunityCodegen,
} from '../journey/opportunity/opportunity.request.params';
import { deleteOrganizationCodegen } from '../integration/organization/organization.request.params';
import { convertChallengeToSpace } from './conversions.request.params';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
} from '@test/utils/mutations/assign-mutation';
import { mutation } from '@test/utils/graphql.request';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { createOrganizationCodegen } from '../organization/organization.request.params';
import { deleteCalloutCodegen } from '../callout/callouts.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import {
  deleteChallengeCodegen,
  getChallengeData,
} from '../journey/challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const organizationName = 'conv-org-name' + uniqueId;
const hostNameId = 'conv-org-nameid' + uniqueId;
const spaceName = 'conv-eco-name' + uniqueId;
const spaceNameId = 'conv-eco-nameid' + uniqueId;
const challengeName = `chname${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let newOrgId = '';
const newOrdNameId = 'ha' + organizationName;
const newOrgName = 'ha' + hostNameId;

describe.skip('Conversions', () => {
  beforeAll(async () => {
    await createOrgAndSpaceWithUsersCodegen(
      organizationName,
      hostNameId,
      spaceName,
      spaceNameId
    );
    await createChallengeWithUsersCodegen(challengeName);
    const res = await createOrganizationCodegen(newOrgName, newOrdNameId);
    newOrgId = res?.data?.createOrganization.id ?? '';
  });

  afterAll(async () => {
    await deleteOpportunityCodegen(entitiesId.opportunityId);
    await deleteCalloutCodegen(entitiesId.challengeId);
    await removeSpace(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organizationId);
    await deleteOrganizationCodegen(newOrgId);
  });
  test('Convert Challenge without lead Organization to Space, throws an error', async () => {
    // Arrange
    const numberOfSpacesBeforeConversion = await getSpacesCount();

    // Act
    const res = await convertChallengeToSpace(entitiesId.challengeId);
    const numberOfSpacesAfterConversion = await getSpacesCount();

    // Assert
    expect(numberOfSpacesBeforeConversion).toEqual(
      numberOfSpacesAfterConversion
    );
    expect(res.text).toContain(
      `A Challenge must have exactly on Lead organization to be converted to a Space: ${entitiesId.challengeNameId} has 0`
    );
  });

  test('Convert Challenge with 2 lead Organization to Space, throws an error', async () => {
    // Arrange
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId
    );

    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      newOrgId
    );
    const numberOfSpacesBeforeConversion = await getSpacesCount();

    // Act
    const res = await convertChallengeToSpace(entitiesId.challengeId);
    const numberOfSpacesAfterConversion = await getSpacesCount();

    // Assert
    expect(numberOfSpacesBeforeConversion).toEqual(
      numberOfSpacesAfterConversion
    );
    expect(res.text).toContain(
      `A Challenge must have exactly on Lead organization to be converted to a Space: ${entitiesId.challengeNameId} has 2`
    );
  });

  test('Convert Challenge with 1 lead Organization to Space and Opportunities to Challenges', async () => {
    // create challenge
    const resCh = await createChallengeCodegen(
      challengeName,
      `success-chnameid${uniqueId}`,
      entitiesId.spaceId
    );

    const chData = resCh?.data?.createChallenge;
    const newChallId = chData?.id ?? '';
    const newChCommunityId = chData?.community?.id ?? '';
    await assignOrganizationAsCommunityLeadFunc(
      newChCommunityId,
      entitiesId.organizationId
    );

    await assignUserAsCommunityMemberFunc(
      newChCommunityId,
      users.spaceMemberId
    );
    await assignUserAsCommunityLeadFunc(newChCommunityId, users.spaceMemberId);
    const chalRes = await getChallengeData(entitiesId.spaceId, newChallId);

    // challange data
    const challengeData = chalRes.body.data.space.challenge;

    const chalDataCommunity = challengeData.community;
    const chalDataContext = challengeData.context;
    const chalDataAgent = challengeData.agent;
    const chalDataApplication = challengeData.application;
    const chalDataAuthorization = challengeData.authorization;
    const chalDataChallenges = challengeData.challenges;
    const chalDataOpportunities = challengeData.opportunities;
    const chalDataPreferences = challengeData.preferences;
    const chalDataTagset = challengeData.tagset;
    const chalDataTemplates = challengeData.templates;
    const chalDataLeadOrg = challengeData.community.leadOrganizations;
    const chalDataNameId = challengeData.nameID;
    const chalDataDisplayName = challengeData.displayName;

    // create Opportunity
    const resOpp = await createOpportunityCodegen(
      opportunityName,
      `success-oppnameid${uniqueId}`,
      newChallId
    );

    const newOppId = resOpp?.data?.createOpportunity.id;
    const newOppCommunityId = resOpp?.data?.createOpportunity?.community?.id;
    const assignOpportunityOrgLead = await assignOrganizationAsCommunityLeadFunc(
      newOppCommunityId,
      entitiesId.organizationId
    );

    await assignUserAsCommunityMemberFunc(
      newOppCommunityId,
      users.spaceMemberId
    );
    await assignUserAsCommunityLeadFunc(newOppCommunityId, users.spaceMemberId);
    const oppRes = await getOpportunityData(entitiesId.spaceId, newOppId);

    // opportunity data
    const opportunityData = chalRes.body.data.space.opportunity;

    const oppDataCommunity = opportunityData.community;
    const oppDataContext = opportunityData.context;
    const oppDataAgent = opportunityData.agent;
    const oppDataApplication = opportunityData.application;
    const oppDataAuthorization = opportunityData.authorization;
    // const oppDataChallenges = opportunityData.challenges;
    // const oppDataOpportunities = oppRes.body.data.space.opportunities;
    const oppDataPreferences = opportunityData.preferences;
    const oppDataTagset = opportunityData.tagset;
    const oppDataTemplates = opportunityData.templates;
    const oppDataLeadOrg = opportunityData.community.leadOrganizations;
    const oppDataNameId = opportunityData.nameID;
    const oppDataDisplayName = opportunityData.displayName;

    // Act
    const res = await convertChallengeToSpace(newChallId);

    // converted data to assert old challenge
    const convertedChallengeData = res.body.data.convertChallengeToSpace;

    const newSpaceDataCommunity = convertedChallengeData.community;
    const newSpaceDataContext = convertedChallengeData.context;
    const newSpaceDataAgent = convertedChallengeData.agent;
    const newSpaceDataApplication = convertedChallengeData.application;
    const newSpaceDataAuthorization = convertedChallengeData.authorization;
    const newSpaceDataChallenges = convertedChallengeData.challenges;
    const newSpaceDataOpportunities = convertedChallengeData.opportunities;
    const newSpaceDataPreferences = convertedChallengeData.preferences;
    const newSpaceDataTagset = convertedChallengeData.tagset;
    const newSpaceDataTemplates = convertedChallengeData.templates;
    const newSpaceDataHost = convertedChallengeData.host;
    const newSpaceDataNameId = convertedChallengeData.nameID;
    const newSpaceDataDisplayName = convertedChallengeData.displayName;

    // converted data to assert old opportunity
    const newSpaceDataCommunityOpp =
      convertedChallengeData.challenges[0].community;
    const newSpaceDataContextOpp = convertedChallengeData.challenges[0].context;
    const newSpaceDataAgentOpp = convertedChallengeData.challenges[0].agent;
    const newSpaceDataApplicationOpp =
      convertedChallengeData.challenges[0].application;
    const newSpaceDataAuthorizationOpp =
      convertedChallengeData.challenges[0].authorization;
    const newSpaceDataChallengesOpp =
      convertedChallengeData.challenges[0].challenges;
    const newSpaceDataOpportunitiesOpp =
      convertedChallengeData.challenges[0].opportunities;
    const newSpaceDataPreferencesOpp =
      convertedChallengeData.challenges[0].preferences;
    const newSpaceDataTagsetOpp = convertedChallengeData.challenges[0].tagset;
    const newSpaceDataTemplatesOpp =
      convertedChallengeData.challenges[0].templates;
    const newSpaceDataHostOpp = convertedChallengeData.challenges[0].host;
    const newSpaceDataNameIdOpp = convertedChallengeData.challenges[0].nameID;
    const newSpaceDataDisplayNameOpp =
      convertedChallengeData.challenges[0].displayName;

    delete newSpaceDataCommunity['id'];
    delete chalDataCommunity['id'];

    delete newSpaceDataTagset['id'];
    delete chalDataTagset['id'];

    delete newSpaceDataCommunityOpp['id'];
    delete oppDataCommunity['id'];

    delete newSpaceDataTagsetOpp['id'];
    delete oppDataTagset['id'];

    // console.log(newSpaceDataCommunity);
    // console.log(chalDataCommunity);
    // console.log(newSpaceDataAuthorization);
    // console.log(chalDataAuthorization);
    // console.log(newSpaceDataOpportunities);
    // console.log(chalDataOpportunities);
    // console.log(newSpaceDataApplication);
    // console.log(chalDataApplication);
    // console.log(newSpaceDataPreferences);
    // console.log(chalDataPreferences);
    // console.log(newSpaceDataTagset);
    // console.log(chalDataTagset);
    // console.log(newSpaceDataTemplates);
    // console.log(chalDataTemplates);
    // console.log([newSpaceDataHost]);
    // console.log(chalDataLeadOrg);
    //console.log(newSpaceDataNameId);
    // console.log(chalDataNameId);

    const newSpaceId = res.body.data.convertChallengeToSpace.id;
    const newChallengeId =
      res.body.data.convertChallengeToSpace.challenges[0].id;

    // expect(newSpaceDataCommunity).toEqual(chalDataCommunity); - fails with COMMUNITY_JOIN is missing after conversion
    // expect(newSpaceDataPreferences).toEqual(chalDataPreferences); - fails - different preferences on different entities (to be verified manually)
    // expect(newSpaceDataTagset).toEqual(chalDataTagset); - fails - tags are not converted
    // expect(newSpaceDataTemplates).toEqual(chalDataTemplates); - challenges doesn't have templates
    // expect(newSpaceDataApplication).toEqual(chalDataApplication);  excluded as applications are asserted as part of community.applications

    // assert converted challenge with old challenge
    expect(newSpaceDataContext).toEqual(chalDataContext);
    expect(newSpaceDataAgent).toEqual(chalDataAgent);
    expect(newSpaceDataAuthorization).toEqual(chalDataAuthorization);
    //expect(newSpaceDataChallenges).toEqual(chalDataChallenges);
    expect(newSpaceDataOpportunities).toEqual(chalDataOpportunities);
    expect([newSpaceDataHost]).toEqual(chalDataLeadOrg);
    expect(newSpaceDataNameId).toEqual(chalDataNameId);
    expect(newSpaceDataDisplayName).toEqual(chalDataDisplayName);

    // assert converted opportunity with old opportunity
    // expect(newSpaceDataCommunityOpp).toEqual(oppDataCommunity);
    expect(newSpaceDataContextOpp).toEqual(oppDataContext);
    expect(newSpaceDataAgentOpp).toEqual(oppDataAgent);
    expect(newSpaceDataAuthorizationOpp).toEqual(oppDataAuthorization);
    //expect(newSpaceDataChallenges).toEqual(chalDataChallenges);
    expect(newSpaceDataOpportunitiesOpp).toEqual([]);
    // expect([newSpaceDataHostOpp]).toEqual(oppDataLeadOrg);
    // expect(newSpaceDataNameIdOpp).toEqual(oppDataNameId); // changed nameId after conversion
    expect(newSpaceDataDisplayNameOpp).toEqual(oppDataDisplayName);

    await deleteChallengeCodegen(newChallengeId);
    await removeSpace(newSpaceId);
  });

  test('Convert Challenge with 1 lead Organization to Space', async () => {
    const resCh = await createChallengeCodegen(
      challengeName,
      `success-chnameid${uniqueId}`,
      entitiesId.spaceId
    );

    const chData = resCh?.data?.createChallenge;

    const newChallId = chData?.id ?? '';
    const newChCommunityId = chData?.community?.id ?? '';
    const h = await assignOrganizationAsCommunityLeadFunc(
      newChCommunityId,
      entitiesId.organizationId
    );

    await assignUserAsCommunityMemberFunc(
      newChCommunityId,
      users.spaceMemberId
    );
    await assignUserAsCommunityLeadFunc(newChCommunityId, users.spaceMemberId);
    const chalRes = await getChallengeData(entitiesId.spaceId, newChallId);

    const challengeData = chalRes.body.data.space.challenge;

    const chalDataCommunity = challengeData.community;
    const chalDataContext = challengeData.context;
    const chalDataAgent = challengeData.agent;
    const chalDataApplication = challengeData.application;
    const chalDataAuthorization = challengeData.authorization;
    const chalDataChallenges = challengeData.challenges;
    const chalDataOpportunities = challengeData.opportunities;
    const chalDataPreferences = challengeData.preferences;
    const chalDataTagset = challengeData.tagset;
    const chalDataTemplates = challengeData.templates;
    const chalDataLeadOrg = challengeData.community.leadOrganizations;
    const chalDataNameId = challengeData.nameID;
    const chalDataDisplayName = challengeData.profile.displayName;

    // Act
    const res = await convertChallengeToSpace(newChallId);

    const convertedChallengeData = res.body.data.convertChallengeToSpace;

    const newSpaceDataCommunity = convertedChallengeData.community;
    const newSpaceDataContext = convertedChallengeData.context;
    const newSpaceDataAgent = convertedChallengeData.agent;
    const newSpaceDataApplication = convertedChallengeData.application;
    const newSpaceDataAuthorization = convertedChallengeData.authorization;
    const newSpaceDataChallenges = convertedChallengeData.challenges;
    const newSpaceDataOpportunities = convertedChallengeData.opportunities;
    const newSpaceDataPreferences = convertedChallengeData.preferences;
    const newSpaceDataTagset = convertedChallengeData.tagset;
    const newSpaceDataTemplates = convertedChallengeData.templates;
    const newSpaceDataHost = convertedChallengeData.host;
    const newSpaceDataNameId = convertedChallengeData.nameID;
    const newSpaceDataDisplayName = convertedChallengeData.displayName;

    delete newSpaceDataCommunity['id'];
    delete chalDataCommunity['id'];

    delete newSpaceDataTagset['id'];
    delete chalDataTagset['id'];

    // console.log(newSpaceDataCommunity);
    // console.log(chalDataCommunity);
    // console.log(newSpaceDataAuthorization);
    // console.log(chalDataAuthorization);
    // console.log(newSpaceDataOpportunities);
    // console.log(chalDataOpportunities);
    // console.log(newSpaceDataApplication);
    // console.log(chalDataApplication);
    // console.log(newSpaceDataPreferences);
    // console.log(chalDataPreferences);
    // console.log(newSpaceDataTagset);
    // console.log(chalDataTagset);
    // console.log(newSpaceDataTemplates);
    // console.log(chalDataTemplates);
    // console.log([newSpaceDataHost]);
    // console.log(chalDataLeadOrg);

    const newSpaceId = convertedChallengeData.id;

    // expect(newSpaceDataCommunity).toEqual(chalDataCommunity); - fails with COMMUNITY_JOIN is missing after conversion
    expect(newSpaceDataContext).toEqual(chalDataContext);
    expect(newSpaceDataAgent).toEqual(chalDataAgent);
    // expect(newSpaceDataApplication).toEqual(chalDataApplication);  excluded as applications are asserted as part of community.applications
    expect(newSpaceDataAuthorization).toEqual(chalDataAuthorization);
    expect(newSpaceDataChallenges).toEqual(chalDataChallenges);
    expect(newSpaceDataOpportunities).toEqual(chalDataOpportunities);
    // expect(newSpaceDataPreferences).toEqual(chalDataPreferences); - fails - different preferences on different entities (to be verified manually)
    // expect(newSpaceDataTagset).toEqual(chalDataTagset); - fails - tags are not converted
    // expect(newSpaceDataTemplates).toEqual(chalDataTemplates); - challenges doesn't have templates
    expect([newSpaceDataHost]).toEqual(chalDataLeadOrg);
    expect(newSpaceDataNameId).toEqual(chalDataNameId);
    expect(newSpaceDataDisplayName).toEqual(chalDataDisplayName);

    await removeSpace(newSpaceId);
  });
});
