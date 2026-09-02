import { OrganizationWithSpaceModel } from "./models/OrganizationWithSpaceModel";
import { SpaceModel } from "./models/SpaceModel";
import {
  TestScenarioConfig,
  TestScenarioSpaceConfig,
  TestScenarioInnovationPackConfig,
  TestScenarioVirtualContributorsConfig,
  TestScenarioOrganizationConfig,
  TestScenarioPlatformDiscussionConfig,
} from "./config/test-scenario-config";
import { TestUserManager } from "./TestUserManager";
import { UserModel } from "./models/UserModel";
import { OrganizationModel } from "./models/OrganizationModel";
import { LogManager } from "./LogManager";
import {
  CalloutAllowedActors,
  CalloutVisibility,
  RoleName,
} from "../core/generated/alkemio-schema";
import { TestUser } from "../common/enums/test.user";
import { UniqueIDGenerator } from "../utils/uniqueId";
import { describeError, isEnvFailure } from "../utils/env-failure";
import { delay } from "../utils/delay";
import {
  assignPlatformRole,
  assignRoleToUser,
  assignLicensePlanToAccount,
  getLicensePlanByName,
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
  createInnovationPack,
  createTemplateOnTemplatesSet,
  triggerOrganizationVerification,
  updateInnovationPackVisibility,
  updateVirtualContributorVisibility,
  deleteVirtualContributor,
  applyOrganizationVerificationSequence,
  createPlatformDiscussion,
  getPlatformForumId,
  deletePlatformDiscussion,
  deleteInnovationPack,
} from "./baseFunctions";
import {
  CalloutContributionType,
  ForumDiscussionCategory,
} from "@alkemio/client-lib/dist/generated/graphql";
import { TemplateType } from "@alkemio/client-lib";
import { SearchVisibility } from "@alkemio/client-lib/dist/generated/graphql";

export class TestScenarioFactory {
  public static async createBaseScenarioEmpty(
    scenarioConfig: TestScenarioConfig,
  ) {
    await TestUserManager.populateUserModelMap();
    await this.populateGlobalRoles();
    const result = scenarioConfig;
    return result;
  }

  public static async createBaseScenario(
    scenarioConfig: TestScenarioConfig,
  ): Promise<OrganizationWithSpaceModel> {
    return this.withEnvFailureRetry(
      () => this.createBaseScenarioPrivate(scenarioConfig),
      `base scenario '${scenarioConfig.name}'`,
    );
  }

  // Env-failure signatures + backoff for core scenario setup (test-suites#563).
  private static readonly SETUP_MAX_ATTEMPTS = 2; // one retry
  private static readonly SETUP_RETRY_BASE_MS = 3000;

