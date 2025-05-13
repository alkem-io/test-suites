import { OrganizationModel } from './OrganizationModel';
import { SpaceModel } from './SpaceModel';

export type OrganizationWithSpaceModel = {
  name: string;
  organization: OrganizationModel;
  space: SpaceModel;
  subspace: SpaceModel;
  subsubspace: SpaceModel;
  scenarioSetupSucceeded: boolean;
};
