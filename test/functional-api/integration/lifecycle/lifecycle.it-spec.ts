import '@test/utils/array.matcher';

import {
  createProject,
  getProjectData,
  removeProject,
} from '../project/project.request.params';
import {
  createOpportunity,
  getOpportunityData,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  eventOnApplication,
  eventOnChallenge,
  eventOnOpportunity,
  eventOnProject,
} from './lifecycle.request.params';

import { getCommunityData } from '../community/community.request.params';

import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import {
  createChallengeMutation,
  getChallengeData,
  removeChallenge,
} from '../challenge/challenge.request.params';
import {
  createApplication,
  removeApplication,
  getApplication,
} from '../../user-management/application/application.request.params';
import { getUser, getUsers } from '../../user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/functional-api/zcommunications/communications-helper';

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
let hubCommunityId = '';
let groupName = '';
let hubId = '';
let organizationId = '';
let organizationName = 'lifecycle-org-name' + uniqueId;
let hostNameId = 'lifecycle-org-nameid' + uniqueId;
let hubName = 'lifecycle-eco-name' + uniqueId;
let hubNameId = 'lifecycle-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
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
        hubId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    afterAll(async () => {
      await removeChallenge(challengeId);
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
        let updateState = await eventOnChallenge(challengeId, setInvalidEvent);
        // Assert
        expect(updateState.text).toContain(
          `Unable to update state: provided event (${setInvalidEvent}) not in valid set of next events: ${nextEvents}`
        );
        await eventOnChallenge(challengeId, setEvent);
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
        hubId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;
    });
    afterAll(async () => {
      await removeChallenge(challengeId);
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
        let updateState = await eventOnChallenge(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(hubNameId, challengeId);
        let challengeDataResponse =
          challengeData.body.data.hub.challenge.lifecycle;

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
        hubId
      );
      challengeId = responseCreateChallenge.body.data.createChallenge.id;

      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunity(
        challengeId,
        opportunityName,
        opportunityTextId,
        contextTagline
      );
      opportunityId =
        responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

      // Create Project
      const responseCreateProject = await createProject(
        opportunityId,
        projectName,
        projectTextId
      );

      projectId = responseCreateProject.body.data.createProject.id;
    });

    afterAll(async () => {
      await removeProject(projectId);
      await removeOpportunity(opportunityId);
      await removeChallenge(challengeId);
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
        let updateState = await eventOnChallenge(challengeId, setEvent);
        let data = updateState.body.data.eventOnChallenge.lifecycle;
        let challengeData = await getChallengeData(hubNameId, challengeId);
        let challengeDataResponse =
          challengeData.body.data.hub.challenge.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );

    // Arrange
    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update opportunity, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnOpportunity(opportunityId, setEvent);

        let data = updateState.body.data.eventOnOpportunity.lifecycle;
        let opportunityData = await getOpportunityData(
          hubNameId,
          opportunityId
        );
        let opportunityDataResponse =
          opportunityData.body.data.hub.opportunity.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(opportunityDataResponse);
      }
    );

    // Arrange
    test.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update project, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnProject(projectId, setEvent);
        let data = updateState.body.data.eventOnProject.lifecycle;
        let projectData = await getProjectData(hubNameId, projectId);
        let projectDataResponse = projectData.body.data.hub.project.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(projectDataResponse);
      }
    );
  });

  describe('Update application entity state - positive path - REJECT', () => {
    beforeAll(async () => {
      const hubCommunityIds = await getCommunityData(hubId);
      hubCommunityId = hubCommunityIds.body.data.hub.community.id;

      const reqNonEco = await getUser(users.nonHubMemberEmail);
      users.nonHubMemberId = reqNonEco.body.data.user.id;

      applicationData = await createApplication(hubCommunityId);
      applicationId = applicationData.body.data.applyForCommunityMembership.id;
    });

    afterAll(async () => {
      await removeApplication(applicationId);
    });

    // Arrange
    test.each`
      setEvent     | state         | nextEvents
      ${'REJECT'}  | ${'rejected'} | ${['REOPEN', 'ARCHIVE']}
      ${'REOPEN'}  | ${'new'}      | ${['APPROVE', 'REJECT']}
      ${'APPROVE'} | ${'approved'} | ${[]}
    `(
      'should update application, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        let updateState = await eventOnApplication(applicationId, setEvent);

        let data = updateState.body.data.eventOnApplication.lifecycle;
        const getApp = await getApplication(hubId, applicationId);
        let applicationDataResponse =
          getApp.body.data.hub.application.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
