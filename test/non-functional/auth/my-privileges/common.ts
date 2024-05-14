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

export const sorted__create_read_update_delete_grant_readUserPii = [
  ...sorted__create_read_update_delete_grant,
  'READ_USER_PII',
].sort();

export const sorted__create_read_update_delete_grant_readUserPii_platformAdmin = [
  ...sorted__create_read_update_delete_grant,
  'READ_USER_PII',
  'PLATFORM_ADMIN',
].sort();

export const sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii = [
  ...sorted__create_read_update_delete_grant,
  'READ_USER_PII',
  'FILE_UPLOAD',
  'FILE_DELETE',
].sort();

export const sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin = [
  ...sorted__create_read_update_delete_grant,
  'READ_USER_PII',
  'FILE_UPLOAD',
  'FILE_DELETE',
  'PLATFORM_ADMIN',
].sort();

export const sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii = [
  ...sorted__create_read_update_delete,
  'READ_USER_PII',
  'FILE_UPLOAD',
  'FILE_DELETE',
].sort();

export const sorted__create_read_update_delete_readUserPii = [
  ...sorted__create_read_update_delete,
  'READ_USER_PII',
].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel = [
  ...sorted__create_read_update_delete_grant,
  'FILE_UPLOAD',
  'FILE_DELETE',
].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_contribute = [
  ...sorted__create_read_update_delete_grant_fileUp_fileDel,
  'CONTRIBUTE',
].sort();

// export const sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent = [
//   ...sorted__create_read_update_delete_grant_fileUp_fileDel,
//   'CONTRIBUTE',
//   'UPDATE_CONTENT',
// ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent = [
  ...sorted__create_read_update_delete_grant_fileUp_fileDel,
  'CONTRIBUTE',
  'UPDATE_CONTENT',
].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_updateContent = [
  ...sorted__create_read_update_delete_grant_fileUp_fileDel,
  'UPDATE_CONTENT',
].sort();

export const sorted__create_read_update_delete_grant_contribute_updateContentt = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'UPDATE_CONTENT',
].sort();

export const sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'CREATE_MESSAGE',
  'CREATE_MESSAGE_REACTION',
  'CREATE_MESSAGE_REPLY',
].sort();

export const addMember_invite = ['COMMUNITY_ADD_MEMBER', 'COMMUNITY_INVITE'];

export const sorted__create_read_update_delete_grant_addMember_Invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  ...addMember_invite,
].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_APPLY',
  'COMMUNITY_INVITE',
].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_join_invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_JOIN',
  'COMMUNITY_APPLY',
  'COMMUNITY_INVITE',
].sort();

export const sorted__create_read_update_delete_grant_addMember_invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_INVITE',
].sort();

export const sorted__create_read_update_delete_grant_apply_invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_APPLY',
  'COMMUNITY_INVITE',
].sort();

export const sorted__create_read_update_delete_grant_addMember_apply = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_APPLY',
].sort();

export const sorted__create_read_update_delete_grant_apply = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_APPLY',
].sort();

export const sorted__create_read_update_delete_grant_apply_join_invite = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'COMMUNITY_JOIN',
  'COMMUNITY_APPLY',
  'COMMUNITY_INVITE',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_Privilege = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_COMMENT',
].sort();

export const sorted__create_read_update_delete_grant_createDiscussion_Privilege = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'CREATE_DISCUSSION',
].sort();

export const sorted__create_read_update_delete_grant_createDiscussion_communityAddMember_Privilege = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'CREATE_DISCUSSION',
  'COMMUNITY_ADD_MEMBER',
].sort();

export const sorted__applyToCommunity_joinCommunity = [
  'COMMUNITY_APPLY',
  'COMMUNITY_JOIN',
].sort();

export const sorted__applyToCommunity = ['COMMUNITY_APPLY'];

export const sorted__read_applyToCommunity = ['READ', 'COMMUNITY_APPLY'].sort();

export const sorted__create_read_update_delete_grant_updateWhiteboard_createComment = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_WHITEBOARD',
  'CREATE_COMMENT',
  'MOVE_POST',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_movePost = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_POST',
].sort();
export const sorted_sorted__create_read_update_delete_grant_contribute_movePost = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_POST',
].sort();
export const sorted__create_read_update_delete_grant_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
].sort();

export const sorted__create_read_update_delete_grant_contribute_updateContent = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'UPDATE_CONTENT',
].sort();

export const sorted__create_read_update_delete_grant_createPost_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_POST',
  'CONTRIBUTE',
].sort();

export const sorted__create_read_update_delete_grant_contribute_calloutPublished = [
  ...sorted__create_read_update_delete_grant,
  'CONTRIBUTE',
  'UPDATE_CALLOUT_PUBLISHER',
].sort();

export const sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_POST',
  'CONTRIBUTE',
  'UPDATE_CALLOUT_PUBLISHER',
].sort();
export const sorted__create_read_update_delete_grant_createComment_movePost_Privilege = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_COMMENT',
  'MOVE_POST',
].sort();
export const sorted__create_read_update_delete_grant_createRelation_createCallout = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
].sort();

export const sorted__create_read_update_delete_grant_createRelation_createCallout_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
  'CONTRIBUTE',
].sort();

export const sorted__create_read_update_delete_grant_createRelation_createCallout_createPost_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
  'CREATE_POST',
  'CONTRIBUTE',
].sort();

export const sorted__read_createRelation_contribute = [
  ...readPrivilege,
  'CREATE_RELATION',
  'CONTRIBUTE',
].sort();

export const sorted__read_contribute = [...readPrivilege, 'CONTRIBUTE'].sort();
export const sorted__read_createPost_contribute = [
  ...readPrivilege,
  'CREATE_POST',
  'CONTRIBUTE',
].sort();

export const sorted__create_read_update_delete_grant_createPost_createWhiteboard_createComment = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_POST',
  'CREATE_WHITEBOARD',
  'UPDATE_WHITEBOARD',
  'CREATE_COMMENT',
].sort();

export const sorted_sorted__create_read_update_delete_grant_createComment_createPost_createWhiteboard = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_POST',
  'CREATE_WHITEBOARD',
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

export const sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite = [
  ...sorted__create_read_update_delete_grant,
  ...sorted__applyToCommunity_joinCommunity,
  ...addMember_invite,
].sort();

export const sorted__create_read_update_delete_grant_updateInnovationFlow = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
].sort();
export const sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity = [
  ...sorted__create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
  'CREATE_OPPORTUNITY',
].sort();

export const sorted__create_read_update_delete_grant_createOpportunity = [
  ...sorted__create_read_update_delete_grant,
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

export const sorted__create_read_update_delete_grant_createSubspace = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_SUBSPACE',
].sort();

export const sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin = [
  ...sorted__create_read_update_delete_grant,
  'AUTHORIZATION_RESET',
  'CREATE_SUBSPACE',
  'PLATFORM_ADMIN',
].sort();

export const sorted__create_read_update_delete_grant_createSubspace_platformAdmin = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_SUBSPACE',
  'PLATFORM_ADMIN',
].sort();

export const sorted__read_createRelation = [
  ...readPrivilege,
  'CREATE_RELATION',
].sort();

export const sorted__read_applyToCommunity_joinCommunity = [
  ...readPrivilege,
  ...sorted__applyToCommunity_joinCommunity,
].sort();
