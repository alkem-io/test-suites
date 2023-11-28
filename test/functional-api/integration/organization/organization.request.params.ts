import { organizationData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test//utils/graphql.request';
import { TestUser } from '@test//utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

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
        nameID: textId,
        legalEntityName: legalEntityName,
        domain: domain,
        website: website,
        contactEmail: contactEmail,
        profileData: {
          displayName: organizationName,
          referencesData: [
            {
              description: 'test ref',
              name: 'test ref neame',
              uri: 'https://testref.io',
            },
          ],
          //tagsetsData: { name: 'tagName1', tags: 'test1' },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createOrganizationCodegen = async (
  organizationName: string,
  nameID: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.CreateOrganization(
      {
        organizationData: {
          nameID,
          legalEntityName,
          domain,
          website,
          contactEmail,
          profileData: {
            displayName: organizationName,
            referencesData: [
              {
                description: 'test ref',
                name: 'test ref neame',
                uri: 'https://testref.io',
              },
            ],
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
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

export const deleteOrganizationCodegen = async (organizationId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.deleteOrganization(
      {
        deleteData: {
          ID: organizationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const updateOrganization = async (
  organizationId: string,
  options?: {
    legalEntityName?: string;
    domain?: string;
    website?: string;
    contactEmail?: string;
    profileData?: {
      displayName?: string;
      tagline?: string;
      location?: { country?: string; city?: string };
      description?: string;
    };
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
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateOrganizationCodegen = async (
  organizationId: string,
  options?: {
    legalEntityName?: string;
    domain?: string;
    website?: string;
    contactEmail?: string;
    profileData?: {
      displayName?: string;
      tagline?: string;
      location?: { country?: string; city?: string };
      description?: string;
    };
  }
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.updateOrganization(
      {
        organizationData: {
          ID: organizationId,
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
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
