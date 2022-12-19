import { registerInKratosOrFail, verifyInKratosOrFail } from './kratos';

import { registerInAlkemioOrFail } from './register-in-alkemio-or-fail';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

const email = process.env.USER_EMAIL || `default${uniqueId}@alkem.io`;
const firstName = process.env.USER_FIRST_NAME || 'fn';
const lastName = process.env.USER_LAST_NAME || 'ln';

const main = async () => {
  const res = await registerInKratosOrFail(firstName, lastName, email);
  const ses = res;
  await verifyInKratosOrFail(email, res);
  // await registerInAlkemioOrFail(firstName, lastName, email);
};

main().catch(error => {
  console.error(error);
});
