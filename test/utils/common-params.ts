export const referencesData = `
  id
  name
  uri
`;

export const agentData = `
  credentials {
    id
    resourceID
    type
  }`;

export const tagsetData = `
  id
  name
  tags
`;

export const preferenceData = `
    id
    value
    definition {
      id
      type
      displayName
      description
      group
  }`;

export const profileDataCreate = `
  id
  description
  references {
    ${referencesData}
  }
  tagsets {
    ${tagsetData}
  }
`;

export const profileData = `
  id
  description
  references {
    ${referencesData}
  }
  tagsets {
    ${tagsetData}
  }
`;

export const userData = `
  id
  displayName
  nameID
  firstName
  lastName
  email
  phone
  accountUpn
  agent {id}
  city
  country
  profile {
    ${profileData}
  }
`;

export const membersData = `
members{
  ${userData}
  profile {
    ${profileData}
  }
}`;

export const relationsData = `
  id
  actorName
  actorRole
  actorType
  description
  type
`;

// Add parents as param
export const groupData = `
  id
  name
  ${membersData}
  profile{
    ${profileData}
  }
`;

export const lifecycleData = `
  id
  state
  nextEvents
  stateIsFinal
  templateName
`;

export const applicationData = `
  id
  lifecycle {
    ${lifecycleData}
  }
  questions{id}
  user {
    ${userData}
  }
`;

export const messagesData = `
  id
  message
  sender
`;

export const updateData = `
  id
  messages{
  ${messagesData}
  }
`;

export const communicationsDiscussionData = `
    id
    title
    category
    commentsCount
    createdBy
    description
    messages {
      id
      message
      sender
    }
  `;

export const communityData = `
  id
  displayName
  ${membersData}
  groups {
    ${groupData}
  }
  applications{
    ${applicationData}
  }
  communication{
    id
    updates{
      ${updateData}
    }
    discussions{
      ${communicationsDiscussionData}
    }
  }
`;

export const activityData = `
activity{
  id
  name
  value
}`;

//${messagesData}
export const aspectData = `
  id
  nameID
  displayName
  description,
  type
  createdBy
  comments{id messages {id message sender}}
  tagset {
    ${tagsetData}
  }
  references {
    ${referencesData}
  }`;

export const projectData = `
  id
  displayName
  nameID
  description
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }`;

export const collaborationData = `
collaboration {
  id
  projects{
    ${projectData}
  }
  relations{
    ${relationsData}
  }
}`;

export const actorData = `
      id
    name
    description
    value
    impact
`;

export const actorGrpupData = `
  id
  name
  description
  actors {
    ${actorData}
  }
`;

export const ecosystemModelData = `
ecosystemModel {
  id
  description

  actorGroups {
    ${actorGrpupData}
  }
  }`;

export const contextData = `
  id
  tagline
  background
  vision
  impact
  who
  references {
    ${referencesData}
  }
  aspects{
    ${aspectData}
  }
  ${ecosystemModelData}
`;

export const leadOrganizationsData = `
  id
  nameID

  groups {
    ${groupData}
  }
  profile {
    ${profileData}
  }
  ${membersData}
`;

export const opportunityData = `
  id
  displayName
  nameID
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }
  projects{
    ${projectData}
  }
  relations{
    ${relationsData}
  }
`;

export const challengesData = `
    id
    displayName
    nameID
    ${activityData}

    opportunities {
      ${opportunityData}
    }
    community {
      ${communityData}
    }
    context {
      ${contextData}
    }
    lifecycle {
      ${lifecycleData}
    }
    tagset {
      ${tagsetData}
    }
    leadOrganizations {
      ${leadOrganizationsData}
    }
`;

//${activityData}
export const challengeDataTest = `
  id
  displayName
  nameID


  opportunities {
    ${opportunityData}
  }
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }

  challenges{
    ${challengesData}
  }

  leadOrganizations {
    ${leadOrganizationsData}
  }
`;

export const hostData = `
host {
  id
  displayName
  nameID
  groups {
    ${groupData}
  }
  ${membersData}
  profile {
    ${profileData}
  }
}`;

// application {
//   ${applicationData}
// }
//${activityData}
//${hostData}
export const ecoverseData = `
  id
  displayName
  nameID

  challenges { ${challengeDataTest} }
  community { ${communityData} }
  context { ${contextData} }
  groups { ${groupData} }

  projects { ${projectData} }
  tagset { ${tagsetData} }
`;

export const meData = `
me{
  user {
    ${userData}
  }
}`;

export const organizationData = `
  {
    id
    displayName
    nameID
    legalEntityName
    domain
    website
    contactEmail
    groups {
      ${groupData}
    }
    ${membersData}
    profile {
      ${profileData}
    }
    verification {
      id
      status
      lifecycle {
        ${lifecycleData}
      }
    }
}`;

export const applicationsMembership = `
applications {
  id
  state
  displayName
  communityID
  ecoverseID
  challengeID
  opportunityID
  createdDate
  updatedDate
}`;

export const mambershipUser = `  
    ${applicationsMembership}
`;
