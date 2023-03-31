export const authorizationHubData = `
anonymousReadAccess
myPrivileges
`;

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
  authorization{myPrivileges}
`;

export const preferenceData = `
    id
    value
    definition {
      type
      id
      displayName
      description
      group
    }
    authorization{myPrivileges}
  `;

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
  displayName
  description
  references {
    authorization{myPrivileges}
    ${referencesData}
  }
  tagline
  tagsets {
    authorization{myPrivileges}
    ${tagsetData}
  }
  tagset {
    ${tagsetData}
  }
  location {
    country
    city
  }
  authorization{myPrivileges}
`;

export const profileDataUser = `
  id
  displayName
  description
  references {
    authorization{myPrivileges}
    ${referencesData}
  }
  tagline
  tagsets {
    authorization{myPrivileges}
    ${tagsetData}
  }
  location {
    country
    city
  }
  authorization{myPrivileges}
`;

export const userData = `
  id
  nameID
  firstName
  lastName
  email
  phone
  accountUpn
  agent {id}
  profile {
    ${profileDataUser}
  }
  preferences{
    ${preferenceData}
  }
  authorization{myPrivileges}
`;

export const membersData = `
  ${userData}
  profile {
    ${profileDataUser}
  }
`;

// Add parents as param
export const groupData = `
  id
  name
  members{ ${membersData}}
  profile{
    ${profileData}
  }
`;

// info {
//   title
//   description
//   tagset {
//     tags
//   }
// }
export const innovationFlowTemplateData = `
  id
  type

  profile {${profileData}}
  definition
  authorization{myPrivileges}
`;

export const lifecycleData = `
  id
  state
  nextEvents
  stateIsFinal
  templateName
`;

export const organizationData = `
  {
    id
    nameID
    legalEntityName
    domain
    website
    contactEmail
    groups {
      ${groupData}
    }
    associates {${membersData}}
    profile {
      ${profileDataUser}
    }
    verification {
      authorization{${authorizationHubData}}
      id
      status
      lifecycle {
        ${lifecycleData}
      }
    }
    preferences{${preferenceData}}
    authorization{${authorizationHubData}}
}`;

export const memberOrganizationData = `
   ${organizationData}
`;

export const membersAndLeadsData = `
memberUsers {${membersData}}
leadUsers {${membersData}}
memberOrganizations ${memberOrganizationData}
leadOrganizations ${memberOrganizationData}

`;

export const relationsData = `
  id
  actorName
  actorRole
  actorType
  description
  type
  authorization{myPrivileges}
`;

// info {
//   id
//   title
//   description
//   tagset{tags}
// }
export const postTemplateData = `
    id
    defaultDescription
    type
    profile{
      ${profileData}
    }
  authorization{myPrivileges}
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
  authorization{myPrivileges}
`;

export const messagesData = `
  id
  message
  sender{
    id
  }
`;

export const updateData = `
  id
  messages{
  ${messagesData}
  }
  authorization{myPrivileges}
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
      sender{id}
    }
    authorization{myPrivileges}
  `;

export const communityData = `
  id
  displayName
  authorization{${authorizationHubData}}
  ${membersAndLeadsData}
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
    authorization{myPrivileges}
  }
`;

export const metricsData = `
metrics{
  id
  name
  value
}`;

export const aspectData = `
  id
  nameID
  type
  createdBy{id nameID}
  comments{id messages {id message sender{id}}}
  profile{
    displayName
    id
    description
    tagset {
      ${tagsetData}
    }
    references {
      ${referencesData}
    }
  }

  authorization{myPrivileges}
  `;

export const projectData = `
  id
  nameID
  profile {${profileData}}
  lifecycle {
    ${lifecycleData}
  }
  authorization{myPrivileges}
  `;

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

export const calloutData = `
  id
  aspects{
    ${aspectData}
  }

  profile {${profileDataUser}}
  nameID
  state
  type
  visibility
  authorization{myPrivileges}
`;

export const collaborationData = `
  id
  relations {
    ${relationsData}
  }

  callouts{
    ${calloutData}
  }
  authorization{myPrivileges}
`;
//tagline
// references {
//   ${referencesData}
// }
//background
// location {
//   country
//   city
// }
export const contextData = `
  id
  vision
  impact
  who
  ${ecosystemModelData}

  authorization{${authorizationHubData}}
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
  members{${membersData}}
`;

// tagset {
//   ${tagsetData}
// }
export const opportunityData = `
  id
  nameID
  profile {${profileData}}

  authorization{${authorizationHubData}}

  community {
    ${communityData}
  }
  collaboration{${collaborationData}}

  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }

  projects{
    ${projectData}
  }

`;

export const challengesData = `
    id
    nameID
    ${metricsData}
    profile {${profileData}}

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
`;

// tagset {
//   ${tagsetData}
// }
export const challengeDataTest = `
  id
  nameID
  profile {${profileData}}
  authorization{${authorizationHubData}}

  community {
    ${communityData}
  }
  collaboration{${collaborationData}}

  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }

  opportunities {
    ${opportunityData}
  }

  challenges{
    ${challengesData}
  }
  preferences{${preferenceData}}

`;

export const hostData = `
   host ${organizationData}
`;
// tagset {
//   ${tagsetData}
// }

export const hubData = `
  id
  nameID
  ${metricsData}
  authorization{${authorizationHubData}}
  context { ${contextData} }
  community { ${communityData} }
  collaboration{${collaborationData}}
  challenges { ${challengeDataTest} }
  opportunities { ${opportunityData} }
  preferences{${preferenceData}}
  profile{
    ${profileData}
  }
  templates{id
    postTemplates {${postTemplateData}}
    innovationFlowTemplates {${innovationFlowTemplateData}}
    whiteboardTemplates{id}
    authorization{myPrivileges}
  }

  host${organizationData}
  visibility
`;

//

export const rolesData = `
  id
  displayName
  nameID
  roles
`;

export const communityAvailableMemberUsersData = `
  community {
    availableMemberUsers{
      users{
        id
        nameID
      }
    }
   }
`;

export const communityAvailableLeadUsersData = `
  community {
    availableLeadUsers{
      users{
        id
        nameID
      }
    }
   }
`;

export const meData = `
me{
  user {
    ${userData}
  }
}`;

export const applicationsMembership = `
applications {
  id
  state
  displayName
  communityID
  hubID
  challengeID
  opportunityID
}`;

export const hubs = `
hubs {
  hubID
  ${rolesData}
  challenges { ${rolesData} }
  opportunities { ${rolesData} }
}`;

export const organizations = `
organizations {
  organizationID
  ${rolesData}
}`;

export const rolesUser = `
    ${applicationsMembership}
    ${hubs}
    ${organizations}
`;
