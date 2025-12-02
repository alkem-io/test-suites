export const readPrivilege = ["READ"];
export const readAboutPrivilege = ["READ_ABOUT"];
export const readAboutPrivilege_readLicense = ["READ_ABOUT", "READ_LICENSE"];

export const sorted_read_readAbout = [...readPrivilege, ...readAboutPrivilege];
export const sorted_read_readAbout_readLicense = [
  ...readPrivilege,
  ...readAboutPrivilege,
  "READ_LICENSE",
];

export const sorted_read_readAbout_readLicense_notifications = [
  ...sorted_read_readAbout_readLicense,
  "RECEIVE_NOTIFICATIONS",
];

export const sorted__create_read_update_delete = [
  "CREATE",
  ...readPrivilege,
  "UPDATE",
  "DELETE",
].sort();

export const sorted__create_read_readAbout_update_delete = [
  "CREATE",
  ...sorted_read_readAbout,
  "UPDATE",
  "DELETE",
].sort();

export const sorted__create_read_update_delete_grant = [
  "CREATE",
  "GRANT",
  ...readPrivilege,
  "UPDATE",
  "DELETE",
].sort();

export const sorted__create_read_readAbout_update_delete_grant = [
  "CREATE",
  "GRANT",
  ...sorted_read_readAbout,
  "UPDATE",
  "DELETE",
].sort();

export const sorted__create_read_update_delete_grant_platformAdmin = [
  "CREATE",
  "GRANT",
  ...readPrivilege,
  "UPDATE",
  "DELETE",
  "PLATFORM_ADMIN",
].sort();

// export const sorted__create_read_update_delete_grant_platformAdmin_notificationsAdmin = [
//   "CREATE",
//   "GRANT",
//   ...readPrivilege,
//   "UPDATE",
//   "DELETE",
//   "PLATFORM_ADMIN",
//   "RECEIVE_NOTIFICATIONS_ADMIN",
// ].sort();

export const sorted__create_read_update_delete_grant_platformAdmin_readAbout = [
  ...sorted__create_read_update_delete_grant_platformAdmin,
  "READ_ABOUT",
].sort();

export const sorted__create_read_update_delete_grant_platformAdmin_readAbout_notificationsAdmin =
  [
    ...sorted__create_read_update_delete_grant_platformAdmin,
    "READ_ABOUT",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_platformAdmin_notificationsAdmin =
  [
    ...sorted__create_read_update_delete_grant_platformAdmin,
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_readAbout = [
  ...sorted__create_read_update_delete_grant,
  "READ_ABOUT",
].sort();

export const sorted__create_read_update_delete_grant_notificationsAdmin = [
  ...sorted__create_read_update_delete_grant,
  "RECEIVE_NOTIFICATIONS_ADMIN",
].sort();

export const sorted__create_read_update_delete_grant_readUserPii_platformAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "READ_USER_PII",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_readUserPii = [
  ...sorted__create_read_update_delete_grant,
  "READ_USER_PII",
  "READ_USER_SETTINGS",
].sort();

export const sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii_platformAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "READ_USER_PII",
    "FILE_UPLOAD",
    "FILE_DELETE",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUpload_fileDelete_readUserPii =
  [
    ...sorted__create_read_update_delete_grant,
    "READ_USER_PII",
    "READ_USER_SETTINGS",
    "FILE_UPLOAD",
    "FILE_DELETE",
  ].sort();

export const sorted__create_read_update_delete_fileUpload_fileDelete_readUserPii =
  [
    ...sorted__create_read_update_delete,
    "READ_USER_PII",
    "FILE_UPLOAD",
    "FILE_DELETE",
  ].sort();

export const sorted__create_read_update_delete_readUserPii = [
  ...sorted__create_read_update_delete,
  "READ_USER_PII",
].sort();

export const sorted__create_read_update_delete_grant_createCallout_transferAccept_transferOffer =
  [
    ...sorted__create_read_update_delete_grant,
    "CREATE_CALLOUT",
    "TRANSFER_RESOURCE_ACCEPT",
    "TRANSFER_RESOURCE_OFFER",
  ].sort();

export const sorted__create_read_update_delete_contribute_createCallout = [
  ...sorted__create_read_update_delete,
  "CONTRIBUTE",
  "CREATE_CALLOUT",
].sort();

export const sorted__create_read_update_delete_contribute_createCallout_receiveNotifications =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "CREATE_CALLOUT",
    "RECEIVE_NOTIFICATIONS",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel = [
  ...sorted__create_read_update_delete_grant,
  "FILE_UPLOAD",
  "FILE_DELETE",
].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_notificationsAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "FILE_UPLOAD",
    "FILE_DELETE",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_fileDelete_fileUpload = [
  ...sorted__create_read_update_delete_grant,
  "FILE_UPLOAD",
  "FILE_DELETE",
].sort();
export const sorted__create_read_update_delete_contribute_fileDelete_fileUpload =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "FILE_UPLOAD",
    "FILE_DELETE",
  ].sort();

export const sorted__create_read_update_delete_contribute_fileDelete_fileUpload_receiveNotifications =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "FILE_UPLOAD",
    "FILE_DELETE",
    "RECEIVE_NOTIFICATIONS",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_fileUp_fileDel =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "FILE_UPLOAD",
    "FILE_DELETE",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "FILE_UPLOAD",
    "FILE_DELETE",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_platformAdmin_notificationsAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "FILE_UPLOAD",
    "FILE_DELETE",
    "PLATFORM_ADMIN",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_contribute =
  [
    ...sorted__create_read_update_delete_grant_fileUp_fileDel,
    "CONTRIBUTE",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_fileUp_fileDel_contribute =
  [
    ...sorted__create_read_readAbout_update_delete_grant_fileUp_fileDel,
    "CONTRIBUTE",
  ].sort();

export const sorted__create_read_update_delete_grant_fileUp_fileDel_contribute_updateContent =
  [
    ...sorted__create_read_update_delete_grant_fileUp_fileDel,
    "CONTRIBUTE",
    "UPDATE_CONTENT",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_fileUp_fileDel_contribute_updateContent =
  [
    ...sorted__create_read_readAbout_update_delete_grant_fileUp_fileDel,
    "CONTRIBUTE",
    "UPDATE_CONTENT",
  ].sort();

export const addMember_invite = [
  "ROLESET_ENTRY_ROLE_ASSIGN",
  "ROLESET_ENTRY_ROLE_INVITE",
];

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
  ].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_notifications_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
  ].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization_notifications_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_ASSIGN",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_assignOrganization =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
  ].sort();

