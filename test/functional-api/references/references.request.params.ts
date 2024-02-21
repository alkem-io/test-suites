import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { TestUser } from '@test/utils/token.helper';

export const createReferenceOnProfileCodegen = async (
  profileID: string,
  name?: string | 'Ref name new',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateReferenceOnProfile(
      {
        referenceInput: {
          profileID,
          name: name || 'Ref name new',
          uri: 'https://testref.io',
          description: 'Reference description',
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteReferenceOnProfileCodegen = async (
  profileID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteReference(
      {
        deleteData: {
          ID: profileID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
