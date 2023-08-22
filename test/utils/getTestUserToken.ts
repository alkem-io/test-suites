import { TestUtil } from './test.util';

export const getTestUserToken = async (userRole: string) => {
  let auth_token = '';
  const res = (await TestUtil.Instance()).userTokenMap.get(userRole);
  if (!res) throw console.error(`Could not authenticate user ${userRole}`);
  else auth_token = res as string;

  return auth_token;
};
