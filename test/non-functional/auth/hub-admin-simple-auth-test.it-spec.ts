import {
  assignSpaceAdmin,
  removeUserAsSpaceAdmin,
  userAsSpaceAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createSpace,
  spaceVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  updateSpace,
  updateSpaceVariablesData,
} from '@test/utils/mutations/update-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '../../utils/graphql.request';
import {
  qaUserId,
  spaceId,
  notAuthorizedCode,
  dataNull,
  forbiddenCode,
} from './common-auth-variables';

describe('Space Admin - authorization test suite', () => {
  beforeAll(async () => {
    await mutation(
      assignSpaceAdmin,
      userAsSpaceAdminVariablesData(qaUserId, spaceId)
    );
  });

  afterAll(async () => {
    await mutation(
      removeUserAsSpaceAdmin,
      userAsSpaceAdminVariablesData(qaUserId, spaceId)
    );
  });

  test.each`
    mutations      | mut              | variables
    ${updateSpace} | ${'updateSpace'} | ${updateSpaceVariablesData(spaceId, 'newnameEA')}
  `(
    'Role spaceAdmin get: $expectedOne, when run mutation: $mut',
    async ({ mutations, variables }) => {
      const response = await mutation(mutations, variables, TestUser.QA_USER);

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(response.body.data).not.toEqual(dataNull);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(notAuthorizedCode);
    }
  );

  test.each`
    mutations      | mut              | variables
    ${createSpace} | ${'createSpace'} | ${spaceVariablesData('ecoxx-' + uniqueId, 'ecoxx-' + uniqueId, spaceId)}
  `(
    "Role spaceAdmin don't get: forbiddenCode, when run mutation: $mut",
    async ({ mutations, variables }) => {
      const response = await mutation(mutations, variables, TestUser.QA_USER);

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(dataNull);
      expect(responseData).toContain(forbiddenCode);
      expect(responseData).not.toContain(notAuthorizedCode);
    }
  );
});
