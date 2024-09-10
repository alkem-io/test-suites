import '@test/utils/array.matcher';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { TestUser } from '@test/utils';
import {
  createSpaceAndGetData,
  createSpaceBasicDataCodegen,
  deleteSpaceCodegen,
  getSpaceDataCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { entitiesId } from '../roles/community/communications-helper';
import { users } from '@test/utils/queries/users-data';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let spaceId = '';
let spaceIdn: string;
let spaceId1: string;
let spaceId2: string;
let spaceId3: string;
let spaceId4: string;

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

describe('Limits on account resources creation', () => {
  // afterEach(async () => {
  //   await deleteSpaceCodegen(spaceId);
  // });
  describe('Global Admin space creation', () => {
    // afterEach(async () => {
    //   await deleteSpaceCodegen(spaceId);
    // });
    test.each`
      userRole | spaceName
      ${1}     | ${`space1-${uniqueId}`}
      ${2}     | ${`space2-${uniqueId}`}
      ${3}     | ${`space3-${uniqueId}`}
      ${3}     | ${`space4-${uniqueId}`}
    `(
      'User: Global Admin creates a space with name: $spaceName',
      async ({ spaceName }) => {
        // Act
        const createSpace = await createSpaceBasicDataCodegen(
          spaceName,
          spaceNameId,
          users.globalAdmin.accountId,
          TestUser.GLOBAL_ADMIN
        );
        console.log('createSpace', createSpace.error);
        spaceId = createSpace.data?.createSpace.id ?? '';

        const spaceData = await getSpaceDataCodegen(spaceId);

        // Assert
        expect(spaceData.data?.space.profile.displayName).toEqual(spaceName);
      }
    );
  });
  describe('Beta Tester space creation', () => {
    test.each`
      userRole | spaceName
      ${1}     | ${`space1-${uniqueId}`}
      ${2}     | ${`space2-${uniqueId}`}
      ${3}     | ${`space3-${uniqueId}`}
      ${3}     | ${`space4-${uniqueId}`}
    `(
      'User: Beta Tester creates a space with name: $spaceName',
      async ({ spaceName }) => {
        // Act
        const createSpace = await createSpaceBasicDataCodegen(
          spaceName,
          spaceName,
          users.betaTester.accountId,
          TestUser.BETA_TESTER
        );
        console.log('createSpace', createSpace.error);
        spaceId = createSpace.data?.createSpace.id ?? '';

        const spaceData = await getSpaceDataCodegen(spaceId);

        // Assert
        expect(spaceData.data?.space.profile.displayName).toEqual(spaceName);
      }
    );
  });

  describe.only('Non Space User space creation', () => {
    afterAll(async () => {
      await deleteSpaceCodegen(spaceId1);
    });
    test.each`
      userRole | spaceName               | spaceIdn    | message
      ${1}     | ${`space1-${uniqueId}`} | ${spaceId1} | ${spaceName}
      ${2}     | ${`space2-${uniqueId}`} | ${spaceId2} | ${spaceName}
      ${3}     | ${`space3-${uniqueId}`} | ${spaceId3} | ${spaceName}
      ${3}     | ${`space4-${uniqueId}`} | ${spaceId4} | ${'Soft limit of 3 reached'}
    `(
      'User: Non Space User creates a space with name: $spaceName',
      async ({ spaceName, spaceIdn }) => {
        // Act
        const createSpace = await createSpaceBasicDataCodegen(
          spaceName,
          spaceName,
          users.opportunityAdmin.accountId,
          TestUser.CHALLENGE_ADMIN
        );
        console.log('createSpace', createSpace.error);
        spaceId = createSpace.data?.createSpace.id ?? '';
        spaceId = spaceIdn;

        const spaceData = await getSpaceDataCodegen(spaceIdn);

        // Assert
        expect(spaceData).toContain(spaceName);
      }
    );
  });
});
