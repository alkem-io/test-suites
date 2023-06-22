export const deleteActor = `
mutation deleteActor($deleteData: DeleteActorInput!) {
  deleteActor(deleteData: $deleteData) {
    id
  }}`;

export const deleteActorGroup = `
mutation deleteActorGroup($deleteData: DeleteActorGroupInput!) {
  deleteActorGroup(deleteData: $deleteData) {
    id
  }}`;

export const deleteUserGroup = `
mutation deleteUserGroup($deleteData: DeleteUserGroupInput!) {
  deleteUserGroup(deleteData: $deleteData) {
    id
  }}`;

export const deleteUserApplication = `
mutation deleteUserApplication($deleteData: DeleteApplicationInput!) {
  deleteUserApplication(deleteData: $deleteData) {
    id
  }}`;

export const deleteUser = `
mutation deleteUser($deleteData: DeleteUserInput!) {
  deleteUser(deleteData: $deleteData) {
    id
  }}`;

export const deleteRelation = `
mutation deleteRelation($deleteData: DeleteRelationInput!) {
  deleteRelation(deleteData: $deleteData) {
    id
  }}`;

export const deleteReference = `
mutation deleteReference($deleteData: DeleteReferenceInput!) {
  deleteReference(deleteData: $deleteData) {
    id
  }}`;

export const deleteProject = `
mutation deleteProject($deleteData: DeleteProjectInput!) {
  deleteProject(deleteData: $deleteData) {
    id
  }}`;

export const deletePost = `
mutation deletePost($deleteData: DeletePostInput!) {
  deletePost(deleteData: $deleteData) {
    id
  }}`;

export const deleteOpportunity = `
mutation deleteOpportunity($deleteData: DeleteOpportunityInput!) {
  deleteOpportunity(deleteData: $deleteData) {
    id
  }}`;

export const deleteChallenge = `
mutation deleteChallenge($deleteData: DeleteChallengeInput!) {
  deleteChallenge(deleteData: $deleteData) {
    id
  }}`;

export const deleteSpace = `
mutation deleteSpace($deleteData: DeleteSpaceInput!) {
  deleteSpace(deleteData: $deleteData) {
    id
  }}`;

export const deleteOrganization = `
mutation deleteOrganization($deleteData: DeleteOrganizationInput!) {
  deleteOrganization(deleteData: $deleteData) {
    id
  }}`;

export const deleteDiscussion = `
mutation deleteDiscussion($deleteData: DeleteDiscussionInput!) {
  deleteDiscussion(deleteData: $deleteData) {
    id
  }
}`;

export const deleteVariablesData = (ID: string) => {
  const variables = {
    deleteData: {
      ID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
