import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { challengeDataTest } from '@test/utils/common-params';
import { ecoverseId } from '../ecoverse/ecoverse.request.params';

export const getContextQuery = async (
  challengeId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse(ID: "${await ecoverseId()}") {challenge(ID: "${challengeId}") {${challengeDataTest}}}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

