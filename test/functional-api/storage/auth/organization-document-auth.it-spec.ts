/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import {
  deleteDocument,
  getOrganizationProfileDocuments,
  uploadFileOnRef,
  uploadFileOnStorageBucket,
  uploadImageOnVisual,
} from '../upload.params';
import path from 'path';
import { deleteOrganization } from '../../organization/organization.request.params';
import { createOrgAndSpaceWithUsers } from '@test/utils/data-setup/entities';
import { lookupProfileVisuals } from '../../lookup/lookup-request.params';
import { deleteSpace } from '../../journey/space/space.request.params';
import {
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
  sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin,
  sorted__create_read_update_delete_grant_platformAdmin,
} from '@test/non-functional/auth/my-privileges/common';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { createReferenceOnProfile } from '../../references/references.request.params';
import { entitiesId } from '../../../types/entities-helper';
import { assignUserToOrganization } from '../../roleset/roles-request.params';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
let refId = '';

let documentId = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await assignUserAsOrganizationAdmin(
    users.challengeAdmin.email,
    entitiesId.organization.id
  );

  await assignUserAsOrganizationOwner(
    users.spaceAdmin.email,
    entitiesId.organization.id
  );

  await assignUserToOrganization(
    users.spaceMember.email,
    entitiesId.organization.id
  );
});
afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Organization - documents', () => {
  describe('Access to Organization Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(
        entitiesId.organization.profileId
      );
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );
      const getDocId = await getOrganizationProfileDocuments(
        entitiesId.organization.id,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.organization?.profile?.storageBucket?.documents[0].id ??
        '';
    });

    // Arrange
    test.each`
      userRole                    | privileges                                               | anonymousReadAccess
      ${undefined}                | ${['READ']}                                              | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                              | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_platformAdmin} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                              | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
      userRole                    | privileges                                                              | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
      const refData = await createReferenceOnProfile(
        entitiesId.organization.profileId
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await getOrganizationProfileDocuments(
        entitiesId.organization.id,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.organization?.profile?.storageBucket?.documents[0].id ??
        '';
    });

    // Arrange
    test.each`
      userRole                    | privileges                                               | anonymousReadAccess
      ${undefined}                | ${['READ']}                                              | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                              | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_platformAdmin} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                              | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization reference document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
      userRole                    | privileges                                                              | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization profile reference storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
        entitiesId.organization.id,
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
      userRole                    | privileges                                               | anonymousReadAccess
      ${undefined}                | ${['READ']}                                              | ${true}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                              | ${true}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_platformAdmin} | ${true}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant}               | ${true}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                              | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization description visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
      userRole                    | privileges                                                              | anonymousReadAccess | parentEntityType
      ${undefined}                | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.NON_HUB_MEMBER}  | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
      ${TestUser.GLOBAL_ADMIN}    | ${sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin} | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_ADMIN}       | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.CHALLENGE_ADMIN} | ${sorted__create_read_update_delete_grant_fileUp_fileDel}               | ${true}             | ${'ORGANIZATION'}
      ${TestUser.HUB_MEMBER}      | ${['READ']}                                                             | ${true}             | ${'ORGANIZATION'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to organization description (storageBucket) document',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getOrganizationProfileDocuments(
          entitiesId.organization.id,
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
