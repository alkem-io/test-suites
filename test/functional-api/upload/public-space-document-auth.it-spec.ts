/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import {
  deleteDocument,
  getSpaceProfileDocuments,
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
  sorted__create_read_update_delete_grant_contribute,
  sorted__create_read_update_delete_grant_contribute_updateContentt,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
  sorted__create_read_update_delete_grant_fileUp_fileDel_contribute,
  sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent,
} from '@test/non-functional/auth/my-privileges/common';
import { createReferenceOnProfileCodegen } from '../integration/references/references.request.params';
import {
  createLinkCollectionCalloutCodegen,
  createLinkOnCalloutCodegen,
} from '../callout/collection-of-links/collection-of-links-callout.params.request';
import {
  calloutPostCardStorageConfigCodegen,
  calloutStorageConfigCodegen,
  calloutWhiteboardStorageConfigCodegen,
  whiteboardCalloutStorageConfigCodegen,
  whiteboardRtCalloutStorageConfigCodegen,
} from '../callout/storage/callout-storage-config.params.request';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  SpacePreferenceType as SpacePreferenceTypeCodegen,
  SpaceVisibility,
} from '@test/generated/alkemio-schema';
import {
  createWhiteboardCollectionCalloutCodegen,
  createWhiteboardOnCalloutCodegen,
} from '../callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import {
  createPostCollectionCalloutCodegen,
  createPostCardOnCalloutCodegen,
} from '../callout/post/post-collection-callout.params.request';
import { createWhiteboardCalloutCodegen } from '../callout/whiteboard/whiteboard-callout.params.request';
import { createWhiteboardRtCalloutCodegen } from '../callout/whiteboardRt/whiteboardRt-callout.params.request';
import { updateSpacePlatformSettingsCodegen } from '../platform/platform.request.params';

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

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceTypeCodegen.AuthorizationAnonymousReadAccess,
    'true'
  );

  await updateSpacePlatformSettingsCodegen(
    entitiesId.spaceId,
    SpaceVisibility.Active,
    spaceNameId,
    hostNameId
  );
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Public Space - visual on profile', () => {
  describe('Access to Space Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
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
      await deleteDocument(documentId);
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

  describe('Access to Space Context (space storage)', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getSpaceProfileDocuments(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

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
      await deleteDocument(documentId);
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
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
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
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'CALLOUT_FRAMING'}
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

  describe('Access to Call for Posts Post Card visual(banner) documents', () => {
    let calloutId: string;
    let postCardId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post11',
        'Post collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      calloutId = callout.data?.createCalloutOnCollaboration?.id ?? '';

      const postData = await createPostCardOnCalloutCodegen(calloutId);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const visualId = postDataBase?.profile?.visual?.id ?? '';
      postCardId = postDataBase?.id ?? '';

      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );

      const res = await calloutPostCardStorageConfigCodegen(
        postCardId,
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
          ?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );

        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'POST'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'POST'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'POST'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'POST'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space post collection callout storage bucket',
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

        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Call for Posts Post Card reference documents', () => {
    let calloutId: string;
    let postCardId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const hu = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post12',
        'Post collection Callout12',
        TestUser.GLOBAL_ADMIN
      );
      calloutId = hu.data?.createCalloutOnCollaboration?.id ?? '';

      const postData = await createPostCardOnCalloutCodegen(calloutId);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const postCardProfilelId = postDataBase?.profile?.id ?? '';
      postCardId = postDataBase?.id ?? '';

      const refData = await createReferenceOnProfileCodegen(postCardProfilelId);
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';

      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const res = await calloutPostCardStorageConfigCodegen(
        postCardId,
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
          ?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await calloutPostCardStorageConfigCodegen(
          postCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket?.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'POST'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'POST'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'POST'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'POST'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space post collection callout storage bucket',
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

        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0].post
            ?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Call for Whitaboards Whiteboard visual(banner) documents', () => {
    let calloutId: string;
    let whiteboardCardId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const hu = await createWhiteboardCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'whiteboard11',
        'Whiteboard collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      calloutId = hu.data?.createCalloutOnCollaboration?.id ?? '';

      const whiteboardData = await createWhiteboardOnCalloutCodegen(calloutId);
      const whiteboardDataBase =
        whiteboardData.data?.createContributionOnCallout?.whiteboard;
      const visualId = whiteboardDataBase?.profile?.visual?.id ?? '';
      whiteboardCardId = whiteboardDataBase?.id ?? '';

      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );

      const res = await calloutWhiteboardStorageConfigCodegen(
        whiteboardCardId,
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.space?.collaboration?.callouts?.[0].contributions?.[0]
          .whiteboard?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for whiteboard of call for whiteboards callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await calloutWhiteboardStorageConfigCodegen(
          whiteboardCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );

        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0]
            .whiteboard?.profile.storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'WHITEBOARD'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'WHITEBOARD'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'WHITEBOARD'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'WHITEBOARD'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'WHITEBOARD'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space whiteboard collection callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await calloutWhiteboardStorageConfigCodegen(
          whiteboardCardId,
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );

        const data =
          res.data?.space?.collaboration?.callouts?.[0].contributions?.[0]
            .whiteboard?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Call for Posts Callout reference documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post3',
        'Post collection Callout3',
        TestUser.GLOBAL_ADMIN
      );
      const calloutData = callout?.data?.createCalloutOnCollaboration;
      calloutId = calloutData?.id ?? '';
      const calloutProfileId = calloutData?.framing?.profile?.id ?? '';

      const refData = await createReferenceOnProfileCodegen(calloutProfileId);
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';

      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await calloutStorageConfigCodegen(
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.space?.collaboration?.callouts?.[0].framing.profile
          .storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
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
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'CALLOUT_FRAMING'}
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

  describe('Access to Call for Posts Callout visual(banner) documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createPostCollectionCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'post4',
        'Post collection Callout4',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCollaboration;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await calloutStorageConfigCodegen(
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.space?.collaboration?.callouts?.[0].framing.profile
          .storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
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
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'CALLOUT_FRAMING'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'CALLOUT_FRAMING'}
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

  describe('Access to Whiteboard Callout visual(banner) documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createWhiteboardCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'whiteboard1',
        'Whiteboard Callout1',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCollaboration;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.whiteboard?.profile.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await whiteboardCalloutStorageConfigCodegen(
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.space?.collaboration?.callouts?.[0].framing.whiteboard
          ?.profile.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                            | anonymousReadAccess
      ${undefined}               | ${['READ']}                                           | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                           | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                             | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for whiteboard callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await whiteboardCalloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.whiteboard
            ?.profile.storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess | parentEntityType
      ${undefined}               | ${['READ']}                                                          | ${true}             | ${'WHITEBOARD'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'WHITEBOARD'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${true}             | ${'WHITEBOARD'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}             | ${'WHITEBOARD'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${true}             | ${'WHITEBOARD'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space whiteboard callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await whiteboardCalloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.whiteboard
            ?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to WhiteboardRt Callout visual(banner) documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createWhiteboardRtCalloutCodegen(
        entitiesId.spaceCollaborationId,
        'whiteboard2',
        'Whiteboard Callout2',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCollaboration;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.whiteboardRt?.profile.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await whiteboardRtCalloutStorageConfigCodegen(
        calloutId,
        entitiesId.spaceId,
        true,
        false,
        false,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.space?.collaboration?.callouts?.[0].framing.whiteboardRt
          ?.profile.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                   | privileges                                                           | anonymousReadAccess
      ${undefined}               | ${['READ']}                                                          | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute_updateContentt} | ${true}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}                | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                          | ${true}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'READ']}                                            | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for whiteboardRt callout (storageBucket) document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await whiteboardRtCalloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.whiteboardRt
            ?.profile.storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.anonymousReadAccess).toEqual(anonymousReadAccess);
      }
    );

    test.each`
      userRole                   | privileges                                                                         | anonymousReadAccess | parentEntityType
      ${undefined}               | ${['READ']}                                                                        | ${true}             | ${'WHITEBOARD_RT'}
      ${TestUser.GLOBAL_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent} | ${true}             | ${'WHITEBOARD_RT'}
      ${TestUser.HUB_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${true}             | ${'WHITEBOARD_RT'}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                                                        | ${true}             | ${'WHITEBOARD_RT'}
      ${TestUser.HUB_MEMBER}     | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                                           | ${true}             | ${'WHITEBOARD_RT'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space whiteboardRt callout storage bucket',
      async ({
        userRole,
        privileges,
        anonymousReadAccess,
        parentEntityType,
      }) => {
        const res = await whiteboardRtCalloutStorageConfigCodegen(
          calloutId,
          entitiesId.spaceId,
          true,
          false,
          false,
          userRole
        );
        const data =
          res.data?.space?.collaboration?.callouts?.[0].framing.whiteboardRt
            ?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.authorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
