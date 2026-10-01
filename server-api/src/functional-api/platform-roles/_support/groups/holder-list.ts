import type { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { rawRead } from '../raw-request';

/**
 * Who holds a platform role right now — the oracle of every assign / remove
 * positive. Read as Platform Roles Admin, which may read every holder list.
 */
const HOLDERS = `query($role: RoleName!) { platform { roleSet {
  usersInRole(role: $role) { id }
  organizationsInRole(role: $role) { id }
} } }`;
type Holders = {
  platform: {
    roleSet: {
      usersInRole: { id: string }[];
      organizationsInRole: { id: string }[];
    };
  };
};

export const holdersOf = async (
  rolesAdminToken: string,
  role: RoleName
): Promise<string[]> => {
  const { usersInRole, organizationsInRole } = (
    await rawRead<Holders>(rolesAdminToken, HOLDERS, { role })
  ).platform.roleSet;
  return [...usersInRole, ...organizationsInRole].map(holder => holder.id);
};
