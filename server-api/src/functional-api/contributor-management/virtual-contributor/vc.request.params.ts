import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { createCalloutOnCalloutsSet } from '@functional-api/callout/callouts.request.params';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { CalloutContributionType } from '@alkemio/client-lib';
import {
  AiPersonaEngine,
  CalloutVisibility,
  SearchVisibility,
  VirtualContributorBodyOfKnowledgeType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

export const createVirtualContributorOnAccountSpaceBased = async (
  displayName: string,
  accountID: string,
  bodyOfKnowledgeID: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateVirtualContributorOnAccount(
      {
        virtualContributorData: {
          profileData: {
            displayName,
          },
          accountID,
          bodyOfKnowledgeID,
          aiPersona: {
            engine: AiPersonaEngine.Expert,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createVirtualContributorOnAccountKnowledgeBased = async (
  displayName: string,
  accountID: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateVirtualContributorOnAccount(
      {
        virtualContributorData: {
          profileData: {
            displayName,
          },
          accountID,
          bodyOfKnowledgeType:
            VirtualContributorBodyOfKnowledgeType.AlkemioKnowledgeBase,
          aiPersona: {
            engine: AiPersonaEngine.Expert,
          },
        },
      },

      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createVirtualContributorOnAccountKnowledgeBasedWithCallout =
  async (
    displayName: string,
    accountID: string,
    userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
  ) => {
    const createVC = await createVirtualContributorOnAccountKnowledgeBased(
      displayName,
      accountID,
      userRole
    );
    const vcData = createVC?.data?.createVirtualContributor;
    const vcId = vcData?.id ?? '';
    const vcCalloutSetId = vcData?.knowledgeBase?.calloutsSet?.id ?? '';
    await createCalloutOnCalloutsSet(
      vcCalloutSetId,
      {
        framing: {
          profile: { displayName: 'Post callout' },
        },
        settings: {
          contribution: {
            allowedTypes: [CalloutContributionType.Post],
            enabled: false,
          },
          visibility: CalloutVisibility.Published,
        },
      },
      userRole
    );
    return vcId;
  };

export const updateVirtualContributor = async (
  ID: string,
  searchVisibility: SearchVisibility,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateVirtualContributor(
      {
        virtualContributorData: {
          ID,
          searchVisibility,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateVirtualContributorSettings = async (
  virtualContributorID: string,
  knowledgeBaseContentVisible: boolean,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateVirtualContributorSettings(
      {
        settingsData: {
          virtualContributorID,
          settings: {
            privacy: {
              knowledgeBaseContentVisible,
            },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteVirtualContributorOnAccount = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteVirtualContributorOnAccount(
      {
        virtualContributorData: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const removeVirtualContributorFromRoleSet = async (
  roleSetId: string,
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromVirtualContributor(
      {
        roleSetId,
        virtualContributorId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCData = async (
  id: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributor(
      {
        id,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCKnowledgeBase = async (
  id: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributorKnowledgeBase(
      {
        id,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCKnowledgePrivileges = async (
  id: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributorKnowledgePrivileges(
      {
        id,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCStorageConfig = async (
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributorStorageConfig(
      {
        virtualContributorId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCKnowledgeStorageConfig = async (
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributorKnowledgeStorageConfig(
      {
        virtualContributorId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
