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
import { uploadFileOnRef, uploadFileOnReff } from './upload.params';

const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
let orgProfileId = '';
let refId = '';
const refname = 'refname' + uniqueId;

describe('Upload', () => {
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

  test('upload file', async () => {
    const a = await uploadFileOnRef(
      '/home/como/repos/test-suites/test/functional-api/upload/files-to-upload/image.png',
      refId
    );
    console.log(a);
    expect('a').toEqual('a');
  });
});
