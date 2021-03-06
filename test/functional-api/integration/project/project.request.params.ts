import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { projectData } from '@test/utils/common-params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

export const projectNameId = `projectNaId${uniqueId}`;
export const createProject = async (
  opportunityId: string,
  projectName: string,
  nameId: string,
  projectDescritpion?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateProject($projectData: CreateProjectInput!) {
      createProject(projectData: $projectData) {
        ${projectData}
      }
    }`,
    variables: {
      projectData: {
        opportunityID: opportunityId,
        displayName: `${projectName}`,
        nameID: `${nameId}`,
        description: `${projectDescritpion}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeProject = async (projectId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteProject($deleteData: DeleteProjectInput!) {
      deleteProject(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: projectId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getProjectData = async (hubId: string, projectId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub(ID: "${hubId}" ) {project (ID: "${projectId}") {${projectData}} }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
