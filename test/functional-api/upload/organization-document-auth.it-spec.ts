/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import {
  deleteDocument,
  getOrganizationProfileDocuments,
  uploadFileOnRef,
  uploadFileOnStorageBucket,
  uploadImageOnVisual,
} from './upload.params';
import path from 'path';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { entitiesId } from '../zcommunications/communications-helper';
import { lookupProfileVisuals } from '../lookup/lookup-request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import {
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
} from '@test/non-functional/auth/my-privileges/common';
import { createReferenceOnProfileCodegen } from '../integration/references/references.request.params';
import {
  assignUserAsOrganizationAdminCodegen,
  assignUserAsOrganizationOwnerCodegen,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { assignUserToOrganizationCodegen } from '../integration/community/community.request.params';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
let refId = '';

let documentId = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await assignUserAsOrganizationAdminCodegen(
    users.challengeAdminEmail,
    entitiesId.organizationId
  );

  await assignUserAsOrganizationOwnerCodegen(
    users.spaceAdminEmail,
    entitiesId.organizationId
  );

  await assignUserToOrganizationCodegen(
    users.spaceMemberEmail,
    entitiesId.organizationId
  );
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Organization - documents', () => {
  describe('Access to Organization Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(
        entitiesId.organizationProfileId
      );
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );
      const getDocId = await getOrganizationProfileDocuments(
        entitiesId.organizationId,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.organization?.profile?.storageBucket?.documents[0].id ??
        '';
    });

    // Arrange
    test.each`
      userRole                    | privileges                                 | anonymousReadAccess
      ${undefined}                | ${['READ']}                                | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data =
          res.data?.organization?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                    | privileges                                                | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data = res.data?.organization?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Organization Profile reference document', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const refData = await createReferenceOnProfileCodegen(
        entitiesId.organizationProfileId
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await getOrganizationProfileDocuments(
        entitiesId.organizationId,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.organization?.profile?.storageBucket?.documents[0].id ??
        '';
    });

    // Arrange
    test.each`
      userRole                    | privileges                                 | anonymousReadAccess
      ${undefined}                | ${['READ']}                                | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization reference document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data =
          res.data?.organization?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                    | privileges                                                | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile reference storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data = res.data?.organization?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Organization storage bucket', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getOrganizationProfileDocuments(
        entitiesId.organizationId,
        TestUser.GLOBAL_ADMIN
      );

      const storageId =
        getSpaceStorageId.data?.organization?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        storageId
      );

      const getDocId = await getOrganizationProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.organization?.profile?.storageBucket?.documents[0].id ??
        '';
    });

    // Arrange
    test.each`
      userRole                    | privileges                                 | anonymousReadAccess
      ${undefined}                | ${['READ']}                                | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization description visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data =
          res.data?.organization?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                    | privileges                                                | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                               | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization description (storageBucket) document',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organizationId,
          userRole
        );
        const data = res.data?.organization?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
