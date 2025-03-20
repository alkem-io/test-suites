import { TestUser } from '@alkemio/tests-lib';
import {
  deleteDocument,
  getProfileDocuments,
  uploadFileOnLink,
  uploadFileOnRef,
  uploadFileOnStorageBucket,
  uploadImageOnVisual,
} from '../upload.params';
import path from 'path';
import { lookupProfileVisuals } from '../../lookup/lookup-request.params';
import {
  updateSpacePlatformSettings,
  updateSpaceSettings,
} from '../../journey/space/space.request.params';
import {
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_fileUp_fileDel,
  sorted__create_read_update_delete_grant_contribute,
  sorted__create_read_update_delete_grant_contribute_updateContent,
  sorted__create_read_update_delete_grant_fileUp_fileDel_contribute,
  sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent,
  readPrivilege,
} from '@common/constants/privileges';
import {
  createLinkCollectionCallout,
  createLinkOnCallout,
} from '../../callout/collection-of-links/collection-of-links-callout.params.request';
import {
  calloutLinkContributionStorageConfig,
  calloutPostCardStorageConfig,
  calloutStorageConfig,
  calloutWhiteboardStorageConfig,
  whiteboardCalloutStorageConfig,
} from '../../callout/storage/callout-storage-config.params.request';
import {
  createPostCardOnCallout,
  createPostCollectionCallout,
} from '../../callout/post/post-collection-callout.params.request';
import {
  createWhiteboardCollectionCallout,
  createWhiteboardOnCallout,
} from '../../callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { createWhiteboardCallout } from '../../callout/whiteboard/whiteboard-callout.params.request';
import { createReferenceOnProfile } from '../../references/references.request.params';
import { SpacePrivacyMode } from '@generated/alkemio-schema';
import { SpaceVisibility } from '@generated/graphql';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';

