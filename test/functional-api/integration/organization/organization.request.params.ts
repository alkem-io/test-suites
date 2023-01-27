import { organizationData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test//utils/graphql.request';
import { TestUser } from '@test//utils/token.helper';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);
export const organizationName = `testorghost${uniqueId}`;
export const hostNameId = `testorghost${uniqueId}`;

export const createOrganization = async (
  organizationName: string,
  textId: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateOrganization($organizationData: CreateOrganizationInput!) {
      createOrganization(organizationData: $organizationData) ${organizationData}
    }`,
    variables: {
      organizationData: {
        displayName: organizationName,
        nameID: textId,
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
        profileData: {
          referencesData: [
            {
              description: 'test ref',
              name: 'test ref neame',
              uri: 'https://testref.io',
            },
          ],
          tagsetsData: { name: 'tagName1', tags: 'test1' },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const deleteOrganization = async (organizationId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteOrganization($deleteData: DeleteOrganizationInput!) {
      deleteOrganization(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: organizationId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateOrganization = async (
  organizationId: string,
  organizationName?: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string,
  profileData?: {
    ID: string;
    location?: { country?: string; city?: string };
    description?: string;
  }
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateOrganization($organizationData: UpdateOrganizationInput!) {
      updateOrganization(organizationData: $organizationData) ${organizationData}
    }`,
    variables: {
      organizationData: {
        ID: organizationId,
        displayName: organizationName,
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
        profileData,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOrganizationData = async (
  organizationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{organization(ID: "${organizationId}") ${organizationData}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getOrganizationsData = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{organizations ${organizationData}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
