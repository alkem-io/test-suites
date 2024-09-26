/* eslint-disable quotes */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganization } from '../organization/organization.request.params';
import { TestUser, getAuthDocument } from '@test/utils';
import {
  deleteDocument,
  getOrgReferenceUri,
  getOrgVisualUri,
  getOrgVisualUriInnovationHub,
  uploadFileOnRef,
  uploadImageOnVisual,
} from './upload.params';
import path from 'path';
import {
  createInnovationHub,
  deleteInnovationHub,
} from '../innovation-hub/innovation-hub-params';
import { createOrganization } from '../organization/organization.request.params';
import {
  createReferenceOnProfile,
  deleteReferenceOnProfile,
} from '../references/references.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '../journey/space/space.request.params';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
let orgProfileId = '';
let refId = '';
let orgId = '';
let orgAccountId = '';
let visualId = '';
let documentEndPoint: any;
let documentId = '';
let referenceUri = '';
let visualUri: any;
let innovationHubId = '';

function getLastPartOfUrl(url: string): string {
  const id = url.substring(url.lastIndexOf('/') + 1);
  return id;
}

async function getReferenceUri(orgId: string): Promise<string> {
  const orgData = await getOrgReferenceUri(orgId);
  const referenceUri =
    orgData?.data?.organization?.profile?.references?.[0].uri ?? '';
  return referenceUri;
}

async function getVisualUri(orgId: string): Promise<string> {
  const orgData = await getOrgVisualUri(orgId);
  const visualUri = orgData?.data?.organization.profile.visuals[0].uri ?? '';
  return visualUri;
}

async function getVisualUriInnoSpace(innovationHubId: string): Promise<string> {
  const orgData = await getOrgVisualUriInnovationHub(innovationHubId);
  const visualUri =
    orgData?.data?.platform?.innovationHub?.profile.visuals[0].uri ?? '';
  return visualUri;
}

beforeAll(async () => {
  const res = await createOrganization(organizationName, hostNameId);
  const orgData = res?.data?.createOrganization;
  orgId = orgData?.id ?? '';
  orgAccountId = orgData?.account?.id ?? '';
  orgProfileId = orgData?.profile?.id ?? '';
  const ref = orgData?.profile?.references?.[0].id ?? '';
  await deleteReferenceOnProfile(ref);
  visualId = orgData?.profile?.visuals?.[0].id ?? '';
});
afterAll(async () => await deleteOrganization(orgId));

describe('Upload document', () => {
  beforeAll(async () => {
    const createRef = await createReferenceOnProfile(orgProfileId);
    refId = createRef?.data?.createReferenceOnProfile.id ?? '';
  });

  afterAll(async () => {
    await deleteReferenceOnProfile(refId);
  });

  afterEach(async () => {
    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
  });

  describe('DDT upload all file types', () => {
    afterEach(async () => {
      await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
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
        documentEndPoint = res.data?.uploadFileOnReference?.uri;

        documentId = getLastPartOfUrl(documentEndPoint);
        referenceUri = await getReferenceUri(orgId);

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

    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
    const resDelete = await deleteDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );

    expect(resDelete.error?.errors[0].message).toContain(
      `Not able to locate document with the specified ID: ${documentId}`
    );
  });

  test('read uploaded file', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    const documentAccess = await getAuthDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );
    expect(documentAccess.status).toEqual(200);
  });

  // Skipped until bug: #3857 is fixed
  test.skip('fail to read file after document deletion', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
    const documentAccess = await getAuthDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );
    expect(documentAccess.status).toEqual(404);
  });

  test('read uploaded file after related reference is removed', async () => {
    const refData = await createReferenceOnProfile(
      orgProfileId,
      'test2'
    );
    const refId2 = refData?.data?.createReferenceOnProfile?.id ?? '';
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId2
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    await deleteReferenceOnProfile(refId2);
    const documentAccess = await getAuthDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );
    expect(documentAccess.status).toEqual(200);
  });

  // ToDo - add visual / document with size bigger than 15 mb
  test.skip('upload file bigger than 15 MB', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'big_file.jpg'),
      refId
    );
    referenceUri = await getReferenceUri(orgId);

    expect(res?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Upload on reference or link failed!',
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
      'Upload on reference or link failed!'
    );
  });

  test('file is available after releted reference is deleted', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    await deleteReferenceOnProfile(refId);

    const resDelete = await deleteDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );

    expect(resDelete?.data?.deleteDocument.id).toEqual(documentId);
  });
});

describe('Upload visual', () => {
  afterEach(async () => {
    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
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
    documentEndPoint = res?.data?.uploadImageOnVisual?.uri;
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

  test('read uploaded visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId,
      TestUser.GLOBAL_ADMIN
    );
    documentEndPoint = res.data?.uploadImageOnVisual?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);

    const documentAccess = await getAuthDocument(
      documentId,
      TestUser.GLOBAL_ADMIN
    );
    expect(documentAccess.status).toEqual(200);
  });
});

describe('Upload visual to innovation space', () => {
  let innovationHubVisualId = '`';
  let spaceId = '';
  beforeAll(async () => {
    const resSpace = await createSpaceAndGetData(
      spaceName,
      spaceNameId,
      orgAccountId
    );
    const spaceData = resSpace?.data?.space;
    spaceId = spaceData?.id ?? '';
    //const spaceAccountId = spaceData?.account.id ?? '';

    const innovationHubData = await createInnovationHub(orgAccountId);
    console.log('innovationHubData', innovationHubData.error?.errors);
    console.log('innovationHubData', innovationHubData.error?.errors);
    const innovationHubInfo = innovationHubData?.data?.createInnovationHub;
    innovationHubVisualId = innovationHubInfo?.profile.visuals[0].id ?? '';
    innovationHubId = innovationHubInfo?.id ?? '';
  });

  afterAll(async () => {
    await deleteInnovationHub(innovationHubId);
    await deleteSpace(spaceId);
  });

  afterEach(async () => {
    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
  });

  test('upload visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', 'vert.jpg'),
      innovationHubVisualId
    );
    documentEndPoint = res.data?.uploadImageOnVisual?.uri;
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUriInnoSpace(innovationHubId);
    expect(visualUri).toEqual(documentEndPoint);
  });
});