let refId = '';
let documentId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'storage-auth-private-space-private-subspace-document',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await updateSpacePlatformSettings(
    baseScenario.space.id,
    baseScenario.space.nameId,
    SpaceVisibility.Active
  );

  await updateSpaceSettings(baseScenario.subspace.id, {
    collaboration: {
      inheritMembershipRights: true,
      allowMembersToCreateCallouts: false,
      allowMembersToCreateSubspaces: false,
    },
  });
});
afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Private Space - Private Subspace - visual on profile', () => {
  describe('Access to Space Profile visual', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const visualData = await lookupProfileVisuals(
        baseScenario.subspace.about.profile.id
      );
      const visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );

      const getDocId = await getProfileDocuments(
        baseScenario.subspace.about.profile.id,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace profile visual document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                | parentEntityType
      ${undefined}                 | ${undefined}                                              | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                              | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace profile storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Space Profile reference', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const refData = await createReferenceOnProfile(
        baseScenario.subspace.about.profile.id
      );
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';
      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await getProfileDocuments(
        baseScenario.subspace.about.profile.id,
        TestUser.GLOBAL_ADMIN
      );
      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace profile reference document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );

        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];

        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                | parentEntityType
      ${undefined}                 | ${undefined}                                              | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                              | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace profile storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );

        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Space About (space storage)', () => {
    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const getSpaceStorageId = await getProfileDocuments(
        baseScenario.subspace.about.profile.id,
        TestUser.GLOBAL_ADMIN
      );

      const storageId =
        getSpaceStorageId.data?.lookup?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        storageId
      );

      const getDocId = await getProfileDocuments(
        baseScenario.subspace.about.profile.id,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup?.profile?.storageBucket?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space about (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );

        const data = res.data?.lookup?.profile?.storageBucket?.documents[0];

        const dataAuthorization = data?.authorization;

        expect(dataAuthorization?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                | parentEntityType
      ${undefined}                 | ${undefined}                                              | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                              | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SPACE_MEMBER}     | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel} | ${'SPACE_ABOUT'}
      ${TestUser.SUBSPACE_MEMBER}  | ${readPrivilege}                                          | ${'SPACE_ABOUT'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space about storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await getProfileDocuments(
          baseScenario.subspace.about.profile.id,
          userRole
        );
        const data = res.data?.lookup?.profile?.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const linkCallout = await createLinkCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'link11',
        'Link collection Callout1',
        TestUser.GLOBAL_ADMIN
      );
      calloutId = linkCallout.data?.createCalloutOnCalloutsSet?.id ?? '';

      const refData = await createLinkOnCallout(calloutId);
      refId = refData?.data?.createContributionOnCallout?.link?.id ?? '';
      await uploadFileOnLink(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );
      const res = await calloutLinkContributionStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.lookup?.callout?.contributions?.find(
          c => c.link && c.link.id === refId
        )?.link?.profile.storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutLinkContributionStorageConfig(
          calloutId,
          userRole
        );
        const data = res.data?.lookup?.callout?.contributions?.find(
          c => c.link && c.link.id === refId
        )?.link?.profile.storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                           | parentEntityType
      ${undefined}                 | ${undefined}                                                         | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                         | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                         | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${'CALLOUT_FRAMING'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space link collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutStorageConfig(calloutId, userRole);
        const data = res.data?.lookup?.callout?.framing.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Call for Posts Post Card visual(banner) documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const callout = await createPostCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'post11',
        'Post collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      calloutId = callout.data?.createCalloutOnCalloutsSet?.id ?? '';

      const postData = await createPostCardOnCallout(calloutId);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const visualId = postDataBase?.profile?.visual?.id ?? '';

      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );

      const res = await calloutPostCardStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.lookup?.callout?.contributions?.[0].post?.profile
          .storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutPostCardStorageConfig(calloutId, userRole);

        const data =
          res.data?.lookup.callout?.contributions?.[0].post?.profile
            .storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                           | parentEntityType
      ${undefined}                 | ${undefined}                                                         | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                         | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                         | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace post collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutPostCardStorageConfig(calloutId, userRole);

        const data =
          res.data?.lookup.callout?.contributions?.[0].post?.profile
            .storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });

  describe('Access to Call for Posts Post Card reference documents', () => {
    let calloutId: string;

    afterAll(async () => {
      await deleteDocument(documentId);
    });
    beforeAll(async () => {
      const calloutData = await createPostCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'post12',
        'Post collection Callout12',
        TestUser.GLOBAL_ADMIN
      );
      calloutId = calloutData.data?.createCalloutOnCalloutsSet?.id ?? '';

      const postData = await createPostCardOnCallout(calloutId);
      const postDataBase = postData.data?.createContributionOnCallout?.post;
      const postCardProfilelId = postDataBase?.profile?.id ?? '';

      const refData = await createReferenceOnProfile(postCardProfilelId);
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';

      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const res = await calloutPostCardStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.lookup.callout?.contributions?.[0].post?.profile.storageBucket
          .documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutPostCardStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.contributions?.[0].post?.profile
            .storageBucket?.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                           | parentEntityType
      ${undefined}                 | ${undefined}                                                         | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                         | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                         | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'POST'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${'POST'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space post collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutPostCardStorageConfig(calloutId, userRole);

        const data =
          res.data?.lookup.callout?.contributions?.[0].post?.profile
            .storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const hu = await createWhiteboardCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'whiteboard11',
        'Whiteboard collection Callout1',
        TestUser.GLOBAL_ADMIN
      );

      calloutId = hu.data?.createCalloutOnCalloutsSet?.id ?? '';

      const whiteboardData = await createWhiteboardOnCallout(calloutId);
      const whiteboardDataBase =
        whiteboardData.data?.createContributionOnCallout?.whiteboard;
      const visualId = whiteboardDataBase?.profile?.visual?.id ?? '';
      whiteboardCardId = whiteboardDataBase?.id ?? '';

      await uploadImageOnVisual(
        path.join(__dirname, 'files-to-upload', '190-410.jpg'),
        visualId
      );

      const res = await calloutWhiteboardStorageConfig(
        whiteboardCardId,
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        res.data?.lookup.callout?.contributions?.[0].whiteboard?.profile
          .storageBucket.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute_updateContent}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for whiteboard of call for whiteboards callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutWhiteboardStorageConfig(
          whiteboardCardId,
          calloutId,
          userRole
        );

        const data =
          res.data?.lookup.callout?.contributions?.[0].whiteboard?.profile
            .storageBucket.documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                         | parentEntityType
      ${undefined}                 | ${undefined}                                                                       | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                                       | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent} | ${'WHITEBOARD'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                                       | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                                           | ${'WHITEBOARD'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace whiteboard collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutWhiteboardStorageConfig(
          whiteboardCardId,
          calloutId,
          userRole
        );

        const data =
          res.data?.lookup.callout?.contributions?.[0].whiteboard?.profile
            .storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const callout = await createPostCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'post3',
        'Post collection Callout3',
        TestUser.GLOBAL_ADMIN
      );
      const calloutData = callout?.data?.createCalloutOnCalloutsSet;
      calloutId = calloutData?.id ?? '';
      const calloutProfileId = calloutData?.framing?.profile?.id ?? '';

      const refData = await createReferenceOnProfile(calloutProfileId);
      refId = refData?.data?.createReferenceOnProfile?.id ?? '';

      await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      const getDocId = await calloutStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup.callout?.framing.profile.storageBucket
          ?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutStorageConfig(calloutId, userRole);

        const data =
          res.data?.lookup.callout?.framing.profile.storageBucket.documents[0]
            .authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                           | parentEntityType
      ${undefined}                 | ${undefined}                                                         | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                         | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                         | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${'CALLOUT_FRAMING'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace link collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutStorageConfig(calloutId, userRole);
        const data = res.data?.lookup.callout?.framing.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const callout = await createPostCollectionCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'post4',
        'Post collection Callout4',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCalloutsSet;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.profile?.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await calloutStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup.callout?.framing.profile.storageBucket
          ?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for post of call for post  callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await calloutStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.framing.profile.storageBucket.documents[0]
            .authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                           | parentEntityType
      ${undefined}                 | ${undefined}                                                         | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                         | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                         | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute} | ${'CALLOUT_FRAMING'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                             | ${'CALLOUT_FRAMING'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to subspace space link collection callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await calloutStorageConfig(calloutId, userRole);
        const data = res.data?.lookup.callout?.framing.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const callout = await createWhiteboardCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'whiteboard1',
        'Whiteboard Callout1',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCalloutsSet;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.whiteboard?.profile.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await whiteboardCalloutStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket
          ?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute_updateContent}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for whiteboard callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await whiteboardCalloutStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket
            .documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                         | parentEntityType
      ${undefined}                 | ${undefined}                                                                       | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                                       | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent} | ${'WHITEBOARD'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                                       | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                                           | ${'WHITEBOARD'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace whiteboard callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await whiteboardCalloutStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
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
      const callout = await createWhiteboardCallout(
        baseScenario.subspace.collaboration.calloutsSetId,
        'whiteboard2',
        'Whiteboard Callout2',
        TestUser.GLOBAL_ADMIN
      );

      const calloutData = callout?.data?.createCalloutOnCalloutsSet;
      calloutId = calloutData?.id ?? '';
      const calloutStorageBucketId =
        calloutData?.framing?.whiteboard?.profile.storageBucket?.id ?? '';

      await uploadFileOnStorageBucket(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        calloutStorageBucketId
      );

      const getDocId = await whiteboardCalloutStorageConfig(
        calloutId,
        TestUser.GLOBAL_ADMIN
      );

      documentId =
        getDocId.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket
          ?.documents[0].id ?? '';
    });

    // Arrange
    test.each`
      userRole                     | privileges
      ${undefined}                 | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_contribute_updateContent}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SPACE_MEMBER}     | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'READ']}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace visual for whiteboardRt callout (storageBucket) document',
      async ({ userRole, privileges }) => {
        const res = await whiteboardCalloutStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket
            .documents[0].authorization;

        expect(data?.myPrivileges?.sort()).toEqual(privileges);
      }
    );

    test.each`
      userRole                     | privileges                                                                         | parentEntityType
      ${undefined}                 | ${undefined}                                                                       | ${undefined}
      ${TestUser.NON_SPACE_MEMBER} | ${undefined}                                                                       | ${undefined}
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent} | ${'WHITEBOARD'}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SPACE_MEMBER}     | ${undefined}                                                                       | ${undefined}
      ${TestUser.SUBSPACE_ADMIN}   | ${sorted__create_read_update_delete_grant_fileUp_fileDel_contribute}               | ${'WHITEBOARD'}
      ${TestUser.SUBSPACE_MEMBER}  | ${['CONTRIBUTE', 'FILE_UPLOAD', 'READ']}                                           | ${'WHITEBOARD'}
    `(
      'User: "$userRole" has this privileges: "$privileges" to space subspace whiteboardRt callout storage bucket',
      async ({ userRole, privileges, parentEntityType }) => {
        const res = await whiteboardCalloutStorageConfig(calloutId, userRole);
        const data =
          res.data?.lookup.callout?.framing.whiteboard?.profile.storageBucket;

        expect(data?.authorization?.myPrivileges?.sort()).toEqual(privileges);
        expect(data?.parentEntity?.type).toEqual(parentEntityType);
      }
    );
  });
});
