import {
  assignChallengeAdmin,
  removeUserAsChallengeAdmin,
  userAsChallengeAdminVariablesData,
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
  challengeId,
  hubId,
  notAuthorizedCode,
  dataNull,
  forbiddenCode,
  userNotRegistered,
} from './common-auth-variables';

describe('Challenge Admin - authorization test suite', () => {
  beforeAll(async () => {
    await mutation(
      assignChallengeAdmin,
      userAsChallengeAdminVariablesData(qaUserId, challengeId)
    );
  });

  afterAll(async () => {
    await mutation(
      removeUserAsChallengeAdmin,
      userAsChallengeAdminVariablesData(qaUserId, challengeId)
    );
  });

  test.each`
    mutations         | mut                 | variables                                                          | expected
    ${createEcoverse} | ${'createEcoverse'} | ${hubVariablesData('ecox-' + uniqueId, 'ecox-' + uniqueId, hubId)} | ${notAuthorizedCode}
    ${updateEcoverse} | ${'updateEcoverse'} | ${updateEcoverseVariablesData(hubId, 'newnameCA')}                 | ${notAuthorizedCode}
  `(
    'Role challengeAdmin get: $expected, when run mutation: $mut',
    async ({ mutations, variables, expected }) => {
      const response = await mutation(mutations, variables, TestUser.QA_USER);

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(dataNull);
      expect(responseData).not.toContain(expected);
      expect(responseData).toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    }
  );
});
