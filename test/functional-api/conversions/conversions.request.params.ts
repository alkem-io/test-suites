import { TestUser } from '@test/utils';
import { spaceData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const convertChallengeToSpace = async (challengeID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation ConvertChallengeToSpace($convertData: ConvertChallengeToSpaceInput!) {
      convertChallengeToSpace(convertData: $convertData) {
        ${spaceData}
      }
    }`,
    variables: {
      convertData: {
        challengeID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
