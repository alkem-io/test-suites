import { organisationData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test//utils/graphql.request';
import { TestUser } from '@test//utils/token.helper';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);
export const organisationName = `testorghost${uniqueId}`;
export const hostNameId = `testorghost${uniqueId}`;

export const createOrganisationMutation = async (
  organisationName: string,
  textId: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string
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
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
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

export const updateOrganisationMutation = async (
  organisationId: string,
  organisationName?: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateOrganisation($organisationData: UpdateOrganisationInput!) {
      updateOrganisation(organisationData: $organisationData) ${organisationData}
    }`,
    variables: {
      organisationData: {
        ID: organisationId,
        displayName: organisationName,
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrganisationData = async (organisationId: string) => {
  const requestParams = {
    operationName: null,
    query: `query{organisation(ID: "${organisationId}") ${organisationData}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
