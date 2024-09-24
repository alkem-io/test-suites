import '@test/utils/array.matcher';
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';

import {
  deleteApplication,
  createApplication,
  getRoleSetInvitationsApplications,
} from '@test/functional-api/roleset/application/application.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { CommunityMembershipPolicy } from '@alkemio/client-lib';
import { entitiesId } from '../../../types/entities-helper';
import { deleteOrganization } from '../../contributor-management/organization/organization.request.params';
import { eventOnRoleSetApplication } from '../roleset-events.request.params';

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
  await deleteOrganization(entitiesId.organization.id);
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

      applicationData = await createApplication(spaceCommunityId);
      applicationId =
        applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    });

    afterAll(async () => {
      await deleteApplication(applicationId);
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
        const updateState = await eventOnRoleSetApplication(
          applicationId,
          setEvent
        );

        const data = updateState?.data?.eventOnApplication.lifecycle;
        const getApp = await getRoleSetInvitationsApplications(
          entitiesId.space.roleSetId
        );
        const applicationDataResponse =
          getApp?.data?.lookup?.roleSet?.applications[0].lifecycle;

        // Assert
        expect(data?.state).toEqual(state);
        expect(data?.nextEvents).toEqual(nextEvents);
        expect(data).toEqual(applicationDataResponse);
      }
    );
  });
});
