import { TestUser } from '@test/utils';
import { hubData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const convertChallengeToHub = async (challengeID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation ConvertChallengeToHub($convertData: ConvertChallengeToHubInput!) {
      convertChallengeToHub(convertData: $convertData) {
        ${hubData}
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
