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
  description
  references {
    authorization{myPrivileges}
    ${referencesData}
  }
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
  displayName
  nameID
  firstName
  lastName
  email
  phone
  accountUpn
  agent {id}
  profile {
    ${profileData}
  }
  preferences{
    ${preferenceData}
  }
  authorization{myPrivileges}
`;

export const membersData = `
  ${userData}
  profile {
    ${profileData}
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

export const lifecycleTemplateData = `
  id
  type
  info {
    title
    description
    tagset {
      tags
    }
  }
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
    displayName
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
      ${profileData}
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

export const aspectTemplateData = `
    id
    defaultDescription
    type
    info {
      id
      title
      description
      tagset{tags}
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
    id nameID
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
  displayName
  type
  createdBy{id nameID}
  comments{id messages {id message sender{id}}}
  profile{
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
  displayName
  nameID
  description
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
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

  description
  displayName
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
  ${ecosystemModelData}
  location {
    country
    city
  }
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

export const opportunityData = `
  id
  displayName
  nameID
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
  tagset {
    ${tagsetData}
  }
  projects{
    ${projectData}
  }

`;

export const challengesData = `
    id
    displayName
    nameID
    ${metricsData}

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
`;

export const challengeDataTest = `
  id
  displayName
  nameID

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
  tagset {
    ${tagsetData}
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

export const hubData = `
  id
  displayName
  nameID
  ${metricsData}
  authorization{${authorizationHubData}}
  collaboration{${collaborationData}}
  context { ${contextData} }
  community { ${communityData} }
  challenges { ${challengeDataTest} }
  opportunities { ${opportunityData} }
  preferences{${preferenceData}}
  templates{id
    aspectTemplates {${aspectTemplateData}}
    lifecycleTemplates {${lifecycleTemplateData}}
    authorization{myPrivileges}
  }
  tagset {
    ${tagsetData}
  }
  host${organizationData}
  visibility
`;

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
  createdDate
  updatedDate
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
