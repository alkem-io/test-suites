import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { challengeDataTest } from '@test/utils/common-params';
import { hubId } from '../hub/hub.request.params';

export const getContextQuery = async (hubId: string, challengeId?: string) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${hubId}") {challenge(ID: "${challengeId}") {${challengeDataTest}}}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
