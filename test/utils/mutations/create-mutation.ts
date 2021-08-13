import {
  actorData,
  actorGrpupData,
  applicationData,
  aspectData,
  challengeDataTest,
  ecoverseData,
  opportunityData,
  organisationData,
  projectData,
  referencesData,
  relationsData,
  userData,
} from '../common-params';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createUserMut = `
  mutation createUser($userData: CreateUserInput!) {
    createUser(userData: $userData) { 
      ${userData} 
    }
  }`;

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

export const createApplicationMut = `
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

export const createOrganisationMut = `
  mutation CreateOrganisation($organisationData: CreateOrganisationInput!) {
    createOrganisation(organisationData: $organisationData) ${organisationData}
  }`;

export const organisationVariablesData = (
  displayName: string,
  nameID: string
) => {
  const variables = {
    organisationData: {
      displayName,
      nameID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createEcoverseMut = `
mutation createEcoverse($ecoverseData: CreateEcoverseInput!) {
  createEcoverse(ecoverseData: $ecoverseData) {${ecoverseData}}
}`;

export const ecoverseVariablesData = (
  ecoverseName: string,
  ecoverseNameId: string,
  hostId: string
) => {
  const variables = {
    ecoverseData: {
      displayName: ecoverseName,
      nameID: ecoverseNameId,
      hostID: hostId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChallengeMut = `
mutation createChallenge($challengeData: CreateChallengeOnEcoverseInput!) {
  createChallenge(challengeData: $challengeData) {
    ${challengeDataTest}
  }
}`;

export const challengeVariablesData = (
  challengeName: string,
  nameId: string,
  parentId: string
) => {
  const variables = {
    challengeData: {
      displayName: challengeName,
      nameID: nameId,
      ecoverseID: parentId,
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
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChildChallengeMut = `
mutation createChildChallenge($childChallengeData: CreateChallengeOnChallengeInput!) {
  createChildChallenge(challengeData: $childChallengeData) {
    ${challengeDataTest}
  }
}`;

export const childChallengeVariablesData = (
  challengeName: string,
  nameId: string,
  parentId: string
) => {
  const variables = {
    childChallengeData: {
      displayName: challengeName,
      nameID: nameId,
      ecoverseID: parentId,
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
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createOpportunityMut = `
mutation createOpportunity($opportunityData: CreateOpportunityInput!) {
  createOpportunity(opportunityData: $opportunityData) {
    ${opportunityData}
  }
}`;

export const opportunityVariablesData = (
  opportunityName: string,
  nameId: string,
  challengeId?: string
) => {
  const variables = {
    opportunityData: {
      challengeID: challengeId,
      displayName: opportunityName,
      nameID: nameId,
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
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createProjectMut = `
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

export const createAspectMut = `
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

export const createActorGroupMut = `
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

export const createActorMut = `
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

export const createGroupOnOrganisationMut = `
mutation createGroupOnOrganisation($groupData: CreateUserGroupInput!) {
  createGroupOnOrganisation(groupData: $groupData) {
    id
    name
  }
}`;

export const groupOnOrganisationVariablesData = (
  testGroup: string,
  organisationId: string
) => {
  const variables = {
    groupData: {
      name: testGroup,
      parentID: organisationId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createGroupOnCommunityMut = `
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

export const createReferenceOnContextMut = `
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

export const createReferenceOnProfileMut = `
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

export const createTagsetOnProfileMut = `
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

export const createRelationMut = `
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
