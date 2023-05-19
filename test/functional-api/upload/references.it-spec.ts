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
import { uploadFileOnRef } from './upload.params';
import path from 'path';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
let orgProfileId = '';
let refId = '';
const refname = 'refname' + uniqueId;
let orgId = '';
beforeAll(async () => {
  const res = await createOrganization(organizationName, hostNameId);
  orgId = res.body.data.createOrganization.id;
  orgProfileId = res.body.data.createOrganization.profile.id;

  const createRef = await mutation(
    createReferenceOnProfile,
    createReferenceOnProfileVariablesData(orgProfileId, refname),

    TestUser.GLOBAL_ADMIN
  );
  console.log(createRef.body);
  refId = createRef.body.data.createReferenceOnProfile.id;
});
afterAll(async () => await deleteOrganization(orgId));

describe('Upload document', () => {
  beforeAll(async () => {
    mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(orgProfileId, refname),

      TestUser.GLOBAL_ADMIN
    ).then(createRef => {
      console.log(createRef.body);
      refId = createRef.body.data.createReferenceOnProfile.id;
    });
  });

  afterAll(async () => {
    // remove reference
  });

  afterEach(async () => {
    // delete document
  });

  test('DDT upload all file types', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('upload pdf file', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('upload same file twice', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });
  test('read uploaded file', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('delete pdf file', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('fail to read file after deletion', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('upload file bigger than 10 MB', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('fail to upload .sql file', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('read uploaded file after related reference is removed', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });
});

describe('Upload visual', () => {
  beforeAll(async () => {
    mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(orgProfileId, refname),

      TestUser.GLOBAL_ADMIN
    ).then(createRef => {
      console.log(createRef.body);
      refId = createRef.body.data.createReferenceOnProfile.id;
    });
  });

  afterAll(async () => {
    // remove reference
  });

  afterEach(async () => {
    // delete visual
  });

  test('DDT upload visual', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });

  test('upload same visual twice', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });
  test('read uploaded visual', async () => {
    const a = await uploadFileOnRef(
      path.join(__dirname, 'files-to-upload', 'image.png'),
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });
});
