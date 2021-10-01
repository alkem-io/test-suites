import { mambershipUser } from '../common-params';

export const membershipUserQuery = `
query membershipUser($input: MembershipUserInput!) {
    membershipUser(membershipData: $input) {
        ${mambershipUser}
    }
}`;

export const membershipUserQueryVariablesData = (userID: string) => {
  const variables = {
    input: {
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
