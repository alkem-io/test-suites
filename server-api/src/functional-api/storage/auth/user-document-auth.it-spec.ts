import {
  sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii,
  sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin,
  sorted__create_read_update_delete_grant_readUserPii_platformAdmin,
  sorted__create_read_update_delete_readUserPii,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  deleteDocument,
  getProfileDocuments,
  uploadFileOnRef,
  uploadFileOnStorageBucket,
  uploadImageOnVisual,
} from '../upload.params';
import path from 'path';
import { lookupProfileVisuals } from '../../lookup/lookup-request.params';
import {
  deleteReferenceOnProfile,
  createReferenceOnProfile,
} from '../../references/references.request.params';

let refId = '';
let documentId = '';

const scenarioConfig: TestScenarioConfig = {
  name: 'storage-auth-user-document',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('User - documents', () => {
  describe('Access to User Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(
        TestUserManager.users.qaUser.profileId
      );
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId,
        TestUser.QA_USER
      );

      const getDocId = await getProfileDocuments(
        TestUserManager.users.qaUser.profileId,
        TestUser.QA_USER
      );

      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    // The 'undefined' (unauthenticated) user has profile visual READ privileges by default as per discussion for GDPR
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${['READ']}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_readUserPii_platformAdmin}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_readUserPii}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile visual document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                                 | parentEntityType
      ${undefined}                 | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin} | ${'USER'}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}                     | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to User Profile reference document', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
      await deleteReferenceOnProfile(refId);
    });
    beforeAll(async () => {
      const refData = await createReferenceOnProfile(
        TestUserManager.users.qaUser.profileId,
        TestUser.QA_USER
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId,
        TestUser.QA_USER
      );

      const getDocId = await getProfileDocuments(
        TestUserManager.users.qaUser.profileId,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    // The 'undefined' (unauthenticated) user has profile reference docs READ privileges by default as per discussion for GDPR
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${['READ']}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_readUserPii_platformAdmin}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_readUserPii}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user reference document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                                 | parentEntityType
      ${undefined}                 | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin} | ${'USER'}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}                     | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user profile reference storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to User storage bucket', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
      await deleteReferenceOnProfile(refId);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getProfileDocuments(
        TestUserManager.users.qaUser.profileId,
        TestUser.GLOBAL_ADMIN
      );

      const storageId =
        getSpaceStorageId.data?.lookup?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        storageId,
        TestUser.QA_USER
      );

      const getDocId = await getProfileDocuments(
        TestUserManager.users.qaUser.profileId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    // The 'undefined' (unauthenticated) user has profile storageBucket docs READ privileges by default as per discussion for GDPR

    test.each`
      userRole                     | privileges
      ${undefined}                 | ${['READ']}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_readUserPii_platformAdmin}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_readUserPii}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user description visual document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                                 | parentEntityType
      ${undefined}                 | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.NON_SPACE_MEMBER} | ${['READ']}                                                                                | ${'USER'}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin} | ${'USER'}
      ${TestUser.QA_USER}          | ${sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii}                     | ${'USER'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to user description (storageBucket) document',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          TestUserManager.users.qaUser.profileId,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
