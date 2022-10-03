import {
  hubData,
  communityAvailableMemberUsersData,
  communityAvailableLeadUsersData,
  hubs,
} from '../../../utils/common-params';
import { graphqlRequestAuth, mutation } from '../../../utils/graphql.request';
import {
  createHub,
  hubVariablesData,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';

export enum HubVisibility {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEMO = 'DEMO',
}

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const hubName = `testEcoName${uniqueId}`;
export const hubNameId = `testecoeid${uniqueId}`;

export const createHubMutation = async (
  hubName: string,
  hubNameID: string,
  hostID: string
) => {
  return await mutation(
    createHub,
    hubVariablesData(hubName, hubNameID, hostID)
  );
};

export const createTestHub = async (
  hubName: string,
  hubNameId: string,
  hostId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createHub($hubData: CreateHubInput!) {
      createHub(hubData: $hubData) {${hubData}}
    }`,
    variables: {
      hubData: {
        displayName: hubName,
        nameID: hubNameId,
        hostID: hostId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getHubsData = async () => {
  const requestParams = {
    operationName: null,
    query: 'query{hubs{id nameID}}',
    variables: null,
  };
  const hubsData = await graphqlRequestAuth(
    requestParams,
    TestUser.GLOBAL_ADMIN
  );

  return hubsData;
};

export const getHubsCount = async () => {
  const res = await getHubsData();
  const hubsData = res.body.data.hubs;
  const count = Object.keys(hubsData[0]).length;
  return count;
};

export const getHubDataId = async () => {
  const hubs = await getHubsData();
  const hubsArray = hubs.body.data.hubs;
  function hubsData(entity: { nameID: string }) {
    return entity.nameID === hubNameId;
  }
  const hubId = hubsArray.find(hubsData).id;
  return hubId;
};

export const getHubData = async (
  nameId = hubNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${nameId}") {${hubData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const hubId = async (): Promise<any> => {
  const responseQuery = await getHubData();

  const response = responseQuery.body.data.hub.id;
  return response;
};

export const removeHub = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteHub($deleteData: DeleteHubInput!) {
      deleteHub(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: hubId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getHubCommunityAvailableMemberUsersData = async (
  nameId = hubNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${nameId}") {${communityAvailableMemberUsersData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const getHubCommunityAvailableLeadUsersData = async (
  nameId = hubNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${nameId}") {${communityAvailableLeadUsersData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const getAspectTemplateForHubByAspectType = async (
  hubId: string,
  aspectType: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates = templatesPerHub.body.data.hub.templates.aspectTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === aspectType;
  });

  return filteredTemplate;
};

export const updateHubVisibility = async (
  hubID: string,
  visibility: HubVisibility = HubVisibility.ACTIVE,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateHubVisibility($visibilityData: UpdateHubVisibilityInput!) {
      updateHubVisibility(visibilityData: $visibilityData) {
        ${hubData}
      }
    }`,
    variables: {
      visibilityData: {
        hubID,
        visibility,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getHubsVisibility = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
          hubs(filter: {visibilities: [ARCHIVED, ACTIVE, DEMO]}) {
            ${hubData}
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getUserRoleHubsVisibility = async (
  userID: string,
  filterVisibility: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      rolesUser(rolesData: {userID: "${userID}", filter: {visibilities: [${filterVisibility}]}}) {
          ${hubs}
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
