import { rolesUser } from '../common-params';

export const rolesUserQuery = `
query rolesUser($input: RolesUserInput!) {
  rolesUser(rolesData: $input) {
        ${rolesUser}
    }
}`;

export const rolesUserQueryVariablesData = (userID: string) => {
  const variables = {
    input: {
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
