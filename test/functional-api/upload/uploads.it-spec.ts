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
  uploadFileOnRef,
  uploadImageOnVisual,
} from './upload.params';
import path from 'path';
import {
  deleteReference,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
let orgProfileId = '';
let refId = '';
const refname = 'refname' + uniqueId;
let orgId = '';
let visualId = '';
let documentEndPoint: any;
let documentId = '';
let referenceUri = '';
let visualUri: any;

function getLastPartOfUrl(url: string): string {
  return url.substring(url.lastIndexOf('/') + 1);
}

async function getReferenceUri(orgId: string): Promise<string> {
  const orgData = await getOrgReferenceUri(orgId);
  const referenceUri = orgData.body.data.organization.profile.references[0].uri;
  return referenceUri;
}

async function getVisualUri(orgId: string): Promise<string> {
  const orgData = await getOrgVisualUri(orgId);
  const visualUri = orgData.body.data.organization.profile.visuals[0].uri;
  return visualUri;
}

beforeAll(async () => {
  const res = await createOrganization(organizationName, hostNameId);
  const orgData = res.body.data.createOrganization;
  orgId = orgData.id;
  orgProfileId = orgData.profile.id;
  const ref = orgData.profile.references[0].id;
  await mutation(deleteReference, deleteVariablesData(ref));
  visualId = orgData.profile.visuals[0].id;
});
afterAll(async () => await deleteOrganization(orgId));

describe('Upload document', () => {
  beforeAll(async () => {
    const createRef = await mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(orgProfileId, refname),

      TestUser.GLOBAL_ADMIN
    );
    refId = createRef.body.data.createReferenceOnProfile.id;
  });

  afterAll(async () => {
    await mutation(deleteReference, deleteVariablesData(refId));
  });

  afterEach(async () => {
    await deleteDocument(documentId);
  });

  describe('DDT upload all file types', () => {
    afterEach(async () => {
      await deleteDocument(documentId);
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
      path.join(__dirname, 'files-to-upload', 'image.png'),
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

  test('upload file bigger than 10 MB', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'big_file.jpg'),
      refId
    );
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
  afterEach(async () => {
    await deleteDocument(documentId);
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
      visualId
    );
    expect('a').toEqual('a');
  });
});
