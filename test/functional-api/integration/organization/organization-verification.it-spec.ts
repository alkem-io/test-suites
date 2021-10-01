import '@test/utils/array.matcher';

import {
  createProjectMutation,
  getProjectData,
  removeProjectMutation,
} from '../project/project.request.params';
import {
  createOpportunityMutation,
  getOpportunityData,
  removeOpportunityMutation,
} from '../opportunity/opportunity.request.params';


import { getCommunityData } from '../community/community.request.params';

import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';
import {
  createChallengeMutation,
  getChallengeData,
  removeChallangeMutation,
} from '../challenge/challenge.request.params';
import {
  createApplicationMutation,
  removeApplicationMutation,
  getApplication,
} from '../../user-management/application/application.request.params';
import { getUsers } from '../../user-management/user.request.params';
import { eventOnApplicationMutation, eventOnChallengeMutation, eventOnOpportunityMutation, eventOnProjectMutation } from '../lifecycle/lifecycle.request.params';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const contextTagline = 'contextTagline';
let projectId = '';
let projectName = '';
let projectTextId = '';
let applicationId = '';
let applicationData;
let userId = '';
let userEmail = '';
let ecoverseCommunityId = '';
let groupName = '';
let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

describe('Lifecycle', () => {
  describe('Update entity state - negative scenarios', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallengeMutation(
        challengeName,
        uniqueTextId,
        ecoverseId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    afterAll(async () => {
      await removeChallangeMutation(challengeId);
    });
    // Arrange
    test.each`
      setEvent       | setInvalidEvent | state             | nextEvents
      ${'REFINE'}    | ${'ARCHIVE'}    | ${'beingRefined'} | ${['REFINE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'ARCHIVE'}    | ${'inProgress'}   | ${['ACTIVE', 'ABANDONED']}
      ${'COMPLETED'} | ${'ARCHIVE'}    | ${'complete'}     | ${['COMPLETED', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'ACTIVE'}     | ${'archived'}     | ${['ARCHIVE', 'ABANDONED']}
    `(
      'should not update challenge, when set invalid event: "$setInvalidEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, setInvalidEvent, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(
          challengeId,
          setInvalidEvent
        );
        // Assert
        expect(updateState.text).toContain(
          `Unable to update state: provided event (${setInvalidEvent}) not in valid set of next events: ${nextEvents}`
        );
        await eventOnChallengeMutation(challengeId, setEvent);
      }
    );
  });

  describe('Update entity state - positive path - ABANDONED', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallengeMutation(
        challengeName,
        uniqueTextId,
        ecoverseId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    afterAll(async () => {
      await removeChallangeMutation(challengeId);
    });
    // Arrange

    test.each`
      setEvent       | state           | nextEvents
      ${'ABANDONED'} | ${'abandoned'}  | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}    | ${'inProgress'} | ${['COMPLETED', 'ABANDONED']}
      ${'ABANDONED'} | ${'abandoned'}  | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}    | ${'inProgress'} | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}   | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}   | ${[]}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(challengeId);
        let challengeDataResponse =
          challengeData.body.data.ecoverse.challenge.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );
  });

  describe('Update entity state - positive path - REFINE', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      groupName = `groupName ${uniqueTextId}`;
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;
      projectName = `projectName ${uniqueTextId}`;
      projectTextId = `pr${uniqueTextId}`;
      // Create Challenge
      const responseCreateChallenge = await createChallengeMutation(
        challengeName,
        uniqueTextId,
        ecoverseId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;

      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
        challengeId,
        opportunityName,
        opportunityTextId,
        contextTagline
      );
      opportunityId =
        responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

      // Create Project
      const responseCreateProject = await createProjectMutation(
        opportunityId,
        projectName,
        projectTextId
      );

      projectId = responseCreateProject.body.data.createProject.id;
    });

    afterAll(async () => {
      await removeProjectMutation(projectId);
      await removeOpportunityMutation(opportunityId);
      await removeChallangeMutation(challengeId);
    });

    // Arrange

    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update challenge, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnChallengeMutation(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(challengeId);
        let challengeDataResponse =
          challengeData.body.data.ecoverse.challenge.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );

   
    
  });

 
});
