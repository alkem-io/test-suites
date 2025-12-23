import { ProfileModel } from "./ProfileModel";

export type SpaceModel = {
  id: string;
  nameId: string;
  about: {
    id: string;
    profile: ProfileModel;
  };
  templateSetId: string;
  community: {
    id: string;
    roleSetId: string;
    applicationId: string;
  };
  collaboration: {
    id: string;
    calloutsSetId: string;
    calloutPostCollectionId: string;
    calloutPostCollectionDisplayName: string;
    calloutWhiteboardId: string;
    calloutWhiteboardDisplayName: string;
    calloutPostId: string;
    calloutPostDisplayName: string;
    calloutPostCommentsId: string;
  };
  contextId: string;
  communication: {
    id: string;
    messageId: string;
    updatesId: string;
  };
};
