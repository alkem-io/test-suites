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
} from './innovation-flow.request.params';
import { getCommunityData } from '../../roles/community/community.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
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
import { getUser } from '../../user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { users } from '@test/utils/queries/users-data';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
const contextTagline = 'contextTagline';
const projectId = '';
let projectName = '';
let projectTextId = '';
let applicationId = '';
let applicationData;
let spaceCommunityId = '';
let groupName = '';
const organizationName = 'life-org-name' + uniqueId;
const hostNameId = 'life-org-nameid' + uniqueId;
const spaceName = 'life-eco-name' + uniqueId;
const spaceNameId = 'life-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
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
        entitiesId.spaceId
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
        const updateState = await eventOnChallenge(
          challengeId,
          setInvalidEvent
        );
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
        entitiesId.spaceId
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
        const updateState = await eventOnChallenge(challengeId, setEvent);
        const data = updateState.body.data.eventOnChallenge.lifecycle;
        const challengeData = await getChallengeData(spaceNameId, challengeId);
        const challengeDataResponse =
          challengeData.body.data.space.challenge.lifecycle;

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
        entitiesId.spaceId
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

      // Create Project - commented, as for the moment, the entity is not utilized anywhere
      // const responseCreateProject = await createProject(
      //   opportunityId,
      //   projectName,
      //   projectTextId
      // );

      // projectId = responseCreateProject.body.data.createProject.id;
    });

    afterAll(async () => {
      //await removeProject(projectId);
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
        const updateState = await eventOnChallenge(challengeId, setEvent);
        const data = updateState.body.data.eventOnChallenge.lifecycle;
        const challengeData = await getChallengeData(spaceNameId, challengeId);
        const challengeDataResponse =
          challengeData.body.data.space.challenge.lifecycle;

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
        const updateState = await eventOnOpportunity(opportunityId, setEvent);

        const data = updateState.body.data.eventOnOpportunity.lifecycle;
        const opportunityData = await getOpportunityData(
          spaceNameId,
          opportunityId
        );
        const opportunityDataResponse =
          opportunityData.body.data.space.opportunity.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(opportunityDataResponse);
      }
    );

    // Arrange - skiping, as the functionallity is not being utilized anywhere on the application
    test.skip.each`
      setEvent       | state             | nextEvents
      ${'REFINE'}    | ${'beingRefined'} | ${['ACTIVE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'inProgress'}   | ${['COMPLETED', 'ABANDONED']}
      ${'COMPLETED'} | ${'complete'}     | ${['ARCHIVE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'archived'}     | ${[]}
    `(
      'should update project, when set event: "$setEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, state, nextEvents }) => {
        // Act
        const updateState = await eventOnProject(projectId, setEvent);
        const data = updateState.body.data.eventOnProject.lifecycle;
        const projectData = await getProjectData(spaceNameId, projectId);
        const projectDataResponse =
          projectData.body.data.space.project.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(projectDataResponse);
      }
    );
  });

  describe('Update application entity state - positive path - REJECT', () => {
    beforeAll(async () => {
      const spaceCommunityIds = await getCommunityData(entitiesId.spaceId);
      spaceCommunityId = spaceCommunityIds.body.data.space.community.id;

      const reqNonEco = await getUser(users.nonSpaceMemberEmail);
      users.nonSpaceMemberId = reqNonEco.body.data.user.id;

      applicationData = await createApplication(spaceCommunityId);
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
        const updateState = await eventOnApplication(applicationId, setEvent);

        const data = updateState.body.data.eventOnApplication.lifecycle;
        const getApp = await getApplication(entitiesId.spaceId, applicationId);
        const applicationDataResponse =
          getApp.body.data.space.application.lifecycle;

        // Assert
        expect(data.state).toEqual(state);
        expect(data.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
