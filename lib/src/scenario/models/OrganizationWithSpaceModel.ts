import { OrganizationModel } from "./OrganizationModel";
import { SpaceModel } from "./SpaceModel";

export type OrganizationWithSpaceModel = {
  name: string;
  organization: OrganizationModel;
  space: SpaceModel;
  subspace: SpaceModel;
  subsubspace: SpaceModel;
  scenarioSetupSucceeded: boolean;
  innovationPack?: {
    id: string;
    nameId: string;
    templatesSetId: string;
    providerOrganizationId: string;
  };
  virtualContributors?: Array<{
    id: string;
    nameId: string;
    hostOrganizationId: string;
  }>;
  virtualContributorsHostOrganizationId?: string;
  platformForumId?: string;
  platformDiscussionId?: string;
};
