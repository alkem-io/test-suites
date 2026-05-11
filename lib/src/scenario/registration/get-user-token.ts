import { LogManager } from '../LogManager';
import { testConfiguration } from '../../config/test.configuration';
import { getBearerViaOidc } from '../../auth/oidc/get-bearer-via-oidc';

export const getUserToken = async (userEmail: string): Promise<string> => {
  const password = testConfiguration.identities.admin.password;
  try {
    return await getBearerViaOidc(userEmail, password);
  } catch (e: unknown) {
    const err = e as Error;
    LogManager.getLogger().error(
      err.message,
      `>> identifier: ${userEmail}`,
      err.stack
    );
    throw new Error(
      `Unable to retrieve OIDC access token for user ${userEmail}: ${err.message}`
    );
  }
};
