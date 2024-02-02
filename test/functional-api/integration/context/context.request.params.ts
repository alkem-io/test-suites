import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { challengeDataTest } from '@test/utils/common-params';

export const getContextQuery = async (
  spaceId: string,
  challengeId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${spaceId}") {challenge(ID: "${challengeId}") {${challengeDataTest}}}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
