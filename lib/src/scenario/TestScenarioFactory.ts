import { OrganizationWithSpaceModel } from "./models/OrganizationWithSpaceModel";
import { SpaceModel } from "./models/SpaceModel";
import {
  TestScenarioConfig,
  TestScenarioSpaceConfig,
} from "./config/test-scenario-config";
import { TestUserManager } from "./TestUserManager";
import { UserModel } from "./models/UserModel";
import { OrganizationModel } from "./models/OrganizationModel";
import { LogManager } from "./LogManager";
import {
  CalloutType,
  CalloutVisibility,
  RoleName,
} from "../core/generated/alkemio-schema";
import { TestUser } from "../common/enums/test.user";
import { UniqueIDGenerator } from "../utils/uniqueId";
import {
  assignPlatformRole,
  assignRoleToUser,
  createCalloutOnCalloutsSet,
  createOrganization,
  createSpaceBasicData,
  createSubspace,
  createWhiteboardCalloutOnCalloutsSet,
  deleteOrganization,
  deleteSpace,
  getSpaceData,
  updateCalloutVisibility,
  updateSpaceSettings,
} from "./baseFunctions";

export class TestScenarioFactory {
  public static async createBaseScenarioEmpty(
    scenarioConfig: TestScenarioConfig
  ) {
    await TestUserManager.populateUserModelMap();
    await this.populateGlobalRoles();
    const result = scenarioConfig;
    return result;
  }

  public static async createBaseScenario(
    scenarioConfig: TestScenarioConfig
  ): Promise<OrganizationWithSpaceModel> {
    const result = await this.createBaseScenarioPrivate(scenarioConfig);
    // logElapsedTime('createBaseScenario', start);
    return result;
  }

  private static async createBaseScenarioPrivate(
    scenarioConfig: TestScenarioConfig
  ): Promise<OrganizationWithSpaceModel> {
    const baseScenario: OrganizationWithSpaceModel =
      this.createEmptyBaseScenario();
    baseScenario.name = scenarioConfig.name;

    try {
      await TestUserManager.populateUserModelMap();
      await this.populateGlobalRoles();
      await this.createOrganization(
        baseScenario.name,
        baseScenario.organization
      );
      baseScenario.scenarioSetupSucceeded = true;

      LogManager.getLogger().info("Initial base scenario setup created");
      if (!scenarioConfig.space) {
        // nothing more to do, return
        return baseScenario;
      }

      baseScenario.space = await this.createRootSpace(
        baseScenario.space,
        baseScenario.organization.accountId,
        baseScenario.name,
        scenarioConfig.space.collaboration?.addTutorialCallouts ?? true
      );

      await this.populateSpace(
        scenarioConfig.space,
        baseScenario.space,
        baseScenario.name
      );

      const subspace = scenarioConfig.space.subspace;
      if (!subspace) {
        // all done, return
        return baseScenario;
      }

      await this.createSubspace(
        baseScenario.space.id,
        baseScenario.name,
        baseScenario.subspace
      );
      await this.populateSpace(
        subspace,
        baseScenario.subspace,
        baseScenario.name
      );

      const subsubspace = subspace.subspace;
      if (!subsubspace) {
        // all done, return
        return baseScenario;
      }

      await this.createSubspace(
        baseScenario.subspace.id,
        baseScenario.name,
        baseScenario.subsubspace
      );
      await this.populateSpace(
        subsubspace,
        baseScenario.subsubspace,
        baseScenario.name
      );
    } catch (e: any) {
      LogManager.getLogger().error(
        `Unable to create core scenario setup: ${e}`,
        e?.stack
      );
      process.exit(1); // Exit the Jest process with an error code.
    }

    return baseScenario;
  }

