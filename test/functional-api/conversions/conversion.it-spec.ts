import {
  getSpacesCount,
  deleteSpace,
} from '../journey/space/space.request.params';
import {
  deleteSubspace,
  createOpportunity,
  getOpportunityData,
} from '../journey/opportunity/opportunity.request.params';
import { convertChallengeToSpace } from './conversions.request.params';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import {
  createChallenge,
  createChallenge,
} from '@test/utils/mutations/journeys/challenge';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignRoleToOrganization,
  assignRoleToUser,
} from '../roleset/roles-request.params';
import { CommunityRoleType } from '@test/generated/alkemio-schema';
import {
  createOrganization,
  deleteOrganization,
} from '../contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';

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
    await createOrgAndSpaceWithUsers(
      organizationName,
      hostNameId,
      spaceName,
      spaceNameId
    );
    await createChallengeWithUsers(challengeName);
    const res = await createOrganization(newOrgName, newOrdNameId);
    newOrgId = res?.data?.createOrganization.id ?? '';
  });

  afterAll(async () => {
    await deleteSpace(entitiesId.opportunity.id);
    await deleteSpace(entitiesId.challenge.id);
    await deleteSpace(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organization.id);
    await deleteOrganization(newOrgId);
  });
  test('Convert Challenge without lead Organization to Space, throws an error', async () => {
    // Arrange
    const numberOfSpacesBeforeConversion = await getSpacesCount();

    // Act
    const res = await convertChallengeToSpace(entitiesId.challenge.id);
    const numberOfSpacesAfterConversion = await getSpacesCount();

    // Assert
    expect(numberOfSpacesBeforeConversion).toEqual(
      numberOfSpacesAfterConversion
    );
    expect(res.error?.errors[0].message).toContain(
      `A Challenge must have exactly on Lead organization to be converted to a Space: ${entitiesId.challenge.nameId} has 0`
    );
  });

  test('Convert Challenge with 2 lead Organization to Space, throws an error', async () => {
    // Arrange
    await assignRoleToOrganization(
      entitiesId.organization.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    await assignRoleToOrganization(
      newOrgId,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    const numberOfSpacesBeforeConversion = await getSpacesCount();

    // Act
    const res = await convertChallengeToSpace(entitiesId.challenge.id);
    const numberOfSpacesAfterConversion = await getSpacesCount();

    // Assert
    expect(numberOfSpacesBeforeConversion).toEqual(
      numberOfSpacesAfterConversion
    );
    expect(res.error?.errors[0].message).toContain(
      `A Challenge must have exactly on Lead organization to be converted to a Space: ${entitiesId.challenge.nameId} has 2`
    );
  });

  test('Convert Challenge with 1 lead Organization to Space and Opportunities to Challenges', async () => {
    // create challenge
    const resCh = await createChallenge(
      challengeName,
      `success-chnameid${uniqueId}`,
      entitiesId.spaceId
    );

    const chData = resCh?.data?.createSubspace;
    const newChallId = chData?.id ?? '';
    const newChCommunityId = chData?.community?.id ?? '';
    await assignRoleToOrganization(
      entitiesId.organization.id,
      newChCommunityId,
      CommunityRoleType.Lead
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newChCommunityId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newChCommunityId,
      CommunityRoleType.Lead
    );
    const chalRes = await getChallengeData(newChallId);

    // challange data
    const challengeData = chalRes?.data?.lookup.challenge;

    const chalDataCommunity = challengeData?.community;
    const chalDataContext = challengeData?.context;
    const chalDataAgent = challengeData?.authorization;
    const chalDataApplication = challengeData?.community?.applications;
    const chalDataAuthorization = challengeData?.authorization;
    const chalDataOpportunities = challengeData?.opportunities;
    const chalDataPreferences = challengeData?.preferences;
    const chalDataTagset = challengeData?.profile?.tagsets;
    const chalDataLeadOrg = challengeData?.community?.leadOrganizations;
    const chalDataNameId = challengeData?.nameID;
    const chalDataDisplayName = challengeData?.profile?.displayName;

    // create Opportunity
    const resOpp = await createOpportunity(
      opportunityName,
      `success-oppnameid${uniqueId}`,
      newChallId
    );

    const newOppId = resOpp?.data?.createSubspace.id ?? '';
    const newOppCommunityId = resOpp?.data?.createSubspace?.community?.id ?? '';

    const assignOpportunityOrgLead = await assignRoleToOrganization(
      entitiesId.organization.id,
      newOppCommunityId,
      CommunityRoleType.Lead
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newOppCommunityId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newOppCommunityId,
      CommunityRoleType.Lead
    );

    const oppRes = await getOpportunityData(newOppId);

    // opportunity data
    const opportunityData = oppRes?.data?.lookup?.opportunity;

    const oppDataCommunity = opportunityData?.community;
    const oppDataContext = opportunityData?.context;
    const oppDataAgent = opportunityData?.authorization;
    const oppDataApplication = opportunityData?.community?.applications;
    const oppDataAuthorization = opportunityData?.authorization;
    // const oppDataChallenges = opportunityData.challenges;
    // const oppDataOpportunities = oppRes.body.data.space.opportunities;
    //const oppDataPreferences = opportunityData?..preferences;
    const oppDataTagset = opportunityData?.profile?.tagsets;
    //const oppDataTemplates = opportunityData.templates;
    const oppDataLeadOrg = opportunityData?.community?.leadOrganizations;
    const oppDataNameId = opportunityData?.nameID;
    const oppDataDisplayName = opportunityData?.profile.displayName;

    // Act
    const res = await convertChallengeToSpace(newChallId);

    // converted data to assert old challenge
    const convertedChallengeData = res?.data?.convertChallengeToSpace;

    const newSpaceDataCommunity = convertedChallengeData?.community;
    const newSpaceDataContext = convertedChallengeData?.context;
    //const newSpaceDataAgent = convertedChallengeData?.agent;
    const newSpaceDataApplication =
      convertedChallengeData?.community?.roleSet.applications;
    const newSpaceDataAuthorization = convertedChallengeData?.authorization;
    const newSpaceDataChallenges = convertedChallengeData?.challenges;
    const newSpaceDataOpportunities = convertedChallengeData?.opportunities;
    const newSpaceDataPreferences = convertedChallengeData?.preferences;
    const newSpaceDataTagset = convertedChallengeData?.profile?.tagsets;
    const newSpaceDataTemplates = convertedChallengeData?.library;
    const newSpaceDataHost = convertedChallengeData?.account.host;
    const newSpaceDataNameId = convertedChallengeData?.nameID;
    const newSpaceDataDisplayName = convertedChallengeData?.profile.displayName;

    // converted data to assert old opportunity
    const newSpaceDataCommunityOpp =
      convertedChallengeData?.challenges?.[0].community;
    const newSpaceDataContextOpp =
      convertedChallengeData?.challenges?.[0].context;
    //const newSpaceDataAgentOpp = convertedChallengeData?.challenges?.[0].agent;
    const newSpaceDataApplicationOpp =
      convertedChallengeData?.challenges?.[0].community?.applications;
    const newSpaceDataAuthorizationOpp =
      convertedChallengeData?.challenges?.[0].authorization;
    const newSpaceDataOpportunitiesOpp =
      convertedChallengeData?.challenges?.[0].opportunities;
    const newSpaceDataPreferencesOpp =
      convertedChallengeData?.challenges?.[0].preferences;
    const newSpaceDataTagsetOpp =
      convertedChallengeData?.challenges?.[0].profile.tagsets;
    //const newSpaceDataTemplatesOpp =
    //convertedChallengeData?.challenges?.[0].templates;
    //const newSpaceDataHostOpp = convertedChallengeData?.challenges?.[0].host;
    const newSpaceDataNameIdOpp =
      convertedChallengeData?.challenges?.[0].nameID;
    const newSpaceDataDisplayNameOpp =
      convertedChallengeData?.challenges?.[0].profile.displayName;

    // ToDo - update
    // delete newSpaceDataCommunity['id'];
    // // delete chalDataCommunity['id'];

    // delete newSpaceDataTagset['id'];
    // //delete chalDataTagset['id'];

    // delete newSpaceDataCommunityOpp['id'];
    // // delete oppDataCommunity['id'];

    // delete newSpaceDataTagsetOpp['id'];
    // //delete oppDataTagset['id'];

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

    const newSpaceId = res?.data?.convertChallengeToSpace.id ?? '';
    const newChallengeId =
      res?.data?.convertChallengeToSpace?.challenges?.[0].id ?? '';

    // expect(newSpaceDataCommunity).toEqual(chalDataCommunity); - fails with COMMUNITY_JOIN is missing after conversion
    // expect(newSpaceDataPreferences).toEqual(chalDataPreferences); - fails - different preferences on different entities (to be verified manually)
    // expect(newSpaceDataTagset).toEqual(chalDataTagset); - fails - tags are not converted
    // expect(newSpaceDataTemplates).toEqual(chalDataTemplates); - challenges doesn't have templates
    // expect(newSpaceDataApplication).toEqual(chalDataApplication);  excluded as applications are asserted as part of community.applications

    // assert converted challenge with old challenge
    expect(newSpaceDataContext).toEqual(chalDataContext);
    //  expect(newSpaceDataAgent).toEqual(chalDataAgent);
    expect(newSpaceDataAuthorization).toEqual(chalDataAuthorization);
    //expect(newSpaceDataChallenges).toEqual(chalDataChallenges);
    expect(newSpaceDataOpportunities).toEqual(chalDataOpportunities);
    expect([newSpaceDataHost]).toEqual(chalDataLeadOrg);
    expect(newSpaceDataNameId).toEqual(chalDataNameId);
    expect(newSpaceDataDisplayName).toEqual(chalDataDisplayName);

    // assert converted opportunity with old opportunity
    // expect(newSpaceDataCommunityOpp).toEqual(oppDataCommunity);
    expect(newSpaceDataContextOpp).toEqual(oppDataContext);
    // expect(newSpaceDataAgentOpp).toEqual(oppDataAgent);
    expect(newSpaceDataAuthorizationOpp).toEqual(oppDataAuthorization);
    //expect(newSpaceDataChallenges).toEqual(chalDataChallenges);
    expect(newSpaceDataOpportunitiesOpp).toEqual([]);
    // expect([newSpaceDataHostOpp]).toEqual(oppDataLeadOrg);
    // expect(newSpaceDataNameIdOpp).toEqual(oppDataNameId); // changed nameId after conversion
    expect(newSpaceDataDisplayNameOpp).toEqual(oppDataDisplayName);

    await deleteSubspace(newChallengeId);
    await deleteSpace(newSpaceId);
  });

  test('Convert Challenge with 1 lead Organization to Space', async () => {
    const resCh = await createChallenge(
      challengeName,
      `success-chnameid${uniqueId}`,
      entitiesId.spaceId
    );

    const chData = resCh?.data?.createChallenge;

    const newChallId = chData?.id ?? '';
    const newChCommunityId = chData?.community?.id ?? '';
    await assignRoleToOrganization(
      entitiesId.organization.id,
      newChCommunityId,
      CommunityRoleType.Lead
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newChCommunityId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.spaceMember.id,
      newChCommunityId,
      CommunityRoleType.Lead
    );

    const chalRes = await getChallengeData(newChallId);

    const challengeData = chalRes?.data?.lookup.challenge;

    const chalDataCommunity = challengeData?.community;
    const chalDataContext = challengeData?.context;
    //const chalDataAgent = challengeData?.agent;
    const chalDataApplication = challengeData?.community?.applications;
    const chalDataAuthorization = challengeData?.authorization;
    const chalDataOpportunities = challengeData?.opportunities;
    const chalDataPreferences = challengeData?.preferences;
    const chalDataTagset = challengeData?.profile?.tagsets;
    //const chalDataTemplates = challengeData?.templates;
    const chalDataLeadOrg = challengeData?.community?.leadOrganizations;
    const chalDataNameId = challengeData?.nameID;
    const chalDataDisplayName = challengeData?.profile.displayName;

    // Act
    const res = await convertChallengeToSpace(newChallId);

    const convertedChallengeData = res?.data?.convertChallengeToSpace;

    const newSpaceDataCommunity = convertedChallengeData?.community;
    const newSpaceDataContext = convertedChallengeData?.context;
    //const newSpaceDataAgent = convertedChallengeData?.agent;
    const newSpaceDataApplication =
      convertedChallengeData?.community?.applications;
    const newSpaceDataAuthorization = convertedChallengeData?.authorization;
    const newSpaceDataChallenges = convertedChallengeData?.challenges;
    const newSpaceDataOpportunities = convertedChallengeData?.opportunities;
    const newSpaceDataPreferences = convertedChallengeData?.preferences;
    const newSpaceDataTagset = convertedChallengeData?.profile.tagsets;
    const newSpaceDataTemplates = convertedChallengeData?.library;
    const newSpaceDataHost = convertedChallengeData?.account.host;
    const newSpaceDataNameId = convertedChallengeData?.nameID;
    const newSpaceDataDisplayName = convertedChallengeData?.profile.displayName;

    //ToDo - update
    //delete newSpaceDataCommunity['id'];
    //delete chalDataCommunity['id'];

    //delete newSpaceDataTagset['id'];
    //delete chalDataTagset['id'];

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

    const newSpaceId = convertedChallengeData?.id ?? '';

    // expect(newSpaceDataCommunity).toEqual(chalDataCommunity); - fails with COMMUNITY_JOIN is missing after conversion
    expect(newSpaceDataContext).toEqual(chalDataContext);
    //expect(newSpaceDataAgent).toEqual(chalDataAgent);
    // expect(newSpaceDataApplication).toEqual(chalDataApplication);  excluded as applications are asserted as part of community.applications
    expect(newSpaceDataAuthorization).toEqual(chalDataAuthorization);
    expect(newSpaceDataOpportunities).toEqual(chalDataOpportunities);
    // expect(newSpaceDataPreferences).toEqual(chalDataPreferences); - fails - different preferences on different entities (to be verified manually)
    // expect(newSpaceDataTagset).toEqual(chalDataTagset); - fails - tags are not converted
    // expect(newSpaceDataTemplates).toEqual(chalDataTemplates); - challenges doesn't have templates
    expect([newSpaceDataHost]).toEqual(chalDataLeadOrg);
    expect(newSpaceDataNameId).toEqual(chalDataNameId);
    expect(newSpaceDataDisplayName).toEqual(chalDataDisplayName);

    await deleteSpace(newSpaceId);
  });
});
