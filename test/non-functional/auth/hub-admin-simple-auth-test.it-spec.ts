import {
  assignEcoverseAdmin,
  removeUserAsEcoverseAdmin,
  userAsEcoverseAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createEcoverse,
  hubVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  updateEcoverse,
  updateEcoverseVariablesData,
} from '@test/utils/mutations/update-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '../../utils/graphql.request';
import {
  qaUserId,
  hubId,
  notAuthorizedCode,
  dataNull,
  forbiddenCode,
} from './common-auth-variables';

describe('Ecoverse Admin - authorization test suite', () => {
  beforeAll(async () => {
    await mutation(
      assignEcoverseAdmin,
      userAsEcoverseAdminVariablesData(qaUserId, hubId)
    );
  });

  afterAll(async () => {
    await mutation(
      removeUserAsEcoverseAdmin,
      userAsEcoverseAdminVariablesData(qaUserId, hubId)
    );
  });

  test.each`
    mutations         | mut                 | variables
    ${updateEcoverse} | ${'updateEcoverse'} | ${updateEcoverseVariablesData(hubId, 'newnameEA')}
  `(
    'Role hubAdmin get: $expectedOne, when run mutation: $mut',
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
    mutations         | mut                 | variables
    ${createEcoverse} | ${'createEcoverse'} | ${hubVariablesData('ecoxx-' + uniqueId, 'ecoxx-' + uniqueId, hubId)}
  `(
    "Role hubAdmin don't get: forbiddenCode, when run mutation: $mut",
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
