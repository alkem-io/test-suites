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
let referenceUri = '';
let visualUri: any;
let innovationHubId = '';

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

//afterAll(async () => await deleteOrganization(orgId));

describe('Private Space documents privileges', () => {
  beforeAll(async () => {
    const createRef = await mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(orgProfileId, refname),

      TestUser.GLOBAL_ADMIN
    );
    refId = createRef.body.data.createReferenceOnProfile.id;

    const resImage = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );
    documentEndPoint = resImage.data?.uploadImageOnVisual?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUri(orgId);
    expect(visualUri).toEqual(documentEndPoint);
  });

  afterAll(async () => {
    await mutation(deleteReference, deleteVariablesData(refId));
  });

  afterEach(async () => {
    await deleteDocument(documentId);
  });

  describe('DDT upload all file types', () => {
    afterEach(async () => {
      const a = await deleteDocument(documentId);
      console.log(a.body);
    });

    // Arrange
    test.each`
      file
      ${'file-avif.avif'}
      ${'file-gif.gif'}
      ${'file-jpeg.jpeg'}
      ${'file-jpg.jpg'}
      ${'file-png.png'}
      ${'file-svg.svg'}
      ${'file-webp.webp'}
      ${'doc.pdf'}
    `(
      'Successful upload of file type: "$file" on reference',
      async ({ file }) => {
        const res = await uploadFileOnRef(
          path.join(__dirname, 'files-to-upload', file),
          refId
        );
        console.log(res.data);
        documentEndPoint = res.data?.uploadFileOnReference?.uri;

        documentId = getLastPartOfUrl(documentEndPoint);
        console.log(documentId);
        referenceUri = await getReferenceUri(orgId);
        console.log(referenceUri);

        expect(referenceUri).toEqual(documentEndPoint);
      }
    );
  });

  test('DDT upload all file types', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    referenceUri = await getReferenceUri(orgId);

    expect(referenceUri).toEqual(documentEndPoint);
  });

  test('upload same file twice', async () => {
    await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    referenceUri = await getReferenceUri(orgId);

    expect(referenceUri).toEqual(documentEndPoint);
  });

  test('delete pdf file', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'doc.pdf'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    await deleteDocument(documentId);
    const resDelete = await deleteDocument(documentId);

    expect(resDelete.text).toContain(
      `Not able to locate document with the specified ID: ${documentId}`
    );
  });

  // skipped until we have mechanism, to make rest requests to document api
  test.skip('read uploaded file', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    //const resRead = await getDocument(documentEndPoint);
    // expect(resRead.status).toEqual(200);
  });

  // skipped until we have mechanism, to make rest requests to document api
  test.skip('fail to read file after document deletion', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    expect('a').toEqual('a');
  });

  // skipped until we have mechanism, to make rest requests to document api
  test.skip('read uploaded file after related reference is removed', async () => {
    expect('a').toEqual('a');
  });

  // Skipped due to bug: #2894
  test.skip('upload file bigger than 10 MB', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'big_file.jpg'),
      refId
    );
    console.log(res);
    referenceUri = await getReferenceUri(orgId);

    expect(res?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'File truncated as it exceeds the 5242880 byte size limit.',
        }),
      ])
    );
  });

  test('fail to upload .sql file', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'file-sql.sql'),
      refId
    );
    referenceUri = await getReferenceUri(orgId);

    expect(JSON.stringify(res?.errors)).toContain(
      "Invalid Mime Type specified for storage space 'application/x-sql'"
    );
  });

  test('file is available after releted reference is deleted', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    await mutation(deleteReference, deleteVariablesData(refId));

    const resDelete = await deleteDocument(documentId);

    expect(resDelete.body.data.deleteDocument.id).toEqual(documentId);
  });
});

