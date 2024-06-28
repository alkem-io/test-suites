import '@test/utils/array.matcher';
import { eventOnApplicationCodegen } from './innovation-flow.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';

import {
  deleteApplicationCodegen,
  createApplicationCodegen,
  getCommunityInvitationsApplicationsCodegen,
} from '@test/functional-api/user-management/application/application.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { CommunityMembershipPolicy } from '@alkemio/client-lib';

let applicationId = '';
let applicationData;
let spaceCommunityId = '';
const organizationName = 'life-org-name' + uniqueId;
const hostNameId = 'life-org-nameid' + uniqueId;
const spaceName = 'life-eco-name' + uniqueId;
const spaceNameId = 'life-eco-nameid' + uniqueId;

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
  describe('Update application entity state - positive path - REJECT', () => {
    beforeAll(async () => {
      await updateSpaceSettingsCodegen(entitiesId.spaceId, {
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      });

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
        const getApp = await getCommunityInvitationsApplicationsCodegen(
          entitiesId.spaceCommunityId
        );
        const applicationDataResponse =
          getApp?.data?.lookup?.community?.applications[0].lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
