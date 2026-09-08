import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const createApplication = async (
  roleSetID: string,
  userRole: TestUser = TestUser.QA_USER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.applyForEntryRole(
      {
        applicationData: {
          roleSetID,
          questions: [
            { name: 'Test Question 1', value: 'Test answer', sortOrder: 0 },
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteApplication = async (
  applicationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteApplication(
      {
        deleteData: {
          ID: applicationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getRoleSetInvitationsApplications = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetApplicationsInvitations(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getSubspaceApplications = async (
  spaceId: string,
  subspaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSubspaceApplications(
      {
        subspaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const meQuery = async (userRole: TestUser = TestUser.GLOBAL_ADMIN) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MeQuery(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// The Space pending surfaces alongside the organization ones, so a single
// call proves both — the Space list/count stay exact, the organization rows
// land only on their own fields.
export const meOrganizationPending = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MeOrganizationPending(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// The organization's seeded application form, relabelled as a single
// optional message question. Passing no message submits the form with no
// answers, which is exactly what "optional" means.
export const applyToAssociateWithOrganization = async (
  roleSetID: string,
  message?: string,
  userRole: TestUser = TestUser.QA_USER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.applyForEntryRole(
      {
        applicationData: {
          roleSetID,
          questions:
            message === undefined
              ? []
              : [
                  {
                    name: 'What makes you want to join?',
                    value: message,
                    sortOrder: 1,
                  },
                ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
