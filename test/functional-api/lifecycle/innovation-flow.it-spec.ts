import '@test/utils/array.matcher';
import {
  createOpportunityCodegen,
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import {
  eventOnApplicationCodegen,
  eventOnChallengeCodegen,
  eventOnOpportunityCodegen,
} from './innovation-flow.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import {
  getChallengeDataCodegen,
  deleteChallengeCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import {
  deleteApplicationCodegen,
  getApplications,
  createApplicationCodegen,
} from '@test/functional-api/user-management/application/application.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let uniqueTextId = '';
let applicationId = '';
let applicationData;
let spaceCommunityId = '';
const organizationName = 'life-org-name' + uniqueId;
const hostNameId = 'life-org-nameid' + uniqueId;
const spaceName = 'life-eco-name' + uniqueId;
const spaceNameId = 'life-eco-nameid' + uniqueId;
let innovationFlowId = '';
let innovationFlowIdOpportunity = '';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Lifecycle', () => {
  describe('Update entity state - negative scenarios', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;

      // Create Challenge
      const responseCreateChallenge = await createChallengeCodegen(
        challengeName,
        uniqueTextId,
        entitiesId.spaceId
      );
      const challengeData = responseCreateChallenge.data?.createChallenge;
      challengeId = challengeData?.id ?? '';
      innovationFlowId = challengeData?.innovationFlow?.id ?? '';
    });
    afterAll(async () => {
      await deleteChallengeCodegen(challengeId);
    });
    // Arrange
    test.each`
      setEvent       | setInvalidEvent | state             | nextEvents
      ${'REFINE'}    | ${'ARCHIVE'}    | ${'beingRefined'} | ${['REFINE', 'ABANDONED']}
      ${'ACTIVE'}    | ${'ARCHIVE'}    | ${'inProgress'}   | ${['REFINE', 'ABANDONED']}
      ${'COMPLETED'} | ${'ARCHIVE'}    | ${'complete'}     | ${['REFINE', 'ABANDONED']}
      ${'ARCHIVE'}   | ${'ACTIVE'}     | ${'archived'}     | ${['REFINE', 'ABANDONED']}
    `(
      'should not update challenge, when set invalid event: "$setInvalidEvent" to state: "$state", nextEvents: "$nextEvents"',
      async ({ setEvent, setInvalidEvent, nextEvents }) => {
        // Act
        const updateState = await eventOnChallengeCodegen(
          innovationFlowId,
          setInvalidEvent
        );
        // Assert
        expect(updateState.error?.errors[0].message).toContain(
          `Unable to update state: provided event (${setInvalidEvent}) not in valid set of next events: ${nextEvents}`
        );
        await eventOnChallengeCodegen(challengeId, setEvent);
      }
    );
  });

  describe('Update entity state - positive path - ABANDONED', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `${uniqueTextId}`;

      // Create Challenge
      const responseCreateChallenge = await createChallengeCodegen(
        challengeName,
        uniqueTextId,
        entitiesId.spaceId
      );
      const challengeData = responseCreateChallenge.data?.createChallenge;
      challengeId = challengeData?.id ?? '';
      innovationFlowId = challengeData?.innovationFlow?.id ?? '';
    });
    afterAll(async () => {
      await deleteChallengeCodegen(challengeId);
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
        const updateState = await eventOnChallengeCodegen(
          innovationFlowId,
          setEvent
        );
        const data = updateState?.data?.eventOnChallenge.lifecycle;
        const challengeData = await getChallengeDataCodegen(challengeId);
        const challengeDataResponse =
          challengeData.data?.lookup.challenge?.innovationFlow?.lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(challengeDataResponse);
      }
    );
  });

  describe('Update entity state - positive path - REFINE', () => {
    beforeAll(async () => {
      uniqueTextId = Math.random()
        .toString(36)
        .slice(-6);
      challengeName = `testChallenge ${uniqueTextId}`;
      opportunityName = `opportunityName ${uniqueTextId}`;
      opportunityTextId = `opp${uniqueTextId}`;

      // Create Challenge
      const responseCreateChallenge = await createChallengeCodegen(
        challengeName,
        uniqueTextId,
        entitiesId.spaceId
      );
      const challengeData = responseCreateChallenge.data?.createChallenge;
      challengeId = challengeData?.id ?? '';
      innovationFlowId = challengeData?.innovationFlow?.id ?? '';

      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
        opportunityName,
        opportunityTextId,
        challengeId
      );

      const opportunityData =
        responseCreateOpportunityOnChallenge?.data?.createOpportunity;
      opportunityId = opportunityData?.id ?? '';
      innovationFlowIdOpportunity = opportunityData?.innovationFlow?.id ?? '';
    });

    afterAll(async () => {
      await deleteOpportunityCodegen(opportunityId);
      await deleteChallengeCodegen(challengeId);
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
        const updateState = await eventOnChallengeCodegen(
          innovationFlowId,
          setEvent
        );
        const data = updateState?.data?.eventOnChallenge.lifecycle;
        const challengeData = await getChallengeDataCodegen(challengeId);
        const challengeDataResponse =
          challengeData?.data?.lookup?.challenge?.innovationFlow?.lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
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
        const updateState = await eventOnOpportunityCodegen(
          innovationFlowIdOpportunity,
          setEvent
        );
        const data = updateState?.data?.eventOnOpportunity.lifecycle;
        const opportunityData = await getOpportunityDataCodegen(opportunityId);
        const opportunityDataResponse =
          opportunityData?.data?.lookup?.opportunity?.innovationFlow?.lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(opportunityDataResponse);
      }
    );
  });

  describe('Update application entity state - positive path - REJECT', () => {
    beforeAll(async () => {
      const spaceCommunityIds = await getSpaceDataCodegen(entitiesId.spaceId);
      spaceCommunityId = spaceCommunityIds?.data?.space?.community?.id ?? '';

      applicationData = await createApplicationCodegen(spaceCommunityId);
      applicationId =
        applicationData?.data?.applyForCommunityMembership?.id ?? '';
    });

    afterAll(async () => {
      await deleteApplicationCodegen(applicationId);
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
        const updateState = await eventOnApplicationCodegen(
          applicationId,
          setEvent
        );

        const data = updateState?.data?.eventOnApplication.lifecycle;
        const getApp = await getApplications(entitiesId.spaceId);
        const applicationDataResponse =
          getApp.body.data.space.community.applications[0].lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
