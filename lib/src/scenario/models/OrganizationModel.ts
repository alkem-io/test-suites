import { ProfileModel } from './ProfileModel';

export type OrganizationModel = {
  id: string;
  accountId: string;
  agentId: string;
  nameId: string;
  profile: ProfileModel;
  verificationId: string;
  roleSetId: string;
};