export const readPrivilege = ['READ'];
export const sorted__create_read_update_delete = [
  'CREATE',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
].sort();
export const sorted__create_read_update_delete_grant = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_Privilege = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_COMMENT',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'CREATE_DISCUSSION',
].sort();
export const sorted__applyToCommunity_joinCommunity = [
  'COMMUNITY_APPLY',
  'COMMUNITY_JOIN',
].sort();
export const sorted__create_read_update_delete_grant_updateCanvas_createComment = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_CANVAS',
  'CREATE_COMMENT',
  'MOVE_CARD',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_moveCard = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_CARD',
].sort();
export const sorted_sorted_sorted__create_read_update_delete_grant_contribute_moveCard = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_CARD',
].sort();
export const sorted_sorted__create_read_update_delete_grant_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
].sort();
export const sorted_sorted__create_read_update_delete_grant_contribute_calloutPublished = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'UPDATE_CALLOUT_PUBLISHER',
].sort();
export const sorted__create_read_update_delete_grant_createComment_moveCard_Privilege = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_COMMENT',
  'MOVE_CARD',
].sort();
export const sorted__create_read_update_delete_grant_createRelation_createCallout = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
  'CONTRIBUTE',
].sort();

export const sorted__create_read_update_delete_grant_createAspect_createCanvas_createComment = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_ASPECT',
  'CREATE_CANVAS',
  'UPDATE_CANVAS',
  'CREATE_COMMENT',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_createCard_createCanvas = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_ASPECT',
  'CREATE_CANVAS',
  'CREATE_COMMENT',
].sort();

export const sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_updateInnovationFlow = [
  ...sorted__create_read_update_delete_grant,
  ...sorted__applyToCommunity_joinCommunity,
  'UPDATE_INNOVATION_FLOW',
].sort();

export const sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity = [
  ...sorted__create_read_update_delete_grant,
  ...sorted__applyToCommunity_joinCommunity,
].sort();

export const sorted__create_read_update_delete_grant_updateInnovationFlow = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
].sort();
export const sorted_sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
  'CREATE_OPPORTUNITY',
].sort();

export const sorted__create_read_update_delete_grant_authorizationReset = [
  ...sorted__create_read_update_delete_grant,
  'AUTHORIZATION_RESET',
].sort();
export const sorted__create_read_update_delete_authorizationReset = [
  ...sorted__create_read_update_delete,
  'AUTHORIZATION_RESET',
].sort();

export const sorted__create_read_update_delete_grant_authorizationReset_createChallenge = [
  ...sorted__create_read_update_delete_grant,
  'AUTHORIZATION_RESET',
  'CREATE_CHALLENGE',
].sort();

export const sorted__read_createRelation = [
  ...readPrivilege,
  'CREATE_RELATION',
].sort();

export const sorted__read_applyToCommunity_joinCommunity = [
  ...readPrivilege,
  ...sorted__applyToCommunity_joinCommunity,
].sort();
