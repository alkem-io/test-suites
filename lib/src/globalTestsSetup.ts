/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
// This is critical to be able to use TypeScript aliases in Jest tests
require("tsconfig-paths/register");
import { UiText } from "@ory/kratos-client";
import { registerInAlkemioOrFail } from "./scenario/registration/register-in-alkemio-or-fail";
import { testConfiguration } from "./config/test.configuration";
import { stringifyConfig } from "./config/create-config-using-envvars";
import { registerInKratosOrFail } from "./scenario/registration/register-in-kratos-or-fail";
import { verifyInKratosOrFail } from "./scenario/registration/verify-in-kratos-or-fail";
import { LogManager } from "./scenario/LogManager";
import { TestUser } from "./common/enums/test.user";

module.exports = async () => {
  LogManager.getLogger().info(
    `\nLaunching tests using configuration: ${stringifyConfig(
      testConfiguration
    )}`
  );

  if (!testConfiguration.registerUsers) return;

  // get all user names to register
  // exclude GLOBAL_ADMIN as he already is created and verified
  // and it's used to create the the users
  const userNames = Object.values(TestUser).filter(
    (x) => x !== TestUser.GLOBAL_ADMIN
  );
  // running register flows in parallel brings 3x less waiting times
  // NOTE: may require limit on amount of flows run in parallel

  //DO NOT MAKE THIS PARALLEL AS NEW FLOW TRIES TO OVERRIDE OLD FLOWS RESULTING IN ERRORS
  for (const username of userNames) {
    try {
      await userRegisterFlow(username);
    } catch (error) {
      LogManager.getLogger().error(
        `Unable to register user ${username}: ${error}`
      );
    }
  }
};

const getUserName = (userName: string): [string, string] => {
  const [first, last] = userName.split(".");
  return [first, last];
};

export const userRegisterFlow = async (userName: string) => {
  const [firstName, lastName] = getUserName(userName);
  const email = `${userName}@alkem.io`;
  let verificationFlowId: string | undefined;
  try {
    const result = await registerInKratosOrFail(firstName, lastName, email);
    verificationFlowId = result.verificationFlowId;

    LogManager.getLogger().info(`User ${email} registered in Kratos`);
  } catch (e: any) {
    const errorMessages = (e as any).response?.data.ui.messages as UiText[];
    const errorMessage =
      errorMessages.map((x) => x.text).join("\n") ?? "Unknown error";
    const userExists =
      errorMessages.filter((x: { id: number }) => x.id === 4000007).length > 0;

    if (userExists) {
      LogManager.getLogger().warn(`User ${email} already registered in Kratos`);
    } else {
      throw new Error(errorMessage);
    }
  }

  await verifyInKratosOrFail(email, verificationFlowId);
  LogManager.getLogger().info(`User ${email} verified`);
  try {
    await registerInAlkemioOrFail(firstName, lastName, email);
    LogManager.getLogger().info(`User ${email} registered in Alkemio`);
  } catch (e) {
    const err = e as Error;
    if (err.message.indexOf("already registered") > -1) {
      LogManager.getLogger().warn(
        `User ${email} already registered in Alkemio`
      );
    } else {
      throw new Error(err.message);
    }
  }
};