  /**
   * Retries core scenario setup ONLY on environment failures (Matrix/RPC
   * timeout, auth endpoint mid-roll, connection reset) — never on a product
   * error, because setup makes no assertions, so any failure here is either
   * infra flake (retry) or a genuine setup bug (surface it). A transient
   * Synapse/adapter blip or a brief pod roll then recovers on the retry instead
   * of failing the whole suite. If it still fails and the cause is
   * environmental, the error is tagged `[ENV_FAILURE]` so the report shows it
   * as environment noise, not a product regression.
   */
  private static async withEnvFailureRetry<T>(
    fn: () => Promise<T>,
    label: string,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.SETUP_MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (isEnvFailure(e) && attempt < this.SETUP_MAX_ATTEMPTS) {
          const wait = this.SETUP_RETRY_BASE_MS * attempt;
          LogManager.getLogger().warn(
            `[ENV_FAILURE] setup of ${label} failed (attempt ${attempt}/${this.SETUP_MAX_ATTEMPTS}); retrying in ${wait}ms — ${describeError(e)}`,
          );
          await delay(wait);
          continue;
        }
        break;
      }
    }
    if (isEnvFailure(lastError)) {
      throw new Error(
        `[ENV_FAILURE] setup of ${label} failed after ${this.SETUP_MAX_ATTEMPTS} attempt(s) — environment, not product: ${describeError(lastError)}`,
      );
    }
    throw lastError;
  }

  public static async createBaseScenarioOrganization(
    scenarioConfig: TestScenarioConfig,
  ): Promise<OrganizationWithSpaceModel> {
    return this.withEnvFailureRetry(
      () => this.createBaseScenarioOrganizationPrivate(scenarioConfig),
      `organization scenario '${scenarioConfig.name}'`,
    );
  }

  private static async createBaseScenarioOrganizationPrivate(
    scenarioConfig: TestScenarioConfig,
  ): Promise<OrganizationWithSpaceModel> {
    const baseScenario: OrganizationWithSpaceModel =
      this.createEmptyBaseScenario();
    baseScenario.name = scenarioConfig.name;

    try {
      await TestUserManager.populateUserModelMap();
      await this.populateGlobalRoles();
      await this.createOrganization(
        baseScenario.name,
        baseScenario.organization,
        scenarioConfig.organization,
      );
      baseScenario.scenarioSetupSucceeded = true;
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to create organization scenario setup: ${e}`,
      );
      // Throw (not process.exit): an exit kills the whole vitest worker,
      // converting one transient failure into a silent mass-skip and hiding
      // the root cause. A throw fails only this suite, with the cause attached.
      throw new Error(`Unable to create organization scenario setup: ${e}`);
    }

    return baseScenario;
  }

  private static async createBaseScenarioPrivate(
    scenarioConfig: TestScenarioConfig,
  ): Promise<OrganizationWithSpaceModel> {
    const baseScenario: OrganizationWithSpaceModel =
      this.createEmptyBaseScenario();

    const {
      name,
      organization,
      innovationPack,
      virtualContributors,
      platformDiscussion,
      space,
    } = scenarioConfig;
    baseScenario.name = name;

    try {
      await TestUserManager.populateUserModelMap();
      await this.populateGlobalRoles();
      await this.createOrganization(
        baseScenario.name,
        baseScenario.organization,
        organization,
      );
      baseScenario.scenarioSetupSucceeded = true;

      LogManager.getLogger().info("Initial base scenario setup created");

      // Optional: create Innovation Pack with templates
      if (innovationPack) {
        await this.setupInnovationPack(innovationPack, baseScenario);
      }

      // Optional: create Virtual Contributors
      if (virtualContributors) {
        await this.setupVirtualContributors(virtualContributors, baseScenario);
      }

      // Optional: create a platform discussion
      if (platformDiscussion) {
        await this.setupPlatformDiscussion(platformDiscussion, baseScenario);
      }

      if (!space) {
        // nothing more to do, return
        return baseScenario;
      }

      baseScenario.space = await this.createRootSpace(
        baseScenario.space,
        baseScenario.organization.accountId,
        baseScenario.name,
        // Default OFF: tutorial callouts add one Matrix round-trip per
        // callout to space creation (slow + proxy-timeout prone) and no suite
        // asserts their content — opt in via collaboration.addTutorialCallouts.
        space.collaboration?.addTutorialCallouts ?? false,
      );

      await this.populateSpace(space, baseScenario.space, baseScenario.name);

      const subspace = space.subspace;
      if (!subspace) {
        // all done, return
        return baseScenario;
      }

      await this.createSubspace(
        baseScenario.space.id,
        "l1-" + baseScenario.name,
        baseScenario.subspace,
        subspace,
      );
      await this.populateSpace(
        subspace,
        baseScenario.subspace,
        "l1-" + baseScenario.name,
      );

      const subsubspace = subspace.subspace;
      if (!subsubspace) {
        // all done, return
        return baseScenario;
      }

      await this.createSubspace(
        baseScenario.subspace.id,
        "l2-" + baseScenario.name,
        baseScenario.subsubspace,
        subsubspace,
      );
      await this.populateSpace(
        subsubspace,
        baseScenario.subsubspace,
        "l2-" + baseScenario.name,
      );
    } catch (e: any) {
      LogManager.getLogger().error(
        `Unable to create core scenario setup: ${e}`,
        e?.stack,
      );
      // Throw (not process.exit): an exit kills the whole vitest worker,
      // converting one transient failure into a silent mass-skip and hiding
      // the root cause. A throw fails only this suite, with the cause attached.
      throw new Error(`Unable to create core scenario setup: ${e}`);
    }

    return baseScenario;
  }

  private static async setupInnovationPack(
    config: TestScenarioInnovationPackConfig,
    baseScenario: OrganizationWithSpaceModel,
  ): Promise<void> {
    try {
      const uniqueId = UniqueIDGenerator.getID();
      const useBaseOrg = config.useBaseOrganization === true;

      // Create or reuse provider organization for the pack
      const providerOrgModel: OrganizationModel = useBaseOrg
        ? baseScenario.organization
        : ({
            id: "",
            agentId: "",
            accountId: "",
            roleSetId: "",
            verificationId: "",
            profile: {
              id: "",
              displayName:
                config.providerOrganization?.about?.profile?.displayName ||
                `Pack Provider Org ${uniqueId}`,
              tagline:
                config.providerOrganization?.about?.profile?.tagline || "",
            },
            nameId: "",
          } as OrganizationModel);

      if (!useBaseOrg) {
        await this.createOrganization(
          providerOrgModel.profile.displayName,
          providerOrgModel,
          config.providerOrganization,
        );
      }

      const packDisplayName =
        config.pack?.displayName || `Innovation Pack ${uniqueId}`;
      const packNameId = (
        config.pack?.nameID || `pack-${uniqueId}`
      ).toLowerCase();

      const packRes = await createInnovationPack(
        providerOrgModel.accountId,
        packDisplayName,
        packNameId,
        undefined,
        { tags: config.pack?.tags },
      );

      const packId = packRes.data?.createInnovationPack?.id || "";
      const templatesSetId =
        packRes.data?.createInnovationPack?.templatesSet?.id || "";
      const packNameID = packRes.data?.createInnovationPack?.nameID || "";

      baseScenario.innovationPack = {
        id: packId,
        nameId: packNameID,
        templatesSetId: templatesSetId,
        providerOrganizationId: providerOrgModel.id,
      };

      if (packId && config.visibility) {
        const visibilityMap: Record<string, SearchVisibility> = {
          PUBLIC: SearchVisibility.Public,
          ACCOUNT: SearchVisibility.Account,
          HIDDEN: SearchVisibility.Hidden,
        };
        const searchVisibility = config.visibility.searchVisibility
          ? visibilityMap[config.visibility.searchVisibility]
          : undefined;

        await updateInnovationPackVisibility(packId, {
          listedInStore: config.visibility.listedInStore,
          searchVisibility,
        });
      }

      if (templatesSetId && config.templates && config.templates.length > 0) {
        for (const t of config.templates) {
          const profileDisplayName =
            t.profileDisplayName || `${t.type} Template ${uniqueId}`;

          // Build template options - include optional fields only if they exist
          const templateOptions: any = {
            type: t.type as unknown as TemplateType,
            profileDisplayName,
            tags: t.tags,
          };

          // Add type-specific optional fields if present
          if ("postDefaultDescription" in t && t.postDefaultDescription) {
            templateOptions.postDefaultDescription = t.postDefaultDescription;
          }
          if ("sourceWhiteboardID" in t && t.sourceWhiteboardID) {
            templateOptions.sourceWhiteboardID = t.sourceWhiteboardID;
          }
          // Add callout-specific fields if present
          if ("calloutFramingType" in t && t.calloutFramingType) {
            templateOptions.calloutFramingType = t.calloutFramingType;
          }
          if ("calloutResponseTypes" in t && t.calloutResponseTypes) {
            templateOptions.calloutResponseTypes = t.calloutResponseTypes;
          }
          if (
            "calloutAllowedContributors" in t &&
            t.calloutAllowedContributors
          ) {
            templateOptions.calloutAllowedContributors =
              t.calloutAllowedContributors;
          }
          // Add callout framing-specific content if present
          if (
            "calloutWhiteboardFramingContent" in t &&
            t.calloutWhiteboardFramingContent
          ) {
            templateOptions.calloutWhiteboardFramingContent =
              t.calloutWhiteboardFramingContent;
          }
          if (
            "calloutMemoFramingMarkdown" in t &&
            t.calloutMemoFramingMarkdown
          ) {
            templateOptions.calloutMemoFramingMarkdown =
              t.calloutMemoFramingMarkdown;
          }
          if ("calloutLinkFramingUri" in t && t.calloutLinkFramingUri) {
            templateOptions.calloutLinkFramingUri = t.calloutLinkFramingUri;
          }
          await createTemplateOnTemplatesSet(templatesSetId, templateOptions);
        }
      }
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to create innovation pack setup: ${e}`,
      );
      // Throw (not process.exit): an exit kills the whole vitest worker,
      // converting one transient failure into a silent mass-skip and hiding
      // the root cause. A throw fails only this suite, with the cause attached.
      throw new Error(`Unable to create innovation pack setup: ${e}`);
    }
  }

  private static async setupVirtualContributors(
    config: TestScenarioVirtualContributorsConfig,
    baseScenario: OrganizationWithSpaceModel,
  ): Promise<void> {
    try {
      const { createVirtualContributor } = await import("./baseFunctions.js");

      if (
        !config.virtualContributors ||
        config.virtualContributors.length === 0
      ) {
        return;
      }

      const uniqueId = UniqueIDGenerator.getID();
      const useBaseOrg = config.useBaseOrganization === true;

      // Create or reuse host organization for the VCs
      const hostOrgModel: OrganizationModel = useBaseOrg
        ? baseScenario.organization
        : ({
            id: "",
            agentId: "",
            accountId: "",
            roleSetId: "",
            verificationId: "",
            profile: {
              id: "",
              displayName:
                config.hostOrganization?.about?.profile?.displayName ||
                `VC Host Org ${uniqueId}`,
              tagline: config.hostOrganization?.about?.profile?.tagline || "",
            },
            nameId: "",
          } as OrganizationModel);

      if (!useBaseOrg) {
        await this.createOrganization(
          hostOrgModel.profile.displayName,
          hostOrgModel,
          config.hostOrganization,
        );
        baseScenario.virtualContributorsHostOrganizationId = hostOrgModel.id;
      }

      // Create virtual contributors
      const createdVCs: Array<{
        id: string;
        nameId: string;
        hostOrganizationId: string;
      }> = [];

      for (const vc of config.virtualContributors) {
        const result = await createVirtualContributor(
          hostOrgModel.accountId,
          vc,
        );

        if (!result.data?.createVirtualContributor) {
          LogManager.getLogger().warn(
            `Failed to create virtual contributor: ${JSON.stringify(
              result.error,
            )}`,
          );
          continue;
        }

        const vcData = result.data.createVirtualContributor;
        createdVCs.push({
          id: vcData.id,
          nameId: vc.nameID || "",
          hostOrganizationId: hostOrgModel.id,
        });

        if (config.visibility && vcData.id) {
          const visibilityMap: Record<string, SearchVisibility> = {
            PUBLIC: SearchVisibility.Public,
            ACCOUNT: SearchVisibility.Account,
            HIDDEN: SearchVisibility.Hidden,
          };
          const searchVisibility = config.visibility.searchVisibility
            ? visibilityMap[config.visibility.searchVisibility]
            : undefined;

          await updateVirtualContributorVisibility(vcData.id, {
            listedInStore: config.visibility.listedInStore,
            searchVisibility,
          });
        }

        LogManager.getLogger().info(
          `Created Virtual Contributor: ${vc.nameID || vc.profileDisplayName}`,
        );
      }

      baseScenario.virtualContributors = createdVCs;
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to create virtual contributors setup: ${e}`,
      );
      // Throw (not process.exit): an exit kills the whole vitest worker,
      // converting one transient failure into a silent mass-skip and hiding
      // the root cause. A throw fails only this suite, with the cause attached.
      throw new Error(`Unable to create virtual contributors setup: ${e}`);
    }
  }

  private static async setupPlatformDiscussion(
    config: TestScenarioPlatformDiscussionConfig,
    baseScenario: OrganizationWithSpaceModel,
  ): Promise<void> {
    try {
      let resolvedForumId =
        config.forumID ||
        (config.forumIDEnvVarName
          ? process.env[config.forumIDEnvVarName]
          : process.env.PLATFORM_DISCUSSION_FORUM_ID);

      if (!resolvedForumId) {
        resolvedForumId = await getPlatformForumId(config.userRole);
      }

      if (!resolvedForumId) {
        LogManager.getLogger().warn(
          "Skipping platform discussion creation: forum ID not provided, no env fallback, and platform forum lookup failed",
        );
        return;
      }

      const categoryMap: Record<string, ForumDiscussionCategory> = {
        CHALLENGE_CENTRIC: ForumDiscussionCategory.ChallengeCentric,
        COMMUNITY_BUILDING: ForumDiscussionCategory.CommunityBuilding,
        HELP: ForumDiscussionCategory.Help,
        OTHER: ForumDiscussionCategory.Other,
        PLATFORM_FUNCTIONALITIES:
          ForumDiscussionCategory.PlatformFunctionalities,
        RELEASES: ForumDiscussionCategory.Releases,
      };

      const discussionRes = await createPlatformDiscussion(
        resolvedForumId,
        {
          title: config.title,
          description: config.description,
          category: config.category
            ? categoryMap[config.category]
            : ForumDiscussionCategory.PlatformFunctionalities,
        },
        config.userRole,
      );

      const discussionId = discussionRes.data?.createDiscussion?.id || "";
      baseScenario.platformForumId = resolvedForumId;
      baseScenario.platformDiscussionId = discussionId;
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to create platform discussion setup: ${e}`,
      );
      // Throw (not process.exit): an exit kills the whole vitest worker,
      // converting one transient failure into a silent mass-skip and hiding
      // the root cause. A throw fails only this suite, with the cause attached.
      throw new Error(`Unable to create platform discussion setup: ${e}`);
    }
  }

  private static async populateGlobalRoles(): Promise<void> {
    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.globalLicenseAdmin,
      RoleName.GlobalLicenseManager,
    );

    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.globalSupportAdmin,
      RoleName.GlobalSupport,
    );

    await this.checkAndAssignRoleNameToUser(
      TestUserManager.users.betaTester,
      RoleName.PlatformBetaTester,
    );
  }

  private static async checkAndAssignRoleNameToUser(
    userModel: UserModel,
    role: RoleName,
  ): Promise<void> {
    const alreadyHasRole = userModel.RoleNames.includes(role);
    if (!alreadyHasRole) {
      if (userModel.id.length === 0) {
        // Missing user ID, cannot assign role
        LogManager.getLogger().error(
          `User ID is missing for ${userModel.type}, cannot assign role ${role}`,
        );
        throw new Error(
          `User ID is missing for ${userModel.type}, cannot assign role ${role}`,
        );
      }
      await assignPlatformRole(userModel.id, role);
    }
  }

  public static async cleanUpBaseScenario(
    baseScenario: OrganizationWithSpaceModel,
  ): Promise<void> {
    try {
      // Delete platform discussion if created
      if (baseScenario.platformDiscussionId) {
        await deletePlatformDiscussion(baseScenario.platformDiscussionId);
      }

      if (baseScenario.subsubspace && baseScenario.subsubspace.id.length > 0) {
        await deleteSpace(baseScenario.subsubspace.id);
      }
      if (baseScenario.subspace && baseScenario.subspace.id.length > 0) {
        await deleteSpace(baseScenario.subspace.id);
      }
      if (baseScenario.space && baseScenario.space.id.length > 0) {
        await deleteSpace(baseScenario.space.id);
      }

      // Delete virtual contributors before removing any organizations
      if (baseScenario.virtualContributors?.length) {
        for (const vc of baseScenario.virtualContributors) {
          if (vc.id) {
            await deleteVirtualContributor(vc.id);
          }
        }
      }

      // Delete innovation pack after spaces are removed, before any org deletions
      if (baseScenario.innovationPack?.id) {
        await deleteInnovationPack(baseScenario.innovationPack.id);
      }

      // Delete VC host organization if it is separate
      if (
        baseScenario.virtualContributorsHostOrganizationId &&
        baseScenario.virtualContributorsHostOrganizationId !==
          baseScenario.organization.id
      ) {
        await deleteOrganization(
          baseScenario.virtualContributorsHostOrganizationId,
        );
      }

      // Delete Innovation Pack provider organization if it is separate
      if (
        baseScenario.innovationPack?.providerOrganizationId &&
        baseScenario.innovationPack.providerOrganizationId !==
          baseScenario.organization.id
      ) {
        await deleteOrganization(
          baseScenario.innovationPack.providerOrganizationId,
        );
      }
      if (
        baseScenario.organization &&
        baseScenario.organization.id.length > 0
      ) {
        await deleteOrganization(baseScenario.organization.id);
      }
    } catch (e) {
      LogManager.getLogger().error(
        `Unable to tear down core scenario setup for '${baseScenario.name}: ${e}`,
      );
      // Log-and-continue: a teardown failure must neither kill the worker
      // (process.exit) nor replace the in-flight test error (throw) — the
      // test outcome is the signal; leaked fixtures are logged above.
    }
  }

  private static async populateSpace(
    spaceConfig: TestScenarioSpaceConfig,
    spaceModel: SpaceModel,
    scenarioName: string,
  ): Promise<SpaceModel> {
    const roleSetID = spaceModel.community.roleSetId;
    const spaceCommunityConfig = spaceConfig.community;
    if (spaceConfig.settings) {
      if (spaceConfig.settings.privacy) {
        await updateSpaceSettings(spaceModel.id, {
          privacy: {
            mode: spaceConfig.settings.privacy.mode,
            allowPlatformSupportAsAdmin:
              spaceConfig.settings.privacy.allowPlatformSupportAsAdmin,
          },
        });
      }
      if (spaceConfig.settings.membership) {
        await updateSpaceSettings(spaceModel.id, {
          membership: {
            policy: spaceConfig.settings.membership.policy,
            allowSubspaceAdminsToInviteMembers:
              spaceConfig.settings.membership
                .allowSubspaceAdminsToInviteMembers,
            trustedOrganizations:
              spaceConfig.settings.membership.trustedOrganizations,
          },
        });
      }
      if (spaceConfig.settings.collaboration) {
        await updateSpaceSettings(spaceModel.id, {
          collaboration: {
            allowMembersToCreateCallouts:
              spaceConfig.settings.collaboration.allowMembersToCreateCallouts,
            allowMembersToCreateSubspaces:
              spaceConfig.settings.collaboration.allowMembersToCreateSubspaces,
            inheritMembershipRights:
              spaceConfig.settings.collaboration.inheritMembershipRights,
            allowEventsFromSubspaces:
              spaceConfig.settings.collaboration.allowEventsFromSubspaces,
            allowMembersToVideoCall:
              spaceConfig.settings.collaboration.allowMembersToVideoCall,
            allowGuestContributions:
              spaceConfig.settings.collaboration.allowGuestContributions,
          },
        });
      }
    }
    if (spaceCommunityConfig) {
      if (spaceCommunityConfig.members) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.members,
          RoleName.Member,
          roleSetID,
        );
      }
      if (spaceCommunityConfig.admins) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.admins,
          RoleName.Admin,
          roleSetID,
        );
      }

      if (spaceCommunityConfig.leads) {
        await this.assignUsersByTypeToRole(
          spaceCommunityConfig.leads,
          RoleName.Lead,
          roleSetID,
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
      if (spaceCollaborationConfig.addLinkCollectionCallout) {
        await this.createLinkCollectionCalloutOnSpace(spaceModel, scenarioName);
      }
      if (spaceCollaborationConfig.addWhiteboardCollectionCallout) {
        await this.createWhiteboardCollectionCalloutOnSpace(
          spaceModel,
          scenarioName,
        );
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
    roleSetID: string,
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
    model: OrganizationModel,
    orgConfig?: TestScenarioOrganizationConfig,
  ): Promise<OrganizationModel> {
    const uniqueId = UniqueIDGenerator.getID();
    const truncatedScenarioName = scenarioName.slice(0, 18);
    const orgName = `${truncatedScenarioName}-${uniqueId}`;
    const orgNameId = this.validateAndClean(`${orgName}`);
    if (!orgNameId) {
      throw new Error(
        `Unable to create organization: Invalid hostNameId: ${orgNameId}`,
      );
    }
    const responseOrg = await createOrganization(
      orgName,
      orgNameId.toLowerCase().slice(0, 24),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { tags: orgConfig?.tags },
    );

    if (!responseOrg.data?.createOrganization) {
      throw new Error(
        `Failed to create organization: ${JSON.stringify(responseOrg.error)}`,
      );
    }

    const orgResponseData = responseOrg.data?.createOrganization;

    model.id = orgResponseData.id ?? "";
    model.nameId = orgResponseData.nameID ?? "";
    model.roleSetId = orgResponseData.roleSet.id ?? "";
    model.agentId = orgResponseData.actor?.id ?? "";
    model.accountId = orgResponseData.account?.id ?? "";
    model.verificationId = orgResponseData.verification.id ?? "";
    model.profile = {
      id: orgResponseData.profile?.id ?? "",
      displayName: orgResponseData.profile?.displayName ?? "",
      tagline: orgResponseData.profile?.tagline ?? "",
    };

    if (orgConfig?.verification?.setVerified && model.verificationId) {
      const events = orgConfig.verification.events
        ? orgConfig.verification.events
        : orgConfig.verification.eventName
          ? [orgConfig.verification.eventName]
          : ["VERIFICATION_REQUEST", "MANUALLY_VERIFY"];

      await applyOrganizationVerificationSequence(model.verificationId, events);
    }

    const licensePlan = await getLicensePlanByName("ACCOUNT_LICENSE_PLUS");
    if (!licensePlan || licensePlan.length === 0) {
      // Without this plan, accounts get `account-space-free: 0` and every
      // subsequent createSpace is denied. Surface it rather than silently
      // proceeding to a masked "Space ID is required" later (test-suites#563).
      LogManager.getLogger().warn(
        "[license] ACCOUNT_LICENSE_PLUS plan not found — accounts will lack the free-space entitlement and space creation will be denied",
      );
    } else {
      const licensePlanId = licensePlan[0].id;
      // Assign the free-space entitlement, and surface any failure — a swallowed
      // assignment error is the upstream cause of the entitlement-denied cascade.
      const assignPlan = async (label: string, accountId?: string) => {
        if (!accountId) return;
        const res = await assignLicensePlanToAccount(accountId, licensePlanId);
        if (res?.error) {
          LogManager.getLogger().warn(
            `[license] failed to assign ACCOUNT_LICENSE_PLUS to ${label} account '${accountId}': ${JSON.stringify(res.error.errors)}`,
          );
        }
      };
      await assignPlan("organization", model.accountId);
      await assignPlan(
        "globalAdmin",
        TestUserManager.users.globalAdmin?.accountId,
      );
      await assignPlan("spaceAdmin", TestUserManager.users.spaceAdmin?.accountId);
    }

    // Assign the organization admin user to the organization's roleSet as Member and Admin
    const organizationAdmin = TestUserManager.users.organizationAdmin;
    if (organizationAdmin && organizationAdmin.id) {
      await assignRoleToUser(
        organizationAdmin.id,
        model.roleSetId,
        RoleName.Associate,
      );

      await assignRoleToUser(
        organizationAdmin.id,
        model.roleSetId,
        RoleName.Admin,
      );
    }

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
    addTutorialCallouts: boolean,
  ): Promise<SpaceModel> {
    const truncatedScenarioName = scenarioName.slice(0, 18);

    // Create the root space, retrying a nameID collision with a fresh id.
    // Under Vitest `pool: threads` the per-process UniqueIDGenerator counter can
    // reset across files, so two files whose scenario names share the
    // truncated-18 prefix (e.g. several `storage-auth-public…` scenarios) can
    // draw the same short id and collide (test-suites#563). Any other failure is
    // surfaced verbatim rather than masked (test-suites#577).
    const createOnce = async () => {
      const uniqueId = UniqueIDGenerator.getID();
      const spaceName = `${truncatedScenarioName}-${uniqueId}`;
      const spaceNameId = this.validateAndClean(spaceName.toLowerCase());
      if (!spaceNameId) {
        throw new Error(
          `Unable to create space: Invalid nameId: ${spaceNameId}`,
        );
      }
      const res = await this.createSpaceAndGetData(
        "l0-" + spaceName,
        spaceNameId,
        accountID,
        addTutorialCallouts,
      );
      return { spaceName, res };
    };

    // createSpaceAndGetData throws on a failed create (its de-masking throw,
    // test-suites#577) with the GraphQL error detail in the message — so the
    // collision arrives as a thrown Error, not as `res.error`. Catch it, retry
    // with a fresh id, and rethrow anything else verbatim.
    let attempt: Awaited<ReturnType<typeof createOnce>> | undefined;
    for (let i = 0; i < 3; i++) {
      try {
        attempt = await createOnce();
        break;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (i === 2 || !message.includes("already taken or restricted")) {
          throw e;
        }
      }
    }

    if (!attempt || !attempt.res.data?.lookup?.space) {
      throw new Error(
        `Failed to create root space '${attempt?.spaceName ?? truncatedScenarioName}' (account '${accountID}'): ${JSON.stringify(
          attempt?.res.error ?? {},
        )}`,
      );
    }

    const spaceData = attempt.res.data.lookup.space;
    spaceModel.id = spaceData?.id ?? "";
    spaceModel.nameId = spaceData?.nameID ?? "";
    spaceModel.about = {
      id: spaceData?.about?.id ?? "",
      profile: {
        id: spaceData?.about.profile?.id ?? "",
        displayName: spaceData?.about.profile?.displayName ?? "",
        tagline: spaceData?.about.profile?.tagline ?? "",
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
    scenarioName: string,
  ): Promise<SpaceModel> {
    const displayName = `${scenarioName} - post`;
    const createPostCallout = await createCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: { displayName },
        },
        settings: {
          framing: { commentsEnabled: true },
          contribution: {
            allowedTypes: [CalloutContributionType.Link],
            canAddContributions: CalloutAllowedActors.Members,
            enabled: true,
            commentsEnabled: true,
          },
          visibility: CalloutVisibility.Published,
        },
      },
    );

    const postCalloutData = createPostCallout.data?.createCalloutOnCalloutsSet;

    spaceModel.collaboration.calloutPostId = postCalloutData?.id ?? "";
    spaceModel.collaboration.calloutPostDisplayName = displayName;
    spaceModel.collaboration.calloutPostCommentsId =
      postCalloutData?.comments?.id ?? "";

    return spaceModel;
  }

  private static async createPostCollectionCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string,
  ): Promise<SpaceModel> {
    const displayName = `postCollectionCallout-${scenarioName}`;
    const callForPostCalloutData = await createCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName,
            description: `${displayName} - created as part of scenario setup for tests`,
          },
        },
        settings: {
          //framing: { commentsEnabled: true },
          contribution: {
            allowedTypes: [CalloutContributionType.Post],
            canAddContributions: CalloutAllowedActors.Members,
            enabled: true,
            commentsEnabled: true,
          },
          visibility: CalloutVisibility.Published,
        },
      },
    );

    spaceModel.collaboration.calloutPostCollectionId =
      callForPostCalloutData?.data?.createCalloutOnCalloutsSet?.id ?? "";
    spaceModel.collaboration.calloutPostCollectionDisplayName = displayName;

    return spaceModel;
  }

  private static async createLinkCollectionCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string,
  ): Promise<SpaceModel> {
    const displayName = `linkCollectionCallout-${scenarioName}`;
    const linkCollectionCalloutData = await createCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName,
            description: `${displayName} - created as part of scenario setup for tests`,
          },
        },
        settings: {
          contribution: {
            allowedTypes: [CalloutContributionType.Link],
            canAddContributions: CalloutAllowedActors.Members,
            enabled: true,
            commentsEnabled: true,
          },
          visibility: CalloutVisibility.Published,
        },
      },
    );

    spaceModel.collaboration.calloutLinkCollectionId =
      linkCollectionCalloutData?.data?.createCalloutOnCalloutsSet?.id ?? "";
    spaceModel.collaboration.calloutLinkCollectionDisplayName = displayName;

    return spaceModel;
  }

  private static async createWhiteboardCollectionCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string,
  ): Promise<SpaceModel> {
    const displayName = `whiteboardCollectionCallout-${scenarioName}`;
    const whiteboardCollectionCalloutData =
      await createWhiteboardCalloutOnCalloutsSet(
        spaceModel.collaboration.calloutsSetId,
        {
          framing: {
            profile: {
              displayName,
              description: `${displayName} - created as part of scenario setup for tests`,
            },
          },
          settings: {
            contribution: {
              allowedTypes: [CalloutContributionType.Whiteboard],
              canAddContributions: CalloutAllowedActors.Members,
              enabled: true,
              commentsEnabled: true,
            },
            visibility: CalloutVisibility.Published,
          },
        },
        TestUser.GLOBAL_ADMIN,
      );

    spaceModel.collaboration.calloutWhiteboardCollectionId =
      whiteboardCollectionCalloutData?.data?.createCalloutOnCalloutsSet?.id ??
      "";
    spaceModel.collaboration.calloutWhiteboardCollectionDisplayName =
      displayName;

    return spaceModel;
  }

  private static async createWhiteboardCalloutOnSpace(
    spaceModel: SpaceModel,
    scenarioName: string,
  ): Promise<SpaceModel> {
    const displayName = `${scenarioName} - whiteboard callout`;
    const whiteboardCalloutData = await createWhiteboardCalloutOnCalloutsSet(
      spaceModel.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName,
            description: "Whiteboard - initial",
          },
        },
        settings: {
          contribution: {
            allowedTypes: [CalloutContributionType.Whiteboard],
          },
          visibility: CalloutVisibility.Published,
        },
      },
      TestUser.GLOBAL_ADMIN,
    );

    spaceModel.collaboration.calloutWhiteboardId =
      whiteboardCalloutData?.data?.createCalloutOnCalloutsSet?.id ?? "";
    spaceModel.collaboration.calloutWhiteboardDisplayName = displayName;

    return spaceModel;
  }

  private static async createSubspace(
    parentSpaceID: string,
    subspaceName: string,
    targetModel: SpaceModel,
    config?: TestScenarioSpaceConfig,
  ): Promise<SpaceModel> {
    const uniqueId = UniqueIDGenerator.getID();
    const displayName = config?.about?.profile?.displayName ?? subspaceName;
    const tagline = config?.about?.profile?.tagline;
    const responseSubspace = await createSubspace(
      displayName,
      `l1nameid${uniqueId}`,
      parentSpaceID,
      TestUser.GLOBAL_ADMIN,
      tagline,
      // Honour the per-subspace config (previously the config value was
      // silently ignored — subspaces were hardcoded OFF with no opt-in path).
      config?.collaboration?.addTutorialCallouts ?? false,
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
    targetModel.about.profile.tagline =
      subspaceData?.about.profile?.tagline ?? "";

    return targetModel;
  }

  public static async assignUsersToMemberRole(
    roleSetId: string,
    spaceLevel: 0 | 1 | 2,
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
    role = TestUser.GLOBAL_ADMIN,
  ) {
    const response = await createSpaceBasicData(
      spaceName,
      spaceNameId,
      accountID,
      addTutorialCallouts,
      role,
    );
    const spaceId = response?.data?.createSpace?.id;
    if (!spaceId) {
      // Do NOT swallow the failure with `?? ""` — that turned a real
      // createSpace error (e.g. an `account-space-free` entitlement denial)
      // into a generic downstream "Space ID is required", masking the root
      // cause across whole nightly cascades (test-suites#563). Surface the
      // actual GraphQL error so the report shows *why* the space wasn't made.
      const detail = response?.error
        ? JSON.stringify(response.error.errors)
        : "server returned no createSpace.id and no error";
      throw new Error(
        `Failed to create root space '${spaceName}' (nameID '${spaceNameId}', account '${accountID}'): ${detail}`,
      );
    }
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
          tagline: "",
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
          tagline: "",
        },
      },
      collaboration: {
        id: "",
        calloutsSetId: "",
        calloutPostCollectionId: "",
        calloutPostCollectionDisplayName: "",
        calloutLinkCollectionId: "",
        calloutLinkCollectionDisplayName: "",
        calloutWhiteboardCollectionId: "",
        calloutWhiteboardCollectionDisplayName: "",
        calloutWhiteboardId: "",
        calloutWhiteboardDisplayName: "",
        calloutPostId: "",
        calloutPostDisplayName: "",
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
