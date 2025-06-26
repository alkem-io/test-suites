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
import {
  createReferenceOnProfile,
  deleteReferenceOnProfile,
} from '../references/references.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '../journey/space/space.request.params';

import { lookupProfileVisuals } from '@functional-api/lookup/lookup-request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  getAuthDocument,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
const uniqueId = UniqueIDGenerator.getID();
const isTravis = process.env.TRAVIS === 'true';

let refId = '';
let visualId = '';
let documentEndPoint: string | undefined = '';
let documentId = '';
let referenceUri = '';
let visualUri: string = '';
let innovationHubId = '';

function getLastPartOfUrl(url: string | undefined): string {
  if (!url) throw new Error('URL is not defined');
  const id = url.substring(url.lastIndexOf('/') + 1);
  return id;
}

async function getReferenceUri(orgId: string): Promise<string> {
  const orgData = await getOrgReferenceUri(orgId);
  const referencesUri = orgData?.data?.organization?.profile?.references ?? [];
  const referenceUri = referencesUri.filter((referenceUri: { uri: string }) =>
    referenceUri.uri.includes('/api/private/rest/storage/document')
  );
  return referenceUri[0]?.uri ?? '';
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
let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'storage-files-to-upload',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Upload document', () => {
  beforeAll(async () => {
    const createRef = await createReferenceOnProfile(
      baseScenario.organization.profile.id
    );
    refId = createRef?.data?.createReferenceOnProfile.id ?? '';
  });

  afterAll(async () => {
    await deleteReferenceOnProfile(refId);
  });

  describe('DDT upload all file types', () => {
    afterEach(async () => {
      if (documentId && documentId.length === 36) {
        await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
        documentId = '';
      }
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
        documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';

        documentId = getLastPartOfUrl(documentEndPoint);
        referenceUri = await getReferenceUri(baseScenario.organization.id);

        expect(referenceUri).toEqual(documentEndPoint);
      }
    );
  });

  test('DDT upload all file types', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );

    documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
    documentId = getLastPartOfUrl(documentEndPoint);
    referenceUri = await getReferenceUri(baseScenario.organization.id);

    expect(referenceUri).toEqual(documentEndPoint);
  });

  test('upload same file twice', async () => {
    const ref1 = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    const documentEndPoint1 = ref1.data?.uploadFileOnReference?.uri;

    const ref2 = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    const documentEndPoint2 = ref2.data?.uploadFileOnReference?.uri ?? '';

    documentId = getLastPartOfUrl(documentEndPoint2);
    referenceUri = await getReferenceUri(baseScenario.organization.id);

    expect(referenceUri).toEqual(documentEndPoint1);
    expect(referenceUri).toEqual(documentEndPoint2);
  });

  test('delete pdf file', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'doc.pdf'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
    documentId = getLastPartOfUrl(documentEndPoint);

    await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
    const resDelete = await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);

    expect(resDelete.error?.errors[0].message).toContain(
      `Not able to locate document with the specified ID: ${documentId}`
    );
  });

  if (!isTravis) {
    test('read uploaded file', async () => {
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
      documentId = getLastPartOfUrl(documentEndPoint);

      const documentAccess = await getAuthDocument(
        documentId,
        TestUser.GLOBAL_ADMIN
      );
      expect(documentAccess.status).toEqual(200);
    });

    test('fail to read file after document deletion', async () => {
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );
      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
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
        baseScenario.organization.profile.id,
        'test2'
      );
      const refId2 = refData?.data?.createReferenceOnProfile?.id ?? '';
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId2
      );
      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
      documentId = getLastPartOfUrl(documentEndPoint);
      await deleteReferenceOnProfile(refId2);
      const documentAccess = await getAuthDocument(
        documentId,
        TestUser.GLOBAL_ADMIN
      );
      expect(documentAccess.status).toEqual(200);
    });
  } else {
    test.skip('read uploaded file', async () => {
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );

      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
      documentId = getLastPartOfUrl(documentEndPoint);

      const documentAccess = await getAuthDocument(
        documentId,
        TestUser.GLOBAL_ADMIN
      );
      expect(documentAccess.status).toEqual(200);
    });

    test.skip('fail to read file after document deletion', async () => {
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId
      );
      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
      documentId = getLastPartOfUrl(documentEndPoint);

      await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
      const documentAccess = await getAuthDocument(
        documentId,
        TestUser.GLOBAL_ADMIN
      );
      expect(documentAccess.status).toEqual(404);
    });

    test.skip('read uploaded file after related reference is removed', async () => {
      const refData = await createReferenceOnProfile(
        baseScenario.organization.profile.id,
        'test2'
      );
      const refId2 = refData?.data?.createReferenceOnProfile?.id ?? '';
      const res = await uploadFileOnRef(
        path.join(__dirname, 'files-to-upload', 'image.png'),
        refId2
      );
      documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
      documentId = getLastPartOfUrl(documentEndPoint);
      await deleteReferenceOnProfile(refId2);
      const documentAccess = await getAuthDocument(
        documentId,
        TestUser.GLOBAL_ADMIN
      );
      expect(documentAccess.status).toEqual(200);
    });
  }

  test('upload file bigger than 15 MB', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', '19mb.png'),
      refId
    );
    referenceUri = await getReferenceUri(baseScenario.organization.id);

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
    referenceUri = await getReferenceUri(baseScenario.organization.id);

    expect(JSON.stringify(res?.errors)).toContain(
      'Upload on reference or link failed!'
    );
  });

  test('file is available after releted reference is deleted', async () => {
    const res = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    documentEndPoint = res.data?.uploadFileOnReference?.uri || 'not found';
    documentId = getLastPartOfUrl(documentEndPoint);

    await deleteReferenceOnProfile(refId);

    const resDelete = await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);

    expect(resDelete?.data?.deleteDocument.id).toEqual(documentId);
  });
});

describe('Upload visual tests', () => {
  beforeAll(async () => {
    const visualData = await lookupProfileVisuals(
      baseScenario.organization.profile.id
    );
    visualId = visualData.data?.lookup.profile?.visuals[0].id ?? '';
  });
  afterEach(async () => {
    if (documentId && documentId.length === 36) {
      await deleteDocument(documentId, TestUser.GLOBAL_ADMIN);
      documentId = '';
    }
  });

  test('upload visual', async () => {
    const res = await uploadImageOnVisual(
      path.join(__dirname, 'files-to-upload', '190-410.jpg'),
      visualId
    );
    documentEndPoint = res.data?.uploadImageOnVisual?.uri || 'not found';
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUri(baseScenario.organization.id);
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
    documentEndPoint = res?.data?.uploadImageOnVisual?.uri || 'not found';
    documentId = getLastPartOfUrl(documentEndPoint);
    visualUri = await getVisualUri(baseScenario.organization.id);
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
  if (!isTravis) {
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
  } else {
    test.skip('read uploaded visual', async () => {
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
  }
});

describe('Upload visual to innovation space', () => {
  const spaceName = 'space-name' + uniqueId;
  let innovationHubVisualId = '`';
  let spaceId = '';
  beforeAll(async () => {
    const resSpace = await createSpaceAndGetData(
      spaceName,
      spaceName,
      baseScenario.organization.accountId
    );
    const spaceData = resSpace?.data?.lookup?.space;
    spaceId = spaceData?.id ?? '';

    const innovationHubData = await createInnovationHub(
      baseScenario.organization.accountId
    );
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
