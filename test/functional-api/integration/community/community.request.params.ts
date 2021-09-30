import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import {
  ecoverseNameId,
} from '../ecoverse/ecoverse.request.params';


export const createGroupOnCommunityMutation = async (
  communityId: any,
  groupNameText: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnCommunity($groupData: CreateUserGroupInput!) {
      createGroupOnCommunity(groupData: $groupData) {
        name,
        id
        members {
          nameID
        }
        profile{
          id
        }
      }
    }`,
    variables: {
      groupData: {
        name: groupNameText,
        parentID: communityId,
        profileData: {
          description: 'some description',
          avatar: 'http://someUri',
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getCommunityData = async (ecoverseId = ecoverseNameId) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse(ID: "${ecoverseId}") {
              id
              community {id  members {id}}
              challenges {community{id members {id}}}
            }
          }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
