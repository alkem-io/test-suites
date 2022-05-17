import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { membersAndLeadsData } from '@test/utils/common-params';

export const createGroupOnCommunity = async (
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
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getCommunityData = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") {
              id
              community {id  ${membersAndLeadsData}}
              challenges {community{id ${membersAndLeadsData}}}
            }
          }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
