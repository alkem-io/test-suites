import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { referencesData } from '@test/utils/common-params';

export const createReferenceOnContext = async (
  contextId: any,
  refName: string,
  refUri?: string,
  refDescription?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createReferenceOnContext($referenceInput: CreateReferenceOnContextInput!) {
      createReferenceOnContext(referenceInput: $referenceInput) {
        ${referencesData}
      }
    }`,
    variables: {
      referenceInput: {
        contextID: contextId,
        name: `${refName}`,
        uri: `${refUri}`,
        description: `${refDescription}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeReference = async (referenceId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteReference($deleteData: DeleteReferenceInput!) {
      deleteReference(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: referenceId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};