export const sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_assignOrganization_notifications_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__read_apply_assignOrganization = [
  ...readPrivilege,
  "ROLESET_ENTRY_ROLE_APPLY",
  "ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION",
].sort();

export const sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
  ].sort();

export const sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_notifications_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_apply_invite_assign_addVC_accessVC_notificationsAdmin =
  [
    "CREATE",
    "GRANT",
    ...readPrivilege,
    "UPDATE",
    "DELETE",
    "ROLESET_ENTRY_ROLE_APPLY",
    "ROLESET_ENTRY_ROLE_INVITE",
    "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
    "RECEIVE_NOTIFICATIONS_ADMIN",
    "ROLESET_ENTRY_ROLE_ASSIGN",
  ].sort();

export const sorted__roleSet_applyTo_join = [
  "ROLESET_ENTRY_ROLE_APPLY",
  "ROLESET_ENTRY_ROLE_JOIN",
].sort();

export const sorted__read_applyToRoleSet = [
  "READ",
  "ROLESET_ENTRY_ROLE_APPLY",
].sort();

export const sorted__read_applyToRoleSet_notifications = [
  "READ",
  "ROLESET_ENTRY_ROLE_APPLY",
  "RECEIVE_NOTIFICATIONS",
].sort();

export const sorted__read_applyToRoleSet_invite_addVC = [
  "READ",
  "ROLESET_ENTRY_ROLE_APPLY",
  "ROLESET_ENTRY_ROLE_INVITE",
  "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
].sort();

export const sorted__read_applyToRoleSet_invite_addVC_notifications = [
  "READ",
  "ROLESET_ENTRY_ROLE_APPLY",
  "ROLESET_ENTRY_ROLE_INVITE",
  "COMMUNITY_ASSIGN_VC_FROM_ACCOUNT",
  "RECEIVE_NOTIFICATIONS",
].sort();

export const sorted__create_read_update_delete_grant_contribute = [
  ...sorted__create_read_update_delete_grant,
  "CONTRIBUTE",
].sort();

export const sorted__create_read_readAbout_update_delete_grant_contribute = [
  ...sorted__create_read_readAbout_update_delete_grant,
  "CONTRIBUTE",
].sort();

export const sorted__create_read_update_delete_grant_contribute_updateContent =
  [
    ...sorted__create_read_update_delete_grant,
    "CONTRIBUTE",
    "UPDATE_CONTENT",
  ].sort();

export const sorted__create_read_update_delete_grant_createSubspace = [
  ...sorted__create_read_update_delete_grant,
  "CREATE_SUBSPACE",
].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "READ_LICENSE",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "READ_LICENSE",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "AUTHORIZATION_RESET",
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_grant_createSubspace_platformAdmin =
  [
    ...sorted__create_read_update_delete_grant,
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
    "READ_LICENSE",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
    "READ_LICENSE",
    "RECEIVE_NOTIFICATIONS",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notificationsAdmin =
  [
    ...sorted__create_read_readAbout_update_delete_grant,
    "CREATE_SUBSPACE",
    "PLATFORM_ADMIN",
    "READ_LICENSE",
    "RECEIVE_NOTIFICATIONS_ADMIN",
  ].sort();

export const sorted__create_read_update_delete_contribute_readAbout = [
  ...sorted__create_read_update_delete,
  "CONTRIBUTE",
  "READ_ABOUT",
].sort();

export const sorted__create_read_update_delete_contribute_readAbout_receiveNotifications =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "READ_ABOUT",
    "RECEIVE_NOTIFICATIONS",
  ].sort();

export const sorted__create_read_update_delete_createCallout_readAbout_transferAccept_transferOffer =
  [
    ...sorted__create_read_update_delete_grant,
    "CREATE_CALLOUT",
    "READ_ABOUT",
    "TRANSFER_RESOURCE_ACCEPT",
    "TRANSFER_RESOURCE_OFFER",
  ].sort();

export const sorted__create_read_update_delete_contribute_createCallout_readAbout =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "CREATE_CALLOUT",
    "READ_ABOUT",
  ].sort();

export const sorted__create_read_update_delete_readAbout_fileDelete_fileUpload =
  [
    ...sorted__create_read_update_delete_grant,
    "READ_ABOUT",
    "FILE_DELETE",
    "FILE_UPLOAD",
  ].sort();

export const sorted__create_read_update_delete_contribute_readAbout_fileDelete_fileUpload =
  [
    ...sorted__create_read_update_delete,
    "CONTRIBUTE",
    "READ_ABOUT",
    "FILE_DELETE",
    "FILE_UPLOAD",
  ].sort();
