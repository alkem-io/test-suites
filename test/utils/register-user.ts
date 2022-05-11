import { registerInKratosOrFail, verifyInKratosOrFail } from './kratos';
import { uniqueId } from './mutations/create-mutation';
import { registerInAlkemioOrFail } from './register-in-alkemio-or-fail';

const email = process.env.USER_EMAIL || `default${uniqueId}@alkem.io`;
const firstName = process.env.USER_FIRST_NAME || 'fn';
const lastName = process.env.USER_LAST_NAME || 'ln';

const main = async () => {
  await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email);
  await registerInAlkemioOrFail(firstName, lastName, email);
};

main().catch(error => {
  console.error(error);
});
