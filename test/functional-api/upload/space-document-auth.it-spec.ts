/* eslint-disable quotes */
import {
  createReferenceOnProfile,
  createReferenceOnProfileVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  createOrganization,
  deleteOrganization,
} from '../integration/organization/organization.request.params';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  deleteDocument,
  getOrgReferenceUri,
  getOrgVisualUri,
  getOrgVisualUriInnovationHub,
  getSpaceProfileDocuments,
  uploadFileOnRef,
  uploadFileOnStorageBucket,
  uploadImageOnVisual,
} from './upload.params';
import path from 'path';
import {
  deleteReference,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import {
  createInnovationHub,
  removeInnovationHub,
} from '../innovation-hub/innovation-hub-params';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '../organization/organization.request.params';
import {
  createOrgAndSpaceCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { entitiesId } from '../zcommunications/communications-helper';
import { lookupProfileVisuals } from '../lookup/lookup-request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import {
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
} from '@test/non-functional/auth/my-privileges/common';
import { createReferenceOnProfileCodegen } from '../integration/references/references.request.params';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
const orgProfileId = '';
let refId = '';
const refname = 'refname' + uniqueId;
const orgId = '';
const visualId = '';
let documentEndPoint: any;
let documentId = '';
const referenceUri = '';
let visualUri: any;
const innovationHubId = '';

function getLastPartOfUrl(url: string): string {
  const a = url.substring(url.lastIndexOf('/') + 1);
  console.log(a);
  return a;
}

async function getReferenceUri(orgId: string): Promise<string> {
  const orgData = await getOrgReferenceUri(orgId);
  console.log(orgData.body.data.organization.profile);
  const referenceUri = orgData.body.data.organization.profile.references[0].uri;
  return referenceUri;
}

async function getVisualUri(orgId: string): Promise<string> {
  const orgData = await getOrgVisualUri(orgId);
  const visualUri = orgData.body.data.organization.profile.visuals[0].uri;
  return visualUri;
}

async function getVisualUriInnoSpace(innovationHubId: string): Promise<string> {
  const orgData = await getOrgVisualUriInnovationHub(innovationHubId);
  const visualUri =
    orgData.body.data.platform.innovationHub.profile.visuals[0].uri;
  return visualUri;
}

beforeAll(async () => {
  const res = await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  // const orgData = res?.data?.createOrganization;
  //orgId = orgData?.id ?? '';
  // orgProfileId = orgData?.profile?.id ?? '';
  // const ref = orgData?.profile?.references?.[0].id ?? '';
  // // await mutation(deleteReference, deleteVariablesData(ref));
  // visualId = orgData?.profile?.visuals?.[0].id ?? '';
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Private Space - visual on profile', () => {
  describe('Access to Space Profile visual', () => {
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(entitiesId.spaceProfileId);
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      const res = await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );
      const getDocId = await getSpaceProfileDocuments(entitiesId.spaceId);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        const data = res.data?.space?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                | anonymousReadAccess | parentEntityType
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                               | ${true}             | ${'SPACE'}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                               | ${true}             | ${'SPACE'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        const data = res.data?.space?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Space Profile reference', () => {
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const refData = await createReferenceOnProfileCodegen(
        entitiesId.spaceProfileId
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await getSpaceProfileDocuments(entitiesId.spaceId);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile reference document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        // console.log(res.error?.errors);
        // console.log(res.data);
        const data = res.data?.space?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;
        // console.log(data);

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                | anonymousReadAccess | parentEntityType
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                               | ${true}             | ${'SPACE'}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                               | ${true}             | ${'SPACE'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        // console.log(res.error?.errors);
        console.log(res.data?.space?.profile?.storageBucket);
        const data = res.data?.space?.profile?.storageBucket;
        //const dataAuthorization = data?.authorization;
        // console.log(data);

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe.only('Access to Space Context', () => {
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getSpaceProfileDocuments(
        entitiesId.spaceId
      );
      const spaceStorageId =
        getSpaceStorageId.data?.space?.profile?.storageBucket?.id ?? '';
      const refData = await createReferenceOnProfileCodegen(
        entitiesId.spaceProfileId
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      const res = await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        spaceStorageId
      );
      console.log(res.body);

      const getDocId = await getSpaceProfileDocuments(entitiesId.spaceId);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.only.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile reference document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        // console.log(res.error?.errors);
        // console.log(res.data);
        const data = res.data?.space?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;
        // console.log(data);

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.each`
      userRole                   | privileges                                                | anonymousReadAccess | parentEntityType
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                               | ${true}             | ${'SPACE'}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                               | ${true}             | ${'SPACE'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space profile storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        // console.log(res.error?.errors);
        console.log(res.data?.space?.profile?.storageBucket);
        const data = res.data?.space?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
