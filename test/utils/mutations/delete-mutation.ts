export const deleteActorMut = `
mutation deleteActor($deleteData: DeleteActorInput!) {
  deleteActor(deleteData: $deleteData) {
    id
  }}`;

export const deleteActorGroupMut = `
mutation deleteActorGroup($deleteData: DeleteActorGroupInput!) {
  deleteActorGroup(deleteData: $deleteData) {
    id
  }}`;

export const deleteUserGroupMut = `
mutation deleteUserGroup($deleteData: DeleteUserGroupInput!) {
  deleteUserGroup(deleteData: $deleteData) {
    id
  }}`;

export const deleteUserApplicationMut = `
mutation deleteUserApplication($deleteData: DeleteApplicationInput!) {
  deleteUserApplication(deleteData: $deleteData) {
    id
  }}`;

export const deleteUserMut = `
mutation deleteUser($deleteData: DeleteUserInput!) {
  deleteUser(deleteData: $deleteData) {
    id
  }}`;

export const deleteRelationMut = `
mutation deleteRelation($deleteData: DeleteRelationInput!) {
  deleteRelation(deleteData: $deleteData) {
    id
  }}`;

export const deleteReferenceMut = `
mutation deleteReference($deleteData: DeleteReferenceInput!) {
  deleteReference(deleteData: $deleteData) {
    id
  }}`;

export const deleteProjectMut = `
mutation deleteProject($deleteData: DeleteProjectInput!) {
  deleteProject(deleteData: $deleteData) {
    id
  }}`;

export const deleteAspectMut = `
mutation deleteAspect($deleteData: DeleteAspectInput!) {
  deleteAspect(deleteData: $deleteData) {
    id
  }}`;

export const deleteOpportunityMut = `
mutation deleteOpportunity($deleteData: DeleteOpportunityInput!) {
  deleteOpportunity(deleteData: $deleteData) {
    id
  }}`;

export const deleteChallengeMut = `
mutation deleteChallenge($deleteData: DeleteChallengeInput!) {
  deleteChallenge(deleteData: $deleteData) {
    id
  }}`;

export const deleteEcoverseMut = `
mutation deleteEcoverse($deleteData: DeleteEcoverseInput!) {
  deleteEcoverse(deleteData: $deleteData) {
    id
  }}`;

export const deleteOrganisationMut = `
mutation deleteOrganisation($deleteData: DeleteOrganisationInput!) {
  deleteOrganisation(deleteData: $deleteData) {
    id
  }}`;

export const deleteVariablesData = (ID: string) => {
  const variables = {
    deleteData: {
      ID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
