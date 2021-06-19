import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { organisationData } from '@test/utils/common-params';

let uniqueId = Math.random()
  .toString(12)
  .slice(-6);
export const organisationName = `testOrgHost${uniqueId}`;
export const hostNameId = `testOrgHost${uniqueId}`;

export const createOrganisationMutation = async (
  organisationName: string,
  textId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateOrganisation($organisationData: CreateOrganisationInput!) {
      createOrganisation(organisationData: $organisationData) ${organisationData}
    }`,
    variables: {
      organisationData: {
        displayName: organisationName,
        nameID: textId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const deleteOrganisationMutation = async (organisationId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteOrganisation($deleteData: DeleteOrganisationInput!) {
      deleteOrganisation(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: organisationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrganisationData = async (organisationId:string) => {
  const requestParams = {
    operationName: null,
    query: `query{organisation(ID: "${organisationId}") ${organisationData}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
