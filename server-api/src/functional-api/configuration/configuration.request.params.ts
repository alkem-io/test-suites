import { getGraphqlClient, setAuthHeader } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const fullConfiguration = async () => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.fullConfiguration({}, setAuthHeader(authToken));

  return graphqlErrorWrapper(callback);
};
