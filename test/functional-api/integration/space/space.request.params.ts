import {
  spaceData,
  communityAvailableMemberUsersData,
  communityAvailableLeadUsersData,
  spaces,
} from '../../../utils/common-params';
import { graphqlRequestAuth, mutation } from '../../../utils/graphql.request';
import {
  createSpace,
  spaceVariablesData,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';

export enum SpaceVisibility {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEMO = 'DEMO',
}

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const spaceName = `testEcoName${uniqueId}`;
export const spaceNameId = `testecoeid${uniqueId}`;

export const createSpaceMutation = async (
  spaceName: string,
  spaceNameID: string,
  hostID: string
) => {
  return await mutation(
    createSpace,
    spaceVariablesData(spaceName, spaceNameID, hostID)
  );
};

export const createTestSpace = async (
  spaceName: string,
  spaceNameId: string,
  hostId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createSpace($spaceData: CreateSpaceInput!) {
      createSpace(spaceData: $spaceData) {${spaceData}}
    }`,
    variables: {
      spaceData: {
        nameID: spaceNameId,
        hostID: hostId,
        profileData: {
          displayName: spaceName,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSpacesData = async () => {
  const requestParams = {
    operationName: null,
    query: 'query{spaces{id nameID}}',
    variables: null,
  };
  const spacesData = await graphqlRequestAuth(
    requestParams,
    TestUser.GLOBAL_ADMIN
  );

  return spacesData;
};

export const getSpacesCount = async () => {
  const res = await getSpacesData();
  const spacesData = res.body.data.spaces;
  const count = Object.keys(spacesData[0]).length;
  return count;
};

export const getSpaceDataId = async () => {
  const spaces = await getSpacesData();
  const spacesArray = spaces.body.data.spaces;
  function spacesData(entity: { nameID: string }) {
    return entity.nameID === spaceNameId;
  }
  const spaceId = spacesArray.find(spacesData).id;
  return spaceId;
};

export const getSpaceData = async (
  nameId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${nameId}") {${spaceData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const spaceId = async (): Promise<any> => {
  const responseQuery = await getSpaceData();

  const response = responseQuery.body.data.space.id;
  return response;
};

export const removeSpace = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteSpace($deleteData: DeleteSpaceInput!) {
      deleteSpace(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: spaceId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getSpaceCommunityAvailableMemberUsersData = async (
  nameId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${nameId}") {${communityAvailableMemberUsersData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const getSpaceCommunityAvailableLeadUsersData = async (
  nameId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${nameId}") {${communityAvailableLeadUsersData}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const getPostTemplateForSpaceByPostType = async (
  spaceId: string,
  postType: string
) => {
  const templatesPerSpace = await getSpaceData(spaceId);
  const allTemplates =
    templatesPerSpace.body.data.space.templates.postTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === postType;
  });

  return filteredTemplate;
};

export const updateSpaceVisibility = async (
  spaceID: string,
  visibility: SpaceVisibility = SpaceVisibility.ACTIVE,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateSpacePlatformSettings($updateData: UpdateSpacePlatformSettingsInput!) {
      updateSpacePlatformSettings(updateData: $updateData) {
        ${spaceData}
      }
    }`,
    variables: {
      updateData: {
        spaceID,
        visibility,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSpacesVisibility = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
          spaces(filter: {visibilities: [ARCHIVED, ACTIVE, DEMO]}) {
            ${spaceData}
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getUserRoleSpacesVisibility = async (
  userID: string,
  filterVisibility: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      rolesUser(rolesData: {userID: "${userID}", filter: {visibilities: [${filterVisibility}]}}) {
          ${spaces}
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
