import { rawRead } from './raw-request';

/**
 * What the caller holds on BOTH platform policies, in one read-only request.
 * The platform policy and the platform role-set policy carry different rules
 * (assignment and holder-list privileges live only on the second), so reading
 * one of them and concluding "nothing" is wrong by construction.
 *
 * Read-only on purpose: it is also the cache probe of I1/O1, and a probe that
 * wrote anything could flush the very cache it is probing.
 */
export type Privileges = {
  platform: string[];
  roleSet: string[];
  myRoles: string[];
};

const QUERY = `query {
  platform {
    authorization { myPrivileges }
    roleSet { myRoles authorization { myPrivileges } }
  }
}`;

type Response = {
  platform: {
    authorization: { myPrivileges: string[] };
    roleSet: { myRoles: string[]; authorization: { myPrivileges: string[] } };
  };
};

export const readPrivileges = async (token: string): Promise<Privileges> => {
  const { platform } = await rawRead<Response>(token, QUERY);
  return {
    platform: platform.authorization.myPrivileges,
    roleSet: platform.roleSet.authorization.myPrivileges,
    myRoles: platform.roleSet.myRoles,
  };
};
