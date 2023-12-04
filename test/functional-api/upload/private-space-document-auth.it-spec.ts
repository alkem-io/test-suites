/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
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
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import {
  createOrgAndSpaceWithUsersCodegen,
  getDefaultSpaceCalloutByNameIdCodegen,
} from '@test/utils/data-setup/entities';
import { entitiesId } from '../zcommunications/communications-helper';
import { lookupProfileVisuals } from '../lookup/lookup-request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import {
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_contribute,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
  sorted__create_read_update_delete_grant_fileUp_fileDel_contribute,
} from '@test/non-functional/auth/my-privileges/common';
import { createReferenceOnProfileCodegen } from '../integration/references/references.request.params';
import {
  createLinkCollectionCalloutCodegen,
  createLinkOnCalloutCodegen,
} from '../callout/collection-of-links/collection-of-links-callout.params.request';
import {
  calloutPostCardStorageConfigCodegen,
  calloutStorageConfigCodegen,
} from '../callout/storage/callout-storage-config.params.request';
import {
  createPostCardOnCalloutCodegen,
  createPostCollectionCalloutCodegen,
} from '../callout/post/post-collection-callout.params.request';

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

describe('Private Space - visual on profile', () => {
  describe('Access to Space Profile visual', () => {
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(entitiesId.spaceProfileId);
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );
      const getDocId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      console.log(getDocId.data?.space?.profile?.storageBucket?.documents);
      console.log(getDocId.error?.errors);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${undefined}               | ${['READ']}                                | ${true}
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
      ${undefined}               | ${['READ']}                                               | ${true}             | ${'SPACE'}
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
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      console.log(getDocId.data?.space?.profile?.storageBucket?.documents);
      console.log(getDocId.error?.errors);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${undefined}               | ${['READ']}                                | ${true}
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
      ${undefined}               | ${['READ']}                                               | ${true}             | ${'SPACE'}
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
        //  console.log(res.data?.space?.profile?.storageBucket);
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

  describe('Access to Space Context (space storage)', () => {
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
      const getDocId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      console.log(getDocId.data?.space?.profile?.storageBucket?.documents);
      console.log(getDocId.error?.errors);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      // console.log(getSpaceStorageId.error?.errors);

      // console.log(getSpaceStorageId.data?.space.profile);

      const spaceStorageId =
        getSpaceStorageId.data?.space?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        spaceStorageId
      );

      const getDocId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      console.log(getDocId.data?.space?.profile?.storageBucket?.documents);
      console.log(getDocId.error?.errors);
      documentId =
        getDocId.data?.space?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                 | anonymousReadAccess
      ${undefined}               | ${['READ']}                                | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space context (storageBucket) document',
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
      ${undefined}               | ${['READ']}                                               | ${true}             | ${'SPACE'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${true}             | ${'SPACE'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                               | ${true}             | ${'SPACE'}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                               | ${true}             | ${'SPACE'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space context storage bucket',
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
        //console.log(res.data?.space?.profile?.storageBucket);
        const data = res.data?.space?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Link collections', () => {
    let calloutId: string;
    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const hu = await createLinkCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'link11',
        'Link collection Callout1',
        TestUser.GLOBAL_ADMIN
      );
      calloutId = hu.data?.createCalloutOnCollaboration?.id ?? '';

      const refData = await createLinkOnCalloutCodegen(calloutId);
      refId = refData?.data?.createContributionOnCallout?.link?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const res = await calloutStorageConfigCodegen(
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        res.data?.space?.collaboration?.callouts?.[0].framing.profile
          .storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${undefined}                                          | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                          | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${false}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await calloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.profile
            .storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'CALLOUT_FRAMING'}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${false}            | ${'CALLOUT_FRAMING'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await calloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.profile
            .storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe.only('Access to Call for Posts Post Card visual(banner) documents', () => {
    let calloutId: string;
    let postCardId: string;

    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const hu = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post11',
        'Post collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      console.log(hu.data);
      calloutId = hu.data?.createCalloutOnCollaboration?.id ?? '';

      const postData = await createPostCardOnCalloutCodegen(calloutId);
      console.log(postData.data);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const visualId = postDataBase?.profile?.visual?.id ?? '';
      postCardId = postDataBase?.id ?? '';

      const b = await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );
      console.log(b.data);

      // const a = await uploadFileOnRef(
      //   path.join(__dirname, 'files-to-upload', 'image.png'),
      //   refId
      // );
      // console.log(a.data);

      const res = await calloutPostCardStorageConfigCodegen(
        postCardId,
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );
      // console.log(
      //   res.data?.space?.collaboration?.callouts?.[0].framing.profile
      //     .storageBucket.documents[0].id
      // );
      // console.log(
      //   res.data?.space?.collaboration?.callouts?.[0].framing.profile
      //     .storageBucket
      // );
      // documentId =
      res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
        ?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${undefined}                                          | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                          | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${false}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        // const callout = await getDefaultSpaceCalloutByNameIdCodegen(
        //   entitiesId.spaceId,
        //   'link11'
        // );
        // console.log(callout);
        // console.log(callout[0].id);

        // const calloutIds = callout[0].id;
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        console.log(res.error?.errors);
        // console.log(res.data);
        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket.documents[0].authorization;
        // const dataAuthorization = data?.authorization;
        console.log(data);

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'POST'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'POST'}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${false}            | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        console.log(res.error?.errors);
        // console.log(res.data);
        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket;
        // const dataAuthorization = data?.authorization;
        console.log(data);

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe.only('Access to Call for Posts Post Card reference documents', () => {
    let calloutId: string;
    let postCardId: string;

    afterAll(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });
    beforeAll(async () => {
      const hu = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post11',
        'Post collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      console.log(hu.data);
      calloutId = hu.data?.createCalloutOnCollaboration?.id ?? '';

      const postData = await createPostCardOnCalloutCodegen(calloutId);
      console.log(postData.data);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const postCardProfilelId = postDataBase?.profile?.id ?? '';
      postCardId = postDataBase?.id ?? '';

      // const b = await uploadImageOnVisual(
      //   path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      //   visualId
      // );
      //console.log(b.data);

      const refData = await createReferenceOnProfileCodegen(postCardProfilelId);
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';

      const a = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );
      console.log(a.data);

      const res = await calloutPostCardStorageConfigCodegen(
        postCardId,
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );
      // console.log(
      //   res.data?.space?.collaboration?.callouts?.[0].framing.profile
      //     .storageBucket.documents[0].id
      // );
      // console.log(
      //   res.data?.space?.collaboration?.callouts?.[0].framing.profile
      //     .storageBucket
      // );
      // documentId =
      res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
        ?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${undefined}                                          | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${false}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                          | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${false}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        // const callout = await getDefaultSpaceCalloutByNameIdCodegen(
        //   entitiesId.spaceId,
        //   'link11'
        // );
        // console.log(callout);
        // console.log(callout[0].id);

        // const calloutIds = callout[0].id;
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        console.log(res.error?.errors);
        // console.log(res.data);
        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket?.documents[0].authorization;
        // const dataAuthorization = data?.authorization;
        console.log(data);

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'POST'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${false}            | ${'POST'}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}                                                         | ${undefined}        | ${undefined}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${false}            | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        console.log(res.error?.errors);
        // console.log(res.data);
        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket;
        // const dataAuthorization = data?.authorization;
        console.log(data);

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
