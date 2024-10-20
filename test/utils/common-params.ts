export const authorizationSpaceData = `
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
  visuals {
    id
    name
    uri
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
  agent {
    ${agentData}
  }
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
  state
  nextEvents
  stateIsFinal
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
      authorization{${authorizationSpaceData}}
      id
      status
      ${lifecycleData}
    }
    preferences{${preferenceData}}
    authorization{${authorizationSpaceData}}
}`;

export const memberOrganizationData = `
   ${organizationData}
`;
export const membersAndLeadsData = `
  memberUsers: usersInRole(role: MEMBER) {
    ${membersData}
  }

  leadUsers: usersInRole(role: LEAD) {
    ${membersData}
  }

  adminUsers: usersInRole(role: ADMIN) {
    ${membersData}
  }

  hostUsers: usersInRole(role: HOST) {
    ${membersData}
  }

  memberOrganizations: organizationsInRole(role: MEMBER) ${organizationData}

  leadOrganizations: organizationsInRole(role: LEAD) ${organizationData}

  adminOrganizations: organizationsInRole(role: ADMIN) ${organizationData}

  hostOrganizations: organizationsInRole(role: HOST) ${organizationData}

`;

// usersInRole{${membersData}}
// organizationsInRole${memberOrganizationData}

// availableLeadUsers{${membersData}}
// availableMemberUsers{${membersData}}

// leadUsers {${membersData}}
// memberOrganizations ${memberOrganizationData}
// leadOrganizations ${memberOrganizationData}

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

export const applicationDataMe = `
id
challengeID
displayName
communityID
spaceID
opportunityID
state
`;

export const invitationDataMe = `
id
challengeID
displayName
communityID
spaceID
opportunityID
state
`;

export const applicationData = `
  id
  ${lifecycleData}
  questions{id}
  user {
    ${userData}
  }
  authorization{myPrivileges}
`;

export const invitationData = `
  id
  ${lifecycleData}
  createdBy {
    ${userData}
  }
  user {
    ${userData}
  }
  authorization{myPrivileges}
`;

export const invitationDataExternal = `
id
email
authorization{myPrivileges}
profileCreated
firstName
lastName
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
    profile {
      displayName
      description
    }
    category
    createdBy
    comments {
      id
      messagesCount
      messages {
        id
        message
        sender{id}
      }
    }
    authorization{myPrivileges}
  `;

export const communityData = `
  id
  authorization{${authorizationSpaceData}}
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

export const postData = `
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
  contributions {
    post {
      ${postData}
    }
  }
  comments {
    id
  }
  framing {
    profile {${profileDataUser}}
  }
  nameID
  contributionPolicy {
    state
  }
  type
  visibility
  authorization{myPrivileges}
`;

export const collaborationData = `
  id

  callouts{
    ${calloutData}
  }
  authorization{myPrivileges}
`;

export const contextData = `
  id
  vision
  impact
  who
  ${ecosystemModelData}

  authorization{${authorizationSpaceData}}
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

  authorization{${authorizationSpaceData}}

  community {
    ${communityData}
  }
  collaboration{${collaborationData}}

  context {
    ${contextData}
  }
  innovationFlow {
    id
    lifecycle {
      ${lifecycleData}
    }
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
    innovationFlow {
      id
      lifecycle {
        ${lifecycleData}
      }
    }
`;

// tagset {
//   ${tagsetData}
// }
export const challengeDataTest = `
  id
  nameID
  profile {${profileData}}
  authorization{${authorizationSpaceData}}

  community {
    ${communityData}
  }
  collaboration{${collaborationData}}

  context {
    ${contextData}
  }
  innovationFlow {
    id
    lifecycle {
      ${lifecycleData}
    }
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

export const spaceData = `
  id
  nameID
  ${metricsData}
  authorization{${authorizationSpaceData}}
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
  spaceID
  challengeID
  opportunityID
}`;

export const invitations = `
invitations {
  challengeID
  communityID
  displayName
  spaceID
  opportunityID
  state
  updatedDate
}`;

export const spaces = `
spaces {
  spaceID
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
    ${invitations}
    ${spaces}
    ${organizations}
`;
