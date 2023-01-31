export const readPrivilege = ['READ'];
const create_read_update_delete = [
  'CREATE',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
];
const create_read_update_delete_grant = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
];

export const sorted_cgrud_createComment_Privilege = [
  ...create_read_update_delete_grant,
  'CREATE_COMMENT',
].sort();

export const sorted_cgrud_createDiscussion_Privilege = [
  'CREATE',
  'GRANT',
  ...readPrivilege,
  'UPDATE',
  'DELETE',
  'CREATE_DISCUSSION',
].sort();
const apply_join_Privilege = ['COMMUNITY_APPLY', 'COMMUNITY_JOIN'];
const cgrud_uc_com_Privilege = [
  ...create_read_update_delete_grant,
  'UPDATE_CANVAS',
  'CREATE_COMMENT',
  'MOVE_CARD',
];

export const sorted_create_read_update_delete_grant_createComment_moveCard = [
  ...create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_CARD',
].sort();
export const sorted_sorted_create_read_update_delete_grant_contribute_moveCard = [
  ...create_read_update_delete_grant,
  'CONTRIBUTE',
  'MOVE_CARD',
].sort();
export const sorted_create_read_update_delete_grant_contribute = [
  ...create_read_update_delete_grant,
  'CONTRIBUTE',
].sort();
export const sorted_create_read_update_delete_grant_contribute_calloutPublished = [
  ...create_read_update_delete_grant,
  'CONTRIBUTE',
  'UPDATE_CALLOUT_PUBLISHER',
].sort();
const cgrud_com_Privilege = [
  ...create_read_update_delete_grant,
  'CREATE_COMMENT',
  'MOVE_CARD',
];
const cgrud_cr_ccal_Privilege = [
  ...create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
];

export const sorted_create_read_update_delete_grant_createRelation_createCallout_contribute = [
  ...create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
  'CONTRIBUTE',
].sort();

const cgrud_ca_ccan_ucan_ccom_Privilege = [
  ...create_read_update_delete_grant,
  'CREATE_ASPECT',
  'CREATE_CANVAS',
  'UPDATE_CANVAS',
  'CREATE_COMMENT',
];

export const sorted_create_read_update_delete_grant_createComment_createCard_createCanvas = [
  ...create_read_update_delete_grant,
  'CREATE_ASPECT',
  'CREATE_CANVAS',
  'CREATE_COMMENT',
].sort();

const cgrud_apply_join_innflow_Privilege = [
  ...create_read_update_delete_grant,
  ...apply_join_Privilege,
  'UPDATE_INNOVATION_FLOW',
];

const cgrud_apply_join_Privilege = [
  ...create_read_update_delete_grant,
  ...apply_join_Privilege,
];

const cgrud_innflow_Privilege = [
  ...create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
];
export const sorted_create_read_update_delete_grant_updateInnovationFlow_createOpportunity = [
  ...create_read_update_delete_grant,
  'UPDATE_INNOVATION_FLOW',
  'CREATE_OPPORTUNITY',
].sort();

const cgrud_authRes_Privilege = [
  ...create_read_update_delete_grant,
  'AUTHORIZATION_RESET',
];
const crud_authRes_Privilege = [
  ...create_read_update_delete,
  'AUTHORIZATION_RESET',
];

const cgrud_authRes_createCh_Privilege = [
  ...create_read_update_delete_grant,
  'AUTHORIZATION_RESET',
  'CREATE_CHALLENGE',
];

const read_creRel_Privilege = [...readPrivilege, 'CREATE_RELATION'];

const read_appl_join_Privilege = [...readPrivilege, ...apply_join_Privilege];

export const crud_sortPrivileges = create_read_update_delete.sort();
export const sortPrivileges = create_read_update_delete_grant.sort();
export const sort_createDiscussion_Privileges = create_read_update_delete_grant.sort();

export const apply_join_sortedPrivilege = apply_join_Privilege.sort();
export const cgrud_uc_cc_sortedPrivileges = cgrud_uc_com_Privilege.sort();
export const cgrud_cc_sortedPrivileges = cgrud_com_Privilege.sort();
export const cgrud_cr_cal_sortedPrivileges = cgrud_cr_ccal_Privilege.sort();
export const cgrud_ca_ccan_ucan_ccom_sortedPrivileges = cgrud_ca_ccan_ucan_ccom_Privilege.sort();
export const cgrud_apply_join_innflow_sortedPrivileges = cgrud_apply_join_innflow_Privilege.sort();
export const cgrud_apply_join_sortedPrivileges = cgrud_apply_join_Privilege.sort();
export const cgrud_innflow_sortedPrivileges = cgrud_innflow_Privilege.sort();
export const cgrud_authRes_sortedPrivileges = cgrud_authRes_Privilege.sort();
export const crud_authRes_sortedPrivileges = crud_authRes_Privilege.sort();
export const cgrud_authRes_createCh_sortedPrivileges = cgrud_authRes_createCh_Privilege.sort();
export const read_creRel_sortedPrivileges = read_creRel_Privilege.sort();
export const read_appl_join_sortedPrivileges = read_appl_join_Privilege.sort();
