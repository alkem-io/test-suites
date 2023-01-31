import { config } from 'dotenv';
import {
  registerInKratosOrFail,
  verifyInKratosOrFail,
  registerInAlkemioOrFail,
  TestUser,
} from './utils';
import { AxiosError } from 'axios';
import { UiText } from '@ory/kratos-client';

config({ path: '.env' });

module.exports = async () => {
  // get all user names to register
  // exclude GLOBAL_ADMIN as he already is created and verified
  // and it's used to create the the users
  const userNames = Object.values(TestUser).filter(
    x => x !== TestUser.GLOBAL_ADMIN
  );
  // running register flows in parallel brings 3x less waiting times
  // NOTE: may require limit on amount of flows run in parallel
  await Promise.allSettled(userNames.map(userRegisterFlow)).then(x =>
    x.forEach(y => y.status === 'rejected' && console.error(y.reason))
  );
};

const getUserName = (userName: string): [string, string] => {
  const [first, last] = userName.split('.');
  return [first, last];
};

const userRegisterFlow = async (userName: string) => {
  const [firstName, lastName] = getUserName(userName);
  const email = `${userName}@alkem.io`;

  try {
    await registerInKratosOrFail(firstName, lastName, email);
    console.info(`User ${email} registered in Kratos`);
  } catch (e) {
    const errorMessages = (e as AxiosError).response?.data.ui
      .messages as UiText[];
    const errorMessage =
      errorMessages.map(x => x.text).join('\n') ?? 'Unknown error';
    const userExists =
      errorMessages.filter((x: { id: number }) => x.id === 4000007).length > 0;

    if (userExists) {
      console.warn(`User ${email} already registered in Kratos`);
    } else {
      throw new Error(errorMessage);
    }
  }
  await verifyInKratosOrFail(email);
  console.info(`User ${email} verified`);
  try {
    await registerInAlkemioOrFail(firstName, lastName, email);
    console.info(`User ${email} registered in Alkemio`);
  } catch (e) {
    const err = e as Error;
    if (err.message.indexOf('already registered') > -1) {
      console.warn(`User ${email} already registered in Alkemio`);
    } else {
      throw new Error(err.message);
    }
  }
};
