import { TestUserManager } from "../scenario/TestUserManager";
import { TestScenarioFactory } from "./TestScenarioFactory";
import { RoleName } from "../core/generated/alkemio-schema";
import { delay } from "../utils/delay";
import { OrganizationWithSpaceModel } from "./models/OrganizationWithSpaceModel";
import {
  assignRoleToUser,
  createUser,
  getCalloutDetails,
  getCalloutsData,
} from "./baseFunctions";

export class TestSetupUtils {
  public static async assignUsersToRoles(
    roleSetId: string,
    spaceLevel: 0 | 1 | 2
  ): Promise<void> {
    await TestScenarioFactory.assignUsersToMemberRole(roleSetId, spaceLevel);

    await assignRoleToUser(
      TestUserManager.users.subspaceAdmin.id,
      roleSetId,
      RoleName.Admin
    );
  }

  public static async registerUsersAndAssignToAllEntitiesAsMembers(
    orgSpaceModel: OrganizationWithSpaceModel,
    spaceMemberEmail: string,
    subspaceMemberEmail: string,
    subsubspaceMemberEmail: string
  ): Promise<void> {
    const createSpaceMember = await createUser({
      firstName: "space",
      lastName: "mem",
      email: spaceMemberEmail,
    });
    const spaceMemberId = createSpaceMember.data?.createUser.id ?? "";
    const createSubspaceMember = await createUser({
      firstName: "chal",
      lastName: "mem",
      email: subspaceMemberEmail,
    });
    const subspaceMemberId = createSubspaceMember.data?.createUser.id ?? "";

    const createSubsubspaceMember = await createUser({
      firstName: "opp",
      lastName: "mem",
      email: subsubspaceMemberEmail,
    });
    const subsubspaceMemberId =
      createSubsubspaceMember.data?.createUser.id ?? "";

    // Assign users to Space community
    await assignRoleToUser(
      spaceMemberId,
      orgSpaceModel.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToUser(
      subspaceMemberId,
      orgSpaceModel.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToUser(
      subsubspaceMemberId,
      orgSpaceModel.space.community.roleSetId,
      RoleName.Member
    );

    // Assign users to Subspace community
    await assignRoleToUser(
      subsubspaceMemberId,
      orgSpaceModel.subspace.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToUser(
      subspaceMemberId,
      orgSpaceModel.subspace.community.roleSetId,
      RoleName.Member
    );

    // Assign users to Subsubspace community
    await assignRoleToUser(
      subsubspaceMemberId,
      orgSpaceModel.subsubspace.community.roleSetId,
      RoleName.Member
    );
  }

  public static async getDefaultSpaceCalloutByNameId(
    calloutsSetId: string,
    nameID: string
  ) {
    await delay(100);
    const calloutsPerSpace = await getCalloutsData(calloutsSetId);

    const allCallouts =
      calloutsPerSpace.data?.lookup.calloutsSet?.callouts ?? [];
    const filteredCallout = allCallouts.filter(
      (callout) => callout.nameID.includes(nameID) || callout.id === nameID
    );

    const colloutDetails = await getCalloutDetails(filteredCallout[0].id);
    return colloutDetails;
  }
}
