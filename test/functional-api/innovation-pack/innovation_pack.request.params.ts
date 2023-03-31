import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createInnovationPackOnLibrary = async (
  displayName: string,
  nameID: string,
  providerID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createInnovationPackOnLibrary(
      $data: CreateInnovationPackOnLibraryInput!
    ) {
      createInnovationPackOnLibrary(packData: $data) {
        id
        nameID
        provider {
          id
          nameID
        }
        templates {
          id
          postTemplates {
            id
          }
          whiteboardTemplates {
            id
          }
          whiteboardTemplates {
            id
          }
        }
      }
    }`,
    variables: {
      data: {
        profileData: { displayName },
        nameID,
        providerID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
