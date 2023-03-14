import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  actorData,
  actorGrpupData,
  applicationData,
  aspectData,
  challengeDataTest,
  hubData,
  opportunityData,
  organizationData,
  projectData,
  referencesData,
  relationsData,
  userData,
} from '../common-params';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createUser = `
  mutation createUser($userData: CreateUserInput!) {
    createUser(userData: $userData) {
      ${userData}
    }
  }`;

// experiment
export const testCreateChal = (
  challengeName: string,
  nameId: string,
  parentId: any
) => {
  const requestParams = {
    operationName: null,
    query: `
      mutation createChallenge($challengeData: CreateChallengeOnHubInput!) {
        createChallenge(challengeData: $challengeData) {
          ${challengeDataTest}
        }
      }`,
    variables: {
      challengeData: {
        displayName: challengeName,
        nameID: nameId,
        hubID: parentId,
        tags: 'testTags',
        context: {
          tagline: 'test tagline' + uniqueId,
          background: 'test background' + uniqueId,
          vision: 'test vision' + uniqueId,
          impact: 'test impact' + uniqueId,
          who: 'test who' + uniqueId,
          references: [
            {
              name: 'test video' + uniqueId,
              uri: 'https://youtu.be/-wGlzcjs',
              description: 'dest description' + uniqueId,
            },
          ],
        },
      },
    },
  };

  return requestParams;
};

