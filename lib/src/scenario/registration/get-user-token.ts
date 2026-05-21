import { LogManager } from '../LogManager';
import { testConfiguration } from '../../config/test.configuration';
import { getBearerViaNonInteractiveLogin } from '../../auth/non-interactive-login/get-bearer-via-non-interactive-login';

export const getUserToken = async (userEmail: string): Promise<string> => {
  const password = testConfiguration.identities.admin.password;
  try {
    return await getBearerViaNonInteractiveLogin(userEmail, password);
  } catch (e: unknown) {
    const err = e as Error;
    LogManager.getLogger().error(
      err.message,
      `>> identifier: ${userEmail}`,
      err.stack
    );
    throw new Error(
      `Unable to retrieve non-interactive-login bearer for user ${userEmail}: ${err.message}`
    );
  }
};
