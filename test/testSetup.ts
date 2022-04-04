import { config } from 'dotenv';
import {
  registerInKratosOrFail,
  verifyInKratosOrFail,
  registerInAlkemioOrFail,
  TestUser,
} from './utils';

config({ path: '.env' });

module.exports = async () => {
  // get all user names to register
  // exclude GLOBAL_ADMIN as he already is created and verified
  // and it's used to create the the users
  const userNames = Object.values(TestUser).filter(
    x => x !== TestUser.GLOBAL_ADMIN
  );
  for (const userName of userNames) {
    const [firstName, lastName] = getUserName(userName);
    const email = `${userName}@alkem.io`;

    try {
      await registerInKratosOrFail(firstName, lastName, email);
    } catch (e) {
      const err = e as Error;
      if (err.message.indexOf('exists already') > -1) {
        console.warn(`User ${email} already registered in Kratos`);
      } else {
        throw new Error(err.message);
      }
    }
    console.info(`User ${email} registered in Kratos`);
    await verifyInKratosOrFail(email);
    console.info(`User ${email} verified`);
    try {
      await registerInAlkemioOrFail(firstName, lastName, email);
    } catch (e) {
      const err = e as Error;
      if (err.message.indexOf('User already exists') > -1) {
        console.warn(`User ${email} already registered in Alkemio`);
      } else {
        throw new Error(err.message);
      }
    }
    console.info(`User ${email} registered in Alkemio`);
  }
};

const getUserName = (userName: string): [string, string] => {
  const [first, last] = userName.split('.');
  return [first, last];
};