  private static async populateGlobalRoles(): Promise<void> {
    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.globalLicenseAdmin,
      RoleName.GlobalLicenseManager
    );

    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.globalSupportAdmin,
      RoleName.GlobalSupport
    );

    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.betaTester,
      RoleName.PlatformBetaTester
    );
  }

  private static async checkAndAssignRoleNameToUser(
    userModel: UserModel,
    role: RoleName
  ): Promise<void> {
    const alreadyHasRole = userModel.RoleNames.includes(role);
    if (!alreadyHasRole) {
      if (userModel.id.length === 0) {
        // Missing user ID, cannot assign role
        LogManager.getLogger().error(
          `User ID is missing for ${userModel.type}, cannot assign role ${role}`
        );
        process.exit(1); // Exit the Jest process with an error code.
      }
      await assignPlatformRole(userModel.id, role);
    }
  }

  public static async cleanUpBaseScenario(
    baseScenario: OrganizationWithSpaceModel
  ): Promise<void> {
    try {
      if (baseScenario.subsubspace && baseScenario.subsubspace.id.length > 0) {
        await deleteSpace(baseScenario.subsubspace.id);
      }
      if (baseScenario.subspace && baseScenario.subspace.id.length > 0) {
        await deleteSpace(baseScenario.subspace.id);
      }
      if (baseScenario.space && baseScenario.space.id.length > 0) {
        await deleteSpace(baseScenario.space.id);
      }
      if (
        baseScenario.organization &&
        baseScenario.organization.id.length > 0
      ) {
        await deleteOrganization(baseScenario.organization.id);
      }
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to tear down core scenario setup for '${baseScenario.name}: ${e}`
      );
      process.exit(1); // Exit the Jest process with an error code.
    }
  }

  private static async populateSpace(
    spaceConfig: TestScenarioSpaceConfig,
    spaceModel: SpaceModel,
    scenarioName: string
  ): Promise<SpaceModel> {
    const roleSetID = spaceModel.community.roleSetId;
    const spaceCommunityConfig = spaceConfig.community;
    if (spaceConfig.settings) {
      if (spaceConfig.settings.privacy) {
        await updateSpaceSettings(spaceModel.id, {
          privacy: { mode: spaceConfig.settings.privacy.mode },
        });
      }
      if (spaceConfig.settings.membership) {
        await updateSpaceSettings(spaceModel.id, {
          membership: {
            policy: spaceConfig.settings.membership.policy,
          },
        });
      }
    }
    if (spaceCommunityConfig) {
      if (spaceCommunityConfig.members) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.members,
          RoleName.Member,
          roleSetID
        );
      }
      if (spaceCommunityConfig.admins) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.admins,
          RoleName.Admin,
          roleSetID
        );
      }

      if (spaceCommunityConfig.leads) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.leads,
          RoleName.Lead,
          roleSetID
        );
      }
    }
    const spaceCollaborationConfig = spaceConfig.collaboration;
    if (spaceCollaborationConfig) {
      if (spaceCollaborationConfig.addPostCallout) {
        await this.createPostCalloutOnSpace(spaceModel, scenarioName);
      }
      if (spaceCollaborationConfig.addPostCollectionCallout) {
        await this.createPostCollectionCalloutOnSpace(spaceModel, scenarioName);
      }
      if (spaceCollaborationConfig.addWhiteboardCallout) {
        await this.createWhiteboardCalloutOnSpace(spaceModel, scenarioName);
      }
    }
    return spaceModel;
  }

  private static async assignUsersByTypeToRole(
    userTypes: TestUser[],
    role: RoleName,
    roleSetID: string
  ): Promise<void> {
    const usersIdsToAssign: string[] = [];
    for (const userName of userTypes) {
      const user = TestUserManager.getUserModelByType(userName);
      usersIdsToAssign.push(user.id);
    }
    for (const userID of usersIdsToAssign) {
      await assignRoleToUser(userID, roleSetID, role);
    }
  }

  private static async createOrganization(
    scenarioName: string,
    model: OrganizationModel
  ): Promise<OrganizationModel> {
    const uniqueId = UniqueIDGenerator.getID();
    const truncatedScenarioName = scenarioName.slice(0, 18);
    const orgName = `${truncatedScenarioName}-${uniqueId}`;
    const orgNameId = this.validateAndClean(`${orgName}`);
    if (!orgNameId) {
      throw new Error(
        `Unable to create organization: Invalid hostNameId: ${orgNameId}`
      );
    }
    const responseOrg = await createOrganization(
      orgName,
      orgNameId.toLowerCase().slice(0, 24)
    );

    if (!responseOrg.data?.createOrganization) {
      throw new Error(
        `Failed to create organization: ${JSON.stringify(responseOrg.error)}`
      );
    }

    const orgResponseData = responseOrg.data?.createOrganization;

    model.id = orgResponseData.id ?? "";
    model.nameId = orgResponseData.nameID ?? "";
    model.roleSetId = orgResponseData.roleSet.id ?? "";
    model.agentId = orgResponseData.agent.id ?? "";
    model.accountId = orgResponseData.account?.id ?? "";
    model.verificationId = orgResponseData.verification.id ?? "";
    model.profile = {
      id: orgResponseData.profile.id ?? "",
      displayName: orgResponseData.profile.displayName ?? "",
    };
    return model;
  }

  private static validateAndClean(input: string): string | null {
    // Remove all spaces from the string
    const cleaned = input.replace(/\s+/g, "");

    // Validate that the string contains only letters, numbers, and "-"
    const isValid = /^[a-zA-Z0-9-]+$/.test(cleaned);

    return isValid ? cleaned : null;
  }

  private static async createRootSpace(
    spaceModel: SpaceModel,
    accountID: string,
    scenarioName: string,
    addTutorialCallouts: boolean
  ): Promise<SpaceModel> {
    const uniqueId = UniqueIDGenerator.getID();
    const truncatedScenarioName = scenarioName.slice(0, 18);
    const spaceName = `${truncatedScenarioName}-${uniqueId}`;
    const spaceNameId = this.validateAndClean(`${spaceName.toLowerCase()}`);
    if (!spaceNameId) {
      throw new Error(`Unable to create space: Invalid nameId: ${spaceNameId}`);
    }

    const responseRootSpace = await this.createSpaceAndGetData(
      spaceName,
      spaceNameId,
      accountID,
      addTutorialCallouts
    );

    if (!responseRootSpace.data?.lookup?.space) {
      throw new Error(
        `Failed to create root space: ${JSON.stringify(
          responseRootSpace.error
        )}`
      );
    }

    const spaceData = responseRootSpace.data?.lookup?.space;
    spaceModel.id = spaceData?.id ?? "";
    spaceModel.nameId = spaceData?.nameID ?? "";
    spaceModel.about = {
      id: spaceData?.about?.id ?? "",
      profile: {
        id: spaceData?.about.profile?.id ?? "",
        displayName: spaceData?.about.profile?.displayName ?? "",
      },
    };
    spaceModel.collaboration.id = spaceData?.collaboration.id ?? "";
    spaceModel.communication.updatesId =
      spaceData?.community?.communication?.updates.id ?? "";
    spaceModel.collaboration.calloutsSetId =
      spaceData?.collaboration.calloutsSet?.id ?? "";
    spaceModel.community.id = spaceData?.community?.id ?? "";
    spaceModel.community.roleSetId = spaceData?.community?.roleSet?.id ?? "";
    spaceModel.templateSetId =
      spaceData?.templatesManager?.templatesSet?.id ?? "";

    return spaceModel;
  }

  private static async createPostCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string
  ): Promise<SpaceModel> {
    const createPostCallout = await createCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: { displayName: `${scenarioName} - post` },
        },
        type: CalloutType.Post,
      }
    );
    const postCalloutData = createPostCallout.data?.createCalloutOnCalloutsSet;

    spaceModel.collaboration.calloutPostId = postCalloutData?.id ?? "";
    spaceModel.collaboration.calloutPostCommentsId =
      postCalloutData?.comments?.id ?? "";
    await updateCalloutVisibility(
      spaceModel.collaboration.calloutPostId,
      CalloutVisibility.Published
    );

    return spaceModel;
  }

  private static async createPostCollectionCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string
  ): Promise<SpaceModel> {
    const callForPostCalloutData = await createCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: `postCollectionCallout-${scenarioName}`,
            description: `postCollectionCallout-${scenarioName} - created as part of scenario setup for tests`,
          },
        },
        type: CalloutType.PostCollection,
      }
    );

    spaceModel.collaboration.calloutPostCollectionId =
      callForPostCalloutData?.data?.createCalloutOnCalloutsSet?.id ?? "";

    await updateCalloutVisibility(
      spaceModel.collaboration.calloutPostCollectionId,
      CalloutVisibility.Published
    );
    return spaceModel;
  }

  private static async createWhiteboardCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string
  ): Promise<SpaceModel> {
    const whiteboardCalloutData = await createWhiteboardCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: `${scenarioName} - whiteboard callout`,
            description: "Whiteboard - initial",
          },
        },
        type: CalloutType.WhiteboardCollection,
      },
      TestUser.GLOBAL_ADMIN
    );

    spaceModel.collaboration.calloutWhiteboardId =
      whiteboardCalloutData?.data?.createCalloutOnCalloutsSet?.id ?? "";

    await updateCalloutVisibility(
      spaceModel.collaboration.calloutWhiteboardId,
      CalloutVisibility.Published
    );

    return spaceModel;
  }

  private static async createSubspace(
    parentSpaceID: string,
    subspaceName: string,
    targetModel: SpaceModel
  ): Promise<SpaceModel> {
    const uniqueId = UniqueIDGenerator.getID();
    const responseSubspace = await createSubspace(
      subspaceName,
      `ssnameid${uniqueId}`,
      parentSpaceID
    );

    const subspaceData = responseSubspace.data?.createSubspace;
    targetModel.id = subspaceData?.id ?? "";
    targetModel.nameId = subspaceData?.nameID ?? "";
    targetModel.community.id = subspaceData?.community?.id ?? "";
    targetModel.community.roleSetId =
      subspaceData?.community?.roleSet?.id ?? "";
    targetModel.communication.id =
      subspaceData?.community?.communication?.id ?? "";
    targetModel.communication.updatesId =
      subspaceData?.community?.communication?.updates.id ?? "";
    targetModel.collaboration.id = subspaceData?.collaboration?.id ?? "";
    targetModel.collaboration.calloutsSetId =
      subspaceData?.collaboration.calloutsSet?.id ?? "";
    targetModel.about.id = subspaceData?.about?.id ?? "";
    targetModel.about.profile.id = subspaceData?.about.profile?.id ?? "";
    targetModel.about.profile.displayName =
      subspaceData?.about.profile?.displayName ?? "";

    return targetModel;
  }

  public static async assignUsersToMemberRole(
    roleSetId: string,
    spaceLevel: 0 | 1 | 2
  ): Promise<void> {
    const usersIdsToAssign: string[] = [];
    switch (spaceLevel) {
      case 0:
        usersIdsToAssign.push(TestUserManager.users.spaceAdmin.id);
        usersIdsToAssign.push(TestUserManager.users.spaceMember.id);
        break;
      case 1:
        usersIdsToAssign.push(TestUserManager.users.subspaceAdmin.id);
        usersIdsToAssign.push(TestUserManager.users.subspaceMember.id);
        break;
      case 2:
        usersIdsToAssign.push(TestUserManager.users.subsubspaceAdmin.id);
        usersIdsToAssign.push(TestUserManager.users.subsubspaceMember.id);
    }
    for (const userID of usersIdsToAssign) {
      await assignRoleToUser(userID, roleSetId, RoleName.Member);
    }
  }

  private static async createSpaceAndGetData(
    spaceName: string,
    spaceNameId: string,
    accountID: string,
    addTutorialCallouts: boolean,
    role = TestUser.GLOBAL_ADMIN
  ) {
    const response = await createSpaceBasicData(
      spaceName,
      spaceNameId,
      accountID,
      addTutorialCallouts,
      role
    );
    const spaceId = response?.data?.createSpace.id ?? "";
    await updateSpaceSettings(spaceId, {
      privacy: { allowPlatformSupportAsAdmin: true },
    });

    const spaceData = await getSpaceData(spaceId);

    return spaceData;
  }

  private static createEmptyBaseScenario(): OrganizationWithSpaceModel {
    return {
      name: "",
      organization: {
        id: "",
        agentId: "",
        accountId: "",
        roleSetId: "",
        verificationId: "",
        profile: {
          id: "",
          displayName: "",
        },
        nameId: "",
      },
      space: this.createEmptySpaceContext(),
      subspace: this.createEmptySpaceContext(),
      subsubspace: this.createEmptySpaceContext(),
      scenarioSetupSucceeded: false,
    };
  }

  private static createEmptySpaceContext(): SpaceModel {
    return {
      id: "",
      community: {
        id: "",
        roleSetId: "",
        applicationId: "",
      },
      about: {
        id: "",
        profile: {
          id: "",
          displayName: "",
        },
      },
      collaboration: {
        id: "",
        calloutsSetId: "",
        calloutPostCollectionId: "",
        calloutWhiteboardId: "",
        calloutPostId: "",
        calloutPostCommentsId: "",
      },
      contextId: "",
      communication: {
        id: "",
        updatesId: "",
        messageId: "",
      },
      nameId: "",
      templateSetId: "",
    };
  }
}
