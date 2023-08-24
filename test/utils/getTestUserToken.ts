import { TestUtil } from './test.util';

export const getTestUserToken = async (userRole: string) => {
  const res = (await TestUtil.Instance()).userTokenMap.get(userRole);

  if (!res) {
    throw console.error(`Could not authenticate user ${userRole}`);
  }

  return res;
};