describe('Upload visual', () => {
  // afterEach(async () => {
  //   await deleteDocument(documentId);
  // });

  describe.only('DDT upload all file types', () => {
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
      userRole                   | privileges                                         | anonymousReadAccess
      ${TestUser.GLOBAL_ADMIN}   | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.HUB_ADMIN}      | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                        | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                        | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges"  to space profile visual document',
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

        expect(dataAuthorization?.myPrivileges).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );

    test.only.each`
      userRole                   | privileges                                         | anonymousReadAccess
      ${TestUser.GLOBAL_ADMIN}   | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.GLOBAL_ADMIN}   | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.HUB_ADMIN}      | ${['READ', 'CREATE', 'UPDATE', 'DELETE', 'GRANT']} | ${true}
      ${TestUser.NON_HUB_MEMBER} | ${['READ']}                                        | ${true}
      ${TestUser.HUB_MEMBER}     | ${['READ']}                                        | ${true}
    `(
      'User: "$userRole" has this privileges: "$privileges"  to space profile visual document',
      async ({ userRole, privileges, anonymousReadAccess }) => {
        const res = await getSpaceProfileDocuments(
          entitiesId.spaceId,
          userRole
        );
        // console.log(res.error?.errors);
        console.log(res.data?.space?.profile?.storageBucket);
        const data = res.data?.space?.profile?.storageBucket?.documents[0];
        const dataAuthorization = data?.authorization;
        // console.log(data);

        expect(dataAuthorization?.myPrivileges).toEqual(privileges);
        expect(dataAuthorization?.anonymousReadAccess).toEqual(
          anonymousReadAccess
        );
      }
    );
  });

  test('Private spave visual', async () => {
    const a = await lookupProfileVisuals(entitiesId.spaceProfileId);
    console.log(a.data?.lookup.profile?.storageBucket);
    console.log(a.data?.lookup.profile?.visuals[0]);
    const visualId = a.data?.lookup.profile?.visuals[0].id ?? '';
    console.log(a.data);

    console.log(a.error?.errors);
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );
    console.log(res.data?.uploadImageOnVisual);

    console.log(res.data?.uploadImageOnVisual.id);
    documentEndPoint = res.data?.uploadImageOnVisual?.uri;
    console.log(documentEndPoint);
    const b = await lookupProfileVisuals(entitiesId.spaceProfileId);
    console.log(b.data?.lookup.profile?.storageBucket);
    documentId = getLastPartOfUrl(documentEndPoint);

    visualUri = await getVisualUri(orgId);
    expect(visualUri).toEqual(documentEndPoint);
  });

  test('upload visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );
    documentEndPoint = res.data?.uploadImageOnVisual?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUri(orgId);
    expect(visualUri).toEqual(documentEndPoint);
  });

  test('upload same visual twice', async () => {
    await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );

    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );
    documentEndPoint = res?.data?.uploadImageOnVisual?.uri; //?? 'failing';
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUri(orgId);
    expect(visualUri).toEqual(documentEndPoint);
  });

  test('should not upload unsupported file type', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      visualId
    );

    expect(res?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message:
            "Upload image has a width resolution of '1299' which is not in the allowed range of 190 - 410 pixels!",
        }),
      ])
    );
  });

  // skipped until we have mechanism, to make rest requests to document api
  test.skip('read uploaded visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId,
      TestUser.CHALLENGE_MEMBER
    );
    console.log(res);
    expect('a').toEqual('a');
  });
});

describe('Upload visual to innovation space', () => {
  let innovationHubVisualId = '`';
  beforeAll(async () => {
    const innovationHubData = await createInnovationHub();
    const innovationHubInfo = innovationHubData.body.data.createInnovationHub;
    innovationHubVisualId = innovationHubInfo.profile.visuals[0].id;
    innovationHubId = innovationHubInfo.id;
  });

  afterAll(async () => {
    await removeInnovationHub(innovationHubId);
  });

  afterEach(async () => {
    await deleteDocument(documentId);
  });

  test('upload visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      innovationHubVisualId
    );
    documentEndPoint = res.data?.uploadImageOnVisual?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUriInnoSpace(innovationHubId);
    expect(visualUri).toEqual(documentEndPoint);
  });
});
