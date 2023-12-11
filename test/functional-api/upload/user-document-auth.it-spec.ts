/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import {
  deleteDocument,
  getUserProfileDocuments,
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
  sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii,
  sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii,
  sorted__create_read_update_delete_grant_readUserPii,
  sorted__create_read_update_delete_readUserPii,
} from '@test/non-functional/auth/my-privileges/common';
import {
  createReferenceOnProfileCodegen,
  deleteReferenceOnProfileCodegen,
} from '../integration/references/references.request.params';
import { users } from '@test/utils/queries/users-data';

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
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('User - documents', () => {
  describe('Access to User Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(users.qaUserProfileId);
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId,
        TestUser.QA_USER
      );

      const getDocId = await getUserProfileDocuments(
        users.qaUserId,
        TestUser.QA_USER
      );

      documentId =
        getDocId.data?.user?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                             | anonymousReadAccess
      ${undefined}               | ${undefined}                                           | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                            | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_readUserPii} | ${true}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_readUserPii}       | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                                   | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                                 | ${undefined}        | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                                  | ${true}             | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii} | ${true}             | ${'USER'}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}       | ${true}             | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to User Profile reference document', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
      await deleteReferenceOnProfileCodegen(refId);
    });
    beforeAll(async () => {
      const refData = await createReferenceOnProfileCodegen(
        users.qaUserProfileId,
        TestUser.QA_USER
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId,
        TestUser.QA_USER
      );

      const getDocId = await getUserProfileDocuments(
        users.qaUserId,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.user?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                             | anonymousReadAccess
      ${undefined}               | ${undefined}                                           | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                            | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_readUserPii} | ${true}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_readUserPii}       | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user reference document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                                   | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                                 | ${undefined}        | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                                  | ${true}             | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii} | ${true}             | ${'USER'}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}       | ${true}             | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile reference storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to User storage bucket', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
      await deleteReferenceOnProfileCodegen(refId);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getUserProfileDocuments(
        users.qaUserId,
        TestUser.GLOBAL_ADMIN
      );

      const storageId =
        getSpaceStorageId.data?.user?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        storageId,
        TestUser.QA_USER
      );

      const getDocId = await getUserProfileDocuments(
        users.qaUserId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.user?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                             | anonymousReadAccess
      ${undefined}               | ${undefined}                                           | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                            | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_readUserPii} | ${true}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_readUserPii}       | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user description visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                                   | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                                 | ${undefined}        | ${undefined}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                                  | ${true}             | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii} | ${true}             | ${'USER'}
      ${TestUser.QA_USER}        | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}       | ${true}             | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user description (storageBucket) document',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getUserProfileDocuments(users.qaUserId, userRole);
        const data = res.data?.user?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