export const createUserVariablesData = (userName: string) => {
  const variables = {
    userData: {
      firstName: `fN${uniqueId}`,
      lastName: `lN${uniqueId}`,
      displayName: userName,
      nameID: userName,
      email: `${userName}@test.com`,
      profileData: {
        description: 'x',
        avatar: 'http://xProf.com',
        tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
        referencesData: {
          name: 'x',
          description: 'x',
          uri: 'https://xRef.com',
        },
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createApplication = `
mutation createApplication($applicationData: CreateApplicationInput!) {
  createApplication(applicationData:$applicationData) {${applicationData}}
  }`;

export const createApplicationVariablesData = (
  communityId: string,
  userid: string
) => {
  const variables = {
    applicationData: {
      parentID: communityId,
      userID: userid,
      questions: [{ name: 'Test Question 1', value: 'Test answer' }],
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createOrganization = `
  mutation CreateOrganization($organizationData: CreateOrganizationInput!) {
    createOrganization(organizationData: $organizationData) ${organizationData}
  }`;

export const organizationVariablesData = (
  displayName: string,
  nameID: string
) => {
  const variables = {
    organizationData: {
      displayName,
      nameID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createHub = `
mutation createHub($hubData: CreateHubInput!) {
  createHub(hubData: $hubData) {${hubData}}
}`;

export const hubVariablesData = (
  hubName: string,
  hubNameId: string,
  hostId: string
) => {
  const variables = {
    hubData: {
      displayName: hubName,
      nameID: hubNameId,
      hostID: hostId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChallenge = `
mutation createChallenge($challengeData: CreateChallengeOnHubInput!) {
  createChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;

export const challengeVariablesData = (
  displayName: string,
  nameId: string,
  parentId: string
) => {
  const variables = {
    challengeData: {
      nameID: nameId,
      hubID: parentId,
      profileData: {
        displayName,
        tagline: 'test tagline' + uniqueId,
        description: 'test description' + uniqueId,
        referencesData: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      context: {
        vision: 'test vision' + uniqueId,
        impact: 'test impact' + uniqueId,
        who: 'test who' + uniqueId,
      },
      innovationFlowTemplateID: entitiesId.hubLifecycleTemplateChId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChildChallenge = `
mutation createChildChallenge($childChallengeData: CreateChallengeOnChallengeInput!) {
  createChildChallenge(challengeData: $childChallengeData) {
    ${challengeDataTest}
  }
}`;

export const childChallengeVariablesData = (
  displayName: string,
  nameId: string,
  parentId: string
) => {
  const variables = {
    childChallengeData: {
      nameID: nameId,
      hubID: parentId,
      profileData: {
        displayName,
        tagline: 'test tagline' + uniqueId,
        description: 'test description' + uniqueId,
        referencesData: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      context: {
        tagline: 'test tagline' + uniqueId,
        background: 'test background' + uniqueId,
        vision: 'test vision' + uniqueId,
        impact: 'test impact' + uniqueId,
        who: 'test who' + uniqueId,
        references: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      innovationFlowTemplateID: entitiesId.hubLifecycleTemplateChId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createOpportunity = `
mutation createOpportunity($opportunityData: CreateOpportunityInput!) {
  createOpportunity(opportunityData: $opportunityData) {
    ${opportunityData}
  }
}`;

export const opportunityVariablesData = (
  displayName: string,
  nameId: string,
  challengeId?: string
) => {
  const variables = {
    opportunityData: {
      challengeID: challengeId,
      nameID: nameId,
      profileData: {
        displayName,
        tagline: 'test tagline' + uniqueId,
        description: 'test description' + uniqueId,
        referencesData: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      context: {
        vision: 'test vision' + uniqueId,
        impact: 'test impact' + uniqueId,
        who: 'test who' + uniqueId,
      },
      innovationFlowTemplateID: entitiesId.hubLifecycleTemplateOppId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createProject = `
mutation CreateProject($projectData: CreateProjectInput!) {
  createProject(projectData: $projectData) {
    ${projectData}
  }
}`;

export const projectVariablesData = (
  opportunityId: string,
  projectName: string,
  nameId: string
) => {
  const variables = {
    projectData: {
      opportunityID: opportunityId,
      displayName: projectName,
      nameID: nameId,
      description: 'projectDescritpion',
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createAspect = `
mutation CreateAspect($aspectData: CreateAspectInput!) {
  createAspect(aspectData: $aspectData)  {
    ${aspectData}
  }
}`;

export const aspectVariablesData = (
  opportunityContextId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const variables = {
    aspectData: {
      parentID: opportunityContextId,
      title: aspectTitle,
      framing: aspectFraming,
      explanation: 'aspectExplenation',
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createActorGroup = `
mutation createActorGroup($actorGroupData: CreateActorGroupInput!) {
  createActorGroup(actorGroupData: $actorGroupData){
      ${actorGrpupData}
    }
  }`;

export const actorGroupVariablesData = (
  ecosystemModelId: string,
  actorGroupName: string,
  actorDescritpion?: string
) => {
  const variables = {
    actorGroupData: {
      ecosystemModelID: ecosystemModelId,
      name: actorGroupName,
      description: 'actorDescritpion',
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createActor = `
mutation createActor($actorData: CreateActorInput!) {
  createActor(actorData: $actorData) {
      ${actorData}
      }
    }`;

export const actorVariablesData = (
  actorGroupId: string,
  actorName: string,
  actorDescritpion?: string,
  actorValue?: string,
  actorImpact?: string
) => {
  const variables = {
    actorData: {
      actorGroupID: actorGroupId,
      name: actorName,
      description: actorDescritpion,
      value: actorValue,
      impact: actorImpact,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createGroupOnOrganization = `
mutation createGroupOnOrganization($groupData: CreateUserGroupInput!) {
  createGroupOnOrganization(groupData: $groupData) {
    id
    name
  }
}`;

export const groupOnOrganizationVariablesData = (
  testGroup: string,
  organizationId: string
) => {
  const variables = {
    groupData: {
      name: testGroup,
      parentID: organizationId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createGroupOnCommunity = `
mutation createGroupOnCommunity($groupData: CreateUserGroupInput!) {
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
}`;

export const groupOncommunityVariablesData = (
  communityId: string,
  groupNameText: string
) => {
  const variables = {
    groupData: {
      name: groupNameText,
      parentID: communityId,
      profileData: {
        description: 'some description',
        avatar: 'http://someUri',
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createReferenceOnContext = `
mutation createReferenceOnContext($referenceInput: CreateReferenceOnContextInput!) {
  createReferenceOnContext(referenceInput: $referenceInput) {
    ${referencesData}
  }
}`;

export const createReferenceOnContextVariablesData = (
  contextId: string,
  refName: string,
  refUri?: string,
  refDescription?: string
) => {
  const variables = {
    referenceInput: {
      contextID: contextId,
      name: `${refName}`,
      uri: `${refUri}`,
      description: `${refDescription}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createReferenceOnProfile = `
mutation createReferenceOnProfile($referenceInput: CreateReferenceOnProfileInput!) {
  createReferenceOnProfile(referenceInput: $referenceInput) {
    ${referencesData}
  }
}`;

export const createReferenceOnProfileVariablesData = (
  profileId: string,
  refName: string,
  refUri?: string,
  refDescription?: string
) => {
  const variables = {
    referenceInput: {
      profileID: profileId,
      name: `${refName}`,
      uri: `${refUri}`,
      description: `${refDescription}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createTagsetOnProfile = `
mutation createTagsetOnProfile($tagsetData: CreateTagsetOnProfileInput!) {
  createTagsetOnProfile(tagsetData: $tagsetData) {
    name,
    id
    tags
  }
}`;

export const createTagsetOnProfileVariablesData = (profileId: string) => {
  const variables = {
    tagsetData: {
      profileID: profileId,
      name: 'testTagset',
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createRelation = `
mutation createRelation($relationData: CreateRelationInput!) {
  createRelation(relationData: $relationData) {
      ${relationsData}
  }
}`;

export const createRelationVariablesData = (
  opportunityId: string,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const variables = {
    relationData: {
      parentID: opportunityId,
      type: `${relationType}`,
      description: `${relationDescription}`,
      actorName: `${relationActorName}`,
      actorType: `${relationActorType}`,
      actorRole: `${relationActorRole}`,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
